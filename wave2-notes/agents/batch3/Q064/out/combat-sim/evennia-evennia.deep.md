# evennia-evennia (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/objects.py` (with `rules.py`, `combat_base.py`, `characters.py`, `equipment.py`, `npcs.py`, `combat_turnbased.py`) | Licence: BSD 3-Clause License (`LICENSE.txt` line 1; adaptation allowed) | Python (Evennia contrib, Knave-based ruleset) | symbol `EvAdventureWeapon.use`

Checked: The hint file `tests/test_combat.py` is a test. I read its attack cases (141-157 and 442-451) and used them to confirm the numbers, not as the mechanism. The mechanism was read in full: `EvAdventureWeapon.use` (`objects.py` 221-263, the whole attack function), `EvAdventureRollEngine.roll`, `roll_with_advantage_or_disadvantage`, `saving_throw`, `opposed_saving_throw` (`rules.py` 26-67, 69-88, 90-155, 157-202), `CombatActionAttack.execute` (`combat_base.py` 120-129), the defence property `Equipment.armor` (`equipment.py` 130-153), `LivingMixin.at_damage` and `at_defeat` context (`characters.py` 65-85, 195-196), the NPC overrides (`npcs.py` 21, 129-134, 241-249, 351-356), and the defeat check in `EvAdventureTurnbasedCombatHandler.check_stop_combat` (`combat_turnbased.py` 320-330). Not read: `has_advantage` and `give_advantage` in full (`combat_base.py` 412-449), `at_repeat` turn timing (`combat_turnbased.py` 368-398), `combat_twitch.py` queueing (173-220), the player death table (`rules.roll_death`, 292, and `characters.py` 252), and `CmdAttack`. Test-based check: I ran the same rules in a node script on the VPS (defence 11 unarmoured; roll 11 with bonus 1 hits, roll 8 misses; natural 20 with bonus 0 against defence 30 misses with no damage; natural 1 with bonus 11 against defence 11 hits for 4 with no quality loss; critical success on a hit rolls the dice twice; advantage keeps the higher roll, disadvantage the lower, both cancel). All matched. camera_scope: not applicable (combat topic). Confidence: high on the attack and damage chain; this is not a tick or timing topic. Verdict is STRONG because the chain is short, complete and self-contained, though the mechanism is a tabletop d20 check, not a real-time one.

Best transferable idea: one opposed check per swing (d20 plus the attacker's bonus, strictly above the defender's armour plus 10), where a natural 20 doubles only the weapon's dice on a hit and a natural 1 that misses costs one point of weapon quality.
Decision (proposed): reject - Frankendom's hit model is the clamped percent roll proposed from the Daggerfall note (src/fight/hit.ts, parity row 1), and a second d20 model would split the hit rule; the weapon-quality decay is not in the parity checklist rows 1-22, so there is no row for it.
Acceptance: if it were built, a server test with a fixed seed would assert that a natural 20 that lands adds one extra roll of the weapon dice and no bonus; not planned.

## 1. Mechanism

- One attack is one call. `CombatActionAttack.execute` (`combat_base.py` 120-129) checks `weapon.at_pre_use` (125) and calls `weapon.use(attacker, target, advantage=...)` (126-127). `EvAdventureWeapon.use` (`objects.py` 221-263) is the whole resolution.
- Order of steps, as the code runs:
  (a) Opposed check: `rules.dice.opposed_saving_throw(attacker, target, attack_type=self.attack_type, defense_type=self.defense_type, advantage, disadvantage)` (`objects.py` 226-233). Weapon defaults are STR for the attack and ARMOR for the defence (`objects.py` 192-194).
  (b) Defence: `defender_defense = getattr(defender, "armor", 1) + 10` (`rules.py` 190). The defender's `armor` property returns `equipment.armor` (`characters.py` 195-196), which sums body armour (default 1 when there is no body armour), shield (default 0) and helmet (default 0) (`equipment.py` 146-151). Unarmoured, the defence is 11.
  (c) Dice: one d20 by default; advantage rolls two and keeps the higher, disadvantage keeps the lower; both together cancel to one roll (`rules.py` 82-88).
  (d) Crit flags (not yet hit or miss): a natural 1 sets critical failure (127-128) and a natural 20 sets critical success (129-130).
  (e) Hit test: `(dice_roll + bonus + modifier) > target` (`rules.py` 133 and 155). The bonus is `getattr(character, bonus_type.value, 1)` (125). So a natural 20 can still miss if the total is not above the defence, and a natural 1 can still hit if the bonus is large enough. The critical flags are not used in the hit test.
  (f) Hit (`objects.py` 239-254): damage = roll of the weapon's dice (`damage_roll`, default "1d6", 195 and 241). A critical success rolls the same dice again and adds it (243-245). No ability bonus is added to damage in this path. The target gets `at_damage(dmg, attacker)` (254).
  (g) Miss (256-263): a critical failure costs one point of weapon quality (259-262). Nothing else happens.
