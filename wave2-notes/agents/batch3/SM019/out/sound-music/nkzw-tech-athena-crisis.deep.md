# nkzw-tech-athena-crisis (sound-music, cell 3)

Donor: `/mnt/frankendom-donors/nkzw-tech-athena-crisis/ui/AudioPlayer.tsx` (with `hera/audio/Music.tsx`, `hera/Unit.tsx`, `athena/map/Configuration.tsx`, `athena/info/MovementType.tsx`) | Licence: MIT (`LICENSE.md` line 3, "The MIT License (MIT)", titled "Source Code License"; audio assets are not in this tree, so their terms are not known) | TypeScript (React, Howler) | symbol `AudioPlayer.play` / `AudioPlayer.stop` / `Unit` movement `playSound`

Checked: Read in full: `ui/AudioPlayer.tsx` (246 lines, the hint file), `hera/audio/Music.tsx` (164 lines), `athena/info/Music.tsx` (105 lines: 85 sound names, 17 song names), `ui/Audio.tsx` (225 lines: placeholder map), `ui/types/athena-crisis-audio.d.ts` (6 lines), `athena/map/Configuration.tsx` 1-35, `athena/info/MovementType.tsx` 1-20, `hera/animations/Animation.tsx` 55-80, `hera/Unit.tsx` 495-520 and 620-735 (the movement block; 520-620 and 735-end not read). Callers grepped in `zeus dionysus hermes artemis deimos apollo ares athena hera ui offline`: the biome-music hook and `usePlayMusic` are called only from `hera/editor/MapEditor.tsx` 295-296 and `hera/campaign/CampaignEditor.tsx` 360-361. No in-game call site for the biome song was found in those directories, so in this snapshot the biome set is live only in the editors. Confidence: high on the AudioPlayer and the movement loop (read end to end, callers checked); medium on the biome-to-song path (call site limited to editors in this snapshot). Not read: the build module `athena-crisis:audio` that supplies the real audio (`ui/Audio.tsx` holds empty placeholder files), Howler internals, `hera/Unit.tsx` 520-620. camera_scope: not applicable (sound).

Best transferable idea: a looping movement sound follows a unit's path; on arrival one timer fires after a delay, and in that same callback the loop starts a one-third-step fade-out and the end tail starts (the delay is a quarter step for a quarter-delay end sound, zero for other end sounds, two thirds of a step when there is no end sound), with one voice per cue name so a name never overlaps itself.
Decision (proposed): adapt - take the timing rule (one arrival timer: loop fade of a third of a step and the tail start together, delay a quarter step or zero, two thirds with no tail; silent at an infinite rate) for hero and creature step cues; Frankendom needs a global voice cap and priority per class, which this donor does not have, so those are added.
Acceptance: when a hero moves along a path its step loop does not restart on each step, starts a third-step fade-out and the end cue at the same moment, both after the arrival delay (a quarter step for a quarter-delay end sound, zero otherwise, two thirds of a step with no end sound); a client test asserts those times from the step length.

## 1. Mechanism

