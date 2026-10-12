# PixelGuys-Cubyz (sound-music, cell 15)

Donor: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/audio.zig` | Licence: GPL-3.0 (LICENSE file read: "GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007") | Zig | symbol `mixMusic` (with `setMusic`, `currentMusic`)

Checked: `mixMusic` (audio.zig 291-333), `setMusic` (283-289), `currentMusic` state and `init`/`evaluatePolynomial` (248-276), `utils.unitIntervalSpline` (utils.zig 1472-1479), both callers (game.zig 391; protocols.zig 670-672), biome music field (biomes.zig 261, 303), `music_tracks.zig` (68 lines, read in full) and two biome data files. Confidence high on the fade order and numbers. Not read: `utils.Cache` eviction (whether a buffer still being faded can be freed), miniaudio device rate behaviour, the server code that picks the biome. Sound is not a camera cell, so no camera_scope tag.

Best transferable idea: a bed keyed to the current zone whose fade starts from the current gain and slope, so the player walking back into the previous zone mid-fade reverses smoothly instead of jumping.
Decision (proposed): adapt - keep the zone-keyed bed and the reversal rule, but overlap the old and new beds for the same 5 s instead of the donor's dip to silence (a defect), because a border crossing should not go quiet.
Acceptance: walk from a bog zone into a cold-mountain zone in the browser: the bog track falls while the mountain track rises over the same 5 s with no silent gap; step back into bog at 2.5 s and the bog track continues from its current level with no audible jump.

## 1. Mechanism

- One looping music track plays at a time, chosen by biome. The server sends the player's biome index (protocols.zig 670). The client swaps it in and calls `setMusic` only when the index changed (671-672). On join, the placeholder biome's track is set (game.zig 391). The track id is the biome zon key `music` (biomes.zig 303, default `cubyz:totaldemented/cubyz`); data lives in `assets/cubyz/biomes/**.zig.zon`, e.g. bog (`bog/base.zig.zon:19`) and cold mountains (`cold_mountains.zig.zon:12`). How the biome zon files inherit from `_defaults` files was not read.
- `setMusic` (283-289) stores the requested id and returns at once if it is the same as the current one.
- The output callback clears the buffer and calls `mixMusic` (348-349). Each callback, `mixMusic` takes one of three paths (294-310):
  (a) nothing is playing: the wanted track starts once it is loaded (296-297); its amplitude rises from 0 to 1 (`currentMusic.init`, spline at 263).
  (b) the wanted track differs from the playing one and no fade is running: the fade-out starts (303) from the current amplitude and velocity down to 0 (305), and the wanted track is preloaded (302).
  (c) the wanted track is the playing one while a fade-out runs: the fade reverses (307-310) from the current amplitude and velocity up to 1, and progress restarts at 0.
- Per stereo frame (317-331): progress advances by 1/(5 s x sample rate). While progress is at most 1, amplitude is the cubic in progress (326-327) times the music volume (318). When a fade-out ends (319-323) the old track is dropped (322), and the output is silent (312) until the next callback starts the wanted track. The read position wraps to 0 at the end of the buffer (333).
- Net effect at a biome border: the old track fades out over 5 s, then the new one fades in over 5 s. The two never overlap, so there is about 5 s of quiet at each border, plus any load wait. Crossing back during the fade reverses from the current level.
- The curve (utils.zig 1472-1479) is the cubic a + bt + ct^2 + dt^3 through (p0, m0) at t = 0 and (p1, m1) at t = 1, with c = -3p0 - 2m0 + 3p1 - m1 and d = 2p0 + m0 - 2p1 + m1 (1476-1477). Passing the current velocity as m0 keeps the curve continuous when a fade is restarted or reversed.

## 2. Key functions

- `mixMusic`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/audio.zig` 291-333. The whole state machine and sample loop.
- `setMusic`: audio.zig 283-289.
- `currentMusic.init` (257) and `evaluatePolynomial` (267): audio.zig 248-276 (state and spline evaluation).
- `utils.unitIntervalSpline`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/utils.zig` 1472-1479.
- Callers of `setMusic`, both read: `game.zig` 391 (on join) and `network/protocols.zig` 672 (on biome change). A grep of `preferredMusic` across `src/` on the VPS found no other caller.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| One fade length for both fade-in and fade-out | 5.0 s (`animationLengthInSeconds`, audio.zig 278) |
| Progress per sample = 1 / (length x rate) | rate 44100 requested (223) and assumed as the global rate (231); the device's real rate is never read back |
| Cubic from (current gain, current slope) to (target, 0) | target 0 on fade-out (305); target 1 on reversal (310); fade-in starts at (0, 0) and ends at (1, 0) (263) |
| Output = track sample x volume x fade gain | music volume `main.settings.musicVolume` (318) |
| Fallback track when a biome has no `music` key | `cubyz:totaldemented/cubyz` (biomes.zig 303) |
| Zone track ids (data) | bog `cubyz:totaldemented/leaves` (bog/base.zig.zon:19); cold mountains `cubyz:sinanimea/sunrise` (cold_mountains.zig.zon:12) |
| Mood fields (declared, not used for selection) | anxiety default 0.7 in caves, 0.3 otherwise (music_tracks.zig 16); tolerance 0.5 (41); chance 1.0 (42) |

## 4. TypeScript sketch

simplified: the sketch steps in seconds per frame (`dt`), not per sample, so it needs no fixed sample rate. It omits resampling, OGG loading and the cache, the asynchronous preload (a bed is assumed to have its track ready), the buffer read position and its wrap, the music volume setting, and the mood-based track choice (never wired in the donor). It changes two donor behaviours: the outgoing and incoming beds overlap for the same time (the donor dips to silence), and a list of beds lets a third zone arrive mid-fade and start at once (the donor ignores it until the running fade-out finishes). It keeps the donor's reversal, where a fade restarts from the current gain and slope. It clamps gain to 0..1, which the donor does not do.

```ts
// Licence: GPL-3.0 donor (PixelGuys-Cubyz). Clean-room sketch of the shape only, not a translation.
const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

// Cubic Hermite on u in [0,1]: value p0 at u=0 with slope m0, value p1 at u=1 with slope m1.
function hermite(p0: number, m0: number, p1: number, m1: number, u: number): number {
  const u2 = u * u, u3 = u2 * u;
  return p0 * (2 * u3 - 3 * u2 + 1) + m0 * (u3 - 2 * u2 + u) + p1 * (3 * u2 - 2 * u3) + m1 * (u3 - u2);
}

function hermiteSlope(p0: number, m0: number, p1: number, m1: number, u: number): number {
  const u2 = u * u;
  return p0 * (6 * u2 - 6 * u) + m0 * (3 * u2 - 4 * u + 1) + p1 * (6 * u - 6 * u2) + m1 * (3 * u2 - 2 * u);
}

// One music bed: a looping track whose gain follows a fade curve.
export class Bed {
  gain = 0;        // current gain, 0..1
  slope = 0;       // d(gain)/d(second) at the current instant
  to = 0;          // target gain of the current fade
  private from = 0;
  private m0 = 0;  // start slope in the fade's own u units
  private u = 1;   // fade progress 0..1 (1 = settled)
  private span = 1; // fade length in seconds

  constructor(readonly track: string) {}

  // Start a fade from the current gain and slope, so the curve has no jump on reversal.
  fadeTo(target: number, seconds: number): void {
    if (target === this.to) return; // already heading there: keep the running curve
    this.from = this.gain;
    this.m0 = this.slope * Math.max(seconds, 1e-6);
    this.to = target;
    this.u = 0;
    this.span = Math.max(seconds, 1e-6);
  }

  step(dt: number): void {
    if (this.u >= 1) return;
    this.u = Math.min(1, this.u + dt / this.span);
    this.gain = clamp01(hermite(this.from, this.m0, this.to, 0, this.u));
    this.slope = hermiteSlope(this.from, this.m0, this.to, 0, this.u) / this.span;
  }

  get silent(): boolean {
    return this.to === 0 && this.u >= 1;
  }
}

// Zone music: the bed for the current zone fades up while every other bed fades to 0 over the same time.
export class ZoneMusic {
  private beds: Bed[] = [];

  constructor(private readonly fadeSeconds: number) {}

  setZone(track: string): void {
    let wanted = this.beds.find((b) => b.track === track);
    if (!wanted) {
      wanted = new Bed(track);
      this.beds.push(wanted);
    }
    for (const b of this.beds) b.fadeTo(b === wanted ? 1 : 0, this.fadeSeconds);
  }

  // Call every frame with the real frame time in seconds.
  step(dt: number): void {
    for (const b of this.beds) b.step(dt);
    this.beds = this.beds.filter((b) => !b.silent);
  }

  // Gains to hand to the mixer, one entry per bed still audible.
  gains(): { track: string; gain: number }[] {
    return this.beds.map((b) => ({ track: b.track, gain: b.gain }));
  }
}
```

Typecheck: the sketch is a module (it already has `export`). `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS: exit 0.

## 5. Lands in

- TARGET `origins/client/zone-music.ts` (new, client-only: sound is client-only under the Frankendom rulings). Parity-checklist row 12 (combat sound cues) is the nearest row; ambience has no row of its own. The task hint said row 14, but row 14 is the HUD, so it was not used.
- today: not checked in this pass (Frankendom's current audio code was not read).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only, shape not code)
- Brief rule served: client-only sound and zones as data (addendum, "Frankendom context"); no numbered brief rule applies.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism and the standard Hermite basis.
- Dip to silence (donor defect): the old track reaches 0 before the new one starts, so each border costs about 5 s of quiet plus any load wait. Fix: overlap the two beds (sketch).
- Overlap of linear gains: the sketch's gains always sum to 1, so for two unrelated tracks the mid-fade power dips by about 3 dB. Fix (not in sketch, not measured): an equal-power curve.
- Fixed rate: the donor assumes 44100 Hz (223, 231) and never reads the device rate back. Fix: the sketch steps on real frame time; in the browser use the audio clock.
- Loop seam: the read position wraps to 0 (333) with no crossfade at the loop point. Whether this is audible was not measured. Fix (not built): crossfade the loop end into the start.
- Zone border flicker: the donor has no hysteresis. Every index change fires a fade (protocols.zig 671-672), so a player standing on a border between two zones would fade back and forth. Fix: a dwell timer in the zone data (for example `dwellSeconds`) before the zone counts as entered. Not read whether the donor's server does this.
- Mood selection is declared but not wired: the track list (music_tracks.zig 47-64) has no caller of `getSlice` in `src/` (grep on the VPS). The anxiety, energy and sanity distance (22-26) and tolerance and chance (41-42) do nothing in the donor. Dead data, not a mechanism. Keep the idea for later (pick a track whose mood target is within tolerance) but do not build it now.
- One track per biome, with a TODO for choosing by time and danger (biomes.zig 261).
- Frankendom rulings: the zone id comes from the server, like the biome index (protocols.zig 670), and music never changes fight state, so server-verified kills and the one ledger are unaffected. A Pit fight should set its own track as a client scene, not as a zone.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: client-only sound and zones as data (addendum, "Frankendom context").
