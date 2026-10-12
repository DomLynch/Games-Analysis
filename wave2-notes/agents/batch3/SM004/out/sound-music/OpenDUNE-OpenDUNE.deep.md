# OpenDUNE-OpenDUNE (sound-music, cell 3)

Donor: `/mnt/frankendom-donors/OpenDUNE-OpenDUNE/src/audio/sound.c` | Licence: GPL-2.0 (`COPYING`, "GNU GENERAL PUBLIC LICENSE, Version 2, June 1991"; no "or later" wording in the file read) | C | symbol `Voice_PlayAtTile` (with `Sound_Output_Feedback`, `Sound_StartSpeech`, `Driver_Voice_Play`, and the battle-music branch in `opendune.c`)

Checked: The hint file `src/audio/midi_munt.c` is the MT-32 emulator output driver (`#include <mt32emu/mt32emu.h>`, line 1 of the header comment), not the mechanism. The mechanism was read in these places: `src/audio/sound.c` 27-28 and 30-51 (speech and sound drivers), 85-105 (`Music_Play`), 134-177 (`Voice_PlayAtTile`, `Voice_Play`), 333-438 (`Sound_StartSound`, `Sound_Output_Feedback`, `Sound_StartSpeech`); `src/audio/driver.c` 190-297 (`Driver_Sound_Play`, `Driver_Voice_Play`), 456-465 (`Driver_Music_FadeOut`); `src/audio/mt32mpu.c` 672-692 (the volume ramp step) and 1015-1043 (`MPU_SetVolume`); `src/opendune.c` 1050-1090 (the music director inside the normal-play loop; the enclosing block was read only partly) and 112 (`g_musicInBattle`); `src/unit.c` 2692-2743 (the attack alert that sets the battle flag; 2692-2732 read in part); `src/tools.c` 292-304 (`Tools_RandomLCG_Range`, inclusive range); `src/tile.c` 88-94 (`Tile_GetDistancePacked`); `src/timer.c` 37 and 363 (grep); `src/audio/sound.h` 19 (grep). Candidates opened: 10 files plus COPYING. Callers checked: `Driver_Music_FadeOut` callers are cutscene.c 559, 898, 945, 1051 and opendune.c 707 (found by grep; only the fade call sites read); `Sound_StartSpeech` callers are cutscene.c 268, opendune.c 1069, sound.c 408, gui.c 711 and 1834; `Music_Play` has callers in opendune.c and cutscene.c. Not read: the MPU interrupt caller (the call rate behind the ramp), the midi_*.c backends, the options screen that toggles music, the declaration of `l_timerNext`, and the `Sound_Output_Feedback` table contents. Confidence: high on the channel and speech rules and on the battle-flag loss (read from code, not run); medium on the exact fade duration in milliseconds (it depends on the call rate, which was not read). Camera scope: not applicable (sound).

## 1. Mechanism

Three layers, all read in order of the code path.

**Music (sound.c 85-105; driver.c 456-465).** `Music_Play(id)` returns at once if id is 0xFFFF, id >= 38, or id equals the last id (89). Otherwise it records the id (91). If the track file changes, it stops the speech channel (`Driver_Voice_Play(NULL, 0xFF)`, 97), stops music, reloads the files and starts the track through the driver (104). Volume is set at once with time 0 (50, `((volume & 0xFF) * 90) / 256`). There is no fade-in. `Driver_Music_FadeOut` sets the target volume to 0 over 2000 ms (464). A fade-out only lowers the target; the next `Music_Play` starts at full volume.

**Speech and voice priority (sound.c 134-160, 333-354; driver.c 255-282).** Every event has a cue id (0-119). `Voice_PlayAtTile(id, position)` (134) first returns if the id is out of range or sound is off (139-140). If the position is not (0,0) (143), the volume is the packed tile distance from the minimap position (144), clamped at 64 (145), then `255 - d*255/80` (147). The cue then takes the speech path only when all of these hold: voices are enabled, the id maps to a loaded clip, and the clip's priority is at least the channel priority `s_currentVoicePriority` (152). If so, the channel priority is set (153) and the clip plays at full volume (156; the distance value is not passed). Otherwise the same id plays as a sound effect at the distance volume (158). This is a fallback chain: voice, then sound effect, not a drop.

