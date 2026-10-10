# 00-Evan-shattered-pixel-dungeon (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/actors/Char.java` (attack 368-369 wrapper, 372-512 attack; hit 615-685; drRoll 701-705; damageRoll 709-711; attackSkill 689; defenseSkill 693), `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/actors/hero/Hero.java` (defenseSkill 568-580; defaults 219-220), `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/SPD-classes/src/main/java/com/watabou/utils/Random.java` (NormalIntRange 138-140), `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/actors/buffs/Barkskin.java` (currentLevel 119-125) | Licence: GPL-3.0 (LICENSE.txt is "Version 3, 29 June 2007"; Char.java header: "either version 3 of the License, or" and "(at your option) any later version") | Java | symbol `Char.attack` / `Char.hit`

Checked: Read `Char.attack` 372-512 in full except the code after `enemy.damage` (512-530, not read). Read `Char.hit` 615-685 in full. Read `Char.drRoll` 701-705 and `Char.damageRoll` 709-711. Read `Hero.defenseSkill` 568-580 (parry and guard branches); `Hero.attackSkill` 511 only as far as its first lines; `Hero.damageRoll` 669 only as far as its weapon branch; `Hero.drRoll` (643) NOT read. For a Hero target the armour roll comes from Hero.drRoll, so the armour numbers in this note are for base `Char` targets (monsters and others that do not override it; the override was not checked). Monsters: `Char.attackSkill` and `Char.defenseSkill` return 0 (689-694); if monsters do not override them, the base value 0 applies (monster overrides not read). `Random.NormalIntRange` and `Barkskin.currentLevel` read. Callers of `attack`: read the attack path only; callers of `hit`: read the attack call at 388 and the two-argument wrapper at 615-616; the other callers were not read. Candidates opened: Char.java, Hero.java, Random.java, Barkskin.java. Confidence: high on the hit roll and the order of the damage tail; medium on the Hero side (attackSkill and drRoll not read in full); the closed-form hit chance below is my derivation from the two uniform rolls, not a donor line. The donor is turn-based: there is no tick loop. Camera: not applicable. The one-line hit chance derivation is marked as derived where it appears.

## 1. Mechanism

- Order of one attack (Char.attack 372-512): (a) if the defender is invulnerable to this attacker class, the attack returns false before any roll (read, before line 388). (b) `hit( this, enemy, accMulti, false )` decides hit or miss (388). (c) On a hit: `dr = round( enemy.drRoll() x ascension modifier )` (390). For a Hero attacker with a missile weapon, a sniper subclass and a non-adjacent target, and for a Monk's unarmed ability, dr is set to 0 (read, lines 394-401: the sniper check at 394, dr = 0 at 397; the monk check, dr = 0 at 401). (d) Damage: a Preparation buff supplies its own roll (408-410); otherwise `damageRoll()` (415, base Char returns 1 at 710; Hero overrides it). Then `dmg = dmg x dmgMulti` (418), `dmg += dmgBonus` (421). (e) Multipliers, in code order: Berserk factor (433-434); Fury x1.5 (436-437); PowerOfMany x1.25, or BeamingRay x(1.3 + 0.05 x talent) when that boost targets this enemy (440-445); ChampionEnemy melee factor (449-451); ascension factor (453); the enemy's Endure (from 456); ScrollOfChallenge arena x0.67 (465-466); AuraOfProtection x(0.9 - 0.1 x talent) when within 2 tiles (469-472); Meditate x0.2 (476); Weakness x0.67 (479-480). (f) `effectiveDamage = enemy.defenseProc( this, round(dmg) )` (483): pre-armour absorbs (Earthroot armour, ShieldOfLight subtracts NormalIntRange(min, 2 x min); read but not detailed). (g) If the result is not negative: `effectiveDamage = max(effectiveDamage - dr, 0)` (486) — armour is a flat subtraction applied after every multiplier. Viscosity may defer damage (read, not detailed). (h) Vulnerable x1.33 (495; integer compound assignment, so it truncates). (i) `attackProc` (498). (j) If the enemy is still alive, `enemy.damage( effectiveDamage, this )` (512).
- The hit roll (`hit`, 619-685): `acuStat = attacker.attackSkill( defender )` (620); `defStat = defender.defenseSkill( attacker )`. Invisible attackers that can surprise get infinite accuracy; a defender with the Focus buff gets infinite evasion (read). If `defStat >= INFINITE_EVASION`, the attack misses (638-640). Else if `acuStat >= INFINITE_ACCURACY`, it hits. Otherwise `acuRoll = Random.Float( acuStat )` (646), multiplied by the attacker's Bless x1.25 (647), Hex x0.8 (648), Daze x0.5 (649), ChampionEnemy factors, the ascension factor (653), an ally Bless talent factor, and accMulti. `defRoll = Random.Float( defStat )` (662), multiplied by the defender's Bless x1.25 (663), Hex x0.8 (664), Daze x0.5 (665), ChampionEnemy factors, the ascension factor (669), an ally Bless talent factor and FerretTuft (676). The attack hits when `acuRoll >= defRoll` (678).
- Parry and guard (Hero.defenseSkill 568-580): while Combo.ParryTracker is active, defenseSkill returns INFINITE_EVASION (574), and, if the parrier can attack the enemy and is not charmed, it adds a RiposteTracker aimed at that enemy (570-574). While RoundShield.GuardTracker is active it also returns INFINITE_EVASION (577-578).
- Base armour roll (`drRoll`, 701-705): `dr = NormalIntRange( 0, Barkskin.currentLevel(this) )` (704). `NormalIntRange(min, max) = min + floor( (Float() + Float()) x (max - min + 1) / 2 )` (Random.java 139), so the result runs from 0 to the level and is peaked in the middle.

