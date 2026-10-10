// Licence: AGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface SkillCount { id: string; actions: number; }

// Share of one player's XP pool per skill: pool x (actions in that skill / all known actions). Unknown skills are skipped.
function splitPoolBySkill(pool: number, skills: SkillCount[]): Record<string, number> {
  const known = skills.filter((s) => s.id !== 'unknown');
  const total = known.reduce((a, s) => a + s.actions, 0);
  const out: Record<string, number> = {};
  if (total === 0) return out;
  for (const s of known) out[s.id] = (pool * s.actions) / total;
  return out;
}

// Newbie scaling of the level delta: multiply by floor(50 / min(50, skill + 10)), integer division, minimum 10 when zero.
function scaleDeltaForNewbies(delta: number, skillBase: number): number {
  const minimum = Math.min(50, skillBase + 10) || 10;
  return delta * Math.floor(50 / minimum);
}

// Per-player XP for one creature kill: the creature's XP value times the difficulty factor, divided by the team term,
// then capped per player. The team term is 1 + (members - 1) x 0.9 (a data constant in the donor).
function perPlayerXp(difficultyFactor: number, creatureXp: number, teamSize: number, cap: number): number {
  const divisor = 1 + (Math.max(1, teamSize) - 1) * 0.9;
  return Math.min(cap, (difficultyFactor * creatureXp) / divisor);
}

interface Contributor { team: string | null; player: string; damage: number; skill: number; }

// Winner takes the kill: the group (team, or a lone player) with the most total damage. Its highest skill sets the delta.
function winningGroup(contributors: Contributor[]): Contributor[] {
  const totals = new Map<string, { sum: number; members: Contributor[] }>();
  for (const c of contributors) {
    const key = c.team ?? c.player;
    const entry = totals.get(key) ?? { sum: 0, members: [] };
    entry.sum += c.damage;
    entry.members.push(c);
    totals.set(key, entry);
  }
  let best: { sum: number; members: Contributor[] } | undefined;
  for (const e of totals.values()) if (!best || e.sum > best.sum) best = e;
  return best ? best.members : [];
}

// Distance gate: a member farther than maxDist gets no XP unless it is on the creature's aggro list.
function gatedFactor(factor: number, dist: number, maxDist: number, onAggroList: boolean): number {
  return dist > maxDist && !onAggroList ? 0 : factor;
}

export {};
