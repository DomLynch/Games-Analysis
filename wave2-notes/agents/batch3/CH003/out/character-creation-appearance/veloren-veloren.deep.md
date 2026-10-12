# veloren-veloren (character-creation-appearance, cell 2)

Donor: `/mnt/frankendom-donors/veloren-veloren/common/src/comp/body/humanoid.rs` | Licence: GNU GPL version 3 (LICENSE file: "GNU GENERAL PUBLIC LICENSE, Version 3, 29 June 2007"; clean-room only) | Rust | symbol `Body` (humanoid.rs:12) with `validate` (humanoid.rs:84)

Checked: Read in full: the `humanoid::Body` struct (12-35), `random_with` (66-82), `validate` (84-96), `height_scale`/`height`/`scaler` (98-125), and the server creation file `server/src/character_creator.rs` (141 lines). Read in part: the `CreateCharacter` handler in `server/src/sys/msg/character_screen.rs` (167-240), the client menu (`voxygen/src/menu/char_selection/ui.rs` 1902-1992, not the whole file), the per-species count tables (humanoid.rs 353-470, all of them), and the figure loader lines that pick hair and skin (`voxygen/src/scene/figure/load.rs` 339-369). Not read: the skin and eye palettes and the `Skin`/`EyeColor` enums (humanoid.rs 190-324 and 483-595, only their array lengths were read), the bodies of `recolor_grey` (load.rs 117) and `color_segment` (load.rs 277), and the database conversion of the body. Depth thin. Confidence high on the clamp and the creation path; medium on the render side. Searched by grep for `.validate()`, `scar` and `character creat` across `server/src`, `common/src`, `voxygen/src`.

## 1. Mechanism

- Creation order on the server. The client sends `CreateCharacter` with alias, main hand, off hand, body, hardcore flag and start site (`character_screen.rs` 167-177). The handler then checks, in order: the name length (178; limit 20 characters, `common/src/character.rs` 12-16), the profanity filter (182), and, only in a build with the `worldgen` feature, that the start site is in `possible_starting_sites` (194). Without that feature a fixed centre waypoint is used (the `cfg(not(feature = "worldgen"))` branch). Then `create_character` (236) runs: name check again, body must be the humanoid variant (`character_creator.rs` 50), the weapon pair must be one of the seven starter rows (11-19, the first row is an empty pair), the loadout is built from defaults, a potion, a cheese and a recipe group are pushed, and `SkillSet::default()` is used (66). The body is passed through unchanged. The server never calls `validate()`.
- The appearance model. A humanoid body is a species (six values), a body type (female or male), seven index bytes (`hair_style`, `beard`, `eyes`, `accessory`, `hair_color`, `skin`, `eye_color`) and one height byte (`height_scale`) (humanoid.rs 12-33).
- Counts. Each index has a count that depends on species and body type, held in `match` tables (353-470). Human, female and male: hair styles 20 and 21 (390-391), beards 1 and 10 (444 for male), accessories 1 and 1, eyes 6 and 7, hair colours 22 (358), skin colours 18 (`HUMAN_SKIN_COLORS` at 235), eye colours 5. Every beard count is at least 1, so `count - 1` cannot underflow.
- `validate()` (84-96). For each index, `index = min(index, count - 1)`, using the count for the current species and body type. Called by the client after every change of body type (1908), species (1914), and each slider (1980-2022).
- Randomise (client, ui.rs 1943-1955). Each index is drawn uniformly from `0..count` for the chosen species and body type. Species and body type are not randomised (the TODO at 1943). Height is a full byte. The server never does this.
- Height (98-106). `height_scale()` is a lerp over 0.85..1.1 by `value / 255`. `height() = 20/9 * scaler * height_scale`. The scaler is a per-species, per-body table (108-125): Human male 1.05, Human female 0.99 (read in the table).
- Draw (load.rs). Skin colour is the species palette entry at the skin index; an out-of-range index falls back to `Skin::HumanThree` (humanoid.rs 364-368; `skin_rgb` at load.rs 339). Hair comes from a per-style spec list indexed by `hair_style`; a missing spec logs a warning and draws no hair (load.rs 362-369). Hair colour recolours a grey texture (`recolor_grey` at load.rs 117; body not read).

## 2. Key functions

