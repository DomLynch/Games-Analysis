// Licence: LGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
// Angles: 2048 units per full turn (donor TrigLut). Ranges are donor map units.
const FULL_TURN = 2048;
const HALF_PI = 512;
const PI = 1024;
const QUARTER_PI = 256;
const TIER_RANGE = [0, 1024, 2560, 5120, 10240]; // index = hostility tier (0 friendly, 4 long)
const PARTY_TIER = 4;                              // hostile monsters look at the party at the longest tier

interface Body { x: number; y: number; z: number; }
interface Foe extends Body { id: number; alive: boolean; }
interface Mob extends Body { id: number; tier: number; hp: number; maxHp: number; kind: "normal" | "aggressive" | "wimp"; }

type Target = { kind: "foe"; id: number } | { kind: "party" } | null;

// Nearest foe inside the mob's tier box that it can see; the party is considered last, at PARTY_TIER.
function selectTarget(self: Mob, foes: Foe[], party: Body, partyVisible: boolean, sees: (f: Foe) => boolean): Target {
  const range = TIER_RANGE[self.tier];
  let best: Target = null;
  let bestD2 = Infinity;
  for (const f of foes) {
    if (!f.alive || f.id === self.id) continue;
    const dx = Math.abs(f.x - self.x), dy = Math.abs(f.y - self.y), dz = Math.abs(f.z - self.z);
    if (dx > range || dy > range || dz > range) continue;
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 < bestD2 && sees(f)) { bestD2 = d2; best = { kind: "foe", id: f.id }; }
  }
  if (partyVisible) {
    const pr = TIER_RANGE[PARTY_TIER];
    const dx = Math.abs(party.x - self.x), dy = Math.abs(party.y - self.y), dz = Math.abs(party.z - self.z);
    const d2 = dx * dx + dy * dy + dz * dz;
    if (dx <= pr && dy <= pr && dz <= pr && d2 < bestD2) best = { kind: "party" };
  }
  return best;
}

// Flee below a share of base hp for normal and aggressive types; wimps flee at any hp.
function wantsToFlee(m: Mob, distanceToTarget: number): boolean {
  if (m.kind === "wimp") return true;
  const share = m.kind === "normal" ? 0.2 : 0.1;
  return m.maxHp * share > m.hp && distanceToTarget < TIER_RANGE[4];
}

// Flee heading: target yaw + a quarter turn + a random half turn, so it spreads over the 90 degrees either side of straight away.
function fleeYaw(targetYaw: number, rnd: () => number): number {
  return (targetYaw + HALF_PI + Math.floor(rnd() * PI)) & (FULL_TURN - 1);
}

// Pursue heading: aim at the target with a random 45-degree wobble to either side.
function pursueYaw(targetYaw: number, rnd: () => number): number {
  return (targetYaw + (rnd() < 0.5 ? QUARTER_PI : -QUARTER_PI)) & (FULL_TURN - 1);
}

export {};