- Damage application: `LivingMixin.at_damage` subtracts the damage from hp (`characters.py` 72-77). `EvAdventureNPC` inherits it (`npcs.py` 21). Talkative NPCs (129-134) and shopkeepers (241-249) override it to take no damage. `EvAdventureMob` does not override it (grep of the module).
- Defeat: `EvAdventureTurnbasedCombatHandler.check_stop_combat` (`combat_turnbased.py` 320-330) finds every combatant with `hp <= 0` (325), calls `at_defeat()` (328) and moves it to the defeated list. A mob's `at_defeat` calls `at_death` at once, with no death-table roll (`npcs.py` 351-356). Player characters use a different `at_defeat` (`characters.py` 252, not read).
- Tick: this is not a tick topic. The attack itself is synchronous, one call per action. Turn timing is in `combat_turnbased.py` 368-398 (not read).

## 2. Key functions

- `EvAdventureWeapon.use`: `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/objects.py` 221-263. The check, the damage, the crit rules and the quality loss.
- `EvAdventureRollEngine.opposed_saving_throw`: `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/rules.py` 157-202. Defence = armour + 10, then the roll.
- `EvAdventureRollEngine.saving_throw`: `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/rules.py` 90-155. The d20, the bonus, the crit flags and the strict comparison.
- `Equipment.armor`: `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/equipment.py` 130-153. The defence sum and its defaults.
- `EvAdventureTurnbasedCombatHandler.check_stop_combat`: `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/combat_turnbased.py` 320-330. The defeat check.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Opposed check: d20 + attacker bonus must be strictly above defender's armour + 10 | Base 10 (`rules.py` 190); attacker bonus defaults to 1 (125) |
| Unarmoured defence | Body armour default 1 gives defence 11 (`equipment.py` 148) |
| Shield and helmet add to defence | Defaults 0 (`equipment.py` 150-151) |
| Advantage keeps the higher of two d20, disadvantage the lower; both cancel | `rules.py` 82-88 |
| Natural 20 = critical success; natural 1 = critical failure (flags) | 20 (129) and 1 (127) |
| Critical success on a hit: the dice are rolled again and added; the bonus is not | `objects.py` 243-245 |
| Critical failure on a miss costs one point of weapon quality | `objects.py` 259-262 |
| Weapon damage is a dice string, default 1d6 | `objects.py` 195 |
| Defeat at hp <= 0; mobs die at once | `combat_turnbased.py` 325; `npcs.py` 356 |

## 4. TypeScript sketch

simplified: keeps the defence sum, the d20 with advantage and disadvantage (both together cancel), the strict comparison, the natural 1 and 20 flags, the crit doubling of the weapon dice (not the bonus), and the quality loss on a critical miss only. It omits the modifier argument, weapon range and `at_pre_use`, the stored advantage (`has_advantage` and `give_advantage` are not read in full), stunts, fleeing, the death table and the turn timer. It does not add the ability bonus to damage, which matches the donor's `use` (`objects.py` 241-250).

