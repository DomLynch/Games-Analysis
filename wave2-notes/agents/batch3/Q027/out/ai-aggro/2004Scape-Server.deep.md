# 2004Scape-Server (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/2004Scape-Server/src/engine/entity/Npc.ts` (with `src/cache/config/HuntType.ts`, `src/engine/script/ScriptIterators.ts`, `src/engine/World.ts`) | Licence: MIT License, "Copyright (c) 2023-2025 Lost City" (LICENSE lines 1-3; permissive: code may be adapted) | TypeScript | symbols `Npc.huntAll`, `Npc.huntPlayers`, `Npc.consumeHuntTarget`, `Npc.turn`, `World.processWorld`

Checked: Read in full the player hunt path: `Npc.turn` hunt gate (Npc.ts 156-170), `huntAll` (247-280), `consumeHuntTarget` (879-911), `huntPlayers` (913-965); `HuntType` config fields and decode codes (HuntType.ts 98-131); `HuntIterator` zone scan and distance filter (ScriptIterators.ts 35-90); the tick order in `World.cycle` (World.ts 366-392) and the player-hunt loop (World.ts 607-618). Other candidates opened: `src/engine/script/handlers/NpcOps.ts` (the hint file; only NPC_SETHUNT and NPC_SETHUNTMODE at 173-184, which set `huntrange` and `huntMode`, so it is script glue, not the mechanism), `HuntVis.ts`, `HuntCheckNotTooStrong.ts`, `HuntNobodyNear.ts`, `HuntModeType.ts`, `ScriptIterators.ts` NPC iterator (grep only). Not read: the line-of-sight and line-of-walk helpers (`isLineOfSight`, `isLineOfWalk`), `CoordGrid.distanceToSW`, `setInteraction` (the handoff to a script), the NPC and object and scenery hunts beyond their iterator calls (Npc.ts 967-980), and the reset paths that also zero `huntClock` at Npc.ts 309 and 419. Confidence: high on the player-hunt order and filters as written; the vision helpers are treated as black boxes. camera_scope: n/a (ai-aggro).

