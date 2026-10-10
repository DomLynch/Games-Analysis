# SWG-Source-src (asset audit, AU052)

Donor folder: /mnt/frankendom-donors/SWG-Source-src (VPS only, read-only)
Half read: SERVER half only (game/server, game/shared, engine/server, engine/shared). Client game code is not in the box (engine/client holds only the Miff tool, names only). Paired donor: SWG-Source-swg-main (orchestration folder; its dsrc/src/serverdata/stationapi/exe submodules are EMPTY in the box). The data pack (dsrc) is absent from both boxes.

## Restriction (read first)
_RESTRICTED-NOTE.txt line 1 says the code is leaked official SWG source (Sony Online/Disney), proprietary, no licence, study for shape and idea only. So every inspiration note below is category-level. No constants, coordinates or exact values are recorded.

## Licences (what the files say)
- Code: LICENSE.md line 1 is the GNU Lesser General Public License text (LGPL-3.0). The RESTRICTED note says proprietary, no licence. This is a CONFLICT; per rule it is class C.
- Asset: no asset files in the box. Nothing to licence beyond the same conflict.
- combat.def line 4 carries a copyright line naming Sony Online Entertainment (2001).

## Rights-holder status (repo files only)
Leaked proprietary source per the RESTRICTED note. Copyright line in combat.def names Sony Online Entertainment. README.md says it is the server code for SWGSource 1.2, forked from a public repo that it credits. Not a clean-room rewrite.

