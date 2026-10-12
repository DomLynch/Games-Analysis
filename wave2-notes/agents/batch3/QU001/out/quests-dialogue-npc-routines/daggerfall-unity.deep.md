# daggerfall-unity (quests-dialogue-npc-routines, cell 3)

Donor: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/TalkManager.cs` (rumour mill: `GetNewsOrRumors` 1388-1436, `WeightedRandomRumor` 1450-1466, `GetValidRumors` 1468-1520, `AddOrReplaceQuestProgressRumor` 1595-1634, `RefreshRumorMill` 2735-2743), `Assets/Scripts/Game/Questing/Clock.cs` (quest timers), `Assets/Scripts/Game/Questing/Quest.cs` (`Update` 290-347, `EndQuest` 367-400, `TombstoneQuest` 620-650), `Assets/Scripts/Game/Questing/Task.cs` (`Update` 194-290), `Assets/Scripts/Game/Entities/PlayerEntity.cs` (weekly call, 455-466, 1626-1630) | Licence: MIT (root `LICENSE`, line 1 "MIT License", line 3 "Copyright (c) 2009-2023 Daggerfall Workshop"; code may be adapted) | C# | symbol `TalkManager.WeightedRandomRumor`

Checked: Opened TalkManager.cs 125, 341-362, 1385-1530, 1558-1645, 2660-2750 (import, expiry, refresh); Clock.cs 1-75 (fields), 92-258 (QBN parse and timer values), 276-347 (tick, start, stop), 349-400 (time strings, timer init, trigger), 404-485 (travel time), 500-535 (save); Quest.cs 281-400 (start, update, end), 600-650 (tombstone, rumour removal); Task.cs 194-300 (update, start, clear); PlayerEntity.cs 455-466 and 1620-1632; the classic rumour import and the quest rumour entry constructors. Confidence: high for the rumour pick, the answer cap and the task trigger rules (read end to end, numbers checked). High for the timer tick and travel formula. Medium for the quest update loop (read in full, but not the click-rearm helpers). Not read: `Place.cs`, `Person.cs` (no schedule text found by grep); the QBN quest files (game data, not in the box); the greeting and tone code in TalkManager; `TravelTimeCalculator` (called, not opened); the random helper `Dice100`. Camera: out of scope.

Verdict: STRONG for the rumour mill (NPC chatter weighted by source, one answer per talk session) and for quest timers and the task trigger rules. Routines: the quest-side files (`Place.cs`, `Person.cs`, `Clock.cs`) hold no NPC schedule, but the donor has time-of-day schedules elsewhere: mobile NPCs are activated only by day (`PopulationManager.UpdateMobiles`) and shops open by building type and world hour (`PlayerActivate.IsBuildingOpen`); see the Routines section.

Best transferable idea: NPC gossip drawn from one pool where each source has a weight (quest rumours weigh a setting, ambient rumours weigh 1), picked in one pass, with each NPC giving at most one answer per talk session, so quest news reaches players without spamming them.
Decision (proposed): adapt - keep the weighted one-pass pick and the per-session cap; fix the expiry so quest rumours stay until their quest ends (the donor, as read, purges them weekly).
Acceptance: a server test with one quest rumour (weight 50) and four ambient rumours (weight 1) draws 10,000 rumours and gets the quest rumour in about 93 percent of draws (50 of 54); a second talk to the same NPC in one session gives no second rumour; after a simulated week the quest rumour is still listed.

## 1. Mechanism

- Rumour pool (TalkManager.cs 341-363). One list of entries; each entry has a type (CommonRumor, QuestProgressRumor, QuestRumorMill), text variants, a quest id (0 for ambient), a time limit (classic minutes), two factions, a region, flags (bit 1 = a sign text, not spoken) and a text id.
- Answer gate (1388-1393). Each NPC has a counter of rumour and "tell me about" answers for the current talk session. The counter is reset when a new NPC is targeted (742, 798). The gate allows an answer while the count is below 1 (125), or for spy masters, or when the NPC knows everything. Otherwise the NPC gives the out-of-news text.
- Valid set (1468-1520). For spoken talk, sign-only entries are skipped (1490). Common rumours must match the player's region when they name one (1486). A rumour tied to a faction with flag bit 1 is hidden 75 percent of the time (1505-1508).
- Weighted pick (1450-1466, used at 1399). One pass over the valid set. A quest rumour weighs the `QuestRumorWeight` setting (default 50 per the doc comment at 59-62; range 1 to 100); an ambient rumour weighs 1 (1458). Each element is selected with probability weight over the running total plus its weight (1459-1461). The result is proportional to the weights, with no sort and no second pass.
- Expansion (1423-1431, 1434). Quest rumours pick one text variant at random (1425), expand the quest's macros, and count as one answer.
- Quest progress rumour (1595-1634). One entry per quest id. A new progress message replaces the old variants in place. `EndQuest` removes progress rumours (Quest.cs 376) and `TombstoneQuest` puts the post-quest rumour in (640) and removes quest rumours (645).
- Expiry (2665-2743). Imported classic rumours and new common rumours carry a time limit (2691 from data, 2711 as now + 43140 classic minutes). `RefreshRumorMill` removes every entry whose time limit is below now (2742). It runs weekly, 10080 game minutes (PlayerEntity 462-463). Quest rumours never set a time limit (their entries are created at 1567 and 1623 without one), so they would be removed by the first weekly refresh. This is the defect in section 6.
- Quest lifecycle (Quest.cs 290-347). `Update`: the countdown ticks (303); every resource ticks (310); tasks run in order, skipping dropped ones; a break or completion stops the task loop (321-324); pending click rearms are cleared; then every resource's post-tick runs (345).
- Quest end (367-400). `EndQuest` sets the countdown to 2 ticks (373) so final tasks can run; removes the progress rumours (376); applies the faction reputation change, success or failure (384); adds the quest's log messages to the notebook (398).
- Task triggers (Task.cs 194-290). A trigger condition is checked until the task is triggered (218). The first always-on trigger is primary and may start or stop the task (225-226); a secondary always-on trigger can only start it (232). Non-trigger actions run only while triggered (242), and each is initialised on the first triggered update (245-247). A quest break returns early (252). A PersistUntil task checks its target each update and rearms its actions while the target is not set (263-275). The triggered state is stored at the end (281). `Start` sets it true (287-289).
- Quest timer (Clock.cs). Declared in quest text as a symbol with zero, one or two time values and optional flags and ranges. No value: a random start from 1 minute to 7 days (193-196). One value: fixed (202). Two values: a random start between them, if the second is larger (210). Flag 16: the travel-time value (218-220). Flag 1 with a range and a zero time: travel time (225-226). The tick (284-294) subtracts whole elapsed world seconds from the remaining time (287); at zero or below it fires the task with the same symbol (290-292, 404), then stops and stays finished (294). `StartTimer` sets the world-time sample (333-334); `StopTimer` pauses (341).
- Travel time (424-433, 479). Each Place resource is floored to one day (1440) individually in the per-place overload (479, called with returnTrip false at 428), the per-place values (in seconds; the variable is misnamed travelTimeMinutes) are summed (426-428), then the total is multiplied by 2.5 once (433). The floor is NOT applied after the multiplier: one place of 100 minutes gives 1440 x 2.5 = 3600 minutes of timer, not 1440. The flag-16 path calls the all-places version (220), although the comment says the first place (216).

### Routines (NPC daily schedules)

- Quest-side files (`Place.cs`, `Person.cs`, `Clock.cs`) have no NPC schedule; only the quest timers matched there. That search was too narrow for the whole donor. The donor's real time-of-day schedules are:
  - Mobile NPC population (`Game/Utility/PopulationManager.cs` `UpdateMobiles`, about 170-200): a pooled mobile NPC with `scheduleEnable` is switched on only when `WorldTime.Now.IsDay` (and not suppressed by a racial override, e.g. a transformed lycanthrope).
  - Shop and building hours (`Game/PlayerActivate.cs` `IsBuildingOpen`, 102-106; byte tables `openHours` and `closeHours` per building type at about 88-89, e.g. 7..22 for the first type): a building is open when openHour <= world hour < closeHour; a guild's `HallAccessAnytime()` overrides it (about 1278).
  Both are plain tables or one day/night bool, with no per-NPC routine. This is the donor's schedule category.

## 2. Key functions

- `TalkManager.GetNewsOrRumors`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/TalkManager.cs` 1388-1436.
- `TalkManager.WeightedRandomRumor`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/TalkManager.cs` 1450-1466.
- `TalkManager.GetValidRumors`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/TalkManager.cs` 1468-1520.
- `TalkManager.RefreshRumorMill`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/TalkManager.cs` 2735-2743.
- `Clock.Tick`, `Clock.StartTimer`, `Clock.TriggerTask`, `Clock.GetTravelTimeInSeconds`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Questing/Clock.cs` 276-294, 309-334, 401-413, 424-485.
- `Quest.Update`, `Quest.EndQuest`, `Quest.TombstoneQuest`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Questing/Quest.cs` 290-347, 367-400, 620-650.
- `Task.Update`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Questing/Task.cs` 194-290.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants and rules |
|---|---|
| One-pass weighted pick | Quest weight from settings (default 50, range 1 to 100, TalkManager 59-62); ambient weight 1 (1458) |
| Answers per talk session | 1 (TalkManager 125); reset at 742 and 798 |
| Faction hide roll | Flag bit 1 hides the faction's rumours 75 percent of the time (1508) |
| Weekly refresh | 10080 game minutes (PlayerEntity 462) |
| Common rumour expiry | 43140 classic minutes after creation (2711) |
| Quest timer random start | 60 s to 604800 s (1 minute to 7 days) when no time is declared (194-196) |
| Travel multiplier | 2.5 once for the sum of per-place seconds (Clock.cs 32, 433) |
| Travel floor | 1440 minutes (one day) per place, before the sum and before the x2.5 (479) |
| Timer tick | Whole seconds of world time, subtracted each tick (287) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for the weighted pick (weight per entry, running total, replace with probability weight over total plus weight) and the timer tick (whole elapsed seconds, fire once, then finished). It changes two things on purpose: the expiry keeps quest rumours that have no time limit (the fix in section 6), and the travel time is written as one function of a list of per-place minutes (floor per place, sum, then x2.5, as in the donor). It omits: the region, sign and faction filters, the NPC answer counter, the text variant pick and macro expansion, the quest progress replace, the quest timer's declaration parsing (random start, two values, flags 1 and 16, the one-way "_2place_" timer), the save and restore, and the debug log when no task has the timer's symbol.

