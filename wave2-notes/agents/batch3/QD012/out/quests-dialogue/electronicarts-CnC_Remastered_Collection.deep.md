# electronicarts-CnC_Remastered_Collection (quests-dialogue, cell 2)

Donor: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/TRIGGER.CPP` (`TriggerClass::Spring` 358 and 748; `Remove` 931) with `HOUSE.CPP` (`Flag_To_Win` 4540, `Flag_To_Lose` 4571, win and loss apply 950-967) and `CONQUER.CPP` (outcome consumption 1625-1656) | Licence: GPL v3 as stated in the donor LICENSE.md ("under the GPL V3 below, with additional terms at the bottom"; Electronic Arts additional terms at the end of the file); clean-room only | C++ | symbol `TriggerClass::Spring`, `HouseClass::Flag_To_Win`

Checked: The mechanism was read end to end: trigger persistence and the object and house spring functions (TRIGGER.CPP 358-529 and 748-822, with the retry and removal lines 524, 529, 903, 908), the destructor that releases a blocker (308-312), the attach code (1075-1077), the INI persistence token (1156-1158), the outcome flags (HOUSE.CPP 4540-4583), the outcome apply (950-967) and the game-loop consumption (CONQUER.CPP 1625-1656). Hint file MISSION.CPP was read in part (AI 185-296, Commence 297-305, Assign 331-336, Override 411-416, Restore 435-441); it is a unit-order queue, written up as a second idea in section 6, not as this note. Confidence: high on the order of operations and the grace and blocker rules. The 15 ticks per second value is from DEFINES.H 2146, read by eye; it cannot be receipted because that line is tab-separated. Not read: `TCountDownTimerClass` (its decrement and `Expired` logic), `Do_Win`, `Do_Lose`, `Do_Reinforcements`, `Remove` after line 960, the house-spring actions after 822 other than ALLOWWIN, the house timer's caller, and what calls `HouseClass::AI` each tick. The mission objective text is built in INI.CPP (comments only at 491, 521, 929, 959; not read). camera_scope: not applicable.

Best transferable idea: a win is a pending flag that waits for a blocker count to reach zero and a grace countdown to run out before it is applied once, and each trigger is one-shot, counted over several holders, or permanent.
Decision (proposed): adapt - keep the pending flag, the blocker count and the grace; fix the donor's shared countdown (a blocker removal resets a running countdown to 4 s) by starting the blocker countdown only when the last blocker goes; route the applied outcome through the one server ledger.
Acceptance: a server test asserts that a zone clear is not applied while one blocker is alive, that the outcome applies once after the grace counted from the last blocker, and that a second blocker removal during a running countdown does not extend it.

## 1. Mechanism

- A trigger is an event, an action, a data value, a house, a team and a persistence type. Persistence is `VOLATILE` (one-shot), `SEMIPERSISTANT` (counts the objects holding it) or `PERSISTANT` (never removed) (TRIGGER.H 107-109). The constructor and the INI reader default to volatile (TRIGGER.CPP 282, 1156-1158).
- Object spring (TRIGGER.CPP 358): (a) the event must match, and the event `EVENT_ANY` matches everything (top of the function). (b) A timed trigger counts `Data` down on each spring and reloads `DataCopy` at zero (371-376). (c) A semi-persistent trigger detaches the object, lowers `AttachCount`, and returns unless it was the last holder; the last holder sets it volatile (401, 404). (d) The action switch runs. (e) A failed timed trigger sets `Data = 1`, so it retries on its next spring (524). A volatile trigger is removed only after success (529).
- The WINLOSE action (424-441): on a destroy event it flags a loss unless the player is flagged to win and has no blockers (427); on a player-entered event it flags a win unless the player is already flagged to lose (432); any other event returns success false, so the trigger stays. The WIN and LOSE actions flag directly (478-484).
- House spring (TRIGGER.CPP 748): house and event must match (top). Credits need `data >= Data` (761). Count events (buildings or units destroyed) need `data >= Data` (777-781). Timed house triggers count down and reload as above (786-791). ALLOWWIN is a no-op here (816-818); its effect is the removal of the trigger. A threshold trigger has no edge, so a persistent one fires on every spring whose data meets the threshold (shape of the code; retry and removal at 903 and 908).
- Blockers: attaching an ALLOWWIN trigger to a house raises that house's `Blockage` (1075). Destroying it lowers `Blockage` (not below zero) and sets the house's `BorrowedTime` to `TICKS_PER_SECOND*4` (310-312), in a live game only (310). Each removal sets the grace again, even while a countdown runs.
- Outcome flags (HOUSE.CPP 4540-4583). `Flag_To_Win` sets `IsToWin` only from a clean state (4543) and sets the grace to 3 s in v1.07 mode or 1 s otherwise (4546, 4548). `Flag_To_Lose` clears `IsToWin` (4574), sets `IsToLose` if not already losing, and sets the grace to 3 s or 1 s (4578, 4580). A second flag does not restart the countdown.
- Apply (HOUSE.CPP 950-967), once per house update. A win applies when `IsToWin`, the grace has expired and `Blockage <= 0`; the flag is then cleared (951), and the player is marked won (953) if this house is the player, or lost (955) otherwise. A loss applies when `IsToLose` and the grace has expired, with no blocker check; cleared (963); player marked lost (965) if the player, won (967) otherwise.
- Consumption (CONQUER.CPP 1625-1656): the game loop reads `PlayerWins` first. The win branch clears `PlayerLoses` (1633) and calls `Do_Win` (body not read), so a win beats a loss set in the same frame. Then the loss branch (1639), then restart.
- Clock: all grace values are in game ticks at 15 per second (DEFINES.H 2146).

## 2. Key functions

- `TriggerClass::Spring` (object): `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/TRIGGER.CPP` 358-529. Event filter, timer, semi-persistent holder count, action switch, retry and removal.
- `TriggerClass::Spring` (house): same file, 748-822 read (credits, count and build thresholds, timer, ALLOWWIN), 903-908 (retry and removal) read by line.
- `TriggerClass::~TriggerClass` (blocker release): same file, 308-312.
- Blocker attach: same file, 1075-1077.
- `HouseClass::Flag_To_Win`: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/HOUSE.CPP` 4540-4552. `HouseClass::Flag_To_Lose`: same file, 4571-4583.
- Outcome apply: same file, 950-967 (house update).
- Game-loop consumption: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/CONQUER.CPP` 1625-1656.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Persistence: one-shot, counted over holders, or permanent | VOLATILE 0, SEMIPERSISTANT 1, PERSISTANT 2 (theirs, TRIGGER.H 107-109) |
| Timed trigger: count down, reload, retry on failure | Count down by 1 per spring, reload `DataCopy`, retry sets `Data = 1` (theirs, TRIGGER.CPP 372-376, 524) |
| Threshold events (credits, buildings or units destroyed) | Fire when data is at least the threshold (theirs, TRIGGER.CPP 761, 777-781) |
| Blocker grace after the blocker count hits its release | 4 s = `TICKS_PER_SECOND*4` (theirs, TRIGGER.CPP 312) |
| Win grace | 3 s in v1.07 mode, 1 s otherwise (theirs, HOUSE.CPP 4546, 4548) |
| Loss grace | 3 s in v1.07 mode, 1 s otherwise (theirs, HOUSE.CPP 4578, 4580) |
| Win waits for blockers; loss does not | Blocker check only in the win apply (theirs, HOUSE.CPP 950 vs 962) |
| Clock | 15 ticks per second (theirs, DEFINES.H 2146; not receipted) |

## 4. TypeScript sketch

simplified: keeps the flag-once rule, the blocker count, the two grace countdowns, the rule that a loss ignores blockers, and the semi-persistent holder count. It fixes the donor defect: a blocker removal never touches a running outcome countdown, and the blocker countdown starts only when the last blocker goes. It omits the event filters, the INI reader, the cell and object references, the house thresholds, the timed-trigger countdown (only the persistence part is kept), the team and reinforcement actions, and the screens (`Do_Win`, `Do_Lose`). The donor's single shared `BorrowedTime` is split into two countdowns. The countdown class was not read, so the sketch assumes it reaches zero by one subtraction per tick.

```ts
// Licence: GPL v3 with Electronic Arts additional terms (donor LICENSE.md). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

