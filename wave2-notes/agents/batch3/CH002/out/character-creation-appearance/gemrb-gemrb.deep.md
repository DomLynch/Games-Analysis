# gemrb-gemrb (character-creation-appearance, cell 2)

Donor: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/GUIScripts/PaperDoll.py` (function `GetActorPaperDoll0`, lines 120-144), with the data tables `/mnt/frankendom-donors/gemrb-gemrb/gemrb/unhardcoded/shared/avprefc.2da`, `.../shared/avprefg.2da`, `.../unhardcoded/bg2ee/avprefr.2da`, `.../unhardcoded/bg2ee/pdolls.2da` | Licence: GPL-2.0-or-later (SPDX headers in the GUIScripts files, e.g. `PaperDoll.py` lines 1-3; top-level `COPYING` is GPL version 2, June 1991; copyleft, clean-room, shape only) | Python (GUI scripts) over a C++ core | symbol `GetActorPaperDoll0`

Checked: Read in full: `PaperDoll.py` 120-144 (the body-family derivation and lookup) and 19-80 (colour defaults, portrait and race/class tables); `bg2/GUICG1.py` (gender step, lines 39-40 and 74); `GUIPortraitCommon.py` 163-175 and 213-232 (random and cycled portraits by gender; the whole file was read, 433 lines); `bg1/GUICG5.py` (name step, whole file); the data tables `shared/avprefc.2da`, `shared/avprefg.2da`, `bg2ee/avprefr.2da` (whole files) and `bg2ee/pdolls.2da` (rows read at lines 24, 36, 42, 48, 54, 60, 72, 85; the rest not read); the table binding `plugins/GUIScript/GUIScript.cpp` 624-690 (`GemRB_Table_GetValue`), `plugins/2DAImporter/2DAImporter.cpp` 102-145 (QueryField, GetRowIndex, GetColumnIndex), `includes/globals.h` 185-195 (`valid_signednumber`). Depth: full for the body-family derivation and the table read path. Not read: where the 2DA parser sets its default value (`defVal`; the shared avprefc file's second line is `*`); the IE stat values for IE_RACE and IE_SEX in game data (the table indexing assumes the game's race ids follow the table row order and the gender step stores 1 or 2, which it does at GUICG1.py 39-40); the C++ side of `CharAnimations`; the avatars table for the fallback name. Confidence: high for the derivation order and the table contents read; medium for the class-offset result (it follows from reading the table read path; not run). Callers of `GetActorPaperDoll0`: `GetActorPaperDoll` (lines 79-86, the default branch; the IWD2 branch is separate); the other callers were not searched. camera_scope: not applicable.

Best transferable idea: Derive a body family key by adding bit-packed race, class and sex offsets to a base, keep the stored key once chargen ends, and pick the model from a per-family table by armour tier; return an explicit error for a missing family instead of a guessed name.
Decision (proposed): adapt — keep the key and the tier table as data, with an explicit error and a PREFIX-only class term; the donor's separate model sets per family are not a shared rig, so Frankendom takes the lookup and not the rig.
Acceptance: a female human fighter at armour tier 2 resolves to CHFF2INV through key 0x6110, and a server test asserts that an unknown family key returns an explicit error rather than a guessed model name.

## 1. Mechanism

- One body id per character is the "family key": a 16-bit number starting at 0x6000 and built by addition. Only while the character is still in chargen (the stored animation id equals the sentinel `0x2000`, line 123) is the key derived from the character's current race, class and sex (124-133). Otherwise the stored key is used as is (122, 137).
- Derivation, in the order the code adds the parts: base `0x6000` (124); plus the race offset from the race table, looked up by the player's IE_RACE value used as a row index (126-127); plus the class offset from the class table (128-130); plus the gender offset from the gender table, looked up by IE_SEX (131-133). Gender is `0x10` for female and `0` for male (avprefg.2da rows 5-6). Race offsets: Human 0, Elf and Half-elf 1, Dwarf 2, Halfling 3, Gnome 4, Half-orc 5 (avprefr.2da, rows 5-11). Class offsets (shared avprefc.2da): Fighter, Paladin, Ranger and Barbarian 0x100; Mage and Sorcerer 0x200; Thief, Bard and Mage-Thief 0x300; Monk 0x500; Cleric, Druid and Shaman 0.
- The class offset is read from the column named `CLASS` (130). The shared table has no such column; its header is `PREFIX` (avprefc.2da line 3). The IWD2 branch reads `PREFIX` (105). As read: on the BG2/EE path the `CLASS` lookup misses the column, `QueryField` returns the table default (2DAImporter.cpp 107-108; `GetColumnIndex` returns npos at 133), and `valid_signednumber` gives 0 for the default (globals.h 190-191), so the class offset is 0 during chargen on this path. Not run.
- Armour selects the tier: `level = IE_ARMOR_TYPE or 0` (135), column name `LEVEL%d` with `level + 1` (136), so tiers 0 to 3 map to LEVEL1 to LEVEL4.
- The model is looked up by family key (as a string row name, e.g. "0x6000") and tier column (138). If the lookup returns `*` (139), the code guesses `GetAvatarsValue(pc, level) + "INV"` (141), checks it exists (142), and prints a message if it does not (143). It returns the guessed name either way. So a miss is not an error; the caller gets a name that may not exist.
- Example rows (bg2ee/pdolls.2da): `0x6000` is CHMC1INV to CHMC4INV (line 36); `0x6010` is CHFC1INV to CHFC4INV (line 42). The model names are not decoded here; the letters are read as data.
- Gender is stored at the gender step as 1 (male) or 2 (female) (bg2/GUICG1.py 39-40, 74), which is the value the lookup uses.
- Colours (not the family key): on BG1, BG2 and IWD1 the major, minor, skin and hair colours come from the portrait row of the `pictures` table (PaperDoll.py 40-44); on EE they come from the race table (SKIN, HAIR, racecolr) and the class table (MAIN_CLOTH, MINOR_CLOTH, LEATHER, ARMOR, METAL, clascolr) (61-65). Colour is data, not chosen per character in this path.
- Portraits (the "face" choice): on the appearance step a portrait is drawn at random with `GemRB.Roll(1, count, offset)` inside the gender's block (GUIPortraitCommon.py 163-175); next and previous step through the table and skip rows of the other gender (213-232).

## 2. Key functions

- `GetActorPaperDoll0` (the family key and lookup): `/mnt/frankendom-donors/gemrb-gemrb/gemrb/GUIScripts/PaperDoll.py` 120-144. Reads the stored key (122), derives it during chargen (123-133), picks the tier (135-136), looks up the model (138), and falls back (139-143).
- `GemRB_Table_GetValue` (the table read): `/mnt/frankendom-donors/gemrb-gemrb/gemrb/plugins/GUIScript/GUIScript.cpp` 624-690. A numeric row or column is used as an index (645); a string is looked up by name (638); the type argument decides the return (667).
- `QueryField` and `GetColumnIndex`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/plugins/2DAImporter/2DAImporter.cpp` 102-145.
- `valid_signednumber`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/includes/globals.h` 187-192.
- Gender step: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/GUIScripts/bg2/GUICG1.py` 39-40, 74.