## 2. Key functions

- `Char.attack` (4-argument): `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/actors/Char.java` 372-512. The whole hit-to-damage pipeline. The one-argument wrapper is at 368-369 and calls it with 1, 0, 1 (read).
- `Char.hit` (4-argument): `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/actors/Char.java` 619-685. Infinite-stat checks, then the two-roll comparison with buff factors. The two-argument wrapper at 615-616 passes 2 for magic and 1 otherwise.
- `Char.drRoll` and `Char.damageRoll`: `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/actors/Char.java` 701-711. Base armour roll and base damage of 1.
- `Hero.defenseSkill`: `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/actors/hero/Hero.java` 568-580. Parry gives infinite evasion and a riposte tracker; the guard gives infinite evasion.
- `Random.NormalIntRange`: `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/SPD-classes/src/main/java/com/watabou/utils/Random.java` 138-140.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| A hit is two uniform rolls compared: attack roll in [0, acc) against defence roll in [0, ev) | Sentinel 1,000,000 for certain outcomes (Char.java 612-613); evasion wins when both are infinite |
| Closed form (derived, not a donor line): P(hit) = acc/(2 x ev) when acc <= ev; P(hit) = 1 - ev/(2 x acc) when acc > ev. So acc = ev gives 50 percent, acc = 2 x ev gives 75 percent, acc = ev/2 gives 25 percent | None: the rule is the same for any pair of stats |
| Armour roll triangular in [0, level] | Level from Barkskin.currentLevel (the highest active Barkskin level, Barkskin.java 119-125) |
| Armour is a flat floor-at-zero subtraction after multipliers | Floor 0 (Char.java 486) |
| Multipliers on the attack roll: Bless 1.25, Hex 0.8, Daze 0.5 (both sides) | Char.java 647-649 (attacker), 663-665 (defender) |
| Damage tail multipliers | Fury 1.5 (437); PowerOfMany 1.25 (445), BeamingRay 1.3 + 0.05 x talent (443); Aura 0.9 - 0.1 x talent (472); Meditate 0.2 (476); challenge arena 0.67 (466); Weakness 0.67 (480); Vulnerable 1.33 after armour (495) |
| Parry is infinite evasion for one defence | Hero.java 574 (parry), 578 (guard) |
| Default skills on the Hero | attackSkill 10 and defenseSkill 5 are field defaults (Hero.java 219-220); the methods were not read in full |

## 4. TypeScript sketch

