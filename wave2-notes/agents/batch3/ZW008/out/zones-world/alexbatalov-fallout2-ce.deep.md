# alexbatalov-fallout2-ce (zones-world, cell 3)

Donor: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/worldmap.cc` | Licence: Sustainable Use License 1.0 (`LICENSE.md`: use "only for your own internal business purposes or for non-commercial or personal use"; restricted, not OSI) | C | symbol `wmRndEncounterOccurred`, `wmRndEncounterPick`, `wmEvalConditional`

Checked: The hint `src/worldmap.h` is a declarations file (encounter enums and structs, lines 67-173 seen by grep); it has no logic and was grepped only. Read in full: `worldmap.cc` 3322-3522 (`wmRndEncounterOccurred`: throttle, distance gate, area exemption, day part, frequency, difficulty, detection, reference position, dialog), 3557-3654 (`wmRndEncounterPick`), 4096-4150 (`wmEvalConditional`, up to the end of the AND handling). Read in part: `worldmap.cc` 176-178 (day part enum), 570-611 (modifiers and frequency names), 1326-1336 (tile difficulty load), 1782 (counter default), 3657-3712 (`wmSetupRandomEncounter`, critter count), 3771-3800 (`wmSetupCritterObjs` start). Not read: the body of `wmSetupCritterObjs` after 3800, `wmSetupRndNextTileNum` (3969-4080), the config loaders at 1277 and 1367-1480 (so the named frequency percentages are not known), the caller around 3110 (grep hit only). Candidates opened for this topic: `worldmap.cc`, `worldmap.h` (grep), `map.cc` (grep hit only), `scripts.cc` (grep hit only), `game_vars.h` (grep hit only). Callers of `wmRndEncounterPick`: only `wmRndEncounterOccurred` (3421) in the grep. Confidence: high on the occurrence roll, the detection step, the weighted pick and the counter budget; medium on the critter setup (only its start was read). Not a camera cell, so no camera_scope.

Best transferable idea: Give each zone a frequency level per time-of-day band, roll it on a travel check, then pick one weighted table entry filtered by conditions and spent from a per-entry counter, so rare entries run out.
Decision (proposed): adapt - zone-by-time-band frequency, conditional weighted entries and per-entry counters fit zones as data and a server counter in the one ledger; reject the real-time throttle (`getTicks`) and the one-axis distance quirk for the server, which must use server ticks and an explicit distance.
Acceptance: A server test steps one character through a night zone and asserts that no roll passes unless the character moved the minimum distance on both axes since the last roll that passed; an entry with counter 2 fires at most twice across a save and reload; a cancelled encounter does not spend the counter.

## 1. Mechanism

- Order of one check (`wmRndEncounterOccurred`, 3322). (a) Real-time throttle: the check returns unless at least 1500 ms of `getTicks()` have passed since the last check (3324-3329). (b) Distance: the check returns unless the X offset and the Y offset from the reference position are both 3 or more (3331-3337). Read as written, a walk that stays on one axis is never checked; I did not run this. (c) Area: no check inside a located area (3340-3343). (d) Forced and story checks (3345-3388): a one-time story map from day 35 (3347-3360), then a forced encounter if one is set.
- Frequency. The day part is morning, afternoon or night from the game-clock hour: night from 18:00 or before 06:00, afternoon from 12:00 (3394-3401; enum 176-178). The tile's subtile gives a named frequency level for that day part (3403), read from config as a percentage (1277). For easy the frequency is reduced by one fifteenth, for hard raised by one fifteenth, only when it is between 1 and 99 (3404-3414). The occurrence roll is 0 to 100; at or above the frequency there is no encounter and the function returns (3416-3419).
- Pick. If the roll passes, `wmRndEncounterPick` runs first (3421). It keeps the table entries whose condition holds and whose counter is not zero (3571-3587). Total weight is the sum of their chances. The roll is 0 to total, plus Luck minus 5, plus 2 for Explorer, 1 for Ranger, 1 for Scout, plus 5 on easy or minus 5 on hard (3589-3617). Walking the entries by weight picks one; a roll past the end takes the last entry (3620-3631). A positive counter is spent by one (3636-3638); a negative counter is never spent. The map is the entry's own map, or, when it is -1, a random map from the table's list, or from the terrain's list if the table has none (3640-3651).
- Detection (`3454-3499`). When the frequency still beats the roll, the player's best Outdoorsman is taken, plus 20 if the dude owns a motion sensor (3456-3460), capped at 95 (3464-3466), plus the tile's encounter-difficulty modifier (3473). A roll of 1 to 100 under that number notices the encounter and gives experience of 100 minus the number, if positive (3475-3482). When the car modifier has pushed the frequency down to or below the roll, the encounter is noticed without a check (3497-3499).
- Reference and dialog. The reference position is set after the roll passes and before any dialog (3501-3502). If noticed, a yes/no dialog is shown (3504-3512); "no" clears the encounter and returns 0 (3513-3518). If not noticed, the function returns 1 with no dialog (3521).
- Setup (`wmSetupRandomEncounter`, 3657). Each sub-entry rolls a critter count between its minimum and maximum (3693). Easy takes 2 off, floored at the minimum; hard adds 2; a party above two members adds 2 (3695-3710).
- Conditions (`wmEvalConditional`, 4096). Each entry has up to three conditions: a global variable compare, a critter-count compare, a random percent, player level, days played, and time of day as the hour divided by 100 (4106-4140). An AND failure stops the list (4145-4146). The code comments an overflow with three conditions (4144).

## 2. Key functions

- Occurrence roll: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/worldmap.cc` 3322-3522 (`wmRndEncounterOccurred`).
- Weighted pick: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/worldmap.cc` 3557-3654 (`wmRndEncounterPick`).
- Conditions: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/worldmap.cc` 4096-4150 (`wmEvalConditional`).
- Setup: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/worldmap.cc` 3657-3712 (`wmSetupRandomEncounter`, first half).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant |
|---|---|
| Real-time throttle between checks | 1500 ms (theirs, 3325), on `getTicks()` (theirs, 3324) |
| Movement gate on both axes from the last passed roll | 3 tiles per axis (theirs, 3331-3337) |
| No check inside an area | Rule (theirs, 3341) |
| Time bands | Night 18:00 to 06:00, afternoon from 12:00, morning otherwise (theirs, 3395-3401) |
| Named frequency level per tile and band | Percent values from config, not read (theirs, 604-611, 1277) |
| Easy / hard frequency step | One fifteenth of the frequency, only for 1 to 99 (theirs, 3405-3413) |
| Car modifier by band | 40 morning, 30 afternoon, 0 night (theirs, 570-573), car only (3445-3451) |
| Skill notice roll | Outdoorsman, + 20 with a motion sensor, capped at 95, + tile modifier (theirs, 3456-3473) |
| Pick roll shifts | Luck minus 5; Explorer +2, Ranger +1, Scout +1; easy +5, hard -5 (theirs, 3589-3607) |
| Entry budget | Counter default -1 (not spent); positive counters spent one per pick; never refilled in the read code (theirs, 1782, 3636-3637) |
| Critter count | Between min and max; easy -2 (floored at min), hard +2, party above two +2 (theirs, 3693-3709) |
| Respawn timer, despawn grace | None: counters only go down (theirs, 3636-3637) |

## 4. TypeScript sketch

simplified: the sketch keeps the order of the donor for one check: throttle, then distance, then the level-to-frequency step, then the weighted pick with luck and difficulty shift, then the counter spend, then the critter count. It omits the area exemption, the story and forced checks, the car modifier, the detection dialog and XP, the reference-position write (the caller sets it), the map choice, the scenery and formation setup, and the condition evaluation (it takes a precomputed `conditionOk` flag). The donor's pick clamps the roll only for easy and hard; the sketch passes the shift in and does not clamp, which gives the same entry because a negative roll takes the first entry and a roll past the total takes the last. The sketch refuses to pick when no entry is eligible; the donor does not guard that case (see section 6).

```ts
// Licence: Sustainable Use License 1.0 (donor fallout2-ce). Clean-room: shape only; no donor code or tables copied.
type Roll = (lo: number, hi: number) => number; // inclusive random integer
type Difficulty = "easy" | "normal" | "hard";

