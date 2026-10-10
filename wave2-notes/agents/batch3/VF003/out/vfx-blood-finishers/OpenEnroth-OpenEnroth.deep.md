# OpenEnroth-OpenEnroth (vfx-blood-finishers, cell 13)

Donor: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Graphics/DecalBuilder.cpp` | Licence: LGPL-3.0 (repo `LICENSE`: "GNU LESSER GENERAL PUBLIC LICENSE Version 3, 29 June 2007"; copyleft, clean-room, shape only) | C++ | symbol `BLV_UpdateActors` (death trigger; baking in `DecalBuilder::ApplyBloodSplatToTerrain`)

Checked: opened `DecalBuilder.cpp` (all 267 lines), `DecalBuilder.h` (read by grep only), `Indoor.cpp` 760-815 (BLV_UpdateActors splat block), `Outdoor.cpp` 1571-1612 (UpdateActors_ODM splat block; the loop head is read only in part), `OpenGLRenderer.cpp` 856-870 (DrawDecal fade), 1280-1375 (terrain pass; the tile-culling conditions above 1342 are not read), 2706-2726 and 3236-3276 (indoor and building face application; read in part), `Game.cpp` 1500-1585 (main loop order), `Engine.cpp` 155-175, `Duration.h` (ticks constants and the `realtimeMillisecondsFloat` accessor), `GameConfig.h` 424-430, `Monsters.cpp` 250-262 and 515-527. The hint file `SpellFxRenderer.cpp` is not the blood path: its `BloodRed` uses (1063-1070) are spell-impact particle colours, read only at 1050-1072. Confidence: high on the death-to-splat-to-bake-to-draw path and on the fade arithmetic (read in full); medium on which terrain tiles get baked in a given pass (culling not read). Nothing was run at runtime. The colour value `colorTable.Red` was not read.

Best transferable idea: Turn each death into a one-shot floor splat that is baked once into a fixed-size decal pool at landing, so the render cost is paid once and the pool size is a data cap, instead of re-deriving blood geometry every frame.
Decision (proposed): adapt - keep the bake-once pool, the per-corpse one-shot flag and the landing threshold; trigger from the server-verified death event (not from a client guess), keep the splat as a view that never enters the ledger, and make radius, fade and pool size data fields with the fade off by default.
Acceptance: after a server-verified kill of a monster whose catalogue row is marked bloody, one dark-red floor decal appears under the corpse within one rendered frame of the body dropping below ground plus 30 units, and a level never holds more than 1024 decals.

## 1. Mechanism

- Trigger (per corpse, in the world update, not the renderer). `BLV_UpdateActors` (Indoor.cpp:768) loops the actors each update. A corpse gets one splat when all of these hold, checked in this order: it is not yet marked done (Indoor.cpp:793); its `aiState` is `Dead` or `Dying` (794); its z is below the floor height plus 30 (795); and its monster row has the blood flag (796). The outdoor path (`UpdateActors_ODM`, Outdoor.cpp:1571, called from Outdoor.cpp:869) repeats the same block (1597-1605).
- Inside the flag check the order is: if the config `BloodSplats` is on, add a splat at (actor x, actor y, floor + 30) with radius `actor.radius * BloodSplatsMultiplier` (797-799); then set `donebloodsplat` (801). So a corpse whose monster has the flag is marked done even when the config is off. A corpse whose monster has no flag is never marked and is re-checked every update. Only these two callers exist for `AddBloodsplat` (Indoor 799, Outdoor 1603).
- Source list (per pass). `AddBloodsplat` writes into a 64-slot array at `uNumBloodsplats`, then sets the count to `(count + 1) % 64` (DecalBuilder.cpp:30-40, header 47). The main loop zeroes that count at the top of every pass (Game.cpp:1532), then runs the world update (1571), then `engine->Draw()` (1582). So the live source list holds only the splats created in the current pass.
- Baking (in the same pass, during draw). The terrain pass returns early when no sources are live (OpenGLRenderer.cpp:1294). For each live source it visits the terrain squares within `scope = ceil(radius / 512)` (1303), tests each square's box against the splat sphere (1342), and for the top and bottom triangle calls `ApplyBloodSplatToTerrain` (1356, 1367). That function hits a triangle when its plane distance is within the radius (DecalBuilder.cpp:219), and sets the fade flag only when the tile is water or shore (223-226). `BuildAndApplyDecals` then calls `Build_Decal_Geometry` for each hit, which writes a quad into the decal pool and clips it to the face (DecalBuilder.cpp:95-180). Indoor and building faces take the same route through `ApplyBloodsplatDecalsToFace`, which keeps a splat for a face when the face-plane distance is within the radius (196), and the indoor path is filtered by the visible sector list (OpenGLRenderer.cpp:3250).
- Persistence. Baked decals stay in the 1024-slot pool (`Decals`, DecalBuilder.h:108). The pool count is reset only on level load (`Reset(0)`, Indoor.cpp:259 and Outdoor.cpp:260) and wraps at 1024 (DecalBuilder.cpp:179). The pool is drawn every pass: `DrawBloodsplats` (249-253) calls `DrawDecals`, which draws each decal through `DrawDecal` (OpenGLRenderer.cpp:856).
- Fade (draw time, per decal). `Fade_by_time` (DecalBuilder.cpp:17-28) returns 1 when the decal has no fade flag or the config `bloodsplats_fade` is off. Otherwise it returns `(30 - elapsed) / 30`, clamped at 0, where `elapsed` is timer time since the decal's `fadetime`, measured by the accessor in real seconds (24). `DrawDecal` skips a decal whose alpha is 0 (863). The fade flag lives on the shared splat and is set only when a water or shore tile is hit (223-226), and the decal copies it (102-103). A building decal has its flag cleared (106).
- Ticks. The timer runs 128 ticks per real second (Duration.h:28), and the comment at Duration.h:29 says game time runs 30 times faster than real time. `realtimeMillisecondsFloat()` divides ticks by 128, so it returns real seconds despite its name (Duration.h:64). That makes the fade a 30 real-second fade.

## 2. Key functions

- `BLV_UpdateActors`: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Graphics/Indoor.cpp` 768-801 (the trigger; the rest of the function, which moves actors, is not read in full). Called from `BLV_UpdateUserInputAndOther` at Indoor.cpp:1318.
- `UpdateActors_ODM` (outdoor trigger, same block): `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Graphics/Outdoor.cpp` 1571 and 1596-1605.
- `BloodsplatContainer::AddBloodsplat` and the ring: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Graphics/DecalBuilder.cpp` 30-40.
- `ApplyBloodSplatToTerrain` (hit test, water/shore fade flag, fade time): `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Graphics/DecalBuilder.cpp` 206-236.
- `Build_Decal_Geometry` (quad into pool, clip, ring wrap): `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Graphics/DecalBuilder.cpp` 95-180.
- `Decal::Fade_by_time`: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Graphics/DecalBuilder.cpp` 17-28, drawn from `OpenGLRenderer::DrawDecal` at `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Graphics/Renderer/OpenGLRenderer.cpp` 856-870.
- Terrain pass that bakes live splats: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Graphics/Renderer/OpenGLRenderer.cpp` 1294-1375.
- Main loop order (clear, update, draw): `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Application/Game.cpp` 1532, 1571, 1582.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One-shot per corpse: mark done, check once per update | Done flag on the actor (Indoor.cpp:801, Outdoor.cpp:1605) |
| Landing test: corpse z below ground plus a lift | Lift 30 units (Indoor.cpp:795, 799; DecalBuilder.h:36 comment) |
| Splat radius = body radius times a client multiplier | Multiplier default 1.0 (GameConfig.h:427); radius = actor.radius (monster data, not read) |
| Live source list, capped and reset each pass | 64 slots (DecalBuilder.h:47, DecalBuilder.cpp:39) |
| Bake-once decal pool with ring overwrite | 1024 decals (DecalBuilder.h:108; DecalBuilder.cpp:179) |
| Fade by time since bake, linear to zero | 30 real seconds (DecalBuilder.cpp:24, Duration.h:64); water and shore only (OpenGLRenderer.cpp:1346) |
| Terrain search window around a splat | ceil(radius / 512) squares (OpenGLRenderer.cpp:1303) |
| Timer units | 128 ticks per real second, game time 30x real (Duration.h:28-29) |
| Blood flag per monster | Monster table field at zero-based token 8, parsed at Monsters.cpp:523 |

## 4. TypeScript sketch

simplified: keeps the donor order (landing test and one-shot flag in the world update; bake in the render pass; alpha at draw time) and the bake-once pool. It replaces the donor's per-face plane and box tests with a 2D distance test on given ground points, and it drops sources past the cap and counts them, where the donor's counter wraps modulo 64 (so a 64th source in one pass leaves the live count at 0 and none of that pass's splats draw; not copied). It clears the source list at the end of `bake` rather than at the top of the next pass (same effect in this loop). It omits the indoor sector filter, the building no-fade rule, the 30-unit offset of the baked quad, clipping to face, the terrain search window, the lighting dim and the colour multiply.

```ts
// Licence: LGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const SPLAT_SOURCES_PER_PASS = 64;  // live splat sources per render pass
const DECAL_POOL_SIZE = 1024;       // baked decals kept per level; oldest is overwritten
const LANDING_LIFT = 30;            // a splat sits this many units above ground
const WATER_FADE_REAL_S = 30;       // only water/shore decals fade, over this many real seconds
const TICKS_PER_REAL_SECOND = 128;  // game timer ticks per real second