```ts
// Licence: BSD 3-Clause (donor). Written fresh from the mechanism, not a translation of the donor lines.
export type Crit = "success" | "failure" | null;

export interface Fighter {
  abilityBonus: number; // the attack ability's bonus (donor default 1, rules.py 125)
  bodyArmour: number;   // body armour value; 1 when there is no body armour (equipment.py 148)
  shield: number;       // shield bonus; 0 when none (equipment.py 150)
  helmet: number;       // helmet bonus; 0 when none (equipment.py 151)
}

export interface AttackResult {
  hit: boolean;
  crit: Crit;  // natural 20 = success, natural 1 = failure (rules.py 127-130); flags only
  roll: number;
}

// Defence = sum of the armour parts + 10 (rules.py 190; unarmoured = 11).
export function defence(t: Fighter): number {
  return t.bodyArmour + t.shield + t.helmet + 10;
}

// One d20. Advantage keeps the higher of two, disadvantage the lower; both together cancel (rules.py 82-88).
// rnd returns an integer 1..20.
export function d20(adv: boolean, dis: boolean, rnd: () => number): number {
  if ((!adv && !dis) || (adv && dis)) return rnd();
  const a = rnd();
  const b = rnd();
  return adv ? Math.max(a, b) : Math.min(a, b);
}

// Hit when roll + bonus is strictly above the defence (rules.py 155).
// The donor also adds an optional modifier argument, omitted here.
export function attack(att: Fighter, def: Fighter, adv: boolean, dis: boolean, rnd: () => number): AttackResult {
  const roll = d20(adv, dis, rnd);
  const crit: Crit = roll === 20 ? "success" : roll === 1 ? "failure" : null;
  const hit = roll + att.abilityBonus > defence(def);
  return { hit, crit, roll };
}

// Damage on a hit: roll the weapon dice; a critical success rolls them a second time and adds it.
// The ability bonus is not added (objects.py 241-250). A miss does no damage.
export function damageOnHit(res: AttackResult, rollWeaponDice: () => number): number {
  if (!res.hit) return 0;
  let dmg = rollWeaponDice();
  if (res.crit === "success") dmg += rollWeaponDice();
  return dmg;
}

// Weapon quality loss: only a critical failure on a miss costs one point (objects.py 259-262).
export function qualityAfter(res: AttackResult, quality: number): number {
  return !res.hit && res.crit === "failure" ? quality - 1 : quality;
}
export {};
```

Checks run on the VPS (node, compiled from the sketch): defence of an unarmoured fighter = 11; roll 11 with bonus 1 hits, roll 8 misses; natural 20 with bonus 0 against defence 30 misses with crit success and no damage; natural 1 with bonus 11 against defence 11 hits for 4 with crit failure and no quality loss; a natural 20 that hits with dice 3 and 5 does 8; a natural 1 that misses drops quality from 3 to 2; advantage on 4 and 17 gives 17; disadvantage gives 4; advantage with disadvantage uses one roll (9). All as expected.

## 5. Lands in

- TARGET `src/fight/hit.ts` (the same engine module as the Daggerfall note; a reference only). Parity-checklist row 1 (duel step / sim). Not adopted: the d20 model would be a second hit model beside the clamped percent roll.
- Reuse tag: reference-only (BSD 3-Clause; nothing adopted)
- Brief rule served: 1 (one engine: this donor also resolves each swing in one function); rule 7 (BSD 3-Clause: adaptation allowed, not needed here).

## 6. Gaps and risks

- Client-side resolution: `EvAdventureWeapon.use` rolls the dice in the attacker's process and calls `target.at_damage` directly (`objects.py` 226-254). There is no network layer in the functions read. Frankendom's server-verified kills rule means the roll must run on the server; this donor has no server split to copy.
- One ledger: damage is taken through `at_damage` (`characters.py` 72-77), and NPC classes override it to take nothing (`npcs.py` 129-134, 241-249). The donor uses per-class overrides rather than one ledger. Frankendom would have one place.
- Two defeat paths: mobs die at once (`npcs.py` 351-356); player characters use a death table (`characters.py` 252 and `rules.roll_death` 292, not read). A Frankendom zone with a mob type is data, not a class override.
- The natural 1 and natural 20 flags do not decide the outcome on their own: a natural 1 can still hit (`rules.py` 155) and a natural 20 can still miss. Do not describe the crits as automatic hits or misses in player-facing text.
- Weapon quality decay is not in the parity checklist (rows 1-22). Adopting it would need a new row or a data field on the weapon.
- MAX_ATTACKERS = 3: this donor's `use` has no attacker cap in the functions read (no cap was grepped for). Do not read the d20 model as a fight-size rule.
- Not read: `has_advantage` and `give_advantage` (`combat_base.py` 412-449), turn timing (`combat_turnbased.py` 368-398), twitch queueing (`combat_twitch.py` 173-220), the player death table (`characters.py` 252, `rules.py` 292), and `CmdAttack`.
