# dhewm-dhewm3 (sound-music, cell 2)

Donor: `/mnt/frankendom-donors/dhewm-dhewm3/neo/sound/snd_emitter.cpp` (with `snd_world.cpp`, `snd_system.cpp`) | Licence: GNU GPL version 3 (README.md line 223 names COPYING.txt; file header `Doom 3 GPL Source Code`, snd_world.cpp line 4) | C++ | symbols `idSoundFade::FadeDbAt44kHz`, `idSoundWorldLocal::FadeSoundClasses`, `idSoundEmitterLocal::StartSound` (channel allocation)

Checked: Read by line range: `neo/sound/snd_emitter.cpp` 36-76 and 700-830; `neo/sound/snd_world.cpp` 1722-1750 and 2210-2262; `neo/sound/snd_system.cpp` 924-940; `neo/game/Misc.cpp` 160-176; `neo/game/Target.cpp` 1728-1762. Grep only: `sound.h` 53-84 (flags and constants), `snd_local.h` 102 (SOUND_MAX_CHANNELS = 8), `snd_shader.cpp` (no_dups, leadin, mindistance parsing, lines 196-332), `snd_system.cpp` 363 (dB table). Candidates opened: snd_emitter.cpp, snd_world.cpp, snd_system.cpp, sound.h, snd_local.h, snd_shader.cpp, game/Misc.cpp, game/Target.cpp (8). Confidence: high on the fade maths and the channel rules as read; medium on the leadin-to-loop switch (snd_emitter.cpp 455-480 not read) and on whether music is handled differently (not read: only a comment at snd_world.cpp 1556 mentions music). The hint `INFERRED` was not a file; the real code is the snd_emitter and snd_world pair.

Best transferable idea: a fade that is a start and end time plus a dB target, retargeted from its current value so a new fade never jumps, applied per channel and per class as a product of gains, so a boss intro can duck the ambience class and a teleport can duck it with a sting on top.

Decision (proposed): adapt — take the fade object and the duck-and-restore pair; the donor fades per channel and per class, not per zone bed, so Frankendom gets the crossfade by pairing two fades; the donor's single no-dups bump (snd_emitter.cpp 726) is a defect, so the fix is a bounded loop that skips playing samples.
Acceptance: a client test with a fake clock: crossfading from bed A to bed B over 2.0 s gives a gain for A that falls and for B that rises, with no jump when a second zone change lands halfway through (the gain just before and just after the retarget is equal); a boss intro ducks the ambience class to -20 dB within 0.5 s and restores it after the intro.

## 1. Mechanism

