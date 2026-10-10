# ModernUO (creature-grammar, CG007)

Donor/Licence: ModernUO. Code is GPL-3.0 (LICENSE, per asset audit AU034). No asset licence, and no art or audio in the box. Clean-room, shape only. No donor numbers are written into the data fields.
Verdict: STRONG. Confidence high on the code read. Half read: server (code). The stats are coded in constructors; no creature data table in the box. Client art: not in the box.
Checked (files opened): Mobiles/Monsters/Ants (Solen family: RedSolenWarrior, BlackSolenWarrior, RedSolenQueen, RedSolenInfiltratorWarrior, SolenHelper); Mobiles/Monsters/Reptile (Slith, ToxicSlith, StoneSlith); Mobiles/Monsters/Reptile/Magic (Dragon, SkeletalDragon, ShadowWyrm); Mobiles/Abilities (MonsterAbility.cs, Fire Breath/FireBreath.cs, ColdBreath.cs, ChaosBreath.cs); Mobiles/BaseCreature.cs (lines 1501-1595). Counts: Monsters has 288 .cs files; 57 files reference GetMonsterAbilities; 56 files assign a random or fixed hue.
Best transferable idea: one class per creature role holding a body id, an optional hue, a stat band and an ability array, so a few families plus data rows yield many creatures.

## 1. What the player sees and feels (375 wide)
A colony of insect-like creatures reads as one family. The red colony and the black colony share a silhouette, but the black one is a different body with a tint. Workers are the small, quick-to-kill ones. Warriors use a neighbouring body id with more HP and a visible acid sac, which bursts once below half HP: a one-time overhead line appears, and then the creature squirts acid at anyone who stands adjacent. Queens are a bigger body and drop a summon item instead of the warrior's binding bracelet. Each role has its own sound set (idle, anger, attack, hurt, death). The dragon family signals a breath with an anger animation and a sound, stands still for about a second, releases a projectile, and deals damage a second later, sized to how much HP the dragon has at that moment.

## 2. Why it works, or is striking
- Readable silhouette: the tiers change the body id, and one tier adds a hue. A player can tell the family apart from the tier.
- One signature behaviour: the half-HP sac burst followed by the adjacent acid squirt. It is a clear beat with a message.
- One signature sound: each role has its own sound set, and the queen's set differs from the warrior's.
- Could be made ours at 20-30 percent resemblance: yes. Keep the family shape, the half-HP beat and the breath stall. Change the creature kind, names, colours and element.

## 3. The rule behind it
Three knobs make the family, all visible in the code:
- Recolour tier: the same family changes body id and/or hue. Black warrior: a different body id plus a hue. Toxic slith: the same body id plus a hue, a stat jump, and a poison resist.
- Scale tier: the same body id with a bigger stat band. Red infiltrator warrior: strength band +10, dexterity +20, intelligence +30, magic resist 80 (warrior 60). Queen: body id changed and the strength band about 1.5x. Stone slith: the slith body id with the strength band about 2x.
- Swapped ability: one ability slot per class (GetMonsterAbilities). Slith: fire breath. Stone slith: two abilities (grasping claw, tail swipe) plus a weapon bleed. Skeletal dragon: a subclass of the fire breath that changes only the damage type to cold (ColdBreath.cs lines 3-7). Shadow wyrm and skeletal dragon use the same strength band (898-1030) and the same hits band.
- Reward swap: the queen's summon item replaces the warrior's binding bracelet (5 percent gate in the warrior). The stone slith claw is a 0.5 percent roll.

Ability runtime (shared by all families above):
- Each trigger rolls ChanceToTrigger (MonsterAbility.cs line 47).
- Cooldown is per creature: the next trigger time is random between a min and a max (MonsterAbility.cs line 66).
- A bit guard stops a trigger from firing inside itself (BaseCreature.cs line 1561).
- Breath: chance 0.5, cooldown 30 to 45 s, not while summoned (FireBreath.cs lines 10, 13-14, 48). Stall: the creature's next move is pushed back 1.0 s (line 83). Effect callback after the effect delay (line 60). Damage callback 1.0 s after the effect (line 108).
- Damage at impact = the creature's current HP times a scalar: 0.16 under the AOS ruleset, 0.05 otherwise. A paragon divides the result. Capped at 200 (FireBreath.cs lines 17, 209, 216). The HP is read at impact, not at wind-up.

