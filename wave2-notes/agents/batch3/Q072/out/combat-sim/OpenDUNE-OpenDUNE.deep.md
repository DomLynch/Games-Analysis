# OpenDUNE-OpenDUNE (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/OpenDUNE-OpenDUNE/src/map.c` (Map_MakeExplosion 403-500), `/mnt/frankendom-donors/OpenDUNE-OpenDUNE/src/unit.c` (Unit_Damage 1530-1582; bullet arrival 1419-1460; Unit_CreateBullet 1954-2025), `/mnt/frankendom-donors/OpenDUNE-OpenDUNE/src/tile.c` (Tile_GetDistance 39-46) | Licence: GPL-2.0 (COPYING: GNU GPL version 2, June 1991; the source files read carry no licence header) | C | symbol `Map_MakeExplosion`

Checked: Read `Map_MakeExplosion` 403-500 in full except the team branch (about 437-466, read in part). Read `Unit_Damage` 1530-1604 to its end. Read bullet arrival 1419-1460. Read `Tile_GetDistance` and `Tile_UnpackTile`. Read `Unit_CreateBullet` only at the hit-point lines (1982, 2021, 2023). Callers of `Map_MakeExplosion`: 14 call sites found by grep; read only unit.c 1412 and 1444 (bullet impact) and script/unit.c 539 (Script_Unit_ExplosionSingle). Callers of `Unit_Damage`: read only unit.c 1371, 1459 and map.c 431. The fire decision that creates a bullet (script/unit.c around 600-670) was read only at 623 and 655-672. Confidence: high on the splash falloff and `Unit_Damage`; medium on the full firing-to-impact path. The donor is GPL-2.0: clean-room, shape only.

## 1. Mechanism

- A projectile is a unit. At launch it carries its damage as its hit points (`bullet->o.hitpoints = damage;`, unit.c 1982). Its damage comes from the shooter's table value (`damage = ui->damage;`, script/unit.c 623); a missile trooper fires with a quarter less (`damage -= damage / 4;`, script/unit.c 659).
- Flight and arrival: each step the bullet is checked against its destination. It counts as arrived when `ret = (unit->distanceToDestination < distance || distance < 16)` (unit.c 1419). On arrival, if its `fireDelay` is 0 (or it is a missile turret), it calls `Map_MakeExplosion` at the arrival point with its own hit points (unit.c 1444 for the normal case; the sand-burst and deviator branches were not described here), then removes itself (unit.c 1421-1423 onward).
- Splash, the order inside `Map_MakeExplosion` (map.c 403): (a) the radius is 16 steps, or 32 for the death-hand explosion type (map.c 405); (b) for every allocated unit, `distance = Tile_GetDistance(...) >> 4` (map.c 427), so 16 steps per tile; (c) units at or beyond the radius are skipped (map.c 428); (d) every other unit in range takes `hitpoints >> (distance >> 2)` through `Unit_Damage` (map.c 431), except sandworms in the swallow case and frigates; (e) the house check (map.c 434) decides whether the unit can be a retaliation target: the player's own units are skipped; (f) retaliation, for enemies of the origin only: units with no bullet type are skipped (map.c 470); a scenario guard unit is switched to hunt (472); a unit with an attack target that is not hunting is skipped (476); a hunting unit whose current target is still within its fire distance is skipped (481); otherwise `Unit_SetTarget(u, unitOriginEncoded)` makes it attack the shooter (map.c 484). Team handling (about 437-466, read in part) and allied checks sit between (d) and (f).
- `Unit_Damage` (unit.c 1530): ignores units that are not normal units (except sandworms). It takes `hitpoints` down by `damage`, floored at 0 (1544-1547). It calls `Unit_Deviation_Decrease(unit, 0)` (1550). If the hit points reach 0 it removes the unit from the player, sets `ACTION_DIE`, and returns true (1554-1567). Otherwise, with a nonzero `range` it shows an impact explosion (1572; the splash path passes range 0, so it does not). Above half of the unit type's maximum it returns (1579). Below half, infantry switch to the type two slots later at that type's full hit points and may retreat on a toughness roll; tracked, harvester and wheeled units start smoking (read to the end of the function, 1604).
- The per-step degrade is separate: a ground unit that flags `degrades` loses 1 hit point with a 1-in-4 chance on each step (unit.c 1459; the test is at 1458).

## 2. Key functions

- `Map_MakeExplosion`: `/mnt/frankendom-donors/OpenDUNE-OpenDUNE/src/map.c` 403-500. The whole splash plus retaliation. Splash loop and retaliation 407-484; the structure part 488-500 read; the rest not read.
- `Unit_Damage`: `/mnt/frankendom-donors/OpenDUNE-OpenDUNE/src/unit.c` 1530-1604. Floor at zero, death branch, half-hit-point reaction.
- Bullet arrival: `/mnt/frankendom-donors/OpenDUNE-OpenDUNE/src/unit.c` 1419-1460. Arrival test, then explosion with the bullet's hit points, then removal.
- `Tile_GetDistance`: `/mnt/frankendom-donors/OpenDUNE-OpenDUNE/src/tile.c` 39-46. The distance metric: larger axis plus half the smaller axis.
- Unit_CreateBullet hit-point lines: `/mnt/frankendom-donors/OpenDUNE-OpenDUNE/src/unit.c` 1982 (hit points = damage), 2023 (big bullet above 15).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Blast hit points shifted right by distance in quarter-tile steps (integer halving), with a hard radius cut-off | Steps per tile: 16 (`>> 4` of a 256-unit tile, tile.c 26 `<< 8`). Radius: 16 steps (1 tile); death-hand 32 steps (2 tiles) (map.c 405). Shift: `distance >> 2` (map.c 431) |
| Metric: larger axis plus half the smaller axis (no square root) | `dy / 2` and `dx / 2` (tile.c 44) |
| Floor at zero, then a death branch on exactly zero | Threshold 0 (unit.c 1544-1554) |
| Half-hit-point reaction threshold | Half of the unit type's maximum (unit.c 1579) |
| Projectile carries its damage as its hit points | Bullet damage = shooter table value; missile trooper minus a quarter (script/unit.c 623, 659) |

