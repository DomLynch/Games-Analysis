// Licence: GPL-3.0 (OpenRCT2 header: "licensed under the GNU General Public License version 3"; repo licence.txt is GPL v3). Clean-room sketch written from the described steps, not a translation of the donor lines.
// clean-room
export class CommandCooldowns {
  // One instance per connected player. Map: command name -> ms still to wait.
  private remaining = new Map<string, number>();

  constructor(private readonly isHost: boolean) {}

  // Called for each incoming command after its permission check. Returns false when refused.
  tryAccept(command: string, cooldownOnAcceptMs: number): boolean {
    if (!this.isHost) {                                       // the host is never limited
      const left = this.remaining.get(command);
      if (left !== undefined && left > 0) return false;       // refused: the running timer is NOT extended
      if (cooldownOnAcceptMs > 0) this.remaining.set(command, cooldownOnAcceptMs);
    }
    return true;
  }

  // Called once per network tick. elapsedMs is the real time since the previous tick (at least 1).
  decay(elapsedMs: number): void {
    for (const [cmd, left] of this.remaining) {
      const next = left - elapsedMs;
      if (next <= 0) this.remaining.delete(cmd);
      else this.remaining.set(cmd, next);
    }
  }
}

// The per-command cooldown values are data on the command, not on the player.
export const cooldownMs: Record<string, number> = {
  placeSmallScenery: 20,   // donor SmallSceneryPlaceAction::GetCooldownTime
  demolishRide: 1000,      // donor RideDemolishAction::GetCooldownTime
};
export {}
