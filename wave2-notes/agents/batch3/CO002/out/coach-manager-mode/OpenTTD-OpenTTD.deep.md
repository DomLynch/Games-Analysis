# OpenTTD-OpenTTD (coach-manager-mode, cell 3)

Donor: `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/vehicle.cpp` (with `roadveh_cmd.cpp`, `ship_cmd.cpp`, `aircraft_cmd.cpp`, `train_cmd.cpp`, `order_func.h`, `settings_type.h`, `core/random_func.hpp`, `engine.cpp`, `engine_base.h`) | Licence: GPL-2.0-only (`vehicle.cpp` header line 3: "GNU General Public License as published by the Free Software Foundation, version 2."; `COPYING.md` line 7: "Version 2, June 1991") | C++ | symbol `CheckVehicleBreakdown` (with `Vehicle::HandleBreakdown`, `VehicleServiceInDepot`, `Vehicle::NeedsServicing`)

Checked: This cell's topic is wide (orders, scouting, contracts, post-fight reports, AI). The mechanism written up is the one that matches "fatigue, injury and recovery between bouts": vehicle reliability decays per economy day, a breakdown roll is made per economy day from a table indexed by reliability, a broken vehicle sits out a counted time, and a depot service restores reliability. Read: `vehicle.cpp` 189-232 (service and due check), 294-302, 1299-1302, 1305-1366 (decay, chance table, roll), 1376-1435 (state machine), 1454-1466 (age doubling); `roadveh_cmd.cpp` 1588, 1679-1690, 1725-1731; one call line each in `ship_cmd.cpp` (273), `aircraft_cmd.cpp` (464), `train_cmd.cpp` (4281); `order_func.h` 28-33; `settings_type.h` 130-134; `core/random_func.hpp` 110-130; `engine.cpp` 681-723 (phase curve, partly); `engine_base.h` 50-57. Confidence high on the decay, roll, state machine and service reset. Not read: the enclosing function of the road-vehicle call at 1588; the condition guarding the train call at 4281; the depot order code in `order_cmd.cpp`; the callers of `HandleBreakdown` beyond the one line. `camera_scope` does not apply. GPL-2.0-only: clean-room, shape only.

## 1. Mechanism

- Each vehicle has `reliability` (16-bit), `reliability_spd_dec` (decay per economy day, copied from the engine model and doubled with age), `breakdown_chance` (an 8-bit accumulator), `breakdown_ctr` and `breakdown_delay` (`vehicle_base.h` 252-257; `engine_base.h` 52).
- Order of steps in `CheckVehicleBreakdown` (1320), called once per economy day from each vehicle type's economy-day handler (`roadveh_cmd.cpp:1731`, `ship_cmd.cpp:273`, `aircraft_cmd.cpp:464`, `train_cmd.cpp:4281`); road vehicles call it only when `blocked_ctr == 0` (1731), so a blocked vehicle skips that day's decay and roll:
  (a) skip in the menu (1323); skip if breakdowns are off and servicing-if-no-breakdowns is on (1326);
  (b) Reduced difficulty and loading at a station: no reliability loss (1328-1329);
  (c) reliability falls by `reliability_spd_dec`, clamped to 0 and to the engine's current reliability (1333);
  (d) skip the roll if breakdowns are off (1338), the vehicle is already broken (1340), it is slower than 5 (1342), or it is stopped (1344);
  (e) the accumulator rises by one (1351), and by a further 25 on a 1-in-25 roll (1352, `Chance16I`, `random_func.hpp:126`), clamped to 255 (1353);
  (f) the reliability used for the roll is the reliability itself, plus `0x6666` for a ship (1357) and plus `0x6666` again under Reduced (1360);
  (g) the table `_breakdown_chance[64]` (1305-1313) is indexed by that value `>> 10` (bands of about 1024 out of 65536); if the table value is at most the accumulator (1363), the vehicle is armed: `breakdown_ctr` = 63 to 126 (1364), `breakdown_delay` = 128 to 255 (1365), accumulator reset to 0 (1366).
