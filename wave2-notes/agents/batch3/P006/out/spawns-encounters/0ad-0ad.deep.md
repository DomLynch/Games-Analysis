# 0ad-0ad (spawns-encounters, cell 4)

Donor: `/mnt/frankendom-donors/0ad-0ad/binaries/data/mods/public/maps/random/danubius_triggers.js` | Licence: GPL version 2 (or later) (top-level `LICENSE.txt` line 18 for `binaries/data/`; `binaries/data/mods/public/maps/random/LICENSE.txt` line 1 says the JS files there are "available under the same license as the remainder of binaries/data/, i.e. GPL version 2 (or later)") | JavaScript (map trigger script) | symbols `Trigger.prototype.SpawnCCAttackers`, `Trigger.prototype.SpawnShips`, `Trigger.prototype.FillShips`

Checked: Opened `danubius_triggers.js` and read these in full: the header and count helpers (1-2, 62-102), the riverside and target constants (138-179), the civic-centre waves (236-275), ship spawning (322-351), the composition function (353-379), `FillShips` (381-405), `GetActiveRiversides` (488-505), the ownership handler and init (604-661). Read `scripts/TriggerHelper.js` 67-70 (`GetMinutes`) and the start of `BalancedTemplateComposition` (495-525). Not read: the body of `AttackAndPatrol` (only lines 434-452 by grep output), the rest of `BalancedTemplateComposition` and `SpawnUnits`, `CheckShipRange` (656), `UngarrisonShipsOrder`. The other trigger maps (`ambush.js`, `jebel_barkal_triggers.js`, `survivalofthefittest_triggers.js`) were not opened. The ship-count trace below was checked by running a copy of the same loop on the VPS with node (`refillAsWritten` in the sketch); the donor itself was not run. Confidence high on the order of operations and the constants; high on the loop reading.

## 1. Mechanism

- Clock: every timer is game time in minutes, `TriggerHelper.GetMinutes` = engine timer / 60 / 1000 (`TriggerHelper.js` 69). Every wave is a one-shot `DoAfterDelay` that reschedules itself, not a per-tick loop.
- Civic-centre waves (`SpawnCCAttackers`, 236-275). For each gaia civic centre in the set (242): skip it if it is no longer in the world (244), or if its riverside is not active (247-249). The riverside is active only when some player-owned entity of class `Defensive` stands on that side (`GetActiveRiversides`, 488-505; class set at 138). The wave size is `ccAttackerCount(t) = min(20, max(0, round(1.5 t)))` (76), split across templates by `BalancedTemplateComposition` (251), spawned at that centre (258), then sent to attack and patrol (270). The next wave is scheduled after `randFloat(6, 8)` minutes (71, 274), but only if the civic-centre set is not empty (273). The function does not read how many of its attackers are still alive (the body at 236-275 has no such check). So the cap on these waves is the per-wave count curve, not a live count.
- Ship director (`SpawnShips`, 326-351). Target: `shipCount(t, players) = max(2, round(min(1.5, t / 10) x players))` (87). Refill: `shipSpawnCount = target - alive` (330), then `while (alive < shipSpawnCount)` spawns one ship per pass (334-340). Every ship then gets attack and patrol orders (342-343). The next ship wave is scheduled after `randFloat(8, 10)` minutes (81, 345). The fill timer is cancelled (348) and `FillShips` runs at once (350).
- Ship fill (`FillShips`, 381-405). Each ship with a garrison is topped up to `attackersPerShip(t) = min(30, round(2 t))` minus the garrisoned count (392, curve at 102). The next fill is scheduled after `randFloat(4, 5)` minutes (97, 404).
- Alive tracking. `this.ships` and `this.heroes` are Sets (627-628). An ownership change away from gaia (player 0) removes the entity from the Sets (`DanubiusOwnershipChange`, 604-619; ships at 612, civic centres at 615). The civic-centre set is built at init (631).
- Init order (621-655): build sets, register the ownership trigger, garrison and turret the Gallic buildings, spawn initial defenders, call `SpawnCCAttackers` (652), call `SpawnShips` (654), start the ungarrison timer (655) and the 5-second range check (656).
- Numbers at a glance (arithmetic on the formulas): at t = 0 the civic-centre count is 0 and the ship target is 2. The civic-centre count reaches the cap of 20 at t = 13 (1.5 x 13 = 19.5, which rounds to 20). The ship target reaches its curve cap of 1.5 x players at t = 15. Per-ship attackers reach the cap of 30 at about t = 15 (round(2 x 14.75) = 30).

## 2. Key functions

- `Trigger.prototype.SpawnCCAttackers`: `/mnt/frankendom-donors/0ad-0ad/binaries/data/mods/public/maps/random/danubius_triggers.js` 236-275. Civic-centre waves: count, side gate, reschedule.
- `Trigger.prototype.SpawnShips`: same file, 326-351. Ship target, refill loop, respawn timer, fill timer cancel.
- `Trigger.prototype.FillShips`: same file, 381-405. Per-ship fill to the attackers-per-ship curve.
- `Trigger.prototype.GetActiveRiversides`: same file, 488-505. Side activity from the player's `Defensive` entities.
- `Trigger.prototype.DanubiusOwnershipChange`: same file, 604-619. Set removal on capture or death.
- `TriggerHelper.GetMinutes`: `/mnt/frankendom-donors/0ad-0ad/binaries/data/mods/public/maps/scripts/TriggerHelper.js` 67-70.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Wave size from a time curve, capped at a fixed maximum | `min(20, max(0, round(1.5 t)))` (danubius_triggers.js 76) |
| Random respawn delay between waves | 6 to 8 min for civic-centre waves (71); 8 to 10 min for ship waves (81); 4 to 5 min for ship fills (97) |
| Target count curve with a floor of 2 and a cap scaled by players | `max(2, round(min(1.5, t / 10) x players))` (87) |
| Per-carrier fill to a time curve, minus what is already there | `min(30, round(2 t))` minus garrisoned count (102, 392) |
| Wave gated by a side that has a live target | Target class `Defensive` (138); side check (488-505) |
| Stop rescheduling when the set of sources is empty | `if (this.civicCenters.size)` (273) |
| Remove a dead or captured member from the alive Set | `this.ships.delete(data.entity)` (612) |
| Refill loop (see the note on what it reaches) | `while (this.ships.size < shipSpawnCount)` (334) |

