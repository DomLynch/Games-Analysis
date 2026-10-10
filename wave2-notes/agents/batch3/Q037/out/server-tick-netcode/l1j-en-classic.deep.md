# l1j-en-classic (server-tick-netcode, cell 3)

Donor: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/Instance/L1NpcInstance.java` (with `GeneralThreadPool.java`) | Licence: GPL-2.0 (COPYING: "GNU GENERAL PUBLIC LICENSE", "Version 2, June 1991"; the header I read, L1GameTimeClock.java lines 1-18, says "version 2, or (at your option) any later version") | Java | symbol `NpcAITimerImpl.run`

Checked: Read: L1NpcInstance.java 150-290 (AI timer class, start and run), 293-335 (AIProcess start and its no-target path), 425-446 (move step), 540-570 (attack tail), 2028-2062 (calcSleepTime), 2075-2100 (sleep getter and setter); GeneralThreadPool.java 34-122 (whole scheduler set-up and schedule API); Config.java 706-707 (default AI type); COPYING head; the header of L1GameTimeClock.java (not used). Not read: `onTarget` body (397-424, 446-483); the rest of AIProcess (336-397 except signatures); `noTarget` (675 onward, decides whether the AI stops); the attack-speed and move-speed values in the NPC templates; `THREAD_P_TYPE_GENERAL` default (Config.java 635); `L1PcMonitor`; the PC regen loops in L1PcInstance; subclass `searchTarget` overrides (the base is empty at 339-341). Confidence high on the wake-up chain and the speed scaling; medium on which branch sets which sleep, because `onTarget` was not read in full. camera_scope not applicable. Note: this is a per-creature wake-up chain, not one global server tick, and it has no netcode.

## 1. Mechanism

There is no global server tick here. Each NPC runs its own chain of one-shot scheduled tasks.

- Which AI runs: `startAI` (L1NpcInstance.java 155-166) uses the timer implementation when `NpcAIImplType` is 1, and the same for any value other than 2; type 2 runs one thread per NPC instead (the thread variant is `NpcAIThreadImpl`, 242-291: a loop that calls `AIProcess` then `Thread.sleep(getSleepTime())`, polling 200 ms while paralysed or asleep). The code fallback is 1 (Config.java 706-707), but the shipped `config/server.properties` line 32 sets `NpcAIImplType = 2`, so the shipped server runs thread-per-NPC. `startAI` also always allocates the thread object (156-157), even in timer mode.
- Start: `NpcAITimerImpl.start` marks the AI running and schedules the first pass at zero delay (195-198).
- One pass, `NpcAITimerImpl.run` (210-235), in order:
  1. If `notContinued()` holds (destroyed, dead, hp <= 0, or hidden; 238-239), call `stop()` and return (212-215).
  2. If a paralysis wake is pending, schedule one wake at that length, clear it and set paralysed to false (217-220).
  3. Else if paralysed or asleep, schedule a poll in 200 ms and return (222-224).
  4. Otherwise run `AIProcess()` (227). If it returns false, schedule the next pass after `getSleepTime()` (228). If it returns true, call `stop()` (231), which resets the mob skill use counts and starts a death-sync task (`stop` body near 200-203, read in the listing).
- The delay for the next pass is whatever the last action set. `AIProcess` sets 300 ms first, on every pass (293-294). Then:
  - the ground item it was heading for has gone: 1000 ms (321);
  - a flee step for an NPC with attack speed 0 (the branch at 427-441): `calcSleepTime(getPassispeed(), MOVE_SPEED)` (439); the general chase step lives in `onTarget`, which was not read;
  - a mob skill: `calcSleepTime(mobSkill.getSleepTime(), MAGIC_SPEED)` (444);
  - an attack: `calcSleepTime(getAtkspeed(), ATTACK_SPEED)` (566), and the same call at 553 when a counter barrier stops the attack first.
- `calcSleepTime` (2032-2052) scales the base delay: speed state 1 takes 25 percent off (2037), speed state 2 doubles it (2040), brave speed takes 25 percent off (2043-2044), and wind shackle adds 25 percent to attack and magic delays only (2046-2048). The donor applies the move-speed state to every action kind, attacks included, and truncates to int after each step (Java compound assignment).
- Scheduler: `GeneralThreadPool` (34-122) holds one scheduled pool of 10 threads (38) for NPC passes and their one-shot wakes (`schedule`, 88-98). A zero-delay schedule runs on the executor at once (90-91). A rejected schedule is swallowed and returns null (95-96). Player monitors use a second scheduled pool sized `1 + MAX_ONLINE_USERS / 20` (44), for example the exp monitor (`pcScheduleAtFixedRate`, L1PcInstance.java 1047).
- Timing: the next wake is armed after `AIProcess` returns (227-228), so the pass time adds to every cycle. Nothing subtracts it. This is a fixed-delay chain, not a fixed-rate one.

## 2. Key functions

- `NpcAITimerImpl.run`: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/Instance/L1NpcInstance.java` 210-235. The pass: liveness check, paralysis, AIProcess, re-arm or stop.
- `NpcAITimerImpl.start`: same file, 195-198. First pass at zero delay.
- `startAI`: same file, 155-166. Chooses timer or thread.
- `AIProcess`: same file, 293-335. Resets the sleep to 300, picks the target or item, returns stop or continue.
- `calcSleepTime`: same file, 2032-2052. Speed-state scaling of an action delay.
- `attackTarget`: same file, 484-568. The attack path ends by setting the attack sleep (566).
- `GeneralThreadPool.schedule` and `pcSchedule`: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/GeneralThreadPool.java` 88-98 and 106-115. Two schedulers.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Each creature re-arms its own next act from the length of the action it just took | theirs: default 300 ms (L1NpcInstance.java 294); item gone 1000 ms (321); paralysis poll 200 ms (222-224) |
| Speed state scales the delay: state 1 is 25 percent shorter, state 2 doubled | theirs: 2037, 2040 |
| Brave speed is 25 percent shorter; wind shackle is 25 percent longer for attack and magic only | theirs: 2044, 2048 |
| Shared scheduler for all NPC work | theirs: 10 threads (GeneralThreadPool.java 38) |
| Player monitors on their own scheduler, sized to online players | theirs: 1 + MAX_ONLINE_USERS / 20 (44) |
| Per-creature base delay (attack speed, move speed) | template values, not read |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order inside a pass (liveness check, paralysis poll, then the result of the decision decides the next delay) and the speed scaling with int truncation after each step. It replaces AIProcess with a result value (stop, wait, item gone, or act with a base delay), because the target search and `onTarget` body were not read. It omits the one-shot paralysis wake (`_paralysisTime`, with its `setParalyzed(false)`), the death-sync task, the thread implementation (type 2), the mob skill use counter, the zero-delay executor shortcut, and the rejected-schedule path. The monitor pool function is a helper with the same sizing rule, not a copy of the donor code.

```ts
// Licence: GPL-2.0 (donor). Clean-room shape only: written from the described mechanism; no donor line is copied.

