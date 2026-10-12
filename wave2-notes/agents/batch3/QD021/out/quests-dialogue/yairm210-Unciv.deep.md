# yairm210-Unciv (quests-dialogue, cell 12)

Donor: /mnt/frankendom-donors/yairm210-Unciv/core/src/com/unciv/logic/civilization/managers/quests/QuestManager.kt | Licence: Mozilla Public License Version 2.0 (MPL-2.0, read from /mnt/frankendom-donors/yairm210-Unciv/LICENSE header) | Kotlin | symbol QuestManager

Checked: opened whole files QuestManager.kt (674 lines), QuestImplementation.kt (248), AssignedQuest.kt (116), QuestTargetHelpers.kt (163), models/ruleset/Quest.kt (78), models/ruleset/Event.kt (65). Partly read: DiplomacyManager.kt 168 and 448-469; CityStateFunctions.kt 196-225 and 600-640; UniqueTriggerActivation.kt 116-140; GameContext.kt 80-92. Callers read: UnitManager.kt:75, TurnManager.kt:290-291, TileImprovementFunctions.kt:220-230; grep only: Battle.kt:336 and MapUnit.kt:1099. Not read: the diplomacy UI screens, the DiplomacyFlags expiry code (the 20-turn "Bullied" memory is taken from the comment at QuestTargetHelpers.kt:157 and the set call at CityStateFunctions.kt:633; flag decay not read), the speed modifier values, and the hashOf helper. Dialogue half: no dialogue-tree or NPC-conversation system found (case-insensitive grep for "dialog" in core returned tutorial, map-editor, file-chooser and UI hits only); the nearest thing is the Event choice system in Event.kt (read whole, see section 2). Confidence: high on the quest state machine (read end to end, callers checked); medium on the Event part (read, not traced to the UI). camera_scope: not a camera cell.

## 1. Mechanism

A city state (the quest giver, `civ`) holds one flat list `assignedQuests` of records (questName, assigner, assignee, assignedOnTurn, data1, data2) plus countdowns (QuestManager.kt:120-143, 26 onward). QuestManager.endTurn runs only for city states (TurnManager.kt:290-291). Order inside endTurn: seed countdowns (QM 189-227), decrement countdowns (QM 180-186, floor 0), handleGlobalQuests (QM 298-313), handleIndividualQuests (QM 145-147), tryStartNewGlobalQuest (QM 233), tryStartNewIndividualQuests (QM 256), barbarian notice, war-with-major bookkeeping.

Two completion paths, both present in the donor:
- Polled: handleIndividualQuest (QM ~318-340) checks, in this order: assignee still valid (QM 321), isComplete then pay (QM 324-325), isObsolete then notify and drop (QM 329), isExpired then notify and drop (QM 334). Polled kinds: Route, ConstructWonder, ConnectResource, GreatPerson, FindPlayer, FindNaturalWonder, PledgeToProtect, DenounceCiv, SpreadReligion (QuestImplementation.kt:65, 89, 102-106, 114-118, 137-140, 150-151, 168-169, 224-226, 245-246). The poll also runs when a great person is born (UnitManager.kt:75).
- Pushed: the engine calls the quest manager directly: barbarianCampCleared (QM 511), cityStateConquered (QM 525), cityStateBullied (QM 538), receivedGoldGift (QM 649), militaryUnitKilledBy (QM 584). Each pays the matching quests and removes them (for example QM 519 and 532 and 545 and 656 remove the matched list after giveReward). The matching quest kinds say so in their KDoc: ClearBarbarianCamp (QuestImplementation.kt:78-79), ConquerCityState (126-127), BullyCityState (207-208), GiveGold (159-160). Contest quests (ContestCulture, ContestFaith, ContestTech) and Invest are completed only by expiry (QuestImplementation.kt:175-176, 184-185, 191-192, 198-199).

Global quests: at most one active (QM 236). When the global countdown hits 0, a weighted random quest is picked among those valid for at least `minimumCivs` civs (QM 233-251). Contest quests keep a score per assignee: current total minus the total stored at assignment (QM 425-428). At expiry (handleGlobalQuests QM 298-313) the winners are paid (QM 309) and all other records for that quest name are dropped; a score of zero or less never wins and is not listed as a loser (QM 454). Previous leaders are moved to losers when a higher score appears (QM 460).

