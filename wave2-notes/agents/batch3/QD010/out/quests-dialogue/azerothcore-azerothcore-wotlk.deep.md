# azerothcore-azerothcore-wotlk (quests-dialogue, cell 12)
Donor: /mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Entities/Player/PlayerQuest.cpp | Licence: GNU GPL version 2 (LICENSE lines 1-2: "GNU GENERAL PUBLIC LICENSE", "Version 2, June 1991"); copyleft, clean-room, shape only | C++ | symbol Player::CanCompleteQuest, Player::KilledMonsterCredit, Player::TalkedToCreature, Player::CompleteQuest, Player::RewardQuest, Quest::XPValue
Checked: opened PlayerQuest.cpp 291-367 (CanCompleteQuest, whole), 611-657 (CompleteQuest), 675-905 (RewardQuest, whole), 1475-1487, 1989-2068 (KilledMonster, KilledMonsterCredit, whole), 2186-2244 (TalkedToCreature, whole); QuestDef.cpp 199-234 (XPValue, whole), 275-277; QuestDef.h 35, 98-108; KillRewarder.cpp 199-208; PlayerGossip.cpp 32-100 (menu builder and option filter; the send and select handlers not read); NPCHandler.cpp 175-192; npc_innkeeper.cpp:58 (grep only); quest_template.sql 23-119 (columns read by grep, not whole). Hint file e2e/suites/quests/summons/serpent_statue_e2e_test.go read lines 1-25 only: an e2e test, not the mechanism. Other objective paths (KilledPlayerCredit, KillCreditGO, item, money, reputation at PlayerQuest.cpp 2087-2330) were grepped and their first lines read, bodies not read; the callers of CanCompleteQuest at 1938, 2173, 2264, 2296, 2324 are not read. Confidence: high on objectives, completion and reward order; medium on dialogue (only the gossip option filter was read). Camera scope: not applicable.

## 1. Mechanism
One ledger: each player has a map from quest id to a status record (Status plus per-objective counters CreatureOrGOCount[4]). The quest log holds the active quest ids. Every world event that can satisfy an objective runs the same loop: scan the log, skip quests that are not INCOMPLETE, look for an objective whose target matches, add one to its counter if below the required count, and then ask CanCompleteQuest. If that returns true, CompleteQuest runs and sets the status to COMPLETE. The reward is a separate step (RewardQuest), taken at turn-in or immediately for tracking-flag quests. Kill credit (KillRewarder -> KilledMonster -> KilledMonsterCredit) is the main path, and TalkedToCreature is the speak-to path. Order of a kill: group/raid gate, script veto hook, first matching objective, counter capped at the required count, completion check, completion. Order of a reward (RewardQuest): consume required and source items, choice and fixed reward items (bag overflow goes to mail), reputation, leave the log, mark rewarded, XP (zero on a repeat grant), money (at max level money replaces XP), honor, title, talents, arena points, reward mail, daily/weekly status, remove from log, set rewarded, send, spells, achievements, save, update, OnPlayerCompleteQuest.

## 2. Key functions
- Player::CanCompleteQuest (PlayerQuest.cpp:291-367): returns false when the quest is already rewarded and neither repeatable nor seasonal (line 300); auto-complete quests pass if they can be taken; otherwise the status must be INCOMPLETE (line 319) and every counted objective must have reached its count (line 337), plus item (DELIVER), explored/event, timer, money and reputation gates.
- Player::KilledMonsterCredit (PlayerQuest.cpp:2001-2068): credits one kill. It loops the log; for INCOMPLETE quests passing the group gate (line 2027) it calls the veto hook (line 2030); it finds the first objective whose required entry equals the killed entry; it adds one only if the count is below required (lines 2047-2049); it then calls CanCompleteQuest and CompleteQuest (lines 2055-2056). The comment at line 2060 says a target cannot fill two objectives of one quest, and the code leaves the loop with break.
- Player::TalkedToCreature (PlayerQuest.cpp:2186-2244): the same loop for speak-to objectives. It increments the counter (line 2225) and completes the quest the same way, but the inner loop ends with continue (line 2237), not break, so one talk can add to two objectives of one quest that target the same NPC. This contradicts its own comment at line 2236. Its only handler call is commented out (NPCHandler.cpp:190); the live callers are per-NPC scripts such as npc_innkeeper.cpp:58.
- Player::CompleteQuest (PlayerQuest.cpp:611-640): a hook may veto (line 618); sets COMPLETE (line 623); if the quest carries the tracking flag it calls RewardQuest at once (lines 632-637); marks save.
- Player::RewardQuest (PlayerQuest.cpp:675-905): see section 1 for order. Items that do not fit are added to a problematic list and sent by mail (lines 742, 750). The XP is zero for an already-rewarded quest that is not a daily, weekly or monthly reset (lines 759, 762).
- Quest::XPValue (QuestDef.cpp:199-237): the level-gap XP curve (section 3).

