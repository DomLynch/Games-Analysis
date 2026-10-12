# angband-angband (procgen-grammars, batch3 PR001)

Donor: `/mnt/frankendom-donors/angband-angband` (VPS) | Licence: GPL-2 or the "Angband licence" (non-profit copies), `docs/copying.rst` lines 5-6 | C with text data files in `lib/gamedata` | Read: `src/randname.c` (full), `src/gen-room.c` pit code 899-993 and 2648-2725 and 2780-2978, `src/generate.c` profile pick 815-880, `src/obj-randart.c` naming 2700-2727, `src/obj-util.c` scroll titles 185-225, `src/mon-make.c` 205-240 and 1360-1385, `lib/gamedata` pit.txt, dungeon_profile.txt, room_template.txt (header legend and sample), names.txt (counts and header), constants.txt (two lines)

Checked: the name generator (`randname.c` 77-160, read in full) and its use in player, artefact and scroll names; the Pit builder `build_pit` (2780-2978, read to the end of the placement list). The Pit's species choice and the tier ring were traced by hand against the donor's loop order, and the counts were reproduced with a small node check on the VPS (59 writes, 55 cells, 4 refused). Confidence: high on the name generator and pit placement order; medium on `mon_pit_hook` (only the first part read) and on the item scatter (see gaps). Counts from data: 40 pit profiles (26 type 1 pits, 8 type 2 nests, 6 type 3 other), 9 dungeon profiles, 415 room templates (4,268 `D:` rows), 161 vaults, 1,188 name words (601 in section 1, 587 in section 2). Half read: source and data (single-player game, so no server half).

Candidate files opened for PARTIAL/NONE checks: not needed (verdict STRONG).

## 1. What the player sees and feels

- Entering a Pit is a set piece: a walled chamber of about 11 by 5 cells, packed with monsters in rings. The strongest monster stands in the centre; the weakest are at the rim, so you meet the weak ones first and the big one last.
- Random names feel like fantasy words but are not from a fixed list. Player names come out 4 to 8 letters. Artefacts read as "Word" in quotes (about 1 in 3) or "of Word" (about 2 in 3). Unidentified scrolls get a title of two to eight-letter words filled to about 24 characters, and a duplicate title is re-rolled.
- Pit type changes with depth. A nest is a crowd in no order; a pit is an ordered rank; other rooms take themed groups. Seven dragon pits are gated to about one check in six (rarity 6) and centre on about level 85, so they are a deep-level treat.

## 2. Why it works / is striking

- Readable at 375 wide: the ring is the readable thing. An 11-cell row is about 31 pt per cell on a 375 screen with gutters, so each ring (one species per tier) can read as a band, and the centre leader is the only one in its band.
- One signature behaviour: order by strength, rim first. That is the same idea the donor's comment calls "ordered", and it gives a natural approach order for a fight.
- One signature sound or effect: none in this donor (text and ASCII only).
- Could be made ours at 20-30 percent resemblance: yes. The tier ring, the rarity-gated pick, and the glyph-chance room are all easy to re-express.

## 3. The rule behind it

Name rule (`randname.c`, read in full):
1. A second-order letter chain: the next letter is drawn from counts keyed by the previous two letters (126). The counts are built from a word list (100).
2. A word is accepted only when it has the minimum length and at least one vowel (141). Up to 10 tries per length check (117). When a word runs past the max length, the whole word is restarted.
3. Vowel test uses the five plain vowels (151).
4. Uses: player names 4-8 (`player.c` 386); artefact words (`obj-randart.c` 2717); scroll titles 2-8 per word (`obj-util.c` 202).
5. The list is a training list, not a pick list (`names.txt` line 8). Section 1 has 601 words; section 2 has 587.

Artefact naming (`obj-randart.c` 2721-2722): one in three gives 'Word' in quotes, otherwise "of Word".

