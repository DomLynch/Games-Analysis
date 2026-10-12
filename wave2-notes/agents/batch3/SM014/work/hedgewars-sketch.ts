// Licence: GPL version 2 (donor hedgewars/uSound.pas header, "version 2 of the License"). Clean-room sketch from the described mechanism, not a translation.
// clean-room

interface VoiceLine {
  id: string;        // which line (e.g. "attack", "boring")
  owner: string;     // whose voice (e.g. team id)
  fallback: boolean; // plays only if the previous line failed
}

interface VoiceQueue {
  slots: (VoiceLine | null)[];   // donor: 8 slots
  last: VoiceLine | null;        // last line played
  lastFailed: boolean;
  busyUntilMs: number;           // stands in for "the last channel is still playing"
}

function sameLine(a: VoiceLine | null, b: VoiceLine): boolean {
  return a !== null && a.id === b.id && a.owner === b.owner;
}

// Queue a line. Dropped when masked (unless forced), when it repeats the last line played,
// when it repeats the line just before it in the queue, or when the queue is full.
function enqueue(q: VoiceQueue, line: VoiceLine, masked: boolean, forced: boolean): boolean {
  if (masked && !forced) return false;
  if (sameLine(q.last, line)) return false;
  let i = 0;
  while (i < q.slots.length && q.slots[i] !== null) i += 1;
  if (i > 0 && sameLine(q.slots[i - 1], line)) return false;
  if (i >= q.slots.length) return false;
  q.slots[i] = line;
  return true;
}

// Victory or flawless: fade everything out and clear the queue (the donor fades channels over 800 ms).
function interruptForVictory(q: VoiceQueue, fadeOutAll: (ms: number) => void): void {
  fadeOutAll(800);
  q.slots = q.slots.map((): VoiceLine | null => null);
  q.last = null;
}

// Play the next line once the last one has finished. play() returns the clip length in ms, or null on failure.
// Fix: a fallback at the head that is skipped is removed (the donor leaves it in place, which blocks the queue).
function nextVoice(q: VoiceQueue, nowMs: number, play: (line: VoiceLine) => number | null): VoiceLine | null {
  if (nowMs < q.busyUntilMs) return null;
  let i = 0;
  while (i < q.slots.length && q.slots[i] === null) i += 1;
  if (i >= q.slots.length) {
    q.last = null;
    return null;
  }
  const head = q.slots[i];
  if (head === null) return null;
  if (head.fallback && !q.lastFailed) {
    q.slots[i] = null; // skip it, do not leave it at the head
    return null;
  }
  q.slots[i] = null;
  q.last = head;
  const len = play(head);
  q.lastFailed = len === null;
  q.busyUntilMs = nowMs + (len === null ? 0 : len);
  return head;
}

interface MusicState {
  paused: boolean;
}

// Stinger: start the sound first, and pause the music only if the sound really started.
// Donor: the music is paused first and the result of the sound is ignored, so a failed sting leaves the music paused.
function playStinger(music: MusicState, playSting: () => number | null): number | null {
  const len = playSting();
  if (len === null) return null;
  music.paused = true;
  return len;
}

// Resume at the end of the stinger even if the owner never sends a stop (safety timer).
function resumeIfDue(music: MusicState, nowMs: number, stingerEndMs: number): void {
  if (music.paused && nowMs >= stingerEndMs) music.paused = false;
}

interface Mix {
  volume: number;
  savedVolume: number | null;
}

// Focus lost: keep 2/9 of the volume (donor rule: subtract 7/9 with integer division).
// Fix: a second dampen while already dampened is ignored, so the saved level is never overwritten.
function dampen(m: Mix): void {
  if (m.savedVolume !== null) return;
  m.savedVolume = m.volume;
  m.volume = m.volume - Math.floor((m.volume * 7) / 9);
}

function undampen(m: Mix): void {
  if (m.savedVolume === null) return;
  m.volume = m.savedVolume;
  m.savedVolume = null;
}

export {}
