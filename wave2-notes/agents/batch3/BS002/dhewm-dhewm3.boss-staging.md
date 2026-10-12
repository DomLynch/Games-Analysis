# dhewm-dhewm3 (boss-staging + MG011, cell 2)

Donor: `/mnt/frankendom-donors/dhewm-dhewm3/` (read: `neo/d3xp/Actor.cpp`, `neo/d3xp/Projectile.cpp`, `neo/game/Actor.cpp` by grep only) | Licence: GNU GPL v3 (`COPYING.txt`; source headers say "Doom 3 GPL Source Code"), so shape only, no code adapted | C++ | symbols `idActor::Damage` path, `idActor::GetDamageForLocation`, `finalBoss`, `idProjectile` beam code

Checked: read `d3xp/Actor.cpp` 2215-2250 (final-boss damage gate, Maledict asteroid immunity), 2410-2446 (per-joint damage zones and location multiplier), `d3xp/Projectile.cpp` 1722-1730 (kill reward), 1996-2012 and 2158-2200 (beam hack for the end boss, aims at a named chest joint). Grep only for `boss`, `cyberdemon`, `maledict`, `makron`, `mancubus`, `dragon`, `breath`, `tame`, `mount`, `flight` across `neo/`. Confidence high on the code I read; low on the boss phases, which I did not find in code (see gaps).

Half read: **engine code only** (`neo/`). The data half (entity defs, boss scripts, GUI) is not in the box: `base/` holds only `default.cfg`, `gamepad.cfg`, `gamepad-d3xp.cfg`. So boss intros and phases, which live in the data half, are "not in the half I read".

## 1. What the player sees and feels

