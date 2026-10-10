// Licence: MIT (donor: SCAR by max-su-2019, 2023). Adapted shape; this sketch is written from the mechanism, not a translation of the donor lines.
// An attack option is authored on the attack's own timeline: a window, a weight, a chance, a cone and reach, a cooldown.

interface AttackOption {
  name: string;
  weight: number;        // sort key: higher is tried first (donor: the annotation time)
  windowStart: number;   // seconds into the attack timeline
  windowEnd: number;
  chancePct: number;     // 0..100
  minDist: number;       // units
  maxDist: number;       // units, before reach is added
  coneStartDeg: number;  // measured from the forward axis; a start above the end wraps through behind
  coneEndDeg: number;
  cooldownKey?: string;  // options may share a cooldown by name
}

// Target measured in the attacker's frame: planar distance and angle from forward.
interface Geometry { dist: number; angleRad: number; reach: number; }

function inCone(g: Geometry, o: AttackOption): boolean {
  const s = (o.coneStartDeg * Math.PI) / 180;
  const e = (o.coneEndDeg * Math.PI) / 180;
  const inAngle = s < e ? g.angleRad >= s && g.angleRad <= e : !(g.angleRad >= e && g.angleRad <= s);
  return g.dist <= o.maxDist + g.reach && g.dist >= o.minDist && inAngle;
}

// First option that passes wins. Order: window, then chance, then geometry, then cooldown.
function pickAttack(timeNow: number, options: AttackOption[], g: Geometry, roll: () => number,
                    coolingDown: (key: string) => boolean): AttackOption | null {
  const ordered = [...options].sort((a, b) => b.weight - a.weight);
  for (const o of ordered) {
    if (timeNow < o.windowStart || timeNow > o.windowEnd) continue;
    if (o.chancePct < roll()) continue;              // roll is 0..100, and it is drawn before geometry
    if (!inCone(g, o)) continue;
    if (o.cooldownKey !== undefined && coolingDown(o.cooldownKey)) continue;
    return o;
  }
  return null;
}

// Combo continuation: the event payload is a percent. An empty payload means always; a non-number reads as 0.
function continueCombo(payload: string, roll: () => number): boolean {
  if (payload === "") return true;
  const pct = parseInt(payload, 10) || 0;
  return pct >= roll();
}

export {};
