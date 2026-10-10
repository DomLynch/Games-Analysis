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
