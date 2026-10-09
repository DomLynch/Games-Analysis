# OpenRCT2-OpenRCT2 (progression, cell 10)

Donor: /mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/management/Research.cpp | Licence: GPL-3.0 | C++ | symbol ResearchUpdate
Symbol check: ResearchUpdate opens at 311 and closes at 371; ResearchNextDesign 146-169, MarkResearchItemInvented 171-183, ResearchFinishItem 189-305, ResearchCalculateExpectedDate 95-121 (all opened this pass). Caller opened: /mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/GameState.cpp lines 320-340 (ResearchUpdate call at 332).

## 1. Mechanism
- Donor: OpenRCT2 park research. A queue of uninvented designs is worked through one at a time by a fixed-point progress counter.
- Driver: ResearchUpdate (311-371). It is called every tick from the main game-state update (GameState.cpp 332, between Park::Update and RideRating::UpdateAll; only lines 320-340 read). It returns at once in the editor (317-320) and unless currentTicks is a multiple of 32 (323-326).
- Rate: the level is the funding level, except that a park with the noMoney flag and funding NONE uses NORMAL (328-331). The rate table _researchRate is 0, 160, 250, 400 for none, minimum, normal, maximum (lines 42-47). With funding none and money on, the rate is 0 and progress never advances. Each run adds the rate to the 16-bit-style progress counter (337-338).
- If the sum is 0xFFFF or less, it is stored and the run ends (339-342). Otherwise the stage switch runs (345-369); note that in the overflow case the sum is not stored, each branch sets progress itself. Stage INITIAL_RESEARCH calls ResearchNextDesign (progress is set to 0 inside it, line 165) and recomputes the expected date. Stage DESIGNING sets progress 0, moves to COMPLETING_DESIGN, recomputes the date and invalidates windows. Stage COMPLETING_DESIGN calls MarkResearchItemInvented, then ResearchFinishItem, sets progress 0, returns to INITIAL_RESEARCH, recomputes the date, refreshes the uncompleted-category flags and invalidates windows. Stage FINISHED_ALL only forces the funding level to NONE.
- ResearchNextDesign (146-169): if the uninvented list is empty it calls ResearchMarkAsFullyCompleted (130-140: progress 0, stage FINISHED_ALL, windows invalidated, funding reset to 0 through a ParkSetResearchFundingAction) and returns. Otherwise it picks the first uninvented item whose category bit is set in researchPriorities, else the first item of the list; stores it as researchNextItem, sets progress 0 and the stage to DESIGNING.
- MarkResearchItemInvented (171-183) removes the item from the uninvented list and appends it to the invented list unless it is already there.
- ResearchFinishItem (189-305) stores researchLastItem. For a ride item it marks the ride type and ride entry invented, also marks any ride entry that is not in research but shares the base ride type as invented and inserts it (214-241, a legacy-file rule), and queues a news item unless gSilentResearch is set or the rideResearched notification config is off (265-272). For any other item it treats it as a scenery group: marks it invented, queues news under the same two conditions (289-297), and broadcasts an init-scenery intent.
- ResearchCalculateExpectedDate (95-121): if the stage is INITIAL_RESEARCH or the funding is NONE it stores the "unknown" day 255. Otherwise remaining progress is 0x10000 in COMPLETING_DESIGN or 0x20000 otherwise, minus current progress, divided by the rate, times 128, projected onto the calendar from the month ticks (UI only).
- Output: invented flags on the game state, an expected-completion date, news items, and window invalidation.

## 2. Key functions
- ResearchUpdate | /mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/management/Research.cpp | 311-371 | the periodic step: adds rate to progress; on overflow advances the stage, picks or finishes items.
- ResearchFinishItem | /mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/management/Research.cpp | 189-305 | unlocks a finished item by type (ride, else scenery group), also unlocks unlisted entries of the same ride type, and queues news unless silent or config-off.
- ResearchNextDesign | /mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/management/Research.cpp | 146-169 | picks the next uninvented item, preferring the active category priorities; marks the research fully completed when the list is empty.
- ResearchCalculateExpectedDate | /mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/management/Research.cpp | 95-121 | projects remaining progress into a date from the current rate; the initial stage and funding NONE report unknown (255).
- MarkResearchItemInvented | /mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/management/Research.cpp | 171-183 | moves an item from the uninvented list to the invented list.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed-point progress counter that overflows into the next stage | 16-bit stage size 0x10000 (theirs, Research.cpp 107 and 339) |
| Rate per funding level added on a slow tick | Rates 0, 160, 250, 400 (theirs, _researchRate, Research.cpp 42-47) |
| Runs only on every Nth tick | Every 32 ticks (theirs, Research.cpp 323) |
| Three-stage state machine per item, each stage closed by overflow | Stage names and their order (theirs) |
| Preference list picks the next item, falls back to queue head | Research categories and priority flags (theirs) |
| Expected date = remaining / rate, projected onto the calendar | Factor 128 and 0x10000 month-tick scale (theirs, Research.cpp 109-116, UI only) |

