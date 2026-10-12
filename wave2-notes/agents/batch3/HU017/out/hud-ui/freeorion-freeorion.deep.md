# freeorion-freeorion (hud-ui, cell 3)

Donor: `/mnt/frankendom-donors/freeorion-freeorion/UI/MultiMeterStatusBar.cpp` | Licence: GPL v2 (`README.md` 148-151: "The FreeOrion *source code* is licensed under the terms of [GPL v2]"; `default/COPYING` is referenced there; the `UI/` file headers carry no licence text, so the README statement is the licence read) | C++ (GiGi GUI) | symbol `MultiMeterStatusBar::Render` (with `Update`)

Checked: The hint file `GG/GG/GUI.h` is the GiGi GUI base header (read: lines 1-14); it is LGPL 2.1 or later and holds the GUI class, not a HUD, so it was not the mechanism. The mechanism is `UI/MultiMeterStatusBar.cpp` and `.h` (both read in full; the file is 226 lines), used by `UI/ResourcePanel.cpp` (55-79, 96, 146), `UI/MilitaryPanel.cpp` (104) and `UI/PopulationPanel.cpp` (131). The meter pairs are read for the resource panel only (the first five pairs are listed at 55-56); the `assoc_meter` mapping (ResourcePanel.cpp 58-78) was not read. `Meter::Initial()` and `Meter::Current()` (universe/Meter.h) were not read; their meaning is taken from the donor's own comments in `UI/MultiMeterStatusBar.h` 27-29. `UI/MeterBrowseWnd` and `UI/SidePanel` were not read. Confidence: high on the render order, the scale rule and the colour-vector defect (checked by grep: `m_bar_colours` is pushed at 219 and never cleared); not run. The string table `default/stringtables/en.txt` was counted and its grammar described (section 6). Not a camera cell.

Best transferable idea: Show a meter as three layers, a solid fill to the value at the start of the exchange, a coloured strip for the change since then, and an outline to the maximum, so a fight can show the last exchange's loss without a number.
Decision (proposed): adapt - keep the three layers and the scale that rounds up to a whole step; fix the donor's unclamped edges, its fixed step of 100 (make the step data) and its growing colour list; and show only server-computed values in the strip.
Acceptance: A health frame at 375 wide shows a bar with an outline to max HP; after a hit, a red strip spans from the HP at the start of the exchange to the server's HP and is cleared at the next exchange start; tick lines sit at one fifth of the step.

## 1. Mechanism

- Input: a list of meter pairs. For each pair the first meter is the "actual" value and the second is the "target or max" value (MultiMeterStatusBar.h 25-26). `Update` reads, for each pair: the first meter's `Initial()` (start-of-turn value), its `Current()` (projected value for the next start), and the second meter's `Current()` (target or max) (MultiMeterStatusBar.cpp 205-219). Missing meters become INVALID and are not drawn. The three vectors are cleared at the start of each update (193-195). The bar height is computed from the number of pairs (224), and the window is resized to it.
- Scale: `largest_value` starts at 0.1 (110) and is raised to the largest of the three values across all pairs (111-118). The range is `ceil(largest / 100) * 100` (120-123), so the scale always moves in whole steps of 100.
- Ticks: five segments per step, so there are `5 x increments` segments and `segments - 1` tick lines drawn at equal spacing (127-132). With a step of 100, one line every 20 units.
- Per pair, from top to bottom (145-186), in this order: (a) the snapshot fill from the left edge to the position of `Initial()` on the scale, filled with the meter's colour and a shading texture, with a black border (149-162); (b) the delta strip between that position and the position of `Current()`: a gain colour when projected is further right (168-169), a loss colour when it is further left (170-171), nothing when they are equal; (c) the max outline from the left edge to the target's position, drawn as a border only, in the meter colour (176-181).
- Colour: `MeterColor` returns a fixed colour per meter type (19-66); for example industry is orange (23).

Order of operations for one bar: compute the range from the largest of the three values, round to whole steps, place each of the three edges on the bar, draw the fill, then the delta strip, then the outline. The ticks are built and drawn before the bars (125-139), so the bars cover them.

Numbers: bar height 10 px and 1 px gaps (70, 69); scale step 100 (71); scale floor 0.1 (110); five ticks per step (127); edges are linear in value (154, 164, 175).

## 2. Key functions

- `MultiMeterStatusBar::Render`: `/mnt/frankendom-donors/freeorion-freeorion/UI/MultiMeterStatusBar.cpp` 85-187. Scale, ticks, the three layers per pair.
- `MultiMeterStatusBar::Update`: `/mnt/frankendom-donors/freeorion-freeorion/UI/MultiMeterStatusBar.cpp` 192-226. Reads the three values per pair, resizes the window.
- `MeterColor`: `/mnt/frankendom-donors/freeorion-freeorion/UI/MultiMeterStatusBar.cpp` 19-66. Fixed colour per meter type.
- Callers read: `ResourcePanel::Update` (132; the call is at 146), `MilitaryPanel::Update` (96; call at 104), `PopulationPanel::Update` (116; call at 131). Each panel's update calls the bar's `Update(objects)`. How often the panels update was not checked.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Three-layer bar: snapshot fill, delta strip, max outline | Colours per meter type (19-66) |
| Scale = largest value rounded up to whole steps, floor at a small positive | Step 100 (71); floor 0.1 (110) |
| Ticks at one fifth of the step | Five per step (127) |
| Bar height from count of bars | Bar height 10 px (70), gap 1 px (69) |

## 4. TypeScript sketch