Pit selection (`set_pit_type`, `gen-room.c` 968-993): for each pit of the wanted room type, draw `Rand_normal(average, 10)` (983), take the distance to the current depth (984), and keep the closest one that passes a one-in-rarity gate (986). The first pit in the table is the fallback (971, 993).

Pit build (`build_pit`, `gen-room.c` 2780-2978):
1. Outer room 9 rows by 15 columns, with a walled inner chamber 5 rows by 11 columns and one closed door.
2. Draw 16 species at level cap depth + 10 (2833-2835). If any draw fails, no pit is built.
3. Sort the 16 by level, ascending (bubble sort, 2851-2868). Keep every other one: 8 tiers, tier 0 weakest (2870-2871).
4. Tier 7 (the second strongest of the 16) is the leader at the centre (2882).
5. Placement order and offsets (from the source, 2884-2950): tier 0 on the top and bottom rows at dx -3..3 and on the sides at dx +-5 (middle three rows); tier 1 on the top and bottom rows at dx +-4..5 and on the sides at dx +-4; tier 2 at dx +-3; tier 3 at dx +-2; tier 4 on the four diagonals next to the centre; tier 5 above and below the centre at dx -1..1; tier 6 left and right of the centre.
6. Items scatter over a 5 by 19 box (2961) at the pit's object rarity, a third of them good.

Monster draw limits (`get_mon_num`, `mon-make.c` 221-240): candidates up to the level cap; a one-in-25 chance (constant `mon-gen:ood-chance`, `constants.txt` line 33) raises the cap by min(cap/4 + 2, 10) (`mon-make.c` 231-232; `constants.txt` line 36). The doc comment says the deepest of several candidates is kept; the selection body was not read.

Room template glyphs (`room_template.txt` header, read to the legend; code in `build_room_template`, `gen-room.c` 1111-1220): `x` optional wall, generated 50 percent (56); `^` trap, 25 percent (52, code 1184); `8` treasure 80 percent, stairs 20 percent (60, code 1210); digits 1-6 candidate secret-door positions, with `doors:n` choosing one of 1..n; `(` and `)` are complementary optional secret doors.

Dungeon profile pick (`generate.c` 852-880, comment 860-866): one pass over profiles with alloc above zero and depth at or above min-level. Each eligible profile takes over the pick with chance alloc / running total (873). This is reservoir sampling, so the result is a weighted pick with no list built.

Data fields (designer-tunable; donor values are GPL/Angband-licence so `donor_value_or_null` is null; starting values are ours):
- pit_chamber_w (cells, 11), pit_chamber_h (cells, 5)
- pit_draw_count (16), pit_tier_count (8), pit_leader_tier (7 of 0-7)
- pit_alloc_rarity (per pit, 1 common, 6 for the seven dragon pits), pit_avg_level (levels, 15-105)
- pit_normal_spread (levels, 10)
- pit_level_window (levels above depth, 10)
- ood_chance (1 in 25), ood_cap (levels, 10)
- glyph_chance: wall 50 %, trap 25 %, treasure 80 % / stairs 20 %
- profile_alloc (weight) and profile_min_level (levels) per dungeon profile
- name_min_len (4), name_max_len (8) for player names; scroll_title_width (24)

## 4. For Frankendom

