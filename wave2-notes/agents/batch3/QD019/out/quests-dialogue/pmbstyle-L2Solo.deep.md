# pmbstyle-L2Solo (quests-dialogue, cell 12)

Donor: /mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Quest/QuestStep.js | Licence: Apache-2.0 (LICENSE read: "Version 2.0, January 2004"; adaptation permitted, keep notice) | JavaScript | symbol QuestStep.apply + Database.applyQuestStep
Checked: opened QuestStep.js (full), DeclarativeQuest.js (full, 396 lines), QuestRegistry.js (full), QuestState.js (full), QuestService.js (1-60, 142-183, 346-364; spawnQuestNpc, addRadar, giveItem, takeItem (not read)), Database.js (225-262, 4785-4845; applyPetQuestStep body (not read)), ProgressionCap.js (1-80), LowLevelDefinitions.js (1-60; rest (not read)), quests/Q163_LegacyOfThePoet.js (1-30). Callers: applyQuestStep has one caller (QuestStep.js:24, by grep over src). QuestStep.apply is called from DeclarativeQuest.js (read) and PetQuest.js (not read). ProgressionRates.profile() values (questExp, questSp, questAdena, expMul) not read. camera_scope: not applicable. Confidence: high on the hand-in transaction and the stage engine; medium on the exact rate values (not read). Scope note: the hint file QuestRegistry.js is the registration list, not the mechanism.

## 1. Mechanism

A quest hand-in (take items, give rewards, move the quest state, pay XP) is one database transaction with a compare-and-swap on the quest's state and variables. The JS layer proposes the step; the database decides whether it commits.

Order of operations, one hand-in:
1. DeclarativeQuest builds the step in JS: `takes`, `gives`, the next `variables` (the `cond` stage pointer, counters, once-reward receipt keys), and optional beginner/PK payloads (deliver: DeclarativeQuest.js:164-187; gather: 140-153; cashout: 94-139).
2. QuestStep.apply (QuestStep.js:7-55) drops zero-count takes (line 10), bumps a `revision` counter in the variables (line 12), turns each reward into stack rows (lines 13-18), and pre-computes `exp = round(exp * questExp * expMul)` and `sp = round(sp * questSp)` (lines 19-23). It then awaits Database.applyQuestStep with the expected state and variables and the proposed next state (lines 24-26).
3. Database.applyQuestStep (Database.js:4785-4845) runs inside `BEGIN IMMEDIATE` (Database.js:237) and rolls back on any throw (243). Inside, in this order: refuse a quest whose registry status is not active (4787); compare-and-swap the stored state and variables against `expected`, else throw "Quest step changed" (4790); re-count each take from the items table and throw if short (4793-4794), then delete or decrement stacks (4801-4802); write gives (4805-4810); upsert the quest row (4811); award XP through ProgressionCap.applyAward and set level and SP (4813-4822); compare-and-swap the beginner-shot counter (4826-4834); compare-and-swap PK for quest 422 only (4835-4842); return the changed rows and the committed numbers.
4. Only after the awaited commit does QuestStep update memory: state and variables (34-35), XP and level-up (36-45), beginner receipt and PK (46-51), the item list sent to the client (52), and item-received notices (53). A failed commit leaves memory unchanged.

The stage engine that feeds step 1 (DeclarativeQuest.js):
- Stage pointer: `stageFor` reads `cond` from the variables (53). Advancing a stage is a `cond` write inside the same step as the item change (e.g. gather 149-150, drop 382-384).
- Kill drops (onKill, 299-386): a stage's drop rule may be `cascade` (each tier rolls independently, first success wins; 318-332), `items` (several independent tokens, each with its own chance and cap; 335-351), or `outcomes` (one cumulative roll; 353-358). Every token is capped (359-360 and 366) and completion is checked against all objectives in the same step (368-370). Transforms can convert N tokens into one item (372-381).
- Once-reward receipts: a stage with `onceReward` pays only if the variable `reward:<key>` is unset (deliver, 175-178). A repeatable quest pays the beginner reward at most once (90-91).
- Abort (387-392) clears the variables except the reward receipts, `completions` and `cashouts`, and deletes the quest's own items (391). The cond pointer resets, so the stage starts again.
- Identity gate (46-49) is level, race and class; the prerequisite gate (50) is any of `requiredAny` items. NPC speech that refuses the quest is built from these gates (248-252).

Session layer (QuestService.js): every talk, event and kill runs through `mutate` (28-33), a per-session promise chain, so two transitions for one character do not interleave (comment at 25-27). onEvent (163-183) accepts an event only when the NPC the player is talking to is permitted to fire it (169-174); the client cannot fire another NPC's bypass event. onKill (346-363) ignores kills of another player's quest spawn (350-351).

