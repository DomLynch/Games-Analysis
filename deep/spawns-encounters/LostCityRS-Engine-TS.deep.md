# LostCityRS-Engine-TS (spawns-encounters, cell 4)

Donor: /mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/World.ts | Licence: MIT | TypeScript | symbol World.addNpc / World.removeNpc / Npc.turn (opened: World.ts 1269-1334, 665-676, 1731-1735; Npc.ts 109-155, 1159-1168; Entity.ts 36-43; GameMap.ts 153-154)

## 1. Mechanism

- An NPC spawn is an `Npc` entity with a `lifecycle` (RESPAWN or DESPAWN) and a countdown `lifecycleTick`. Map-placed NPCs load as RESPAWN and `World.addNpc(npc, -1)` (GameMap.ts 153-154, /mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/GameMap.ts), so no timer is armed at load and they never self-expire. A timer is only armed later, when `removeNpc` is called with a duration above -1 (the callers that pass it, such as a death or script, were not read).
- Inputs: the NPC (its `startX`/`startZ` home tile, `width`, `blockWalk`), a `duration` in ticks (-1 means "no timer"), and `firstSpawn`.
- `World.addNpc` (1269-1305): on `firstSpawn` it registers the NPC with `rsbuf` and the `npcs` map; then it puts the NPC at its home tile, marks it active, enters its zone, sets NPC (or NPC + block) collision according to `blockWalk`, resets the entity and clears its animation, queues the AI_SPAWN script event if the type has such a script, and arms the lifecycle timer when `duration > -1`.
- `World.removeNpc` (1307-1334) returns at once if the NPC is not active. Otherwise it computes the scaled duration, leaves the zone, deactivates it, clears collision, then branches on lifecycle: DESPAWN removes it from `rsbuf` and the `npcs` map and calls `cleanup()`; RESPAWN with `duration > -1` (so 0 counts) re-arms the timer with the player-count-scaled value (`setLifeCycle` raises any value below 1 to 1).
- Each world tick, `processNpcs` (665-676) calls `Npc.turn()` on every NPC in the `npcs` map (a throw removes that NPC with duration 0). `turn()` decrements `lifecycleTick` only when the NPC is not `delayed`, and acts when it reaches exactly 0 (so -1 never fires). At zero: a RESPAWN NPC that is inactive is re-added at home with duration -1 and `firstSpawn` false; an active RESPAWN one calls `revertType()` (back to base type, or a full remove + add when `resetOnRevert`); a DESPAWN NPC is removed and its AI_DESPAWN trigger is queued. If add or remove throws (for example no free NPC id), it re-arms with 1 tick and retries next tick (Npc.ts 143-149).
- Order in the tick (`World.cycle`, 340-): `processWorld`, `processClientsIn`, `processNpcEventQueue` (spawn/despawn scripts), then `processNpcs`, then `processPlayers`.
- Output: NPC active/inactive state, zone membership, collision flags, and a queued script event. Sync to clients goes through `rsbuf` (the buffer internals were not read).
- Respawn delay is scaled by live population in `scaleByPlayerCount` (World.ts 1731-1735): `scaled = ((4000 - min(players, 2000)) * rate / 4000) | 0`. More players means a shorter respawn. `getTotalPlayers` was not read. `removeNpc` computes it after the inactive early return, and uses it only for a RESPAWN NPC.

## 2. Key functions

| Name | Path | Lines | What it does |
|---|---|---|---|
| World.addNpc | /mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/World.ts | 1269-1305 | Places a spawn at home, activates it, arms the lifecycle timer, queues AI_SPAWN |
| World.removeNpc | /mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/World.ts | 1307-1334 | Deactivates, clears collision, deletes (DESPAWN) or re-arms a scaled timer (RESPAWN) |
| World.scaleByPlayerCount | /mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/World.ts | 1731-1735 | Shrinks a respawn duration as online players rise (cap 2000) |
| Npc.turn (lifecycle branch) | /mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/Npc.ts | 109-150 (lifecycle block 120-150) | Counts down lifecycleTick when not delayed; re-adds, reverts or despawns at zero; retries in 1 tick on error |
| Npc.revertType | /mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/Npc.ts | 1159-1168 | Resets a changed NPC to its base type, or does a full remove+add when resetOnRevert is set |
| Entity.setLifeCycle | /mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/Entity.ts | 36-43 | Arms the countdown (minimum 1 tick), records the tick it was set |
| World.processNpcs (call site) | /mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/World.ts | 665-676 | Runs turn() on every NPC each tick |

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Per-entity countdown that drives respawn, revert and despawn | Countdown unit is one world tick (theirs) |
| Population-scaled respawn: `(cap - players) * rate / cap` with a player cap | Divisor 4000 and player cap 2000 (theirs, World.ts 1733-1734) |
| Re-arm with minimum 1 tick so a zero timer never stalls | Minimum 1 tick (theirs) |
| Map-placed spawns use duration -1 (no timer), respawn only after a death or script | Map loader uses -1 (theirs, GameMap.ts 154) |

