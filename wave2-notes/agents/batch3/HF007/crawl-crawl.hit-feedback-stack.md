# crawl-crawl (hit-feedback-stack, feel note HF007)

Donor: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/` (Dungeon Crawl Stone Soup, one tree: engine, presentation and data together; data under `source/dat/`) | Licence: code GPL v2 or later (README line 96, per AU011); tile art mostly CC0 with some RLTiles public domain and unstated items (AU011). Shape only, clean-room. No code, tile art, text or donor number is reused.

Checked: verdict STRONG on the queued final-effect rule and the damage-tier punctuation; STRONG on the knockback stop rule. Read in full: `fineff.cc` queue (670 to 683, 2129 to 2140, plus the class list), `melee-attack.cc` call sites (1715, 3371, 3832) and `do_knockback` (4961 to 4990), `actor.cc` knockback (1055 to 1110) and the punctuation use (769), `attack.h` and `attack.cc` tier cut points (12 to 14, 739 to 749), `view.cc` shake class, `run_animation`, `flash_view`, `flash_tile` (225 to 258, 448 to 470, 562 to 576, 754 to 776), `view.h` scaled delay (26 to 29, 81), `player.cc` low-HP flash (4148 to 4154), `initfile.cc` option default (653), `spl-damage.cc` shatter use (1750 to 1790). Confidence high on the code paths; medium that the melee hit path has no flash (checked by grep of melee-attack.cc and actor.cc for flash calls: only one flash, a bog tile, unrelated). Half read: both halves are in this one tree (engine and data). No separate client or server half in the box (DC014). Data: the creature and description counts come from the catalogue (DC014) and asset audit (AU011), not recounted here; the data files were read by their rule lines, not as tables. Receipts: `receipts.tsv` (28 crawl rows; the file verifies 54 of 54 with the gate script together with the flare rows).

Best transferable idea: queue the feedback of a whole tick, merge same-kind effects (one shake, summed blood), and fire it once after the three attacks resolve, so three-on-one feedback is one beat, not three.

## 1. What the player sees and feels (375 wide)

It is a turn-based roguelike, so the feel is text and tiles. Each hit prints a line whose punctuation grows with the damage: a full stop for a light hit, one exclamation mark for a medium hit, two for a strong one, then more as the damage keeps climbing. A blood spot lands on the floor at the target's cell. A trample attack (a big monster that bulls forward) shoves the defender one tile back along the line from the attacker, if the tile is free and the size difference lets it; a wall, another monster or a constriction stops the push, and the stop is shown in a message. A pushed monster loses a few energy units, so it cannot act straight away and the shove reads as a shove. Big effects use a whole-view shake: a shatter spell or a Xom effect jolts the viewport for a fifth of a second, a set of random one-cell offsets (five frames at 40 ms each). Your own low HP shows a red full-view flash for 50 ms, and a warning line, when you cross a set percent of max HP (default 30).

## 2. Why it works, is it striking

- Readable at 375 wide: the punctuation scale gives a damage read with no numbers and no extra UI. It is the cheapest readable hit label I have seen.
- One signature behaviour: a push that stops at walls and monsters, plus an energy penalty so the pushed creature visibly loses its next move.
- One signature sound: none. The tree has no audio (AU011). So the sound half of this stack has to come from our own cues, not from this donor.
- Could be made ours at 20 to 30 percent resemblance: yes. The punctuation tiers, the blocking five-frame viewport jitter for a big spell, and the queued merge rule all map to a duel and to three attackers. Our shake must be a tile jitter, not a camera move, to fit the 375 layout.

## 3. The rule behind it (order, merge and gates)

Order for one melee attack (as the code runs):
1. The attack resolves and damage goes through the damage path (melee-attack.cc, around 3805 onward).
2. Damage message gets its punctuation tier from the damage (actor.cc 769, attack.cc 739 to 749). There are three cut points, weak, medium and strong (attack.h 12 to 14), and the top tier keeps adding marks with a log of the damage above the strong cut.
3. Trample or slippery-footing knockback runs only for a trample attack or slippery footing and not for a projectile (melee-attack.cc 4961 to 4990). The success check is a size-difference roll (4971).
4. A knockback steps one tile at a time along the line from the attacker, stops before anything in the way, moves each step (actor.cc 1072 to 1086), runs a collision at the end point with the damage value passed in, when the push moved and that value is above zero (1101), and then costs the pushed monster a few energy units (1107).
5. After each attack, the queued final effects fire (melee-attack.cc 1715). The queue merges same-kind effects when they are scheduled (fineff.cc 672 to 683): blood and deferred damage add up into one entry instead of several. Queued effects fire from the back of the queue (fineff.cc 2134 to 2135); the code says each one is removed before it fires so nothing can merge into it (2133).
6. Presentation blocks: a viewport shake runs its frames in a loop gated by the animation option (view.cc 564 to 571, shake class 448 to 456); a flash holds for its delay (view.cc 255, flash_tile default delay in view.h 81). Every such delay is scaled by the view-delay option against a default constant (view.h 28, defines.h 413).

Data fields (designer-tunable; donor values not recorded, GPL):
- `tier_weak_frac`, `tier_medium_frac`, `tier_strong_frac`: unit fraction of the victim's max HP. Set at the look test.
- `punct_scale_max`: unit count of exclamation marks at the top tier.
- `shake_frames`, `shake_frame_ms`, `shake_cells`: unit frames, ms, tiles (per axis).
- `flash_ms`: unit ms.
- `hp_warn_pct`: unit percent of max HP.
- `push_tiles`: unit tiles.
- `push_stun_energy_min`, `push_stun_energy_max`: unit energy units.
- `merge_rule`: enum (same-kind merges into one entry; kinds listed in the table).

## 4. For Frankendom

Lands in: TARGET `src/fight/hit-impact.ts` (new): the engine builds an ordered feedback queue per tick and fires it once after all attacks on that tick resolve. Parity row 10 (hit impact and hitstop) is the one row. The client plays the queue (shake, flash, text, sound, animation), since the camera, HUD and sound are client-only.

Mapping to our shape:
- Many-vs-one, max 3 attackers: schedule every hit from the three attackers into the queue during the tick; same-kind entries merge (one shake, one flash, damage text per hit); fire once at tick end. Three hits become one beat, not three shakes.
- Server-verified: the queue is an engine output, deterministic, and replayable (fight record, row 19). The shake offsets are client-only random.
- Server tick: the blocking delays in the donor are a turn-based pause. We do not copy the blocking. Any pause on a hit is a client presentation pause; the server tick keeps stepping (fixed step, input intake, per-tick NPC budget; row 18 and post-K item 3).
- 700 zones as data: the tier fractions, shake and flash times, and the push length are zone-level data fields with defaults.
- 100 Pit characters: one push and one stun-energy field for every creature; a heavy creature sets its own values.

Keep: the punctuation tier label (one readable number-free cue); the merge rule that collapses same-kind feedback in one tick; the push that stops at walls and monsters; the energy penalty on a pushed creature; the viewport jitter as a short blocking beat for big effects only.

Change: the donor fires its queue last-in first-out. For readability on a phone, fire first-in first-out so the first hit of three lands first. Keep the "remove before fire, so nothing merges into it" rule. Do not copy the blocking flash for normal hits; use it only for the low-HP warning and big effects. Replace the donor's percent-of-max-HP warning with our own threshold field.

## 5. Five-minute look test (Dom on his phone)

Build one 10-second clip: three attackers on one target, fight camera, 375 wide. Taps:
- A: one queued beat per tick (merged shake, tier punctuation, push stops at walls, pushed creature loses a beat).
- B: each hit fires its own shake and flash (what the donor would do without the merge).
- C: no shake, text only (control).
Dom judges which reads as one clear beat on the phone. Publish through the look-test `/preview/` flag; no release rows.

## 6. Licence and IP

Code is GPL v2 or later: clean-room, shape only; the fineff queue, the knockback loop and the view shake are not translated. Tile art is mostly CC0, with RLTiles public domain and some items with no stated licence (AU011); no tile is reused. Descriptions and yaml are covered only by the general GPL statement (AU011); no description or stat block is copied. Inspiration stays category-level: a tier-label cue, a merged queue per tick, a push that stops at walls.

## 7. Gaps

- Not read: `mon-death.cc` (death and corpse presentation), monster AI (`mon-behv.cc`, `mon-act.cc`), `spl-*.cc` bolt effects, `ouch.cc` (`inflict_damage`) in full, the wall-collision path (`actor::collide`), the tile PNGs (not viewed; AU011 read sizes only), `dat/des` vault files (counted only), `dat/mons` yaml (not read; counts from DC014).
- flash call sites: 117 in total (counted); about ten read. The melee hit path was checked for flash calls by grep and found none.
- Half read: both halves in one tree; the data pack was read by count and rule, not as a table.
- Not in this topic and not read: idle and ambient behaviour, loot reveal ceremony, walk density, boss staging.
- Donor numbers are not reproduced in the data fields (GPL); the values are to be set at the look test.
