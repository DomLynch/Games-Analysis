# vcmi-vcmi (quests-dialogue, cell 12)

Donor: /mnt/frankendom-donors/vcmi-vcmi/lib/mapObjects/Quest.cpp | Licence: GNU GPL version 2 (license.txt read: "Version 2, June 1991"; file headers read: "License: GNU General Public License v2.0 or later") | C++ | symbol SeerHut::onHeroVisit, SeerHut::offerNextQuest, QuestSource::advanceToNextQuest, Rewardable::Limiter::heroAllowed
Checked: opened Quest.cpp (1-141, 403-505, 692-823; 142-402 and 506-691 and 824-1087 not read, including SeerHut::init and initObj 556-630), Quest.h (21-100, plus grep for the rest), lib/rewardable/Limiter.cpp (80-175 and 236-275; 176-235 not read), server/activities/MapActivities.cpp (96-185 partly: 109-170 and 173-185), server/activities/Activity.cpp (143-195), license.txt (1-30). Callers: blockingDialogAnswered is called only from server/activities/MapActivities.cpp:177 (grep over server and lib). Other callers of SeerHut::newTurn and onHeroVisit not read. answerBlockingDialog, resumeAfterExperience and closeGarrisonDialog (base class, CRewardableObject) not read. Whether a setObjPropertyValue call applies synchronously before the rest of onHeroVisit runs: not read. Confidence: high on the requirement tree, queue and two-phase offer; medium on the server lock (read the dispatch, not every pack type). camera_scope: not applicable.

## 1. Mechanism

A seer hut hands out a queue of quests. Each quest is a requirement tree (the limiter), a cost taken on accept, and a reward. The hut's state moves in two phases: accepting marks the quest done and sets a pending flag, and the next quest is offered only after the whole reward (XP, level-up, garrison prompt) has finished.

Order of operations on a visit (SeerHut::onHeroVisit, Quest.cpp:731-772):
1. If the active quest is finished or expired (advancePending, or not available), request an advance (734-735). A new turn does the same (newTurn, 724-729): the seer skips expired quests without a visit.
2. First visit for this player: `firstVisit` is true while the player is not in `activeForPlayers` (741). The hut records the visit (746) and adds the quest to the player's log (747-748), then shows the intro text (753-755).
3. `failRequirements = !checkQuest(h)` (742). checkQuest calls the limiter (Quest.cpp:110-113, `mission.heroAllowed`).
4. If the requirements pass, the normal visit path proposes completion (757-759). If they fail, only the text is shown (751-756). The intro text therefore appears on first visit and again whenever requirements fail.

Order of operations on accept (blockingDialogAnswered, Quest.cpp:781-790):
1. If the answer is yes, takeRequirements removes the cost from the hero: artifacts (including disassembling an assembled artifact), creatures (with a full-army flag) and resources as a negative grant (Quest.cpp:115-141; cost calls at 139-140).
2. The object is marked complete for one-shot quests (786; setPropertyDer at 702-708 sets isCompleted for one-shot, clears activeForPlayers, and sets advancePending).
3. Then either a follow-up dialog handles the answer, or offerNextQuest runs (788-789).
4. The reward ends through one of three callers: the inline answer, experienceApplied (792-796), or garrisonDialogClosed (798-802). Each calls offerNextQuest only when nothing of the grant is still open (comment 804-806).

offerNextQuest (807-823) does four checks in order: no advance pending, stop (809-810); another offerable quest exists, otherwise stop (814-815; the comment at 812-813 says why: a hut whose only offer is repeatable must not re-offer on the same tile); the reward did not remove the hut (818-819); otherwise set the advance flag, then re-run the visit so the seer states the next quest (821-822).

The queue (QuestSource, Quest.cpp:423-471): a quest is available if its deadline has not passed (425: `lastDay` is inclusive), its difficulty is allowed (427-428), and it is not a finished one-shot (429-430). selectInitialQuest picks the first available quest (439-448). advanceToNextQuest walks the list circularly from the active index and stops at the first available quest (450-463); if none is available the index stays put (462).

Requirement tree (Limiter, lib/rewardable/Limiter.cpp:80-269): a flat set of leaf gates, all of which must pass: day-of-week and days passed (82-92), commander alive (94-98), creatures held (100-104), room to receive creatures (106-114), resources affordable (116-117), hero level (119-120), experience (122-123), mana and movement points (125-129, 134-138), skill levels primary and secondary (140-150), spells and scrolls (152-168), empty artifact slots (170-174), and difficulty (239-240). Then a composed part: noneOf must all fail (248-252), allOf must all pass (254-258), and anyOf is open when empty (260-261) or needs one pass (263-268).