## 3. Numbers vs mechanism

| Part of the key | Formula | Values read | file:line |
|---|---|---|---|
| Base | 0x6000 | 0x6000 | PaperDoll.py:124 |
| Chargen sentinel | stored == 0x2000 means derive | 0x2000 | PaperDoll.py:123 |
| Race offset | row of race table by IE_RACE | Human 0, Elf 1, Half-elf 1, Dwarf 2, Halfling 3, Gnome 4, Half-orc 5 | PaperDoll.py:127; bg2ee/avprefr.2da rows 5-11 |
| Class offset (BG2/EE path) | column CLASS (missing); table default | 0 as read | PaperDoll.py:130; 2DAImporter.cpp:107, 133 |
| Class offset (IWD2 path) | column PREFIX | Fighter 0x100, Mage 0x200, Thief 0x300, Monk 0x500, Cleric 0 | PaperDoll.py:105; shared/avprefc.2da rows 5-26 |
| Gender offset | row of gender table by IE_SEX | male 0, female 0x10 | PaperDoll.py:133; shared/avprefg.2da rows 5-6 |
| Armour tier | LEVEL(IE_ARMOR_TYPE + 1) | 1 to 4 | PaperDoll.py:135-136 |
| Miss | guessed name plus INV, print only | returns the guess | PaperDoll.py:139-143 |
| Male human, tier 1 | 0x6000 | CHMC1INV | bg2ee/pdolls.2da:36 |
| Female human, tier 1 | 0x6010 | CHFC1INV | bg2ee/pdolls.2da:42 |
| Mixed-sex row | 0x5210 has CHFW1INV then CHMW2INV to CHMW4INV | noted as data | bg2ee/pdolls.2da:24 |
| Mixed row | 0x6500 has CHMM1INV, CHMT2INV, CHMF3INV, CHMF4INV | noted as data | bg2ee/pdolls.2da:85 |

