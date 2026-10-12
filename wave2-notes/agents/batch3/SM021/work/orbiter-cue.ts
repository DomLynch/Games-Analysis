// Licence: MIT (donor: Sound/XRSound/LICENSE). Adapted from the described mechanism; not a line-by-line translation.
// Edge-triggered attack/close cue with re-arm hysteresis, plus a level-driven loop volume.

export interface CueState {
  armed: boolean;
}

export interface CueOutput {
  attackVolume?: number; // play once when the level rises to ATTACK_ON
  closeVolume?: number;  // play once when the level falls below REARM_BELOW after an attack
  loopVolume: number;    // volume for the looping sustain; 0 means stop
}

export const ATTACK_ON = 0.2;      // donor SoundPreSteps.cpp:353 (s_minThrustLevelForSound = 0.20f)
export const REARM_BELOW = 0.12;   // fix: band below ATTACK_ON; donor re-arms at the same 0.20 threshold
export const SUSTAIN_MIN = 0.05;   // donor XRSoundConfigFileParser.cpp:22 (MinThrusterLevelForRCSSoundEffects default)
export const CLOSE_VOLUME = 1.0;   // donor SoundPreSteps.cpp:478 (fixed close volume)

// Same lerp and 0.02 cut-off as XRSoundEngine::ComputeVariableVolume (XRSoundEngine.cpp:513-525).
export function variableVolume(min: number, max: number, level: number): number {
  const l = Math.min(1, Math.max(0, level));
  const v = min + (max - min) * l;
  return v >= 0.02 ? v : 0;
}

export function stepCue(state: CueState, level: number): CueOutput {
  const out: CueOutput = { loopVolume: 0 };

  if (level >= ATTACK_ON && state.armed) {
    out.attackVolume = variableVolume(ATTACK_ON, 1.0, level);
    state.armed = false;
  } else if (level < REARM_BELOW) {
    if (!state.armed) out.closeVolume = CLOSE_VOLUME;
    state.armed = true;
  }

  out.loopVolume = level > SUSTAIN_MIN ? variableVolume(ATTACK_ON, 1.0, level) : 0;
  return out;
}

export {};
