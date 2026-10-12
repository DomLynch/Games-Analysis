# flareteam-flare-game (sound-music, cell 15)

Donor: `/mnt/frankendom-donors/flareteam-flare-engine/src/SDLSoundManager.cpp` (engine code; the game repo holds only data) with data at `/mnt/frankendom-donors/flareteam-flare-game/mods/empyrean_campaign/maps/river_trail.txt` | Licence: engine GPL-3.0 (COPYING: "Version 3, 29 June 2007"); game data CC-BY-SA 3.0 (LICENSE.txt: "Attribution-ShareAlike 3.0 Unported") | C++ engine, map text data | symbol `SDLSoundManager::logic`, `SDLSoundManager::play`

Checked: read in full: flareteam-flare-engine src/SDLSoundManager.cpp 47-141 (per-frame distance and pause), 143-157 (reset), 218-282 (play), 319-372 (music); src/SoundManager.h 20-91 (interface, virtual channels); src/EventManager.cpp 1092-1115 (map sound events); src/Entity.cpp 168-203 (hit, die, block sounds on named channels); src/MapRenderer.cpp 271-281 and src/GameSwitcher.cpp 89-110 (music by map and by menu); src/EngineSettings.cpp 72 and 121 (falloff). Data: river_trail.txt 170-200 read; other maps counted by grep only. Not read: the game-loop caller of SoundManager::logic; SDL_mixer's own behaviour (Mix_SetPosition with channel -1 is an SDL API question, not checked here); Entity sound_hit list loading. Confidence: high for the per-frame loop-pause and the named-channel rule (read end to end); medium for the failure path at play() (read, not run). Depth: full for the sound manager; the cell also covers hit sounds, which are read only through Entity.cpp 178-203.

## 1. Mechanism

One sound manager with three kinds of playback. Listener = the hero (`pc->stats.pos`), not the camera.

