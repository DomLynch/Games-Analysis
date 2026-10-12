# diasurgical-DevilutionX (procgen-grammars, feel, PR003)

Donor: `/mnt/frankendom-donors/diasurgical-DevilutionX/` (VPS) | Licence: `LICENSE.md` is the "Sustainable Use License" 1.0 (heading on line 1; use limited to internal business or non-commercial/personal use). Donor matrix says UNCLEAR. Treated as category-level only: clean-room, no code, table or constant carried over | Language: C++ | Half read: client (single-player engine; the generator sits in the game code, the donor has no server half)

Checked: Read in full the level skeleton and recursion (`Source/levels/drlg_l1.cpp` 459-560 and 758-828, GenerateLevel 1166-1238), the theme-room placement and sizing (`Source/levels/gendung.cpp` 49-95, 522-560, 616-625), the theme choice and fit (`Source/levels/themes.cpp` 195-240, 303-348, 826-912; fit switch 222-302 read but its default branch not read), the RNG helpers (`Source/engine/random.cpp` 96-109) and the constants (`gendung_defs.hpp`, `dun_tile_data.hpp/.cpp`, `tables/objdat.h`). Confidence high on every number here (each has a receipt in receipts.tsv). Verdict: STRONG (real, read code; the mechanism is self-contained and re-expressible).

## 1. What the player sees / feels

Each cathedral-style dungeon level is a short main hall with up to three square chambers (each present with 50 percent chance, at least one kept), then side rooms that grow off the chambers until the level has enough floor. The layout is fixed by a seed, so the same seed gives the same level. On top of that skeleton, some rooms are "themed": a sealed room with one special prop set and its own monster group, such as a shrine, a library, a skeleton room or a fountain. A themed room reads as a place you stop at. Corridors between them read as runs. On a phone at 375 wide the level is a grid of walls and floor, so the shape of a sealed room with one opening is the main cue. Theme density depends on the level type, so some levels have many more stops than others.

## 2. Why it works / is striking

- Readable silhouette: 10x10 chambers with four pillars at fixed offsets (`drlg_l1.cpp` 808) read as rooms at small size. Silhouette in one line: three squares joined by a bar.
- Signature behaviour: on the cathedral (level 1 type) a themed room is sealed by walls on every side (CheckThemeRoom, `themes.cpp` 303-348, called at 848), so it reads as a deliberate room and not as leftover floor. Other level types never call CheckThemeRoom; their slots are rectangles grown from free floor (step 4).
- Signature sound/effect: not in the half I read (theme props and their sounds are in art/sound code and object tables, not read).
- Could be made ours at 20-30% resemblance: a grown zone skeleton with one or two named "stop rooms" per zone, placed by fit tests and kept apart by a ring.

## 3. The rule behind it

Order of passes. Two separate paths: the L1 skeleton (`drlg_l1.cpp`, GenerateLevel 1166-1199) picks themes from rooms that already exist (steps 1-3, then 5 via CheckThemeRoom at `themes.cpp` 846-860); the grow-a-rectangle slot pass (step 4, `DRLG_PlaceThemeRooms`) is called only from `drlg_l2.cpp` 2704, `drlg_l3.cpp` 2108 and `drlg_l4.cpp` 1190, never from L1.

1. Skeleton: fixed macro layout (`FirstRoom`, `drlg_l1.cpp` 507-557). Up to three 10x10 chambers at tile offsets (1,15), (15,15), (29,15) and a hall of 38x6, trimmed when a chamber is missing. Each chamber is present with 50 percent chance (512-514; chamber 2 is forced on if 1 or 3 is missing). A coin flip picks a vertical layout (511).
2. Recursive growth (`GenerateRoom`, 459-506): one child size is drawn (up to 20 tries, 467). Size per side is `(rnd(5)+2) & ~1` (468), which gives sizes 2, 4 and 6 at weights 2:2:1. The second child reuses that size on the opposite side, centred. Each child recurses with the axis flipped. `GenerateRoom` first rolls `rotate = FlipCoin(4)` (461-462), which flips the layout axis in 1 case of 4.
3. Reroll for quality: rebuild the skeleton from the level seed until the mapped area reaches a floor (`while (FindArea() < minarea)`, 1189; floor 761 by default, 533 on level 1 and 693 on level 2; 1171-1181). If the stairs cannot be placed, the whole level re-rolls (`if (PlaceStairs(entry))`, 1197). The seed is saved after each attempt (1187), so every re-roll is reproducible.
4. Theme slots (gendung.cpp, L2/L3/L4 only; per-level arguments minSize, maxSize, floor tile, freq, rndSize: L2 6,10,3,0; L3 5,10,7,0; L4 7,10,6,8,true): each floor tile is tried with chance 1/freq (528; `FlipCoin`, `random.cpp` 108). A candidate grows the largest free rectangle from its corner (`GetSizeForThemeRoom`, 49-93) and returns it shrunk by 2 (93). Sizes are biased small by a nested roll (537). A keep-out ring is enforced around each slot (`IsNearThemeRoom`, 616-625: 2 tiles before, 3 after).
5. Theme choice (themes.cpp): a slot first draws from four "good" themes (844). If none fits, it draws uniformly over the 17 theme types until one fits (851-852 in the cathedral branch, 881-882 elsewhere). Fit tests are per type (`SpecialThemeFit`, 222-302); a type with no case in its switch falls to `default: break` (298) and returns `CheckThemeReqs`, which is true for default types (217-218). Unique landmarks clear a flag when placed (fountains: `bFountainFlag = false`, 242), so each landmark appears at most once per level.
6. Dressing: after layout, `CreateThemeRooms` switches on the type and places props with per-tier frequency (`barrnd` {2,6,4,8} at 379; `librnd` {1,2,2,5} at 556).

