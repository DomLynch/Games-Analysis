// Licence: public domain dedication (Unlicense, Reinisch-Warcraft-Arena-Unity). Clean-room sketch written from the described mechanism.

type CastResult =
  | 'Success' | 'SpellUnavailable' | 'NotKnown' | 'CasterDead' | 'NotReady'
  | 'BadTargets' | 'OutOfRange' | 'NoPower' | 'Moving';

interface SpellDef {
  id: number;
  castMs: number;            // donor SpellInfo.castTime
  cooldownMs: number;        // donor SpellInfo.cooldownTime
  gcdMs: number;             // donor SpellInfo.globalCooldownTime
  triggersGcd: boolean;      // donor: not DoesNotTriggerGcd
  castableWhileMoving: boolean;
  cost: number;
  range: number;
}

interface Caster {
  alive: boolean;
  known: ReadonlySet<number>;
  power: number;
  moving: boolean;           // SERVER motion state. A request never supplies this.
  x: number;                 // server-owned position
  z: number;
  gcdLeftMs: number;
  cooldownLeftMs: Map<number, number>;
  cast: { def: SpellDef; leftMs: number } | null;
}

interface Target { x: number; z: number; ok: boolean; }

const MOVE_INTERRUPT_AFTER_MS = 200; // donor MovementUtils.SpellMovementInterruptThreshold

// Ordered checks, first failure wins (donor Spell.ValidateCast order, minus the omitted steps).
function validateCast(c: Caster, def: SpellDef | undefined, target: Target | undefined): CastResult {
  if (def === undefined) return 'SpellUnavailable';
  if (!c.known.has(def.id)) return 'NotKnown';
  if (!c.alive) return 'CasterDead';
  if ((c.cooldownLeftMs.get(def.id) ?? 0) > 0) return 'NotReady';
  if (c.gcdLeftMs > 0) return 'NotReady'; // donor blocks every spell while a GCD runs; only the ignore-GCD cast flag (not on our wire) skips it
  if (c.cast !== null) return 'NotReady';
  if (target !== undefined && !target.ok) return 'BadTargets';
  if (target !== undefined && Math.hypot(target.x - c.x, target.z - c.z) > def.range) return 'OutOfRange';
  if (c.power < def.cost) return 'NoPower';
  return 'Success';
}

// Start: validation, then the moving check against SERVER motion (donor fix: the request path trusts client flags).
// A longer GCD already running is kept (donor SpellHistory.StartGlobalCooldown).
function startCast(c: Caster, def: SpellDef, target: Target | undefined): CastResult {
  const checked = validateCast(c, def, target);
  if (checked !== 'Success') return checked;

  const instant = def.castMs <= 0;
  if (!instant && c.moving && !def.castableWhileMoving) return 'Moving';

  c.power -= def.cost;
  if (def.triggersGcd && c.gcdLeftMs <= def.gcdMs) c.gcdLeftMs = def.gcdMs;

  if (instant) {
    launch(c, def);
    return 'Success';
  }
  c.cast = { def, leftMs: def.castMs };
  return 'Success';
}

// Launch: the cooldown starts here, not at the start of the cast (donor HandleCooldown). Effects omitted.
function launch(c: Caster, def: SpellDef): void {
  if (def.cooldownMs > 0) c.cooldownLeftMs.set(def.id, def.cooldownMs);
}

// Per-tick update, donor order: GCD and cooldowns down, then cast progress, then the move interrupt.
type TickEvent = 'Idle' | 'Progress' | 'Launched' | 'Interrupted';

function tickCaster(c: Caster, dtMs: number): TickEvent {
  c.gcdLeftMs = Math.max(0, c.gcdLeftMs - dtMs);
  for (const [id, left] of c.cooldownLeftMs) {
    if (left > 0) c.cooldownLeftMs.set(id, left - dtMs);
  }

  const cast = c.cast;
  if (cast === null) return 'Idle';

  cast.leftMs -= dtMs;
  if (cast.leftMs <= 0) {
    c.cast = null;
    launch(c, cast.def);
    return 'Launched';
  }

  const elapsedMs = cast.def.castMs - cast.leftMs;
  if (elapsedMs > MOVE_INTERRUPT_AFTER_MS && c.moving && !cast.def.castableWhileMoving) {
    c.cast = null;
    return 'Interrupted';
  }
  return 'Progress';
}