Parked quests: QuestRegistry.js lists every quest with a status. 16 quests carry a `disabledReasons` text (lines 1-18, e.g. line 12: quest 32 needs NPC template 8706 and kill target 135 with a world spawn). `activeQuests` loads only status active (141-143), and the database refuses writes for any non-active id (Database.js:4787). A parked quest is therefore both not loaded and not writable.

Data: LowLevelDefinitions.js holds quests as plain object literals: ids, minLevel, startNpc, stages, exchanges, rewards, drops with per-outcome chances. Cumulative percent thresholds are turned into per-outcome chances (line 22). Example: quest 325 (Grim Collector), line 16, NPC 26 with thresholds 30/50/75 becomes chances 0.30, 0.20 and 0.25, with the remaining 0.25 meaning no drop (arithmetic from the formula on line 22).

## 2. Key functions

- QuestStep.apply (QuestStep.js:7): builds the step and commits it; the only writer of hand-in state for declarative quests. Callers: DeclarativeQuest.js (read); PetQuest.js (not read).
- Database.applyQuestStep (Database.js:4785): the ledger. One transaction for items, quest row, XP, beginner receipt, PK. Caller: QuestStep.js:24 only.
- DeclarativeQuest.create (DeclarativeQuest.js:32): closes over the definition; returns onTalk, onEvent, onKill, onAbort. onKill (299) and deliver (164) are the main step producers.
- QuestService.mutate (QuestService.js:28): per-session serial queue around every quest entry point.
- ProgressionCap.applyAward (ProgressionCap.js:69-80): clamps total XP to the level-cap boundary and reports the part actually granted.

## 3. Numbers vs mechanism

- Drop cap: `drop.cap`, else the matching objective count, else Infinity (DeclarativeQuest.js:359). Checked before the roll (360) and used to clip the amount (366). Data field, per drop.
- Drop chances: per-outcome chance = (this cumulative percent - previous cumulative percent) / 100 (LowLevelDefinitions.js:22). Roll: one Math.random, subtract outcome chances in order, first negative wins (DeclarativeQuest.js:354-355). Worked example: quest 325, NPC 26 (line 16): 0.30, 0.20, 0.25, and 0.25 for no drop.
- Chance gate for single-chance drops: `Math.random() >= drop.chance` returns (360). The donor's own quest data sets chance:1 for outcome drops, so the roll is the outcome table.
- Bonus threshold: a bonus pays when `sold(bonus.items) >= bonus.at` (DeclarativeQuest.js:110); a stage's bonus adena pays when `total >= stage.bonusAt` (100). Data fields, per quest.
- Adena from rewards: `floor(adena * ProgressionRates.questAdena)` (72; the rate is not read).
- XP: requested exp is multiplied by `questExp` and `expMul` in JS (QuestStep.js:21, rates not read), then clamped in the database to `experience[levelCap] - 1` (ProgressionCap.js:62, 72). `levelCap = min(maxLevel, contentCap)` (40-42, read). C4 hard ceiling 78 (ProgressionCap.js:3, read). Granted amount = total minus min(current, total) (73).
- Revision counter: +1 per step (QuestStep.js:12), stored with the variables. The CAS compares the whole variables JSON, not the counter (Database.js:4790).

## 4. TypeScript sketch

simplified: treats every item as stackable (the donor reads the item template), drops the equipped filter, the SQL, the beginner-shot and PK receipts, the level-up call and the expMul multiplier (the caller pre-multiplies); the compare-and-swap uses state and revision only (fix, see comment in the code). Keeps: compare-and-swap first, takes before gives, quest row in the same commit, exp clamp with the granted amount reported, swap only on success. Typecheck: `tsc --noEmit --strict --target es2020` on the VPS, exit 0.

