// Licence: BSD-2-Clause (donor). Shape only, written from the described mechanism; not a translation.
const MAX_IN_FLIGHT = 5;        // donor Constants.MAX_STEP_COUNT
const READ_CAP_BYTES = 4096;    // donor NetClient _compressedBuffer: at most this per frame
const PING_EVERY_MS = 1000;     // donor GameScene: next ping due 1000 ms after the last
const PING_SLOTS = 5;           // donor NetStatistics _pings

// Intake, once per frame: one bounded read, then every complete packet is parsed; a partial packet waits.
function frameIntake(
  pending: number[],
  socketBytes: Uint8Array,
  lengthOf: (b: number[]) => number | undefined, // undefined = header not complete yet
  onPacket: (p: number[]) => void
): void {
  pending.push(...socketBytes.subarray(0, READ_CAP_BYTES)); // the rest stays in the socket for later frames
  for (;;) {
    const len = lengthOf(pending);
    if (len === undefined || pending.length < len) break;
    onPacket(pending.splice(0, len));
  }
}

interface InFlight { seq: number; dir: number; x: number; y: number; accepted: boolean; }

// Sequenced move intents: bounded in flight, time-gated, confirmed by sequence (donor WalkerManager + PlayerMobile.Walk).
class MoveSync {
  private queue: InFlight[] = [];
  private head = 0;          // donor CurrentWalkSequence: where the local animation is in the queue
  private seq = 0;
  private nextAllowedAt = 0;
  failed = false;
  private resyncSent = false;

  canSend(now: number): boolean {
    return !this.failed && now >= this.nextAllowedAt && this.queue.length < MAX_IN_FLIGHT;
  }

  send(now: number, dir: number, x: number, y: number, stepMs: number): number {
    const s = this.seq;
    this.seq = s === 0xff ? 1 : s + 1;   // wraps 0xFF to 1 (donor)
    this.queue.push({ seq: s, dir, x, y, accepted: false });
    this.nextAllowedAt = now + stepMs;
    return s;
  }

  // Server confirm. Unknown sequence, or one behind the head that is not the oldest, is a bad step.
  confirm(seq: number): "ok" | "resync" {
    const i = this.queue.findIndex(e => e.seq === seq);
    if (i < 0) return this.bad();
    if (i >= this.head) { this.queue[i].accepted = true; return "ok"; }
    if (i === 0) { this.queue.shift(); this.head -= 1; return "ok"; }
    return this.bad();
  }

  // Local animation finished a step: an accepted step leaves the queue, an unconfirmed one moves the head.
  finishLocalStep(): void {
    if (this.queue.length === 0) return;
    if (this.queue[this.head]?.accepted) this.queue.splice(this.head, 1);
    else this.head += 1;
  }

  // Donor: bad step sends resync once, blocks walking, and clears the queue.
  private bad(): "resync" {
    if (!this.resyncSent) { this.resyncSent = true; /* send resync packet here */ }
    this.failed = true;
    this.queue = [];
    this.head = 0;
    return "resync";
  }

  // Server deny or full reset (donor DenyWalk -> Reset).
  reset(): void {
    this.failed = false; this.queue = []; this.head = 0; this.seq = 0;
    this.resyncSent = false; this.nextAllowedAt = 0;
  }
}

// Ping: one probe per second; five slots; average of non-zero samples (donor NetStatistics).
class PingRing {
  private slots: number[] = new Array<number>(PING_SLOTS).fill(0);
  private idx = 0;
  private sentAt = 0;
  send(now: number): number { this.sentAt = now; const i = this.idx; this.idx = (this.idx + 1) % PING_SLOTS; return i; }
  received(slot: number, now: number): void { this.slots[slot % PING_SLOTS] = now - this.sentAt; }
  average(): number {
    const v = this.slots.filter(x => x !== 0);
    return v.length === 0 ? 0 : Math.floor(v.reduce((a, b) => a + b, 0) / v.length);
  }
}
export {};
