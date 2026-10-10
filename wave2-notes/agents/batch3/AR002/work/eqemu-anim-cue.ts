// clean-room sketch of a server-authored animation cue gate (donor licence GPL-3.0: shape only, not a translation)
export interface AnimCue { actorId: number; clip: string; speed: number; }

export class CueGate {
  private readonly nextAllowed = new Map<number, number>(); // actorId -> earliest ms for the next cue

  constructor(private readonly cooldownMs: number) {}

  // Returns the cue to send, or null while the actor is inside its cooldown (the cue is dropped, not queued).
  tryCue(nowMs: number, actorId: number, clip: string, speed = 0): AnimCue | null {
    const next = this.nextAllowed.get(actorId) ?? 0;
    if (nowMs < next) return null;
    this.nextAllowed.set(actorId, nowMs + this.cooldownMs); // window restarts from the send, as the donor timer does
    return { actorId, clip, speed: speed !== 0 ? speed : 10 };
  }
}

// Clients inside range of the actor get the cue. Simplified: the donor uses QueueCloseClients (not read).
export function cueRecipients(
  actor: { x: number; y: number },
  players: ReadonlyArray<{ id: number; x: number; y: number }>,
  range: number,
): number[] {
  return players
    .filter((p) => Math.hypot(p.x - actor.x, p.y - actor.y) <= range)
    .map((p) => p.id);
}

// Weapon class -> swing clip. Off-hand swings use the dual-wield clip (donor: attack.cpp 122-124).
export type WeaponClass = "oneHandBlunt" | "oneHandPierce" | "twoHand" | "unarmed";
export function swingClip(weapon: WeaponClass, offHand: boolean): string {
  if (offHand) return "dualWield";
  switch (weapon) {
    case "oneHandBlunt": return "oneHandWeapon";
    case "oneHandPierce": return "piercing";
    case "twoHand": return "twoHandSlash";
    case "unarmed": return "handToHand";
  }
}
export {};
