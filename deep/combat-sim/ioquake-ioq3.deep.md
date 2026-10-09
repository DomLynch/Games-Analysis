# ioquake-ioq3 (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/ioquake-ioq3/code/game/g_combat.c` | Licence: GPL-2.0-or-later per g_combat.c header (id Software) | C | symbol `G_Damage / G_RadiusDamage / player_die`

Checked: `G_Damage` opens at 802 and closes at 1047 (verified). `G_RadiusDamage` 1159-1221, `player_die` 434-664, `CheckArmor` 672-701 and `CanDamage` 1058-1151 were all read in full.

## 1. Mechanism

- `G_Damage` (802-1047) is the one function for every entity hit. Inputs: target, inflictor (the object), attacker, direction, impact point, raw damage, flags (radius, no-knockback, no-protection, no-team-protection, no-armour), means of death. Output: health and armour change, a knockback velocity on the player, per-player stats, and a die or pain call.
- Order, as the code runs: (a) bail on targets that cannot take damage and when the intermission is queued (813-821); default a missing inflictor and attacker to the world; a shootable mover (door or button) fires its use function and returns, since movers have no health (840-845); (b) the attacker's handicap scales damage by `max_health / 100`, unless the attacker hits itself (853-861); a noclip target returns (865-869); (c) knockback = min(damage, 200), zero for no-knockback targets and flags (877-886); applied to clients only, before the immunity gates: velocity += direction x `g_knockback` x knockback / 200, plus a knockback timer of clamp(knockback x 2, 50, 200) ms that stops the target cancelling the push, set only if not already running (889-913); (d) unless the no-protection flag is set: a teammate hit returns unless friendly fire is on, and godmode returns (916-944); (e) a battlesuit returns on radius or falling damage and halves the rest (948-954); (f) the attacker's hit counter moves and the target's health and armour are packed into the attacker's tally (957-967); (g) a self-hit is halved, after knockback so rocket jumps work (971-973); every hit is then floored at 1 (975-977); (h) armour: `CheckArmor` (672-701) returns 0 unless the target is a client and the no-armour flag is off, otherwise `ceil(damage x 0.66)` capped at the armour left, which is reduced (981-982); (i) screen-blend tallies and the last attacker are recorded (992-1023); if anything is left after armour (`take != 0`) health falls by it; at zero or below the target gets the no-knockback flag, health is clamped at -999, the enemy is set and `die` runs; otherwise `pain` runs (1026-1045).
- `G_RadiusDamage` (1159-1221): finds entities in a box around the blast (skipping the ignored entity and anything that cannot take damage), measures the distance from the blast point to the entity's bounding box edge, and if the entity is inside the radius and is visible from the blast (`CanDamage`), calls `G_Damage` with `(int)(damage x (1 - dist / radius))`, no inflictor and the `DAMAGE_RADIUS` flag, with the direction pushed 24 units up (1212-1216). The radius is floored at 1. `CanDamage` (1058-1151) casts up to nine solid traces from the blast point: to the entity's bounding-box midpoint and to eight corners offset by 15 units; any clear trace passes.
- Tick: called from each weapon event (hit, blast). Synchronous. Not a frame loop.
- The same function also writes per-player scoreboard counters and the screen-effect totals, so a damage step has side outputs as well as health.

## 2. Key functions