```ts
// clean-room sketch of two Daggerfall Unity mechanisms (MIT donor): a weighted rumour pick and a quest timer
interface Rng { range(lo: number, hi: number): number; } // integer in [lo, hi)

// questId 0 = ambient rumour. timeLimit null = no expiry (the fix for quest rumours; see section 6).
interface Rumour { questId: number; text: string; timeLimit: number | null; }

// One-pass weighted pick: quest rumours weigh questWeight, ambient rumours weigh 1.
// Each element replaces the selection with probability weight / (total + weight).
function pickRumour(valid: Rumour[], questWeight: number, rng: Rng): Rumour | undefined {
  if (valid.length === 0) return undefined;
  let total = 0;
  let selected = valid[0];
  for (const r of valid) {
    const w = r.questId !== 0 ? questWeight : 1;
    const roll = rng.range(0, total + w);
    if (roll >= total) selected = r;
    total += w;
  }
  return selected;
}

// Expiry: drop only rumours that have a time limit and whose limit is past (classic minutes).
function refreshRumours(list: Rumour[], nowClassic: number): Rumour[] {
  return list.filter(r => r.timeLimit === null || r.timeLimit >= nowClassic);
}

// Quest timer: counts down in world seconds, fires once. Travel time as in the donor: each place is floored to one day,
// the per-place seconds are summed, then the total is multiplied by 2.5 once (no floor after the multiplier).
const RETURN_TRIP = 2.5;
const ONE_DAY_MINUTES = 1440;

function travelSeconds(placeMinutes: number[]): number {
  let total = 0;
  for (const m of placeMinutes) total += Math.max(m, ONE_DAY_MINUTES) * 60;
  return Math.trunc(total * RETURN_TRIP);
}

interface Timer {
  remaining: number;
  enabled: boolean;
  finished: boolean;
  lastSample: number;
  fire: () => void;
}

function startTimer(t: Timer, nowSeconds: number): void {
  if (t.enabled || t.finished) return;
  t.enabled = true;
  t.lastSample = nowSeconds;
}

function tickTimer(t: Timer, nowSeconds: number): void {
  if (!t.enabled || t.finished) return;
  const elapsed = Math.floor(nowSeconds - t.lastSample); // donor: whole seconds
  t.remaining -= elapsed;
  if (t.remaining <= 0) {
    t.fire();
    t.enabled = false;
    t.finished = true;
    t.remaining = 0;
  }
  t.lastSample = nowSeconds;
}

export {};
```

