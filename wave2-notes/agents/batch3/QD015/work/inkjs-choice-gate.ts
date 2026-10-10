// Licence: MIT (donor, inkjs LICENSE.md: Copyright 2017 inkle Ltd and inkjs contributors). Clean-room sketch of the described order of steps, not a line-by-line translation.
// clean-room
interface Choice {
  text: string;
  targetId: string;      // the content the choice leads to
  threadId: number;      // the thread captured when the choice was offered
  fallback: boolean;     // invisible default: taken automatically when nothing else is offered
}

interface ChoicePoint {
  text: string;
  targetId: string;
  condition?: () => boolean; // a false condition hides the choice
  onceOnly: boolean;         // hidden once the target has been seen
  fallback: boolean;
}

interface MemoryView {
  visits(id: string): number;     // 0 if never seen
  turnsSince(id: string): number; // -1 if never seen
}

// Offer step: a choice point is shown or hidden once, when the flow reaches it.
function offer(cp: ChoicePoint, mem: MemoryView, currentThread: number): Choice | null {
  if (cp.condition && !cp.condition()) return null;             // condition false: hidden
  if (cp.onceOnly && mem.visits(cp.targetId) > 0) return null;  // already read: hidden
  return { text: cp.text, targetId: cp.targetId, threadId: currentThread, fallback: cp.fallback };
}

// Auto step: only when the story has stopped producing text. If every offered choice is a
// fallback, take the first one. A fallback does not advance the turn counter.
function autoFollow(offered: Choice[], follow: (c: Choice, advanceTurn: boolean) => void): boolean {
  if (offered.length === 0) return false;
  const fallbacks = offered.filter((c) => c.fallback);
  if (fallbacks.length === 0 || fallbacks.length < offered.length) return false;
  follow(fallbacks[0], false);
  return true;
}

// Player choice: advances the turn counter.
function choose(c: Choice, follow: (c: Choice, advanceTurn: boolean) => void): void {
  follow(c, true);
}

// Visit and turn memory, keyed by content id.
class Memory implements MemoryView {
  private visitCount = new Map<string, number>();
  private lastTurn = new Map<string, number>();
  turn = -1; // starts at -1; each player choice adds one

  enter(id: string, atStart: boolean, countAtStartOnly: boolean): void {
    if (countAtStartOnly && !atStart) return;
    this.visitCount.set(id, (this.visitCount.get(id) ?? 0) + 1);
    this.lastTurn.set(id, this.turn);
  }

  visits(id: string): number {
    return this.visitCount.get(id) ?? 0;
  }

  turnsSince(id: string): number {
    const t = this.lastTurn.get(id);
    return t === undefined ? -1 : this.turn - t;
  }

  advanceTurn(): void {
    this.turn += 1;
  }
}

export {};
