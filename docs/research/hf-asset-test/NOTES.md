# HF asset-pipeline timing test: recipe and traps (as of the HOLD)

Repo (private, keep): Domlynch/frankendom-asset-test  (job/ scripts, wheels/ = sm89 L4 wheels, wheels_sm80_89/ = rebuilt for A100+L4, results/images = the 10 FLUX images, results/out_trellis_b = 3 TRELLIS L4 meshes)
Local: /private/tmp/p2/hf-asset-test/ (job/ scripts, src/ clones, dl/ downloads, venv/, analyze.py, cost.py)

## Recipe used
- Image: pytorch/pytorch:2.6.0-cuda12.4-cudnn9-devel (py3.11, torch 2.6.0 cu124). Launch with huggingface_hub run_job, secrets={'HF_TOKEN': get_token()}; no `name=` kwarg exists in hub 1.7.2 run_job (use labels).
- Wheels built on cpu-upgrade (8 vCPU, $0.03/h) with `pip wheel --no-build-isolation --no-deps`, TORCH_CUDA_ARCH_LIST (8.9 first run; "8.0;8.9" rebuild), MAX_JOBS=8, FORCE_CUDA=1: nvdiffrast v0.4.0, CuMesh, FlexGEMM, TRELLIS.2/o-voxel (all `git clone --recursive`), natten==0.21.0 (NATTEN_CUDA_ARCH). Built wheels: cumesh-0.0.1, flex_gemm-1.0.0, nvdiffrast-0.4.0, o_voxel-0.0.1 (cp311), natten (cp311).
- setup_env.sh: apt git libjpeg-dev libgl1 libglib2.0-0 ninja-build; pip imageio imageio-ffmpeg tqdm easydict opencv-python-headless ninja trimesh transformers==4.57.3 huggingface_hub>=0.34,<1.0 zstandard kornia timm lpips pandas diffusers==0.37.1 accelerate bitsandbytes sentencepiece protobuf pillow; utils3d@9a4eb15 (git); flash-attn 2.7.4.post1 cu12torch2.6 cxx11abiFALSE cp311 prebuilt wheel; our wheels with --no-deps.
- Env vars: OPENCV_IO_ENABLE_OPENEXR=1, PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True.
- Scripts: gen_images.py (FLUX.1-schnell, NF4 4-bit transformer and T5, 1024x1024, 4 steps, guidance 0, seeds 1000+i); trellis_batch.py (TRELLIS.2-4B, pipeline 1024_cascade, to_glb decimation target + texture size, per-asset timing, upload as it goes); pixal_batch.py (Pixal3D 1024_cascade, MoGe camera); prep_model.py (snapshot download + patch rembg to ZhengPeng7/BiRefNet + upload helper); preflight.py (import every wheel + tiny op); launch.py (kinds: build, natten, smoke, trellis, trellis2, pixal, smoke1, full); cost.py (durations.runningSecs x hourly price from `hf jobs hardware`).

## Errors hit and fixes
1. launch: run_job has no `name=`; use labels. Fixed.
2. pip: cumesh and o-voxel wheels "conflicting dependencies" -> install our wheels with --no-deps. A CPU smoke job caught it before any GPU spend.
3. flex_gemm (triton) cannot import without a GPU driver: CPU smoke can only stub it.
4. briaai/RMBG-2.0 is gated (needs account terms; I did not accept for Dom) -> patched pipeline.json to ZhengPeng7/BiRefNet (MIT); verified on CPU. Applies to TRELLIS.2 and Pixal3D pipeline.json (both name RMBG-2.0). Licence note: RMBG-2.0 is non-commercial per my knowledge, unverified here.
5. Results only uploaded at the end -> 35 min job timed out, 9 meshes lost. Fixed: upload each asset as it finishes.
6. TRELLIS on L4 (22 GB usable): a04_iron_chest ran 531 s then CUDA OOM; later assets OOM or CuMesh OOM (a07, a08). Memory stays near 21.5 GB after an OOM. Fix: A100 80 GB, per-asset watchdog, gc + empty_cache.
7. Pixal3D: pip pulled huggingface_hub 2.2.0 via MoGe, transformers needs <1.0 -> pin hub<1.0 AFTER MoGe/utils3d installs. Then Pixal3D in "standard" mode (all models on GPU) OOM'd on every asset on L4 (3 of 3). low_vram mode was never tried.
8. wheels were built for sm_89 only (L4). A100 is sm_80 -> rebuilt with "8.0;8.9" into wheels_sm80_89/.
9. HF scheduling: first pull of the devel image waited about 13 min (not billed as running); later pulls 2 to 5 min.
10. The Mac venv is python 3.14; trimesh needs scipy and networkx for connected components; component counts must weld by position (UV seams otherwise inflate islands).

## Measured (not estimates)
FLUX.1-schnell on L4: load 181 s, 8.3 to 8.6 s per 1024px image (4 steps).
TRELLIS.2 on L4, 1024_cascade, low_vram default, 50k tris target, 2048 tex: model download+load 167 to 176 s; a01 130 s gen (includes first-run warmup) +15 s glb; a02 98+13; a03 82+14; a05 197+21; a06 63+13; a09 169+21; a04, a07, a08 OOM; a10 not finished (job timed out). See run1_trellis_L4_assets.txt. Only a01-a03 meshes survive (tris 48,235 / 46,998 / 49,638; textures 2048x2048 base colour + metal/rough; not watertight; 131 / 23 / 18 position-welded components, almost all tiny).
