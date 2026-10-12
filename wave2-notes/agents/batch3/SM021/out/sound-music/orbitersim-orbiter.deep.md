# orbitersim-orbiter (sound-music, cell 15)

Donor: `/mnt/frankendom-donors/orbitersim-orbiter/Sound/XRSound/src/SoundPreSteps.cpp` | Licence: MIT (Sound/XRSound/LICENSE, Copyright (c) 2021 Douglas E. Beachy; top-level LICENSE, Copyright (c) 2000-2026 Martin Schweiger) | C++ | symbol `RCSDefaultSoundPreStep::clbkPreStep` and `RCSDefaultSoundPreStep::RCSAttackForAxisSound::clbkPreStep`

Checked: read the RCS sustain and per-axis attack/close code (SoundPreSteps.cpp 393-435 and 457-484), the engine sustain (328-347), `XRSoundEngine::ComputeVariableVolume` (XRSoundEngine.cpp 513-525), the in-place volume update in `XRSoundEngine::PlayWav` (256), and the config default and validation (XRSoundConfigFileParser.cpp 22, 204). Confidence high on the edge and sustain logic (all those lines read). Not read: the irrKlang play/stop internals, the Orbiter pre-step call site (I assume it runs once per simulation step; not verified), and the body of `AddDefaultSound`. Grep of `Sound/XRSound` for biome, stinger, crossfade, priority, polyphony and voice limit returned no hits, so this donor has none of those. camera_scope: n/a (sound).

Best transferable idea: a loop whose volume follows a 0..1 intensity, plus one-shot attack and release cues on crossings of a trigger level, with a re-arm band below the trigger so jitter cannot retrigger them.
Decision (proposed): adapt — take the edge-plus-sustain shape for charge, guard-hold and stamina-drain cues; reject the twelve-direction RCS layout, which has no duel counterpart; fix the missing re-arm band (defect D1 below) in the sketch.
Acceptance: a client-only test feeds the level sequence 0, 0.25, 0.15, 0.25, 0.05 and asserts exactly one attack (at 0.25) and one release (at 0.05), with no release at 0.15; a sequence that never reaches 0.20 asserts no attack and no release.

## 1. Mechanism

- Two cue families share one pattern. (a) A looping sustain whose volume follows an intensity level from 0 to 1. (b) An edge cue: an attack sound once when the level rises to the trigger, and a release sound once when it falls back.
- Order of steps per simulation step, RCS path (SoundPreSteps.cpp 393-433): read the rotation and linear attitude levels (402-403); step each of the twelve per-direction attack objects (407); sum the absolute values of the six axis levels and clamp the total to 1.0 (410-416); if the total is above the config minimum (422), start or re-volume a looping sustain at a volume lerped from 0.20 to 1.0 by the total (424-428); otherwise stop the sustain (433).
- Per-direction attack (457-484), for each signed direction: if the level is at or above 0.20 (462) and the cue is armed, play the attack once at a volume lerped from 0.20 to 1.0 by the level (466-467), then disarm (468). If the level is below 0.20 (472-474): if the cue was disarmed, play the release at fixed volume 1.0 (478); then re-arm (482). The attack sound is never stopped mid-play (480 comment).
- Engine path (328-347): for each engine group, if the group level is above 0 (336), start or re-volume a looping sustain at a volume lerped by the level (338, 343); otherwise stop (346). The main group uses volume range 0.20 to 1.0 (VesselXRSoundEngine.cpp 587); retro 0.10 to 0.60 (588).
- Volume lerp (XRSoundEngine.cpp 513-525): clamp the level to 0..1, lerp min to max, return 0 if the result is under 0.02.
- Playing an already playing slot only changes its volume (XRSoundEngine.cpp 256). So a sustain is one voice per group, and re-calling it each step is cheap.
- Tick: Orbiter calls `clbkPreStep` on each simulation step (per frame in the simulation, not a fixed audio clock). The call site was not read.

## 2. Key functions

