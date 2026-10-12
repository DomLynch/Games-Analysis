// Licence: none declared in the donor (clean-room). Sketch written from the described mechanism, not a translation of donor lines.
interface BodyFamily {
  id: string;
  model: string;          // resolved on the server; unknown ids fall back
  handsModel: string;
  handsBody: string;      // one digit per bodygroup slot, e.g. "0000000"
  groupCounts: number[];  // number of variants per bodygroup slot
}

const FALLBACK_ID = 'default';

interface Appearance {
  familyId: string;
  skin: number;
  slots: string;                       // space-separated, one number per slot (client-supplied)
  primary: [number, number, number];   // each 0..1
  weapon: [number, number, number];    // donor default exceeds 1 on two channels
}

interface Resolved {
  family: string;
  model: string;
  skin: number;
  slots: number[];
  primary: [number, number, number];
  weapon: [number, number, number];
}

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

function resolve(families: Map<string, BodyFamily>, a: Appearance): Resolved {
  const fam = families.get(a.familyId) ?? families.get(FALLBACK_ID);
  if (fam === undefined) throw new Error('no fallback body family');
  const parts = a.slots.trim() === '' ? [] : a.slots.split(' ');
  // Fix: each slot is range-checked against the family's variant count; anything else becomes 0.
  const slots = fam.groupCounts.map((count, k) => {
    const v = Number(parts[k]);
    return Number.isInteger(v) && v >= 0 && v < count ? v : 0;
  });
  // Donor default weapon tint is 0.30 1.80 2.10 although its help text says 0-1: this keeps a 0-3 range.
  const clampTint = (x: number): number => Math.min(3, Math.max(0, x));
  let weapon: [number, number, number] = [clampTint(a.weapon[0]), clampTint(a.weapon[1]), clampTint(a.weapon[2])];
  // Donor keeps the weapon tint from being exactly zero (reason not read); the same floor is kept here.
  if (Math.hypot(weapon[0], weapon[1], weapon[2]) < 0.001) weapon = [0.001, 0.001, 0.001];
  return {
    family: fam.id,
    model: fam.model,
    skin: Math.max(0, Math.trunc(a.skin)),
    slots,
    primary: [clamp01(a.primary[0]), clamp01(a.primary[1]), clamp01(a.primary[2])],
    weapon,
  };
}

// Hands use the digit-string form (one character per slot), a different format from the space-separated player cvar.
function parseHandsBody(s: string, count: number): number[] {
  return Array.from({ length: count }, (_, k) => (s.charAt(k) === '1' ? 1 : 0));
}

export {};
