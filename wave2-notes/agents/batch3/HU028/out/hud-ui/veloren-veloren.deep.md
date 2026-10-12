# veloren-veloren (hud-ui, cell 1)

Donor: `/mnt/frankendom-donors/veloren-veloren/voxygen/src/hud/overhead.rs` (with `voxygen/src/hud/mod.rs`, `voxygen/src/session/target.rs`, `common/systems/src/buff.rs`) | Licence: GPL-3.0 (read: `/mnt/frankendom-donors/veloren-veloren/LICENSE` is the GNU GPL v3 text) | Rust (HUD, buffs, combat) plus Fluent `.ftl` strings | symbol `should_show_healthbar`

Checked: Read `overhead.rs` 60-110 and 170-420 (the rest of the widget not read), `session/target.rs` 1-232 (232-356 not read, including the second sort at 281), `common/systems/src/buff.rs` 700-745 and 450-455, `common/src/comp/buff.rs` 425-440, `common/src/comp/stats.rs` 56-58 and 170-175, `common/systems/src/stats.rs` 80-92, `common/src/comp/health.rs` 113-121. Read the gate and constants in `hud/mod.rs` (224-237, 2440-2500, 5440-5470, 5560-5580). Read `common/src/combat.rs` 2126-2185 (the rating), `ecs/sys/floater.rs` 55-70, `settings/interface.rs` 30-95. Not read: `minimap.rs`, `map.rs`, the mount and rider branches, the group colour branch, the enclosing loop of the buff pass, the caller loop that feeds `Overhead`. Confidence high on the frame gate, the ghost bar and the curse decay order (the stat reset at buff.rs 454 and the write at systems/stats.rs 85 were both read). Medium on whether every buff path is covered (one buff kind read).

## 1. Mechanism

- Enemy frame (name, health bar, rating colour). Each entity inside the overhead loop passes one gate (mod.rs 2456-2478). Not the player's own entity. Then one of: targeted (`info.target_entity`), selected, hurt (`should_show_healthbar`: current is away from maximum, or current is below base max), in your group, or marked. Then distance must be below a range that depends on the case: group 1000, after you hit it within 60 s 120, otherwise 40 (donor units).
- Damage timer: each hit you land resets `time_since_last_dmg_by_me` to 0 (mod.rs 5459-5461); the floater system adds frame `dt` to it each frame (floater.rs 64-68). So the wider range is time-based, not frame-based.
- Bar contents (overhead.rs 300-410): fill = current over `max(base_max, maximum)` (174), in enemy red for non-group (345). A purple "ghost" segment (QUALITY_EPIC, 366) is drawn only when `decayed = 1 - maximum/base_max > 0` (312, 350). Its width is `decayed x 73` (357) and it sits against the right end. So a lost max is shown as a separate purple piece, not as a missing red one.
- Curse that makes the ghost: the `Cursed` buff (common/src/comp/buff.rs 429-440) lowers max health at -1.0 HP per second (additive, 431-432) toward `1 - strength` of base max (433), and also does a -1.0 damage-over-time tick every 0.5 s (435-440, the tick line is in that block). The max is recomputed from base on each buff pass: `stat.reset_temp_modifiers()` (systems/buff.rs 453-454; the enclosing per-entity loop not read), the curse multiplies `mult_mod` (744) by `achieved_fraction` (733), `maximum = base x mult + add` (common/src/comp/stats.rs 57), and the health maximum is written when it changed (systems/stats.rs 85; health.rs 114). The fraction is closed-form in buff age (`potential = 1 + elapsed x rate / base`, 706 and 714), not an accumulator, so frame rate does not change the decay.
- Rating colour: `combat_rating` (common/src/combat.rs 2168-2183) is a weighted average of six normalised parts (health 1.5, energy 0.5, poise 0.5, precision 0.5, skills 1.0, weapon 1.0), times a body multiplier. `cr_color` (hud/mod.rs 5560-5580) maps the rating to a colour band: edges 2.0, 3.5, 6.5, 8.5, 10.4, 122 (artifact), 200 (debug). The frame shows a skull when the rating is above 122 and the entity is not grouped (overhead.rs 416-419), with a random flicker.
- Lock-on (cursor target, not a lock): `targets_under_cursor` (session/target.rs 46-207). The entity search stops at the first solid block (117-122, `max_target_dist`). Candidates are filtered by a radius of 3.0 times body size (147-149). If the player is wielding, candidates are ranked by distance to the aim ray (177) and a hit needs `rayDist < radius + camDist/10` (192-193). If not, ranked by distance to the camera surface (179) and a hit needs `rayDist < radius` (195). The donor says `// TODO: fuzzy borders` (186). The final test is the player-to-target cylinder distance under 500 (207).
- Strings: `assets/voxygen/i18n/en/hud/*.ftl`, 15 files, about 1004 top-level message lines (grep count; attributes and comments not counted). Fluent syntax, `{ $name }` variables, plural selectors with `*[other]` default and `[one]` forms (misc.ftl 87, bag.ftl 55). Code asks for a key with `i18n.get_msg` (overhead.rs, e.g. the dead label).

