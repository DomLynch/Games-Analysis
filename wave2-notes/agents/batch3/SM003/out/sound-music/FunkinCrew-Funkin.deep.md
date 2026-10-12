# FunkinCrew-Funkin (sound-music, cell 2)

Donor: `/mnt/frankendom-donors/FunkinCrew-Funkin/source/funkin/audio/VoicesGroup.hx` | Licence: Apache-2.0 (`LICENSE.md` line 3: "source code is licensed under the Apache 2.0 license"; art and assets are separate and not used) | Haxe | symbol `VoicesGroup`

Checked: Confidence high on the stem group (`SoundGroup.hx`, `VoicesGroup.hx`), the miss duck and temp-vocal gate (`PlayState.hx` 3192-3235, `BaseCharacter.hx` 334-346 and 725-736), and the voice cap (`FunkinSound.hx` 431-433, 151-153); medium on the lead-in overshoot (depends on the flixel default for `FlxSound.play`, library not in the repo, not read). Read in full: `VoicesGroup.hx` (189 lines), `SoundGroup.hx` (288 lines), `FunkinSound.hx` 29, 126-260, 280-400, 427-470, 483-580. Read in part: `PlayState.hx` 2976-2990, 3180-3240; `BaseCharacter.hx` 300-346, 720-736; `PlayAnimationSongEvent.hx` 52-68. Candidates opened (6): VoicesGroup.hx (the hint, which is the real file), SoundGroup.hx, FunkinSound.hx, PlayState.hx, BaseCharacter.hx, PlayAnimationSongEvent.hx. Not read: flixel `FlxSound` (not in the repo), the openfl `SoundMixer.MAX_ACTIVE_CHANNELS` value, `Conductor.hx`, `loadEmbedded`, the chart data that feeds `PlayAnimationSongEvent`. Stingers: one-shot effects via `playOnce` (see section 1). Ambience beds: none found in the files read. Camera scope: not applicable (sound).

Best transferable idea: layered music is a set of stems on one clock, each with its own latency offset; a whiff ducks only the player's vocal stem unless an animation has claimed it, and the voice pool refuses new quiet sounds at the cap rather than stealing.
Decision (proposed): adapt - take the one-clock stem group with per-stem offsets and the player-vocal duck on a whiff; add the temp-vocal exemption; fix the lead-in overshoot (D1) and the completion relay (D3) in the sketch; drop the openfl channel cap for our own voice budget.
Acceptance: when the player's attack whiffs, the player's vocal stem falls to zero in the same frame while the instrumental keeps playing; a headless test seeds one whiff and asserts player-vocal gain 0 and instrumental gain 1 at the same clock time, and a test with the temp-vocal flag set leaves the stem audible.

## 1. Mechanism

Layered music (stems):
- A `SoundGroup` is a Flixel group of `FunkinSound`s that play together. The group reads its time, volume, mute and pitch from its first alive member (`SoundGroup.hx` get_time, get_volume). Writes go to every member (`set_time` at 204-212, `set_volume` at 241-248).
- Adding a stem copies the group's time, volume and pitch to it (83, 92). Its `onComplete` is replaced with a relay to the group's callback (85-88, see D3).
- `VoicesGroup` splits the stems into a player group and an opponent group. The group time setter writes every stem (`VoicesGroup.hx` set_time, from 64), then subtracts each side's offset from its own stems (74 for the player side; the opponent side is the same shape). A change of offset re-times that side only: add the new offset, subtract the old one (84-89). So each side's stems can be shifted for latency without moving the others.
- Per-side volume: `playerVolume` and `opponentVolume` (default 1.0, lines 22 and 27) write only to that side's stems (59 for the player side, 117 for the opponent side). The instrumental, held in the base group, is never touched by either.
- Fades: `SoundGroup.fadeIn` (142-148) and `fadeOut` call the same fade on every member with one duration (146). There is no per-stem timing.
- Drift check: `checkSyncError(targetTime)` (53-71) returns the signed deviation with the largest magnitude. Without a target it uses the first alive member as the reference. Only the caller decides what to do with the value.

Gating a stem by gameplay (the part a fight can reuse):
- A whiff (a press with no note, or a note that is missed) calls `vocals.playerVolume = 0` unless the boyfriend character has `tempVocals` set (`PlayState.hx` 3192; the same rule at 3234 for the empty-press path, and 2985 for a dropped hold). Then a random miss sound plays at a random volume (3193 at 0.5-0.6; 3235 at 0.1-0.2 for the empty press).
- `tempVocals` is set by the chart event `PlayAnimationSongEvent` (`targetChar.tempVocals = force;`, line 64). It means "this animation carries its own vocal".
- `BaseCharacter.playAnimation` (725-736): when `tempVocals` is set and the side is muted, the side's stem is set back to 1.0 for the animation's duration (728-730).
- `BaseCharacter.onAnimationFinished` (334-346): when `tempVocals` is set, the side's stem is set back to 0 (339) and the flag is cleared.

