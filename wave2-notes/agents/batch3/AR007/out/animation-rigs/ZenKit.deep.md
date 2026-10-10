# ZenKit (animation-rigs, cell 3)

Donor: `/mnt/frankendom-donors/ZenKit/src/ModelAnimation.cc` | Licence: MIT (`license.md` reads "The MIT license"; SPDX `MIT` in the source header, ModelAnimation.cc line 2) | C++ | symbol `read_sample_quaternion` (with `read_sample_position` and `ModelAnimation::load`)

Checked: Symbols `read_sample_quaternion` (44-64), `read_sample_position` (32-38) and `ModelAnimation::load` (70-135) read in full on the VPS. Also read in full: `include/zenkit/ModelAnimation.hh`, `src/ModelHierarchy.cc`, `src/SoftSkinMesh.cc`, `src/ModelScript.cc` (for the gap in section 6), `include/zenkit/ModelScript.hh` (enums and structs), `tests/TestModelAnimation.cc` lines 1-60. Callers: `read_sample_quaternion` has one caller in the donor (ModelAnimation.cc line 124; grep over all `.cc` files in the ZenKit tree), so the function's behaviour is the same for all callers. Not read: the encoder that writes these samples, the engine that plays a clip, how `node_indices` maps sample rows to bones, and whether samples are stored node-major or frame-major (the loader only fills a flat list). Confidence: high on the decode order and numbers; medium on what the w convention means (the donor's own test expects w = 0.0, see section 6). Camera: not a camera cell.

