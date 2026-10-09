# levy-street-world-of-claudecraft (city-map-design, cell 20)

Donor: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/dawnhold_layout.ts` | Licence: MIT | TypeScript | symbol `DAWNHOLD / dawnholdLift / inDawnholdBailey` | input line 17 verified: `DAWNHOLD` (the authored plan) opens at 17 and closes at 39. `inDawnholdBailey` at 259-264, `dawnholdLift` at 322-370. The file header says it is a "pure leaf: deterministic, no rng, no SimContext".

## 1. Mechanism

- One authored plan (constants objects, 17-252) describes a walled castle: its graded pad (a flat platform with a height, 21), its curtain walls (a rectangle of wall centrelines with a thickness and a walk height, 23-34), its two gates (narrow spans, one in the east wall and one in the south wall, 41-49), four corner towers (one tall, 84-90), a stair ramp along the inside of the east wall (104-115), outside wall ledges (217-224), a walled flower court off the south wall with its own gate and statue (60-75), parapet segments (179-215), five buildings (131-146) and five planting fields (246-252). Every consumer reads the same plan (file header, lines 1-15): the ground grading, the walkable lift field, the scatter clearance, the buildings and the render assembly. Only the walls, court walls, towers and ramps feed the lift field.
- Inputs: a world position (x, z). Outputs: a yes or no for "inside the bailey" or "inside the court" (with an inset), a yes or no for "clear of garden scatter", the pad's height, a 0-to-1 blend weight for grading the ground to the pad, and a lift height for a walkable surface.
- `dawnholdLift` (322-370): returns zero off the pad (324). Otherwise it takes the highest of the absolute surface heights that apply at this point: the four wall strips, each only within its wall's own length plus half the thickness (326, 333), where a gate span contributes nothing, so the ground there falls back to pad level unless another surface applies (the west and north walls have no gate); the court's east and west walls and its gated south wall at their top height (345-352, "too tall to step, no walk"); the towers (square footprints of half-width 3 at their own height, 353-357); and the ramps (linear height between two ends along one axis, 358-367). The result is relative to the pad's height, and zero when nothing applies (368-369).
- Tick: none. Pure function of position and the constant plan; called from the ground-height query (per the file header, added into `groundHeight` beside the other castle's lift; that caller was not read).
- Every caller (ground query, scatter clearance, buildings, render) reads the same constant plan, and nothing mutates the plan at run time.

## 2. Key functions

- `DAWNHOLD` (plan constants): `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/dawnhold_layout.ts` 17-37 (pad, walls, module length, wall thickness, walk height, tower size).
- `DAWNHOLD_GATES`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/dawnhold_layout.ts` 41-49 (the two gate spans on the east and south walls).
- `inDawnholdBailey`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/dawnhold_layout.ts` 259-264. Inside the curtain walls, with an optional margin.
- `inDawnholdCourt`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/dawnhold_layout.ts` 270-278. Inside the flower court, with an inset.
- `dawnholdLift`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/dawnhold_layout.ts` 322-370. The walkable height field.
- `wallStripAbs` (helper): `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/dawnhold_layout.ts` 307-316. Wall-walk height for a point, with a gate span cut out.
- `dawnholdPadWeight` / `dawnholdClear` / `dawnholdPadTarget`: same file, 295-303 / 284-287 / 290-292. Skirt weight, scatter clearance, pad height.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Authored plan as one data object read by every consumer | The Dawnhold plan values (theirs) |
| Wall as a strip of thickness t; walkable top at a height; a gate is a gap in the strip | Wall thickness 3.0 (line 30); walk height 9.7 (line 32); module 7 (line 28) (theirs; those value lines are under 15 characters, so the receipts are their comment lines 27, 29, 31) |
| Highest applicable surface wins (walls, towers, ramps) | Tower half-width 3.0 (line 36, receipted by its comment at 35) and tall tower height 14.2 (line 34) (theirs) |
| Graded pad with a smooth skirt over 8 units (smoothstep weight) | Skirt 8 units (theirs, lines 300-301); pad 232-300 by 854-944 at height 3.2 (theirs, line 21) |
| Clearance around the pad for scatter | Clearance 4 units (theirs, line 286) |

## 4. TypeScript sketch

simplified: the sketch folds the `abs <= 0` early return and the pad-height subtraction into one expression, and keeps the wall strips (with the along-wall guards and the gate gaps), the pad weight, and the final subtraction of the pad height. It omits the court walls and the court gate, the towers, the ramps, the parapet, ledges, buildings and fields. The sketch passes the wall lines as arguments where the donor reads module constants, and it uses a wall-half parameter in place of `wallTh / 2`.

```ts
// Licence: MIT (donor). Logic lifted in TypeScript from src/sim/dawnhold_layout.ts (dawnholdLift, dawnholdPadWeight, wallStripAbs); the Dawnhold numbers are passed in, not proposed. Partial: the wall strips, pad and skirt are lifted; towers, ramps and court walls are left out. No imports.
interface Plan { padX0: number; padX1: number; padZ0: number; padZ1: number; padH: number; wallHalf: number; walkH: number; skirt: number; }
interface Gate { a0: number; a1: number; }

