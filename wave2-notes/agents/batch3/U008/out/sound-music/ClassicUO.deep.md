# ClassicUO (sound-music, cell 15)

Donor: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/Game/Managers/AudioManager.cs` (with `ClassicUO.IO/Audio/Sound.cs`, `UOSound.cs`, `UOMusic.cs`) | Licence: BSD-2-Clause (LICENSE.md and the SPDX header on each file; permissive, adaptable) | C# | symbol `AudioManager.PlaySoundWithDistance`

Checked: Opened in full AudioManager.cs (371 lines), Sound.cs (172), UOSound.cs (66), UOMusic.cs (136). Also opened the callers: PacketHandlers.cs 2196-2208 (server sound packet), 1746-1758 (death music), 917 (music volume refresh), 2211-2235 (music packet); Mobile.cs 527-569 (footsteps); Weather.cs 197-223 (weather sounds); GameActions.cs 30-46 and 98-101 (war-mode toggle); GameController.cs 381-450 (update loop); Profile.cs 62-68; Constants.cs 81. Confidence: high on the distance falloff and the clip lockout (read and traced end to end, not run). Medium on the war/peace music slots (traced statically, not run). Not read: SoundsLoader.cs (sound index to clip mapping), the internals of the XNA DynamicSoundEffectInstance. camera_scope: not applicable (sound topic).

## 1. Mechanism

- Two sources feed the same path. The server sends a sound-effect packet with a sound index and tile x, y, which goes to `PlaySoundWithDistance` (PacketHandlers.cs 2208). The client also plays footsteps (Mobile.cs 565) and weather (Weather.cs 222) through the same function.
- `PlaySoundWithDistance` (AudioManager.cs 113-159), in order:
  1. Bail if audio hardware is missing or the player is not in game (115).
  2. Distance is Chebyshev: `distance = max(|dx|, |dy|)` from the player (122).
  3. Base volume is `SoundVolume / 250` (125). Default SoundVolume is 100, so the base is 0.4 (Profile.cs 63).
  4. If distance >= 1, the per-tile step is `volume / (ClientViewRange + 1)` and the distance factor is `step x distance` (128-131).
  5. If distance > ClientViewRange the volume is set to 0 (134-136). Then, if the base volume is below -1 or above 1 (a profile volume out of range), the function returns and the sound is silently dropped (139-142).
  6. Mute if the profile has sound off, or the window is inactive and background play is off (144-146).
  7. Call `sound.Play(now, volume, distanceFactor)` (151). If it returns true, the sound is added to the live list (155-157).
- Inside `Sound.Volume` (Sound.cs 42-65): the instance volume is `max(volume - VolumeFactor, 0)` (58). So the effective gain is `V x (1 - d / (R + 1))` for d <= R, and 0 beyond R.
- `Sound.Play` (Sound.cs 121-159) is a retrigger lockout, not a queue. If `_lastPlayedTime > now` it returns false and the new hit is dropped (123-125). Otherwise it stops the old instance, submits the buffer, sets `_lastPlayedTime = now + Delay` (144), where `Delay = (bytes - 32) / 88.2` in ms (UOSound.cs 14), sets volume and factor (148-149), and plays.
- Distance is taken once, at trigger time. The per-buffer recalculation in `UOSound.OnBufferNeeded` is commented out with the note "not needed" (UOSound.cs 20-59, 22-23). A sound from a mobile that walks away keeps its trigger-time gain.
- `AudioManager.Update()` (313) runs once per game Update (called at GameController.cs 446, inside `Update` which starts at 381). It refreshes music volume for the two slots, then removes any sound whose `IsPlaying` is false (350).
- War and peace music: two slots, slot 0 peace, slot 1 war (`_currentMusic`, AudioManager.cs 20; index chosen at 214). Turning war mode on calls `PlayMusic(38 + random 0..2, true)` (GameActions.cs 36). Turning it off calls `StopWarMusic`, which replays the stored peace index (294). `PlayMusic` (161-220) returns early if combat music is disabled for a war call (192). Before it assigns a new slot it calls `StopMusic()` (212), and `StopMusic` (279-290) stops and disposes both slots (286-287). Result as read: a new track in either slot stops whatever was in the other slot. The ducking lines (252 and 331) would only matter if both slots were set, and the code above never sets both.
- Death: `PlayMusic(42, true)` on the death packet (PacketHandlers.cs 1754), which places the death track in the war slot.
- Footsteps (Mobile.cs 527-569): gated by `LastStepSoundTime < Time.Ticks` (537). On foot the base delay is 400 ms (543). Mounted walk is 350 ms (555) and mounted run is 150 ms (550). Each delay is multiplied by 13/10 (559), so on foot the cadence is 520 ms. The run flag only changes the mounted branch.

## 2. Key functions

- `AudioManager.PlaySoundWithDistance`: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/Game/Managers/AudioManager.cs` 113-159. Distance falloff and mute rules. Runs on every server sound packet.
- `Sound.Play`: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.IO/Audio/Sound.cs` 121-159. Retrigger lockout, instance start.
- `Sound.Volume` setter: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.IO/Audio/Sound.cs` 42-65 (instance volume at 58).
- `AudioManager.PlayMusic`: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/Game/Managers/AudioManager.cs` 161-220. Slot choice, combat-music opt-out, stop-before-play.
- `AudioManager.StopMusic` and `StopWarMusic`: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/Game/Managers/AudioManager.cs` 279-290 and 292-295.
- `GameActions.RequestWarMode`: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/Game/GameActions.cs` 30-46. Caller of the war-track pick.
- `Mobile.ProcessFootstepsSound`: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/Game/GameObjects/Mobile.cs` 527-569.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Chebyshev tile distance | none |
| Linear falloff to silence at range + 1, floored at 0 | View range 24 tiles default (Constants.cs 81); the server can set it (PacketHandlers.cs 2519) |
| Volume scale from a 0..250 slider | Divisor 250 (AudioManager.cs 16); default slider 100 (Profile.cs 63), so 0.4 |
| Per-clip retrigger lockout equal to clip length | Length = (bytes - 32) / 88.2 ms (UOSound.cs 14) |
| Step cadence with a multiplier | On foot 400 ms; mounted walk 350 ms; mounted run 150 ms; x13/10 (Mobile.cs 543, 555, 550, 559) |
| Two music slots, war picks a random track | Tracks 38, 39, 40 (GameActions.cs 36); death track 42 (AudioManager.cs 23) |

