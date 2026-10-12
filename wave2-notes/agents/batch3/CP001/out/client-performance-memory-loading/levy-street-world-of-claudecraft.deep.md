# levy-street-world-of-claudecraft (client-performance-memory-loading, cell 39)

Donor: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/render/render_budget.ts` | Licence: MIT (LICENSE file: "MIT License", Copyright (c) 2026 Levy Street; package.json `"license": "MIT"`) | TypeScript | symbol `RenderBudgetGovernor.update`

Checked: `RenderBudgetGovernor.update` at render/render_budget.ts 529-807 (read in full), `degrade` 951-1020 (read in full), `recover` 1047-1063 (read in full), cap probe 814-932 (read in full), `CAPS_BY_TIER` 158-227 (read in full), constants 254-334 (read). Callers: one (render/renderer.ts 4570, inside `updateAdaptiveResolution` (starts at renderer.ts 4528; read to 4580, the rest of the function not read), which is called only at renderer.ts 9766 under `if (present)`). Not read: the constructor, `reset` and `state` (render_budget.ts 389-528); `GFX_BUCKET_BANDS` (render/gfx.ts 463 onward, so the baseline and max levels are not read); `chosenCadenceFrameMs` (chosen_cadence_pressure_core.ts); `post_shed_core.ts`; `terrain_detail_shed_core.ts`; `frame_cadence_auto_core.ts`. Confidence: high on the update, degrade and recover order (read end to end); medium on the band numbers (not read). camera_scope: n/a (not a camera cell).

Best transferable idea: a quality ladder with two-sided hysteresis (drop fast when a frame is urgent, recover one rung at a time only after a stable window and a cooldown) keeps a fight's frame rate steady without flicker.
Decision (proposed): adapt - the ladder shape fits a Pit or zone fight on a phone, but Frankendom must exempt threat telegraphs and any cue the player reads, and must drop the probe and the post-shed rungs.
Acceptance: in a three-attacker Pit fight on a mid-range phone, a synthetic trace of 30 ms frames for 3 s steps VFX down at most once per cooldown and never below its floor; after 3 s of headroom it raises one rung; telegraph VFX never change level (unit test).

## 1. Mechanism

- One governor owns a small set of quality levels: grass density, foliage, VFX, lighting, render resolution, terrain-detail shed, and a post-processing shed ladder. Each presented frame it gets a sample (frame ms, submit ms, draw calls, triangles, visible grass tufts, dt) and returns a state with a mode (`stable`, `degrading`, `recovering`, `disabled`) and a reason.
- Order of steps in `update` (render_budget.ts 529-807), as the code runs:
  - (a) Inputs are clamped to 250 ms. Frame cost = max(frame, total) (536-539). The frame average moves by a fixed 0.08 of the gap each frame (540); the submit average by 0.12 (541). Submit-stall pressure = max(previous x exp(-dt/12), raw submit / 120 ms) (542-545).
  - (b) Pressure is the maximum of five ratios: frame average, submit, draw calls against `targetCalls`, triangles against `targetTriangles`, grass tufts against `targetGrassTufts`, and the stall pressure (572-660). A ratio of 1 or more is over budget.
  - (c) `urgent` is true on a submit stall (>= 120 ms), or one frame at or above the tier `urgentFrameMs`, or total at or above it, or submit at or above max(12, 0.58 x urgent), or calls, triangles or tufts at or above their urgent caps (682-689).
  - (d) `overBudget` is true when pressure >= 1, or the frame average >= `dropFrameMs`, or total >= drop, or submit >= max(8, 0.58 x drop) (690-694).
  - (e) Degrade runs only when (submit stall, or over budget) and the cooldown is at zero and no cap-probe dwell holds the ladder (699-703). A submit stall ignores the cooldown. If `degrade` changed something, the cooldown is armed: 0.55 x tier cooldown on an urgent frame or a probe step, 2.5x or 4x on a submit stall, and 1x otherwise (737-744). The function returns at once.
  - (f) While a stall hold is running (set on a submit stall to a tier-specific number of seconds), the mode stays `degrading` and recovery does not run (749-754).
  - (g) Recovery needs measured headroom on every clause: frame average <= `recoverFrameMs` (or the external-cap case), total <= recover line, submit <= max(8, 0.7 x recover line), a single raw submit <= 42 ms, and stall pressure < 0.5 (758-764). Each frame that passes adds dt to `stableSeconds`. When `stableSeconds` reaches the tier `recoverStableSeconds` and the cooldown is zero, `recover` runs (782-784). Any frame that fails the headroom test resets `stableSeconds` to zero (796-798). Recovery therefore needs one unbroken window of headroom.
  - (h) Climbing above the baseline (`allowAboveBaseline`) needs calls, triangles and tufts all at or under 90% of their target caps (776-779).
- `degrade` (951-1020) walks rungs in a fixed order, and several rungs can move in one call. Each rung is eligible under its own condition:
  - foliage: step 0.08, or 0.14 when urgent (961-965); eligible when urgent, draw-dominant, or draw pressure >= 1.08.
  - grass: step 0.08 or 0.14 (967-975); eligible when urgent, grass pressure >= 1, or draw-dominant with foliage at its floor.
  - lighting: step 0.07 or 0.12 (978-984); eligible when urgent, submit >= 1, or both environment rungs (foliage and grass) at their floors.
  - VFX: step 0.05 or 0.08 (987-999); eligible on a severe frame (frame or submit >= 1.25), or when not urgent and the environment and lighting rungs are at their floors and frame or submit >= 1.
  - last resort (1010-1018): the post-processing shed takes one rung and render resolution steps by the tier `dropStep` (or `urgentDropStep`). Eligible on a severe frame, or when environment, lighting and VFX are all at their floors.
  - Returns `changed`, `exhausted` (eligible, but every rung already at its floor) or `idle`.
- `recover` (1047-1063) raises one rung per call and returns true on success: grass, lighting, VFX and foliage back to their baselines at 0.08 each (1048-1051), then one post-shed rung (1055), then resolution by `recoverStep` (1056). Only when `allowAboveBaseline` is set does it climb above baseline: foliage and VFX to their band max at 0.08, grass at 0.06, lighting at 0.05 (1058-1061). A successful raise sets `stableSeconds` to zero and arms the cooldown at 1.5 x tier cooldown (`update` 781-792).
- External frame-cap probe (814-932; not a browser concern as written): when the frame sits between 28 and 48 ms with CPU headroom, the governor cannot tell a display cap from GPU-bound frames, so it runs a probe. It sheds every rung to its floor, dwells 2 s, restores the start levels, dwells 2 s, and compares the frame average. If the restored average is more than 10% above the floored one, shedding helped: the candidate is refused, and the refusal survives an upward lapse for at least 60 s. Otherwise the cap is latched and frame pressure is ignored. The probe is the most complex part (candidate logic at 611-652 and the probe at 814-932) and answers a question only a GPU-bound WebGL renderer has.
- Caller: renderer.ts 4530-4569 builds the sample and 4570 calls `update`. The call sits in `updateAdaptiveResolution` (4528; its end not read), which runs only for presented frames (9766). The comment at 9763-9765 says a skipped frame is not fed, because its wall-clock dt would read hidden time as free headroom.
- Tick: this is a per-presented-frame update. It uses dt for cooldowns and stable seconds, and per-frame alphas for the two averages (see section 6, defect 1). It is not a fixed-step loop.

## 2. Key functions

- `RenderBudgetGovernor.update`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/render/render_budget.ts` 529-807. The whole decision: averages, pressure, urgency, degrade, stall hold, recovery gate, climb gate.
- `RenderBudgetGovernor.degrade` (private): `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/render/render_budget.ts` 951-1020. Rung order and eligibility.
- `RenderBudgetGovernor.recover` (private): `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/render/render_budget.ts` 1047-1063. Restore order, then climb above baseline.
- Cap probe (`abandonCapProbe` 814-837, `advanceCapProbe` 858-896): `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/render/render_budget.ts` 814-896.
- Per-tier thresholds and steps: `GFX_BUDGETS` at `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/render/gfx.ts` 386-459 (low 387-399, medium 401-413, high 415-427, ultra 431-443, insane 447-459).
- Per-tier caps: `CAPS_BY_TIER` at `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/render/render_budget.ts` 158-227.
- Caller: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/render/renderer.ts` 4528-4580 (start of `updateAdaptiveResolution`, read to 4580; builds the sample; calls update at 4570); 9763-9766 (presented-frame guard).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Smooth the frame time, then compare the average to a drop line | Frame average alpha 0.08 per frame (theirs, render_budget.ts 540); submit alpha 0.12 (541). At 60 fps 0.08 per frame is a time constant of about 0.2 s, but it is applied per frame, not per second (see section 6). |
| Over-budget when the average crosses the drop line | Drop line by tier: low 22 ms (theirs, gfx.ts 392), medium 24 (406), high 22 (420), ultra 30 (436), insane 30 (452). |
| Urgent frames drop faster and sooner | Urgent line: low 34 ms (theirs, gfx.ts 393), ultra 44 (437). Urgent steps: foliage 0.14, grass 0.14, lighting 0.12, VFX 0.08 (theirs, URGENT_* constants 254-257). |
| Recover only after headroom has lasted N seconds | Stable seconds before one raise: low 6 (theirs, gfx.ts 398), medium 7 (412), high 3 (426), ultra 3 (442, not receipted). Recover line: low 17.5 ms (394), ultra 15 (438). |
| Cooldown between steps, longer after a raise | Cooldown: low 1.1 s (399), high 0.85 s (427). Raise cooldown 1.5x (render_budget.ts 792); urgent step 0.55x (743). |
| A submit stall holds quality down for a tier-specific time | Stall threshold 120 ms (299); urgent stall 250 ms (300). Hold seconds: 18 low, 14 medium, 8 high, 6 ultra and insane (301-307); urgent hold 30, 24, 14, 12, 12 (308-314). |
| Quality steps shrink as the ladder nears its floors | Normal steps: foliage 0.08 (961), grass 0.08 (967), lighting 0.07 (978), VFX 0.05 (987). Recover baselines step 0.08, climb above baseline 0.05 to 0.08. |
| Climb above baseline only with spare capacity | Target caps, calls: low 380 (theirs, render_budget.ts 165), medium 420 (177), high 620 (189), ultra 820 (201), insane 900 (216). The climb needs 90% of the target (777). |
| Probe for a display cap before believing it | Probe settle 2 s (325); helped threshold 10% (329); refusal hold 60 s (333); candidate frame range 28-48 ms (316-317). Not ported (see section 6). |

## 4. TypeScript sketch

simplified: the sketch uses one frame average (the donor takes the largest of frame, total, submit, draw and grass pressure) and treats every rung as eligible on each over-budget step (the donor gates each rung by its own condition, e.g. foliage only when draw-dominant). It omits the submit-stall hold and its longer cooldowns, the urgent-by-submit path, the post-shed and terrain-detail rungs, the above-baseline climb, the enrich gate, the external frame-cap probe, and the chosen-cadence input. Its order is: average, degrade if over budget and cooled down, else recover after N stable seconds. It fixes the donor's per-frame alpha by using a time constant (defect 1).

```ts
// Licence: MIT (donor). Shape only, re-expressed here; no donor lines copied.
type RungKey = 'vfx' | 'lighting' | 'grass' | 'resolution';

