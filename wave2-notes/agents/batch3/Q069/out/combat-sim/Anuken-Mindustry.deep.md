# Anuken-Mindustry (combat-sim, cell 2)

Donor: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/entities/Damage.java` (with `entities/comp/ShieldComp.java` and `entities/bullet/BulletType.java`) | Licence: GNU GPL version 3 (`/mnt/frankendom-donors/Anuken-Mindustry/LICENSE`, header "GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007") | Java | symbol `Damage.applyArmor` / `Damage.damage` / `ShieldComp.rawDamage`

Checked: read end to end: `Damage.java` 455-560 (splash overloads and body) and 640-672 (`completeDamage`, `calculateDamage`, `applyArmor`); `ShieldComp.java` 20-85 (`damage`, `damagePierce`, `damageArmorMult`, `rawDamage`); `BulletType.java` 488-520 (`hitEntity`), 554-590 (hit flow), 606-608 (`createSplashDamage`); `Vars.java` 133 (grep). Hinted file `type/Weapon.java`: grep for "damage" returns no match, so it is the wrong file (weapon firing). Not read: `Mathf.lerp` (Arc library, not in this repo; assumed a + (b - a) * t, not read), the `unitHealth` rule and `healthMultiplier`, `tileDamage` (`Damage.java` 557 onward), and the building path (`BuildingComp.java` 1767 by grep only). Confidence high on the unit hit path and the splash path; medium on the building path (not part of this note's sketch). Camera scope: not a camera cell.

## 1. Mechanism

- Two ways damage reaches a unit. A direct hit comes from `BulletType.hitEntity`. A splash comes from `Damage.damage`, called by `createSplashDamage` after the direct hit (`BulletType.java` 584, 606-608). Both end at `ShieldComp.damage` or `damageArmorMult` on the unit.
- Order of steps for a direct hit (`BulletType.java` 488-520):
  (a) raw damage = `b.damage` (492).
  (b) Optional per-hit cap: if `maxDamageFraction > 0` (default -1, off, line 63), damage = min(damage, maxHealth * fraction + current shield) (494-496). Shield is added to the cap so a shielded unit is not cut below its shield.
  (c) Lifesteal heals the owner by min(health, damage) * lifesteal (502-505).
  (d) Armour branch: if `pierceArmor` (default false, line 195), `damagePierce` (507). Else if `armorMultiplier != 1` (default 1, line 197), `damageArmorMult` (509). Else `damage` (511).
  (e) Knockback impulse is applied separately: direction from bullet to unit times knockback * 80 * knockbackMultiplier (516-519).
- Unit side (`ShieldComp.java`):
  (f) `damage(amount)` applies armour first: `rawDamage(applyArmor(amount, armor) / healthMultiplier / unitHealth(team))` (28-31). `armorOverride` replaces `armor` when set (30).
  (g) `applyArmor`: `max(damage - armor, 0.1 * damage)` (`Damage.java` 663-665). The 0.1 is `minArmorDamage` (`Vars.java` 133). Armour removes a flat amount but never more than 90% of the hit.
  (h) `rawDamage` (57-81): shield absorbs first, `min(max(shield, 0), amount)` (66-67), then the rest goes to health (69). If the rest is > 0 and the unit is killable, health -= rest; if health <= 0 and not already dead, kill (71-75). Shield break fx fires when the shield empties (77-79).
- Splash path (`Damage.java` 509-555, 533-534, 656-660):
  (i) Each enemy unit within the radius (plus half hit size when `scaled`) is hit (511). `dist` is the distance to the centre, minus half hit size when `scaled` (517).
  (j) `calculateDamage(dist, radius, damage)`: falloff constant 0.4 (657); scaled = 1 if radius is ~0, else `lerp(1 - dist/radius, 1, 0.4)` (658); result = damage * scaled (659). So full damage at the centre, 40% at the radius edge. The calculation is per unit, not per tile.
  (k) Then `unit.damage(amount)` (521), or `damageArmorMult` when the armour multiplier is not 1 (519).
  (l) Knockback-like velocity: `vel += dir * (1 - dst/radius) * 2 / mass` (533-534), so the push also falls with distance.
- Tick: called from bullet hit events (`BulletType.hit`, 554-584). Synchronous, one call per hit, not a per-frame loop.

## 2. Key functions

- `applyArmor`: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/entities/Damage.java` 663-665.
- `calculateDamage` (splash falloff): same file, 656-660.
- `Damage.damage` (splash body): same file, 509-555.
- `ShieldComp.damage` and `rawDamage`: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/entities/comp/ShieldComp.java` 28-31, 57-81.
- `BulletType.hitEntity` (direct hit): `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/entities/bullet/BulletType.java` 488-520.
- Splash call: same file, 606-608; hit flow calls it at 584.

Callers of `applyArmor`, found by grep: `ShieldComp.java` 30 and 50, `BuildingComp.java` 1767. Callers of `Damage.damage`: only `BulletType.java` 608 was read; other callers not read, so this note describes the splash path as called from bullets only.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Flat armour with a floor, so it never zeroes a hit | floor 0.1 of the hit (`Vars.java` 133; used at `Damage.java` 664) |
| Splash falloff from centre to edge | full at centre, 0.4 at the edge (`Damage.java` 657-658) |
| Shield absorbs before health | no constant; `min(shield, amount)` (`ShieldComp.java` 66-69) |
| Per-hit cap as a share of max health | off by default (-1, `BulletType.java` 63); when on, cap = maxHealth * fraction + shield (495) |
| Armour pierce and multiplier | pierce default false (195); armour multiplier default 1 (197) |
| Knockback push scale | 80 * knockback * knockbackMultiplier (517); splash push divisor 2 / mass (534) |
| Splash radius default | -1, meaning no splash (`BulletType.java` 309) |

## 4. TypeScript sketch

simplified: the sketch covers the unit hit only: optional cap, armour (or pierce), shield then health, and the splash falloff as a separate function. It omits the lifesteal, the knockback impulse, the shield-break effect, the `healthMultiplier` and `unitHealth` rule (not read), the `armorOverride` and armour multiplier paths (kept only as the pierce flag), the building and tile paths, and the splash target filter. The order of operations follows the donor: cap, armour, shield, health.

```ts
// Licence: copyleft (GPL-3.0, donor LICENSE). Clean-room sketch of the described shape, not a translation.
// clean-room
export interface Target {
  health: number;
  shield: number;     // absorbs damage first
  armor: number;      // flat reduction per hit
  maxHealth: number;
  killable: boolean;
}

