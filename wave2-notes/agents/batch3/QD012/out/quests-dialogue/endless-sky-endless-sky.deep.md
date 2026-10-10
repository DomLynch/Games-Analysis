# endless-sky-endless-sky (quests-dialogue, cell 3)

Donor: `/mnt/frankendom-donors/endless-sky-endless-sky/source/Mission.cpp` (`Mission::Do(Trigger)` 1262, `IsSatisfied` 1107, `IsFailed` 1153) with `MissionAction.cpp` (`CanBeDone` 223, `Do` 316), `GameAction.cpp` (`Do` 411), `ConditionAssignments.cpp` (`Apply` 93), `ConditionsStore.cpp` (`Get` 94, `Add` 116-118, `Set` 123-125) | Licence: GPL-3.0-or-later (source headers: "either version 3 of the License, or (at your option) any later version"; README line 50: "GPL v3 license"); clean-room only | C++ | symbol `Mission::Do`

Checked: The mission lifecycle was read in full: `Mission::Do(Trigger)` (1262-1362, all counter writes and the action gate), the completion predicate (`CanComplete` at 1093, `IsSatisfied` 1107-1152, `IsFailed` at 1153, `Fail` at 1175), `MissionAction::CanBeDone` (223-305) and `MissionAction::Do` (316-361), `GameAction::Do` (411-504, the payment and fail/mark part), `ConditionAssignments::Apply` (93-130) and the ledger's `Get`, `Add` and `Set` (ConditionsStore.cpp 94-126). Three of the candidate files are read as the donor's own structure: `Mission.cpp`, `MissionAction.cpp`, `GameAction.cpp`. Dialogue: the outline of `Conversation.cpp` (659 lines) was read (node, choice, branch and goto functions 31-655 as signatures and call sites only); the tree's evaluation bodies were not read, so the dialogue part is described, not verified. Confidence: high on the counter lifecycle, the gates and the payment clamp; medium on the dialogue outline. Not read: `Mission::CanOffer` and `CanAccept` (999-1073), `Mission::Do(ShipEvent)` (1424-1493), `Mission::Instantiate` (1505-1795), `StepTimers` and `MissionTimer.cpp`, `ConditionSet::Evaluate` (385-443), derived-condition providers, `Conversation::Node` evaluation bodies. camera_scope: not applicable.

Best transferable idea: quest state is counters in one ledger ("<quest>: offered / active / done / failed"), completion is an AND over objective checks, and a reward runs only when its own gate passes, so only a gate-passing trigger moves the counters (fail and abort are the exception).
Decision (proposed): adapt - keep the counter lifecycle and the AND completion predicate, with the counters written only by the server; drop the free-form expression language for now; add the objective check inside the server's complete path (the donor does not, see section 6); clamp the integer writes and refuse division by zero.
Acceptance: a server test asserts that a COMPLETE sent by the client is refused while a bounty's kill count is below three, that a completed bounty pays once, and that a negative payment never takes credits below zero.

## 1. Mechanism

- One ledger. `ConditionsStore` holds named integer conditions. A missing name reads as zero (`Get`, ConditionsStore.cpp 99-100). `Add` and `Set` write the entry (116-125). Every quest counter and every credit value lives there (ConditionsStore.h 31: primary conditions are stored directly; derived providers are the other kind, not read).
- Lifecycle counters (Mission.cpp 1262-1335). Each mission name is a prefix. The counters are:
  - ACCEPT: `offered` +1 and `active` +1 (1319-1320), then the mission's cached information is set up.
  - DECLINE: `offered` +1 and `declined` +1 (1329-1330).
  - COMPLETE: `active` -1 and `done` +1 (1334-1335).
  - FAIL: `active` -1 and `failed` +1 (1301-1302), written before the action gate.
  - ABORT: `active` -1, `aborted` +1 and `failed` +1 (1306-1310), written before the action gate. Fail and abort always move their counters, because a fail action that cannot be done must not stop the failure (comment in the code).
