# dhewm-dhewm3 (vfx-blood-finishers, cell 13)

Donor: `/mnt/frankendom-donors/dhewm-dhewm3/neo/game/Entity.cpp` (main path; also `neo/game/AFEntity.cpp`, `neo/game/Game_local.cpp`, `neo/game/Projectile.cpp`, `neo/game/Weapon.cpp`, `neo/game/Actor.cpp`) | Licence: GPL-3.0 "or any later version" plus id Software additional terms (header read in the hint file `neo/d3xp/Fx.cpp`; `COPYING.txt` at repo root). Clean-room: shape only | C++ | symbol `idAnimatedEntity::AddLocalDamageEffect`

Checked: Hint file `neo/d3xp/Fx.cpp` was read for its header only; it is not the blood path. The real path was read end to end: `idAnimatedEntity::AddDamageEffect` (Entity.cpp 5111-5158), `AddLocalDamageEffect` (5174-5243), `UpdateDamageEffects` (5250-5282), `gameLocal::BloodSplat` (Game_local.cpp 3924-3944), `ProjectDecal` (3875-3917), `idAFEntity_Gibbable::Damage/Gib/SpawnGibs` (AFEntity.cpp 1090-1190), `idActor::Gib` (Actor.cpp 2124-2138), the actor death/gib branch (Actor.cpp 2188-2199), the projectile and melee call sites (Projectile.cpp 599-607; Weapon.cpp 3059-3065), `idWeapon::BloodSplat` (Weapon.cpp 1650-1659), and the gib constant (AFEntity.h 47, from grep). Not read: `idEntity::AddDamageEffect` base (Entity.cpp 3025), `SmokeParticles::EmitSmoke` body, `ProjectOverlay`, the `EV_Gibbed` handler, the `d3xp` copies of these files (grep only; `neo/d3xp/AFEntity.cpp:1252` shows the same gib-timer gate). Confidence: high on the hit-to-splat/wound/bleed order and the gib gates; medium on what a bleed emitter does per frame (EmitSmoke not read). Camera: not applicable. Also: `idPlayerView::AddBloodSpray` (PlayerView.cpp 313-349) has its whole body inside a block comment, so the donor has no working screen-blood overlay.

Best transferable idea: Resolve each hit into presentation on every client from one compact server event (joint index, joint-local point, normal and direction, def and surface ids), where the surface picks a random variant and the entity's own table overrides the damage definition, so decals and bleeds are never a second source of truth.

Decision (proposed): adapt - take the shape (one hit record from the server, surface-keyed variants with an entity-over-def fallback, cosmetic only) and drop the rest: Doom 3's physics gibs and world-decal projection do not fit a fixed-camera Pit with at most three attackers (MAX_ATTACKERS = 3), so Frankendom gets flat gib pieces, not physics bodies.

Acceptance: In one Pit fight, two clients receive the same server hit event and show the same wound on the same joint within one frame; a server test asserts the hit event carries the joint index and joint-local point, normal and direction (no world-space point), and a body whose gib is blocked by the 200 ms window is marked not-gibbed so the next damage call can gib it.

## 1. Mechanism

- Entry: a projectile or melee hit calls the target's `AddDamageEffect` only when the target has the `bleed` spawn arg (Projectile.cpp 602-603; Weapon.cpp 3061-3065). Without it, a projectile calls `AddDefaultDamageEffect` (Projectile.cpp 605; that function not read). Melee passes the melee def's `classname` as the damage-def name (Weapon.cpp 3065).
- Server path (`idAnimatedEntity::AddDamageEffect`): (a) bail if `g_bloodEffects` is off or the model has no joints (Entity.cpp 5116); (b) look up the damage def by name; (c) map the collision id to a joint (5125-5128); (d) convert the velocity to a direction and the point, normal and direction to joint-local space (5130-5138); (e) run the local effect (5140); (f) on the server only, send one `EVENT_ADD_DAMAGE_EFFECT` with the joint, the local point, the normal and direction quantised to 24 bits, the def index and the material index (5142-5156). Clients replay step (e) from the message.
- Local effect (`AddLocalDamageEffect`), in this order:
  1. The material's surface type is looked up; `SURFTYPE_NONE` falls back to the class default, which is metal for animated entities (5186-5189; 5165-5167).
  2. Impact sound: key `snd_<surface>`, the entity's spawn args first, then the damage def (5194-5201).
  3. Splat: key `mtr_splat_<surface>`, a random prefixed variant from the entity first, then the def (5204-5208). Then `gameLocal.BloodSplat(origin, dir, 64)` (5210).
  4. Wound overlay: skipped for a player in single player (5214). Key `mtr_wound_<surface>`, same entity-then-def pick, then `ProjectOverlay(origin, dir, 20)` (5216-5222).
  5. Bleed: key `smoke_wound_<surface>`. If set, a record (joint, local origin, local normal, particle decl, start time) is pushed onto the entity's list (5227-5241).
