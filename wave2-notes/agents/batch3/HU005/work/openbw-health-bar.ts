// Licence: unclear (OpenBW tree has no licence file; no licence header read). Clean-room sketch from the described mechanism.
// clean-room
type Energy =
  | { kind: "mana"; cur: number; max: number }            // energy the unit spends; donor divides cur*100/max
  | { kind: "timed"; left: number; total: number };       // remaining life (hallucination, broodling)

interface BarInput {
  healthBarSizePx: number;   // sprite data: health_bar_size (sprites.dat)
  hp: number;                // current hp (donor rounds up before the percent)
  maxHp: number;             // max visible hp (donor: unit type hitpoints, minimum 1)
  shield?: { cur: number; max: number };
  energy?: Energy;
  invincible: boolean;
  selected: boolean;
}

type Band = "high" | "mid" | "low";

interface BarModel {
  widthPx: number;
  height: number;            // rows: 5, +2 with shield, +6 with energy
  hpPx: number;
  band: Band;
  shieldPx: number;
  energyPx: number;
}

const MIN_WIDTH = 19;
const SNAP = 3;
const MIN_FILL = 3;

// Largest 3k+1 not above the sprite size, at least 19 px.
function barWidth(sizePx: number): number {
  const w = sizePx - ((sizePx - 1) % 3);
  return Math.max(w, MIN_WIDTH);
}

// Fill in px: proportional, at least 3, snapped to the 3-px notch grid (remainder 2 rounds up, 1 rounds down).
function fillPx(percent: number, width: number): number {
  const r = Math.floor((percent * width) / 100);
  if (r < MIN_FILL) return MIN_FILL;
  const m = r % SNAP;
  if (m === 0) return r;
  return m > 1 ? r + (SNAP - m) : r - m;
}

function hpBand(hpPct: number): Band {
  return hpPct >= 66 ? "high" : hpPct >= 33 ? "mid" : "low";
}

function energyPercent(e: Energy): number {
  if (e.kind === "mana") return Math.floor((e.cur * 100) / Math.max(e.max, 1));
  // Fix: the donor (ui.h:1083) divides remove_timer by the default before multiplying by 100, so it is 0 except at full.
  return Math.floor((e.left * 100) / Math.max(e.total, 1));
}

// Returns null when no bar is drawn: unit not selected, or invincible.
function barModel(i: BarInput): BarModel | null {
  if (i.invincible || !i.selected) return null;
  const widthPx = barWidth(i.healthBarSizePx);
  const hpPct = Math.floor((Math.ceil(i.hp) * 100) / Math.max(i.maxHp, 1));
  const shieldPx = i.shield ? fillPx(Math.floor((i.shield.cur * 100) / Math.max(i.shield.max, 1)), widthPx) : 0;
  const energyPx = i.energy ? fillPx(energyPercent(i.energy), widthPx) : 0;
  const height = 5 + (i.shield ? 2 : 0) + (i.energy ? 6 : 0);
  return {
    widthPx,
    height,
    hpPx: fillPx(hpPct, widthPx),
    band: hpBand(hpPct),
    shieldPx,
    energyPx,
  };
}

export {};