Rewards: every quest payment goes through giveReward (QM 396-405): DiplomacyManager.addInfluence (QM 400, DM 448-450), which calls setInfluence (DM 461-464), which clamps to a floor of -60 (DM 168, DM 462). That is the one ledger for quest rewards. The gold gift path (CityStateFunctions.kt:216-221) computes its own influence from the gift and then calls receivedGoldGift to complete a GiveGold quest.

Determinism: quest picks use civ.state.stateBasedRandom("QuestManager") (QTH 18), and per-challenger draws use the diplomacy state (QTH 20-23). stateBasedRandom builds a Random from a hash of the caller name, a seed and the state hash (GameContext.kt:90-91). The same state gives the same draw, so no message is needed to agree on the pick. The donor comment says why (QTH 16).

Event side (Event.kt, UniqueTriggerActivation.kt): an Event has a Presentation enum of None, Alert and Floating (Event.kt:14-21). Its field is `val presentation = Presentation.Alert` (Event.kt:22, a val fixed in code; whether ruleset JSON can override it was not checked). For AI civs, or when presentation is None, a choice is picked by weighted random (UniqueTriggerActivation.kt:124-126). For Alert, a PopupAlert is queued for a blocking modal (UTA 128-132). Floating throws NotImplementedError (UTA 136); the intended "park it in a queue" is a todo comment (UTA 135).

## 2. Key functions

- QuestManager.endTurn (QM 120-143): the per-turn order above.
- handleIndividualQuest (QM 319-340): the poll for one record; complete, obsolete, expired.
- tryStartNewGlobalQuest (QM 233-251) and tryStartNewIndividualQuests (QM 256-~275): the caps and the countdown gate.
- handleGlobalQuest (QM 307-313): winners paid (309), everyone for that name removed (312).
- assignNewQuest (QM 342-~362): data1/data2 from the quest kind (346), add (358), notify the assignee.
- giveReward (QM 396-405): the one ledger (400), notice only when positive (401).
- WinnersAndLosers (QM 442-~470): the contest ranking, with zero scores excluded (454).
- cityStateBullied (QM 538-~556): pays and removes bully quests, then revokes individual quests and Invest quests from the bully (554).
- wasAttackedBy (QM 560-~572) and militaryUnitKilledBy (QM 584-~604): war-with-major pseudo-quest, units to kill (563), reward 100 (600).
- QuestImplementation (QI 49-248): one class per QuestName, each with isValid, getAssignedQuestData, isComplete, isObsolete.
- AssignedQuest: isExpired (AQ 78), getDuration (AQ 80), getRemainingTurns (AQ 81).
- QuestTargetHelpers: getRandom (QTH 18-23), getCityStateTarget (QTH 141-154), getMostRecentBully (QTH 159-162).
- Event.getMatchingChoices (Event.kt:35-42) and UniqueTriggerActivation TriggerEvent branch (UTA 119-136).

## 3. Numbers vs mechanism

- First global quest countdown: turn 30 gives random 0-19 turns (QM 31, RAND 20). Later: 40 + random 0-24 (QM 37, 40). The result is multiplied by the game speed modifier and truncated (QM 203).
- First individual countdown: turn 30 gives random 0-19; later 20 + random 0-24 (QM 38, 40); speed-scaled (QM 227). These per-challenger countdowns are seeded per challenger (QM 216-228, "seedIndividualQuestCooldown").
- Caps: 1 active global (QM 43, 236); 2 active individual per challenger (QM 44, 263). One quest name per challenger (QM 378).
- Reward default influence 40 (Quest.kt:61); duration default 0 = no limit (Quest.kt:64); minimumCivs default 1 (Quest.kt:68).
- Expiry: duration scaled by speed (AQ 80), remaining = assignedOnTurn + scaled duration - turn, floored at 0 (AQ 81); expired at 0 (AQ 78).
- Route: a city within 7 aerial tiles of the capital is valid (QI 62); complete when the assignee's capital is connected (QI 66).
- Camp search: encampments within 8 tiles of the capital (QTH 32).
- War-with-major: units to kill = max(military units / 4, 3) (QM 563); reward 100 influence on completion (QM 600, hardcoded).
- Bullied memory: 20 turns set at CityStateFunctions.kt:633; individual quests are blocked while set (QM 380).
- Influence floor -60 (DM 168).
- Gift to influence: gift^1.01 / 9.8 (CSF 199), rounded down to steps of 5 (CSF 211); the floor of 5 is on the line after it (read, not receipted).
- Events: AI weights and the "first match only" unique (Event.kt:39-40).