type CorpseState = "alive" | "dying" | "dead";

interface Corpse {
  x: number; y: number; z: number;
  radius: number;
  state: CorpseState;
  bloodFlag: boolean;   // catalogue row: does this monster bleed on landing
  splatDone: boolean;   // one splat per corpse
}

interface Source { x: number; y: number; z: number; radius: number; }

interface Decal { x: number; y: number; z: number; radius: number; fadeStartS: number | null; }

interface GroundPatch { x: number; y: number; z: number; }

// Game ticks to real seconds. (The donor accessor named ...MillisecondsFloat returns seconds.)
function realSecondsFromTicks(ticks: number): number {
  return ticks / TICKS_PER_REAL_SECOND;
}

class BloodPool {
  private sources: Source[] = [];
  private decals: Array<Decal | undefined> = new Array(DECAL_POOL_SIZE);
  private nextDecal = 0;
  dropped = 0;

  constructor(private readonly bloodOn: boolean, private readonly radiusMultiplier: number) {}

  // Called from the world update, once per corpse per pass.
  landed(c: Corpse, groundZ: number): void {
    if (c.splatDone) return;
    if (c.state !== "dead" && c.state !== "dying") return;
    if (c.z >= groundZ + LANDING_LIFT) return;
    if (!c.bloodFlag) return;      // flag off: corpse stays unmarked
    c.splatDone = true;
    if (!this.bloodOn) return;     // setting off: marked done, no splat
    if (this.sources.length >= SPLAT_SOURCES_PER_PASS) { this.dropped++; return; }
    this.sources.push({ x: c.x, y: c.y, z: groundZ + LANDING_LIFT, radius: c.radius * this.radiusMultiplier });
  }