Inside the driver (driver.c 255-282), `Driver_Voice_Play` keeps its own priority `l_currentPriority` (257). It is reset to -1 on the first call after the clip has ended (269). A new clip is refused if its priority is below the current one (271); a stop request uses priority 0x100, which always wins (264). Equal priority replaces the current clip.

**Speech queue (sound.c 333-438).** `Sound_StartSound(id)` plays a clip only when its priority is not below `s_currentVoicePriority` (335); it plays with priority 0xFF (340). In the other direction, `Sound_Output_Feedback(id)` loads a sentence of up to `NUM_SPEECH_PARTS` = 5 ids (27, sound.h 19) into `s_spokenWords` only when the queue is empty (400-406), then calls `Sound_StartSpeech` (408). `Sound_StartSpeech` returns at once while a clip plays (420). When it is idle it resets the channel priority to 0 (422), plays the head of the queue (426) and shifts the queue. A new feedback that arrives while the queue holds words is not appended: the words are dropped and no text is set on the speech path (the text is set only in the sound-off branch, 388).

**Sound effects (driver.c 190-213).** Four sound buffers are used in round robin (`s_bufferSoundIndex` 212). A new effect stops whatever was in its slot, playing or not (201-205). Volume is the same `*90/256` scale (210). With sound off, `Driver_Sound_Play` still plays ids 0 and 1 (197); the feedback path calls it with sound off (385-386).

**Battle music director (opendune.c 1069-1087, inside the normal-play loop).** Each pass: if no clip is playing and `Sound_StartSpeech` starts nothing (1069), then: music off, play id 2 and clear the flag (1070-1073); flag > 0, play a random battle track 17-22 (1074-1075), set the flag to -1 (1077) and arm the rest timer `l_timerNext = g_timerGUI + 300` (1076); otherwise set the flag to 0 (1079) and, when `g_timerGUI > l_timerNext` and no track is playing (1080-1081), play a random calm bed 8-16 (1082) and arm the rest timer (1083). The battle flag is set to 1 by an enemy unit's attack alert when the flag is 0 (unit.c 2716), and the alert has a per-unit cooldown of 8 (2715, 2743).

## 2. Key functions

- `Voice_PlayAtTile` (sound.c 134-160): the distance volume, the voice-or-sfx route, the priority check.
- `Sound_Output_Feedback` (sound.c 361-409) and `Sound_StartSpeech` (416-432): the speech queue and its channel reset.
- `Driver_Voice_Play` (driver.c 255-282): the channel's own priority, reset when idle.
- `Driver_Sound_Play` (driver.c 190-213): the four-slot round robin.
- `Music_Play` (sound.c 85-105) and `Driver_Music_FadeOut` (driver.c 456-465): track switch and fade-out.
- `MPU_SetVolume` (mt32mpu.c 1019-1043) and the ramp step (672-692): timed volume target, used for the fade-out.
- The director in `opendune.c` 1069-1087 and the alert in `unit.c` 2715-2743.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Priority channel for one clip at a time | one channel, priority cleared when the clip ends (driver.c:269); stop uses 0x100 (:264); equal replaces (:271 refuses only lower) |
| Demote to sound effect when the channel is taken | speech-or-sfx route (sound.c:152, 158) |
| Priority scale | per-cue values from `g_table_voices[index].priority` (table not read); top value used for a direct play is 0xFF (sound.c:340) |
| Positional gain | distance in tiles (tile.c:93 `>> 8`); clamp 64 (sound.c:145); `255 - d*255/80` (:147) |
| Sound-effect pool | 4 slots (driver.c:212) |
| Speech queue | 5 parts (sound.h:19) |
| Sound-effect volume | `((volume & 0xFF) * 90) / 256` (driver.c:210) |
| Fade-out | target 0 over 2000 ms (driver.c:464); the ramp accumulator adds 83 (= 10000/120) per call (mt32mpu.c:677) |
| Bed rotation | rest 300 GUI ticks (opendune.c:1083); bed 8-16 (:1082); battle 17-22 (:1075); alert cooldown 8 (unit.c:2743) |
| Random range | inclusive min..max (tools.c:303) |

## 4. TypeScript sketch

