# FWGS-xash3d-fwgs (vfx-blood-finishers, cell 13)

Donor: `/mnt/frankendom-donors/FWGS-xash3d-fwgs/ref/gl/gl_decals.c` | Licence: GPL-3.0-or-later (file header of `gl_decals.c`: "the Free Software Foundation, either version 3 of the License, or (at your option) any later version"; the header of `engine/client/cl_tent.c` says the same; no top-level LICENSE file in the repo root) | C | symbol `R_DecalCreate` (with `R_DecalIntersect`, `R_DecalAlloc`)

Checked: The hint file `ref/gl/gl_decals.c` is the right place for the decal budget. I read it end to end for the budget: `R_DecalAlloc` (99-128), `R_DecalUnlink` (64-94), `R_DecalIntersect` (431-505), `R_AddDecalToSurface` (544-570), `R_DecalCreate` (572-608), `R_DecalSurface` restore check (610-640 part), `R_DecalNodeSurfaces` and `R_DecalNode` (678-731), `R_DecalShoot` (734-820). Blood splatter read in `engine/client/cl_tent.c` 872-944 (`R_BloodSprite`) and its dispatch 2273-2281. Limits read in `engine/common/protocol.h` 120-215 (the `XASH_LOW_MEMORY` chain), `engine/client/dll_int/ref_common.c` 39 (grep), `engine/client/cl_main.c` 33 (grep), `engine/client/parse/cl_parse.c` 900-915. Confidence high on the steal rule, the pool loop and the splatter count. Not read: `R_DecalCreatePoly`, the draw path (`DrawSingleDecal` 862 onwards), `R_DecalVertsClip` internals, `R_AddDecalVBO`, the temp-entity update that gives the blood sprite and drips their motion (so the drip baseline fields are not interpreted), and the other `R_DecalShoot` callers in `cl_tent.c` (1805, 2022, 2216: grep lines only). camera_scope: n/a (not a camera cell).

Best transferable idea: Cap how many decals can stack on one patch of floor: when a new splat would be the seventh heavy overlap, replace the least-covered older splat instead of adding a new one, and keep one global pool cap.
Decision (proposed): adapt - take the per-surface overlap cap and the least-covered steal, and the global pool cap as a phone budget; drop the BSP walk and the geometry clipping (our arena floor is one known plane), and keep blood as a client cosmetic that never feeds back into the fight.
Acceptance: On one patch of sand, a seventh heavy splat replaces the least-covered older splat, so no spot shows more than six stacked splats; total splats on screen stay at or below the pool cap set in the phone profile (proposed 64, a data choice, not a donor value); a server test asserts that blood decals never change health or the kill.

## 1. Mechanism

- Entry: `R_DecalShoot` (734) validates the texture and the model (must be brush), converts the position into the parent entity's local space (764-795), sets the decal size and scale (807-817), then walks the BSP (819). `R_DecalNode` (704-731) recurses; a node is searched for surfaces only when the decal's plane distance is within `DECAL_DISTANCE` (4) (725). `R_DecalNodeSurfaces` (678-697) skips water, sky, conveyor surfaces (689-690) and transparent surfaces unless stencil is on (692-693), then calls `R_DecalSurface` on each.
- `R_DecalCreate` (572-608), in order: (a) `R_DecalIntersect` returns the count of overlapping, non-permanent decals on this surface and a steal candidate (577). (b) If the count is below `MAX_OVERLAP_DECALS` (6), the candidate is dropped (578). (c) `R_DecalAlloc` (580) either reuses the candidate, after unlinking it from its surface (103-127 path with `pdecal` set, 125), or takes the next slot from the global pool. (d) The new decal's flags, position, offsets, scale, entity and texture are stored (583-593). (e) The decal is clipped to the surface (598); if no vertices remain it is unlinked and dropped (600-604). (f) Otherwise it is appended to the surface list (607, `R_AddDecalToSurface` 544-570 appends at the tail).
- Overlap count and steal candidate (`R_DecalIntersect` 431-505): for each existing non-permanent decal on the surface (455), the new decal's clip box is projected into that decal's [0,1] clip space (461-483). The coverage `flArea` is the intersection area (488). A decal counts when `flArea > 0.6` (490-492). The candidate is the counted decal with the smallest `flArea` (494-498; ties go to the later one). A code comment says the intent is not to steal bigger decals to replace them with smaller ones (453).
- Pool (`R_DecalAlloc` 99-128): the loop limit is the smaller of the compile-time `MAX_RENDER_DECALS` and the `r_decals` cvar (101-104). With no candidate, the loop takes `gDecalPool[gDecalCount]` and advances, wrapping to 0 at the limit (115-119). It skips permanent slots (121) but gives up after one full pass, so if every slot is permanent the loop reuses a permanent slot (121-123, "check for the odd possiblity of infinte loop"). In every case the slot is unlinked from its old surface first (125).
- Limits (numbers): `MAX_RENDER_DECALS` is 4096 when neither low-memory branch is taken (protocol.h 129; the default value of `XASH_LOW_MEMORY` was not read), 64 when `XASH_LOW_MEMORY == 2` (178, 198) and 128 when it is 1 (200, 213). `r_decals` defaults to 4096 (ref_common.c 39). In multiplayer `r_decals` is clamped to `mp_decals`, default 300 (cl_main.c 33; cl_parse.c 909-910).
- Blood splatter (`R_BloodSprite`, cl_tent.c 872-944), in order: the colour index gets a random 1 to 3 (877); the impact colour is that index, the spatter colour is one below it (879). A large blood sprite is placed 2 to 4 units above the given point (885) and plays in 0.25 s (framerate = frames x 4, 898-899; the comment says 0.250 s). Its scale is size/25 to size/35 (892). Then the drip count is `size + roll(1,8) + roll(1,8)` (910); each drip is a rotating, slow-gravity, world-colliding temp entity (919-920) with scale size/15 to size/25 (919) and a life of 1 to 3 s (932). The size is one byte from the TE message (2280), passed on at 2281.
- Fade: none in this file (grep for `fade` finds nothing in `gl_decals.c`). Decals are removed by pool reuse, not by time. The blood sprite holds `renderamt = 250` and is removed by its death time (896, 899).
- Tick: none. Decals are created synchronously when a TE arrives. The drips and sprite are temp entities with death times on `cl.time`.

