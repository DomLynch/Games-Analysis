// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Kind =
  | "kill" | "killFinish" | "deliver" | "deliverFinish"
  | "interact" | "interactFinish" | "collect" | "collectFinish";

interface StepDef {
  kind: Kind;
  targetName: string;
  targetRegion: number;    // 0 = any region
  item?: string;           // item template for this step (kill steps: the drop template)
  dropPercent: number;     // roll for the drop; 0 with an item means the step is refused
  rewardXp: number;
  rewardMoney: number;     // copper
}

interface QuestDef {
  id: string;
  steps: StepDef[];        // step n (1-based, as in the donor) is steps[n - 1]
  maxCount: number;        // Infinity = unlimited
  minLevel: number;
  maxLevel: number;
}

interface CharQuest {
  step: number;            // 0 = not active; 1-based current step
  count: number;           // completed times
}

interface Entry {
  kind: "xp" | "money" | "item";
  amount: number;
  item?: string;
}

interface Env {
  rollPercent(p: number): boolean;
  freeSlots(playerId: string): number;
  xpEnabled(playerId: string): boolean;
  post(playerId: string, entries: Entry[], ref: string): void;   // one ledger transaction per call
}

function canAccept(q: QuestDef, c: CharQuest, level: number, classAllowed: boolean): boolean {
  if (level < q.minLevel || level > q.maxLevel) return false;
  if (!classAllowed) return false;
  if (c.step !== 0) return false;              // already doing it
  return c.count < q.maxCount;                 // finished count below the cap
}

function accept(q: QuestDef, c: CharQuest, level: number, classAllowed: boolean): boolean {
  if (!canAccept(q, c, level, classAllowed)) return false;
  c.step = 1;
  return true;
}

function currentStep(q: QuestDef, c: CharQuest): StepDef | undefined {
  return c.step >= 1 ? q.steps[c.step - 1] : undefined;
}

// Donor AdvanceQuestStep, simplified: XP gate, drop roll, slot check for every item given,
// grant the current step's rewards, then step + 1. Returns false and changes nothing if any gate fails.
function advance(q: QuestDef, c: CharQuest, env: Env, playerId: string, killed: boolean): boolean {
  const cur = currentStep(q, c);
  if (cur === undefined) return false;
  if (cur.rewardXp > 0 && !env.xpEnabled(playerId)) return false;

  const items: string[] = [];
  if (cur.item !== undefined) {
    if (killed) {
      if (cur.dropPercent <= 0) return false;              // donor: a zero chance is refused
      if (!env.rollPercent(cur.dropPercent)) return false; // failed roll: no advance
    }
    items.push(cur.item);
  }
  const next = q.steps[c.step];                             // the step after the current one
  if (next !== undefined && (next.kind === "deliver" || next.kind === "deliverFinish") && next.item !== undefined) {
    items.push(next.item);
  }
  if (env.freeSlots(playerId) < items.length) return false; // bag full: do not advance

  const entries: Entry[] = [];
  if (cur.rewardXp > 0) entries.push({ kind: "xp", amount: cur.rewardXp });
  if (cur.rewardMoney > 0) entries.push({ kind: "money", amount: cur.rewardMoney });
  for (const it of items) entries.push({ kind: "item", amount: 1, item: it });
  env.post(playerId, entries, "quest:" + q.id + ":step:" + String(c.step));
  c.step += 1;
  return true;
}

// Donor FinishQuest, simplified: slot precheck for final and chosen items, XP gate, one grant,
// then step reset to 0 and count + 1. Nothing changes unless every check passes.
function finish(
  q: QuestDef, c: CharQuest, env: Env, playerId: string,
  lastStep: number, finalItems: string[], chosenItems: string[],
): boolean {
  const itemCount = finalItems.length + chosenItems.length;
  if (env.freeSlots(playerId) < itemCount) return false;

  const last = q.steps[lastStep - 1];
  const xp = last !== undefined ? last.rewardXp : 0;
  const money = last !== undefined ? last.rewardMoney : 0;
  if (xp > 0 && !env.xpEnabled(playerId)) return false;

  const entries: Entry[] = [];
  if (xp > 0) entries.push({ kind: "xp", amount: xp });
  if (money > 0) entries.push({ kind: "money", amount: money });
  for (const it of finalItems) entries.push({ kind: "item", amount: 1, item: it });
  for (const it of chosenItems) entries.push({ kind: "item", amount: 1, item: it });
  env.post(playerId, entries, "quest:" + q.id + ":finish");

  c.step = 0;
  c.count += 1;
  return true;
}

export {};
