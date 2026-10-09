# OpenRCT2-OpenRCT2 (hud-ui, cell 16)

Donor: /mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2-ui/windows/Finances.cpp | Licence: GPL-3.0 (Finances.cpp header: licensed under GPL version 3) | C++ | symbol Finances window widget tables (makeFinancesWidgets)

## 1. Mechanism

- Runs as a UI window (`FinancesWindow`) with six pages: summary, cash graph, park-value graph, weekly-profit graph, marketing, research. Each page is a widget table built from one shared shell (`makeFinancesWidgets`: frame, resize grip, six tab buttons) plus page-specific widgets.
- Input: the park's finance records (`_parkData` is read at line 226; the graph series at 800-808; the expenditure table and date handling are not read). The graph pages only read. The summary page is not read-only: the loan increase and decrease buttons (`onMouseDownSummary`, 533-568) build a `ParkSetLoanAction` and hand it to `GameActions::Execute` (546-547, 562-563), so the window requests the change and the action layer applies it. The research and marketing pages call into other handlers (`onMouseUpMarketing`, `WindowResearchFundingMouseUp`, not read), so whether they write to the simulation is not verified.
- `setPage(p)` swaps the widget table, resizes the window (fixed size for summary, research and marketing, with the default branch giving the marketing size; resizable for the three graph pages), presses the matching tab exclusively, resets `currentFrame` to 0, and redraws. It is a no-op if the page is already active and the widgets are already set.
- `onUpdate` runs every UI tick: it advances `currentFrame` and invalidates the active tab widget (the tab animation), and, on the three graph pages only, calls `UpdateHoverIndex` (not read) and invalidates the background if it changed.
- Graph scale: the Y maximum is the largest absolute defined series value, rounded up to its leading digit (681 becomes 700), with a floor of `10.00_GBP` (money units). The rounding is `((max + oom - 1) / oom) * oom`, so an exact 700 stays 700 (the donor comment says "increments"). Centred graphs use `-max` as the minimum; others start at 0. The left padding is the larger of the widest axis label (of `-max` or `max`) plus tick padding, and `kGraphTopLeftPadding.x`.
- Output: window state and draw calls (labels, table cells, graph lines, tab images); the graph pages change no game state; the summary page's loan buttons submit a game action (see Input).

## 2. Key functions

- `makeFinancesWidgets` (lambda), `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2-ui/windows/Finances.cpp`, lines 106-117. Shared shell: window shim, resize widget, six tabs.
- `FinancesWindow::setPage`, same file, lines 473-529. Swaps widgets, resizes per page, presses the tab.
- `FinancesWindow::onUpdate`, same file, lines 241-254 (unchanged). Frame counter and graph hover refresh.
- `FinancesWindow::onPrepareDrawGraph`, same file, lines 796-831. Computes the nice Y maximum and the dynamic padding.
- `FinancesWindow::onMouseUp`, same file, lines 269-295. Tab switch and per-page click routing.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Shared widget shell, one table per page, swapped on tab press | Six tabs, x offsets 3, 34, 65, 96, 127, 158 at y 17 (lines 110-115) (theirs) |
| Round the axis maximum up to the leading digit, floor it at a minimum | 10.00 floor (line 814) (theirs); leading digit rule is generic |
| Centred graph uses `-max` as the low end | Currency and label formats (theirs) |
| Hover index refreshed each UI tick, redraw only when it changes | Floor `10.00_GBP` (line 814), graph padding constants `kGraphTopLeftPadding` (theirs, not opened) |

## 4. TypeScript sketch

simplified: values are plain numbers with null for undefined (the donor uses `kMoney64Undefined` and fixed-point money, with integer division where the sketch uses floor and ceil); `hoverIndex` is an invented helper, since the donor's `UpdateHoverIndex` was not read; label-width padding, the graph layout recalculation and the window/tab logic are omitted; the loan actions are not modelled.

```ts
// Licence: GPL-3.0 (donor) - clean-room sketch, no lines translated
// Clean-room: a graph axis maximum rounded up to its leading digit, with a floor and an optional centred range.
// Nice maximum for a graph axis: round the largest absolute value up to its leading digit.
function niceAxisMax(values: (number | null)[], floor: number): number {
  let maxVal = 0;
  for (const v of values) {
    if (v === null) continue;
    const a = Math.abs(v);
    if (a > maxVal) maxVal = a;
  }
  // leading-digit step: 681 -> 100 step -> 700
  let step = 10;
  while (Math.floor(maxVal / step) >= 10) step *= 10;
  const rounded = Math.ceil(maxVal / step) * step;
  return Math.max(floor, rounded);
}

// Axis range for a graph: centred graphs run from -max to +max, others from 0 to max.
function axisRange(values: (number | null)[], floor: number, centred: boolean) {
  const max = niceAxisMax(values, floor);
  return { min: centred ? -max : 0, max };
}

// Hovered point: the index nearest the pointer, or -1 when outside the plot.
function hoverIndex(pointerX: number, plotLeft: number, plotWidth: number, points: number): number {
  if (pointerX < plotLeft || pointerX > plotLeft + plotWidth) return -1;
  const i = Math.floor(((pointerX - plotLeft) / plotWidth) * points);
  return Math.min(points - 1, Math.max(0, i));
}
```

## 5. Lands in

- Frankendom target: `src/fight/hud.ts` is not the home of a finance window; the reusable part is the axis helper, used by any HUD chart (for example a fight-record readout), parity checklist row 14 (HUD). Today: `src/hud.ts` (moving).
- A tabbed finance or ledger window itself would be a Pit-client page (row 22, Pit-only) reading the one ledger.
- Reuse tag: rewrite-from-idea (GPL-3.0, clean-room sketch only).
- Brief rule served: (category default, not per-cell) 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- The window reads finance records straight from the park data, and the loan buttons submit a game action (`ParkSetLoanAction`, 546 and 562) rather than editing state. In Frankendom, economy numbers must come from the server ledger, not a client copy, and any write from a Pit-client ledger view must go through a server-verified request in the same way.
- The axis helper is pure and reusable. Missing points are skipped (line 803) and an empty or all-zero series gives the floor value (10), so the empty state looks like a small graph.
- Hover and tab animation run on UI ticks. The HUD must not drive any fight or ledger change.
- `onPrepareDrawGraph` walks the whole series on every prepare-draw (lines 801-808); the summary page tracks `_lastPaintedMonth` (lines 236, 470), the rest of that cache is not read. A multi-zone view would need a summary.
- Nothing here conflicts with the one-engine, zones-as-data or server-verified-kill rulings, because the donor's graph pages are read-only and its loan buttons only submit an action that the simulation applies (the shape Frankendom wants: client requests, server validates). The sketch models none of that.
