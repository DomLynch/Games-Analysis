# Character build recipe (humanoid bosses and heroes), 2026-10-11

Proven on Frost Revenant and Emberforge Tyrant. Plain English: **we make the look with AI (FLUX picture, then TRELLIS 3D), then fit it onto our own 65-bone rig in Blender.** That fit is what makes all 37 animations play with no tearing.

## Steps
1. **Our own prompt.** Silhouette first, material, colour; A-pose, empty hands, neutral grey background. Donors only inspire wording.
2. **Design image.** FLUX.1-Krea-dev Space via gradio_client (seed 190926, 832x1216, 28 steps).
3. **3D.** TRELLIS.2 at max (`trellis2.py --resolution 1536 --faces 500000 --texture 4096`), about 3 minutes, no dollars (ZeroGPU on Dom's Pro).
4. **Fit on our rig.** `tools/fit_tmax_to_knight_rig.py` in Blender on the VPS (args in the boss brief). Copies skin weights from our knight, keeps our maul, shrinks textures, exports all 37 animations.
5. **NEW: cloth bones.** Tabard, skirt, cloak and hanging straps get their own small bone chains. This is the known weak spot (Frost tabard hem; UniRig tore its tabard too).
6. **NEW: pose stress test.** `tools/pose_stress_test.html?glb=PATH&name=NAME` (served by `tools/render_server.py`, Browser pane) bends the limbs in 4 views. Any tearing or flying shards = not done.
7. **Arena look-check.** `tools/fight_camera_stills.html` at phone size, with our knight for scale.

## Tested and NOT adopted: UniRig auto-rigging (2026-10-11)
Model `VAST-AI/UniRig` (MIT) rigged Frost Revenant in about 2 minutes on an L4, under $1 by estimate. It gives its **own 46 unnamed bones, no animations**, so our 37 animations do not play without retargeting. Body bends fine; tabard and skirt tear and stretch. **Verdict: the hand fit is better for humanoids.** Possible later use: a starter skeleton for creatures that have no rig (Stormscale Drake, Dread Stalker) after Proof 3.
What we keep from it: (a) compare its joint positions with our fit as a second opinion, (b) the pose stress test, (c) the GPU recipe below.

## GPU recipe for any Hugging Face model (plug and play, once)
`tools/hf_run_unirig.py` + `tools/hf_unirig_job.sh`: mesh to a private repo, job on an **L4** (flavor `l4x1`, ~$0.80/h), job uploads results back to the same repo, then `hf_hub_download`. Never T4 for flash-attn models. Install the official flash-attn wheel (cu12 torch2.5 cp311) and `libusb-1.0-0` for `bpy`. Public Spaces break without notice (all four UniRig Spaces were dead): prefer running the model yourself.

## Traps
- Auto-skinning the DONOR mesh onto our body crumples; never do it.
- This Mac filesystem is case-insensitive (`unirig` = `UniRig`).
- Delete private test repos when done (`Domlynch/frankendom-unirig-io` currently holds the Frost Revenant test).
