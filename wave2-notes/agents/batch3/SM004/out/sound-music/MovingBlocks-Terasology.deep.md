# MovingBlocks-Terasology (sound-music, cell 1)

Donor: `/mnt/frankendom-donors/MovingBlocks-Terasology/engine/src/main/java/org/terasology/engine/audio/openAL/BaseSoundPool.java` | Licence: Apache-2.0 (SPDX header in the audio and character files; LICENSE file is Apache License 2.0) | Java | symbol `BaseSoundPool.getSource`

Checked: Read in full: BaseSoundPool.java (159 lines), CharacterSoundSystem.java (178 lines, the hint file: footsteps, jump, landing, death, swim, water). Read in the relevant ranges: OpenALManager.java 40-270 (pools, playSound, playMusic, loopMusic, update, notifyEndListeners, checkDistance), BaseSoundSource.java 80-257 (update, reset, setGain, fade, updateFade), AudioManager.java (constants and interface), AudioSystem.java 40-124 (the two PlaySoundEvent handlers), CharacterSoundComponent.java (fields). Candidates opened: 8 files, plus LICENSE. Callers checked: getSource has two callers (OpenALManager 158 and 198); fade( has no caller anywhere in the donor (grep); unlock() has no caller in the audio package (grep); playMusic/loopMusic has one engine caller (StateMainMenu.java:124, menu theme). Not read: OpenALStreamingSound internals and the native OpenAL layer. Searched the donor for ambience, biome sound, crossfade and stinger code across java, json and md: none found. Confidence: high on the voice pool and the music defects (read from code, not run). Camera scope: not applicable (sound).

## 1. Mechanism

- A fixed budget of voices. `OpenALManager` builds an sfx pool of 30 voices (line 80) and a music pool of 2 (line 81).
- Voice request `getSource(sound, priority)` (BaseSoundPool.java 44-69). Pass 1 scans the voices in map order and takes the first one that is not active (51-54). A voice is active if it is locked or playing (143). Pass 2 runs only when every voice is active: it takes the first voice whose stored priority is below the request (58-65), not the lowest one. If none qualifies, it returns null and the sound is dropped (68).
- Priority scale (AudioManager 14-19): LOCKED = MAX, HIGHEST 100, HIGH 10, NORMAL 5, LOW 3, LOWEST 1. Who gets which: world sounds from PlaySoundEvent use NORMAL (AudioSystem 88); sounds for the local owner (PlaySoundForOwnerEvent) use HIGH (110). So the player's own cues can take a voice from a world sound.
- Range gate: a positional sound is dropped before any voice is taken if it is beyond 100 units (AudioManager 13; OpenALManager 153-155; the squared check is at 273).
- Per-entity throttle (CharacterSoundSystem): footstep, jump, landing, swim and water-entry sounds run only if `lastSoundTime + MIN_TIME < now`, MIN_TIME = 10 ms (line 38; checks at 69, 79, 107, 149, 160). Death and respawn are not throttled.
- Impact gain (landing, 95-120): `modifier = (fallSpeed - 7) * 0.2` (97); zero or less returns with no sound (99-101); above 2 it is capped at 2 (103-105); the played gain is `landingVolume * modifier` (115). Silent below the threshold, linear above it.
- Music (OpenALManager 189-206): `playMusic` calls `pool.stopAll()` first (192), so the music pool is cleared, then takes one voice (198). No fade: the old track is cut.
- Loop: `loopMusic` passes an end listener that calls `loopMusic` again when the track ends on its own (215-218).
- Frame order: `OpenALManager.update` updates every pool (246-249), then calls `notifyEndListeners(false)` (250). That method calls each stored listener whose voice is no longer playing, with `interrupted` = false (253-262).
- Fade primitive (BaseSoundSource 225-250): `fade(target)` sets a target and `updateFade` moves the gain by `max(target, gain - delta)` each update (241); at 0 it stops the voice (242-243). A fade down falls 1.0 gain per second, fixed. A fade up jumps straight to the target, because `max(target, ...)` returns the target when the target is higher. No engine caller.

## 2. Key functions

- `BaseSoundPool.getSource` 44-69: the two-pass allocator (free voice, then lower-priority steal).
- `BaseSoundPool.isActive` 142-144: locked or playing.
- `OpenALManager.playSound` 151-171: range gate, voice, gain, play, optional end listener.
- `OpenALManager.playMusic` 189-206: stop the music pool, then take one voice.
- `OpenALManager.update` 246-251 and `notifyEndListeners` 253-263: per-frame pool update and end-of-voice callbacks.
- `BaseSoundSource.updateFade` 236-250: the gain ramp.
- `CharacterSoundSystem.onLanded` 95-120: impact curve plus throttle.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Voice budget with priority steal | 30 sfx voices (OpenALManager.java:80); 2 music voices (:81); DEFAULT_POOL_SIZE = 32 (BaseSoundPool.java:17) is used only by the no-argument constructor, which the two pools do not call |
| Priority tiers | LOCKED = MAX (AudioManager.java:14); HIGHEST 100; HIGH 10 (:16); NORMAL 5 (:17); LOW 3; LOWEST 1 (:19) |
| Own-cue tier above world cues | owner sounds HIGH (AudioSystem.java:110) vs world NORMAL (:88) |
| Per-entity sound throttle | MIN_TIME = 10 ms (CharacterSoundSystem.java:38) |
| Impact curve | threshold 7 (:42), factor 0.2 (:41), cap 2 (:43); gain times landingVolume (:115) |
| Fade rate | 1.0 gain per second, hard-wired (BaseSoundSource.java:241); no duration parameter |
| Range cut | 100 units (AudioManager.java:13), compared squared (OpenALManager.java:273) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's priority budget, the own-cue tier and the impact curve, and fixes three things. It steals the LOWEST-priority voice, not the first lower one in map order. A null priority counts as lowest (the donor would unbox null). The fade is symmetric and takes a duration (the donor fades up by snapping). It adds a music crossfade: the outgoing bed fades out while the incoming bed fades in, and a displaced voice calls its end listener once with interrupted = true (the donor hard-cuts music and leaves stale listeners). It omits the OpenAL position, the distance cut, the per-entity 10 ms throttle, the end-of-voice callback batching, and the source gain multiplied by pool volume.

```ts
// Licence: Apache-2.0 (donor; adaptation allowed). Clean-room sketch of the mechanism, written from the described order of steps, not a translation.
export const PRIORITY = {
  LOCKED: Number.MAX_SAFE_INTEGER,
  HIGHEST: 100,
  HIGH: 10,
  NORMAL: 5,
  LOW: 3,
  LOWEST: 1,
} as const;

export interface Voice {
  prio: number | null;     // null = never assigned, or released
  playing: boolean;
  gain: number;            // 0..1
  target: number;          // gain the voice is moving towards
  rate: number;            // gain units per second while fading
  onEnd: ((interrupted: boolean) => void) | null;
}

export class VoicePool {
  readonly voices: Voice[];

  constructor(size: number) {
    this.voices = Array.from({ length: size }, () => ({
      prio: null, playing: false, gain: 1, target: 1, rate: 0, onEnd: null,
    }));
  }

  // Free voice first. Otherwise steal the LOWEST-priority voice that is strictly below the request.
  // Returns null when every voice is busy at or above the request's priority.
  acquire(prio: number, onEnd: ((interrupted: boolean) => void) | null = null): Voice | null {
    let pick: Voice | null = this.voices.find((v) => !v.playing) ?? null;
    if (pick === null) {
      for (const v of this.voices) {
        const p = v.prio ?? 0; // a null priority counts as lowest (the donor would throw here)
        if (p < prio && (pick === null || p < (pick.prio ?? 0))) pick = v;
      }
      if (pick !== null) pick.onEnd?.(true); // the displaced owner hears that it was interrupted
    }
    if (pick === null) return null;
    pick.prio = prio;
    pick.playing = true;
    pick.gain = 1;
    pick.target = 1;
    pick.rate = 0;
    pick.onEnd = onEnd;
    return pick;
  }
}

// A voice ends on its own (interrupted = false) or is stopped by us (interrupted = true).
export function finish(v: Voice, interrupted: boolean): void {
  v.playing = false;
  const cb = v.onEnd;
  v.onEnd = null;
  cb?.(interrupted);
}

// Symmetric fade: gain moves toward target at `rate` per second, up or down. Reaching 0 stops the voice.
export function stepFade(v: Voice, dt: number): void {
  if (v.gain === v.target) return;
  const step = v.rate * dt;
  v.gain = v.gain < v.target ? Math.min(v.target, v.gain + step) : Math.max(v.target, v.gain - step);
  if (v.gain === 0) finish(v, true);
}

// Impact loudness: silent below the threshold, linear above it, capped at max.
export function impactGain(fallSpeed: number, threshold: number, perUnit: number, max: number): number {
  const g = (fallSpeed - threshold) * perUnit;
  return g <= 0 ? 0 : Math.min(g, max);
}

// Music bed crossfade: the outgoing bed fades out over fadeS seconds while the incoming bed fades in.
export function crossfadeBed(
  pool: VoicePool,
  outgoing: Voice | null,
  fadeS: number,
  onEnd: (interrupted: boolean) => void,
): Voice | null {
  if (outgoing !== null && outgoing.playing) {
    outgoing.target = 0;
    outgoing.rate = 1 / fadeS;
  }
  const incoming = pool.acquire(PRIORITY.NORMAL, onEnd);
  if (incoming !== null) {
    incoming.gain = 0;
    incoming.target = 1;
    incoming.rate = 1 / fadeS;
  }
  return incoming;
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, with `export {};` appended: exit 0.

## 5. Lands in

- TARGET `src/fight/sound-cues.ts` (new, client-only: sound is a client, the engine never reads it). It holds the voice budget, the priority tiers and the impact curve. It consumes server-confirmed events (a hit that the server accepted); it never decides that a hit happened.
- Parity-checklist row 12 (combat sound cues). The brief hint for this cell said row 14, but row 14 is HUD; the sound topic maps to row 12, so row 12 is used.
- Reuse tag: adapt (Apache-2.0: adaptation allowed; the sketch is written from the mechanism, with the defects below fixed)
- Brief rule served: 1 (one engine: cues follow the engine's event, and the client does not invent outcomes); licence rule 7: Apache-2.0, adapt allowed.

## 6. Gaps and risks

- Not in this donor: layered music, stingers, and biome ambience beds with border crossfades. A search of the donor for ambience, biome sound and crossfade (java, json, md) found none. Music is one track at a time; the only engine caller is the menu theme (StateMainMenu.java:124). A Frankendom zone bed must be built as new work.
- Defect (music, read from code, not run): `playMusic` calls `pool.stopAll()` (OpenALManager 192), and `stopAll` does not call `notifyEndListeners` (only `stopAllSounds` does, at 95). The old loop's listener stays in `endListeners` (put at 203, never removed). On the next update (250, 257) a stopped old voice calls its listener with interrupted = false (261), and the loop listener calls `loopMusic` again (216-217), which stops the new track and restarts the old one. Fix: notify the old listeners with true and remove them before stopping (the sketch's `acquire` and `finish` do this).
- Defect (steal): pass 2 takes the first lower-priority voice in map order (58-62), not the lowest. Fix: pick the minimum priority (the sketch does).
- Defect (null priority): `unlock` (139) and `fillPool` (150) store null. Pass 2 unboxes the stored priority (60-62), so an active voice with a null priority would throw. No caller of `unlock` was found in the audio package, so this is latent. Fix: treat null as lowest (the sketch does).
- Defect (fade): a fade up jumps to the target (241), and a fade down runs at a fixed 1.0 gain per second with no duration. `fade` has no caller. Fix: symmetric ramp with rate = 1 / duration (the sketch does).
- Gain headroom: the landing gain can reach `landingVolume * 2` (115), above 1.0; OpenAL clips it. Fix: clamp the final gain to 1.0 or lower landingVolume.
- Frankendom rule: the donor has no server side. Sound must follow server-confirmed events only; kills stay server-verified and the cue never changes the outcome.
- Pool size 30 is the donor's desktop choice, not Frankendom data. With MAX_ATTACKERS = 3, the pressure comes from ambience and footsteps as well as fights; keep the player's own cues at HIGH and world cues at NORMAL or LOW.
- The donor is OpenAL/LWJGL. The sketch is an engine-neutral allocator; a browser port needs one gain node per voice (the donor's gain path was not read for WebAudio).
- The 10 ms throttle is a same-frame guard, not a hit-spam guard. Frankendom needs its own throttle, a data field per cue class.

Best transferable idea: a fixed voice budget where a new cue steals only a strictly lower-priority voice, lowest first, and the player's own cues outrank world cues.

Decision (proposed): adapt - keep the budgeted voice pool with priority steal and the own-cue tier; fix the first-match steal, the null priority and the snap-up fade; add the music crossfade the donor lacks.
Acceptance: With 30 voices busy in a 3-attacker fight, an enemy footstep (NORMAL or LOW) never takes the player's own hit cue (HIGH); a zone bed change fades the old bed out over its set duration while the new bed fades in, and a client test sees the old bed's end listener fire once with interrupted = true and never restart it.
