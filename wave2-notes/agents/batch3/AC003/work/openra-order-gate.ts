// Licence: GPL-3.0-or-later (donor header: "either version 3 of the License, or (at your option) any later version"). Clean-room sketch written from the described steps, not a translation of the donor lines.
// clean-room
export interface Seat { id: number; isBot: boolean; botControllerId?: number; }

export interface Unit {
  ownerSeat: number | null;   // null = no owner
  dead: boolean;
  accepts(cmd: string): boolean;
}

// One rule set per enabled "rejects orders" trait on the unit.
export interface AcceptRule { reject: Set<string>; except: Set<string>; }

// Donor RejectsOrdersExts.AcceptsOrder: Except wins; Reject blocks; no Reject list anywhere -> deny.
export function acceptsOrder(rules: AcceptRule[], cmd: string): boolean {
  if (rules.length === 0) return true;
  if (rules.some(r => r.except.has(cmd))) return true;
  let anyReject = false;
  for (const r of rules) {
    anyReject = anyReject || r.reject.size > 0;
    if (r.reject.has(cmd)) return false;
  }
  return anyReject;
}

export type Validator = (sender: number, cmd: string, unit: Unit, seats: Map<number, Seat>) => boolean;

// Donor ValidateOrder.OrderValidation, in the donor's order of checks.
export const ownerGate: Validator = (sender, cmd, unit, seats) => {
  if (unit.ownerSeat === null) return true;                 // donor returns true when there is no owner
  const owner = seats.get(unit.ownerSeat);
  if (!owner) return false;                                 // owner seat is gone: drop
  const isBotOrder = owner.isBot && sender === owner.botControllerId;
  if (owner.id !== sender && !isBotOrder) return false;     // only the owner (or its bot controller) may command
  return unit.accepts(cmd);                                 // the unit's own accept list is the last word
};

// Donor UnitOrders.ResolveOrder: dead or missing subject is dropped; every validator must pass.
export function resolveOrder(
  sender: number, cmd: string, unit: Unit | null,
  seats: Map<number, Seat>, validators: Validator[], apply: (u: Unit, cmd: string) => void,
): void {
  if (!unit || unit.dead) return;
  if (validators.every(v => v(sender, cmd, unit, seats))) apply(unit, cmd);
}
export {}
