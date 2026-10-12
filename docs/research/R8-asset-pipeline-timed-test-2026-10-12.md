# R8: Hugging Face asset pipeline timing test (INTERIM, 2026-10-12, compiled for later use)

Status: run 1 and the A100 smoke test are done. The 5 to 10 asset run is NOT done. Numbers are measured unless marked estimate. Not legal advice; licences are in R7.

## Summary for Dom (plain English)
- The pipeline (prompt -> picture -> TRELLIS.2 3D mesh, batched on a rented GPU) can make props, foliage, buildings and armour pieces cheaply: about $0.03 to $0.14 of GPU time per asset.
- It is only one stage of zone creation. It does not do layout, style matching across a kit, or game-ready clean-up. Those costs are not measured yet.
- Characters and bosses stay hand-fitted to our 65-bone rig (docs/boss-briefs/CHARACTER-RECIPE.md). This pipeline does not replace that.
- Next step needs Dom: yes or no on ONE L40S job (5 assets, about $0.60 worst case).

## What this test is for
Can we mass-produce props, foliage, buildings and armour pieces with prompt -> image -> TRELLIS.2 3D mesh, and what does it cost in seconds, dollars and human time per accepted asset. NOT for characters or bosses.

## Run 1 (L4, l4x1 $0.80/h), about 1 hour wall clock, $0.80 across 13 jobs
- Images: FLUX.1-schnell, 8.3 to 8.6 s per image (model load 181 s). 10 images saved (results/images in the private repo).
- TRELLIS.2 on L4: 6 of 10 generated (a01, a02, a03, a05, a06, a09); 63 to 197 s generation (avg about 122 s) + 13 to 21 s glb build. 4 of 10 failed: a04, a07, a08 hit CUDA out of memory, a10 timed out. Peak 21.6 of 24 GB: the L4 is too small for the bigger assets.
- 3 meshes survive (a01, a02, a03): about 47k to 50k triangles, 2048 textures, not watertight, many tiny floating islands (131 / 23 / 18 components).
- What went wrong: meshes were uploaded only at the end of the job, a 35 minute timeout killed it, so the meshes were lost; Pixal3D failed on a huggingface-hub pin conflict (and ran out of memory on L4 anyway); wheels were built for sm_89 (L4) only; each GPU job paid a 3 to 5 minute queue wait plus setup. The donor-library dev did not tell the agent to save per asset and did not review its script before the run.

## Restart (new cap $1.20, A100 chosen by Dom, Strategy agreed with traps)
- Wheels rebuilt with TORCH_CUDA_ARCH_LIST "8.0;8.9" on CPU jobs: cumesh, flex_gemm, nvdiffrast, o_voxel in repo folder wheels_sm80_89/. natten rebuild still running on CPU, not needed (TRELLIS.2 does not import it).
- Independent Sonnet-medium audit of the scripts: GO. Nine small fixes (failed asset no longer marked done, glb uploaded before its metrics file, SIGTERM trap now fires, setup abort uploads the log, real GPU op in preflight, resume skips finished assets, watchdog 300 s for smoke / 900 s default).
- Smoke test, job 6acccabefee2c900701a92ef, a100-large $2.50/h, asset a03_ruined_tower:
  - total running 714 s, cost $0.4958 (HF jobs API durations x price)
  - setup 61 s, preflight 278 s (probably first-time kernel compile; NOT confirmed from the log), model download 20.4 s, model load 130.8 s
  - generation 183.5 s, glb build 17.7 s, peak 23.3 GB of 80 GB
  - output: 94,695 triangles, baseColor and metallicRoughness 2048 x 2048, status ok
  - mesh, metrics, manifest, preflight, setup and log tail all uploaded (results/smoke1/ in the private repo). Nothing lost.
  - quality: see hf-asset-test/smoke1_a03_ruined_tower_render.png. Clean, detailed, matches the source picture. One asset only.

## Findings
1. The A100 was NOT faster on this asset: same tower took about 82 s on the L4, 183.5 s on the A100. Single data point; the first asset pays one-time kernel compile. A second asset is needed to know the warm speed.
2. Fixed overhead per job is about 8 minutes (setup 61 s + preflight 278 s + download 20 s + load 131 s). That is about $0.34 on an A100 and about $0.11 on an L4 before any asset is made (the A100 overhead alone equals about 11 L4 assets of GPU time). So: ONE long job per batch, never one job per asset.
3. If the 183 s holds, an A100 asset costs about $0.14 (183 s + 18 s at $0.0417/min), against about $0.03 on the L4 when it does not run out of memory.
4. Remaining budget about $0.68 (restart spent about $0.52: smoke $0.4958 + CPU wheel builds about $0.02, agent estimate). A 10-asset A100 job does not fit.
5. Mesh quality still needs a gate: triangle target, island removal, watertight check; run 1 meshes had many tiny islands.

