// Licence: MIT (donor LICENSE). Sketch written from the described mechanism; the donor code may be adapted under MIT.
// clean-room

export interface TempoEvent {
  tick: number;
  microsPerQuarter: number;
  order: number; // read order, breaks ties at the same tick
}

export interface SongTiming {
  maxTick: number;      // latest tick over all tracks
  division: number;     // PPQ, or SMPTE when the top bit is set
  tempos: TempoEvent[]; // tempo events from all tracks
}

export const DEFAULT_TEMPO = 500000; // microseconds per quarter note (120 bpm), the MIDI default
export const SERVER_TICK_MS = 600;   // one server tick
export const MAX_U16 = 0xffff;       // width of the jingle delay field on the wire

// Length in whole milliseconds: fixed rate for SMPTE timing, piecewise tempo integration for PPQ timing.
export function songLengthMs(t: SongTiming): number {
  if ((t.division & 0x8000) !== 0) {
    const framesPerSecond = 0x100 - ((t.division >> 8) & 0xff);
    const ticksPerSecond = framesPerSecond * (t.division & 0xff);
    return ticksPerSecond > 0 ? Math.round((t.maxTick / ticksPerSecond) * 1000) : 0;
  }

  const ppq = t.division || 1;
  const tempos = [...t.tempos].sort((a, b) => a.tick - b.tick || a.order - b.order);

  let current = DEFAULT_TEMPO;
  let last = 0;
  let totalUs = 0;
  for (const te of tempos) {
    totalUs += ((te.tick - last) * current) / ppq;
    current = te.microsPerQuarter;
    last = te.tick;
  }
  if (t.maxTick > last) totalUs += ((t.maxTick - last) * current) / ppq;

  return Math.round(totalUs / 1000);
}

// simplified: the donor's jingle field is a 16-bit write that wraps above 65535 ms. This sketch clamps
// instead, which is a stop-gap: the fix is a 32-bit field, so a long cue keeps its real length.
export function jingleDelayField(ms: number): number {
  return Math.min(MAX_U16, Math.max(0, Math.round(ms)));
}

// Scripts count in server ticks: ceil(ms / 600) + 1, as the donor's getTickLength does.
export function cueTicks(ms: number): number {
  return Math.ceil(ms / SERVER_TICK_MS) + 1;
}

export {};