interface TravelState { lastCheckMs: number; lastFiredX: number; lastFiredY: number; }

// Gate 1: throttle in real time, then distance. Both axes must have moved minTiles since the last roll that passed.
function mayCheck(s: TravelState, nowMs: number, x: number, y: number, minMs: number, minTiles: number): boolean {
  if (nowMs - s.lastCheckMs < minMs) {
    return false;
  }
  s.lastCheckMs = nowMs;
  if (Math.abs(x - s.lastFiredX) < minTiles) {
    return false;
  }
  if (Math.abs(y - s.lastFiredY) < minTiles) {
    return false;
  }
  return true;
}

// Frequency in percent for this tile and day part. Easy lowers, hard raises it by a fifteenth; 0 and 100 are left alone.
function effectiveFrequency(levelPct: number, difficulty: Difficulty): number {
  let f = levelPct;
  if (f > 0 && f < 100) {
    const m = Math.floor(f / 15);
    if (difficulty === "easy") f -= m;
    if (difficulty === "hard") f += m;
  }
  return f;
}

// Skill check that lets the player notice the encounter first. XP is awarded only when positive.
function noticed(outdoorsman: number, hasSensor: boolean, tileDifficulty: number, roll: Roll): { noticed: boolean; xp: number } {
  let skill = outdoorsman + (hasSensor ? 20 : 0);
  if (skill > 95) {
    skill = 95;
  }
  skill += tileDifficulty;
  const ok = roll(1, 100) < skill;
  return { noticed: ok, xp: ok ? Math.max(0, 100 - skill) : 0 };
}

