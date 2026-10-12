// Licence: GPL-2.0-or-later (client/sound.h header). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Cue {
  sfx: string;
  begin: number;   // mix-clock sample at which the cue starts
}

class CueScheduler {
  private pending: Cue[] = [];  // kept sorted by begin
  private offset = 0;           // samples: maps the server clock onto the mix clock

  constructor(private readonly rate: number, private readonly maxPending: number) {}

  // serverMs: server time of the frame. painted: mix clock in samples. timeofsSec: 0 to 0.255 from the server.
  // Returns false when the queue is full; the cue is dropped.
  schedule(sfx: string, serverMs: number, painted: number, timeofsSec: number): boolean {
    if (this.pending.length >= this.maxPending) return false;

    const serverSamples = serverMs * 0.001 * this.rate;
    let start = Math.trunc(serverSamples + this.offset);
    if (start < painted) {
      start = painted;                          // late: start now and re-anchor the mapping
      this.offset = start - serverSamples;
    } else if (start > painted + 0.3 * this.rate) {
      start = painted + Math.trunc(0.1 * this.rate);  // too far ahead: pull in to 100 ms
      this.offset = start - serverSamples;
    }

    const begin = timeofsSec > 0 ? start + Math.trunc(timeofsSec * this.rate) : painted;

    let i = this.pending.length;
    while (i > 0 && this.pending[i - 1].begin > begin) i--;  // equal begins keep arrival order
    this.pending.splice(i, 0, { sfx, begin });
    return true;
  }

  // Takes the cues that are due and returns the sample where the current mix block must stop
  // so the next cue starts on its exact sample.
  due(painted: number, blockEnd: number): { start: Cue[]; end: number } {
    const start: Cue[] = [];
    while (this.pending.length > 0 && this.pending[0].begin <= painted) {
      start.push(this.pending.shift()!);
    }
    const next = this.pending.length > 0 ? this.pending[0].begin : Infinity;
    return { start, end: Math.min(blockEnd, next) };
  }
}

export {};
