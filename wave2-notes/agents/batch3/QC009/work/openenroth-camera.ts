// Licence: LGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface RigTuning {
  backOffset: number;     // world units behind the hero along facing (donor: _yawGranularity = 25)
  eyeHeight: number;      // world units above the hero's base (donor: eyeLevel, config default 160)
  turnDegPerSec: number;  // continuous turn rate (donor: _yawRotationSpeed = 90 deg/s)
  turnStepDeg: number;    // if > 0, a fixed step per input instead of a rate (donor: TurnSpeed setting, default 0)
  pitchStepDeg: number;   // fixed look step per input (donor: VerticalTurnSpeed = 25 units)
  pitchMaxDeg: number;    // look clamp (donor: 128 units of 2048 per turn = 22.5 deg)
}

interface Rig { yawDeg: number; pitchDeg: number; }
interface Hero { x: number; y: number; z: number; }
interface View { x: number; y: number; z: number; yawDeg: number; pitchDeg: number; }

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

// Turn input is -1, 0 or +1. Time-based unless a step is configured (donor Indoor.cpp 1396-1419).
function turn(rig: Rig, input: number, dtSec: number, t: RigTuning): void {
  if (input === 0) return;
  rig.yawDeg += t.turnStepDeg > 0 ? input * t.turnStepDeg : input * t.turnDegPerSec * dtSec;
  rig.yawDeg = ((rig.yawDeg % 360) + 360) % 360;
}

// Look input is -1, 0 or +1: one fixed step per input, then clamp (donor Indoor.cpp 1459-1469).
function look(rig: Rig, input: number, t: RigTuning): void {
  rig.pitchDeg = clamp(rig.pitchDeg + input * t.pitchStepDeg, -t.pitchMaxDeg, t.pitchMaxDeg);
}

// Camera rig: fixed offset behind the hero along facing, at eye height (donor Engine.cpp 137-143).
function placeView(hero: Hero, rig: Rig, t: RigTuning): View {
  const rad = (rig.yawDeg * Math.PI) / 180;
  return {
    x: hero.x - t.backOffset * Math.cos(rad),
    y: hero.y - t.backOffset * Math.sin(rad),
    z: hero.z + t.eyeHeight,
    yawDeg: rig.yawDeg,
    pitchDeg: rig.pitchDeg,
  };
}

// Armageddon-style jitter (donor Spells.cpp 859-861). The donor writes the party's own yaw and
// pitch, so it changes facing and movement. Shown here only to make that point; keep camera shake
// client-side in Frankendom. Donor randomInSegment(-8, 8) range semantics were not read.
function jitterRig(rig: Rig, rnd: () => number, t: RigTuning): void {
  const units = (): number => Math.floor(rnd() * 17) - 8;
  rig.yawDeg = ((rig.yawDeg + units() * (360 / 2048)) % 360 + 360) % 360;
  rig.pitchDeg = clamp(rig.pitchDeg + units() * (360 / 2048), -t.pitchMaxDeg, t.pitchMaxDeg);
}
export {};
