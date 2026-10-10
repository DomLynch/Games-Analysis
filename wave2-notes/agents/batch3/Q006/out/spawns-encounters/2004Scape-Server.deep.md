# 2004Scape-Server (spawns-encounters, cell 4)

Donor: `/mnt/frankendom-donors/2004Scape-Server/src/engine/World.ts` (with `src/engine/entity/Npc.ts` and `data/src/scripts/skill_combat/scripts/npc/npc_death.rs2`) | Licence: MIT (LICENSE line 1 "MIT License"; line 3 "Copyright (c) 2023-2025 Lost City") | TypeScript | symbol `World.removeNpc` (with `World.scaleByPlayerCount`)

Checked: Read in full: `World.removeNpc` (src/engine/World.ts 1330-1356), `World.addNpc` (1292-1330), `World.scaleByPlayerCount` (1773-1777), `World.getTotalPlayers` (1727-1729), the tick schedule (`cycle` 369-396, drift and reschedule 533-537), `processNpcs` (714-724). Read `Npc.turn` lifecycle block (src/engine/entity/Npc.ts 121-135), `Npc.resetEntity` (281-295), `Npc.revertType` (1074-1082), `resetOnRevert` default (72), `Entity.setLifeCycle` (src/engine/entity/Entity.ts 36-38), the type field `respawnrate` (src/cache/config/NpcType.ts 111, 208), the script ops `NPC_ADD` and `NPC_DEL` (src/engine/script/handlers/NpcOps.ts 36-80), map NPC load (src/engine/GameMap.ts 105-125), and the whole death script (data/src/scripts/skill_combat/scripts/npc/npc_death.rs2, 24 lines). Not read: the body of `cycle` beyond the lines above (client packets, info, cleanup), Npc hunt and mode code, `npc_delay` mechanics beyond the `delayed` check at Npc.ts 111-113, `Zone.enter` and `Zone.leave`, and the spawn-trigger script itself. Confidence: high on the countdown, the population scale and the fixed-tick loop (read end to end). Medium on the double-add on respawn (see section 6): traced by hand, not run. camera_scope: not applicable.

Best transferable idea: a dead NPC keeps its slot in the world list and counts down its own respawn in server ticks; the duration is set once at death, shrinks as the live player count grows (half at the cap), and the respawn returns it to its start tile and base type.

Decision (proposed): adapt - take the per-NPC countdown in server ticks, fixed at death, as a zone-data respawn field; reject the global server player count as the scale input (Frankendom zones count their own players) and the fixed 4000/2000 constants as hard rules.

Acceptance: a server test in a zone: with 0 zone players a killed NPC respawns after the base ticks; with the cap of zone players it respawns after half of that; the value is fixed at the moment of death (a player who joins mid-countdown does not change the respawn time); and the NPC returns to its start tile and base type.

## 1. Mechanism

- Map NPCs are created at load with lifecycle RESPAWN and their start tile recorded (GameMap.ts 118; Npc.ts 84). Load adds them with no duration (`addNpc(npc, -1)`), so no timer runs until the first death.
- The world loop (`cycle`) runs on a fixed 600 ms tick (World.ts 120, 533-537). Each tick it calls `processNpcs` (396), which calls `npc.turn()` for every NPC in the world's list (717-718).
- A dead NPC is not removed from the list. `removeNpc` for a RESPAWN NPC with a positive duration sets the timer and leaves it in the list (1350-1351; the list removal is only in the DESPAWN branch, 1346-1348). `isActive` is set false on removal (1334).
- Death: the death script sets the NPC's mode to none, waits for its arrive delay, plays the death animation, waits one tick, then calls `npc_del` (npc_death.rs2 13-24). `npc_del` calls `World.removeNpc(npc, respawnrate)` with the NPC type's `respawnrate` (NpcOps.ts 78), which is read from the type config (NpcType.ts 208) and defaults to 100 ticks (NpcType.ts 111, commented "default to 1-minute": 100 x 600 ms = 60 s).
- Scaling (World.ts 1332, 1773-1776): the duration is `((4000 - min(players, 2000)) x rate) / 4000`, truncated. At 0 players it equals the rate; at 2000 or more players it is half the rate. The count is `this.players.count` (1727-1728). The scale is applied once, at removal. It is not re-read later.
- Countdown: each tick, `turn()` decrements `lifecycleTick` (Npc.ts 122) unless the NPC is `delayed`. When it reaches 0 (125-126) and the NPC is inactive, `addNpc(this, -1, false)` puts it back: start tile (World.ts 1298), active (1300), zone enter, `resetEntity(true)` which restores the base type and the base levels (Npc.ts 281-293), and an AI_SPAWN script is queued if one exists (World.ts 1322).
- Then the same block runs `revertType()` for any RESPAWN NPC (Npc.ts 129-130). With `resetOnRevert` at its default true (Npc.ts 72), that calls `removeNpc` and `addNpc` again (Npc.ts 1074-1078). Traced, not run: this makes a respawn run its entry path twice.
- Temporary NPCs use the DESPAWN lifecycle: `NPC_ADD` passes a script duration to `addNpc` (NpcOps.ts 49), and at zero the NPC is removed from the list (Npc.ts 133-134; World.ts 1346-1348).

