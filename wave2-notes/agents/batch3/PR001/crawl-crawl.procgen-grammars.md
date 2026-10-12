# crawl-crawl (procgen-grammars, batch3 PR001)

Donor: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source` (VPS) | Licence: GPLv2+ (`/mnt/frankendom-donors/crawl-crawl/README.md` line 96) | C++ with Lua/.des map data | Read: `item-name.cc`, `artefact.cc`, `mapdef.cc`, `dat/des` (counted and sampled), `art-data.txt` header

Checked: `make_name` in `item-name.cc` 2500-2640 and its letter tables 2708-2745 (read in full); randart budget `artefact.cc` 1229-1412 (read in full); artefact naming 1544-1700 (read in full); `mapdef.cc` glyph and NSUBST parsing 750-772, 944-972, 1467-1502, 5903-5926 (read in full). Counts from `dat/des`: 144 `.des` files, 84 of them use NSUBST, 3,334 NSUBST lines, 6,264 `NAME:` lines (counted, not each one opened). Confidence: high on the naming and randart rules (read in full); medium on how often a glyph freeze applies (scope not traced). Not read: `dungeon.cc` level builder, the name table behind `getRandNameString`, the bodies of the vault maps, and the value functions for the unrandart fixed names. Half read: data and source (single-player game, so there is no separate server half in this donor).

Candidate files opened for PARTIAL/NONE checks: not needed (verdict STRONG).

## 1. What the player sees and feels

- Unidentified or randomly made gear shows a name that sounds like a word but is not one. Its base name is followed either by " of X" (about 1 in 3) or by a quoted X (about 2 in 3). A name from a short table is used for some weapons, armour, staves and talismans (a coin flip), and for jewellery about 1 in 5 times.
- The same item seed always gives the same name, so a dropped item keeps its name when it is shown again.
- A random item with extra properties reads as a short list of 1 to 4 properties. The budget gives about 2.3 quality points on average (1 + six trials at 21 %), so most items show two or three good properties. About 38 in 100 items also get at least one bad property before the fit checks (two trials at 21 %). Bad stats are -2 to -5 and bad resists are -1.
- Vault maps look different each game because some glyphs are rolled when the map is used (a SUBST glyph can be fixed for the map, or rolled per cell).

## 2. Why it works / is striking

- Readable at 375 wide: names are clamped to a display width of 25 by retrying (`artefact.cc` 1673). That is the right size for a phone inspect card.
- One signature behaviour: a seeded name plus a capped property list. Two lines on the card, no wall of text.
- One signature sound or effect: none in this donor (text only).
- Could be made ours at 20-30 percent resemblance: yes. The budget shape (quality points, bad rolls, a cap of four distinct properties, extra points used to raise existing properties) is easy to re-express for our loot.

## 3. The rule behind it

Name rule (`make_name`, `item-name.cc`):
1. Length = 3 + random 0-4, plus either 0-5 (1 in 5) or 1. Scrolls add 6. The name is capped at 200 characters (`ITEMNAME_SIZE`).
2. The first letter is any letter. A space may follow when the name is longer than 5 and shorter than length - 4, and no space exists yet (4 in 5 chance, 2558).
3. After a consonant a vowel always follows. After a vowel that follows a consonant, a vowel follows with 2 in 5 chance (2568). The vowel table holds 16 letters (the five vowels three times over, plus y) and 2 space slots (2710), so a space is picked about 2 times in 18 when a vowel slot comes up.
4. Otherwise a consonant. With 2 in 7 chance a cluster of 2-3 letters is used from a table (begin 27, middle 67, end 42 entries) (2612, 2738). Otherwise a single consonant (2718).
5. Up to 150 steps (`MAX_ITERS`).

Artefact name rule (`make_artefact_name`, `artefact.cc` 1596-1700): table name with a coin flip for weapons, armour, staves and talismans (1552); 1 in 5 for jewellery (1554). Otherwise the generated base name plus " of X" (1 in 3, 1686-1688) or a quoted X (2 in 3, 1693). Retry while display width exceeds 25 (1673).

Randart budget rule (`_get_randart_properties`, `artefact.cc` 1275-1292 and 1339-1412):
1. quality = 1 + Binomial(6 trials, 21 %) (1276). Range 1 to 7.
2. bad = Binomial(2 trials, 21 %) (1282), less any fixed bad properties.
3. good = max(quality + fixed_bad + bad - fixed_good, 0) (1286).
4. max distinct properties = 4, plus 1 with chance 1/20 and another with 1/40 (1292).
5. Extra good points beyond the cap enhance properties that already exist instead of adding new ones.
6. Each new property is drawn from a weighted list (weights in the property table, for example Str/Int/Dex 100 (899), rF/rC 60 (905), Slay 30 (949)). A property is not drawn twice.
7. Each property has a max duplicate count and an odds step (`max_dup`, `odds_inc`, lines 868-870 and 1369-1372).
8. Bad value of a stat: -2 to -5 (877). Good stat: 1 to 3 (874). Resist: +1 good, -1 bad. Slay: good 2-3, bad -2 to -6 (951). Weapons always get a brand. Armour gets an ego with a coin flip (1 in 2).

Glyph rule (`mapdef.cc`):
1. A SUBST line maps one key glyph to a weighted list of replacements. A plain character has weight 10 each, so repeated letters are extra weight. A `c:N` item sets weight N directly (759, 767).
2. Separator `:` marks the spec as fixed (944, 970). A fixed spec freezes the first chosen value (5925). Separator `=` rolls each cell.
3. Each replacement is taken with chance weight / running total, and the last winner stands (5921). This is weighted reservoir sampling in one pass.
4. NSUBST spec: a list of specs separated by "/", each with its own replacement list. Each spec takes a fixed count of the key's cells, or `*` for all the rest, in the order listed, after the cells are shuffled (1476).

Data fields (designer-tunable; donor values are GPL so `donor_value_or_null` is null; our starting values are ours to tune):
- name_base_len (chars, start 3); name_extra_len (chars, 0-4); name_long_chance (1/5); name_long_extra (chars, 0-5)
- name_space_chance (4/5); name_vowel_after_pair (2/5); name_cluster_chance (2/7); name_max_steps (150)
- name_display_width (columns, 25)
- prop_quality_trials (6); prop_bad_trials (2); prop_trial_chance (21 %); prop_max_distinct (4); prop_extra_chance (1/20, 1/40)
- prop_weight per property (unitless)
- glyph_default_weight (10); glyph_fixed (bool per SUBST spec)

## 4. For Frankendom

- Loot is server-verified (parity row 18). The server should store the item seed and the roll result in the one ledger, and derive the display name from the seed on both sides. Store the seed, not the name, so nothing can drift. This is the seed discipline the donor uses (`item-name.cc` 2521).
- The budget is a loot roll, so it lives in the engine (row 18). Its numbers go into the catalogue fields (row 21) as data: quality trials, bad trials, the four-property cap, property weights.
- Zones as data (700 zones): a zone can carry a weighted glyph layout (SUBST) for decor and layout variation. Use a fixed roll per zone (`:`) so server and client agree, and a per-cell roll (`=`) only for decor the client may draw. The NSUBST "exactly N" form suits placing exactly one boss or chest in a zone.
- Keep: seeded names, budgeted properties, the cap of four distinct properties, weighted one-pass replacement.
- Change: the letter-level generator makes names that are often not pronounceable. For Frankendom use word lists and a hard cap of 14 characters so the name fits one line at 375 wide, and keep the donor's shape (length base plus extra, vowel-after-pair rule). Also the donor uses 1-in-3 "of X" versus quoted X; pick our own split.
- Many-vs-one (MAX_ATTACKERS = 3): not affected; this donor is about items and maps, not fights.

## 5. A 5-minute look test Dom can judge on his phone

Build: on a debug screen, generate 10 items from 10 seeds with this name shape and the randart budget (quality 1-7, max four distinct properties). Show each as a 375-wide inspect card next to our current loot cards. Compare: (a) can he read the name aloud without stopping, (b) can he see the four property lines without scrolling, (c) do the same seeds still show the same name after a reload. Target: `src/fight/loot-roll.ts` (new), parity row 18 (loot roll and XP award).

## 6. Licence and IP

GPLv2+ (`README.md` line 96). Clean-room: the sketch in `crawl-crawl.procgen-grammars.sketch.ts` is written from the described rule, not translated. No names, tables or strings were copied. The donor's example names in the source comments were not reused.

Best transferable idea: a per-item seed plus a small budget (quality points, two bad rolls, a four-property cap) gives every loot drop a readable name and card, and the server can re-derive it.

## 7. Gaps

- Not read: `dungeon.cc` (the level builder that calls these maps), the name table behind `getRandNameString`, the vault map bodies (only counted), the unrandart fixed-property table bodies (only the 155 `NAME:` entries counted), and the value functions for good resist/slay beyond the lines cited.
- Not traced: whether a fixed SUBST freeze lasts for one placement or the whole game (the freeze is stored on the spec object; the copy path was not read). The sketch says "scope not traced" for this reason.
- Typecheck: the sketch `crawl-crawl.procgen-grammars.sketch.ts` passed `tsc --noEmit --strict --target es2020` on the VPS (EXIT=0). The local Mac hook reports tsc and eslint as unavailable for this folder; that is a local tooling gap, not a code error.
- Receipts: 67 rows in `receipts.tsv` for both donors; all pass `verify_receipts.py`.
- Half read: data and source. There is no server half in this donor.

## 8. TypeScript sketch (typechecked on the VPS, EXIT=0)

simplified: the sketch keeps the donor budget order (quality, then bad rolls, then good points, then the distinct-property cap) and the one-pass weighted glyph choice with a per-chooser freeze. It omits the enhance step that raises existing properties past the cap, the weighted property draw and no-repeat rule, the brand and ego rules, the name generator, and the case where the freeze scope matters. The four-property cap is shown as a single roll; the donor applies it after the draws.

```ts
// Licence: Crawl is GPLv2+ (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

