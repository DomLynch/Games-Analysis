# id-Software-Quake-2 (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/id-Software-Quake-2/ctf/g_combat.c` | Licence: GPL-2.0 (gnu.txt) | C | symbol `T_Damage / M_ReactToDamage / CheckArmor`

Checked: `T_Damage` opens at 374 and closes at 559 (verified, read in full). `CheckPowerArmor` 171-253, `CheckArmor` 255-293, `M_ReactToDamage` 295-358 and `CheckTeamDamage` 360-372 were also read in full.

## 1. Mechanism

- The single damage function for every entity. Inputs: target, inflictor, attacker, hit direction, hit point, surface normal, raw damage, knockback amount, damage flags (bullet, energy, radius, no-armour, no-knockback, no-protection), and the means of death. Output: target health and armour change, knockback velocity, a death call or a pain call.
- Order, as the code runs: (a) bail if the target cannot take damage (383); (b) friendly fire: in team modes or coop, a hit on a teammate other than oneself gets damage 0 (no-friendly-fire flag) or a friendly-fire mark on the means of death (386-398); (c) in easy single-player skill, damage to a player is halved, minimum 1 (402-407); (d) the hit direction is normalised; a hit by a player on a monster that has no enemy yet and is alive, not a radius hit, doubles the damage (418-420); (e) the CTF strength tech multiplies it (424); (f) knockback: skipped for no-knockback targets and flags and for static, bouncing, pushing and stopping movers; otherwise velocity += direction x 500 x knockback / mass (mass floor 50), or x 1600 when a player hits itself (427-450). This happens before the immunity gates, so an immune target is still pushed. (g) `take = damage`; godmode (unless the no-protection flag) sets take 0 and records the damage as saved (455-461); invincibility does the same and plays a sound at most every 2 s (463-473).
- Armour (475-488): unless this is a CTF teammate hit with armour-protect on, power armour runs first (`CheckPowerArmor`, 171-253: needs power cells or a monster's power; a screen only works for hits from the front (dot above 0.3) and takes 1/3 of the damage; a shield takes 2/3; one cell per point of damage in CTF, capped by the cells held), then the armour item (`CheckArmor`, 255-293: players only; save = ceil(protection x damage), protection chosen by energy or normal damage, capped at the armour count, which is reduced). Because the immunity gates set take to 0 first, both return 0 for an immune target and no armour is spent (unlike the Quake 1 note in this batch). The savings are added to the armour tally (491).
- The CTF resistance tech then scales `take` (495); the team-damage check returns early with no health loss unless the no-protection flag is set (499-500); knockback and armour spend have already happened by then.
- Health: if `take` is non-zero, blood or sparks spawn and health falls (not during CTF match setup); at zero or below a monster or client gets the no-knockback flag and `Killed` runs (507-523). Otherwise monsters call `M_ReactToDamage` and play pain unless ducked (a nightmare skill lengthens the pain debounce); clients play pain unless god-moded; other entities play pain if they have it and took damage (526-546). Finally damage tallies for a client's screen blends and view kick are accumulated (551-558).
- `M_ReactToDamage` (295-358): ignores attackers that are neither a client nor a monster, itself, or its current enemy; a "good guy" monster ignores players and other good guys; a client attacker becomes the enemy (in coop only if the current client enemy is not visible); a monster attacker of the same movement type and a different class (and not a boss tank) becomes the enemy; otherwise the monster takes the attacker's enemy as its own ("help your buddy").
- Tick: one call per hit event. Synchronous. Not a frame loop.

## 2. Key functions

- `T_Damage`: `/mnt/frankendom-donors/id-Software-Quake-2/ctf/g_combat.c` 374-559. The full pipeline.
- `CheckArmor`: `/mnt/frankendom-donors/id-Software-Quake-2/ctf/g_combat.c` 255-293. Armour save by protection type, capped at the armour left.
- `M_ReactToDamage`: `/mnt/frankendom-donors/id-Software-Quake-2/ctf/g_combat.c` 295-358. Monster target choice after a hit (read in full).
- `CheckPowerArmor`: `/mnt/frankendom-donors/id-Software-Quake-2/ctf/g_combat.c` 171-253. Screen and shield power armour, cells as the pool.
- Knockback block: `/mnt/frankendom-donors/id-Software-Quake-2/ctf/g_combat.c` 430-450 (mass floor, speed scale, rocket-jump case). Runs before the godmode gates.
- Gates and armour: `/mnt/frankendom-donors/id-Software-Quake-2/ctf/g_combat.c` 455-496 (godmode, invincibility, team armour protect, power armour, armour), then 498-500 (team damage avoidance).
- Health and death: `/mnt/frankendom-donors/id-Software-Quake-2/ctf/g_combat.c` 506-559 (health reduce, death call, pain, view tallies).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Armour soak = ceil(protection x damage), capped at what remains | Protection per armour item, normal and energy (theirs, data) |
| Knockback = force x knockback / mass, mass floor | Force 500 (theirs, 446); mass floor 50 (theirs, 438); self-hit force 1600 (theirs, 444) |
| Damage bonus for a surprise hit on an idle target | x2 (theirs, 420) |
| Easy skill halves damage in single player | x0.5, minimum 1 (theirs, 402-407) |
| Power armour: screen takes 1/3, shield 2/3 of the hit, one cell per point (CTF) | 0.3 facing threshold, 1/3 and 2/3 (theirs, 223, 228, 234) |
| Death when health <= 0; death stops knockback | Threshold 0 (mechanism) |
| Flags as bitmask on the hit: no armour, no knockback, no protection, radius | Flag bits (theirs) |

## 4. TypeScript sketch

simplified: omits friendly fire, easy-skill halving, the strength and resistance techs, power armour, team armour protect and team damage avoidance, the no-knockback conditions, pain and the monster reaction. Order follows the donor: surprise bonus, knockback computed from the damage, immunity gates, then armour, then health. The sketch has no minimum-damage clamp, and neither does the donor (only the easy-skill halving keeps a minimum of 1).

```ts
// Licence: GPL-2.0 (gnu.txt) (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Target { health: number; armour: number; armourProtection: number; invulnerable: boolean; }
interface HitIn { raw: number; surprise: boolean; selfHit: boolean; radius: boolean; }
interface HitOut { healthLoss: number; soaked: number; dead: boolean; knockback: number; }

// Monsters and players share the same pipeline; only the gate and bonus differ.
function applyHit(t: Target, h: HitIn, knockbackForce: number, mass: number): HitOut {
  let damage = h.raw;
  if (h.surprise && !h.radius) damage *= 2;                 // surprise bonus
  const kb = (h.selfHit ? 1600 : knockbackForce) * damage / Math.max(mass, 50);

  if (t.invulnerable) return { healthLoss: 0, soaked: damage, dead: false, knockback: kb };

  let soaked = Math.ceil(t.armour > 0 ? damage * t.armourProtection : 0);
  if (soaked >= t.armour) soaked = t.armour;               // armour used up
  t.armour -= soaked;

  const take = damage - soaked;
  t.health -= take;
  return { healthLoss: take, soaked, dead: t.health <= 0, knockback: kb };
}
```

## 5. Lands in

- TARGET `src/fight/damage.ts` (new module, engine damage step): the single damage step, with armour soak and the surprise and self-hit rules as data. Parity-checklist row 1 (duel step / sim); armour values are a catalogue field, row 21.
- today: `src/combat.ts` (moving to `src/fight/combat.ts`) holds the flat combat helpers; no damage module exists yet.
- Reuse tag: adapt
- Brief rule served: 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- GPL-2.0: clean-room only.
- The donor is a shooter with radius damage, power armour and per-item protection. Frankendom's duel uses guard and parry, not per-hit armour items; the soak shape transfers, the item table does not.
- Knockback is a velocity vector with mass. Frankendom has stagger and posture (checklist rows 1 and 3); no vector push should enter the engine.
- Friendly fire and team armour protect are team-mode rules; Frankendom has no team model in the duel.
- The surprise bonus depends on monster AI state (`enemy` unset). Frankendom must express this as an explicit state field if it is kept at all, not a hidden check.
- `M_ReactToDamage` picks monster targets from the hit. This is an AI and aggro rule (checklist rows 2 and 4; see the ai-aggro cell), not part of the damage step. Its "help your buddy" branch (take the attacker's enemy) is a group rule that would interact with MAX_ATTACKERS = 3.
