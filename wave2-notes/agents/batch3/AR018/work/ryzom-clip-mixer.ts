// Licence: AGPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Clip { begin: number; end: number; }             // clip range in clip-local time (caller's unit)
type Wrap = "clamp" | "repeat" | "disable";

interface Slot {
  clip: Clip | null;                 // null = empty slot
  timeOrigin: number;                // mixer time at which the clip starts
  speed: number;                     // playback speed factor (default 1)
  wrap: Wrap;
  startWeight: number; startAt: number;   // weight before/at the ramp start
  endWeight: number;   endAt: number;     // weight at/after the ramp end
  smooth: number;                    // 0 = linear ramp, 1 = smoothstep ramp
  mask: Map<string, number> | null;  // per-channel (bone) weight; null = all channels 1
  maskInvert: boolean;
}

type Sample = (clip: Clip, localT: number, channel: string) => number;

// Clip-local time for one slot at mixer time t.
function localTime(s: Slot, t: number): number {
  const c = s.clip!;
  const raw = c.begin + (t - s.timeOrigin) * s.speed;
  if (s.wrap === "repeat") {
    const len = c.end - c.begin;
    const m = (raw - c.begin) % len;          // same sign rule as C fmod
    return c.begin + (m >= 0 ? m : m + len);
  }
  if (s.wrap === "clamp") return Math.min(Math.max(raw, c.begin), c.end);
  return raw;                                  // disable: unclamped, range-checked by the caller
}

// Weight ramp: clamp outside [startAt, endAt], else linear mixed with smoothstep.
function rampWeight(s: Slot, t: number): number {
  if (t <= s.startAt) return s.startWeight;
  if (t >= s.endAt) return s.endWeight;
  const x = (t - s.startAt) / (s.endAt - s.startAt);
  const linear = s.startWeight + (s.endWeight - s.startWeight) * x;
  const eased = s.startWeight + (s.endWeight - s.startWeight) * (3 * x * x - 2 * x * x * x);
  return s.smooth * eased + (1 - s.smooth) * linear;
}

// Per-channel mask. Sketch choice: a channel the mask does not name keeps weight 1 (the donor can keep a stale weight, see simplified).
function maskWeight(s: Slot, channel: string): number {
  if (!s.mask) return 1;
  const w = s.mask.get(channel);
  if (w === undefined) return 1;
  return s.maskInvert ? 1 - w : w;
}

// One pose evaluation. Slots are filtered first, then each channel is a running weighted mean.
function evalPose(slots: Slot[], t: number, channels: string[], sample: Sample): Record<string, number> {
  const active: { slot: Slot; time: number; weight: number }[] = [];
  for (const s of slots) {
    if (!s.clip) continue;
    const lt = localTime(s, t);
    if (s.wrap === "disable" && (lt < s.clip.begin || lt > s.clip.end)) continue;
    const w = rampWeight(s, t);
    if (w <= 0) continue;
    active.push({ slot: s, time: lt, weight: w });
  }

  const out: Record<string, number> = {};
  for (const ch of channels) {
    let acc = 0;
    let lastBlend = 0;
    let first = true;
    for (const a of active) {
      const blend = a.weight * maskWeight(a.slot, ch);
      if (blend === 0) continue;
      const v = sample(a.slot.clip!, a.time, ch);
      if (first) { acc = v; lastBlend = blend; first = false; }
      else {
        const keep = lastBlend / (lastBlend + blend);    // weight of the running sum
        acc = acc * keep + v * (1 - keep);
        lastBlend += blend;
      }
    }
    if (!first) out[ch] = acc;                           // all-zero channel: left unset, caller keeps its last value
  }
  return out;
}

export {};
