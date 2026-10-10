// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Timed {
  always: boolean;                              // runs even while the queue is paused
  onDue(frameTime: number, data: number): void; // receives the frame time, not the due time
}

interface Entry { due: number; obj: Timed; data: number; pauseAdded: number; }

export class TimeQueue {
  private entries: Entry[] = [];   // kept sorted by due time
  private pauseStart = 0;          // time the current pause began; 0 = not paused
  private pauseDepth = 0;          // nested pause count

  // `now` is passed in; the donor reads the clock inside add().
  add(due: number, obj: Timed, data: number, now: number): void {
    let at = due;
    let pauseAdded = 0;
    if (this.pauseDepth > 0 && !obj.always) {
      at -= now - this.pauseStart;     // delay counts from the resume, not from the pause
      pauseAdded = this.pauseStart;
    }
    let i = this.entries.length;       // insert after every entry due at or before `at`
    while (i > 0 && this.entries[i - 1].due > at) i--;
    this.entries.splice(i, 0, { due: at, obj, data, pauseAdded });
  }

  pause(now: number): void {
    if (this.pauseDepth++ === 0) this.pauseStart = now;
  }

  resume(now: number): void {
    if (this.pauseDepth === 0 || --this.pauseDepth > 0) return;   // only the outermost resume counts
    const cycle = this.pauseStart;
    const diff = now - cycle;
    this.pauseStart = 0;
    if (diff < 0) return;
    for (const e of this.entries) {
      if (!e.obj.always && e.pauseAdded === cycle) { e.due += diff; e.pauseAdded = 0; }
    }
  }

  // Called once per frame with the wall-clock time.
  activate(now: number): void {
    if (this.pauseDepth > 0) {
      // Paused: only due 'always' entries run; the rest stay queued.
      for (let i = 0; i < this.entries.length; ) {
        const e = this.entries[i];
        if (e.due > now) break;
        if (e.obj.always) { this.entries.splice(i, 1); e.obj.onDue(now, e.data); }
        else i++;
      }
      return;
    }
    // Drain every due entry from the head; re-check the head after each handler call.
    while (this.entries.length > 0 && this.entries[0].due <= now) {
      const e = this.entries.shift()!;
      e.obj.onDue(now, e.data);
    }
  }
}

export {};
