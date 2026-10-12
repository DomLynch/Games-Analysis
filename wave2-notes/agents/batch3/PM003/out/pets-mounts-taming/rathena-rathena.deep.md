# rathena-rathena (pets-mounts-taming, cell 29)

Donor: `/mnt/frankendom-donors/rathena-rathena/src/map/pet.cpp` (plus `src/map/clif.cpp`, `src/map/script.cpp`, `src/common/random.hpp`, `conf/battle/pet.conf`, `db/re/pet_db.yml`) | Licence: GPL-3.0 (LICENSE file: GNU GENERAL PUBLIC LICENSE, Version 3, 29 June 2007; `pet.cpp` line 1: "Licensed under GNU GPL") | C++ | symbol `pet_catch_process_end`

Checked: read in full: `pet.cpp` 1214-1357 (`pet_catch_process_start`, `pet_catch_process_end`: gates, rate, roll, outcome), `pet.cpp` 281-286 (CaptureRate load cap), `pet.hpp` 43 (field comment), `common/random.hpp` 37-39 (`rnd_chance`), `script.cpp` 12650-12694 (`catchpet` built-in), `clif.cpp` 14719-14722 (client confirm handler), `db/re/pet_db.yml` 1-40 (field documentation). Read by grep only: `conf/battle/pet.conf` 17-29 (values), `beastlyhypnosis.cpp` 20 (one universal capture call), `pet.cpp` 1368 (`pet_get_egg`, not read beyond its signature). Data counts by grep on `pet_db.yml`: 107 active `- Mob:` entries, 107 active CaptureRate lines, values 0 to 5000, 27 entries at 0; 44 CaptureRate lines are commented-out templates and were not counted. Not searched in this pass: mount speed and dismount, stabling, summon rules (only the capture path was taken). Not read: the pet_db parser defaults when CaptureRate is absent, `intif_create_pet` and its inter-server reply, the lure consumption for item-invoked captures (the donor says FIXME at 1267), the `distance_bl` unit, the skill rules of the universal capture beyond line 20. Confidence: high on the order of gates and the rate formula (read end to end, one roll path); medium on the default when CaptureRate is missing (not read).

## 1. Mechanism

- Start (`pet_catch_process_start`, 1214-1234): a lure starts a capture process for the player's character. Two entry points: the `catchpet` script built-in (`script.cpp` 12654-12693, lure id from argument or the item being used) and the universal capture from a skill (`beastlyhypnosis.cpp` 20). The process stores the lure item id and a flag (1230-1231) and sends the catch UI (1233). Nothing is rolled yet.
- Flags (1278-1302): `PET_CATCH_NORMAL` needs the lure to equal the pet's tame item (1281); `PET_CATCH_UNIVERSAL_NO_BOSS` refuses targets with status immunity (1291); `PET_CATCH_UNIVERSAL_ALL` checks nothing (1299-1301).
- Confirm (`pet_catch_process_end`, 1241): the client's confirm packet (`clif.cpp` 14722) names the target monster. Order of refusals, each erasing the process and sending a failed roulette:
  (a) process and monster exist and the monster is on a map (1242-1257);
  (b) map does not carry the no-capture flag (1259-1265);
  (c) the monster has a pet database entry (1269-1276);
  (d) the flag check above (1278-1302);
  (e) distance: refused if `pet_distance_check` is set and the distance is greater (1304-1309);
  (f) the character has a free inventory slot (1311-1317);
  (g) if `pet_hide_check` is set, a target with hiding, cloaking, camouflage, new moon or cloaking-exceed status is refused (1319-1326).
- Rate (1328-1339): default formula `R = C + floor((100 - hp%) * C / 100)` (1332), where C is the pet database CaptureRate. Floor of 1 (1335-1336). Server scale applied only when `pet_catch_rate` is not 100 (1338-1339).
- Roll (1341): `rnd_chance(R, 10000)` is true when a roll from 1 to 10000 is at most R (`random.hpp` 37-38). One roll per confirm.
- Success (1341-1349): achievement update, monster removed from the map and killed (1343-1344), success roulette, and a pet record created through the inter-server call with the pet's intimacy (1349). Failure: failed roulette (1351).
- Every path ends by erasing the process (1354 on the normal path; earlier returns erase it too), so a lure buys one attempt.
- Tick: none. Event-driven, one roll per confirm.

