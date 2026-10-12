// Licence: GPL-2.0-or-later (sound.h and snd_dma.c headers; gnu.txt is GPL v2). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface AmbientBed {
  kind: string;     // one bed per ambience kind (water, sky, slime, lava)
  level: number;    // zone data: 0-255 for the zone the listener is in, 0 when outside any zone
  volume: number;   // current volume, kept as a float so small per-frame steps are not lost
}

interface BedTuning {
  levelScale: number;  // engine constant: donor's ambient_level cvar (0.3)
  gateBelow: number;   // engine constant: targets under this are silent (donor: 8, on the 0-255 scale)
  rampPerSec: number;  // engine constant: volume units per second (donor: ambient_fade 100)
}

// One step of one bed. dt is seconds since the last frame. Returns the volume to mix this frame, 0-255.
function stepBed(bed: AmbientBed, t: BedTuning, dt: number): number {
  let target = bed.level * t.levelScale;
  if (target < t.gateBelow) target = 0;

  const step = t.rampPerSec * dt;
  if (bed.volume < target) {
    bed.volume = Math.min(target, bed.volume + step);   // rise at the ramp rate, never past the target
  } else if (bed.volume > target) {
    bed.volume = Math.max(target, bed.volume - step);   // fall at the same rate
  }
  return Math.round(bed.volume);
}

// Steps every bed. Beds are non-positional: the same volume on both channels.
function stepBeds(beds: AmbientBed[], t: BedTuning, dt: number): number[] {
  return beds.map(b => stepBed(b, t, dt));
}

export {};
