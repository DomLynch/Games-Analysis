// Licence: BSD-2-Clause (donor). Shape only, written from the described mechanism; not a translation.
const TOKEN_SLOTS = 5;     // donor Constants.MAX_FAST_WALK_STACK_SIZE
const MAX_QUEUED = 5;      // donor Constants.MAX_STEP_COUNT (own moves and incoming steps)

// Server-issued one-time tokens. The server sets a batch, adds single tokens, and the client spends one per move.
class TokenPool {
  private slots: number[] = new Array<number>(TOKEN_SLOTS).fill(0);

  set(index: number, value: number): void {          // donor ext cmd 1: reads 6 values, keeps 5
    if (index >= 0 && index < TOKEN_SLOTS) this.slots[index] = value;
  }

  add(value: number): void {                         // donor ext cmd 2: first empty slot, else dropped
    const i = this.slots.indexOf(0);
    if (i >= 0) this.slots[i] = value;
  }

  // Spend the first non-zero token; 0 is sent when the pool is empty (the server decides what that means).
  take(): number {
    for (let i = 0; i < TOKEN_SLOTS; i++) {
      const v = this.slots[i];
      if (v !== 0) { this.slots[i] = 0; return v; }
    }
    return 0;
  }
}

interface MoveState { failed: boolean; nextAllowedAt: number; queued: number; paralysed: boolean; }

// Client-side pre-send gate for the player's own move (donor PlayerMobile.Walk, first checks).
function mayWalk(s: MoveState, now: number): boolean {
  return !s.failed && s.nextAllowedAt <= now && s.queued < MAX_QUEUED && !s.paralysed;
}

// Adjacency check on a step the client is about to animate (donor Mobile.ProcessSteps badStep).
// Pathfinder.GetNewXY is passed in so this stays pure.
function stepIsConsistent(
  fromX: number, fromY: number, stepX: number, stepY: number, stepDir: number,
  getNewXY: (dir: number, x: number, y: number) => [number, number]
): boolean {
  const ax = Math.abs(fromX - stepX);
  const ay = Math.abs(fromY - stepY);
  if (ax > 1 || ay > 1 || ax + ay === 0) return false;
  const [nx, ny] = getNewXY(stepDir & 7, fromX, fromY);
  return nx === stepX && ny === stepY;
}

// Incoming steps for another mobile: a full queue snaps the mobile to the server tile and clears its steps (donor EnqueueStep caller).
function acceptIncomingStep(queueLength: number): "queued" | "snap" {
  return queueLength >= MAX_QUEUED ? "snap" : "queued";
}
export {};