type SpeedState = 0 | 1 | 2;   // 0 normal, 1 hasted, 2 slowed (the three states the donor's switch covers)
type ActionKind = 'move' | 'attack' | 'magic';

interface NpcSpeed { moveState: SpeedState; brave: boolean; windShackled: boolean; }

const DEFAULT_SLEEP_MS = 300;    // every pass starts by setting this
const ITEM_GONE_SLEEP_MS = 1000; // the ground item it was heading for has vanished
const PARALYSIS_POLL_MS = 200;   // while paralysed or asleep, poll this often

// Java int arithmetic truncates after each step, so truncate after each one here too.
function scaledSleepMs(baseMs: number, kind: ActionKind, s: NpcSpeed): number {
  let ms = baseMs;
  if (s.moveState === 1) ms = Math.trunc(ms - ms * 0.25);
  else if (s.moveState === 2) ms = Math.trunc(ms * 2);
  if (s.brave) ms = Math.trunc(ms - ms * 0.25);
  if (s.windShackled && (kind === 'attack' || kind === 'magic')) ms = Math.trunc(ms + ms * 0.25);
  return ms;
}

type PassResult =
  | { kind: 'stop' }                                      // AIProcess returned true: nothing to do or hidden
  | { kind: 'wait' }                                      // no action this pass: default sleep
  | { kind: 'item-gone' }                                 // target item vanished: idle sleep
  | { kind: 'act'; action: ActionKind; baseMs: number };  // move, attack or magic with a base delay

interface NpcState { dead: boolean; hidden: boolean; destroyed: boolean; paralysed: boolean; asleep: boolean; }

// Returns the delay until the next pass, or null to stop until something restarts the AI.
function nextWakeMs(npc: NpcState, result: PassResult, speed: NpcSpeed): number | null {
  if (npc.destroyed || npc.dead || npc.hidden) return null;
  if (npc.paralysed || npc.asleep) return PARALYSIS_POLL_MS;
  switch (result.kind) {
    case 'stop': return null;
    case 'wait': return DEFAULT_SLEEP_MS;
    case 'item-gone': return ITEM_GONE_SLEEP_MS;
    case 'act': return scaledSleepMs(result.baseMs, result.action, speed);
  }
}