## 4. TypeScript sketch

simplified: the sketch keeps the derivation order (base, race, class, sex) and the stored-versus-chargen rule, and keeps the tier lookup. It omits the full pdolls table (two families kept, about 100 rows in the donor), the SIZE column, the colour tables, the IWD2 branch, the avatars fallback name and the portrait choice. It changes the donor's silent fallback: a missing family or tier returns an explicit error instead of a guessed name. The class offset is an input here, read from one named column on every path (the donor's BG2/EE path reads a column that does not exist). The race and sex inputs are taken as already resolved offsets; the sketch does not model IE_RACE or IE_SEX value mapping.

```ts
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
```

Typecheck: copied to `/tmp/gemrb-body-family.ts` on the VPS and run with `npx -p typescript tsc --noEmit --strict --target es2020` (TypeScript 7.0.2): exit 0, no output.

Defects found in the donor (keep the idea, fix the defect):
- Class offset column miss: `GetValue (ClassName, "CLASS", GTV_INT)` (PaperDoll.py:130) names a column that the shared avprefc table does not have (its header is PREFIX, line 3; the IWD2 branch at line 105 uses PREFIX). As read, every chargen preview on the BG2/EE path gets class offset 0. fix: read the PREFIX column on every path, and add a test that a fighter's chargen key is 0x6100 (female 0x6110).
- Miss is silent: a missing family or tier returns a guessed name (PaperDoll.py:139-143) and the error is a print. fix: return an explicit error and show it at the create screen.
- Mixed-sex rows (pdolls.2da lines 24 and 85) mix sex letters across tiers. Not decoded: may be intentional. fix: validate each row at load (one sex per family, or a documented exception).
- Gender and race rely on table row order, not names, for numeric lookups (PaperDoll.py:127, 133). It works because the table row order matches the stored values (as read), but a reordered table breaks silently. fix: look up by name in the sketch's map (the sketch takes resolved offsets).
- Colour defaults come from data rows (PaperDoll.py:40, 62), so a character's colours are not chosen per character in chargen on this path. This is a gap, not a defect (see section 6).

Not run: none of this was executed; claims are from reading the code and the table rows listed above.

## 5. Lands in

- TARGET `origins/character/body-family.ts` (new, proposed): the family key and tier lookup, server-side resolved (the server stores the key on the character; the client only draws it).
- Parity-checklist row 6 (hero actor/animation): body family per race, sex and class on the shared rig, one model per armour tier. The hint row 3 (guard/parry/stamina) does not fit appearance; row 6 is the one that does.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: one ledger (the stored family key is written once at creation and then read, not recomputed; the derivation runs only for the chargen sentinel); server-verified (the server resolves the model name, not the client).

## 6. Gaps and risks

- The donor's "shared rig" is a set of separate model sets (BAM animation sets named per family and tier), not one skeleton with families as bones or meshes. The sketch transfers the lookup (family key times armour tier), not the rig. Frankendom's one shared humanoid rig needs families as data (catalogue fields, parity row 21), not as separate models.
- Faces and scars: the donor's face is a portrait picked from a table by gender (GUIPortraitCommon.py 163-232). There is no face sculpt and no scar or wound appearance in the chargen path. Scars-as-grades cannot be taken from GemRB.
- Name rules: the name step checks only that the field is not empty (bg1/GUICG5.py 54); a length check is a comment (43-44, "#check length?" is on line 44). Frankendom's name rules must come from elsewhere.
- Class-free start: GemRB's chargen has a class step (bg2 CharGenCommon.py 54-56, "ClassButton"), and the class offset feeds the family key. A class-free start would drop the class term and keep race and sex only. The donor does not do that; the shape transfers as "key without the class term".
- Colours are data rows (portrait row on BG1/BG2/IWD1, race and class tables on EE), so the donor has no per-character colour choice in this path. Frankendom's colour choice (if any) is a new rule, not a donor mechanism.
- GPL-2.0-or-later: clean-room. The sketch is written from the mechanism; no donor line is translated.
