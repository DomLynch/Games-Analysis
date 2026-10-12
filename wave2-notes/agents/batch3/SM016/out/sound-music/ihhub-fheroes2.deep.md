# ihhub-fheroes2 (sound-music, cell 15)

Donor: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/game/game.cpp` (`Game::EnvironmentSoundMixer`, 194-325), with `src/fheroes2/audio/audio_manager.cpp` (`playLoopSoundsImpl`, 646-776) and `src/engine/audio.cpp` (mixer and music) | Licence: GNU GPL version 2, "or (at your option) any later version" per the file headers (`LICENSE` is GPL v2, June 1991); copyleft, clean-room shape only | C++ | symbol `Game::EnvironmentSoundMixer`

Checked: `Game::EnvironmentSoundMixer` (game.cpp 194-325) read in full; `playLoopSoundsImpl` and the public API in audio_manager.cpp (510-961) read in full, including `findPairOfClosestSoundEffects` (594-629); `playMusic` and `Music` stop and fade in `src/engine/audio.cpp` (466-548, 1040-1075) read; the two call sites (game.cpp 327-349, game_startgame.cpp 1418-1428) read. Confidence: high on the loop budget, the emitter scan and the reconcile order; high on the music resume and fade-in; medium on the 3D angle convention (derived from the code comment at game.cpp:284-291, not checked against a running build). Not read: the async worker class body (audio_manager.cpp about 250-490, only its entry points were read), `Mixer::Play` past the `Mix_PlayChannel` line (engine audio.cpp 860-880), the `Music::Play` wrapper, `MUS::FromGround` (the ground-to-track table), the rest of `M82::getAdventureMapTileSound` past line 262 (`src/fheroes2/agg/m82.cpp`), and the SDL_mixer `Mix_SetPosition` algorithm (third-party, not in the tree).

Best transferable idea: reconcile the playing ambient loops against the wanted emitters every frame (keep exact matches, re-aim the nearest leftover loop of the same sound, start new ones, stop the rest) so a loop never restarts on a tick, with a channel budget that reserves some voices.
Decision (proposed): adapt - keep the reconcile-and-reuse step and the reserved-channel budget for zone and ambience loops; fix the donor's missing angle wrap-around, the loop budget that can starve one-shots, and the cut on focus change; add the crossfade the donor lacks.
Acceptance: a client unit test on `reconcile` shows an unchanged emitter keeps its voice id across two calls and an emitter at 1 degree and one at 359 degrees count as 2 degrees apart; a play test shows the zone bed fading in over 900 ms and resuming where it left off on return.

## 1. Mechanism

- Who asks: `Game::EnvironmentSoundMixer` (game.cpp:194) runs on focus change (`restoreSoundsForCurrentFocus`, 327-349) and on every hero movement animation step with a non-zero offset (game_startgame.cpp:1424-1425). So the ambient set is refreshed at animation rate while the hero moves.
- Budget: `availableChannels` starts as the mixer channel count (game.cpp:196). If 2 or fewer are free it returns (197-200). Otherwise 2 are kept back "for hero's movement" (198, 202). The mixer itself is set to 32 channels (audio_manager.cpp:785).
- Scan: a square of radius `maxOffset` = 3 tiles around the focus (229, 237-247), grown by one while the hero moves (232-235). Positions are sorted by squared distance, nearest first (250-251).
- Audible radius: `maxDistance` is the corner distance of the scan square (253). Tiles at or beyond it are skipped (269-272). Distance is quantised to 0..255 (274-279).
- Source type: `M82::getAdventureMapTileSound` maps the tile to a loop sound id or `UNKNOWN` (258-261). Stream tiles map to a fixed loop (`m82.cpp:207-208`); object types map through a switch (211 onward, rest not read).
- Angle: when 3D audio is on, `atan2(x, -y)` on the offset from the hero's pixel position, normalised to 0..360 (283-296). When it is off, angle stays 0 (so each sound id appears once, the nearest tile).
- Merge: a second source of the same sound at the same angle is dropped; the nearer one is already there because the list is sorted (298-313). Each new source costs one channel (318). The scan stops when the budget reaches 0 (319-321). So under a budget the nearest sources win.
- Hand-off: the list goes to the audio worker (324) through `playLoopSoundsAsync` (audio_manager.cpp:835-841).
- Reconcile (`playLoopSoundsImpl`, audio_manager.cpp:646-776), in this order:
  1. Drop loops whose voice has stopped (659-672).
  2. Keep exact matches of the same sound, angle and distance without touching them (688-700).
  3. For what is left, pair the closest existing loop of the same sound (`findPairOfClosestSoundEffects`, 594-629: smallest angle difference first, then smallest distance difference), move it with `Mixer::setPosition` (710-723).
  4. Stop the loops nobody reuses (739-748).
  5. Start the rest as looped voices (751-775; `Mixer::Play(..., true, ...)` at 765).
- Music bed: `restoreSoundsForCurrentFocus` (focus on a hero) plays `MUS::FromGround(tile ground)` with `RESUME_AND_PLAY_INFINITE` (game.cpp:339; castle at 349). So the music is chosen by the ground of the focus tile, and each track keeps its own position.
- Music play: `playMusic` (engine audio.cpp:502-548) resumes from the remembered position if more than 1 s was played (528-529), otherwise starts at 0 (538-541). Fade-in is `musicFadeInMs`, set to 900 at start-up (audio_manager.cpp:800). `playMusic` asserts no music is playing (507), so the old track must be halted first; stopping is `Mix_HaltMusic` with no fade-out (1059), and in resume mode the position is saved (1065-1067).
- Stinger and restore: `MusicRestorer` (audio_manager.h:65-77; cpp 823-833) records the last requested track at construction (824) and restarts it in resume mode on destruction (832). A short music effect inside its scope is followed by a resume of the bed.
- One-shots: `PlaySoundImpl` plays a WAV once on any free channel (audio_manager.cpp:521; engine audio.cpp:867 `Mix_PlayChannel( -1, ...)`). There is no priority. A synchronous `PlaySound` first removes queued async sound tasks (854).

## 2. Key functions

- `Game::EnvironmentSoundMixer`: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/game/game.cpp` 194-325. Budget, scan, distance, angle, merge, hand-off.
- `playLoopSoundsImpl`: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/audio/audio_manager.cpp` 646-776. Reconcile in five steps.
- `findPairOfClosestSoundEffects`: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/audio/audio_manager.cpp` 594-629. Pairing rule.
- `playMusic` and `Music::Stop`: `/mnt/frankendom-donors/ihhub-fheroes2/src/engine/audio.cpp` 502-548 and 1040-1075. Resume, fade-in, halt.
- Focus and movement call sites: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/game/game.cpp` 327-349; `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/game/game_startgame.cpp` 1418-1428.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Keep a reserved part of the voice pool for the player's own sounds, budget the rest | 32 channels (audio_manager.cpp:785); 2 reserved (game.cpp:198, 202) |
| Scan a fixed square around the focus, sorted nearest first | Radius 3 tiles (game.cpp:229); +1 while moving (234) |
| Audible radius at the scan-square corner | Corner distance (game.cpp:253); tiles at or past it skipped (270) |
| Distance quantised to a byte | 0..255 (game.cpp:275) |
| One loop per sound and direction, nearest wins | Direction = angle from the atan2 of the offset (game.cpp:291); mono = angle 0 |
| Reuse exact matches, re-aim the closest, start new, stop surplus | Pairing: smallest angle difference, then smallest distance difference (audio_manager.cpp:613-622) |
| Music resume after a short effect | Resume only after more than 1 s played (audio.cpp:528); fade-in 900 ms (audio_manager.cpp:800) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order: drop finished loops, keep exact matches, re-aim the closest leftover of the same sound, start new loops, stop surplus. It also keeps the nearest-first emitter scan with one emitter per sound and direction and a channel budget. It changes three things. It wraps the angle difference on the circle (the donor takes a plain difference, audio_manager.cpp:610). It takes the budget as a parameter (the donor subtracts two fixed reserved channels, game.cpp:202). It takes the mixer through an interface and does not run the donor's worker thread or its mutex. It omits the 3D-off mono path beyond the angle-0 flag, the tile-to-sound mapping, the pixel offset from the hero, the music side and the MusicRestorer.

```ts
// Donor licence: GPL-2.0-or-later (per the donor's file header: "version 2 ... or (at your option) any later version"). Clean-room sketch of the shape of the mechanism, not a translation of the donor lines.
// clean-room
export interface Emitter {
  sound: string;       // loop sound id
  angle: number;       // degrees, 0 = straight ahead, 90 = right; 0 when 3D audio is off
  distance: number;    // 0..255, 255 = edge of the audible radius
}

