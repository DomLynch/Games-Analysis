// Licence of donor: MIT. clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Setting = 'off' | 'low' | 'medium' | 'high' | 'veryHigh';

const BASE_AMP_DEG = 50;                       // full-severity amplitude, degrees
const SETTING_SCALE: Record<Setting, number> = { off: 0, low: 0.25, medium: 0.5, high: 0.75, veryHigh: 1 };

interface Sway {
  startMs: number;      // time of the hit
  timerStart: number;   // radians; piScalar * pi
  amp: number;          // amplitude fixed at the hit: base x setting x severity
  ax: number;           // unit direction, pitch component
  ay: number;           // unit direction, yaw component
}

// Starts a sway for one hit. hitFraction = health lost / max health; hitPoints = health lost.
function startSway(hitFraction: number, hitPoints: number, setting: Setting, nowMs: number, rnd: () => number): Sway | null {
  if (hitFraction <= 0.02) return null;                      // ignore hits under 2 percent of max health
  const piScalar = 5 + Math.floor(hitFraction * 5);          // longer sway for bigger hits, steps of 20 percent
  const severity = Math.min(1, Math.max(0.015, hitPoints * 0.015)); // fixed for the whole sway (see simplified line)
  const dir = rnd() * 2 * Math.PI;
  return {
    startMs: nowMs,
    timerStart: piScalar * Math.PI,
    amp: BASE_AMP_DEG * SETTING_SCALE[setting] * severity,
    ax: Math.cos(dir),
    ay: Math.sin(dir),
  };
}

// Angles at a given time. Depends only on elapsed time, so it does not change with frame rate.
function swayAngles(s: Sway, nowMs: number): { pitchDeg: number; yawDeg: number } | null {
  const t = (nowMs - s.startMs) / 1000;
  const timer = s.timerStart - 2 * Math.PI * t;              // counts down at 2 pi rad per second
  if (timer <= 0) return null;                               // finished
  const envelope = timer / s.timerStart;                     // 1 at the hit, 0 at the end
  const a = Math.sin(timer) * s.amp * envelope;
  return { pitchDeg: a * s.ax, yawDeg: a * s.ay };
}

// Smoke test
const hit = startSway(0.2, 20, 'veryHigh', 0, () => 0.25);
const angles = hit ? swayAngles(hit, 500) : null;
const none = startSway(0.01, 1, 'veryHigh', 0, () => 0.5);
export {};