## 2. Key functions

- `World.removeNpc`: `/mnt/frankendom-donors/2004Scape-Server/src/engine/World.ts` 1330-1356. Marks the NPC inactive, leaves the zone, and for RESPAWN sets the timer to the scaled duration.
- `World.scaleByPlayerCount`: `/mnt/frankendom-donors/2004Scape-Server/src/engine/World.ts` 1773-1777. The linear scale with the 2000 clamp.
- `World.addNpc`: `/mnt/frankendom-donors/2004Scape-Server/src/engine/World.ts` 1292-1330. Start tile, active, zone enter, base type reset, spawn trigger, optional timer.
- `Npc.turn` (lifecycle block): `/mnt/frankendom-donors/2004Scape-Server/src/engine/entity/Npc.ts` 121-135. The per-tick countdown and the respawn and revert calls.
- `World.cycle` and `processNpcs`: `/mnt/frankendom-donors/2004Scape-Server/src/engine/World.ts` 369-396 and 714-724. The fixed tick and the per-NPC turn.
- Death script: `/mnt/frankendom-donors/2004Scape-Server/data/src/scripts/skill_combat/scripts/npc/npc_death.rs2` 10-24. Mode none, delay, animation, one tick, then `npc_del`.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Per-entity countdown in fixed ticks | Tick 600 ms (World.ts 120) |
| Respawn duration set once at death | Per-type `respawnrate` in ticks; default 100 = 60 s (NpcType.ts 111) |
| Respawn shrinks with live population | Player count clamped at 2000 (World.ts 1775); scale `(4000 - p) x rate / 4000` (1776): full rate at 0, half at 2000+ |
| Truncated integer ticks | `\| 0` (World.ts 1776) |
| Death to delete delay | Death script: one tick after the death animation (npc_death.rs2 23-24); arrive delay is script-driven (npc_death.rs2 15) |
| Temporary NPC lifetime | Script-supplied duration in ticks (NpcOps.ts 49) |

The tick and the default rate are engine constants. The per-type rate and the death delay are content data (type config and scripts). The 4000 and 2000 scale constants are fixed in the engine code, not read from data.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: the duration is fixed at death from the population, the NPC stays in the list and counts down once per tick, and at zero it returns to its start tile and base type. It omits the `delayed` pause (Npc.ts 122), the revert and double-entry path (Npc.ts 129-130), the spawn trigger queue, zone enter and leave, collision changes, the DESPAWN lifecycle, the player-count source (the sketch takes a number), and the decrement of an unset timer below -1 (the donor keeps decrementing a -1 timer; the sketch stops at a negative value). The scale constants are the donor's; Frankendom should make them zone fields.