Room validity (CheckThemeRoom, 303-348; used on the cathedral branch only): no set-piece tile and no trigger inside the slot; in the cathedral branch the area must be 9 to 100 tiles (322); every open edge tile must border a wall, so the slot is sealed.

Data fields (donor value null: donor is not MIT/Apache/BSD):

| name | unit | donor_value_or_null |
|---|---|---|
| skeleton_chamber_side | tiles | null |
| child_side_choices | tiles (2, 4, 6) | null |
| child_size_weights | ratio (2:2:1) | null |
| child_attempts_per_side | count (20) | null |
| min_mapped_area | tiles of floor | null |
| theme_try_chance | 1/N per eligible tile | null |
| theme_size_min / max | tiles (before the -2 shrink) | null |
| theme_keepout_before / after | tiles (2 / 3) | null |
| theme_cap | count (50) | null |
| cathedral_slot_area_band | tiles (9 to 100) | null |
| prop_chance_by_tier | 1/N per tier (2,6,4,8 and 1,2,2,5) | null |

Note on theme_try_chance: a value of 0 is not "never". `GenerateRnd` returns 0 for any value at or below 0 (`random.cpp` 98-99), so `FlipCoin(0)` is always true, and levels 2 and 3 try every eligible tile.

## 4. For Frankendom

- 700 zones as data: store each zone as a seed plus a generator version, or as the finished layout. The server can then regenerate and check any zone. Keep the seed-after-each-attempt rule so a re-roll is reproducible.
- Many-vs-one: a sealed room with a single opening is a natural pull room. A door-width rule could cap attackers at MAX_ATTACKERS = 3 (our idea, not in the donor).
- 100 Pit characters reused across zones: the theme table (one catalogue of room types, each with its own fit test against zone data) is the analogue. A camp template can be fitted to many zones by its own predicate.
- Server-verified, one ledger: the seed, the reroll count and the unique-landmark flags are the facts the ledger needs. The client only draws. Spawn caps, respawn and despawn belong to parity row 23 (zone population). Target: `origins/server/world-spawns.ts`.
- Keep: skeleton then grow; sealed slots; keep-out ring; one-of-a-kind flags; reroll on an area floor. Change: no unbounded retry (defect 1), no implicit "freq 0 means every tile" (defect 5), and zones are our data, not hard-coded layouts.

## 5. The 5-minute look test

Build a debug flag that generates six zones from six seeds of one zone type, top-down at 375 px wide, with the stop room marked in a second colour. Dom judges on his phone:
(a) do the six read as different places built on the same bones;
(b) is the stop room visibly sealed from the corridor;
(c) is any zone a dead-end maze (the area floor should have caught it).
Pass if at least five of six pass all three. No release rows, no lock.

## 6. Licence / IP

Sustainable Use License 1.0 (`LICENSE.md`, line 1). Use is limited to internal business or non-commercial/personal use, and the matrix marks it UNCLEAR. Inspiration stays at category level, e.g. "a sealed shrine room at the end of a short side branch". Nothing is copied: quotes here exist only for receipts. Our version keeps the grow-then-fill shape and changes the sizes, the theme set and the caps.

## 7. Gaps

- Not read: `drlg_l2.cpp`, `drlg_l3.cpp`, `drlg_l4.cpp` (only their theme-call lines); `crypt.cpp`; `trigs.cpp`; `setmaps.cpp`; `town.cpp`; `CreateThemeRoom` body (`gendung.cpp` 96-183); the per-theme `Theme_*` bodies beyond the switch list.
- Half read: client only. Data half thin: `assets/levels/l1data` has 1 `.dun` file, `l2data` 1 and `towndata` 2 (counted, not read).
- Not in the half I read: idle/ambient animation, death and respawn presentation, loot reveal, walk density per 20 s of walking (needs a monster and object placement table, not read), readability beyond the tile grid.
- Verdict note: confidence high on the skeleton, the reroll and the theme passes (code read). The default branch of `SpecialThemeFit` was read in the fix pass (298: break, so the result is `CheckThemeReqs`, true for default types such as barrel), so barrel always fits.

