# Asset pipeline (prompt -> picture -> TRELLIS.2 3D mesh on Hugging Face GPU): handover to the dev who will manage it
Written 2026-10-12 by the donor-library dev. Dom's decision tonight: the graphics test is handed to another dev. The donor-library dev keeps the game decoding, learnings and analysis. Read this file, then docs/research/R8-asset-pipeline-timed-test-2026-10-12.md (the numbers), R7 (licences), docs/boss-briefs/CHARACTER-RECIPE.md (characters stay manual).

## 1. What this is for
Mass-produce props, foliage, buildings and armour pieces for programmatic zones. NOT characters or bosses (those are hand-fitted to the 65-bone rig). Zones are data rows; an asset must be one manifest row the same way (fields: id, kind, triangles, LOD levels, collision, texture size, source model, licence, prompt, GPU cost, clean-up minutes). A mobile triangle and texture budget per asset kind is still needed from the World lane (do not guess).

## 2. State tonight (2026-10-12)
| Item | State |
|---|---|
| Private HF repo | Domlynch/frankendom-asset-test: KEEP. Holds wheels_sm80_89/, job/ (scripts), results/ (images, L4 meshes a01 a02 a03, A100 smoke), no tokens in it. |
| Scripts | In this repo: docs/research/hf-asset-test/ (copy of the private repo's job/). Already audited once (nine fixes). |
| Budget | Cap $1.20 for the restart; about $0.68 left (spent about $0.52: A100 smoke $0.4958 + CPU wheel builds). Verify with python3 cost.py <job ids> before any launch. |
| Last job | L40S job 6accea25134c60eb02606f1d: submitted 18:09 Dubai, waited 19+ minutes with the message "Waiting for requested hardware to become available" (never started), CANCELED by us at 18:28. Cost $0. |
| Account | Domlynch, personal, Pro plan, payment on. The API shows no queue-priority field; we have no evidence Pro gives priority. |

## 3. Measured facts (R8 has the detail)
- L4 ($0.80/h): 6 of 10 assets made, about 122 s generation each + 13-21 s glb; 3 ran out of memory (a04, a07, a08), 1 timed out (a10). Peak 21.6 of 24 GB. Meshes about 50k triangles with many floating islands.
- A100 ($2.50/h, a100-large): same tower took 183.5 s generation + 17.7 s glb (about 82 s on the L4); about $0.14 per asset; 94,695 triangles; one clean asset only.
- Fixed cold start per job about 490 s on the A100: setup 61 s, preflight 278 s, weight download 20 s, model load 131 s (about $0.34 A100, about $0.25 L40S). So ONE long job per batch, never one job per asset.
- L40S ($1.80/h, 48 GB, sm_89): estimate only, $0.05-0.07 per asset; NOT measured because the job never got a machine.
- Queue waits: L4 and A100 waited 3-5 min; the L40S waited 19+ min tonight. If L40S stays scarce, consider retrying at another hour or using the A100 only if the budget allows (one A100 asset about $0.14, job overhead about $0.34).

## 4. The prepared L40S job (ready to launch, not run)
Agreed with Strategy and Dom: one job, resume enabled, per-asset upload, only the 4 assets that failed on the L4 (a04_iron_chest, a07_glow_mushrooms, a08_brazier, a10_stone_well), ceiling 18 min = worst case $0.54.
- Launch: `cd docs/research/hf-asset-test && python3 launch.py l40s4` (uploads job/ to the private repo, calls run_job with the token as a secret; never print the token). It is committed in this repo.
- What was changed for a warmer start (all fail-soft): setup_env.sh starts the weight download in the background (predl.py) while installs run; cache_sync.py restores/saves the compiled-kernel caches (~/.triton/cache, ~/.flex_gemm) to cache/l40sx1/jit_cache.tgz in the private repo after the first asset; preflight.py has PREFLIGHT_LITE=1 (keeps the real CUDA op and imports of every wheel, skips the repeated flash/triton ops) and prints per-step timings; cost.py knows l40sx1 at 1.80; per-asset watchdog 420 s.
- The 278 s preflight cause is NOT proven: the log has no compile lines. Best guess: Triton JIT + autotune of flex_gemm on first use (cannot be built on a CPU job; must be warmed on the same GPU type). The lite preflight may just move that cost into asset 1. The per-step timings in the next log will show it.
- Risks: ceiling is tight (cold start about 4 min + four large assets); resume lets a second job finish leftovers; cache save runs in a background watcher and can be lost if the job is killed right after asset 1.
- After a run: python3 cost.py <job id>; download results/l40s4/ with hf_hub_download; render with render_glb.py on the VPS (blender -b -P render_glb.py -- file.glb out.png); update R8 with real seconds and dollars per accepted asset and the cleanup time per asset.

## 5. Rules that stand
- Audit any script change independently before a paid run; one-asset smoke first if the setup changes much; save each asset the moment it exists (glb, then metrics json, then manifest); ceilings are only ceilings (billing is running time); do not touch other lanes' jobs (node:22, playwright); never print or commit tokens.
- Models: HF agents Sonnet medium. Never Opus.

## 6. Licences (R7 has the full table)
Production use of TRELLIS.2 needs nvdiffrast replaced (NVIDIA non-commercial source licence). Strategy's ruling: use TRELLIS.2 for look-dev and prototypes only; before any paid launch either swap the rasterizer or re-make shipped assets through a permitted path; Strategy raises this with Dom (status: pending Dom). RMBG-2.0 replaced with ZhengPeng7/BiRefNet. Qwen-Image and FLUX.1-schnell are Apache-2.0; FLUX Krea-dev only for private look-dev. CC0 and Unlicense are permitted like MIT; a repo with no licence file is ideas only.

## 7. Overhead ideas not yet tried
Bake wheels, packages and weights into a Docker image built on a CPU job and push it to a registry (HF Jobs has no persistent volume); that removes setup and download but not the GPU-side JIT. Estimated cold start 2-3 min instead of 8 (estimate, untested).

## 8. Zone-creation caveat
This is only the asset-supply stage. Not covered: layout and placement, style consistency across a kit (needs a style anchor per kit), game-ready clean-up (decimate, remove floating islands, watertight check, LODs, collision), and human review time per asset (not measured).

## 9. Who to ask
Strategy ("Project Strategy - Fable 5.1") rules on money and licences; Dom approves spend. The donor-library dev (this lane) does NOT run the graphics test any more.
