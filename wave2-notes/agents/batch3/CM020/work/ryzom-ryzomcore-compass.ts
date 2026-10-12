// Licence: AGPL-3.0 (donor). Clean-room sketch of the shape only, written from the described mechanism, not a translation.

interface Vec2 { x: number; y: number; }
type Reference = 'facing' | 'camera';
interface Target { pos: Vec2 | null; name: string; } // pos null = no target, show north

const BLINK_TIME_S = 0.3;   // blink length for a new target
const KM_SWITCH_M = 999;    // above this distance the label switches to kilometres

// Arrow rotation in degrees (bearing to the target minus the reference heading) and the label.
// Facing mode uses the player's front; camera mode uses the camera's ground direction.
function compassReadout(
  player: Vec2,
  target: Target | null,
  mode: Reference,
  facingRad: number,
  cameraRad: number,
): { rotDeg: number; label: string } {
  const reference = mode === 'camera' ? cameraRad : facingRad;
  // No target: aim one unit ahead on y, the same as the donor's north pseudo-target.
  const aim: Vec2 = target !== null && target.pos !== null ? target.pos : { x: player.x, y: player.y + 1 };
  const dx = aim.x - player.x;
  const dy = aim.y - player.y;
  const rotDeg = ((Math.atan2(dy, dx) - reference) * 180) / Math.PI;

  if (!(target !== null && target.pos !== null)) return { rotDeg, label: 'North' };
  const dist = Math.hypot(dx, dy);
  const amount = dist > KM_SWITCH_M ? `${(dist / 1000).toFixed(1)} km` : `${dist.toFixed(0)} m`;
  return { rotDeg, label: `${amount} - ${target.name}` };
}

// Colour blend for a new-target blink. Rises to a peak at half time, then falls to 0 at BLINK_TIME_S.
// The peak is 0.3 (2 x 0.15), so the tint never reaches the full new colour; see section 6.
function blinkAmount(elapsedS: number): number {
  if (elapsedS >= BLINK_TIME_S) return 0;
  return elapsedS > BLINK_TIME_S * 0.5 ? 2 * (BLINK_TIME_S - elapsedS) : 2 * elapsedS;
}

export {};