interface TableEntry { chance: number; counter: number; conditionOk: boolean; }

// Weighted pick over entries whose condition holds and whose counter is not zero. Luck minus 5, perks and difficulty shift the roll.
function pickEntry(entries: TableEntry[], roll: Roll, luck: number, perkBonus: number, difficultyShift: number): number {
  const eligible: number[] = [];
  entries.forEach((e, i) => {
    if (e.conditionOk && e.counter !== 0) eligible.push(i);
  });
  if (eligible.length === 0) {
    throw new Error("no eligible encounter entry");
  }
  const total = eligible.reduce((sum, i) => sum + entries[i].chance, 0);
  let x = roll(0, total) + (luck - 5) + perkBonus + difficultyShift;
  let picked = eligible[eligible.length - 1];
  for (const i of eligible) {
    if (x < entries[i].chance) {
      picked = i;
      break;
    }
    x -= entries[i].chance;
  }
  if (entries[picked].counter > 0) {
    entries[picked].counter -= 1;
  }
  return picked;
}

// Critters in one sub-entry: roll between min and max; easy takes 2 off (floored at min), hard adds 2, a party above two adds 2.
function critterCount(min: number, max: number, roll: Roll, difficulty: Difficulty, partySize: number): number {
  let n = roll(min, max);
  if (difficulty === "easy") n = Math.max(min, n - 2);
  if (difficulty === "hard") n += 2;
  if (partySize > 2) n += 2;
  return n;
}

const travel: TravelState = { lastCheckMs: 0, lastFiredX: 0, lastFiredY: 0 };
const fixed: Roll = (lo) => lo;
console.log(mayCheck(travel, 2000, 5, 5, 1500, 3), effectiveFrequency(45, "hard"), noticed(50, true, 0, fixed).xp);
console.log(pickEntry([{ chance: 3, counter: 2, conditionOk: true }, { chance: 1, counter: -1, conditionOk: true }], fixed, 5, 0, 0));
console.log(critterCount(1, 3, fixed, "easy", 3));
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population: the per-zone frequency level by time band, the conditional weighted entries, the per-entry counter budget, all as zone data with the counter in the one ledger). Parity-checklist row 23 (zone population). Against row 23 the donor has a budget that runs out and a condition filter; it has no respawn timer and no despawn grace (its counters are never refilled).
- Reuse tag: rewrite-from-idea (restricted licence: clean-room, shape only; no donor code or tables)
- Brief rule served: row 23; zones as data (frequency levels and entry tables are zone fields); one ledger (counter values live on the character or the zone record, server-verified).

## 6. Gaps and risks

- Real-time throttle: `getTicks()` (3324) and the 1500 ms gate (3325) are wall-clock. A server must count server ticks, or the check depends on the machine.
- Distance gate: the donor returns unless both axes moved 3 tiles (3331-3337), so a straight walk along one axis is never checked. Read as written, not run. Frankendom should state the distance rule explicitly and test it.
- Cancelled encounters still cost: `wmRndEncounterPick` spends the counter (3421, 3636-3637) and the reference position is set (3501-3502) before the yes/no dialog (3504-3518). A "no" answer returns 0 but does not restore either. Frankendom should decide this and test it; the sketch does not restore either.
- No guard for an empty table: when no entry is selectable, `index` becomes `candidatesLength - 1`, which is -1 when the count is 0, and `candidates[-1]` is then read (3629-3634). Whether a real table can reach this was not checked. The sketch throws instead.
- Counters are never refilled in the read code (only decremented at 3637, saved at 1219); the donor has no timer. Frankendom needs an explicit respawn rule if a unique entry should return.
- The condition list overflow with three conditions is commented in the donor (4144). Frankendom conditions should be a bounded list with a stated AND/OR rule.
- Luck and perks shift the pick (3589-3602). Frankendom has no luck stat in the duel; this is a character-sheet input and should be data, not a constant.
- The named frequency percentages are in donor config that was not read; the sketch takes the level as an input and gives no numbers.
- Setup is only partly read: `wmSetupCritterObjs` after 3800 and `wmSetupRndNextTileNum` were not read, so placement of the critters around the party is not described.
- The Horrigan story encounter (3345-3360) is a one-time forced map at day 35; it is a story hook, not a transferable rule.
