# openmw (character-stats-skills, cell 1)

Donor: `/mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/` (stat.cpp, creaturestats.cpp, actors.cpp, combat.cpp, npcstats.cpp, spellutil.cpp, spellresistance.cpp), `/mnt/frankendom-donors/openmw/apps/openmw/mwclass/npc.cpp`, `/mnt/frankendom-donors/openmw/files/data-mw/scripts/omw/playerskillhandlers.lua`, `/mnt/frankendom-donors/openmw/files/data/scripts/omw/skillhandlers.lua` | Licence: GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007 (LICENSE file line 1-2), so GPL-3.0 (copyleft) | C++ and Lua | symbols: `Stat<T>`, `DynamicStat<T>`, `AttributeValue`, `CreatureStats::getFatigueTerm`, `getHitChance`, `getEvasion`, `blockMeleeAttack`, `getHandToHandDamage`, `applyFatigueLoss`, `getSpellSuccessChance`, `getEffectResistance`, skill-use Lua handler `skillUsedHandler`

Checked: camera_scope n/a (stats topic). Read in full: stat.cpp (all), playerskillhandlers.lua (all), skillhandlers.lua (all), creaturestats.cpp 30-160 and 300-417, actors.cpp 107-120, 395-420, 866-960, combat.cpp 71-180, 224-262, 316-350, 452-554, npc.cpp 548-680 and 733-790 (partial onHit), npcstats.cpp 165-300, spellutil.cpp 86-94 and 196-303, spellresistance.cpp 1-73, luamanagerimp.cpp 706-725, character.cpp 384-396. Default GMST values read from the value lines of `apps/opencs/model/world/defaultgmsts.cpp` (the Morrowind install can override them through its ESM; not read here). NOT read: the level-up attribute picker in the level-up GUI, `getTotalCost`, the per-skill `skillGain[]` numbers (in the game ESM, not in the repo), `Combat` Lua interface (`files/data/scripts/omw/combat/interface_local.lua`, only comments read), `Class::getNormalizedEncumbrance` body (only its comment), `Actors::update` caller of `updateActor` (so the unit of `duration` is not confirmed). Confidence: high on the hit, block, spell and skill formulas (all read); medium on fatigue regen units. Depth: full for the stat, fatigue, hit, damage and skill-use chain.

## 1. Mechanism