- Fade value: each fade is four numbers, start time, end time, start dB and end dB. Before the start the value holds at the start dB; between start and end it moves linearly in dB; at or after the end it holds the end dB (snd_emitter.cpp 52-65, lines 55-63 and 60).
- Retarget: a new `FadeSoundClasses(cls, toDb, overS)` does nothing if the class already fades to that target over the same length (snd_world.cpp 2228-2231). Otherwise the new fade starts at the current value (2243, `fadeStartVolume = FadeDbAt44kHz(start44kHz)`), starts one mix block after the call (2239), and ends `over` seconds later (2245-2246). Because it starts at the current value, a retarget does not jump.
- Composition: the gain of a layer is the base volume (from the shader's dB, 1734), times the channel's own fade (1740-1741), times its sound class's fade (1743-1744). Both fades are read at the same mix time.
- dB to gain: at or below -60 dB is silence; otherwise 2^(dB/6) (snd_system.cpp 932-935, lookup table filled at 363; table index at 937-938, quantised to 0.1 dB).
- Callers (game code, all read): the teleport ducks class 0 to -20 dB over the teleport delay and starts a sting on the body channel in the same step (Misc.cpp 163-168); the next stage restores class 0 to 0 dB over 0.25 s (Misc.cpp 172-173). A fade-class trigger (Target.cpp 1738-1749) fades any class by a dB value over a time, then schedules a restore after `fadeDuration` (1747), which fades class 0 back (1761).
- Sound classes: four classes (sound.h 79), described in the header as the way to fade most sounds down inside cinematics while dialogue keeps full volume (sound.h 77).
- Voice limits (emitter channels, read at 700-830): each emitter has 8 channels (snd_local.h 102). A new sound takes the first free channel (782-787). If none is free, the sound is dropped and the call returns 0 (789-795). No priority is used to steal a busy channel.
- Named-channel override: if the sound is on a named channel (not SCHANNEL_ANY), the first running sound on that same channel is stopped first (759-778, `break` at 775), so one voice per channel name.
- Repeat rules before allocation: PLAY_ONCE refuses a restart while any channel of the emitter runs that shader (733-743). A sound already started on the same shader with the same start time is refused (747-755). NO_DUPS (716-730) takes the diversity pick (710, `choice = (int)(diversity * numEntries)`) and bumps it by one step if that sample is on a channel (726). The bump is not checked again.
- Leadin: a shader may list leadin samples that are used instead of the entry at the same index (snd_shader.cpp 325-333; snd_emitter.cpp 800-803). What the leadin hands over to is not read (455-480 not read).
- Music: not read. Layers and stingers beyond the teleport one-shot were not found in the code read.

## 2. Key functions

- `idSoundFade::FadeDbAt44kHz`: `/mnt/frankendom-donors/dhewm-dhewm3/neo/sound/snd_emitter.cpp` 52-65 (the value at a time, in dB).
- `idSoundWorldLocal::FadeSoundClasses`: `/mnt/frankendom-donors/dhewm-dhewm3/neo/sound/snd_world.cpp` 2218-2247 (no-op check, retarget from current, one mix block latency).
- Layer gain composition (inside the sound-world volume function): `/mnt/frankendom-donors/dhewm-dhewm3/neo/sound/snd_world.cpp` 1725-1744.
- `idSoundSystemLocal::dB2Scale`: `/mnt/frankendom-donors/dhewm-dhewm3/neo/sound/snd_system.cpp` 929-939.
- Channel allocation (`idSoundEmitterLocal::StartSound`, which begins at snd_emitter.cpp 654): `/mnt/frankendom-donors/dhewm-dhewm3/neo/sound/snd_emitter.cpp` 700-830 was read; 654-699 (the start of the function) was not read.
- Duck and restore callers: `/mnt/frankendom-donors/dhewm-dhewm3/neo/game/Misc.cpp` 160-176 and `/mnt/frankendom-donors/dhewm-dhewm3/neo/game/Target.cpp` 1728-1762.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Fade as start time, end time, start dB, end dB; interpolate linearly in dB | Teleport duck to -20 dB (theirs, Misc.cpp 167); restore to 0 dB over 0.25 s (theirs, Misc.cpp 173) |
| Retarget from the current value, one block later, no-op if same target and length | One mix block latency (theirs, snd_world.cpp 2239) |
| Layer gain = base x channel fade x class fade | Silence at -60 dB (theirs, snd_system.cpp 932) |
| Per-emitter fixed channels, first free, drop when full | 8 channels (theirs, snd_local.h 102) |
| Named channel stops the current voice on that name | Stop one, break (theirs, snd_emitter.cpp 775) |
| Diversity pick with a no-repeat bump | Bump by one step (theirs, snd_emitter.cpp 726; defect: not re-checked) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's fade rules (hold before and after, dB interpolation, retarget from the current value, no-op on repeat, one-block latency, layer gain as a product). It omits the 44.1 kHz sample clock (we use seconds from the caller), the table quantisation (the donor's 0.1 dB table; the sketch is exact), the per-speaker smoothing (`lastV`, usage not read), the leadin and shake features, and the voice allocator. The bed crossfade helper is ours: the donor has no bed concept, only channel and class fades. The donor's behaviour that is kept on purpose: the fade starts from the current value, so a retarget does not jump.