- Action gate. For every other trigger, if the mission has an action for that trigger and `CanBeDone` is false, the function returns false before any counter moves (1314-1315). `CanBeDone` (MissionAction.cpp 223-305) checks: failure state (a failed mission only runs fail actions), the credits covering a negative payment (228), the outfits and ships that would be taken, the required outfits (including map state), and the system and planet filters. Only then does the action apply (`MissionAction::Do` 316-356, which hands off to `GameAction::Do` at 356).
- Completion predicate (Mission.cpp 1093-1166). `CanComplete` requires the player at the destination (or the completion filter to match) and then `IsSatisfied`. `IsSatisfied` is an AND of: no waypoints or stopovers left (1107-1112), the completion condition test (1113), the complete action can be done (fines and outfit transfers), every NPC has succeeded in this system (1124), every non-optional timer is complete (1128), and no mission cargo or passengers are carried in another system. `IsFailed` is an OR of the fail condition, any NPC failure, and the failed flag (1162).
- Reward apply (GameAction.cpp 411-504). A payment is applied if the account stays at zero or above (459). Otherwise the account is emptied, and never driven below zero (461-462). Fines, debts and events follow. A fail or mark on another mission is recorded, and the failed mission stays in the list until it is safe to remove (502).
- Condition writes (ConditionAssignments.cpp 93-130). Each assignment reads its target from the one store (102), evaluates its right-hand side at that moment (103), and applies one of set, add, subtract, multiply, divide, min or max (107-122). Assignments run in list order, so a later one sees an earlier write.
- Dialogue (Conversation.cpp, outline only). A conversation has nodes with elements. Choice elements can be inactive (`ChoiceIsActive` 395). Branch nodes test a condition set (`IsBranch` 406). Action nodes carry a game action. Labels are attached with `Goto(label, node, element)` (641), used by the loader (118, 130, 557).
- Clock: none. Everything is event-driven (trigger calls), not timed, except the mission timers, which were not read.

## 2. Key functions

- `Mission::Do(Trigger)`: `/mnt/frankendom-donors/endless-sky-endless-sky/source/Mission.cpp` 1262-1362. Counter writes and the action gate, read in full.
- `Mission::CanComplete` and `Mission::IsSatisfied`: same file, 1093 and 1107-1152. The completion AND.
- `Mission::IsFailed` and `Mission::Fail`: same file, 1153 and 1175. The failure OR and the flag.
- `MissionAction::CanBeDone`: `/mnt/frankendom-donors/endless-sky-endless-sky/source/MissionAction.cpp` 223-305. The action gate.
- `MissionAction::Do`: same file, 316-361.
- `GameAction::Do`: `/mnt/frankendom-donors/endless-sky-endless-sky/source/GameAction.cpp` 411 onward (payment 459-462; fail and mark loop around 480-502, read).
- `ConditionAssignments::Apply`: `/mnt/frankendom-donors/endless-sky-endless-sky/source/ConditionAssignments.cpp` 93-130.
- `ConditionsStore::Get`, `Add`, `Set`: `/mnt/frankendom-donors/endless-sky-endless-sky/source/ConditionsStore.cpp` 94-126.
- `Conversation` outline: `/mnt/frankendom-donors/endless-sky-endless-sky/source/Conversation.cpp` 31-655 (signatures and call sites only).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants and rules |
|---|---|
| Quest counters in one ledger keyed by "<quest>: <state>" | Key pattern "<trueName>: active", "offered", "declined", "done", "failed", "aborted" (theirs, Mission.cpp 1301-1335) |
| Fail and abort move counters before the action gate; other triggers after it | Gate at Mission.cpp 1314 (theirs) |
| Abort also counts as failed (compatibility) | Mission.cpp 1310 (theirs) |
| Completion is an AND of objectives | `IsSatisfied` 1107-1152 (theirs) |
| Missing condition reads as zero | ConditionsStore.cpp 99-100 (theirs) |
| Payment cannot take the account below zero | GameAction.cpp 459-462 (theirs) |
| Assignment ops: set, add, subtract, multiply, divide, min, max | ConditionAssignments.cpp 107-122 (theirs) |
| Divide by zero writes the int64 maximum | ConditionAssignments.cpp 119 (theirs; a defect in our view, section 6) |

