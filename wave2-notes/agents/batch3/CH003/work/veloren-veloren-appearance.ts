// Licence: GPL-3.0 (donor, LICENSE "Version 3, 29 June 2007"). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
// simplified: the sketch keeps the donor order (choose species and body type, clamp every index to its count, persist) and adds the fixes listed in the note: a floor at 0, a server-side clamp before persist (the donor's server never calls validate), and a species-aware random eye index. It omits: the skin and eye colour palettes (only their counts are kept), the per-species height scaler table, the starter-weapon whitelist, the profanity filter, the start-site check, the hardcore flag and the database write.
// The count table is DATA. Only the Human row is filled in, with counts read from the donor's count functions (humanoid.rs 382-470) for illustration.

type Species = "danari" | "dwarf" | "elf" | "human" | "orc" | "draugr";
type BodyType = "female" | "male";

interface Appearance {
  species: Species;
  bodyType: BodyType;
  hairStyle: number;
  beard: number;
  accessory: number;
  eyes: number;
  hairColor: number;
  skin: number;
  eyeColor: number;
  heightScale: number; // 0..255
}

interface Counts {
  hairStyle: number;
  beard: number;
  accessory: number;
  eyes: number;
  hairColor: number;
  skin: number;
  eyeColor: number;
}

type CountTable = Partial<Record<Species, Record<BodyType, Counts>>>;

const HUMAN_COUNTS: Record<BodyType, Counts> = {
  female: { hairStyle: 20, beard: 1, accessory: 1, eyes: 6, hairColor: 22, skin: 18, eyeColor: 5 },
  male: { hairStyle: 21, beard: 10, accessory: 1, eyes: 7, hairColor: 22, skin: 18, eyeColor: 5 },
};

const TABLE: CountTable = { human: HUMAN_COUNTS };

const MAX_NAME_CHARS = 20;
const BASE_HEIGHT = 20 / 9;
const HEIGHT_MIN = 0.85;
const HEIGHT_MAX = 1.1;

// Clamp an index into 0..count-1. The donor's validate() only does min(index, count - 1);
// the floor at 0 is added here because a JS number can be negative (the donor uses u8).
function clampIndex(value: number, count: number): number {
  return Math.max(0, Math.min(value, count - 1));
}

// Donor validate(): every index clamped to its count for the current species and body type.
// The client calls this after each control change; the donor server never calls it.
function validate(a: Appearance, c: Counts): Appearance {
  return {
    ...a,
    hairStyle: clampIndex(a.hairStyle, c.hairStyle),
    beard: clampIndex(a.beard, c.beard),
    accessory: clampIndex(a.accessory, c.accessory),
    eyes: clampIndex(a.eyes, c.eyes),
    hairColor: clampIndex(a.hairColor, c.hairColor),
    skin: clampIndex(a.skin, c.skin),
    eyeColor: clampIndex(a.eyeColor, c.eyeColor),
  };
}

// Donor RandomizeCharacter: each index uniform in 0..count-1, height is a full byte.
// Fix: eyes uses its own count (the donor's random_with used 0..1, so eyes was always 0).
function randomise(a: Appearance, c: Counts, rng: () => number): Appearance {
  const pick = (n: number): number => Math.floor(rng() * n);
  return {
    ...a,
    hairStyle: pick(c.hairStyle),
    beard: pick(c.beard),
    accessory: pick(c.accessory),
    eyes: pick(c.eyes),
    hairColor: pick(c.hairColor),
    skin: pick(c.skin),
    eyeColor: pick(c.eyeColor),
    heightScale: pick(256),
  };
}

// Height: a lerp over 0.85..1.1 by heightScale/255, times the base and a species/body scaler.
function heightOf(a: Appearance, scaler: number): number {
  const t = a.heightScale / 255;
  const heightScale = HEIGHT_MIN + (HEIGHT_MAX - HEIGHT_MIN) * t;
  return BASE_HEIGHT * scaler * heightScale;
}

type CreateResult = { ok: true; body: Appearance } | { ok: false; error: string };

// Server gate, before persist. Fix over the donor: indices are clamped here, not trusted.
function createCharacter(name: string, a: Appearance, table: CountTable): CreateResult {
  if ([...name].length > MAX_NAME_CHARS) {
    return { ok: false, error: "That name is too long" };
  }
  const c = table[a.species]?.[a.bodyType];
  if (c === undefined) {
    return { ok: false, error: "Unknown species or body type" };
  }
  return { ok: true, body: validate(a, c) };
}

// Usage with the Human row only.
const sample: Appearance = {
  species: "human",
  bodyType: "male",
  hairStyle: 99,
  beard: 0,
  accessory: 0,
  eyes: 0,
  hairColor: 3,
  skin: 40,
  eyeColor: 1,
  heightScale: 128,
};
const created = createCharacter("Kestrel", sample, TABLE);
if (created.ok) {
  const h = heightOf(created.body, 1.05);
  void h;
}
const rng = (): number => 0.5;
void randomise(sample, HUMAN_COUNTS.male, rng);

export {};
