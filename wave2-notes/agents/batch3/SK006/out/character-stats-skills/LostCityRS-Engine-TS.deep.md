# LostCityRS-Engine-TS (character-stats-skills, cell 2)

Donor: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/Player.ts` (with `World.ts`, `PathingEntity.ts`, `NetworkPlayer.ts`, `PlayerLoading.ts`, `MoveClickHandler.ts`, `Npc.ts`, `PlayerOps.ts`) | Licence: MIT ("Copyright (c) 2023-2026 Lost City", LICENSE file) | TypeScript | symbols `updateEnergy`, `calculateRunWeight`, `getLevelByExp`, `getCombatLevel`, `applyDamage`

Checked: Read in full: `updateEnergy` (Player 701-723), `calculateRunWeight` (617-646), `getCombatLevel` (1347-1353), the XP table and `getLevelByExp` (76-100), `applyDamage` (1939-1946), the run-energy and tick lines in `World.cycle` (340-348, 378, 415, 504-508, 722, 1139-1149), `processMovement` (PathingEntity 135-150) and `resetPathingEntity` (593-604), `NetworkPlayer` 326-328 and 379-393, `PlayerOps` 490-545 (script stat add/sub and run-energy op), `Npc.processRegen` (528-546). Callers: `updateEnergy` has one caller (World 722); `calculateRunWeight` has one caller (NetworkPlayer 388); `resetPathingEntity` is reached from `Player.resetEntity` (474) and Npc (327). Confidence high on the run-energy numbers (hand-checked and recomputed); high on the tick order. Not read: the content scripts that restore player levels and set run energy (not in this repo: `data/` holds only a word list and keys), the ObjType weight loader, the body of `processInteraction` beyond the movement call (Player 1287), the rest of `validateAndAdvanceStep`. The combat hit formulas are not in this repo (grep for accuracy, maxhit and bonus in `src` found none). camera_scope: not applicable.

Best transferable idea: A per-tick stamina bar where sprinting drains it by carried weight (capped at 64 kg), walking or standing still refills it by agility, and an empty bar switches sprint off.
Decision (proposed): adapt - the meter, the weight cap and the refill-by-agility rule fit Frankendom's stamina economy (sprint, then melee); Frankendom charges attack, heavy, block and roll from the same meter and states the tick length.
Acceptance: A server test asserts that 150 running ticks at 0 kg empty a 10000 bar from full and that one idle tick at agility 1 adds 8; the Pit and zones show the bar falling about 1.34 percentage points per 0.6 s tick at 64 kg, and sprint switching off at zero until it is pressed again.

## 1. Mechanism

- Tick loop: `World.cycle()` runs once per tick. The tick is fixed at 600 ms (World 120: "private static readonly TICKRATE: number = 600;"). Each cycle measures drift (343) and schedules the next cycle at `nextTick += tickRate` (504) with the drift subtracted from the timeout (508). Order inside the cycle: world queue (348), clients in, NPC events, NPC turns (regen runs here, Npc 175), player turns (378), logouts, logins, zones, info, client output (408), cleanup (415), which resets each player's pathing state (1149; Player 474 then PathingEntity 593-602, which sets `stepsTaken = 0`).
- Each player's turn: `updateMovement` moves the player (Player 1287, inside `processInteraction`). Walk is one step per tick. Run adds a second step if the first succeeded and the run flag is set (PathingEntity 146-149). `stepsTaken` counts tiles moved this tick (PathingEntity 247). Then `updateEnergy()` runs (World 722), so it sees this tick's step count.
- `updateEnergy` (Player 701-723), in this order:
  (a) if `stepsTaken < 2` (idle or walk): `recovered = floor(agility/6) + 8` (706), energy = min(energy + recovered, 10000) (707). Agility is the base level of stat 16 (AGILITY).
  (b) otherwise (two tiles this tick): `kg = clamp(runweight/1000, 0, 64)` (709-710); `loss = (67 + 67*kg/64) | 0` (711); energy = max(energy - loss, 0) (712).
  (c) if energy == 0: the run flag is set to 0 and the run var is written (715-718).
  (d) if energy < 100: the temporary run flag is cleared (720-721). Ctrl-run is refused below 100 in the move handler (MoveClickHandler 35-37).
- Weight. `calculateRunWeight` (617-646) sums `type.weight x count` for every item in inventories flagged `runweight` (628), skipping stackable objects (639) and adding grams (643). It runs only when a runweight inventory is marked changed (NetworkPlayer 379-388). The client gets `floor(kg)` (393).
- Readout: the client receives the energy whenever its whole-percent value changes (NetworkPlayer 326-328). Energy persists across logins (Player 204 write, PlayerLoading 82 read).
- Tired state: energy 0 turns the run flag off. Nothing else in this repo changes speed when the bar is empty (`defaultMoveSpeed` 729-731 returns WALK when run is off). A speed penalty, if any, lives in content (not read).

## 2. Key functions

- `updateEnergy`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/Player.ts` 701-723 (refill, drain, zero switch, below-100 guard).
- `calculateRunWeight`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/Player.ts` 617-646.
- `World.cycle` order: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/World.ts` 340-508 and cleanup 1139-1149.
- Level from XP: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/Player.ts` 76-100.
- Combat level: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/Player.ts` 1347-1353.