## 4. TypeScript sketch

simplified: a generic two-path quest board. It omits the 30-quest-kind table, seeded per-civ random picks, the personality weights, the target helpers, notifications with map locations, speed-scaled countdowns (ticks here), the contest score storage (startScore is passed in) and the Event side. It reorders the donor's pay-then-remove into remove-then-pay so a second path finds nothing to pay (exactly once), and it changes the donor's silent zero-score contest drop into a loser notice. Tie winners each still get the full reward, as in the donor (QM 309).
```ts
// Quest board sketch: shape of yairm210-Unciv QuestManager (MPL-2.0, clean-room shape only, no line-by-line translation)
export type QuestKind = "individual" | "global";

export interface QuestDef {
  name: string;
  kind: QuestKind;
  reward: number;        // one ledger amount, zone data
  durationTicks: number; // 0 = no time limit
}

export interface AssignedQuest {
  id: number;
  def: QuestDef;
  assignee: string;
  assignedTick: number;
  data1: string;
  data2: string;
}

export interface Ledger { credit(playerId: string, amount: number, reason: string): void; }
export interface Notifier { notify(playerId: string, text: string): void; }

export const MAX_ACTIVE_GLOBAL = 1;
export const MAX_ACTIVE_INDIVIDUAL_PER_PLAYER = 2;

export class QuestBoard {
  private nextId = 1;
  private active: AssignedQuest[] = [];

  constructor(
    private readonly ledger: Ledger,
    private readonly notifier: Notifier,
    private readonly tick: () => number,
  ) {}

  assign(def: QuestDef, assignee: string, data1 = "", data2 = ""): AssignedQuest | null {
    if (def.kind === "global" && this.active.filter(q => q.def.kind === "global").length >= MAX_ACTIVE_GLOBAL) return null;
    if (def.kind === "individual" && this.active.filter(q => q.def.kind === "individual" && q.assignee === assignee).length >= MAX_ACTIVE_INDIVIDUAL_PER_PLAYER) return null;
    const q: AssignedQuest = { id: this.nextId++, def, assignee, assignedTick: this.tick(), data1, data2 };
    this.active.push(q);
    this.notifier.notify(assignee, `New quest: ${def.name}`);
    return q;
  }

  // Pushed path: the engine calls this on the event itself (for example a server-verified kill).
  onEvent(matches: (q: AssignedQuest) => boolean): void {
    for (const q of [...this.active]) if (matches(q)) this.complete(q);
  }

  // Polled path: called once per fixed server tick, or on a relevant state change.
  pollTick(isComplete: (q: AssignedQuest) => boolean, isObsolete: (q: AssignedQuest) => boolean): void {
    for (const q of [...this.active]) {
      if (isComplete(q)) { this.complete(q); continue; }
      if (isObsolete(q)) { this.end(q, "no longer needed"); continue; }
      if (q.def.durationTicks > 0 && this.tick() - q.assignedTick >= q.def.durationTicks) this.end(q, "expired");
    }
  }

  // Exactly-once: remove first, pay only if this call did the removal.
  private complete(q: AssignedQuest): void {
    if (!this.remove(q)) return;
    this.ledger.credit(q.assignee, q.def.reward, `quest:${q.def.name}`);
    this.notifier.notify(q.assignee, `Quest complete: ${q.def.name}`);
  }

  private end(q: AssignedQuest, why: string): void {
    if (this.remove(q)) this.notifier.notify(q.assignee, `Quest ended (${why}): ${q.def.name}`);
  }

  private remove(q: AssignedQuest): boolean {
    const i = this.active.indexOf(q);
    if (i < 0) return false;
    this.active.splice(i, 1);
    return true;
  }

  get count(): number { return this.active.length; }
}

export interface ContestEntry { playerId: string; startScore: number; nowScore: number; }

// Donor rule kept: a score must be above zero to win. Fix: zero or negative scorers are losers and get a notice.
export function resolveContest(entries: ContestEntry[]): { winners: string[]; losers: string[] } {
  const scored = entries.map(e => ({ playerId: e.playerId, score: e.nowScore - e.startScore }));
  const positive = scored.filter(s => s.score > 0);
  if (positive.length === 0) return { winners: [], losers: scored.map(s => s.playerId) };
  const top = Math.max(...positive.map(s => s.score));
  const winners = positive.filter(s => s.score === top).map(s => s.playerId);
  const losers = scored.map(s => s.playerId).filter(id => !winners.includes(id));
  return { winners, losers };
}

export {};
```

