# latentcollapse-RustDAoC (rendering-performance, cell 17)

Donor: `/mnt/frankendom-donors/latentcollapse-RustDAoC/crates/caer-render/src/lib.rs` (render_world, 636-740) with `/mnt/frankendom-donors/latentcollapse-RustDAoC/crates/caer-render/src/anim_skin.rs` (palette jobs and builders) | Licence: GPL-3.0-or-later (LICENSE file; caer-render `license.workspace = true`) | Rust | symbol `render_world` (palette dedup block)

Checked: Read the palette dedup block in full (`lib.rs` 636-740, all of it, including the per-model loop 671-740), the phase assignment (559), the clip sample formula (973-987), and the tests at the end of `lib.rs` in part (1040-1075). Read `anim_skin.rs` 1-60 (header, job types, flags) and 160-300 (parallel build, bone/palette builders, per-model fan-out). Callers: the live call is `rustdaoc.rs` 5380-5392. Other `render_world` calls exist (`caer-render/src/main.rs` 559 and 1010, `rustdaoc.rs` 6993) and were not read. camera_scope: not a camera cell. Confidence: high on the key function and the bucket formula (read and tied to the code). Medium on the bound (derived from the formula, not measured). Not read: `gpu.rs` compute fold internals, `entities.rs` `tick_anim` and `prune_anim_states` (called here, read only by name). Also seen while searching (not used): `caer-world/src/lib.rs` 1598-1700 (`render_set_par`, run on a dedicated rayon pool whose size is available cores divided by 4, clamped to 4-8, lines 139-150, for per-entity cull and LOD buckets; the doc comment says about 8 threads wins). Its LOD rings at one third and two thirds of the radius (`render_item`, 1662-1700) are a cheaper companion idea.

## 1. Mechanism