- Pit-only (parity row 22): a Pit is a client arena fed by the engine. The Pit's 16-draw tier layout can run on the server with a seed so that the client draws the same ring. Keep the seed in the ledger.
- Zones as data (700 zones, row 23 zone population): each zone carries an average level and a Pit rarity. The server picks the closest pit with the rarity gate, exactly as `set_pit_type` does, then draws from that pit's species family. This is the way to reuse the 100 Pit characters across zones: 40 pit profiles become 40 family rules over one roster (`mon-base`, colour and flag filters in `pit.txt`, read as the family grammar).
- Many-vs-one (MAX_ATTACKERS = 3): the rim-first order gives the first three attackers from tiers 0-1, with the leader last. The engine's hate list and target selection (row 4) can use the same order so the fight reads as a queue, not a crowd. The engine decides who joins; the client only shows it.
- Keep: 16 draws, sort, every other kept (8 spread tiers), leader in the centre, rarity-gated closest pick, the out-of-depth nudge as a zone field, glyph chance for room layouts.
- Change (defects, each with a fix):
  1. Tier 5 overlaps tier 4. Four of the 59 slot writes hit cells already filled by tier 4 (`gen-room.c` 2936, 2946). `place_new_monster` returns false on an occupied square (`mon-make.c` 1092) and the caller ignores the result. So tier 5 places 2 monsters, not 6, and nothing in the code reports the loss. Fix: build the slot list with no shared cells, or check the return and refill the refused cell from the next tier.
  2. Fallback to index 0 ignores the requested room type (`gen-room.c` 971, 993). It is latent: all eight nests have rarity 1 (so the gate always passes), so the fallback is never reached today. Fix: fall back to the first entry of the requested type.
  3. The item scatter box (2961) is wider than the 11-cell chamber, so some cells sit outside the walls. Whether `place_object` refuses them was not read. Fix: scatter inside the chamber only.
- Names: the letter chain makes words that are often not pronounceable at speed. For Frankendom keep the chain idea but feed it our own word list and cap the name at 14 characters for a one-line card at 375 wide.

## 5. A 5-minute look test Dom can judge on his phone

Build: one Pit on a debug screen, 11 by 5, filled from 16 of our characters (two families, sorted by level, every other kept), leader in the centre. Show it at 375 wide in two modes: (a) rings in strength order, rim weakest, centre leader; (b) the same 8 species shuffled. Dom judges: can he tell the leader from the rim at a glance, and can he name the first three to reach him in mode (a)? Then show a full 55-cell version and a rim-only version (the outer two rings, about 34 cells). Target: `src/fight/pit-layout.ts` (new), parity row 22 (Pit-only).

## 6. Licence and IP

GPL-2 or the Angband licence, which allows educational, research and non-profit copies (`docs/copying.rst` lines 5-6). Clean-room: `angband-angband.procgen-grammars.sketch.ts` is written from the described rules. No word lists, monster names, pit names or strings were copied, and the name list was not reused.

Best transferable idea: place a pit as tiers of one roster sorted by level, the strongest in the centre and the weakest on the rim, so the first attackers are always the weakest and the leader is last.

## 7. Gaps

- Not read: `obj-randart.c` property generation (only naming read); `gen-cave.c` profile build; the nest placement loop (`build_nest`, 2730-2766 region); the body of `mon_pit_hook` (only its first part, 901-947); the body of the get_mon_num selection; `vault.txt` contents (161 entries counted); `history.txt`; the room template bodies beyond the sample.
- Not verified: whether `place_object` refuses wall cells in the item scatter (fix 3 is conditional on this).
- The 59/55/4 counts come from a hand reproduction of the donor's loop order on the VPS, not from running the game.
- Typecheck: the sketch `angband-angband.procgen-grammars.sketch.ts` passed `tsc --noEmit --strict --target es2020` on the VPS (EXIT=0).
- Receipts: 73 rows in `receipts.tsv` (both donors), all pass `verify_receipts.py`.
- Half read: source and data. No server half exists in this donor.

## 9. TypeScript sketch (typechecked on the VPS, EXIT=0)

simplified: the sketch keeps the donor write order for the eight tiers, the sort-then-every-other pick, the leader at the centre, and the one-pass reservoir profile pick. It omits the monster-pit filters (mon_pit_hook), the level-cap draw (get_mon_num), the item scatter, the 64-draw nest build, the group index and the leader group role. The donor bubble sort is replaced by a sort (same order), and the donor silent failure on an occupied square is replaced by an explicit refused list.