## 4. TypeScript sketch

Licence: MIT. The logic may be lifted from the path above; this sketch restates the structure in its own names.

simplified: zone enter/leave, collision, rsbuf registration, the AI_SPAWN / AI_DESPAWN script events, the `delayed` gate on the countdown, `resetOnRevert`, the throw-and-retry-in-1-tick path and the early return of `removeNpc` for an inactive NPC are omitted (`deactivate` does keep the inactive early return); the three outcomes at zero are callbacks; `tickLifecycle` skips the countdown when the timer is below 0, where the donor decrements anyway (it never reaches 0 from -1).

```ts
// Licence: MIT (LostCityRS-Engine-TS, src/engine/World.ts addNpc/removeNpc, scaleByPlayerCount)
type Lifecycle = 'RESPAWN' | 'DESPAWN';
interface SpawnEntity {
  lifecycle: Lifecycle;
  lifecycleTick: number; // -1 = no timer armed
  active: boolean;
  homeX: number;
  homeZ: number;
  x: number;
  z: number;
}
const POP_CAP = 2000;
const POP_DIVISOR = 4000;
function scaleByPopulation(rate: number, players: number): number {
  const p = Math.min(players, POP_CAP);
  return Math.trunc(((POP_DIVISOR - p) * rate) / POP_DIVISOR);
}
function armTimer(e: SpawnEntity, ticks: number): void {
  e.lifecycleTick = ticks === -1 ? -1 : Math.max(1, ticks);
}
function activate(e: SpawnEntity, ticks: number): void {
  e.x = e.homeX; e.z = e.homeZ;
  e.active = true;
  if (ticks > -1) armTimer(e, ticks);
}
function deactivate(e: SpawnEntity, ticks: number, players: number, onDelete: (e: SpawnEntity) => void): void {
  if (!e.active) return;
  e.active = false;
  if (e.lifecycle === 'DESPAWN') { onDelete(e); return; }
  if (e.lifecycle === 'RESPAWN' && ticks > -1) armTimer(e, scaleByPopulation(ticks, players));
}
function tickLifecycle(e: SpawnEntity, onRespawn: (e: SpawnEntity) => void, onRevert: (e: SpawnEntity) => void, onDespawn: (e: SpawnEntity) => void): void {
  if (e.lifecycleTick < 0) return;
  if (--e.lifecycleTick !== 0) return;
  if (e.lifecycle === 'RESPAWN') {
    if (!e.active) onRespawn(e); else onRevert(e);
  } else {
    onDespawn(e);
  }
}
```

## 5. Lands in

- TARGET origins/server/world-spawns.ts (exists: the server already owns each spawn's alive / respawn clock and `kill_report`; per-row window `respawnSeconds` is read via `respawnMsOf` in origins/server/mob-rewards.ts, default RESPAWN_MS). The donor's generic countdown is therefore already done there; what is genuinely new is only the population-scaled respawn (`scaleByPopulation`) and the DESPAWN lifecycle for timed event creatures (a new field on origins/mobs/row.ts if wanted). Not src/fight/ai.ts: the timer is not the brain.
- Parity-checklist row 4 (fight loop: a respawned creature re-enters at home with full state) and row 17 (death / respawn: open-world respawn by design); feature map: zones as data.
- Reuse tag: adapt

Brief rule served: (category default, not per-cell) 4 (zones are data); rules 7-9 n/a

## 6. Gaps and risks

- Server-verified kills: Frankendom's spawn clock already lives on the server (origins/server/world-spawns.ts), so the donor's tick countdown must not be copied as a second clock. Only the scale function is worth taking, and its player count must come from the server's own session count.
- One ledger: a respawn must never reopen a paid kill; the paid-kill window is the per-account respawn window in mob-rewards.ts (database read), not an entity timer. The donor has no such ledger link.
- Zones as data: the donor's map-placed spawns use duration -1 (no timer); Frankendom's per-row `respawnSeconds` (60..90 s, row.ts 37) is a catalogue / row field and the population scale must also be a field, not the literals 4000 and 2000 (no hidden numbers).
- MAX_ATTACKERS = 3: respawn count says nothing about engaged creatures; a respawned creature joins the ring queue, at most 3 engaged on one player (src/fight/world.ts).
- Conflict check: a lifecycle timer in a client-side AI file would split the one-engine rule; keep it on the server.
- The throw-and-retry-next-tick path exists because of NPC id exhaustion; Frankendom has no id pool, so it does not carry over.
