// Licence: GPL-3.0-or-later (donor, Music.cpp and Sound.cpp headers; LICENSE.txt is GPL v3). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface ZoneBed { soundId: number | null; volume: number; }   // zone data: one bed per terrain/zone (donor default volume 0.5)

const TOTAL_CHANNELS = 16;      // engine constant: channel pool size
const RESERVED_CHANNELS = 4;    // engine constant: channels 0..3 kept back from general one-shots
const BED_CHANNEL = 3;          // engine constant: the ambience bed's fixed channel
const SWEEP_DEG = 80;           // engine constant: stereo sweep each side of straight ahead, in degrees

// Start a zone's bed on its fixed channel. Fixed: a busy bed channel is reported, not silently ignored.
function startBed(bed: ZoneBed, channelBusy: (ch: number) => boolean,
                  play: (ch: number, id: number) => void): "started" | "none" | "busy" {
  if (bed.soundId === null) return "none";
  if (channelBusy(BED_CHANNEL)) return "busy";   // donor: loop() returns without starting when channel 3 is playing
  play(BED_CHANNEL, bed.soundId);
  return "started";
}

// Bed loudness = master sound volume x the zone's ambient volume, each clamped to [0, 1].
// The donor passes the master option through volumeExponent (an exponential curve, Game.cpp 373) first; masterSound here is the already-curved value.
function bedGain(masterSound: number, bed: ZoneBed): number {
  return Math.min(1, Math.max(0, masterSound)) * Math.min(1, Math.max(0, bed.volume));
}

// Stereo angle from a world x relative to the view centre, clamped to the half view width.
// Result is in degrees, 280..440 for the full sweep (360 = straight ahead), as the donor does.
// Fixed: a zero half-width returns straight ahead instead of dividing by zero.
function stereoAngle(relX: number, halfWidth: number): number {
  if (halfWidth <= 0) return 360;
  const clamped = Math.max(-halfWidth, Math.min(halfWidth, relX));
  return 360 + clamped / (halfWidth / SWEEP_DEG);
}

// One-shots take any free channel from the unreserved part of the pool (donor: first free channel from 4 up).
function pickOneShotChannel(busy: boolean[]): number | null {
  for (let c = RESERVED_CHANNELS; c < TOTAL_CHANNELS; c++) {
    if (!busy[c]) return c;
  }
  return null;
}

export {};