## 4. TypeScript sketch

simplified: the sketch keeps only the falloff, the Chebyshev distance and the clip lockout. It omits the play and stop of the SoundInstance, the range guard that drops a sound whose base volume is outside -1..1 (139-142), the window-inactive mute, the sound-off profile check, the music slots and the war toggle, and the Update() cleanup of finished sounds. It uses a float for the clip length where the donor truncates to uint. The distance-0 guard is dropped; the formula gives the same result at 0.

```ts
// Licence: BSD-2-Clause (donor ClassicUO). Clean-room sketch of the described mechanism, not a line-by-line translation.
// Client-only cue layer. The engine emits an event with tile coordinates; this layer picks a gain.

// Chebyshev distance in tiles, linear falloff to silence at viewRange.
export function cueGain(baseVolume: number, dx: number, dy: number, viewRange: number): number {
  const distance = Math.max(Math.abs(dx), Math.abs(dy));
  if (distance > viewRange) return 0;
  const perTile = baseVolume / (viewRange + 1);
  return Math.max(baseVolume - perTile * distance, 0);
}

// Clip length in ms from PCM byte count (donor: (bytes - 32) / 88.2).
export function clipMs(bytes: number): number {
  return (bytes - 32) / 88.2;
}

// A clip cannot restart until its own length has passed.
export class CueLockout {
  private readonly until = new Map<string, number>();

  tryPlay(clipId: string, nowMs: number, clipLengthMs: number): boolean {
    const t = this.until.get(clipId) ?? 0;
    if (t > nowMs) return false;
    this.until.set(clipId, nowMs + clipLengthMs);
    return true;
  }
}

// Example: a hit 6 tiles away with view range 24 and base volume 0.4.
const g = cueGain(0.4, 6, -2, 24);
const lock = new CueLockout();
const first = lock.tryPlay("hit", 1000, clipMs(4000));
const second = lock.tryPlay("hit", 1010, clipMs(4000));
console.log(g.toFixed(3), first, second);
export {};
```

