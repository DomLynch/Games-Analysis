# R6: Scalable programmatic 3D asset pipeline for Frankendom (research, read-only)

Verified: 2026-10-11. Method: Hugging Face Hub API (`/api/models`, `/api/spaces`, `/api/spaces/<id>/runtime`), raw model cards, GitHub API and READMEs, PyPI pages, HF and vendor pricing pages, and WebSearch/WebFetch. No downloads, no jobs, no spending, no repos or Spaces created. Anything not read from a primary page is marked **unverified**.

## 1) Verdict

For hundreds of props, foliage, rocks, buildings and armour, the best open route is **TRELLIS.2 (MIT) run as a batch of unattended GPU jobs, followed by a fully scripted CPU post-process and automatic quality gates**. TRELLIS.2 is the strongest combination I found of a clean MIT licence, PBR output, an arbitrary-topology representation and a running public Space with gradio endpoints (Pixal3D, also MIT, is a close second to A/B test). Its default outputs are far over budget (the official example decimates to 1,000,000 faces and bakes 4096 textures), so decimation and texture downscaling are mandatory steps, not options. For **creatures**, UniRig (MIT) gives unattended rigging at about 8 GB VRAM, and Puppeteer (Apache-2.0) can add animation. For **humanoids**, nothing verified is safe to fully automate on our 65-bone rig; keep the template-rig path with a human spot check. Two licence issues need Dom's decision before shipping: the **Tencent Hunyuan community licence excludes the EU, UK and South Korea** (so Hunyuan outputs cannot be used there), and **FLUX.1 dev and Krea dev are non-commercial** (use FLUX.1-schnell or Qwen-Image, both Apache-2.0, for the 2D stage). Estimated GPU cost is about **$0.13 to $0.20 per accepted asset** on HF Jobs L4 (estimate, not measured).

## 2) Comparison tables

### 2a) Image-to-3D and text-to-3D generators

