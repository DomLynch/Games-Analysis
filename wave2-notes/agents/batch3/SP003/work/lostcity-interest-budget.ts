// Licence: MIT (donor LostCityRS-Engine-TS). Sketch written from the described mechanism, not a translation.
export {};

export interface Candidate { id: number; dist: number; bytes: number; }

export class InterestBudget {
  static readonly PREFERRED_IDS = 250;
  static readonly PREFERRED_VIEW = 15;
  static readonly INTERVAL = 10;
  static readonly MAX_BYTES = 4997;

  viewDistance = InterestBudget.PREFERRED_VIEW;
  private calmTicks = 0;

  // Run once per viewer per tick. Crowded: shrink by one. Calm: wait INTERVAL ticks, then grow by one per tick.
  resize(idsInView: number): void {
    if (idsInView >= InterestBudget.PREFERRED_IDS) {
      if (this.viewDistance > 1) this.viewDistance--;
      this.calmTicks = 0;
      return;
    }
    this.calmTicks++;
    if (this.calmTicks >= InterestBudget.INTERVAL) {
      if (this.viewDistance < InterestBudget.PREFERRED_VIEW) this.viewDistance++;
      else this.calmTicks = 0;
    }
  }

  // Nearest first. Stop (not skip) at the id cap or when the next add would exceed the byte budget.
  select(candidates: Candidate[], idsInView: number, bytesUsed: number): number[] {
    const sorted = [...candidates].sort((a, b) => a.dist - b.dist);
    const picked: number[] = [];
    let bytes = bytesUsed;
    for (const c of sorted) {
      if (c.dist > this.viewDistance) continue;
      if (idsInView + picked.length >= InterestBudget.PREFERRED_IDS) break;
      if (bytes + c.bytes > InterestBudget.MAX_BYTES) break;
      picked.push(c.id);
      bytes += c.bytes;
    }
    return picked;
  }
}

// Fix for the donor leak (build.ts:95-96 clears the set without decrementing observers).
// The view is diffed: every id that leaves decrements before the new view replaces the old one.
export class ObserverCounts {
  private readonly observers = new Map<number, number>();
  private inView = new Set<number>();

  count(id: number): number {
    return this.observers.get(id) ?? 0;
  }

  replaceView(next: Set<number>): void {
    for (const id of this.inView) {
      if (!next.has(id)) this.bump(id, -1);
    }
    for (const id of next) {
      if (!this.inView.has(id)) this.bump(id, 1);
    }
    this.inView = next;
  }

  private bump(id: number, delta: number): void {
    const value = Math.max((this.observers.get(id) ?? 0) + delta, 0);
    if (value === 0) this.observers.delete(id);
    else this.observers.set(id, value);
  }
}

// Donor Npc.ts:161: a PAUSEHUNT npc only runs its hunt while some viewer observes it.
export function mayHunt(observers: ObserverCounts, id: number, pauseWhenUnseen: boolean): boolean {
  return !pauseWhenUnseen || observers.count(id) > 0;
}
