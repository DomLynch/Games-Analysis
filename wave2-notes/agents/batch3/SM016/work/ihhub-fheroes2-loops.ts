// Donor licence: GPL-2.0-or-later (per the donor's file header: "version 2 ... or (at your option) any later version"). Clean-room sketch of the shape of the mechanism, not a translation of the donor lines.
// clean-room
export interface Emitter {
  sound: string;       // loop sound id
  angle: number;       // degrees, 0 = straight ahead, 90 = right; 0 when 3D audio is off
  distance: number;    // 0..255, 255 = edge of the audible radius
}

export interface Loop extends Emitter { voice: number; }

export interface Candidate {
  sound: string | null; // null = no loop for this tile
  dx: number;           // offset from the listener, screen units, y grows downwards
  dy: number;
}

export interface Mixer {
  isPlaying(voice: number): boolean;
  play(sound: string, angle: number, distance: number): number | null; // starts a looped voice
  setPosition(voice: number, angle: number, distance: number): void;
  stop(voice: number): void;
}

// Angle distance on a circle. Fix: the donor takes a plain difference, so 359 and 1 look 358 degrees apart.
function angleDiff(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
}

// Pick the emitters for this frame: nearest first, one per sound and angle, within a channel budget.
export function collectEmitters(candidates: Candidate[], maxDist: number, budget: number, is3D: boolean): Emitter[] {
  const sorted = candidates
    .filter((c): c is Candidate & { sound: string } => c.sound !== null)
    .map((c) => ({ ...c, d: Math.hypot(c.dx, c.dy) }))
    .filter((c) => c.d < maxDist)
    .sort((a, b) => a.d - b.d);

  const out: Emitter[] = [];
  for (const c of sorted) {
    if (out.length >= budget) break;
    const distance = Math.min(255, Math.round((c.d * 255) / maxDist));
    let angle = 0;
    if (is3D) {
      angle = Math.round(((Math.atan2(c.dx, -c.dy) * 180) / Math.PI + 360) % 360);
    }
    if (out.some((e) => e.sound === c.sound && e.angle === angle)) continue; // a nearer source already covers this direction
    out.push({ sound: c.sound, angle, distance });
  }
  return out;
}

// Reconcile the playing loops with the wanted emitters. Matching loops keep playing; the closest
// leftover loop of the same sound is re-aimed; only then is a new loop started; surplus loops stop.
export function reconcile(wanted: Emitter[], current: Loop[], mixer: Mixer): Loop[] {
  const pool = current.filter((l) => mixer.isPlaying(l.voice));
  const out: Loop[] = [];

  const todo: Emitter[] = [];
  for (const w of wanted) {
    const i = pool.findIndex((l) => l.sound === w.sound && l.angle === w.angle && l.distance === w.distance);
    if (i >= 0) {
      out.push({ ...w, voice: pool[i].voice });
      pool.splice(i, 1);
    } else {
      todo.push(w);
    }
  }

  for (const w of todo) {
    let best = -1;
    let bestAngle = Infinity;
    let bestDist = Infinity;
    for (let i = 0; i < pool.length; i++) {
      const l = pool[i];
      if (l.sound !== w.sound) continue;
      const a = angleDiff(l.angle, w.angle);
      const d = Math.abs(l.distance - w.distance);
      if (a < bestAngle || (a === bestAngle && d < bestDist)) {
        best = i;
        bestAngle = a;
        bestDist = d;
      }
    }
    if (best >= 0) {
      const l = pool.splice(best, 1)[0];
      mixer.setPosition(l.voice, w.angle, w.distance);
      out.push({ ...w, voice: l.voice });
    } else {
      const voice = mixer.play(w.sound, w.angle, w.distance);
      if (voice !== null) out.push({ ...w, voice });
    }
  }

  for (const l of pool) mixer.stop(l.voice);
  return out;
}

export {};
