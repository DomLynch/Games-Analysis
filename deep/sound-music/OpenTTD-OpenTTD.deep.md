# OpenTTD-OpenTTD (sound-music, cell 15)

Donor: /mnt/frankendom-donors/OpenTTD-OpenTTD/src/sound.cpp | Licence: GPL-2.0 | C++ | symbol StartSound / SndPlayTileFx / SndPlayScreenCoordFx

## 1. Mechanism
- Effects are played through a bank of mixer channels. Each call picks a free channel, loads the sample if needed, sets its volume and pan, and starts it.
- SndPlayFx(sound) is a global effect: StartSound at pan 0.5 and full volume.
- SndPlayScreenCoordFx(sound, rect) is for things in the world. It takes the object's bounding rectangle in screen coordinates and walks the open windows from the back of the stack (the code comment says this checks the main viewport first), skipping windows with no viewport. The first viewport whose rectangle overlaps the object plays it. Pan is the object's centre x minus the viewport's left, divided by the viewport width (a width of 0 counts as 1); it is not clamped to 0..1. Volume is the zoom factor for that viewport's zoom level (closer is louder). If no viewport overlaps, nothing plays.
- SndPlayTileFx(sound, tile) (226-236) converts a tile to a screen rectangle: x at the tile centre, y at the tile's y minus half a tile (the comment says centre), z from the slope height, and a second point two tiles further along y, both through the isometric projection, then calls the screen path. `SndPlayVehicleFx` (238-244) passes a vehicle's own screen bounds to the same path.
- StartSound(sound, pan, volume): returns if volume is zero or the sound is unknown. If the sample is not loaded (rate 0) and its file pointer is empty, a load already failed and it returns (105-109). It then allocates a mixer channel first (if none is free, returns silently), and only then loads the sample through SetBankSource (a failed load clears the file pointer so it is never retried). Final volume is the sound's own base volume multiplied by the caller's volume (the raw product, not divided here; the mixer's scale was not read). Sets channel volume and pan and activates the channel.
- Inputs: sound id, world rectangle or tile, viewport list with zoom. Output: one mixer channel per call. Runs at the call site; no fixed tick.

## 2. Key functions
- SetBankSource (OpenTTD) | /mnt/frankendom-donors/OpenTTD-OpenTTD/src/sound.cpp | 69-88 | lazy sample load; a failed load is marked and not retried.
- StartSound (OpenTTD) | /mnt/frankendom-donors/OpenTTD-OpenTTD/src/sound.cpp | 98-121 | channel allocate, load, volume times base volume, pan, activate.
- SndPlayScreenCoordFx (OpenTTD) | /mnt/frankendom-donors/OpenTTD-OpenTTD/src/sound.cpp | 203-224 | topmost overlapping viewport: pan from screen x, volume from zoom table.
- SndPlayTileFx (OpenTTD) | /mnt/frankendom-donors/OpenTTD-OpenTTD/src/sound.cpp | 226-236 | tile centre to a screen rectangle, then the screen path.
- SndPlayFx (OpenTTD) | /mnt/frankendom-donors/OpenTTD-OpenTTD/src/sound.cpp | 246-249 | global effect at pan 0.5, full volume.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Pan from the object's screen x within the view | none (algorithm) |
| Distance attenuation by a zoom-level table | table 255, 255, 255, 190, 134, 8 (lines 124-126) (theirs) |
| Per-sound base volume multiplied by the call's volume | base table per sound id, values 80 to 128 (lines 128-139, copied to the pool at 159) (theirs) |
| Global effect at centre pan | pan 0.5 and full volume (theirs) |
| Lazy sample load with failure remembered | none (algorithm) |
| Silent failure when no channel is free | channel count (not read) (theirs) |

## 4. TypeScript sketch
simplified: no tile-to-rectangle projection or vehicle path; the channel is a boolean `free()` check rather than an allocated object; the zero-width guard is `Math.max(1, width)`; pan is left unclamped as in the donor.

```ts
// Licence: GPL-2.0 (OpenTTD-OpenTTD). CLEAN-ROOM: written from the mechanism, no donor lines.
type Rect = { left: number; right: number; top: number; bottom: number };
type View = { left: number; top: number; width: number; height: number; zoom: number };
const ZOOM_VOL = [255, 255, 255, 190, 134, 8];          // volume by zoom level (theirs)

type Ctx = { load(id: string): Float32Array | null; free(): boolean; play(s: Float32Array, pan: number, vol: number): void };
const failed = new Set<string>();                        // a failed load is never retried

function startSound(id: string, pan: number, vol: number, base: number, ctx: Ctx): void {
  if (vol === 0 || failed.has(id)) return;
  if (!ctx.free()) return;                               // donor allocates the channel before loading; none free: silent
  const sample = ctx.load(id);
  if (!sample) { failed.add(id); return; }
  ctx.play(sample, pan, base * vol);                     // donor: raw product, scaled by the mixer
}

// Pan and attenuate from the topmost view that overlaps the object.
function playAtRect(id: string, r: Rect, views: View[], base: number, ctx: Ctx): void {
  for (const v of views) {                               // donor iterates windows from the back (main viewport first)
    const overlaps = r.left < v.left + v.width && r.right > v.left && r.top < v.top + v.height && r.bottom > v.top;
    if (!overlaps) continue;
    const pan = ((r.left + r.right) / 2 - v.left) / Math.max(1, v.width);
    startSound(id, pan, ZOOM_VOL[v.zoom], base, ctx);
    return;
  }
}

function playGlobal(id: string, base: number, ctx: Ctx): void {
  startSound(id, 0.5, 255, base, ctx);                   // centre pan, full volume
}
```

## 5. Lands in
- Frankendom target: `src/fight/sound.ts` (pan from the fight camera's projected screen x, plus a cue cap), reading the camera of row 11.
- Parity row: 12 (combat sound cues).
- Reuse tag: rewrite-from-idea (GPL-2.0)
- Brief rule served: (category default, not per-cell) zone-schema rule; rules 7-9 n/a

## 6. Gaps and risks
- Isometric tile world. The tile-to-rectangle step does not transfer; Frankendom needs its own projected bounds.
- Attenuation is a zoom table, not a distance function. Frankendom would use camera distance, and the table is not the right model.
- Mixer channels are a fixed resource with silent drop. Frankendom needs a cue cap and a steal rule (the OpenBOR and DOOM sound-music notes show priority stealing).
- The donor's base volume table is per sound id and is theirs. Do not copy numbers.
- Audio is a client consumer of the one fight state; cue triggers come from server-verified events, never the other way.
