# hedgewars-hw (sound-music, cell 3)

Donor: `/mnt/frankendom-donors/hedgewars-hw/hedgewars/uSound.pas` (with `hedgewars/uGearsHandlersMess.pas`, `hedgewars/uScript.pas`, `hedgewars/uWorld.pas`, `hedgewars/uLandObjects.pas`, `share/hedgewars/Data/Themes/*/theme.cfg`) | Licence: GPL version 2 ("the Free Software Foundation; version 2 of the License", uSound.pas line 7; no "or later" wording) | Pascal (SDL_mixer) | symbol `AddVoice` / `PlayNextVoice`

Checked: Read in full: `uSound.pas` header and design notes (1-37), `PlaySoundV` (549-620 including the fallback-taunt lookup), `PlayMusicSound` / `StopMusicSound` (660-670), `AddVoice` (672-721), `PlayNextVoice` (722-745), `LoopSoundV` (757-812), `StopSound` / `StopSoundChan` (813-850), `PlayMusic` (851-891), `ChangeVolume` / `DampenAudio` / `UndampenAudio` / `MuteAudio` (915-967, the parts shown), `SetMusicName` / `PauseMusic` / `ResumeMusic` / `ChangeMusic` / `StopMusic` (976-1017), `initModule` (1040-1050). Read: `uWorld.pas` 2153-2170 (focus handler), `hwengine.pas` 203-218 (focus events), `uLandObjects.pas` 884-900 (theme music keys), `uCommandHandlers.pas` 925-941 (fast-forward), `uScript.pas` 2374-2386 (mask from script), `uGearsHandlersMess.pas` 1066-1078, 3212-3228, 3286-3303, 4515-4545 (loop users, stinger). Not read: `InitSound` (390-440 beyond the OPUS init line), `ReleaseSound` (460-495), `GetFallbackV` (496-548), `AskForVoicepack` (341-388); grep only for `uStats.pas` (kill-streak AddVoice calls), `uGame.pas` 112 (PlayNextVoice call site, not traced further), `uGearsHedgehog.pas` 321-322 and 1301, and the sound-effect files. The hint file (`Jungle.opus`) is a music asset; the mechanism is in `uSound.pas` and the theme config picks `Jungle.ogg` (theme.cfg line 6). Hit (weapon impact) sound selection was not read, so hit-sound coverage is absent. Confidence: high for the voice queue, the stinger and the dampen code path; medium for the two defects' reachability (the fallback jam is latent, see defects). The sketch typechecked on the VPS: `npx -p typescript tsc --noEmit --strict --target es2020 /tmp/SM014-hedgewars-sketch.ts` exit 0.

Best transferable idea: Queue hedgehog voice lines in a fixed 8-slot queue that plays one line at a time, never repeats the last line, and lets a victory interrupt fade and clear it, while a stinger pauses the music only after the sting has started.
Decision (proposed): adapt - take the voice queue, the stinger hold-and-resume and the focus dampen; fix the stinger that pauses before it knows the sting played, the fallback entry that blocks the queue, and the dampen that can save an already-dampened level.
Acceptance: In a fight a hedgehog's lines play one at a time, the same line is never queued twice in a row for one hog, and a victory interrupt fades the lines out within 800 ms; a client test asserts that a failed sting leaves the music playing and that a second dampen does not change the level restored on focus return.

## 1. Mechanism

