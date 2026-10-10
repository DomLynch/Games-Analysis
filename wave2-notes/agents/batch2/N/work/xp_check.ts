// Licence: MIT (donor OTClient). Sketch is an original re-expression of the mechanism.
interface XpRates {
  basePct: number;               // 100 = normal
  addendPcts: number[];          // voucher, low-level bonus, boost... added to the base
  staminaPct: number;            // 100 = no change; scales the whole sum
}

// Total multiplier as a decimal: (base + addends) * stamina / 100, then / 100.
function totalMultiplier(r: XpRates): number {
  const sum = r.addendPcts.reduce((a, b) => a + b, r.basePct);
  return (sum * r.staminaPct) / 100 / 100;
}

// Cubic level curve; in Frankendom this would be a catalogue row, not a constant.
function expForLevel(level: number): number {
  return Math.floor((50 * level ** 3) / 3 - 100 * level ** 2 + (850 * level) / 3 - 200);
}

class XpSession {
  private startMs = 0;
  private lastTotal = 0;
  gain = 0;
  rawGain = 0;
  private window: { xp: number; t: number }[] = [];

  // Called when the authoritative total XP changes (server push).
  onTotal(total: number, nowMs: number, r: XpRates): void {
    const prev = this.lastTotal;
    if (this.startMs === 0) this.startMs = nowMs;
    if (prev > 0 && total > prev) {
      const delta = total - prev;
      this.gain += delta;
      const m = totalMultiplier(r);
      this.rawGain += m > 0 ? Math.floor(delta / m) : delta;
    }
    this.lastTotal = total;
  }

  perHour(nowMs: number): number {
    const secs = Math.floor((nowMs - this.startMs) / 1000);
    return secs > 0 && this.gain > 0 ? Math.floor((this.gain * 3600) / secs) : 0;
  }

  hoursToLevel(level: number, total: number, nowMs: number): number | null {
    const rate = this.perHour(nowMs);
    return rate > 0 ? (expForLevel(level + 1) - total) / rate : null;
  }

  // Called every 30 s; keeps the last 30 samples and returns the window speed in xp/s.
  sample(total: number, nowSec: number): number {
    this.window.push({ xp: total, t: nowSec });
    if (this.window.length > 30) this.window.shift();
    if (this.window.length < 2) return 0;
    const first = this.window[0];
    const dt = nowSec - first.t;
    return dt > 0 ? (total - first.xp) / dt : 0;
  }
}
export {}
