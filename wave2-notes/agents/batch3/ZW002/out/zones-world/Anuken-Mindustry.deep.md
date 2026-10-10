# Anuken-Mindustry (zones-world, cell 1)

Donor: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/ai/WaveSpawner.java` (with `core/src/mindustry/game/SpawnGroup.java` and `core/src/mindustry/core/Logic.java`) | Licence: GPL-3.0 (repo `LICENSE`: "GNU GENERAL PUBLIC LICENSE / Version 3, 29 June 2007") | Java | symbols `WaveSpawner.spawnEnemies`, `SpawnGroup.getSpawned`, `Logic.runWave`, `Logic.update` (wave timer)

Checked: Read in full: `SpawnGroup.java` (1-196) and `WaveSpawner.java` (1-249). Read in part: `Logic.java` 310-325, 503 (update start), 585-605, 620-626; `Difficulty.java` 1-25; `Rules.java` 148-155; `Maps.java` 365-385; `Waves.java` 258-340 (start of `generate` only); `Vars.java` tilesize (grep line). Callers checked: `spawnEnemies` has one caller (`Logic.java` 320). `getSpawned` is also called from `SoundControl` 59, `HudFragment` 247, `LExecutor` 2189 and two editor dialogs (grep line only, not read). `playerNear` is called only from `HudFragment` 665 (HUD alpha, grep line only). Not read: `Damage.damage` (its team and inclusion filter), `Vector2.rnd`, arc `Time.toMinutes`, the duration unit of `Unit.apply`, `Waves.generate` past line 340, and any despawn or respawn-on-empty code (none found on this path). The hint file `Maps.java` holds only wave read and write (365-385); the mechanism is in `WaveSpawner.java`. Confidence: high for the spawn path and the timer; medium on the drop-zone kill, because the shockwave's target filter was not read. camera_scope: n/a (not a camera cell).

## 1. Mechanism

- Data. A map's spawn table is a list of `SpawnGroup` records in `state.rules.spawns`. Maps store it as JSON (`Maps.readWaves`, line 381). Sector maps generate it from a per-sector seed (`SerpuloPlanetGenerator.java` 741). Each group has: unit type, first and last wave index, a spacing, a base count, a scaling rate, a cap, shields with a per-wave increase, and optionally one spawn point id (`SpawnGroup.java` 23-44).
- Timer. `Logic.update()` (503) subtracts `Time.delta` from `state.wavetime` each update (595), unless `isWaitingWave()` (625) is true: `waitEnemies`, or the win wave is reached, while enemies are alive. On the server only (599), when `wavetime <= 0` and `rules.waves` is on, it calls `runWave()`. The timer is variable-step (Time.delta), not a fixed tick.
- `runWave()` (319-322), in this order: (a) `spawner.spawnEnemies()` runs first, while `state.wave` still holds the old value; (b) `state.wave++`; (c) `wavetime` is reset to `waveSpacing` times the campaign difficulty's `waveTimeMultiplier`.
- `spawnEnemies()` (62-109), in this order: (a) `spawning = true` (63). (b) For each map spawn tile, `doShockwave` runs (67; the tile call passes `true` at line 130, core spawns pass `false`). `doShockwave` creates an effect over `dropZoneRadius` and calls `Damage.damage` with the wave team over that radius (116-119). (c) For each group: `spawned = getSpawned(state.wave - 1)` (74); skip if 0. (d) Campaign only: boss groups round down, other groups round to nearest, with a minimum of 1 (79-81). (e) Flyers (`type.flying`): one unit per flyer point, placed at the point with `Mathf.range(margin / 1.5f)` jitter, where `margin = 0f` (23), so the jitter is 0 (176-199, 89-93). (f) Ground units: each unit goes to the spawn point plus `Tmp.v1.rnd(spread)`, with `spread = tilesize * 2` (95-103). (g) Flyer positions are on the map edge: unless `rules.airUseSpawns` (181), the point is projected from the map centre through the spawn tile, scaled to `max(width, height) * sqrt2 * tilesize`, and clamped to the map bounds plus margin (182-185). (h) In attack mode with `wavesSpawnAtCores`, the wave team's cores are also spawn points (134-173 ground, 192-197 flyers). A core spawn starts on the line from this wave core toward the first player core, at `coreMargin` plus half the core's diagonal (144-145), and is lengthened by `tilesize * 1.1` per step until no solid tile lies within 3 tiles, at most 30 steps (146-169). (i) `spawning` is cleared 121 ticks later (108).
- Count formula, `getSpawned(wave)` (SpawnGroup 69-72). It returns 0 if `wave < begin`, `wave > end`, or `(wave - begin) % spacing != 0`. Otherwise it returns `min(unitAmount + (int)(((wave - begin) / spacing) / unitScaling), max)`. In Java, `(wave - begin) / spacing` is integer division, then the float division by `unitScaling`, then a cast to int, so the extra count is floor(steps / unitScaling) where steps is the integer division result.
- Shield, `getShield(wave)` (77): `max(shields + shieldScaling * (wave - begin), 0)`. `createUnit` assigns it (92).
- Spawn point filter, `canSpawn` (62-63): `spawn == -1` means any point; otherwise only the point with that id.
- Drop zone. The only radius check on a player is `playerNear()` (58-59), which feeds the HUD alpha (`HudFragment` 665). It does not gate spawning. The real drop zone is the shockwave in (b): `dropZoneRadius` defaults to 300 world units (`Rules.java` 151); with `tilesize = 8` (`Vars.java` 135) that is 37.5 tiles.
- Tick. `spawnEnemies` is not a per-frame loop. It runs once per wave from the timer above.

## 2. Key functions

- `SpawnGroup.getSpawned(int wave)`: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/game/SpawnGroup.java` 68-74. The count formula and the wave gates.
- `SpawnGroup.getShield(int wave)`: same file, 76-78.
- `SpawnGroup.createUnit(...)`: same file, from 81 up to the next overload at 107 (read; it applies the effect, items, shield at `getShield(wave)` on line 92, and payloads).
- `WaveSpawner.spawnEnemies()`: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/ai/WaveSpawner.java` 62-109. Shockwave pass, group loop, campaign multiplier, flyer and ground placement.
- `WaveSpawner.doShockwave(x, y)`: same file, 116-119.
- `WaveSpawner.eachGroundSpawn(filterPos, cons)`: same file, 125-174. Map spawn tiles, then core spawns with the step-out search (134-173).
- `WaveSpawner.eachFlyerSpawn(filterPos, cons)`: same file, 176-199. Map-edge projection (181-189) and core spawns (192-197).
- `Logic.runWave()`: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/core/Logic.java` 319-323. Spawn first, then the counter, then the timer reset.
- `Logic.update()` wave timer: same file, 594-601 (inside `update`, which starts at 503).
- `Logic.isWaitingWave()`: same file, 624-626.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Count per spawn point = base + steps / scaling, capped at max; gated by begin, end and spacing | Base `unitAmount = 1` (SpawnGroup 42); `max = 40` (34); `unitScaling = never` (36, `never = Integer.MAX_VALUE` at 23); `end = never` (28); `spacing = 1` (32); `begin = 0` (30, default of the int field) |
| Per-point filter (spawn id, -1 = any) | `spawn = -1` (44) |
| Shields: start + per-wave increase from `begin`, floored at 0 | `shields = 0` (38); `shieldScaling = 0` (40) |
| Difficulty scales the count, minimum 1, boss rounds down | `enemySpawnMultiplier` casual 0.5, easy 0.75, normal 1, hard 1.5, eradication 2 (`Difficulty.java` 6-10, field order at 17) |
| Difficulty scales the wave timer | `waveTimeMultiplier` casual 2, easy 1.5, normal 1, hard 0.8, eradication 0.6 (same lines) |
| Wave timer, variable step | `waveSpacing = 2 * Time.toMinutes` (`Rules.java` 153; `Time.toMinutes` not read) |
| Ground spread around a point | 2 tiles = 16 world units (`tilesize * 2`, 95) |
| Drop zone radius (kill ring on spawn) | `dropZoneRadius = 300` world units (`Rules.java` 151) |
| Flyer jitter | `margin = 0f` (23) |
| Post-spawn spawning window | 121 ticks (108) |
| Post-spawn statuses | `unmoving` 30 and `invincible` 60 (`WaveSpawner.java` 230-231; duration unit not read) |
| Generated per-sector tables (example values) | scaling tiers `{1, 2, 3, 4, 5}` (`Waves.java` 302); first-tier amount `1`, later `6 / scaling` (319); unit scaling by tier (323); wave cap `150` (299) |