- Per frame (`UpdateDamageEffects`): records whose time was set to 0 are freed first (5254-5263). With `g_bloodEffects` off, the function returns (5265-5267). Otherwise, for each record, the joint transform is read at the current time and `EmitSmoke` runs at the wound; if `EmitSmoke` returns false, the record's time is set to 0 and it is freed on the next update (5270-5280, 5257-5259). So a bleed lasts exactly as long as its emitter reports it running.
- Splat geometry (`gameLocal::BloodSplat`): gated again on `g_bloodEffects` (3935-3937). Size is random in [half, full) of 64, so [32, 64) (3939). A 4-vertex polygon trace model is traced from the origin 64 units along `dir` with `CONTENTS_SOLID` (3942). The decal is projected at the trace end point with depth `2 * size`, parallel (3943). `ProjectDecal` checks `g_decals` (3888-3890), rotates the decal square by a random angle unless one is given (3893), halves the size before building the winding, and calls `ProjectDecalOntoWorld` with depth x 0.5 (3916).
- Once per weapon: `idWeapon::BloodSplat` sets `hasBloodSplat` and returns early on any later call until it is reset (1655-1659).
- Gib trigger: on each damage call with health < -20 and the `gib` spawn arg, `idAFEntity_Gibbable::Gib` is called (AFEntity.cpp 1095-1096). For actors, the death call runs first, then the gib check requires health < -20, the `gib` spawn arg and the damage def's `gib` flag (Actor.cpp 2188-2195).
- Gib (`Gib`, 1152-1190): return if already gibbed (1154-1156). If `gibNonSolid`, clear contents and clip mask and put the body to rest; otherwise set corpse contents and a solid clip mask (1163-1171). If `g_bloodEffects` is on and the global gib clock has passed (1175-1176), set the clock to now + 200 ms (1177), spawn gibs (1178), play `snd_gibbed` (1181) and set `gibbed = true` (1182). If the clock has not passed, `gibbed` stays false, so a later damage call can try again. If `g_bloodEffects` is off, `gibbed = true` is set with no pieces (1184-1185). An `EV_Gibbed` event is posted 4 s later in every case (1189).
- Gib pieces (`SpawnGibs`, 1105-1145): drop the AF pieces and items tagged `gib`; then, for each piece, velocity = normalised (piece centre - body centre), plus or minus the hit direction by index parity (1138), scaled to 75 (1139). Each piece is removed after 4 s (1143).
- Actors: gibs are off in multiplayer (Actor.cpp 2124-2128). `idActor::Gib` hides the head and stops the voice channel (2133-2137).

## 2. Key functions