// Walk height along one wall line; a gate span is a gap at that wall.
function wallStrip(along: number, across: number, line: number, half: number, walk: number, gate: Gate | null): number {
  if (Math.abs(across - line) > half) return 0;
  if (gate && along >= gate.a0 && along <= gate.a1) return 0;
  return walk;
}

// Graded pad weight: 1 on the pad, smooth falloff over the skirt, 0 beyond it.
function padWeight(x: number, z: number, p: Plan): number {
  const dx = Math.max(p.padX0 - x, 0, x - p.padX1);
  const dz = Math.max(p.padZ0 - z, 0, z - p.padZ1);
  const d = Math.hypot(dx, dz);
  if (d >= p.skirt) return 0;
  const t = 1 - d / p.skirt;
  return t * t * (3 - 2 * t);
}

// Walkable lift above the pad: the highest applicable absolute surface, relative to the pad.
function liftAbove(x: number, z: number, p: Plan, wallX0: number, wallX1: number, wallZ0: number, wallZ1: number,
                   gateEast: Gate | null, gateSouth: Gate | null): number {
  if (x < p.padX0 || x > p.padX1 || z < p.padZ0 || z > p.padZ1) return 0;
  let abs = 0;
  // Along-wall extent guards: a wall only raises ground within its own length (plus half its thickness), as in dawnholdLift 326 and 333.
  if (z >= wallZ0 - p.wallHalf && z <= wallZ1 + p.wallHalf) {
    abs = Math.max(abs, wallStrip(z, x, wallX0, p.wallHalf, p.walkH, null));
    abs = Math.max(abs, wallStrip(z, x, wallX1, p.wallHalf, p.walkH, gateEast));
  }
  if (x >= wallX0 - p.wallHalf && x <= wallX1 + p.wallHalf) {
    abs = Math.max(abs, wallStrip(x, z, wallZ0, p.wallHalf, p.walkH, null));
    abs = Math.max(abs, wallStrip(x, z, wallZ1, p.wallHalf, p.walkH, gateSouth));
  }
  return abs <= 0 ? 0 : Math.max(0, abs - p.padH);
}
```

## 5. Lands in

- Frankendom target: `origins/world/relief.ts` is the existing pure ground function (seeded, no clock, "every host computes the same heights, so the drawn mesh and the ground the hero stands on cannot drift apart", with flat `Pad` discs that blend back over the next 0.6 r; its header credits this donor family). The donor adds what it lacks: a rectangular pad with a smoothstep skirt (295-303) and a walkable lift field of walls, towers and ramps. That would be a NEW `origins/world/lift.ts` that a zone's `layout` and `passages` (`origins/world/schema.ts`: passages have a kind gate, road or portal) drive as data. Files on the VPS snapshot /root/work-k7 (not main); headers and the `origins/world/README.md` read only.
- Parity-checklist row: none of rows 1 to 22 (zone geometry is not a fight row). Feature-map section: zones as data (`origins/world/README.md`; `docs/specs/zone-runtime.md`) and the Zone 1 quality item.
- Reuse tag: adapt (MIT, logic lifted in the sketch)
- Brief rule served: zone-schema rule (every property is a data field with a default); rules 7-9 n/a

## 6. Gaps and risks

- MIT: logic lifted in the sketch with its path; the licence notice stays with the source.
- The donor is a city with walkable walls and gates. Frankendom's Pit is a closed arena and Zone 1 is open ground; a walled bailey is a zone-content question, not a fight rule.
- The donor's walls are terrain the climb gate refuses (file header lines 7-9). Frankendom needs its own rule for stepping up; the donor's "sheer riser" rule is a physics choice.
- The plan mixes geometry and presentation (the render assembly and the building list read the same plan, 1-15 and 117-146). Frankendom's zone data should keep collision and art separate, or the plan drifts when art changes.
- The module pattern (a pure leaf, no rng, no context, file header line 15) is the part to keep: it is deterministic, so a client and the server compute the same heights, which is what lets the server check a claimed position or jump against the same ground (server-verified).
- The numbers are a single castle's layout in world units; no values are proposed. The lift field is a single-valued height (no overhangs or bridges), as the comment at 319 says.
- Nothing here changes fight state; the MAX_ATTACKERS = 3 cap and the one engine are unaffected, and the Pit is a client only.
- Not read: `groundHeight` and `applyDawnholdPad` (the callers), the render assembly, and the climb gate.