## 4. TypeScript sketch

simplified: the sketch keeps the count formula, the spawn-point filter, the per-point ground spread, the campaign-style multiplier with minimum 1, the shield formula and the wave timer order (spawn with the old counter, then advance). It omits: the boss round-down; flyers and the map-edge projection; core spawns and their step-out search; the shockwave kill and the drop-zone rule (it keeps only the distance test `inDropZone`, which is not used by the spawn path); team, effect, items and payloads; the `spawning` flag window; the server-only check; and the tie-breaking of Java's `Mathf.round` versus JS `Math.round`. Two differences from the donor are deliberate: the spread uses a uniform disk (donor: `Vector2.rnd`, not read), and a `unitScaling` of 0 gives no extra units (the donor's integer cast would likely overflow there, see section 6; inferred, not run).

```ts
// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface SpawnGroup {
  unitType: string;
  begin: number;         // first wave index the group can appear in (default 0)
  end: number;           // last wave index (default Infinity = never)
  spacing: number;       // appear every Nth wave (default 1)
  unitAmount: number;    // base count per spawn point (default 1)
  unitScaling: number;   // waves per +1 unit (default Infinity = never)
  max: number;           // cap per spawn point per wave (default 40)
  shields: number;       // shield points at the first wave
  shieldScaling: number; // shield points added per wave
  spawnPoint: number;    // -1 = any spawn point, otherwise only this point id
}

export interface SpawnPoint { id: number; x: number; y: number; }
export interface Spawn { unitType: string; x: number; y: number; shield: number; }

// units this group adds at ONE spawn point for one wave index (0 when off-cycle)
export function groupCount(g: SpawnGroup, wave: number): number {
  const spacing = g.spacing === 0 ? 1 : g.spacing;
  if (wave < g.begin || wave > g.end || (wave - g.begin) % spacing !== 0) return 0;
  const steps = Math.floor((wave - g.begin) / spacing);
  const extra = g.unitScaling > 0 ? Math.floor(steps / g.unitScaling) : 0;
  return Math.min(g.unitAmount + extra, g.max);
}

export function shieldAt(g: SpawnGroup, wave: number): number {
  return Math.max(g.shields + g.shieldScaling * (wave - g.begin), 0);
}

const SPREAD = 16; // 2 tiles of 8 world units each

// one wave: every group that counts this wave, at every spawn point it is allowed on
export function planWave(groups: SpawnGroup[], points: SpawnPoint[], wave: number, multiplier: number, rand: () => number): Spawn[] {
  const out: Spawn[] = [];
  for (const g of groups) {
    const base = groupCount(g, wave);
    if (base === 0) continue;
    const perPoint = Math.max(1, Math.round(base * multiplier)); // difficulty scales the count, never below 1
    for (const p of points) {
      if (g.spawnPoint !== -1 && g.spawnPoint !== p.id) continue;
      for (let i = 0; i < perPoint; i++) {
        const a = rand() * 2 * Math.PI;
        const r = rand() * SPREAD;
        out.push({ unitType: g.unitType, x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r, shield: shieldAt(g, wave) });
      }
    }
  }
  return out;
}

// true if a player at (px, py) is inside any spawn point's drop zone
export function inDropZone(px: number, py: number, points: SpawnPoint[], radius: number): boolean {
  return points.some(p => Math.hypot(p.x - px, p.y - py) < radius);
}

export interface WaveTimer { wave: number; wavetime: number; waiting: boolean; }

// once per server update, dt in ticks (variable step). Spawns with the counter as it was, then advances it.
export function tickWave(t: WaveTimer, dt: number, spacing: number, spawn: (waveIndex: number) => void): void {
  if (!t.waiting) t.wavetime = Math.max(t.wavetime - dt, 0);
  if (t.wavetime <= 0) {
    spawn(t.wave - 1);
    t.wave++;
    t.wavetime = spacing;
  }
}
```