## Defects (keep the idea, fix the defect)

1. Unbounded fallback retry: `while (!SpecialThemeFit(...)) j = GenerateRnd(17);` at `themes.cpp` 851-852 and 881-882 has no try cap. Fix: cap at 17 draws, then fall back to a theme with no fit test (a default-branch type such as barrel always fits: `themes.cpp` 298, 217-218). In practice the loop ends because those types exist, but the cap makes it explicit. Idea kept: good set first, then uniform fallback.
2. Unbounded write: `THEME_LOC &theme = themeLoc[themeCount];` (`gendung.cpp` 545) has no check; the array is MAXTHEMES = 50 (`dun_tile_data.cpp` 63). Only the cathedral loop checks the cap (`themes.cpp` 847). Fix: stop placing when `themeCount == MAXTHEMES`.
3. Legacy bounds check: `if (origin.x + maxSize > DMAXX && origin.y + maxSize > DMAXY)` (`gendung.cpp` 51) uses `&&` and the donor's own comment (52) calls it broken. The clamp that follows keeps indexes in range, so it does no harm. Fix: delete the check and rely on the clamp.
4. Vertical room workaround: the `CheckRoom` call at `drlg_l1.cpp` 474 swaps width and height and the comment says "workaround applied below". Fix: pass the transposed rectangle directly. Idea kept: vertical children.
5. Implicit "every tile": `FlipCoin(0)` is always true (see section 3), used by levels 2 and 3 (`drlg_l3.cpp` 2108, `drlg_l2.cpp` 2704). Fix: an explicit "every eligible tile" flag, same behaviour.
6. Compatibility quirk: `PlaceMiniSet` with `drlg1Quirk` skips positions with x or y at 12 or below (`gendung.cpp` 459-502). Fix: keep only behind a named flag where the original layout must match; otherwise drop it.
7. Latent reset bug: `DRLG_PlaceThemeRooms` does `memset(themeLoc, 0, sizeof(*themeLoc))` (`gendung.cpp` 525), which clears only element 0, not the array. Fix: clear the whole array, or default-construct each slot as it is placed.

Best transferable idea: grow each zone from a fixed hall skeleton with recursive side rooms, reroll from the saved seed until the walkable area clears a floor, then drop sealed theme rooms into free space behind a keep-out ring, each landmark at most once.

Reuse tag: new:room-grammar, new:theme-slot, new:unique-landmark, new:keepout-ring.
Brief rule served: FEEL-TASK procgen-grammars (zones as data, seeded, server-verified, one ledger, walk density).


## Checker findings (Sonnet 5.5 medium, 2026-10-12)

Verdict: MINOR
- Error: pipeline conflation. `DRLG_PlaceThemeRooms` is called only from drlg_l2.cpp:2704, drlg_l3.cpp:2108, drlg_l4.cpp:1190 (freq 0,0,8), never from L1; the cathedral picks themes from existing rooms via CheckThemeRoom (themes.cpp 846-860). Confirmed.
- Error: "a themed room is always sealed" holds only on the cathedral branch (CheckThemeRoom called at themes.cpp:848). Confirmed.
- Error: coin flip for vertical layout is line 511, not 519. Confirmed.
- Error: minarea 761 omits overrides level1=533, level2=693 (1172-1181). Confirmed.
- Error: each chamber is present only with 50 percent chance (512-517), not always three. Confirmed.
- Error: the note called the SpecialThemeFit default branch unread and barrel-always-fits unconfirmed; it is just `break` (298) so rv=CheckThemeReqs, true for default types. Confirmed.
- Missed: GenerateRoom rotate=FlipCoin(4) flips layout 1 in 4 (461-462). Added.
- Missed: memset(themeLoc,0,sizeof(*themeLoc)) at gendung.cpp:525 clears only element 0. Added as defect 7.
- Missed: per-level theme args (L2 6,10,3,0; L3 5,10,7,0; L4 7,10,6,8,rndSize). Added to step 4.
- Verified OK: GenerateRoom sizing and 20 tries, chamber offsets, pillars, GenerateLevel reroll/seed/stairs, FlipCoin(0), shrink by 2, nested roll, keep-out 2/3, MAXTHEMES 50, barrnd/librnd, fountain flag, bounds && check, CheckRoom swap, drlg1Quirk, licence.

Fixed 2026-10-12: split the L1 and L2-L4 paths in section 3; sealed-room claim limited to cathedral; line 511; level minarea overrides; chamber presence 50 percent; default branch now read; added rotate roll, per-level theme args and defect 7.
