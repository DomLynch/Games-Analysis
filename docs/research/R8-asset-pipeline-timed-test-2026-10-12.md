# R8: Hugging Face asset pipeline timing test (INTERIM, 2026-10-12)

Status: run 1 and the A100 smoke test are done. The 10-asset run is NOT done. Numbers below are measured unless marked estimate. Not legal advice; licences are in R7.

## What this test is for
Can we mass-produce props, foliage, buildings and armour pieces with prompt -> image -> TRELLIS.2 3D mesh, and what does it cost in seconds and dollars per accepted asset. NOT for characters or bosses (those stay hand-fitted to our 65-bone rig; see docs/boss-briefs/CHARACTER-RECIPE.md).

## Run 1 (L4, l4x1 $0.80/h), about 1 hour wall clock, $0.80 across 13 jobs
- Images: FLUX.1-schnell, 8.3 to 8.6 s per image (model load 181 s). 10 images saved (results/images in the private repo).
- TRELLIS.2 on L4: 6 of 10 generated (a01, a02, a03, a05, a06, a09); 63 to 197 s generation (avg about 122 s) + 13 to 21 s glb build. 4 of 10 failed: a04, a07, a08 hit CUDA out of memory, a10 timed out. Peak 21.6 of 24 GB: the L4 is too small.
- 3 meshes survive (a01, a02, a03): about 47k to 50k triangles, 2048 textures, not watertight, many tiny floating islands (131 / 23 / 18 components).
- What went wrong: meshes were uploaded only at the end of the job, a 35 minute timeout killed it, so the meshes were lost; Pixal3D failed on a huggingface-hub pin conflict (and ran out of memory on L4 anyway); wheels were built for sm_89 (L4) only; each GPU job paid a 3 to 5 minute queue wait plus setup. I (the donor-library dev) did not tell the agent to save per asset and did not review its script before the run.

## Restart (new cap $1.20, A100 chosen by Dom, Strategy agreed with traps)
- Wheels rebuilt with TORCH_CUDA_ARCH_LIST "8.0;8.9" on CPU jobs: cumesh, flex_gemm, nvdiffrast, o_voxel in repo folder wheels_sm80_89/. natten rebuild still running on CPU, not needed (TRELLIS.2 does not import it).
- Independent Sonnet-medium audit of the scripts: GO. Nine small fixes (failed asset no longer marked done, glb uploaded before its metrics file, SIGTERM trap now fires, setup abort uploads the log, real GPU op in preflight, resume skips finished assets, watchdog 300 s for smoke / 900 s default).
- Smoke test, job 6acccabefee2c900701a92ef, a100-large $2.50/h, asset a03_ruined_tower:
  - total running 714 s, cost $0.4958 (HF jobs API durations x price)
  - setup 61 s, preflight 278 s (probably first-time kernel compile), model download 20.4 s, model load 130.8 s
  - generation 183.5 s, glb build 17.7 s, peak 23.3 GB of 80 GB
  - output: 94,695 triangles, baseColor and metallicRoughness 2048 x 2048, status ok
  - mesh, metrics, manifest, preflight, setup and log tail all uploaded (results/smoke1/ in the private repo). Nothing lost.
  - quality: see smoke1_a03_ruined_tower_render.png next to this file. Clean, detailed, matches the source picture. One asset only.

## Findings
1. The A100 was NOT faster on this asset: same tower took about 82 s on the L4, 183.5 s on the A100. Single data point; the first asset pays one-time kernel compile. A second asset is needed to know the warm speed.
2. Fixed overhead per job is about 8 minutes (setup 61 s + preflight 278 s + download 20 s + load 131 s). On an A100 that is about $0.34 per job before any asset is made. So: ONE long job per batch, never one job per asset.
3. If the 183 s holds, an A100 asset costs about $0.13 (183 s + 18 s at $0.0417/min), against about $0.03 on the L4 when it does not run out of memory. Estimate, not measured warm.
4. Remaining budget about $0.68 (restart spent about $0.52: smoke $0.4958 + CPU wheel builds about $0.02, agent estimate). A 10-asset A100 job does not fit.
5. Mesh quality still needs a gate: triangle target, island removal, watertight check; run 1 meshes had many tiny islands.

## Decision pending (Dom)
Recommended next job: ONE L40S job (l40sx1, $1.80/h = $0.03/min, 48 GB so no out-of-memory, sm_89 so the rebuilt wheels work) for 5 assets, ceiling 20 min (worst case $0.60). Gives the warm speed and a cost per asset. This changes Dom's A100 choice, so it needs his yes. Strategy had preferred the L40S first.

## Next-run recipe (cheap and fast)
1. Private repo Domlynch/frankendom-asset-test holds wheels_sm80_89/, job/, results/. KEEP it. Scripts are also copied to docs/research/hf-asset-test/ in this repo (no tokens).
2. cd job; python3 launch.py <kind>  (kinds in launch.py: smoke1, full, and the older ones). launch.py uploads job/ to the repo then calls run_job with the token as a secret. Never print the token.
3. Cost check: python3 cost.py <job ids> (reads durations from the HF API; prices a100-large 2.50, l4x1 0.80, cpu-upgrade 0.03; add l40sx1 1.80 before use).
4. Each job: setup, preflight (imports + tiny GPU ops, aborts if setup over 180 s), then per asset: build glb, upload glb then metrics json, update the manifest. Resume skips assets already in the repo. SIGTERM trap uploads the log tail.
5. Ceilings are only ceilings (billing is running time). Size the sum of ceilings x price to stay under the cap.
6. Download results: huggingface_hub hf_hub_download from results/<SUB>/. Render with render_glb.py on the VPS (blender -b -P render_glb.py -- file.glb out.png).

## Licence reminders (see R7)
Production use of TRELLIS.2 needs nvdiffrast replaced or Dom's ruling (NVIDIA non-commercial source licence). RMBG-2.0 replaced with ZhengPeng7/BiRefNet. Qwen-Image and FLUX.1-schnell are Apache-2.0. Krea-dev only for private look-dev.
