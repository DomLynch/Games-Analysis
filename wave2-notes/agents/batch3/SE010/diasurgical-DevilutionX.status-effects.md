# diasurgical-DevilutionX (status-effects, batch3 SE010)

Donor: /mnt/frankendom-donors/diasurgical-DevilutionX/ (read over ssh; nothing copied, nothing run).
Licence: Sustainable Use License 1.0, non-commercial only (LICENSE.md line 1). Assets fall under it by location (README.md line 82). Blizzard copyright notice on the art (README.md line 86); origin of the in-tree art is not stated (AU015). Clean-room shape only: the donor's numbers are not copied into our data fields.
Asset audit used first: AU015 (diasurgical-DevilutionX.assets.md). Catalogue used first: DC018 (diasurgical-DevilutionX.catalogue.md). Receipts: receipts.tsv in this folder (80 receipts across both donors, all verified).
Verdict: STRONG. Confidence high for stagger, knockback, petrify, fear and the player flinch: I read the functions in full. Not read: the AI brain beyond the mode dispatch, the status sound mapping, the multiplayer path (dvlnet).
Half read: both (data pack: monstdat.tsv, item tables, spelldat row; engine: Source/monster.cpp, missiles.cpp, player.cpp, items.cpp, scrollrt.cpp, rectangle.hpp). The multiplayer server half was not read. No paired donor in the box for this game (OpenDiablo2 is a separate reimplementation, not read).
Best transferable idea: a hard hit (relative to the target's level) locks the target in its own hit-reaction animation, and petrify is a palette-swapped auto-hit window rather than immunity.
Reuse tag: not checked against our repo from this lane. Brief rule served: donor-first for a medium feature (status effects), judged by idea not genre.

## 1. What the player sees and feels
On a 375-wide phone, a heavy blow makes the foe freeze in its hit-reaction pose and then recover, so the player gets a short free window with no extra UI. A small poke does nothing visible to the foe, so "big hit = stagger" reads quickly. A knockback pushes the foe one tile back before the freeze. A petrified foe turns to a grey stone palette, stops acting, and every swing of the player's lands, so the status reads as "now it is easy". When it dies it shatters rather than playing its normal death. When a Fallen-type monster dies, nearby Fallen monsters scatter away from the body for several steps. On the hero side, the hero flinches only from hits above a threshold, and some item suffixes shorten that flinch by one to three animation frames.

## 2. Why it works / is striking
- Readable at 375: the stagger is a whole-body pose, not a number. The stone look is one palette swap over the existing sprite (scrollrt.cpp 394-395), so no new art is needed.
- One signature behaviour: the locked hit-reaction, with the foe's own act cancelled for its animation length.
- One signature effect: the stone palette swap while petrified, plus the shatter on death when petrified.
- Sound: the hit sound plays first in the hit routine (monster.cpp M_StartHit, read, not receipted). I did not map a separate status sound.
- Could be made ours at 20-30 percent resemblance: yes. The lock, the palette swap and the fear scatter all transfer; the names and the art do not.

## 3. The rule behind it
Order of operations for a landed hit on a monster (as read):
1. The hit lands from a melee swing, a missile, or a knockback weapon special (player.cpp 695; missiles.cpp 333). A petrified target has its roll forced to zero on every player path (player.cpp 543; missiles.cpp 289 and 1032), so it always hits. Monster-on-monster attacks do the same (monster.cpp 1116).
2. Knockback, if present: the foe's old tile moves one step away from the attacker when that tile is free (M_GetKnockback, monster.cpp 3950-3959). It then starts hit recovery whatever the damage, except golems get no mode change (monster.cpp 663). A petrified foe is never knocked back (monster.cpp 3950 path is gated by the caller, player.cpp 695).
3. Hard-hit test (IsHardHit, monster.cpp 986-995): whole-point damage at or above the foe's level plus a fixed offset. Four sneaky monster types are always hard hit (monster.cpp 989-993). A hard hit calls the stagger (M_StartHit, monster.cpp 3963-3979), except petrified foes (3975). A blink-type foe teleports on a hard hit instead (3968).
4. Hit recovery: the foe is locked in its GotHit animation. It returns to stand on the last frame (MonsterGotHit, monster.cpp 1470-1476; dispatch in UpdateModeStance, monster.cpp 3177-3178). Lock length equals GotHit frames times ticks per frame.
5. Death: a petrified foe that dies takes the shatter route. A normal foe plays its death animation. Then M_FallenFear runs (monster.cpp 4028): every living Fallen-type foe inside a square of radius 4 around the death tile gets the Retreat goal for max(8 minus its level, 2) steps (monster.cpp 4450-4466; square size from rectangle.hpp 25 and 30).

Stone curse, a timed petrify (missiles.cpp 2354-2406, 3685-3705):
- Timer = min(spell level + 6, 15), then shifted left by 4 (2403-2406). The shift is not explained in the code I read.
- Each pass of ProcessStoneCurse subtracts one (3687). When it reaches zero, a living foe gets its saved mode back (3703). A dead foe goes to the corpse path. A dead foe in shatter mode gets a fixed shatter timer of 11 (missiles.cpp 3692, not receipted).
- A second stone curse on a petrified foe is dropped (2390-2391).
- While petrified, the foe draws with the stone palette (scrollrt.cpp 394-395), and the visual mode reads the saved mode back from the curse (monster.cpp 4986-4993).
- Rune of stone places stone-curse missiles in a field (missiles.cpp 1271-1273, not receipted).

Player flinch and recovery (player.cpp 2641-2663):
- A hit whose whole damage is below the character level does not flinch. Barbarians add a quarter of their level to the threshold (2652-2655). A forced hit always flinches.
- An item with the fastest-recovery special skips 3 frames of the hit animation; 2 and 1 for the faster and fast tiers (2662-2667). The suffix rows that grant recovery are balance, stability and harmony (item_suffixes.tsv lines 93-95, FASTRECOVER tiers 1-3). How each tier maps to a flag is not read.
- A flat per-hit modifier is summed across worn items (items.cpp 2857, 2880). The Peril special spends it as self damage (player.cpp 631). This is a stat-modifier stack, not a status, but it sits in the same code path.

Counts (counted from the tables):
- monstdat.tsv: 112 base rows (lines 2-113). The GotHit slot (4th of frames[6]) is 0 to 11 frames. Counts by frame value: 0 (1 row), 1 (4), 4 (11), 5 (12), 6 (33), 7 (12), 8 (17), 9 (5), 10 (4), 11 (13). The GotHit rate (4th of rate[6]) is 1 in all 112 rows.
- KNOCKBACK monster flag: one row, the top boss (monstdat.tsv line 112, receipt).
- Four monster types are always hard hit (in code, not rows).
- Item suffix rows: 7 with GETHIT in item_suffixes.tsv (two curses, five good); 4 FASTATTACK rows; 3 FASTRECOVER rows. Unique rows: 21 lines mention GETHIT, FAST or KNOCKBACK tokens (grep count, not split by effect).
- spelldat.tsv: 36 spells plus a header row. The stone curse row exists; its column meanings were not decoded.

Data fields (designer-tunable; donor values are null because the donor is not MIT, Apache or BSD):
- hard_hit_level_offset (levels above foe level): null
- stagger_frames (frames per monster row): null
- stagger_ticks_per_frame (ticks): null
- knockback_tiles (tiles): null
- knockback_staggers (bool; the donor always staggers on knockback): null
- petrify_timer_base (spell level plus n): null
- petrify_timer_cap (units): null
- shatter_frames (frames): null
- fear_radius (tiles, square 2r+1): null
- fear_retreat_base (steps, minus foe level): null
- fear_retreat_min (steps): null
- flinch_threshold_level_bonus (levels; barbarian adds a quarter): null
- recovery_frames_skipped (frames, 0-3): null
- gethit_flat (damage per hit): null

## 4. For Frankendom
- Target: src/fight/status.ts (new module; the state lives in the engine, the client only draws). Parity row 1 (duel step/sim).
- Many-vs-one: the stagger is per foe, so the other attackers keep pressure while one foe is locked. Petrify as an auto-hit window is a reward for setting it up with the group (MAX_ATTACKERS = 3).
- Server-verified: the hard-hit test, the timers and the fear scatter run in the engine tick; the client receives a status event and plays the palette swap and the lock.
- Zones as data: the level offset, frame counts, timers and fear radius are zone or creature data. 100 Pit characters reuse the same few lock and palette rules.
- Keep: the hard-hit threshold relative to foe level (small pokes do nothing); the locked hit-reaction; petrify as auto-hit rather than immunity; no stacking for petrify; the fear scatter on a death.
- Change: no hidden shift on timers (fix: timers are explicit ticks in data). Knockback always staggers in the donor: fix: make it a data flag (knockback_staggers) and decide with the look test, because a stagger on every shove can read as free stun. The golem exemption becomes a heavy-foe flag.
- Defects in the donor, kept idea with fix: (a) undocumented shift on the stone timer, fix: explicit ticks; (b) knockback path does not check hardness, fix: the data flag above; (c) fear uses a square, not a circle; fix: kept as a square because the grid reads better on a phone.
- Decision: adapt (idea), defects fixed in the sketch below.

simplified: the sketch omits animation frame counting, the free-tile check of a knockback, the Peril and flat per-hit modifiers, and the stone palette. It keeps the donor's order: petrified takes no stagger; knockback always locks a non-golem; petrify does not stack. Timers are explicit data, not a hidden shift.

```ts
export {};

type Mode = "stand" | "hitRecovery" | "petrified" | "retreat";
interface Point { x: number; y: number }

interface Foe {
  ai: "fallen" | "other";
  level: number;
  golem: boolean;
  mode: Mode;
  tile: Point;
  oldTile: Point;
  retreatSteps: number;
  lockTicks: number;
}

// Every number is a designer-tunable data field. None is copied from the donor.
interface StatusData {
  hardHitLevelOffset: number;   // hard hit when damage (whole points) >= level + offset
  gotHitFrames: number;         // per monster row: frames of the stagger animation
  gotHitTicksPerFrame: number;  // per monster row: ticks per frame of that animation
  stoneBase: number;            // petrify timer = min(spellLevel + base, cap), in ticks
  stoneCap: number;
  stoneShatterTicks: number;    // shatter when a petrified foe dies
  fearRadius: number;           // tiles, square of side 2r+1 around the death tile
  fearRetreatBase: number;      // retreat steps = max(base - level, min)
  fearRetreatMin: number;
  flinchThreshold: number;      // whole damage needed to flinch the player
}

function isHardHit(foe: Foe, damageWhole: number, d: StatusData): boolean {
  return damageWhole >= foe.level + d.hardHitLevelOffset;
}

// Order: petrified takes no stagger; a hard hit stagger cancels the step taken this tick.
function hitFoe(foe: Foe, damageWhole: number, d: StatusData): void {
  if (foe.mode === "petrified") return;
  if (isHardHit(foe, damageWhole, d)) {
    foe.mode = "hitRecovery";
    foe.lockTicks = d.gotHitFrames * d.gotHitTicksPerFrame;
    foe.tile = { ...foe.oldTile };
  }
}

// Knockback always starts the stagger (even when the hit is not hard), unless golem or petrified.
function knockBack(foe: Foe, dir: Point, d: StatusData): void {
  if (foe.mode === "petrified") return;
  foe.oldTile = { x: foe.oldTile.x + dir.x, y: foe.oldTile.y + dir.y };
  if (!foe.golem) {
    foe.mode = "hitRecovery";
    foe.lockTicks = d.gotHitFrames * d.gotHitTicksPerFrame;
  }
  foe.tile = { ...foe.oldTile };
}

// Petrify does not stack: a second application on a petrified foe is dropped.
function petrify(foe: Foe, spellLevel: number, d: StatusData): number {
  if (foe.mode === "petrified") return 0;
  foe.mode = "petrified";
  return Math.min(spellLevel + d.stoneBase, d.stoneCap);
}

// A petrified foe that dies shatters instead of playing its death.
function onFoeDeath(foe: Foe): number {
  return foe.mode === "petrified" ? 0 : 1;
}

// Death of any foe pushes nearby Fallen-type foes away from the death tile.
function fearOnDeath(deathTile: Point, foes: Foe[], d: StatusData): void {
  for (const f of foes) {
    if (f.ai !== "fallen" || f.mode === "petrified") continue;
    if (Math.abs(f.tile.x - deathTile.x) > d.fearRadius) continue;
    if (Math.abs(f.tile.y - deathTile.y) > d.fearRadius) continue;
    f.mode = "retreat";
    f.retreatSteps = Math.max(d.fearRetreatBase - f.level, d.fearRetreatMin);
  }
}

function flinches(damageWhole: number, forced: boolean, d: StatusData): boolean {
  return forced || damageWhole >= d.flinchThreshold;
}
```

Typecheck: the block above was run as a file on the VPS with `npx -p typescript tsc --noEmit --strict --target es2020` and exited 0 (file removed afterwards).

## 5. A 5-minute look test Dom can judge on his phone
Build behind a style flag on the existing duel scene; publish to the preview folder (look-test skill). No release rows, no lock.
- Show the same foe three ways: a small poke, a hard hit, and a knockback. Judge whether the hard hit reads as a stagger and the poke does not.
- Show a petrified foe: grey palette, stops acting, every swing lands. Judge whether "easy now" reads without text.
- Show a Fallen-type pack when one dies: judge whether the scatter reads as a fear beat.
- Compare two lock lengths (short and long) and knockback with and without stagger. Pick the one that feels fair at 375 wide in a three-attacker fight.

## 6. Licence and IP
Sustainable Use License 1.0, non-commercial only. Inspiration stays category-level: "a stone-bound foe", "a stagger lock", "a fear scatter". No sprites, palettes, names or table rows are copied. Recreate as a clearly distinct original: keep the lock, the palette swap and the auto-hit window; change the names, the colours, the timers and the art. No legal conclusion is drawn.

## 7. Gaps
- Not read: the monster AI handlers beyond the mode dispatch; the status sound mapping; the petrified draw path in full; the full stone-curse column meanings in spelldat.tsv; how FASTRECOVER tiers map to the recovery flags; the tick length in milliseconds.
- Half read: data and engine logic; the multiplayer server half (dvlnet) was not read.
- Not in topic and not read: idle and ambient behaviour, loot reveal, walk density. Death presentation is covered only for the petrified shatter.
- Status icons: not checked for in the tree.