## 4. TypeScript sketch
simplified: categories are collapsed to item ids in the priority set (the donor tests a category bit mask); the invented list is not de-duplicated; news, windows, the legacy same-ride-type unlock, the expected-date calculation and the editor check are omitted; on an empty queue the donor's funding-reset action is reduced to setting funding 0; the donor's FINISHED_ALL stage case (forcing funding NONE every slow tick) is folded into that.
```ts
// Licence: GPL-3.0 | clean-room: written from the mechanism, no donor lines.
// Timed unlock queue: one fixed-point counter. Every stage (wait, design, completion) ends when the counter
// would overflow 16 bits. The wait stage picks the next item; completion unlocks it and returns to wait.
const RATE = [0, 160, 250, 400];      // per funding level (theirs)
type Stage = "initial" | "design" | "complete" | "finished";
interface Research {
  stage: Stage; progress: number; funding: number;
  uninvented: string[]; invented: string[]; priority: Set<string>; next: string | null;
}

function pickNext(r: Research): void {
  if (r.uninvented.length === 0) {                 // nothing left: finished, funding off
    r.progress = 0; r.stage = "finished"; r.funding = 0; return;
  }
  r.next = r.uninvented.find(x => r.priority.has(x)) ?? r.uninvented[0];
  r.progress = 0; r.stage = "design";
}

function tick(r: Research, tickCount: number, noMoney: boolean): void {
  if (tickCount % 32 !== 0) return;               // slow tick (theirs)
  const funding = noMoney && r.funding === 0 ? 2 : r.funding;   // no-money parks use NORMAL (theirs)
  const sum = r.progress + RATE[funding];
  if (sum <= 0xffff) { r.progress = sum; return; }
  if (r.stage === "initial") {
    pickNext(r);
  } else if (r.stage === "design") {
    r.progress = 0; r.stage = "complete";
  } else if (r.stage === "complete" && r.next !== null) {
    r.uninvented = r.uninvented.filter(x => x !== r.next);
    if (!r.invented.includes(r.next)) r.invented.push(r.next);
    r.next = null; r.progress = 0; r.stage = "initial";
  } else if (r.stage === "finished") {
    r.funding = 0;
  }
}
```

## 5. Lands in
- Frankendom file(s): TARGET origins/progression/model.ts (already exists; the one career). Its only time-driven piece is rested CP (RESTED_PER_DAY_CP, RESTED_CAP_CP, restedAvailable), which is accrual by elapsed server time, not a staged queue. Frankendom progression is event-driven by verified kills (award(state, event)), so a funded timed-unlock queue has no consumer today. If a timed unlock is ever wanted (for example a delayed zone or shop opening), it would be a new row in the zones-as-data / shop content, not new progression state; the donor adds only the staged-counter idea.
- Parity-checklist row: 18 (loot roll and XP award), as the nearest row: progression state written by the server in one transaction. Research itself is not one of rows 1-22.
- Reuse tag: rewrite-from-idea (GPL-3.0; mechanism only), low priority.
- Brief rule served: one-character, one-ledger rule (server inventory is the authority); rules 7-9 n/a

## 6. Gaps and risks
- Frankendom ruling "server-verified kills": progress here comes from a clock and a player-set funding level, not from verified events. No Frankendom reward may be driven by a client clock; the server tick alone would advance any counter.
- Frankendom ruling "one ledger": the donor spreads one invention across game-state lists, ride flags, scenery flags and news. Any Frankendom unlock must be a single ledger write.
- The donor's rate comes from a player spend (funding level). Frankendom has no research sink and fixed catalogue numbers ("no hidden numbers"); a rate table like 0/160/250/400 would have to be catalogue fields.
- The noMoney fallback uses NORMAL (250), not minimum (Research.cpp 328-331). Whether Frankendom needs a free mode is a Lead decision.
- The expected-date projection is UI; it must not drive state.
- ResearchFinishItem is a switch on ride or scenery; Frankendom unlocks are gear, skills or zone access, so that body does not port.
- GPL-3.0: mechanism only, no code lifted.