export interface Loop extends Emitter { voice: number; }

export interface Candidate {
  sound: string | null; // null = no loop for this tile
  dx: number;           // offset from the listener, screen units, y grows downwards
  dy: number;
}

export interface Mixer {
  isPlaying(voice: number): boolean;
  play(sound: string, angle: number, distance: number): number | null; // starts a looped voice
  setPosition(voice: number, angle: number, distance: number): void;
  stop(voice: number): void;
}

// Angle distance on a circle. Fix: the donor takes a plain difference, so 359 and 1 look 358 degrees apart.
function angleDiff(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
}

// Pick the emitters for this frame: nearest first, one per sound and angle, within a channel budget.
export function collectEmitters(candidates: Candidate[], maxDist: number, budget: number, is3D: boolean): Emitter[] {
  const sorted = candidates
    .filter((c): c is Candidate & { sound: string } => c.sound !== null)
    .map((c) => ({ ...c, d: Math.hypot(c.dx, c.dy) }))
    .filter((c) => c.d < maxDist)
    .sort((a, b) => a.d - b.d);

  const out: Emitter[] = [];
  for (const c of sorted) {
    if (out.length >= budget) break;
    const distance = Math.min(255, Math.round((c.d * 255) / maxDist));
    let angle = 0;
    if (is3D) {
      angle = Math.round(((Math.atan2(c.dx, -c.dy) * 180) / Math.PI + 360) % 360);
    }
    if (out.some((e) => e.sound === c.sound && e.angle === angle)) continue; // a nearer source already covers this direction
    out.push({ sound: c.sound, angle, distance });
  }
  return out;
}

