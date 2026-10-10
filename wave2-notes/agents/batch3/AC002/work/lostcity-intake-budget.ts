// Licence: MIT (donor, LICENSE: "MIT License", Copyright (c) 2023-2026 Lost City). Code may be adapted; this sketch is written from the described mechanism, not copied line by line.
// simplified: keeps the per-tick intake budget by category (leftover messages wait in the queue), the bounds check on a move click (control flag, start range, 25-point cap), the run-energy gate, and the one-or-two-steps-per-tick walk with collision-checked diagonal, E/W, N/S fallback. Omits: the packet length cap and unknown-opcode close, the byte decoder (waypoints as signed offsets from the start), the client-side route option (the donor's clientRoutefinder default accepts the client path; this sketch always takes a server-given path), the width > 1 case, the displacement "jump" check, the walk triggers and the target-validity checks. Direction is the sign of the delta, not the donor's face direction. The donor stores waypoints reversed; this sketch keeps them in order.

export type Category = "client" | "user" | "restricted";

// Per-tick decode budget per category (donor: CLIENT_EVENT 20, USER_EVENT 5, RESTRICTED_EVENT 2).
export const BUDGET: Record<Category, number> = { client: 20, user: 5, restricted: 2 };

export interface Pending<T> {
  category: Category;
  msg: T;
}

// Drain at most the budget this tick. Messages past the budget stay queued for the next tick; none are dropped here.
// A rejected user message counts against the shared client budget, as in the donor (NetworkPlayer.ts 141-147).
export function intakeTick<T>(queue: Pending<T>[], handle: (msg: T) => boolean): number {
  const used: Record<Category, number> = { client: 0, user: 0, restricted: 0 };
  let applied = 0;
  while (
    queue.length > 0 &&
    used.client < BUDGET.client &&
    used.user < BUDGET.user &&
    used.restricted < BUDGET.restricted
  ) {
    const p = queue.shift();
    if (p === undefined) break;
    const ok = handle(p.msg);
    if (ok && p.category === "user") {
      used.user++;
    } else if (p.category === "restricted") {
      used.restricted++;
    } else {
      used.client++;
    }
    if (ok) applied++;
  }
  return applied;
}

export interface Pt {
  x: number;
  z: number;
}

export interface MoveClick {
  ctrlHeld: number;
  path: Pt[];
}

export const MAX_POINTS = 25;         // start point plus 24 waypoints (donor decoder: index < 25)
export const MAX_START_RANGE = 104;   // tiles, Chebyshev distance from the player (donor: distanceToSW > 104)

export type Verdict = { ok: false } | { ok: true; path: Pt[]; run: boolean };

// Bounds check on a click before any path is queued. A rejection leaves the player's queued path empty.
export function validateMoveClick(player: Pt, energy: number, click: MoveClick): Verdict {
  if (click.ctrlHeld !== 0 && click.ctrlHeld !== 1) return { ok: false };
  const start = click.path[0];
  if (start === undefined) return { ok: false };
  const range = Math.max(Math.abs(player.x - start.x), Math.abs(player.z - start.z));
  if (range > MAX_START_RANGE) return { ok: false };
  // Ctrl-run is downgraded to walk when run energy is below 100 (donor MoveClickHandler.ts 35-39).
  const run = click.ctrlHeld === 1 && energy >= 100;
  return { ok: true, path: click.path.slice(0, MAX_POINTS), run };
}

export type CanTravel = (x: number, z: number, dx: number, dz: number) => boolean;

// Direction to take this step: diagonal, then E/W, then N/S, else stay. Every step is checked against collision.
export function nextStep(x: number, z: number, target: Pt, canTravel: CanTravel): [number, number] {
  const dx = Math.sign(target.x - x);
  const dz = Math.sign(target.z - z);
  if (dx !== 0 && dz !== 0 && canTravel(x, z, dx, dz)) return [dx, dz];
  if (dx !== 0 && canTravel(x, z, dx, 0)) return [dx, 0];
  if (dz !== 0 && canTravel(x, z, 0, dz)) return [0, dz];
  return [0, 0];
}

// One server tick of walking: one step, or two when running. A blocked step keeps the waypoint for the next tick.
export function walkTick(start: Pt, path: Pt[], run: boolean, canTravel: CanTravel): { pos: Pt; reached: number } {
  let pos: Pt = { x: start.x, z: start.z };
  let idx = 0;
  const steps = run ? 2 : 1;
  for (let i = 0; i < steps && idx < path.length; i++) {
    const target = path[idx];
    const [dx, dz] = nextStep(pos.x, pos.z, target, canTravel);
    if (dx === 0 && dz === 0) break;
    pos = { x: pos.x + dx, z: pos.z + dz };
    if (pos.x === target.x && pos.z === target.z) idx++;
  }
  return { pos, reached: idx };
}

// Displacement since the last tick above 2 tiles is sent as a jump, not a walk (donor validateDistanceWalked; not rejected).
export function isJump(lastTick: Pt, now: Pt): boolean {
  return Math.max(Math.abs(now.x - lastTick.x), Math.abs(now.z - lastTick.z)) > 2;
}

export {};