interface Rng {
  // true with probability x / y
  chance(x: number, y: number): boolean;
}

// n trials, each succeeding with pct / 100.
function binomialPct(rng: Rng, trials: number, pct: number): number {
  let count = 0;
  for (let i = 0; i < trials; i++) if (rng.chance(pct, 100)) count++;
  return count;
}

interface Budget { good: number; bad: number; maxProps: number; }

// Quality points and bad properties are two binomial draws; good points = quality + bad (less any fixed ones).
// Distinct properties are capped at 4, with an extra one at 1/20 and another at 1/40.
function rollBudget(rng: Rng, fixedBad = 0, fixedGood = 0): Budget {
  const quality = 1 + binomialPct(rng, 6, 21);
  const bad = fixedBad < 2 ? binomialPct(rng, 2 - fixedBad, 21) : 0;
  const good = Math.max(quality + fixedBad + bad - fixedGood, 0);
  const maxProps = 4 + (rng.chance(1, 20) ? 1 : 0) + (rng.chance(1, 40) ? 1 : 0);
  return { good, bad, maxProps };
}

interface Option { glyph: string; weight: number; }

// Weighted glyph roll: each option that wins its chance (weight / running total) becomes the pick, so the last winner stands.
// fixed = true freezes the first roll on this chooser (scope of the freeze not traced in the donor); fixed = false rolls per cell.
function makeGlyphChooser(rng: Rng, options: Option[], fixed: boolean): () => string {
  let frozen: string | null = null;
  return (): string => {
    if (frozen !== null) return frozen;
    let cumulative = 0;
    let chosen = options.length > 0 ? options[0].glyph : "";
    for (const o of options) {
      cumulative += o.weight;
      if (rng.chance(o.weight, cumulative)) chosen = o.glyph;
    }
    if (fixed) frozen = chosen;
    return chosen;
  };
}
```