- One player object holds one `Howl` per name (`instances` map, `ui/AudioPlayer.tsx` 20; created on first use, 200-225). Sound names (the `Sounds` map only, not songs) are preloaded in idle time after first use (`preload`, 28-37, 32); songs are created on first play. One current song at a time (21).
- Song change (`play`, 39-71): if the requested song is already current, return (42-44). Otherwise `stopCurrentSong` fades the old song out over 250 ms and stops it (46, 108-117, 112-113). The new song is set as current (47-48). If it is not already playing, it fades in from 0 to the volume over 250 ms (66-67). So the two songs overlap for 250 ms: a fixed-time crossfade. Nothing else changes.
- Sound (`playSound`, 73-99): a `rate > 1` on 'Attack/MG' swaps to 'Attack/MGFast' and sets the rate to 1 (74-77). Fireworks and talking cues play at 0.66 of the sound volume (80-81). Rate `<= 0`, Infinity, or zero volume is silent (83-85). If the sound is already playing it seeks to 0 and plays again (92-94), so a name never overlaps itself. Playback speed is set with `instance.rate(rate)` (97).
- Loop continue (`playOrContinueSound`, 101-106): plays only when not already playing (103).
- Stop (`stop`, 108-117): cancels any pending fade handler (110), then fades out over `duration` (default 250) and stops on the fade's end (112-113). A duration of 0 or a sound that is not playing stops at once (114-115).
- Loops: Howl `loop` is on for songs and 'Talking/' cues only (211). Other sounds play once.
- Movement loop (`hera/Unit.tsx` 620-735): `rate` = normal animation duration / this animation's duration (628). `stepDuration` = `UnitMoveDuration` x 1.5 for slow sprites, else x 1 (629). `third` = step / 3 (630), `quarter` = step / 4 (631). On each step, if the tile's movement type changed, the old loop stops with a third-step fade (694-696, 695). If the animation has a start sound it plays with playOrContinue (700-702). The type's loop plays with playOrContinue when the path still has steps or the type has no end sound (706-708, 707). When the path ends (710), a timer runs: the loop stops with a third-step fade (713), and if there is an end sound it plays with playOrContinue after a delay (714-716, 715). The delay is zero, or a quarter step when the end sound is the type's own and `endDelay` is 'quarter' (718-720, 719). With no end sound the loop stops at two thirds of a step (722).
- Movement types (`athena/info/MovementType.tsx`): each type names its loop sound, its end sound, and its `endDelay`. Tread has 'none' (18); Air has 'quarter' (20).
- Timing constants (`athena/map/Configuration.tsx`): `AnimationSpeed` 180 (3). Normal: animation duration 360 (6), unit move duration 180 (11). Fast: animation duration 90 (18), unit move duration 90 (23). Instant: both 0 (27 and 32). So the playback rate is 1 normally, 4 when fast, and Infinity when instant, and the silent guard at 83 catches the instant case.
- Presentation cues: attack animation sounds start after the initial delay (`hera/animations/Animation.tsx` 70-74, 72-74). A crystal plays its cue once each time the crystal changes (`hera/animations/CrystalAnimation.tsx` 30).
- Visibility and music start (`hera/audio/Music.tsx`): music start is deferred with a timer (77-82). The delay is 3000 ms if an intro video is playing, else 100 ms (79-81, the values are on lines 80-81, not receipted). The song is looked up by route when the timer fires (78). Hiding the page pauses after 100 ms (58-61), so navigation does not pause; the pause is temporary (59) and resume happens when the page is visible again (52-55).
- Route registry (`hera/audio/Music.tsx` 18-38): each route sets its song on mount (32) and removes it on unmount (34). Fallback song is 'hestias-serenade' (17).
- Biome table (`hera/audio/Music.tsx` 86-136): tag 'eos-dawn' returns its song (87-88), tag 'gaias-rise' likewise (89-90). Tag 'b-side' picks the alternate set per biome (93-114). Otherwise the normal set (116-135). Seven biomes (Grassland, Desert, Snow, Swamp, Spaceship, Volcano, Luna), each with two songs (14), plus the two tag songs (16), plus the fallback 'hestias-serenade' (17): 17 song names in total (`athena/info/Music.tsx` 88-105). Each switch ends with `satisfies never` and throws on an unknown biome (110-111, 132-133).

## 2. Key functions

- `AudioPlayer.play`: `/mnt/frankendom-donors/nkzw-tech-athena-crisis/ui/AudioPlayer.tsx` 39-71 (same-song guard 42-44; fade-in 66-68).
- `AudioPlayer.playSound`: same file, 73-99 (MG fast swap 74-77; rate guard 83-85; restart 92-94).
- `AudioPlayer.stop`: same file, 108-117 (fade and one-shot stop 111-113).
- Movement loop block: `/mnt/frankendom-donors/nkzw-tech-athena-crisis/hera/Unit.tsx` 628-631 (rate, step, thirds) and 688-726 (`playSound` inside the movement, the stop and the tail timer).
- `biomeToSong`: `/mnt/frankendom-donors/nkzw-tech-athena-crisis/hera/audio/Music.tsx` 86-136.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant |
|---|---|
| Song crossfade: old fades out, new fades in, over the same time | 250 ms each (`ui/AudioPlayer.tsx` 67; default 108) |
| One voice per name: replay restarts it | `seek(0)` (93) |
| Rate-scaled playback, silent at infinite rate | rate = 360 / animation duration (`Unit.tsx` 628); guard 83 |
| Loop fade-out on stop | one third of a step (`Unit.tsx` 630, 695, 713) |
| End tail delay | one quarter of a step, or zero (`Unit.tsx` 631, 719) |
| Stop with no end sound | two thirds of a step (`Unit.tsx` 722) |
| Step length | `UnitMoveDuration`: 180 normal, 90 fast, 0 instant (`athena/map/Configuration.tsx` 11, 23, 32) |
| Volume for fireworks and talking | 0.66 (`ui/AudioPlayer.tsx` 81) |
| Music start delay | 100 ms, or 3000 ms while an intro video plays (`hera/audio/Music.tsx` 80-81; not receipted) |
| Visibility pause delay | 100 ms (`hera/audio/Music.tsx` 58-61) |