  // Called from the render pass with ground patches near the sources. Each hit is baked into the pool once.
  bake(patches: GroundPatch[], nowS: number, waterOrShore: (p: GroundPatch) => boolean): void {
    for (const s of this.sources) {
      for (const p of patches) {
        if (Math.hypot(p.x - s.x, p.y - s.y) > s.radius) continue;
        this.decals[this.nextDecal] = {
          x: p.x, y: p.y, z: p.z, radius: s.radius,
          fadeStartS: waterOrShore(p) ? nowS : null,
        };
        this.nextDecal = (this.nextDecal + 1) % DECAL_POOL_SIZE;
      }
    }
    this.sources = [];
  }

  // Draw-time alpha: permanent decals stay at 1; water/shore decals fade linearly from their bake time.
  alpha(d: Decal, nowS: number): number {
    if (d.fadeStartS === null) return 1;
    const a = 1 - (nowS - d.fadeStartS) / WATER_FADE_REAL_S;
    return Math.min(1, Math.max(0, a));
  }
}
```

Typecheck: `tsc --noEmit --strict --target es2020` on the VPS (file with `export {}` appended) exited 0.

## 5. Lands in

- TARGET `src/fight/blood.ts` (new client module: the decal pool and landing test, fed by the server-verified death event). Not checked against the Frankendom repo (I did not open it). Parity-checklist row 8 (blood/wounds/decals). The death trigger itself belongs to the fight engine and reads row 17 (death/respawn); this note cites row 8 for the presentation only.
- today: no equivalent (not checked against the repo).
- Reuse tag: rewrite-from-idea (LGPL-3.0; clean-room only)
- Brief rule served: one engine, client-only presentation (the splat is a view of the verified kill, never a state change); zones as data for the fade and pool numbers.

## 6. Gaps and risks

- LGPL-3.0: clean-room only. The sketch is written from the mechanism read above; no donor line is translated.
- Frame-lived source list. Splats are baked only in the pass that creates them (Game.cpp:1532, 1571, 1582). A corpse that lands while its ground is not drawn in that pass (an indoor face whose sector is not in the visible list, OpenGLRenderer.cpp:3250; terrain culling not read) may never be baked. Frankendom should keep the splat as an event with position and radius and bake it when the ground is drawn, not rely on one pass.
- Source wrap. The counter wraps modulo 64 (DecalBuilder.cpp:39), so 64 landings in one pass leave the live count at 0 and none draw. Frankendom's cap must drop and count, not wrap. Read from code, not run.
- Fade is 30 real seconds for water and shore only, and the name is misleading: `realtimeMillisecondsFloat` returns seconds (Duration.h:64). The override that forces alpha 1 is commented out under a "temp - bloodsplat persistance" note (OpenGLRenderer.cpp:865-866), so the fade behaviour is not settled upstream. Make the fade a data field with a default of off.
- A fade flag is stored on the shared splat, not the decal (DecalBuilder.cpp:226). Within one pass, any decal from that splat built after a water tile would inherit the fade. This is an odd side effect; do not copy it.
- Trigger point. The donor fires on the corpse landing, not on the kill. Frankendom's rule is that kills are server-verified, so the splat must come from the verified death event, and the landing test runs on the client view. A client-only guess must not create a splat.
- One ledger. Decals are presentation; they must not hold game state (no hp, no loot). Rebuild them from the event log on join, or drop them, never persist them in the ledger.
- Many-on-one fights create many corpses at once. With a source cap of 64 per pass and a pool of 1024 per level, the cap must be data per zone (zone data), and the pit view should reuse the same pool (Pit as client).
- Not read: how `Dying` and `Dead` are entered and how the corpse's z falls; the decal quad's shader and blend mode; `colorTable.Red`; the monster radius source; the full `BLV_UpdateActors` body.