## 4. TypeScript sketch

simplified: keeps one ledger with a zero default, the counter lifecycle (offer, accept, decline, complete, fail, abort), the rule that fail and abort move counters before the action gate and the others do not, the AND completion predicate, and the payment clamp. It also keeps the list of ledger operations. It fixes two defects: the completion path checks the objectives itself (the donor's Do does not, so the sketch does not rely on the caller), and the integer writes are clamped to int64, with division by zero leaving the value unchanged and reporting false. It omits the offer and accept checks in `CanOffer` and `CanAccept`, the outfit, ship and map requirements in `CanBeDone` (passed in as one function), waypoints and stopovers, NPC and timer objects (passed in as checks), the derived-condition providers, the mission list, and the conversation panels. The donor's `offer` with no action auto-accepts; the sketch returns without a counter for offer.

```ts
// Licence: GPL-3.0-or-later (donor source headers). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

const INT64_MAX = (1n << 63n) - 1n;
const INT64_MIN = -(1n << 63n);
function clamp64(x: bigint): bigint {
  return x > INT64_MAX ? INT64_MAX : x < INT64_MIN ? INT64_MIN : x;
}

type Op = 'set' | 'add' | 'sub' | 'mul' | 'div' | 'min' | 'max';

// One ledger for all quest state and rewards. A missing name reads as 0.
class Ledger {
  private store = new Map<string, bigint>();

  get(name: string): bigint {
    return this.store.get(name) ?? 0n;
  }

  // One write path. Returns false (value unchanged) for a division by zero.
  apply(name: string, op: Op, value: bigint): boolean {
    const cur = this.get(name);
    let next: bigint;
    switch (op) {
      case 'set': next = value; break;
      case 'add': next = clamp64(cur + value); break;
      case 'sub': next = clamp64(cur - value); break;
      case 'mul': next = clamp64(cur * value); break;
      case 'div':
        if (value === 0n) return false;
        next = cur / value;
        break;
      case 'min': next = cur < value ? cur : value; break;
      case 'max': next = cur > value ? cur : value; break;
    }
    this.store.set(name, next);
    return true;
  }
}

// Pays out at most what the player has: a negative payment cannot take credits below zero.
function applyPayment(l: Ledger, credits: string, payment: bigint): void {
  const account = l.get(credits);
  if (account + payment >= 0n) l.apply(credits, 'add', payment);
  else if (account > 0n) l.apply(credits, 'sub', account);
}

type Trigger = 'offer' | 'accept' | 'decline' | 'complete' | 'fail' | 'abort';

interface Quest {
  name: string;
  objectives: Array<() => boolean>;   // every objective must hold before completion (AND)
  actionCanBeDone: () => boolean;     // the reward action's own gate (e.g. enough credits to pay out)
  reward: () => void;
}

// Fires a lifecycle trigger. State lives in the ledger as "<name>: <counter>" entries.
function fire(l: Ledger, q: Quest, t: Trigger): boolean {
  if (t === 'fail' || t === 'abort') {
    // Failing and aborting move their counters first, whether or not the action can be done.
    l.apply(`${q.name}: active`, 'sub', 1n);
    l.apply(`${q.name}: ${t === 'fail' ? 'failed' : 'aborted'}`, 'add', 1n);
    if (t === 'abort') l.apply(`${q.name}: failed`, 'add', 1n);
    return true;
  }
  if (!q.actionCanBeDone()) return false;   // nothing below moves if the action cannot be done
  switch (t) {
    case 'offer':
      return true;                          // an offer only shows the mission; no counter, no reward
    case 'accept':
      l.apply(`${q.name}: offered`, 'add', 1n);
      l.apply(`${q.name}: active`, 'add', 1n);
      break;
    case 'decline':
      l.apply(`${q.name}: offered`, 'add', 1n);
      l.apply(`${q.name}: declined`, 'add', 1n);
      break;
    case 'complete':
      if (!q.objectives.every((check) => check())) return false;   // completion is an AND of objectives
      l.apply(`${q.name}: active`, 'sub', 1n);
      l.apply(`${q.name}: done`, 'add', 1n);
      break;
  }
  q.reward();
  return true;
}

// Example: "clear 3 raiders, then return". Other quests can test "bounty: done" as a condition.
const ledger = new Ledger();
ledger.apply('credits', 'set', 50n);
const bounty: Quest = {
  name: 'bounty',
  objectives: [() => ledger.get('raiders killed') >= 3n],
  actionCanBeDone: () => true,
  reward: () => applyPayment(ledger, 'credits', 200n),
};
fire(ledger, bounty, 'accept');
ledger.apply('raiders killed', 'add', 3n);
fire(ledger, bounty, 'complete');
ledger.apply('zero', 'div', 0n);   // division by zero: value unchanged, reported as false
```

## 5. Lands in

- TARGET `origins/server/quest-state.ts` (proposed path, not checked against the repo): the server-side quest ledger. Parity-checklist row 18 (loot roll and XP award): the reward is paid once, by the server, through the one ledger. The counter keys, the objective list and the payment rule are the data.
- today: not checked (this pass did not read the Frankendom repo).
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: one ledger (every quest counter and reward in one store); server-verified (the server checks the objectives before COMPLETE moves any counter); zones as data (quest objectives and payments as data); rules 7-9 n/a

## 6. Gaps and risks

- Licence: GPL-3.0-or-later. Clean-room only; the sketch is written from the mechanism.
- Defect 1, objectives not checked on the complete path: `Mission::Do(Trigger)` (1262-1362) does not call `IsSatisfied` or `CanComplete`. The AND runs only when the caller asks `CanComplete` first (the UI call site that does this was not read). A COMPLETE fired without that check moves `done` and pays. fix: the server's complete path runs the objective AND itself, and the client cannot send COMPLETE on its own (in the sketch).
- Defect 2, unchecked int64 writes: ADD and SUB (ConditionAssignments.cpp 110, 113) and MUL (116) do not check overflow. fix: clamp, as in the sketch.
- Defect 3, divide by zero: `ce = newValue ? ... : numeric_limits<int64_t>::max()` (119) writes the maximum. A script that divides by a zero counter gets a huge balance. fix: leave the value unchanged and report.
- Design choice, not a defect: fail and abort move counters even when their action cannot be done (1301-1310). A quest that checks `failed` also sees aborts (1310). Frankendom must pick one meaning for `failed` and test it.
- Design choice: a negative payment is clamped to the balance (GameAction.cpp 459-462), so a quest can pay less than its listed price without an error. Frankendom should show the clamp in the reward text, or refuse the quest.
- Dialogue: the conversation tree's evaluation bodies were not read. The outline shows nodes, choices, branches gated by condition sets, action nodes and goto labels. The dialogue part is therefore described, not verified; a port needs a read of `Conversation.cpp` 31-655 and `ConversationPanel.cpp` before it is claimed.
- Not read: `CanOffer` and `CanAccept`, the ship-event path, `Instantiate`, mission timers, derived providers, and `ConditionSet::Evaluate`. The sketch's objectives are plain functions, so they do not depend on those reads.
- Parked missions: a failed mission stays in the player's list until it is safe to remove (GameAction.cpp 502). The removal rule itself was not read.

Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
Brief rule served: one ledger; server-verified; zones as data; rules 7-9 n/a
