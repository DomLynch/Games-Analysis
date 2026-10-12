// Licence: CC-BY-SA 3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

const BASE_MAX_STAMINA = 3500;     // PLAYER_MAX_STAMINA_BASE (external option)
const CARDIO_SCALE = 5;            // PLAYER_CARDIOFIT_STAMINA_SCALING (external option)
const REGEN_BASE = 20;             // PLAYER_BASE_STAMINA_REGEN_RATE, per turn
const BURN_BASE = 15;              // PLAYER_BASE_STAMINA_BURN_RATE, per 100 moves walking
const DODGE_FLOOR = 0.11;          // dodge refused at or below this modifier

type Stance = 'stand' | 'crouch' | 'prone';

interface Fighter {
  stamina: number;
  cardio: number;                  // fitness term; 1000 is the donor's base cardio value
  melee: number;                   // melee skill level
  winded: boolean;
}

function maxStamina(f: Fighter): number {
  return BASE_MAX_STAMINA + CARDIO_SCALE * f.cardio;
}

// Logistic in [0,1]: 1 at or below min, 0 at or above max, 0.5 at the midpoint.
function logRange(min: number, max: number, pos: number): number {
  const L = (t: number) => 1 / (1 + Math.exp(-t));
  const lo = L(-4);
  const hi = L(4);
  if (pos <= min) return 1;
  if (pos >= max) return 0;
  const u = (pos - min) / (max - min);
  return (L(4 - 8 * u) - lo) / (hi - lo);
}

// Dodge value multiplier: 0 at 10% stamina, 1 at 90% stamina.
function dodgeModifier(f: Fighter): number {
  const m = maxStamina(f);
  return 1 - logRange(m * 0.1, m * 0.9, f.stamina);
}

function canDodge(f: Fighter): boolean {
  return !f.winded && dodgeModifier(f) > DODGE_FLOOR;
}

// Changes stamina. Going below zero makes the fighter winded (the donor's 30 s timer is not modelled).
// Clamps to [0, max].
function spend(f: Fighter, delta: number): void {
  f.stamina += delta;
  if (f.stamina < 0) f.winded = true;
  f.stamina = Math.min(Math.max(f.stamina, 0), maxStamina(f));
}

// One melee swing, arm cost as a negative number: weight term, minus melee skill, minus stance; never less than -50.
function swingCost(weaponGrams: number, f: Fighter, stance: Stance, liftMod: number = 1.0): number {
  // donor multiplies the weight term by the limb Lift modifier (1.0 at default)
  const base = -(Math.floor(weaponGrams / 16) + 50) * liftMod;
  const stanceMalus = stance === 'prone' ? 50 : stance === 'crouch' ? 20 : 0;
  return Math.min(-50, base + Math.round(f.melee) - stanceMalus);
}

// Block cost on legs: falls with melee skill. The donor goes negative above skill 20; clamped here.
function blockCost(melee: number): number {
  return BURN_BASE * 6 * Math.max(0, (20 - melee) / 20);
}

// Run move-cost multiplier: 1 at full stamina, 2 at empty.
function runCostMultiplier(f: Fighter): number {
  return 1 / ((f.stamina / maxStamina(f) + 1) / 2);
}

// Regeneration per turn: fitness-scaled base, at least 1, and 10% of that while winded.
// modRegen is the additive regen enchantment (added to, then floored with, the winded multiplier); breathingMod is the breathing limb score (1.0 at default).
function regenPerTurn(f: Fighter, modRegen: number = 0, breathingMod: number = 1.0): number {
  const mult = modRegen + (f.winded ? 0.1 : 1.0);
  return Math.max(0.1, mult) * Math.max(1, REGEN_BASE * (f.cardio / 1000) * breathingMod);
}

function regen(f: Fighter, turns: number): void {
  spend(f, Math.ceil(regenPerTurn(f) * turns));
}

// Example use (not part of the mechanism): a 1,600 g weapon swing at melee 0 standing.
const duelist: Fighter = { stamina: maxStamina({ stamina: 0, cardio: 1000, melee: 0, winded: false }), cardio: 1000, melee: 0, winded: false };
spend(duelist, swingCost(1600, duelist, 'stand'));
regen(duelist, 1);
void canDodge(duelist);
void blockCost(duelist.melee);
void runCostMultiplier(duelist);