Best transferable idea: store each unit-quaternion key as three 16-bit fields and rebuild w from the other three (w = sqrt(1 - |xyz|^2)), which is 12 bytes per key against 28 bytes for float32 Vec3 plus Quat, worth a measured test only if clip download size becomes a real problem.
Decision (proposed): reject — Frankendom does not load Gothic clip files, and the w convention is unresolved (the donor's own test expects w = 0.0 for a unit-length sample), so adopting it adds a second clip format on an unchecked convention.
Acceptance: if built anyway, a client test decodes one packed clip and checks each bone rotation against the source clip within a stated angle bound; no server test, because animation never decides a kill.

## 1. Mechanism

- A clip (ModelAnimation) is a header plus one flat array of samples, `node_count` x `frame_count` long. Each sample is a skeleton node's rotation and position at one frame. The skeleton is loaded separately (ModelHierarchy).
- Order of steps as the loader runs them:
  (a) Header, read in order: a version ushort that is read and ignored (83), name, layer, `frame_count` (86), `node_count` (87), fps and source fps (88-89), `sample_position_min` (90), `sample_position_scale` (91), bounding box (92), `next` clip name (93).
  (b) SAMPLES chunk: checksum (115), then `node_count` node indices (117-120), then allocate `node_count x frame_count` samples (122).
  (c) For each sample, rotation is read first (124): three ushort fields become x, y, z by `(u - 32767) x 2.1 / 65535` (46-48). Then `len_q = x^2 + y^2 + z^2` (50). If `len_q > 1`, xyz is divided by its length and w is set to 0 (52-57). Otherwise w = sqrt(1 - len_q) (60), which is never negative.
  (d) Position is read second (125): each of three ushort fields becomes `u x scale + min`, with scale and min from the header (34-36).
- Numbers: rotation range 65535 (10); mid point 32767 (16); scale 2.1 / 65535 per step (13), so decoded xyz covers about -1.05 to +1.05. The donor does not say why 2.1 was chosen (not read; it gives headroom above 1). On disk a sample is 12 bytes (six 16-bit fields). The in-memory `AnimationSample` is a float Vec3 plus a float Quat (ModelAnimation.hh line 21-23), 28 bytes. That 12-to-28 comparison is arithmetic from the field sizes, not a measured download.
- Tick and timing: none. The decode runs once per clip at load, in one pass. ZenKit has no per-frame loop and no sampling; playback is not in this donor.
- Events: the clip file itself carries no events. ModelAnimation.hh (157-158) says the author has seen no clip file with events, so the events vector "will always be empty" and the events come from the model script (ModelScript.cc), not from this decode.

## 2. Key functions

- `read_sample_quaternion`: `/mnt/frankendom-donors/ZenKit/src/ModelAnimation.cc` 44-64. Three ushort fields to xyz; if the xyz length squared is over one, xyz is normalised and w is set to 0; otherwise w = sqrt(1 - len_q).
- `read_sample_position`: `/mnt/frankendom-donors/ZenKit/src/ModelAnimation.cc` 32-38. Each component is `ushort x scale + minimum`.
- `ModelAnimation::load`, header block: `/mnt/frankendom-donors/ZenKit/src/ModelAnimation.cc` 82-94 (the per-clip scale and minimum are read here, lines 90-91).
- `ModelAnimation::load`, SAMPLES block: `/mnt/frankendom-donors/ZenKit/src/ModelAnimation.cc` 114-127 (rotation at 124, then position at 125, for each of `node_count x frame_count` samples).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Store a unit quaternion as three fixed-point fields and rebuild w from the other three | Range 65535 and mid 32767 (theirs, ModelAnimation.cc 10 and 16; these are the 16-bit fields centred on zero) |
| Scale factor with headroom above 1, so rounding does not overflow the encoding | Scale 2.1 (theirs, ModelAnimation.cc 13; reason not read) |
| If xyz is longer than unit length, normalise xyz and set w to 0 (the donor does not say how such values arise) | Rule as written at ModelAnimation.cc 52-57 (theirs) |
| Position as fixed-point with a per-clip minimum and scale | Minimum and scale are per clip, read from the header (ModelAnimation.cc 90-91); the test clip has minimum -9.0102 and scale 0.00149 (TestModelAnimation.cc 51-52) |
| Clip sample count is nodes times frames, decoded in one pass | Test clip: 20 frames, 25 nodes, 500 samples (TestModelAnimation.cc 44, 48, 54) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (rotation decoded before position; w rebuilt from the xyz length; the length-over-one rule). It omits the file reader, the header parse, the version, checksum, node index table and bounding boxes, and it takes the per-clip minimum and scale as arguments. It does not know whether the flat array is node-major or frame-major (not read), so it decodes in file order only. It computes in JavaScript doubles where the donor uses float32.
```ts
// Licence: MIT (ZenKit license.md). Re-typed from the donor's decode shape; numbers as in the donor.
export interface Quat { x: number; y: number; z: number; w: number; }
export interface Vec3 { x: number; y: number; z: number; }

// One stored sample: three 16-bit rotation fields, then three 16-bit position fields (12 bytes).
export interface PackedSample {
  rot: [number, number, number];
  pos: [number, number, number];
}

// Per-clip values read from the clip header (asset data, not engine constants).
export interface ClipHeader {
  positionMin: number;
  positionScale: number;
}

const ROT_RANGE = 65535;                 // (1 << 16) - 1
const ROT_SCALE = (1 / ROT_RANGE) * 2.1; // stored xyz cover about +/-1.05
const ROT_MID = 32767;                   // (1 << 15) - 1

// Rebuild a unit quaternion from its xyz fields; w is always stored as non-negative.
export function decodeRotation(u: [number, number, number]): Quat {
  const x = (u[0] - ROT_MID) * ROT_SCALE;
  const y = (u[1] - ROT_MID) * ROT_SCALE;
  const z = (u[2] - ROT_MID) * ROT_SCALE;
  const lenSq = x * x + y * y + z * z;
  if (lenSq > 1) {
    // Rounding pushed xyz past unit length: normalise xyz and set w to 0.
    const l = 1 / Math.sqrt(lenSq);
    return { x: x * l, y: y * l, z: z * l, w: 0 };
  }
  return { x, y, z, w: Math.sqrt(1 - lenSq) };
}

export function decodePosition(u: [number, number, number], h: ClipHeader): Vec3 {
  return {
    x: u[0] * h.positionScale + h.positionMin,
    y: u[1] * h.positionScale + h.positionMin,
    z: u[2] * h.positionScale + h.positionMin,
  };
}

// Samples are decoded in file order: rotation first, then position, one pair per stored sample.
export function decodeSamples(samples: PackedSample[], h: ClipHeader): { rot: Quat; pos: Vec3 }[] {
  return samples.map((s) => ({ rot: decodeRotation(s.rot), pos: decodePosition(s.pos, h) }));
}
```

Typecheck: the block plus `export {};` was run on the VPS with `npx -p typescript tsc --noEmit --strict --target es2020` and exited 0.

## 5. Lands in

- TARGET `src/fight/clip-pack.ts` (new, client-only decoder; the server never imports it). Parity-checklist row 6 (hero actor/animation). The same decoder would serve row 7 (creature clips), but only one row is named here.
- Reuse tag: adapt-allowed if ever used (MIT: keep the copyright notice when code is copied). Current decision: reject for now, see section 6.
- Brief rule served: client-only presentation (animation decode never decides a kill or a hit); zones-as-data for the per-clip values (minimum and scale are clip data, not engine constants).

## 6. Gaps and risks

- Why not adopt (see the decision above): Frankendom does not load Gothic clip files, so this decoder would add a second clip format and a second loader. The w convention is not settled: the donor's own test expects sample 0 to decode to w = 0.0 with x^2 + z^2 = 1.000 (TestModelAnimation.cc 16 and 55). Taken literally that is a 180-degree rotation for a bone at frame 0, which points to a convention the donor does not explain (encoder not read). Do not adopt the format without a check against a reference clip.
- If Frankendom ever needs smaller clip downloads, the 12-byte-per-sample idea is worth a measured test first (the acceptance test is in the decision block above).
- The bigger idea in this donor is not the codec. ModelScript.cc maps per-clip frame events to combat meanings: DEF_PAR_FRAME (parry frame), DEF_OPT_FRAME (optimal frame), DEF_HIT_END, DEF_WINDOW (combo window) and DEF_DAM_MULTIPLY (damage multiplier) (70-73). Each is parsed as a raw list of integers (127-131 and 357-368). The donor never says what those frame numbers mean, and the only uses are type checks in tests (`tests/TestModelScript.cc` 66 and 273). A hit window per attack clip would be a useful Frankendom idea, but this read does not establish it, so it is not rated here. Not read: how a game turns those frames into a hit window.
- Skinning: `SoftSkinMesh.cc` stores each vertex as weight points, each with a weight, a position (the space it is in is not read) and a node index (41-42). ZenKit has no evaluator; the only uses are load, save and tests (grep). Frankendom's gear dressing (row 15) would need its own evaluator, and this read does not establish one.
- Server rule: any hit-window frame data would have to be the same data on the server and the client (one ledger). This codec gives no help with that.
- Not measured: no test of quantisation error, no size measurement, no comparison with a glTF clip in Frankendom.