## Cost per asset by GPU (GPU time only)
| | L4 ($0.80/h) | L40S ($1.80/h, 48 GB, sm_89) | A100 ($2.50/h, 80 GB) |
|---|---|---|---|
| Time per asset | about 140 s (tower about 100 s) | estimate: similar to L4, 100 to 140 s | about 200 s (one asset) |
| Cost per asset when it works | about $0.03 | estimate $0.05 to $0.07 (not measured, no L40S job has run) | about $0.14 |
| Success | 6 of 10 (3 out of memory, 1 timeout) | expected no out-of-memory (48 GB), untested | 1 of 1 |
| Cost per good asset incl. failures | about $0.05 (estimate) | unknown | about $0.14 |
| Mesh | about 50k triangles | unknown | about 95k triangles |

Read: L4 is cheapest for small, simple props that fit in 24 GB. L40S is the likely best value for bigger or detailed assets. The A100 only pays off if the L40S test shows it is much faster; the one data point says it is not.

## Reducing the 8 minute overhead (reasoning, NOT tested)
| Part | Measured | Idea | Estimated saving |
|---|---|---|---|
| Preflight (probably kernel compile) | 278 s | First confirm it is a compile from the preflight log. Then cache the compiled kernels (cover sm_80 and sm_89) in the private repo, or compile on a CPU job | about 4 min |
| Model load | 131 s | Bake weights into an image, or load straight onto the GPU | 1 to 2 min |
| Setup | 61 s | Put all installs in an image | about 1 min |
| Model download | 20 s | Image removes it | 20 s |
Best single fix: one Docker image built on a CPU job with wheels, packages, weights and the kernel cache. Estimate: 8 min down to 2 to 3 min (about $0.34 down to about $0.10 on an A100). Cheapest first step: add the kernel-cache step to the next L40S run and see whether the 278 s disappears.

## How this fits zone creation
This is the asset-supply stage only. It answers: can we fill a zone kit (rocks, trees, ruins, houses, armour pieces) cheaply and in bulk.
Not covered, and needed before it counts as a zone pipeline:
- Layout and placement (terrain, paths, density rules). A separate system.
- Style consistency: 50 assets that look like one kit. Only 10 prompts and 1 clean result so far.
- Game-readiness: 50k to 95k triangles is heavy for a mobile game. Needs decimation, island removal, watertight check, LODs, collision, texture budget.
- Human review and Blender clean-up time per asset: not measured yet. If every asset needs heavy clean-up, people are the bottleneck again.
Pipeline versus the manual route: new pipeline wins on scale and GPU cost per asset; manual Blender + TRELLIS wins on fit to our rig, style control and proven quality. Use the pipeline for props, foliage, buildings, armour pieces; keep manual for characters and bosses.

## Decision pending (Dom)
Recommended next job: ONE L40S job (l40sx1, $1.80/h = $0.03/min, 48 GB so no out-of-memory, sm_89 so the rebuilt wheels work) for 5 assets, ceiling 20 min (worst case $0.60). Gives the warm speed and a cost per asset. This changes Dom's A100 choice, so it needs his yes. Strategy had preferred the L40S first.
Per asset, the next run must record: GPU cost, pass or fail on the quality gate with no touch-up, triangle count, minutes of clean-up needed.
Other open items: the nine design-brief questions (bottom of each brief); the nvdiffrast licence ruling.

## Next-run recipe (cheap and fast)
1. Private repo Domlynch/frankendom-asset-test holds wheels_sm80_89/, job/, results/. KEEP it. Scripts are also copied to docs/research/hf-asset-test/ in this repo (no tokens).
2. cd job; python3 launch.py <kind>  (kinds in launch.py: smoke1, full, and the older ones). launch.py uploads job/ to the repo then calls run_job with the token as a secret. Never print the token.
3. Cost check: python3 cost.py <job ids> (reads durations from the HF API; prices a100-large 2.50, l4x1 0.80, cpu-upgrade 0.03; add l40sx1 1.80 before use).
4. Each job: setup, preflight (imports + tiny GPU ops, aborts if setup over 180 s), then per asset: build glb, upload glb then metrics json, update the manifest. Resume skips assets already in the repo. SIGTERM trap uploads the log tail.
5. Ceilings are only ceilings (billing is running time). Size the sum of ceilings x price to stay under the cap.
6. Download results: huggingface_hub hf_hub_download from results/<SUB>/. Render with render_glb.py on the VPS (blender -b -P render_glb.py -- file.glb out.png).

## Lessons to keep
- Save every asset the moment it is made (glb first, then metrics, then manifest). Never upload only at the end.
- Review the agent's script before any paid run; get an independent audit.
- Build wheels for every GPU architecture we may rent (sm_80 and sm_89 now).
- One long job per batch; the fixed overhead is paid per job.
- Mark estimates as estimates; the first run's numbers were single data points.

## Licence reminders (see R7)
Production use of TRELLIS.2 needs nvdiffrast replaced or Dom's ruling (NVIDIA non-commercial source licence). RMBG-2.0 replaced with ZhengPeng7/BiRefNet. Qwen-Image and FLUX.1-schnell are Apache-2.0. Krea-dev only for private look-dev.