export interface HitRules {
  minArmorFraction: number;   // armour never removes more than (1 - this) of a hit
  maxDamageFraction: number;  // per-hit cap as a share of max health; <= 0 means no cap
  pierceArmor: boolean;
}

// Armour: a flat reduction with a floor, so armour never zeroes a hit.
export function applyArmor(damage: number, armor: number, minFraction: number): number {
  return Math.max(damage - armor, minFraction * damage);
}

// Splash: full damage at the centre, falling to 40% at the edge of the radius.
export function splashAmount(dist: number, radius: number, damage: number, edgeFloor = 0.4): number {
  if (radius <= 0.00001) return damage;
  const t = 1 - dist / radius;             // 1 at centre, 0 at edge
  const scaled = t + (1 - t) * edgeFloor;  // lerp from t toward 1 by edgeFloor
  return damage * scaled;
}

// One hit on one target: optional cap, then armour (unless pierced), then shield, then health.
// Returns the health lost.
export function applyHit(t: Target, raw: number, rules: HitRules): number {
  let damage = raw;
  if (rules.maxDamageFraction > 0) {
    damage = Math.min(damage, t.maxHealth * rules.maxDamageFraction + t.shield);
  }
  const amount = rules.pierceArmor ? damage : applyArmor(damage, t.armor, rules.minArmorFraction);
  const toShield = Math.min(Math.max(t.shield, 0), amount);
  t.shield -= toShield;
  const toHealth = amount - toShield;
  if (toHealth > 0 && t.killable) t.health -= toHealth;
  return toHealth > 0 ? toHealth : 0;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/q069-anuken-hit.ts`: exit 0.

## 5. Lands in

- TARGET `src/fight/damage.ts` (engine damage step). Parity-checklist row 1 (duel step / sim).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room shape only)
- Brief rule served: 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- GPL-3.0 is copyleft: clean-room only. The sketch is written from the mechanism, not translated.
- Shield is a second health pool. Under the one-ledger ruling, shield must be a server-owned field on the fighter, never a client number. Frankendom has stamina and guard, not a shield; adding one is a new ledger field, not a freebie.
- Splash is area damage over many units. Frankendom's fights are one-on-one with MAX_ATTACKERS = 3. The falloff only makes sense for effects that hit more than one enemy (for example a finisher that hits every attacker in range); it must not be used to add a second damage path to a duel.
- Knockback is a physics impulse (vector, mass). Frankendom uses a stagger state (row 3), so the vector does not transfer; only the rule "push falls with distance" might inform a stagger radius, as data.
- Health multiplier and the `unitHealth` rule (per team, per rules) were not read. Frankendom would express these as zone or difficulty data, not as donor constants.
- The per-hit cap rule (`maxDamageFraction`) is useful for boss-like fighters that must not die to one hit; in Frankendom this is a server rule on the fighter, not a per-bullet default.
- Where the donor runs this (client, server or both) was not read. Frankendom's kills are server-verified, so the server must run `applyHit` and the client only displays.
- Buildings (`BuildingComp` 1767) and tiles (`tileDamage`) are not part of this note; Frankendom has no building damage in the fight.

Best transferable idea: a flat armour with a floor (never more than 90% of a hit) plus shield-before-health gives soak without ever making a hit do nothing.
Decision (proposed): adapt - take the armour floor and the shield-first order as the gear-soak and guard-soak rule in the engine damage step; keep the splash falloff only for effects that hit several enemies; reject the knockback vector.
Acceptance: a server test asserts armour 30 vs a raw hit of 25 deals 2.5 (10% floor), a raw hit of 25 with armour 0 against shield 10 leaves shield 0 and loses 15 health, and an area hit deals 100% at the centre and 40% at the radius edge.
