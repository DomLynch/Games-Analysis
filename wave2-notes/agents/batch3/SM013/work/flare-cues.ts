// Licence: GPL-3.0 (donor engine) and CC-BY-SA 3.0 (donor game data). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

interface Pt { x: number; y: number; }

const SOUND_FALLOFF = 15;   // tiles; engine setting default (donor EngineSettings.cpp:72)
const CHANNELS = 128;       // mixer channels (donor SDLSoundManager.cpp:62)

interface Cue {
  id: number;
  loop: boolean;
  at: Pt | null;      // null = global bed / no position (fix: explicit flag, not a (0,0) sentinel)
  paused: boolean;
  dist: number;       // 0..255, 0 = full volume
}

function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

class CueMixer {
  private live = new Map<number, Cue>();          // mixer slot -> cue
  private named = new Map<string, number>();      // named channel -> mixer slot (one voice per name)

  constructor(private hero: () => Pt) {}

  private freeSlot(): number {
    for (let i = 0; i < CHANNELS; i++) if (!this.live.has(i)) return i;
    return -1;
  }

  private distanceByte(at: Pt | null): number {
    if (at === null) return 0;
    const v = Math.min(1, Math.max(0, dist(this.hero(), at) / SOUND_FALLOFF));
    return Math.floor(255 * v);
  }

  stop(slot: number): void {
    this.live.delete(slot);
    for (const [name, s] of this.named) if (s === slot) this.named.delete(name);
  }

  // Donor rule: a new sound on a named channel halts the old one on that name first.
  play(id: number, channel: string | null, at: Pt | null, loop: boolean): number {
    if (channel !== null) {
      const old = this.named.get(channel);
      if (old !== undefined) this.stop(old);
    }
    const slot = this.freeSlot();
    if (slot < 0) return -1;            // fix: return before any bookkeeping (donor keeps going with channel -1)
    this.live.set(slot, { id, loop, at, paused: false, dist: this.distanceByte(at) });
    if (channel !== null) this.named.set(channel, slot);
    return slot;
  }

  // Per frame: loops pause beyond falloff and resume inside it; one-shots only update their distance.
  tick(): void {
    for (const c of this.live.values()) {
      if (c.at === null) continue;
      const v = dist(this.hero(), c.at) / SOUND_FALLOFF;
      if (c.loop) {
        if (v > 1 && !c.paused) { c.paused = true; continue; }
        if (v < 1 && c.paused) c.paused = false;
      }
      c.dist = this.distanceByte(c.at);
    }
  }

  get(slot: number): Cue | undefined { return this.live.get(slot); }
  count(): number { return this.live.size; }
}

// Self-check: a far-away loop pauses, a global bed plays at full level, and a named clip replaces itself.
let hero: Pt = { x: 0, y: 0 };
const m = new CueMixer(() => hero);
const wind = m.play(1, "bed_wind", { x: 100, y: 100 }, true);
const bed = m.play(2, "bed_global", null, true);
const hitA = m.play(3, "entity_hit_7", { x: 3, y: 3 }, false);
const hitB = m.play(3, "entity_hit_7", { x: 4, y: 4 }, false);
m.tick();
const windCue = m.get(wind);
const bedCue = m.get(bed);
if (windCue === undefined || !windCue.paused) throw new Error("far loop did not pause");
if (bedCue === undefined || bedCue.dist !== 0) throw new Error("global bed not at full level");
if (hitA < 0 || hitB < 0 || m.count() !== 3) throw new Error("expected wind, bed and one hit");
