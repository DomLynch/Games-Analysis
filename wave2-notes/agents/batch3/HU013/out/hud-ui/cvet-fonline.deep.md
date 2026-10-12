# cvet-fonline (hud-ui, cell 2)

Donor: `/mnt/frankendom-donors/cvet-fonline/Source/Client/FogOfWar.cpp` (with `FogOfWar.h`, `MapView.cpp`, `MapView.h`, `Tests/Test_FogOfWar.cpp`) | Licence: MIT (`/mnt/frankendom-donors/cvet-fonline/LICENSE` lines 3-5; adaptation allowed) | C++ | symbol `FogShape::Prepare`

Checked: Read in full: `FogOfWar.cpp` (34-374) and `FogOfWar.h` (1-124). Callers read: `MapView.cpp` 2739-2755 (`DrawFogSlot`, the draw), 2882-2960 (`PrepareFogToDraw`, the input set-up), `MapView.h` 99-111 (layer defaults). Tests read: `Test_FogOfWar.cpp` 36-75 and 262-277 (not run). Not read: the fog shader (`EffectMngr.Effects.Fog`, which draws the soft edge), `TraceBullet` (the client-side callback for traced overlays), and the server look test (`ServerMapScriptMethods.cpp` 853-885, grep hit only). Confidence: high on the morph, collapse, edge sampling, and the two defects in section 6; medium on the closing duplicate point of the rim (inferred from the loop, consistent with the test count). camera_scope: not applicable (HUD cell).

## 1. Mechanism

- Entry: `PrepareFogToDraw` (MapView.cpp 2882) runs once per fog layer per frame. It fills a `FogShape::Input` (2904-2959) and calls `Prepare` (2959).
- `Prepare` (FogOfWar.cpp 60-86) compares the input with the last frame (62-67). Changes that force a rebuild: Enabled, origin valid, origin hex, origin look distance, Distance, Radius, overlay colour, centre colour, trace mode, shoot-block flag. `FogExtraLength` is not in the list (see defect 2). On a change it calls `BuildPoints` and then `StartTransition` (76-82). Every frame it calls `UpdateTransition` (85).
- `BuildPoints` (88-185):
  (a) Radius: `dist = Radius` if Radius > 0, else `LookDistance + FogExtraLength` (99). Empty fan if disabled, no origin, or dist <= 0 (94-102).
  (b) Hex geometry walks six directions (126). The walk starts with a seek step: `dist` steps north-east to the corner (138-150). It then walks six sides of `dist` steps each, side k moving in direction (k+2) mod 6 (131-152). Each step appends one rim point (177 or 171 traced). After every second rim point, a centre point is appended (180-181). Layout: rim, rim, centre, rim, rim, centre, ...
  (c) Look fog (not traced): the rim point is at the walked hex. Its colour is `{255, target_dist*255/dist, 0, 0}` (175): red is fixed at 255 (how the shader reads it was not read) and green is the fraction of the radius reached. The centre has alpha 0 (117-118).
  (d) Traced overlay (zone or observation reach): `max = min(target_dist, Distance) + 1` (160). The ray from origin to the rim hex is traced to length `max` (161). `strength = max(max - blockDist, 0) * 255 / max` (164). The point sits on the blocking hex (171). Colour is the overlay colour scaled by strength, alpha 255 (165-168). The centre has alpha 255 (117).
- `StartTransition` (187-236):
  (a) Empty fan (disappear): if already collapsing or already empty, do nothing (196). Otherwise set collapsing, and if the duration is above 0, morph from the current fan to the same fan with every position moved to the centre (200-207). Duration 0 clears at once (209-213).
  (b) Non-empty fan: clear the collapse flag (218). Duration 0 replaces the fan at once (220-225). If nothing is shown, start from the collapsed fan at the centre (228-230). Morph from the current fan to the new fan (232-235).
- `UpdateTransition` (238-258): `progress = clamp((now - start) / duration, 0, 1)` (251), time based, so frame rate does not change the speed. Interpolate (253). At progress 1, `FinishTransition` sets the target (262). A collapse then clears the fan (266-271).
- `InterpolatePoints` (340-372): result count = max of the two fans. Every third slot (i % 3 == 2) is a centre and is lerped between the two centres (362-364). Other slots take an edge sample from each fan by edge index (`SampleEdgePoint`, 306-320: array index `3 * (edge/2) + edge%2`), then lerp (366-369).
- Draw: `DrawFogSlot` (MapView.cpp 2739) submits the points as a `TriangleStrip` (2755). The index-2 centre is used as the strip's centre for the flush pass (2771).
- Defaults (MapView.h 108-115): Distance 0, Radius 0, ExtraLength 1, TransitionDuration 150 ms, ClearRadius 0.85 (the fraction kept crisp before the edge fade, line 115; used by the shader, not read).
- Count (inferred from the loop, matches the test): rim = 1 + 6 x dist (the seek corner, then six sides); centres = floor(rim / 2). For look distance 1 and extra 0 this is 7 rim + 3 centres = 10 points (test lines 54 and 70).