// Reconcile the playing loops with the wanted emitters. Matching loops keep playing; the closest
// leftover loop of the same sound is re-aimed; only then is a new loop started; surplus loops stop.
export function reconcile(wanted: Emitter[], current: Loop[], mixer: Mixer): Loop[] {
  const pool = current.filter((l) => mixer.isPlaying(l.voice));
  const out: Loop[] = [];

  const todo: Emitter[] = [];
  for (const w of wanted) {
    const i = pool.findIndex((l) => l.sound === w.sound && l.angle === w.angle && l.distance === w.distance);
    if (i >= 0) {
      out.push({ ...w, voice: pool[i].voice });
      pool.splice(i, 1);
    } else {
      todo.push(w);
    }
  }

  for (const w of todo) {
    let best = -1;
    let bestAngle = Infinity;
    let bestDist = Infinity;
    for (let i = 0; i < pool.length; i++) {
      const l = pool[i];
      if (l.sound !== w.sound) continue;
      const a = angleDiff(l.angle, w.angle);
      const d = Math.abs(l.distance - w.distance);
      if (a < bestAngle || (a === bestAngle && d < bestDist)) {
        best = i;
        bestAngle = a;
        bestDist = d;
      }
    }
    if (best >= 0) {
      const l = pool.splice(best, 1)[0];
      mixer.setPosition(l.voice, w.angle, w.distance);
      out.push({ ...w, voice: l.voice });
    } else {
      const voice = mixer.play(w.sound, w.angle, w.distance);
      if (voice !== null) out.push({ ...w, voice });
    }
  }

  for (const l of pool) mixer.stop(l.voice);
  return out;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (`/tmp/sm016-fheroes2-loops.ts`) exits 0.

## 5. Lands in

- TARGET `src/fight/cues.ts` for the voice budget and the reconcile step (hit and spell loops). The zone ambience and music bed belongs in a client audio module that does not exist yet; it is a gap, not a named file.
- Parity-checklist row 12 (combat sound cues). The list hint said row 14, but row 14 is HUD. No row covers music or ambience beds.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one engine decides which cues exist; clients choose and mix the sound); rules 7-9 n/a

## 6. Gaps and risks

- Copyleft (GPL-2.0-or-later): clean-room only. The sketch has no donor line.
- Defect D1, angle wrap: `std::abs( effectToAdd.angle - effectToReplace.angle )` (audio_manager.cpp:610) does not wrap. A loop at 359 degrees and a wanted one at 1 degree count as 358 apart, so the wrong loop is re-aimed across the front. Fix: wrap the difference (the sketch does).
- Defect D2, budget starves one-shots: the loop budget is every channel except 2 (game.cpp:196-202), and one-shots take any free channel (`Mix_PlayChannel( -1, ...)`, engine audio.cpp:867). With many emitters near the hero, a hit or UI sound may find no channel. This is a risk, not measured. Fix: cap the loop budget at a fixed share (for example 8 of 32) and keep a one-shot pool.
- Defect D3, cut on focus change: `restoreSoundsForCurrentFocus` calls `ResetAudio` (game.cpp:329), which stops every loop and the music (audio_manager.cpp:943-960), then restarts them. Nothing is reused across a focus change. Fix: call `reconcile` instead of stop-all.
- Defect D4, the restorer can restore the wrong track: `MusicRestorer` restores `lastRequestedMusicTrackId` (audio_manager.cpp:824), not the track that was playing. The header records the race (audio_manager.h:110-117). Fix: take the playing track under the same mutex when the restorer is built.
- Defect D5, no crossfade: stopping halts the old track (audio.cpp:1059) and the new one fades in over 900 ms (audio_manager.cpp:800). There is no fade-out and no overlap. Fix (adapt): fade the old track out while the new one fades in, over a zone-data time.
- Frankendom rule: the emitter scan and the budget are client-only. The engine never reads them, and no ambience decides a hit or a kill.
- The donor's music is per ground type, which is the nearest thing here to a biome bed (game.cpp:339). The mapping table (`MUS::FromGround`) was not read, so do not treat it as a biome list.
- The ambient loops are per object and per water tile, not per biome; the stream rule is at m82.cpp:207-208.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: 1 (one engine; clients choose the sound); rules 7-9 n/a
