# ClassicUO (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/Game/UI/Gumps/HealthBarGump.cs` (with `ClassicUO.Client/Game/GameObjects/Mobile.cs`) | Licence: BSD-2-Clause (SPDX header on HealthBarGump.cs line 1; LICENSE.md; permissive, adaptable) | C# | symbol `HealthBarGumpCustom.Update` (class at 302; Update at 369-688), helper `BaseHealthBarGump.CalculatePercents` (152-169)

Checked: Opened HealthBarGump.cs at 152-171 (CalculatePercents), 369-470 (Update start, entity lookup, out-of-range branch), 596-689 (tone, width, mana and stamina bars, war border), 1784-1830 (the default HealthBarGump tone and width code), and Mobile.cs 125-128 (flag sources). Opened as candidates and not used: HealthLinesManager.cs and Tooltip.cs (class lists only). Confidence: high on the tone state machine and width maths (read in full, traced by hand). Medium on the priority inversion in section 6 (traced by hand, not run). Not read: UIManager's update call chain, BuildGump layout, Save/Restore of gump position. camera_scope: not applicable (HUD topic).

## 1. Mechanism

- One health bar per tracked mobile, updated every frame from `Update`. It looks up the entity by serial first (369-391 area).
- Out of range or destroyed (`entity == null || entity.IsDestroyed`, line 390): on the first frame it marks out-of-range, sets the text to hue 912, sends a close-status request unless this is the last attack target (`World.TargetManager.LastAttack`, 413-416), hides the bars, and greys the red HP line (452). The grey is set only when the line is not already grey, so the write happens once.
- In range, tone (the bar colour) is a three-state machine with flags `_poisoned`, `_yellowHits`, `_normalHits` (607-627). The checks are ordered:
  1. If `IsPoisoned` and not already `_poisoned`: colour LimeGreen, set `_poisoned`, clear `_normalHits`.
  2. Else if `IsYellowHits` and not already `_yellowHits`: colour Orange, set `_yellowHits`, clear `_normalHits`.
  3. Else if not `_normalHits`, and neither poison nor yellow is on, and at least one of the two flags was set: colour DodgerBlue, clear both flags, set `_normalHits`.
  The colour changes only on these edges. Nothing re-checks the colour on other frames.
- Width (632-636): `hits = CalculatePercents(HitsMax, Hits, 100)`; the bar's line width is written only when it differs from the last value.
- `CalculatePercents` (152-169): if max > 0, pct = current x 100 / max (integer). Clamp pct to 100 (158). If pct > 1, return `maxValue x pct / 100` (163-165). If pct is 0 or 1, return pct unchanged, so the bar draws 0 or 1 pixel.
- Mana and stamina bars (639-): drawn only for party members or the player; same helper with their own maxima.
- War border (662-687, self only): when `InWarMode` differs from `_oldWarMode`, the four border lines go red on war or black off war. The flag is flipped, not set from a copy of the new value.
- Default `HealthBarGump` (line 1272 class; tone at 1782-1816): the same three-branch machine. Party bars use hue 63 (poison), 353 (yellow) and 0 (normal) (1786, 1800, 1814); non-party bars use graphics LINE_POISONED, LINE_YELLOWHITS and LINE_BLUE. Width: `barW = inparty ? 96 : 109` (1826), then the same helper (1828).
- Flag sources: `IsYellowHits` is the YellowBar bit of `Flags` (Mobile.cs 125). `IsPoisoned` is a property that reads a different field on client version 7000 and up (Mobile.cs 126-128); its setter was not read.

## 2. Key functions

- `CalculatePercents`: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/Game/UI/Gumps/HealthBarGump.cs` 152-169. Percent to pixels, clamp at 100.
- `HealthBarGumpCustom.Update`: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/Game/UI/Gumps/HealthBarGump.cs` 369-688. Lookup, out-of-range branch, tone state machine (607-627), width (632-636), party mana and stamina (639-), war border (662-687).
- Default `HealthBarGump.Update` tone block: same file, 1782-1816; width 1826-1828.
- `Mobile.IsYellowHits`: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/Game/GameObjects/Mobile.cs` 125.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Percent of max, clamped to 100, scaled to a bar width | Custom bar width 100 px (HPB_BAR_WIDTH, line 311); default party bar 96 px, non-party 109 px (1826) |
| Tone priority, poison over yellow over normal | Colours: LimeGreen (324), Orange (323), DodgerBlue (320); default hues 63, 353, 0 (1786, 1800, 1814) |
| Write only on change (cached last width and colour) | None |
| Clamp at full | 100 (158) |
| Small-percent quirk | pct of 0 or 1 is returned as pixels (163-164) |

## 4. TypeScript sketch

simplified: the sketch replaces the donor's edge-triggered flags with a per-frame priority function, and it fixes the donor's small-percent quirk so 1% of a 96 px bar is 0 px, not 1 px. It also clamps negative current to 0, which the donor does not. It omits the entity lookup, the out-of-range grey state, the close-status request, the mana and stamina bars, the war border and the default gump's party hues. The demo at the end is a real run on the VPS: poison stays the tone while yellow is set, which is the intended priority.

```ts
// Licence: BSD-2-Clause (donor ClassicUO). Clean-room sketch of the described mechanism, not a line-by-line translation.
// Client-only HUD layer. It reads server state each frame and never changes it.

