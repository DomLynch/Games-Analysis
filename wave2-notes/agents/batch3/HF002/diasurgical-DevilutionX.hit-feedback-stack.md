# Feel note: hit-feedback-stack, donor diasurgical-DevilutionX

Reader ID HF002. Depth: full. Half read: both (code and data tables; audio and sprite binaries not read).
Donor root: /mnt/frankendom-donors/diasurgical-DevilutionX (read over ssh, read-only).

## 1. What the player sees and feels
A hit on a monster is a short, fixed reaction and nothing more. The monster stops in place (its position is rolled back to the tile it came from, so it does not slide), plays its "got hit" frames, and a hit sound plays from one of two variants chosen at random, quieter with distance. There is no shake, no screen flash and no particle burst on a hit; the only visible cue is the monster's own recoil frames. A hard hit, one large relative to the monster's level, also cancels whatever the monster was doing and can teleport a few types or reset a scavenger's goal. On the hero's side, every hit makes the hero say a short line and redraws health; the hero only flinches (plays the hit animation and loses control for a moment) when the hit is big compared with the hero's level, and barbarians need a higher bar. A weapon or arrow with a knockback affix shoves the monster one tile away, and only one boss row in the monster table has the knockback ability.

## 2. Why it works, or is striking
- Readable at 375 wide: the recoil is a pose change plus a one-tile reset, so the eye reads "that one got hit" without any extra effect.
- One signature behaviour: the hard-hit versus ordinary-hit split. Most hits are a sound and a short recoil; only big hits stagger, cancel and change the monster's goal.
- One signature sound: two hit variants per monster, and a rule that a variant does not restart while it is still playing. In a crowd this stops three hits from stacking into noise.
- Could be made ours at 20-30 percent resemblance: yes. Keep the ordering and thresholds; use our own recoil frames, sounds and numbers.

## 3. The rule behind it (ordering and thresholds)
Monster hit by the player (order as in code):
1. Hit sound first, always. Pick variant 1 or 2 at random. Skip if that variant is still playing. Volume and pan from distance to the listener.
2. Hard-hit check: damage divided by 64 is compared with the monster level plus 3. Four types (sneak, stalker, unseen, illusion weaver) are always hard-hit.
3. Ordinary hit: nothing else. Recoil is only the hit-sound.
4. Hard hit: type-specific reaction (teleport, scavenger goal reset), then the got-hit state. The monster's position is set back to its previous tile and its occupancy is cleared, then the got-hit animation plays.
5. Knockback (only from a knockback weapon or arrow affix, or a table flag): move the monster one tile away from the attacker if that tile is free, then got-hit state.

Hero hit by a monster (order as in code):
1. Hero grunt line and health redraw, always.
2. Flinch threshold: damage divided by 64 must reach the hero's level (barbarian: level plus a quarter of level). Below it, no flinch.
3. Flinch animation with recovery skip: 0 to 3 frames skipped, from three recovery-speed affixes (fast, faster, fastest).
4. If the monster has knockback: a second flinch (if not already flinching), then the hero is moved one tile in the monster's facing if the tile is walkable.

Data fields (designer-tunable; donor values null because the licence is not MIT, Apache or BSD):

| name | unit | donor_value_or_null |
|---|---|---|
| hard_hit_divisor | damage units | null |
| hard_hit_level_offset | monster levels | null |
| hero_flinch_level_scale_barbarian | ratio | null |
| hero_flinch_level_scale_other | ratio (1.0) | null |
| recovery_skip_frames_fast / faster / fastest | frames (1, 2, 3) | null |
| hit_sound_variants_per_monster | count (2) | null |
| hit_sound_skip_if_playing | boolean | null |
| gothit_frames_per_monster | frames (table slot 3) | null |
| gothit_rate_per_monster | rate units (not read) | null |
| knockback_tiles | tiles (1) | null |

