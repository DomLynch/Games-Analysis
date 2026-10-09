# Anuken-Mindustry (spawns-encounters, cell 4)

Donor: /mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/game/SpawnGroup.java | Licence: GPL-3 | Java | symbol getSpawned / createUnit (opened: getSpawned 67-73, getShield 76-78, createUnit 81-104; caller WaveSpawner.spawnEnemies 62-109 in /mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/ai/WaveSpawner.java)

## 1. Mechanism

- A wave plan is a list of `SpawnGroup` data records. Each record: unit type; first and last wave (`begin`, `end`); `spacing` in waves; a hard `max` cap; `unitAmount` at the start; `unitScaling` (one more unit every N spawn rounds); `shields` and `shieldScaling` per wave; an optional status effect, starting items, payloads, team, and a spawn-point index.
- `getSpawned(wave)` (67-73) first rewrites a zero `spacing` to 1 (it mutates the record, line 68), then returns 0 outside `[begin, end]` or off the spacing. Otherwise it returns `unitAmount + floor(((wave - begin) / spacing) / unitScaling)`, capped at `max`. The default scaling is "never", which makes the scaling term zero.
- `getShield(wave)` (76-78) is `max(0, shields + shieldScaling * (wave - begin))`.
- `createUnit` (81-104) spawns the unit at a position, applies the effect (with a near-infinite duration), the starting items, the shield for the wave, and any payloads.
- `WaveSpawner.spawnEnemies` (62-109) first calls `eachGroundSpawn(-1, ...)` and runs `doShockwave` at every ground spawn point (116-119: an area damage of 99999999 within `dropZoneRadius` for the wave team, so anything standing on a drop zone is cleared before units appear). Then, for each group with a type, it calls `getSpawned(state.wave - 1)` and skips a zero. Only in the campaign (`state.isCampaign()`, line 77) is the count multiplied by the planet's difficulty `enemySpawnMultiplier`: a group whose effect is the boss status rounds down, any other group rounds, and the result is at least 1 (79-81). Flying types spawn at `eachFlyerSpawn` points (176-199: on the map edge in the direction of the spawn unless `airUseSpawns`, with a random spread of `margin / 1.5`); ground types spawn at `eachGroundSpawn` points with a random offset within 2 tiles (95-103). A group with a spawn index other than -1 spawns only at the point whose packed position equals that index; -1 means every point. This is the same test as `SpawnGroup.canSpawn` (62-64), but `WaveSpawner` does not call `canSpawn`: it repeats the comparison inline at lines 128, 137, 179 and 194. Ground points also include wave-team cores when `wavesSpawnAtCores` and attack mode are on (134-173, with a wall-clear search); that path is not part of the sketch. The `spawning` flag is cleared 121 ticks later (108).
- Inputs: the wave number and the group list. Outputs: spawned units with their shields and effects.
- Tick: `spawnEnemies` is per wave, not per frame. What triggers it (the wave countdown) is outside the opened code and was not read.

## 2. Key functions

- `SpawnGroup.getSpawned`: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/game/SpawnGroup.java` lines 67-73. Count for a wave from the schedule and scaling, capped.
- `SpawnGroup.getShield`: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/game/SpawnGroup.java` lines 76-78. Shield points for the wave.
- `SpawnGroup.createUnit`: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/game/SpawnGroup.java` lines 81-104. Builds the unit with its effect, items, shield and payloads.
- `WaveSpawner.spawnEnemies`: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/ai/WaveSpawner.java` lines 62-109. Per-wave loop over groups; difficulty scaling; spawn at each point.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Data-driven schedule: start, end and spacing per group | `never` = Integer.MAX_VALUE (theirs, SpawnGroup.java 23) |
| Linear count growth: one more per N rounds, capped | default `max` 40 (line 34), default `unitAmount` 1 (line 42) (theirs) |
| Per-wave shield growth, floored at zero | shield values per group (theirs) |
| Difficulty multiplier on counts; bosses round down | campaign `enemySpawnMultiplier` (theirs, WaveSpawner.java 79-81; campaign only) |
| Boss status effect as a long duration, not a flag | duration 999999 (theirs, SpawnGroup.java 85) |
| Clear the spawn point before spawning | shockwave damage 99999999 in `dropZoneRadius` (theirs, WaveSpawner.java 116-119) |
| Spawn-point filter per group | packed spawn index (theirs) |

## 4. TypeScript sketch

Licence: GPL-3. CLEAN-ROOM sketch: written from the mechanism above, not translated from the donor.

