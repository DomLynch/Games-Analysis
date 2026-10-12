# endless-sky-endless-sky (rendering-performance, cell 3)

Donor: `/mnt/frankendom-donors/endless-sky-endless-sky/source/shader/BatchDrawList.cpp` (symbol `BatchDrawList::Add`, with `Cull` and `Draw`), with `source/shader/BatchShader.cpp`, `source/Engine.cpp` and `source/Engine.h` | Licence: GNU GPL version 3 (`license.txt` line 1; source header: "either version 3 of the License, or (at your option) any later version") | C++ (OpenGL) | symbol `BatchDrawList::Add`

Checked: Read in full: `BatchDrawList.cpp` (165 lines), `BatchDrawList.h` (65), `BatchShader.cpp` (148). Read in part: `Engine.cpp` 440-452 (Wait), 1120-1132 (Go), 1176-1192 (draw), 1612-1618 (clear), 1716-1728 (projectiles and visuals added); `Engine.h` 249 and 257-259; `Screen.cpp` 146-148; `TaskQueue.h` 28-60 (comments only). Users: `Engine.cpp` (1616, 1722, 1725, 1187) for the effects batch; `MapPanel.cpp` (1644) makes its own BatchDrawList; `StarField.cpp` (283-284) uses a DrawList instead. Not read: `Drawable::GetFrame`, `Body::Alpha` and `Body::Unit`, the sprite's 2D-array texture setup, the rest of `CalculateStep`, the `TaskQueue` implementation, and `DrawList` (the separate `draw[]` list for stellar objects and ships, `Engine.cpp` 234 and 1661-1666). Confidence: high on the batch path and the cull; medium on the threading model (read from the `TaskQueue` header and two call sites only). Camera: not a camera cell. Typecheck of the sketch: passed on the VPS.

## 1. Mechanism

Effects are drawn by grouping instances by sprite, so each sprite costs one texture bind, one upload and one draw, however many instances it has on screen. Culling happens before any vertex is written.

- Two lists, one per buffer (`Engine.h` 258-259). `Engine::Go` flips the calc buffer (`Engine.cpp` 1129) and queues `CalculateStep` on a worker (1130). `Engine::Wait` waits for it and sets the draw buffer to the buffer just computed (447-448). So the frame draws step N while step N+1 is computed in the other buffer.
- Adding: in `CalculateStep` (1607), the list is cleared with the step and zoom (1616), then projectiles are added (1721-1722), then visuals (1724-1725). Stellar objects and ships go to the separate `draw[]` DrawList (234 and 1661-1666), not this batch. The body path converts the position (`(position + .5 * velocity - center) * zoom`, `BatchDrawList.cpp` 72). Every `Add` then calls `Cull` (131).
- `Cull` (107-125): the half-extents of the rotated sprite box are `|ux*H| + |uy*W|` and `|ux*W| + |uy*H|`, times zoom (114-118). The box is compared with the centred screen rectangle (119-122; `Screen::Left()` is `WIDTH / -2`, `Screen.cpp` 147-148). An off-screen sprite returns before any vertex work.
- Vertices: a visible instance appends six vertices to `data[sprite]` (135). The order is TL, TL, TR, BL, BR, BR (157-162). The duplicate pair at each end is a degenerate break in a triangle strip, so consecutive sprites join without a restart. Each vertex carries x, y, s, t, the frame index (one per instance, from the step, 137) and alpha (six floats, stride 24 bytes, `BatchShader.cpp` 40). `clip` shortens the quad's height and moves the bottom edge's t to `1 - clip` (148, 160-161).
- Drawing: `Draw` (95-103) binds the shader, then for each sprite group calls `BatchShader::Add` (100). That binds the sprite's texture (122), sets the frame count (124), uploads the group with `glBufferData(..., GL_STREAM_DRAW)` (127), and issues one `glDrawArrays(GL_TRIANGLE_STRIP, 0, count / 6)` (130). Screen scale is `2/W` and `-2/H` (109).

## 2. Key functions

