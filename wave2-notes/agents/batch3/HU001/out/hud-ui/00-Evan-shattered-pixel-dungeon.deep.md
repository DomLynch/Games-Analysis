# 00-Evan-shattered-pixel-dungeon (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/ui/HealthBar.java` | Licence: GPL-3.0-or-later (per HealthBar.java header: "either version 3 of the License, or (at your option) any later version"; the repo LICENSE.txt is GPL v3) | Java | symbol `HealthBar.level(Char)`

Checked: Read in full: `HealthBar` 28-103 (createChildren, layout, both level overloads), `CharHealthIndicator` 28-72, `TargetHealthIndicator` 27-67, `Char.shielding` 794-805, `Char.incomingDOT` 811-828, `Char.resist` 1359-1375 (the function's start and the loop), `Buff.DOTbuff` 209-213, `Poison.totalIncomingDMG` 130-136, `Poison.act` 109-118 (the tick lines), `Burning.totalIncomingDMG` 262-268, `StatusPane.update` 297-331 (hero bar). Confidence: high on the layout order and the DOT sum; medium-high on the Poison mismatch (I ran the donor predictor and the act loop on the VPS and got 8 vs 7 for left = 4.5). Not read: `com.watabou.noosa` (the engine library is not in this donor), so the `ColorBlock.size()` and `scale` semantics are (not read); the `Dot.scale.x` clamp is taken as written. `Burning.act` was not read, so I do not know whether its predicted first hit matches its real tick. `ChampionEnemy.damageTakenFactor()` was not read. camera_scope: n/a (HUD, not camera).

Best transferable idea: Draw a unit's incoming damage as a darkened tail on its own health bar, computed from the same tick rule the engine uses, so the player reads what is about to be lost.
Decision (proposed): adapt - the layered, pixel-snapped bar and the DOT tail are the idea we want, but Frankendom's HUD is client-only, so the numbers must come from the engine's own tick function, not from per-status formulas in the HUD (the donor's hand-written predictors and dirty-flag cache would be a second ledger).
Acceptance: In a duel against a bleeding or burning enemy, its health bar shows a darker segment at the right end equal to the damage the engine will still apply to it; a server test asserts the preview equals the sum of the engine's remaining tick damage for the same state, for one integer and one fractional duration.

## 1. Mechanism

- A HUD bar is a `Component` with four stacked colour blocks: a red background at full width, a white shield segment, a green health segment, and a 40 percent black DOT segment drawn last, on top of the rest (`HealthBar.java` 48-57). The bar is re-laid-out from three fractions: health, health plus shield, and predicted incoming damage. All three are divided by one denominator.
- Denominator (`level(Char)`, 97-100): `max = max(HP + shield, HT)`. Health, health plus shield, and DOT are each divided by this `max`, so an over-full bar (shield pushing past max HP) is rescaled to fit, and the proportions still hold.
- Order of steps in `layout()` (64-80, read in full): set x and y on all four blocks (66-67); set the background to the full bar width (69); compute `pixelWidth = width x camera zoom` (72-73); set the shield width to `width x ceil(total x pixelWidth) / pixelWidth` (74); set the health width the same way (75); set the DOT width the same way (77); clamp the DOT scale to the shield segment (78); move the DOT block so it is right-aligned to the end of the shield segment (79). Each segment is rounded UP to a whole screen pixel, so a sliver of health never disappears.
- Prediction: `Char.incomingDOT()` (811-828) returns a cached sum. When the flag `needsIncomingDOTUpdate` is false it returns the cache (812-814). Otherwise it loops over the buffs: each `Buff.DOTbuff` adds `Math.round(resist(class) x totalIncomingDMG())` (819). Then each `ChampionEnemy` buff multiplies the running sum by `damageTakenFactor()` and takes `ceil` (822-824). The flag is cleared at 826 after the recompute.
- Per-buff predictions: Poison (130-136) sums `i/3 + 1` (integer division) for i from `ceil(left)` down to 1. Burning (262-268) returns `round(nextHit + ceil(left - 1) x avgDmg)`, where `nextHit` is rolled once and kept (264), and `avgDmg = 2 + depth/8` (266).
- Visibility: `CharHealthIndicator.update()` (per frame) shows its bar only if `HP < HT` or `shielding() > 0` or `incomingDOT() > 0` (55). It places the bar at 2/3 of the sprite width, offset by one sixth of the sprite width, 2 units above the sprite (51-53).
- Tick: this is render-driven, not a game tick. `update()` runs every frame and calls `level(target)`, which re-runs `layout()`. The prediction itself is recomputed only when a buff sets the dirty flag (for example Poison at 62, 67, 104 and 118; the other buffs are listed by grep only).
- Resistance: `Char.resist` starts at 1 (1369) and multiplies by 0.5 for each distinct resistance class that matches the effect (1371-1372). The TODO at 1359 says "do not stack", but the loop does multiply for every distinct matching class; I read the loop, not every caller, so I cannot say which reading the game relies on.

## 2. Key functions

- `HealthBar.layout` 64-80 (the whole sizing function, read in full).
- `HealthBar.level(Char)` 93-102 (the entry point the HUD calls; reads `HP`, `shielding()`, `incomingDOT()`, `HT`).
- `Char.incomingDOT` 811-828 (sum of resisted DOT predictions, champion multiplier, dirty-flag cache).
- `Char.shielding` 794-805 (cached sum of `ShieldBuff` amounts, same dirty-flag pattern).
- `Poison.totalIncomingDMG` 130-136 and `Poison.act` 109-118 (predictor and the real tick, read side by side).
- `Burning.totalIncomingDMG` 262-268 (predictor with a pre-rolled first hit).
- `StatusPane.update` 297-331, hero bar: the same three-segment idea, with its own normalisation (divide by HT, then rescale all three only when HP plus shield is above 1). Its DOT clamp is at 331 and its DOT position is right-aligned to the shield end.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Layered bar: background, shield, health, DOT tail drawn last | Background `0xFFAA0000` (theirs, HealthBar.java 30), shield `0xFFFFFFFF` (32), health `0xFF00EE00` (31), DOT `0x66000000` (33, 40 percent black). Draw order from 48, 51, 54, 57. |
| Round each segment up to one whole screen pixel | Pixel grid = bar width x camera zoom (73); the rounding is `ceil` (74-77) |
| One denominator for all segments | `max(HP + shield, HT)` (theirs, 98) |
| Bar height | 2 units for the health bar (theirs, HealthBar.java 35); 1 unit for the per-character bar (theirs, CharHealthIndicator.java 30) |
| Predicted incoming damage = sum of per-status predictions, resisted | `round(resist x total)` per buff (theirs, Char.java 819); resist starts at 1 (1369) and halves per distinct matching class (1372) |
| Champion multiplier on the whole sum, then ceil | `damageTakenFactor()` not read; `ceil` (theirs, Char.java 823) |
| Poison predicted tick `i/3 + 1` (integer division) | theirs, Poison.java 133 |
| Poison actual tick `(int)(left/3) + 1` on the float `left` | theirs, Poison.java 112; decrement by `TICK` at 115 |
| Tick length | `Actor.TICK = 1f` (theirs, actors/Actor.java 39) |
| Burning: first hit pre-rolled, then `2 + depth/8` per turn | theirs, Burning.java 264 (roll), 266 (average), 267 (total) |

Defect (found by reading, checked by a node run on the VPS, not patched in the donor): the Poison predictor starts its loop at `ceil(left)` (Poison.java 132), but the real tick uses the float `left` (112) and drops it by 1 each turn (115). For a fractional duration the prediction is one tick too high. The donor's own predictor gives 8 for `left = 4.5` and 4 for `left = 2.5`; the same float loop as `act()` gives 7 and 3. For whole durations they agree (for example `left = 3` gives 4 by both). Fix: loop on the float value exactly as the tick does. The sketch does this.

Second observation (not a defect I can prove): the dirty flags are set by hand in each buff (the grep found sets in Poison, Burning, Bleeding, Corrosion, Ooze and Corruption). A buff that changes its duration without setting the flag would show a stale bar. I did not check every buff, so this is a risk, not a confirmed bug. Fix for Frankendom: invalidate in the engine's own tick step, not in each status.

## 4. TypeScript sketch

simplified: keeps the donor's order: each segment rounded up to a whole screen pixel, one denominator `max(HP + shield, HT)`, the DOT tail clamped inside the shield segment and right-aligned to its end, and a poison predictor that runs the same float loop the tick uses. It omits the four colour blocks and their draw order, the Noosa `ColorBlock` scale semantics (not read), the per-buff resist and the champion multiplier in `incomingDOT()`, the Burning predictor, the dirty-flag cache, and the hero bar's separate normalisation path.

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface BarInput {
  hp: number;        // current health
  shield: number;    // absorb amount stacked on top of hp
  dot: number;       // damage the engine says will still land on this unit
  max: number;       // max HP (HT)
}

export interface BarSegments {
  hpFrac: number;    // green width, fraction of bar width
  totalFrac: number; // white shield segment ends here (hp + shield)
  dotFrac: number;   // darkened segment width
  dotOffset: number; // dot starts here, right-aligned to totalFrac
}

// Each segment is rounded UP to a whole screen pixel (px = barWidth * zoom).
// One denominator, max(hp + shield, max), so an over-full bar is rescaled to fit.
export function barSegments(i: BarInput, barWidth: number, zoom: number): BarSegments {
  const denom = Math.max(i.hp + i.shield, i.max);
  const px = barWidth * zoom;
  const snap = (f: number): number => Math.ceil(f * px) / px;
  const hpFrac = snap(i.hp / denom);
  const totalFrac = snap((i.hp + i.shield) / denom);
  const dotFrac = Math.min(snap(i.dot / denom), totalFrac); // dot cannot leave the bar
  return { hpFrac, totalFrac, dotFrac, dotOffset: totalFrac - dotFrac };
}

// Poison predictor. Uses the same float loop as the tick: each tick deals floor(left / 3) + 1,
// then left drops by 1 while left is above 0. Integer ceil(left) would add one tick for fractional left.
export function poisonIncoming(left: number): number {
  let total = 0;
  for (let t = left; t > 0; t -= 1) total += Math.floor(t / 3) + 1;
  return total;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0. A node run of the sketch's `poisonIncoming` loop gives 7 for 4.5 (same as the donor's act loop), checked on the VPS.

## 5. Lands in

- TARGET `src/fight/hud.ts` (proposed new client module; Frankendom's current HUD file was not read, so no "today:" line). It renders numbers the engine computes; the engine owns the DOT preview.
- Parity-checklist row 14 (HUD).
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: 14 (HUD, client-only); one-engine rule (the HUD reads the engine's numbers and never computes its own).

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism and the donor's lines are not copied.
- The DOT tail is only useful if Frankendom has damage over time. If it has none, keep the two-segment bar (health and shield) and reject the DOT part. This decision is not made by me; I did not read Frankendom's status model.
- The donor's predictor over-predicts for fractional durations (defect above). The sketch fixes it; the donor is not patched.
- The dirty-flag cache relies on each status remembering to flag a change. Frankendom should invalidate once in the engine's tick step.
- The Noosa `scale` and `size` semantics are (not read), so the exact DOT clamp is only what the code says.
- Pixel snapping is a client detail: the server never sees the bar grid. Snapping must use the client's own zoom, not a server value.
- Resist comment says "do not stack" but the loop halves for every distinct matching class (1359 against 1371-1372). Not a Frankendom issue, but the comment is wrong.

Also seen (hud-ui fold-ins; each one checked in the donor, not separate notes):
- Minimap and world map: no separate minimap or world-map UI in this donor (grep for map classes found only `GridTileMap` and `ScrollOfMagicMapping`). The level is shown in place with fog of war. The one map-like HUD piece is `ui/Compass.java`: it points to a chosen cell and is visible only when `visited` or `mapped` is set (Compass.java 60; the angle comes from `atan2` on the camera centre; `update()` is 51-70, read in full).
- Touch: `scenes/CellSelector.java` decides tap from drag by distance from the start point against a threshold of `defaultZoom x SIZE / 2` (58, 236). The hero is hit-tested first, within 12 units of its tile centre (94), with the comment about a 4 px overlap allowance (88). The code uses `SIZE` from `DungeonTilemap` and the tile size was not read, so the "4 px" is the comment's claim only.
- Lock-on and forgiveness: `ui/AttackIndicator.java` keeps its last target while the target is still a candidate (125), otherwise it re-picks at random from the candidates (130). The tap is dropped, with no queue, when the hero is not ready (183). The indicator dims to 0.3 alpha when disabled (42-43, 168-172). Grep of `actors/hero/Hero.java` for buffer, queue or pending found nothing relevant, so I found no input buffer.
- Accessibility: grep for colour-blind, handed or accessibility settings found no options outside the changelist strings. The one hit in code is a TODO about a second UI scale for mobile (`scenes/PixelScene.java` 75). I did not read the other grep hits.
- String table (grammar, no quotes): `assets/messages/ui/ui.properties` has 49 key lines in 52 lines total; `actors.properties` has 1606 key lines and `items.properties` 2072 key lines. There are 23 `ui*.properties` files (the base plus 22 locale variants). Keys are lowercased and namespaced by the class path without the package, with `.` between parts and `$` for nested classes (`Messages.java` 128, 133). Values use `%d` and `%s` placeholders filled by a locale-aware `String.format` (169), escaped newlines, and underscore-wrapped spans for emphasis. The renderer that reads the underscores was not read.

Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
Brief rule served: 14 (HUD, client-only); one-engine rule: the HUD never computes its own preview

## Checker findings (Sonnet 5.5 medium, 2026-10-12)

Verdict: CLEAN
- Trivia only: Burning average damage is 2 + Dungeon.scalingDepth()/8f (float, scalingDepth not depth) at Burning.java 266; the note writes depth/8. All other claims verified.
- Missed: none found.