- The engine lets a boss be "final" (the expansion's end fight, `_D3XP` path): ordinary hits do no damage. Only one special projectile type gets through. The damage function returns early, so the code sends no damage feedback for blocked hits. Any on-screen or sound response to a blocked hit is in the data half, which is not in the box.
- The expansion's end boss (Maledict) also ignores one attack type, the falling asteroid damage (code only; its effect on screen is not read).
- Hits land on body parts (joints). Each joint has a damage multiplier that starts at 1.0. Non-default values come from the boss's spawn data (not in the box).
- For the expansion's end boss, the beam's end point is taken from the world position of its `Chest1` joint, not from its centre.
- A player's projectile that explodes on an actor with health left adds that actor's remaining health to the player's health pool, except when the actor has the `boss` spawn-arg. Other kill rewards are not changed by this line.

## 2. Why it works, or why it is striking

- Readable at 375 wide: a boss that ignores ordinary hits says so without words, and the player learns to find the one answer.
- One signature behaviour: a single allowed attack. One signature sound: not in the box.
- Could be made ours at 20-30 percent resemblance: a "only the right tool hurts it" rule, a per-body-part damage table, and a beam that lands on the boss's chest joint.

## 3. The rule behind it

**Final-boss gate** (`d3xp/Actor.cpp` 2224-2227): if the actor is `finalBoss` and the inflictor is not the special projectile `projectile_helltime_killer`, the damage function returns at once. The boss takes no damage and no damage feedback is sent. The `#else` branch for the older build (`d3xp/Actor.cpp` 2235-2237) applies the same rule, except for the soul-cube projectile.

**Maledict exception** (`d3xp/Actor.cpp` 2229-2232): for the actor named as Maledict, the asteroid damage defs are dropped before any damage is applied.

**Per-body-part multiplier:** each joint starts at 1.0 (`d3xp/Actor.cpp` 2416-2418). Spawn-arg pairs `damage_zone` and `damage_scale` set a group's multiplier (2421-2431, per the setup code; values in the data half, not read). Damage on a hit is `ceil(damage * scale)` (`d3xp/Actor.cpp` 2446), where the scale is looked up by the joint hit.

**Health-pool reward gate** (`d3xp/Projectile.cpp` 1727-1728): when a projectile explodes on a living actor, and the projectile's owner is a living player, the player's health pool gains the actor's remaining health. The reward is skipped if the actor has the `boss` spawn-arg. The damage call follows on the next line.

**Beam aim:** the end-boss beam loop (`d3xp/Projectile.cpp` 1999-2010) and the beam-start block (2164-2176) both get the boss's `Chest1` joint world position and aim there. The comments call it a "major hack for end boss".

**Numbers as designer data fields** (no donor values copied; the box has no data half, so all values are null):

| field | unit | donor value |
|---|---|---|
| final_boss_allowed_hit_kind | enum (one special attack type) | null (name seen only in code) |
| body_part_damage_mul | x (per joint) | null (data not in box; default 1.0 in code) |
| pool_reward_skipped_for_boss | bool | false (skipped for boss) |
| beam_aim_joint | joint name | null (code uses "Chest1" for one boss) |

## 4. For Frankendom

- **Maps to our shape:** the "only one attack type hurts it" rule is an engine-side gate on the boss's damage path. It fits the server-verified kill rule: the server decides damage, the client shows the blocked hits. Body-part multipliers fit the duel model as a per-zone table on the creature (data), not as physics.
- **Keep:** the single allowed-hit rule as a readable boss mechanic (phone players learn one answer); per-body-part damage as data (default 1.0 so a plain creature needs no table); the kill reward skip for boss kills (keep the boss from feeding the pool).
- **Change:**
  1. Do not hard-code one projectile name in the engine. Use a data field that lists allowed hit kinds per boss.
  2. The beam aim at a named chest joint is a good idea. In our build the aim point is a zone on the creature (row 7 creature actor) with a data name, not a joint string.
  3. Blocked hits must still show feedback on the client (the donor gives none in code; add a short "blocked" flash, parity row 10 hit impact).
- **Parity rows:** row 1 (duel step), row 7 (creature actor, body zones), row 10 (hit impact on blocked hits), row 18 (boss kill reward skip).

## 5. A 5-minute look test Dom can judge on his phone

- Target file: `src/fight/hit-zones.ts` (new module) with the creature's zones as data. Parity row 7.
- On the existing creature in the fight scene, flag two zones: head x2, torso x1, and one "only this hits" boss rule. Dom taps the boss with a normal hit and a special hit. He judges whether the blocked-hit flash reads at 375 wide.

## 6. Licence and IP

- Code: GNU GPL v3 (`COPYING.txt`). Strong copyleft. Shape only: no code, no names, no constants copied. The idea of "one allowed hit kind" and "per-zone multiplier" is a general mechanic; we state our own values.
- Content: the boss names, models and sounds belong to id Software and the expansion's owners. Their content is not in the box. Inspiration stays at category level: "a boss that only one special attack can hurt".
- No legal conclusion is drawn.

## 7. Gaps

- Not in the box: `base/def/*.def`, `base/script/*.script`, `base/pk4` data. Boss intro, staging, phases, armour values per joint, boss HP, boss sounds: not in the half I read. Say "not in the half I read".
- Read only in part: `neo/game/Actor.cpp` (grep lines 455, 628, 2173); `neo/d3xp/Weapon.cpp` 3798 (melee powerup note for an invulnerability boss fight) not read in full.
- MG011 dragons, breath cones, phases, mounts, taming, flight: no dragon or breath boss code found. A case-insensitive grep over `neo/` for dragon, breath, tame, mount and flight hits only unrelated words (framework code, the imgui library, and a link to an unrelated game). "Not found" in `neo/`.

## MG011 (table, dhewm3 engine half)

| name | effect | formula | number range | cost | cooldown / cast | caps | file:line |
|---|---|---|---|---|---|---|---|
| final-boss gate | ignore all but one hit kind | if finalBoss and inflictor is not the allowed kind, return | n/a | n/a | n/a | one allowed kind | `d3xp/Actor.cpp` 2224-2227 |
| Maledict asteroid immunity | ignore asteroid damage defs | name check, return | n/a | n/a | n/a | two def names | `d3xp/Actor.cpp` 2229-2232 |
| body-part damage | multiply damage by joint scale | ceil(damage x scale) | scale default 1.0; data not in box | n/a | n/a | per joint | `d3xp/Actor.cpp` 2416-2446 |
| boss kill reward skip | no health-pool gain on boss kill | skip if boss arg set | n/a | n/a | n/a | n/a | `d3xp/Projectile.cpp` 1727-1728 |
| end-boss beam aim | aim at chest joint | joint world pos | n/a | n/a | n/a | one boss hard-coded | `d3xp/Projectile.cpp` 2164-2176 |
| dragons, breath, phases, taming, mounts, flight | not found | n/a | n/a | n/a | n/a | n/a | not found in `neo/` (grep) |

Fast mobile fight: the per-zone multiplier and the allowed-hit rule both fit a phone (one answer, few zones). Keep zone counts at 3-4 per creature.

Best transferable idea: a boss that only one attack kind can hurt, with its zone multipliers held as data.

Verdict and reuse: PARTIAL for boss-staging (engine half only). Reuse tag: shape only (GPL).

Brief rule served: boss-staging feel note with MG011 fold-in; data half absent, so the staging claims are "not in the half I read".