// Helper pool sizing: one monitor thread per 20 online players, plus one (integer division).
function monitorPoolSize(maxOnlineUsers: number): number {
  return 1 + Math.trunc(maxOnlineUsers / 20);
}

export {};
```

## 5. Lands in

- TARGET `src/fight/tick.ts`: the server's fixed step owns the per-creature next-act time (a due-list the step reads), and the per-tick NPC budget bounds how many creatures act in one step.
- Parity-checklist row 18 (loot roll and XP award), sub-line "server tick: fixed step, input intake, per-tick NPC budget" (post-K item 3). The enemy cadence itself is row 2 (AI brain), but the timing sub-line is row 18.
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only: the sketch is written from the mechanism, and no donor line is copied)
- Brief rule served: 1 (one engine: one fixed step); MAX_ATTACKERS = 3 for the creatures that may act on one player; zones as data for the base delays per creature template.

## 6. Gaps and risks

- No per-tick budget. Every NPC pass competes for the same 10 threads (GeneralThreadPool.java 38, 94). A crowd delays every creature's wake-up together. Frankendom needs an explicit budget per fixed step (row 18 sub-line).
- Drift. The next wake is armed after the pass (227-228), so slow passes stretch every later cycle. Frankendom's fixed step should set due times from the step clock, not re-arm after work.
- Silent loss. A rejected schedule returns null and nothing re-arms that creature (95-96). The donor does not say when a rejection happens; I read it only as a swallowed exception (the usual cause would be shutdown, not verified here). The next act for that creature never happens. Frankendom must log a missing next-act and test for it.
- Zero-delay path. `schedule` with delay 0 calls `_executor.execute` directly (90-91). If `_executor` is null, which happens when the general thread type is neither 1 nor 2 (Config.java 635 default not read), that throws. Do not copy the executor split.
- Liveness on each pass: `notContinued` reads live hp, dead and hidden state (238-239). That is good: a pass checks the server state before acting. Frankendom must check the server ledger in the same way, so a killed creature cannot act after its death (server-verified kills).
- Attacker cap: nothing in the code read limits how many creatures attack one player. The base `searchTarget` is empty (339-341) and subclasses decide targets (not read). MAX_ATTACKERS = 3 must be an engine rule, not a side effect.
- Pit as client: NPC AI is server-side. The Pit must not run these wake-ups.
- Zones as data: 300, 1000 and 200 ms and the speed factors are engine constants. The per-creature base attack and move delays are template data (values not read).
- Thread variant (type 2): one thread per creature (NpcAIThreadImpl 242-291; and it is what the shipped config selects, `config/server.properties` 32). Do not use it for Frankendom.

Best transferable idea: Each creature keeps its own next-act time, set from the speed-scaled length of the action it just took (speed state, brave and wind-shackle modifiers), so cadence is per-creature data rather than one global tick.
Decision (proposed): adapt - the per-creature next-act time and the speed scaling fit enemy attack cadence in the fight, but the fight must run on one fixed step with a per-tick budget and a due-list (row 18), not a timer or thread per creature.
Acceptance: a server test in which an enemy with base attack 1000 ms acts again after 750 ms in speed state 1 and after 1250 ms under wind shackle, and in which no more than three enemies are scheduled to attack one player at once.


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** (1) NpcAIThreadImpl cited at L1NpcInstance.java 93-141; real class is at 242-291 (93-141 is field/servant-summon code). (2) 'default is 1 (Config.java 706-707)' is only the code fallback; the shipped config/server.properties:32 sets NpcAIImplType = 2, i.e. thread-per-NPC is what the shipped server runs. (3) Line 439 calcSleepTime(getPassispeed(), MOVE_SPEED) is the flee-step branch for NPCs with atkspeed==0 (427-441), not the general move/chase step (that is in onTarget, unread); described as 'a move step'. (4) calcSleepTime spans 2032-2052 not 2050. (5) paralysis-wake branch also calls setParalyzed(false) (220), omitted. Verified OK: run order 210-235, 300 ms/1000 ms/200 ms, 25 percent scaling, int truncation, pool 10 threads (38), pc pool 1+MAX_ONLINE_USERS/20 (44), schedule 88-98, null executor risk, GPL-2.0.

**Missed:** Shipped config uses thread impl (type 2) with Thread.sleep(getSleepTime()) loop at 253-290; startAI always allocates _aiThread (156-157) even for timer mode.