## 3. Numbers vs mechanism (stat and skill table, SK focus)

| Stat or skill | What it does | Formula | Number ranges (typical) | Caps (soft/hard) | file:line |
|---|---|---|---|---|---|
| Run energy (stamina) | Sprint meter, persists across logins | 0..10000 stored (100.00% shown) | start 10000 (full) | hard 0 and 10000 | Player.ts:293, 204, 82 |
| Refill (walk or idle) | Recovers per tick when fewer than 2 tiles moved | floor(agility/6) + 8 per tick | 8 per tick (agility 1) to 24 (agility 99); full refill from 0: 1250 ticks = 750 s at agility 1, 417 ticks = 250 s at 99 (hand computed) | hard 10000 | Player.ts:705-707 |
| Drain (run pace, two tiles per tick) | Sprint cost per tick | (67 + 67 x kg/64) truncated; kg clamped 0..64 | 67 at 0 kg; 83 at 16 kg; 100 at 32 kg; 134 at 64 kg and above; full bar lasts 150 ticks = 90 s at 0 kg, 75 ticks = 45 s at 64 kg (hand computed) | floor 0; weight capped at 64 kg | Player.ts:709-712 |
| Carried weight | Feeds the drain | sum of type.weight x count over runweight inventories; stackables skipped; grams | cap 64 kg for the drain; the object weights are not in this repo (not read) | 64 kg (drain cap) | Player.ts:617-646; NetworkPlayer.ts:388, 393 |
| Run gate (ctrl run) | Temporary run needs a bar | energy >= 100 to start | 100 (1.00%) | none | MoveClickHandler.ts:35-37; Player.ts:720-721 |
| Exhaustion | Run switch off at zero | energy == 0 sets run = 0 and writes the run var | 0 | none | Player.ts:715-717 |
| Steps per tick | Walk versus run pace | walk one tile; run a second tile if the first succeeded | 1 walk, 2 run | none | PathingEntity.ts:146-149, 247 |
| Level from XP | Stat level | threshold(L) = floor(sum of delta/4) x 10, delta = floor(L + 300 x 2^(L/7)) | level 2 at 830 stored (83.0 shown); level 99 at 130,344,310 stored (13,034,431 shown, hand computed) | level cap 99 | Player.ts:76-100 |
| XP gain | Adds XP per event | stat += xp x xpRate | rate from server config | stored cap 2,000,000,000 (200m shown) | Player.ts:1830-1835 |
| Combat level | One power readout | base = 0.25 x (def + hits + floor(pray/2)); melee = 0.325 x (att + str); range = 0.325 x (floor(R/2) + R); magic = 0.325 x (floor(M/2) + M); CL = floor(base + max(melee, range, magic)) | min 3 (all 1, hits 10); max 126 (all 99); hand computed | none | Player.ts:1347-1352 |
| Hit points | Health pool | current - damage, floor 0 | start base 10 (PlayerLoading 47-49); base level up to 99 | floor 0 | Player.ts:1939-1946 |
| Script boost | Temporary raise (content) | current + constant + base x percent/100, cap 255 | cap 255 | hard 255 | PlayerOps.ts:521-525 |
| Script drain | Temporary lowering (content) | current - (constant + base x percent/100), floor 0 | floor 0 | hard 0 | PlayerOps.ts:541-545 |
| NPC stat regen | NPC current moves back to base | +1 or -1 per regen interval | interval default 100 ticks = 60 s (NpcType 99) | none | Npc.ts:175, 529-544 |
| Stat table | Slots and enabled flags | 21 slots, 2 disabled (stats 18 and 19) | 21 | none | PlayerStat.ts:53 |
| Magic, prayer, luck, weapon skills | not in this repo | no formulas found in src | not read | not applicable | none found (grep for accuracy, maxhit, bonus) |

## 4. TypeScript sketch

