// Licence: AGPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.

// --- 1. Staff power by enchant level e (donor uses fixed point; floats here) ---
export function staffDamageRange(e: number): [number, number] {
  return [Math.floor(((2 + e) * 3) / 4), Math.floor(4 + (5 * e) / 2)];
}
export function staffBlinkDistance(e: number): number { return 2 + 2 * e; }
export function staffHasteDuration(e: number): number { return 2 + 4 * e; }
export function staffDiscordDuration(e: number): number { return 4 * e; }
export function staffEntrancementDuration(e: number): number { return 3 * e; }
// Poison: 5 x 1.3^(e-2), index clamped to 0..50 (donor: 51-entry table).
export function staffPoison(e: number): number {
  const idx = Math.min(Math.max(e - 2, 0), 50);
  return Math.floor(5 * Math.pow(1.3, idx));
}

// --- 2. Staff charges: one timer per staff; +10 per turn; a charge is added when the timer reaches 0 ---
export interface Staff {
  enchant: number;          // max charges and recharge speed
  maxCharges: number;
  charges: number;
  timer: number;
  blinkOrObstruction: boolean;
}

export function chargeDuration(s: Staff): number {
  return (s.blinkOrObstruction ? 10000 : 5000) / s.enchant; // donor Time.c 1817
}

// Average of n uniform draws over [lo, hi]. Stand-in: the donor's randClumpedRange was not read.
function clumped(lo: number, hi: number, n: number, rnd01: () => number): number {
  let total = 0;
  for (let i = 0; i < n; i++) total += rnd01();
  return Math.floor(lo + (total / n) * (hi - lo));
}

// multiplier > 0 recharges, < 0 drains (donor: reaping hits pass a negative or positive amount).
export function rechargeTick(s: Staff, multiplier: number, rnd01: () => number): void {
  if ((s.charges < s.maxCharges && multiplier > 0) || (s.charges > 0 && multiplier < 0)) {
    s.timer -= 10 * multiplier;
  }
  const d = chargeDuration(s);
  while (s.timer <= 0) {
    if (s.charges < s.maxCharges) s.charges++;
    s.timer += clumped(Math.max(Math.floor(d / 3), 1), Math.floor((d * 5) / 3), 3, rnd01);
  }
  while (s.timer > Math.floor((d * 5) / 3)) {
    if (s.charges > 0) s.charges--;
    s.timer -= d;
  }
}

// --- 3. Wand of domination: chance from missing HP (donor PowerTables.c 45-46) ---
export function dominateChancePct(hp: number, maxHp: number): number {
  if (hp * 5 < maxHp) return 100;
  return Math.max(0, Math.floor((100 * (maxHp - hp)) / maxHp));
}

// --- 4. Timed status refresh: keep the longer of the two (donor discord, Items.c 4641) ---
export function refreshStatus(current: number, duration: number): number {
  return Math.max(current, duration);
}

// --- 5. Monster bolt gate: 30% per turn per valid target; blinking handled elsewhere (donor Monsters.c 2777-2795) ---
export function monsterCastsBolt(effect: string, validTarget: boolean, alwaysUse: boolean, rnd01: number): boolean {
  if (effect === "blinking") return false;
  return validTarget && (alwaysUse || rnd01 * 100 < 30);
}

// --- 6. Reaping: damage dealt recharges staffs by a random share of min(damage, victim HP) x reaping (donor Combat.c 1129-1136) ---
export function reapRecharge(
  damage: number,
  victimHp: number,
  reaping: number,
  rndRange: (lo: number, hi: number) => number,
  recharge: (amount: number) => void,
): void {
  const reaped = Math.min(damage, victimHp) * reaping;
  if (reaped === 0) return;
  const amount = reaping > 0 ? rndRange(0, reaped) : rndRange(reaped, 0);
  if (amount !== 0) recharge(amount);
}

export {};
