// Licence: GPL-2 or the Angband licence (donor; dual). CLEAN-ROOM: written from the described mechanism, not a translation.
// Target frame health bar: one tracked enemy, 10 cells, unknown state when out of sight,
// health colour kept separate from status (status goes to tags, not to the colour).

export type Tone = "dark" | "unknown" | "red" | "lightRed" | "orange" | "yellow" | "lightGreen";

export interface Tracked {
  visible: boolean;
  hp: number;
  maxhp: number;
  statusTags: string[]; // e.g. "asleep", "held", "afraid": shown as text, never recolours the bar
}

export interface BarView {
  stars: number;   // 0..cells
  tone: Tone;
  box: string;     // the cells as text, for a terminal or an accessible label
}

// Fix: ceil(pct / 10) with a floor of 1, so every star covers exactly ten percent points.
// (Donor: pct < 10 -> 1, pct < 90 -> pct / 10 + 1, else 10. Its top bucket is 11 points wide.)
export function starCount(pct: number, cells: number): number {
  return Math.max(1, Math.min(cells, Math.ceil(pct / 10)));
}

// Health band (donor thresholds 10, 25, 60, 100 from the same integer percent).
export function healthTone(t: Tracked): Tone {
  if (!t.visible || t.hp < 0 || t.maxhp <= 0) return "unknown"; // fix: guard the divide
  const pct = Math.floor((100 * t.hp) / t.maxhp);
  if (pct >= 100) return "lightGreen";
  if (pct >= 60) return "yellow";
  if (pct >= 25) return "orange";
  if (pct >= 10) return "lightRed";
  return "red";
}

// One redraw of the frame. Unseen targets never reveal a stale value: the box is all dashes.
export function targetBar(t: Tracked | null, cells = 10): BarView {
  if (!t) return { stars: 0, tone: "dark" as Tone, box: "" };
  const tone = healthTone(t);
  if (tone === "unknown") {
    return { stars: 0, tone, box: "[" + "-".repeat(cells) + "]" };
  }
  const pct = Math.floor((100 * t.hp) / t.maxhp);
  const stars = starCount(pct, cells);
  return { stars, tone, box: "[" + "*".repeat(stars) + "-".repeat(cells - stars) + "]" };
}

export {};
