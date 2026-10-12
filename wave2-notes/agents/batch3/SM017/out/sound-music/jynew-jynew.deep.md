# jynew-jynew (sound-music, cell 1)

Donor: `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/Scripts/ResourceManagement/AudioManager.cs` | Licence: restricted (root `LICENSE` is a custom notice: use of "any resources or code of this project" is not permitted unless authorized; the file header says the code is MIT) | C# (Unity) | symbol `AudioManager.PlayMusic`

Checked: Read in full: `AudioManager.cs` (113 lines). Callers read: `LevelMaster.cs` 271-287 (track pick on map entry, called at 165), `LevelLoader.cs` 56-71 (battle save and restore), `BattleLoader.cs` 107, `SkillCastHelper.cs` 105-113 and 250-256, `GameUtil.cs` 130-146 (CallWithDelay), `Jyx2SkillDisplayAsset.cs` 135-142, `MapHelper.lua` 14-20. Confidence: high on the music and cue order; medium on the zone data (the Map table values are (not read): a grep for `ForceSetLeaveMusicId` under `Assets` found no text data file). Crossfade, ambience beds, priority and voice limits are absent from the audio path (grep for crossfade/ambient/priority/voice found only UI fades and Unity event priority). Camera scope: n/a (sound topic).

Best transferable idea: pick the music track from the zone transition (the leave track of the zone being left wins, else the entry track of the new zone), and save and restore the current track around a battle, so the zone line and the fight each set the right music without the zone knowing about battles.
Decision (proposed): adapt — the leave/entry pair belongs in zone data (zones are data), and the save/restore pattern keeps the Pit client simple; adapt because the donor cuts instantly, has no crossfade and no voice cap.
Acceptance: crossing a zone line plays the leave track of the zone left (or the new zone's entry track if none is set), and after a fight the previous zone track plays again (from its start, as the donor does; it only keeps playing uninterrupted when the battle has no track of its own) (a client test asserts the current track id equals the saved id after the fight).

## 1. Mechanism

- Music is one channel. `AudioManager` keeps one looping `AudioSource` under a DontDestroyOnLoad object, created on first use (62-78; loop at 73). `PlayMusic(int id)` builds `Assets/BuildSource/Musics/<id>.mp3` and loads it asynchronously; id -1 returns without a change (21-22). `PlayMusicAtPath` awaits the load (53), then sets the clip and calls Play (57-58), with no check that a newer request has started. The `AudioClip` overload skips the switch when the clip is already current (29). A track change is a hard cut: nothing fades in or out (31-32, 57-58). Volume follows the Volume setting (89).
- Zone music: `LevelMaster.PlayMusic(currentMap)` (called at 165) plays the leave track of the previous map when it has one (276-282), otherwise the entry track of the new map (287). The leave track is `GetOutMusic` (`MapHelper.lua` 14-20): `ForceSetLeaveMusicId` when it is set and not -1, else `OutMusic`. So the track belongs to a transition: the zone you leave can pick the music you hear on the way out.
- Battle music with resume: `LevelLoader.DoloadBattle` saves the current clip (58), loads the battle scene, and `BattleLoader` plays `battle.Music` (107). When the battle callback runs, the saved clip is set again (71). The same-clip guard (29) compares against the clip playing at that moment, which is the battle clip by then (107), so the callback's PlayMusic(saved) sets the clip and calls Play(): the zone track restarts from the beginning. It is only a no-op when the battle set no music (battle.Music of -1), so the zone clip was never replaced.
- Layered spell sounds: each skill display has two optional sound slots, each with a delay (`audio`/`audioDelay`, `audio2`/`audioDelay2`, default 0.5 s: `Jyx2SkillDisplayAsset.cs` 135, 142). `SkillCastHelper` schedules each present slot with `GameUtil.CallWithDelay` (105-113). `CallWithDelay` runs the action at once when the delay is 0 (132-135); otherwise it starts a timer (138) that is tied to the caster component and cancels when that component is destroyed (145). `ExecuteSoundEffect` (250-256) plays through `AudioManager.PlayClipAtPoint` at the camera position, at the SoundEffect volume (`AudioManager.cs` 100-104).
- No priority, no voice cap: each `PlayClipAtPoint` call stands alone in these files.
- Tick: none. These are event-driven calls (map load, battle start and end, skill cast). The only timing is the per-slot delay timer.

## 2. Key functions

- `AudioManager.PlayMusic(int)`: `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/Scripts/ResourceManagement/AudioManager.cs` 18-24.
- `AudioManager.PlayMusicAtPath`: same file, 45-60 (async load, set clip, Play; no stale-request check).
- `AudioManager.PlayMusic(AudioClip)`: same file, 26-34 (same-clip guard at 29).
- `LevelMaster.PlayMusic(LMapConfig)`: `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/Scripts/GameMaps/LevelMaster.cs` 271-287.
- `GetOutMusic`: `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/LuaScripts/Jyx2Configs/MapHelper.lua` 14-20.
- `LevelLoader.DoloadBattle`: `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/Scripts/GameMaps/LevelLoader.cs` 56-71.
- Cue scheduling: `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/Scripts/GameBattle/SkillCastHelper.cs` 105-113; `ExecuteSoundEffect` 250-256.
- `GameUtil.CallWithDelay`: `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/Scripts/Utils/GameUtil.cs` 130-146.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Track picked by the transition: leave track of the old zone, else entry track of the new one (LevelMaster 276-287) | Track ids come from the Map table (not read) |
| Override of the leave track, -1 means off (MapHelper.lua 15) | `ForceSetLeaveMusicId` with the -1 sentinel |
| Save the current track, play the battle track, restore on return (LevelLoader 58, 71) | Battle track from `battle.Music` (BattleLoader 107) |
| Two delayed sound slots per skill | Default delay 0.5 s, two slots (`Jyx2SkillDisplayAsset.cs` 135, 142) |
| Delay 0 plays now; otherwise timer, cancelled with its owner (GameUtil 132, 138, 145) | Threshold 0 (GameUtil 132) |
| Music volume and SFX volume from separate settings (AudioManager 89, 103) | Settings keys Volume and SoundEffect |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: the zone transition picks the leave track before the entry track (as LevelMaster 276-287), and battle saves and restores the current track (as LevelLoader 58 and 71). It adds a stale-load token (a defect fix: the donor's async `PlayMusicAtPath` has no check that a newer request has started, lines 53-58) and applies the same-track guard to every call, not only the clip overload (donor 29). It omits: crossfade (the donor has none), the Unity AudioSource details, the SoundEffect and Volume settings, the camera-position placement of SFX, and the null-camera case.

```ts
// Licence: restricted (donor LICENSE is a custom notice; file header says MIT for code). Clean-room sketch from the described mechanism.
export type Cancel = () => void;

// Zone music pair as the donor reads it: OutMusic (leave track), InMusic (entry track),
// ForceSetLeaveMusicId (overrides OutMusic when >= 0). -1 means "no track".
export interface ZoneMusic {
  inTrack: number;
  outTrack: number;
  forceLeaveTrack: number | null;
}

export class MusicDirector {
  private current: number | null = null;
  private loadToken = 0;

  constructor(
    private load: (id: number) => Promise<string | null>,
    private play: (clip: string) => void,
  ) {}

  // Zone transition: the leave track of the zone being left wins; otherwise the entry track of the new zone.
  enterZone(prev: ZoneMusic | null, next: ZoneMusic): void {
    let leave = -1;
    if (prev !== null) {
      leave = prev.forceLeaveTrack !== null && prev.forceLeaveTrack !== -1 ? prev.forceLeaveTrack : prev.outTrack;
    }
    this.setTrack(leave !== -1 ? leave : next.inTrack);
  }

  // Battle: remember the current track, play the battle track, and return the saved track for endBattle.
  beginBattle(battleTrack: number): number | null {
    const saved = this.current;
    this.setTrack(battleTrack);
    return saved;
  }

  endBattle(saved: number | null): void {
    if (saved !== null) this.setTrack(saved);
  }

  setTrack(id: number): void {
    if (id === -1 || id === this.current) return; // -1 is a no-op; the same track is not restarted
    this.current = id;
    // Fix: a slow load must not overwrite a newer request (donor PlayMusicAtPath has no such check).
    const token = ++this.loadToken;
    void this.load(id).then((clip) => {
      if (clip !== null && token === this.loadToken) this.play(clip);
    });
  }
}

// Two optional sound slots per skill, each with its own delay (donor: audio/audioDelay, audio2/audioDelay2).
export interface CueSlot {
  clip: string | null;
  delayS: number;
}

export function scheduleCueSlots(
  slots: CueSlot[],
  play: (clip: string) => void,
  after: (seconds: number, fn: () => void) => Cancel,
): Cancel[] {
  const cancels: Cancel[] = [];
  for (const s of slots) {
    if (s.clip === null) continue;
    const clip = s.clip;
    if (s.delayS === 0) {
      play(clip);
      continue;
    }
    cancels.push(after(s.delayS, () => play(clip)));
  }
  return cancels; // caller runs these when the caster is destroyed (donor: observable.AddTo)
}

export {};
```

## 5. Lands in

- TARGET `src/fight/sound-cues.ts` (client-only, new): the skill cue slots and the cancel on caster removal. Parity-checklist row 12 (combat sound cues). The zone track pick is zone data and would need its own origins file (not named here).
- Reuse tag: rewrite-from-idea (restricted licence; clean-room only)
- Brief rule served: 1 (one engine; sound is a client-only consumer); row 12 cue sub-line

## 6. Gaps and risks

- Restricted licence: the root `LICENSE` forbids use of the code and resources without authorization; the header says MIT. Clean-room, shape only: no code or assets copied.
- Missing parts of the topic: no crossfade on a track change (hard cut, 31-32, 57-58), no ambience beds per biome, no stingers beyond the battle switch, no priority, no voice limit. The donor does not have them, and this note does not claim them.
- Stale load race: `PlayMusicAtPath` (45-60) can finish an old load after a newer request. Fixed in the sketch with a token.
- If the zone changes during a battle, the restore plays the zone track saved before the battle. Not checked (not read).
- Frankendom rule: kills are server-verified. Cue delays are client presentation only; the server must never wait for a sound or a cue timer.
- SFX are placed at the camera, not at the source: a client choice in the donor, not a spatial model.
- Zone data: the track ids and the leave/entry pair must be zone data. The donor values are (not read).


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: Note states the same-clip guard (29) means returning after a battle 'does not restart' the track, and acceptance says previous track 'resumes without restarting'. Real: guard compares to the CURRENT clip, which is the battle clip by then (BattleLoader.cs:107), so LevelLoader.cs:71 PlayMusic(formalMusic) sets clip and calls Play() = restart from 0. Resume only holds if battle.Music is -1. Everything else verified: AudioManager 18-24, 29-33, 53-58, 62-78, 89, 100-104; LevelMaster 271-287; MapHelper.lua 14-20; LevelLoader 58/71; SkillCastHelper 105-113, 250-256; GameUtil 130-146; skill display delay 0.5 at 135/142 (file is SkillEditor/Jyx2SkillDisplayAsset.cs); licence text.
Missed: none beyond the restart semantics above (AudioManager.StopMusic 36-43 and async PlayClipAtPoint(string) 107-113 not mentioned, minor).

Also found: AudioManager.StopMusic (36-43) and the async PlayClipAtPoint(string) (107-113) exist and are not covered above.

Fixed 2026-10-12 (Sonnet fixer): the 'resumes without restarting' claim in the acceptance line and section 1 was wrong; the donor restarts the zone track from 0 after a fight unless the battle had no music. Verified in AudioManager.cs 26-34, BattleLoader.cs 107, LevelLoader.cs 58-71. Sketch unchanged (its setTrack also replays the saved track after a battle).
