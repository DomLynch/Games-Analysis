// Licence: Sustainable Use License 1.0 (donor, restricted). Clean-room sketch written from the described mechanism, not a translation of the donor.

// Donor data: per-map list of "name:chance" pairs (capacity 7). Weighted pick: draw once, walk the list.
interface AmbientEntry {
  name: string;
  chance: number; // integer weight
}

// rand(lo, hi) returns an integer in [lo, hi] inclusive.
// Sketch: draw from [0, total - 1] so every roll on a non-empty list picks an entry.
// Donor draws randomBetween(0, total); if that can return total, no entry matches and it returns -1 (see note gaps).
function rollAmbient(list: AmbientEntry[], rand: (lo: number, hi: number) => number): number {
  const total = list.reduce((sum, e) => sum + e.chance, 0);
  if (total <= 0) return -1;
  let r = rand(0, total - 1);
  for (let i = 0; i < list.length; i++) {
    if (r < list[i].chance) return i;
    r -= list[i].chance;
  }
  return -1;
}

const TICKS_PER_SECOND = 10; // donor: GAME_TIME_TICKS_PER_HOUR 36000
const MIN_GAP_MS = 5000; // donor: 5000 ms gate on the ticker clock between plays

// One self-rescheduling chain per map (donor: a queue event that queues its own next event).
class AmbientChain {
  private nextIdx = -1; // rolled one interval ahead, as the donor does
  private dueTick = -Infinity;
  private lastPlayMs = -Infinity;

  constructor(
    private readonly list: AmbientEntry[],
    private readonly rand: (lo: number, hi: number) => number,
    private readonly inCombat: () => boolean,
    private readonly play: (name: string) => void,
  ) {}

  // Map entry: donor plays one at once (if allowed), then schedules the next.
  start(nowTick: number, nowMs: number): void {
    this.nextIdx = rollAmbient(this.list, this.rand);
    this.tick(nowTick, nowMs);
  }

  // Called as game time advances. Fires when nowTick reaches dueTick.
  tick(nowTick: number, nowMs: number): void {
    if (nowTick < this.dueTick) return;

    const idx = this.nextIdx;
    this.nextIdx = rollAmbient(this.list, this.rand);
    // Donor: delay = 10 * randomBetween(15, 20) ticks, i.e. 15 to 20 game seconds at 10 ticks per second.
    this.dueTick = nowTick + TICKS_PER_SECOND * this.rand(15, 20);

    if (idx < 0 || this.inCombat()) return; // combat mutes the play; the timer keeps running
    // Fix: stamp the gap only when a sound plays (donor stamps on every attempt, so a blocked attempt resets the gap).
    if (nowMs - this.lastPlayMs < MIN_GAP_MS) return;
    this.lastPlayMs = nowMs;
    this.play(this.list[idx].name);
  }
}

// Demo: a fixed sequence stands in for the random source.
const seq = [0.1, 0.9, 0.5, 0.2, 0.7, 0.3, 0.8, 0.6];
let k = 0;
const rand = (lo: number, hi: number): number => {
  const v = seq[k % seq.length];
  k++;
  return Math.floor(lo + v * (hi - lo + 1));
};
const played: string[] = [];
let fighting = false;
const chain = new AmbientChain([{ name: "crow", chance: 3 }, { name: "wind", chance: 1 }], rand, () => fighting, (n) => played.push(n));
chain.start(0, 0);
chain.tick(160, 16000);
fighting = true;
chain.tick(400, 40000);

export { played, chain };
export {};
