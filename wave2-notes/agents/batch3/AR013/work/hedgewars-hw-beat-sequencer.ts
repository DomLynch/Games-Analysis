// Licence: GPL-2.0 (donor; Animate.lua has no header of its own, the repository COPYING is GPL v2). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

type JumpKind = "long" | "high" | "back";

// Donor convention: a step returns true when finished and false to be retried on a later tick.
interface Step {
  run: () => boolean;
}

interface Watch {
  id: number;                 // stable id: removals never shift which entry another removal hits
  when: () => boolean;
  then: () => void;
  persistent: boolean;        // persistent watches stay after they fire; one-shot watches are removed
}

// Donor waits (in ticks) for a jump type, and the back-jump second impulse.
const JUMP_WAIT: Record<JumpKind | "backback", number> = { long: 500, high: 500, back: 300, backback: 500 };
const LAND_POLL_TICKS = 100;

class BeatSequencer {
  private steps: Step[] = [];
  private pos = 0;
  private waitTicks = 0;      // global wait, shared by all steps
  private locked = false;     // input lock while a beat plays
  private onSkip: (() => void) | null = null;
  private watches: Watch[] = [];
  private nextId = 1;
  readonly animSpeed = 1;     // ticks removed per unWait() call

  start(steps: Step[], onSkip: (() => void) | null): void {
    this.steps = steps;
    this.onSkip = onSkip;
    this.pos = 0;
    this.locked = true;
  }

  isLocked(): boolean { return this.locked; }

  // Called once per game tick.
  unWait(): void {
    if (this.waitTicks > 0) this.waitTicks = Math.max(0, this.waitTicks - this.animSpeed);
  }

  wait(ticks: number): void { this.waitTicks += ticks; }

  // One attempt at the current step; advance only when it reports done.
  tick(): boolean {
    if (this.waitTicks > 0) return false;
    if (this.pos >= this.steps.length) {
      this.pos = 0;
      this.locked = false;
      return true;
    }
    if (this.steps[this.pos].run()) this.pos += 1;
    return false;
  }

  // Skip: run the beat's own final-state function once, then end the beat.
  skip(): void {
    if (this.onSkip) this.onSkip();
    this.pos = 0;
    this.waitTicks = 0;
    this.locked = false;
  }

  addWatch(when: () => boolean, then: () => void, persistent: boolean): number {
    const id = this.nextId++;
    this.watches.push({ id, when, then, persistent });
    return id;
  }

  removeWatch(id: number): void {
    this.watches = this.watches.filter(w => w.id !== id);
  }

  // Scan a snapshot. An entry removed earlier in the same pass is skipped, not reindexed.
  checkWatches(): void {
    for (const w of [...this.watches]) {
      if (!this.watches.some(x => x.id === w.id)) continue;
      if (w.when()) {
        w.then();
        if (!w.persistent) this.removeWatch(w.id);
      }
    }
  }
}

// Jump step: an impulse, an optional second impulse for a back jump, then poll until the position stops changing.
function jumpStep(
  kind: JumpKind,
  pos: () => [number, number],
  impulse: (k: JumpKind) => void,
  seq: BeatSequencer,
): Step {
  let started = false;
  let backJumped = false;
  let lastX = 0;
  let lastY = 0;
  return {
    run: (): boolean => {
      if (!started) {
        [lastX, lastY] = pos();
        backJumped = false;
        started = true;
        impulse(kind);
        seq.wait(JUMP_WAIT[kind]);
        return false;
      }
      if (kind === "back" && !backJumped) {
        backJumped = true;
        impulse("back");
        seq.wait(JUMP_WAIT.backback);
        return false;
      }
      const [x, y] = pos();
      if (x === lastX && y === lastY) {
        started = false;
        backJumped = false;
        seq.wait(LAND_POLL_TICKS);
        return true;
      }
      lastX = x;
      lastY = y;
      seq.wait(LAND_POLL_TICKS);
      return false;
    },
  };
}

export {};
