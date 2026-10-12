// Licence: GNU AGPL-3.0-or-later (donor IO.c and Time.c headers). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Vitals {
  hp: number;
  maxHp: number;
  snapshotHp: number;   // HP recorded at the snapshot point (see takeSnapshot)
}

// Snapshot point: the donor takes it at the end of the player's action, before the monsters act.
// The caller decides the window. Call this at the moment the window should start.
function takeSnapshot(v: Vitals): void {
  v.snapshotHp = v.hp;
}

// Regeneration must not appear in the readout: move the snapshot with the HP, always.
// Fix: the donor's player branch only bumps the snapshot when it is below the new HP
// (Time.c 2287-2289, 2294-2296), so regen after damage in the same window shows as recovery.
function applyRegen(v: Vitals, amount: number): void {
  v.hp = Math.min(v.maxHp, v.hp + amount);
  v.snapshotHp = Math.min(v.maxHp, v.snapshotHp + amount);
}

// Percent change in the window, as the donor does it. Integer division truncates, as in the donor.
// Overheal is ignored by clamping the snapshot to max HP.
function changePercent(v: Vitals): number {
  if (v.snapshotHp <= 0) return 0;
  const base = Math.min(v.snapshotHp, v.maxHp);
  return Math.trunc((100 * (v.hp - base)) / v.maxHp);
}

// Label text, e.g. "Health (-30%)"; plain "Health" when unchanged; "Dead" at 0 HP.
function healthLabel(v: Vitals): string {
  if (v.hp <= 0) return "Dead";
  const p = changePercent(v);
  if (p === 0) return "Health";
  return `Health (${p > 0 ? "+" : ""}${p}%)`;
}

// Alert once per window, for the deepest threshold crossed downwards (thresholds ascending).
const THRESHOLDS = [5, 10, 25, 40];   // percent of max HP (data field)
function deepestCrossed(v: Vitals): number | null {
  const cur = Math.trunc((v.hp * 100) / v.maxHp);
  const prev = Math.trunc((v.snapshotHp * 100) / v.maxHp);
  if (!(cur < prev)) return null;
  for (const t of THRESHOLDS) {
    if (cur < t && prev >= t) return t;
  }
  return null;
}

export {};