- Table, read from `vehicle.cpp` 1306-1313: low reliability bands need 3 (the lowest band), rising to 250 for the top bands; the top eight bands are 150, 170, 190, 210, 230, 250, 250, 250.
- While running, `HandleBreakdown` (1376-1435, called from road-vehicle movement code at `roadveh_cmd.cpp:1588`): state 2 means "break now": the vehicle stops (speed 0 for non-aircraft), `breakdowns_since_last_service` counts up to 255, and the state becomes 1 (1388-1390). State 1 counts `breakdown_delay` down every second tick, every fourth for trains (1423-1424). Any other non-zero state counts `breakdown_ctr` down, except while loading (1433), so the running time before a breakdown is frozen at a station.
- Service (`VehicleServiceInDepot`, 189-205): for the whole consist, reset the breakdown count (197), set reliability to the engine's current maximum (198), divide the accumulator by four (200), and under Reduced set it to zero (201).
- Due check (`Vehicle::NeedsServicing`, 212-232) has three interval modes (218-230): percent of reliability (not due while reliability is at or above the engine maximum times (100 minus the interval percent)), wall-clock (interval in minutes, converted to economy months), and days (not due while days since the last service are within the interval). Automatic servicing trips (`NeedsAutomaticServicing`, 294-302) happen only when no depot order is set and the vehicle is not loading; road vehicles use this at `roadveh_cmd.cpp:1679-1682`, which does nothing when the company's road-vehicle interval is 0.
- Defaults (`order_func.h`): trains and road vehicles 150 days (28-29), aircraft 100 (30), ships 360 (31), minimum 30 (32), maximum 800 (33).
- Age (`AgeVehicle`, 1454-1466, called once per calendar day): the test is `age - max_age == DateAtStartOfYear(i)` for i = 0..4 (1461-1462), i.e. in days, at max_age + 0, 365, 730... days (calendar-year lengths, not the vehicle's own years); each hit shifts `reliability_spd_dec` left once (1463), so wear doubles up to five times.
- Engine maximum (`engine.cpp` 681-723): reliability climbs from a start value to a maximum over phase 1 (710), holds the maximum over phase 2 (714), and falls to a final value over phase 3 (718), by engine age; the phase lengths are in months (`engine_base.h` comment). Not modelled in the sketch.

## 2. Key functions

- `CheckVehicleBreakdown`: `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/vehicle.cpp` 1320-1367.
- `Vehicle::HandleBreakdown`: `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/vehicle.cpp` 1376-1435.
- `VehicleServiceInDepot`: `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/vehicle.cpp` 189-205.
- `Vehicle::NeedsServicing` and `Vehicle::NeedsAutomaticServicing`: `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/vehicle.cpp` 212-232 and 294-302.
- `AgeVehicle`: `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/vehicle.cpp` 1454-1466.
- Road vehicle economy day: `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/roadveh_cmd.cpp` 1725-1731; automatic service helper 1679-1690.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Condition decays by a fixed amount per day, clamped at zero | Decay per model (`engine_base.h:52`); doubled at five year starts after max age (`vehicle.cpp:1461-1463`) |
| Risk of an event depends on condition through a 64-band table | Table values 3 to 250 (`vehicle.cpp:1306-1313`) |
| Risk accumulator: +1 per roll, +25 on a 1-in-25 roll, reset on event | 1 and 25 (1351-1352); reset to 0 (1366); clamp 255 (1353) |
| Event leaves the unit out for a random time, split into a running countdown and a sideline countdown | 63 to 126 (1364); 128 to 255 (1365) |
| Full restore at the base, accumulator cut by four | Reliability to engine maximum (198); divide by four (200) |
| Service due by days or by condition threshold | Defaults 150, 100, 360 days; min 30, max 800 (`order_func.h:28-33`) |
| Difficulty switch that softens the roll and stops wear while loading | Offset 0x6666 under Reduced (1360); no wear while loading (1329) |
| Chance from a 16-bit random value | Probability a/b on the low 16 bits (`random_func.hpp:126`) |

## 4. TypeScript sketch

simplified: the sketch keeps the daily decay, the banded risk table with its accumulator, the armed event with its running countdown, the break-now step, the sideline countdown, the service reset and the age doubling. It omits: the difficulty switch beyond one flag (`softer`), the ship offset, the loading exemption for the decay, the NeedsServicing due check and the automatic depot trip, the engine reliability curve, the speed-below-5 and stopped gates before the roll (`vehicle.cpp` 1342-1344), the `blocked_ctr == 0` call gate for road vehicles, and the exact calendar-day test (`age - max_age == DateAtStartOfYear(i)` in days; the sketch's `isYearStart` + `ageYearsPastMax` flags are a loose stand-in). The donor counts the sideline every second tick (every fourth for trains); the sketch counts it every tick. The roll is passed in as a number so it can be a server-side draw. Order is kept: decay, then the roll, then the accumulator. Donor defect handled: the age shift is done on a 16-bit field (`vehicle.cpp:1463`); the sketch caps the value instead of letting it wrap.

```ts
// Licence: GPL-2.0-only (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.

// Table of 64 bands, indexed by condition >> 10 (condition 0..65535). Low condition = low band value = easier to trigger.
const BAND_THRESHOLD: readonly number[] = [
  3, 3, 3, 3, 3, 3, 3, 3,
  4, 4, 5, 5, 6, 6, 7, 7,
  8, 8, 9, 9, 10, 10, 11, 11,
  12, 13, 13, 13, 13, 14, 15, 16,
  17, 19, 21, 25, 28, 31, 34, 37,
  40, 44, 48, 52, 56, 60, 64, 68,
  72, 80, 90, 100, 110, 120, 130, 140,
  150, 170, 190, 210, 230, 250, 250, 250,
];

interface Fighter {
  condition: number;      // 0..65535 (donor reliability)
  decayPerDay: number;    // donor reliability_spd_dec
  maxCondition: number;   // engine maximum
  risk: number;           // 0..255 accumulator (donor breakdown_chance)
  runningLeft: number;    // donor breakdown_ctr: 0 = fit; >2 = running countdown; 2 = breaks now; 1 = sidelined
  sidelined: number;      // donor breakdown_delay: ticks out after the event
  ageYearsPastMax: number;
}

const RISK_CAP = 255;

// One economy day: decay, then (if not already in an event) roll for an event.
// roll is a server-side random 0..65535 and softer is the Reduced setting (zone data).
function dailyCheck(f: Fighter, roll: number, softer: boolean): 'none' | 'armed' {
  f.condition = Math.max(0, Math.min(f.maxCondition, f.condition - f.decayPerDay));
  if (f.runningLeft !== 0) return 'none';
  let risk = f.risk + 1;
  if ((roll & 0xffff) % 25 === 0) risk += 25; // 1-in-25 jump (modulus stand-in for Chance16I)
  f.risk = Math.min(RISK_CAP, risk);
  const band = Math.min(0xffff, softer ? f.condition + 0x6666 : f.condition) >> 10;
  if (BAND_THRESHOLD[band] <= f.risk) {
    f.runningLeft = 63 + ((roll >> 6) % 64); // donor: 63 to 126 running ticks before the event
    f.sidelined = 128 + ((roll >> 12) % 128); // donor: 128 to 255 ticks out
    f.risk = 0;
    return 'armed';
  }
  return 'none';
}

// One movement tick (donor HandleBreakdown, simplified). Returns 'broken' while the fighter is out.
// Simplified: the sideline counts every tick here; the donor counts it every second tick (every fourth for trains).
function tick(f: Fighter, loading: boolean): 'running' | 'broken' | 'fit' {
  if (f.runningLeft === 0) return 'running';
  if (f.runningLeft === 2) {
    f.runningLeft = 1;
    return 'broken';
  }
  if (f.runningLeft === 1) {
    f.sidelined--;
    if (f.sidelined <= 0) {
      f.runningLeft = 0;
      return 'fit';
    }
    return 'broken';
  }
  if (!loading) f.runningLeft--; // donor: the running countdown is frozen while loading
  return 'running';
}

// Depot service: full condition, accumulator cut by four (zeroed under softer).
function service(f: Fighter, softer: boolean): void {
  f.condition = f.maxCondition;
  f.risk = softer ? 0 : Math.floor(f.risk / 4);
}

// Age: decay doubles at each of five year starts after max age (isYearStart passed in by the caller).
function ageOneDay(f: Fighter, isYearStart: boolean): void {
  if (isYearStart && f.ageYearsPastMax >= 0 && f.ageYearsPastMax <= 4) {
    f.decayPerDay = Math.min(0xffff, f.decayPerDay * 2); // sketch caps instead of wrapping in 16 bits
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (`/tmp/CO002-openttd-breakdown.ts`): exit 0.

## 5. Lands in

- TARGET `src/fight/condition.ts` (new, engine state): a per-fighter condition that decays between bouts, a rolled sideline event, and a hub service that restores condition. Not a mid-fight stop.
- Parity-checklist row 3 (guard, parry, stamina): this note is the fatigue and recovery side. Sideline time after an injury is a between-bout rule and is not part of row 3's in-fight stamina; row 17 (death and respawn) is the nearest row for how a loss is made bearable, and is not used here.
- Parity hint 19 (fight record): every roll and event must be written to the fight record so the server result can be replayed. Not designed here.
- Reuse tag: rewrite-from-idea (GPL-2.0-only; clean-room only)
- Brief rule served: 1 (one engine: condition and risk are engine state and the roll is a server draw); rule 8 (named target file and parity row).

## 6. Gaps and risks

- Time unit: the donor counts economy days for decay and risk, and running ticks for the counters. Frankendom must choose one clock. A "day" should be a bout cycle or a zone day, not wall time, so that a server test is deterministic.
- No mid-fight breakdown: the donor stops a vehicle on the road. Frankendom must not stop a fighter mid-bout; the event is applied when the fighter next enters the hub or the bout queue. The sketch's `tick` reports 'broken' but the caller decides; Frankendom's caller never stops a live bout.
- Server draw: `roll` must come from the server's seeded stream for the fight or day, recorded with the event (parity row 19). The sketch's modulus-based 1-in-25 test stands in for `Chance16I` and is not the same distribution in detail.
- Scale: the table's top bands are 250, while the accumulator is capped at 255 and rises by about 2 per day on average. At full condition an event takes on the order of 100 days on average. Frankendom's numbers should be set against bout counts, not copied.
- Difficulty: the donor's Reduced setting is an offset on the roll and a zeroed accumulator at service. Frankendom would express it as zone data (a per-zone softness value), not as an engine constant.
- Donor latent risk (not run): `reliability_spd_dec <<= 1` is done on a 16-bit field (`vehicle.cpp:1463`). Five doublings of a value above 2047 would wrap in 16 bits. Whether the data reaches that range was not checked. Fix: cap, as the sketch does.
- AI when the coach is absent: the donor's road vehicles go for service by themselves when due and the company's interval is not zero (`roadveh_cmd.cpp:1682`, 1679-1690). That is the default-behaviour analogue: an unattended fighter goes to the hub when due. Not modelled in the sketch.
- Not covered by this note: orders, scouting, contracts, hiring, post-fight reports, matchmaking. These are not read in this donor for this cell.
- The GPL-2.0-only licence: clean-room only. The sketch is written from the described rules; nothing is copied.

Best transferable idea: a per-unit condition that decays each day, with a risk roll from a banded table plus a non-resetting accumulator that makes back-to-back events less likely, and a full restore at the hub that cuts the accumulator.

Decision (proposed): adapt - take the decay, the banded risk with its accumulator, the timed sideline and the hub service; apply the event between bouts and never mid-fight; cap the age doubling instead of wrapping. Frankendom's fatigue has no road to stop on, so the donor's stop is rejected.
Acceptance: In a server test over 20 simulated days with no service, a fighter's condition falls by its decay each day and at least one event is rolled, which is recorded with its roll value; an event sidelines the fighter for between 128 and 255 units; a service sets condition to maximum and cuts the risk accumulator to a quarter of its prior value.

## 7. Coach table (coach-manager-mode rows)

Rows for the coach topic. "(not read)" = not opened in this pass; nothing is claimed for those rows.

| name | what | formula | ranges | file:line |
|---|---|---|---|---|
| Pre-fight planning and instructions | order lists exist; a service-due order condition reads NeedsServicing (order lists not otherwise read) | condition compares NeedsServicing | n/a | order_cmd.cpp:1949, 1981 |
| Stance / target priority | (not read: order types and order GUI not read) | | | |
| Mid-fight coach command | (not read: vehicle command handlers not read) | | | |
| Command cost / cooldown / limit per fight | (not read) | | | |
| Command lag | a breakdown takes effect at the vehicle's next movement tick | state machine per tick | per tick | roadveh_cmd.cpp:1588; vehicle.cpp:1376-1390 |
| Fighter stat sheet | reliability (16-bit), breakdowns since last service (counted, capped at 255), decay per model, age | | 0 to 65535; 0 to 255 | vehicle_base.h:252-257; vehicle.cpp:1390 |
| Training schedule and growth | engine reliability by engine age: rises from start to max over phase 1, holds in phase 2, falls to final over phase 3 | linear per phase | phase durations from engine data | engine.cpp:710, 714, 718; engine_base.h:56-57 |
| Fatigue / injury / recovery | risk accumulator with a 64-band table; running countdown 63 to 126; sideline 128 to 255; service restores max and divides the accumulator by four | band table 3 to 250; +1 per roll, +25 on a 1-in-25 roll | as listed | vehicle.cpp:1305-1366, 189-201 |
| Scouting / information limits | (not read) | | | |
| Hiring / contracts / upkeep | aircraft running cost per economy day (line not receipted); autorenew used in the due test (body not read in full) | cost = running cost x running ticks / (days in year x day ticks) | n/a | aircraft_cmd.cpp Aircraft::OnNewEconomyDay (not receipted); vehicle.cpp:224-232 |
| Matchmaking from coach view | not applicable in the read code | | | (not read) |
| Post-fight report / replay | breakdown count since service is the only record seen (report screens not read) | counter | 0 to 255 | vehicle.cpp:1390 |
| AI behaviour when the coach is absent (default tactics) | due road vehicles go to a depot by themselves unless the road-vehicle interval is zero; not while loading or under a depot order | due test then depot trip | interval 0 disables | roadveh_cmd.cpp:1679-1690; vehicle.cpp:294-302 |

## Checker findings (Sonnet 5.5 medium, 2026-10-12)

Verdict: MINOR
- Error (confirmed): "called once per economy day" - road vehicles call CheckVehicleBreakdown only when blocked_ctr == 0 (roadveh_cmd.cpp 1731).
- Error (confirmed): sketch omitted the cur_speed < 5 and Stopped gates (vehicle.cpp 1342-1344) without listing them; now listed.
- Error (confirmed): engine reliability phases are in months; age doubling is the day test age - max_age == DateAtStartOfYear(i), not the vehicle's own year starts. Text corrected; sketch flag kept as a stated stand-in.
- Missed: NeedsServicing has percent, wall-clock and days interval modes (vehicle.cpp 218-230); breakdown_ctr freeze while loading and the half/quarter-rate delay were already in the note.

Fixed 2026-10-12: call-gate wording, age test wording, due-check modes, engine phase unit, sketch omissions list. Sketch code unchanged, so no typecheck rerun.
