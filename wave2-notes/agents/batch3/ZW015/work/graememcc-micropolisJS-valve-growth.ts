// Licence: GPL v3 with additional terms (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Rng16 = () => number; // uniform integer 0..65535

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

// Signed 16-bit roll: -32768..32767.
function signed16(r: Rng16): number {
  const v = r();
  return v < 32768 ? v : v - 65536;
}

// Bitmask chance: true when (r & mask) === 0, so mask 7 means one in eight.
function oneIn(r: Rng16, mask: number): boolean {
  return (r() & mask) === 0;
}

// Demand valve: a clamped accumulator for one zone type.
export interface Valve { value: number; range: number; capped: boolean; }

export function stepValve(v: Valve, ratio: number, taxRow: number, taxTable: readonly number[]): void {
  const row = Math.min(taxRow, taxTable.length - 1);
  const step = Math.round((ratio - 1) * 600 + taxTable[row]);
  v.value = clamp(v.value + step, -v.range, v.range);
  if (v.capped && v.value > 0) v.value = 0; // a player cap stops positive growth
}

export interface Zone {
  empty: boolean;         // an empty zone is always assessed
  population: number;     // 0 when empty; grows in steps of 8 (simplified)
  powered: boolean;
  polluted: boolean;      // pollution above the limit blocks growth
  locationScore: number;  // about -3000..3000
}

export type Outcome = "none" | "grow" | "degrade";

// One sampled zone. Non-empty zones are assessed one time in eight.
export function sampleZone(z: Zone, valve: number, r: Rng16): Outcome {
  if (!z.empty && !oneIn(r, 7)) return "none";
  const score = z.powered ? valve + z.locationScore : -500;
  if (score > -350 && (score - 26380) > signed16(r)) return "grow";
  if (score < 350 && (score + 26380) < signed16(r)) return "degrade";
  return "none";
}

export function applyOutcome(z: Zone, o: Outcome): void {
  if (o === "grow") {
    if (z.polluted) return;               // grow is attempted, then nothing happens
    if (z.population < 40) { z.population += 8; z.empty = false; }
  } else if (o === "degrade") {
    if (z.population > 16) z.population -= 8;
    else if (z.population === 16) { z.population = 0; z.empty = true; }
  }
}

// Frame gate: one simulation phase at most every threshold ms; nothing while a budget dialog is open.
export function frameDue(nowMs: number, lastMs: number, thresholdMs: 10 | 50 | 100, awaiting: boolean): boolean {
  return !awaiting && nowMs - lastMs >= thresholdMs;
}

export interface Census { resPop: number; }

// 16-phase city cycle. Each call to step() runs one phase.
export class PhasedCity {
  private phase = 0;
  private simCycle = 0;
  cityTime = 0;
  census: Census = { resPop: 0 };

  constructor(
    private readonly width: number,
    private readonly zones: (Zone | null)[][],   // [y][x]
    private readonly valve: Valve,
    private readonly rng: Rng16,
    private readonly updateValve: (c: Census) => void,
  ) {}

  step(): void {
    const p = this.phase & 15;
    if (p === 0) {
      this.simCycle = (this.simCycle + 1) % 1024;
      this.cityTime += 1;
      if ((this.simCycle & 1) === 0) this.updateValve(this.census); // uses last cycle's census
      this.census = { resPop: 0 };
    } else if (p <= 8) {
      const from = Math.floor(((p - 1) * this.width) / 8);
      const to = Math.floor((p * this.width) / 8);
      for (const row of this.zones) {
        for (let x = from; x < to; x++) {
          const z = row[x];
          if (!z) continue;
          this.census.resPop += z.population;
          applyOutcome(z, sampleZone(z, this.valve.value, this.rng));
        }
      }
    }
    this.phase = (this.phase + 1) & 15;
  }
}

export {};