## 2. Key functions

- Frame gate: `/mnt/frankendom-donors/veloren-veloren/voxygen/src/hud/mod.rs` 2456-2478.
- Health visibility and ghost test: `/mnt/frankendom-donors/veloren-veloren/voxygen/src/hud/overhead.rs` 82-89 and 307-368.
- Ghost bar: `/mnt/frankendom-donors/veloren-veloren/voxygen/src/hud/overhead.rs` 312, 350-368.
- Damage timer reset and tick: `/mnt/frankendom-donors/veloren-veloren/voxygen/src/hud/mod.rs` 5459-5461 and `/mnt/frankendom-donors/veloren-veloren/voxygen/src/ecs/sys/floater.rs` 64-68.
- Curse decay: `/mnt/frankendom-donors/veloren-veloren/common/systems/src/buff.rs` 701-744 (with reset at 453-454).
- Lock-on pick: `/mnt/frankendom-donors/veloren-veloren/voxygen/src/session/target.rs` 117-207.
- Rating: `/mnt/frankendom-donors/veloren-veloren/common/src/combat.rs` 2126-2183 and `/mnt/frankendom-donors/veloren-veloren/voxygen/src/hud/mod.rs` 5560-5580.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Show an enemy frame only when it matters: targeted, selected, hurt, grouped, marked, inside a range | Ranges 40 / 120 / 1000 units (mod.rs 230, 235, 228); hit window 60 s (233) |
| Range widens after you hit, and the timer is reset by your own hit only | Reset on own hit only (mod.rs 5459-5461); timer is dt-based (floater.rs 66-68) |
| Lost max shown as a separate ghost segment, drawn only when positive | Colour QUALITY_EPIC (mod.rs 184); width = lost share x 73 (overhead.rs 357) |
| Fill = current over the larger of base max and max | None, a formula (overhead.rs 174) |
| Curse: max falls at a fixed rate, stops at 1 - strength of base | Rate -1.0 HP/s (buff.rs 431); strength from the source (zone data in Frankendom) |
| Rating: weighted average of normalised parts, then colour bands | Weights 1.5 / 0.5 / 0.5 / 0.5 / 1.0 / 1.0 (combat.rs 2136-2180); bands 2, 3.5, 6.5, 8.5, 10.4, 122, 200 (mod.rs 5561-5570) |
| Lock-on: rank by ray distance when wielding, widen radius by camera distance / 10 | Max range 500 (target.rs 46); radius scale 3.0 (target.rs 147); divisor 10 (target.rs 193) |

## 4. TypeScript sketch

simplified: the sketch keeps the frame gate (mount and rider tests and the group colour split are left out), the bar fractions, the closed-form curse with the strength-0 fix (the donor's curse damage-over-time, its tick and the donor's cursor ray are left out), the lock-on pick with the ray distances passed in (the donor builds them from the camera and the terrain ray), and the rating and its bands (the skull flicker and the body multiplier input are left out). Defect fixed in the sketch: the donor divides and compares to clamp the curse, and that never clamps when strength is 0 (buff.rs 725-733: target 1.0 gives progress 1.0, so the `> 1.0` branch is never taken), so max health falls forever. The sketch clamps directly with `Math.max`.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

interface Health { current: number; maximum: number; baseMax: number; }

