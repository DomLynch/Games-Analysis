# dhewm-dhewm3 (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/dhewm-dhewm3/neo/d3xp/Actor.cpp` | Licence: GPL-3.0-or-later (per Actor.cpp header: "version 3 of the License, or (at your option) any later version"; COPYING.txt is GPL v3) | C++ | symbol `idActor::Damage`

Checked: `idActor::Damage` read in full at Actor.cpp 2208-2281 (the `_D3XP` branches included). `idActor::GetDamageForLocation` read 2441-2447. Zone setup read 2392-2434. Base class `idEntity::Damage` read 3074-3114 (contrast). Splash caller read at Game_local.cpp 4005-4025 (loop body only; the function header was not read). Player path read in part only: Player.cpp 7954-8030, the tail after 8030 was not read. Confidence: high on the actor order of operations; medium on the C++ float-to-int truncation at 2245, which is a language rule, not a line of this code. Network code and the `Killed`/`Pain` bodies were not read.

Best transferable idea: scale each hit by a per-zone multiplier (a body part) rounded up, after the caller's scale, then apply an optional health floor and a death/gib/pain split, so a boss "cannot die below X" is a data field rather than code.

## 1. Mechanism

- One entry point per hit on an actor: `idActor::Damage` (2208-2209). Inputs: inflictor (what hit), attacker (who gets the credit), direction, the name of a damage def (the def holds the base `damage` number), a caller scale, and a hit location (a joint index).
- Order of steps (as the code runs):
  (a) bail if the actor cannot take damage (2210-2212).
  (b) default inflictor and attacker to the world (2214-2219).
  (c) d3xp immunity gates, before any damage math: the final boss takes only the helltime-killer projectile (2225-2227); Maledict is immune to two asteroid damage defs (2230-2233).
  (d) base damage = def `damage` times the caller's scale, stored in an int, so the float product is truncated (2240-2245).
  (e) zone scale: `GetDamageForLocation` returns `ceil(damage x zone scale)`, or the damage unchanged when the location is outside the zone table (2246; 2441-2447). So the caller scale is applied first (truncated), and the zone scale second (rounded up).
  (f) the attacker is told it hit (`DamageFeedback`) before health changes (2249).
  (g) if damage > 0: `health -= damage` (2251). If a damage cap is set (>= 0) and health is below it, health is raised to the cap (2255-2257). The cap is off by default (-1, line 479) and is set by script through `setDamageCap` (3390-3391). Because the cap is applied before the death test, a cap above 0 stops this path from killing.
  (h) if health <= 0: clamp to -999 (2261-2262), call `Killed` (2264), then gib if health < -20 AND the spawn args allow gibbing AND the damage def allows it (2265-2267). Otherwise call `Pain` (2268-2270).
  (i) if damage <= 0: clear accumulated knockback (`af.Rest()`) and wake physics (2271-2279), so zero-damage hits do not build up impulses.
- Zone setup, at spawn: each joint is put into a named zone from `damage_zone <name>` args (2405-2412; membership at 2409). Each zone then gets its scale from `damage_scale <name>` args (2422-2432). Every joint starts at 1.0 (2416-2419).
- Splash: the loop in Game_local.cpp computes `dmgPower * (1 - dist/radius)` (4018), multiplies by the attacker scale for the attacker or its attachment (4019-4020), then calls `Damage` with no joint (4023). The zone guard then returns the damage unscaled.
- Timing: synchronous, one call per hit, not a per-frame loop as far as the read code shows. Other callers were not read.

## 2. Key functions

