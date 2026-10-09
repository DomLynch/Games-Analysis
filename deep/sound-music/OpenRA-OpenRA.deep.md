# OpenRA-OpenRA (sound-music, cell 15)

Donor: /mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Sound/Sound.cs | Licence: GPL-3 | C# | symbol Sound.Play / PlayLooped / PlayMusic

## 1. Mechanism
- Sound is the game's audio front end. The core Play(type, player, name, headRelative, pos, volumeModifier, loop) returns null when the name is empty, when all sound is disabled, when world sound is disabled and this is a world sound, or when a player is given and it is not the local player. Otherwise it asks the sound engine (`Play2D`, with the source loaded and cached by name through the `sounds` cache) for a source with `InternalSoundVolume` (the settings sound volume times a global modifier, line 318) times the cue's volume modifier, at the given position, with the headRelative flag deciding whether the position is relative to the listener.
- Public wrappers (160-177) choose the mode: no position means head-relative (UI or global); a position means positional (world). PlayLooped (166-167) sets the loop flag. `PlayToPlayer` passes a player for the owner gate. The overloads taking a list of names pick one with `world.LocalRandom` (169-177), a local, non-synced generator.
- Music: PlayMusicThen (231-246) returns if the track is missing, stores a completion callback, and unpauses the track if it is the current one; otherwise PlayMusic (248-268) stops the current track and streams the new one with the loop setting (`Settings.Sound.Repeat` from PlayMusicThen) and the music volume times the track's modifier.
- Tick (217-225) checks each game tick whether the music has completed. If so it stops music and calls the stored callback without a null check (`onMusicComplete()`, line 223); the callback is cleared only when a load fails (262).
- Video audio: a separate stream from memory, with pause, resume and stop.
- MuteAudio and UnmuteAudio set the engine volume to 0 or 1.
- Inputs: sound type, name, world position, volume modifier, owning player, loop flag. Output: an ISound handle, or null. Play runs at the call site; music-complete polling runs per game tick.

## 2. Key functions
- Sound.Play core (OpenRA) | /mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Sound/Sound.cs | 114-125 | gates and dispatch to the engine.
- Sound.PlayLooped (OpenRA) | /mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Sound/Sound.cs | 166-167 | looped positional or head-relative wrapper.
- Sound.Tick (OpenRA) | /mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Sound/Sound.cs | 217-225 | per tick: music complete check and callback.
- Sound.PlayMusicThen (OpenRA) | /mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Sound/Sound.cs | 231-246 | music with a completion callback; resumes the same track.
- Sound.PlayMusic (OpenRA) | /mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Sound/Sound.cs | 248-268 | stop, then stream the track with loop and volume.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Owner gate: only the local player hears their own event | none (algorithm) |
| Volume = base volume times a per-cue modifier | base volume and modifiers (theirs, in data) |
| Music completion polled per tick, then callback | none (algorithm) |
| Mute as a single engine volume | 0 and 1 (lines 144, 149) (algorithm) |

## 4. TypeScript sketch
simplified: the donor loads and caches sources by name (a missing file logs and yields no source), applies `InternalSoundVolume` (settings volume times a global modifier) rather than a plain base volume; the music state (`CurrentMusic`, pause/resume, repeat setting) is reduced to a flag and callback, the sketch's `playMusic` does not stop the previous track, and the donor's `Tick` does not null-check the callback.

```ts
// Licence: GPL-3 (OpenRA-OpenRA). CLEAN-ROOM: written from the mechanism, no donor lines.
type Kind = "ui" | "world";
type Pos = { x: number; y: number };
type Handle = { id: number };
type Req = { kind: Kind; name: string; pos: Pos | null; volume: number; loop: boolean };

class SoundFront {
  disableAll = false;
  disableWorld = false;
  baseVolume = 1;
  private onDone: (() => void) | null = null;
  private musicOn = false;

  constructor(private localOwner: string,
              private start: (r: Req) => Handle) {}

  play(kind: Kind, owner: string | null, name: string, pos: Pos | null, volMod = 1, loop = false): Handle | null {
    if (!name || this.disableAll) return null;
    if (kind === "world" && this.disableWorld) return null;
    if (owner !== null && owner !== this.localOwner) return null;     // only the local owner hears it
    return this.start({ kind, name, pos, volume: this.baseVolume * volMod, loop });
  }

  playMusic(track: string, volume: number, loop: boolean, then?: () => void): void {
    this.onDone = then ?? null;
    this.musicOn = true;
    this.start({ kind: "ui", name: track, pos: null, volume, loop });
  }

  // Called each tick with whether the track has finished.
  tick(finished: boolean): void {
    if (this.musicOn && finished) {
      this.musicOn = false;
      const f = this.onDone;
      this.onDone = null;
      f?.();
    }
  }
}
```

## 5. Lands in
- Frankendom target: `src/fight/sound.ts` (front door that checks owner and mute before playing a cue).
- Parity row: 12 (combat sound cues).
- Reuse tag: rewrite-from-idea (GPL-3)
- Brief rule served: (category default, not per-cell) zone-schema rule; rules 7-9 n/a

## 6. Gaps and risks
- Built for an RTS with many simultaneous players and fog. Frankendom duels have two sides; the owner gate maps to "whose cue is this", which needs a rule.
- No voice priority, ducking or pooling in lines 30-330 of this file (the rest was not read). Those would be needed for a dense fight with up to MAX_ATTACKERS = 3 attackers.
- Music completion is polled from a tick. Frankendom's music path should use its own clock or the Web Audio end event; do not copy the poll.
- The stop-then-start behaviour in PlayMusic has no crossfade.
- Audio is a client consumer of the one fight state; cue picks use a local RNG in the donor, which Frankendom must keep separate from the fight RNG.
