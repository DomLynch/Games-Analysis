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
