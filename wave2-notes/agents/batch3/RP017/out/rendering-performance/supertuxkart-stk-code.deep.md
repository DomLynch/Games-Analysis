# supertuxkart-stk-code (rendering-performance, cell 1)

Donor: `/mnt/frankendom-donors/supertuxkart-stk-code/src/graphics/lod_node.cpp` | Licence: GPL-3.0-or-later (lod_node.cpp line 7: "either version 3 of the License, or (at your option) any later version"; COPYING says the code is GPL v3 or later) | C++ | symbol `LODNode::autoComputeLevel` + `LODNode::getLevel`

Checked: Read in full: lod_node.cpp 18-310 (header GPL block at 1-17 seen via line 7), draw_calls.cpp 1-271 (LOD branch and the per-frame walk; the frustum test isCulledPrecise is read but is not the subject here), lod_node.hpp 18-138. Callers checked by grep over src and lib/graphics_engine: `autoComputeLevel` has two callers (model_definition_loader.cpp:155, item.cpp:253); `getLevel` has callers at draw_calls.cpp:157-158 and lod_node.cpp:165, 186; `forceLevelOfDetail` at kart_model.cpp:1072 and 1087. Confidence high on the LOD mechanism. Not read: Irrlicht `getArea()` (the area definition), the level meshes, whether shadow passes reuse the same level, and how the kart LOD nodes at kart_model.cpp:595 and track_object_presentation.cpp:914 are built beyond their add() calls. The hint file for this cell, `lib/graphics_engine/src/ge_vulkan_draw_call.cpp`, was opened (header and function list; `generate()` at 364 not read). It is a Vulkan draw-command builder and a candidate for a separate note on draw-call batching, not this one.

Best transferable idea: Pick each prop's detail level from its on-screen size proxy (bounding-box area times scale), let the quality tier scale the draw distance, and skip the top level when it would only show up very close.
Decision (proposed): adapt — the area formula and the switch-floor skip are cheap and fit zones-as-data, but the donor keeps two sources of truth (authored distances are overwritten), so Frankendom takes one source per prop and pins duel actors to level 0.
Acceptance: On the lowest quality tier a zone prop at its draw distance steps down one level and never shows its top mesh at close range, and the up to 3 engaged attackers stay on level 0 for the whole duel (a client test asserts the pin).

## 1. Mechanism

- Each frame, `DrawCalls::parseSceneManager` walks the scene graph. For a LOD node (draw_calls.cpp 151) it calls `updateVisibility()` (154). That marks the cached level dirty and shows only the chosen child (lod_node.cpp 164-169). The walk then recurses into the chosen child plus any non-LOD children (draw_calls.cpp 157-158). The other levels are hidden and never drawn.
- Level choice, `getLevel()` (lod_node.cpp 70-116), in order:
  (a) Return the cached level if the dirty flag is clear (79-81).
  (b) With no active camera, return the coarsest level (85).
  (c) Take the squared distance from the camera to the first node, which is the highest-quality node (88-89).
  (d) Scale every threshold by the user LOD multiplier, once (93-98; multiplier default 1.0 at irr_driver.cpp 221).
  (e) Walk from the best level to the coarsest. Pick the first level n where distance² < threshold[n] and, unless n is the last level, threshold[n] is above the switch floor (101-113). The comment (104-106) gives the reason: a high level that would only win when very close is skipped if a lower level exists, "It's better to display a low level than to have the high-level pop suddenly."
  (f) Nothing matched: return -1 and hide every level (114-115).
- Threshold build, `autoComputeLevel(scale)` (lod_node.cpp 204-280), in order:
  (a) Area times the scale argument (206). Area is the bounding-box area of the last node added (284-285).
  (b) Two curves from the area: p2 = 20 + 7·sqrt(a+10) and p4 = 50 + 22·sqrt(sqrt(a+2)) (215-216).
  (c) Blend ratio: p4 < 210 gives p4/220; 210 to 230 gives (105 + 0.5·p4)/220 (smooth transition); 230 and above gives 1 (220-225).
  (d) Max draw distance = ratio·p4 + (1−ratio)·p2 (227).
  (e) Multiply by the quality tier's aggressivity (231-238), set by `UserConfigParams::m_geometry_level`, which is read at build time, not per frame.
  (f) Switch floor distance = ((max draw × tier factor) + 100) / 2 (241-249). The factor is the tier's switch multiplier, not a separate curve.
  (g) Square the max draw and the switch floor (256-257).
  (h) Split the squared range into N thresholds: `step = int(maxSq) / N`, then `threshold[i] = (step / (N−i)) · (i+1)` (263-270). The top level ends at maxSq/N² (a distance of max/N), and the coarsest ends at maxSq (distance max).
  (i) The node's box is taken from the last (coarsest) level (279).
