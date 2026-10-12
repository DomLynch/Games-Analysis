# openmw (sound-music, cell 2)

Donor: `/mnt/frankendom-donors/openmw/apps/openmw/mwsound/regionsoundselector.cpp` | Licence: GPL-3.0 (`/mnt/frankendom-donors/openmw/LICENSE`: "GNU GENERAL PUBLIC LICENSE" / "Version 3, 29 June 2007") | C++ (OpenAL, OSG) | symbol `RegionSoundSelector::getNextRandom`

Checked: The hint file `soundmanagerimp.cpp` (1446 lines) was not read in full. Read: lines 50-125 and 300-360 (fade helpers, music), 960-1073 (region and water update, water action, 3D cull), 1074-1140 and 1214-1262 (update loop, music update, frame entry). The real mechanism is the region ambience director: `regionsoundselector.cpp` and `.hpp` (read in full, 42 and 23 lines), called from `SoundManager::updateRegionSound`. Also read in full: `watersoundupdater.cpp` (72 lines). Also read: `sound.hpp` 94-160 (exponential fade), `openaloutput.cpp` 836-866 and 1203-1216 (voice pool), `components/esm3/loadregn.hpp` 44-60 (region sound record), `components/misc/rng.hpp` 30-46, `apps/openmw/engine.cpp` 212-232, `files/openmw.cfg` (fallback lines, read via grep), and `LICENSE` header. Candidate files opened: 11 (listed above). Confidence: high for the region director and the fade; medium for the wider `soundmanagerimp.cpp` (lines 126-300, 360-960 and 1140-1200 not read, and they hold the 3D play path). The region sound lists and chances are game data (ESM records from the player's game files), not in this box, so their values are "(not read)". The shipped defaults come from `files/openmw.cfg`; the game's own fallback values may override them (not checked). Not a camera cell.

Best transferable idea: Each zone rolls a one-shot ambience after a random silent gap between min and max seconds, plays the first list entry that passes its percent roll, and never runs two one-shots at once, so a zone's list is its whole ambience design.
Decision (proposed): adapt — take the one-slot silent-gap director as the zone ambience layer with the min/max gap and the entry list as zone data; add voice priority and an overlap crossfade for biome borders, which this donor does not have.
Acceptance: Walking outdoors in a zone, an ambience one-shot starts after 1 to 5 s of silence drawn from that zone's own list, never two at once, and never indoors; a test asserts the first attempt is immediate and the gap timer does not run while a one-shot plays.

## 1. Mechanism

One director per listener, called every frame with the frame time (`engine.cpp` 228 feeds `frametime`; `soundmanagerimp.cpp` 1252 calls `updateRegionSound(duration)`, not behind the 1/30 s throttle in `updateSounds` at 1089-1091).

Order of operations in `updateRegionSound` (966-980):
1. Skip unless the player's cell is exterior or quasi-exterior (972-973). Interiors get no region ambience.
2. If the one-shot slot is playing, return (974-975). The director is not called, so its timer stops.
3. Otherwise call `getNextRandom(duration, region)` (977). Inside it:
   - add frame time to `mTimePassed` (20);
   - if the timer is below the gap, return nothing (22);
   - otherwise draw `a` in [0,1] (25), set the next gap to `min + (max - min) * a` (26), reset the timer to 0 (27), look up the player's region by id (29-30; no region, nothing plays), then walk its sound list in data order (35): the first entry with `roll0to99() < chance` wins (37-38). If none passes, nothing plays, and a new gap has already been drawn (40).
4. A winner plays once at volume 1.0 and pitch 1.0 (979) and becomes the slot.

Timing consequences (computed from the code): the first outdoor frame attempts at once because the timer starts at 0 (`regionsoundselector.hpp` 16; 0 < 0 is false). The gap runs only while the slot is silent, so it is measured from the end of the previous one-shot. Each attempt has the chance of the first passing entry, so the probability that nothing plays is the product of (1 - chance/100) over the entries, and an early entry blocks the later ones.

Defaults from `files/openmw.cfg`: gap min 1.0 s (225), max 5.0 s (226). The record stores each entry as a sound id and a one-byte chance (`loadregn.hpp` 45-48), and the list is `mSoundList` (60).

Sibling mechanisms in the same file set (read, not the main note):
- Exponential fade (`sound.hpp` 99-154): the step is 4.6 divided by the duration (113), so the volume closes about 99% of the gap in one duration (computed: e^-4.6 is about 0.01). The fade ends by snapping when the sign flips or the gap is under 1e-4 (133-151). Distance culling fades out for 1.0 s and fades back in for 1.0 s (`soundmanagerimp.cpp` 55-56, 1055-1070); the cull distance is 2000 units for flagged sounds (57).
- Water bed (`watersoundupdater.cpp` and `soundmanagerimp.cpp` 982-1010, 1015-1050): one looped sound whose base volume follows proximity. Indoors, a linear falloff inside 512 units (config 55). Outdoors, the code samples an N by N grid (N = 8, radius 1000, config 51-52) of terrain heights, counts underwater points, and uses `underwater * 2 / N^2`, clamped to 1 (23, 64). Starting, changing and stopping follow the action table at 1018-1048.
- Music (`soundmanagerimp.cpp` 333-358, 1214-1231): a new track fades the current one out (343) and waits (341); the next track starts after the fade ends (1216-1221). There is no overlap. Scripted music cannot be interrupted by built-in playlists (353-354).
- Voice pool (`openaloutput.cpp` 843, 1207-1210): sources are allocated up to the device limit, capped at 256. When none are free, the new sound is refused with a log line, and no priority or eviction happens (none found in `soundmanagerimp.cpp` by grep).

## 2. Key functions

- `RegionSoundSelector::getNextRandom` 18-41 (`regionsoundselector.cpp`): the gap timer, interval draw, region lookup, chance list.
- `SoundManager::updateRegionSound` 966-980 (`soundmanagerimp.cpp`): outdoor gate, one-shot slot, the call.
- `SoundManager::update` 1233-1255: the frame entry that calls the director.
- `Sound::setFade` 99-122 and `Sound::updateFade` 130-154 (`sound.hpp`): exponential fade.
- `WaterSoundUpdater::update` 18-26 and `getVolume` 28-71 (`watersoundupdater.cpp`): proximity volume.
- `SoundManager::getWaterSoundAction` 1015-1050: start, set, finish.
- `OpenALOutput::playSound` 1203-1216 (`openaloutput.cpp`): the pool refusal.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Silent gap drawn from a min to max range, timer frozen while a one-shot plays | gap 1.0 to 5.0 s (`openmw.cfg` 225-226) |
| Per-entry percent roll, first success in list order wins | one byte per entry, roll 0 to 99 (`loadregn.hpp` 48; `rng.hpp` 44) |
| Exponential fade with a -40 dB end | k = 4.6 / duration (`sound.hpp` 102-113); sfx in and out 1.0 s (`soundmanagerimp.cpp` 55-56) |
| Distance cull | 2000 units for flagged sounds (`soundmanagerimp.cpp` 57) |
| Water bed proximity | sample radius 1000 (config 51), points 8 (config 52), indoor tolerance 512 (config 55), outdoor 1024 (config 56) |
| Voice pool | 256 sources (`openaloutput.cpp` 843) |

## 4. TypeScript sketch

simplified: keeps the region director (outdoor gate, timer frozen during a one-shot, silent gap with first attempt immediate, first-passing percent roll), the exponential fade step with the donor's sign-flip snap, and the two water-volume formulas. It omits the Sound object and the play call, the 3D cull and its fades, the initial fade-in heuristic, the water action state machine, the terrain sampling (the caller passes the underwater count), and the one-point water branch. The fade uses the donor's Euler step. The donor's outdoor point count is an input here, not computed.

```ts
// Licence: GPL-3.0 donor (openmw). Clean-room: written from the described mechanism, no donor lines are translated.
export interface AmbienceEntry { soundId: string; chancePct: number; } // chancePct 0..100, first success wins in list order

export interface AmbienceZone { minGapS: number; maxGapS: number; entries: AmbienceEntry[]; outdoor: boolean; }

export interface Rng {
  draw(): number;   // uniform in [0, 1]
  rollPct(): number; // integer in [0, 99]
}

// Region ambience director: one-shot slot, random silent gap, per-entry chance list.
export class AmbienceDirector {
  private gapS = 0;       // first attempt is immediate (donor timer starts at 0)
  private elapsedS = 0;   // silent time since the last attempt

  constructor(private readonly rng: Rng) {}

  // Call every frame with the frame time. Returns the one-shot to start, or null.
  step(dtS: number, zone: AmbienceZone | null, oneShotPlaying: boolean): string | null {
    if (zone === null || !zone.outdoor) return null;
    if (oneShotPlaying) return null;  // the gap timer does not run while a one-shot plays
    this.elapsedS += dtS;
    if (this.elapsedS < this.gapS) return null;
    this.gapS = zone.minGapS + (zone.maxGapS - zone.minGapS) * this.rng.draw();
    this.elapsedS = 0;
    for (const e of zone.entries) {
      if (this.rng.rollPct() < e.chancePct) return e.soundId;
    }
    return null;
  }
}

// Exponential fade toward a target: v += k * (target - v) * dt, k = 4.6 / duration (about -40 dB after duration).
// Ends by snapping to the target when the sign flips or the gap is below 1e-4.
export function stepFade(vol: number, target: number, durationS: number, dtS: number): { vol: number; done: boolean } {
  if (durationS <= 0) return { vol: target, done: true };
  const k = 4.6 / durationS;
  const before = target - vol;
  const after = before - k * before * dtS;
  if (Math.sign(before) !== Math.sign(after) || Math.abs(after) < 1e-4) return { vol: target, done: true };
  return { vol: target - after, done: false };
}

// Outdoor water bed: share of sampled points under water, scaled by 2 (half under water is full volume), clamped to 1.
export function outdoorWaterVolume(underwaterPoints: number, pointsPerSide: number): number {
  return Math.min(1, (underwaterPoints * 2) / (pointsPerSide * pointsPerSide));
}

// Indoor water bed: linear falloff inside the tolerance, zero outside.
export function indoorWaterVolume(distToWater: number, tolerance: number): number {
  if (distToWater >= tolerance) return 0;
  return (tolerance - distToWater) / tolerance;
}

export {};
```

## 5. Lands in

- TARGET `origins/zones/ambience.ts` (new, client-side zone ambience director; the path was not checked against the repo). The gap numbers and entry lists are zone data. Sound is client-only, so the server never reads this.
- Parity-checklist row 12 (combat sound cues) is the nearest row. No row covers zone ambience. The batch hint said row 14, which is HUD in the addendum. Lead should confirm or add a row for zone ambience.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only, the sketch is written from the mechanism)
- Brief rule served: 1 (one engine, zones as data; ambience is client-only); rules 7-9 n/a

## 6. Gaps and risks

- Zones as data: the donor's gap numbers come from a global config, and its chance lists come from each region record. Frankendom should put min gap, max gap, entry list and outdoor flag on each zone, with defaults in the engine.
- Voice limits: the donor refuses a new sound when all 256 sources are busy and has no priority. A hit cue fired while ambience holds the pool is dropped. Fix to add: evict the lowest-priority voice, ambience first, so a hit cue always gets a voice. This is not in the donor.
- Biome borders: the donor's music handover is fade-out then start, with no overlap. For a border crossfade, use the overlap pattern in the duelyst cell (open-duelyst-duelyst, audio_engine.js 398-416) instead.
- Each one-shot plays at volume 1.0 and pitch 1.0 (979). Per-entry volume is a missing field: add it to the zone entry rather than normalising the audio files.
- The water bed scales underwater points by 2 (64), and the clamp (23) hides that half under water is already full volume. Write that scale into the zone data so a designer can read it.
- The one-point water branch (41-44) ignores the terrain and uses level distance only, while the sampled branch uses terrain. Pick one behaviour for Frankendom.
- The region lists and the chances are game data and were not read; the numbers quoted are the shipped defaults only.