DATA FIELDS (donor values are null because the code is GPL):
| name | unit | donor_value_or_null |
|---|---|---|
| family_id, variant_id | string | null |
| body_model_id | client model id | null |
| hue_id (optional) | palette index | null |
| str_band_min, str_band_max, dex_band, int_band | points | null |
| hp_band_min, hp_band_max | points | null |
| damage_band_min, damage_band_max | points | null |
| resist_band (per damage type) | % | null |
| ability_slot[] | ability ids | null |
| ability.chance_to_trigger | 0 to 1 | null |
| ability.cooldown_min_s, ability.cooldown_max_s | seconds | null |
| ability.stall_s | seconds | null |
| ability.telegraph_to_effect_s, ability.effect_to_impact_s | seconds | null |
| ability.hp_scalar | fraction of current HP | null |
| ability.damage_cap | points | null |
| rare_drop_chance | 0 to 1 | null |
| faction_id, friendship_revoke_on_hit | string, bool | null |

Sketch typechecked on the VPS (npx tsc --noEmit --strict --target es2020, exit 0).
simplified: the sketch keeps the impact-time damage and the range re-check; it omits the stall timer, evasion roll, chaos element roll and the projectile.

```ts
export interface AbilitySlot { id: string; chanceToTrigger: number; cooldownMinS: number; cooldownMaxS: number;
  stallS: number; telegraphToEffectS: number; effectToImpactS: number; hpScalar: number; damageCap: number; }
export interface BreathImpact { creatureHpAtImpact: number; paragonDivisor: number;
  targetInRangeAtImpact: boolean; targetInLosAtImpact: boolean; targetAlive: boolean; }
export function resolveBreath(a: AbilitySlot, s: BreathImpact): number {
  if (!s.targetAlive || !s.targetInRangeAtImpact || !s.targetInLosAtImpact) return 0;
  const raw = Math.floor((s.creatureHpAtImpact * a.hpScalar) / s.paragonDivisor);
  return Math.min(raw, a.damageCap);
}
```

## 4. For Frankendom
- Mapping: about 12 families with recolour, scale and swapped-ability variants give about 100 Pit characters. A family is one row; a variant is a row holding body id, hue, stat band and an ability slot. The 700 zones reference variant ids only, and variants share the ability library (breath, claw, bleed).
- Target file: src/fight/creature-ability.ts (new). Parity row 13 (specials) for the ability slot. Presentation: row 7 (creature actor/clips: the anger animation) and row 12 (combat sound cues). Server tick sub-line: "server tick: fixed step, input intake, per-tick NPC budget"; the telegraph timers run on the fixed step (row 18 / post-K item 3).
- Many-vs-one: the donor breath is single-target. Keep one active breath per creature (the bit guard). Target choice comes from the engine hate list, capped at MAX_ATTACKERS = 3.
- Server-verified: the chance roll, the cooldown, the HP read at impact, and the range check all happen on the server. The client only plays the telegraph: anger animation, stall, projectile, impact.
- Keep: one class per role becomes one data row per role; the order telegraph, stall, projectile, then damage read from current HP; the half-HP beat; per-source cooldown; the re-entrancy guard.
- Change:
  1. Defect: the donor's breath damage callback checks only that the target is alive and harmful, not its range or line of sight at impact (FireBreath.cs lines 138 and 147). Fix: re-check range and line of sight at impact, as the sketch does.
  2. Duplication: the black and red warriors are two classes whose loot rolls give the same odds, with the random branch flipped (receipts). Fix: one class with a colony parameter.
  3. Numbers sit in constructors. Fix: move them into data rows.
  4. Friendship: the donor revokes a colony's friendship on one hit. Fix: warn first with a telegraphed line, then revoke as one ledger entry.

## 5. A 5-minute look test Dom can judge on his phone
Stage three creatures from one family side by side at 375 wide: (a) a base creature with a fire-breath slot; (b) its recolour (same body, hue shift, same ability); (c) an elite (bigger body id, about 2x the stat band, two abilities, a 1.5 s telegraph with a visible stall). Dom judges three things: does (b) read as the same family at a glance; does (c) read as an elite before the breath lands; is the breath readable in one second. Compare with one unrelated stock creature. Built as a style flag on the existing scene: no release rows.

## 6. Licence and IP
Code is GPL-3.0 (AU034). The box has no art. Creature names, sounds and item classes are not copied. Recreate as a distinct original: keep the role ladder (small, mid, large body in one silhouette family) and the half-HP beat; change the species, names, colours, sound sets and breath element. No legal conclusion.

