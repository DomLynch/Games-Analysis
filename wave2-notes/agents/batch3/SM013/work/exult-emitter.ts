// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

interface Vec3 { x: number; y: number; z: number; } // tiles; z = height level

const RANGE_TILES = 24;      // engine constant (donor Audio.h:55)
const HEIGHT_STEP = 8;       // engine constant (donor Audio.h:56)
const POLL_MS = 100;         // engine constant (donor objs/animate.cc:113)
const VOICES = 32;           // engine constant (donor audio/Audio.cc:62)
const SILENT = 256;          // distance at or over this = no sound (donor audio/AudioChannel.cc:793)

interface Emitter {
  id: string;
  at: Vec3;
  cues: number[];       // variant ids, zone data (donor: sfxnum + range offset)
  chance: number;       // percent chance per start roll, 1-100 (zone data; donor default 100)
  randomPick: boolean;  // true = random variant, false = cycle in order (zone data)
  volume: number;       // percent 0-100 (zone data; donor default 100)
  priority: number;     // cue class; the donor passes 0 for every sfx, so nothing is ever stolen
  voice: number;        // index into the voice table, -1 when silent
  cursor: number;       // position in cues for cycle mode
}

interface Voice { emitter: string; cue: number; priority: number; pan: number; distance: number; }

interface Spatial { distance: number; pan: number; inRange: boolean; }

// Listener = the camera position in tiles. Donor uses the centre tile of the visible window.
function spatial(listener: Vec3, at: Vec3): Spatial {
  const dx = at.x - listener.x;
  const dy = at.y - listener.y;
  const sq = dx * dx + dy * dy;
  if (sq > RANGE_TILES * RANGE_TILES) return { distance: SILENT, pan: 0, inRange: false };
  let distance = Math.floor((sq * 256) / (RANGE_TILES * RANGE_TILES));
  // fix: use the height difference, not the listener's lift alone (donor adds apos.tz * 8)
  distance = Math.min(256, distance + Math.abs(at.z - listener.z) * HEIGHT_STEP);
  // fix: pan from the x offset only (donor also mixes heights into the pan term)
  const pan = Math.max(-256, Math.min(256, Math.trunc((dx * 2 * 32) / 5)));
  return { distance, pan, inRange: true };
}

// Stereo gain 0..256 each side, donor shape: volume * (256 - distance) * side balance / 65536.
function stereo(sp: Spatial, volume: number): { left: number; right: number } {
  if (!sp.inRange || sp.distance > 255) return { left: 0, right: 0 };
  const base = Math.floor((volume * 256) / 100);
  const lbal = sp.pan > 0 ? Math.max(0, 256 - sp.pan) : 256;
  const rbal = sp.pan < 0 ? Math.max(0, sp.pan + 256) : 256;
  return {
    left: Math.floor((base * (256 - sp.distance) * lbal) / 65536),
    right: Math.floor((base * (256 - sp.distance) * rbal) / 65536),
  };
}

// Donor rule: first free slot; otherwise steal the lowest-priority voice only if it is strictly lower.
function allocate(voices: (Voice | null)[], want: Voice): number {
  const free = voices.findIndex((v) => v === null);
  if (free >= 0) { voices[free] = want; return free; }
  let low = 0;
  for (let i = 1; i < voices.length; i++) {
    const a = voices[i];
    const b = voices[low];
    if (a && b && a.priority < b.priority) low = i;
  }
  const cur = voices[low];
  if (cur && cur.priority < want.priority) { voices[low] = want; return low; }
  return -1;
}

// Grid-aligned next poll time (donor: curtime + delay - (curtime % delay)).
function nextPoll(nowMs: number): number {
  return nowMs + POLL_MS - (nowMs % POLL_MS);
}

// One poll for one emitter. Returns the voice index it is playing on, or -1.
// fix: an emitter that goes out of range is silenced but kept, so it re-arms when the listener returns.
function pollEmitter(e: Emitter, listener: Vec3, voices: (Voice | null)[], rng: () => number, now: number): number {
  void now;
  const sp = spatial(listener, e.at);
  if (!sp.inRange) {
    if (e.voice >= 0) { voices[e.voice] = null; e.voice = -1; }
    return -1;
  }
  if (e.voice >= 0 && voices[e.voice]) {
    const v = voices[e.voice];
    if (v) { v.pan = sp.pan; v.distance = sp.distance; }
    return e.voice;
  }
  // chance roll (donor sfxinf.cc: rand() % 100 < chance)
  if (rng() * 100 >= e.chance) return -1;
  if (e.cues.length === 0) return -1;
  let cue: number;
  if (e.randomPick) {
    cue = e.cues[Math.floor(rng() * e.cues.length)] ?? e.cues[0] ?? 0;
  } else {
    e.cursor = (e.cursor + 1) % e.cues.length;   // donor: advance, then pick
    cue = e.cues[e.cursor] ?? 0;
  }
  const slot = allocate(voices, { emitter: e.id, cue, priority: e.priority, pan: sp.pan, distance: sp.distance });
  e.voice = slot;
  return slot;
}

// Example: 40 torches, one listener, 100 ms poll; checks the voice table is never over VOICES.
const voices: (Voice | null)[] = new Array(VOICES).fill(null);
let seed = 7;
const rng = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const torches: Emitter[] = [];
for (let i = 0; i < 40; i++) {
  torches.push({ id: `torch${i}`, at: { x: i % 10, y: Math.floor(i / 10), z: 0 }, cues: [3, 4, 5], chance: 60,
    randomPick: true, volume: 80, priority: 1, voice: -1, cursor: 0 });
}
const listener: Vec3 = { x: 4, y: 2, z: 0 };
let t = 1000;
for (let tick = 0; tick < 50; tick++) {
  for (const e of torches) pollEmitter(e, listener, voices, rng, t);
  t = nextPoll(t);
}
const playing = voices.filter((v) => v !== null).length;
const sample = stereo(spatial(listener, { x: 5, y: 2, z: 0 }), 80);
if (playing > VOICES || sample.left < 0) throw new Error("voice cap or gain broken");
