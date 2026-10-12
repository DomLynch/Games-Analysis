// Licence: AGPL-3.0 (Open-RSC-Core-Framework). Clean-room sketch written from the described mechanism, no donor lines copied.

// Sliding window: a hit counts for windowMs after it happens.
// Donor windows: 1000 ms for packets, logins and connections; 5 minutes for password guesses.
class SlidingCounter {
  private stamps: number[] = [];
  constructor(private readonly windowMs: number) {}

  private prune(now: number): void {
    const cutoff = now - this.windowMs;
    while (this.stamps.length > 0 && this.stamps[0] <= cutoff) this.stamps.shift();
  }

  hit(now: number): number {
    this.stamps.push(now);
    this.prune(now);
    return this.stamps.length;
  }

  count(now: number): number {
    this.prune(now);
    return this.stamps.length;
  }
}

interface GateConfig {
  maxPacketsPerSec: number;    // donor: 100
  maxLoginsPerSec: number;     // donor: 2
  maxGuessesPerWindow: number; // donor: 10 per 5 minutes
  banMs: number;               // donor: 5 minutes
  queueCap: number;            // donor: 100 (donor admits cap + 1; fixed here)
}

const GUESS_WINDOW_MS = 5 * 60 * 1000;
const ONE_SECOND_MS = 1000;

class IngressGate {
  private packetsByChannel = new Map<string, SlidingCounter>();
  private loginsByHost = new Map<string, SlidingCounter>();
  private guessesByHost = new Map<string, SlidingCounter>();
  private bannedUntil = new Map<string, number>();

  constructor(private readonly cfg: GateConfig, private readonly exempt: ReadonlySet<string>) {}

  private counterFor(map: Map<string, SlidingCounter>, key: string, windowMs: number): SlidingCounter {
    let c = map.get(key);
    if (c === undefined) {
      c = new SlidingCounter(windowMs);
      map.set(key, c);
    }
    return c;
  }

  isBanned(host: string, now: number): boolean {
    const until = this.bannedUntil.get(host);
    return until !== undefined && now < until;
  }

  // Count first, then check (donor order). Over the limit: refuse this packet and ban the host.
  allowPacket(channelId: string, host: string, now: number): boolean {
    const n = this.counterFor(this.packetsByChannel, channelId, ONE_SECOND_MS).hit(now);
    if (this.isBanned(host, now)) return false;
    if (this.exempt.has(host) || n <= this.cfg.maxPacketsPerSec) return true;
    this.bannedUntil.set(host, now + this.cfg.banMs);
    return false;
  }

  // Count first, then check. Logins are refused, not banned.
  allowLogin(host: string, now: number): boolean {
    const n = this.counterFor(this.loginsByHost, host, ONE_SECOND_MS).hit(now);
    return this.exempt.has(host) || n <= this.cfg.maxLoginsPerSec;
  }

  // Lock check runs before the password is compared, so a locked host is refused even with the right password.
  guessLocked(host: string, now: number): boolean {
    if (this.exempt.has(host)) return false;
    return this.counterFor(this.guessesByHost, host, GUESS_WINDOW_MS).count(now) >= this.cfg.maxGuessesPerWindow;
  }

  // Called for every failed password or unknown username.
  recordGuess(host: string, now: number): void {
    this.counterFor(this.guessesByHost, host, GUESS_WINDOW_MS).hit(now);
  }
}

// Bounded per-tick input queue. Returns false and drops the item when full; the caller counts drops.
function enqueue<T>(queue: T[], item: T, cap: number): boolean {
  if (queue.length < cap) {
    queue.push(item);
    return true;
  }
  return false;
}

export {};