Voice pool and admission (`FunkinSound.hx`):
- `load` (427-445 region): if the active channel list is at `SoundMixer.MAX_ACTIVE_CHANNELS` and the sound is not `important`, it logs "channels exhausted" (431-433) and returns null. Nothing is stolen. An `important` sound is always created, and `update` pushes its channel onto the list if it is missing (151-153). The cap value is in openfl and was not read.
- So there are two classes only: important (always plays) and everything else (refused at the cap). There is no numeric priority.
- `playOnce` (570-572) loads a sound that is not looped and auto-destroys on finish, then plays it at once. This is the one-shot stinger and hit-sound path.

Lead-in (negative start):
- `play(startTime < 0)` stores the negative time as `_time` and marks the sound to start (185-189). `update` adds the frame time in ms each frame (138). On the frame `_time >= 0` (139) it calls `super.play()` (141), which starts the clip. The overshoot past zero is not passed on (D1).

Music switch (`playMusic`, 287-392):
- The current track is stopped and killed (`fadeTween?.cancel()` at 306, then stop and kill). There is no crossfade in code. A new track also reads metadata time changes into the conductor (`mapTimeChanges`, not read).
- Partial loads (`loadPartial`, 483-517) load a time slice of a file with start and end fractions (494). Used for the partial-song path.

## 2. Key functions

- `VoicesGroup` (stem sides, offsets, per-side volume): `/mnt/frankendom-donors/FunkinCrew-Funkin/source/funkin/audio/VoicesGroup.hx` 22-32, 55-61 (player volume), 64-79 (set_time), 84-93 (player offset), 113-119 (opponent volume).
- `SoundGroup` (shared clock, relay, fades, sync check): `/mnt/frankendom-donors/FunkinCrew-Funkin/source/funkin/audio/SoundGroup.hx` 53-71, 72-96 (add), 142-163 (fades), 204-212 (set_time).
- `FunkinSound` (voice cap, important, lead-in, one-shot): `/mnt/frankendom-donors/FunkinCrew-Funkin/source/funkin/audio/FunkinSound.hx` 131-158 (update), 172-200 (play), 427-445 (load cap), 532-566 (important start), 570-572 (playOnce).
- Miss and temp-vocal rules: `/mnt/frankendom-donors/FunkinCrew-Funkin/source/funkin/play/PlayState.hx` 3180-3240 and `/mnt/frankendom-donors/FunkinCrew-Funkin/source/funkin/play/character/BaseCharacter.hx` 334-346, 725-736.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One clock for several stems; each stem sits at clock minus its own offset | Offsets are per side and per chart (`playerVoicesOffset` default 0.0, line 32); no fixed number in the donor |
| Duck one stem to zero on a whiff, keep the instrumental | Duck target 0; miss sound volume 0.5-0.6 for a note miss (3193), 0.1-0.2 for an empty press (3235) |
| Animation-owned vocal exempts the duck | Flag set by chart event (64); no timer |
| Refuse new quiet sounds at a cap, never steal | Cap is `SoundMixer.MAX_ACTIVE_CHANNELS` (openfl, not read) |
| Volume clamp | 1.0 (`MAX_VOLUME`, line 29) |
| Lead-in counts down in ms | Start when the counter reaches 0 (139) |
| Partial load of a time slice | Start and end as fractions of the file (494) |

Defects, each with its fix:
- D1 (lead-in overshoot): the counter adds the whole frame at once (138), starts on the first frame it is at or above zero (139), and calls `super.play()` (141). The overshoot is not passed on, so the clip starts late by up to one frame. Traced; the flixel default for `startTime` in `FlxSound.play` is taken as 0 (library not read). Fix: start at the overshoot (sketch `stepLeadIn`).
- D2 (temp-vocal flag cleared by a bad condition): `BaseCharacter.hx` 736 reads `else if (characterType != BF || characterType != DAD) tempVocals = false;`. The condition is always true, because one character cannot be both BF and DAD, so this line runs whenever the first two branches do not. When the side is already audible at the start of a temp animation (playerVolume is 1, not 0), the flag is cleared, and the end-of-animation mute (339) is then skipped. Traced, not run. The intent looks like a plain `else`; the author's intent is not verified. Fix: a plain `else` (or a flag per side), and test the already-audible case.
- D3 (completion relay fires once per stem): `SoundGroup.add` replaces each stem's `onComplete` with a call to the group's callback (85-88). A group of N stems calls the group callback up to N times, and it also replaces any `onComplete` the stem was loaded with. No caller of the group callback was found in `PlayState` (grep for `vocals.onComplete` was empty), so this is latent. Fix: relay from one designated stem, or count completions to N.
- Risk, not confirmed: `VoicesGroup.set_time` subtracts a side's offset without a clamp (74). A seek before the offset gives a negative stem time. The `FlxSound` time setter was not read, so the effect is unknown.

