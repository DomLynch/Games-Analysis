# jynew-jynew (sound-music, cell 15)

Donor: /mnt/frankendom-donors/jynew-jynew/jyx2/Assets/Scripts/ResourceManagement/AudioManager.cs | Licence: UNCLEAR (licence file has no standard text) | C# (Unity, XLua/Lua) | symbol AudioManager.PlayMusic / PlayClipAtPoint

## 1. Mechanism

- Two music entry points. `PlayMusic(int id)` (18-24) and `PlayMusic(AudioClip)` (26-34). The id form builds the path `Assets/BuildSource/Musics/<id>.mp3` and hands it to the async path loader. `id == -1` returns early and does not stop the current track.
- The clip form swaps the clip on the one background source only if the new clip reference differs from the current one, then calls `Play()`. The path form has no such check: loading the clip that is already playing assigns it again and calls `Play()`, which restarts it. `StopMusic` (36-43) stops the source; `GetCurrentMusic` (94-98) returns its clip.
- `PlayMusicAtPath` (45-60) awaits `ResLoader.LoadAsset<AudioClip>(path)`. When the load returns non-null (a null path returns early, 48-51), it assigns the clip to the background source and plays it. There is no ticket or cancel check: if two loads overlap, whichever finishes last wins.
- The background source is created lazily (`bgmAudioSource` getter) as a `DontDestroyOnLoad` GameObject named `[AudioManager]`, with `loop = true`. Exactly one music channel exists.
- `Init()` (82-92) runs before every public call. It calls `GameSettingManager.Init()` once and subscribes the Volume setting to the background source's volume, enforced immediately.
- Sound effects: `PlayClipAtPoint(clip, pos)` (100-105) and `PlayClipAtPoint(path, pos)` (107-113). Both read the SoundEffect setting at the call and call `AudioSource.PlayClipAtPoint`, a one-shot at a world position. The path form awaits the load first. It does not check for a null clip.
- Runs on the caller's call, with no per-frame update in this file. Music load is asynchronous. Sound effects are fire-and-forget.
- Output: Unity audio side effects only. No game state is written.

## 2. Key functions

- `AudioManager.PlayMusic(int id)`, `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/Scripts/ResourceManagement/AudioManager.cs`, lines 18-24. Id to path, async play; -1 means no change.
- `AudioManager.PlayMusic(AudioClip)`, same file, lines 26-34. Direct clip swap if the reference differs.
- `AudioManager.PlayMusicAtPath`, same file, lines 45-60. Async load, then assign and play on the single source.
- `AudioManager.Init`, same file, lines 82-92. One-time settings subscription for music volume.
- `AudioManager.PlayClipAtPoint(AudioClip, Vector3)`, same file, lines 100-105. One-shot SFX at a position, volume from the SoundEffect setting.
- `AudioManager.PlayClipAtPoint(string, Vector3)`, same file, lines 107-113. Async load, then the one-shot SFX.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants (theirs) |
|---|---|
| Id-to-path music lookup, with a sentinel that means "no music" | Path pattern `Assets/BuildSource/Musics/<id>.mp3` (theirs); sentinel `-1` (theirs) |
| One looping music channel, swapped on change | Loop flag `true` (theirs); one `[AudioManager]` object (theirs) |
| Volume read from settings, applied on change | Setting keys `GameSettingManager.Catalog.Volume` and `SoundEffect` (theirs) |
| Async load, then play when the load returns | `ResLoader` resource loader (theirs) |

## 4. TypeScript sketch

Clean-room sketch: written from the mechanism above, no lines translated. Keeps the donor's behaviour, including the last-load-wins race.

simplified: loading is a callback (the donor uses `ResLoader.LoadAsset`), there is no settings subscription (volume is set directly), and the sketch's `playById` does not guard against re-playing the same track, as in the donor; `stop` mirrors `StopMusic`.

```ts
// Licence: UNCLEAR (licence file has no standard text) - clean-room sketch, no lines translated
// Clean-room: one looping music channel; id to path; a load plays when it resolves, last to resolve wins.
type Loader = (path: string) => Promise<ArrayBuffer | null>;

class MusicChannel {
  private currentPath: string | null = null;
  private volume = 1;

  constructor(
    private load: Loader,
    private playBuffer: (data: ArrayBuffer, volume: number) => void,
    private stopPlayback: () => void,
  ) {}

  setVolume(v: number): void {
    this.volume = v;
  }

  async playById(id: number): Promise<void> {
    if (id === -1) return;
    const path = `musics/${id}.mp3`;
    const data = await this.load(path);
    if (data !== null) {
      this.currentPath = path;
      this.playBuffer(data, this.volume);
    }
  }

  playIfDifferent(path: string, data: ArrayBuffer): void {
    if (path === this.currentPath) return;
    this.currentPath = path;
    this.playBuffer(data, this.volume);
  }

  stop(): void {
    this.currentPath = null;
    this.stopPlayback();
  }
}
```

## 5. Lands in

- Frankendom file(s): TARGET `src/fight/sound.ts` (one looping music channel and one-shot cues). Zone-driven music selection belongs with the zones data, not here.
- Parity-checklist row: 12 (combat sound cues) is the nearest row; music has none, and the one-shots here are generic ambience.
- Reuse tag: rewrite-from-idea
- Brief rule served: (category default, not per-cell) zone-schema rule; rules 7-9 n/a

## 6. Gaps and risks

- Race: `PlayMusicAtPath` has no ticket, so an earlier slow load can start after a newer request and play the wrong track. Frankendom needs a request id or cancel.
- Hard cut on track change. No crossfade, ducking or pause on scene or dialogue change.
- `PlayClipAtPoint(path, ...)` does not check for a null clip. The behaviour on null was not traced.
- Music volume is subscribed once and kept live; sound-effect volume is read only at each call. A settings change mid-sound does not apply to playing one-shots.
- Licence conflict to flag: the file header says all code is MIT, but the licence file has no standard text, and the row licence is UNCLEAR. Treated as UNCLEAR, so clean-room only.
- Client only. No conflict with the one-engine ruling, because this is not a fight system; music or cue triggers come from server-verified fight events, never the reverse. Zone music chosen from data follows the zones-as-data ruling, not this code.