## 3. Numbers vs mechanism
- Objectives per quest: 4 (QuestDef.h:35). Each kill or talk adds exactly 1 to the matching counter (PlayerQuest.cpp:2049, 2225); the counter stops at the required count (line 2047).
- Quest XP factor: diffFactor = 2 * (quest_level - player_level) + 20, clamped to 1..10 (QuestDef.cpp:208-216). Read as a curve over d = quest_level - player_level: factor 10 (100%) for d >= -5; d = -6 gives 8 (80%), -7 gives 6 (60%), -8 gives 4 (40%), -9 gives 2 (20%), and d <= -10 gives the floor of 1 (10%).
- XP = floor(factor * Exp[RewardXPDifficulty] / 10) (QuestDef.cpp:218). The Exp table is not read, so no absolute XP value is given.
- Rounding: xp <= 100 rounds to steps of 5 (line 221); xp <= 500 to steps of 10 (line 225); xp <= 1000 to steps of 25; above that steps of 50 (lines 229-233, not receipted).
- Repeat grant: XP 0 (PlayerQuest.cpp:762). Max level: money from GetRewMoneyMaxLevel replaces XP (lines 766-768).

## 4. TypeScript sketch
simplified: omits DB save, achievements, reputation, spells, honor/title/talents/arena, party and raid gates, script hooks, the playtime money cut, and the explore, item, money, reputation and player-kill objectives (only kill and talk kinds are modelled). It fixes the donor's defect: a matching objective ends the scan with a single findIndex hit (break), not continue. It sets status COMPLETE inside credit() instead of through CompleteQuest.
```ts
type ObjKind = "kill" | "talk";
interface Objective { kind: ObjKind; targetId: number; required: number; }
interface QuestDef {
  id: number;
  level: number;               // donor uses -1 for "player level"; here always explicit
  xpDifficulty: number;        // index into the donor quest-XP table (not read)
  objectives: Objective[];     // donor QUEST_OBJECTIVES_COUNT = 4
  rewardItems: { id: number; count: number }[];
  timedReset: boolean;         // daily/weekly/monthly: repeat grants XP again
  repeatable: boolean;
}
type Status = "incomplete" | "complete" | "rewarded";
interface QuestState { status: Status; counts: number[]; }
interface Player {
  level: number;
  log: number[];                       // active quest ids
  rewarded: Set<number>;
  ledger: Map<number, QuestState>;     // the one ledger
  bagFree: number;                     // simplified: one slot per reward item
  mailOverflow: { id: number; count: number }[];
  xp: number;
}

// Donor Quest::XPValue: level-gap factor, then rounding bands. table = xpDifficulty value.
function xpValue(questLevel: number, playerLevel: number, table: number): number {
  const diff = Math.min(10, Math.max(1, 2 * (questLevel - playerLevel) + 20));
  let xp = Math.floor((diff * table) / 10);
  if (xp <= 100) xp = 5 * Math.floor((xp + 2) / 5);
  else if (xp <= 500) xp = 10 * Math.floor((xp + 5) / 10);
  else if (xp <= 1000) xp = 25 * Math.floor((xp + 12) / 25);
  else xp = 50 * Math.floor((xp + 25) / 50);
  return xp;
}

// Donor CanCompleteQuest (incomplete-branch): every counted objective met.
function canComplete(def: QuestDef, st: QuestState): boolean {
  if (st.status !== "incomplete") return false;
  return def.objectives.every((o, j) => o.required === 0 || st.counts[j] >= o.required);
}

// Shared by kill and talk events in the donor.
// Donor KilledMonsterCredit uses break after the first match; here both kinds do.
function credit(p: Player, defs: Map<number, QuestDef>, kind: ObjKind, targetId: number): void {
  for (const qid of p.log) {
    const def = defs.get(qid);
    const st = p.ledger.get(qid);
    if (!def || !st || st.status !== "incomplete") continue;
    const j = def.objectives.findIndex((o) => o.kind === kind && o.targetId === targetId);
    if (j < 0) continue;
    if (st.counts[j] < def.objectives[j].required) st.counts[j] += 1;
    if (canComplete(def, st)) st.status = "complete";
  }
}

// Donor RewardQuest, order kept: items (overflow to mail), XP unless repeat, leave log, mark rewarded.
function reward(p: Player, def: QuestDef): number {
  const st = p.ledger.get(def.id);
  if (!st || st.status !== "complete") return 0;
  for (const it of def.rewardItems) {
    if (p.bagFree > 0) p.bagFree -= 1;
    else p.mailOverflow.push({ id: it.id, count: it.count });
  }
  const repeatGrant = p.rewarded.has(def.id) && !def.timedReset;
  const xp = repeatGrant ? 0 : xpValue(def.level, p.level, def.xpDifficulty);
  p.xp += xp;
  p.log = p.log.filter((q) => q !== def.id);
  p.rewarded.add(def.id);
  st.status = "rewarded";
  return xp;
}
export {};
```
Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 azerothcore-quest-ledger.ts` on the VPS (/tmp): passed with no output (TSC_OK).

## 5. Lands in
Target: origins/quests/ledger.ts (proposed new module; the kill and speak events come from the fight engine in src/fight/ and the server interaction handler). Parity row 18 (loot roll and XP award), sub-line: quest reward and XP award; the server tick is not involved. The quest XP curve is a candidate for the same engine function as the XP award in row 18.

## 6. Gaps and risks
- One engine and zones as data: the donor keeps objective kinds and counts in quest_template columns (quest_template.sql:103, :107), but the completion loop is C++ code. In Frankendom the quest rows are zone data and the completion rule is engine code, so the XP curve and objective rule must be engine constants, not per-zone values.
- Server-verified kills: the donor credits kills on the server from KillRewarder (KillRewarder.cpp:202-205). The speak-to path is weaker: its handler call is commented out, so each NPC needs a script to call TalkedToCreature. Frankendom should route speak credit through one server-side interaction action, not per-NPC code.
- One ledger: the donor has one status map, but the same log-scan-and-complete loop is written out at least seven times (CanCompleteQuest call sites at PlayerQuest.cpp:1938, 2055, 2173, 2231, 2264, 2296, 2324). Frankendom needs one function that every event calls.
- Pit as client and MAX_ATTACKERS = 3: nothing in the donor restricts quest credit to a fight. A Pit fight must not count as zone quest credit unless the engine says so. Many-vs-one: the donor credits each eligible group member separately (KillRewarder.cpp:202); the group loop was not read.
- Defect (keep the idea, fix it): TalkedToCreature increments two objectives that target the same NPC (continue at PlayerQuest.cpp:2237), against its own comment at line 2236. fix: stop the scan on the first match, as KilledMonsterCredit does (sketch credit()).
- Defect: a reward that does not fit in bags goes to mail, which is safe, but nothing in this code shows a claim-later queue for the mail path. fix: keep the mail fallback, and add a claim row in the one ledger.
- Gossip options (PlayerGossip.cpp:60, 65): options are filtered per item by an NPC flag mask and by ConditionMgr conditions when the menu is built. Dialogue choice gating can use the same condition system as quests. Only the filter was read.

Reuse tag: adapt (per-objective counters in one ledger; XP level-gap curve as engine data; mail fallback for overflow reward). No code from the donor is reused.
Brief rule served: Rule 4 (find the real implementation: the grep for the topic words found the objective loop, not the serpent statue test); Rule 6 (ledger and completion order described); Rule 8 (target file and row given); Rule 10 (receipts verified).

Decision (proposed): adapt. Why: the objective ledger and completion-on-event shape fits one engine and one ledger; reject the copied flag set and the per-NPC speak credit.
Best transferable idea: one event loop credits per-objective counters in one per-player ledger and completes the quest on the same event, with the XP level-gap curve held as engine data.
Acceptance: a server test asserts a 4-kill objective completes on its 4th kill with no counts beyond the required value; a talk that targets two objectives of one quest increments exactly one; a full-bag reward appears in the mailbox list.
