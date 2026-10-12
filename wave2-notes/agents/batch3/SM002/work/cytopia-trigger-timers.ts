// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Ideas kept: trigger -> pick-one table (data), per-trigger repeat timers that run independently (music and nature layers), stinger that stops the bed first.
// Defects fixed: next time = scheduled time + period (no drift); the bed fades before a stinger instead of a hard cut; finished voices are removed on the finish event; a voice cap.

type Trigger = "MainMenu" | "MainTheme" | "NatureSounds";
type TriggerTable = Record<string, string[]>;   // data: resources/data/AudioConfig.json "triggers"

interface ScheduledTrigger { trigger: Trigger; periodMs: number; nextAtMs: number; }

const VOICE_CAP = 32;          // proposed; the donor has no cap (AudioMixer.hxx 161 holds an unbounded list)
const STINGER_FADE_MS = 300;   // proposed; the donor stops at 0 ms (AudioMixer.cxx 223-224)

// Pick one track for a trigger. The donor uses a random choice (AudioMixer.cxx 119); its distribution was not read.
function pickTrack(table: TriggerTable, trigger: Trigger, rand: () => number): string | null {
  const list = table[trigger] ?? [];
  if (list.length === 0) return null;
  return list[Math.floor(rand() * list.length)];
}

// Drift-free timer. The donor re-queues from the tick time plus the period (GameClock.cxx 14).
// This keeps the scheduled time, and skips missed periods so a long stall fires once.
function advance(s: ScheduledTrigger, nowMs: number): ScheduledTrigger {
  let next = s.nextAtMs + s.periodMs;
  while (next <= nowMs) next += s.periodMs;
  return { ...s, nextAtMs: next };
}

// Each trigger timer is checked on every tick and fires when due. Returns the track to play, if any.
function tick(s: ScheduledTrigger, table: TriggerTable, nowMs: number, rand: () => number): { track: string | null; next: ScheduledTrigger } {
  if (nowMs < s.nextAtMs) return { track: null, next: s };
  return { track: pickTrack(table, s.trigger, rand), next: advance(s, nowMs) };
}

interface Mixer { fadeOut(ms: number): void; play(id: string): void; }

// Stinger: fade the bed, then play the cue on top of it.
function stinger(mix: Mixer, id: string): void {
  mix.fadeOut(STINGER_FADE_MS);
  mix.play(id);
}

interface Voice { id: string; isMusic: boolean; }

class Voices {
  private live: Voice[] = [];
  start(v: Voice): boolean {
    if (this.live.length >= VOICE_CAP) {
      // Steal the oldest non-music voice. Music is kept while anything else can go.
      const idx = this.live.findIndex((x) => !x.isMusic);
      if (idx < 0) return false;
      this.live.splice(idx, 1);
    }
    this.live.push(v);
    return true;
  }
  // Fix: remove on the finish event, not on a 5-minute poll.
  finished(id: string): void {
    const i = this.live.findIndex((x) => x.id === id);
    if (i >= 0) this.live.splice(i, 1);
  }
  count(): number { return this.live.length; }
}

export {};