Typecheck: copied to the VPS and run as `npx -p typescript tsc --noEmit --strict --target es2020` on /tmp/QD021-quests-sketch.ts, exit 0.

## 5. Lands in

Target file: origins/server/quests.ts (new, proposed; not in the repo and not checked there). Parity row 18 (loot roll and XP award): quest rewards go through the one ledger, and kill-credit quests read the server-verified kill. Sub-line: server tick: fixed step, input intake, per-tick NPC budget (the pollTick runs once per fixed tick, not per frame).

## 6. Gaps and risks

- One engine: the donor keeps quest state on the civ object and reads it from managers. Frankendom's quest list must live in the engine, and the client only renders it.
- Zones as data: the donor needs a Kotlin class per quest kind (QuestImplementation.kt:49-248). For zones, the reward, duration, caps and waits are data (see the JSON), but the predicate kinds (kill, connect, bully) stay engine code. A zone can pick kinds; it cannot define new ones.
- Server-verified kills: the donor's war quest trusts the caller (militaryUnitKilledBy, Battle.kt:336, grep only). In Frankendom the pushed kill event must come from the server's verified kill, never from a client report.
- One ledger: the donor pays on both paths and relies on removal to stop a double pay (QM 519-545). The sketch makes that explicit (remove, then credit), and the acceptance test asserts it.
- Pit as client: quests must not fire from Pit fights. Only zone-world kills and encounters count.
- MAX_ATTACKERS = 3: the donor counts every military kill from the assigned attacker (QM 584-604). In Frankendom a kill quest counts only engaged enemies; the cap of three attackers applies to engagement, not to credit.
- Turns vs ticks: donor countdowns and expiry are turn counts (AQ 80-81). Frankendom uses the server tick, so durations and waits must be ticks or seconds.
- Donor defects, each with a fix (idea kept):
  1. Zero-score contest entrants are dropped silently (QM 454 and QM 312). Fix: notify them as losers (sketch resolveContest).
  2. Global quests whose assignee becomes invalid are dropped with no notice (QM 300-301). Fix: notify.
  3. The war-with-major reward is hardcoded to 100 with a "yikes" comment (QM 600). Fix: a quest data field.
  4. Individual completion is checked only at turn end (QM 136) and on great-person birth (UM 75), so a quest can complete and pay up to a turn late. Fix: pushed events (sketch onEvent) for kill and capture kinds.
  5. Event Floating is a todo that throws (UTA 135-136). Fix: implement the parked queue the todo describes, so a non-blocking choice waits in a queue instead of throwing.
  6. Event presentation is a val fixed to Alert (Event.kt:22). Fix: make it data-driven.
  7. Tied contest winners each get the full reward (QM 309). This is a design choice, not a crash; decide split or full before porting.

Reuse tag: donor-idea (MPL-2.0, shape only; no code copied; sketch is original).

Brief rule served: donor-first (reuse-first; one ledger; server-verified kills; zones as data; poll-or-push completion with exactly-once payment).

Best transferable idea: Keep one flat list of quest records per assignee, complete each one by either a pushed engine event or a per-tick poll, and pay every reward through a single credit call that removes the record first so it can only pay once.

Decision (proposed): adapt - the record, the two completion paths, the caps and the single reward path fit Frankendom bounty and zone quests; the diplomacy rewards (influence, bully, gift) and the turn countdowns do not, so the shape is kept and the units become server ticks.

Acceptance: a player who kills the third camp raider sees "Quest complete" once and the reward appears once in the one ledger; a server test asserts that the kill push and the tick poll on the same tick credit the reward exactly once and that a second active global quest is refused while one is running.
