# ValveSoftware-source-sdk-2013 (rendering-performance, cell 2)

Donor: `/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/client/clientshadowmgr.cpp` | Licence: Valve "SOURCE 1 SDK LICENSE" (`/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/LICENSE`, line 1; restricted, not an OSI licence) | C++ | symbols `CClientShadowMgr::ComputeShadowTextures`, `CVisibleShadowList::PrioritySort`, `CTextureAllocator::UseTexture`

Checked: Read the design comment (lines 1-80), constants and cvars (160-175, 680-690, 1286-1290), the allocator `UseTexture` (508-611), the visible list (986-1240), the draw path `DrawRenderToTextureShadow` and `DrawRenderToTextureShadowLOD` (3690-3830), and the budget loop `ComputeShadowTextures` (3998-4100). This file is the right file for shadows (the list hint was not wrong). Callers read: `viewrender.cpp` 4924 (inside `CSkyboxView::DrawInternal`, 4869) and 5494 (inside `CBaseWorldView::DrawExecute`, 5487); the interface declares it in `iclientshadowmgr.h:71`. Not read: `ComputeBoundingSphere`, `ComputeShadowBBox`, `ShouldUseParentShadow`, the body of `DrawShadowHierarchy`, the fragment-cache internals of `UseTexture` beyond the overflow loop, the engine's `ComputePixelDiameterOfSphere`, the blob shadow material, and how many times `DrawExecute` runs per frame (water passes were not traced). camera_scope: n/a (shadows, not a camera topic). Confidence: high on the budget loop, the sort and the cap (read end to end); medium on the allocator's cache details (main decisions read). Licence restricted: clean-room, shape only; nothing translated line by line.

Best transferable idea: Rank visible shadow casters by on-screen area, spend a fixed number of texture redraws on the largest, and give every other caster a cheap blob, so a crowded scene has a predictable shadow cost.
Decision (proposed): adapt. Keep the rank-by-screen-size, redraw cap and blob fallback, with a one-step hysteresis on texture size. Make the cap a data field per quality tier, and keep a valid cached texture when the cap binds (the donor drops it to a blob). Do not port the texture page allocator unless our renderer draws shadows into render targets.
Acceptance: With more visible characters than the cap, a debug counter shows at most the cap of full shadow redraws per frame, the largest characters on screen get the full shadow, the rest get a blob, and a valid cached shadow over the cap stays cached (not a blob).

## 1. Mechanism

