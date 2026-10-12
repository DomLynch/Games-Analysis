// Licence: CC0-1.0 (donor open-duelyst-duelyst). Written from the described mechanism, not a translation of the donor lines.
export interface CueConfig {
  cueWindowS: number;    // requests inside this window collapse to the highest-priority one
  blockingS: number;     // a playing cue blocks equal or lower priority cues for this long
  stackWindowS: number;  // only cues younger than this count towards attenuation
  stackPower: number;    // gain = (1 / max(1, n)) ** stackPower
}

// Donor values (config.js 1231-1242): seconds, except stackPower (ratio).
export const CUE_DEFAULTS: CueConfig = { cueWindowS: 0.06, blockingS: 0.5, stackWindowS: 0.35, stackPower: 0.3 };

interface Playing { id: string; priority: number; startedAt: number; }

export class CueSlot {
  private pending: { id: string; priority: number; since: number } | null = null;
  private current: Playing | null = null;
  private recent: Playing[] = [];

  constructor(private readonly cfg: CueConfig) {}

  // Called by gameplay code whenever a hit or spell cue fires.
  request(id: string, priority: number, now: number): void {
    if (this.pending === null) {
      this.pending = { id, priority, since: now };
    } else if (priority > this.pending.priority) {
      this.pending = { id, priority, since: this.pending.since }; // the window keeps its start time
    }
  }

  // Called once per frame. Returns the cue to start now with its gain, or null.
  flush(now: number): { id: string; gain: number } | null {
    const p = this.pending;
    if (p === null || now - p.since < this.cfg.cueWindowS) return null;
    this.pending = null;

    const cur = this.current;
    const blocked = cur !== null && now - cur.startedAt < this.cfg.blockingS;
    if (blocked && cur !== null && p.priority <= cur.priority) return null; // dropped

    // Count the new cue before choosing its gain.
    this.current = { id: p.id, priority: p.priority, startedAt: now };
    this.recent = this.recent.filter((c) => now - c.startedAt < this.cfg.stackWindowS);
    this.recent.push(this.current);
    const n = this.recent.length;
    return { id: p.id, gain: (1 / Math.max(1, n)) ** this.cfg.stackPower };
  }
}

// Crossfade gains for a track handover. fadeS = 0 is a hard cut (the donor's voice case).
export function crossfadeGains(elapsedS: number, fadeS: number): { incoming: number; outgoing: number } {
  if (fadeS <= 0) return { incoming: 1, outgoing: 0 };
  const t = Math.min(1, Math.max(0, elapsedS / fadeS));
  return { incoming: t, outgoing: 1 - t };
}

export {};