- `BatchDrawList::Add` (Drawable form): `/mnt/frankendom-donors/endless-sky-endless-sky/source/shader/BatchDrawList.cpp` 129-165. Cull, grouping, six-vertex quad.
- `BatchDrawList::Cull`: `/mnt/frankendom-donors/endless-sky-endless-sky/source/shader/BatchDrawList.cpp` 107-125. Rotated-box test against the screen rectangle.
- `BatchDrawList::Draw` and `BatchShader::Add`: `/mnt/frankendom-donors/endless-sky-endless-sky/source/shader/BatchDrawList.cpp` 95-103 and `/mnt/frankendom-donors/endless-sky-endless-sky/source/shader/BatchShader.cpp` 115-131. One draw per sprite group.
- `Engine::Go` and `Engine::Wait`: `/mnt/frankendom-donors/endless-sky-endless-sky/source/Engine.cpp` 1125-1130 and 445-448. The one-step handoff.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant |
|---|---|
| Six vertices per instance: two dummies, four corners, two dummies (degenerate break) | 6 vertices x 6 floats = 36 floats = 144 bytes per instance (BatchDrawList.cpp 157-162; BatchShader.cpp 40) |
| Quad from a triangle strip | 2 real triangles per instance (from the strip order above; computed, not measured) |
| One draw per sprite type with visible instances | one `glDrawArrays` per `Sprite *` key (BatchDrawList.h 64; BatchShader.cpp 130) |
| Cull before vertex work | no margin: exact rotated box against the centred screen (BatchDrawList.cpp 114-122) |
| Clip (partial height) | `uh *= 2.f * clip` (148); the cull ignores clip, so it is conservative |
| Position offset for moving projectiles | 0.5 x velocity (72), with the donor's own TODO saying it should be a sprite reference point (63-71) |
| Screen rectangle | `WIDTH / -2`, `HEIGHT / -2` (Screen.cpp 147-148) |

Defects. Keep the idea; each fix is listed.

1. Draw order is the map's key order. `data` is `std::map<const Sprite *, ...>` (BatchDrawList.h 64), so groups draw in address order. Projectiles and visuals share one batch (Engine.cpp 1722, 1725), so one effect type cannot be forced above another by insertion order or depth. Fix: key the groups by (layer, sprite), or keep one batch per layer.
2. Position offset as a stand-in. The donor's own TODO (BatchDrawList.cpp 63-71) says the 0.5 x velocity offset compensates for a missing sprite reference point. Fix: add a reference point to the sprite and remove the offset.
3. Full re-upload each frame. Every group is re-sent with `GL_STREAM_DRAW` (BatchShader.cpp 127), including static effects. Fix: none needed until a phone profile shows upload cost; measure first.

## 4. TypeScript sketch

simplified: the sketch keeps the rotated-box cull before any vertex work, the grouping by sprite, the six-vertex quad with two dummy vertices at each end, the clip on the bottom edge, and one strip per group. It drops the body path (the half-velocity offset), the double-buffered calc and draw handoff, the GPU buffer and texture calls (the caller issues them from `groupsForDraw`), the alpha and frame fields beyond storing them, and the layer key that defect 1 asks for. `zoom` is a constructor value, as in `Clear(step, zoom)`.

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Sprite { readonly id: number; readonly frames: number; }
export interface Screen { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number; }
export interface Item {
  readonly sprite: Sprite;
  readonly x: number; readonly y: number; // centre in zoomed camera space (the caller multiplies by zoom, as the donor does)
  readonly ux: number; readonly uy: number; // unit vector of the facing
  readonly width: number; readonly height: number; // sprite size in logical pixels
  readonly frame: number; readonly alpha: number;
  readonly clip: number; // 1 = full height; less cuts the bottom of the quad
}

const FLOATS = 6; // x, y, s, t, frame, alpha per vertex
type Pt = { x: number; y: number };

// One vertex array per sprite. Each sprite instance is a 6-vertex strip: two dummy vertices, four corners, two dummy vertices.
export class SpriteBatch {
  private readonly groups = new Map<Sprite, number[]>();

  constructor(private readonly screen: Screen, private readonly zoom: number) {}

  clear(): void { this.groups.clear(); }