## 7. Gaps
- Half read: server (code). Client art: not in the box. Creature stat data: none as a table; values are in code.
- Not read: 276 of 288 monster files; the Animals tree (82 files); the AI folder; the item classes behind drops; the spill routine (SpillAcid) and the evasion routine; MonsterAbilityGroup; ChaosBreath beyond its one-line subclass.
- Death presentation: the warrior's death calls a spill with count 4 (routine not read). Respawn: not read.
- Idle: the donor gives each role an idle sound (GetIdleSound). Idle animation: not read.
- Loot ceremony: loot packs named in code; the ceremony is not in the box (not read).
- Walk density: spawner data is in AU034 (row 23); not repeated here.
- Readability at 375: no art in the box, so silhouette is inferred from body ids only. Not seen.
- Several classes carry TODO notes that drops are not ported (SlithEye and similar items); the drops are stubs in this donor.
- Checked against the rulings: row 13 (specials), row 7, row 12, row 18 / post-K item 3 sub-line. Row 23 is cross-referenced only.

Reuse tag: creature-family grammar, plus the ability library (breath, claw, bleed) reused across families.
Brief rule served: donor-games-first (a fighting-game-shaped mechanism in an MMO server donor), with the Frankendom rulings on engine-owned ability logic.

```json
{"donor":"ModernUO","topic":"creature-grammar","depth":"full","half_read":"server",
 "paths":["/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/Monsters/Ants/","/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/Monsters/Reptile/","/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/Monsters/Reptile/Magic/","/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/Abilities/","/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/Abilities/Fire Breath/FireBreath.cs","/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/BaseCreature.cs"],
 "counts":{"monsters_cs":288,"animals_cs":82,"abilities_files":33,"files_using_GetMonsterAbilities":57,"files_random_or_fixed_hue":56,"solen_family_files":12,"slith_family_classes":3,"dragon_family_classes_read":6},
 "rule":"Family = one class per role with a body id, optional hue, stat band and an ability array (GetMonsterAbilities). Variation comes from recolour (body id and/or hue), scale (same body, bigger stat band) and swapped ability (one slot per class, or a subclass that changes one damage type). Ability runtime: chance roll, per-creature random cooldown, re-entrancy bit guard; breath = stall, delayed effect, delayed damage read from current HP with a cap.",
 "data_fields":[
  {"name":"family_id","unit":"string","donor_value_or_null":null},
  {"name":"body_model_id","unit":"client model id","donor_value_or_null":null},
  {"name":"hue_id","unit":"palette index","donor_value_or_null":null},
  {"name":"str_band_min/max","unit":"points","donor_value_or_null":null},
  {"name":"hp_band_min/max","unit":"points","donor_value_or_null":null},
  {"name":"ability.chance_to_trigger","unit":"0-1","donor_value_or_null":null},
  {"name":"ability.cooldown_min_s/max_s","unit":"seconds","donor_value_or_null":null},
  {"name":"ability.stall_s","unit":"seconds","donor_value_or_null":null},
  {"name":"ability.telegraph_to_effect_s","unit":"seconds","donor_value_or_null":null},
  {"name":"ability.effect_to_impact_s","unit":"seconds","donor_value_or_null":null},
  {"name":"ability.hp_scalar","unit":"fraction of current HP","donor_value_or_null":null},
  {"name":"ability.damage_cap","unit":"points","donor_value_or_null":null},
  {"name":"rare_drop_chance","unit":"0-1","donor_value_or_null":null}],
 "keep":["one class per role becomes one data row per role","telegraph, stall, delayed effect, damage read at impact from current HP","half-HP beat with overhead line","per-creature random cooldown and chance roll","re-entrancy guard on triggers","ability library reused across families"],
 "change":["breath impact has no range or line-of-sight re-check (FireBreath.cs 138, 147): re-check at impact","black and red warriors duplicated with flipped loot branch and identical odds: one class with colony parameter","numbers in constructors: move to data rows","friendship revoked on one hit: warn first, then revoke as one ledger entry"],
 "look_test":"Three creatures from one family at 375 wide: base, recolour (same body, hue shift), elite (bigger body, two abilities, 1.5 s telegraph with stall). Dom judges family read, elite read, breath readable in one second; compare with one stock creature. Style flag, no release rows.",
 "licence_note":"GPL-3.0 code (AU034); no assets in the box. Clean-room, shape only; no names, sounds or item classes copied.",
 "tags":["creature-family","recolour-tier","scale-tier","swapped-ability","ordered-feedback","naming-grammar","faction-map"],
 "not_read":["276 of 288 monster files","Animals tree","AI folder","item classes for drops","SpillAcid routine","Evasion routine","MonsterAbilityGroup","ChaosBreath beyond subclass line","client art (none in box)"]}
```