Mission kinds (Quest.cpp:52-79): a table of 16 entries, each with a name and a predicate that classifies a quest. The comment at 60-61 says the last matching predicate wins. I did not trace where the classification is consumed, so I do not claim what it gates.

Server lock (server/activities/MapActivities.cpp:173-192; Activity.cpp:166-189): an open blocking dialog is an activity. While it is open, DialogActivity::blocksPack calls blockAllButReply (Activity.cpp:188), which blocks every pack except a QuestionAnswer from a player in the activity (169-172). acceptsAnswer checks the answer is in range (MapActivities.cpp:187-191), and only then is the object notified (177).

## 2. Key functions

- SeerHut::onHeroVisit (Quest.cpp:731): visit flow, first-visit record and intro, requirement check, completion offer.
- SeerHut::blockingDialogAnswered (Quest.cpp:781): accept flow, cost take, one-shot completion, next-quest hand-off.
- SeerHut::offerNextQuest (Quest.cpp:807): the hand-off after the reward has ended.
- QuestSource::advanceToNextQuest / isQuestAvailable (Quest.cpp:423-463): circular queue with deadline, difficulty and one-shot rules.
- Rewardable::Limiter::heroAllowed (Limiter.cpp:80): the requirement tree.
- Quest::takeRequirements (Quest.cpp:115): the cost on accept.
- BlockingDialogActivity::acceptsAnswer and notifyObjectAboutRemoval (MapActivities.cpp:177, 187).

## 3. Numbers vs mechanism

- `lastDay`: -1 means no limit; a quest is expired when currentDay > lastDay (Quest.cpp:425, with the header comment at Quest.h:54). Data field, per quest.
- Hero level gate: level must be at least `heroLevel` (Limiter.cpp:119). Data field, per quest.
- Experience gate: `heroExperience` must not exceed hero.exp (122). Data field, per quest.
- Primary skill gate: each primary skill must reach its threshold (142). Data field, per quest.
- Days passed: current day must reach `daysPassed` (88-91). Data field, per quest.
- Cost on accept: the resources given as a negative grant (140); creature counts and artifacts as listed in the mission (139, 119-121).
- Answer range: 0 to the component count when a selection dialog, else 0 or 1 (MapActivities.cpp:190-191). Engine rule.
- Expiry check runs once per new turn (newTurn 727) and again on each visit (734). Engine rule.

## 4. TypeScript sketch

simplified: clean-room shape, not a translation. Omits the calendar and difficulty objects (day and difficulty are plain fields), the artifact-assembly disassembly, the creature and resource checks inside the limiter (only a generic leaf test), the garrison and XP prompts (grantFinished stands in for them), the text, the server lock (the sketch range-checks the answer but does not block other packs), and the first-visit intro text. Fix applied: accept re-checks requirements before it takes the cost. It keeps: requirement tree with noneOf, allOf, anyOf order; deadline inclusive; one-shot versus repeatable; circular advance with the index staying put when nothing is offerable; cost taken on accept; the next quest offered only after grantFinished; the no-re-offer rule for a repeatable-only queue. Typecheck: `tsc --noEmit --strict --target es2020` on the VPS, exit 0.