interface Rung {
  key: RungKey;
  floor: number;       // lowest level this rung may reach
  baseline: number;    // level the tier starts at and recovers toward
  step: number;        // drop step on a normal over-budget frame
  urgentStep: number;  // drop step on an urgent frame
  raiseStep: number;   // raise step on recovery
}

interface Budget {
  dropMs: number;         // smoothed frame above this = over budget
  urgentMs: number;       // one frame at or above this = urgent
  recoverMs: number;      // smoothed and single frame below this = headroom
  recoverStableS: number; // seconds of headroom needed before one raise
  cooldownS: number;      // pause after any step
}

interface Governor {
  ema: number;
  stableS: number;
  cooldownS: number;
  levels: Record<RungKey, number>;
}

// Time constant for the frame average. 0.2 s equals the donor's 0.08 per frame at 60 fps.
const EMA_TAU_S = 0.2;

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

export type GovernorVerdict = 'degraded' | 'raised' | 'held' | 'floored';

export function governorStep(
  g: Governor,
  rungs: readonly Rung[],
  b: Budget,
  frameMs: number,
  dtS: number,
): GovernorVerdict {
  const alpha = 1 - Math.exp(-dtS / EMA_TAU_S);
  g.ema += (frameMs - g.ema) * alpha;
  g.cooldownS = Math.max(0, g.cooldownS - dtS);
  const urgent = frameMs >= b.urgentMs;

  if (g.ema >= b.dropMs) {
    g.stableS = 0;
    if (g.cooldownS > 0) return 'held';
    let moved = false;
    for (const r of rungs) {
      const cur = g.levels[r.key];
      if (cur <= r.floor + 0.001) continue;
      const s = urgent ? r.urgentStep : r.step;
      g.levels[r.key] = Math.max(r.floor, round2(cur - s));
      moved = true;
    }
    if (!moved) return 'floored';
    g.cooldownS = b.cooldownS * (urgent ? 0.55 : 1);
    return 'degraded';
  }

  if (g.ema > b.recoverMs || frameMs > b.recoverMs) {
    g.stableS = 0;
    return 'held';
  }
  g.stableS += dtS;
  if (g.stableS < b.recoverStableS || g.cooldownS > 0) return 'held';

  for (const r of rungs) {
    const cur = g.levels[r.key];
    if (cur >= r.baseline - 0.001) continue;
    g.levels[r.key] = Math.min(r.baseline, round2(cur + r.raiseStep));
    g.stableS = 0;
    g.cooldownS = b.cooldownS * 1.5;
    return 'raised';
  }
  return 'held';
}
```

## 5. Lands in

- TARGET `src/fight/quality_governor.ts` (proposed pure module; the path is a placeholder for Lead to confirm, because this is client-side quality and the engine never imports it, so it sits outside the engine rule). Parity-checklist row 16 (colour grade/quality). It consumes the frame timings the client already measures and sets only the client's own quality levels.
- Reuse tag: adapt (MIT; code may be adapted; the sketch is a re-expression of the shape, not a copy).
- Brief rule served: CP topics frame pacing and adaptive quality, quality tiers by device; rule 8 (one target file, one parity row). Companion idea for the device tier, read in full: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/device_memory_hint.ts` 32 and 79 (a RAM class of 4 GB or less gets the tight profile), and 35 (the window of a crash-recovery tight-mode marker, 7 days; the marker is stamped by `markEntryTightMode` and read by `tightMemoryDeviceHint`). Its consumer `render/gfx.ts` 1730 was read by grep only.

