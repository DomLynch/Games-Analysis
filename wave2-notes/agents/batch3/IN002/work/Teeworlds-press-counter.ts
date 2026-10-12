// Licence: zlib-style permissive (donor). Clean-room sketch of the mechanism, not a translation.
export const STATE_MASK = 0x3f; // six-bit wire counter, as the donor's INPUT_STATE_MASK

// Client: the fire counter goes up on every flip of the held state, so presses between two sends are not lost.
export function bumpFire(counter: number, held: boolean): number {
  let v = counter;
  if ((v & 1) !== (held ? 1 : 0)) v++;
  return v & STATE_MASK;
}

// Server: presses are the rising edges (odd states) passed between the last applied state and the new one.
export function countPresses(prev: number, cur: number): { presses: number; releases: number } {
  let i = prev & STATE_MASK;
  const end = cur & STATE_MASK;
  let presses = 0;
  let releases = 0;
  while (i !== end) {
    i = (i + 1) & STATE_MASK;
    if (i & 1) presses++;
    else releases++;
  }
  return { presses, releases };
}

export interface Gun { reload: number; fireDelayTicks: number }
export interface Intake { prev: number; cur: number }

// Packet arrival: fire on arrival if the gun is ready and at least one press is pending.
// Fix (defect in the donor): prev advances only when a shot was considered, so a press that lands while
// the gun is reloading stays pending and fires when the timer ends. The donor copies the state either way.
export function onInput(intake: Intake, newState: number, gun: Gun, fire: (ticks: number) => void): Intake {
  const next: Intake = { prev: intake.prev, cur: newState & STATE_MASK };
  if (gun.reload !== 0) return next; // keep prev: the press is still pending
  if (countPresses(next.prev, next.cur).presses > 0) {
    fire(gun.fireDelayTicks);
    gun.reload = gun.fireDelayTicks;
  }
  next.prev = next.cur;
  return next;
}

// Server tick: count the reload down, otherwise re-check any pending press.
export function onTick(intake: Intake, gun: Gun, fire: (ticks: number) => void): Intake {
  if (gun.reload > 0) {
    gun.reload--;
    return intake;
  }
  return onInput(intake, intake.cur, gun, fire);
}

// Aim: the cursor is an offset from the character, clamped to a max distance (a virtual stick).
// Dynamic camera: min(200 / followFactor + deadzone, maxDynamic). Static: maxStatic.
export function maxAimDistance(dynamic: boolean, followFactor: number, deadzone: number, maxDynamic: number, maxStatic: number): number {
  if (!dynamic) return maxStatic;
  return Math.min(200 / followFactor + deadzone, maxDynamic);
}

export function clampAim(offset: { x: number; y: number }, maxDist: number): { x: number; y: number } {
  const d = Math.hypot(offset.x, offset.y);
  if (d <= maxDist || d === 0) return offset;
  return { x: (offset.x / d) * maxDist, y: (offset.y / d) * maxDist };
}

// Zero aim is never sent as the centre: the client sends (1, 0), the server maps (0, 0) to (0, -1).
export function safeAim(aim: { x: number; y: number }): { x: number; y: number } {
  if (aim.x === 0 && aim.y === 0) return { x: 0, y: -1 };
  return aim;
}

// Send policy: send on any change, otherwise at least once per interval (donor: time_freq() / 25 = 40 ms).
export function shouldSend(changed: boolean, nowMs: number, lastSendMs: number, minIntervalMs = 40): boolean {
  return changed || nowMs - lastSendMs > minIntervalMs;
}

export {};