## 5. Lands in

- TARGET `src/fight/cues.ts` (new, client-only cue gain layer, proposed; the Frankendom tree was not checked in this pass). Parity-checklist row 12 (combat sound cues). The engine emits the event, the cue layer reads it and never decides whether a hit happened.
- Reuse tag: adaptable (BSD-2-Clause, so code may be adapted; this sketch is clean-room)
- Brief rule served: rule 1 (one engine; the cue layer is a client, the engine does not read it); the sound topic is client-only per the owner rulings.

## 6. Gaps and risks

- Retriggers are dropped, not queued. In a many-on-one fight with MAX_ATTACKERS = 3, three hits with the same clip id in one window would play one. Frankendom should key the lockout per attacker, not per clip id.
- Gain is fixed at trigger time (UOSound.cs 22-23 is commented out). A moving attacker keeps the gain from its first hit. Frankendom should recompute gain each frame or use a panner.
- War and peace music cut each other, they do not crossfade (AudioManager.cs 212, 286-287). Frankendom must decide whether the war cue is a cut or a fade. The ducking lines (252, 331) are not reachable in the path read.
- `IsPlaying` uses `DurationTime`, set once in `Play` (Sound.cs 151). `UOMusic.Update` does not refresh it, so `GetCurrentMusic` may report a long track as stopped after its first chunk. Not run. Impact not verified.
- Footstep constants are client feel values, not game rules. Keep them out of the engine; if needed, they are client data with defaults.
- Not read: SoundsLoader.cs (index to clip mapping) and the packet ids for the sound and music packets.

Best transferable idea: Attenuate a cue by Chebyshev tile distance, fading to silence at the view range plus one, and refuse to restart a clip until its own length has passed.
Decision (proposed): adapt — take the falloff and the per-clip lockout as a client cue layer with view range as zone data, but recompute gain each frame and key the lockout per attacker so three hits at once are not dropped; the donor's trigger-time gain and drop-on-retrigger would hide the many-on-one hits Frankendom must sound.
Acceptance: With three attackers hitting the player, the player hears three distinct hit clips; a clip 6 tiles away is quieter than one at 1 tile and silent beyond the zone view range (client test asserts the gain order and that three keyed hits all start).
Reuse tag: adaptable (BSD-2-Clause; clean-room sketch)
Brief rule served: rule 1 (one engine; client-only cue layer); rule 8 (target + row 12)


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** 1) Mechanism text pairs 'Mounted walk 350 ms and mounted run 150 ms (550, 555)' in the wrong line order: Mobile.cs 550 is the run branch (150), 555 the walk branch (350); the Section 3 table has it right. 2) Step list omits the range guard `volume < -1 || volume > 1` that silently drops the sound (AudioManager.cs 139-142). Verified: PlaySoundWithDistance 113-159, Chebyshev 122, /250 at 16/125, factor 128-131, zero beyond range 134-136, mute 144-146, Sound.Volume 58, Play lockout 123-125/144/148-149, Delay UOSound.cs 14, commented recalculation 20-59, Update 313/350, GameController 446, war music 36/212/214/286-287/294, death 1754, footsteps 537/543/559, Profile 63, view range 24 (World.cs 109 default from Constants 81), BSD-2.

**Missed:** Weather.cs 197-223 offsets the weather sound 10-18 tiles randomly from the player before the distance call; war music only starts if EnableMusic (GameActions.cs 34); StopWarMusic is also called from OpenStatusBar (GameActions.cs 100); footstep sound alternates two ids (Mobile.cs 541,563).