## 6. Gaps and risks

- Defect 1 (keep the idea, fix the defect): the two averages use a fixed per-frame alpha (540-541), but the dwell and cooldown use dt (566, 782). At 120 Hz the average reacts about twice as fast in wall time as at 60 Hz, and at 30 fps about half as fast. Fix: `alpha = 1 - exp(-dt / 0.2)`, which gives the donor's 0.08 at 60 fps and the same wall-time speed on any refresh rate. Done in the sketch.
- Defect 2 (same root): the recovery gate reads the frame average (760), which lags more in wall time at low fps, so after a load drop a 30 fps phone waits longer before the gate opens than a 120 Hz laptop, although `stableSeconds` counts real time. Fix: the same time constant as defect 1; the recover count stays in seconds.
- Rule conflict, must be enforced by us: the ladder sheds VFX (donor VFX rung, 987-1000), and a fight telegraph is VFX. Frankendom's readability at 375 wide needs the attack telegraph kept. Acceptance and tests must exempt telegraphs and any cue that tells the player an attack is coming. The governor must never change a hit box, a timer, an attack window or `MAX_ATTACKERS = 3`; the sim never reads quality (the server-verified kill rule is unaffected).
- Donor-specific rungs not ported: the post-shed chain, the terrain-detail shed, the above-baseline climb, and the external frame-cap probe (814-932). The probe answers a GPU-bound WebGL question that a browser game with a fixed frame cap does not have. Frankendom should read its own chosen frame cap as an input instead (the donor does this as `chosenCadenceMissShare`, 531-535, not read further).
- Submit-stall signal: the donor measures the time spent in the render submit call. A Frankendom client can measure its own render submit span the same way; if it cannot, the stall rung is off, and the frame average alone decides.
- Per-tier table: the thresholds are device tiers, not zone data, so they belong in an engine constant table (not per zone). The donor's per-tier caps (calls, triangles, tufts) have no Frankendom meaning unless we measure draw calls per fight.
- Scope: a 1064-line module for a WebGL renderer. Frankendom should take the 60-line core only, not the surrounding machinery.
- Not verified: the band baselines (the levels the governor restores to) come from `GFX_BUCKET_BANDS` (gfx.ts 463 onward, not read), so the exact baseline values are not stated here.

Reuse tag: adapt (MIT). Brief rule served: CP topics 1-3 (frame pacing, adaptive quality, quality tiers by device); rule 8; client-only, no server or engine change.
