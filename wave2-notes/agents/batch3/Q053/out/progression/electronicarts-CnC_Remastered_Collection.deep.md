# electronicarts-CnC_Remastered_Collection (progression, cell 10)

Donor: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/SCORE.CPP` | Licence: GPL V3 with Electronic Arts additional terms (LICENSE.md line 3: "under the GPL V3 below, with additional terms at the bottom"; section "ADDITIONAL TERMS per GNU GPL Section 7" grants no trademark or publicity rights, line 603) | C++ (with x86 assembly helpers) | symbol `ScoreClass::Presentation`

Checked: Read in full: `ScoreClass::Presentation` score arithmetic (SCORE.CPP 643-697) and the hall-of-fame insertion (870-914). Read: the score class (SCORE.H 41-75), the active fixed-point routines (COORDA.ASM 69-129; COORD.CPP 287-326 is compiled out under `#ifdef OBSOLETE`), the build-level selection (INI.CPP 314-329, the `#else` branch not read), the house fields (HOUSE.H 263, 396, 398, 774-776; HOUSE.CPP 493). Hint file `TIBERIANDAWN/STATS.CPP` is the network statistics packet (line 154 `Send_Statistics_Packet`), not progression. Grep only: no XP, level or skill field exists in TIBERIANDAWN (no "veteran", "experience" or rank hits); the tech-level gates in HOUSE.CPP are commented out (6306-7148, grep only); `PointTotal` (HOUSE.H 776) is cleared at HOUSE.CPP 493 and no other write was found. Not read: the `Logic` list contents, `HouseClass::Available_Money`, the campaign and mission-select sequencing (MAPSEL.CPP), the `#else` build-level branch, the presentation drawing code.
Topic fit (confidence medium): this donor has no XP, levels or skills. The nearest real mechanism is the end-of-scenario rating: a survival share and a credit-retention share, combined with fixed weights, then multiplied by the scenario number and written to a hall of fame. It is real and I read it end to end, so I rate it STRONG with the topic fit stated here, not as a claim about XP. The verifier passed all 47 receipts (`receipts-cnc.tsv`). Hand-run arithmetic cases are in section 3.
camera_scope: not applicable.

Best transferable idea: rate a fight's outcome on the server from two ratios (units kept, resources kept), weighted and scaled by the stage the player is on, and keep a fixed-length table that only a better rating can enter.
Decision (proposed): adapt — the survival ratio and the weighted, stage-scaled rating shape are checkable and fit end-of-fight summaries, but Frankendom has no credits economy (drop the retention term unless one is added) and the hall-of-fame guard must be written from intent, not copied (see section 6).
Acceptance: A server test with 5 owned units and 1 unit lost (no buildings lost), harvested 1000, initial 1000 and 500 credits left, at scenario index 2, asserts the rating is 246 (the donor-shape formula with the weights as data); a table test asserts a rating at or below the last place never overwrites it.

## 1. Mechanism

- Trigger. `ScoreClass::Presentation` runs at the end of each scenario (comment at SCORE.CPP 556-559; called from SCENARIO.CPP 455-518, not read there). It works out one house's rating.
- Step 1, survival count (SCORE.CPP 648-654). `leadership` starts at 0 and counts every object in the `Logic` list whose owner is the player's house. Those are the objects still owned at the end.
- Step 2, losses (662-667). `GKilled` and `GBKilled` read the GDI house's `UnitsLost` and `BuildingsLost`, and `NKilled` and `NBKilled` read Nod's. The rating's survival term then reads only the GDI pair (see section 6).
- Step 3, survival share (675-678). If the count is 0, it becomes 1 (675). The routine computes `Cardinal_To_Fixed(lost + owned, owned)`, which is `owned * 256 / (owned + lost)` in 8.8 fixed point (COORDA.ASM 83-86). Then `Fixed_To_Cardinal(100, ...)` gives `(100 * fixed + 0x80) >> 8` (COORDA.ASM 117-123), so the result is `100 * owned / (owned + lost)`, rounded, capped at 100 (678). The variable keeps the name `leadership`.
- Step 4, retention share (683-691). `Cardinal_To_Fixed(harvested + initialCredits + 1, creditsLeft + 1)` gives `(creditsLeft + 1) * 256 / (harvested + initial + 1)`. If that fixed value is 0 it becomes 1 (688). Then it converts to a 0-100 value and caps at 100 (689-691).
- Step 5, weighted total (695-697). `total = floor((leadership * 40 + 4600 + efficiency * 14) / 100)`. If the total is 0 it becomes 1. Then `total *= BuildLevel + 1`.
  Range before the multiplier: 46 (survival 0, retention 0) up to 100 (both 100).
