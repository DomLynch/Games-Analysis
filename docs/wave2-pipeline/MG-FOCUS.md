# MG focus (magic-spells-powers), Dom 2026-10-12. Read after TASK.md for every MG group.
Dom: Frankendom will have PLENTY of magic alongside melee and our special moves: dragons, necromancy, witchcraft/hexes, mind/mental/telepathy, persuasion/charm, elemental, nature, divine and more. Code only from MIT/Apache/BSD donors; GPL/AGPL/restricted = shape only.
For each mechanism give TABLE rows: name | effect | formula | number ranges | cost (mana/focus/stamina/reagent/health) | cooldown/cast time | caps | file:line.
Cover: resource pools and regen; spell/power definition data (how spells are data-driven); casting (cast time, interrupt, targeting, range, area); schools and how they scale with stats/skills; summoning and minions (necromancy, pets, undead limits and upkeep); curses, hexes, DoT and debuffs, dispel rules; mind effects (charm, fear, sleep, telepathy, mind-reading, persuasion/dialogue influence) and their diminishing returns / resist rules in PvP; resistances and elemental damage; spell-vs-melee balance (spell interrupt by hits, armour penalties); dragon and breath/area abilities if present; learning/spellbooks/spell-making; special moves vs spells.
Say which numbers suit a fast mobile fight.

## Strategy additions (2026-10-12), all as formula + range TABLES
(a) CASTING MODEL: cast time, channel, interrupt rules (hit, move, stun), cooldown, resource (mana/focus/reagents), global cooldown vs melee specials, interaction with stamina and stance.
(b) TARGETING: self, single, cone, line, area, ally, corpse; range and line of sight; friendly fire under PvP flags; reflect/absorb/dispel/counterspell.
(c) STATUS EFFECTS ON ONE LADDER: fear, root, silence, sleep, charm, mind control share the single crowd-control diminishing-returns ladder (one per target, any source); immunity timers; what breaks on damage.
(d) MIND/TELEPATHY/PERSUASION: skill check vs resist formula; PvP resist and consent rules for mind control (duration caps, no control of a flagged-off player, what the controlled player sees); persuasion as a social check with NPCs (price, quest, surrender) and whether it works on players.
(e) SUMMONS/NECROMANCY: summon limits, upkeep, leash, who owns kill/loot/XP, corpses as a resource (decay, raise limits, corpse ownership), pet AI stance.
(f) DRAGONS: as mounts (flight as a movement model, landing rules, dismount on damage) and as bosses (breath cones, phases, flight phases, armour per body part); taming/bonding.
(g) SCHOOLS and RESISTANCES per damage type, armour vs spell (no armour = glass?), mana burn, overcast/burnout.
(h) ACQUISITION: learn/buy/scroll/spellmaking (Daggerfall-style custom spells: cost formula), schools gated by stats.
(i) ECONOMY: reagents as items, spell cost in coin.
Also report resource pools as DATA per character row (health/stamina/mana/focus). Feeds: engine row 13 (specials), Proof 3 CC ladder, catalogue row 21, stock-take row 8, Core items (reagents, corpses).

## Gap groups MG009-MG011 (the first 8 magic groups did not cover these; focus ONLY on your sub-topic)
MG009 summons-necromancy-corpses-pets: summon limits, upkeep, leash, who owns kill/loot/XP, corpses as a resource (decay, raise limits, corpse ownership), pet AI stance.
MG010 spellmaking-acquisition-reagent-economy: learn/buy/scroll/spellmaking (Daggerfall-style custom spell cost formula), schools gated by stats, reagents as items, spell cost in coin.
MG011 dragons-and-boss-abilities: breath cones, phases, flight phases and flight as a movement model, armour per body part, taming/bonding, mounts.