- Sound split in three. Sound effects and voice lines use SDL_mixer channels picked by `Mix_PlayChannelTimed(-1, ...)` (any free channel). Music is one streamed track. Looped sounds return a channel id that the caller keeps and stops.
- Voice lines (taunts, attack lines): `AddVoice` (672-721) appends a line to an 8-slot queue (`VoiceList : array[0..7]`, line 147). It is dropped when sound is off or `fastUntilLag` is set (694), when it equals the last line played (694), when it is masked and not forced (696), and when it repeats the entry just before it in the queue (712). A full queue drops it (714). A victory or flawless line first fades all channels out over 800 ms and clears the queue (701-704).
- `PlayNextVoice` (722-745) runs from the game loop (uGame.pas 112, call site only). It does nothing while the last line's channel is still playing (726). Otherwise it takes the first queued line (729-731). A fallback line plays only if the previous line failed (733). Playing the line clears its slot (738), plays it, and records whether it failed (739-741).
- Masks: `SetSoundMask` from script sets `MaskedSounds[snd]` (uScript.pas 2383). `PlaySoundV` (596) and `AddVoice` (696) skip a masked sound unless `ignoreMask` is set. A script's own voice call passes `ignoreMask = true` (uScript.pas 2331, grep).
- Catch-up mute: `fastUntilLag` is set by the fast-forward command when the target tick is ahead of the game (uCommandHandlers.pas 931) and cleared at 940. While it is set, `PlaySoundV` (590), `AddVoice` (694), `PlayNextVoice` (726) and `LoopSoundV` (767) return without playing.
- Stingers: `PlayMusicSound` (660-663) pauses the music and plays the sound as music (`PlaySound(snd, false, false, true)`, soundAsMusic so it plays even when effects are off and music is on). `StopMusicSound` (666-669) stops the sound and resumes the music. The Valkyries cue is the only user: started on a long-jump message (uGearsHandlersMess.pas 4522-4525) and stopped on collision or drowning (4540).
- Music: each theme names its track in its config (`music`, `sd-music`, `fallback-music`, `fallback-sd-music`, uLandObjects.pas 893-900; e.g. Jungle `music = Jungle.ogg`, Hell `sd-music = hell.ogg`). `PlayMusic` (851-891) picks the sudden-death track when `SuddenDeath` is set (856), falls back to the fallback file if the track will not open (871), starts it with a 3000 ms fade-in and loops it forever (891, loops -1). `ChangeMusic` (999-1006) is `StopMusic` then `PlayMusic`. `StopMusic` (1009-1016) frees the track with no fade. The default sudden-death track is `sdmusic.ogg` (1046).
- Loops per gear, with an environment variant: bees (1072, water variant `sndBeeWater`), planes (3218-3219: a water variant is started, the old loop is stopped at once, and the water loop fades out over 4000 ms), and the air attack loop picks its variant and fade-in by world edge: sea gets the water variant with a 4000 ms fade-in (3291), wrap gets the plane loop with a 500 ms fade-in (3296), other edges get the plane loop with a 4000 ms fade-in (3301). The fade-in is in `LoopSound`; `LoopSoundV` applies it only to the default-voicepack branch (807), not to the voice-pack branch (794).
- Volume: music volume is 4/8 of the effects volume (924). Zero volume pauses music (928). Focus loss dampens: `DampenAudio` (940-941) saves the volume and subtracts `7/9` of it, keeping about 2/9. `UndampenAudio` (948) restores the saved value. Both run from `onFocusStateChanged` (uWorld.pas 2169-2170), which the SDL focus events call (hwengine.pas 212, 217).
- Layering: none. One music stream; voice lines and loops are separate channels with no bus or ducking other than the stinger pause. Ambience beds per biome: none as such. The per-theme track and the per-world-edge plane loop are the closest things, and both are data.

## 2. Key functions

- `AddVoice` and `PlayNextVoice` (voice queue): `/mnt/frankendom-donors/hedgewars-hw/hedgewars/uSound.pas` 672-745.
- `PlaySoundV` (gates, lazy voice-pack load): `/mnt/frankendom-donors/hedgewars-hw/hedgewars/uSound.pas` 549-620.
- `PlayMusicSound` / `StopMusicSound` (stinger): `/mnt/frankendom-donors/hedgewars-hw/hedgewars/uSound.pas` 660-670.
- `PlayMusic` (theme track, sudden death, fallback, fade-in): `/mnt/frankendom-donors/hedgewars-hw/hedgewars/uSound.pas` 851-891.
- `DampenAudio` / `UndampenAudio` (focus): `/mnt/frankendom-donors/hedgewars-hw/hedgewars/uSound.pas` 936-949, called from `/mnt/frankendom-donors/hedgewars-hw/hedgewars/uWorld.pas` 2153-2170.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed voice queue, one line at a time | 8 slots (theirs, uSound.pas 147) |
| Victory interrupt: fade and clear | 800 ms (theirs, uSound.pas 701) |
| Stinger: pause music, play sting, resume | Pause at start, resume at stop (theirs, uSound.pas 663, 668) |
| Music fade-in on start | 3000 ms (theirs, uSound.pas 891) |
| Music volume relative to effects | 4/8 (theirs, uSound.pas 924) |
| Focus dampen | keep 2/9 (theirs, uSound.pas 941: subtract 7/9 with integer division) |
| World-edge loop fade-in | 4000 ms sea and other, 500 ms wrap (theirs, uGearsHandlersMess.pas 3291, 3296, 3301) |