## 2. Key functions

- `pet_catch_process_start`: `/mnt/frankendom-donors/rathena-rathena/src/map/pet.cpp` 1214-1234. Stores lure and flag, sends the UI.
- `pet_catch_process_end`: `/mnt/frankendom-donors/rathena-rathena/src/map/pet.cpp` 1241-1357. All gates, the rate, the roll, the outcome.
- `rnd_chance`: `/mnt/frankendom-donors/rathena-rathena/src/common/random.hpp` 37-39. Roll from 1 to base, success if at most chance.
- `catchpet` built-in: `/mnt/frankendom-donors/rathena-rathena/src/map/script.cpp` 12654-12694.
- Client confirm handler: `/mnt/frankendom-donors/rathena-rathena/src/map/clif.cpp` 14719-14722.

## 3. Numbers vs mechanism

| Rule (formula) | Number or range | file:line |
|---|---|---|
| Rate domain: 10000 = 100% | `uint16 capture`, cap 10000 on load | pet.hpp 43; pet.cpp 281-286; pet_db.yml 38 |
| Default chance: `R = C + floor((100 - hp%) * C / 100)`, equal to about `C * (200 - hp%) / 100` | full HP: R = C. 50% HP: R about 1.5C. 1% HP: R about 2C | pet.cpp 1332 |
| Example, Poring: C = 2000 | 20% at full HP, about 40% near zero HP (2000 / 10000 and about 4000 / 10000) | pet_db.yml 58, 65; pet.cpp 1341 |
| Floor: `if (R < 1) R = 1` | minimum 1 in 10000 (0.01%) even when C = 0 | pet.cpp 1335-1336 |
| Server scale: `R = R * pet_catch_rate / 100` when not 100 | default 100 (no change) | pet.cpp 1338-1339; pet.conf 20 |
| Legacy formula (config off by default): `R = (C + (char_lv - mob_lv) * 30 + LUK * 20) * (200 - hp%) / 100` | config `pet_legacy_formula: no` | pet.cpp 1330; pet.conf 17 |
| Roll: success iff `1..10000 <= R` | one roll, 1 in 10000 steps | random.hpp 38; pet.cpp 1341 |
| Distance refusal when `pet_distance_check` set | 5 (units of `distance_bl`, not read) | pet.cpp 1304; pet.conf 26 |
| Hide refusal when `pet_hide_check` set | yes | pet.cpp 1321; pet.conf 29 |
| Data: CaptureRate per pet entry | 107 active entries; values 0 to 5000; 27 entries at 0 | pet_db.yml 65 (grammar at 38) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order (lure flag, distance, inventory, hidden, then the roll) and folds the first three refusals (no-capture map, monster on map, pet entry) into one. It omits the process store and UI messages, the legacy formula (config off by default), the luck and base-level terms, the achievement update, the removal and kill of the monster, the inter-server pet record, and the lure consumption (the donor marks it FIXME at 1267 and this sketch does not add it). The server scale is kept as an argument so the default 100 gives the donor result.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

type CatchFlag = "normal" | "universal-no-boss" | "universal-all";

interface CatchTarget {
  captureRate: number;   // pet database CaptureRate, 0..10000 (10000 = 100%)
  hpPct: number;         // current HP as a percent, 0..100
  statusImmune: boolean; // boss-type immunity
  lureMatchesPet: boolean;
  hasPetEntry: boolean;
  onMap: boolean;
}

interface CatchContext {
  flag: CatchFlag;
  distance: number;
  distanceMax: number;   // 0 disables the check (config)
  hasFreeInventorySlot: boolean;
  hidden: boolean;
  noCaptureMap: boolean;
  scalePct: number;      // server scale, 100 = no change
}

type CatchResult = "refused" | "missed" | "caught";

const MAX_RATE = 10000;

