// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Row { itemId: string; chance: number; }

// Weighted pick from zone rows: one roll over the running total, first row that covers it.
export function pickWeighted(rows: Row[], roll01: () => number): string | null {
  const total = rows.reduce((a, r) => a + r.chance, 0);
  if (rows.length === 0 || total <= 0) return null;
  const roll = 1 + Math.floor(roll01() * total); // 1..total
  let run = 0;
  for (const r of rows) {
    run += r.chance;
    if (roll <= run) return r.itemId;
  }
  return null;
}

// A ground node as a zone row: a box, how many copies are live, and a respawn delay.
export interface NodeRow {
  minX: number; maxX: number; minY: number; maxY: number;
  maxAllowed: number; respawnS: number; itemId: string;
}
export interface LiveNode { x: number; y: number; readyAt: number | null; }

export function placeNode(row: NodeRow, rnd: () => number): LiveNode {
  return {
    x: row.minX + rnd() * (row.maxX - row.minX),
    y: row.minY + rnd() * (row.maxY - row.minY),
    readyAt: null,
  };
}

export function buildNodes(row: NodeRow, rnd: () => number): LiveNode[] {
  return Array.from({ length: row.maxAllowed }, () => placeNode(row, rnd));
}

// Server-side click: only a live node pays out; it then waits for its respawn timer.
export function clickNode(node: LiveNode, row: NodeRow, nowS: number): string | null {
  if (node.readyAt !== null) return null;
  node.readyAt = nowS + row.respawnS;
  return row.itemId;
}

// Tick: when the timer is due, the node is placed again at a random point in its box.
export function tickNode(node: LiveNode, row: NodeRow, nowS: number, rnd: () => number): void {
  if (node.readyAt !== null && nowS >= node.readyAt) {
    Object.assign(node, placeNode(row, rnd));
  }
}

// Base success chance (percent) for a combine. Trivial = recipe difficulty, skill = player skill.
export function tradeskillChance(skill: number, trivial: number): number {
  if (skill >= trivial) return 95 + (skill - trivial) / 40; // at trivial: 95, plus 1 per 40 over
  const c = trivial >= 68 ? skill - 0.75 * trivial + 51.5 : skill - trivial + 66;
  return Math.min(95, Math.max(5, c));
}

// Skill-up stage-2 chance (percent) by raw skill, floored at the minimum rule.
// The donor divides with integer arithmetic here; this sketch uses float division.
export function skillUpStage2(raw: number, minChance = 2.5): number {
  let c: number;
  if (raw < 15) c = 100;
  else if (raw < 175) c = (200 - raw) / 2;
  else c = 12.5 - 0.08 * (raw - 175);
  return Math.max(minChance, c);
}

export {};
