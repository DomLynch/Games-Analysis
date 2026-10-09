# OpenEnroth-OpenEnroth (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/TurnEngine/TurnEngine.cpp` | Licence: LGPL-3.0 per the repo LICENSE file (TurnEngine.cpp has no licence header) | C++ | symbol `stru262_TurnBased.StepTurnQueue/AIAttacks/NextTurn`

Checked: Verified: `StepTurnQueue` 443-478, `NextTurn` 366-440, `AIAttacks` 566-635, `SortTurnQueue` 29-95, `_406457` 481-514, `SetAIRecoveryTimes` 517-537, `_4065B0` 540-563, all read in full. Line 443 opens `StepTurnQueue`, not `NextTurn`.

## 1. Mechanism

- Turn-based combat (Might and Magic 6 style). The turn order is an initiative queue (`pQueue`), re-sorted each step by `SortTurnQueue` (29-95). Entries that cannot act get initiative 1001 and the queue is then truncated to the active entries (48, 54, 78), so they drop out. The sort is a selection sort by initiative; ties go to a character before a monster, then to the lower id (59-77). The head decides whose turn it is (82-88) and each character's recovery time is set from its initiative (89-94).
- After an entry acts, `_406457` (481-514) sets its initiative to its recovery time: for a character, the stored or computed attack recovery, with a minimum of 30 ticks; for a monster, the monster's recovery-time stat (485-501). It re-sorts and counts every initiative down until the head is at zero or `turn_initiative` runs out (507-513). `SetAIRecoveryTimes` (517-537) re-arms a monster whose initiative is zero and whose action length is above zero, but only when it is standing, fleeing or fidgeting (it stops at the first character entry): initiative = its recovery time, doubled if slowed (529-533).
- The per-frame driver `_4065B0` (540-563) sorts; if the head is ready it runs the AI action for every ready monster ahead of the next character (545-553), otherwise it steps the queue (555); then it calls `AIAttacks` for every entry (561-562).
- `StepTurnQueue` (443-478) sorts and returns false on an empty queue. If the head's initiative is not zero, it loops (a monster head must also have initiative above zero): every queue entry loses one unit and the global `turn_initiative` counter drops by one, until the head reaches zero; it returns true as soon as the counter reaches zero (round boundary, 457, 471); in every other case, including a head already at zero, it falls through to the final `return false`. A character head loops unconditionally; a monster head loops only if the monster is not dying, dead, disabled or removed, and zeroes `uActionLength` for any entry that reaches zero (467-468).
- `NextTurn` (366-440) sorts the queue and sets the active party member (370-374). It returns early when there are pending actions (376-379) and when the head's initiative is zero or less (381). Otherwise it waits while any monster is in a timed state (dying, in pain, attacking melee or ranged, summoned), accumulating `currentActionTime` by `dt` and finishing dying (to dead) and pain (to stand-or-bored, 32 ticks) when the time is up (384-412). When nothing is pending it sets every living monster to stand-or-bored with `uActionLength` zero, moves `turn_stage` to movement, runs turn-tick effects, and resets `uActionPointsLeft` to 130 (419-439).
- `AIAttacks` (566-635) adds `dt` to the `currentActionTime` of every monster that is not dead, disabled or removed and, once it reaches `currentActionLength`, acts by AI state (591-593): melee pushes an attack, ranged states fire a missile, spell states cast, each followed by a return to stand with zero delay; dying becomes dead; pain returns to stand; any other state does a bored animation half the time (random of 2) or stands for 64 ticks (626-630).
- Inputs: queue entries (initiative, action length, packed id), actor AI state, `dt`. Outputs: mutated initiatives, a round-boundary flag, attacks queued and fired.
- Frame-driven, not fixed-step. The unit of time is the turn, with discrete stages.

## 2. Key functions

