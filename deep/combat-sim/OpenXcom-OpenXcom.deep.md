# OpenXcom-OpenXcom (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Battlescape/TileEngine.cpp` | Licence: GPL-3 | C++ | symbol `TileEngine::hit / explode`

Checked: `TileEngine::hit` is 1106-1197 and `TileEngine::explode` 1211-1483 (verified; both read in full). `blockage`, `verticalBlockage`, `horizontalBlockage` and `detonate` (1491-) were not re-read in this pass.

## 1. Mechanism

- Two entry points on the battle map (a voxel grid, 16 x 16 x 24 voxels per tile). `hit` (1106-1197) is a single-target strike at a voxel: input is the centre voxel, a power, a damage type and the attacker. It finds the body part hit (floor, object or unit) and applies damage to that part only.
- Part hit: a random power in 25 % to 75 % of the input power damages a tile part (floor or object). A unit hit uses a random power inside a symmetric band of the input power (`power x (100 -/+ range) / 100`; the range is a mod constant, separate for HE and other types, 1134-1137). A unit that is out or fully stunned is skipped (1153). The position of the hit relative to the unit's centre sets the body part; the unit's own `damage()` returns the amount it took. A unit standing on stairs just below the tile can be hit instead (1139-1152). `hit` ends by letting things fall and recomputing sunlight, terrain lighting and field of view (1192-1195).
- `hit` side effects on a unit (1160-1189): a kill credit goes to the attacker's faction if the target is not a player unit and gained fatal wounds; morale loss = `100 x (damage x ((110 - bravery) / 10) / 10) / modifier`, where the modifier is the mission morale modifier for player units and 100 otherwise; a death-explodes special queues an explosion if the unit just went out and the damage type is not stun, HE, incendiary or melee; firing experience is added to a player attacker that hits an originally hostile unit with a non-melee action.
- `explode` (1211-1483) is an area blast. Incendiary power is halved first (1222-1225). Input: centre voxel, power, type, max radius, attacker. It fans rays over an elevation band (-90 to +90 in steps of 5) and an azimuth (0 to 360 in steps of 3). Each ray steps one tile per unit length (1410-1417), from the centre of the origin tile.
- Power falls along the ray: 10 per tile, a fixed extra cost per level crossed (set by the vertical-explosion option), and twice the blockage of the tile edge crossed (vertical then horizontal). The ray stops when power is spent, the radius is exceeded or the map ends (1269, 1419). Each tile reached for the first time (a set of affected tiles, 1279-1280) is processed once: by damage type, stun, HE (50 to 150 % band, ground-zero or above-explosion hits at the unit's centre, other hits directional, small items below the power destroyed), smoke, or incendiary (sets fire and burns units). HE only marks the tile with explosive power during the fan; terrain destruction is applied afterwards by `detonate` on every affected tile (1465-1478). A unit in a newly reached tile takes damage once per explosion, and the attacker gets firing experience and kill credit (1397-1405).
- Output: damage to units and tile parts, per-type effects (stun, fire, smoke, incendiary), and a re-check of floors, sunlight and fov. Tick: one call per explosion event; the whole fan runs in that call (synchronous).

## 2. Key functions

- `TileEngine::hit`: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Battlescape/TileEngine.cpp` 1106-1197. Single-target strike, part pick, unit damage, morale, kill credit.
- `TileEngine::explode`: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Battlescape/TileEngine.cpp` 1211-1483 (read in full; the ray fan spans 1254-1462, the per-type damage 1299-1395, the HE detonation pass 1465-1478). Radial fan, power decay, blockage, once-per-tile hit set.
- `TileEngine::explode`, ray power decay (block inside it): `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Battlescape/TileEngine.cpp` 1421-1458. Per-tile cost 10, level cost, fire diagonal extra, blockage x2, big-wall deflection for diagonal walls.
- `TileEngine::blockage` (not re-read in this pass): `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Battlescape/TileEngine.cpp` 1860-1989. Per-tile, per-part, per-direction blockage value; big-wall edges exempt by direction, floor armour counted, open UFO doors zero, smoke blocked by any closed part.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Area fan: sample rays on a sphere, one hit per cell, power decays with distance | Elevation step 5 degrees, azimuth step 3 degrees (theirs, 1254, 1257) |
| Power falls per cell by a fixed cost plus a cost per blocking edge | 10 per tile (theirs, 1422); blockage x 2 (theirs, 1435-1436, 1455-1456); extra 5 for fire on a diagonal step (1430) |
| Damage band: power plus or minus a percentage | Band from mod constants `DAMAGE_RANGE` and `EXPLOSIVE_DAMAGE_RANGE` (theirs) |
| Part hit: random 25 % to 75 % of power on terrain | 25 % to 75 % (theirs, 1121) |
| Morale loss = damage x bravery factor / modifier | Bravery factor (110 - bravery) / 10 (theirs, 1167) |
| Vertical cost by option level 0 to 3 | 1000 (flat), 30, 10, 5 (theirs, a player option, 1227-1241) |

## 4. TypeScript sketch

simplified: the fan treats every cell the same (no per-type damage, no blockage cost, no big-wall deflection, no vertical cost, no deferred HE detonation); power drops by a flat 10 per step; the sketch starts from the cell grid corner rather than the tile centre and uses a different (fraction) damage band than the donor's percent integers.

```ts
// Licence: GPL-3 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Cell = { x: number; y: number; z: number; blockEdge: (dir: number) => number; unit?: { hp: number } };

// Power that reaches a cell after walking a ray of length `steps` through the grid.
function rayPower(power: number, steps: number, costPerCell: number, blockEdgesCrossed: number, blockCost: number): number {
  return power - steps * costPerCell - blockEdgesCrossed * blockCost;
}

// Damage band around a nominal power: a random value in [p*(1-r), p*(1+r)].
function bandRoll(power: number, rangeFraction: number, rand: () => number): number {
  const lo = power * (1 - rangeFraction);
  const hi = power * (1 + rangeFraction);
  return lo + rand() * (hi - lo);
}

// Fan rays over a sphere; visit each cell once while power remains.
function explodeFan(
  cx: number, cy: number, cz: number, power: number,
  elevStepDeg: number, azStepDeg: number, maxRadius: number,
  cellAt: (x: number, y: number, z: number) => Cell | undefined,
  hitCell: (c: Cell, power: number) => void,
): void {
  const seen = new Set<string>();
  for (let el = -90; el <= 90; el += elevStepDeg) {
    for (let az = 0; az <= 360; az += azStepDeg) {
      const ce = Math.cos((el * Math.PI) / 180), se = Math.sin((el * Math.PI) / 180);
      const ca = Math.cos((az * Math.PI) / 180), sa = Math.sin((az * Math.PI) / 180);
      let p = power;
      for (let l = 0; l <= maxRadius && p > 0; l += 1) {
        const x = Math.floor(cx + l * sa * ce), y = Math.floor(cy + l * ca * ce), z = Math.floor(cz + l * se);
        const c = cellAt(x, y, z);
        if (!c) break;
        const key = `${x},${y},${z}`;
        if (!seen.has(key)) { seen.add(key); hitCell(c, p); }
        p -= 10;
      }
    }
  }
}
```

## 5. Lands in

- TARGET `src/fight/area.ts` (new module, under the fight engine): area damage on the grid; a rule for the engine, not a client effect. Parity-checklist row 1 (duel step / sim), with row 13 (specials) as the consumer if a special hits more than one target, always under MAX_ATTACKERS = 3.
- today: `src/combat.ts` (moving to `src/fight/combat.ts`) holds the flat combat helpers; no area damage exists.
- Reuse tag: rewrite-from-idea
- Brief rule served: 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- GPL-3: clean-room only.
- The donor is a voxel grid with per-part tile damage. Frankendom's fight is a duel without a voxel map, so the tile and part model does not transfer. Only the power-falloff and once-per-cell rules do.
- The donor's ray fan runs synchronously in one call. On a Frankendom server that is a cost to bound (cap the number of rays and cells).
- Morale and bravery are donor-specific systems. Frankendom has no morale stat in the fight engine; do not add one from this file.
- Friendly-fire and self-hit rules are mixed into `hit` and `explode` by faction. Frankendom must decide its own rule; the donor is not a reference for it.
- `blockage`, `verticalBlockage`, `horizontalBlockage` and `detonate` bodies were not re-read in this pass, so the claims about them rest on their call sites only.
- The donor mixes friendly and self damage into the same loop (the faction check only gates experience and kill credit). Frankendom's one ledger needs an explicit self and ally rule.
