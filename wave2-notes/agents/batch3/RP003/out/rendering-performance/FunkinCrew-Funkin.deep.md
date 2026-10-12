# FunkinCrew-Funkin (rendering-performance, cell 2)

Donor: `/mnt/frankendom-donors/FunkinCrew-Funkin/source/funkin/ui/freeplay/SongItemGroup.hx` (with `SongMenuItem.hx` trail code, `ui/AtlasText.hx` hint file) | Licence: Apache 2.0 (per `LICENSE.md` line 3: "The Friday Night Funkin' source code is licensed under the Apache 2.0 license") | Haxe | symbol `SongItemGroup.draw`

Checked: `SongItemGroup.hx` read in full (71 lines): `recycle` 19-29, `draw` 32-70. `SongMenuItem.hx` read where it matters: the constructor add order (about 91-219), `fadeAnim` 400-431 (trail adds at 413 and 428), `clearUpTrail` 382-398 (not every line). Hint file `ui/AtlasText.hx` read in full (316 lines) for the text path; it is one sprite per letter, so it is not the batching path. Callers: `FreeplayState.hx` 326 and 483 (the only user of `SongItemGroup`, found by grep). Not read: the Flixel `FlxTypedGroup.draw` and OpenFL draw batching (not in the donor), so the actual GPU merge is not confirmed here. The class comment says the group "prevents memory leaks"; nothing in this file shows that, and I did not verify it. Confidence high on the draw order (whole function read, order checked against the loops); medium on the claim that it saves draw calls (the donor's comment says so, the renderer is not in the box). camera_scope: not a camera cell.

Best transferable idea: Draw a list of multi-part entities layer by layer (all health bars, then all nameplates) so same-material draws run back to back, and count material switches in a test.
Decision (proposed): adapt - take the layer-major pass for overlay layers only (health bars, nameplates, threat rings), which must sit above every body, and keep bodies and weapon layers in per-enemy order, because layer-major changes which enemy draws over which. Fix the first-item layer count and the missing restore on error (see section 6).
Acceptance: A unit test on three enemies with two overlay layers each shows 2 material switches for the overlay pass, against 6 for the item-major order; and at 375 wide in a 3-on-1 fight every nameplate sits above every enemy body, while the bodies keep their per-enemy depth.

## 1. Mechanism

- Two kinds of draw state are involved. `recycle` (19-29) gives every recycled capsule the same shader instance (`rankBlurredShader`, `favIconBlurredShader`) and the same `GlowFilter` for the week text (15-17, 24-27). The comment at line 23 says this is so that "one draw call" can render several of them.
- `draw` (32-70), in order: (a) swap the default camera list for the group's cameras and keep the old one (35-39). (b) Collect the visible capsules into a new array (41-51). Note the trail flag: `hasTrail` is set if any capsule has one (43, 48). (c) Return if none (53). (d) Take the layer count from the first visible capsule (55-56), and add 2 if any capsule has a trail while the first has none (57). (e) Outer loop: layer index `i` from 0 to `memberCount` (58). Inner loop: every visible capsule in order (60). Each capsule's member `i` is drawn if it is not null, visible and alive (62-66). So the order is layer-major: all capsules' layer 0, then all capsules' layer 1, and so on. (f) Restore the camera list (69).
- Why it matters: after this pass, all draws of one layer are adjacent, so those with the same shader or texture are next to each other. Whether the renderer then merges them is in OpenFL, not in this file (not read).
- Trail: `fadeAnim` (400-431) adds two members to the capsule on each trail: `impactThing` (413) and `evilTrail` (428). They are appended after the capsule art, so in the draw order they come after the other layers of that capsule. The members are removed in `clearUpTrail` (382-398, read in part).
- Tick: no fixed step and no accumulator. This is a per-frame draw. Frame pacing is set elsewhere (section 5, fold-in).

## 2. Key functions

- `SongItemGroup.recycle`: `/mnt/frankendom-donors/FunkinCrew-Funkin/source/funkin/ui/freeplay/SongItemGroup.hx` 19-29 (shared shader on each recycled capsule).
- `SongItemGroup.draw`: same file 32-70 (camera swap, collect, layer-major loops, restore).
- `SongMenuItem.fadeAnim`, the trail adds: `/mnt/frankendom-donors/FunkinCrew-Funkin/source/funkin/ui/freeplay/SongMenuItem.hx` 400-431 (partly read; adds at 413 and 428).
- Hint file, `AtlasText.appendTextCased`: `/mnt/frankendom-donors/FunkinCrew-Funkin/source/funkin/ui/AtlasText.hx` 105-146 (read). Each letter is one `AtlasChar` sprite, added with `add` (146). Existing sprites are revived and reused when the group already holds enough (139-141). `AtlasChar.set_char` registers its animation again on every letter change (204). No batching: one sprite per letter, so one draw per letter. The file's other parts (font loading 93-127, the `AtlasChar` class 11-90) were read as well.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Layer-major pass over a list of multi-part items; a shared material key per layer | None (the loop) |
| Layer count = number of members of the first visible item (+2 if a trail is present on a later item) | Trail adds 2 members (theirs, SongItemGroup.hx 57, a hardcoded number that must match `SongMenuItem.fadeAnim`) |
| Blur strengths for the shared shaders | 1 for rank blur, 1.2 for the favourite icon (theirs, SongItemGroup.hx 15-16); units not read |
| Trail z offsets | -3 for the impact sprite, -5 for the trail (theirs, SongMenuItem.hx 412, 419); not used by any sort on this path (see section 6) |
| Frame cap | Default 60 fps (theirs, Preferences.hx 39); unlocked = 0 means uncapped (Preferences.hx 555); focus lost = 30 (InitState.hx 166) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's layer-major order and counts material switches so the claim can be tested. It changes three things: (1) the layer count is the maximum over all visible items, not the first item's (the donor reads the first only, so a later item with more layers loses its extra layers); (2) the per-frame array is reused instead of allocated each frame; (3) it has no camera swap, so there is nothing to restore; a real port must wrap any such swap in try/finally, which the donor does not. It also tests `visible` only, not an `alive` flag. The item-major function is the baseline for the test. The sketch does not say whether the renderer merges same-material draws, which is not in the donor.

```ts
// Licence: Apache-2.0 (donor LICENSE.md). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Layer {
  readonly material: number;   // id of the shader or texture this layer draws with
  visible: boolean;
  draw(): void;
}

export interface Item {
  visible: boolean;
  layers: (Layer | undefined)[];   // index = draw order inside one item; undefined = slot not in use
}

export interface RenderStats { drawn: number; materialSwitches: number; }

const scratch: Item[] = [];        // reused each frame; the donor allocates a fresh array on every draw

// Layer-major: every item's layer 0, then every item's layer 1, and so on.
// Draws that share a material end up next to each other.
export function drawLayerMajor(items: readonly Item[]): RenderStats {
  const stats: RenderStats = { drawn: 0, materialSwitches: 0 };
  scratch.length = 0;
  for (const it of items) if (it.visible) scratch.push(it);
  if (scratch.length === 0) return stats;

  // fix: the donor takes the layer count from the first visible item only, so a later item with more layers loses its extra layers. Use the maximum.
  let layerCount = 0;
  for (const it of scratch) if (it.layers.length > layerCount) layerCount = it.layers.length;

  let lastMaterial = -1;
  for (let i = 0; i < layerCount; i++) {
    for (const it of scratch) {
      const l = it.layers[i];
      if (!l || !l.visible) continue;
      if (l.material !== lastMaterial) { stats.materialSwitches++; lastMaterial = l.material; }
      l.draw();
      stats.drawn++;
    }
  }
  return stats;
}

// Item-major baseline, for comparing material switches: all layers of item 0, then item 1, and so on.
export function drawItemMajor(items: readonly Item[]): RenderStats {
  const stats: RenderStats = { drawn: 0, materialSwitches: 0 };
  let lastMaterial = -1;
  for (const it of items) {
    if (!it.visible) continue;
    for (const l of it.layers) {
      if (!l || !l.visible) continue;
      if (l.material !== lastMaterial) { stats.materialSwitches++; lastMaterial = l.material; }
      l.draw();
      stats.drawn++;
    }
  }
  return stats;
}

export {};
```

The sketch was typechecked on the VPS (`tsc --noEmit --strict --target es2020`, exit 0). On the same VPS, compiled to JS and run with three items of two layers each, it gave 2 material switches layer-major and 6 item-major, with 6 draws each. A first item with one layer and a second with three gave 4 draws, so the maximum layer count works.

## 5. Lands in

- TARGET `src/fight/hud-batch.ts` (new, client only): the overlay pass for health bars, nameplates and threat rings. Parity-checklist row 14 (HUD). The row hint in the brief was 12, which is combat sound cues; row 14 is the one that covers overlays. Bodies and weapon layers stay out of this pass.
- today: no overlay pass in `src/` (not checked against the repo).
- Frame pacing fold-in (read, not built): the donor's frame cap is a player setting with defaults (60 fps, uncapped when unlocked, 30 when the window loses focus). A phone build should set the same kind of cap as data, not as a constant.
- Reuse tag: rewrite-from-idea (Apache 2.0, may be adapted; this sketch is clean-room)
- Brief rule served: 1 (one engine; the overlay pass is client draw code only); rules 7-9 n/a

## 6. Gaps and risks

- Layer-major changes the depth between entities. In this donor it does not matter, because capsules are stacked in a list. In a fight, a later enemy's body would be drawn over an earlier enemy's weapon or ring. Hence the adapt decision: overlays only.
- The layer count is read from the first visible capsule (SongItemGroup.hx 55-57). A capsule with more layers than the first loses its extra layers in the draw. The sketch fixes this with the maximum.
- The +2 for the trail (57) is a hardcoded number that duplicates the two `add` calls in `fadeAnim` (413, 428). Any third trail member breaks the draw with no error. Frankendom should derive the count from the item, not from a constant.
- The trail's z offsets (SongMenuItem.hx 412, 419) do nothing on this path. SongMenuItem never sorts its members by zIndex (no `sort` call in `ui/freeplay/`; the only sorts are `AlbumRoll` and `MusicBeatState.refresh`, which sort the state's members, not the capsule's). `FlxMacro.hx` 34 says zIndex "has no functional code tied to it". So the trail draws after the capsule art by array order. The intent in the code (behind the capsule) is not met. A port must choose one: sort, or append in the order wanted.
- The camera swap (35-39) is restored at the end (69) with no try/finally; if a member draw throws, the group's cameras stay as the default list for the rest of the frame.
- `member.alive` is checked (63), not `exists`. Flixel's own draw path was not read (not in the donor), so the difference is not confirmed.
- The per-frame `capsulesToRender` array (41) is allocated every draw. Small, but on a phone it is churn; the sketch reuses it.
- The class comment says the group "prevents memory leaks" (line 10). This file does not show a leak fix. Not verified.
- Draw-call effect is not measured here. The claim to test on a phone is the count of material switches per frame in a real fight, not this code's word.