- `idAnimatedEntity::AddDamageEffect`: `/mnt/frankendom-donors/dhewm-dhewm3/neo/game/Entity.cpp` 5111-5158 (server send at 5142-5156).
- `idAnimatedEntity::AddLocalDamageEffect`: `/mnt/frankendom-donors/dhewm-dhewm3/neo/game/Entity.cpp` 5174-5243 (splat 5203-5211, wound 5213-5224, bleed record 5226-5242).
- `idAnimatedEntity::UpdateDamageEffects`: `/mnt/frankendom-donors/dhewm-dhewm3/neo/game/Entity.cpp` 5250-5282.
- `idGameLocal::BloodSplat` and `ProjectDecal`: `/mnt/frankendom-donors/dhewm-dhewm3/neo/game/Game_local.cpp` 3924-3944 and 3875-3917.
- `idAFEntity_Gibbable::Damage`, `Gib`, `SpawnGibs`: `/mnt/frankendom-donors/dhewm-dhewm3/neo/game/AFEntity.cpp` 1090-1098, 1152-1190, 1105-1145.
- `idActor::Gib` and the actor death/gib branch: `/mnt/frankendom-donors/dhewm-dhewm3/neo/game/Actor.cpp` 2124-2138 and 2188-2199.
- Call sites: `/mnt/frankendom-donors/dhewm-dhewm3/neo/game/Projectile.cpp` 600-606; `/mnt/frankendom-donors/dhewm-dhewm3/neo/game/Weapon.cpp` 3059-3065 and `idWeapon::BloodSplat` 1650-1659.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Surface key picks a random variant; the entity's own list overrides the def's list | None fixed (content in the def or spawn args) |
| Splat: short trace along the hit direction, decal at the trace end | Trace 64 units (Game_local.cpp 3942; caller passes 64.0f at Entity.cpp 5210); splat size random in [32, 64) before halving (3939) |
| Wound overlay at the hit point | Overlay parameter 20 (Entity.cpp 5222; meaning in ProjectOverlay not read) |
| Bleed emitter runs while the emitter reports it alive | None (a time flag; EmitSmoke body not read) |
| Gib threshold | health < -20 (AFEntity.cpp 1095; Actor.cpp 2194) |
| Global gib rate window | 200 ms (AFEntity.h 47, `GIB_DELAY`; gate at AFEntity.cpp 1176-1177) |
| Gib impulse | Speed 75 (AFEntity.cpp 1139); parity-alternated push along the hit dir (1138) |
| Gib cleanup | 4 s (AFEntity.cpp 1143 and 1189) |
| Once per body | `gibbed` flag (AFEntity.cpp 1154-1156, 1182) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (sound, splat, wound, bleed) and the gib gates (once per body, 200 ms global window, window-closed bodies stay ungibbed). It omits the joint-to-world transform (the caller supplies world origin and direction), the network event and its quantisation, the clip-model trace (a callback stands in for it), the decal winding and random rotation, `ProjectOverlay`, the emitter update, the single-player player-wound exception beyond one flag, the gib-piece physics and the multiplayer gib exclusion. The zero-length guard in `gibVelocity` is added and is not in the donor.