Typecheck: copied to the VPS as /tmp/qu001-dfu-rumour-timer.ts; `npx -p typescript tsc --noEmit --strict --target es2020` exit 0.

## 5. Lands in

- TARGET `origins/dialogue/rumours.ts` (new module, proposed; not in the tree): the rumour pool, the weighted pick, the per-session cap and the expiry rule. Parity-checklist row 20 (catalogue as runtime source): rumour text and weights are catalogue rows read at runtime.
- The quest timers (`origins/quests/timers.ts`, proposed) and the task trigger rules also sit under row 20, because they are quest catalogue data. No row 1-23 covers quest timers; this is flagged, not invented.
- Reuse tag: rewrite-from-idea (MIT; adaptation allowed; the sketch is clean-room).
- Brief rule served: zones as data (rumour and timer rows in the zone catalogue); one ledger (the per-session counter is per character). Rules 7-9 n/a.

## 6. Gaps and risks

- Quest rumours are purged by the weekly refresh (reads as a defect). Quest rumour entries never set a time limit (1567, 1623), and `RefreshRumorMill` removes entries whose limit is below now (2742), weekly (PlayerEntity 462-463). Not run in the game. The reader did not trace whether the quest action re-adds them. Fix: a rumour with no expiry lives until its quest ends (the sketch's null case).
- Quest timer flag 16 disagrees with its comment: the comment says 2.5x the first Place (216), the code sums every Place (220, 426-428). Fix: pick one in the data and test it; the sum is what the code does.
- Task update returns early on a quest break (Task.cs 252), so the store of the triggered state (281) is skipped that tick. Fix: store it on every path.
- Quest update returns from inside the task loop on a break (Quest.cs 321-324), so the final message flush (340) and the post-tick pass (343-346) are skipped. Whether that is intended is not stated. Fix: break the loop, not the function.
- The timer counts only while enabled and uses the in-game world clock (Clock.cs 309-334). Frankendom must define one server clock for timers, and a timer must survive a restart (the save record is at 502).
- Flags beyond 1 and 16 are not implemented; the comment says flag 8 fires "multiple time(unsure ? )" (Clock.cs 248). Do not port unknown flags.
- Random timer start range is an open TODO (Clock.cs 193). Frankendom should declare the range in data.
- Single-player: the rumour pool and the per-session counter live in one save; there is no server authority or shared NPC state across players.

## 7. As-data shape (PASS2)

- Rumour row (RumorMillEntry, TalkManager.cs 349-362). Fields: rumorType (common, quest progress, quest rumour-mill), listRumorVariants (list of token arrays), questID (ulong, 0 = ambient), timeLimit (ulong, classic minutes, 0 = not set), faction1 int, faction2 int, regionID int (-1 = any), flags int (bit 1 = sign), type int, textID int. A new ambient rumour is one row: yes (imported classic rumours at 2691 and new common rumours at 2711). A new quest rumour is one row: yes for the shape, but the expiry is not set on quest rows, which is the defect.
- Quest timer row (Clock). Fields: symbol (string; the task with the same symbol fires), zero, one or two time values (days.hours:minutes), flag int, range min and max ints. A new timer is one row: yes, provided a task of the same symbol exists. The link is by name, so a missing task fails silently with a debug log (Clock.cs 411-412 region, not re-read).
- Quest task row. Fields: type (enum includes PersistUntil), target symbol (for PersistUntil), an ordered action list where each action is either a trigger or an effect. A new task is one row of actions: yes; the trigger kinds are code (IQuestAction implementations under `Questing/Actions/`).
- Quest end row. Fields: faction id, success and failure reputation change, the progress and post-quest messages. A new quest end is one row: yes.
- Provenance per claim: `/mnt/frankendom-donors/daggerfall-unity` (MIT). Shape from reading; the sketch is clean-room.

## 8. Provenance and licence

Every claim naming a file and line has a receipt in `/private/tmp/p2/wave2-haiku/batch3/QU001/receipts.tsv` (212 rows across all three games, verifier passed). Licence: MIT (`/mnt/frankendom-donors/daggerfall-unity/LICENSE`, lines 1 and 3 read).

## 9. What they patched later

- No commit history was inspected for this clone; "no history available" for the git log of these files in this read. The code comments name the patches:
  - Rumours: TalkManager.cs 1484, "for DFU the regionID component is removed" (a deliberate change from classic; sign rumours show in every region).
  - Rumours: TalkManager.cs 1414, the classic random-region fallback is replaced by the current region; the comment cites odd results for the witches rumour.
  - Rumours: PlayerEntity.cs 1628, the classic pause of rumour updates while the player is jailed is not copied ("no clear reason").
  - Rumours: TalkManager.cs 1505, faction flag comment: less likely to appear (the 75 percent roll at 1508).
  - Tasks: Task.cs 199, the example that motivated the primary and secondary always-on rule: quest W0C00Y00.
  - Tasks: Task.cs 274, PersistUntil rearm observed in quest S0000011.
  - Quest: Quest.cs 334, click rearm: one click cannot serve two tasks (the comment names quest N0B00Y16).
  - Quest: Quest.cs 371, EndQuest waits two ticks for quest Sx017.
  - Timers: Clock.cs 223, HACK for automatic NPC quests that would otherwise end at once (flag 1, zero time).
  - Timers: Clock.cs 193, open TODO on the random range; Clock.cs 231, decompiled quest scripts may need fixes per script rather than a new timer format.

## 10. Rulings for Dom

1. Should quest rumours stay in the pool until their quest ends, not expire with the weekly refresh? Recommendation: yes; this is the donor defect in section 6.
2. Should the quest timer's travel time be the sum of every place in the quest, or the first place as the comment says? Recommendation: the sum (what the code does), written into the zone data so it is visible to designers.
3. Should each NPC give at most one rumour per talk session, as the donor does? Recommendation: yes; it keeps chatter from filling the chat and keeps quest news rare enough to matter.

Reuse tag: rewrite-from-idea (MIT; clean-room sketch).
Brief rule served: zones as data (rumour and timer rows) and one ledger (the per-session counter is per character). Rules 7-9 n/a.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
- Verdict: MINOR.
- Error: travel time was stated as sum x2.5 then a one-day floor; the donor floors each place to 1440 before summing and applies x2.5 last with no later floor (confirmed, Clock.cs 424-485). The sketch differed (100 min: donor 3600, sketch 1440).
- Error: "no clock-driven schedule in this donor" was true only for Place/Person/Clock; false for the donor as a whole (confirmed).
- Missed: PopulationManager.UpdateMobiles activates mobile NPCs only by day; PlayerActivate.IsBuildingOpen uses per-building-type open/close hours with a guild override (confirmed; now added).
Fixed 2026-10-12: Verdict line, travel-time mechanism, numbers table, sketch travelSeconds (work/dfu-rumour-timer.ts matches), Routines section.