Defects (keep the idea, fix the defect):
1. Stinger pauses before it knows the sting played. `PlayMusicSound` pauses (662) and then ignores the result of `PlaySound` (663). If the sting is masked, already playing, or its file will not open, the music stays paused until a `StopMusicSound` that may never come. fix: `playStinger` starts the sting first and pauses only on success, and `resumeIfDue` resumes at the end time as a safety.
2. Fallback entry blocks the queue (live bug, reachable in normal play). If a fallback line reaches the head while the previous line played, `PlayNextVoice` takes the else branch (744) and clears only `LastVoice`. The slot is not cleared, so the head never moves and later lines never play. Callers do set `isFallback = true`: uStats.pas:360-363 queue one of sndRegret, sndGonnaGetYou, sndIllGetYou or sndJustYouWait as the 4th-parameter fallback right after a sndRevenge line (and uSound.pas 687 documents it). When the revenge line plays fine, the fallback reaches the head with `LastVoiceFailed` false, so the jam happens in ordinary play after every revenge taunt that is followed by a fallback. fix: `nextVoice` removes a skipped fallback line.
3. Dampen can save an already-dampened level. `DampenAudio` has no "already dampened" guard, so a second focus-lost event before a focus-gained event sets `previousVolume` to the dampened value (940), and the restore (948) brings back the quiet level. Not reproduced. fix: `dampen` returns early when a saved level exists.
4. Looped sound fade is dropped on the voice-pack branch (794 has no fade; 807 does). Small inconsistency. fix: apply the fade in both branches.

## 4. TypeScript sketch

simplified: The sketch models the 8-slot voice queue with the donor's gates (masked, same as last, repeat of the line just before, full drop), a victory interrupt, serial playback with a busy window in place of `Mix_Playing`, the fallback rule (with the skip fix), a stinger that pauses only after the sting starts with a safety resume, and the focus dampen with the donor's integer rule and the early-return fix. It omits the SDL channel calls, the voice-pack file loading and fallback file lookup (`GetFallbackV`), the `fastUntilLag` flag (the caller passes masked or not; catch-up mute is a boolean not modelled), the music file and track selection, the sudden-death choice, the looped-sound channel map, and the music volume ratio. The `masked` and `forced` inputs stand for `MaskedSounds[snd]` and `ignoreMask`.

```ts
// Licence: GPL version 2 (donor hedgewars/uSound.pas header, "version 2 of the License"). Clean-room sketch from the described mechanism, not a translation.
// clean-room

interface VoiceLine {
  id: string;        // which line (e.g. "attack", "boring")
  owner: string;     // whose voice (e.g. team id)
  fallback: boolean; // plays only if the previous line failed
}

interface VoiceQueue {
  slots: (VoiceLine | null)[];   // donor: 8 slots
  last: VoiceLine | null;        // last line played
  lastFailed: boolean;
  busyUntilMs: number;           // stands in for "the last channel is still playing"
}

function sameLine(a: VoiceLine | null, b: VoiceLine): boolean {
  return a !== null && a.id === b.id && a.owner === b.owner;
}

// Queue a line. Dropped when masked (unless forced), when it repeats the last line played,
// when it repeats the line just before it in the queue, or when the queue is full.
function enqueue(q: VoiceQueue, line: VoiceLine, masked: boolean, forced: boolean): boolean {
  if (masked && !forced) return false;
  if (sameLine(q.last, line)) return false;
  let i = 0;
  while (i < q.slots.length && q.slots[i] !== null) i += 1;
  if (i > 0 && sameLine(q.slots[i - 1], line)) return false;
  if (i >= q.slots.length) return false;
  q.slots[i] = line;
  return true;
}

// Victory or flawless: fade everything out and clear the queue (the donor fades channels over 800 ms).
function interruptForVictory(q: VoiceQueue, fadeOutAll: (ms: number) => void): void {
  fadeOutAll(800);
  q.slots = q.slots.map((): VoiceLine | null => null);
  q.last = null;
}

// Play the next line once the last one has finished. play() returns the clip length in ms, or null on failure.
// Fix: a fallback at the head that is skipped is removed (the donor leaves it in place, which blocks the queue).
function nextVoice(q: VoiceQueue, nowMs: number, play: (line: VoiceLine) => number | null): VoiceLine | null {
  if (nowMs < q.busyUntilMs) return null;
  let i = 0;
  while (i < q.slots.length && q.slots[i] === null) i += 1;
  if (i >= q.slots.length) {
    q.last = null;
    return null;
  }
  const head = q.slots[i];
  if (head === null) return null;
  if (head.fallback && !q.lastFailed) {
    q.slots[i] = null; // skip it, do not leave it at the head
    return null;
  }
  q.slots[i] = null;
  q.last = head;
  const len = play(head);
  q.lastFailed = len === null;
  q.busyUntilMs = nowMs + (len === null ? 0 : len);
  return head;
}

interface MusicState {
  paused: boolean;
}

// Stinger: start the sound first, and pause the music only if the sound really started.
// Donor: the music is paused first and the result of the sound is ignored, so a failed sting leaves the music paused.
function playStinger(music: MusicState, playSting: () => number | null): number | null {
  const len = playSting();
  if (len === null) return null;
  music.paused = true;
  return len;
}

// Resume at the end of the stinger even if the owner never sends a stop (safety timer).
function resumeIfDue(music: MusicState, nowMs: number, stingerEndMs: number): void {
  if (music.paused && nowMs >= stingerEndMs) music.paused = false;
}

interface Mix {
  volume: number;
  savedVolume: number | null;
}

// Focus lost: keep 2/9 of the volume (donor rule: subtract 7/9 with integer division).
// Fix: a second dampen while already dampened is ignored, so the saved level is never overwritten.
function dampen(m: Mix): void {
  if (m.savedVolume !== null) return;
  m.savedVolume = m.volume;
  m.volume = m.volume - Math.floor((m.volume * 7) / 9);
}

function undampen(m: Mix): void {
  if (m.savedVolume === null) return;
  m.volume = m.savedVolume;
  m.savedVolume = null;
}

export {}
```