export type BarTone = "poison" | "yellow" | "normal";

// Priority, not last-edge: poison beats yellow beats normal, every frame.
export function barTone(s: { poisoned: boolean; yellowHits: boolean }): BarTone {
  if (s.poisoned) return "poison";
  if (s.yellowHits) return "yellow";
  return "normal";
}

// Percent bar width. Clamp the percent to 0..100, then scale to the bar width in px.
export function barPixels(max: number, current: number, widthPx: number): number {
  if (max <= 0) return 0;
  let pct = Math.floor((current * 100) / max);
  if (pct > 100) pct = 100;
  if (pct < 0) pct = 0;
  return Math.floor((widthPx * pct) / 100);
}

// Frame update: only touch the view when a value changed (donor caches the last value).
export class BarView {
  private width = -1;
  private tone: BarTone | "" = "";
  setWidth(px: number): boolean {
    if (px === this.width) return false;
    this.width = px;
    return true;
  }
  setTone(t: BarTone): boolean {
    if (t === this.tone) return false;
    this.tone = t;
    return true;
  }
}

// Demo: poisoned first, then a yellow-hits flag arrives while still poisoned, then yellow ends.
const view = new BarView();
const seq = [
  { poisoned: true, yellowHits: false },
  { poisoned: true, yellowHits: true },
  { poisoned: true, yellowHits: false },
];
for (const s of seq) {
  const changed = view.setTone(barTone(s));
  console.log(barTone(s), changed);
}
console.log(barPixels(200, 150, 100), barPixels(200, 1, 100), barPixels(0, 0, 100));
export {};
```

## 5. Lands in

- TARGET `src/fight/hud.ts` (new, client-only view function, proposed; the Frankendom tree was not checked in this pass). Parity-checklist row 14 (HUD). The HUD reads hits, poison and yellow-hits state from the engine each frame and never writes it.
- Reuse tag: adaptable (BSD-2-Clause, so code may be adapted; this sketch is clean-room)
- Brief rule served: rule 1 (one engine; the HUD is a client that reads state); the HUD is client-only per the owner rulings.

## 6. Gaps and risks

- Edge-triggered tone can show the wrong colour (traced by hand, not run). In the custom gump, if poison starts first and yellow-hits starts while poison is still on, the yellow edge sets the colour to Orange (614-618). Poison still runs, but the colour does not return to LimeGreen until a new poison edge happens, and it stays Orange until yellow ends. Branch 3 cannot reset it while poison is on (621). The default gump has the same structure (1796-1800, 1810). Frankendom must compute tone from state each frame, not from edges.
- The HUD sends a close-status request on out-of-range (413-416). Frankendom's HUD must not send commands; the server owns the target list. Drop this call on port.
- Percent quirk: at width 100 (custom gump) the 0-or-1 quirk makes no visible difference, because maxValue x pct / 100 equals pct. At 96 px (default party bar) 1% draws 1 px instead of 0 px. Frankendom should use the formula for all values.
- Colours are donor-chosen. Frankendom should take them from its HUD theme tokens, not hard-code them in the view function.
- Not read: the UIManager update chain that calls `Update` every frame, BuildGump layout, and the Save and Restore of gump position (AnchorableGump). The default gump's full Update body (1574-1906) was not read beyond the tone and width blocks.

Best transferable idea: Derive the bar tone every frame from the state flags with a fixed priority (poison, then yellow, then normal), and push a width change only when the computed width differs from the last one.
Decision (proposed): adapt — take the per-frame priority tone and the write-on-change rule for the HUD; reject the edge-triggered flags (they go stale, as traced above) and reject the close-status request on out-of-range (the HUD must not send commands).
Acceptance: A player who is poisoned and yellow-hit sees the poison colour until poison ends, and then the yellow colour until yellow ends (HUD test asserts tone = f(flags) for all four poison and yellow combinations), and the HUD sends no message when a target leaves range (test asserts zero outbound messages).
Reuse tag: adaptable (BSD-2-Clause; clean-room sketch)
Brief rule served: rule 1 (one engine; client-only view); rule 8 (target + row 14)