simplified: follows the donor order: the scale from the largest of the three values rounded up to whole steps, then the snapshot fill edge, the delta strip (gain or loss), the max outline, and the tick positions. It returns geometry only; it omits the drawing, the shading texture, the black borders, the bar height and the window resize, the MeterType colour table (the caller passes the colour), the right-click zoom, and the scroll forward. It changes three things on purpose, each fixing a donor defect: it clamps every edge to the bar (the donor computes edges without a clamp; whether a meter can go below zero was not checked); it takes the step as an argument (the donor fixes 100); and it keeps no colour list across updates (the donor's colour vector grows on every update, see section 6).

```ts
// Licence: GPL v2 (donor, FreeOrion source). Clean-room sketch written from the described mechanism, not a translation.
interface Pair {
  snapshot: number;       // value at the start of the exchange (donor: Initial, start of turn)
  live: number;           // current projected value (donor: Current)
  max: number | null;     // outline value (donor: the target or max meter), null = not shown
}

type Colour = 'gain' | 'loss';

// Scale: the largest value rounded up to a whole number of steps. At least one visible segment.
function scaleRange(pairs: Pair[], step: number): number {
  let largest = 0.1;
  for (const p of pairs) {
    largest = Math.max(largest, p.snapshot, p.live, p.max ?? 0);
  }
  return Math.ceil(largest / step) * step;
}

// Edges as fractions of the bar length. Clamped to the bar (the donor does not clamp).
function layers(p: Pair, range: number, barLen: number) {
  const x = (v: number): number => Math.min(barLen, Math.max(0, (v / range) * barLen));
  const snapX = x(p.snapshot);
  const liveX = x(p.live);
  const fill = { to: snapX };
  let delta: { from: number; to: number; colour: Colour } | null = null;
  if (liveX > snapX) delta = { from: snapX, to: liveX, colour: 'gain' };
  else if (liveX < snapX) delta = { from: liveX, to: snapX, colour: 'loss' };
  const outline = p.max === null ? null : { to: x(p.max) };
  return { fill, delta, outline };
}

// Tick lines: 5 per step, so one line every step/5 units (20 when the step is 100).
function ticks(range: number, step: number, barLen: number): number[] {
  const n = Math.round(range / step) * 5;
  const out: number[] = [];
  for (let i = 1; i <= n - 1; i++) out.push((i * barLen) / n);
  return out;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/HU017-freeorion-meter-bar.ts`).

## 5. Lands in

- TARGET `src/fight/hud-meter.ts` (new client module: the fight HUD's health and target-bar geometry; reads server values only). Parity-checklist row 14 (HUD). The mechanism is client-only; the engine never reads it.
- today: the Pit health frame was not read (not checked against the repo).
- Reuse tag: adapt-from-idea (GPL v2: clean-room, shape only)
- Brief rule served: 1 (one engine: the strip shows server-computed HP only); 5 (no client-side prediction of damage)

## 6. Gaps and risks

- GPL v2: clean-room only. The sketch was written from the mechanism.
- Projected values must be server values. The donor's "projected" comes from the engine's own projection at turn end. In a fight, the strip must show the HP the server sent for the last exchange, never a client guess of the next one.
- Defect, unclamped edges: `INITIAL_RIGHT` and `PROJECTED_RIGHT` are computed from the raw values (154, 164) with no clamp, and the draw calls take those edges directly. A value above the range or below zero draws outside the bar. Fix: clamp (sketch `layers`).
- Defect, fixed step: the step is the constant 100 (71), so a bar for a small HP pool is squeezed into a fraction of its width. Fix: the step is a data field per creature or zone.
- Defect, colour vector never cleared: `Update` clears three vectors (193-195) but not `m_bar_colours`, and pushes one colour per pair on every update (219). It grows for as long as the panel updates. The render reads the first entries (158, 181), so the picture stays right, but memory grows. Fix: derive the colour from the meter type on each draw (sketch takes colour as an argument).
- Readability at 375 wide: each bar is 10 px high with 1 px gaps (69-70). Not measured on a device. Frankendom should cap the number of bars in the fight frame and move the rest into text.
- Delta strip is drawn only when the two edges differ; equal values draw nothing, so "no change" and "no data" look the same. Frankendom: show "no change" as an explicit empty strip, and "no data" as a dashed outline.
- String table (`default/stringtables/en.txt`, counted with grep, no quotes): 23038 lines, about 16916 non-blank, 1451 comment lines. About 5187 lines look like keys (all-caps identifiers); 5168 distinct, and 18 names appear twice (the loader's rule for duplicates was not read). Of the key-like lines, 1273 end in `_DESC`, 114 start with `ENC_` (prefix not expanded), 150 with `SITREP_` and 113 with `METER_`. Each entry is a key line, then one or more value lines, then a blank line. Values use numbered placeholders (`%1%` and up; 808 lines carry `%1%`, 523 carry `%2%`), angle-bracket rich-text tags (about 103 lines) and double-bracket link tags (about 1614 lines). List text is built from `FORMAT_LIST_<n>_ITEMS` patterns (n = 0 to about 6) with `and` before the last item and comma separators, plus header keys for "there is one", "there are none" and "there are" (lines 301-330). Frankendom: copy the list-pattern idea and the `_DESC` pairing; do not copy the duplicate keys.

Reuse tag: adapt-from-idea (GPL v2, clean-room)
Brief rule served: 1 (one engine: the strip is server-computed); 5 (no client-side damage prediction); section 6 string-table notes are not new mechanisms
