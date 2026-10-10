# beyond-all-reason-Beyond-All-Reason (vfx-blood-finishers, cell 13)

Donor: `/mnt/frankendom-donors/beyond-all-reason-Beyond-All-Reason/luaui/Widgets/gfx_decals_gl4.lua` | Licence: GNU GPL v2 (widget header line 9, `license = "GNU GPL v2"`; the repo's `LICENSE.md` says BAR code is GPL v2 and that individual files can state their own licence) | Lua | symbol `widget:VisibleExplosion` (with `AddDecal`, `AddDecalToArea`, `RemoveDecal`, `widget:GameFrame`)

Checked: Read on the VPS. Read in full: the header and config (1-12, 48-110), the per-cell budget and eviction (`initAreas` 399-421, `AddDecalToArea` 422-460, `RemoveDecalFromArea` 462-476), `AddDecal` (546-645), `RemoveDecal` (759-779) and `widget:GameFrame` expiry and compaction (790-841), `widget:VisibleExplosion` (1279-1339), and the sibling gadget `luarules/gadgets/gfx_unit_script_decals.lua` (60 lines: it only forwards COB events to the widget). Read in part: the weapon table build (887-925, the radius and defaults; the per-weapon name overrides around 925-1260 were skimmed, not read line by line). Not read: the GL shader (the fade formula comes from the donor's own comment at 604), the footprint and unit-scar spawn paths (2056, 2063, 2277), the atlas code, and the unit of `Platform.gpuMemorySize`. The list hint `effects/volcano.lua` matched a blood-word grep only through the texture name `bloodcentersplatshwhite` (line 1230); I did not read the file. The blood words in the donor are texture names in particle effect files, for example `effects/raptors/raptorunitexplosion-red.lua` (lines 123 and 144: `blooddrop2`, `bloodblast`; not read past the match). I found no blood, gore, hit-spark or finisher logic in the files I read. The only visual-state mechanic I read is the explosion scorch decal. Confidence: high for the budget and lifetime logic as written; medium on the overall look, which I did not run. camera_scope: not applicable (not a camera topic).

## 1. Mechanism

Scorch decals are client-side presentation. Each visible explosion (the engine callback `widget:VisibleExplosion`, 1279) looks up its weapon's parameters in `weaponConfig`, which is built once from each `WeaponDef` (887-925). Weapons with a `nodecal` custom parameter, and anti-air weapons (cegTag containing "aa"), get no decal (890-891). The base radius is the weapon's `damageAreaOfEffect` times 1.4, with a 0.3 radius variation (895, 897).

Per explosion, in order (1287-1330):
1. Radius = base x (1 + (random - 0.5) x variation), so +/-15 percent for the default 0.3 (1287).
2. Height above ground: `exploHeight` is the blast height minus ground height, where under water the ground term is scaled by the weapon's depth ratio (2.5 unless the water is void; 921, 1292). If `exploHeight >= radius`, no decal (1293). This is the airborne-blast rule.
3. Height multiplier `h = 1 - exploHeight / radius` (1300). Default alpha = (1.5 + random) x h x h (1308), so an airborne blast is weaker by the square of h.
4. Default alpha decay = (0.2 + 0.3 random) / (4 x radius) (1309). A bigger blast fades more slowly.
5. Start alpha = (0.72 + 0.38 random) x alpha (1330). Other fields (heat, glow, black-and-white factor, fade-in) come from the weapon's table or defaults.
6. `AddDecal` is called at the end of `VisibleExplosion` (line 1321).

`AddDecal` (546-645): the decay is divided by `lifeTimeMult x lifeTimeMultMult` (582), so every decal's life is stretched by the same factor. Lifetime in frames = floor(alphaStart / decay), or none if decay is 0 or less (607). The expiry frame is spawn frame plus lifetime, stored in a bucket keyed by frame (625). Then `AddDecalToArea` (642) adds the decal to its map cell.

Per-cell overdraw budget (`AddDecalToArea` 422-460): each cell is 256 x 256 elmos (94-95). A decal's area is `min(width x length, cellArea)`, so a huge decal counts as one cell at most (429). The cell may hold 16 layers of area (100, 441). When the cell total goes over that, the oldest decals in the cell are evicted through `RemoveDecal`, in insertion order (441-447).

Expiry (790-841): each game frame, the decals in that frame's bucket are flagged for compaction (791-802). Every 67 frames (809), compaction runs only if at least half of the decals are flagged (813). Evicted decals are skipped in the flagged count (796).

Lifetime multiplier (88-90): `gpuMem = gpuMemorySize / 1000` (fallback 2000 gives 2), `lifeTimeMult = 0.7 + min(gpuMem / 6000, 2.3)` (89). `lifeTimeMultMult = 1.5` (90) is a fixed extra factor. Fade-in is `FADEINTIME = 20` frames (73); the fade formula is written in the donor's comment as `min(1, lifetonow / FADEINTIME) x alphastart - lifetonow x alphadecay` (604; the shader was not read).

## 2. Key functions

- `widget:VisibleExplosion`: `/mnt/frankendom-donors/beyond-all-reason-Beyond-All-Reason/luaui/Widgets/gfx_decals_gl4.lua` 1279-1339. Read in full.
- `AddDecal`: same file, 546-645. Lifetime at 582 and 607, expiry bucket at 625, area add at 642.
- `AddDecalToArea` (budget and eviction): same file, 422-460. Eviction loop at 441-447.
- `RemoveDecal` and `RemoveDecalFromArea`: same file, 759-779 and 462-476. The area is released only in `RemoveDecal` (760).
- `widget:GameFrame` (expiry and compaction): same file, 790-841.
- `weaponConfig` build: same file, 887-925 (read in part).
- Gadget that forwards COB unit-script decals: `/mnt/frankendom-donors/beyond-all-reason-Beyond-All-Reason/luarules/gadgets/gfx_unit_script_decals.lua` 18-20 (forward only).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Decal radius from weapon area | x 1.4 (895); spread 0.3 (897) |
| Airborne blast: no decal at or above the radius, then weaker by h^2 | rule (1293); alpha (1.5 + r) x h^2 (1308) |
| Decay inversely proportional to radius | (0.2 + 0.3 r) / (4 x radius) (1309) |
| Start alpha range | 0.72 to 1.10 of the blast alpha (1330) |
| Lifetime = start alpha / decay | floor (607); decay divided by lifeTimeMult x 1.5 (582) |
| Cell size for the budget | 256 elmos (94) |
| Overdraw budget per cell | 16 layers of cell area (100, 441) |
| Single decal counts at most one cell | cap at cellArea (429) |
| Compaction cadence and threshold | every 67 frames (809); at least half flagged (813) |
| Fade-in | 20 frames (73) |
| Lifetime multiplier | 0.7 + min(gpuMem / 6000, 2.3), gpuMem from `gpuMemorySize / 1000` (88-89); fixed x 1.5 (90) |
| Underwater depth ratio | 2.5 unless void water (921) |

Worked example (my arithmetic from the code, not a donor output): a 100-elmo blast at full height (h = 1) gives alpha 1.5 to 2.5, start alpha 1.08 to 2.75, and decay 0.0005 to 0.00125 before the multiplier. With the fallback multiplier (about 1.05 after the x 1.5), the life runs from about 900 to about 5,800 frames.

## 4. TypeScript sketch

simplified: The sketch keeps the donor's explosion-to-decal steps (radius spread, airborne cut-off, height multiplier, alpha, decay, start alpha), its lifetime formula, the per-cell budget with oldest-first eviction, and frame-bucketed expiry. It omits: the GL vertex data and the shader; the heat, glow and black-and-white fields; the weapon table and per-weapon overrides; the footprint and unit-scar paths; the underwater depth ratio; and the lazy compaction (VBO) step. One change from the donor: the sketch releases a decal's area when it expires, whereas the donor keeps expired decals counted until they are evicted (section 6). The sketch follows the intent in the donor's own comment, not the donor's behaviour.

```ts
// Licence: GNU GPL v2 (donor widget header, gfx_decals_gl4.lua line 9). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

const CELL = 256;                  // donor areaResolution, in world units (elmos)
const CELL_AREA = CELL * CELL;     // donor cellArea
const MAX_LAYERS = 16;             // donor maxDecalLayersPerCell

// Lifetime in frames: alphaStart / alphaDecay, with the decay divided by the lifetime multiplier (donor 582, 607).
function lifetimeFrames(alphaStart: number, alphaDecay: number, lifeMult: number): number | null {
  const decay = alphaDecay / lifeMult;
  return decay > 0 ? Math.floor(alphaStart / decay) : null; // null: never expires on its own
}

interface DecalParams { radius: number; alphaStart: number; alphaDecay: number; }

// Explosion decal from a blast (donor 1287-1330). rand() returns 0..1; spread is the weapon radius variation.
function explosionDecal(baseRadius: number, spread: number, exploHeight: number, rand: () => number): DecalParams | null {
  const radius = baseRadius * (1 + (rand() - 0.5) * spread);
  if (exploHeight >= radius) return null;            // a blast above its radius leaves nothing
  const h = 1 - exploHeight / radius;                // height multiplier: airborne blasts are weaker
  const alpha = (1.5 + rand()) * h * h;
  return {
    radius,
    alphaStart: (0.72 + 0.38 * rand()) * alpha,
    alphaDecay: (0.2 + 0.3 * rand()) / (4 * radius), // bigger blast, slower fade
  };
}

interface CellState { order: number[]; area: Map<number, number>; total: number; }

// Per-cell overdraw budget with oldest-first eviction, and frame-bucketed expiry.
class DecalBudget {
  private cells = new Map<number, CellState>();
  private cellOf = new Map<number, number>();
  private expiring = new Map<number, number[]>();

  constructor(private readonly lifeMult: number) {}

  add(id: number, cellKey: number, width: number, length: number, spawnFrame: number,
      alphaStart: number, alphaDecay: number): void {
    const cell = this.cells.get(cellKey) ?? { order: [], area: new Map<number, number>(), total: 0 };
    this.cells.set(cellKey, cell);
    const area = Math.min(width * length, CELL_AREA); // a giant decal counts as one layer
    cell.area.set(id, area);
    cell.total += area;
    cell.order.push(id);
    this.cellOf.set(id, cellKey);

    const life = lifetimeFrames(alphaStart, alphaDecay, this.lifeMult);
    if (life !== null) {
      const at = spawnFrame + life;
      const bucket = this.expiring.get(at) ?? [];
      bucket.push(id);
      this.expiring.set(at, bucket);
    }

    while (cell.total > MAX_LAYERS * CELL_AREA && cell.order.length > 0) {
      this.remove(cell.order.shift() as number); // oldest first
    }
  }

  // Simplified: the donor keeps expired decals counted in the cell total until they are evicted (see note, gap 4).
  // Here expiry releases the area at once.
  tick(frame: number): void {
    const bucket = this.expiring.get(frame);
    if (bucket === undefined) return;
    for (const id of bucket) this.remove(id);
    this.expiring.delete(frame);
  }

  remove(id: number): void {
    const key = this.cellOf.get(id);
    if (key === undefined) return;
    const cell = this.cells.get(key);
    if (cell !== undefined) {
      cell.total = Math.max(0, cell.total - (cell.area.get(id) ?? 0));
      cell.area.delete(id);
    }
    this.cellOf.delete(id);
  }
}
```

## 5. Lands in

- TARGET `src/fight/decals.ts` (new client-side presentation module in the fight folder). It reads the server's fight events (the hit or the kill, with the blast radius and the height) and draws the scorch. It never writes fight state. Parity-checklist row 8 (blood/wounds/decals).
- Reuse tag: rewrite-from-idea (GPL v2; clean-room only)
- Brief rule served: 1 (one engine: the decal is drawn from engine events and never changes the fight; the client only presents)

## 6. Gaps and risks

- Clean-room only. The sketch is written from the mechanism; no donor lines are copied.
- Expiry does not release the cell budget. In the donor, a decal that reaches its death frame is flagged for compaction (802) but its area stays counted in its cell until it is evicted (`RemoveDecalFromArea` runs only in `RemoveDecal`, 760, and `RemoveDecal` is called only from eviction, 446). So an expired but still-listed decal can use up budget that a live decal needs. The donor's comment says the flagged decals are "invisible already" (762), which suggests the authors meant the area to be released. I have not run this, so it is a reading, not a measured bug. Frankendom should release area at expiry.
- The lifetime multiplier uses `Platform.gpuMemorySize / 1000` divided by 6000 (88-89). The unit of `gpuMemorySize` was not read. With the 2000 fallback the multiplier is about 0.7003, so unless the unit is verified the GPU term may do nothing. Frankendom should use a settings value, not GPU memory.
- Time is in game frames. Decals are presentation, so client frames are fine, but Frankendom must not let their expiry touch the fight.
- The weapon table keys style by name strings (for example "footstep", "starfire", "heat_ray"). Frankendom should key by a catalogue tag.
- The 256-elmo cell and the 16-layer budget are the donor's map scale. Frankendom's Pit size must set both, as data.
- Blood exists only as particle texture names (`effects/raptors/raptorunitexplosion-red.lua` 123, 144; `effects/fire.lua` 16). Those were not read as a mechanism, and I found no finisher logic. Blood and finisher behaviour need their own source.
- Other decal producers (COB unit scripts through the gadget, footprints and unit scars at 2056, 2063, 2277) were not read, so the budget's behaviour for them is unverified.

Best transferable idea: Give each map cell a fixed decal budget that evicts the oldest marks first, and make each scorch's life follow its blast radius.
Decision (proposed): adapt - take the per-cell budget and blast-sized life, released at expiry; drop the GL pipeline, the name-keyed weapon table and the GPU-memory lifetime, which do not fit Frankendom.
Acceptance: In a long Pit fight the live scorch count in one arena cell never exceeds the cell budget, the oldest mark goes first when the budget is hit, a 100-unit blast's mark outlives a 30-unit blast's on average, and no mark is drawn for a blast above its radius; the fight outcome is unchanged.

Reuse tag: rewrite-from-idea (GPL v2; clean-room only)
Brief rule served: 1 (one engine: the decal is drawn from engine events and never changes the fight; the client only presents)
