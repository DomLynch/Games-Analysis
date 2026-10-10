// clean-room sketch of the donor's scheduling shape (InputTracking.ts). Donor is MIT, so adaptation is allowed; this is written from the mechanism.
export type Tick = number;

export interface WindowConfig {
  periodTicks: number;      // donor 200: gap between window starts, before jitter
  windowTicks: number;      // donor 150: how long recording is on
  jitterTicks: number;      // donor 15: start offset is a random integer in [-j, j]
  leewayTicks: number;      // donor 16: allowance for late data after the window ends
  maxBytes: number;         // donor 50_000: byte cap per window (checked before recording)
  flagMissing: boolean;     // donor: !NODE_DEBUG
}

export interface Hooks {
  notify(event: 'start' | 'stop'): void;
  submit(blobs: Uint8Array[]): void;   // only when a report was seen and details are wanted
  flag(reason: string): void;          // report never arrived
}

export class RecordWindow {
  private enabled = false;
  private waiting = false;
  private startAt: Tick;
  private endAt: Tick;
  private reportSeen = false;
  private bytes = 0;
  private blobs: Uint8Array[] = [];

  constructor(
    private cfg: WindowConfig,
    now: Tick,
    private hooks: Hooks,
    private wantDetails: () => boolean,
    private rnd: () => number = Math.random,
  ) {
    this.startAt = this.nextStart(now);
    this.endAt = this.startAt + cfg.windowTicks;
  }

  private offset(n: number): number {
    return Math.floor(this.rnd() * (n + n + 1)) - n;
  }

  private nextStart(now: Tick): Tick {
    return now + this.cfg.periodTicks + this.offset(this.cfg.jitterTicks);
  }

  // Called once per tick per player, before the player's input is read.
  onTick(now: Tick): void {
    if (this.waiting) {
      if (this.endAt + this.cfg.leewayTicks < now) this.finish();
      return;
    }
    if (now >= this.startAt && !this.enabled) {
      this.enabled = true;
      this.startAt = now;
      this.endAt = now + this.cfg.windowTicks;
      this.hooks.notify('start');
      return;
    }
    if (now >= this.endAt && this.enabled) {
      this.enabled = false;
      this.startAt = this.nextStart(now);
      this.endAt = now;
      this.waiting = true;
      this.hooks.notify('stop');
    }
  }

  isActive(now: Tick): boolean {
    return (now >= this.startAt && now <= this.endAt) || this.waiting;
  }

  // Returns true if the report was accepted.
  onReport(now: Tick, bytes: Uint8Array): boolean {
    if (bytes.length === 0 || bytes.length > 500) return false;
    if (!this.isActive(now)) return false;
    this.reportSeen = true;
    if (!this.wantDetails()) return true;
    if (this.bytes > this.cfg.maxBytes) return false;
    this.bytes += bytes.length;
    this.blobs.push(bytes);
    return true;
  }

  private finish(): void {
    if (this.reportSeen) {
      if (this.wantDetails()) this.hooks.submit(this.blobs);
    } else if (this.cfg.flagMissing) {
      this.hooks.flag('no report in window');
    }
    this.waiting = false;
    this.blobs = [];
    this.bytes = 0;
    this.reportSeen = false;
  }
}

export {};
