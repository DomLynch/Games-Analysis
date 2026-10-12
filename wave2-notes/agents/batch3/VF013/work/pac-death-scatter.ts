// clean-room sketch from the described mechanism (donor is GPL-3.0; not a translation)
// Times in ms, positions in world units.
const FADE_MS = 1500;        // donor: leader alpha tween duration (pokemon-sprite.ts 571)
const FOLLOW_DELAY_MS = 500; // donor: follower tween delay (597)
const RUN_MS = 5000;         // donor: follower tween duration (596)
const RUN_UNITS = 1000;      // donor: run distance along the direction (588-589)
const RING = 8;

// Direction vectors indexed by ring step (donor OrientationVector: 0 DOWN, 1 DOWNRIGHT, ... 7 DOWNLEFT).
const DIRS: [number, number][] = [
  [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1],
];

export interface Follower { id: number; x: number; y: number; }

export interface FollowerPlan {
  id: number;
  facing: number;   // ring step the follower turns to
  runDir: number;   // ring step it runs along
  startMs: number;
  endMs: number;    // removed at this time
  toX: number;
  toY: number;
  fromX: number;
  fromY: number;
}

// Leader alpha: 1 at death, 0 after FADE_MS, linear.
export function leaderAlpha(elapsedMs: number): number {
  if (elapsedMs <= 0) return 1;
  if (elapsedMs >= FADE_MS) return 0;
  return 1 - elapsedMs / FADE_MS;
}

// Plan the scatter. Followers are in the same order as the donor's troopers array.
// Facing and run use index offsets 6 and 5 on the same ring, as in the donor.
export function planScatter(deathMs: number, followers: Follower[]): FollowerPlan[] {
  return followers.map((f, i) => {
    const runDir = (i + 5) % RING;
    const facing = (i + 6) % RING;
    const [dx, dy] = DIRS[runDir];
    return {
      id: f.id,
      facing,
      runDir,
      startMs: deathMs + FOLLOW_DELAY_MS,
      endMs: deathMs + FOLLOW_DELAY_MS + RUN_MS,
      toX: f.x + RUN_UNITS * dx,
      toY: f.y + RUN_UNITS * dy,
      fromX: f.x,
      fromY: f.y,
    };
  });
}

// Position at nowMs: standing until startMs, linear walk to the target, null once removed.
export function followerPos(p: FollowerPlan, nowMs: number): { x: number; y: number } | null {
  if (nowMs >= p.endMs) return null;
  if (nowMs <= p.startMs) return { x: p.fromX, y: p.fromY };
  const t = (nowMs - p.startMs) / RUN_MS;
  return { x: p.fromX + (p.toX - p.fromX) * t, y: p.fromY + (p.toY - p.fromY) * t };
}

export {};