simplified: keeps the hit check in donor order (infinite stats first, then the two-roll comparison) and the base damage tail in donor order: armour rolled first, then the multiplier and bonus, weakness, rounding, the flat armour floored at 0, then vulnerable truncation. It omits: the invulnerable check, the sniper and monk zeroing of armour, the buff table (Bless, Hex and Daze on both rolls, ascension, talents, FerretTuft), the Preparation and guiding-light paths, Fury, Berserk, PowerOfMany, ChampionEnemy, Endure, Aura, Meditate, the challenge arena factor, defenseProc (Earthroot, ShieldOfLight), Viscosity, attackProc, the KO path and imbues. The sketch replaces the donor's many multipliers with a single weakness flag, so it reproduces the order, not the full numbers.

```ts
// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const INFINITE = 1_000_000; // a stat at or above this is treated as certain: evasion wins, or accuracy wins

// Armour (donor: NormalIntRange(0, level)): floor((u1 + u2) * (level + 1) / 2), so 0..level, peaked in the middle.
function armourRoll(level: number, rng: () => number): number {
  if (level <= 0) return 0;
  return Math.floor((rng() + rng()) * (level + 1) / 2);
}

// Hit check: an attacker roll uniform in [0, acc) must reach a defender roll uniform in [0, ev).
function hits(acc: number, ev: number, rng: () => number): boolean {
  if (ev >= INFINITE) return false;
  if (acc >= INFINITE) return true;
  return rng() * acc >= rng() * ev;
}

// Damage after the hit: armour is rolled first but subtracted last, flat, after the multipliers, never below 0.
function resolveDamage(baseRoll: number, mult: number, bonus: number, weakened: boolean,
                       armourLevel: number, vulnerable: boolean, rng: () => number): number {
  const dr = armourRoll(armourLevel, rng);
  let dmg = baseRoll * mult + bonus;
  if (weakened) dmg *= 0.67;
  let effective = Math.round(dmg);
  effective = Math.max(effective - dr, 0);
  if (vulnerable) effective = Math.trunc(effective * 1.33); // int compound assignment truncates
  return effective;
}
```

## 5. Lands in

- TARGET `src/fight/hit.ts` (new, the hit check: accuracy against evasion with certain outcomes), with the flat armour tail in `src/fight/damage.ts` (the one place health changes). Parity-checklist row 1 (duel step / sim); the parry-as-evasion idea touches row 3 (guard/parry/stamina) and is not decided here.
- today: `src/combat.ts` (moving).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room, shape only)
- Brief rule served: 1 (one combat core, two clients); licence: clean-room, shape only

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism.
- Turn-based donor: there is no tick and no timing to borrow. The duel timing must come from Frankendom's own step.
- Client RNG (Random.Float, NormalIntRange) in the donor. Frankendom must roll both sides of the hit and the armour on the server from a fight seed, so both clients see the same result and kills stay server-verified.
- Parry as infinite evasion makes a parry a certainty for one attack. Frankendom's guard and stamina rules (row 3) must decide whether a parry is certain or costs stamina; do not copy the open-ended stat.
- Armour is applied after every multiplier and floors at 0. For a fast duel a flat armour can cancel a light hit completely; tune it as a catalogue field, and test it on the lightest attack.
- The order matters: armour is subtracted before the vulnerable x1.33, and the donor's pre-armour absorbs run before armour. The one engine must pin the order with a test (same lesson as cell 1).
- Hero side not read (drRoll 643, attackSkill beyond its first lines, damageRoll beyond the weapon branch). Monsters' attack and defence skills were not checked. Any port must be checked against those before the numbers are used.
- The closed-form hit chance is a useful tuning tool, but it is my derivation for the code as written, with the buff multipliers left out. Frankendom should check it with a server test, not trust the formula alone.

Best transferable idea: a hit check that compares two uniform rolls (attack against evasion), with a 1,000,000 sentinel for certain outcomes, gives a closed-form hit chance a designer can tune from two numbers.
Decision (proposed): adapt - take the two-roll hit compare and the sentinel for certain outcomes, rolled on the server from the fight seed; do not copy the open-ended parry stat or the armour-after-multipliers order without a guard-row ruling (row 3) and a test.
Acceptance: A server test with accuracy equal to evasion gives a hit rate of 50 percent over 10,000 seeded swings (within 1 percent); accuracy twice evasion gives 75 percent; a defender with an active parry is never hit; the same seed gives the same result on both clients.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room, shape only)
Brief rule served: 1 (one combat core, two clients)
