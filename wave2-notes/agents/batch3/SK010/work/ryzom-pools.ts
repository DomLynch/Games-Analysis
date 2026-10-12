// Licence: GNU AGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Pool = 'hp' | 'sap' | 'stamina' | 'focus';

const CHAR_MAX = 250;          // MaxCharacteristicValue (egs_variables.cpp:304)
const BASE_VALUE = 10;         // PhysicalCharacteristicsBaseValue (egs_variables.cpp:669)
const POOL_FACTOR = 10;        // PhysicalCharacteristicsFactor (egs_variables.cpp:670)
const REGEN_DIVISOR = 16;      // RegenDivisor (egs_variables.cpp:299)
const REGEN_ACTION_DIV = 2;    // RegenReposFactor (egs_variables.cpp:300)
const REGEN_OFFSET = 1.6;      // RegenOffset (egs_variables.cpp:301)
const BASE_CARRY_G = 100000;   // BaseMaxCarriedWeight (egs_variables.cpp:495)
const CHEST_STA_FACTOR = 0.5;  // HitChestStaLossFactor (egs_variables.cpp:312)

interface PoolState {
  max: number;
  cur: number;
  regenRest: number;  // per second while sitting
  regenAct: number;   // per second otherwise
  decimal: number;    // fractional carry between ticks
}

// One pool from its two characteristics: max from the first, regen from the second.
function newPool(c: number, regenC: number): PoolState {
  const cc = Math.min(c, CHAR_MAX);
  const rc = Math.min(regenC, CHAR_MAX);
  const max = (cc + BASE_VALUE) * POOL_FACTOR;
  const repos = rc / REGEN_DIVISOR + REGEN_OFFSET;
  const act = rc / REGEN_DIVISOR / REGEN_ACTION_DIV + REGEN_OFFSET;
  return { max, cur: max, regenRest: repos, regenAct: act, decimal: 0 };
}

// Regen tick. cycles = game cycles since the last update; one cycle is 0.1 s (tick_event_handler.cpp:41).
function regenTick(p: PoolState, sitting: boolean, cycles: number): void {
  if (p.cur >= p.max) return;
  const rate = sitting ? p.regenRest : p.regenAct;
  p.decimal += rate * cycles / 10;
  const whole = Math.trunc(p.decimal);
  p.cur = Math.min(p.max, Math.max(0, p.cur + whole));
  p.decimal -= whole;
}

// Speed malus from carried weight: one point per whole kg over the cap, never positive, floor -100.
// The donor's floor correction also runs on positive remainders (see the note, section 6); this version does not.
function weightSpeedMalus(carriedG: number, strength: number): number {
  const diffG = BASE_CARRY_G + 1000 * strength - carriedG;
  return Math.max(-100, Math.min(0, Math.floor(diffG / 1000)));
}

// Phrase stamina cost: fixed part plus a per-kg weapon part; players scale by equipment wear.
function phraseStaminaCost(staConst: number, staPerKg: number, weaponG: number, isPlayer: boolean, wearMalus: number): number {
  let cost = staConst + Math.trunc(staPerKg * weaponG / 1000);
  if (isPlayer) cost = Math.trunc(cost * (1 + 0.5 * wearMalus));
  return cost;
}

// Gate and spend merged for the sketch (the donor checks in validate() and spends in launch()).
// Only players are refused; everyone is charged, and the spend is skipped at exactly 0.
function trySpendStamina(p: PoolState, cost: number, isPlayer: boolean): boolean {
  if (isPlayer && p.cur < cost) return false;
  if (p.cur !== 0) p.cur = Math.max(0, p.cur - cost);
  return true;
}

// Drain on a hit that does not kill. A lethal hit drains nothing. Chest hits add a share of the damage.
function hitStaminaDrain(p: PoolState, damage: number, dynFactor: number, chest: boolean, killed: boolean): number {
  if (killed) return 0;
  let lost = Math.trunc(damage * dynFactor); // weapon-linked factor; 0 when the weapon has none
  if (chest) lost += Math.trunc(damage * CHEST_STA_FACTOR);
  p.cur = Math.max(0, p.cur - lost);
  return lost;
}

// Respawn at a point leaves 10% of each pool; revive() refills them.
function respawnPools(pools: Record<Pool, PoolState>, full: boolean): void {
  for (const k of Object.keys(pools) as Pool[]) {
    const p = pools[k];
    p.cur = full ? p.max : Math.trunc(p.max / 10);
  }
}

// Eight characteristics feed four pools: hp (con, meta), sap (int, wis), stamina (str, wb), focus (dex, will).
function makeAllPools(ch: Record<'con' | 'meta' | 'int' | 'wis' | 'str' | 'wb' | 'dex' | 'will', number>): Record<Pool, PoolState> {
  return {
    hp: newPool(ch.con, ch.meta),
    sap: newPool(ch.int, ch.wis),
    stamina: newPool(ch.str, ch.wb),
    focus: newPool(ch.dex, ch.will),
  };
}