// Donor nametag ranges (hud/mod.rs 228-235), donor units
const NAMETAG_GROUP_RANGE = 1000;
const NAMETAG_RANGE = 40;
const NAMETAG_DMG_RANGE = 120;
const NAMETAG_DMG_TIME = 60; // seconds

const HEALTH_EPS = 1e-3;

interface FrameInput {
  isSelf: boolean;
  isTargeted: boolean;
  isSelected: boolean;
  isGrouped: boolean;
  isMarked: boolean;
  health?: Health;            // undefined = no health component
  distance: number;
  secondsSinceHitByMe?: number;
}

// Donor should_show_healthbar (overhead.rs 82-84): current away from maximum, or below base max
function shouldShowHealthbar(h: Health): boolean {
  return Math.abs(h.current - h.maximum) > HEALTH_EPS || h.current < h.baseMax;
}

// Donor decayed_health_displayed (overhead.rs 87-89): the lost share of base max
function decayedFraction(h: Health): number {
  return 1 - h.maximum / h.baseMax;
}

// Donor frame gate (hud/mod.rs 2456-2478): own entity never; otherwise targeted, selected, hurt, grouped or marked,
// inside a range that is wider for groups and for a few seconds after you hit it.
function frameVisible(f: FrameInput): boolean {
  if (f.isSelf) return false;
  const hurtOrUnknown = f.health ? shouldShowHealthbar(f.health) : true;
  const gate = f.isTargeted || f.isSelected || hurtOrUnknown || f.isGrouped || f.isMarked;
  let range = NAMETAG_RANGE;
  if (f.isGrouped) range = NAMETAG_GROUP_RANGE;
  else if (f.secondsSinceHitByMe !== undefined && f.secondsSinceHitByMe < NAMETAG_DMG_TIME) range = NAMETAG_DMG_RANGE;
  return gate && f.distance < range;
}

// Donor bar maths (overhead.rs 174 and 312): fill = current over max(base max, maximum);
// ghost = lost share of base max, drawn only when positive (overhead.rs 350).
function barFractions(h: Health): { fill: number; ghost: number } {
  const ghost = decayedFraction(h);
  return { fill: h.current / Math.max(h.baseMax, h.maximum), ghost: ghost > 0 ? ghost : 0 };
}

// Lock-on pick (session/target.rs 176-195). Wielding: rank by distance to the aim ray and widen
// the hit radius by camera distance / 10. Not wielding: rank by distance to the camera surface, plain radius.
interface Cand { id: number; camDist: number; rayDist: number; radius: number; }
function pickTarget(cands: Cand[], wielding: boolean): number | undefined {
  const sorted = [...cands].sort((a, b) =>
    wielding ? a.rayDist - b.rayDist : (a.camDist - a.radius) - (b.camDist - b.radius)
  );
  for (const c of sorted) {
    const reach = wielding ? c.radius + c.camDist / 10 : c.radius;
    if (c.rayDist < reach) return c.id;
  }
  return undefined;
}

// simplified: the donor's curse decays on the buff age and is recomputed from base each pass (buff.rs 706-744),
// with the donor's curse damage-over-time left out. The fix is here: donor divides and compares,
// which never clamps when strength is 0 (target 1.0); this clamps directly.
// Donor Cursed (common/src/comp/buff.rs 429-433): rate -1.0 HP per s, target fraction 1 - strength.
function cursedMaximum(baseMax: number, ageS: number, strength: number, rateHpPerS = 1): number {
  const target = 1 - strength;                           // share of base max the curse stops at
  const potential = 1 - (ageS * rateHpPerS) / baseMax;   // share left after the buff's age
  return baseMax * Math.max(potential, target);
}

// Donor combat_rating (common/src/combat.rs 2168-2183): weighted average of six normalised parts, times a body multiplier.
interface RatingParts { health: number; energy: number; poise: number; precision: number; skills: number; weapon: number; }
const W = { health: 1.5, energy: 0.5, poise: 0.5, precision: 0.5, skills: 1.0, weapon: 1.0 };
function combatRating(p: RatingParts, bodyMultiplier: number): number {
  const sum = p.health * W.health + p.energy * W.energy + p.poise * W.poise
    + p.precision * W.precision + p.skills * W.skills + p.weapon * W.weapon;
  const wsum = W.health + W.energy + W.poise + W.precision + W.skills + W.weapon;
  return (sum / wsum) * bodyMultiplier;
}