```ts
// Licence: GPL-3.0 (dhewm3, COPYING.txt). Clean-room: shape only, written from the described mechanism.
// dB-linear fade that retargets from its current value, and the donor's layer composition.

export class DbFade {
  private startT = 0;
  private endT = 0;
  private spanS = 0;
  private startDb: number;
  private endDb: number;

  constructor(initialDb = 0) {
    this.startDb = initialDb;
    this.endDb = initialDb;
  }

  // Hold the end value after the fade, the start value before it, and interpolate in dB between.
  valueDbAt(t: number): number {
    if (t >= this.endT) return this.endDb;
    if (t > this.startT) {
      return this.startDb + ((this.endDb - this.startDb) * (t - this.startT)) / this.spanS;
    }
    return this.startDb;
  }

  // Same target and same length as the running fade: do nothing. Otherwise start from the current value, so it never jumps.
  // latencyS: the mixer reads the fade one block later (the donor adds one mix block).
  fadeTo(now: number, toDb: number, overS: number, latencyS: number): void {
    if (this.endDb === toDb && this.spanS === overS) return;
    const start = now + latencyS;
    this.startDb = this.valueDbAt(start);
    this.startT = start;
    this.spanS = overS;
    this.endT = start + overS;
    this.endDb = toDb;
  }
}

// Donor dB2Scale: at or below -60 dB is silence, otherwise 2^(dB/6). The donor quantises to 0.1 dB through a table; this is exact.
export function dbToGain(db: number): number {
  if (db <= -60) return 0;
  return Math.pow(2, db / 6);
}

export interface Layer {
  volume: number;
  channelFade: DbFade;
  classFade: DbFade;
}

// Donor: the layer volume times the channel fade times the class fade, both read at the same time.
export function gainAt(layer: Layer, t: number): number {
  return layer.volume * dbToGain(layer.channelFade.valueDbAt(t)) * dbToGain(layer.classFade.valueDbAt(t));
}

// Crossfade two beds: the outgoing one goes to silence (-60 dB), the incoming one to full (0 dB), both starting now.
export function crossfade(out: DbFade, incoming: DbFade, now: number, overS: number, latencyS: number): void {
  out.fadeTo(now, -60, overS, latencyS);
  incoming.fadeTo(now, 0, overS, latencyS);
}

// Duck a sound class (for example, the ambience class during a boss intro) and restore it later with a second call.
export function duck(cls: DbFade, toDb: number, downS: number, now: number, latencyS: number): void {
  cls.fadeTo(now, toDb, downS, latencyS);
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/SM011-dhewm-fade.ts`: exit 0.

## 5. Lands in

- TARGET `origins/zone-audio.ts` (new, client-only). The fade is a client primitive; the server never reads it. Parity-checklist row 12 (combat sound cues): the duck during a boss intro and the hit or sting pairing are combat cues. A zone bed crossfade has no row of its own (gap, same as the daggerfall note).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: zones as data (the bed and the fade times are zone data); client-only, so no server rule is touched.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism, not from the donor lines.
- No bed concept in the donor. The crossfade is two fades in opposite directions (our helper). The donor does not use an equal-power curve; the dB-linear fade is the donor's choice, so test it by ear before adopting it.
- Retarget: the donor fades from the current value, which is what we want. Keep that rule; a naive "set gain" would jump.
- The no-dups bump (snd_emitter.cpp 726) moves one step and does not re-check the new sample. If it is also playing, it repeats. Fix: loop over the samples, bounded by the count, and skip any that are playing.
- Voice drop: with 8 channels and no priority, a full emitter drops the new sound (789-795) with no retry. Frankendom's hit and voice cues would drop silently on a busy many-on-one fight. Fix: a fight-level priority (for example, the finisher or the boss voice wins), or log the drop. The named-channel override (759-778) is worth keeping: one voice per channel name (hit, voice, sting) stops the previous one, which suits MAX_ATTACKERS = 3.
- Duck and sting pair (Misc.cpp 167-168): a teleport ducks the world and plays a sting on a body channel in the same step. The same pair fits a boss intro (duck ambience, play the intro sting), not as a music layer.
- Not read: the leadin-to-loop switch (snd_emitter.cpp 455-480), the start of StartSound (654-699), the music path (snd_world.cpp 1556 mentions music only in a comment), and the per-speaker smoothing (`lastV`, snd_local.h 428).
- Ambience by area: the donor routes sounds through portals to the listener's area (snd_emitter.cpp 557-564, read by grep only). That is occlusion, not a biome bed; not read in full.

## Reuse tag
rewrite-from-idea (GPL-3.0; clean-room only)

## Brief rule served
Zones as data (the bed and the fade times are zone data); client-only; parity row 12 is the nearest row and is flagged as a gap for the bed crossfade.