```ts
// Seer-hut quest queue: requirement tree, deadline, one-shot or repeatable, two-phase completion.
// Clean-room shape only (vcmi is GPL): names and structure are our own.
type Hero = { level: number; xp: number; primary: number[]; artifacts: Set<string>; day: number };

type Req =
  | { kind: 'leaf'; test: (h: Hero) => boolean }
  | { kind: 'tree'; allOf?: Req[]; anyOf?: Req[]; noneOf?: Req[] };

// noneOf must all fail, allOf must all pass, anyOf is open when empty, else one must pass.
function allowed(r: Req, h: Hero): boolean {
  if (r.kind === 'leaf') return r.test(h);
  if (r.noneOf?.some(x => allowed(x, h))) return false;
  if (r.allOf?.some(x => !allowed(x, h))) return false;
  if (!r.anyOf || r.anyOf.length === 0) return true;
  return r.anyOf.some(x => allowed(x, h));
}

type Quest = {
  id: string;
  lastDay: number | null;       // inclusive deadline; null = no limit
  repeatable: boolean;
  done: boolean;
  difficultyOk: boolean;
  req: Req;
  cost: { resources: number; take: string[] };   // taken on accept
  reward: { xp: number };
  seenBy: Set<string>;
};
type Hut = { quests: Quest[]; index: number; advancePending: boolean };

const available = (q: Quest, day: number): boolean =>
  (q.lastDay === null || day <= q.lastDay) && q.difficultyOk && (q.repeatable || !q.done);

// Walk the list circularly from the active index; if nothing is offerable the index stays put.
function advance(hut: Hut, day: number): void {
  const n = hut.quests.length;
  for (let step = 1; step <= n; step++) {
    const idx = (hut.index + step) % n;
    if (available(hut.quests[idx], day)) { hut.index = idx; break; }
  }
  hut.advancePending = false;
}

// Visit: skip a finished or expired quest first, then say what is needed or offer completion.
function visit(hut: Hut, hero: Hero, playerId: string, day: number): 'empty' | 'show-requirements' | 'offer-completion' {
  if (hut.quests.length === 0) return 'empty';
  if (hut.advancePending || !available(hut.quests[hut.index], day)) advance(hut, day);
  const q = hut.quests[hut.index];
  q.seenBy.add(playerId);
  return allowed(q.req, hero) ? 'offer-completion' : 'show-requirements';
}

// Accept: re-check the requirements, then take the cost and mark done in the same step; the grant
// (XP) and the next quest come later. fix: the donor takes the cost without re-checking requirements.
function accept(hut: Hut, hero: Hero, answer: number, optionCount: number): boolean {
  if (answer < 0 || answer > optionCount) return false; // range-check the answer
  const q = hut.quests[hut.index];
  if (!allowed(q.req, hero)) return false;              // requirements can still be stale; check again
  for (const a of q.cost.take) hero.artifacts.delete(a);
  if (!q.repeatable) q.done = true;
  hut.advancePending = true;
  return true;
}

// Called once the grant (XP, level-up, garrison prompt) has fully ended; only then offer the next quest.
function grantFinished(hut: Hut, day: number): void {
  if (!hut.advancePending) return;
  if (!hut.quests.some((q, i) => i !== hut.index && available(q, day))) return; // no re-offer of a repeatable-only hut
  advance(hut, day);
}

export {};
```

## 5. Lands in

Target: origins/server/quest-offer.ts (proposed new file; not checked against the Frankendom repo). Parity row 18 (loot roll and XP award): the quest reward XP and the hand-off after the grant. Sub-line: the next quest is offered only after the grant has ended.

## 6. Gaps and risks

Against Frankendom's rulings (one ledger, server-verified, zones as data):
- Cost and completion are two separate server writes (Quest.cpp:785-786), not one ledger transaction. A failure between them can take the cost without marking the quest. Fix: put the cost, the done flag and the reward in one transaction (the pmbstyle shape in this cell).
- Requirements are not re-checked on accept. blockingDialogAnswered takes the cost without calling checkQuest (Quest.cpp:781-786). The donor relies on the modal lock (Activity.cpp:188). Fix: re-run the requirement check inside the accept transaction, so the lock is not the only guard.
- A cost stored in limiter state, with a FIXME (Quest.cpp:117). Fix: cost and reward are separate fields in the quest data.
- Legacy switch: MAP_OBJECTS_H3_BUG_QUEST_TAKES_ENTIRE_ARMY (Quest.cpp:777) makes the quest take the whole army. Do not port bug switches; if the mechanic is needed, write it as a rule.
- Ordering risk: onHeroVisit sets properties and then reads getQuest() in the same call (734-759). Whether the property is applied before the read is not read. Check before porting.
- Map-level quest data is stored per object (Quest.h, `activeForPlayers`); Frankendom zones-as-data would store the same per zone. Not a gap, a check: first-visit flags must be per player and per quest.
- UX idea, not a ruling: the first visit shows the intro text, and later visits show the requirements or the offer (Quest.cpp:741-756). Frankendom could show the quest once and then show only the status.
- Not read: the non-limiter gate in Limiter.cpp:176-235, SeerHut::init and initObj (556-630), the reward dialogs in CRewardableObject.

Reuse tag: adapt the queue (deadline, one-shot versus repeatable, circular advance, no re-offer on a repeatable-only queue), the requirement tree (noneOf, allOf, anyOf), and the hand-off after the grant. Keep the server-side range check on answers. Brief rule served: one ledger (cost and reward in one transaction, not two writes), server-verified (re-check on accept), zones as data (the queue and the requirements are per object data), and the grant ends before the next offer.

Best transferable idea: offer the next quest in a hut only after the reward (XP and level-up) has finished, and skip expired or one-shot quests on visit and on each new turn.
Decision (proposed): adapt - the queue and the two-phase hand-off fit our rulings, but the cost and completion must become one transaction and the accept must re-check requirements, which the donor does not do.
Acceptance: a player at a seer-style NPC accepts a quest, the XP and level-up panel closes, and only then is the next quest offered; a repeatable-only queue does not re-offer on the same tile; a server test asserts that an accept with a requirement that has gone stale is refused and the cost is not taken.