- `stru262_TurnBased::StepTurnQueue`: `TurnEngine.cpp` 443-478. Initiative countdown and round boundary.
- `stru262_TurnBased::NextTurn`: `TurnEngine.cpp` 366-440. Turn advance gate, action-point reset, turn-tick.
- `stru262_TurnBased::AIAttacks`: `TurnEngine.cpp` 566-635. Monster attack fire-and-return by AI state.
- `stru262_TurnBased::SortTurnQueue`: `TurnEngine.cpp` 29-95. Park non-acting entries, selection sort with tie rules, set active character and recovery times (read in full).
- `stru262_TurnBased::_406457` (post-action initiative from recovery time) 481-514 and `SetAIRecoveryTimes` 517-537.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Initiative countdown queue with a round-boundary counter | Turn counter start value 100, per round (theirs, 119) |
| Gate the turn on busy actors (animation or pain) | 130 action points per character turn (theirs) |
| Turn-tick effects at a fixed tick cost | 213 ticks for the turn-tick effect (theirs) |
| Post-attack return to stand with no delay (`AIAttacks`, 0 ticks); a stand-or-bored delay on turn advance | 0 ticks after an attack (theirs); 32 ticks stand-or-bored after pain and on turn advance (`NextTurn` 408, 429-431); 64 ticks only in the `AIAttacks` default branch (630) (theirs) |
| Sentinel initiative (1001) to park non-acting entries | 1001 sentinel value (theirs, 48, 54) |
| Initiative after acting = recovery time, with a floor | 30-tick floor for characters (theirs, 493); slowed monsters double (theirs, 533) |

## 4. TypeScript sketch

simplified: the sketch returns a three-way label ('acts' when the head is already at zero) where the donor returns only a bool that is true solely at the round boundary; it clamps at zero where the donor does not; it counts down one unit per call instead of looping until the head reaches zero; it omits the parking truncation, the tie rules (character before monster, then lower id), the post-action recovery assignment and its 30-tick floor, the `uActionLength` zeroing, the monster-state guard and the AI attack driver.

```ts
// Licence: LGPL-3.0 (donor, per its LICENSE file). clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface QueueEntry { id: number; initiative: number; busy: boolean; }
interface Round { left: number; }

// One step: the head acts at zero initiative; otherwise every entry counts down one unit.
function stepInitiative(queue: QueueEntry[], round: Round): 'acts' | 'wait' | 'roundOver' {
  queue.sort((a, b) => a.initiative - b.initiative);
  if (queue[0].initiative === 0) return 'acts';
  for (const e of queue) e.initiative = Math.max(0, e.initiative - 1);
  round.left -= 1;
  return round.left <= 0 ? 'roundOver' : 'wait';
}

// The turn does not advance while any entry is still busy in a timed state.
function canAdvance(queue: QueueEntry[]): boolean {
  return queue.every((e) => !e.busy);
}

// Parking: an entry that cannot act is moved to a sentinel initiative and leaves the count.
function park(e: QueueEntry, sentinel: number): void {
  e.initiative = sentinel;
}

// Per-turn budget granted to the character on turn start.
function startTurnBudget(points: number): number {
  return points;
}
```

## 5. Lands in

- TARGET: none adopted (reference only). The nearest rows are parity-checklist row 1 (duel step / sim) and row 3 (guard, parry, stamina) in `src/fight/duel.ts` (today: `src/duel.ts`, moving); the one idea worth comparing is initiative = recovery time with a floor, against the existing recovery handling in `stepDuel` (`src/duel.ts` line 221, checked in worktree `frankendom-combat-p3`).
- today: `src/duel.ts` (moving). Frankendom's fight is a real-time 60 Hz step, not a turn queue.
- Reuse tag: rewrite-from-idea (reference only; not adopted)
- Brief rule served: (category default, not per-cell) 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- A second engine in effect. Ruling: one engine, and the shared engine is the whole fight (checklist rule). A turn queue would be a second resolver and must not land.
- Turn-based stages do not map onto the 60 Hz step, the rollback core (`src/net/rollback.ts`) or the one-action-per-tick input rule (checklist row 5).
- The donor's time unit is an action point per turn (130), with no Frankendom counterpart; stamina and posture live in the duel step (row 3).
- Initiative-as-recovery-time is the only reusable idea, and it would have to be compared with how `stepDuel` already handles recovery before anything is proposed.
