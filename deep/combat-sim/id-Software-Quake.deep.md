# id-Software-Quake (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/id-Software-Quake/qw-qc/combat.qc` | Licence: GPL-2.0 (gnu.txt) | C (QuakeC scripts) | symbol `T_Damage`

Checked: Symbol `T_Damage` is defined at 134 and closes at 271 (verified, read in full). Its own header comment says it "should be the only function that ever reduces health".

## 1. Mechanism

- One function applies every hit to a living entity. Inputs: the target, the inflictor (the thing that did the damage, e.g. a rocket), the attacker (who gets blamed), and a raw damage number. Output: the target's health and armour change, knockback velocity, and a death call if health drops to zero or below.
- Order of steps (as the code runs): (a) bail if the target cannot take damage (144); (b) quad: if the attacker's quad timer is running and the inflictor is not a door, damage x4 (x8 in deathmatch mode 4) (152-156); (c) armour: `save = ceil(armortype x damage)`; if that reaches the armour value, save is capped at the armour value, the armour type is zeroed and the armour item bits are cleared (160-166); the armour value is reduced by `save` and `take = ceil(damage - save)` (168-169). This happens BEFORE any gate below, so a god-moded or invincible target still loses armour. (d) For client targets, `dmg_take`, `dmg_save` and the inflictor are accumulated for the end-of-frame damage message (174-179), also before the gates. (e) Momentum: if the inflictor is not the world and the target walks, velocity += unit vector from the inflictor's box centre to the target x damage x 8 (185-197), plus an extra `damage x rj` when `rj > 1` and a player hits itself (200-201). Also before the gates, so a god-moded target is still pushed.
- Gates, after armour and momentum: godmode flag returns (208-209); invincibility returns, playing a protect sound at most every 2 s (210-218); team play mode 1 returns for same-team player attackers unless the inflictor is a door (225-228); mode 3 does the same except for self-damage (230-233).
- Then `health -= take` (236). At health <= 0 the death handler `Killed(targ, attacker)` runs and the function returns (238-242). Otherwise the pain reaction runs: the monster "get mad at the attacker" block is commented out (248-264), but the target's `th_pain(attacker, take)` is live and is called if set (265-268).
- Tick: called from each weapon event (a projectile hit, a blast, a melee). Synchronous, one call per hit. Not a per-frame loop.

## 2. Key functions

- `T_Damage`: `/mnt/frankendom-donors/id-Software-Quake/qw-qc/combat.qc` 134-271. The whole pipeline: quad, armour, health, momentum, gates, death.
- `T_Damage`, armour split (block inside it): `/mnt/frankendom-donors/id-Software-Quake/qw-qc/combat.qc` 160-169 (`save = ceil(armortype*damage)` capped at `armorvalue`; `take = ceil(damage - save)`). Runs before the godmode gate.
- `T_Damage`, momentum block (inside it): `/mnt/frankendom-donors/id-Software-Quake/qw-qc/combat.qc` 184-203 (direction from inflictor's box centre; velocity += dir x damage x 8; rocket-jump case). Runs before the godmode gate.
- `T_Damage`, gates and health (block inside it): `/mnt/frankendom-donors/id-Software-Quake/qw-qc/combat.qc` 207-242 (godmode, invincibility, team play, health reduction, death call), then 244-268 (pain reaction).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Armour soaks a fraction of the hit, rounded up, capped at what remains | Armour fractions 0.3 / 0.6 / 0.8 with values 100 / 150 / 200 (theirs, items.qc 410-427) |
| Health takes the rest of the hit | None (the subtraction) |
| Momentum from the blast centre, proportional to damage | Momentum factor 8 (theirs, combat.qc 197) |
| Self-hit boost for rocket jumps | `rj` multiplier global (theirs, defs.qc 469, default 1; set from an info key, client.qc 545) |
| Quad damage multiplies the raw hit | x4 in normal play, x8 in deathmatch mode 4 (theirs, 152-156); not applied to door inflictors |
| Death check at health <= 0, then return | Threshold 0 (mechanism) |

## 4. TypeScript sketch

simplified: the sketch follows the donor order (quad, armour, momentum, then the godmode and invincibility gates, then health), so a god-moded victim still loses armour and is pushed, as in the donor. It omits the door exception for quad, the end-of-frame client damage accumulators, team play, the invincibility sound, the `rj` self-hit boost, the world-inflictor and walk-type conditions on momentum, and the pain call. Armour fraction and value come from the item in the donor.

```ts
// Licence: GPL-2.0 (gnu.txt) (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Victim {
  health: number;
  armour: number;
  armourFraction: number;     // share of a hit the armour can soak (0 = none)
  godmode: boolean;
  invulnerable: boolean;
}

interface HitResult { healthLoss: number; armourSoak: number; dead: boolean; push: number; }

// One hit. Armour and push are settled first; the immunity gates only stop the health loss.
function applyHit(v: Victim, raw: number, quadMultiplier: number, pushFactor: number): HitResult {
  const damage = raw * quadMultiplier;

  let soak = Math.ceil(damage * v.armourFraction);
  if (soak >= v.armour) { soak = v.armour; v.armourFraction = 0; } // armour used up
  v.armour -= soak;
  const take = Math.ceil(damage - soak);
  const push = damage * pushFactor;           // momentum, applied by the caller along the hit direction

  if (v.godmode || v.invulnerable) return { healthLoss: 0, armourSoak: soak, dead: false, push };

  v.health -= take;
  return { healthLoss: take, armourSoak: soak, dead: v.health <= 0, push };
}
```

## 5. Lands in

- TARGET `src/fight/damage.ts` (new module, engine damage step): the one place health changes. Parity-checklist row 1 (duel step / sim). Today the flat combat helpers are in `src/combat.ts` (moving to `src/fight/combat.ts`).
- today: `src/combat.ts` (moving).
- Reuse tag: adapt
- Brief rule served: 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- GPL-2.0: clean-room only. The sketch is written from the mechanism.
- The donor's rule that one function reduces health matches Frankendom's one-ledger rule; the donor does not enforce it across the server (it is a convention in the script). Frankendom must enforce it in code.
- Team-play and friendly-fire rules are cvar-driven. Frankendom has no team model in the duel; only the gate shape transfers.
- Momentum is a physics push, applied even to a victim who is immune. Frankendom's guard, stance and stagger live in the duel step (checklist rows 1 and 3); a vector push has no counterpart. Do not port the push as a state change.
- Order matters for one ledger: the donor spends armour and pushes before the immunity check, so an immune victim still loses armour. Frankendom must pick one order and test it.
- The file is QuakeC script for a 1996 engine. The monster "get mad" reaction is commented out (248-264); the `th_pain` call (265-268) is live but what `th_pain` does is not read. `Killed` (called at 240) was not read.
- Quad damage and rocket-jump multipliers are item and game-mode effects. Frankendom should express them as data fields with defaults (zones as data), not as constants in the function.
