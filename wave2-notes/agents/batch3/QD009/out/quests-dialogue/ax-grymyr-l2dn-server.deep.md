# ax-grymyr-l2dn-server (quests-dialogue, cell 3)

Donor: /mnt/frankendom-donors/ax-grymyr-l2dn-server | Licence: MIT License, "Copyright (c) 2024-2025 Grymyr, L2Dn Server Project" (LICENSE.txt line 1-3); README.md:9 says the code "initially is the port of the L2J server written in Java" (I did not check L2J's own licence terms) | C# (.NET) | symbol QuestState.setCond(int cond, int old)
Checked: opened QuestState.cs (lines 134-178, 236-392, 468-515, 546-580, 880-910, fully read for setCond and restart), Quest.cs (277-351 timers, 615-646 notifyKill, 1127-1155 onTalk, 3080-3190 rewardPlayer), QuestTimer.cs (16-30, 44-110, 128-145), Scripts/Quests/Q00206Tutorial.cs (the only quest script in the box; 51-126, 127-150, 191-209, 268-283), LICENSE.txt, README.md. NOT read: QuestManager.cs (registration), Quest.cs giveItems/addExpAndSp bodies, the callers of rewardPlayer, getCondBitSet (515-530) and the client packets that read the journal word, Config reset hour/minute values (Quest.cs:79-90 defines the getters only). Confidence: high on the step-journal write rules (setCond read end to end, every branch traced); medium on what the client shows (reader not read). The sketch was typechecked, not executed.

## 1. Mechanism
Quest progress is a step number (cond) per player. A quest journal needs more than the current step: it must show which earlier steps were done and which were jumped over. The donor stores that as a 32-bit word in a quest variable named "__compltdStateFlags". Bit k-1 set means step k was reached. The top bit (0x80000000) is a flag meaning "at least one step is a gap". Rules, as the code does them (setCond(int cond, int old), QuestState.cs:312-381):
- The write is skipped when cond equals the old step (line 319).
- Steps below 3 and above 31 are not journalled: the word is unset (lines 329-332). The donor's own comment says more than 31 steps "CANNOT be supported" with skipping.
- On the first forward jump of more than one step (cond > old + 1, line 343), the word is created with the skip bit and bit 0 (line 347), bits 0..old-1 are set (line 350: every step already reached), and the arrival bit is set (line 353).
- If a skip already exists, a forward move sets only the arrival bit (line 379); the jumped-over steps stay unset, which is what makes them gaps.
- A rollback (cond < old, line 358) keeps only bits below the new step (line 360). If no gap remains, the word is unset (lines 363-365); otherwise the skip bit is set again (lines 367-372).
- Every change writes the word back (set at lines 354, 372, 380) and sends the client a journal packet (not read).
Progress itself is written through the cond variable: setCond(QuestCondType) calls set(COND_VAR, ...) (line 488) only while the quest is started (check at line 486), and the variable setter calls the step-journal writer at line 288 inside set() (QuestState.cs:236-310).

A second, smaller pattern is in the same file: a daily restart time (setRestartTime, lines 880-895) computes the next reset time-of-day from the quest's reset hour and minutes, and isNowAvailable (line 904) compares the stored time to now.

Quest rewards (Quest.cs:3107-3149, rewardPlayer): items go through giveItems per entry (line 3119). If the reward has a level, XP is topped up to the XP floor of that level when the player is below it (lines 3127-3130: addExpAndSp(targetExp - playerExp, 0), then HP, MP and CP are restored). A flat XP and SP reward is added after that.

Dialogue and parked scripts (Q00206Tutorial.cs, the one real quest script in this box): a login hook (line 280) schedules a 5-second quest timer "start_newbie_tutorial". When the timer fires, QuestTimer calls Quest.notifyEvent (QuestTimer.cs:143), which calls onAdvEvent (Quest.cs:581). The handler starts the quest only if the memo state is below 4 (line 138). A kill of a monster can drop a quest gem at a 50 percent roll (line 196, "getRandom(100) < 50") while memo state is below 3, and then sets memo 3 (line 199). The NPC's first-talk handler dispatches on memo state (helper switch from line 62; supervisor switch from about line 104): talking with the gem present moves memo to 3 (line 59-60), and memo 3 is the one state that gives the reward items on that talk (lines 78-86, giveItems at 84). Memo 4 and up show a different page.

## 2. Key functions
- `QuestState.setCond(int cond, int old)` (QuestState.cs:312-381): the step-journal writer. Read end to end.
- `QuestState.set(string variable, string value)` (QuestState.cs:236-310): writes a quest variable to the database and, for the cond variable, calls setCond(int,int) with the parsed old and new values.
- `QuestState.setCond(QuestCondType)` (QuestState.cs:479-490): writes cond only while started; plays a sound on DONE.
- `QuestState.setRestartTime` (QuestState.cs:880-895) and `isNowAvailable` (QuestState.cs:901-905).
- `Quest.rewardPlayer` (Quest.cs:3107-3137).
- `Quest.startQuestTimer` / `getQuestTimer` / `notifyKill` (Quest.cs:300-347, 615-644).
- `QuestTimer` constructor and `ScheduleTimerTask.run` (QuestTimer.cs:16-30, 131-144): timers use the thread pool, not the server tick.
- `Q00206Tutorial.onFirstTalk`, `onAdvEvent`, `onKill`, `PlayerLogin` (Q00206Tutorial.cs).

## 3. Numbers vs mechanism
- Journal limits: steps 3 to 31 are tracked (QuestState.cs:329). Steps 1 and 2 are never gaps in the donor's model (the first step is never skipped; cond 2 is "safe", comments at lines 325-327).
- Skip flag: 0x80000000; step 1 bit: 0x1 (line 347).
- Login timer: 5 seconds (Q00206Tutorial.cs:280).
- Gem drop: 50 percent (line 196), only while memo < 3 and no gem held.
- Restart: next reset is the reset hour and minute on the next date (line 893); values not read.
- Reward XP: top-up to the level floor; the amount is computed from the donor's exp table (not read).
- Defects found while reading (keep the idea, fix in the port):
  1. Daily reset (QuestState.cs:888): the check is `reDo.Hour >= getQuest().getResetHour()`. It compares the hour only. If the reset is 06:30 and the time is 06:10, the code moves the reset to tomorrow, so today's 06:30 reset is skipped. fix: compare the full time of day (hour and minute) with the reset time.
  2. Cond 2 comment vs code (QuestState.cs:329 vs 343; comment at 325-327): cond below 3 is documented as untracked, but a jump from 0 to 2 still enters the skip branch and writes a skip word (0x80000003 in the donor's arithmetic). fix: do not write the word for steps below 3.
  3. Steps above 31 (QuestState.cs:329, 343-353): the code unsets the word for cond > 31, but the skip branch still runs for such a jump, and the shifts `1 << (cond - 1)` wrap (C# masks the shift count), so the word can get bits for the wrong step. The donor's comment says this range is unsupported. fix: store nothing above 31 (the sketch does this).
  4. Timer lookup comment (Quest.cs:311) says null acts as a wildcard, but equality is exact (QuestTimer.cs:89). fix: state the rule in the comment and tests, or implement the wildcard.
  5. Timers run on the thread pool (QuestTimer.cs:26, 30), so they fire on wall-clock time outside the game loop, and their callbacks can race the world state. fix: drive timers from the fixed server tick (see parity row 18, post-K item 3 sub-line).

## 4. TypeScript sketch
simplified: the donor stores a bit word; the sketch stores a boolean array with the same rules (gaps are steps 3 and up not done below the current step; a skip fills the steps already reached; a rollback truncates; untracked ranges clear the journal). It drops the 31-step bit limit in favour of an array, does not store anything for steps above 31 (fixes defect 3), and does not write a skip word for steps below 3 (fixes defect 2). It omits the database writes, the client packets and the sound. Clean-room: written from the rules above, not translated.
```ts
// Quest step journal with gap (skip) and rollback rules, modelled on L2Dn QuestState.setCond.
export const MAX_TRACKED_STEP = 31; // donor: steps above 31 are not supported

export interface StepJournal {
  step: number;     // current step; 0 = not started
  done: boolean[];  // done[k - 1] === true when step k has been reached and not rolled back
}

export function emptyJournal(): StepJournal {
  return { step: 0, done: [] };
}

// Steps 1 and 2 are never gaps (donor: the first step is never skipped; cond 2 is "safe").
// A gap is a step k with 3 <= k < current step that is not done.
export function gaps(j: StepJournal): number[] {
  const out: number[] = [];
  for (let k = 3; k < j.step; k++) {
    if (!j.done[k - 1]) out.push(k);
  }
  return out;
}

export function advanceStep(j: StepJournal, next: number): StepJournal {
  if (next === j.step) return j;

  // Untracked range: no journal is kept for steps below 3 or above 31.
  // simplified: donor can write a skip word for next > 31 (shift wraps); here nothing is stored.
  if (next < 3 || next > MAX_TRACKED_STEP) {
    return { step: next, done: [] };
  }

  // Rollback: keep steps 1..next-1 only; the step rolled back to is no longer done.
  if (next < j.step) {
    return { step: next, done: j.done.slice(0, next - 1) };
  }

  // Forward move. If no gaps exist yet, every step reached so far counts as done;
  // a jump over steps then leaves those steps open. With gaps already present,
  // only the arrival step is marked.
  const done = j.done.slice();
  if (gaps(j).length === 0) {
    // step 1 is always marked (donor sets bit 0 whenever a skip is recorded)
    for (let k = 1; k <= Math.max(j.step, 1); k++) done[k - 1] = true;
  }
  done[next - 1] = true;
  return { step: next, done };
}

export {};
```

Typecheck: copied to the VPS /tmp/QD009-ax-quest-journal.ts and `npx -p typescript tsc --noEmit --strict --target es2020` exited 0. Not executed.

## 5. Lands in
Target: origins/server/quest-journal.ts (proposed). Parity row 18 (loot roll and XP award), sub-line: quest reward and XP level-floor top-up, applied on the server. The tick is row 18's server sub-line (post-K item 3): quest timers must be server-tick events, not thread-pool callbacks.

## 6. Gaps and risks
- One ledger: the donor pays items through giveItems and XP through addExpAndSp, two separate paths, and the reward path (rewardPlayer, and the tutorial's giveItems calls) has no ledger entry that I found. Frankendom must route every quest reward through the one ledger, with the journal and the award in one transaction.
- Server-verified kills: the tutorial gem drop is a 50 percent roll inside the kill handler (line 196), so the outcome is decided by the same process that runs the kill. In Frankendom the roll and the state change belong to the engine, after the server verifies the kill, and the client must not decide it.
- MAX_ATTACKERS = 3: the donor's kill handler gives credit to one killer. Quest progress in a three-attacker fight needs the engine's credit rule (killer only, or the attackers in the hate list).
- Zones as data: the journal and the tutorial's steps are per-quest code. Frankendom needs step definitions as zone data, with the gap rule in the engine.
- Pit as client: the Pit has no quest journal; quest state must stay a world-only path, with the Pit reading results only.
- Dialogue: the memo-state dispatch works, but the reward is paid from the talk handler, so opening a page can change state. In Frankendom a talk must read state, and a server action must change it.

Best transferable idea: a quest journal can be a step number plus a list of done steps, where a forward jump leaves the skipped steps open as visible gaps and a rollback clears every step ahead of the one rolled back to.
Decision (proposed): adapt - keep the gap and rollback rules for the quest journal in origins/server/quest-journal.ts, stored as data in the server's quest record, and drop the donor's 31-step bit word, the steps-below-3 exception and the thread-pool timers (defects 2, 3, 5 fixed); reject the donor's reward-on-talk path, because it changes state from a read.
Acceptance: after a jump from step 2 to step 6, a server test lists steps 3, 4 and 5 as gaps; a rollback to step 4 keeps the gap at step 3 and clears step 6; a kill or talk never grants a reward without a server action.

Reuse tag: donor game first (L2Dn QuestState.setCond, MIT); the quest-journal idea is new to this library.
Brief rule served: judge the idea (addendum: simple is not weak); real, read, checkable rules for step gaps and rollback, with the donor's defects listed and fixed in the sketch.