- **Ledgers.** An attribute is `base - damage + modifier`, floored at 0 (stat.cpp 128). A negative modifier is not stored as a negative: it is converted to damage (stat.cpp 151-155), so a drain can be healed back by `restore` (stat.cpp 164-170). A pool (health, magicka, fatigue) is a `DynamicStat`: `base` and `modifier` give the max, `current` is the spendable value. `setCurrent` can rise only up to the max unless the caller passes `allowIncreaseAboveModified` (stat.cpp 69-91).
- **Derived pools, recalculated on change.** Fatigue max = Strength + Willpower + Agility + Endurance (creaturestats 139-152); when one of the four changes, the current/max ratio is kept (line 149-151). Magicka max = factor x Intelligence, factor = 1.0 for the player and 2.0 for NPCs (creaturestats 402-414; defaults 1779, 1776), plus 0.1 per point of Fortify Maximum Magicka (creaturestats 409-410). Health base = floor(0.5 x (Strength + Endurance)) (npcstats 248-254).
- **Fatigue as a tired-body multiplier.** `getFatigueTerm() = 1.25 - 0.5 x (1 - current/max)`, so it runs from 0.75 (empty) to 1.25 (full). When max floors to 0 the normalised value is set to 1 (creaturestats 39-52). Fortify can push current above max and the function does not clamp that (creaturestats 44 uses `max(0, current/max)`, no upper clamp; the read did not find a clamp elsewhere). The term multiplies: evasion (creaturestats 329-331), attacker hit term (combat 345), blocker and attacker block terms (combat 123, 132), spell success chance (spellutil 297) and spell resistance (spellresistance 47). A fatigue below zero is knockout (character 388).
- **Hit chance (order of steps, as read).** (a) defence = evasion = (Agi/5 + Luck/10) x fatigueTerm + min(100, Sanctuary) (creaturestats 329-332); (b) attack = (weapon skill + Agi/5 + Luck/10) x attacker fatigueTerm, then + Fortify Attack - Blind (combat 343-347); (c) chance = round(attack - defence), with no clamp (combat 349; defence set at combat 333). A melee swing rolls `roll0to99 < chance` to hit (npc 568-570). A projectile misses when `roll0to99 >= chance` (combat 244). Both rolls use the same chance.
- **Damage, order of steps for a weapon hit.** (a) weapon range picked by attack type and interpolated by attack strength (npc 611-620); (b) weapon condition scales damage (combat 457-461); (c) damage x (fDamageStrengthBase + Strength x fDamageStrengthMult x 0.1), i.e. x (0.5 + 0.01 x Str) by default (combat 463-475); (d) resistance, werewolf, on-hit enchantments and shields; (e) critical x4.0 when the attacker is the player and the target is unaware (npc 636-650); knocked-down target x1.5 for any attacker (npc 659-660); (f) block (below); (g) god-mode zeroes damage for the player (npc 670-671).
- **Hand-to-hand is non-lethal first.** Hand-to-hand damage = HandToHand skill x (0.1 + 0.4 x attackStrength) (combat 482-485), optionally x Str/40 (combat 495-501, behind a setting). It is marked as health damage only when the victim is paralysed or knocked down (combat 488); otherwise the damage goes to the `fatigue` key of the hit (luamanagerimp 712-715; npc 757 applies it to fatigue). Health damage from hand-to-hand is multiplied by fHandtoHandHealthPer = 0.1 (combat 509-513).
- **Fatigue spend.** A swing costs 2.0 + encumbrance x 0.0 + weight x attackStrength x 0.25 (combat 548-551, npc 582). A block costs 4.0 + min(1, encumbrance) x 0.0 + weight x attackStrength x 1.0 (combat 158-168). Current can drop below zero (fatigue loss passes `allowDecreaseBelowZero` true, npc 757), and below zero is knockout (character 388).
- **Block (contest, then cost).** blockTerm = (Block skill + 0.2 Agi + 0.1 Luck) x (attackStrength x 1.0 + 1.0) x (1.25 if the blocker's forward movement is zero or less) x blocker fatigueTerm (combat 109-123). attackerTerm = (weapon skill + 0.2 Agi + 0.1 Luck) x attacker fatigueTerm (combat 125-132). Chance = clamp(int(blockTerm - attackerTerm), 10, 50) (combat 134-136). On success: shield durability loses int(damage) (combat 151-154), fatigue as above, and the Block skill is used (combat 172-173). The block also needs the blocker not to be knocked down, hit-recovering or paralysed (combat 79-81), and not in knockout (character 388-391).
- **Spell success (cast chance).** base = 2 x school skill - spell cost + 0.2 Willpower + 0.1 Luck (spellutil 247, 262). Final = (base - Sound) x caster fatigueTerm, clamped 0-100 when capped (spellutil 295-300). Current magicka below cost gives 0 (spellutil 289-290).
- **Spell resistance.** x = (Willpower + 0.1 Luck) x fatigueTerm x 50/castChance (spellresistance 47-54). roll = random 0-100 (57). If x <= roll there is no roll-based resistance; else the roll-based part is roll / min(x, 100), a fraction in 0-1 (spellresistance 61-68). Final = min(part + resistance attribute percent, 100) (71). Effect multiplier = 1 - final/100 (spellresistance 26).
- **Skill use (progress ledger).** Each use adds `gain / requirement` to the skill's progress, where requirement = (base + 1) x type factor, type factor = fMajorSkillBonus 0.75, fMinorSkillBonus 1.0, else fMiscSkillBonus 1.25, times fSpecialSkillBonus 0.8 when the skill is in the class specialisation (playerskillhandlers 20-38; defaults 1762, 1772, 1775, 1811). Gain per use = the skill record's `skillGain[useType]` (skillhandlers 66). A positive gain is refused at base 100 (playerskillhandlers 161-163). When progress reaches 1 the skill goes up by 1 (166-170), and the progress is then set to 0 (115), so any overshoot past 1 is dropped (defect D1).
- **Level and jail.** A skill level-up adds to the class level progress (iLevelupMajorMult / MinorMult, defaults 1), `NpcStats::levelUp` subtracts iLevelUpTotal (default 10, defaults 1950; npcstats 228); the caller that triggers levelUp was not read. Level-up health: +Endurance x 0.1 to base and current, current floored at 1 (npcstats 239-243). Jail: one random skill loses 1 per day, except sneak and security (playerskill 57-58, 119-136).
- **Luck is a real stat.** It enters the hit attack term (Luck/10, combat 344), evasion (Luck/10, creaturestats 330), block terms (0.1 x Luck, combat 111, 131), cast chance (0.1 x Luck, spellutil 262) and spell resistance (0.1 x Luck, spellresistance 47).
- **Regeneration.** Awake fatigue: x = 2.5 + 0.02 x Endurance, added as duration x x, skipped while current >= base (actors 945-947 and 956-958; defaults 1713, 1714). Sleeping: health +0.1 x Endurance per hour (actors 114, 877-881); magicka +0.15 x Intelligence per hour (actors 117; default 1797); fatigue x = (2.5 + 0.02 x (1 - encumbrance)) x (0.04 x Endurance), gained as 3600 x x x hours (actors 929-932; defaults 1699, 1713, 1714).

## 2. Key functions

- `Stat<T>::getModified`, `AttributeValue::getModified/setModifier/damage/restore`, `DynamicStat::setCurrent`: `/mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/stat.cpp` 22-28, 126-170, 69-91.
- `CreatureStats::getFatigueTerm`, `getEvasion`, `setAttribute` (fatigue max recalc), `recalculateMagicka`: `/mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/creaturestats.cpp` 39-53, 327-335, 131-155, 397-417.
- `getHitChance`: `/mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/combat.cpp` 316-350; `projectileHit` roll 244; melee roll `Npc::...` in `/mnt/frankendom-donors/openmw/apps/openmw/mwclass/npc.cpp` 568-570.
- `blockMeleeAttack`: `/mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/combat.cpp` 71-178.
- `adjustWeaponDamage`, `getHandToHandDamage`, `applyFatigueLoss`: `/mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/combat.cpp` 452-476, 478-530, 532-554.
- `Npc::hit`: `/mnt/frankendom-donors/openmw/apps/openmw/mwclass/npc.cpp` 573-677.
- `Actors::restoreDynamicStats`, `calculateRestoration`, `getRestorationPerHourOfSleep`: `/mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/actors.cpp` 107-120, 866-960.
- `NpcStats::getSkillProgressRequirement`, `levelUp`, `updateHealth`: `/mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/npcstats.cpp` 186-254.
- `skillUsedHandler`, `skillLevelUpHandler`, `getSkillLevelUpOptions`, `jailTimeServed`: `/mnt/frankendom-donors/openmw/files/data-mw/scripts/omw/playerskillhandlers.lua` 20-171.
- `getSpellSuccessChance`, `calcSpellBaseSuccessChance`: `/mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/spellutil.cpp` 220-303.
- `getEffectResistance`: `/mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/spellresistance.cpp` 29-73.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Tired-body multiplier: 1 - k(1 - cur/max) on every attack, block and cast | Base 1.25, slope 0.5 (creaturestats 52; defaults 1707, 1712) |
| Hit chance = round((skill + Agi/5 + Luck/10) x fatigue + fortify - blind - evasion) | Divisors 5 and 10; no clamp (combat 343-349) |
| Strength scales damage linearly | 0.5 + 0.01 x Str (combat 473-475; defaults 1671, 1672) |
| Swing cost = base + weight x strength of swing x k | Base 2.0, weight k 0.25 (combat 548-550; defaults 1705, 1706, 1839) |
| Block = contest of two terms, clamped chance | Clamp 10-50, still bonus 1.25, swing 1.0 + 1.0 (combat 115-136; defaults 1905, 1906, 1645, 1823, 1824) |
| Use-based progress, requirement grows with level | Type factors 0.75 / 1.0 / 1.25, spec 0.8 (playerskillhandlers 26-37; defaults 1762, 1772, 1775, 1811) |
| Hand-to-hand is non-lethal until knockdown | Health factor 0.1 (combat 513; default 1731) |
| Resistance: 50/castChance scaling on the attacker chance | 50 (spellresistance 54) |

### 3b. Stat table (SK focus: name | what it does | formula | number ranges | caps | file:line)

| name | what it does | formula | number ranges | caps | file:line |
|---|---|---|---|---|---|
| Attribute (Str, Wil, Agi, End, Int, Luck; used in code) | Modified attribute, drains reduce it | max(0, base - damage + modifier) | base set by data; drain turns negative modifier into damage | floor 0; no max read | stat.cpp:128, 151-155 |
| Fatigue (pool) | Stamina for swings, blocks, casts; drives the tired-body term | max = Str + Wil + Agi + End | 4 attributes, e.g. 4 x 50 = 200 | floor 0; current may exceed max via fortify (no clamp) | creaturestats.cpp:150, 139-152 |
| Health (pool) | Life | base = floor(0.5 x (Str + End)); +0.1 x End per level | e.g. Str 50, End 50 gives 50 | current floor 1 on level-up | npcstats.cpp:253, 239-243 |
| Magicka (pool) | Spell resource | max = factor x Int; factor 1.0 PC, 2.0 NPC, +0.1 per fortify point | e.g. Int 50: 50 PC, 100 NPC | none read | creaturestats.cpp:405-414; defaults 1779, 1776 |
| Tired-body term | Multiplier on attack, evasion, block, cast, resist | 1.25 - 0.5 x (1 - cur/max) | 0.75 to 1.25 (no upper clamp read) | none (see above) | creaturestats.cpp:44-52; defaults 1707, 1712 |
| Awake fatigue regen | Stamina back over time | per unit duration: 2.5 + 0.02 x End | 2.5 to about 4.5 at End 100 | blocked while current >= base | actors.cpp:956-958; defaults 1713, 1714 |
| Sleep fatigue regen | Stamina back when resting | 3600 x (2.5 + 0.02 x (1 - enc)) x (0.04 x End) per hour | enc in 0-1 | enc clamped to 1 | actors.cpp:925-932; defaults 1699 |
| Sleep health regen | Life back when resting | 0.1 x End per hour | End 50: 5 per hour | none read | actors.cpp:114, 877-881 |
| Sleep magicka regen | Spell resource back when resting | 0.15 x Int per hour | Int 50: 7.5 per hour | stunted magicka stops it | actors.cpp:117; default 1797 |
| Encumbrance capacity | Carry limit | Str x 5.0 | Str 50: 250 | ratio clamped to 1 for block; 0/0 treated as 1.0 | npc.cpp:1010; class.cpp:490-496; default 1698 |
| Swing fatigue cost | Stamina per attack | 2.0 + enc x 0 + weight x attackStrength x 0.25 | base 2.0 | none read | combat.cpp:548-551; defaults 1705, 1706, 1839 |
| Block fatigue cost | Stamina per block | 4.0 + min(1, enc) x 0 + weight x attackStrength x 1.0 | base 4.0 | shield durability -= int(damage) | combat.cpp:158-168, 151-154; defaults 1708, 1838 |
| Knockout | Out of fight | fatigue current < 0 or max 0 | threshold 0 | n/a | character.cpp:388 |
| Hit chance (melee, ranged) | Whether a swing or shot lands | round((skill + Agi/5 + Luck/10) x fatigue + fortify - blind - evasion) | e.g. 66 at full fatigue, 36 at empty (see acceptance) | no clamp; <0 always miss, >=100 always hit | combat.cpp:343-349, 244; npc.cpp:568-570 |
| Evasion (defence) | Defence term | (Agi/5 + Luck/10) x fatigue + min(100, Sanctuary) | Sanctuary part capped at 100 | Sanctuary capped at 100 | creaturestats.cpp:327-335 |
| Weapon damage | Per hit | (range interpolated by attack strength) x item health fraction x (0.5 + 0.01 x Str) | range from the weapon record | none read | npc.cpp:618-620; combat.cpp:452-476; defaults 1671, 1672 |
| Hand-to-hand damage | Bare-hand hit | HandToHand skill x (0.1 + 0.4 x attackStrength) [x Str/40 if setting] | 0.1 to 0.5 multiplier | health only if knocked down or paralysed | combat.cpp:478-530; defaults 1771, 1764 |
| Hand-to-hand health factor | Health damage from fists on knocked-down targets | x 0.1 | 0.1 | n/a | combat.cpp:509-513; default 1731 |
| Critical (unaware target) | Bonus hit, player attacker only (the block sits inside the player branch) | x 4.0 | 4.0 | n/a | npc.cpp:636-650; default 1654 |
| Knocked-down victim bonus | Bonus hit | x 1.5 | 1.5 | n/a | npc.cpp:659-660; default 1661 |
| Block chance | Shield block | clamp(int(blockTerm - attackerTerm), 10, 50); blockTerm = (Block + 0.2 Agi + 0.1 Luck) x (attackStrength + 1.0) x (1.25 if no forward movement) x fatigue; attackerTerm = (weapon skill + 0.2 Agi + 0.1 Luck) x fatigue | 10 to 50 | clamped 10-50 | combat.cpp:109-136; defaults 1905, 1906, 1645, 1823, 1824 |
| Spell success chance | Cast | clamp((2 x school - cost + 0.2 Wil + 0.1 Luck - Sound) x fatigue, 0, 100); 0 if magicka < cost | 0-100 | clamped 0-100 when capped | spellutil.cpp:247-300 |
| Spell resistance | Resist a magic effect | x = (Wil + 0.1 Luck) x fatigue x 50/castChance; partial = roll/min(x,100); final = min(partial + resist%, 100) | 0-100 | final capped 100 | spellresistance.cpp:47-71 |
| Skill use progress | Gain per use | progress += gain / ((base + 1) x type x spec); level at progress 1 | type 0.75 / 1.0 / 1.25; spec 0.8 | base 100 for positive gain | playerskillhandlers.lua:20-38, 154-171 |
| Skill use gain | Per action | skillGain[useType] from skill record | values in game ESM, not read | n/a | skillhandlers.lua:66 |
| Level progress | Level-up | +iLevelupMajor/Minor/Misc mult per skill level; level at iLevelUpTotal = 10 | defaults 1 per use, 10 | none read | playerskillhandlers.lua:45-66; npcstats.cpp:228; defaults 1944, 1950 |
| Level-up health | HP gain | +0.1 x End; current floor 1 | e.g. End 50: +5 | none read | npcstats.cpp:239-243; default 1747 |
| Jail skill loss | Punishment | -1 per day to a random skill, except sneak and security | 1 per day | none read | playerskillhandlers.lua:57-58, 119-136 |
| Luck | Enters attack, evasion, block, cast, resist | Luck/10 or 0.1 x Luck | 0-100 typical | none read | combat.cpp:344, 111, 131; creaturestats.cpp:330; spellutil.cpp:262; spellresistance.cpp:47 |

Note: rows marked "none read" have no cap in the code I read. The block still bonus applies when the blocker's forward movement value is zero or less (combat 118-121); that sign convention is read, not confirmed by a test.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for the tired-body term, hit chance, strength damage, swing cost, use-based progress and spell chance. It does NOT clamp the hit chance (matches the donor), uses `Math.round` where C `round` rounds halves away from zero, and omits block, hand-to-hand health/fatigue routing, resistance, encumbrance, regen, level-up counters, jail and specialisation counters. Fix D1 is applied in `useSkill`: the excess progress is carried into the next point, where the donor sets progress to 0.

```ts
// Licence: GPL-3.0 (donor openmw). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

// Attribute ledger: modified = base - damage + modifier, floored at 0.
interface Attr { base: number; modifier: number; damage: number; }
function attrModified(a: Attr): number { return Math.max(0, a.base - a.damage + a.modifier); }

// Pool (health, magicka, fatigue): max is derived, current is the spendable ledger.
interface Pool { base: number; modifier: number; current: number; }
function poolMax(p: Pool): number { return Math.max(0, p.base + p.modifier); }

// Tired-body multiplier. Defaults: fFatigueBase 1.25, fFatigueMult 0.5 (opencs defaultgmsts).
const FATIGUE_BASE = 1.25;
const FATIGUE_MULT = 0.5;
function fatigueTerm(fatigue: Pool): number {
  const max = poolMax(fatigue);
  const normalised = Math.floor(max) === 0 ? 1 : Math.max(0, fatigue.current / max);
  return FATIGUE_BASE - FATIGUE_MULT * (1 - normalised);
}

// Hit chance on a 0-100 scale: (skill + Agi/5 + Luck/10) x tired-body term, + fortify - blind, minus defence.
interface AttackInput { skill: number; agi: number; luck: number; fortifyAttack: number; blind: number; }
function hitChance(a: AttackInput, attackerFatigue: number, defenceEvasion: number): number {
  const attack = (a.skill + a.agi / 5 + a.luck / 10) * attackerFatigue + a.fortifyAttack - a.blind;
  return Math.round(attack - defenceEvasion);
}

// Strength scaling of damage: multiplier = 0.5 + Str x 0.1 x 0.1 (defaults fDamageStrengthBase 0.5, fDamageStrengthMult 0.1).
const DMG_STR_BASE = 0.5;
const DMG_STR_MULT = 0.1;
function strengthDamage(raw: number, strength: number): number {
  return raw * (DMG_STR_BASE + strength * DMG_STR_MULT * 0.1);
}

// Fatigue spent per swing: 2.0 + encumbrance x 0 + weight x attackStrength x 0.25 (defaults fFatigueAttackBase, fFatigueAttackMult, fWeaponFatigueMult).
const FATIGUE_ATTACK_BASE = 2.0;
const FATIGUE_ATTACK_MULT = 0.0;
const WEAPON_FATIGUE_MULT = 0.25;
function swingFatigueCost(encumbrance: number, weaponWeight: number, attackStrength: number): number {
  return FATIGUE_ATTACK_BASE + encumbrance * FATIGUE_ATTACK_MULT + weaponWeight * attackStrength * WEAPON_FATIGUE_MULT;
}

// Use-based skill progress. Requirement = (base + 1) x type factor (major 0.75, minor 1.0, misc 1.25), x 0.8 for own specialisation.
interface Skill { base: number; progress: number; }
const TYPE_FACTOR = { major: 0.75, minor: 1.0, misc: 1.25 };
const SPEC_FACTOR = 0.8;
function progressRequirement(skillBase: number, typeFactor: number, sameSpecialisation: boolean): number {
  return (skillBase + 1) * typeFactor * (sameSpecialisation ? SPEC_FACTOR : 1);
}
// simplified: donor sets progress to 0 on level-up (drops the overshoot); this sketch carries the excess (fix D1).
// Omits the donor's level-progress and attribute/specialisation counters, the jail branch and the werewolf exemption.
function useSkill(s: Skill, gain: number, requirement: number): void {
  if ((s.base >= 100 && gain > 0) || (s.base <= 0 && gain < 0)) return;
  s.progress += gain / requirement;
  if (s.progress >= 1) {
    s.base += 1;
    s.progress -= 1;
  }
}

// Cast chance on a 0-100 scale: (2 x school skill - cost + 0.2 Will + 0.1 Luck - Sound) x tired-body term, clamped.
function castChance(schoolSkill: number, cost: number, will: number, luck: number, sound: number, fatigue: number): number {
  const base = 2 * schoolSkill - cost + 0.2 * will + 0.1 * luck;
  return Math.min(100, Math.max(0, (base - sound) * fatigue));
}

// Awake fatigue regen per unit duration: base 2.5 + 0.02 x Endurance (defaults fFatigueReturnBase, fFatigueReturnMult).
function awakeFatigueRegenPerSec(endurance: number): number {
  return 2.5 + 0.02 * endurance;
}

// Demo values (not donor data): a mid-level fighter.
const f: Pool = { base: 80, modifier: 0, current: 40 };
const term = fatigueTerm(f);
const hit = hitChance({ skill: 50, agi: 40, luck: 30, fortifyAttack: 0, blind: 0 }, term, 10);
const dmg = strengthDamage(20, 50);
const cost = swingFatigueCost(0, 5, 1);
const sk: Skill = { base: 40, progress: 0.9 };
useSkill(sk, 0.2, progressRequirement(sk.base, TYPE_FACTOR.major, true));
const cc = castChance(40, 10, 50, 30, 0, term);
const regen = awakeFatigueRegenPerSec(50);
const a: Attr = { base: 50, modifier: 0, damage: 0 };
void attrModified(a);
void [term, hit, dmg, cost, sk.base, sk.progress, cc, regen];
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 /tmp/sk001-openmw-stats.ts` run on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/stats.ts` (new module): attribute and pool ledgers, the tired-body term, hit chance, swing and block fatigue cost, use-based skill progress. Parity-checklist row 21 (catalogue fields: the stat table above is the catalogue source). Row 3 (guard, parry, stamina) consumes the fatigue term but is not cited here.
- Server-side: all of it is deterministic and can run in the engine, so the hit roll and fatigue spend can be server-verified (kills are server-verified in our rulings).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: one ledger (the Stat/DynamicStat split is the one-ledger shape); data fields for tunable numbers.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism; no lines were translated.
- **D1, skill overshoot dropped.** `playerskillhandlers.lua` 115 sets progress to 0 on a usage level-up, so the excess past 1 is lost. Fix: carry the excess (sketch does this).
- **D2, spell-resistance unit mix.** `spellresistance.cpp` 68 gives the roll part as a 0-1 fraction (roll divided by a value at most 100), and line 71 adds it to the percent resistance attribute. So the random part adds under one percentage point. Fix: express both parts in percent (multiply the roll part by 100) or both in 0-1, and test one case.
- **D3, two fatigue regen formulas.** Sleep uses encumbrance and fEndFatigueMult (actors 929-932); awake uses neither (actors 956-958). Fix: one formula with an explicit rest multiplier, so the two cannot drift.
- **D4, integer truncation.** Attack skill is `static_cast<int>` (combat 242) and shield damage is `int(damage)` (combat 153). Small, but a fractional skill loses its fraction. Fix: keep floats in the engine and round only for display.
- The hit chance has no clamp (combat 349). A chance of 100 or more always hits and below 0 always misses. Frankendom should decide the clamp in the engine (for example 5-95) and test it, not inherit the open range.
- The fatigue term has no upper clamp, so fortify can push it above 1.25. Decide whether the tired body can be overcharged.
- Units: the awake regen unit of `duration` is not confirmed (caller not read); `attackStrength` range is assumed 0-1 from the interpolation (not read).
- The ESM numbers (skillGain, base attribute values, level-up attribute picker) are game data, not in the repo. Frankendom should set its own numbers as zone or catalogue data (zones as data).
- Melee and ranged use the same chance formula, but the melee roll is in `npc.cpp` and the ranged roll in `combat.cpp`; the engine should keep one roll for both.

Best transferable idea: a single tired-body multiplier on attack, evasion, block and cast, fed by one fatigue ledger, plus a fatigue cost per swing and per block, gives a stamina economy that is one number in the engine.

Decision (proposed): adapt — take the fatigue-multiplier and per-swing cost shape, fix D1 (carry overshoot) and D2 (percent units), and drop the sleep-regen path until the rest mechanic is designed; the Frankendom stamina economy needs one multiplier and one cost table, not OpenMW's full ESM-driven attribute system.

Acceptance: with skill 50, Agi 40, Luck 30 and evasion 10, a player at full stamina lands about 66 of 100 swings and at empty stamina about 36; a server test asserts round(61 x 0.75 - 10) = 36 at zero fatigue and round(61 x 1.25 - 10) = 66 at full fatigue, and a use gain of 0.2 that crosses 1.0 keeps 0.2 of progress into the next level.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: one ledger (Stat/DynamicStat shape); tunable numbers as data fields; hit roll and spend engine-side for server verification.