simplified: the sketch keeps the one-clip channel with priority, the fallback of a lower clip to a positional sound effect, the four-slot sound pool (as a count only) and the bed director with a stinger, a rest timer and a speech gate. It fixes four things, each marked in the code: positional gain is computed with one clamp that reaches 0 (80), speech also takes distance, the battle state is kept while its track plays, and a bed re-rolls away from the track that just ended (bounded, 8 extra draws). It omits the speech queue (five-part words), the mute rule for ids 0 and 1, the fade (the sketch does not model a timed ramp), the MIDI and driver backends, and the sound-off text path. The `play` callback must restart a track even when its id repeats, because the donor's `Music_Play` refuses a repeated id (sound.c:89).

```ts
// Licence: GPL-2.0 (donor COPYING, version 2). Clean-room sketch of the mechanism, written from the described steps, not a translation of the donor.

// Cue id: one id is a speech clip if the cue has one, otherwise a sound effect with the same id.
export interface Cue {
  id: number;
  hasClip: boolean;
  prio: number;        // speech priority, used only when hasClip
  essential: boolean;  // still audible when sound is switched off (for example UI clicks)
}

export type Route = 'voice' | 'sfx' | 'dropped';

// Gain falls linearly from 1 at the listener to 0 at clampAt tiles. Fixes the donor's clamp-64 / divide-80 mismatch.
export function positionalGain(distanceTiles: number, clampAt = 80): number {
  const d = Math.min(Math.max(distanceTiles, 0), clampAt);
  return 1 - d / clampAt;
}

export class CueMixer {
  private voicePrio = -1;               // priority of the speech channel now playing, -1 when idle
  private readonly sfxSlots: (number | null)[] = [null, null, null, null];
  private sfxNext = 0;

  constructor(
    private readonly voiceBusy: () => boolean,   // true while a speech clip is playing
    private readonly soundOn: boolean,
  ) {}

  play(cue: Cue, distanceTiles: number): { route: Route; gain: number } {
    if (!this.soundOn && !cue.essential) return { route: 'dropped', gain: 0 };
    if (!this.voiceBusy()) this.voicePrio = -1;    // the channel frees when the clip ends
    if (cue.hasClip && cue.prio >= this.voicePrio) {
      this.voicePrio = cue.prio;
      return { route: 'voice', gain: positionalGain(distanceTiles) };  // speech also takes distance (the donor does not)
    }
    // Demoted to a sound effect: four slots, the oldest slot is overwritten whether or not it is still playing.
    this.sfxSlots[this.sfxNext] = cue.id;
    this.sfxNext = (this.sfxNext + 1) % 4;
    return { route: 'sfx', gain: positionalGain(distanceTiles) };
  }
}

export type Battle = 0 | 1 | -1;  // 0 idle, 1 stinger requested, -1 stinger track is playing

// Bed director: one stinger on the first alert of a fight, then calm beds with a rest gap. Speech gates new decisions.
export class BedDirector {
  battle: Battle = 0;
  private nextAt = 0;
  private last = -1;

  constructor(
    private readonly restTicks: number,
    private readonly bedRange: readonly [number, number],
    private readonly stingerRange: readonly [number, number],
    private readonly rng: (lo: number, hi: number) => number,  // inclusive range
  ) {}

  // Called on a unit alert. Only an idle director starts a stinger.
  requestStinger(): void {
    if (this.battle === 0) this.battle = 1;
  }

  // One frame. Returns the track to start, or null. The caller must restart a track even when the id repeats.
  tick(speechBusy: boolean, musicPlaying: boolean, now: number): number | null {
    if (speechBusy) return null;                          // speech holds back new music, it does not change the track
    if (this.battle === 1) {
      this.battle = -1;
      this.nextAt = now + this.restTicks;
      return this.pick(this.stingerRange);
    }
    if (this.battle === -1 && musicPlaying) return null;  // keep the battle state while its track plays
    this.battle = 0;
    if (!musicPlaying && now > this.nextAt) {
      this.nextAt = now + this.restTicks;
      return this.pick(this.bedRange);
    }
    return null;
  }

  private pick(range: readonly [number, number]): number {
    let t = this.rng(range[0], range[1]);
    // Avoid the track that just ended: bounded re-roll (at most 8 extra draws).
    for (let k = 0; k < 8 && t === this.last && range[1] > range[0]; k++) t = this.rng(range[0], range[1]);
    this.last = t;
    return t;
  }
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, with `export {};` appended: exit 0.

## 5. Lands in

- TARGET `src/fight/cue-mixer.ts` (new, client-only: the speech channel, the sound-effect pool and the bed director are client code; the server sends events and the client decides how to sound them). Kills and loot stay server-verified; a cue never changes an outcome.
- Parity-checklist row 12 (combat sound cues). The feedback text that the donor shows only when sound is off is a HUD concern (row 14), not part of this note.
- Reuse tag: adapt (GPL-2.0: clean-room; the sketch is written from the mechanism, with the four defects below fixed)
- Brief rule served: 1 (one engine: the client sounds the engine's events and holds no state the server reads)

## 6. Gaps and risks

- Not in this donor: layered music, a stinger that layers over a bed, per-biome ambience beds, border crossfades. The fade is fade-out only (driver.c 464), and the music start has no fade-in (sound.c 50 with time 0). The only crossfade-like thing is the 2 s fade-out.
- Defect (battle state, read from code): `opendune.c` 1079 sets the flag to 0 on every frame that is not a battle start, so the -1 "battle music active" state set at 1077 lasts one frame, although the declaration comment (opendune.c 112) says -1 means the battle music is still active. Each new unit alert (unit.c 2716, with the 8-tick per-unit cooldown at 2743) can then start another battle track (1075), and a different random pick restarts the track. Fix: keep -1 while `Driver_Music_IsPlaying()` (the sketch's `tick` does this).
- Defect (repeat pick, read from code): a random bed or battle pick that equals the id last played hits `Music_Play`'s same-id guard (sound.c 89), so nothing plays until the next rest cycle. Fix: re-roll away from the last id, or force a restart when the same id is wanted (the sketch re-rolls, bounded at 8 draws).
- Defect (positional gain, read from code): the distance is clamped at 64 (sound.c 145) but divided by 80 (147), so a distant clip never goes below 255 - 64*255/80 = 51 (about 20 percent) instead of silence. The intent (silence at 64 or 80) is not confirmed by the donor. Fix: one clamp at the divisor (the sketch uses 80).
- Defect (zero tile): a position of exactly (0,0) is read as "no position" and plays at full volume (sound.c 143 and 142). Fix: an explicit flag instead of a zero test (the sketch takes a distance, so it avoids the test).
- Gap: the speech path plays at full volume whatever the distance (sound.c 156; the volume is computed at 144-147 and used only on the sound-effect path at 158). The sketch applies the gain to both routes.
- Speech queue drops: a feedback that arrives while five-part words are queued is discarded on the speech path (sound.c 400, 408), with no text (388 is the sound-off branch only). Frankendom's combat feedback during a many-on-one fight would lose lines this way. Keep the drop rule only for ambient lines, and queue combat alerts.
- The MIDI ramp: the increment is `10 * time / |diff|` (mt32mpu.c 1040) and the accumulator adds 83 per call (677), so the ms duration depends on the call rate of the interrupt that runs the step (not read). The comment "10000 / 120" suggests 120 calls per second. Treat the 2000 ms as a target, not a measured value, until the caller is read.
- Frankendom: the GUI tick rate is not read (timer.c 37, 363), so the 300-tick rest and the 8-tick cooldown are in GUI ticks, not seconds. Fix in the data: state the unit as ticks and convert at one place.
- GPL-2.0: no line-by-line translation. The sketch uses only the order of the rules, the ids and the numbers.

Best transferable idea: a cue id has two renderings (speech clip, else a positional sound effect), a single speech channel only takes a clip at or above the current priority, and a bed director plays one stinger per fight before calm beds with a rest gap.

Decision (proposed): adapt - keep the cue id with two renderings and the priority channel with positional fallback, and the bed director with stinger and rest gap; fix the dropped battle state, the repeated-track no-op, the gain clamp mismatch and the speech path's missing distance; add a fade-in that the donor lacks.
Acceptance: In a fight, three unit alerts within 2 s start one battle stinger and the battle track plays to its end without being restarted by later alerts; a priority-10 clip is never demoted by a priority-5 clip; a cue 80 tiles away is silent and one 40 tiles away plays at half gain on both the speech and the sound-effect path; a bed does not replay the track that just ended (bounded re-roll, so the rule holds unless the range has one track).

Reuse tag: adapt (GPL-2.0)
