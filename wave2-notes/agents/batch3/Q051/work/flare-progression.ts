// clean-room: written from the described mechanism (GPL-3.0-or-later donor), not a translation of the donor lines.
// table[i] = total XP needed to reach level i+1 (table[0] = 0). Levels are 1-based.
type XpTable = number[];

// Level -> multiplier curve (enemy level, or enemy level minus player level).
// The donor clamps to the nearest defined end outside the range and fills gaps at load; this sketch returns 1 for a gap.
interface Curve { points: Map<number, number>; lo: number; hi: number; }

function curveAt(c: Curve | null, key: number): number {
  if (c === null || c.points.size === 0) return 1;
  const hit = c.points.get(key);
  if (hit !== undefined) return hit;
  if (key < c.lo) return c.points.get(c.lo) ?? 1;
  if (key > c.hi) return c.points.get(c.hi) ?? 1;
  return 1;
}

function levelXp(table: XpTable, level: number): number {
  if (level <= 1 || table.length === 0) return 0;
  return level > table.length ? table[table.length - 1] : table[level - 1];
}

function levelFromXp(table: XpTable, xp: number): number {
  let level = 0;
  for (let i = 0; i < table.length; i++) if (xp >= table[i]) level = i + 1;
  return level;
}

interface Player {
  level: number;
  xp: number;
  xpGainPct: number;      // XP_GAIN stat: +25 means +25 percent per award
  bonusCarry: number;     // fraction of an XP point kept between awards
  blockXp: boolean;       // set while the player is at 0 HP
}

interface Enemy {
  level: number;
  baseXp: number;
  absolute: Curve | null;
  relative: Curve | null;
}

// Kill reward: base x party share x level-gap curves, then the award pipeline.
function onKill(p: Player, table: XpTable, e: Enemy, partyPct: number, fromAlly: boolean): void {
  let mult = fromAlly ? partyPct / 100 : 1;
  mult *= curveAt(e.absolute, e.level);
  mult *= curveAt(e.relative, e.level - p.level);
  rewardXp(p, table, e.baseXp * mult);
}

function rewardXp(p: Player, table: XpTable, amount: number): void {
  if (p.blockXp) return;
  p.bonusCarry += (amount * (100 + p.xpGainPct)) / 100;
  const whole = Math.trunc(p.bonusCarry);
  p.xp = Math.min(p.xp + whole, levelXp(table, table.length));  // total is capped at the top threshold
  p.bonusCarry -= whole;                                         // keep the remainder for the next award
  p.level = levelFromXp(table, p.xp);  // donor derives level in Avatar::logic each frame; inlined here
}

// Death: lose a share of total XP, or of XP since the current level, never below the level floor.
function deathXpPenalty(p: Player, table: XpTable, pctTotal: number, pctCurrentLevel: number): void {
  if (pctTotal > 0) {
    if (p.xp > 0) p.xp -= Math.trunc((p.xp * pctTotal) / 100);
  } else if (pctCurrentLevel > 0) {
    const sinceLevel = p.xp - levelXp(table, p.level);
    if (sinceLevel > 0) p.xp -= Math.trunc((sinceLevel * pctCurrentLevel) / 100);
  }
  const floor = levelXp(table, p.level);
  if (p.xp < floor) p.xp = floor;
}

export {};
