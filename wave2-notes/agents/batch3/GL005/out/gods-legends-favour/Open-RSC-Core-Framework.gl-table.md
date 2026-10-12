# Open-RSC-Core-Framework (gods-legends-favour, cell 1): GL table

Donor root: `/mnt/frankendom-donors/Open-RSC-Core-Framework/server/` (server half; data in `conf/server/defs/PrayerDef.xml`). Paired client data (`Client_Base/.../PrayerDef.java`) not read. Licence AGPL-3.0: shape only.

| name | effect | formula | number ranges | gain/loss events | decay | file:line |
|---|---|---|---|---|---|---|
| 1. Favour/piety resource | Prayer-points pool, drained each tick while any prayer is on | per tick: ceil(sum of active rates x 120 / (300 x (1 + (gear - 1) / 32))) | pool = level x 120 (derived: 120 to 11880 at level 99); rates 5, 10, 15, 30, 60 | gain: altar recharge (to level, +2 at object 200), setLevel/normalize on prayer skill. Loss: the drain. No kill, offering or oath gain read | none beyond the drain; empty pool switches all prayers off and sets level 0 | PrayerDrainEvent.java 36-60; Player.java 1637; Skills.java 120, 352; Prayer.java 22-29 |
| 2. Blessings and curses as timed rows | Prayers are toggles with no timer: on until switched off or pool empty. No curse found in these reads | cost = the per-tick drain | 14 toggles (ids 0-13) | on/off by the player only | forced off at empty pool | PrayerHandler.java 16-66, 100-117; Prayers.java 6-11 |
| 3. Patron choice and switching | No patron. Switching inside a tier is free and automatic (others in the tier turn off) | activation switches off the tier's other two | 3 tiers of 3 ranks each (defence, strength, attack) | none (no penalty read) | none | PrayerHandler.java 21-22, 33-34, 45-46 |
| 4. Divine domains as tags | Not present as tags. Combat multipliers per tier read in Formulae.java (a different class from CombatFormula; its body not read) | multiplier 1.05 / 1.10 / 1.15 by tier (Formulae.java addPrayers) | 1.05 to 1.15 | none | none | Formulae.java 190-204 |
| 5. Boons at favour thresholds | Each prayer unlocks at a level requirement; ranks, not random | unlock when max prayer level >= reqLevel | reqLevel 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34, 37, 40 | none | none | PrayerDef.xml 3-81; PrayerHandler.java 104-107 |
| 6. Legend signature powers | Not in donor. Paralyze monster (id 12, reqLevel 37, rate 60) has no effect code in the activation switch; its effect elsewhere not read | (not read) | reqLevel 37 | none | none | PrayerHandler.java 59; PrayerDef.xml 75 |
| 7. Shapeshifting | Not read in this donor | (not read) | (not read) | (not read) | (not read) | (not read) |
| 8. Avatars and summons | Not read in this donor | (not read) | (not read) | (not read) | (not read) | (not read) |
| 9. Fate, luck, oaths | No luck stat or oath found in these reads | (not read) | (not read) | (not read) | (not read) | (not read) |
| 10. Underworld and death rules | Protect-items prayer keeps one extra item if the player dies (the loop body not read) | keep one more item when the prayer is on | reqLevel 25, rate 10 | none | none | Inventory.java 485; PrayerDef.xml 51-54 |
| 11. Divine mounts as rewards | Not read in this donor | (not read) | (not read) | (not read) | (not read) | (not read) |
| 12. Relics and artifacts | Not read in this donor | (not read) | (not read) | (not read) | (not read) | (not read) |
| 13. Temples and shrines as zone rows | Altar command "recharge at": refills to max level; object id 200 gets +2 levels; a Yanille altar (id 625 at y 3573) is a trapdoor, not a shrine | target = max level + (2 if object 200 else 0) | +0 or +2 levels | free (no cost read) | none | Prayer.java 15-31, 36-37 |
| 14. Pantheon factions and realm pride | Not read in this donor (PlayerClass.java has a comment on alignment, body not read) | (not read) | (not read) | (not read) | (not read) | (not read) |