// Chance in 1/10000 units: base rate plus a bonus that grows as HP falls, floor 1.
function catchRate(captureRate: number, hpPct: number, scalePct: number): number {
  const base = Math.min(captureRate, MAX_RATE);
  let rate = base + Math.floor(((100 - hpPct) * base) / 100);
  if (rate < 1) rate = 1;
  if (scalePct !== 100) rate = Math.floor((rate * scalePct) / 100);
  return rate;
}

// One attempt. roll() returns an integer 1..10000; the attempt succeeds when roll <= rate.
// Order follows the donor: map, target, lure flag, distance, inventory, hidden, then the roll.
function attemptCatch(t: CatchTarget, c: CatchContext, roll: () => number): CatchResult {
  if (c.noCaptureMap || !t.onMap || !t.hasPetEntry) return "refused";
  if (c.flag === "normal" && !t.lureMatchesPet) return "refused";
  if (c.flag === "universal-no-boss" && t.statusImmune) return "refused";
  if (c.distanceMax > 0 && c.distance > c.distanceMax) return "refused";
  if (!c.hasFreeInventorySlot) return "refused";
  if (c.hidden) return "refused";
  const rate = catchRate(t.captureRate, t.hpPct, c.scalePct);
  return roll() <= rate ? "caught" : "missed";
}
```

## 5. Lands in

- TARGET `src/fight/tame.ts` (new module, proposed; this reader did not read the current Frankendom layout). One server-side attempt function that takes a lure, a target's state and a roll. Parity-checklist row 21 (catalogue fields): `captureRate` becomes a catalogue field on each creature row (0 to 10000), and the 0 to 10000 domain is the catalogue's rule. Row 18 (loot roll and XP award) is the nearest neighbour for any reward on success; not claimed here.
- today: no capture or tame model read in this reader's pass.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: one engine with server-verified outcomes (the roll runs on the server, never the client); catalogue as runtime source (row 21)

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism, not from the donor lines.
- The lure is never consumed in this function: the donor marks it `FIXME` (1267). Frankendom must decide the lure cost inside the same server transaction as the roll, so a refused or missed attempt has one rule.
- Zero means unknown in the data, but the code floors it to 1 in 10000 (1335-1336). The template lines say `CaptureRate: 0 # unknown` (pet_db.yml, commented templates), and 27 active entries are 0. Defect: a zero rate is catchable at 0.01%. Fix: make 0 an explicit "not capturable" flag in the catalogue, and keep the floor only for a deliberately set low rate.
- Kill before the pet exists: on success the monster is removed and killed (1343-1344) before the inter-server pet record is requested (1349), and that call is asynchronous. A failed or lost record leaves a dead monster and no pet. Fix: create the record first, or make the kill and the record one server step with a refund on failure.
- Distance is checked only at confirm (1304), not at start (`pet_catch_process_start`, 1214-1234, has no distance test). Frankendom should check distance at the roll, on the server, since that is the only moment the outcome is decided.
- Hide check is a status test at roll time (1321-1326). Frankendom's stealth, if any, must be a server state read at the roll, not a client flag.
- Intimacy (loyalty) is a separate track in this donor: `IntimacyStart`, `IntimacyFed`, `IntimacyOverfed`, `IntimacyHungry` and `IntimacyOwnerDie` are documented in the pet_db header (lines 1-40 read; defaults as documented, code not read). The capture passes `pet->intimate` to the new record (1349). Not designed here.
- Pet levelling and summon rules: not in this function; not read in this reader's pass beyond the capture.

Best transferable idea: a capture is one server roll against a catalogue rate out of 10000 that rises as the target's HP falls (C * (200 - hp%) / 100, floor 1), gated by a lure match, distance, a free slot and visibility, and spent on every attempt.
Decision (proposed): adapt - keep the single roll, the HP-scaled rate and the floor, but make a zero rate an explicit "not capturable" flag (the donor's floor turns 0 into 0.01%) and consume the lure in the same server step as the roll (the donor's FIXME).
Acceptance: a server test with a catalogue rate of 2000 asserts that a full-HP target is captured in about 20% of seeded rolls and a target at 1% HP in about 40%; a roll above the rate leaves the target alive and the lure spent; a rate of 0 refuses the attempt outright.