```ts
// Quest hand-in as one ledger transaction (shape of pmbstyle QuestStep.apply + Database.applyQuestStep).
type Stack = { id: number; selfId: number; amount: number };
type QuestRow = { state: string; variables: Record<string, string> };
type Ledger = { stacks: Stack[]; quests: Map<number, QuestRow>; exp: number; nextId: number };
type Hand = {
  questId: number;
  expected: QuestRow;            // the state the client last saw; the commit refuses if it moved
  next: QuestRow;                // proposed state; revision is bumped here
  takes: [number, number][];     // [selfId, amount]
  gives: [number, number][];     // [selfId, amount]
  exp: number;                   // already rate-multiplied before the commit
  expCap: number;                // data: highest total exp the level allows
};
type Outcome = { ok: true; grantedExp: number } | { ok: false; reason: string };

const cloneRow = (r: QuestRow): QuestRow => ({ state: r.state, variables: { ...r.variables } });
// fix: compare state and the revision counter only (the donor compares the whole variables JSON,
// which breaks on key order or any extra key).
const revisionOf = (r: QuestRow): string => r.variables['revision'] ?? '0';
const sameRow = (a: QuestRow, b: QuestRow): boolean =>
  a.state === b.state && revisionOf(a) === revisionOf(b);

export function applyHand(ledger: Ledger, hand: Hand): Outcome {
  const work: Ledger = {
    stacks: ledger.stacks.map(s => ({ ...s })),
    quests: new Map([...ledger.quests].map(([k, v]) => [k, cloneRow(v)] as [number, QuestRow])),
    exp: ledger.exp,
    nextId: ledger.nextId,
  };
  const current = work.quests.get(hand.questId) ?? { state: 'created', variables: {} };
  if (!sameRow(current, hand.expected)) return { ok: false, reason: 'Quest step changed' };

  for (const [selfId, amount] of hand.takes) {
    if (amount < 1) continue; // a zero count is a no-op
    const held = work.stacks.filter(s => s.selfId === selfId).sort((a, b) => a.id - b.id);
    if (held.reduce((n, s) => n + s.amount, 0) < amount) return { ok: false, reason: 'Required quest items missing' };
    let left = amount;
    for (const s of held) {
      const used = Math.min(left, s.amount);
      if (!used) break;
      left -= used;
      s.amount -= used;
    }
    work.stacks = work.stacks.filter(s => s.amount > 0);
  }

  for (const [selfId, amount] of hand.gives) {
    const stack = work.stacks.find(s => s.selfId === selfId);
    if (stack) stack.amount += amount;
    else work.stacks.push({ id: work.nextId++, selfId, amount });
  }

  const revision = String(Number(current.variables['revision'] ?? '0') + 1);
  work.quests.set(hand.questId, { state: hand.next.state, variables: { ...hand.next.variables, revision } });

  const total = Math.max(0, Math.min(work.exp + Math.max(0, hand.exp), hand.expCap));
  const granted = total - Math.min(work.exp, total);
  work.exp = total;

  // commit: the in-memory ledger is replaced only after every write above succeeded
  Object.assign(ledger, work);
  return { ok: true, grantedExp: granted };
}
export {};
```

## 5. Lands in

Target: origins/server/quest-step.ts (proposed new file; not checked against the Frankendom repo). Parity row 18 (loot roll and XP award): the quest reward and XP commit. Sub-line: hand-in reward and XP commit in one ledger transaction. Acceptance is in the Decision line below.

## 6. Gaps and risks

Against Frankendom's rulings (one engine, zones as data, server-verified kills, one ledger, one character):
- Two write paths. Declarative quests commit through the compare-and-swap step. Hand-written quests write through QuestState.save with no compare-and-swap (QuestState.js:56-63), and Q163 writes state then cond in two calls (Q163 lines 24-25). Under "one ledger" the hand-written path must go through the same transaction, or be rewritten as data.
- Parallel copy: applyPetQuestStep (Database.js:4846) repeats the same transaction shape for pet quests. Keep one function.
- Dialogue is HTML strings with bypass links (DeclarativeQuest.js:3 and the `page()` calls). Frankendom dialogue should be data with server-validated choice ids; the server already validates the NPC for each event (QuestService.js:169-174), which is the part to keep.
- The CAS compares whole variables as JSON (Database.js:4790). Key order changes or any extra key break it. Fix (applied in the sketch): compare state and the revision counter (written at QuestStep.js:12). Stringified comparison also risks false "Quest step changed" errors.
- Stale comment: QuestStep.js:8-9 says a zero count means "consume whatever the character holds"; the code makes it a no-op (line 10). Fix the comment when adapting.
- Parked quests are kept as code with a reason string (QuestRegistry.js:1-18). Frankendom should keep parked flag and reason as zone or quest data, with the same server refusal.
- Item lookup is a linear scan of the item cache per reward (QuestStep.js:14). Fix: index by selfId at load.
- A data gap is recorded in code: the pinned datapack has no spawn for a reference target (LowLevelDefinitions.js:33-36). Frankendom should have a validator that fails on a target with no spawn.
- Not read: ProgressionRates values, the pet quest body, most QuestService helpers.

Reuse tag: adopt the one-transaction hand-in with a revision compare-and-swap (the rest of the donor is reference only). Brief rule served: one ledger (items, quest row, XP, receipts in one commit), server-verified (the database recounts takes and refuses inactive quests), zones and quests as data (LowLevelDefinitions), parked entries refused server-side.

Best transferable idea: commit a whole quest hand-in (takes, gives, state, XP) as one compare-and-swap ledger transaction, and update the in-memory state only after the commit succeeds.
Decision (proposed): adapt - the idea (one all-or-nothing ledger commit for a quest hand-in) is right and is the only mechanism in this cell that does it; the donor's whole-JSON compare is fixed in the sketch (revision only), and the stale comment and the linear item lookup are cut from our version.
Acceptance: a server test where a hand-in whose XP or reward write throws leaves items, quest state and XP unchanged, and a second hand-in with a stale expected state is refused with "Quest step changed".
