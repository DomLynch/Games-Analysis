# MovingBlocks-Terasology (hud-ui, cell 3)

Donor: `/mnt/frankendom-donors/MovingBlocks-Terasology/engine/src/main/java/org/terasology/engine/rendering/nui/layers/hud/HUDScreenLayer.java` | Licence: Apache License 2.0 (LICENSE; each read file has `SPDX-License-Identifier: Apache-2.0`); artwork under CC BY 4.0 (LICENSE_ARTWORK, not used here) | Java | symbol `HUDScreenLayer` (with `UICrosshair`, `CoreHudWidget`, `toolbar.ui`)

Checked: The hint file `StateIngame.java` is the wrong place for the HUD; it only binds HUD visibility (lines 97-101, read). Read in full: `HUDScreenLayer.java` (202 lines), `UICrosshair.java` (48), `CoreHudWidget.java` (58), `HudToolbar.java` (9), `toolbar.ui` (44), `HideHUDButton.java` (14). Read in part: `DebugControlSystem.java` 48-60 (H toggle), `MenuControlSystem.java` 44-50 (element order). String table read as data: 28 `.lang` files, `menu_en.lang` and `menu.lang` counted exactly, plus `TranslationSystemImpl.java` 76-101, `StandardTranslationProject.java` 34-50, `Translation.java` 91-118, `TranslationFormat.java` 46-121 (the regex line, read). Not read: the body of `TemplateEngineImpl.java` (only its class comment and pattern field). Grep results: the `ChargeAmount` hits are all inside `UICrosshair.java`, so nothing in this donor sets the charge. `minimap`/`worldmap`: 0 files. `TouchEvent`/touch UI: none found. The `modules/` directory is empty in this donor (only gradle files), so gameplay HUD (health bar, target frame, lock-on) is absent. Confidence: high on the layer, the crosshair and the translation chain; the charge source is not in this donor.

Best transferable idea: Place every HUD element as a 0..1 box of the canvas, draw them in insertion order, and show a charge meter by flooring the clamped charge across the stage count.
Decision (proposed): adapt — keep the normalised-box placement and the charge-stage rule for the fight HUD so one layout works at 375 wide without per-size data; the donor's replace-without-close defect is fixed in the sketch.
Acceptance: At 375x812 and 1280x720 the same HUD data gives pixel rects that scale with the canvas; a test with 4 charge stages at charge 0.5 draws stage 1 (floor(0.5 x 3)), and charge 0 draws nothing.

## 1. Mechanism