- `RCSDefaultSoundPreStep::clbkPreStep`: `/mnt/frankendom-donors/orbitersim-orbiter/Sound/XRSound/src/SoundPreSteps.cpp` 393-435. Sums the six axis levels and runs the sustain gate.
- `RCSDefaultSoundPreStep::RCSAttackForAxisSound::clbkPreStep`: `/mnt/frankendom-donors/orbitersim-orbiter/Sound/XRSound/src/SoundPreSteps.cpp` 457-484. Holds the edge logic (arm at 0.20, release on fall, re-arm).
- `EngineDefaultSoundPreStep::clbkPreStep`: `/mnt/frankendom-donors/orbitersim-orbiter/Sound/XRSound/src/SoundPreSteps.cpp` 328-347. The level-driven sustain for main, retro and hover groups.
- `XRSoundEngine::ComputeVariableVolume`: `/mnt/frankendom-donors/orbitersim-orbiter/Sound/XRSound/src/XRSoundEngine.cpp` 513-525. The shared lerp and 0.02 cut-off.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Edge cue: attack once when the level rises to a trigger, disarm, re-arm when it falls | Trigger 0.20 (theirs, SoundPreSteps.cpp 353) |
| Release cue on fall, fixed volume | Release volume 1.0 (theirs, SoundPreSteps.cpp 478) |
| Level-to-volume lerp with cut-off | Lerp min 0.20 for attack and RCS sustain (theirs, 424, 466); cut-off 0.02 (theirs, XRSoundEngine.cpp 525) |
| Sustain gate: play only above a minimum total | Minimum 0.05 (theirs, XRSoundConfigFileParser.cpp 22; validated 0..1 at 204) |
| Total intensity clamp | Clamp 1.0 (theirs, SoundPreSteps.cpp 415) |
| Per-group volume range | Main 0.20..1.0 (theirs, VesselXRSoundEngine.cpp 587); retro 0.10..0.60 (588); hover 0.20..1.0 (not read beyond the constructor line) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's edge logic, the lerp with 0.02 cut-off, and the sustain gate, and takes one signed level instead of six axes times two signs. It omits the playback-type distance and pressure fades (the RCS sustain uses BothViewMedium, not read in detail here), the separate StopWav call (the sketch returns loopVolume 0 instead, with the same effect), the rule that an attack always finishes (the sketch only returns events; the caller must not cut the attack), and the constructor-set volume ranges. It differs from the donor on one point on purpose: the release fires when the level falls below REARM_BELOW (0.12), not below the trigger (0.20), which is the defect fix D1.

```ts
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
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 /tmp/sm021-orbiter-cue.ts` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/cues.ts` (new; client-side cue mapper). Sound is client-only, so this module reads a level from engine state and never writes engine state. The Frankendom repo was not read in this pass; the file does not yet exist as far as this note knows (not verified).
- Parity-checklist row 12 (combat sound cues). The list hint said row 14 (HUD); the cue belongs under row 12, so row 12 is cited.
- Reuse tag: adapt-idea (MIT; fresh code, shape only; the donor's RCS layout is not carried over)
- Brief rule served: sound-music fold-in (layering: sustain plus one-shot edges); sound stays client-only; licence read and stated exactly (rule 6)

## 6. Gaps and risks

- Defect D1 (kept the idea, fixed the defect): the donor uses one threshold (0.20) both to arm the attack (462) and to re-arm it (474-482). A level that hovers near 0.20 fires an attack and a release on every crossing, so a duel would stutter with attack and release pairs. Fix: a separate re-arm level (REARM_BELOW = 0.12) in the sketch, so the release fires once, below the band.
- The release fires only after a real attack (474). A feint that peaks below 0.20 gives no sound at all. That is the donor's choice and is kept; the Acceptance test covers it.
- Ruling check (one engine, server-verified kills): the cue must not decide damage or state. If the level comes from a server snapshot, cue timing lags by the snapshot delay (how Frankendom sends intensity was not read). Fix: drive the local player's level from the predicted local state; accept snapshot lag for other players.
- MAX_ATTACKERS = 3: the donor has no voice cap and no priority (grep: no hits). Each cue is one slot (XRSoundEngine.cpp 256). The client needs its own voice budget for many-on-one fights; the donor does not show one.
- The RCS layout (twelve per-direction objects) has no duel counterpart. Only the one-level edge pattern transfers.
- MIT: adapted in shape. The sketch was written fresh from the described mechanism.
- Not read: irrKlang internals, the Orbiter pre-step call site, `AddDefaultSound`, the sustain fade path for BothViewMedium beyond its constant.
- Other sound-music mechanisms in the same donor (not scored in this note, candidates for other cells): random ambience timers on realtime (DefaultSoundGroupPreSteps.cpp 174-178, 202), the no-immediate-repeat file pick (Utils/FileList.cpp 133), and the music scheduler with 2 s gaps (611, 656). The donor has no biome beds, stingers, crossfades or voice caps.

Reuse tag: adapt-idea (MIT; fresh code, shape only)
Brief rule served: sound-music fold-in (layering: sustain plus one-shot edges); sound stays client-only; licence read and stated exactly (rule 6)

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN. 0.20 trigger, 12 attack objects, sum of 6 axes clamp 1.0, 0.05 sustain min and validation, lerp 0.20..1.0 and 0.02 cutoff, main 0.20-1.0 / retro 0.10-0.60, release 1.0, arm/re-arm at same 0.20 (defect real), MIT licences all match.
- No errors or missed items found.
