# OpenTTD-OpenTTD (sound-music, cell 2)

Donor: `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/sound.cpp` | Licence: GNU GPL version 2 (`sound.cpp` header: "as published by the Free Software Foundation, version 2", no "or later" in that header; `COPYING.md` is the GPL text) | C++ | symbol `SndPlayScreenCoordFx`

Checked: The hint file `src/sound.cpp` is the right file for the FX path (read 90-308 in full: `StartSound`, the zoom and trim tables, `SndPlayScreenCoordFx`, the tile, vehicle and global entry points). Also opened: `src/mixer.cpp` (read 20-60, 120-225: channel pool, allocation, mix-time effect curve, constant-power pan), `src/music_gui.cpp` (read 190-200 shuffle, 440-462 `MusicLoop`), `src/music.cpp` (grep only), `src/newgrf/newgrf_act0_sounds.cpp` (grep for priority). Not read: the bank loader in `sound.cpp` 1-90 (`OpenBankFile`, `SetBankSource`), mixer channel close and resampling internals, and the music playlist class in full. Confidence: high on the FX gate, pan and voice pool (read end to end); medium on the claim that nothing reads `priority` (grep over the sound, mixer and music files plus a NewGRF grep; not a full cross-tree search). camera_scope: n/a (sound cell).

Best transferable idea: Play a cue only when its event rectangle overlaps a player's view, pan it by where it sits in that view, and scale its loudness by the view's zoom level.
Decision (proposed): adapt — the visibility gate, the constant-power pan and the zoom loudness fit a per-player client, but the donor drops the newest cue when all 8 channels are busy, so Frankendom takes OpenRCT2's priority eviction instead.
Acceptance: At 375 wide a hit on an enemy whose hit box is off-screen plays no cue; a cue at the left edge plays fully left with pan clamped to [0, 1] and finite, non-negative gains; the same hit at Out4x zoom plays at 134/255 of the close-up loudness.

## 1. Mechanism

- Entry points. Tile and vehicle cues reach the gate: `SndPlayTileFx` (226) and `SndPlayVehicleFx` (238) both call `SndPlayScreenCoordFx` (203) with a rectangle. `SndPlayFx` (246-248) is the global path: `StartSound(sound, 0.5, UINT8_MAX)`, centred and full volume, with no gate.
- Gate (206-210). Windows are iterated from the back, so the main view is tested first. A window with a viewport whose virtual rectangle overlaps the event rectangle wins. If no viewport overlaps, the loop ends and nothing plays (no fallback). A match returns at once, so one event plays once.
- Pan (212-214). The event centre minus the viewport's left, divided by the viewport width. This value is not clamped (see defect D1).
- Loudness (219). `_vol_factor_by_zoom` is indexed by the viewport zoom: 255 for In4x, In2x and Normal, 190 for Out2x, 134 for Out4x, 8 for Out8x (125; zoom enum at `src/zoom_type.h` 20-30).
- `StartSound` (98-121), in order: volume 0 returns (100); a null sound returns (103); a sound with no loaded file and rate 0 returns (108); allocate a channel (111); no free channel returns (112), which drops the cue; bank source `SetBankSource` (114, body not read); volume = per-sound trim × zoom factor (117); channel gains from pan (119); activate (120).
- Pool. `_channels[8]` (mixer.cpp 42). `MxAllocateChannel` (171-177) takes the first free bit of the complement of the active mask, or returns null. No priority is compared.
- Channel gains (mixer.cpp 214-219). Constant-power pan: left = sin((1 − pan) π/2) × volume, right = sin(pan π/2) × volume (comment at 216 says it keeps the power level steady).
- Mix time (mixer.cpp 149-155). The master effect setting is cubed and divided by 127 × 127. `MxMixSamples` (125) applies it to each active channel, and closes a channel when its samples run out (167).
- Priority. `SoundEntry.priority` is set by NewGRF (`newgrf_act0_sounds.cpp` 50) and reset to 0 at load and set change (`sound.cpp` 160, 188). Nothing in the playback path reads it. This donor's policy is first-free and drop-when-full.
- Music (search, not a full read). The music system keeps a playlist with shuffle (`music_gui.cpp` 190-200: each slot swaps with a random later slot) and a status check called from the main loop (`MusicLoop`, 448). A grep for "fade" in `music.cpp`, `music_gui.cpp`, `mixer.cpp` and `sound.cpp` found nothing. So no crossfade, stinger or biome bed appears in these files.

Order of operations per event: gate → pan → loudness → allocate (drop if none) → channel gains → activate → at mix time, the effect cube scales the mix.

Defects (keep the idea, fix the defect):
- D1, pan is not clamped. The gate (210) passes an event whose rectangle overlaps the view even when its centre lies outside it. So `panning` (214) can be negative or above 1. The channel gains (218-219) then take `sin` of a value outside [0, π/2] and cast a possibly negative float to `uint`. A negative float cast to an unsigned type is undefined behaviour in C++, so the gain is wrong. fix: clamp pan to [0, 1] before `StartSound` (the sketch does this, marked "Fixed").
- D2, drop-newest with no priority. When all 8 channels are busy, a new cue is silently dropped (112, 175). A cue that confirms a hit or a kill can be lost to ambient cues. fix: adopt the priority eviction from the OpenRCT2 cell (the lowest-priority channel is stopped only if the newcomer outranks it). This is not in the sketch here.