Derived bands (computed from the code, not stated by the donor): full damage under 0.25 tile; half from 0.25 to under 0.5 tile; a quarter from 0.5 to under 0.75 tile; an eighth from 0.75 to under 1 tile; nothing at 1 tile or more for a normal blast.

## 4. TypeScript sketch

simplified: keeps the donor order for each body (distance, radius cut-off, shift-based damage, floor at zero). It omits: the sandworm and frigate exclusions; the retaliation step (`Unit_SetTarget` on enemies with no target in fire range); the structure path; the team and allied branches; the half-hit-point infantry swap and the toughness retreat; the degrade chance; the explosion visuals and sound; and the bullet's in-flight travel (the blast is taken at its arrival point). It also differs from the donor in one way: the donor re-runs its death branch for an already dead unit (unit.c 1554-1567 has no prior-death check), while the sketch reports `killed` only on the transition.

```ts
// Licence: GPL-2.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Body { id: string; x: number; y: number; hp: number; }
interface Blast { x: number; y: number; hp: number; deathHand: boolean; }
interface Hit { id: string; damage: number; killed: boolean; }

// Positions are in 1/256-tile units. Metric: larger axis plus half the smaller axis.
function tileDistance(ax: number, ay: number, bx: number, by: number): number {
  const dx = Math.abs(ax - bx);
  const dy = Math.abs(ay - by);
  return dx > dy ? dx + (dy >> 1) : dy + (dx >> 1);
}

// Splash: 16 steps per tile; each quarter tile inside the radius halves the blast (integer shift).
function resolveBlast(b: Blast, bodies: Body[]): Hit[] {
  const radiusSteps = b.deathHand ? 32 : 16;
  const hits: Hit[] = [];
  for (const body of bodies) {
    const steps = tileDistance(b.x, b.y, body.x, body.y) >> 4;
    if (steps >= radiusSteps) continue;
    const damage = b.hp >> (steps >> 2);
    const wasAlive = body.hp > 0;
    body.hp = body.hp >= damage ? body.hp - damage : 0;
    hits.push({ id: body.id, damage, killed: wasAlive && body.hp === 0 });
  }
  return hits;
}
```

## 5. Lands in

- TARGET `src/fight/damage.ts` (the one place health changes): a splash step that resolves an area hit with falloff. Parity-checklist row 1 (duel step / sim).
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room, shape only)
- Brief rule served: 1 (one combat core, two clients); licence: clean-room, shape only

## 6. Gaps and risks

- GPL-2.0: clean-room only. The sketch is written from the mechanism, not from the donor lines.
- The splash hits every unit in range, including the attacker's own side: the damage call (map.c 431) runs before the house check (map.c 434). Frankendom must name who a splash hits. Its rulings say the server decides each hit, so a blast must hand the server a list of verified targets, not change health itself.
- The donor has no accuracy roll: a blast always lands. Guard and parry (checklist row 3) would be bypassed. Splash must either pass the same guard check or be a declared unblockable class.
- The donor carries damage as the projectile's hit points (unit.c 1982). Frankendom should carry damage on the attack record, not on a body.
- The donor re-runs death handling on an already-dead unit (unit.c 1554-1567). The one ledger must write one kill per unit.
- Retaliation (map.c 476-484) turns enemy units to the shooter. Aggro belongs to checklist row 4 (fight loop); do not mix it into the damage step.
- Radius, shift and cap are engine constants in the donor. Frankendom should carry radius, falloff and a target cap as data per attack, not as constants. MAX_ATTACKERS = 3 has no counterpart in the donor: a blast there hits any number of units in radius, so the cap has to be written in.

Best transferable idea: an area hit that halves its damage per quarter-tile of distance, with a hard one-tile cut-off, gives a shockwave or finisher a falloff that needs only integer shifts and no square root.
Decision (proposed): adapt - take the falloff shape for a many-on-one shockwave, but route each hit through the server-verified path with guard and a cap of three targets; the donor's hit-everyone-in-radius and no-accuracy rules do not fit our rulings as they stand.
Acceptance: In a 3-on-1 fight, a shockwave centred on the attacker's tile deals a quarter of its hit points to an enemy at 0.5 tile, an eighth at 0.75 tile, and nothing at 1 tile; at most three enemies are hit (a Frankendom cap, not in the donor), and the server test asserts each value.

Reuse tag: rewrite-from-idea (GPL-2.0; clean-room, shape only)
Brief rule served: 1 (one combat core, two clients)