```ts
// Licence: GPL-3.0-or-later with id Software additional terms (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

type Vec3 = [number, number, number];

// One compact hit record per impact, sent once by the server and replayed by each client.
interface HitEvent {
  bodyId: number;
  joint: number;
  localPoint: Vec3;   // joint-local impact point
  localNormal: Vec3;  // joint-local surface normal
  localDir: Vec3;     // joint-local hit direction
  defKey: string;     // damage definition name (donor: def index remapped by the server)
  surface: string;    // surface type of the hit material, e.g. "flesh" or "metal"
}

// Presentation tables. An entity's own table wins; the damage definition is the fallback.
interface FxTable {
  sound: Record<string, string[]>;
  splat: Record<string, string[]>;
  wound: Record<string, string[]>;
  bleed: Record<string, string>;      // one bleed emitter per surface
}

interface Cvars { bloodEffects: boolean; }
interface Rng { next(): number; }     // uniform in [0, 1)

const SPLAT_BASE = 64;                // donor passes 64 as the splat size (units)
const SPLAT_TRACE = 64;               // donor traces this far along the hit dir (units)
const OVERLAY_PARAM = 20;             // donor passes 20 to ProjectOverlay; its meaning was not read

interface Decal { kind: "splat" | "wound"; material: string; at: Vec3; dir: Vec3; halfExtent?: number; depth?: number; overlayParam?: number; }
interface Bleed { bodyId: number; joint: number; localPoint: Vec3; localNormal: Vec3; emitter: string; startMs: number; alive: boolean; }
interface Output { sounds: string[]; decals: Decal[]; bleeds: Bleed[]; }

// Entity list first; the damage-definition list only when the entity list is empty.
function pickVariant(entityList: string[] | undefined, defList: string[] | undefined, rng: Rng): string | undefined {
  const list = entityList && entityList.length > 0 ? entityList : defList;
  if (!list || list.length === 0) return undefined;
  return list[Math.floor(rng.next() * list.length)];
}

// Splat size is random in [half, full) of the base size; the decal is half that size in width.
function splatSize(rng: Rng): number {
  const half = SPLAT_BASE * 0.5;
  return half + rng.next() * half;
}

// Trace endpoint: the caller supplies the world trace (the donor uses a clip-model trace along dir).
type TraceFn = (from: Vec3, dir: Vec3, length: number) => Vec3;

// Order follows the donor: sound, splat, wound, then the bleed record.
function playHit(
  ev: HitEvent,
  worldOrigin: Vec3,
  worldDir: Vec3,
  entityFx: FxTable,
  defFx: FxTable,
  cvars: Cvars,
  nowMs: number,
  rng: Rng,
  trace: TraceFn,
  isPlayerInSingleplayer: boolean,
): Output {
  const out: Output = { sounds: [], decals: [], bleeds: [] };
  if (!cvars.bloodEffects) return out;      // donor gate: g_bloodEffects

  const sound = pickVariant(entityFx.sound[ev.surface], defFx.sound[ev.surface], rng);
  if (sound) out.sounds.push(sound);

  const splat = pickVariant(entityFx.splat[ev.surface], defFx.splat[ev.surface], rng);
  if (splat) {
    const size = splatSize(rng);
    const at = trace(worldOrigin, worldDir, SPLAT_TRACE);
    out.decals.push({ kind: "splat", material: splat, at, dir: worldDir, halfExtent: size * 0.5, depth: 2 * size });
  }

  if (!isPlayerInSingleplayer) {            // donor: no wound overlay on the player in single player
    const wound = pickVariant(entityFx.wound[ev.surface], defFx.wound[ev.surface], rng);
    if (wound) out.decals.push({ kind: "wound", material: wound, at: worldOrigin, dir: worldDir, overlayParam: OVERLAY_PARAM });
  }

  const emitter = entityFx.bleed[ev.surface] ?? defFx.bleed[ev.surface];
  if (emitter) {
    out.bleeds.push({ bodyId: ev.bodyId, joint: ev.joint, localPoint: ev.localPoint, localNormal: ev.localNormal, emitter, startMs: nowMs, alive: true });
  }
  return out;
}

// Per frame: a bleed stops for good when the emitter reports it is done (donor: time set to 0, freed next update).
function updateBleed(b: Bleed, emitterStillRunning: (b: Bleed) => boolean): void {
  if (!b.alive) return;
  if (!emitterStillRunning(b)) b.alive = false;
}

interface Body { health: number; gibbed: boolean; canGib: boolean; }
interface GibClock { nextGibMs: number; }

const GIB_HEALTH = -20;               // donor: health < -20
const GIB_WINDOW_MS = 200;            // donor: GIB_DELAY, global across all bodies

// Returns true when this call gibbed the body. A body that hits the closed window is NOT marked gibbed,
// so the next damage call can gib it.
function maybeGib(body: Body, dir: Vec3, clock: GibClock, cvars: Cvars, nowMs: number, spawnPieces: (dir: Vec3) => void): boolean {
  if (body.health >= GIB_HEALTH || !body.canGib) return false;
  if (body.gibbed) return false;
  if (!cvars.bloodEffects) { body.gibbed = true; return true; }   // donor: marks gibbed with no pieces
  if (nowMs <= clock.nextGibMs) return false;
  clock.nextGibMs = nowMs + GIB_WINDOW_MS;
  spawnPieces(dir);
  body.gibbed = true;
  return true;
}

// Piece velocity: away from the body centre, nudged along or against the hit dir by index parity, then scaled.
function gibVelocity(pieceCentre: Vec3, bodyCentre: Vec3, dir: Vec3, index: number, speed: number): Vec3 {
  const d: Vec3 = [pieceCentre[0] - bodyCentre[0], pieceCentre[1] - bodyCentre[1], pieceCentre[2] - bodyCentre[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  const sign = (index & 1) ? 1 : -1;
  const n: Vec3 = len > 0 ? [d[0] / len, d[1] / len, d[2] / len] : [0, 0, 0];   // zero-length guard (not in donor)
  return [
    (n[0] + sign * dir[0]) * speed,
    (n[1] + sign * dir[1]) * speed,
    (n[2] + sign * dir[2]) * speed,
  ];
}

// Example use, so the file type-checks under --strict.
const demoRng: Rng = { next: () => 0.5 };
const demoTable: FxTable = { sound: {}, splat: { flesh: ["decals/bloodsplat_a"] }, wound: {}, bleed: {} };
const demoOut = playHit(
  { bodyId: 1, joint: 0, localPoint: [0, 0, 0], localNormal: [0, 0, 1], localDir: [0, 1, 0], defKey: "melee_sword", surface: "flesh" },
  [0, 0, 0], [0, 1, 0], demoTable, demoTable, { bloodEffects: true }, 0, demoRng,
  (from, dir, len) => [from[0] + dir[0] * len, from[1] + dir[1] * len, from[2] + dir[2] * len], false,
);
const demoBody: Body = { health: -25, gibbed: false, canGib: true };
const demoClock: GibClock = { nextGibMs: 0 };
const gibbedNow = maybeGib(demoBody, [0, 1, 0], demoClock, { bloodEffects: true }, 1000, () => undefined);
const v = gibVelocity([1, 0, 0], [0, 0, 0], [0, 1, 0], 1, 75);
void demoOut; void gibbedNow; void v;
```

