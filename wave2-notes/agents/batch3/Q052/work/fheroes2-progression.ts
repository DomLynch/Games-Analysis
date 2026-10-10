// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type PrimaryStat = "attack" | "defense" | "power" | "knowledge";
type Level = 0 | 1 | 2 | 3; // 0 not known, 1 basic, 2 advanced, 3 expert

interface FactionTable {
  magical: boolean;
  boundaryLevel: number; // low-level primary weights apply while level < boundaryLevel
  primaryLow: Record<PrimaryStat, number>;
  primaryHigh: Record<PrimaryStat, number>;
  secondary: Record<string, number>; // race weight per secondary skill name
}

interface HeroState {
  id: number;
  xp: number;
  primary: Record<PrimaryStat, number>;
  secondary: Map<string, Level>; // known skills only
}

interface LevelUpChoice {
  primary?: PrimaryStat;
  offer: [string | undefined, string | undefined];
  picked?: string;
}

const PRIMARY_ORDER: PrimaryStat[] = ["attack", "defense", "power", "knowledge"];
const SECONDARY_ORDER: string[] = ["archery", "ballistics", "diplomacy", "eagleeye", "estates", "leadership", "logistics", "luck", "mysticism", "navigation", "necromancy", "pathfinding", "scouting", "wisdom"];
const MAX_SECONDARY = 8;
const WISDOM_CADENCE = 3;

// XP at which level n+1 starts (index = n). Above the table: next = prev + round((prev - prevPrev) * 1.2 / 100) * 100.
const XP_TABLE: number[] = [0, 1000, 2000, 3200, 4500, 6000, 7700, 9000, 11000, 13200, 15500, 18500, 22100, 26400, 31600, 37800, 45300, 54200, 65000, 78000, 93600, 112300, 134700, 161600, 193900, 232700, 279300, 335200, 402300, 482800, 579400, 695300, 834400, 1001300, 1201600, 1442000, 1730500, 2076700, 2492100, 2990600];

function thresholdFor(level: number): number {
  if (level < XP_TABLE.length) return XP_TABLE[level];
  const l1 = thresholdFor(level - 1);
  const l2 = thresholdFor(level - 2);
  return l1 + Math.round(((l1 - l2) * 1.2) / 100) * 100;
}

function levelFromXp(xp: number): number {
  for (let lvl = 1; lvl < 255; lvl++) {
    if (xp < thresholdFor(lvl)) return lvl;
  }
  return 0;
}

// Stand-in for the donor's hash combine (the donor uses std::hash, which is implementation-defined).
function mix(seed: number, v: number): number {
  let h = (seed ^ Math.imul(v | 0, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca77) >>> 0;
  return (h ^ (h >>> 13)) >>> 0;
}

// Seeds depend on world seed, hero identity, race and current stats: deterministic per hero state, varies with progress.
function levelUpSeeds(worldSeed: number, h: HeroState, race: number): [number, number, number, number] {
  let s = mix(worldSeed >>> 0, h.id);
  s = mix(s, race);
  for (const stat of PRIMARY_ORDER) s = mix(s, h.primary[stat]);
  for (const name of SECONDARY_ORDER) s = mix(s, h.secondary.get(name) ?? 0);
  return [s, (s + 1) >>> 0, (s + 2) >>> 0, (s + 3) >>> 0];
}

// Stand-in for the donor's seeded weighted queue. The donor uses PCG32 with an unbiased bounded draw, not a modulo.
function pickWeighted<T>(items: { value: T; weight: number }[], seed: number): T | undefined {
  const live = items.filter((i) => i.weight > 0);
  if (live.length === 0) return undefined;
  const sum = live.reduce((t, i) => t + i.weight, 0);
  let r = (seed >>> 0) % sum;
  for (const it of live) {
    if (r < it.weight) return it.value;
    r -= it.weight;
  }
  return undefined;
}

function pickPrimary(f: FactionTable, level: number, seed: number): PrimaryStat | undefined {
  const w = level < f.boundaryLevel ? f.primaryLow : f.primaryHigh;
  return pickWeighted(PRIMARY_ORDER.map((s) => ({ value: s, weight: w[s] })), seed);
}

// Offers two secondary skills, or none if all are blocked. Wisdom is forced every third total level for magic races.
function offerSecondaries(f: FactionTable, h: HeroState, seed1: number, seed2: number): [string | undefined, string | undefined] {
  const blocked = new Set<string>();
  for (const [name, lvl] of h.secondary) {
    if (lvl === 3) blocked.add(name); // expert skills are never offered again
  }
  const knownCount = [...h.secondary.values()].filter((l) => l > 0).length;
  if (knownCount >= MAX_SECONDARY) {
    for (const name of SECONDARY_ORDER) {
      if (!h.secondary.has(name)) blocked.add(name); // full: only upgrades remain
    }
  }
  const totalLevel = [...h.secondary.values()].reduce<number>((t, l) => t + l, 0);
  const wisdomDue = f.magical && totalLevel % WISDOM_CADENCE === 0 && !blocked.has("wisdom");

  const pool = (extra: Set<string>, seed: number): string | undefined =>
    pickWeighted(
      SECONDARY_ORDER.filter((n) => !blocked.has(n) && !extra.has(n)).map((n) => ({ value: n, weight: f.secondary[n] })),
      seed,
    );

  const first = wisdomDue ? "wisdom" : pool(new Set<string>(), seed1);
  if (first === undefined) return [undefined, undefined];
  const second = pool(new Set<string>([first]), seed2);
  return [first, second];
}

function levelUp(worldSeed: number, f: FactionTable, race: number, h: HeroState, autoselect: boolean): LevelUpChoice {
  const seeds = levelUpSeeds(worldSeed, h, race); // taken before the primary bump, as in the donor
  const primary = pickPrimary(f, levelFromXp(h.xp), seeds[0]);
  if (primary !== undefined) h.primary[primary] += 1;

  const offer = offerSecondaries(f, h, seeds[1], seeds[2]);
  let picked: string | undefined;
  if (autoselect) {
    if (offer[0] !== undefined && offer[1] !== undefined) picked = seeds[3] % 2 === 1 ? offer[0] : offer[1];
    else picked = offer[0] ?? offer[1];
  }
  if (picked !== undefined) {
    const lvl = h.secondary.get(picked) ?? 0;
    h.secondary.set(picked, Math.min(3, lvl + 1) as Level);
  }
  return { primary, offer, picked };
}

// Grants XP and runs one level-up per level crossed, each evaluated at its own threshold level.
function gainXp(worldSeed: number, f: FactionTable, race: number, h: HeroState, amount: number, autoselect: boolean): LevelUpChoice[] {
  const oldLevel = levelFromXp(h.xp);
  const newLevel = levelFromXp(h.xp + amount);
  const updated = h.xp + amount;
  const log: LevelUpChoice[] = [];
  for (let lvl = oldLevel; lvl < newLevel - 1; lvl++) {
    h.xp = thresholdFor(lvl);
    log.push(levelUp(worldSeed, f, race, h, autoselect));
  }
  h.xp = updated;
  if (newLevel > oldLevel) log.push(levelUp(worldSeed, f, race, h, autoselect));
  return log;
}
export {};