// Donor cr_color bands (hud/mod.rs 5560-5580), returned as band names.
function ratingBand(r: number): string {
  if (r >= 200) return 'debug';
  if (r >= 122) return 'artifact';
  if (r >= 10.4) return 'legendary';
  if (r >= 8.5) return 'epic';
  if (r >= 6.5) return 'high';
  if (r >= 3.5) return 'moderate';
  if (r >= 2.0) return 'common';
  if (r >= 0) return 'low';
  return 'xp';
}
```

Typecheck: `tsc --noEmit --strict --target es2020` on the VPS (`/tmp/HU028-veloren-hud-ui.ts`, export {} appended): exit 0.

Best transferable idea: Show an enemy frame only when it matters (targeted, selected, hurt, grouped or marked, and within a range that widens after you hit it), and draw lost max HP as a separate ghost segment so a curse reads at a glance.
Decision (proposed): adapt — keep the gate and the ghost segment as a client view of engine state in `src/fight/enemy-frame.ts`; reject the cursor aim ray (a phone has no cursor, and the layout is read at 375 wide); put the max-HP curse in the engine with the strength-0 clamp fixed.
Acceptance: On a 375-wide phone, an enemy's frame appears only when it is targeted, selected, grouped, marked, hurt, or was hit by you within 60 s (then 120 units), and a curse shows a purple segment equal to the lost max HP; a server test asserts max HP stays at base when a curse of strength 0 has run for 1000 s.

## 5. Lands in

- TARGET `src/fight/enemy-frame.ts` (new, client-only view of engine state; the engine never reads it). Parity-checklist row 14 (HUD). The curse decay belongs in the engine (`src/fight/`, one ledger); the lock-on pick would be `src/fight/target-pick.ts` under row 5 (input), not built here.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 1 (one engine; the HUD is a client view); the rulings "camera/HUD/sound are client-only" and "one ledger" for the curse.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism and the numbers are the donor's, marked as theirs.
- Many-on-one: the donor's closure draws a frame for every entity that passes the gate, with no cap seen in mod.rs 2440-2480. The caller loop was not read. Frankendom needs a client cap (MAX_ATTACKERS = 3 is an engine rule) so that a 375-wide screen does not fill with frames.
- Curse clamp defect (kept idea, defect fixed): donor buff.rs 725-733 never clamps at strength 0 because `progress` is set to 1.0 and the test is `> 1.0`. Fix: `Math.max(potential, target)`, as in the sketch. Reachability of strength 0 from a real source was not checked.
- The curse also does damage over time (buff.rs 435-440). If Frankendom adopts a curse, that damage must go through the one damage ledger, not a HUD path.
- Lock-on: the donor picks from a mouse aim ray. A phone has no cursor, so the ray has no direct equivalent on the 375-wide layout. Transfer is the forgiveness rule only: rank by distance to the tap point in screen space and widen the hit radius with distance. Not verified on touch.
- Risk, not an observed bug: the sort uses `partial_cmp(...).unwrap()` (target.rs 177 and 179), which panics on NaN distances. Fix: `total_cmp`.
- The donor says `// TODO: fuzzy borders` (target.rs 186). Only the radius widening exists.
- Not read: `minimap.rs` (1129 lines) and `map.rs` (1749 lines), so the minimap and world map are not rated here. Touch UX: grep only (26 hits for "touch", winit event plumbing in `voxygen/src/ui/event.rs` and `voxygen/src/ui/ice/winit.rs`); no touch layout found, not read in full. Accessibility: one setting read, `always_show_bars` (settings/interface.rs 33, default false at 91; used in buffs.rs 148 and skillbar.rs 550, not read in full).
- Strings: the table is Fluent and about 1004 message lines (grep count, not a line-by-line count). Its grammar is selectors with `*[other]` and `[one]` for counted units. Frankendom only needs this if it ships more than one language.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: 1 (one engine; HUD is a client view); HUD row 14; curse ledger rule.
