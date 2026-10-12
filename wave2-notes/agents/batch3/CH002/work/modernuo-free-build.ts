// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type RaceId = "human" | "elf" | "gargoyle";

interface RaceAppearance {
  id: RaceId;
  skinMin: number;   // inclusive clamp range for skin hue (Human rule)
  skinMax: number;
}

interface SkillPick {
  name: string;
  value: number;     // 0..50
}

interface BuildInput {
  race: RaceAppearance;
  newClient: boolean;
  stats: [number, number, number];   // str, dex, int
  skills: SkillPick[];
  skinHue: number;
  name: string;
}

type Refusal =
  | "stat-range"
  | "stat-total"
  | "skill-cap"
  | "skill-not-allowed"
  | "skill-duplicate"
  | "skill-total"
  | "name";

type BuildResult =
  | { ok: true; skinHue: number; stats: [number, number, number]; granted: SkillPick[]; name: string }
  | { ok: false; reason: Refusal };

const STAT_MIN = 10;
const STAT_MAX = 60;
const STAT_BUDGET_NEW = 90;
const STAT_BUDGET_OLD = 80;
const SKILL_CAP = 50;
const SKILL_TOTALS = [100, 120];
// simplified: the donor list has 55 names; four are kept here for the sketch.
const ALLOWED_SKILLS = new Set(["Tactics", "Swords", "Healing", "Wrestling"]);
// simplified: the donor's race-specific removals (Archery for gargoyles, Throwing for others) are
// not modelled; here any skill outside the whitelist is refused instead of zeroed.

// The name rule allows letters first, then letters, space, dash, period and apostrophe.
// simplified: the donor's disallowed-word list and start-prefix list are not included.
const NAME_RE = /^[A-Za-z][A-Za-z .'-]*$/;
const START_BLOCKED = /^(seer|counselor|gm|admin|lady|lord)/i;

function validName(raw: string): string | null {
  const name = raw.trim();
  if (name.length < 2 || name.length > 16) return null;
  if (!NAME_RE.test(name)) return null;
  if (/[ .'-]{2}/.test(name)) return null;      // at most one exception character in a row
  if (START_BLOCKED.test(name)) return null;
  return name;
}

export function validateBuild(b: BuildInput): BuildResult {
  const budget = b.newClient ? STAT_BUDGET_NEW : STAT_BUDGET_OLD;
  const [str, dex, int] = b.stats;

  for (const s of [str, dex, int]) {
    if (s < STAT_MIN || s > STAT_MAX) return { ok: false, reason: "stat-range" };
  }
  if (str + dex + int !== budget) return { ok: false, reason: "stat-total" };

  const granted: SkillPick[] = [];
  const seen = new Set<string>();
  let total = 0;
  for (const pick of b.skills) {
    if (pick.value > SKILL_CAP) return { ok: false, reason: "skill-cap" };
    if (!ALLOWED_SKILLS.has(pick.name)) return { ok: false, reason: "skill-not-allowed" };
    if (pick.value === 0) continue;
    if (seen.has(pick.name)) return { ok: false, reason: "skill-duplicate" };
    seen.add(pick.name);
    total += pick.value;          // fix: every chosen point is granted, so the budget cannot leak
    granted.push(pick);
  }
  if (!SKILL_TOTALS.includes(total)) return { ok: false, reason: "skill-total" };

  const name = validName(b.name);
  if (name === null) return { ok: false, reason: "name" };   // fix: refuse, do not replace with a default

  // fix: skin is clipped with the chosen race, and every race has a range (donor Gargoyle is unclipped)
  const skinHue = Math.min(b.race.skinMax, Math.max(b.race.skinMin, b.skinHue & 0x3fff)) | 0x8000;

  return { ok: true, skinHue, stats: [str, dex, int], granted, name };
}

export {};