```ts
// Licence: MIT (donor, 2004Scape-Server, Lost City 2023-2025). Shape adapted; written here from the described mechanism.
interface NpcSlot {
  baseType: number;        // type to return to on respawn
  active: boolean;         // false while waiting to respawn
  lifecycleTick: number;   // ticks left until the next lifecycle event; -1 = no timer
}

const TICK_MS = 600;       // one world tick (donor TICKRATE, World.ts 120)
const PLAYER_CAP = 2000;   // donor clamps the count here (World.ts 1775)

// Respawn duration in ticks, shrinking with live population: full rate at 0 players,
// half rate at the cap. The donor works in integer ticks (truncated).
function scaleByPlayers(rateTicks: number, players: number): number {
  const p = Math.min(players, PLAYER_CAP);
  return Math.trunc(((4000 - p) * rateTicks) / 4000);
}

// Death: the NPC leaves play and a countdown starts. The duration is fixed here, at death,
// and is not re-read when the population changes later.
function onDeath(n: NpcSlot, typeRespawnRateTicks: number, players: number): void {
  n.active = false;
  n.lifecycleTick = scaleByPlayers(typeRespawnRateTicks, players);
}

// Once per world tick, for every NPC still in the world's list (active or waiting).
function turnNpc(n: NpcSlot, respawn: (n: NpcSlot) => void): void {
  if (n.lifecycleTick < 0) return;                       // no timer running
  if (--n.lifecycleTick !== 0) return;                   // still counting down
  if (!n.active) {
    n.active = true;                                     // back on its start tile...
    respawn(n);                                          // ...as its base type
  }
  n.lifecycleTick = -1;
}

// Fixed-step world loop: every NPC gets one turn per tick.
function worldTick(npcs: NpcSlot[], respawn: (n: NpcSlot) => void): void {
  for (const n of npcs) turnNpc(n, respawn);
}

export { TICK_MS, onDeath, worldTick, scaleByPlayers };
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population on the server: a respawn countdown per NPC, in server ticks, with the duration set at death). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer). The server tick sub-line for the fixed step is "server tick: fixed step, input intake, per-tick NPC budget" under row 18 / post-K item 3.
- today: not read (Frankendom side not opened in this pass).
- Reuse tag: rewrite-from-idea (MIT; code may be adapted, the sketch is written clean)
- Brief rule served: zones as data (respawn ticks and the scale are zone fields, not global); one engine (the countdown and the tick are server-side; the client only shows the NPC); rules 7-9 n/a

## 6. Gaps and risks

- MIT: code may be adapted. The sketch is still written from the mechanism, not copied.
- Scale input is the global player count (World.ts 1727-1728), not a zone's. Frankendom zones must scale from their own live players, or a quiet zone is slowed by a busy one.
- The scale is fixed at death (World.ts 1332, 1351). A player who leaves mid-countdown does not change the respawn time. Decide whether that is wanted; the donor chose it.
- No population cap in the code read: each map NPC is its own spawn and nothing counts how many of a type are alive (the NPC and respawn path above; no cap search was run). EQEmu's group and type caps are a different design. Row 23 needs caps, so this donor covers the timer and the scale, not the cap.
- No "despawn on empty with grace timer" here either. The only despawn is a script-set lifetime for temporary NPCs (NpcOps.ts 49; Npc.ts 133-134).
- Traced, not run: on every respawn the same tick block runs `addNpc` (Npc.ts 125-126) and then `revertType` (129-130). With `resetOnRevert` true by default (Npc.ts 72), revertType calls `removeNpc` and `addNpc` again (1074-1078). That looks like two zone entries and, if the spawn trigger is queued in `addNpc` (World.ts 1322), two queued spawn events per respawn. Check before copying the event path. Frankendom's one-ledger and server-verified rules need one entry per respawn.
- `delayed` (set by script delay) stops the countdown (Npc.ts 122); a script that keeps an NPC delayed postpones its respawn. Not traced further.
- The death delay is in a script, not in the engine (npc_death.rs2 13-24). Frankendom should keep the death delay as data on the creature, not in a script.
- A depop by `npc_del` (NPC_DEL) uses the same respawn path as a kill (NpcOps.ts 78). A timed or scripted removal therefore respawns the same way as a death. That is the donor's choice; Frankendom must keep a server-verified kill separate from a despawn.
