// Licence: CC-BY-SA 3.0 (donor). clean-room sketch of the shape of a stacked HUD panel column, written from the described mechanism, not a translation.
// clean-room
const LOG = -2; // fills the rows left over after the fixed panels (donor panels.cpp line 390)
const MAP = -1; // height from the map aspect, 0 when the option is off (donor panels.cpp lines 106-108, 393)
const MIN_WIDTH = 16; // donor panels.cpp line 379

interface Panel {
  id: string;
  height: number;                   // rows, or LOG, or MAP
  on: boolean;                      // player toggle
  render: () => boolean;            // predicate (donor default is always true)
  draw: (rows: number) => number;   // draws into rows, returns a height delta (<= 0; negative = rows given back)
}

function minWidth(w: number): number {
  return Math.max(w, MIN_WIDTH);
}

// Two passes, as in the donor: first total the fixed panels, then give the log the rest (never less than 3 rows).
// Then draw top to bottom. A panel that gives rows back adds them to the log, but only if the log is drawn after it.
function layoutColumn(
  panels: Panel[], screenRows: number, spacer: number, mapRows: number,
): { id: string; rows: number }[] {
  const live = panels.filter(p => p.on && p.render());
  let fixed = 0;
  for (const p of live) {
    if (p.height === LOG) continue;
    fixed += (p.height === MAP ? mapRows : p.height) + spacer;
  }
  let logRows = Math.max(screenRows - fixed, 3);

  const out: { id: string; rows: number }[] = [];
  let y = 0;
  for (const p of live) {
    let h = p.height === LOG ? logRows : Math.min(p.height === MAP ? mapRows : p.height, screenRows - y);
    h += spacer;
    if (h <= 0) continue;
    const delta = p.draw(h);
    h += delta;
    if (delta < 0) {
      logRows -= delta;
    }
    out.push({ id: p.id, rows: h });
    y += h;
  }
  return out;
}

export {};