- Step 6, build level (INI.CPP 320-323). Under `NEWMENU`, for scenarios up to 15, `BuildLevel = Scenario`. So the multiplier for scenario N is N + 1. Scenarios outside that range use an INI key or a fixed 15 (324-328). The `#else` branch was not read.
- Step 7, hall of fame (SCORE.CPP 896-914). The table holds 7 entries (`NUMFAMENAMES` 7, SCORE.CPP 64), sorted by score. The guard at 901-902 zeroes the last place's score when that score is at or above the new total. Then the loop at 903-913 inserts the total at the first place where it beats the entry, shifting the rest down, and stores the scenario number as the level (907). As read, this guard is inverted (section 6).
- Callers. `Presentation` is called from SCENARIO.CPP (not read) and ENDING.CPP 57 and 122 (grep only). Only one caller path was read.
- No time or elapsed-time term enters the total. `ElapsedTime` (SCORE.H 53) is only used to print minutes (SCORE.CPP 643).

## 2. Key functions

- `ScoreClass::Presentation`: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/SCORE.CPP` 571-914 (score arithmetic 643-697; hall of fame 870-914).
- `Cardinal_To_Fixed` and `Fixed_To_Cardinal` (active assembly): `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/COORDA.ASM` 69-91 and 110-129.
- Build level selection: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/INI.CPP` 320-329.

## 3. Numbers vs mechanism

| Reusable rule | Donor constant |
|---|---|
| Survival share from owned and lost counts | `100 * owned / (owned + lost)` (SCORE.CPP 675-678; COORDA.ASM 83-123) |
| Retention share from credits left and income | `100 * (left + 1) / (harvested + initial + 1)` (SCORE.CPP 687-691) |
| Weights in the rating | survival x40, base 4600 (= 46 on the 100 scale), retention x14, over 100 (SCORE.CPP 695) |
| Floor of one | total 0 becomes 1 (696) |
| Mission multiplier | `BuildLevel + 1`, with BuildLevel = scenario for 1-15 (697; INI.CPP 322-323) |
| Hall of fame size | 7 places (SCORE.CPP 64) |
| Hand case (arithmetic, not measured): 5 owned, 1 lost, harvested 1000, initial 1000, left 500, scenario index 2 | survival 83; retention 25; total floor((3320 + 4600 + 350) / 100) = 82; times 3 = 246 (checked by re-running the same formulas in python on the Mac) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's arithmetic: 8.8 fixed-point ratios with the same rounding and caps, the survival ratio over owned plus lost, the retention ratio over income, the weighted total with the floor of one, and the multiplier. It omits the drawing code, the house-select branch (the caller passes one house's numbers), the Nod and GDI loss split (it takes one pair of losses), the elapsed-time display, the save and load of the table, and the presentation delays. The hall-of-fame step uses the intended rule (record only a total above the last place), not the donor's inverted guard at SCORE.CPP 901-902; the donor order (insert at the first lower place, shift down, drop the last) is kept.

