// Licence: donor is copyleft (README says LGPL-3.0; LICENSE.GPL is GPL-3.0 text). clean-room, shape only.
// clean-room
type Ms = number;

interface CastSpec {
  id: number;
  castMs: number;        // base cast time (from skill data; 0 = instant)
  cooldownMs: number;    // per-skill cooldown, starts at completion
  ignoresGcd: boolean;
}

interface Cast {
  spec: CastSpec;
  cost: number;          // mana fixed at start, spent at completion
  endsAt: Ms;
  cancelled: boolean;
}

interface CasterState {
  mp: number;
  gcdUntil: Ms;
  cooldownUntil: Map<number, Ms>;
  cast: Cast | null;
}

type StartResult = "ok" | "busy" | "cooldown" | "gcd" | "lack-mana";

const GCD_MS = 1000;     // data field: player default (donor Skill.cs:623 uses 1000 player, 1500 NPC)

// Donor mana formula (Skill.cs:1561-1562) with its constants kept as read.
function manaCost(abLevel: number, levelMd: number, flat: number): number {
  const base = ((abLevel - 1) * 1.6 + 8) * 3 / 3.65;
  return base * levelMd + flat;
}

// Start gate: same order as the donor's use path (cooldown, GCD, mana), then the cast timer.
function startCast(c: CasterState, s: CastSpec, now: Ms, castMul: number, cost: number): StartResult {
  if (c.cast) return "busy";                                           // added: donor start path has no busy check (not read)
  if ((c.cooldownUntil.get(s.id) ?? 0) > now) return "cooldown";
  if (!s.ignoresGcd && c.gcdUntil > now) return "gcd";
  if (cost > c.mp) return "lack-mana";                                 // gate only; nothing is spent yet
  if (!s.ignoresGcd) c.gcdUntil = now + GCD_MS;                        // changed: GCD starts at start, not completion
  if (s.castMs <= 0) { complete(c, now, s, cost); return "ok"; }
  c.cast = { spec: s, cost, endsAt: now + s.castMs * castMul, cancelled: false };
  return "ok";
}

// Stun, silence, sleep or death: the cast is dropped with no mana spent and no cooldown started.
function interrupt(c: CasterState): void {
  if (c.cast) c.cast.cancelled = true;
  c.cast = null;
}

function complete(c: CasterState, now: Ms, s: CastSpec, cost: number): void {
  c.mp = Math.max(c.mp - cost, 0);
  c.cooldownUntil.set(s.id, now + s.cooldownMs);
}

// Server tick: completes a cast whose end time has passed. Fixed-step driving is an assumption of the sketch (donor uses a task scheduler).
function tick(c: CasterState, now: Ms): number | null {
  const cast = c.cast;
  if (!cast || cast.cancelled || now < cast.endsAt) return null;
  c.cast = null;
  complete(c, now, cast.spec, cast.cost);
  return cast.spec.id;
}

export {};