## 2. Key functions

- `FogShape::Prepare`: `/mnt/frankendom-donors/cvet-fonline/Source/Client/FogOfWar.cpp` 60-86. Change check, rebuild, transition update.
- `FogShape::BuildPoints`: FogOfWar.cpp 88-185. Ring walk, look colour, traced overlay, centres.
- `FogShape::StartTransition`: FogOfWar.cpp 187-236. Appear, disappear, morph start.
- `FogShape::UpdateTransition` and `FinishTransition`: FogOfWar.cpp 238-272.
- `FogShape::InterpolatePoints` and `SampleEdgePoint`: FogOfWar.cpp 306-372.
- `MapView::PrepareFogToDraw`: `/mnt/frankendom-donors/cvet-fonline/Source/Client/MapView.cpp` 2882-2960. Input per layer, follow or fixed origin.
- `MapView::DrawFogSlot`: MapView.cpp 2736-2760. TriangleStrip submit.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Walk the rim of a radius-r hex ring and put a centre point after every second rim point | Hex geometry; square branch exists (FogOfWar.cpp 134-136, not used here) |
| Reach = look distance + extra length when no radius is given | ExtraLength 1 (theirs, MapView.h 110) |
| Traced strength falls with the blocking distance, `(max - block) * 255 / max` | 255 scale; `max` is reach + 1 (theirs, FogOfWar.cpp 160, 164) |
| Time-based morph between two fans, clamped progress | 150 ms default (theirs, MapView.h 111) |
| Collapse to the origin on disappear, keep each point's own colour | Centre = third point (theirs, FogOfWar.cpp 280) |
| Resample two fans with different point counts by edge slot | Slot layout r r c (theirs, FogOfWar.cpp 318) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order: rim walk (seek corner, six sides, with the donor's closing duplicate), a centre after every second rim point, the look colour as one value or the traced strength, the morph and collapse state machine, and the edge-slot resampling. It omits the colour channels (the red flag and the alpha), the map-edge clamp (MapSize clamp), the sub-hex draw offsets and the pixel conversion, the square-geometry branch, the integer rounding of lerped positions (the sketch keeps floats), the shader, and the server authority. It fixes two donor defects: a traced reach of 0 derives from the ring radius (the donor used 0 literally, so the overlay shrank to one hex), and ExtraLength is part of the change key (the donor did not check it).

```ts
// Licence: MIT (donor). Sketch written from the described mechanism, not a translation of the donor lines.
export {};

interface Hex { q: number; r: number }
interface Pt extends Hex { value: number; centre: boolean } // value 0-255

export interface FogInput {
  enabled: boolean;
  origin: Hex | null;                                       // null = no origin, nothing drawn
  lookDistance: number;                                     // origin's look distance (0 for a fixed-origin layer)
  extraLength: number;                                      // added to lookDistance when radius is 0
  radius: number;                                           // 0 = derive from lookDistance + extraLength
  reach: number;                                            // traced reach in hexes; 0 = derive (fix)
  traced: boolean;
  blockHex: (from: Hex, to: Hex, maxDist: number) => Hex;   // first blocking hex on the line, or `to` if clear
  durationMs: number;
}

// Six axial hex directions. The rim walk starts at dist * DIRS[0] and walks sides in DIRS[(side + 2) % 6] order.
const DIRS: Hex[] = [
  { q: 1, r: 0 }, { q: 0, r: 1 }, { q: -1, r: 1 },
  { q: -1, r: 0 }, { q: 0, r: -1 }, { q: 1, r: -1 },
];

function hexDist(a: Hex, b: Hex): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

// Rim points, a centre point after every second rim point (so the strip reads r r c r r c ...).
export function buildFan(input: FogInput): Pt[] {
  if (!input.enabled || input.origin === null) return [];
  const origin = input.origin;
  const dist = Math.max(input.radius > 0 ? input.radius : input.lookDistance + input.extraLength, 0);
  if (dist <= 0) return [];
  const reach = input.reach > 0 ? input.reach : dist; // fix (donor defect): donor used 0 literally, giving a 1-hex overlay

  // Seek corner (appended once), then six sides of dist steps each. The walk closes on the corner.
  const rim: Hex[] = [];
  let cur: Hex = { q: origin.q + dist * DIRS[0].q, r: origin.r + dist * DIRS[0].r };
  rim.push(cur);
  for (let side = 0; side < 6; side++) {
    const d = DIRS[(side + 2) % 6];
    for (let s = 0; s < dist; s++) {
      cur = { q: cur.q + d.q, r: cur.r + d.r };
      rim.push(cur);
    }
  }

  const out: Pt[] = [];
  let added = 0;
  for (const hex of rim) {
    added++;
    const targetDist = hexDist(origin, hex);
    if (input.traced) {
      const maxDist = Math.max(Math.min(targetDist, reach), 0) + 1;
      const block = input.blockHex(origin, hex, maxDist);
      const resultDist = hexDist(origin, block);
      const value = Math.floor((Math.max(maxDist - resultDist, 0) * 255) / maxDist);
      out.push({ q: block.q, r: block.r, value, centre: false });
    } else {
      out.push({ q: hex.q, r: hex.r, value: Math.floor((targetDist * 255) / dist), centre: false });
    }
    if (added % 2 === 0) {
      out.push({ q: origin.q, r: origin.r, value: input.traced ? 255 : 0, centre: true });
    }
  }
  return out;
}

function collapsePoint(points: Pt[]): Pt {
  if (points.length === 0) return { q: 0, r: 0, value: 0, centre: true };
  return points.length >= 3 ? points[2] : points[0];
}

// Collapse every point's position to the centre; keep each point's own value so the fan keeps its edge fade.
function collapseTo(points: Pt[]): Pt[] {
  const c = collapsePoint(points);
  return points.map(p => ({ ...p, q: c.q, r: c.r }));
}

function lerpPt(a: Pt, b: Pt, t: number): Pt {
  return { q: a.q + (b.q - a.q) * t, r: a.r + (b.r - a.r) * t, value: a.value + (b.value - a.value) * t, centre: b.centre };
}

// Edge slot to array index: skip every third slot (the centre), so edge 0 -> 0, 1 -> 1, 2 -> 3, 3 -> 4 ...
function sampleEdge(points: Pt[], edgeCount: number, idx: number, sampleCount: number, fallback: Pt): Pt {
  if (edgeCount === 0) return fallback;
  if (sampleCount <= 1) return points[0];
  const src = Math.min(Math.floor((idx * (edgeCount - 1) + Math.floor((sampleCount - 1) / 2)) / (sampleCount - 1)), edgeCount - 1);
  const arr = 3 * Math.floor(src / 2) + (src % 2);
  return arr < points.length ? points[arr] : fallback;
}

function interpolate(from: Pt[], to: Pt[], t: number): Pt[] {
  const n = Math.max(from.length, to.length);
  if (n === 0) return [];
  const fromCentre = collapsePoint(from);
  const toCentre = collapsePoint(to);
  const fallback = to.length > 0 ? toCentre : fromCentre;
  const fromEdges = from.length - Math.floor(from.length / 3);
  const toEdges = to.length - Math.floor(to.length / 3);
  const edges = n - Math.floor(n / 3);
  const out: Pt[] = [];
  let edge = 0;
  for (let i = 0; i < n; i++) {
    if (i % 3 === 2) {
      out.push(lerpPt(fromCentre, toCentre, t));
    } else {
      const a = sampleEdge(from, fromEdges, edge, edges, fallback);
      const b = sampleEdge(to, toEdges, edge, edges, fallback);
      out.push(lerpPt(a, b, t));
      edge++;
    }
  }
  return out;
}

export class FogLayer {
  points: Pt[] = [];
  private from: Pt[] = [];
  private target: Pt[] = [];
  private t0 = 0;
  private duration = 0;
  private active = false;
  private collapsing = false;
  private lastKey = "";

  prepare(input: FogInput, nowMs: number): void {
    // fix (donor defect): the donor's change check omitted ExtraLength, so changing it alone did not rebuild.
    const key = JSON.stringify([input.enabled, input.origin, input.lookDistance, input.extraLength, input.radius, input.reach, input.traced]);
    if (key !== this.lastKey) {
      this.lastKey = key;
      this.startTransition(buildFan(input), nowMs, input.durationMs);
    }
    this.update(nowMs);
  }

  private startTransition(points: Pt[], nowMs: number, durationMs: number): void {
    this.duration = Math.max(durationMs, 0);
    if (points.length === 0) {
      // Disappear: shrink the current fan to its centre, then clear.
      if (this.collapsing || this.points.length === 0) return;
      this.collapsing = true;
      if (this.duration > 0) {
        this.from = this.points;
        this.target = collapseTo(this.points);
        this.t0 = nowMs;
        this.active = true;
      } else {
        this.points = [];
        this.active = false;
      }
      return;
    }
    this.collapsing = false;
    if (this.duration === 0) {
      this.points = points;
      this.active = false;
      return;
    }
    if (this.points.length === 0) this.points = collapseTo(points);
    this.from = this.points;
    this.target = points;
    this.t0 = nowMs;
    this.active = true;
  }

  private update(nowMs: number): void {
    if (!this.active) return;
    const t = this.duration === 0 ? 1 : Math.min(Math.max((nowMs - this.t0) / this.duration, 0), 1);
    this.points = interpolate(this.from, this.target, t);
    if (t >= 1) {
      this.points = this.target;
      this.active = false;
      if (this.collapsing) {
        this.points = [];
        this.collapsing = false;
      }
    }
  }
}
```

## 5. Lands in

- TARGET (proposed; not checked against the Frankendom tree): `src/hud/threat-zone.ts` (new client module). The addendum names `src/fight/<module>.ts` or `origins/<path>`, but this is a client overlay and does not belong in the fight engine. The blocking-hex function must come from the engine (see section 6).
- Parity-checklist row 14 (HUD).
- Best transferable idea: Draw a critter's reach as a fan whose rays stop at the first blocking hex and fade with the blocking distance, and glide the fan over about 150 ms when the critter moves, collapsing it to the origin when it goes.
- Decision (proposed): adapt - take the fan shape, the line-of-sight rays with the strength falloff, and the 150 ms morph and collapse. Change the source of the blocking hexes to the engine's own line-of-sight, not the client map, and fix the two donor defects before porting.
- Acceptance: In a zone with a wall two hexes from a critter, its threat fan is cut at two hexes, and when the critter steps the fan glides over 150 ms rather than snapping. A server test asserts that the blocking hex for the same fixture comes from the engine line-of-sight function, and a unit test asserts the fan has 1 + 6 x reach rim points for reach 1 (10 points with the centres).
- Reuse tag: rewrite-from-idea (MIT; adaptation allowed; this sketch is clean-room from the described mechanism)
- Brief rule served: HUD client-only ruling; kills and line-of-sight authority stay on the server (one engine).

## 6. Gaps and risks

- MIT (lines 3-5): the donor code may be adapted. The sketch was written clean-room from the described mechanism anyway.
- Defect 1 (traced reach 0): the comment at MapView.h 108 says `0 = derive from the look distance`. The code uses `Distance` literally: `max_overlay_dist = max(min(target_dist, Distance), 0) + 1` (FogOfWar.cpp 160), and `PrepareFogToDraw` passes it straight through (MapView.cpp 2920). With 0, the traced overlay is one hex. No test uses 0 (the tests use 1, 3 and 6). Fix: derive the reach from the ring radius when it is 0 (the sketch does this).
- Defect 2 (ExtraLength not in the change key): the change check (FogOfWar.cpp 62-65) lists Distance, Radius and the origin look distance, but not `FogExtraLength`. A script that changes `ExtraLength` while the critter stands still does not rebuild the fan until something else changes. Fix: add it to the key (the sketch does this).
- Not a defect, noted: the rim walk ends on the seek corner, so the first and last rim points coincide (inferred from the loop, consistent with the 10-point test). A duplicate point in a triangle strip is harmless. Keep it or drop it, but the centre pattern depends on the count, so keep the count rule in the test.
- Client line-of-sight: the traced overlay calls `TraceBullet` on the client map (MapView.cpp 2909-2912, not read in full). Frankendom rules say the server verifies kills and owns the fight. A threat fan drawn from client traces can disagree with the server's hit test. The server's own look test is in `ServerMapScriptMethods.cpp` 853-885 (grep only). Fix: compute the blocking hexes in the engine (`src/fight`) and send them, or run one function on both sides and test them against each other.
- Many-on-one: Frankendom's cap is three attackers (MAX_ATTACKERS = 3). Three fans of 6 x reach rim points each, all morphing, is the readability limit at 375 px. Cap the reach shown for non-target critters, and colour by threat, not by fan size.
- Shader not read: the soft edge, the mist and the oval shape come from the Fog effect (the flush pass), not from this file. The sketch models only the point data the shader consumes.
- Draw offsets: the donor uses a base offset and a sprite offset so the fan moves smoothly with the sprite (MapView.cpp 2941-2945). The sketch works in hex coordinates only; the pixel and sprite-offset layer must be added in the client.
- Not run: no code was executed. The typecheck (below) is the only check.

Reuse tag: rewrite-from-idea (MIT; adaptation allowed; this sketch is clean-room from the described mechanism)
Brief rule served: HUD client-only ruling; kills and line-of-sight authority stay on the server (one engine).