## Data first (non-code tables, cited by table not by loader)
- game/server/database/schema/*.tab: 67 schema tables (for example creature_objects.tab, object_templates.tab, armor.tab, cell_objects.tab). Column names describe creature stats (attribute slots, posture, wounds, speed, rank). Values are not in the table files.
- game/server/database/queries/npc_weapon_loot.sql: insert rows giving NPC weapon attack speed and damage range. These are loot/combat data rows. Values not recorded here.
- game/server/database/shared_schema, sp_character_schema, updates/*.sql: database migrations (about 388 .sql files in the whole database tree).
- application/SwgGameServer/src/shared/combat/combat.def (32 lines): enum of hit-location bones for a creature skeleton. Header says it is mirrored in dsrc/include, which is absent here.
- No string tables (.stf), no .iff object files, no .msg files, no XML or Lua data were found in the tree. Search was by extension over the whole tree.

## Asset inventory
| kind | path | count hint | licence | class |
|---|---|---|---|---|
| 2D sprites, tilesets | none | 0 | n/a | D |
| 3D models, textures | none | 0 | n/a | D |
| audio, music | none | 0 | n/a | D |
| UI art, fonts | none | 0 | n/a | D |
| maps, levels | none (dsrc absent) | 0 | n/a | D |
| text (quests, lore, names) | none (no .stf found) | 0 | n/a | D |
| database schema and SQL | game/server/database | 67 .tab schema, 388 .sql | conflict (see above) | C |
| combat definitions | application/SwgGameServer/src/shared/combat/combat.def | 1 file | conflict | C |
| profile blobs | SwgGameServer.profdata, SwgDatabaseServer.profdata | 2 binary files (not opened) | conflict | C |
| code templates | game/server/application/SwgDatabaseServer/src/shared/generated/*.template | 8 .template in the tree | conflict | C |

## Best class: C
Inspiration only. No usable art, audio or text is present. The data is proprietary by the file's own note.

## Inspiration (category-level, own words, no copied text)
- Hit location as a skeleton profile. A creature has a bone set (body, head, two arms, two legs as the enum names them). Each bone has its own attack modifier table. A non-creature target always uses location 0. Frankendom idea: per-creature hit regions with different armour mods, not six bones. See CombatEngine.cpp damage() around line 405 and combat.def.
- Damage as a list of typed attribute modifiers. A hit builds a damage list. Health loss is one mod with a direct-damage flag and a pool-style decay. Idea: damage as typed mods so that sustain, decay and armour can be stacked later. See CombatEngine.cpp computeCreatureDamage() lines 602 to 615.
- Attacks are queued actions. addAttackAction() puts the default attack command on the creature's command queue with the weapon id and mode packed into the parameter string. Aim is its own queued action. Idea: aim and strike as queue entries that the server validates in order. See CombatEngine.cpp lines 144 to 170.
- Threat table per AI (hate list). Each AI keeps a table of targets with a hate value. The highest current hate becomes the target (findNewTarget). Pets pass hate to their master with a zero entry, so the owner is on the list. See HateList.cpp lines 97 to 130 and 450 to 477.
- Target expiry and leash. The primary target clears after a period of no activity (alter(), HateList.cpp about lines 64 to 80). Leash time and forced target are also exposed (setAILeashTime line 730, forceHateTarget line 735; bodies not read).
- Script bridge for hate. ScriptMethodsHateList.cpp exposes add hate, add hate over time (addHateDot line 35), aggro immunity per player, and reset timer. Idea: designers tune threat from data without touching the engine. Mention for row 4 (fight loop) and row 23 (zone population).

## Briefs
label: Threat ladder (hate table)
why: a boss reads its target from a visible value; the top of the table changes as players fight, so the fight has a story.
keep: the top target re-picks from the table each tick; pets feed their owner with a zero entry; target clears after silence.
change: cap the table at our MAX_ATTACKERS of 3 and show threat as a ring colour on the enemy, not a number; name the table "aggro ledger" in our code; add a taunt that moves one slot.
ref: engine/server/library/serverGame/src/shared/ai/HateList.cpp (findNewTarget line 450, addHate line 97)
Rule: recreate as a clearly distinct original, never a copy. Kept: highest-value pick and pet-to-owner link. Changed: capped slots, visible ring, own names.

label: Segmented hit regions
why: a hit that lands on a shield arm feels different from a hit on the head; the hit location picks which armour answers.
keep: a per-body region index is passed into damage; regions that do not exist on a target fall back to a default region.
change: our regions are per creature (crest, shield arm, tail) with no six-bone layout; regions show as a flash on the silhouette; default region is the torso.
ref: game/server/application/SwgGameServer/src/shared/combat/CombatEngine.cpp (damage() line 405, computeCreatureDamage line 602), combat.def (32 lines).
Rule: recreate as a clearly distinct original, never a copy.

label: Aim then strike as queue entries
why: a readable wind-up that the server checks in order makes ranged fights feel deliberate.
keep: aim is a queued action before the attack; the attack carries the weapon and mode in one parameter string.
change: aim is a stance that builds a charge shown on the lock-on ring; no string packing, typed payload instead.
ref: CombatEngine.cpp addAttackAction line 144 and queue calls at lines 130, 160, 185.
Rule: recreate as a clearly distinct original, never a copy.

label: Typed damage mod list
why: a hit that becomes a list of named modifiers can be shown, undone or decayed without rewriting the hit code.
keep: one hit yields a list of mods, each with a tag and a decay style.
change: our mods drive hitstop and the finisher window directly; tags are our own words.
ref: CombatEngine.cpp computeCreatureDamage line 602, mod set at line 615.
Rule: recreate as a clearly distinct original, never a copy.

## Cross-links
- Hate and aggro: row 4 (fight loop) and the many-on-one target choice the rulings place in the engine. Spawn logic in the box is only the script bridge (ScriptMethodsSpawner.cpp exposes a server spawn limit; the cap itself was not read) so row 23 has no direct code here.
- Loot: npc_weapon_loot.sql (row 18). Rows only, no values recorded.
- Hit regions and gear: row 15 (gear dressing) and row 8 (wounds).
- Assets: none usable. Sound, camera, HUD and VFX have no assets here.

## Not read
- Bodies of HateList setLeashTime, forceHateTarget and all of ScriptMethodsHateList beyond the declarations.
- ConfigCombatEngine.cpp and the hit-location data it loads.
- All .tab and .sql bodies (only headers and one loot file head).
- Profile binaries (.profdata).
- Client half: none present except Miff tool names.
