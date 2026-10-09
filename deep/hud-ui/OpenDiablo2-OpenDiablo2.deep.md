# OpenDiablo2-OpenDiablo2 (hud-ui, cell 16)

Donor: /mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2game/d2player/hud.go | Licence: GPL-3 | Go | symbol HUD.renderStaminaBar / renderExperienceBar

## 1. Mechanism

- Two bars drawn each frame: stamina and experience. Each is a `CustomWidget` created in `loadCustomWidgets` (215-258), with its render function as the draw callback. Positions are set at load time.
- On the uncached path `CustomWidget.Render` calls the render function directly (`d2core/d2ui/custom_widget.go`, 44-52). It does not apply the widget's position, so the offset comes only from the `PushTranslation` inside each draw function.
- `renderStaminaBar` (508-523): pushes the translation (273, 572) and a modulate effect. Fill = `Stamina / MaxStamina`. Colour is light brown, switching to red when the fill is below 0.25. Draws a rectangle of width `int(fill * staminaBarWidth)` (102.0, line 32) and height `staminaBarHeight` (19.0). There is no clamp.
- `renderExperienceBar` (525-532): pushes (256, 561). Fill = `Experience / NextLevelExp`. Draws a white rectangle of width `int(fill * expBarWidth)` (120.0) and a literal height 2 (line 531).
- `HUD.Advance(elapsed)` (661-672): once per tick it refreshes the stamina and experience tooltip text. It does not draw bars.
- Tooltip text (`setStaminaTooltipText` 560-567, `setExperienceTooltipText` 569-~582, which rewrites `%u` to `%d` and casts to `uint`) formats the current and max values from localised strings. 
- Output: draw calls and tooltip text only. No game state is written. Inputs are read directly from the hero's stats.

## 2. Key functions

- `HUD.loadCustomWidgets`, `/mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2game/d2player/hud.go`, lines 215-258. Creates both bar widgets and sets their positions and tooltips.
- `HUD.renderStaminaBar`, same file, lines 508-523. Stamina fill, low-stamina colour switch, integer pixel width.
- `HUD.renderExperienceBar`, same file, lines 525-532. Experience fill as a white bar.
- `HUD.Advance`, same file, lines 661-672. Per-tick tooltip refresh.
- `HUD.setStaminaTooltipText`, same file, lines 560-567. Current and max stamina into the localised string.
- `HUD.setExperienceTooltipText`, same file, lines 569-~582 (end not opened). Same for experience, `%u` rewritten to `%d`.
- Constants, same file: bar sizes and low threshold at 30-35, offsets at 50-55, colours at 68-70.
- `CustomWidget.Render`, `/mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2core/d2ui/custom_widget.go`, lines 44-52. Draw dispatch; the uncached path has no position translation.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants (theirs) |
|---|---|
| Fill = current / max, drawn as an integer pixel width | Stamina bar 102 by 19 px (theirs); experience bar 120 px wide (theirs) |
| Colour switch below a low threshold | Threshold 0.25 (`percentStaminaBarLow`, line 35); `lightBrownAlpha72` 0xaf8848c8 and `redAlpha72` 0xff0000c8 (lines 68-69; the alpha byte is 0xc8 despite the name) (theirs) |
| Bar placed by a fixed offset, drawn inside a translation | Stamina offset (273, 572) (lines 50-51); experience offset (256, 561) (lines 54-55) (theirs) |
| Tooltip refresh once per tick, separate from the draw | Localised string keys `panelstamina`, `panelexp` (theirs) |

## 4. TypeScript sketch

Clean-room sketch: written from the mechanism above, no lines translated.

simplified: no translation/modulate push-pop or surface object (the caller passes the origin and a fillRect); the donor's experience bar uses a fixed height 2 and no low colour; the tooltip helper replaces `%d` only (the donor rewrites `%u` for experience and uses fmt.Sprintf).

```ts
// Licence: GPL-3 - clean-room sketch, no lines translated
// Clean-room: a resource bar as a fill fraction in whole pixels, with a colour switch below a threshold.
type Bar = { current: number; max: number };
type Fill = { widthPx: number; low: boolean };

// Integer pixel width of the fill; the colour turns to the warning colour below lowAt.
function barFill(bar: Bar, barWidthPx: number, lowAt: number): Fill {
  const fraction = bar.current / bar.max;
  return {
    widthPx: Math.trunc(fraction * barWidthPx),
    low: fraction < lowAt,
  };
}

// Draw one frame: positioned at a fixed offset, drawn every frame.
function drawBar(
  bar: Bar,
  origin: { x: number; y: number },
  barWidthPx: number,
  barHeightPx: number,
  lowAt: number,
  normalColour: string,
  lowColour: string,
  fillRect: (x: number, y: number, w: number, h: number, colour: string) => void,
): void {
  const fill = barFill(bar, barWidthPx, lowAt);
  const colour = fill.low ? lowColour : normalColour;
  fillRect(origin.x, origin.y, fill.widthPx, barHeightPx, colour);
}

// Tooltip text is refreshed once per tick, not per frame.
function tooltipText(template: string, current: number, max: number): string {
  return template.replace('%d', String(Math.trunc(current))).replace('%d', String(Math.trunc(max)));
}
```

## 5. Lands in

- Frankendom file(s): TARGET `src/fight/hud.ts` (stamina bar fill and tooltip), today: `src/hud.ts` (moving).
- Parity-checklist row: 14 (HUD). Stamina value itself is row 3 (guard/parry/stamina, `src/fight/`); the bar only displays it. Experience display relates to row 18 (loot roll and XP award) the same way.
- Reuse tag: rewrite-from-idea. The fill and colour switch are a few lines; the donor code is GPL-3.
- Brief rule served: (category default, not per-cell) 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- Max of zero is not guarded: `Stamina / float64(MaxStamina)` gives NaN or infinity, and Go's `int()` of that is implementation-defined for the bar width.
- No clamp on the fill fraction. Stamina above max, or a negative value, draws outside the bar.
- Height mismatch: `expBarHeight` is declared as 4, but the draw uses a literal 2. The declared size and the drawn size disagree.
- The HUD reads the hero's stats object directly (`h.hero.Stats`, lines 515, 529). In Frankendom the values come from the one engine in `src/fight/`.
- Low-stamina warning is colour only: no pulse, no sound, no text.
- Licence GPL-3: clean-room only.
- Client only. Frankendom rulings: server-verified kills and one ledger, so stamina and XP shown here are read from fight state and the ledger, never owned by the HUD.