## 4. TypeScript sketch

simplified: the sketch keeps the one-clock stem group with per-stem offsets, the sync check, the duck on a whiff with the temp-vocal exemption, the cap-with-important admission, and the lead-in. It fixes D1 (the lead-in starts at the overshoot). It omits the completion relay (D3, a note only), the opponent side (a mirror of the player side), the Flixel play, pause and channel list, pan and waveform, the legacy single-track voice system, the fades, and the pitch. The duck is a volume set, not a fade.

```ts
// Licence: Apache-2.0 (donor LICENSE.md). clean-room sketch written from the described mechanism; no donor line is translated.
// clean-room

// Layered music: stems share one clock. Each stem has its own latency offset.
export interface Stem {
  readonly id: string;
  readonly isPlayerVocal: boolean; // the stem a whiff ducks
  offsetMs: number;                // per-stem latency compensation (ms)
  timeMs: number;                  // stem position (ms)
  volume: number;                  // 0..1, clamped
}

export class StemGroup {
  playerVocalVolume = 1.0;
  private readonly stems: Stem[];

  constructor(stems: Stem[]) {
    this.stems = stems;
  }

  // One clock: every stem sits at the group time minus its own offset.
  seek(clockMs: number): void {
    for (const s of this.stems) s.timeMs = clockMs - s.offsetMs;
  }

  // Signed deviation with the largest magnitude, 0 when every stem is on its expected position.
  syncError(clockMs: number): number {
    let worst = 0;
    for (const s of this.stems) {
      const diff = s.timeMs - (clockMs - s.offsetMs);
      if (Math.abs(diff) > Math.abs(worst)) worst = diff;
    }
    return worst;
  }

  // A whiff ducks the player's vocal stem to zero, unless an animation has claimed the vocal for its duration.
  onMiss(tempVocalActive: boolean): void {
    if (!tempVocalActive) this.playerVocalVolume = 0;
  }

  // Effective gain of one stem.
  gainOf(s: Stem): number {
    return s.isPlayerVocal ? this.playerVocalVolume : s.volume;
  }
}

// Voice admission: refuse a new non-important sound when the pool is full. Nothing is stolen.
export function admitSound(activeCount: number, cap: number, important: boolean): boolean {
  return important || activeCount < cap;
}

// Lead-in: a negative start counts down by frame time. On the frame it reaches zero, the sound starts
// at the overshoot instead of at zero, so the start is not late by up to one frame.
export function stepLeadIn(timeMs: number, frameMs: number): { timeMs: number; startOffsetMs: number; started: boolean } {
  const t = timeMs + frameMs;
  if (t < 0) return { timeMs: t, startOffsetMs: 0, started: false };
  return { timeMs: t, startOffsetMs: t, started: true };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/SM003-Funkin.ts`).

## 5. Lands in

- TARGET `src/fight/sound-cues.ts` (proposed new client module; sound is client-only). Parity-checklist row 12 (combat sound cues). The duck rule is a combat cue, so row 12 is cited.
- Reuse tag: rewrite-from-idea (Apache-2.0; code may be adapted with the licence notice; this note is clean-room)
- Brief rule served: addendum sound-music fold-in (layering, stingers via one-shot, ambience beds not found); rule 8 (target plus row 12); rule 6 (licence read)

## 6. Gaps and risks

- Frankendom has no chart clock here. The one-clock rule needs a single fight clock that the client plays against; the server's kill and hit events are server-verified, so the duck fires on the confirmed whiff event, not on a predicted one.
- The duck is a volume set. On a Frankendom whiff this must not change state (a whiff is a presentation cue); the duel step (row 1) decides the outcome.
- The temp-vocal exemption is per character and set by chart data. Frankendom would carry it in encounter data (zones as data), not in the character script.
- Voice budget: `MAX_ATTACKERS = 3` caps attacker voices per fight. A small fixed budget, set by Frankendom, replaces the openfl cap; the admission rule (refuse non-important, never steal) is the part to copy.
- There is no numeric priority; "important" is a flag. Frankendom's hit confirmations for the local player should be important, and enemy ambience never important.
- Apache-2.0 allows adaptation with the notice, but the sketch is clean-room; no line is translated.
- Not read: flixel `FlxSound` (time setter, play default), openfl `SoundMixer.MAX_ACTIVE_CHANNELS`, `Conductor.hx`, the chart format for `PlayAnimationSongEvent`, the opponent-side code past the mirror.
- D1 to D3 are listed with fixes; D2 is traced, not run; the author's intent for the else-if is not verified.

Reuse tag: rewrite-from-idea (Apache-2.0; clean-room)
Brief rule served: addendum sound-music fold-in; rule 8 (target plus row 12); rule 6 (licence read)
