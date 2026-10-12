type Attitude = "friendly" | "hostile" | "neutral";
interface Speaker {
  attitude: Attitude;
  speaksFlag: boolean;     // donor: M_SPEAKS class flag or a name
  quadruped: boolean;
  unique: boolean;
  bandFollower: boolean;
  allyOfPlayer: boolean;   // donor: wont_attack()
  fleeing: boolean;
  confused: boolean;
  silenced: boolean;
  related: boolean;        // same genus as the foe or the player
  questTag?: string;       // quest-state prefix, e.g. "orb" while carrying the win item
}

// Donor chance math, per monster move: one-in-N roll on a base of 21.
function barkChance(s: Speaker): number {
  let chance = 21;
  if (s.unique) chance -= 9;
  if (s.allyOfPlayer) chance *= 15;
  else if (!s.unique && s.bandFollower) chance *= 10;
  if (s.fleeing) chance = Math.floor(chance / 2);
  if (s.confused) chance = Math.floor(chance / 2);
  return chance;
}

const oneIn = (n: number, rnd: () => number): boolean => n >= 1 && Math.floor(rnd() * n) === 0;

function shouldBark(s: Speaker, rnd: () => number): boolean {
  const chance = barkChance(s);
  if (s.speaksFlag && oneIn(chance, rnd)) return true;
  if (s.quadruped && oneIn(chance * 4, rnd)) return true;
  return false;
}

function contextPrefixes(s: Speaker): string[] {
  const p: string[] = [s.attitude];
  if (s.fleeing) p.push("fleeing");
  if (s.confused) p.push("confused");
  if (s.silenced) p.push("silenced");
  if (s.related) p.push("related");
  if (s.questTag) p.push(s.questTag);
  return p;
}

// All ordered combinations of size r, lexicographic by index (donor loop order).
function combos(xs: string[], r: number): string[][] {
  if (r === 0) return [[]];
  if (xs.length < r) return [];
  const [head, ...rest] = xs;
  return [...combos(rest, r - 1).map((c) => [head, ...c]), ...combos(rest, r)];
}

type Pool = Map<string, string[]>;
function pickFrom(pool: Pool, key: string, rnd: () => number): string | null {
  const lines = pool.get(key);
  if (!lines || lines.length === 0) return null;
  return lines[Math.floor(rnd() * lines.length)];
}

// Donor order: exact full prefix list, then threes, twos, singles, then no prefix.
function pickLine(prefixes: string[], key: string, pool: Pool, rnd: () => number): string | null {
  const exact = pickFrom(pool, [...prefixes, key].join(" "), rnd);
  if (exact !== null) return exact;
  for (const r of [3, 2, 1]) {
    for (const c of combos(prefixes, r)) {
      const hit = pickFrom(pool, `default ${c.join(" ")} ${key}`, rnd);
      if (hit !== null) return hit;
    }
  }
  return pickFrom(pool, `default ${key}`, rnd);
}

// Donor filter (_invalid_msg subset): a line that names the player is rejected when the player is excluded.
function lineAllowed(line: string, noPlayer: boolean, unseen: boolean): boolean {
  if (noPlayer && line.includes("@player")) return false;
  if (unseen && line.includes("VISUAL")) return false;
  return true;
}

// Fixed retry cap: a rejected line counts as a try; the donor's tries-- does not.
function chooseLine(
  prefixes: string[], key: string, pool: Pool, rnd: () => number, noPlayer: boolean, unseen: boolean,
): string | null {
  for (let tries = 0; tries < 10; tries++) {
    const line = pickLine(prefixes, key, pool, rnd);
    if (line === null) return null;
    if (lineAllowed(line, noPlayer, unseen)) return line;
  }
  return null;
}
export {};