The sketch typechecks: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/ZW002-mindustry-spawn-table.ts`, with `export {}` appended).

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population: the spawn table per zone, the count formula, the per-point filter, the server wave or population timer). Parity-checklist row 23 (zone population). The timer's server-side placement falls under the server tick sub-line (row 18 / post-K item 3: "server tick: fixed step, input intake, per-tick NPC budget"). This donor's timer is variable-step (Time.delta), so it would need to be turned into the fixed step.
- today: no matching module read in this donor pass (Frankendom's own zone spawn code was not read here).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: zones as data (the table lives in the zone file, not in the engine); server-verified (the server runs the timer and places the spawns)
- Best transferable idea: a zone's spawn table as a list of records with begin, end, spacing, base count, capped scaling and an optional spawn-point filter, with the count computed by one pure function per wave.
- Decision (proposed): adapt — keep the table shape and the count formula as zone data in origins/server/world-spawns.ts; reject the global wave timer and the shockwave kill (a kill must go through the server ledger, not a spawn side effect); add the row 23 population rules (respawn, despawn on empty with grace timer) ourselves, since this donor has none.
- Acceptance: a server test on one zone with a group {unitAmount: 2, unitScaling: 3, max: 6, spawnPoint: -1} and two spawn points asserts 2 units per point on cycles 0-2, 3 per point on cycle 3, and never more than 6 per point; a player sees the same counts at each spawn point in the zone.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism, and the donor's names (`SpawnGroup`, `getSpawned`) are not carried into code.
- No population-driven spawning. Every spawn here is on a timer or a wave index. There is no respawn when a zone empties and no despawn with a grace timer, so row 23's grace and respawn rules are absent in this donor. Frankendom must write them, and this note gives no evidence for them.
- The drop-zone shockwave kills (Damage.damage with the wave team over the radius; the team and inclusion filter was not read). In Frankendom every kill is server-verified and goes through one ledger, so a spawn-side effect that deletes players is rejected. A protected spawn ring (no spawn within R of a player) is a different rule and is not from this donor.
- Global counter vs per-zone state. `state.wave` is one counter for the whole map. Frankendom zones are data on one runtime, so each zone needs its own cycle counter and timer.
- Determinism. The donor uses unseeded random for spawn offsets (`Tmp.v1.rnd`, `Mathf.range`; not read to confirm the source). Frankendom's fight record (row 19) needs seeded randomness on the server so a replay reproduces the same spawns.
- MAX_ATTACKERS = 3 is an engagement cap, not a spawn cap. The donor's `max` is per group per point, so a zone can hold more units than can attack at once. The sketch does not enforce 3; that is the fight engine's job, not the spawn table's.
- Possible donor overflow (inferred from Java integer-cast semantics, not run): with `unitScaling` 0, `(int)(steps / 0f)` becomes `Integer.MAX_VALUE`, and `unitAmount + MAX_VALUE` may wrap negative. If so, a zero scaling value would stop spawns after the first step. Frankendom's zone validation should reject `unitScaling <= 0` rather than rely on this.
- Campaign multipliers apply to the count and the timer. In Frankendom these would be per-zone data fields, not a global difficulty switch.
- The `Damage.damage` filter, `Vector2.rnd` and the duration units of `Unit.apply` were not read. Any claim about them here is an assumption to be checked before the port.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: zones as data; server-verified spawns; one ledger (kills not from spawns)
