# lincity-ng-lincity-ng (sound-music, cell 1)

Donor: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity-ng/Sound.cpp` | Licence: GPL-2.0-or-later (Sound.cpp header: "either version 2 of the License, or (at your option) any later version"; the tree's COPYING.txt is GPL v2) | C++ | symbol `Sound::playMusic`

Checked: Read in full: `Sound.cpp` (510 lines) and `Sound.hpp` (104 lines); the whole theme file `data/music/default/default.xml`; `data/sounds/sounds.xml` lines 1-120 of 383 (rest not read; grep counts: 139 live sound entries, 71 resourceIDs, 54 group blocks). Callers checked by grep over `src/` for playSound, playASound, changeTrack, playMusic, setTechLevel, and fade terms. Confidence: high on the music path (read end to end); medium on the mixer side (SDL3_mixer not read, so no claim is made about how it treats a busy track or a NULL chunk). Scope: this donor covers only the music playlist and the effect pools. It has no hit or spell sounds, no layering, no stingers, no biome beds, no crossfades, no priority and no voice cap (grep for spell, voice, priority, crossfade, stinger, ambien, fade found nothing in `src/`; the only fade is the 1000 ms argument to `MIX_StopTrack`). camera_scope: not applicable (sound).

Best transferable idea: a music bed is chosen from a data list of progress windows keyed on one number, and when a track ends the next window that fits plays (silence when none fits).
Decision (proposed): adapt - the window list suits zone beds keyed on progression, but Frankendom must feed the progress value from the one ledger and key beds to zone data; the donor's gate is inert as shipped (see section 6).
Acceptance: a player's zone bed changes when ledger progression crosses a window bound, and a client test asserts that a window list with no fit returns silence in one pass.

## 1. Mechanism

- A theme is an XML playlist. `loadMusicTheme` reads each `<song>` (title, file, lowest and highest progress bound) in file order into `playlist` (195-227). Defaults: lowest 0.0 (198), highest 10000.0 (199). A highest of 0 in the data is replaced by `10 * MAX_TECH_LEVEL` (222-223), which is in practice no upper bound.
- Start: the constructor sets `currentTrack` to `playlist[0]` (278-280), calls `playMusic` (281), then registers `musicHalted` as the stopped callback on the music track (282).
- Pick (`playMusic`, 427-469): if music is enabled, progress percent = `tech_level * 100 / MAX_TECH_LEVEL`, rounded to one decimal (444-445). If the percent is below the song's lowest bound or above its highest bound (447-449), the song is refused: `changeTrack(NEXT_OR_FIRST_TRACK)` runs and `playMusic` is entered again (454-455). Otherwise the file is loaded and played on the music track (458-467).
- Advance: when the music track stops, `musicHalted` calls `changeTrack(NEXT_OR_FIRST_TRACK)` (371-376, 374). `changeTrack` moves to the next index, or to index 0 when past the end (401-410), then calls `playMusic` (397-409). Net effect: a forward circular scan for the next song whose window fits.
- Off/on: `enableMusic(false)` stops the music track with a 1000 ms fade argument (485-487). `enableMusic(true)` calls `playMusic` again (482-483).
- Effects (separate path): one track, `soundTrack`, carries every effect. `playASound` sets the gain and the audio and plays on that track each time (349-357). Named effects (`playSound(name)`, 313-335) pick one of the same-name variants at random (328-334).
- The progress value the gate reads is `tech_level` (Sound.hpp 92, default 0). Its only setter is `setTechLevel` (Sound.hpp 76). grep over `src/` finds no caller of `setTechLevel`, so in this tree `tech_level` stays 0. With 0: song 1 (lowest 0) passes; song 2 (lowest 1) and song 3 (lowest 2) are refused every time. The playlist therefore loops song 1 only.

## 2. Key functions

- `Sound::playMusic`: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity-ng/Sound.cpp` 427-469 (gate 442-456, load and play 458-467).
- `Sound::changeTrack`: same file, 385-424 (NEXT_OR_FIRST_TRACK at 401-410).
- `Sound::musicHalted` (track-stopped callback): same file, 371-376.
- `Sound::loadMusicTheme`: same file, 163-240 (per-song fields 195-227).
- `Sound::enableMusic`: same file, 471-489 (fade at 486).
- `Sound::playASound` and `Sound::playSound(name)`: same file, 349-357 and 313-335.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant |
|---|---|
| Window test, inclusive both ends (min <= progress <= max) | lowest default 0.0 (Sound.cpp 198); highest default 10000.0 (199); highest 0 means no limit (222-223) |
| Progress as a percent of a fixed scale, rounded to 0.1 | `MAX_TECH_LEVEL` 1000000 (theirs, `src/lincity/lin-city.hpp` 95); rounding (Sound.cpp 445) |
| Next window that fits, on track end | callback registered at 282; advance at 374 |
| Fade-out when music is switched off | 1000 ms (Sound.cpp 486) |
| Effect loudness | gain = 0.01 x volume 0-100 (Sound.cpp 332, 354) |
| Variant pick for a named effect | `rand() % count` (328) |

Data half (read): `data/music/default/default.xml` has three songs. "City Blues" (lowest 0, highest 0, i.e. no limit), "Architectural Contemplations" (lowest 1), "Pronobozo - Lincity" (lowest 2). Bounds are percent of the scale (see section 1). Sound pools: `data/sounds/sounds.xml` header says a sound inside a group goes to every resourceID listed earlier in that group (line 3). 139 live sound entries and 71 resourceIDs (grep count, not all read). Those pools are loaded (Sound.cpp 141-144) but the only code that reads them has no caller (section 6).