- The HUD is one layer, `HUDScreenLayer`, that holds named widgets. Each element stores a region of four fractions of the canvas (`HUDElement.region`, 193-200). Each frame, `onDraw` multiplies each fraction by the canvas size, floors it to whole pixels, and draws the widget in that rectangle (143-149). The layout therefore scales with any canvas size, with no per-resolution data.
- Draw order is insertion order: the map is a `LinkedHashMap` (28), so a later element draws on top. `MenuControlSystem` adds the drop region first and the toolbar second, with a comment that the drop region must stay behind the toolbar (48-49).
- Add: `addHUDElement(urn, widget, region)` injects dependencies, calls `onOpened`, then stores the element (56-60). `CoreHudWidget.onOpened` runs `initialise()` once (30-36). Remove calls `onClosed` (87-94), and clear closes all (109-114).
- Defect (as read): adding under an existing urn overwrites the entry with `put` (59) and never calls `onClosed` on the replaced widget. Lines 56-60 show no check for the old value.
- Focus rules: the layer does not release the mouse (122-124), is not modal (189-191), does not let Escape close it (127-129), and does not show the layer below (117-119). HUD elements therefore never take input from play.
- Visibility: `StateIngame` binds the whole layer to "not hudHidden" (97-101). The H key (`HideHUDButton`, binding at line 12) toggles two debug flags together. `DebugControlSystem` computes `hide = !(hudHidden && firstPersonElementsHidden)` and sets both flags to `hide` (51-58). The result: if both flags are set, the toggle shows both; in any other state it hides both.
- Charge crosshair (`UICrosshair`): a widget with a list of stage textures. `onDraw` draws nothing when charge is 0 or the list is empty (26-29). Otherwise the stage is `floor(charge x (stages - 1))`, where charge is `min(1, chargeAmount)` (27, 42). The stage list is in the widget's layout data.
- Layout (`toolbar.ui`): a relative layout. The breath bar (icons, `maxIcons` 10, `spacing` 2, lines 8-14) has its left edge at horizontal centre, its right edge anchored to `healthBar` (18-24), and its bottom anchored to the top of `healthBar` with offset 1 (25-29). The crosshair is centred both ways (34-40). `healthBar` is referenced twice (23, 27) but defined nowhere in this donor (grep of `src/main` finds only these references).
- String table (data half): 28 files in `assets/i18n`: `menu.lang` (base, no language tag), `menu_<tag>.lang` for 25 languages, and `game.lang` / `game_en.lang`. Counts: `menu_en.lang` 468 entries, `menu.lang` 451, `game_en.lang` 2, `game.lang` 2. Grammar: each file is one flat JSON object of string-to-string pairs; a value may be a JSON array, which is joined into one string (`TranslationFormat` 56). Menu keys are flat kebab-case names. Game content keys are module-scoped and use `#` as a path separator (the sample file shows the `module:type#id#field` shape). Values use printf-style placeholders and escaped line breaks. The format has no plural, gender or case forms: it is a flat map (`Translation.lookup` is one map get, 91-93).
- Lookup from code: a reference of the form `${module:project#key}` in any text is replaced through the template engine (`TranslationSystemImpl` 80-101). A missing key renders as a marker of the form `?key?` (91-96), so gaps show in the UI instead of failing silently.
- Fallback chain (`StandardTranslationProject` 34-50): exact locale, then without variant, then without country, then English. The root file (no tag) is never tried for a requested locale other than root. One key exists only in `menu.lang` (not in `menu_en.lang`); grep finds no use of it in the engine source. It has no visible effect in this donor.

## 2. Key functions

- `HUDScreenLayer.addHUDElement(urn, widget, region)`: `/mnt/frankendom-donors/MovingBlocks-Terasology/engine/src/main/java/org/terasology/engine/rendering/nui/layers/hud/HUDScreenLayer.java` 56-60 (inject, open, store; the defect is at 59).
- `HUDScreenLayer.onDraw`: same file, 142-151 (region to pixels at 144-147, draw at 149, no culling).
- `UICrosshair.onDraw`: `/mnt/frankendom-donors/MovingBlocks-Terasology/engine/src/main/java/org/terasology/engine/rendering/nui/layers/hud/UICrosshair.java` 25-30 (gate at 26, stage index at 27); `getChargeAmount` 41-43 (clamp at 42).
- `DebugControlSystem.onHideHUD`: `/mnt/frankendom-donors/MovingBlocks-Terasology/engine/src/main/java/org/terasology/engine/logic/players/DebugControlSystem.java` 50-60 (two flags set together, 57-58).
- `TranslationSystemImpl.translate` and the missing-key marker: `/mnt/frankendom-donors/MovingBlocks-Terasology/engine/src/main/java/org/terasology/engine/i18n/TranslationSystemImpl.java` 76-101 (marker at 92).
- `StandardTranslationProject.translate`: `/mnt/frankendom-donors/MovingBlocks-Terasology/engine/src/main/java/org/terasology/engine/i18n/StandardTranslationProject.java` 34-51 (fallback at 36-48).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Element placed as a 0..1 box of the canvas, floored to pixels per frame | Region fractions, per element (asset data, not in the engine). Unit: ratio. |
| Charge stage = floor(clamped charge x (stages - 1)); nothing drawn at 0 | Clamp 1.0 (engine constant, 42). Stage count = list length (asset data). |
| Draw order = insertion order | None (rule). |
| Two-flag hide toggle | Two debug flags, set together (engine rule, 51-58). |
| Breath bar icon cap | 10 icons, spacing 2 (asset data, `toolbar.ui` 13-14). |
| Localisation fallback order | Exact, variant, country, English (engine rule, 34-48). Missing-key marker "?key?" (engine constant, 92). |

## 4. TypeScript sketch

