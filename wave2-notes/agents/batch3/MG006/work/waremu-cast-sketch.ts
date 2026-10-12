// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
const GLOBAL_COOLDOWN_MS = 1500;   // data: global cooldown after any cast start
const AP_MAX = 250;                // data: action point pool cap
const AP_REGEN_PER_TICK = 25;      // data: AP gained per regen tick
const AP_REGEN_TICK_MS = 1000;     // engine constant: regen tick interval
const AP_REGEN_PAUSE_MS = 300;     // engine constant: retry delay while on global cooldown
const CANCEL_ON_MOVE_CAST_MS = 1000; // engine constant: a cast longer than this is cancelled by moving

interface Ability {
  id: number;
  castMs: number;            // cast time, ms
  cooldownMs: number;        // per-ability cooldown, ms (set at cast start)
  apCost: number;            // AP charged at completion, not at start
  maxRange: number;          // <= 5 is treated as melee
}

interface Fighter {
  ap: number;
  nextApRegenMs: number;
  globalCdUntilMs: number;
  abilityCdUntil: Map<number, number>;
  current: { ability: Ability; startMs: number } | null;
  level: number;
  weaponDamage: number;
  strength: number;
}

// AP regen: skipped and retried after a pause while the global cooldown is running.
function regenAp(f: Fighter, nowMs: number): void {
  if (nowMs < f.nextApRegenMs) return;
  if (nowMs < f.globalCdUntilMs) { f.nextApRegenMs = nowMs + AP_REGEN_PAUSE_MS; return; }
  f.nextApRegenMs = nowMs + AP_REGEN_TICK_MS;
  f.ap = Math.min(AP_MAX, f.ap + AP_REGEN_PER_TICK);
}

// Refusal reason, or "ok". Checks AP and the global and per-ability cooldowns; does not spend AP.
function canStart(f: Fighter, a: Ability, nowMs: number): string {
  if (a.apCost > f.ap) return "not enough AP";
  if (nowMs < f.globalCdUntilMs) return "global cooldown";
  if (nowMs < (f.abilityCdUntil.get(a.id) ?? 0)) return "ability cooldown";
  return "ok";
}

// Start a cast. A new ability cancels the current one; the same ability already casting is ignored.
function startCast(f: Fighter, a: Ability, nowMs: number): string {
  if (f.current && f.current.ability.id === a.id) return "already casting";
  f.current = null;                                     // a different cast is cancelled first
  const r = canStart(f, a, nowMs);
  if (r !== "ok") return r;
  f.globalCdUntilMs = nowMs + GLOBAL_COOLDOWN_MS;
  f.abilityCdUntil.set(a.id, nowMs + a.cooldownMs);
  f.current = { ability: a, startMs: nowMs };
  return "ok";
}

// Move cancels only a cast longer than the threshold.
function onMove(f: Fighter): void {
  if (f.current && f.current.ability.castMs > CANCEL_ON_MOVE_CAST_MS) f.current = null;
}

// Completion: AP is re-checked and spent here, not at cast start. Returns true if the ability lands.
function completeCast(f: Fighter, nowMs: number): boolean {
  const c = f.current;
  if (!c || nowMs < c.startMs + c.ability.castMs) return false;
  f.current = null;
  if (c.ability.apCost > f.ap) return false;
  f.ap -= c.ability.apCost;
  return true;
}

// Melee-range damage: base, plus level scaling; for melee range, add STR/5 and weapon damage * 0.1 * cast seconds.
function abilityDamage(f: Fighter, a: Ability, baseDamage: number): number {
  let dmg = baseDamage + f.level * 5.82;
  if (a.maxRange <= 5) {
    dmg += f.strength / 5;
    dmg += f.weaponDamage * 0.1 * (a.castMs * 0.001);
  }
  return dmg < 0 ? 0 : Math.trunc(dmg);
}

export {};