## 4. TypeScript sketch

simplified: the sketch keeps the three time curves (civic-centre wave count, ship target, attackers per ship), the randomised respawn delay, and both refill loops. It shows the donor's loop as written (`refillAsWritten`, which compares the alive count with the number still missing, lines 330-334) next to the loop its own comment describes (`refillToTarget`, comment at 323-324). The donor's loop is not corrected in the sketch. It omits the civic-centre alive check and riverside gate (247-249, 488-505), the template split (`BalancedTemplateComposition`), the garrison fill, the timer cancel, the Set removal on ownership change (604-619), and the attack and patrol orders. The respawn delay takes a uniform random number as input instead of calling `randFloat`.

```ts
// clean-room: written from the described mechanism, not a translation of the donor lines
// Time-scaled targets. t is game minutes; players is the number of active players.
export const ccWaveCount = (t: number): number => Math.min(20, Math.max(0, Math.round(t * 1.5)));
export const shipTarget = (t: number, players: number): number =>
  Math.max(2, Math.round(Math.min(1.5, t / 10) * players));
export const attackersPerShip = (t: number): number => Math.min(30, Math.round(t * 2));

// Refill as the donor's loop is written: spawns while alive < (target - alive).
export function refillAsWritten(alive: number, target: number, spawnOne: () => void): number {
  const toSpawn = target - alive;
  while (alive < toSpawn) { spawnOne(); alive += 1; }
  return alive;
}

// Refill to the target the donor's own comment describes: spawns while alive < target.
export function refillToTarget(alive: number, target: number, spawnOne: () => void): number {
  while (alive < target) { spawnOne(); alive += 1; }
  return alive;
}

// Respawn delay in milliseconds for a wave, given a uniform random number u in [0, 1).
export function respawnDelayMs(minMinutes: number, maxMinutes: number, u: number): number {
  return (minMinutes + (maxMinutes - minMinutes) * u) * 60 * 1000;
}
```

Typecheck: `work/0ad/wave-director.ts` (with `export {};`) passed `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

Trace of the as-written loop (run on the VPS with node, a copy of the donor's loop logic, not the donor itself). Target 4: alive 0 gives 4, alive 1 gives 3, alive 2 gives 2, alive 3 gives 3, alive 4 gives 4. Intended (`refillToTarget`): 4 in every case. Target 2: alive 0 gives 2, alive 1 gives 1, alive 2 gives 2. In general the as-written result is max(alive, target minus alive), so with any ship alive it never refills to the target.

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (the spawn director for zone population; Lead's ruling). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer). The cap, respawn range and coverage are zone data fields; the refill rule is engine logic.
- today: Frankendom's `origins/server/world-spawns.ts` was not checked in this pass (no repo access in this task).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: zones as data (cap, respawn, grace and coverage as zone fields); one ledger (the alive set is server-owned and pruned on the server's death event); server-verified kills (spawns do not decide kills).

Best transferable idea: Drive a zone's population from a time-scaled target with a randomised respawn timer and a server-owned alive set pruned on death, and test the refill rule so that it refills to the target and not to the missing count.

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not translated from the donor lines.
- The donor's refill loop is likely wrong as written. `while (this.ships.size < shipSpawnCount)` compares the alive count with the number still missing (330-334), so the director only refills to target minus alive. Its own comment (323-324, and 2 at the top of the file) says the intent is to reach the target. Frankendom must not copy this; the test is "alive ends at the target after a refill, from any alive count".
- Civic-centre waves have no alive cap. A wave is sent on the timer while a centre stands (273-274), so the only limit is the per-wave curve (76). For row 23, the zone cap must be a data field checked against the live count, not a timer.
- No despawn on empty and no grace timer were found in this file. Capture removes the centre from the set (615), and a side with no `Defensive` target stops getting waves (248-249). Row 23's despawn-on-empty with a grace timer has no source here.
- Respawn timers are one-shot engine delays (`DoAfterDelay`), using engine time. Frankendom's respawn must run on the server fixed step with a per-tick NPC budget (server tick sub-line, row 18 / post-K item 3), not a wall-clock delay.
- MAX_ATTACKERS = 3 is not a donor concept. The waves send whole groups (`AttackAndPatrol` with the full wave list, 270 and 343). The three-attacker rule must apply at engage, not at spawn, and this donor does not show it.
- Not read: the `AttackAndPatrol` body, the rest of `BalancedTemplateComposition`, `SpawnUnits`, `CheckShipRange`. Nothing in this note depends on them except the claim that a wave's units are sent to attack (a call at 270 and 343, body not read).