```ts
// Licence: Angband is GPL-2 or the "Angband licence" (donor). Clean-room sketch written from the described mechanism, not a translation.
// clean-room
export {};

interface Species { name: string; level: number; }
interface Slot { dx: number; dy: number; tier: number; }
interface Profile { name: string; alloc: number; minLevel: number; }

// Slot list for an 11 x 5 interior (dx -5..5, dy -2..2). Tier 0 is the weakest ring, tier 7 the centre leader.
// Written in the donor's order so the same cells collide the same way.
function tierSlots(): Slot[] {
  const s: Slot[] = [];
  const put = (dx: number, dy: number, tier: number): void => { s.push({ dx, dy, tier }); };
  for (let dx = -3; dx <= 3; dx++) { put(dx, -2, 0); put(dx, 2, 0); }
  for (const dx of [-5, -4, 4, 5]) { put(dx, -2, 1); put(dx, 2, 1); }
  for (let dy = -1; dy <= 1; dy++) {
    put(-5, dy, 0); put(5, dy, 0);
    put(-4, dy, 1); put(4, dy, 1);
    put(-3, dy, 2); put(3, dy, 2);
    put(-2, dy, 3); put(2, dy, 3);
  }
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) put(dx, dy, 4);
  for (let dx = -1; dx <= 1; dx++) { put(dx, -1, 5); put(dx, 1, 5); }
  put(-1, 0, 6); put(1, 0, 6);
  put(0, 0, 7);
  return s;
}

// Draw 16 species, sort by level, keep every other one (8 tiers), then fill slots.
// Occupied slots are refused and reported instead of silently dropped.
function buildPit(draw: () => Species | null): { placed: Map<string, Species>; refused: string[] } | null {
  const pool: Species[] = [];
  for (let i = 0; i < 16; i++) {
    const s = draw();
    if (s === null) return null; // any failed draw means no pit
    pool.push(s);
  }
  pool.sort((a, b) => a.level - b.level);
  const tiers: Species[] = [];
  for (let i = 0; i < 8; i++) tiers.push(pool[i * 2]);
  const placed = new Map<string, Species>();
  const refused: string[] = [];
  for (const slot of tierSlots()) {
    const key = `${slot.dx},${slot.dy}`;
    if (placed.has(key)) { refused.push(key); continue; }
    placed.set(key, tiers[slot.tier]);
  }
  return { placed, refused };
}

// One pass, no list: each eligible profile takes over the pick with chance alloc / running total.
// rnd(n) returns an integer in [0, n).
function pickProfile(depth: number, profiles: Profile[], rnd: (n: number) => number): Profile | null {
  let total = 0;
  let chosen: Profile | null = null;
  for (const p of profiles) {
    if (p.alloc <= 0 || depth < p.minLevel) continue;
    total += p.alloc;
    if (rnd(total) < p.alloc) chosen = p;
  }
  return chosen;
}
```


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
Errors: Verified: copying.rst lines 5-6 licence; set_pit_type 968-993 (Rand_normal(ave,10), one_in_(rarity), fallback idx 0); build_pit 8 geometry (9x15 outer, 5x11 inner), 16 draws at depth+10, bubble sort then what[i*2], leader what[7], placement offsets and counts (I recount 59 writes: 20+14+6+6+4+6+2+1; tier5 4 corners collide with tier4 so 55 cells/4 refused); place_new_monster returns false on occupied (mon-make.c ~1092); item box x +-9 by 5 rows and one_in_(3) good; pit.txt 40 profiles (26/8/6), seven rarity-6 avg-85 dragon pits, all 8 nests rarity 1 so fallback latent; get_mon_num ood chance 25 and amount 10 (constants.txt lines 33/36, mon-make.c 231-232); randname_make logic, tries 10, vowel, player name 4-8 (player.c 386), scroll 2-8 width 24, artefact one_in_(3) quotes; generate.c reservoir pick 865-877.
Missed: Leader is placed FIRST in the donor (centre monster before servants, with MON_GROUP_LEADER role) while sketch appends it last - no collision effect. Group index/leader role is listed as omitted. Nothing important missed.
