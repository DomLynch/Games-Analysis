# Creature grammar: angband-angband (CG002, topic creature-grammar)

Half read: DATA PACK (lib/gamedata: monster.txt, monster_base.txt, blow_methods.txt, blow_effects.txt, pain.txt, visuals.txt, read by parse and by targeted lines). Engine half exists in the donor (src/mon-init.c, parser for monster bases and colour cycles; line 1720 located, not read in full). Tiles and sprite files (lib/tiles) not opened; the asset audit (AU004) covers them at file level only.

## 1. What the player sees and feels
A dungeon full of glyph monsters where a whole insect or dragon family looks like one animal in different paint. A pale, cold-breath insect is the same body as a green, poison-breathing one and a yellow one, but each swaps a single bite or breath and a small step in speed or depth. The deepest dragons add a slow colour shimmer, so the player reads "this one is special" from the motion before reading the name. A unique is a named boss that shares its base with ordinary members of the family.

## 2. Why it works / is striking
- Readable family: one base template (56 bases) supplies the glyph and the default flags; 624 monster entries inherit from them.
- One signature behaviour per variant: the four-colour insect base swaps the bite and the immunity together with the breath spell.
- One signature effect: the colour-cycle entries (9 monsters) are the only animated monsters in the data pack. Visual, not audio. No sound data read for monsters.
- Could be made ours at 20-30 percent resemblance: yes. The colour-as-element table and the boss-from-base idea transfer. The glyph and the text do not.

## 3. The rule behind it
Counts come from my own parse of monster.txt (624 entries) and monster_base.txt (56 templates). Nothing here is a donor-stated number.

- Each monster entry names one base ("base:" key): 49 bases hold 5 or more monsters; 26 hold 10 or more. The largest base holds 54 entries.
- Colour as element, within one body: the six-colour dragon base (30 entries) puts one element on each colour at the same depth and hit points (lowest tier at depth 9, hit points 88 each). Lightning, cold, poison, acid, fire and sound are the six elements. Later entries in that base add a confusion or fear package with much larger hit points (up to 1300 at depth 41).
- Four-member insect family (base "dragon fly", monster_base.txt line 116): each member has a different colour, an element immunity flag, a breath spell, and one bite or breath swap. Speed steps from 110 to 120 and depth from 5 to 6 across the family.
- Elite and boss: 101 entries carry the UNIQUE flag across 33 bases. 32 of those 33 bases also have ordinary members. Unique hit-point median is 2500 against 118.5 for non-uniques; depth median 50 against 26. So a boss is the family base with a much bigger body and a higher depth.
- Escort and drops: 166 entries use "friends" (escort groups); 26 use "friends-base", i.e. the escort is a whole base. 41 entries use "drop-base".
- Shape changers (11) and mimics (9) are separate small sets.
- Attack animation as text: 19 blow methods in blow_methods.txt, each with a short message and an action verb. A monster's blow picks one method, so swapping the blow swaps the attack's verb and its telegraph text. Blow effects: 30 entries (blow_effects.txt).
- Pain: pain.txt has 12 pain types. The file header says each type needs 7 messages, one per health band (a header claim; not counted per message).

Ours, as data (designer-tunable; donor values are NOT copied because the donor licence is GPL and an Angband-specific non-profit licence):

| field | unit | donor_value | our default to test |
|---|---|---|---|
| families | count | null | 12 |
| members_per_family | count | null | 4 to 9 |
| element_colour_slots | count | null | 6 |
| swapped_blow_per_member | count | null | 1 |
| speed_step_per_member | percent of base speed | null | 5 |
| elite_hp_mult | multiplier | null | 3.0 |
| boss_hp_mult | multiplier | null | 6.0 |
| cycle_frames | count | null | 2 |
| cycle_period_ms | milliseconds | null | 400 |
| pain_bands | count | null | 4 |

## 4. For Frankendom
- Map: 12 families as bases; each of the ~100 Pit characters is an entry that names its base. Zones pick characters by id (700 zones as data).
- Many-vs-one: the element colour is the readable telegraph. A player sees which of the up to 3 attackers breathes which element before it fires.
- Server-verified: the server picks the member, its element and its swapped blow from the zone seed. The client shows the colour and the cycle.
- Elite and boss: a boss is the family base with the elite multipliers and a colour cycle, plus its own name card. Bosses do not need new art.

Keep: base plus member entries; colour as element; one swapped blow per member; the slow colour cycle only on the top tier; "friends-base" escorts; the attack verb table as a text layer.
Change: no glyph; cycle is a palette step, not a legacy flicker; no uniques that share no base; server rolls every variant; the verb text is ours.

## 5. Five-minute look test (Dom, on phone)
Use one family only: a four-member insect base at 375 wide with the element colour per member, then the same base as the top tier with a two-frame cycle and a name card. Dom judges: can he tell the four members apart by colour alone at fight distance; does the top tier read as "same family, stronger" rather than a new monster; does the cycle draw the eye before the breath.

## 6. Licence and IP
Code: GPL version 2, or the "Angband licence" (docs/copying.rst line 5; src/z-file.c header). The Angband licence allows copying "for educational, research, and not for profit purposes" (docs/copying.rst line 10). Assets: mixed, per tile set; sound and fonts have their own lines (AU004 lists them). lib/gamedata header says "Other copyrights may also apply". So: inspiration stays category-level only. Do not copy monster names, plural forms, description text or tables. Recreate as an original: keep "one body, element by colour, one swapped breath"; change the names, the element set, the glyph and the numbers. No legal conclusions.

## 7. Gaps
- Not read: src/mon-init.c beyond the colour-cycle parser line (line 1720 located only); lib/tiles sprite files and their .prf mappings (AU004 file level only); the dungeon profile and vault files (not in this note); monster_spell.txt (1,234 lines, not read); lore text beyond short description checks.
- Counts are from my own parse; they are not donor-stated numbers.
