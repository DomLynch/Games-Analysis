# KsanaDock-Microverse (asset audit, AU029)

Donor: KsanaDock-Microverse, a Godot 4 project for a multi-agent AI town sim (office scene, eight named personas). Half read: the whole project (single client; no separate server in the box; the AI service is external and its code was not read).
Code licence: MIT (LICENSE line 1; line 3 'Copyright (c) 2025 KsanaDock'; README_EN.md line 241).
Asset licence: none stated. README_EN.md line 249 credits LimeZu as the art source with a link, and gives no terms. Ambiguous, so class C.
Rights-holder status (from files): credited third-party art (LimeZu, README only). Project copyright KsanaDock. No font credit.
Best class: C for the art and font. D for the shader (only a uid file) and audio (none).
Checked: LICENSE, README_EN.md (credits and asset tree), asset folder counts by name and extension, script and scene listings, DialogBubble.gd lines 15, 26, 39, CharacterController.gd lines 46, 274, 343-409, CharacterPersonality.gd line 6.

## 1. Licences
- LICENSE: MIT, copyright KsanaDock 2025.
- README_EN.md line 241: project MIT.
- No licence file inside asset/. No CREDITS file. The only credit is LimeZu (README_EN.md line 249).

## 2. Asset inventory (counts from find; sizes by file name where stated)
- 4,297 png and 5 gif in total in the tree, plus 1 otf font, 6 tres theme files and 1 gdshader uid.
- characters/body: 8 sheets (x32). characters/portraits: 8 portraits (P32). Class C.
- objects: 310 png and 4 animated balloon gif (32 px by name). singleObjects/office_objects: 339 png. Class C.
- ui/singles32x32: 3,610 png, grouped in folders named after UI sheets (~1 suffix). ui root: GUI.png and two Modern UI sheets and dialog_bubble_bg.png. Class C.
- maps: 13 interior png, 1 exterior png, 1 animated gif. Class C.
- fonts: fusion-pixel-12px-proportional-zh_hans.otf, 4.05 MB, no licence in box. Class C.
- pics: 4 promo images. Class C.
- shader: asset/ui/shaders holds only glass_blur.gdshader.uid; the shader source is not present. Class D.
- audio: none. Class D.

## 3. Rights-holder status
Credited art (LimeZu) with no terms in the box. The project itself is MIT. Font and promo images have no credit line.

## 4. Inspiration (my own words)
- Small-prop office: 32 px props on a tile grid, with carts, balloons and a TV as ambient life (asset/objects; pics/office.png). Keep the dense small-prop read; use our own prop set.
- Speech bubble: a nine-patch background with a word-wrapped pixel label, default duration argument 5.0 (script/ui/DialogBubble.gd lines 15, 26, 39). Recreate with our frame and a tail pointing at the speaker.
- Arrival ease: walk speed lerps from 40 percent at the target to full at 50 px away (script/CharacterController.gd line 274). Keep the ease-out; add a settle pose.
- Direction-keyed clips: idle, run, sit and stand clips named by facing (script/CharacterController.gd lines 46, 343-409). Keep the clip-per-facing pattern; add a three-quarter facing.
- Ambient loops: short 32 px animated props (asset/objects/animated_*). Recreate a loop set with fire, lanterns and flicker.
- Portrait and body pairs: one face card for talk and one body sheet for the world (asset/characters). Keep the pair; change the portrait palette.
- Persona table: one constant keyed by persona name (script/CharacterPersonality.gd line 6). A data-driven roster shape worth keeping.

## 5. Briefs
Four briefs in the json: Nine-patch speech bubble, Arrival ease, Lantern loop props, Persona card pair. Each names the kept and changed trait. Clearly distinct originals only.

## 6. Cross-link
- camera: not read (CameraController.gd exists).
- hud-ui: dialog bubble and the UI tile sheets; a bubble that flips to the speaker's side.
- vfx: looping props as ambient effects.
- sound: none in the box.
- animation: direction-keyed clips and the arrival ease.
- spawns: none read.
- loot: none.
