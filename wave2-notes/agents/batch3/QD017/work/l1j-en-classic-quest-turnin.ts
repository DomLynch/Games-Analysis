// Sketch: per-player quest step log + data-gated NPC listed actions + material turn-in.
// Clean-room shape only (donor is GPL-2.0); no line-by-line translation.
type Html = string;

export const QUEST_END = 255;

export interface QuestStore {
  loadSteps(charId: number): Promise<Map<number, number>>;
  writeStep(charId: number, questId: number, step: number): Promise<boolean>;
}

export type Snap = (questId: number) => number;

export class QuestLog {
  private steps: Map<number, number> | null = null;

  constructor(private readonly charId: number, private readonly store: QuestStore) {}

  // Fix for the donor null map: the login path calls load() once, before any gate or write.
  async load(): Promise<void> {
    if (this.steps === null) {
      this.steps = await this.store.loadSteps(this.charId);
    }
  }

  get(questId: number): number {
    if (this.steps === null) throw new Error("quest log not loaded");
    return this.steps.get(questId) ?? 0;
  }

  snapshot(): Snap {
    const copy = new Map(this.steps ?? []);
    return (questId: number) => copy.get(questId) ?? 0;
  }

  // Fix for the donor in-memory write: memory changes only after the row write succeeds.
  async set(questId: number, step: number): Promise<boolean> {
    if (this.steps === null) throw new Error("quest log not loaded");
    const ok = await this.store.writeStep(this.charId, questId, step);
    if (ok) this.steps.set(questId, step);
    return ok;
  }
}

export interface Gate {
  npcIds?: number[];
  levelMin?: number;
  levelMax?: number;
  classes?: string[];
  quest?: { id: number; step: number | "started" };
}

export interface Player {
  level: number;
  cls: string;
  quests: QuestLog;
  slotsFree: number;
  inventory: Map<number, number>; // itemId -> total count (stacks summed)
}

export function gateOpen(g: Gate, p: Player, npcId: number, snap: Snap): boolean {
  if (g.npcIds && !g.npcIds.includes(npcId)) return false;
  if (g.levelMin !== undefined && p.level < g.levelMin) return false;
  if (g.levelMax !== undefined && p.level > g.levelMax) return false;
  if (g.classes && !g.classes.includes(p.cls)) return false;
  if (g.quest) {
    const s = snap(g.quest.id);
    if (g.quest.step === "started") {
      if (!(s > 0)) return false;
    } else if (s !== g.quest.step) {
      return false;
    }
  }
  return true;
}

export interface ActionChild {
  gate: Gate;
  set?: { questId: number; to: number };
  html?: Html;
}

// Listed actions: every open child runs, in order; the last non-empty html wins.
// simplified: all gates read ONE snapshot taken before the call; the donor reads live state per child.
export async function runListed(children: ActionChild[], p: Player, npcId: number): Promise<Html | null> {
  const snap = p.quests.snapshot();
  let out: Html | null = null;
  for (const c of children) {
    if (!gateOpen(c.gate, p, npcId, snap)) continue;
    if (c.set) {
      const ok = await p.quests.set(c.set.questId, c.set.to);
      if (!ok) continue;
    }
    if (c.html !== undefined) out = c.html;
  }
  return out;
}

export interface Turnin {
  gate: Gate;
  materials: { itemId: number; amount: number }[];
  rewards: { itemId: number; amount: number }[];
  succeed: ActionChild[];
  fail: ActionChild[];
}

// Material check, slot check, consume, grant, then Succeed or Fail. One inventory map is the ledger.
// simplified: one slot per reward line (no stack merging); no weight check; no shortfall messages.
export async function turnIn(t: Turnin, p: Player, npcId: number): Promise<Html | null> {
  if (!gateOpen(t.gate, p, npcId, p.quests.snapshot())) return null;

  const haveMaterials = t.materials.every((m) => (p.inventory.get(m.itemId) ?? 0) >= m.amount);
  const slotsNeeded = t.rewards.length;
  if (!haveMaterials || p.slotsFree < slotsNeeded) {
    return (await runListed(t.fail, p, npcId)) ?? "close";
  }

  for (const m of t.materials) {
    p.inventory.set(m.itemId, (p.inventory.get(m.itemId) ?? 0) - m.amount);
  }
  for (const r of t.rewards) {
    p.inventory.set(r.itemId, (p.inventory.get(r.itemId) ?? 0) + r.amount);
  }
  p.slotsFree -= slotsNeeded;

  return (await runListed(t.succeed, p, npcId)) ?? "close";
}

export {};