## 5. Lands in

- TARGET `src/fight/hit-fx.ts` (new client presentation module; the engine owns the hit, this module owns only the look). Parity-checklist row 8 (blood/wounds/decals).
- The gib part (once per body, shared 200 ms window) is closer to row 9 (finishers), but row 8 is the one that fits this note.
- today: not read in this pass (the Frankendom repo was not opened). The rulings say kills are server-verified and the HUD, camera and sound are client-only, so the hit record and its look belong in the same split.
- Reuse tag: rewrite-from-idea (GPL-3.0 with id additional terms; clean-room only)
- Brief rule served: rule 1 (one engine, two clients: one server hit record, clients only present it); cosmetic effects stay client-only, as the donor does.

## 6. Gaps and risks

- GPL-3.0 with id additional terms: clean-room only. The sketch is written from the mechanism, not translated.
- Doom 3's gibs are physics articulated figures. Frankendom has no such bodies, so the gib impulse needs a flat piece pool with a lifetime, not the donor's physics.
- The donor decides the bleed by the emitter's own return value, and the emitter (EmitSmoke) was not read. Frankendom must not let presentation decide an outcome; the bleed is cosmetic only.
- The donor sends the hit record only when `g_bloodEffects` is on, and each client checks its own cvar in `BloodSplat` (Game_local.cpp 3935) and in `UpdateDamageEffects` (Entity.cpp 5265). A per-client off switch therefore never affects the server.
- Decal accumulation: the donor passes a time to `ProjectDecalOntoWorld` (Game_local.cpp 3916), but no decal cap or pool was read. Frankendom needs a cap as data, and that cap is not in this donor's code as read.
- The gib-skip path: a body that hits the closed 200 ms window stays ungibbed and can gib on a later damage call. Whether `EV_Gibbed` (posted 4 s later on every path, 1189) does more was not read.
- The screen blood spray (`AddBloodSpray`, PlayerView.cpp 313-349) is inside a comment in this donor, so it is not a working example of a screen overlay.
- The player-wound exception (Entity.cpp 5214) is a single-player choice. Frankendom's gladiator may need the wound on the model in every mode.
- Confidence: the hit-to-effect order and the gib gates are read directly. The per-frame bleed behaviour depends on EmitSmoke, which was not read.