- Authored distances: `add(level, node, reparent)` pushes `level*level` as the threshold (301) and jitters the previous last threshold by up to ±20% with the global `rand()` (291-293; `srand(time(0))` at main.cpp 2276). `autoComputeLevel` then overwrites every threshold (266-270). So for the two callers that call it, the authored distances only set the order of the levels and feed the jitter. Those two callers are the track-object LOD groups (model_definition_loader.cpp 155) and items (item.cpp 253, with the fixed value 24). Other LOD nodes never call `autoComputeLevel`; their thresholds stay as `add()` stored them (see kart_model.cpp 598, below).
- Single-level use as a visibility cut: kart_model.cpp 598 calls `add(human_player ? 10000: 100, node, true)`. With one level, `getLevel()` returns -1 once the squared distance reaches the stored value, so the node is hidden. By arithmetic on this code, a non-human kart is hidden beyond 100 units and a human kart is effectively never hidden (the code path was not read beyond this call).

Worked example (my arithmetic from lines 263-268, not run): with N = 3, the squared thresholds are maxSq/9, maxSq/3 and maxSq. Their distances are max/3, max/√3 and max.

## 2. Key functions

- `LODNode::getLevel`: `/mnt/frankendom-donors/supertuxkart-stk-code/src/graphics/lod_node.cpp` 70-116. The per-node choice: cache, camera distance, LOD multiplier, pick with the switch-floor skip.
- `LODNode::autoComputeLevel`: `/mnt/frankendom-donors/supertuxkart-stk-code/src/graphics/lod_node.cpp` 204-280. Builds the thresholds from area, scale and quality tier.
- `LODNode::add`: `/mnt/frankendom-donors/supertuxkart-stk-code/src/graphics/lod_node.cpp` 282-310. Stores authored levels as squared thresholds and takes the area from the node added last.
- `DrawCalls::parseSceneManager`, LOD branch: `/mnt/frankendom-donors/supertuxkart-stk-code/src/graphics/draw_calls.cpp` 151-158. Calls `updateVisibility`, then passes only the chosen child into the walk.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Size proxy: bounding-box area × scale, through two curves blended by how large the second one is | p2: 20, 7, offset 10 (lod_node.cpp 215). p4: 50, 22, offset 2 (216). Blend breakpoints 210 and 230 (220, 223). Divisor 220 (221, 223). All theirs. |
| Quality tier scales draw distance | Multipliers 1.0, 1.42, 2.0, 2.84, 4.0, 5.7 for tiers 0 to 5 (lod_node.cpp 231-236; the value lines are under 15 characters, so the receipts are the tier-1 lines 232 and 243). |
| Switch floor per tier, so close top levels never pop in | Factors 0.75, 0.55, 0.4, 0.3, 0.23, 0.18 (lod_node.cpp 242-247). Offset 100 and divisor 2 (249). |
| Thresholds as fractions of the squared max: level i ends at maxSq·(i+1) / (N·(N−i)) | None; this is the formula itself (263-268). Donor truncates it to int (see defects). |
| Distance cut: squared compare, last level has no floor | Hide distance 100 units for non-human karts, 10000 for human (kart_model.cpp 598; the values are the donor's). |
| Random jitter of the middle threshold, ±20% | 0.2 and 500 (lod_node.cpp 293). Global rand(). |
| Per-level LOD multiplier (user setting, once) | Default 1.0 (irr_driver.cpp 221). |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: area, the two curves, the blend, the quality multipliers, the squared thresholds, then the pick with the switch-floor skip. It omits the per-frame cache and dirty flag, the no-camera fallback, the one-time LOD multiplier, the forced level, the rand() jitter on the previous last threshold, and the authored `add()` path. It replaces the donor's int truncations (lines 251, 263, 268) with floats, which is a fix. For a quality index above 5 the donor uses the factors (1.0, 1.0); the sketch clamps to tier 5 instead.

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Distance LOD for one prop: thresholds come from the object's size and the quality tier, and the top level is never shown too close.
interface LodPlan {
  thresholdsSq: number[]; // squared camera distance at which each level stops being used (ascending; level 0 = best)
  minSwitchSq: number;    // squared floor: a level whose threshold is at or below this is skipped (unless it is the last level)
}

// Quality tiers 0..5: [distance multiplier, switch-floor factor]. Other values fall back to [1, 1] in the donor.
const QUALITY: [number, number][] = [
  [1.0, 0.75], [1.42, 0.55], [2.0, 0.4], [2.84, 0.3], [4.0, 0.23], [5.7, 0.18],
];

function autoLod(area: number, scale: number, quality: number, levels: number): LodPlan {
  const q = Math.min(Math.max(quality, 0), QUALITY.length - 1);
  const a = area * scale;

  // Two curves: a quadratic-ish one and a quartic-ish one, blended by how large the quartic term is.
  const p2 = 20 + 7 * Math.sqrt(a + 10);
  const p4 = 50 + 22 * Math.sqrt(Math.sqrt(a + 2));
  let ratio: number;
  if (p4 < 210) ratio = p4 / 220;
  else if (p4 < 230) ratio = (105 + p4 * 0.5) / 220;
  else ratio = 1;
  const base = ratio * p4 + (1 - ratio) * p2;

  const [distMul, floorMul] = QUALITY[q];
  const maxDraw = base * distMul;                 // distance units
  const minSwitch = (maxDraw * floorMul + 100) / 2; // distance units; floats, no truncation

  const maxSq = maxDraw * maxDraw;
  const thresholdsSq: number[] = [];
  for (let i = 0; i < levels; i++) {
    // level i ends at maxSq * (i+1) / (N * (N-i)); the last level ends at maxSq.
    thresholdsSq.push((maxSq * (i + 1)) / (levels * (levels - i)));
  }
  return { thresholdsSq, minSwitchSq: minSwitch * minSwitch };
}

// Returns the level to draw for this squared distance, or -1 when the prop is past its last threshold.
function pickLevel(distSq: number, plan: LodPlan): number {
  const n = plan.thresholdsSq.length;
  for (let i = 0; i < n; i++) {
    const isLast = i === n - 1;
    if (distSq < plan.thresholdsSq[i] && (isLast || plan.minSwitchSq < plan.thresholdsSq[i])) return i;
  }
  return -1;
}

const plan = autoLod(12.5, 1, 2, 3);
console.log(pickLevel(0.5, plan), pickLevel(plan.thresholdsSq[2] * 0.9, plan), pickLevel(plan.thresholdsSq[2] * 2, plan));
```

## 5. Lands in

- TARGET `origins/client/render/prop-lod.ts` (proposed new file; path not checked against the repo). Client-only: the engine (src/fight) never reads it, so no change to the fight code. Zone props and ambient creatures only; duel actors are not LOD candidates (see section 6).
- Parity-checklist row 16 (colour grade / quality): the quality tier is the setting this uses. The lead's hint said row 12, but row 12 is combat sound cues in the addendum list and does not fit a render mechanism, so I used 16. Please confirm.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: zones as data (distances and multipliers as data fields); camera/HUD client-only ruling; rules 7-9 n/a

## 6. Gaps and risks

- Authored distances are silently overwritten for track-object and item LODs (lod_node.cpp 266-270). A designer who sets `distance` in the lod group gets no effect for those props. Frankendom must pick one source per prop: zone data or auto, never both, and warn when both are set.
- Defects in the donor, each kept as an idea with a fix:
  - Integer truncation: switch floor cast to int (251), `int step` (263) and `(step / biais)` before the multiply (268). Thresholds lose precision for small values. Fix: float math, round once at the end (the sketch does this).
  - Squared distance cast to int (88-89). Past about 46,340 units the squared value overflows a 32-bit int. Fix: keep the compare in float.
  - Jitter uses the process-wide `rand()` (293), seeded from the clock (main.cpp 2276). Stills are not repeatable and the same prop can change level between runs. Fix: seed the jitter from the prop id, so the visual-pr-stills check can compare before and after.
  - The switch floor is 0 unless `autoComputeLevel` runs (lod_node.cpp 55), so the anti-pop skip is off for nodes built only with `add()`. Fix: a default floor in the zone data.
- Ruling conflicts and what Frankendom must add:
  - Duel actors must never drop LOD. Pin them to level 0 for the whole duel, the way STK pins the top level for the finish camera (kart_model.cpp 1082-1087). The engaged attackers are at most 3 (MAX_ATTACKERS = 3), so the pin is cheap.
  - The Pit is a fixed arena (row 22). It needs no LOD of its own; pin level 0 there.
  - LOD is client-only. A hit test or server check must never read the chosen level. The donor's hit and physics path was not read, so this is a rule to enforce, not something the donor shows.
- The kart cut (kart_model.cpp 598) is a visibility distance, not a quality level. If Frankendom wants it, it belongs in the same data record as the LOD thresholds, not as a second constant.
- Not read: the Irrlicht area definition, the level meshes, shadow passes, the kart LOD build beyond the add() call, and the frustum plane sign convention in draw_calls.cpp isCulledPrecise.