- `humanoid::Body` struct: `/mnt/frankendom-donors/veloren-veloren/common/src/comp/body/humanoid.rs` 12-35.
- `Body::validate`: humanoid.rs 84-96 (clamps seven indices to their counts).
- `Body::random_with`: humanoid.rs 66-82 (draws each index from the species count, except `eyes`, which is always 0, see Gaps).
- Count tables: humanoid.rs `num_hair_colors` 353, `skin_color` 364, `num_hair_styles` 382, `num_accessories` 399, `num_eyes` 418, `num_beards` 435.
- Server gate: `/mnt/frankendom-donors/veloren-veloren/server/src/character_creator.rs` 32-100 (`create_character`), and the handler `/mnt/frankendom-donors/veloren-veloren/server/src/sys/msg/character_screen.rs` 178-240.
- Client: `/mnt/frankendom-donors/veloren-veloren/voxygen/src/menu/char_selection/ui.rs` 1902 (name truncation to 20 characters), 1908-1914 (validate after type and species), 1943-1955 (randomise), 1980-2022 (validate after each slider).
- Render: `/mnt/frankendom-donors/veloren-veloren/voxygen/src/scene/figure/load.rs` 339 (skin), 362-369 (hair).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Clamp each index to count minus one, per family | Human female/male: hair 20/21 (humanoid.rs 390-391), beard 1/10 (444), accessory 1/1, eyes 6/7 (426 and the male row), hair colour 22 (358), skin 18 (235), eye colour 5 (301) |
| Height as a lerp over a byte | Range 0.85..1.1 (humanoid.rs 39); divisor 255 (98-104) |
| Height base times family scaler | Base 20/9 (38); scaler per family, Human male 1.05, female 0.99 (108-125) |
| Name cap | 20 characters (`common/src/character.rs` 12, 16) |
| Starter weapon whitelist | Seven rows, one of them an empty pair (`character_creator.rs` 11-19) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (choose species and body type, clamp every index to its count, persist) and adds three fixes from the Gaps list: a floor at 0 (the donor's u8 cannot go negative, a JS number can), a server-side clamp before persist (the donor's server never calls validate), and a species-aware random eye index. It omits the skin and eye colour palettes (only their counts are kept), the per-species height scaler table, the starter weapon whitelist, the profanity filter, the start-site check, the hardcore flag and the database write. The count table is data; only the Human row is filled, copied from the donor's count functions for illustration.

```ts
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
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 /tmp/veloren-veloren-appearance.ts` on the VPS, exit 0 (run after scp to /tmp).

## 5. Lands in

- TARGET `origins/character/appearance.ts` (proposed path; the Frankendom folder layout was not checked in this pass). It holds the family table (species and body type with the seven counts), the clamp, and the random draw. The client render and the server create path both import it.
- Parity-checklist row 21 (catalogue fields): the counts and the index names become catalogue fields, not code constants.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: server-verified state. The server clamps appearance before persist; the donor does not.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism.
- Defect 1, server does not clamp. No call to `validate()` on a body exists in `server/src`, `common/src` or `voxygen/src` (grep). `create_character` (`character_creator.rs` 32-100) and `edit_character` (96-) check only that the body is humanoid, so an out-of-range index is stored as sent. Fix: clamp in the gate before persist, as `createCharacter` does in the sketch.
- Defect 2, random eye index. `random_with` sets `eyes` from `0..1` (humanoid.rs 77, with a TODO), but the client randomise draws eyes from `num_eyes` (ui.rs 1955). Fix: use the family count everywhere.
- Defect 3, randomise leaves species and body type out (ui.rs 1943 TODO). Fix: include them, then clamp.
- Defect 4, silent fallback. `skin_color` falls back to `HumanThree` (humanoid.rs 368) and `eye_color` to `NobleBlue`, so a bad index is hidden rather than reported. Fix: keep the clamp, but count and log each clamp (clamp-and-report).
- Defect 5, hair colour count. `num_hair_colors` is a hard-coded per-species number with a FIXME that says hair colours are indices, not enum variants (humanoid.rs 348-353). Fix: a per-family colour list as catalogue data.
- Frankendom rule. The counts live in `match` tables in code (353-470). Frankendom wants the catalogue as the runtime source (rows 20-21), so the family table must move to catalogue rows that the server checks at load.
- Class-free start. The donor's only starting choice is a weapon pair from seven rows (`character_creator.rs` 11-19); there is no class. A class-free start can take the same shape: no class, an optional starter weapon from a whitelist.
- No scars, no faces, no name rule beyond length and profanity. A grep for `scar` in humanoid.rs returned nothing. Faces are the eyes index only (6 or 7 per body type). "Scars as grades" must be designed fresh.
- The start-site check exists only in builds with the `worldgen` feature (the worldgen block in character_screen.rs around 188-230, with the start-site test at 194); the other build uses a fixed centre waypoint just before line 236.
- Not read: the palettes and the `Skin` and `EyeColor` enums, `recolor_grey` and `color_segment`, and the database conversion of the body. Do not copy the render mapping before reading those.

Best transferable idea: one body family per species and body type holds a count table, a single clamp runs on the server before persist, and random generation draws only from those counts.
Decision (proposed): adapt - keep the family table and the clamp, move the table into catalogue data, run the clamp on the server, and drop the client-only clamp as the only guard.
Acceptance: a hero created with hair index 99 in a 21-style family is stored as 20 and the create is accepted, and a 21-character name is refused with the name error; a server test asserts both.