## 2. Key functions

- `R_DecalCreate` and `R_DecalIntersect`, `/mnt/frankendom-donors/FWGS-xash3d-fwgs/ref/gl/gl_decals.c` 431-608: the overlap cap and the steal.
- `R_DecalAlloc`, same file 99-128: the global pool.
- `R_DecalShoot`, same file 734-820: the entry point (called from `CL_FireCustomDecal`, `engine/client/cl_tent.c` 2875-2878).
- `R_BloodSprite`, `/mnt/frankendom-donors/FWGS-xash3d-fwgs/engine/client/cl_tent.c` 872-944: one blood sprite and a random drip count from one TE.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Stack cap per surface: at the cap, reuse the least-covered overlapping decal | Cap 6 (theirs, gl_decals.c 25 and 578); coverage threshold 0.6 (490) |
| Global pool with round-robin reuse and a permanent-skip | Pool size: 4096 default, 128 or 64 in low-memory builds (protocol.h 129, 200-213, 178-198); r_decals 4096, mp_decals 300 (ref_common.c 39, cl_main.c 33) |
| Count of splats from one hit = size + two small rolls | Rolls 1 to 8 each (theirs, cl_tent.c 910); base is the TE size byte (2280) |
| Splat lifetimes | Sprite 0.25 s (898-899); drips 1 to 3 s (932) |
| Splat scale from the hit size | Sprite size/25 to size/35 (892); drips size/15 to size/25 (919) |
| Decal scale clamp | 0.01 to 16 (gl_decals.c 27-28, 813) |
| Plane window for the BSP walk | 4 units (gl_decals.c 19, 725) |

Worked numbers from the formulas (hand computed, not run): a TE size of 20 gives a splat count of 22 to 36 drips (20 + 2 to 16). Six heavy overlaps on one spot make the seventh paste steal.

## 4. TypeScript sketch

simplified: the sketch keeps the steal rule (count heavy non-permanent overlaps; steal the least-covered candidate only at the cap), the pool loop with the permanent skip and its one-pass give-up, the unlink on reuse, the post-clip drop, and the splat count and drip lifetime. It omits: the BSP walk and plane window, the clipping and vertex build (`R_DecalVertsClip`), the restore-time duplicate check, the surface flag skips, the scale clamp, the cvar clamp to mp_decals, the blood sprite and drip motion, and the colour indices. The coverage value is an input (the donor computes it from the clip boxes). The donor's count includes only decals it will consider for a steal, and the sketch does the same.

