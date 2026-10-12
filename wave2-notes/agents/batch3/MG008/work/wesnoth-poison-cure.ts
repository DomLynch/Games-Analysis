// clean-room sketch (GPL-2.0-or-later donor; shape only, no donor text or lines carried over).
// Numbers are Frankendom parameters chosen by the caller, not donor values.
type Cure = "none" | "slow" | "cure"; // none = ticks; slow = no tick this turn, still poisoned; cure = cleared

interface Patient {
  hp: number;
  maxHp: number;
  poisoned: boolean;
  ownTurn: boolean;   // rest and poison damage apply only on the owner's turn
  resting: boolean;
  healthy: boolean;   // donor flag: "always rest heals"
}

interface Turn {
  cure: Cure;          // best cure this turn: a village or an own-side healer cures; an allied healer slows
  heals: number[];     // non-cumulative heal sources; only the best single value applies
  tickDamage: number;  // poison tick per owner turn
  restHeal: number;    // rest heal per owner turn
}

interface Result { delta: number; clearPoison: boolean; }

function turnResult(p: Patient, t: Turn): Result {
  let delta = 0;
  // Rest heal is added before the poison branch, so a resting poisoned unit nets rest minus tick.
  if (p.ownTurn && (p.resting || p.healthy)) delta += t.restHeal;
  // Heals are not applied to a poisoned unit, even on the turn it is cured.
  if (!p.poisoned && t.heals.length > 0) delta += Math.max(...t.heals);
  if (p.poisoned && t.cure === "none" && p.ownTurn) delta -= t.tickDamage;
  // Clamp: poison cannot take a unit below 1 HP; healing cannot exceed max HP.
  const maxHeal = Math.max(0, p.maxHp - p.hp);
  const minHeal = Math.min(0, 1 - p.hp);
  delta = Math.min(Math.max(delta, minHeal), maxHeal);
  return { delta, clearPoison: p.poisoned && t.cure === "cure" };
}

export {};