## 2. Key functions

- `SndPlayScreenCoordFx`: `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/sound.cpp` 203-224. Gate, pan and loudness.
- `StartSound`: same file, 98-121. Order: validity checks, channel allocation, trim × zoom, gains, activate.
- `MxAllocateChannel`: `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/mixer.cpp` 171-177. First free channel or null.
- `MxSetChannelVolume`: same file, 214-220. Constant-power pan gains.
- Mix-time effect curve: same file, 149-155, inside `MxMixSamples` (from 125).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants (theirs) |
|---|---|
| Gate: play only if the event overlaps a visible view | Overlap test on the viewport rectangle (210); no fallback |
| Pan = event centre relative to the view, over view width | Global FX pan 0.5 (248) |
| Constant-power stereo gains | sine law (218-219) |
| Loudness by zoom level | 255, 255, 255, 190, 134, 8 (125), one per zoom level In4x to Out8x |
| Per-sound trim × zoom factor | Trim table from 128 with 90 and 80 entries (128 onward) |
| Fixed voice pool, first free, drop when full | 8 channels (mixer.cpp 42) |
| Master effect curve | Cubic, divided by 127 × 127 (154-155) |

## 4. TypeScript sketch

simplified: the sketch keeps the gate, the zoom loudness, the constant-power pan, the cubic effect curve and the first-free allocation. It adds the pan clamp (D1, marked "Fixed"). It omits the bank loader, the channel closing and resampling, the NewGRF priority byte, the tile and vehicle rectangle helpers (the caller passes the rectangle), the per-sound trim table, and the priority eviction (D2), which comes from the OpenRCT2 cell.

```ts
// Licence: GPL-2.0 (donor, sound.cpp header "version 2"). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface View { left: number; width: number; zoom: number; }   // one player's view, world px; zoom index 0..5
interface Rect { left: number; right: number; }                  // event extent along the view's x axis

const MAX_CHANNELS = 8;                              // engine constant: fixed channel pool
const ZOOM_LOUDNESS = [255, 255, 255, 190, 134, 8];  // engine constant: loudness by zoom index (0 = closest)

// Gate + pan + zoom loudness. An event with no overlapping view is silent (no fallback).
// The first matching view wins, so one event plays once.
function spatialGain(views: View[], ev: Rect, trim: number): { gain: number; pan: number } | null {
  for (const v of views) {
    if (!(ev.left < v.left + v.width && ev.right > v.left)) continue;
    const centre = (ev.left + ev.right) / 2 - v.left;
    // Fixed: the event may straddle the view edge, so the centre can fall outside [0, width].
    // The donor passes that raw pan on to the channel gains.
    const pan = Math.min(1, Math.max(0, centre / Math.max(1, v.width)));
    const gain = trim * (ZOOM_LOUDNESS[v.zoom] / 255);
    return { gain, pan };
  }
  return null;
}

// Constant-power pan: left and right gains keep the summed power steady across the stereo field.
function panGains(gain: number, pan: number): { left: number; right: number } {
  const p = Math.min(1, Math.max(0, pan));
  return { left: Math.sin((1 - p) * Math.PI / 2) * gain, right: Math.sin(p * Math.PI / 2) * gain };
}

// Master effect volume setting 0..127, cubic so the slider tracks perceived loudness.
function effectCurve(setting: number): number {
  const s = Math.min(127, Math.max(0, Math.floor(setting)));
  return Math.floor((s * s * s) / (127 * 127));
}

// First free channel of the fixed pool; null means the cue is dropped (donor behaviour, no priority).
function allocateChannel(busy: boolean[]): number | null {
  const i = busy.indexOf(false);
  return i === -1 ? null : i;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/cue-spatial.ts` (new client-side module: maps an engine event to a per-player cue gain and pan, and gates it on the player's view; sound is client-only and the engine never imports it). Parity-checklist row 12 (combat sound cues). I did not read Frankendom's current cue code.
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
- Brief rule served: 1 (one engine; sound is a client that reads engine events); rule 8 (target and row named)

## 6. Gaps and risks

- GPL-2.0: clean-room only. The sketch is written from the mechanism, not the donor lines.
- D1 (pan not clamped) is a real defect in the donor, read from the code, not run. Frankendom's version must clamp (sketch), and a test should assert finite, non-negative gains at the view edges.
- D2 (drop-newest, no priority) conflicts with Frankendom's rule that a confirmation cue is never silenced by ambient ones. Frankendom needs the priority eviction from the OpenRCT2 cell and its own top class for server-verified outcomes (kill, death).
- The priority byte is read from NewGRF data and then never used, so the donor shows a field that looked like priority but did nothing. Frankendom should not add a priority field without the eviction that uses it.
- The visibility gate is per player view. A third-person follow camera (the world camera the owner wants improved) and the frozen Pit camera both need the same test. The zoom table has no third-person analogue here. Camera distance to the source could play that role, but the donor does not do it and this is not read as a camera mechanism.
- No biome beds, crossfades or stingers in these files (search only). Frankendom's ambience and crossfade needs are not covered by this donor.

Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
Brief rule served: 1 (one engine, sound is a client); rule 8 (target and parity row 12 named)