## 4. TypeScript sketch

simplified: keeps the donor's window test (inclusive ends), its 0.1 rounding, its "0 means no upper limit" sentinel (mapped to Infinity instead of 10 x scale) and its forward scan on track end. It takes progress as an argument instead of a setter field. It bounds the scan to one lap, because the donor recurses with no bound (playMusic 454 -> changeTrack -> playMusic) when no song fits. It omits audio loading, playback, the 1000 ms stop fade (FADE_OUT_MS is declared but not used), the effect track, the gain setting and the XML loader.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Song {
  title: string;
  file: string;   // data: file name inside the theme folder
  minPct: number; // data: lowest progress percent that may play this song
  maxPct: number; // data: highest progress percent; 0 means no upper limit
}

const PROGRESS_SCALE = 1000000; // raw progress that equals 100 percent (donor MAX_TECH_LEVEL)
const FADE_OUT_MS = 1000;       // fade when music is switched off (not used by this sketch)

// Raw progress -> percent, rounded to one decimal as in the donor.
function progressPct(raw: number): number {
  return Math.round((raw * 100 / PROGRESS_SCALE) * 10) / 10;
}

function fits(song: Song, pct: number): boolean {
  const top = song.maxPct === 0 ? Infinity : song.maxPct;
  return pct >= song.minPct && pct <= top;
}

class MusicPlaylist {
  private index = -1;

  constructor(private readonly songs: readonly Song[]) {}

  // Forward circular scan, at most one lap. Returns null when no song fits, so the caller stays silent.
  next(rawProgress: number): Song | null {
    const pct = progressPct(rawProgress);
    const n = this.songs.length;
    for (let step = 1; step <= n; step++) {
      const i = (this.index + step) % n;
      if (fits(this.songs[i], pct)) {
        this.index = i;
        return this.songs[i];
      }
    }
    return null;
  }

  // Called when the current track ends (donor: musicHalted -> NEXT_OR_FIRST_TRACK).
  onTrackEnded(rawProgress: number): Song | null {
    return this.next(rawProgress);
  }
}

const demoSongs: Song[] = [
  { title: "City Blues", file: "a.ogg", minPct: 0, maxPct: 0 },
  { title: "Contemplations", file: "b.ogg", minPct: 1, maxPct: 0 },
  { title: "Lincity", file: "c.ogg", minPct: 2, maxPct: 0 },
];
const demo = new MusicPlaylist(demoSongs);
const firstAtZero = demo.next(0);
const endedAtTwo = demo.onTrackEnded(20000); // 2 percent of the scale

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/sound-cues.ts` (new client-only module): a music-bed selector whose progress input comes from the server-verified ledger, not from a client setter. Parity-checklist row 12 (combat sound cues). Zone-bed selection has no row of its own; see section 6.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 8 (target file and parity row named); 7 (licence read, copyleft, clean-room)

## 6. Gaps and risks

- Defect 1, progress never fed: `setTechLevel` (Sound.hpp 76) has no caller in `src/`, so `tech_level` stays 0 (92) and only song 1 ever plays. Fix: pass progress in from the ledger each time a bed is chosen; add a test that a progress change alters the chosen bed.
- Defect 2, unbounded recursion: when no song fits, `playMusic` (454) -> `changeTrack` (397-409) -> `playMusic` loops forever. Fix: one-lap scan that returns silence (the sketch does this). Not triggered in this tree only because song 1 has no lower bound.
- Defect 3, wrong handle on free: the destructor calls `MIX_DestroyMixer(NULL)` (Sound.cpp 300) instead of the mixer. Fix: pass the mixer handle.
- Defect 4, music audio leak: `playMusic` frees the old music only while the track is still playing (437-438), then sets the pointer to 0 (439) either way. Fix: free unconditionally before reassigning.
- Defect 5, null chunk kept: a sound that fails to load is still pushed into its group (137-143). Fix: skip a null chunk before the push. What SDL3_mixer does with a NULL chunk was not read.
- Defect 6, dead pools: `Construction::playSound` (`src/lincity/lintypes.cpp` 851-856), `Transport::playSound` and `playSound(const MapTile&)` (Sound.cpp 337-347) have no caller in `src/` (grep). So the 139 per-building sounds are loaded and never played. The only live effect call is `playSound("Click")` (`src/lincity-ng/MainMenu.cpp` 412). Fix: wire them or drop the data. The body of `Transport::playSound` (`track_road_rail.cpp` 340-366) was not read.
- Defect 7, possible race (not tested): the loader thread inserts into `waves` (Sound.cpp 147) while `playSound(name)` reads it (321-333) with no lock, and the loader starts at 261 before the menu can play "Click". Fix: finish loading before the first effect, or guard the map.
- Frankendom gap: this donor has no hit or spell sounds, no layering (two beds at once), no stinger (one-shot over a bed), no biome-keyed bed, no crossfade (beyond the 1 s stop fade), no priority, no voice cap. Those need other donors; none were searched here.
- Frankendom gap: with one effect track, a new effect replaces the playing one (355-356). Frankendom needs a voice cap and priority per sound class; this donor has neither.
- Frankendom gap: the window is keyed on progression, but a zone bed should be keyed on zone data. The donor has no zone concept; the window list would have to become a zone-data field.
- Frankendom ruling: the progress value must come from the one ledger and be server-verified; music stays client-only and must never affect a fight result.
- Licence GPL-2.0-or-later: clean-room only. The sketch is written from the described mechanism.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: 8 (target file and parity row named); 7 (licence, clean-room)