- Gate (`ComputeShadowTextures`, 4005-4008): return at once if render-to-texture is off, `r_shadows` is 0 or `r_shadows_gamecontrol` is 0. Then `m_bThreaded` is forced to false (4008), so the threaded bone-setup pass is off in this build.
- Gather (`CVisibleShadowList::FindShadows`, from 1149). The list is cleared, the leaves are enumerated, and `EnumShadow` runs for each shadow in them. If any were found, `PrioritySort` runs (1159).
- Enumerate (`EnumShadow`, from 1059 to just before 1113). In order: skip a shadow already rendered this frame (1064); skip shadows that are not render-to-texture; skip shadows with falloff bias 255, which are fully transparent (1073); skip hierarchy children and blob-parented casters; compute the bounding sphere and box; cull the box against the view (1096); add the shadow with `m_flArea` = squared pixel diameter of the sphere (1051-1052), and mark it as seen this frame.
- Sort (`PrioritySort`, 1115-1141). A selection sort over an index array, largest area first. The compare is at 1135. The shadow data is not moved; only the index array is.
- Budget loop (4050-4090). `nMaxShadows = r_shadowmaxrendered.GetInt()` (4050; the cvar default is 32, line 685). Walk the sorted list. While the count is under the cap (4080), call `DrawRenderToTextureShadow`; if it returns true, count one (4082-4084). Otherwise, and once the cap is reached, call `DrawRenderToTextureShadowLOD` (4089). The cap counts redraws, not uses: a cached shadow that returns false is not counted.
- Draw (`DrawRenderToTextureShadow`, from 3733). Clears the LOD flag (restores the full material if needed). `UseTexture` (3748) decides whether a redraw is needed. If there is no valid texture, the shadow goes to the LOD path and the function returns false. Otherwise, if a redraw is needed or the texture is dirty, the viewport is set to the texture rect, the buffers are cleared and the hierarchy is drawn; it returns true when something was drawn. The dirty flag is cleared unless the caster animates.
- Texture size (`UseTexture`, 508-611). Desired power = the smallest p (from MIN up to the texture's max) with (2^p) squared at least the area (518). If the held fragment is at that power, or is within one step and no redraw is needed (538: `desired < 8` and `desired - current <= 1`), it is kept, marked as used, and no redraw happens. Otherwise the least-recently-used fragment at the desired power is taken; if its head was used this frame (563), the search steps down to a smaller size (overflow step-down). If the new fragment is not better than the held one, the held one is kept. Taking a new fragment returns true, the redraw signal (609).
- LOD (`DrawRenderToTextureShadowLOD`, from 3816). Sets the simple blob shadow material and the full-texture UVs (0,0,1,1) once, and sets the LOD flag.
- Order of operations in one call: gate, gather and cull, rank, walk by rank with redraw until the cap, blob the rest.

## 2. Key functions

- `CClientShadowMgr::ComputeShadowTextures`: `/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/client/clientshadowmgr.cpp` from 4001 (gate 4005, cap 4050, non-threaded budget loop 4080-4090).
- `CVisibleShadowList::EnumShadow`: same file, from 1059 (skips 1064, 1073; cull 1096; area 1051-1052 via `ComputeScreenArea`).
- `CVisibleShadowList::PrioritySort`: same file, 1115-1141 (selection sort, compare 1135).
- `CVisibleShadowList::FindShadows`: same file, from 1149.
- `CClientShadowMgr::DrawRenderToTextureShadow`: same file, from 3733 (`UseTexture` at 3748).
- `CTextureAllocator::UseTexture`: same file, 508-611 (desired power 518, keep rule 538, overflow step-down 563, redraw signal 609).
- `CClientShadowMgr::DrawRenderToTextureShadowLOD`: same file, from 3816 (UVs at 3822).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Rank casters by on-screen area (diameter squared), largest first | Area = (pixel diameter of bounding sphere)^2 (theirs: 1051-1052) |
| Spend a fixed number of full redraws per call; the rest get the cheap fallback | Cap 32 (theirs: `r_shadowmaxrendered` default, line 685; read at 4050) |
| Count only real redraws toward the cap | Count increment at 4084 (theirs) |
| Texture size from area, smallest power that covers it | Power range 4 to 8 on the PC build (theirs: 167 under `#if !defined( _X360 )` at 166; max 8 at 165); page 1024 (theirs: 164) |
| Hysteresis: keep the held size if within one step and no redraw is needed | One power step, and no keep above power 8 (theirs: 538) |
| Blob fallback is a fixed simple material with full-texture UVs | UVs (0,0,1,1) (theirs: 3822) |
| Default shadow cast distance | 50 (theirs: `SetShadowDistance( 50 );` 1289) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (rank by area, redraw while under the cap, blob the rest, a size-from-area helper and the one-step keep rule). It changes one behaviour: over the cap, a caster with a valid cached texture stays cached; the donor sends every over-cap caster to the blob. It omits the gather and cull step, the already-seen-this-frame check, the hierarchy case, the allocator's per-size LRU and 1024 page, the overflow step-down, the threaded pass and the material and UV switching. Ties are broken by id, which the donor does not define. Typechecked on the VPS with `tsc --strict --target es2020`, exit 0.

```ts
// Licence: Valve Source 1 SDK licence (donor; restricted). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Shadow budget: rank visible casters by on-screen area, redraw only up to a cap, blob the rest.

export interface ShadowCandidate {
  id: number;
  screenArea: number;    // squared pixel diameter of the caster's bounding sphere
  needsRedraw: boolean;  // caster moved or animated since its texture was drawn
  hasTexture: boolean;   // a texture slot is currently held for this caster
}

export type ShadowMode = 'redraw' | 'cached' | 'blob';

// Largest on-screen area first. Ties broken by id (the donor's selection sort gives no tie order).
export function prioritize(c: ShadowCandidate[]): ShadowCandidate[] {
  return c.slice().sort((a, b) => (b.screenArea - a.screenArea) || (a.id - b.id));
}

// Smallest power p (texture side = 2^p) whose square covers the area, clamped to [minPow, maxPow].
export function desiredPower(area: number, minPow: number, maxPow: number): number {
  let p = minPow;
  while (p < maxPow && (1 << p) * (1 << p) < area) p++;
  return p;
}

// Hysteresis: keep the held texture when nothing needs a redraw and it is at most one step away.
export function keepHeld(currentPow: number, desired: number, redraw: boolean, maxPow: number): boolean {
  return !redraw && desired < maxPow && desired - currentPow <= 1;
}

// Redraws are capped, uses are not. A valid cached texture is kept over the cap (the donor blobs it).
export function planShadows(cands: ShadowCandidate[], redrawCap: number): Map<number, ShadowMode> {
  const plan = new Map<number, ShadowMode>();
  let redrawn = 0;
  for (const c of prioritize(cands)) {
    if (!c.hasTexture) {
      plan.set(c.id, 'blob');
    } else if (c.needsRedraw) {
      if (redrawn < redrawCap) {
        plan.set(c.id, 'redraw');
        redrawn++;
      } else {
        plan.set(c.id, 'blob');   // stale texture and no budget left
      }
    } else {
      plan.set(c.id, 'cached');
    }
  }
  return plan;
}

export {};
```

## 5. Lands in

- TARGET (proposed, client only): `src/render/shadows.ts`. The brief allows only `src/fight/<module>.ts` or `origins/<path>`, and no such module fits rendering, so Strategy needs to rule on the path. Shadows are client-side; the server never reads them.
- Parity row: 16 (colour grade and quality), the closest row; shadow cost is a quality tier. No row covers shadow budgets.
- today: none in Frankendom (not read; not found in this pass).
- Reuse tag: rewrite-from-idea (Valve SDK licence, restricted; clean-room only)
- Brief rule served: readability at 375 wide (the biggest characters on screen keep the full shadow), and the addendum's per-frame budget; no server rule applies (client-only).

## 6. Gaps and risks

- Licence: Valve SDK licence, restricted. Clean-room, shape only; the sketch was written from the mechanism.
- The cap is per call, not per frame. `ComputeShadowTextures` is called from the skybox view (`viewrender.cpp` 4924) and from the world view (5494). Each call has its own count, so a frame can spend more than one cap. How many times `DrawExecute` runs per frame (water passes) was not traced. Frankendom should keep one counter per frame, not per view.
- Defect (judged, not measured): over the cap, the donor sends every caster to the blob (4080-4089), including a caster whose valid texture is still good. The cached one costs nothing, so the cap is spent on the wrong thing. Fix: cap redraws, not uses (sketch `planShadows`). A stale texture over the cap still goes to the blob, which is the right fallback.
- No distance check (1093, the author's FIXME). Ranking by area is the only thing that moves far casters down. Fix: a per-zone shadow distance as data, applied before the rank (the donor has a shadow distance setting, 1289, but it is not used in the enumeration).
- The priority sort is a selection sort (1115-1141), O(n squared) over the visible list. Fine for small lists; use a sort with a fixed tie-break (sketch).
- The overflow step-down (563) can silently give a smaller texture. Fix: count it, so the cost and the quality drop are visible.
- The threaded path is forced off (4008; the constructor at 1174 also sets it false). Dead code in this build; do not port it.
- The allocator, page and LRU (508-611) are a render-target atlas. Frankendom needs one only if its renderer draws shadows into render targets. If it uses blob or planar shadows, skip the allocator and keep the rank and cap.
- Frankendom rulings: client-only; no kill, ledger or server-tick effect. The Pit's MAX_ATTACKERS = 3 means the cap will not bind in a Pit fight, so the saving shows up in zones with many NPCs.

Reuse tag: rewrite-from-idea (Valve SDK licence, restricted; clean-room only)
Brief rule served: readability at 375 wide (the biggest characters on screen keep the full shadow); client-only, no server rule applies.
