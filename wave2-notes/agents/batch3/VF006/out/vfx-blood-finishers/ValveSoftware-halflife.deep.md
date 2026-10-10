# ValveSoftware-halflife (vfx-blood-finishers, cell 1)

Donor: `/mnt/frankendom-donors/ValveSoftware-halflife/dlls/combat.cpp` (symbol `CBaseEntity::TraceBleed`, 1588-1653; caller `CBaseMonster::TraceAttack`, 1326-1361), with `dlls/util.cpp`, `dlls/weapons.cpp` and `cl_dll/ev_hldm.cpp` | Licence: Valve "Half Life 1 SDK LICENSE" (free use and free distribution only; commercial use needs Valve's permission; not an open-source licence) = restricted, clean-room | C++ | symbol `CBaseEntity::TraceBleed`

Checked: Opened and read in full: `dlls/combat.cpp` 700-780 and 798-806 (gib blood), 1279-1295 (`CBaseEntity::TraceAttack`), 1326-1361 (`CBaseMonster::TraceAttack`), 1588-1706 (`TraceBleed`, and the dead-monster `MakeDamageBloodDecal`); `dlls/util.cpp` 1121-1262 (violence gate, drips, decal message); `dlls/weapons.cpp` 142-160; `cl_dll/ev_hldm.cpp` 234-315. Grep only, not read: callers in `dlls/player.cpp:430` and `dlls/agrunt.cpp:259`; `GetSkillCvar` level selection; stomach, arm and leg multipliers; `Killed` and gib spawn. The hint file `cl_dll/ev_hldm.cpp` holds only the client-side gunshot decal on world brushes; the wall-blood mechanism the topic needs is in `dlls/combat.cpp`. Confidence: high for `TraceBleed` (read in full; four callers found by grep, two of them read). camera_scope: n/a.

## 1. Mechanism

- Each hit makes two blood effects. (a) Drips: `SpawnBlood` sends a blood-drip temp-entity to the PVS, sized from the hit damage. (b) Wall splats: `TraceBleed` fires one to four traces from the hit point along the shot direction and paints a random blood decal where a trace meets a surface.
- Order in `CBaseMonster::TraceAttack` (1326-1361): (a) only if `pev->takedamage` (1328); (b) hit-group multiplier on `flDamage` (head x `monHead`, chest x `monChest`, and the others, 1332-1355); (c) `SpawnBlood(ptr->vecEndPos, BloodColor(), flDamage)` (1357); (d) `TraceBleed(flDamage, vecDir, ptr, bitsDamageType)` (1358); (e) only then `AddMultiDamage(...)` (1359). So the blood uses the hit-group-scaled damage, and the drips and splats are emitted before the damage is queued.
- `CBaseEntity::TraceAttack` (1279-1295) has the same pair without hit groups, and calls `AddMultiDamage` first (1285) and blood second (1291-1292).
- `TraceBleed` gates, in order: no blood colour, return (1590); zero damage, return (1593); damage type not in CRUSH, BULLET, SLASH, BLAST, CLUB or MORTAR, return (1596-1597). Fire-type or poison-type damage leaves no splat.
- Damage tiers (1622-1636): under 10 gives one splat with aim spread 0.1; under 25 gives two with spread 0.2; otherwise four with spread 0.3. The values are plain assignments on lines 1624-1635 (too short to receipt; cited by line).
- Splat loop (1638-1652): for each splat, copy the shot direction and reverse it (1640); add a random value in plus or minus `flNoise` on each axis (1642-1644); trace 172 units (1646). The reverse and the `* -172` cancel, so the trace runs along the shot direction. The jitter is applied before the cancel, but it is symmetric, so the spread is the same. The vector is not normalised. If the trace hits (1648), call `UTIL_BloodDecalTrace` (1650).
- `UTIL_BloodDecalTrace` (util.cpp 1210-1219): red blood picks `DECAL_BLOOD1` + random 0-5 (six variants); other colours pick `DECAL_YBLOOD1` + random 0-5. Both are gated by `UTIL_ShouldShowBlood` (1121-1137), which reads the cvars `violence_hblood` and `violence_ablood`.
- `UTIL_DecalTrace` (1222-1262) skips the decal when the hit entity is not a BSP model (1243-1244). It then sends `TE_DECAL` or `TE_WORLDDECAL` to clients (1250-1261).
- Drips (`UTIL_BloodDrips`, 1166-1196): gated by the violence cvar; amount doubled in multiplayer (1177-1181); capped at 255 (1183-1184); sprite size is `min(max(3, amount/10), 16)` (1194). Sent as `TE_BLOODSPRITE` to `MSG_PVS` (1186).
- Gibs (`CGib`): on each bounce in the air, one blood decal may be placed under the gib while `m_cBloodDecals > 0` (729-737). The budget is 5 per gib (804). Sticky gibs (`CGib::StickyGibTouch`, 754-777, read) place one decal on the wall (770) and then stop moving.
- Dead monsters: `MakeDamageBloodDecal` (1657-1706) uses `pev->max_health` as a decal budget for corpses (1664-1676). It is live code, but it has no caller in this tree (grep found only the declaration in `dlls/basemonster.h:287` and empty client stubs). `TraceBleed` has the same budget block commented out (1606-1620). So the donor does not cap wall decals on corpses.
- Tick: per hit, synchronous, on the server (`dlls/` is the server game DLL). Not a per-frame loop.
- Client side only (`cl_dll/ev_hldm.cpp` 234-315): the client's own gunshot decal, on world brushes only (298). The name is `{break1-3` for breakables (241-244), `{bproof1` for non-normal render mode (246-248), else `{shot1-5` (252-253). It also calls `R_BulletImpactParticles` (263) and plays a ricochet sound on about half of shots (266-276). It does not spawn blood.

## 2. Key functions

- `CBaseEntity::TraceBleed`: `/mnt/frankendom-donors/ValveSoftware-halflife/dlls/combat.cpp` 1588-1653 (gates 1590-1597; tiers 1622-1636; splat loop 1638-1652).
- `CBaseMonster::TraceAttack`: `/mnt/frankendom-donors/ValveSoftware-halflife/dlls/combat.cpp` 1326-1361 (hit-group scaling, then `SpawnBlood`, then `TraceBleed`, then `AddMultiDamage`).
- `SpawnBlood`: `/mnt/frankendom-donors/ValveSoftware-halflife/dlls/weapons.cpp` 147-150 (calls `UTIL_BloodDrips` with the damage as the amount).
- `UTIL_BloodDrips`, `UTIL_BloodDecalTrace`, `UTIL_DecalTrace`: `/mnt/frankendom-donors/ValveSoftware-halflife/dlls/util.cpp` 1166-1196, 1210-1219, 1222-1262.
- Client `EV_HLDM_DamageDecal` and `EV_HLDM_DecalGunshot`: `/mnt/frankendom-donors/ValveSoftware-halflife/cl_dll/ev_hldm.cpp` 236-256 and 292-314.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Damage tier sets splat count and aim spread | Under 10: 1 splat, spread 0.1. Under 25: 2 splats, spread 0.2. Otherwise: 4 splats, spread 0.3 (theirs, combat.cpp 1622-1636; the value lines are under 15 characters, so the receipts are the tier-threshold lines 1622 and 1627) |
| Trace length along the blow | 172 units (theirs, combat.cpp 1646; the same length appears in the dead `MakeDamageBloodDecal` at 1686) |
| Damage-type filter for splats | CRUSH, BULLET, SLASH, BLAST, CLUB, MORTAR (theirs, combat.cpp 1596-1597) |
| Hit-group scaling runs before blood | Head x `monHead`, chest x `monChest` (theirs, combat.cpp 1337, 1340). Level-1 defaults: head 2 (game.cpp 411), chest 1 (game.cpp 415). Other groups and level selection (not read) |
| Drip sprite size | Clamp of amount/10 to 3..16 (theirs, util.cpp 1194); amount x2 in multiplayer (util.cpp 1180, line only); cap 255 (util.cpp 1184) |
| Gib splat budget | 5 per gib, one per bounce (theirs, combat.cpp 804, 736) |
| Violence gate | Cvar per colour (theirs, util.cpp 1127); default not read |

Worked case from the donor order, if `gSkillData.monHead` is the level-1 cvar (the selection in `GetSkillCvar` was not read): a 10-damage head hit becomes 20 after `monHead` (x2), so it gets two splats (spread 0.2), not one. The tier reads the scaled damage.

## 4. TypeScript sketch

simplified: The sketch keeps the colour and zero-damage returns, the damage-type filter, the three tiers, the per-axis jitter and the trace along the shot direction; the trace length and visibility are parameters. It omits: the German-language switches (util.cpp 1149, 1174); the drip message and sprite size; the decal texture choice (DECAL_BLOOD1-6); the cvar gate (replaced by the `visible` argument); the hit-group scaling (the donor does it in the caller, so the sketch expects the scaled damage); the `AddMultiDamage` order; the gib budget; and the dead-monster budget (commented out in the donor). It does not reorder the donor's steps: the colour and zero-damage checks come first, then the type filter, then the trace. The shot direction is not normalised, as in the donor.

```ts
// Licence: Valve Half-Life 1 SDK licence (donor, restricted). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Vec3 { x: number; y: number; z: number }

// Damage tier -> wall splat count and aim jitter (donor tiers: flDamage < 10, < 25, else).
export interface SplatTier { count: number; spread: number }
export function splatTier(damage: number): SplatTier {
  if (damage < 10) return { count: 1, spread: 0.1 };
  if (damage < 25) return { count: 2, spread: 0.2 };
  return { count: 4, spread: 0.3 };
}

// Only these damage kinds leave a wall splat; fire, poison and similar do not.
const SPLAT_KINDS = new Set(["crush", "bullet", "slash", "blast", "club", "mortar"]);

export interface Hit { point: Vec3; dir: Vec3; damage: number; kind: string; color: "red" | "yellow" | "none" }

// Engine raycast supplied by the caller: returns the first wall point, or null for no hit.
export type Ray = (from: Vec3, to: Vec3) => Vec3 | null;

// One call per hit: returns the wall points that received a splat.
export function wallSplats(hit: Hit, rng: () => number, ray: Ray, length: number, visible: boolean): Vec3[] {
  if (!visible || hit.color === "none") return [];
  if (hit.damage === 0 || !SPLAT_KINDS.has(hit.kind)) return [];
  const { count, spread } = splatTier(hit.damage);
  const out: Vec3[] = [];
  for (let i = 0; i < count; i++) {
    // Jitter each axis of the shot direction, then trace along it (not normalised, as in the donor).
    const j = (v: number): number => v + (rng() * 2 - 1) * spread;
    const d = { x: j(hit.dir.x), y: j(hit.dir.y), z: j(hit.dir.z) };
    const to = { x: hit.point.x + d.x * length, y: hit.point.y + d.y * length, z: hit.point.z + d.z * length };
    const p = ray(hit.point, to);
    if (p) out.push(p);
  }
  return out;
}
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (copy at /tmp/halflife-wall-splat.ts), exit 0.

## 5. Lands in

- TARGET `src/fight/wounds.ts` (new client-only visual module). The server sends the hit record; the client places the splat from it and never writes health. Parity-checklist row 8 (blood, wounds, decals).
- today: (not read; no Frankendom repo was opened in this pass).
- Reuse tag: rewrite-from-idea (Valve Half-Life 1 SDK licence, restricted; clean-room, shape only)
- Brief rule served: 8 (blood, wounds, decals; client-only); rule 1 (one engine: the splat is a visual derived from the server-verified hit).
Best transferable idea: a hit's gore amount comes from a small damage table (1 splat under 10, 2 under 25, 4 above) behind a damage-type filter, so gore is data that never touches the ledger.
Decision (proposed): adapt - keep the tiers and the type filter as data, but do not copy the donor's uncapped per-hit traces or its corpse budget (commented out in the donor).
Acceptance: A test asserts splatTier(9) gives 1 splat, 10 and 24 give 2, and 25 gives 4; a fire-type or zero-damage hit gives none; and a three-attacker exchange on the Pit never spawns more wall splats than the pool cap (cap is a data field).

## 6. Gaps and risks

- One ledger: the donor queues the damage (`AddMultiDamage`, 1359) after it has emitted the blood (1357-1358). Frankendom's splat must read the hit record and must never change health; the damage order is decided by the ledger, not the splat.
- Scaling order: the donor scales by hit group before the tier (1332-1357), so a 10-damage head hit gets two splats. Frankendom should pick one damage number for both the ledger and the splat, and test it.
- No global cap: each hit makes 1-4 traces with no cap on live decals. With MAX_ATTACKERS = 3, one exchange of three hits can queue up to 12 traces. A phone needs a pool cap; that cap is not in the donor (new).
- Where the trace runs: the donor traces on the server and sends the decal to clients (util.cpp 1250-1261). Frankendom's Pit is a client. Either the server sends the hit point, or the client traces. Pick one. A server trace per hit adds cost to the server tick budget (row 18).
- Violence cvars (util.cpp 1127): the donor gates gore by server cvars. Frankendom should expose a client setting, not a server rule.
- German switch (util.cpp 1149, 1174): a regional hack; do not port.
- Corpse decal budget (1664-1676): a `max_health` counter reused as a budget, and dead code in this tree. Do not port the hack; if corpse decals are wanted, use an explicit field.
- Not read: `Killed` and gib spawn beyond the budget lines; `GetSkillCvar` level choice; the stomach, arm and leg multipliers; the bodies of the callers `dlls/player.cpp:430` and `dlls/agrunt.cpp:259` (grep lines only).