Units: the step and fade values are milliseconds (they are the `setTimeout` delays and `fade` arguments in the donor).

## 4. TypeScript sketch

simplified: keeps the one-voice-per-name rule (a play restarts the voice and cancels a fade), the continue-only-if-not-playing loop rule, the fade-out stop with a zero-duration immediate stop, the rate guard (zero or less, Infinity, zero volume silent), and the movement timing (loop fades over a third of a step; tail at a quarter step or at once; no tail stops at two thirds). It omits the Howl backend, the per-name map and preload, the 'fade' event callbacks, the pause and visibility handling, the song crossfade (one song at a time is not modelled), the Attack/MG fast swap and the 0.66 volume rule. The donor uses `setTimeout` for the movement timing; the sketch returns the times instead, so it has no timers. The `tick` method stands in for the audio backend's fade.

```ts
// Licence: MIT (donor; permissive). Clean-room sketch written from the described mechanism; donor lines are not copied.
// clean-room
interface Voice {
  playing: boolean;
  gain: number;
  fadeFrom: number;    // gain when the fade started
  fadeLeftMs: number;  // time left in the fade; 0 = not fading
  fadeTotalMs: number;
}

// One voice per cue name: playing a name again restarts it, so a name never overlaps itself.
class CueVoices {
  private readonly voices = new Map<string, Voice>();

  private voice(name: string): Voice {
    let v = this.voices.get(name);
    if (v === undefined) {
      v = { playing: false, gain: 0, fadeFrom: 0, fadeLeftMs: 0, fadeTotalMs: 0 };
      this.voices.set(name, v);
    }
    return v;
  }

  // A rate of zero or less, or Infinity (instant mode), or zero volume is silent.
  play(name: string, rate: number, volume: number): void {
    if (!(rate > 0) || rate === Infinity || volume <= 0) return;
    const v = this.voice(name);
    v.playing = true;
    v.gain = volume;
    v.fadeLeftMs = 0; // a restart cancels any fade in progress
  }

  // Start only if not already playing, so a loop is not restarted on every step.
  playOrContinue(name: string, rate: number, volume: number): void {
    if (!this.voice(name).playing) this.play(name, rate, volume);
  }

  // Fade out over fadeMs; 0 stops at once.
  stop(name: string, fadeMs: number): void {
    const v = this.voice(name);
    if (!v.playing) return;
    if (fadeMs > 0) {
      v.fadeFrom = v.gain;
      v.fadeLeftMs = fadeMs;
      v.fadeTotalMs = fadeMs;
    } else {
      v.playing = false;
      v.gain = 0;
    }
  }

  // Called each frame with the elapsed milliseconds.
  tick(dtMs: number): void {
    for (const v of this.voices.values()) {
      if (v.fadeLeftMs <= 0) continue;
      v.fadeLeftMs = Math.max(0, v.fadeLeftMs - dtMs);
      v.gain = v.fadeFrom * (v.fadeLeftMs / v.fadeTotalMs);
      if (v.fadeLeftMs === 0) {
        v.playing = false;
        v.gain = 0;
      }
    }
  }

  gainOf(name: string): number {
    return this.voice(name).gain;
  }
}

// Timing for a unit reaching the end of its path. stepMs is one tile's move time.
// The loop fades out over a third of a step; the end tail fires after a quarter step
// (if the tail has the quarter delay) or at once; with no tail the loop stops at two thirds of a step.
function arrivalTiming(stepMs: number, tail: { quarterDelay: boolean } | null) {
  const third = stepMs / 3;
  const quarter = stepMs / 4;
  return {
    loopFadeMs: third,
    loopStopAtMs: tail ? (tail.quarterDelay ? quarter : 0) : third * 2,
  };
}

// Playback rate from two durations: normal 360 / 360 = 1; fast 360 / 90 = 4; instant 360 / 0 = Infinity (silent).
const rateFor = (globalDurationMs: number, localDurationMs: number) =>
  globalDurationMs / localDurationMs;

const cues = new CueVoices();
cues.playOrContinue('Movement/Tread', rateFor(360, 360), 1);
const timing = arrivalTiming(180, { quarterDelay: false });
cues.stop('Movement/Tread', timing.loopFadeMs);
cues.play('Movement/TreadEnd', rateFor(360, 360), 1);
cues.tick(30); // 30 ms into a 60 ms fade
const midFade = cues.gainOf('Movement/Tread'); // 0.5

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/sound-cues.ts` (new client-only module): one voice per cue name, loop-while-moving with an arrival tail, and the timing rule derived from the step length. Parity-checklist row 12 (combat sound cues). The step-cue timing is also tied to hero animation (row 6), but the sound rule sits in row 12.
- Reuse tag: rewrite-from-idea (MIT; code may be adapted, sketch written clean-room from the mechanism)
- Brief rule served: 8 (target file and parity row named); 7 (licence read: MIT, permissive)

