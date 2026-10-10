// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
const NEVER = Infinity;          // a restart delay of "never" (the donor uses TimeSpan.MaxValue)
const SLICE_MS = 500;            // the quest timer fires every half second

// Objective progress with a one-shot completion latch.
class Objective {
  private progress = 0;
  private completed = false;     // latch: completion fires once
  constructor(private readonly max: number, private readonly onDone: () => void) {}
  get isDone(): boolean { return this.progress >= this.max; }
  set current(p: number) {       // setting progress checks the latch
    this.progress = p;
    if (this.isDone && !this.completed) { this.completed = true; this.onDone(); }
  }
  get current(): number { return this.progress; }
  get hasLatched(): boolean { return this.completed; }
}

interface RestartEntry { quest: string; resetAt: number; } // ms timestamp; Infinity = never

// Record a finished quest. Nothing is written unless it is the player's current quest (donor returns early);
// completion records only when the delay is non-zero; a cancel records only for a "never" quest.
function recordEnd(done: RestartEntry[], quest: string, isCurrent: boolean, completed: boolean, delayMs: number, now: number): void {
  if (!isCurrent) return;
  const recordable = (completed && delayMs > 0) || (!completed && delayMs === NEVER);
  if (!recordable) return;
  const found = done.find(e => e.quest === quest);
  if (found) found.resetAt = now + delayMs;
  else done.push({ quest, resetAt: now + delayMs });
}

// Offer check. An expired entry is removed when checked; a live one blocks and reports the restart period.
function canOffer(done: RestartEntry[], quest: string, now: number): { ok: boolean; inRestart: boolean } {
  const i = done.findIndex(e => e.quest === quest);
  if (i < 0) return { ok: true, inRestart: false };
  if (now < done[i].resetAt) return { ok: false, inRestart: true };
  done.splice(i, 1);
  return { ok: true, inRestart: false };
}

interface Participant { name: string; hasRight: boolean; quest?: { onKill(): void }; }

// The classic quest kill goes to the first participant, in looting-rights order (damage, highest first),
// who has a looting right and has the quest.
function creditQuestKill(lootingOrder: Participant[]): void {
  for (const p of lootingOrder) {
    if (!p.hasRight) continue;
    if (p.quest) { p.quest.onKill(); return; }
  }
}

// Poll pass, run on the half-second timer: only objectives not yet done are checked.
function slice(objectives: Objective[], check: (o: Objective) => void): void {
  for (let i = objectives.length - 1; i >= 0; --i) {
    const o = objectives[i];
    if (!o.isDone) check(o);
  }
}

export {};
