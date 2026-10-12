// Licence: GPL-3.0-or-later (donor file header). Clean-room sketch written from the described mechanism, not a translation.
interface Slot {
  track: string | null;
  playing: boolean;
  volume: number; // 0..100
}

interface Crossfade {
  running: boolean;
  started: boolean;
  ch1: number;      // outgoing slot (donor channel1)
  ch2: number;      // incoming slot (donor channel2)
  vol1: number;     // final volume of ch1 (donor default 0)
  vol2: number;     // final volume of ch2 (donor default 100)
  lengthMs: number;
  swap: boolean;
  elapsedMs: number; // fade clock; advances only while not frozen
}

// Start a crossfade. Refuses to start a second one while one runs.
function startCrossfade(x: Crossfade, ch1: number, ch2: number, lengthMs: number, swap: boolean): boolean {
  if (x.running) {
    return false;
  }
  x.running = true;
  x.started = false;
  x.ch1 = ch1;
  x.ch2 = ch2;
  x.vol1 = 0;
  x.vol2 = 100;
  x.lengthMs = lengthMs;
  x.swap = swap;
  x.elapsedMs = 0;
  return true;
}

// Set a slot's final level: 0 means stop and reset the slot to full, as the donor does.
function settle(s: Slot, finalVolume: number): void {
  if (finalVolume === 0) {
    s.playing = false;
    s.volume = 100;
  } else {
    s.volume = finalVolume;
  }
}

// Once per frame. dtMs is the frame delta, already capped by the caller.
function stepCrossfade(x: Crossfade, slots: Slot[], frozen: boolean, dtMs: number): void {
  if (!x.running || frozen) {
    return; // fix: a frozen game does not advance the fade clock
  }
  if (!x.started) {
    slots[x.ch1].playing = true; // start each track once, never restart a finished one
    slots[x.ch2].playing = true;
    x.started = true;
  }
  x.elapsedMs += dtMs;
  if (x.elapsedMs >= x.lengthMs) {
    settle(slots[x.ch2], x.vol2);
    settle(slots[x.ch1], x.vol1);
    if (x.swap) {
      const a = slots[x.ch1];
      const b = slots[x.ch2];
      const tmp = { track: a.track, playing: a.playing, volume: a.volume };
      a.track = b.track; a.playing = b.playing; a.volume = b.volume;
      b.track = tmp.track; b.playing = tmp.playing; b.volume = tmp.volume;
    }
    x.running = false;
    return;
  }
  const progress = x.elapsedMs / x.lengthMs;
  const delta = Math.trunc((x.vol1 - x.vol2) * progress);
  slots[x.ch1].volume = x.vol2 + delta;
  slots[x.ch2].volume = x.vol1 - delta;
}

export {};
