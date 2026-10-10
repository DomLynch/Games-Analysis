// Licence: GPL-3.0 with Electronic Arts additional terms (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
const STRAY = 2;                                   // cells; the donor's STRAY_DISTANCE (TIBERIANDAWN/TEAM.H 47)

interface Unit { id: number; x: number; y: number; initiated: boolean; alive: boolean; mission: "move" | "guard" | "attack"; }

interface Group {
  priority: number;                                // RecruitPriority: higher may take members from lower groups
  desired: number;                                 // wanted headcount for this single unit type
  reinforcable: boolean;
  hasBeen: boolean;                                // reached full strength once
  members: Unit[];
  moving: boolean;
  target: number | null;
}

// The centre is the average of arrived (initiated) members only.
function centreOf(g: Group): { x: number; y: number } | null {
  const arrived = g.members.filter(u => u.initiated && u.alive);
  if (arrived.length === 0) return null;
  let sx = 0;
  let sy = 0;
  for (const u of arrived) { sx += u.x; sy += u.y; }
  return { x: Math.floor(sx / arrived.length), y: Math.floor(sy / arrived.length) };
}

// A reinforcable group counts as under strength only at or below a third of its desired headcount.
function underStrength(g: Group): boolean {
  if (g.reinforcable) return g.members.length <= Math.floor(g.desired / 3);
  return !g.hasBeen;
}

// A unit can leave its current group only if this group has the higher priority.
function addMember(g: Group, u: Unit, from: Group | null): boolean {
  if (from && from.priority >= g.priority) return false;
  if (g.members.length >= g.desired) return false;
  u.initiated = g.members.length === 0;            // the first member is the captain
  g.members.push(u);
  return true;
}

// If no arrived member is left, the first remaining member becomes the captain.
function removeMember(g: Group, id: number): void {
  g.members = g.members.filter(u => u.id !== id);
  if (g.members.length > 0 && !g.members.some(u => u.initiated)) g.members[0].initiated = true;
}

// Regroup: far members walk to the centre; members that arrive are marked and hold.
// Returns true when every living member is within STRAY of the centre.
function regroupStep(g: Group, cx: number, cy: number): boolean {
  let allHere = true;
  for (const u of g.members) {
    if (!u.alive) continue;
    const d = Math.max(Math.abs(u.x - cx), Math.abs(u.y - cy));   // Chebyshev, a stand-in for the donor's distance
    if (d > STRAY) { u.mission = "move"; allHere = false; }
    else { u.initiated = true; u.mission = "guard"; }
  }
  return allHere;
}

// A hit on a member retargets a moving group, unless the current target is armed and in range of the centre.
function tookDamage(g: Group, attacker: number, attackerIsMember: boolean,
                    targetArmedInRange: (t: number) => boolean): void {
  if (!g.moving || attackerIsMember) return;
  if (g.target !== null && g.target !== attacker && targetArmedInRange(g.target)) return;
  g.target = attacker;
}
export {};