const TICKS_PER_SECOND = 15; // game ticks per second (value read at DEFINES.H 2146; not receipted)

type Flagged = 'none' | 'win' | 'lose';
type Persist = 'volatile' | 'semi' | 'persistent';

// One side's pending outcome. A flag is set once. Blockers (objectives that must be finished before a win)
// hold a win back. Two countdowns: the outcome countdown is set only by the flag; the blocker countdown
// starts when the last blocker goes and is never restarted by a later removal.
interface Side {
  flagged: Flagged;
  blockers: number;
  graceLeft: number;        // ticks left before the flagged outcome may apply
  blockerGraceLeft: number; // ticks left after the last blocker is gone
  decided: boolean;
}

function flagWin(side: Side, graceSeconds: number): void {
  if (side.flagged !== 'none') return;   // already flagged: the countdown is not restarted
  side.flagged = 'win';
  side.graceLeft = graceSeconds * TICKS_PER_SECOND;
}

function flagLose(side: Side, graceSeconds: number): void {
  if (side.flagged === 'lose') return;   // lose replaces a pending win and starts its own countdown
  side.flagged = 'lose';
  side.graceLeft = graceSeconds * TICKS_PER_SECOND;
}

// A blocker is removed. Only the removal that empties the count starts the blocker countdown.
function blockerRemoved(side: Side, blockerGraceSeconds: number): void {
  if (side.blockers <= 0) return;
  side.blockers--;
  if (side.blockers === 0 && side.blockerGraceLeft === 0) {
    side.blockerGraceLeft = blockerGraceSeconds * TICKS_PER_SECOND;
  }
}

