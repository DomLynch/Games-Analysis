// Licence: BSD-3-Clause (donor). Clean-room sketch of the mechanism, written from the described steps and their order.
export {};

export interface PowerDef {
  castS: number;         // TimeToActivate: charge time in seconds
  rechargeS: number;     // RechargeTime in seconds
  periodS: number;       // ActivatePeriod: toggle period in seconds
  enduranceCost: number; // EnduranceCost
  toggle: boolean;
}

export interface Blocks { stunned: boolean; sleep: boolean; held: boolean; afraid: boolean; onlySelf: boolean; }

export interface Queued { id: string; tgt: number; charge: number; }

export interface Caster {
  endurance: number;
  queue: Queued[];                                 // index 0 is the power charging or next to charge
  charging: boolean;
  recharge: Map<string, number>;                   // power id -> seconds left
  toggles: Map<string, { next: number; tgt: number }>;
  blocks: Blocks;
}

export function blocked(b: Blocks): boolean {
  return b.stunned || b.sleep || b.held || b.afraid || b.onlySelf;
}

// Queue entry check. Returns a refusal reason, or null when the power is queued.
// The donor sends a message for range and recharge and then keeps going; here each refusal stops the call.
export function queuePower(c: Caster, id: string, tgt: number, d: PowerDef, inRange: boolean): string | null {
  if (c.endurance < d.enduranceCost) return 'not enough endurance';
  if (c.recharge.has(id)) return 'recharging';
  if (!inRange) return 'out of range';
  // A new power replaces queued ones that have not started; the charging one (index 0) is kept.
  c.queue = c.charging ? c.queue.slice(0, 1) : [];
  c.queue.push({ id, tgt, charge: d.castS });
  return null;
}

// One step of the charge for the front of the queue. Returns the id that fired, or null.
export function tickCharge(c: Caster, defs: Map<string, PowerDef>, dt: number, inRange: (tgt: number) => boolean): string | null {
  const front = c.queue[0];
  if (front === undefined) return null;
  const def = defs.get(front.id);
  if (def === undefined) { c.queue.shift(); return null; }
  if (!c.charging) {
    // Blocks are checked only before the charge starts; a block that arrives mid-charge does not stop it (donor).
    if (blocked(c.blocks)) { c.queue.shift(); return null; }
    if (c.recharge.has(front.id) || !inRange(front.tgt)) return null; // wait at the front
    c.charging = true;
    return null;
  }
  front.charge -= dt;
  if (front.charge >= 0) return null;
  c.queue.shift();
  c.charging = false;
  if (def.toggle) {
    c.toggles.set(front.id, { next: def.periodS, tgt: front.tgt });
    return null;
  }
  c.endurance -= def.enduranceCost;
  c.recharge.set(front.id, def.rechargeS);
  return front.id;
}

export function tickRecharge(c: Caster, dt: number): void {
  for (const [id, left] of Array.from(c.recharge.entries())) {
    const next = left - dt;
    if (next <= 0) c.recharge.delete(id);
    else c.recharge.set(id, next);
  }
}

// Toggles fire every period and stop when endurance runs short or the target is out of range.
export function tickToggles(
  c: Caster,
  defs: Map<string, PowerDef>,
  dt: number,
  inRange: (tgt: number) => boolean,
  fire: (id: string, tgt: number) => void,
): void {
  for (const [id, t] of Array.from(c.toggles.entries())) {
    const def = defs.get(id);
    if (def === undefined) { c.toggles.delete(id); continue; }
    if (t.next <= 0) {
      c.endurance -= def.enduranceCost;
      fire(id, t.tgt);
      t.next += def.periodS;
    } else {
      t.next -= dt;
    }
    if (c.endurance < def.enduranceCost || !inRange(t.tgt)) c.toggles.delete(id);
  }
}