- Purpose (the donor's own comment, lib.rs 635): instances that share the same locomotion state and the same 30 Hz phase bucket reuse one skinned palette. A palette is the matrix set a skinned mesh needs for one pose.
- Each entity gets a fixed phase offset, `fract(object_id * 0.618034)` (559), so a group of one creature does not walk in lockstep. The offset is stable frame to frame because it comes from the id.
- Order of operations for one model (the loop over `skinned_instances`, 671 on):
  1. Build the model's palette-job list and an empty `dedup` map (677-678). The map is local to the model, so dedup never crosses models.
  2. For each visible instance (684 on):
     - Pick the clip for its locomotion state, `want`, and sample it at `t = clip_sample_time(clip, stride, speed, phase, anim_time)` (691). The sample time is stride-matched: the rate is `speed / stride` when both are known (973-986).
     - Take the 30 Hz bucket `floor(t * 30)` (692).
     - If the instance is cross-fading (`blending` is set, 702 on), it always gets a new job, because the previous clip and the weight are not part of the key (704-716).
     - Otherwise look up `(want, bucket)` (722-723). On a hit, reuse that job index. On a miss, append a job and store it (724-733).
     - Write the instance's palette base as `job_idx * stride` (738). Each instance now points into one compact buffer.
  3. Build palettes for the unique jobs. The default is the GPU bone-world path (`gpu_palette_fold_enabled`, 640; the CPU palette path is the `CAER_CPU_PALETTE_FOLD=1` fallback). Both use the same job list. The default build is parallel (639), with a floor of 8 jobs before rayon is used (anim_skin 27; the palette path checks it at 211, the bone path at 159).
- Derived bound (from the formula, not measured): `t` lies in `[0, d)` for clip duration `d`, so a non-blended model has at most `ceil(30 * d)` buckets per locomotion state. Unique palettes per model are bounded by that count, not by the number of entities. The donor's own stats field names the same ceiling (lib.rs 347, "palette-dedup ceiling").
- Tick and timing: this is per frame, variable step. `anim_time` is seconds since the first call of `anim_clock` (`lib.rs` 304-311), passed in, so a screenshot frame can be deterministic. The per-entity phase offset and the 30 Hz bucket are the only quantisation.

## 2. Key functions

- The dedup block in `render_world`: `/mnt/frankendom-donors/latentcollapse-RustDAoC/crates/caer-render/src/lib.rs` 671-740 (per-model discover pass, bucket, dedup map, `palette_base`).
- `clip_sample_time`: `/mnt/frankendom-donors/latentcollapse-RustDAoC/crates/caer-render/src/lib.rs` 973-987 (stride-matched sample time with the per-instance phase).
- `build_all_model_palettes` and `build_all_model_bones`: `/mnt/frankendom-donors/latentcollapse-RustDAoC/crates/caer-render/src/anim_skin.rs` 262-310 (per-model fan-out to the palette or bone build).
- `build_palettes` and `build_palettes_parallel`: `/mnt/frankendom-donors/latentcollapse-RustDAoC/crates/caer-render/src/anim_skin.rs` 178-215 (serial below 8 jobs, parallel per job slice above).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants (theirs) |
|---|---|
| Key an animation pose by (state, quantised time) and build each unique pose once | 30 Hz bucket: `floor(t * 30.0)` (lib.rs 692) |
| Give each entity a stable phase so a crowd does not move in lockstep | `fract(object_id * 0.618_034)` (lib.rs 559) |
| Cross-fades are never shared (their key would be wrong) | blend frames skip the cache (lib.rs 636, 704) |
| Run the per-job build in parallel only when there is enough work | floor 8 jobs (anim_skin.rs 27, 211) |
| Stride-matched playback: the cycle follows ground speed, not the clip's authored rate | `rate = speed / stride` (lib.rs 973-986) |
| Keep the parallel and serial builds bit-identical | donor's stated invariant (anim_skin.rs 7); not run by me |

## 4. TypeScript sketch

simplified: keeps the donor order for one model: sample time from the instance's phase and speed, the cross-fade branch (unique per instance), the 30 Hz bucket key with a per-model map, and `paletteBase = job index times stride`. It omits the parallel build and its 8-job floor, the CPU/GPU palette-fold split, the upload to the GPU, the `tick_anim` blend-weight calculation (taken as input in `Inst.blend`), `prune_anim_states` and `release_anim_not_in_world`, the timing counters, and the Rust f32 precision.

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Loco = string;
interface Clip { duration: number; rate: number; }
interface Blend { prev: Loco; w: number; }
interface Inst { objectId: number; speed: number; want: Loco; phase: number; blend?: Blend; paletteBase: number; }
interface BlendJob { prev: Loco; prevT: number; w: number; }
interface Job { loco: Loco; t: number; blend?: BlendJob; }

const BUCKET_HZ = 30;   // sample-time quantisation for the dedup key

// Clip time for one instance. Stride-matched when stride and speed are known, else the authored rate.
function sampleTime(clip: Clip, strideUnits: number, speed: number, phase: number, animTime: number): number {
  const d = Math.max(clip.duration, 0.001);
  const rate = strideUnits > 0 && speed > 0 ? speed / strideUnits : Math.max(clip.rate, 0.001) / d;
  return Math.abs(((animTime + phase * d) * rate * d) % d);
}

// One model's visible instances -> unique palette jobs. Each instance gets the base offset of its job.
function discoverJobs(
  insts: Inst[],
  clipFor: (loco: Loco) => { clip: Clip; stride: number },
  animTime: number,
  paletteStride: number,
): Job[] {
  const jobs: Job[] = [];
  const dedup = new Map<string, number>();   // key: loco and 30 Hz bucket, scoped to this model
  for (const inst of insts) {
    const cur = clipFor(inst.want);
    const t = sampleTime(cur.clip, cur.stride, inst.speed, inst.phase, animTime);
    if (inst.blend !== undefined) {
      // Cross-fade: unique per instance, because the previous clip and the weight are not in the key.
      const prev = clipFor(inst.blend.prev);
      const prevT = sampleTime(prev.clip, prev.stride, inst.speed, inst.phase, animTime);
      jobs.push({ loco: inst.want, t, blend: { prev: inst.blend.prev, prevT, w: inst.blend.w } });
      inst.paletteBase = (jobs.length - 1) * paletteStride;
      continue;
    }
    const bucket = Math.floor(t * BUCKET_HZ);
    const key = `${inst.want}|${bucket}`;
    let idx = dedup.get(key);
    if (idx === undefined) {
      idx = jobs.length;
      jobs.push({ loco: inst.want, t });
      dedup.set(key, idx);
    }
    inst.paletteBase = idx * paletteStride;
  }
  return jobs;
}
```

Typecheck: `tsc --noEmit --strict --target es2020` on the VPS, file with `export {}` appended, exit 0.

## 5. Lands in

- TARGET `origins/client/creature-palette-cache.ts` (new, client-only; the exact folder is my proposal and was not checked against the Frankendom repo). It builds skinned poses for creatures; the engine never reads it.
- Parity-checklist row 7 (creature actor/clips).
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: 1 (one engine: the cache is a view; the animation never decides a hit).

Best transferable idea: Quantise each creature's walk or attack clip to a fixed rate (here 30 Hz) and cache one pose per (state, quantised time) per model, so the number of poses to build is bounded by clip length rather than by how many creatures are on screen.

Decision (proposed): adapt - take the bounded cache keyed by (state, quantised time) with a per-entity stable phase offset to avoid lockstep, but keep it per model and skip cross-fades. Reject the parallel build and the GPU fold for now: our fights have at most MAX_ATTACKERS = 3 attackers on one target, so the win is small until zone population (row 23) puts many creatures on screen.

Acceptance: a test asserts that 40 idle creatures of one model produce at most `ceil(30 * clip duration)` palette jobs, and a browser frame-time check shows no pose rebuild for creatures that share a bucket; a cross-fading creature gets its own pose.

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism, not translated from the Rust lines.
- The bound is derived from the formula; I did not measure palette counts on a real zone. The donor's stats field (lib.rs 347) exists to measure the same ceiling, but I did not read its values.
- The donor dedups on quantised time, so two creatures one bucket apart (1/30 s) still build two poses. The donor accepts this; the gain is in the count, not in exact sharing.
- The per-entity phase offset deliberately defeats sharing when many creatures of one model are on screen (lib.rs 556-559 comment). The bound in section 1 holds, but the sharing ratio depends on how many distinct buckets the phases fill.
- Cross-fades are unique per instance (lib.rs 704). A crowd entering a fight at once will build one pose each during the blend.
- The default path builds bone worlds on the GPU (`gpu_palette_fold_enabled`); the CPU palette path is a fallback. A WebGL port must choose one path and test it, or the cache keys will not match what is drawn.
- The donor's parallel-serial bit-identity invariant (anim_skin.rs 7) is a claim in a comment. I did not run the tests.
- `gpu.rs` (6164 lines) and `entities.rs` `tick_anim` were not read. Blend weights come from `tick_anim`, which is taken as given here.

Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
Brief rule served: 1 (one engine; the animation cache is client-only; the animation never decides a hit)