- `G_Damage`: `/mnt/frankendom-donors/ioquake-ioq3/code/game/g_combat.c` 802-1047. Handicap, knockback, gates, battlesuit, self-hit, armour, health, die or pain.
- `CheckArmor`: `/mnt/frankendom-donors/ioquake-ioq3/code/game/g_combat.c` 672-701. Armour soak at a fixed protection fraction, capped at the armour the player has.
- `G_RadiusDamage`: `/mnt/frankendom-donors/ioquake-ioq3/code/game/g_combat.c` 1159-1221. Box query, edge distance, linear falloff, visibility check, call into `G_Damage`.
- `player_die`: `/mnt/frankendom-donors/ioquake-ioq3/code/game/g_combat.c` 434-664 (read in full). Death handling, called from `G_Damage` when health falls to zero: ignores a second death and the intermission; logs the kill and broadcasts an obituary event; score +1 for the attacker, -1 for the attacker on a suicide or team kill (and -1 for the victim when the killer is not a client), and a kill-streak reward timer; team bonuses; drops items; the body stays damageable for gibbing; respawn is blocked for 1700 ms; gib if health is at the gib threshold (blood on, not in a no-drop volume) or on suicide, otherwise one of three death animations in rotation.
- `CanDamage`: same file 1058-1151. Nine-trace line-of-sight test used by radius damage.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Linear radius falloff: damage x (1 - dist / radius), dist from the target's bounding-box edge | None (the formula) |
| Armour soak = ceil(damage x protection), capped at remaining armour | Protection 0.66 (theirs, `/mnt/frankendom-donors/ioquake-ioq3/code/game/bg_public.h` line 32; used at g_combat.c 691) |
| Knockback = force x damage / mass, damage capped | Cap 200 (theirs, 878); mass 200 (theirs, 893); cvar `g_knockback` (theirs, 895); timer 50-200 ms (theirs, 903-909) |
| Handicap: attacker's max health as a percentage | Scale = max health / 100 (theirs) |
| Self-hit halved after knockback; every hit floored at 1 | x0.5 (theirs, 972); floor 1 (theirs, 975-977) |
| Battlesuit halves damage; blocks radius and fall | x0.5 (theirs) |
| Vertical lift on radius knockback | +24 units on z (theirs, 1215); respawn delay 1700 ms (theirs, 608) |

## 4. TypeScript sketch

simplified: the donor works in integers (halving and the radius share are truncated to int) while the sketch keeps floats; the sketch omits the handicap, knockback and its timer, the friendly-fire and godmode gates, the battlesuit, hit counters, the mover case, the death and pain calls and the line-of-sight test. Armour is applied inside `soakAndHurt` after `finalDamage`, in the donor's order (self-hit halving, floor, then armour). The radius function gives the share before `CanDamage`.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Entity { health: number; armour: number; pos: [number, number, number]; boxMin: [number, number, number]; boxMax: [number, number, number]; }

// Linear falloff from a blast point to the nearest point of the target's box.
function radiusShare(origin: number[], e: Entity, radius: number, damage: number): number {
  let d2 = 0;
  for (let i = 0; i < 3; i++) {
    const lo = e.boxMin[i], hi = e.boxMax[i], o = origin[i];
    const v = o < lo ? lo - o : o > hi ? o - hi : 0;
    d2 += v * v;
  }
  const dist = Math.sqrt(d2);
  if (dist >= radius) return 0;
  return damage * (1 - dist / radius);
}

// Armour soaks a fixed fraction, capped at what is left; health takes the rest.
function soakAndHurt(e: Entity, raw: number, protection: number): number {
  let soak = Math.ceil(raw * protection);
  if (soak >= e.armour) soak = e.armour;
  e.armour -= soak;
  const take = raw - soak;
  e.health -= take;
  return take;
}

// Self-hit is halved after knockback; then every hit is floored at 1.
function finalDamage(raw: number, selfHit: boolean): number {
  const d = selfHit ? raw * 0.5 : raw;
  return Math.max(1, d);
}
```

## 5. Lands in

- TARGET `src/fight/damage.ts` (new module, engine damage step): the linear radius share and the armour soak, both as data. Parity-checklist row 1 (duel step / sim); row 17 (death / respawn / fight end) for the `player_die` shape; row 18 (loot roll and XP award) for the server-side score and drop step.
- TARGET `src/fight/area.ts` (new module): the radius falloff only, if Frankendom wants area attacks, under MAX_ATTACKERS = 3.
- today: `src/combat.ts` (moving to `src/fight/combat.ts`) holds the flat combat helpers; no damage or area module exists.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism.
- The donor's handicap scales the attacker's damage by its max health. Frankendom has no max-health handicap in the duel. Do not add one from this file.
- Knockback as a velocity with a timer is a movement model. Frankendom has stagger and posture; no client velocity should come from `src/fight/`.
- Battlesuit and godmode are powerup flags checked inside the damage function. Frankendom should express a shield-like effect as a data field with a default, not a hard-coded flag check.
- The radius call pushes the centre of mass 24 units up. That is a model detail with no Frankendom meaning unless a vertical hit rule is designed.
- Hit counters (`PERS_HITS`, `PERS_ATTACKEE_ARMOR`) are scoreboard data written inside the damage step, and `player_die` writes the score (`AddScore`). Frankendom's one-ledger rule means scoring must come from the server ledger, not from a side effect inside the damage function.
- The donor lets the target's `die` function award the kill (score, item drops) in the same call as the last hit; server-verified kills in Frankendom must keep the award as a separate, replayable ledger write (checklist row 18).
