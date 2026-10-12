// Licence: GPL-3.0 (donor, licence.txt). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface CueVoice { source: number; priority: number; volume: number; }

const MAX_VOICES = 14;        // engine constant: the donor's voice cap
const PLAYING_BONUS = 300;    // engine constant: hysteresis for voices already playing
const RAMP_STEP = 4;          // engine constant: volume change per game update

// Priority: source weight (the whole train, summed by the caller) + speed term + bonus while already playing.
function cuePriority(weight: number, speed: number, alreadyPlaying: boolean): number {
  const base = weight + Math.floor(Math.abs(speed) / 8192);
  return alreadyPlaying ? base + PLAYING_BONUS : base;
}

// Keeps the list sorted highest priority first.
function insertSorted(list: CueVoice[], cand: CueVoice): void {
  const at = list.findIndex(v => cand.priority > v.priority);
  if (at === -1) list.push(cand);
  else list.splice(at, 0, cand);
}

// Fixed: when the list is full the LOWEST voice is evicted, and only if the newcomer outranks it.
// The donor overwrites the first entry below the newcomer, which can be a higher-priority voice.
function admit(list: CueVoice[], cand: CueVoice): void {
  if (list.length < MAX_VOICES) {
    insertSorted(list, cand);
    return;
  }
  if (cand.priority > list[list.length - 1].priority) {
    list.pop();
    insertSorted(list, cand);
  }
}

// Volume moves toward its target by a fixed step per game update.
// Fixed: the step is clamped to the target so the ramp cannot overshoot when the target is not a multiple of the step.
function rampVolume(current: number, target: number): number {
  if (current < target) return Math.min(current + RAMP_STEP, target);
  if (current > target) return Math.max(current - RAMP_STEP, target);
  return current;
}

export {};