// Once per game tick. Returns the applied outcome at most once.
function tickOutcome(side: Side): 'win' | 'lose' | null {
  if (side.decided || side.flagged === 'none') return null;
  if (side.graceLeft > 0) side.graceLeft--;             // reaches zero (assumed; the donor's countdown class was not read)
  if (side.blockerGraceLeft > 0) side.blockerGraceLeft--;
  if (side.graceLeft > 0) return null;
  if (side.flagged === 'win' && (side.blockers > 0 || side.blockerGraceLeft > 0)) return null;
  side.decided = true;
  return side.flagged;                                  // lose ignores blockers, as in the donor
}

// Trigger persistence: a semi-persistent trigger springs only when its last holder lets go.
interface Attach {
  persist: Persist;
  holders: number;
  live: boolean;
}

function releaseHolder(t: Attach): boolean {
  if (t.persist === 'semi') {
    t.holders--;
    if (t.holders > 0) return false;
    t.persist = 'volatile';
  }
  return true;
}

// Example: a win is flagged with a 1 s grace; two blockers go. The blocker countdown starts when the
// second one goes (4 s = 60 ticks) and is not restarted by anything else. The win applies after 60 ticks.
const side: Side = { flagged: 'none', blockers: 2, graceLeft: 0, blockerGraceLeft: 0, decided: false };
flagWin(side, 1);
blockerRemoved(side, 4);
blockerRemoved(side, 4);
let result: 'win' | 'lose' | null = null;
for (let tick = 0; tick < 100 && result === null; tick++) {
  result = tickOutcome(side);
}
const hold: Attach = { persist: 'semi', holders: 2, live: true };
releaseHolder(hold);
```

## 5. Lands in

- TARGET `origins/server/quest-outcome.ts` (proposed path, not checked against the repo): the server-side zone or quest outcome. Parity-checklist row 18 (loot roll and XP award): the outcome applies once on the server and its reward is granted once through the one ledger. The blocker count, the grace seconds and the persistence type are zone data.
- today: not checked (this pass did not read the Frankendom repo).
- Reuse tag: rewrite-from-idea (GPL v3 with Electronic Arts additional terms; clean-room only)
- Brief rule served: one ledger (reward applied once); server-verified (the server applies the outcome); zones as data (blockers and grace per zone); rules 7-9 n/a

## 6. Gaps and risks

- Licence: GPL v3 with Electronic Arts additional terms. Clean-room, shape only. No code is carried across.
- Defect 1, shared countdown: the blocker release sets the house's `BorrowedTime` to 4 s unconditionally (TRIGGER.CPP 312). A blocker removed while a win or loss countdown runs resets that countdown to 4 s from the removal, so a loss (which ignores blockers) with less time left is pushed back. fix: a separate blocker countdown, started only when the last blocker goes (in the sketch).
- Defect 2, no edge on threshold triggers: a persistent credits or count trigger fires on every spring whose data meets the threshold (TRIGGER.CPP 761, 777-781). fix: give each trigger an edge latch, so it fires on the first crossing only. The port must choose one behaviour and test it.
- Asymmetry: a win waits for blockers and a loss does not (HOUSE.CPP 950 vs 962). This may be a design choice (a player can always lose). Frankendom must decide it and test it.
- Two-sided flags: the apply rule flips for the AI side (HOUSE.CPP 953-967: an AI house winning marks the player lost). Frankendom has one player per fight; keep the outcome per character and per zone.
- Tie rule: a win beats a loss set in the same frame (CONQUER.CPP 1633). Copy it on purpose, with a test.
- Dialogue: no dialogue tree in the trigger system. Reinforcement announcements and help text were not read. Mission objective text is built in INI.CPP (not read).
- Second idea, not written up (MISSION.CPP): `Assign_Mission` queues an order (331-336), `Commence` starts the queued order when the unit is stopped (297-305), `Override_Mission` parks the current order in one slot (411-416), and `Restore_Mission` puts it back (435-441). Defect: a second override before the restore overwrites that one slot, so the original order is lost. The header of `Override_Mission` says the current mission is re-assigned in that case, which the code does not do. This is the closest donor to a parked script and to a fighting-game input buffer; it needs its own cell.

Reuse tag: rewrite-from-idea (GPL v3 with Electronic Arts additional terms; clean-room only)
Brief rule served: one ledger; server-verified; zones as data; rules 7-9 n/a