## 6. Gaps and risks

- No global voice cap and no priority. Each name has its own voice (`ui/AudioPlayer.tsx` 20, 200-225) and nothing counts or limits the total. Frankendom needs a cap per class (hit, spell, ambience, stinger) with priority; this donor gives neither.
- No layering and no ducking. There is one current song (21), and effects do not lower the music. The song crossfade is a fixed 250 ms overlap (67, 112), not a per-zone length.
- Biome beds are tag-keyed and live only in the editors in this snapshot (`hera/editor/MapEditor.tsx` 295). Frankendom should key beds on zone data (the zone is data; the biome is not). The fallback song and the seven-biome table are data, not engine rules.
- Possible defect, not run: `stop` registers a one-shot 'fade' handler (112-113), and `playSound` does not cancel it (96-98; `play` cancels it only for songs via `off('fade')` at 65). A sound restarted during its own fade-out could be stopped by the old handler. Fix: cancel the pending fade handler in `playSound` too, and test restart during a fade.
- Possible defect, not run: `play` sets `currentInstance` and `currentSong` before it checks volume (46-53). If volume is zero the song is recorded but silent. A later `play` of the same song returns early (42-44), so recovery comes only from `setVolume` (176-188) or `resume` (144-161). Fix: check volume before recording, or keep it and test the recovery.
- Instant mode is silent by the rate guard (83) and by the zero-duration stop (114-115). Keep both in the Frankendom port: an instant setting must never make a cue loop forever.
- `getInstance` throws `No source for` (203-205) for an unknown name at the call site. Frankendom should fail closed (log, no sound) rather than throw in the middle of a fight step.
- Visibility handling (`hera/audio/Music.tsx` 46-64) is client-only and does not touch fight state; keep it that way.
- Licence MIT: code may be adapted. The sketch was written from the described mechanism and copies no donor lines.

Reuse tag: rewrite-from-idea (MIT; code may be adapted; clean-room sketch)
Brief rule served: 8 (target file and parity row named); 7 (licence, permissive)

## Checker findings (Sonnet 5.5 medium, 2026-10-12)

Verdict: MINOR
- Error (confirmed): Best idea and Acceptance said the tail starts a quarter step after the loop fade begins. In Unit.tsx 710-723 the loop stop (third-step fade) and the end sound are in the same timer callback, so both start at the same delay (0, quarter step, or 2/3 step with no end sound). Section 1 and the sketch (`loopStopAtMs`) were already right; headline, Decision and test corrected.
- Error (confirmed): "all names preloaded" - preload loops over `Sounds` only (AudioPlayer.tsx 32), not songs.
- Error (confirmed): "7 biomes x 2 + 2 tag songs = 17" is 16; the 17th is the fallback 'hestias-serenade'.
- Missed: MovementType Amphibious falls back to Tread on non-sea tiles (MovementType.tsx 29, Unit.tsx 690-692); animation.endSound override rule (note mentions only the second).

Fixed 2026-10-12: Best idea, Decision, Acceptance, preload sentence, song count. Sketch unchanged (it already models one timer), so no typecheck rerun.