  // Returns false when the item is off screen. The cull runs before any vertex work.
  add(it: Item): boolean {
    const z = this.zoom;
    const hx = (Math.abs(it.ux * it.height) + Math.abs(it.uy * it.width)) * z;
    const hy = (Math.abs(it.ux * it.width) + Math.abs(it.uy * it.height)) * z;
    if (it.x + hx < this.screen.left || it.y + hy < this.screen.top) return false;
    if (it.x - hx > this.screen.right || it.y - hy > this.screen.bottom) return false;

    const uxz = it.ux * z;
    const uyz = it.uy * z;
    let uw: Pt = { x: -uyz * it.width, y: uxz * it.width };
    let uh: Pt = { x: uxz * it.height, y: uyz * it.height };
    const tl: Pt = { x: it.x - (uw.x + uh.x), y: it.y - (uw.y + uh.y) };
    uw = { x: uw.x * 2, y: uw.y * 2 };
    uh = { x: uh.x * 2 * it.clip, y: uh.y * 2 * it.clip };
    const tr: Pt = { x: tl.x + uw.x, y: tl.y + uw.y };
    const bl: Pt = { x: tl.x + uh.x, y: tl.y + uh.y };
    const br: Pt = { x: bl.x + uw.x, y: bl.y + uw.y };

    let v = this.groups.get(it.sprite);
    if (!v) { v = []; this.groups.set(it.sprite, v); }
    const push = (p: Pt, s: number, t: number): void => {
      v!.push(p.x, p.y, s, t, it.frame, it.alpha);
    };
    push(tl, 0, 1); push(tl, 0, 1); // dummy pair marks the start
    push(tr, 1, 1);
    push(bl, 0, 1 - it.clip);
    push(br, 1, 1 - it.clip);
    push(br, 1, 1 - it.clip);      // dummy pair marks the end
    return true;
  }

  // One entry per sprite: the caller binds the sprite's texture and issues one strip draw of `vertexCount` vertices.
  groupsForDraw(): Array<{ sprite: Sprite; vertexCount: number; data: number[] }> {
    const out: Array<{ sprite: Sprite; vertexCount: number; data: number[] }> = [];
    for (const [sprite, data] of this.groups) out.push({ sprite, vertexCount: data.length / FLOATS, data });
    return out;
  }
}

export {};
```

Sketch file: `/private/tmp/p2/wave2-haiku/batch3/RP010/work/es-sprite-batch.ts` (typecheck on the VPS: passed).

## 5. Lands in

- TARGET `src/fight/fx-batch.ts` (new module). The client effect batch for projectiles and hit visuals: cull first, group by sprite, one strip draw per sprite. Client-only; it draws, it never decides. Parity-checklist row 16 (colour grade/quality: render cost on phones). The lead hint said row 12, but row 12 in the addendum is combat sound cues, so row 16 is the closest fit. Lead to confirm.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room, shape only)
- Brief rule served: addendum rule 4 (best idea line), keep the idea and fix the defect, rule 6 (draw loop and handoff found and described), section 6 rulings check

## 6. Gaps and risks

- GPL-3.0-or-later copyleft: clean-room, shape only. No line-by-line translation.
- Client-only: effects and visuals must not change server state. Kills and hit timing stay server-verified; the batch only draws what the server already decided.
- Layering: defect 1 matters for the fight. In the Pit, MAX_ATTACKERS = 3 means a few hit visuals at once, so a layer key (blood under sparks under the hit flash) is worth keeping. This is a layer rule, not a cull rule.
- The half-velocity offset (defect 2) is a projectile hack. In Frankendom projectiles are server-timed, so the sprite reference point should come from the catalogue, not a velocity offset.
- Phone budget: the one-draw-per-sprite rule is the transferable part; whether the whole-group upload matters (defect 3) is unmeasured.
- The one-step handoff (draw the last completed step while the next is computed) fits a client that renders the last received server snapshot. It does not fit a client that waits for the server each frame. Not checked against our network path.
- Not read: `DrawList` (stellar objects and ships), `Drawable::GetFrame`, `Body::Alpha`, the texture array setup, and the `TaskQueue` implementation.

Best transferable idea: Cull each effect by its rotated screen box before writing any vertex, group the survivors by sprite so each sprite is one texture bind and one strip draw, and separate the simulation buffer from the draw buffer so the frame draws the last completed step.

Decision (proposed): adapt — keep the rotated-box cull, the group-by-sprite strip, the dummy-vertex break and the one-step handoff; key the groups by (layer, sprite), and replace the velocity offset with a sprite reference point before we use it.
Acceptance: Client test: with 500 effect instances in a 375-wide view, at most one draw is issued per sprite type, and an off-screen effect writes no vertices (add() returns false and the group array is unchanged); on a phone the hit flash draws above the blood decal every time.
