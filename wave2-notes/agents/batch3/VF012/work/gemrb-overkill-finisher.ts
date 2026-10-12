// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type DamageKind =
  | "crushing" | "piercing" | "slashing"
  | "acid" | "cold" | "electricity" | "fire"
  | "poison" | "magic" | "missile" | "stunning";

// Data table (designer-editable): the real chunk threshold past current HP per damage kind.
// Donor value = dmginfo CHUNKING column (8 crushing, 5 elemental) plus one, which the donor adds in code. 0 = never chunks.
const CHUNK_THRESHOLD: Record<DamageKind, number> = {
  crushing: 9, piercing: 9, slashing: 9,
  acid: 6, cold: 6, electricity: 6, fire: 6,
  poison: 0, magic: 0, missile: 0, stunning: 0,
};

// Engine constants (not data in the donor): PC chunk margin and the blood tier breakpoints.
const PC_CHUNK_LIMIT = 20;
const BLOOD_TIER_1 = 10; // damage below this: tier 0 (small)
const BLOOD_TIER_2 = 20; // damage below this: tier 1 (medium), else tier 2 (large)

interface Target {
  hp: number;               // current hit points before this hit
  isPc: boolean;
  chunkingAllowed: boolean; // folds in the donor's CanGetChunked rule (min HP, disable flag, party/difficulty)
}

interface HitOutcome {
  damage: number;   // after the frozen/petrified override
  chunked: boolean; // overkill finisher: the death uses the chunk presentation
  killed: boolean;
  bloodTier: number;
  hpAfter: number;
}

function resolveHit(t: Target, kind: DamageKind, raw: number, frozenOrPetrified: boolean): HitOutcome {
  let damage = raw;
  let chunked = false;
  let allow = t.chunkingAllowed;

  if (damage > 0) {
    if (frozenOrPetrified && allow) {
      damage = 123456; // any hit on a frozen or petrified target shatters it
      chunked = true;
    }
    if (CHUNK_THRESHOLD[kind] === 0) allow = false; // 0 turns chunking off for this kind
    const limit = t.isPc ? PC_CHUNK_LIMIT : CHUNK_THRESHOLD[kind];
    if (damage >= t.hp + limit && allow) chunked = true;
  }

  const killed = damage > t.hp;
  const tier = damage < BLOOD_TIER_1 ? 0 : damage < BLOOD_TIER_2 ? 1 : 2;
  return { damage, chunked, killed, bloodTier: tier, hpAfter: t.hp - damage };
}

// Client view of a chunked death: a fixed set of body-part copies flung out at random offsets, each expiring after
// about half a round with a small random jitter. Values are the donor's, kept as named constants.
const CHUNK_PARTS = 7;
const CHUNK_OFFSET_PX: [number, number] = [5, 40];
const CHUNK_LIFE_JITTER = 30;

function chunkCopies(roundTicks: number, rnd: () => number): { offsetPx: number; lifeTicks: number }[] {
  const out: { offsetPx: number; lifeTicks: number }[] = [];
  for (let i = 0; i < CHUNK_PARTS; i++) {
    const [lo, hi] = CHUNK_OFFSET_PX;
    const offsetPx = lo + Math.floor(rnd() * (hi - lo + 1));
    const jitter = Math.floor(rnd() * (2 * CHUNK_LIFE_JITTER + 1)) - CHUNK_LIFE_JITTER;
    out.push({ offsetPx, lifeTicks: Math.floor(roundTicks / 2) + jitter });
  }
  return out;
}

export {};