simplified: the drop-zone shockwave, the flyer / ground split and spread offsets, wave-team core spawn points, the status effect, starting items, payloads and team (`createUnit`) are omitted; the difficulty multiplier is applied always, whereas the donor applies it only in the campaign; the wave argument is passed as-is (the donor passes `state.wave - 1`).

```ts
// Licence: GPL-3 (donor). CLEAN-ROOM sketch: written from the mechanism description, not a translation of donor lines.
interface Group {
  begin: number; end: number; spacing: number;
  max: number; unitAmount: number; unitScaling: number; // scaling: Infinity = no growth
  shields: number; shieldScaling: number;
  spawn: number;   // -1 = every spawn point, otherwise only the point with this id
  isBoss: boolean; // boss status effect: counts round down under a difficulty multiplier
}

// How many units this group spawns on a wave: a schedule, linear growth, a hard cap.
function spawnedOn(g: Group, wave: number): number {
  const spacing = g.spacing === 0 ? 1 : g.spacing;
  if (wave < g.begin || wave > g.end || (wave - g.begin) % spacing !== 0) return 0;
  const rounds = Math.floor((wave - g.begin) / spacing);
  const grown = g.unitAmount + Math.floor(rounds / g.unitScaling);
  return Math.min(grown, g.max);
}

// Shield points per unit on a wave, never negative.
function shieldOn(g: Group, wave: number): number {
  return Math.max(g.shields + g.shieldScaling * (wave - g.begin), 0);
}

// Difficulty multiplier: rounding rule differs for elite units so one boss is not doubled.
function difficultyCount(base: number, mult: number, isBoss: boolean): number {
  const scaled = base * mult;
  return Math.max(1, isBoss ? Math.floor(scaled) : Math.round(scaled));
}

// Once per wave: each group contributes its count at each spawn point it is allowed on.
function planWave(groups: Group[], wave: number, points: number[], mult: number): { point: number; count: number }[] {
  const out: { point: number; count: number }[] = [];
  for (const g of groups) {
    const n = spawnedOn(g, wave);
    if (n === 0) continue;
    const count = difficultyCount(n, mult, g.isBoss);
    for (const p of points) {
      if (g.spawn !== -1 && g.spawn !== p) continue; // per-group spawn filter
      out.push({ point: p, count });
    }
  }
  return out;
}
```

## 5. Lands in

- TARGET origins/mobs/populate.ts and origins/mobs/row.ts (an optional per-row wave schedule next to the existing `respawnSeconds`, row.ts line 37); a separate `src/fight/spawn-groups.ts` (new) is not needed unless a zone uses timed waves, because populate.ts already builds camps from rows + zone Params + seed. What is new from this donor is only the schedule and count shape (`begin`/`end`/`spacing`/`unitScaling`/`max`) and the shield-per-round growth. Feature map: zones as data. Checklist row 4 (fight loop: a spawned unit's start state and aggro) and row 21 (catalogue field for a shield / scaling number, so it is not a hidden number).
- Parity-checklist row: 4.
- Reuse tag: rewrite-from-idea
- Brief rule served: 4 (zones are data on one runtime); rules 7-9 n/a

## 6. Gaps and risks

- Zones as data: the donor's schedule is data (a record per group), which fits, but Frankendom's zone spawns today are budgeted camps (`round(density.creatures * footprint / 100)` in origins/mobs/populate.ts) with per-row `respawnSeconds`, not a wave counter. The schedule shape transfers only if a zone opts into a counter; the budget must stay the zone's number.
- Server-verified kills: the donor's offsets come from the shared RNG (`Mathf.range`, `Tmp.v1.rnd`, lines 91 and 100). Frankendom must draw every count and offset from the seeded stream so the server can replay which creatures exist.
- MAX_ATTACKERS = 3: a wave of up to `max` 40 units per group says nothing about how many engage one player. A wave must spawn into the ring, with at most 3 engaged and the rest held (src/fight/world.ts).
- No hidden numbers: shield growth, `max` and `unitScaling` must be catalogue / zone fields, not literals in code.
- The cap is a hard `max`; Frankendom's copies per zone want a soft cap with a seed per copy, which this donor does not have.
- The difficulty multiplier is campaign-level only. Scaling by party size is not in these functions.
- The shockwave that kills anything on the spawn point is a Mindustry rule (the player is not on the drop zone by design). A fight engine with one player cannot copy it; the safe spawn is a zone rule (origins/world/zone-rules.ts), not damage.
