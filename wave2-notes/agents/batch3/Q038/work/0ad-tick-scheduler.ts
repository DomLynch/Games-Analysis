// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type PlayerId = number;
interface Cmd { player: PlayerId; payload: unknown; }

const TICK_MS = 200;          // fixed tick length (donor DEFAULT_TURN_LENGTH)
const INPUT_DELAY_TICKS = 4;  // inputs are stamped for now + this many ticks (donor COMMAND_DELAY_MP)

class TickScheduler {
  private current = 0;        // last tick that has run
  private owedMs = 0;         // time owed to the sim; a tick runs while owedMs >= 0
  private queued = new Map<number, Map<PlayerId, Cmd[]>>();

  // Input intake: an input for a tick that has already run is rejected, never run late.
  submit(player: PlayerId, tick: number, cmd: Cmd): boolean {
    if (tick <= this.current) return false;
    const byPlayer = this.queued.get(tick) ?? new Map<PlayerId, Cmd[]>();
    byPlayer.set(player, [...(byPlayer.get(player) ?? []), cmd]);
    this.queued.set(tick, byPlayer);
    return true;
  }

  // Frame loop: add real time, clamp the debt to two ticks, then run whole ticks (at most maxTicks).
  advance(elapsedMs: number, maxTicks: number, step: (tick: number, cmds: Cmd[]) => void): number {
    this.owedMs = Math.min(this.owedMs + elapsedMs, 2 * TICK_MS);
    let ran = 0;
    while (this.owedMs >= 0 && ran < maxTicks) {
      const tick = this.current + 1;
      const byPlayer = this.queued.get(tick) ?? new Map<PlayerId, Cmd[]>();
      this.queued.delete(tick);
      const ordered: Cmd[] = [];
      for (const p of [...byPlayer.keys()].sort((a, b) => a - b)) {
        ordered.push(...(byPlayer.get(p) ?? []));
      }
      this.current = tick;
      step(tick, ordered);
      this.owedMs -= TICK_MS;
      ran++;
    }
    return ran;
  }
}

export {};
