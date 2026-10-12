# SK focus (character-stats-skills), from Strategy 2026-10-12. Read this after TASK.md for every SK group.

CORRECTION from Dom 2026-10-12: Frankendom WILL have plenty of magic (dragons, necromancy, witchcraft, mind/telepathy, persuasion and more) alongside melee and special moves. Do not ignore magic stats: mana/focus/other resources, spell power, casting stats, resistances and school skills all matter. Stamina and stance remain the melee economy. Code only from MIT/Apache/BSD donors; GPL/AGPL/restricted = shape only.

For EACH stat or skill you find, give a TABLE row (not prose): name | what it does | formula | number ranges (min/max/typical, per level if any) | caps (soft/hard) | file:line. Strategy turns each row into a catalogue row.

Cover, with the donor's own numbers:
1. Core attributes (strength, dexterity, endurance/vitality, intelligence, luck, others) and derived stats (health, stamina, regen in and out of combat, carry weight/encumbrance feeding stamina, the "tired body" state).
2. Stamina/fatigue: cost per action (attack, heavy, block, roll, sprint), recovery rules.
3. Poise/stagger/stun thresholds; crowd-control ladders and diminishing returns (one ladder per target, any source).
4. Block, parry, riposte, roll/dodge windows and how stats scale them.
5. Damage types vs armour (slash/blunt/pierce), armour penetration, crit, hit location (head, limb: hamstrung, severed, bleed/persistent wounds).
6. Armour per piece across 6 slots, wear/degradation, takeable pieces; weight.
7. Weapon attributes: damage, speed, range, stat requirements, two-hand/shield rules, scaling with stats, weapon proficiency/skills (melee, ranged, sharpshooting).
8. Skill systems: use-based vs XP-bought, gain formulas, caps, skill decay; talents.
9. Level and rank scaling: level-50 curves, grade/rank tiers as multipliers, power budget per level (must be a data curve), respec.
10. Luck as a real stat. 11. What a coach/manager view of a fighter would show (stat sheet, readouts).
12. Magic and mental stats: mana/focus/other resource pools, spell power, cast stats, schools (necromancy, witchcraft/hexes, mind/telepathy, elemental, nature, divine), resistances and elemental damage, plus social skills (persuasion, speech, intimidation, barter): formula and ranges as rows.
Fast-action references (OpenMB, veloren, Barony) matter most; call out which numbers suit a fast mobile fight.
