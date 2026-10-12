// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Sex = 1 | 2;                       // 1 male, 2 female (as stored by the gender step)

interface FamilyInput {
  stored: number;                       // stored body key; 0x2000 means "still in chargen"
  raceOffset: number;                   // from the race table, 0..5
  classPrefix: number;                  // from the class table, bits 8..10
  sex: Sex;
  armourTier: number;                   // 0..3, one model per tier
}

type Model = { ok: true; model: string } | { ok: false; reason: string };

const BASE_KEY = 0x6000;
const CHARGEN_SENTINEL = 0x2000;
const FEMALE_OFFSET = 0x10;

// simplified: two families are kept; the donor table has about 100 rows, several
// with four tier columns each, and a SIZE column that is not used here.
const MODELS = new Map<number, string[]>([
  [0x6000, ["CHMC1INV", "CHMC2INV", "CHMC3INV", "CHMC4INV"]],
  [0x6010, ["CHFC1INV", "CHFC2INV", "CHFC3INV", "CHFC4INV"]],
]);

// Derived key: base + race + class prefix + sex. Donor adds the parts in this order (PaperDoll.py 124-133).
function deriveKey(raceOffset: number, classPrefix: number, sex: Sex): number {
  return BASE_KEY + raceOffset + classPrefix + (sex === 2 ? FEMALE_OFFSET : 0);
}

export function resolveModel(f: FamilyInput): Model {
  // Donor: a stored key is used as is; only the chargen sentinel triggers derivation.
  const key = f.stored === CHARGEN_SENTINEL ? deriveKey(f.raceOffset, f.classPrefix, f.sex) : f.stored;
  const row = MODELS.get(key);
  // fix: donor prints and returns a guessed name; here the miss is an explicit result.
  if (row === undefined) return { ok: false, reason: `no family ${key.toString(16)}` };
  const model = row[f.armourTier];
  if (model === undefined) return { ok: false, reason: `no tier ${f.armourTier}` };
  return { ok: true, model };
}

// The class prefix must come from the PREFIX column for every path. Donor BG2/EE chargen reads
// column "CLASS" which the shared table does not have (see receipts: avprefc header PREFIX).
export const CLASS_PREFIX_EXAMPLES = { fighter: 0x100, mage: 0x200, thief: 0x300, monk: 0x500, cleric: 0 } as const;

export {};