- `idActor::Damage`: `/mnt/frankendom-donors/dhewm-dhewm3/neo/d3xp/Actor.cpp` 2208-2281. Entry, immunity, scale, cap, death/gib/pain split, zero-damage reset.
- `idActor::GetDamageForLocation`: Actor.cpp 2441-2447. `ceil(damage x zone scale)` with a guard for an out-of-range location.
- `idActor::SetupDamageGroups`: Actor.cpp 2392-2434. Reads `damage_zone` and `damage_scale` args into per-joint scales.
- `idActor::Event_SetDamageCap`: Actor.cpp 3390-3392. Script-set floor.
- `idEntity::Damage` (base class, contrast): `/mnt/frankendom-donors/dhewm-dhewm3/neo/d3xp/Entity.cpp` 3074-3114. Same death/pain shape, but no zone scale, no cap, and no gib check.
- Splash caller (contrast): `/mnt/frankendom-donors/dhewm-dhewm3/neo/d3xp/Game_local.cpp` 4005-4025 (loop body only).
- Player path (contrast): `idPlayer::CalcDamagePoints`, `/mnt/frankendom-donors/dhewm-dhewm3/neo/d3xp/Player.cpp` 7955-8030 (part read). Different order: zone scale first (7961), skill multipliers (7966-7981), then a float `damage *= damageScale` (7985), then self-damage 0.5 in multiplayer (7989-7991), then armour (8014-8020).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Base damage x caller scale, truncated to int, then per-zone scale rounded up | Zone scale default 1.0 (2418); set by `damage_scale` args (2429) |
| Health floor from a settable cap, off by default | Cap off = -1 (479); cap set by script (3390-3391) |
| Death split: clamp to -999 (2261-2262); gib only below -20 (2265) | -999 floor and -20 gib threshold (theirs) |
| Zero or negative damage clears accumulated knockback (2272-2278) | None |
| Immunity gates before any damage math (2225-2233) | Helltime-killer projectile name; Maledict asteroid def names |
| Splash: falloff linear in distance, attacker scale (Game_local.cpp 4018, 4020) | `dmgPower` and `radius` are caller inputs (not read) |
| Player path: zone scale first, then skill and self-damage multipliers (Player.cpp 7961-7991) | Skill 0 x0.80 (7968), skill 2 x1.70 (7974), skill 3 x3.5 (7977), MP self-damage 0.5 (7991) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (caller scale truncated, zone scale rounded up, optional floor, then death/gib/pain). It omits: the attacker feedback call, the d3xp immunity gates (helltime boss, Maledict), the `Killed` and `Pain` side effects (the sketch returns an outcome instead), the spawn-args and def gib flags (reduced to one boolean), the knockback reset and physics wake (reported as `knockbackReset`), the splash caller, and the player's skill, self-damage and armour path.

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Actor {
  health: number;
  takeDamage: boolean;
  floor: number | null;      // optional health floor (null = off)
  zoneScale: number[];       // one multiplier per hit zone, default 1
}

type Outcome =
  | { kind: "none" }
  | { kind: "knockbackReset" }
  | { kind: "pain"; damage: number }
  | { kind: "killed"; damage: number; gib: boolean };

// One hit. zone < 0 or out of range means "no zone": the damage is left unscaled.
function resolveHit(a: Actor, baseDamage: number, callerScale: number, zone: number, gibAllowed: boolean): Outcome {
  if (!a.takeDamage) return { kind: "none" };

  let damage = Math.trunc(baseDamage * callerScale);      // caller scale, truncated to int
  if (zone >= 0 && zone < a.zoneScale.length) {
    damage = Math.ceil(damage * a.zoneScale[zone]);       // zone scale, rounded up
  }

  if (damage <= 0) return { kind: "knockbackReset" };

  a.health -= damage;
  if (a.floor !== null && a.health < a.floor) a.health = a.floor;   // floor applies before the death test

  if (a.health <= 0) {
    if (a.health < -999) a.health = -999;
    const gib = a.health < -20 && gibAllowed;
    return { kind: "killed", damage, gib };
  }
  return { kind: "pain", damage };
}
```

## 5. Lands in

- TARGET `src/fight/damage.ts` (new module, engine damage step): the one place health changes. Parity-checklist row 1 (duel step / sim). Today: `src/combat.ts` (moving; not checked).
- Zones and the cap are fields on the creature catalogue entry (row 21 catalogue fields), not constants in the function.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism; no donor line is translated.
- One engine: the donor has two damage orders. The NPC path (Actor.cpp 2245-2246) applies the caller scale first, truncated, then the zone scale rounded up. The player path (Player.cpp 7961, 7985) applies the zone scale first and then a float multiply with no round-up, and adds skill and self-damage multipliers. A port must pick one order and test it. Frankendom's "one engine" ruling means the player and the NPC cannot differ here.
- Zones as data: the donor gets zone membership and scale from spawn args on each entity (2405-2432). That fits "zones as data" in shape, but the donor has no shared zone catalogue; each entity carries its own strings. Frankendom puts the zone table in the creature catalogue, not in code.
- Server-verified kills: nothing in this function is server-verified. The donor is a single process as far as the read code shows; networking was not read. Frankendom must keep the health change and the death decision on the server. Only the server's outcome should be sent to the client.
- One ledger: the donor writes health in several places: this function (2251, 2256, 2262), the base entity (Entity.cpp 3103), and the player path through a pointer (Player.cpp 7955-7956 signature). Frankendom keeps a single health write in the engine step.
- MAX_ATTACKERS = 3: this function has no attacker count. The splash loop that calls it (Game_local.cpp 4005-4024) hits each entity inside the radius that passes its `CanDamage` test (4007-4011); the loop head was not read, so any victim cap there is unknown. Frankendom's cap belongs to the engine's hate list (row 4), not to this function.
- Gib and knockback reset are client effects (physics, decals, gore). Frankendom's camera, sound and gore are client-only; the server receives only the outcome (damage, killed, pain).
- The -999 clamp and -20 gib threshold are donor numbers for their gib system. Do not copy them without a reason in Frankendom.
- Not read: `Killed` and `Pain` bodies; the damage def files; `af.Rest()`; the d3xp `timeGroup` (SetTimeState); callers of `Damage` other than the splash path; the player armour tail after Player.cpp 8030.
