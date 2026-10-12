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