Counts from the data tables (read):
- monstdat.tsv: 112 monster rows, 41 columns. The got-hit slot has 1 to 26 frames (median 10) and rate values 1 to 30 (median 14). Rate unit not verified.
- abilityFlags KNOCKBACK: 1 row (the boss row MT_DIABLO). No other monster row has it.
- Item knockback: 1 suffix row (item_suffixes.tsv) and 3 unique rows (unique_itemdat.tsv).
- effects.tsv: 814 lines. Four names mention hit or impact, all spell impacts (fire, lightning, bone spirit, blood star). No per-monster hit names; monster hit sounds are built from the monster's sound suffix in code, not listed in this table.
- Hit-recovery affixes: three enum values in Source/tables/itemdat.cpp. Their rows were not found in assets/txtdata (a search for "recovery" in assets found only class animation rows).

## 4. For Frankendom
- 700 zones as data: keep the feel as data rows, not code. One reaction row per character family (got-hit frames, rate, sound variant count) is reused across zones, so a zone only chooses the family.
- 100 Pit characters reused: the hard-hit divisor and level offset belong to the family row, so a reused character keeps its feel and a recolour does not need new rules.
- Many-vs-one, max 3 attackers: the two rules that matter most are the sound skip-if-playing rule and the hard-hit-only stagger. Together they keep three simultaneous hits readable.
- Server-verified: the server decides damage, hard-hit and knockback tile (a position change in the ledger). The client only presents: sound variant pick and recoil frames are cosmetic and must not use server RNG.
- Keep: hit sound first, always; stagger only on hard hits; hero flinch threshold tied to hero level; knockback as a one-tile server move.
- Change: no hit sound randomness that feeds the server; no knockback that changes state on the client only; add a visible attacker-side cue for three attackers (the donor has none, see the dhewm3 note).

## 5. Five-minute look test (Dom, phone)
Build one duel scene with a dummy and three attackers (left, right, front), behind a flag such as feel_hit_profile with three values:
- A: sound and got-hit recoil only (the donor's ordinary hit).
- B: A plus stagger on hard hits (cancel and roll-back), with a threshold you can nudge.
- C: B plus one-tile knockback from a knockback affix.
Dom taps each profile three times with three attackers on. Question for him: which profile tells you which attacker hit you, and which hit reads as a big hit, within one second? Compare the three on the same phone. No release rows, no lock.

## 6. Licence and IP
- Code: Sustainable Use License 1.0, non-commercial use only; not an open-source licence (LICENSE.md line 1; README.md line 84).
- Assets: no separate licence file; the repo-wide SUL is said to cover assets/ (README.md line 82). A Blizzard Diablo copyright notice is in the README (line 86). The origin of the in-tree art is not stated. The player must copy the game data from their own copy.
- Treat as category-level inspiration only: "a stagger on hard hits with a sound variant pick". No code, no sprite, no sound, no names, no numbers from the donor are kept.
- Recreate as a distinct original: keep the ordering rule and the threshold idea; change our numbers, our recoil frames, our sounds and our reaction-row names.

## 7. Gaps
- Read: Source/monster.cpp (hit, knockback, sound), Source/player.cpp (StartPlrHit), Source/missiles.cpp (knockback arrow, hit sound), Source/items.cpp (knockback affix), Source/tables/itemdat.cpp (recovery enum names), monstdat.tsv header and rows, effects.tsv names, item and unique rows with KNOCKBACK.
- Searched Source/ for hitstop, shake, flash, particle, spatter, knockback: no hit-stop, no shake and no hit flash or particle code found for monster or player hits. The only flash hits are the Flash spell missiles, not a hit effect.
- Not read: audio (the tree has no audio files; sound paths only), sprite and animation binaries (CLX and TRN), the class animation tables beyond the recovery-frame line, the affix table rows for recovery, the external devilutionx-assets repository, and the test folder.
- Rate unit for the got-hit slot not verified.
- Half read: both code and data tables; audio absent from the tree.