simplified: keeps the donor's order (refill or drain, then the zero switch and the below-100 guard) and its constants (10000, 100, 64 kg, 67 and 67/64, +8 and /6). It takes the step count as an input and omits the movement itself (the second run step), the 600 ms tick loop and drift, the client readout throttle, persistence, the run var write, content scripts that add or drain energy, and the object weight loader. It recomputes the carried weight only when called, where the donor caches it and refreshes on an inventory change (stale-state risk, section 6).

```ts
// Licence: MIT (donor, LostCity LICENSE). Adapted from the mechanism; written as a fresh function, not a line-by-line translation.
// Stamina is stored x100: 10000 = 100.00%.

export const RUN_MAX = 10000;      // donor: runenergy cap
export const RUN_START_MIN = 100;  // donor: temporary run is refused below 100
export const WEIGHT_CAP_KG = 64;   // donor: drain stops getting heavier above 64 kg

export interface CarriedItem {
  weightGrams: number;
  count: number;
  stackable: boolean;
}

// Donor calculateRunWeight: stackable objects are skipped; the rest add weight x count (grams).
export function carriedGrams(items: CarriedItem[]): number {
  let total = 0;
  for (const it of items) {
    if (it.stackable) continue;
    total += it.weightGrams * it.count;
  }
  return total;
}

export interface Stamina {
  energy: number;   // 0..RUN_MAX
  running: boolean; // persistent run switch
  tempRun: boolean; // ctrl-run for this move
}

// One tick, after movement. stepsThisTick: 0 idle, 1 walk, 2 run pace (donor stepsTaken).
// Order: refill (walk or idle) or drain (run pace), then the zero and below-100 guards.
export function tickStamina(s: Stamina, stepsThisTick: number, agility: number, grams: number): Stamina {
  let energy = s.energy;
  if (stepsThisTick < 2) {
    const recovered = Math.floor(agility / 6) + 8;
    energy = Math.min(energy + recovered, RUN_MAX);
  } else {
    const kg = Math.min(Math.max(grams / 1000, 0), WEIGHT_CAP_KG);
    const loss = Math.trunc(67 + (67 * kg) / 64);
    energy = Math.max(energy - loss, 0);
  }
  let running = s.running;
  let tempRun = s.tempRun;
  if (energy === 0) running = false;            // exhausted: the run switch turns off
  if (energy < RUN_START_MIN) tempRun = false;  // below 1.00%: temporary run is cleared
  return { energy, running, tempRun };
}

export function canStartTempRun(s: Stamina): boolean {
  return s.energy >= RUN_START_MIN;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/stamina.ts` (new module): one stamina bar for sprint now and attack, heavy, block and roll later, updated once per engine tick on the server. Parity-checklist row 3 (guard, parry, stamina). The constants (10000, 100, 64 kg, 67 base, 67 slope, +8, /6) become fields of the catalogue (row 21 data), not literals.
- Reuse tag: adapt (MIT: code may be adapted; this note keeps the rules and writes a fresh function)
- Brief rule served: 1 (one engine, one ledger for stamina), 9 n/a; the tick is the engine tick, not a frame

## 6. Gaps and risks

- The donor charges stamina only for movement. Attack, heavy, block and roll costs are not in this repo (not read: content). Frankendom's melee economy needs its own costs on the same bar; do not copy the 67 and 67/64 as attack costs.
- Tick length: the donor drains 67 to 134 per 600 ms tick. Frankendom must state its own tick length before using these numbers; the bar lasts 90 s at 0 kg and 45 s at 64 kg on a 600 ms tick (hand computed).
- Stackables weigh nothing (Player 639): a stack of 1,000 of anything adds no drain. Decide for Frankendom: count stacks by count x weight, or document the exception.
- Stale weight: the run weight is cached and recalculated only when a runweight inventory is marked changed (NetworkPlayer 379-388). Any item change that skips the dirty flag leaves the drain wrong. Fix: recalculate in the one ledger write that changes items; the sketch computes it on demand instead.
- Partial run: if the first of two steps succeeds and the second is blocked, the tick counts as walk and refills (PathingEntity 146-149, 247). That is a free refill next to a wall. Keep it or count the blocked step as a run tick; choose one and test it.
- Tired state: at zero, only the run switch turns off (Player 715-717). No speed or damage penalty is in this repo. Frankendom's "tired body" needs a rule for hits and blocks (rows 3 and 17), not only sprint.
- Server rulings: the bar lives on the server with the engine tick (checklist row 3, one ledger); the readout (NetworkPlayer 326-328) is client-only and row 14 (HUD). MAX_ATTACKERS = 3 is not touched by this mechanism.