```ts
// Licence: GPL-3.0-or-later (donor, ref/gl/gl_decals.c and engine/client/cl_tent.c headers). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface DecalTune {
  poolCap: number;     // effective pool size (donor: min of compile-time cap and r_decals)
  maxOverlap: number;  // donor 6: at this many heavy overlaps, steal instead of taking the next slot
  coverMin: number;    // donor 0.6: an existing decal counts as overlapping when more than this share is covered
}

export interface Surface { decals: Slot[]; }   // insertion order; donor appends at the tail

export interface Slot {
  surface: Surface | null;   // null when unlinked
  permanent: boolean;
}

export function unlink(s: Slot): void {
  if (s.surface) {
    const i = s.surface.decals.indexOf(s);
    if (i >= 0) s.surface.decals.splice(i, 1);
  }
  s.surface = null;
}

export class DecalPool {
  private slots: Slot[];
  private next = 0;

  constructor(private tune: DecalTune) {
    this.slots = Array.from({ length: tune.poolCap }, () => ({ surface: null, permanent: false }));
  }

  // coverOf(existing) = share of the existing decal's area that the incoming decal covers (0..1).
  // Returns the slot used, or null when the pool is empty.
  paste(surf: Surface, coverOf: (d: Slot) => number, permanent: boolean, hitsGeometry: boolean): Slot | null {
    let count = 0;
    let steal: Slot | null = null;
    let stealCover = 2;
    for (const d of surf.decals) {
      if (d.permanent) continue;                 // permanent decals are never candidates
      const c = coverOf(d);
      if (c > this.tune.coverMin) {
        count++;
        if (!steal || c <= stealCover) { steal = d; stealCover = c; }
      }
    }
    const reuse = count >= this.tune.maxOverlap ? steal : null;
    const slot = this.alloc(reuse);
    if (!slot) return null;

    slot.permanent = permanent;
    if (!hitsGeometry) return null;              // clipped to nothing: drop it again (donor unlinks)
    slot.surface = surf;
    surf.decals.push(slot);
    return slot;
  }

  private alloc(reuse: Slot | null): Slot | null {
    if (this.slots.length === 0) return null;
    if (reuse) { unlink(reuse); return reuse; }
    let tries = 0;
    let s: Slot;
    do {
      if (this.next >= this.slots.length) this.next = 0;
      s = this.slots[this.next++];
      tries++;
    } while (s.permanent && tries < this.slots.length);  // gives up after one full loop
    unlink(s);
    return s;
  }
}

// Blood splatter drips from one TE: size plus two inclusive rolls of 1..8 (donor cl_tent.c 910).
export function splatterCount(size: number, roll: (lo: number, hi: number) => number): number {
  return Math.floor(size + roll(1, 8) + roll(1, 8));
}

// Drip lifetime in seconds (donor cl_tent.c 932).
export function dripLifeSec(roll: (lo: number, hi: number) => number): number {
  return roll(1, 3);
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/VF001-decal-budget.ts` (block plus `export {};`), exit 0.

## 5. Lands in

- TARGET `src/fight/decals.ts` (new client-only module): the blood and wound decal pool, with the per-surface overlap cap and the global pool cap as data. Parity-checklist row 8 (blood / wounds / decals).
- today: no decal pool in `src/fight/` (not read in this pass; the Frankendom side is taken from the brief).
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only, the cap and steal shape, no translated lines)
- Brief rule served: server-verified kills (blood is presentation driven by the accepted hit; a decal never changes a fight); camera/HUD/sound client-only; zones as data (pool and cap as data)

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The donor numbers (6, 0.6, 4096 and 300) are defaults to re-tune for phones and for our floor size.
- The donor's pool loop can overwrite a permanent decal when every slot is permanent (`R_DecalAlloc` 121-123). Frankendom should never mark blood as permanent, or should refuse the paste when the pool is full of permanent decals.
- The donor's steal is per surface, and the global pool is shared across all surfaces: one busy patch can evict splats far away. Frankendom should prefer to cap the arena floor per patch first and the global pool second, and test that a quiet corner keeps its splats.
- The donor computes coverage from its clip geometry (BSP). Our arena is one flat floor, so the sketch takes coverage as an input; the geometry needs a simple overlap test, not the donor's clipper.
- Blood must come from the server-accepted hit (TE-like event). A hit the server rejects or rolls to zero must not spawn a splat, and the splat count must not be used for the kill.
- Many-on-one fights (MAX_ATTACKERS = 3) can put three splats on one spot in one frame; the overlap cap handles that, but the per-frame spawn count still needs a budget (not read in the donor's TE path).
- The drip motion fields are filled with random offsets in the donor (cl_tent.c 925-930), and what the tent system does with them was not read. Do not copy those fields into Frankendom without reading the motion code.
- Not read: `DrawSingleDecal` and the draw path, `R_DecalCreatePoly`, `R_DecalVertsClip` internals, and the temp-entity motion update.