simplified: the sketch keeps the 0..1 box placement, the insertion-order draw, the visibility flag and the charge-stage rule. It fixes the replace-without-close defect by calling `onClosed` on the old widget. It omits the relative-layout anchors (toolbar.ui), the dependency injection, the `onOpened` once-only flag, the mouse/Escape/modal flags, the H-key two-flag toggle, the charge source (not in this donor), the translation chain, and the template engine.

```ts
// Normalised-region HUD registry. Each element stores a 0..1 rectangle of the canvas.
interface Rect01 { x0: number; y0: number; x1: number; y1: number; }
interface PixelRect { x: number; y: number; w: number; h: number; }
interface HudWidget { onOpened(): void; onClosed(): void; draw(r: PixelRect): void; }

export class HudLayer {
  // Map keeps insertion order, which is the draw order (later = on top).
  private elements = new Map<string, { widget: HudWidget; region: Rect01 }>();
  visible = true;

  add(id: string, widget: HudWidget, region: Rect01): void {
    const old = this.elements.get(id);
    if (old) old.widget.onClosed();   // fix: the donor overwrites without closing the replaced widget
    widget.onOpened();
    // Setting an existing key keeps its original draw position, as the donor's LinkedHashMap does.
    this.elements.set(id, { widget, region });
  }

  remove(id: string): boolean {
    const e = this.elements.get(id);
    if (!e) return false;
    e.widget.onClosed();
    this.elements.delete(id);
    return true;
  }

  // Region x canvas size, floored, then drawn in insertion order with no culling.
  draw(canvasW: number, canvasH: number): void {
    if (!this.visible) return;
    for (const { widget, region } of this.elements.values()) {
      const x = Math.floor(region.x0 * canvasW);
      const y = Math.floor(region.y0 * canvasH);
      const w = Math.floor((region.x1 - region.x0) * canvasW);
      const h = Math.floor((region.y1 - region.y0) * canvasH);
      widget.draw({ x, y, w, h });
    }
  }
}

// Charge crosshair: stage = floor(min(1, charge) * (stages - 1)); nothing is drawn at zero charge.
export function chargeStage(charge: number, stageCount: number): number | null {
  const c = Math.min(1, charge);
  if (!(c > 0) || stageCount === 0) return null;
  return Math.floor(c * (stageCount - 1));
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/hu004-terasology-hud-registry.ts`: passed (exit 0).

## 5. Lands in

- TARGET `src/fight/hud-layout.ts` (new): the client HUD's element registry, 0..1 placement, and the charge-stage helper for a charged-attack meter. Rendering stays client-only (HUD ruling); the charge value itself must come from the engine (see section 6). Parity-checklist row 14 (HUD).
- today: (not read in this pass; the Frankendom HUD code was not opened).
- Reuse tag: adapt (Apache-2.0: code may be adapted; the sketch is written from the mechanism and the defect is fixed in it)
- Brief rule served: 1 (one engine; HUD rendering in the client, layout data as data); rules 7-9 n/a.

## 6. Gaps and risks

- The donor has no health frame, target frame, minimap, world map, touch layer or lock-on system. The gameplay modules are absent (`modules/` holds only gradle files), and the `healthBar` widget is referenced but not defined. Parity row 14's frame and minimap questions stay open after this read.
- Defect (as read, `HUDScreenLayer.java` 59): replacing an element under the same id does not close the old widget. The sketch fixes it; Frankendom needs a test that re-adding closes the previous widget.
- Visibility is one layer flag plus a two-flag debug toggle. A fight HUD needs one visibility rule with one flag; the donor's coupling of two flags is a trap if a second flag is added later.
- The charge crosshair draws a stage but does not decide the charge. Under the server-verified ruling, any charge that changes damage must be computed in the engine, with the HUD only reading it. The donor has no such rule because it has no source for the charge in this tree.
- Localisation is a flat map with no plural forms. A fight HUD that prints counts ("2 hits") needs a plural rule the donor does not supply. Frankendom's own string handling was not checked in this pass.
- The `?key?` marker is visible in-game. Frankendom should decide whether a missing key fails a build or only shows in QA.
- Accessibility: no HUD accessibility mode was found by name. A grep for accessibility, colour-blind or font-size terms matched 24 files; the first five were not HUD code, and the matches were not read.
- Lock-on: a loose grep matched 11 files; none is in the HUD layer, and none was read. No lock-on or target-frame mechanism was found.