Best transferable idea: an NPC aggro scan is a list of named filters (range, vision, not busy, not afk, not too strong, not recently in combat, never the NPC's own recent combat), then a random pick among the survivors, with a clock that gates the scan and resets on a find.
Decision (proposed): adapt - take the filter-chain shape and the data fields (range, vision, grace, throttle, keep-hunting) for Frankendom's aggro scan in the fight loop, but hand off to an engage state change rather than a script interaction, and cap engaged attackers at MAX_ATTACKERS = 3.
Acceptance: server test: an NPC with huntrange 8 and rate 3, with one eligible player in range, does not engage on its first two turns and engages on the third; a player whose last combat was within 8 ticks is never engaged by the scan; with two eligible players one is engaged, chosen by a seeded random, and the NPC returns to idle after the engage unless keepHunting is set.

## 1. Mechanism

- Driving loop: `World.cycle` (World.ts 366-396) runs, in order, the world queue and player hunts (`processWorld`, line 377), client input (`processClientsIn`, 384), the NPC event queue (387), then `processNpcs` (called at 396), which calls `npc.turn()` for each NPC (716-718). Player-type hunts are not in `turn()`: `processWorld` calls `npc.huntAll()` for live NPCs that have a hunt mode and at least one observing client (World.ts 607-616). Non-player hunts (NPC, object, scenery) run in `Npc.turn` (Npc.ts 157-167 calls `huntAll` when the type is not PLAYER). This is a fixed per-tick loop, not a variable step.
- Gate (Npc.ts 157-168): a hunt runs only if `huntMode !== -1`. The clock `huntClock` increments unless the hunt is paused: the pause applies only when `nobodyNear` is PAUSEHUNT and no client observes the NPC, and a PLAYER-type hunt is never paused by this line (160-167, the player condition is in the `if` at 160).
- Scan (`huntAll`, 247-280): clears `huntTarget` (248). Throttle: returns if `huntClock < hunt.rate - 1` (253). Returns if the type is OFF or `huntrange < 1` (258). Then it collects candidates, picks one uniformly at random, and sets it as `huntTarget` (275).
- Candidates for players (`huntPlayers`, 913-965), in this order:
  1. Zone scan: `HuntIterator` over `huntrange` (916). The scan covers `1 + distance / 8` zones each way (ScriptIterators.ts 56), then drops players beyond `distance` (83) and, when `checkVis` is set, those without line of sight or walk (not read; helper bodies not read).
  2. `checkNotBusy` skips busy players (`player.busy()`).
  3. `checkAfk` (default true, HuntType.ts 97; config code 10 sets it false, line 129) skips AFK players.
  4. `checkNotTooStrong` set to OUTSIDE_WILDERNESS skips a player outside the wilderness whose combat level is above the NPC's `vislevel * 2` (931).
  5. Recent combat (934-938): unless the player is already this NPC's target or the tile is multi-combat, the player is skipped if `checkNotCombat` var + 8 is above the current tick, and the NPC is skipped on its own `checkNotCombatSelf` var + 8 likewise.
  6. Var and inventory conditions (`checkVars`, `checkInv`): each must hold (939-965, read; the `checkHuntCondition` comparison is HuntType.ts, read).
- Handoff (`consumeHuntTarget`, 879-911): if `huntTarget` is set, it either runs a QUEUE trigger (when `findNewMode` is a queue mode) or calls `setInteraction(SCRIPT, huntTarget, findNewMode)` (898). Then `huntTarget` is cleared and `huntClock` is zeroed (902-903). If `findKeepHunting` is false, the hunt is switched off (`huntMode = -1`, 907-908).
- Numbers come from the config (HuntType.ts): `rate` defaults to 1 (98) and is read at 131; `nobodyNear` at 123; `checkNotCombat` at 125 (the var id); `huntrange` per NPC type (Npc.ts 102). `vislevel` is per NPC type.

## 2. Key functions

- `Npc.turn` hunt gate: `/mnt/frankendom-donors/2004Scape-Server/src/engine/entity/Npc.ts` 156-170.
- `Npc.huntAll`: `/mnt/frankendom-donors/2004Scape-Server/src/engine/entity/Npc.ts` 247-280 (throttle, range check, pick).
- `Npc.huntPlayers`: `/mnt/frankendom-donors/2004Scape-Server/src/engine/entity/Npc.ts` 913-965 (candidate filters in order).
- `Npc.consumeHuntTarget`: `/mnt/frankendom-donors/2004Scape-Server/src/engine/entity/Npc.ts` 879-911 (handoff, clock reset, keep-hunting).
- `HuntIterator`: `/mnt/frankendom-donors/2004Scape-Server/src/engine/script/ScriptIterators.ts` 35-90 (zone scan, distance, vis).
- `World.cycle` order and player-hunt loop: `/mnt/frankendom-donors/2004Scape-Server/src/engine/World.ts` 366-392 and 607-618.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants and fields |
|---|---|
| Throttle before the first scan (cooldown after a find or reset) | `huntClock < hunt.rate - 1` (253); `rate` default 1 (HuntType.ts 98), read at 131 |
| Zone scan radius | `1 + distance / 8` zones (ScriptIterators.ts 56) |
| Distance cut | `distance` = huntrange (83, Npc.ts 916) |
| Too-strong gate | combat level above `vislevel * 2` outside wilderness (931) |
| Recent-combat grace | 8 ticks, for the player's var and for the NPC's own var (935, 938) |
| Random pick | `Math.floor(Math.random() * hunted.length)` (275) |
| Keep hunting after a find | `findKeepHunting` (907) |
| Pause when unobserved | `nobodyNear` PAUSEHUNT (160, 123) |

## 4. TypeScript sketch

simplified: the sketch keeps the player-hunt path only: the candidate filters in the donor order (range, vision, busy, afk, too-strong, recent combat for the player and the NPC), the throttle, the random pick, the clock reset on a find and the keep-hunting switch. It omits the NPC, object and scenery hunts, the zone iterator (range and vision are passed in as predicates), the var and inventory conditions, the nobodyNear pause and the observer gate in `World`, the QUEUE-trigger handoff, and the `setInteraction` call. The donor clears `huntTarget` at the start of each scan; the sketch returns the found player instead. The sketch is shape-only (MIT donor).

```ts
// Licence of donor: MIT (Lost City, 2023-2025). Adaptable; this sketch is written from the described rule.
interface Player {
  x: number; z: number;
  combatLevel: number;
  busy: boolean;
  afk: boolean;
  inWild: boolean;
  lastCombatTick: number;   // tick of the player's last combat (the var the hunt reads)
}

interface HuntCfg {
  rate: number;             // throttle, in NPC turns
  keepHunting: boolean;     // findKeepHunting
  checkNotBusy: boolean;
  checkNotTooStrong: boolean;
}

interface NpcState {
  range: number;            // huntrange
  vislevel: number;
  clock: number;            // huntClock
  huntOn: boolean;          // huntMode !== -1
  target: Player | null;    // current interaction target, if any
  selfCombatTick: number;   // the NPC's own recent-combat tick
}

const GRACE_TICKS = 8;      // donor: skip when lastCombat + 8 > currentTick

function eligible(
  p: Player, n: NpcState, h: HuntCfg, tick: number,
  inRange: (p: Player) => boolean, visible: (p: Player) => boolean, isMulti: boolean,
): boolean {
  if (!inRange(p) || !visible(p)) return false;
  if (h.checkNotBusy && p.busy) return false;
  if (p.afk) return false;
  if (h.checkNotTooStrong && !p.inWild && p.combatLevel > n.vislevel * 2) return false;
  if (n.target !== p && !isMulti) {
    if (p.lastCombatTick + GRACE_TICKS > tick) return false;
    if (n.selfCombatTick + GRACE_TICKS > tick) return false;
  }
  return true;
}

// One NPC turn in the donor's order: clear the target, throttle, scan, count the clock, consume a find.
function huntTurn(
  n: NpcState, h: HuntCfg | null, players: Player[], tick: number, rnd: () => number,
  inRange: (p: Player) => boolean, visible: (p: Player) => boolean, isMultiAt: (p: Player) => boolean,
): Player | null {
  if (!h || !n.huntOn) return null;
  let found: Player | null = null;
  if (n.clock >= h.rate - 1 && n.range >= 1) {
    const ok = players.filter(p => eligible(p, n, h, tick, inRange, visible, isMultiAt(p)));
    if (ok.length > 0) found = ok[Math.floor(rnd() * ok.length)];
  }
  n.clock++;
  if (found) {
    n.clock = 0;
    if (!h.keepHunting) n.huntOn = false;
  }
  return found;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 /tmp/q027-2004scape.ts` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/aggro.ts` (new module: the engine's aggro scan for a monster, server side; the Pit and the zone clients only display the engage). Parity-checklist row 4 (fight loop: aggro, chase, leash).
- Reuse tag: adapt (MIT: code may be adapted; shape only in this note)
- Brief rule served: 1 (one engine: aggro lives in the engine, not in a client); zones as data (range, vision, grace fields come from zone data); rules 7-9 n/a

## 6. Gaps and risks

- The donor's engage is a script interaction (`setInteraction` with a find mode). Frankendom's ruling is that engage is a state change, so the handoff must set the monster's engaged state and nothing else.
- The donor picks one target per scan and has no cap on how many NPCs engage the same player. Frankendom's MAX_ATTACKERS = 3 needs an explicit cap and a rule for the fourth monster (wait, or leash), which the donor does not have.
- `rate` is not a scan interval. With no find, `huntClock` keeps growing, so the scan repeats every NPC turn after the warm-up. The throttle only spaces scans after a find or a reset (253, 903). Do not port it as a periodic timer; a server test should assert the warm-up.
- The grace uses per-entity vars (`checkNotCombat`, `checkNotCombatSelf`) set elsewhere in the donor. Frankendom has one ledger: the grace must read the single last-combat tick of that ledger, and the place that writes it was not read here.
- The too-strong gate compares combat level with `vislevel * 2` outside the wilderness. Frankendom has no wilderness; keep the gate only as a zone flag if a zone needs a level filter.
- Observer gating (World.ts 612) is a compute budget: player-hunt scans run only for NPCs a client observes. Frankendom's server runs every zone, so a per-zone active-set rule would be needed, and the donor does not show it.
- Vision helpers (line of sight, line of walk) are not read; if Frankendom needs vision, it must write its own.
- Ordering: the player scan runs before client input and before NPC turns in the same tick (World.ts 377, 389). Frankendom's fixed-step ordering (input intake, then engine) must put the scan in one place.

Reuse tag: adapt (MIT; code may be adapted; shape only here)
Brief rule served: 1 (one engine); zones as data; rules 7-9 n/a
