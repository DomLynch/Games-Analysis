// Licence: MIT (donor LICENSE.md). Clean-room sketch written from the mechanism, not a translation.
// clean-room
export const BAR = 1500;          // one charge bar (donor units)
export const MAX_BARS = 10;       // meter cap in bars
export const MAX_HP = 100;        // HP scale for the loss fraction
export const ATTACKER_SHARE = 0.33; // attacker share of the victim's loss (donor Action.tsx)

export interface Command {
  id: string;
  bars: number;        // cost in bars
  needsItem: boolean;  // donor: requiresCrystal
}

export interface CoachState {
  charge: number;                  // units, 0..MAX_BARS*BAR
  owned: ReadonlySet<string>;      // commands this coach has unlocked
  fired: ReadonlySet<string>;      // commands already fired and not yet reset
  hasItem: boolean;
}

const clampCharge = (c: number): number => Math.max(0, Math.min(MAX_BARS * BAR, c));

// Charge for HP lost: unit value x fraction of HP lost x modifier x weight.
// Victim weight is 1; the attacker of a hit uses ATTACKER_SHARE; a counter-hit on the attacker uses 1.
export function chargeForHpLost(unitValue: number, hpLost: number, weight: number, modifier: number): number {
  return Math.floor(unitValue * (hpLost / MAX_HP) * modifier * weight);
}

// A destroyed building pays its owner, not the attacker.
export function chargeForBuildingLoss(buildingCost: number): number {
  return Math.floor((BAR * 2) / 3 + buildingCost * 2);
}

export function addCharge(s: CoachState, amount: number): CoachState {
  return { ...s, charge: clampCharge(s.charge + amount) };
}

export function canFire(s: CoachState, c: Command): boolean {
  return (
    c.bars * BAR <= s.charge &&
    s.owned.has(c.id) &&
    !s.fired.has(c.id) &&
    (!c.needsItem || s.hasItem)
  );
}

export function fire(s: CoachState, c: Command, free = false): CoachState {
  if (!canFire(s, c)) {
    return s;
  }
  const cost = free ? 0 : c.bars * BAR;
  return { ...s, charge: clampCharge(s.charge - cost), fired: new Set([...s.fired, c.id]) };
}

// Called when the coach's own next turn or round begins. Fired commands stay active through the other side's reply.
export function startOwnCycle(s: CoachState): CoachState {
  return { ...s, fired: new Set() };
}

// AI gate: attack-type commands while at most half the side has acted; recovery commands at 3/4 or more.
// With no matching units the ratio is NaN and both comparisons are false (same as the donor).
export function aiGate(kind: 'attack' | 'recovery', acted: number, total: number): boolean {
  const ratio = acted / total;
  return kind === 'recovery' ? ratio >= 0.75 : ratio <= 0.5;
}

export {};