## 5. Lands in

- TARGET `src/fight/voice-queue.ts` (new client module: the 8-slot line queue, the victory interrupt, the stinger hold-and-resume and the focus dampen; the engine sends event ids, the queue picks the clip). Parity-checklist row 12 (combat sound cues). Client-only: the engine never reads it.
- Reuse tag: rewrite-from-idea (GPL version 2 only; clean-room only)
- Brief rule served: 1 (one engine, sound is client-only); row 12 (combat sound cues)

## 6. Gaps and risks

- GPL version 2 only (no "or later"): clean-room only. The sketch is written from the mechanism; no lines were translated.
- The donor's queue is per hedgehog voice lines from voice packs. Frankendom has no voice packs; the queue would carry hero and creature barks and the boss intro line, so the line ids and the owner need to be data.
- The donor has no ambience beds per biome and no crossfade between tracks (`ChangeMusic` is a stop then a play, uSound.pas 1005-1006, and `StopMusic` has no fade, 1016). The theme-to-track keys are the part that fits "zones as data": a zone names its track and its sudden-death track.
- The world-edge loop variant and its fade-in lengths (4000 ms, 500 ms) are per-level data, not engine constants; they belong in zone data.
- Stinger resume: the donor resumes only on a stop call. The sketch adds a timer; the timer must be tested against the owner that never stops.
- Catch-up mute: the donor skips all sounds while a fast-forward catches up. Frankendom's replay (row 19) needs the same mute, but it is a client rule, not an engine one.
- Mask from script: the donor lets a script mask a sound per id. Frankendom's rule keeps the engine out of the client, so the mask should be a client setting fed by the zone or event data, not a call from the engine.
- Hit sounds: not read in this donor, so this cell gives no transferable code for weapon-impact selection.
- The desktop focus handler also issues a `quit` command on focus loss (uWorld.pas 2161). Whether the dampen branch is reached in practice depends on that line, which was not traced further.

Reuse tag: rewrite-from-idea (GPL version 2 only; clean-room only)
Brief rule served: 1 (one engine; sound is client-only); row 12 (combat sound cues)

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Error: defect 2 said no caller sets isFallback = true so the jam is latent; uStats.pas:360-363 call AddVoice(..., false, true) for the revenge/regret pairs, so the queue jam is reachable in normal play. Confirmed against PlayNextVoice 726-744 (else branch clears only LastVoice, head stays, LastVoiceFailed stays false) and fixed.
- Missed: uStats.pas was listed as grep-only; its fallback callers are now cited.

Fixed 2026-10-12: defect 2 reachability (live, not latent). The sketch already carries the skip fix, so no code change.