```ts
// Licence: GPL-3.0 with Electronic Arts additional terms (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface MissionLedger {
  ownedNow: number;        // player's objects still owned at the end ("leadership" count)
  lost: number;            // player's units plus buildings lost
  harvested: number;       // credits harvested by the player
  initialCredits: number;  // starting credits
  creditsLeft: number;     // credits held at the end
  missionIndex: number;    // scenario number, used as the multiplier base (data)
}

// 8.8 fixed-point helpers, same arithmetic as the donor's active routines.
const ratioFixed = (base: number, card: number): number => (base ? Math.floor((card * 256) / base) : 0xffff);
const fixedToCard = (base: number, fixed: number): number => {
  const v = base * fixed + 0x80;
  return v >= 0x1000000 ? 0xffff : v >>> 8;
};

export function missionScore(l: MissionLedger): number {
  // Survival share: owned / (owned + lost), as a 0-100 value. The zero guard is on the count.
  const owned = Math.max(1, l.ownedNow);
  const leadership = Math.min(fixedToCard(100, ratioFixed(owned + l.lost, owned)), 100);

  // Retention share: (credits left + 1) / (harvested + initial + 1), as a 0-100 value.
  let g = ratioFixed(l.harvested + l.initialCredits + 1, l.creditsLeft + 1);
  if (g === 0) g = 1;
  const efficiency = Math.min(fixedToCard(100, g), 100);

  // Weighted sum over a base of 46 (4600 / 100), floor of 1, then the mission multiplier.
  let total = Math.floor((leadership * 40 + 4600 + efficiency * 14) / 100);
  if (total === 0) total += 1;
  return total * (l.missionIndex + 1);
}

export interface Entry { name: string; score: number; level: number; }

// Keeps a descending table of fixed length. Only a total above the last place is recorded.
// (The donor's guard at SCORE.CPP 901-902 is inverted as read; this sketch uses the intent.)
export function recordScore(table: Entry[], total: number, level: number, name: string): Entry[] {
  const last = table.length - 1;
  if (!(total > table[last].score)) return table;
  let index = table.findIndex(e => total > e.score);
  if (index < 0) index = last;
  table.splice(index, 0, { name, score: total, level });
  table.pop();
  return table;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/cnc-mission-rating.ts) exits 0 with no output.

## 5. Lands in

- TARGET `src/fight/rating.ts` (new module: end-of-fight rating from the server's fight record, and a fixed-length best-results table). Parity-checklist row 19 (fight record / replay). The rating reads the record; it does not change the fight.
- Reuse tag: rewrite-from-idea (GPL-3.0 with EA additional terms; clean-room only)
- Brief rule served: server-verified kills and losses (the counts come from the server's fight record, not the client); one ledger (one record feeds the rating); zones as data (the stage multiplier and weights are data). Rules 7-9 n/a.

## 6. Gaps and risks

- Licence. GPL V3 with EA additional terms (no trademark or publicity rights; no misrepresenting the program's origin). Clean-room only: the sketch is written from the mechanism. The fixed-point helpers are a standard 8.8 ratio, rewritten here, not copied.
- Topic fit. There is no XP, level or skill in this donor. If Frankendom wants the rating to feed progression, that link is a design decision, not something this donor provides.
- Donor inconsistency, as read. The survival term's loss counts always read the GDI house (SCORE.CPP 662-665), even when the player's house is Nod (house is 0 or 1, SCORE.CPP 599). The retention term does pick the player's house (687). Frankendom should take one house-consistent loss count from the record.
- Hall-of-fame guard, as read. SCORE.CPP 901-902 zeroes the last place when that score is at or above the new total. A weaker run then lands in the last place and overwrites the stored entry. Do not copy the guard; the sketch uses the intent, and the acceptance test asserts it.
- Dead field. `PointTotal` (HOUSE.H 774-776) is described as a running score but is only cleared (HOUSE.CPP 493; no other write found by grep). The rating above does not use it.
- Retention term needs an economy. Frankendom has no credits in the donor's sense. Without a credit ledger, drop the retention share and use only the survival share, or define a different retained-resource ratio.
- Multiplier as data. `BuildLevel + 1` ties the multiplier to the scenario number. Frankendom should take the multiplier per zone from data.
- Not read: the `Logic` list contents, `Available_Money`, the mission-select and campaign sequencing (MAPSEL.CPP), the `#else` build-level branch, the presentation code, the call site in SCENARIO.CPP. Claims about them are cut.

Reuse tag: rewrite-from-idea (GPL-3.0 with EA additional terms; clean-room only)
Brief rule served: server-verified kills and losses, one ledger, zones as data (rules 7-9 n/a)
