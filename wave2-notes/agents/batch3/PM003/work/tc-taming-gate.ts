// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

type TameRefusal =
  | "not-tameable"          // beast + family + tameable flag, and exotic only if the tamer may tame exotics
  | "above-your-level"      // target level higher than the tamer's level
  | "already-have-pet"      // tamer already has a current pet
  | "active-slots-full"     // no free active companion slot
  | "no-call-spell-for-slot"// the tamer does not know the call spell for the first free slot
  | "already-charmed"       // tamer already controls a charmed unit
  | "already-owned";        // target already has an owner

interface TameTarget {
  level: number;
  isBeast: boolean;
  hasFamily: boolean;
  tameableFlag: boolean;
  exotic: boolean;
  ownerId: string | null;
}

interface Tamer {
  level: number;
  canTameExotic: boolean;
  hasCurrentPet: boolean;
  activeSlots: (string | null)[];   // length 5 in the donor (engine constant)
  callSpellKnown: boolean[];        // one per active slot
  controllingCharm: boolean;
}

// Order follows the donor's cast check: target gates first, then the stable, then charm and owner.
// Deterministic: no roll appears anywhere in these checks.
function checkTame(t: TameTarget, p: Tamer): TameRefusal | null {
  if (t.level > p.level) return "above-your-level";
  if (!t.isBeast || !t.hasFamily || !t.tameableFlag) return "not-tameable";
  if (t.exotic && !p.canTameExotic) return "not-tameable";
  if (p.hasCurrentPet) return "already-have-pet";
  const slot = p.activeSlots.findIndex((s) => s === null);
  if (slot < 0) return "active-slots-full";
  if (!p.callSpellKnown[slot]) return "no-call-spell-for-slot";
  if (p.controllingCharm) return "already-charmed";
  if (t.ownerId !== null) return "already-owned";
  return null;
}