- Named virtual channels. `play()` takes a channel name. If the name already has a playing sound, that sound is halted first (SDLSoundManager.cpp:252). The name is then registered to the new mixer channel (255). The default channel is `__global__` and is exempt, so default sounds never halt each other (243). Hit, die, critdie and block sounds use the name `entity_<kind>_<sound id>` (Entity.cpp:182-201). So the voice key is the clip, not the monster: two hits with the same clip cut each other, two different clips overlap.
- Distance per frame (`logic`, 94-121). Each playback with a location gets distance v = dist(hero, location) / sound_falloff (102). Looping sounds pause when v > 1 and resume when v < 1 (103-110). Every playback (looping or not) then gets v clamped to 0..1 and mixed at 255 x v (117-118), applied with `Mix_SetPosition(channel, 0, dist)` (121). Angle 0 is passed, so this code sets distance only; there is no pan term.
- Start distance (`play`, 270-276). The same formula is applied once at start, using `(location.x != 0 || location.y != 0)` as the "has a location" test (270).
- Falloff radius: `sound_falloff` (engine setting, default 15 tiles; EngineSettings.cpp:72) is the radius beyond which a loop is paused. Its own comment says it is the maximum radius in tiles that any single sound is audible (EngineSettings.cpp:121).
- Mixer voices: `Mix_AllocateChannels(128)` (SDLSoundManager.cpp:62). `play` asks for any free channel (`Mix_PlayChannel(-1, ...)`, 263). There is no priority. If none is free, the only response is a log line (265-266).
- Music: `loadMusic(file)` does nothing if the same file is already loaded and playing (323-327). Otherwise it unloads the old track, which halts it (`stopMusic` = `Mix_HaltMusic`, 361), loads the new one and plays it looped forever (355). I found no `Mix_FadeIn` or `Mix_FadeOut` in the file, so track changes are hard cuts.
- Who sets music: each map (`MapRenderer::loadMusic`, MapRenderer.cpp:271-276) and each menu state from `engine/default_music.txt` (GameSwitcher.cpp:96-106). If music volume is 0, it stops music instead (MapRenderer.cpp:278-279).
- Map sound events (EventManager.cpp:1092-1115). A map `event` with `soundfx=` plays at its location: position = tile + 0.5 (1103-1104). A sound on an `on_load` event loops by default (1108). Sound is played on the default channel (1113).
- Data (grep counts, mods/*/maps): 92 map files set `music=`; 11 distinct music values; 1761 `soundfx=` event lines; 19 distinct environment loop files (`soundfx/environment/...`). In river_trail.txt the wind bed is an event at `location=0,0,1,1` (175-177) and the river loops are events at tiles such as `location=8,24,1,1` (182). The wind bed sits at tile (0,0).

## 2. Key functions

- `SDLSoundManager::logic`: `/mnt/frankendom-donors/flareteam-flare-engine/src/SDLSoundManager.cpp` 76-141. Per frame: cleanup of finished one-shots, skip sounds at (0,0), distance, pause and resume for loops, mixer position.
- `SDLSoundManager::play`: `/mnt/frankendom-donors/flareteam-flare-engine/src/SDLSoundManager.cpp` 218-282. Named channel halt, reference count, start on any free channel, start distance.
- `SDLSoundManager::loadMusic` / `playMusic` / `stopMusic`: `/mnt/frankendom-donors/flareteam-flare-engine/src/SDLSoundManager.cpp` 319-362.
- `EventManager` map sound event: `/mnt/frankendom-donors/flareteam-flare-engine/src/EventManager.cpp` 1092-1115.
- `Entity::playSound`: `/mnt/frankendom-donors/flareteam-flare-engine/src/Entity.cpp` 178-203 (per-clip named channel for hit, die, critdie, block).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant (theirs) |
|---|---|
| Loop pauses beyond the radius, resumes inside | radius = sound_falloff, default 15 tiles (EngineSettings.cpp:72; SDLSoundManager.cpp:102-110) |
| Volume byte from distance | 255 x clamp(distance / falloff, 0, 1) (SDLSoundManager.cpp:117-118) |
| One voice per name | named channel; a new sound on the name halts the old one (SDLSoundManager.cpp:252) |
| Voice pool | 128 mixer channels (SDLSoundManager.cpp:62), no priority |
| Music change | hard halt, no fade (SDLSoundManager.cpp:361, 355) |
| Map bed | `on_load` event loops by default (EventManager.cpp:1108) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: named-channel halt before the new start, a free-slot check, the start distance, then a per-frame loop pause or resume and distance update. It omits the reference counts and cleanup of finished one-shots, the SDL calls, the music load and stop, and the event-to-position mapping. Fixes against the donor, each in the code: a sound with no position is an explicit `null`, not the (0,0) sentinel that the donor's checks use (SDLSoundManager.cpp:94, 270; EventManager.cpp:1097, 1102 skip tile x or y equal to 0); a full mixer returns -1 before any bookkeeping (donor still calls Mix_SetPosition and inserts a playback keyed -1, 276-281); the self-check tests a far loop, a global bed and a named clip replacing itself.

```ts
// Licence: GPL-3.0 (donor engine) and CC-BY-SA 3.0 (donor game data). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

interface Pt { x: number; y: number; }

const SOUND_FALLOFF = 15;   // tiles; engine setting default (donor EngineSettings.cpp:72)
const CHANNELS = 128;       // mixer channels (donor SDLSoundManager.cpp:62)

interface Cue {
  id: number;
  loop: boolean;
  at: Pt | null;      // null = global bed / no position (fix: explicit flag, not a (0,0) sentinel)
  paused: boolean;
  dist: number;       // 0..255, 0 = full volume
}

function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

class CueMixer {
  private live = new Map<number, Cue>();          // mixer slot -> cue
  private named = new Map<string, number>();      // named channel -> mixer slot (one voice per name)

  constructor(private hero: () => Pt) {}

  private freeSlot(): number {
    for (let i = 0; i < CHANNELS; i++) if (!this.live.has(i)) return i;
    return -1;
  }

  private distanceByte(at: Pt | null): number {
    if (at === null) return 0;
    const v = Math.min(1, Math.max(0, dist(this.hero(), at) / SOUND_FALLOFF));
    return Math.floor(255 * v);
  }

  stop(slot: number): void {
    this.live.delete(slot);
    for (const [name, s] of this.named) if (s === slot) this.named.delete(name);
  }

  // Donor rule: a new sound on a named channel halts the old one on that name first.
  play(id: number, channel: string | null, at: Pt | null, loop: boolean): number {
    if (channel !== null) {
      const old = this.named.get(channel);
      if (old !== undefined) this.stop(old);
    }
    const slot = this.freeSlot();
    if (slot < 0) return -1;            // fix: return before any bookkeeping (donor keeps going with channel -1)
    this.live.set(slot, { id, loop, at, paused: false, dist: this.distanceByte(at) });
    if (channel !== null) this.named.set(channel, slot);
    return slot;
  }

  // Per frame: loops pause beyond falloff and resume inside it; one-shots only update their distance.
  tick(): void {
    for (const c of this.live.values()) {
      if (c.at === null) continue;
      const v = dist(this.hero(), c.at) / SOUND_FALLOFF;
      if (c.loop) {
        if (v > 1 && !c.paused) { c.paused = true; continue; }
        if (v < 1 && c.paused) c.paused = false;
      }
      c.dist = this.distanceByte(c.at);
    }
  }

  get(slot: number): Cue | undefined { return this.live.get(slot); }
  count(): number { return this.live.size; }
}

// Self-check: a far-away loop pauses, a global bed plays at full level, and a named clip replaces itself.
let hero: Pt = { x: 0, y: 0 };
const m = new CueMixer(() => hero);
const wind = m.play(1, "bed_wind", { x: 100, y: 100 }, true);
const bed = m.play(2, "bed_global", null, true);
const hitA = m.play(3, "entity_hit_7", { x: 3, y: 3 }, false);
const hitB = m.play(3, "entity_hit_7", { x: 4, y: 4 }, false);
m.tick();
const windCue = m.get(wind);
const bedCue = m.get(bed);
if (windCue === undefined || !windCue.paused) throw new Error("far loop did not pause");
if (bedCue === undefined || bedCue.dist !== 0) throw new Error("global bed not at full level");
if (hitA < 0 || hitB < 0 || m.count() !== 3) throw new Error("expected wind, bed and one hit");
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0; compiled and run with node on the VPS, self-check exit 0.

## 5. Lands in

- TARGET `src/fight/sound-cues.ts` (new client module; sound is client-only, the engine only emits cue ids). Parity-checklist row 12 (combat sound cues). Hit and die clip voices belong here. Map ambience beds and loops are zone data (one entry per emitter: clip, position, loop, radius), not code in this module.
- Reuse tag: rewrite-from-idea (GPL-3.0 engine and CC-BY-SA 3.0 data; clean-room only)
- Brief rule served: 1 (one engine emits cue ids; the client plays them); addendum sound-music rules (layering, beds, voice limits)

## 6. Gaps and risks

- Licence: GPL-3.0 code and CC-BY-SA 3.0 data. Clean-room only; the sketch is written from the mechanism.
- No crossfade. Music changes are hard halts (SDLSoundManager.cpp:361). Frankendom's biome border crossfades are not in this donor and must be designed.
- Sound at tile x = 0 or y = 0 is not positional. Engine checks use (0,0) as "no position" (94, 270), but the map event only sets a position when both coordinates are non-zero (EventManager.cpp:1097, 1102). A sound on the first row or column becomes a global bed. Fix in the sketch: explicit `null`.
- Failed start: `play` logs when no channel is free, but still calls `Mix_SetPosition(c, 0, d)` with c = -1 (276) and inserts the playback keyed -1 (281); the reference count was raised before the start (260). Read, not run. On SDL the -1 channel may mean all channels (SDL API, not checked here). Fix in the sketch: return early.
- The 128-channel pool has no priority. A new hit can be dropped while an ambient loop keeps a voice, the same problem as the Exult donor. Frankendom needs cue priority classes.
- One voice per clip, not per monster: `entity_hit_<clip>` (Entity.cpp:182). In a many-on-one fight, two monsters that hit with the same clip share one voice and the second cuts the first. For MAX_ATTACKERS = 3 this may be fine, but it is a choice to make, not a free property.
- Pan is not used: angle 0 is passed (SDLSoundManager.cpp:121). Positional sound here is distance only. Frankendom's camera is over-the-shoulder, so left and right would need a real pan term.
- The listener is the hero's tile (`pc->stats.pos`, line 102), not the camera. Frankendom should choose the listener on purpose (camera-centred vs actor).
- Hit and spell cues: hit, die, critdie and block are read (Entity.cpp 178-203); spell cues are not read.
- Stingers: not read. Layered music: one music track (MapRenderer.cpp:276) plus default-channel one-shots and loops; no music layers were found in the read code.

Reuse tag: rewrite-from-idea (GPL-3.0 engine and CC-BY-SA 3.0 data; clean-room only)
Brief rule served: 1 (one engine emits cue ids; the client plays them); addendum sound-music rules (layering, beds, voice limits)

Best transferable idea: Pause a looping ambience when the listener is beyond its radius and resume it inside, and key each hit voice by the clip name so one clip cannot pile up.
Decision (proposed): adapt - keep the radius pause and the named-clip voice key for zone loops and hit cues; fix the (0,0) no-position sentinel, the failed-start path and add real priority; reject the flat no-pan distance-only model for the over-the-shoulder camera.
Acceptance: Walk 15 tiles away from a river loop and it goes quiet and returns when you come back; a second hit with the same clip restarts that clip and does not stack a second copy (client unit test of CueMixer.tick and play, no server involved).