Hardware and speed figures are from each model card unless marked. Prices from [HF Jobs pricing](https://huggingface.co/docs/hub/jobs-pricing).

| Model | Task | Licence | Needs | Quality and output notes | Link | Verified |
|---|---|---|---|---|---|---|
| **TRELLIS.2-4B** (Microsoft, Dec 2025) | image to 3D, PBR textured GLB | MIT ([card](https://huggingface.co/microsoft/TRELLIS.2-4B)) | 24 GB min, verified on A100/H100. H100 times: 512³ about 3 s, 1024³ about 17 s, 1536³ about 60 s | Outputs albedo, metallic, roughness, normal, opacity. Handles open and non-manifold geometry. Raw meshes can have small holes, so hole-filling is needed for strict watertight. Example exports `decimation_target=1000000` and `texture_size=4096`, so both must be cut for our budget. Repo pushed 2026-07-10 ([code](https://github.com/microsoft/TRELLIS.2)). Gradio Space `microsoft/TRELLIS.2` is RUNNING with named endpoints `/image_to_3d` and `/extract_glb` (checked via `/gradio_api/info`), so it can be called in a loop. Also in ComfyUI natively ([Comfy blog](https://blog.comfy.org/p/trellis2-and-pixal3d-are-now-native)) | [model](https://huggingface.co/microsoft/TRELLIS.2-4B), [Space](https://huggingface.co/spaces/microsoft/TRELLIS.2) | 2026-10-11 |
| TRELLIS-image-large (v1, 2024) | image to 3D | MIT ([card](https://huggingface.co/microsoft/TRELLIS-image-large)) | GPU, older | Superseded by TRELLIS.2. 2.2M downloads (legacy use). Use only as fallback | [model](https://huggingface.co/microsoft/TRELLIS-image-large) | 2026-10-11 |
| TRELLIS-text-xlarge (text to 3D, 2024) | text to 3D | MIT ([card](https://huggingface.co/microsoft/TRELLIS-text-xlarge)) | GPU | Text-first path is older and weaker than image-first. Prefer image-to-3D from a 2D generator | [model](https://huggingface.co/microsoft/TRELLIS-text-xlarge) | 2026-10-11 |
| **Hunyuan3D-2.1** (Tencent, Jun 2025) | image to 3D with PBR texture | **Tencent Hunyuan Community, not OSI**. Territory excludes EU, UK and South Korea (clause 3(c): use outside Territory is "unlicensed"). 1M MAU threshold needs a Tencent licence ([LICENSE](https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1/blob/main/LICENSE)) | 10 GB shape, 21 GB texture, 29 GB total ([README](https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1)) | Open weights and training code. Space RUNNING (checked via API). Gradio info endpoint returned 404 when probed, so the API shape is unverified. 2025 release | [model](https://huggingface.co/tencent/Hunyuan3D-2.1) | 2026-10-11 |
| Hunyuan3D-2 / 2mv / 2mini | image to 3D | Tencent Hunyuan Community (same territory limits, verify per repo) | 10 to 24 GB class (unverified per variant) | Older 2.x family; 2mini is the lighter variant | [2](https://huggingface.co/tencent/Hunyuan3D-2), [2mv](https://huggingface.co/tencent/Hunyuan3D-2mv), [2mini](https://huggingface.co/tencent/Hunyuan3D-2mini) | 2026-10-11 |
| Hunyuan3D-Omni | multi-modal conditioned 3D | Tencent Hunyuan Community | "10 GB VRAM for generation" per card ([card](https://huggingface.co/tencent/Hunyuan3D-Omni)) | Controllable input (text, image, pose and similar, unverified detail) | [model](https://huggingface.co/tencent/Hunyuan3D-Omni) | 2026-10-11 |
| Hunyuan3D-Part | part segmentation for 3D | **Licence field empty on HF; GitHub NOASSERTION** | unverified | Part decomposition; could help split armour into pieces. Licence unclear | [model](https://huggingface.co/tencent/Hunyuan3D-Part) | 2026-10-11 |
| Hunyuan3D-2.5 / 3.0 | image to 3D | **No public weights found**: `tencent/Hunyuan3D-2.5` and `-3.0` return HTTP 401 (not public under those names). Vendor sources say 3.0 was launched Sep 2025 with open source "planned" and that 3.5 exists, unverified ([Notebookcheck](https://www.notebookcheck.net/Tencent-s-new-Hunyuan-3D-3-0-brings-realistic-AI-model-generation-to-developers-and-creators.1116964.0.html), [3DAIStudio](https://www.3daistudio.com/blog/pixal3d-vs-trellis-2-vs-hunyuan-3d-comparison)) | unknown | Do not plan on these | [search](https://huggingface.co/tencent/Hunyuan3D-2.1) | 2026-10-11 |
| **Pixal3D** (TencentARC, 2026-04-30) | image to 3D with PBR, pixel-aligned | **MIT** ([card](https://huggingface.co/TencentARC/Pixal3D)) | Default 1536 resolution; `--low_vram` mode uses 1024 (no GB figure on card) | Newest candidate in the list. Claims near-reconstruction fidelity and PBR. Space RUNNING, gradio endpoints `/preprocess`, `/generate_3d`, `/extract_glb_api`. Vendor comparison exists ([3DAIStudio](https://www.3daistudio.com/blog/pixal3d-vs-trellis-2-vs-hunyuan-3d-comparison)) but unverified. Best **second generator** to A/B against TRELLIS.2 | [model](https://huggingface.co/TencentARC/Pixal3D), [Space](https://huggingface.co/spaces/TencentARC/Pixal3D) | 2026-10-11 |
| Stable Fast 3D (SF3D, Stability, 2024) | image to textured UV mesh in under 1 s | **Stability AI Community Licence**: free up to US$1M annual revenue, Enterprise licence above ([card](https://huggingface.co/stabilityai/stable-fast-3d)). Gated (contact share) | 512x512 input. VRAM not stated | "Relatively low polygon count", UV textures, delighting, roughness and metallic. Fast and cheap, good for far props. Space RUNNING. Revenue cap is a problem later | [model](https://huggingface.co/stabilityai/stable-fast-3d) | 2026-10-11 |
| Stable Point Aware 3D (SPAR3D, 2024) | image to mesh, under 1 s | Stability Community Licence (same revenue cap). Gated | not stated. Space in **BUILD_ERROR** | Do not use: broken Space, and the revenue cap | [model](https://huggingface.co/stabilityai/stable-point-aware-3d) | 2026-10-11 |
| TripoSR (Stability and VAST, 2024) | image to mesh, fast | **MIT** ([code](https://github.com/VAST-AI-Research/TripoSR)). HF `stabilityai/TripoSR` tagged MIT | small GPU | Older, lower detail; plausible for simple props. 248k downloads (HF) | [model](https://huggingface.co/stabilityai/TripoSR), [code](https://github.com/VAST-AI-Research/TripoSR) | 2026-10-11 |
| TripoSG / TripoSF / MIDI-3D (VAST) | image to 3D shape variants | MIT (TripoSG, TripoSF); Apache-2.0 (MIDI-3D) per HF tags | unverified | Shape-focused; PBR not confirmed. Possible alternates, not evaluated in depth | [TripoSG](https://huggingface.co/VAST-AI/TripoSG), [TripoSF](https://huggingface.co/VAST-AI/TripoSF), [MIDI-3D](https://huggingface.co/VAST-AI/MIDI-3D) | 2026-10-11 |
| Step1X-3D (StepFun, May 2025) | image to textured 3D (geometry plus SD-XL texture) | Apache-2.0 ([card](https://huggingface.co/stepfun-ai/Step1X-3D)) | unverified | Watertight TSDF geometry, SD-XL texture stage. HF shows 0 downloads, which suggests little community use. Stale (last update May 2025) | [model](https://huggingface.co/stepfun-ai/Step1X-3D) | 2026-10-11 |
| Direct3D-S2 (DreamTech/Nju-3DV, 2025) | image to 3D via sparse SDF at 1024³ | MIT per HF mirror `biali/Direct3D-S2` and `wushuang98/Direct3D-S2`; **GitHub LICENSE not confirmed** ([project](https://nju-3dv.github.io/projects/Direct3D-S2/)) | Training on 8 GPUs; inference GPU unverified | Strong geometry claims; no independent test. Originals on HF are not found under the names I tried (401). Watch, don't adopt yet | [mirror](https://huggingface.co/biali/Direct3D-S2), [paper](https://arxiv.org/html/2505.17412v1) | 2026-10-11 |
| UltraShape (2025) | geometry refinement / watertight data cleaning | Apache-2.0 ([card](https://huggingface.co/biali/UltraShape)) | unverified | A geometry-cleaning idea worth testing for the gate stage, not a generator | [model](https://huggingface.co/biali/UltraShape) | 2026-10-11 |
| SAM 3D Objects (Meta, Oct 2025, updated Jun 2026) | single image to object (Gaussian splat, mesh per README) | **SAM License** (not OSI). Commercial use not explicitly granted or denied ([LICENSE](https://github.com/facebookresearch/sam-3d-objects/blob/main/LICENSE)). **Gated** (manual approval) | not stated | Output shown as PLY Gaussian splat. Mesh and texture path not confirmed. Legal read required | [model](https://huggingface.co/facebook/sam-3d-objects), [code](https://github.com/facebookresearch/sam-3d-objects) | 2026-10-11 |
| Lyra-2.0 (NVIDIA, Apr 2026) | single image to explorable 3D Gaussian scene | **NVIDIA Internal Scientific R&D licence: no production, no sale** ([card](https://huggingface.co/nvidia/Lyra-2.0)) | H100-class | Scene-scale world generation, not asset generation. Excluded for shipping | [model](https://huggingface.co/nvidia/Lyra-2.0) | 2026-10-11 |

**Speed and quality summary.** The only speed numbers I could tie to a primary source are TRELLIS.2 on H100 and SF3D's "under one second" claim. Vendor blogs say Hunyuan takes 2 to 6 minutes and TRELLIS.2 1 to 3 minutes per asset, but those are unverified ([3DAIStudio](https://www.3daistudio.com/blog/trellis-2-vs-hunyuan-3d-differences-explained)). There is no independent benchmark comparing TRELLIS.2 and Hunyuan on retopology or rigging quality. Run our own A/B on 20 representative props before committing.

**API status (checked 2026-10-11 via `/api/spaces/<id>/runtime`).** RUNNING: `microsoft/TRELLIS.2`, `tencent/Hunyuan3D-2.1`, `tencent/Hunyuan3D-2`, `stabilityai/stable-fast-3d`, `TencentARC/Pixal3D`, `tencent/HY-Motion-1.0`, `black-forest-labs/FLUX.1-Krea-dev`. BUILD_ERROR: `stabilityai/stable-point-aware-3d`. Note that the TRELLIS.2 and Hunyuan Spaces report `zero-a10g` hardware in their runtime field, while the ZeroGPU docs say the default is an RTX PRO 6000 half-slice. That discrepancy is unresolved ([ZeroGPU docs](https://huggingface.co/docs/hub/spaces-zerogpu)).

### 2b) Rigging and animation

| Model | Task | Licence | Needs | Output and limits | Link | Verified |
|---|---|---|---|---|---|---|
| **UniRig** (VAST, SIGGRAPH 2025) | auto-rig any mesh (skeleton plus skin weights) | **MIT** ([README](https://github.com/VAST-AI-Research/UniRig)) | 8 GB VRAM for generation; skin model training needs 60 GB ([README](https://github.com/VAST-AI-Research/UniRig)) | FBX skeleton and skin, merged GLB. **Rigging only, no animations.** Bone attribute prediction "coming soon". Our tests found unnamed 46-bone rigs that tear cloth, so not for humanoids. Good for creatures and rigless props | [model](https://huggingface.co/VAST-AI/UniRig), [code](https://github.com/VAST-AI-Research/UniRig) | 2026-10-11 |
| **Puppeteer** (Seed3D, arXiv 2508.10898, NeurIPS 2025 Spotlight) | auto-rig and animate from video guidance | **Apache-2.0** ([repo](https://github.com/Seed3D/Puppeteer)) | Python 3.10, PyTorch 2.1.1, CUDA 11.8, flash-attn, pytorch3d. FBX export needs `bpy==4.2.0`. VRAM not stated | Rig files, FBX export, multi-view animation renders. Animation needs a driving video, so not a pure text-to-motion path | [repo](https://github.com/Seed3D/Puppeteer), [arXiv](https://arxiv.org/abs/2508.10898) | 2026-10-11 |
| **Make-It-Animatable** (CVPR 2025, USTC and Tencent) | make a humanoid mesh animation-ready (bones and skin) in under 1 s | Code **MIT** on GitHub ([repo](https://github.com/jasongzy/Make-It-Animatable)). HF repo tag says **Apache-2.0**: the two disagree, check the LICENSE file before use. Pretrained weights are provided | Humanoid-trained (Mixamo FBX training data). MIA v2 accepts mesh input only | Predicts its own bones and skin weights; output format not stated. Could be a **humanoid starting point**, but it will not produce our 65-bone rig. Needs a retarget or re-skin step | [HF](https://huggingface.co/jasongzy/Make-It-Animatable), [repo](https://github.com/jasongzy/Make-It-Animatable), [paper](https://arxiv.org/abs/2411.18197) | 2026-10-11 |
| RigAnything (SIGGRAPH 2025) | autoregressive template-free rig | **Licence not confirmed**: no LICENSE found in search results. Repo `Isabella98Liu/RigAnything` | unknown | Probabilistic joints and skinning. Do not use until licence is confirmed ([repo](https://github.com/Isabella98Liu/RigAnything)) | [repo](https://github.com/Isabella98Liu/RigAnything) | 2026-10-11 |
| AnyTop (Tel Aviv U, arXiv 2502.17327) | motion for any skeleton topology | **Code licence not confirmed**. Project page links to code | trained on Truebones Zoo mocap | Animation generator for arbitrary skeletons, interesting for creatures. Not verified as runnable | [paper](https://arxiv.org/abs/2502.17327) | 2026-10-11 |
| HY-Motion-1.0 (Tencent, Dec 2025) | text to skeleton motion | Tencent Hunyuan Community (check territory clause on its LICENSE.txt, not read) | 24 to 26 GB VRAM ([card](https://huggingface.co/tencent/HY-Motion-1.0)); Lite is 24 GB | 1.0B params; suggests under 5 s motions for low VRAM. Output format unverified (SMPL/FBX-related acknowledgements). Space RUNNING | [model](https://huggingface.co/tencent/HY-Motion-1.0) | 2026-10-11 |
| MotionGPT (OpenMotionLab) | text to motion (LLM-based) | **MIT** ([repo](https://github.com/OpenMotionLab/MotionGPT)). Last push 2025-07 | GPU | Research-grade; dataset licences matter more than code | [repo](https://github.com/OpenMotionLab/MotionGPT) | 2026-10-11 |
| MoMask | text to motion (masked token) | **Licence not confirmed** (repo fetch returned 404 in my check) | GPU | Not verified | [repo](https://github.com/EricGuo5513/momask-code) | 2026-10-11 |
| Blender Rigify | procedural rig from a meta-rig | GPL (Blender) | CPU | Human-made template rigs; automatable through Blender Python. Good for our humanoid template | [manual](https://docs.blender.org/manual/en/4.3/addons/rigging/rigify/index.html) | 2026-10-11 |
| Mixamo (Adobe) | auto-rig humanoids plus library animations | Free, but **no bulk API**. Community copy of FAQ: commercial games allowed, raw files may not be redistributed, **ML training excluded** ([Adobe community](https://community.adobe.com/questions-696/mixamo-faq-licensing-royalties-ownership-eula-and-tos-589400)). Adobe's own FAQ page returned 404 in my check | web upload only | Good manual reference, not a batch tool. Do not automate uploads | [FAQ copy](https://community.adobe.com/questions-696/mixamo-faq-licensing-royalties-ownership-eula-and-tos-589400) | 2026-10-11 |

### 2c) Motion and rigging datasets (licence caveats)

| Dataset | Content | Licence | Caveat | Link | Verified |
|---|---|---|---|---|---|
| AMASS | 40+ h, 300+ subjects, 11k+ motions, 15 mocap sets in SMPL | Licence page not read (the terms page is linked from the main site). Registration required | Research use is the default. Do not use commercially until the licence is read | [site](https://amass.is.tue.mpg.de/) | 2026-10-11 |
| Motion-X++ | motion dataset | Not verified (HF returned 401) | Check before use | [HF](https://huggingface.co/datasets/Motion-X/Motion-X-plus) | 2026-10-11 |
| 100STYLE (Ubisoft) | styled locomotion mocap | Not verified (Ubisoft page 404) | Check before use | [site](https://www.ubisoft.com/en-us/company/innovation/100style) | 2026-10-11 |

### 2d) Post-processing, retopology, texture and glTF tools

| Tool | Job | Licence | Notes | Link | Verified |
|---|---|---|---|---|---|
| meshoptimizer (incl. gltfpack) | mesh simplify, vertex cache, glTF meshopt compression | **MIT** ([repo](https://github.com/zeux/meshoptimizer)) | Last push 2026-10-09. gltfpack is in the repo (from memory, verify) | [repo](https://github.com/zeux/meshoptimizer) | 2026-10-11 |
| fast-simplification (Python) | quadric decimation to a target triangle count | **MIT** ([PyPI](https://pypi.org/project/fast-simplification/)); v0.2.0, Aug 2026 | Wrapper around Fast-Quadric-Mesh-Simplification. Good for the "decimate to budget" step | [PyPI](https://pypi.org/project/fast-simplification/) | 2026-10-11 |
| QuadriFlow | quad retopology to a target face count | **MIT** ([repo](https://github.com/hjwdzh/QuadriFlow)). Includes third-party parts (Boost, Eigen with LGPL bits, Gurobi benchmark-only) | Use only if we need quads (animation-heavy). Not needed for rigid props | [repo](https://github.com/hjwdzh/QuadriFlow) | 2026-10-11 |
| Instant Meshes | quad remesh | **Not confirmed** (GitHub reports NOASSERTION; LICENSE file not readable in my check). Last push 2022-01 | Old, but widely used. Verify licence before use | [repo](https://github.com/wjakob/instant-meshes) | 2026-10-11 |
| KTX-Software (toktx and ktx encode) | KTX2 texture compression | **Not confirmed** in my check (LICENSE link only); KTX-Software repo active (pushed 2026-10-10) | Verify licence and whether `toktx` or `ktx encode` is preferred | [repo](https://github.com/KhronosGroup/KTX-Software) | 2026-10-11 |
| glTF Validator | validate GLB structure, accessors, textures (warns on non-power-of-two) | **Apache-2.0** ([repo](https://github.com/KhronosGroup/glTF-Validator)) | Automatic gate for "file is valid glTF" | [repo](https://github.com/KhronosGroup/glTF-Validator) | 2026-10-11 |
| Blender (headless) | UV unwrap, bake (normal and AO), scale, pivot | GPL | Internal use is fine; we ship GLBs, not Blender. Use Cycles bake from high to low poly | [manual](https://docs.blender.org/manual/en/4.3/addons/rigging/rigify/index.html) | 2026-10-11 |

**Retopology reality.** TRELLIS.2 and Hunyuan produce dense meshes that need decimation to our 20 to 50k budget. Quad retopology is only needed for deforming parts (cloth, faces, joints). Rigid props just need decimation, UV and bake. An independent comparison of retopology quality does not exist in what I found (vendor claims only, [3DAIStudio](https://www.3daistudio.com/blog/pixal3d-vs-trellis-2-vs-hunyuan-3d-comparison)).

### 2e) Image, LoRA, VLM and PBR models

| Model | Role | Licence | Notes | Link | Verified |
|---|---|---|---|---|---|
| **FLUX.1-schnell** | 2D concept image | **Apache-2.0** ([HF](https://huggingface.co/black-forest-labs/FLUX.1-schnell)). Gated (contact share) | Fast, commercially usable. Best base for our pipeline | [model](https://huggingface.co/black-forest-labs/FLUX.1-schnell) | 2026-10-11 |
| **Qwen-Image** | 2D concept image | **Apache-2.0** ([HF](https://huggingface.co/Qwen/Qwen-Image)); not gated. 267k downloads | Commercially clean alternative to FLUX | [model](https://huggingface.co/Qwen/Qwen-Image) | 2026-10-11 |
| Qwen-Image-Edit | 2D edit (A-pose, cleanup) | Apache-2.0 ([HF](https://huggingface.co/Qwen/Qwen-Image-Edit)) | Replaces the Kontext step if we move off FLUX | [model](https://huggingface.co/Qwen/Qwen-Image-Edit) | 2026-10-11 |
| FLUX.1-Krea-dev (current base) | 2D image | **FLUX.1 [dev] Non-Commercial Licence**; gated ([card](https://huggingface.co/black-forest-labs/FLUX.1-Krea-dev)). Card wording on commercial outputs is mixed | **Blocker for shipping assets** unless Dom gets a commercial licence from BFL. Legal read required | [model](https://huggingface.co/black-forest-labs/FLUX.1-Krea-dev) | 2026-10-11 |
| FLUX.2-dev | 2D image | "other" licence, gated | Not checked further | [model](https://huggingface.co/black-forest-labs/FLUX.2-dev) | 2026-10-11 |
| Qwen3-VL (2B, 4B, 8B) | VLM judge for quality gates | **Apache-2.0** ([8B](https://huggingface.co/Qwen/Qwen3-VL-8B-Instruct)); 8.7M downloads on 8B | Use 8B on L4 (bf16 about 16 GB, unverified) or 4B for speed | [8B](https://huggingface.co/Qwen/Qwen3-VL-8B-Instruct), [4B](https://huggingface.co/Qwen/Qwen3-VL-4B-Instruct) | 2026-10-11 |
| ai-toolkit (Ostris) | LoRA trainer for FLUX and others | **MIT** ([repo](https://github.com/ostris/ai-toolkit)); pushed 2026-10-10 | The Replicate trainer is deprecated (per a third-party page). Use this repo or the Ostris Replicate trainer successor | [repo](https://github.com/ostris/ai-toolkit) | 2026-10-11 |
| StableMaterials (gvecchio) | PBR material generation | **OpenRAIL** (use restrictions apply) ([HF](https://huggingface.co/gvecchio/StableMaterials)) | 955 downloads, 36 likes. Restrictions must be read | [model](https://huggingface.co/gvecchio/StableMaterials) | 2026-10-11 |
| MaterialAnything | PBR material | Not found on HF in my search (401 for guessed repo) | Not verified | - | 2026-10-11 |
| ComfyUI | node graph runtime, can run as API | **GPL-3.0** ([repo](https://github.com/comfyanonymous/ComfyUI)). Headless API mode suggested on the page but not confirmed in my read | Use if we need the TRELLIS.2 and Pixal3D native nodes outside a Space | [repo](https://github.com/comfyanonymous/ComfyUI) | 2026-10-11 |

### 2f) Asset sources for modular and zone content

| Source | Licence | Caveat | Link | Verified |
|---|---|---|---|---|
| Poly Haven (models, HDRIs, textures) | **CC0** for the assets; attribution not required; redistribution allowed incl. paid products ([licence](https://polyhaven.com/license)) | Only the assets are CC0. Site text and logos are not | [polyhaven.com/license](https://polyhaven.com/license) | 2026-10-11 |
| Objaverse-XL | ODC-By 1.0 for the metadata; **each object has its own licence** (42 values seen, including MIT and GPL-3.0, and some with none listed) ([card](https://huggingface.co/datasets/allenai/objaverse-xl)) | Filter to CC0 or MIT per object and record attribution. Over 10.8M rows | [dataset](https://huggingface.co/datasets/allenai/objaverse-xl) | 2026-10-11 |
| Kenney, Quaternius (CC0 packs) | CC0 (from memory, not verified in this pass) | Good for hand-made modular kits | - | unverified |

## 3) Reference architecture and cost estimate

### 3a) Text diagram

```
[Concept prompt + style LoRA]  (FLUX.1-schnell or Qwen-Image, Apache-2.0)
        |  HF Jobs GPU: L4 24GB or A10G 24GB ($0.80 or $1.00/h); use A100 or RTX PRO 6000 for 1536
        v
[Background removal + image gate]  Qwen3-VL-8B (Apache-2.0) scores "single object, clean silhouette, on-style"
        |  reject bad inputs here (cheap)
        v
[Image-to-3D x3 candidates]  TRELLIS.2 (MIT) via gradio /image_to_3d or huggingface_hub run_job; A/B Pixal3D (MIT)
        |  raw output ~1M faces, 4096 texture
        v
[CPU post-process]  HF CPU Upgrade 8 vCPU / 32 GB = $0.03/h, or the VPS (see the vps-heavy-jobs rule)
        |  1. decimate to budget (fast-simplification, MIT) to 20-50k tris
        |  2. hole-fill / watertight pass (trimesh-style, verify licence)
        |  3. auto-orient, scale to metres, pivot at base (script)
        |  4. UV unwrap + bake normal/AO from hi to lo (Blender headless, GPL, internal use)
        |  5. texture downscale to <= 2048 (PIL or ImageMagick, licence fine)
        |  6. glTF export + meshoptimizer compression (gltfpack, MIT) + KTX2 (verify licence)
        v
[Automatic gates]  glTF Validator (Apache-2.0); tri count; texture size; watertight; floating islands;
                   Qwen3-VL score vs reference; reject -> regenerate with a new seed (max 3)
        |
        +--> [Rigid prop]  done -> manifest + ZIP to asset store
        +--> [Creature]    UniRig (MIT, 8 GB) rig -> Puppeteer (Apache-2.0) animation (driving video) -> gate
        +--> [Humanoid]    template 65-bone rig, Blender data-transfer weight copy from our knight,
                           then HUMAN check (cloth, joints, pose stress test). Not fully automatic.
        v
[Spot check]  5-10% sampled to a human reviewer; failure rate drives the seed count
```

### 3b) Compute and cost estimate (estimates, not measured)

Basis: HF Jobs hourly prices from [pricing](https://huggingface.co/docs/hub/jobs-pricing) (L4 $0.80/h, A10G-small $1.00/h, A10G-large $1.50/h, A100-large $2.50/h, RTX PRO 6000 $2.75/h, CPU Upgrade 8 vCPU/32 GB $0.03/h). Per-minute billing, default timeout 30 min. Generation time is an assumption: 2 to 4 minutes per candidate on L4 for TRELLIS.2 at 1024 (H100 is about 17 s for generation alone, so L4 is 3 to 6x slower, unverified).

| Step | Hardware | Est. time per unit | Est. cost per unit |
|---|---|---|---|
| TRELLIS.2 candidate (1024, gen + postprocess) | L4 24 GB | 3 min | about $0.04 |
| Same at 1536 | A100 80 GB | 3 min | about $0.13 |
| UniRig rig (creature) | L4 | about 2 min (Dom's test on L4) | about $0.03 |
| Qwen3-VL-8B gate (per asset) | L4 | 5 s | < $0.01 |
| CPU post-process (decimate, bake, export) | 8 vCPU | 2 min | < $0.01 |
| FLUX.1-schnell or Qwen-Image concept (per image) | L4 | 10 to 20 s | < $0.01 |
| **Accepted asset (3 candidates, 1 accepted)** | | | **about $0.13 to $0.20** |
| Style LoRA (1,000 steps, 15 to 30 images) | L4 to A100 | 1 to 4 h | about $3 to $10 |

**Batch estimate:** 500 accepted props at about $0.13 to $0.20 is about **$65 to $100** of GPU time. Rigging 100 creatures adds about $5. Recurring LoRA retrain is about $10.

**ZeroGPU comparison.** PRO is $9/month and includes 40 min/day of ZeroGPU quota. Beyond that, credits cost $1 per 10 min, so 1,000 GPU-minutes over quota is about $100. The same 1,000 minutes on HF Jobs L4 is about $13. **Use Jobs for batch, not ZeroGPU** ([ZeroGPU docs](https://huggingface.co/docs/hub/spaces-zerogpu), [PRO pricing](https://huggingface.co/pricing)).

**Other providers (list prices, checked 2026-10-11).** Modal: L4 $0.000222/s (about $0.80/h), A10 about $1.10/h, A100 80 GB $2.50/h, H100 $3.95/h, starter credit $30/month ([Modal](https://modal.com/pricing)). RunPod: L4 serverless $0.69/h, A100 80 GB $2.72/h serverless, H100 $4.79/h serverless. Its Pod prices disagree between the visible table and metadata, so confirm in the console ([RunPod](https://www.runpod.io/pricing)). Neither is clearly cheaper than HF Jobs L4 at $0.80/h. Keep one as a fallback only.

**Orchestration options.** HF Jobs via `hf jobs run` or `huggingface_hub.run_job` (Python) with a timeout and namespace; ideal for unattended runs ([Jobs docs](https://huggingface.co/docs/hub/jobs)). gradio_client against the TRELLIS.2 Space is possible but quota-bound. ComfyUI headless is possible but its API mode is not confirmed from the page I read ([ComfyUI](https://github.com/comfyanonymous/ComfyUI)).

## 4) Ranked recommendations (for Frankendom)

1. **TRELLIS.2 (MIT) as the batch generator, with mandatory decimation and texture downscale.** Run 3 candidates per prompt as HF Jobs (L4 or A10G 24 GB, A100 for 1536). Cap output to 20 to 50k triangles and 2048 textures. Value: best licence-to-quality ratio with PBR output and a working gradio API. Risk: hole-filling needed.
2. **Automatic post-process and gate stack (meshoptimizer, fast-simplification, glTF Validator, Qwen3-VL).** This is what makes "no human" possible. Build it once, reuse it for every generator. Expect roughly 10% rejects; add reseeds rather than manual edits.
3. **Move the 2D stage off FLUX.1-Krea/dev to FLUX.1-schnell or Qwen-Image (both Apache-2.0), with a style LoRA trained on our art.** One LoRA (15 to 30 images, about 1,000 steps, $3 to $10) gives on-style concepts for all 700 zones and removes a licence blocker.
4. **Rig creatures with UniRig (MIT, 8 GB) and animate with Puppeteer (Apache-2.0); keep humanoids on the template rig.** UniRig is quick (about 2 min) but has no animations and tears cloth, so it stays off humanoids. Humanoid weight-copy from our knight plus a human spot check is the realistic path.
5. **A/B Pixal3D (MIT, 2026-04, PBR, 1536) as a second generator; do not ship Hunyuan3D-2.1 outputs without legal sign-off.** Pixal3D is MIT and newer than Hunyuan 2.1. Hunyuan's licence excludes EU, UK and South Korea (and 3(c) makes use outside the Territory unlicensed), so Hunyuan outputs cannot ship there even if the rest of the pipeline is fine.

## 5) Do NOT bother

- **Hunyuan3D-2.5 and 3.0:** no public weights found under those names (HTTP 401); vendor sources only.
- **SPAR3D (stable-point-aware-3d):** Space is BUILD_ERROR, and the Stability revenue cap applies.
- **SF3D for shipping assets:** under one second per asset, but the Stability Community Licence requires an Enterprise licence above US$1M annual revenue, and the output has low polygon detail. Fine for prototypes, not as the pipeline.
- **Lyra-2.0 (NVIDIA):** non-commercial research licence; scene-scale, not asset generation.
- **FLUX.1-Krea-dev or FLUX.1-dev as the shipping image model:** non-commercial licence.
- **Mixamo as an automated batch source:** no bulk API, and ML training is excluded in the community FAQ copy.
- **AMASS and similar mocap sets for commercial work** until the licence is read and confirmed.
- **RigAnything** until a LICENSE is found.
- **Step1X-3D:** Apache-2.0 but stale (May 2025) with 0 HF downloads; not worth a bake-off yet.
- **ZeroGPU for unattended batch:** quota and credit overage cost about 7x HF Jobs per GPU-minute.
- **Text-first 3D (TRELLIS-text-xlarge):** image-first via a 2D generator is cleaner and better tested.
- **Modular kits from AI generation:** no evidence I found that generated 3D gives clean modular pieces. Build modular kits procedurally (Blender Geometry Nodes) or from CC0 packs (Poly Haven, Kenney, Quaternius).

## 6) Open questions and things I could not verify

- **Throughput on HF Jobs.** All speed numbers are H100 or vendor figures. I did not measure TRELLIS.2 on L4 or A10G. First step: a 10-asset timed run.
- **Triangle count and texture size from TRELLIS.2 after our decimate step.** Confirm the 20 to 50k target holds with the `decimation_target` parameter.
- **Hunyuan3D-2.1 and 2.5/3.0 status.** No public 2.5 or 3.0 weights found. I did not confirm the 2.1 Space API shape (gradio info returned 404).
- **Make-It-Animatable licence conflict.** GitHub says MIT; HF tag says Apache-2.0. Read the LICENSE file before use.
- **RigAnything, AnyTop, MoMask, Instant Meshes, KTX-Software, DreamTech Direct3D-S2 (GitHub), MaterialAnything, Motion-X++, 100STYLE:** licence or code location not confirmed.
- **HY-Motion-1.0 territory clause and output format.** Read its LICENSE.txt. Output format not stated on the card.
- **SAM 3D Objects commercial use.** The SAM License does not say either way. Legal read required, and the repo is gated.
- **Mixamo current terms.** Only a 2022 community copy of the FAQ was readable; Adobe's own page returned 404.
- **Pricing discrepancies.** RunPod Pod prices conflict between the visible table and metadata. HF PRO Jobs credits are not confirmed as included.
- **Hunyuan Space hardware.** The runtime field shows zero-a10g while docs say RTX PRO 6000; not resolved.
- **Lighting and fidelity of Pixal3D and Direct3D-S2 vs TRELLIS.2.** No independent test; vendor claims only.
- **Process note.** Several PyPI and GitHub lookups in Bash were blocked by a Mac heavy-run hook. I used WebFetch for those instead. The hook is a pattern false positive for light lookups; nothing heavy was run.
- **Unverified cost figures.** The FLUX LoRA step count and time comes from secondary sources ([Stable Diffusion Art](https://stable-diffusion-art.com/?p=14891), Replicate examples). The per-asset cost in section 3b is an estimate built from HF prices and assumed generation time.

## Sources (primary unless marked secondary)

Model and Space pages: [TRELLIS.2-4B](https://huggingface.co/microsoft/TRELLIS.2-4B), [TRELLIS.2 code](https://github.com/microsoft/TRELLIS.2), [Hunyuan3D-2.1](https://huggingface.co/tencent/Hunyuan3D-2.1), [Hunyuan3D-2.1 LICENSE](https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1/blob/main/LICENSE), [Hunyuan3D-Omni](https://huggingface.co/tencent/Hunyuan3D-Omni), [SF3D](https://huggingface.co/stabilityai/stable-fast-3d), [SPAR3D](https://huggingface.co/stabilityai/stable-point-aware-3d), [Pixal3D](https://huggingface.co/TencentARC/Pixal3D), [Step1X-3D](https://huggingface.co/stepfun-ai/Step1X-3D), [SAM 3D Objects](https://huggingface.co/facebook/sam-3d-objects), [SAM 3D LICENSE](https://github.com/facebookresearch/sam-3d-objects/blob/main/LICENSE), [Lyra-2.0](https://huggingface.co/nvidia/Lyra-2.0), [UltraShape](https://huggingface.co/biali/UltraShape), [TripoSR code](https://github.com/VAST-AI-Research/TripoSR), [UniRig](https://github.com/VAST-AI-Research/UniRig), [Puppeteer](https://github.com/Seed3D/Puppeteer), [Make-It-Animatable HF](https://huggingface.co/jasongzy/Make-It-Animatable), [Make-It-Animatable code](https://github.com/jasongzy/Make-It-Animatable), [HY-Motion-1.0](https://huggingface.co/tencent/HY-Motion-1.0), [MotionGPT](https://github.com/OpenMotionLab/MotionGPT), [AMASS](https://amass.is.tue.mpg.de/), [Objaverse-XL](https://huggingface.co/datasets/allenai/objaverse-xl), [Poly Haven licence](https://polyhaven.com/license), [FLUX.1-Krea-dev](https://huggingface.co/black-forest-labs/FLUX.1-Krea-dev), [FLUX.1-schnell](https://huggingface.co/black-forest-labs/FLUX.1-schnell), [Qwen-Image](https://huggingface.co/Qwen/Qwen-Image), [Qwen3-VL-8B](https://huggingface.co/Qwen/Qwen3-VL-8B-Instruct), [StableMaterials](https://huggingface.co/gvecchio/StableMaterials), [ai-toolkit](https://github.com/ostris/ai-toolkit), [ComfyUI](https://github.com/comfyanonymous/ComfyUI).

Infrastructure: [HF Jobs pricing](https://huggingface.co/docs/hub/jobs-pricing), [HF Jobs docs](https://huggingface.co/docs/hub/jobs), [ZeroGPU docs](https://huggingface.co/docs/hub/spaces-zerogpu), [HF pricing](https://huggingface.co/pricing), [Modal pricing](https://modal.com/pricing), [RunPod pricing](https://www.runpod.io/pricing).

Mesh tools: [meshoptimizer](https://github.com/zeux/meshoptimizer), [fast-simplification on PyPI](https://pypi.org/project/fast-simplification/), [QuadriFlow](https://github.com/hjwdzh/QuadriFlow), [Instant Meshes](https://github.com/wjakob/instant-meshes), [KTX-Software](https://github.com/KhronosGroup/KTX-Software), [glTF Validator](https://github.com/KhronosGroup/glTF-Validator), [Blender Rigify manual](https://docs.blender.org/manual/en/4.3/addons/rigging/rigify/index.html).

Secondary (vendor or blog, unverified): [3DAIStudio TRELLIS.2 vs Hunyuan](https://www.3daistudio.com/blog/trellis-2-vs-hunyuan-3d-differences-explained), [3DAIStudio Pixal3D vs TRELLIS.2 vs Hunyuan](https://www.3daistudio.com/blog/pixal3d-vs-trellis-2-vs-hunyuan-3d-comparison), [Notebookcheck on Hunyuan 3.0](https://www.notebookcheck.net/Tencent-s-new-Hunyuan-3D-3-0-brings-realistic-AI-model-generation-to-developers-and-creators.1116964.0.html), [Mixamo FAQ community copy](https://community.adobe.com/questions-696/mixamo-faq-licensing-royalties-ownership-eula-and-tos-589400), [Stable Diffusion Art LoRA](https://stable-diffusion-art.com/?p=14891), [Direct3D-S2 paper](https://arxiv.org/html/2505.17412v1), [Direct3D-S2 project](https://nju-3dv.github.io/projects/Direct3D-S2/), [Make-It-Animatable paper](https://arxiv.org/abs/2411.18197), [AnyTop paper](https://arxiv.org/abs/2502.17327), [Puppeteer paper](https://arxiv.org/abs/2508.10898).

**Next step if Dom wants to proceed:** a 10-asset timed TRELLIS.2 run on HF Jobs L4 (about $0.50 of compute), plus a licence read for FLUX dev, Hunyuan and SAM. No jobs were launched in this research.
