# EQEmu (ai-aggro, cell 3)

Donor: `/mnt/frankendom-donors/EQEmu/zone/hate_list.cpp` (with `zone/attack.cpp` and `zone/mob_ai.cpp`) | Licence: GPL-3.0-or-later (hate_list.cpp header: "either version 3 of the License, or (at your option) any later version"; LICENSE.md is GPL version 3) | C++ | symbol `HateList::GetMobWithMostHateOnList`, `Mob::AddToHateList`, `HateList::AddEntToHateList`, `HateList::RemoveStaleEntries`

Checked: The hint file was INFERRED; the real code was found with grep on hate, aggro and target. Read in full: HateList::AddEntToHateList 205-253 and RemoveEntFromHateList 255-285, GetMobWithMostHateOnList 348-554 (smart and plain branches) and its bool overload 556-590, RemoveStaleEntries 854-897, Mob::AddToHateList 3054-3215 (the rest of that function, from 3216, not read). Target and cleanup in mob_ai.cpp 762-776 and 1040-1095 (AI_Process). Defaults: common/ruletypes.h 712-735 (Aggro rules), common/features.h 150, zone/mob.cpp 129, mob_ai.cpp 436-449. Callers: GetMobWithMostHateOnList is called from mob_ai.cpp 772, 1077 and 1082 (read), and mob.cpp 4962 and npc.cpp 778 (not read). AddToHateList callers were not searched. Not read: Mob::CheckWillAggro (aggro.cpp 370, the first-aggro gate), GetClosestEntOnHateList (153-204), GetDamageTopOnHateList (107-152), DamageHateList (899-917), the rampage code, the Timer class (the Check semantics are assumed from use), and the Lua and Perl hooks. camera_scope not applicable. Confidence: high on accumulation, the top pick and the stale and leash rules as written; medium on the timer semantics.

## 1. Mechanism

- Hate per hit (Mob::AddToHateList, attack.cpp 3054-3182). Some hits are rejected first: self, a zoning or disconnected client, a trap (3056-3069); held or stopped pets that are not engaged (3109-3116); familiars and aggro-immune flags (3126-3152); non-harmful spells and the owner (3142-3148).
- The hit's hate is multiplied for an entry already on the list: hate x max(1, 100 + hatemod) / 100, where hatemod sums spell, item and AA bonuses (3088-3095). A new entry instead gets InitialAggroBonus added (3098-3100), with no hatemod.
- Tunnel vision: when the mob has the ability and the hitter is not its current target, hate is multiplied by the ability's parameter, or by TunnelVisionAggroMod (0.75 by default) when the parameter is zero (3154-3166).
- Damage credit is capped at the HP the mob had left (3175-3176), so a finishing blow cannot take credit for the damage over the HP left. The stated reason is XP credit, not aggro.
- The hit is handed to the hate list (3182). AddEntToHateList (205-253): an existing entry adds damage (never negative) and stored hate, sets the frenzy flag to this hit's value, and updates last_modified (219-224). A new entry starts with oor_count 0 and last_modified now (235-243).
- Top pick (GetMobWithMostHateOnList, hate_list.cpp 348-554), smart branch on by default (366). The entries skipped are the skip entry, mezzed entries when asked, and entries outside the filter (388-405). Sanctuary sets a fallback with hate 1 (407-415); divine aura, mez or fear sets a fallback with hate 0 (417-425). A fallback is used only while hate is still -1, i.e. nothing better was found (408, 418).
- Each entry's aggro_mod is the sum of percent bonuses: a sitting client (SittingAggroMod, 431); the current target (CurrentTargetAggroMod, 436 for clients and 453 for others); melee range (MeleeRangeAggroMod, 441 and 458); and HP below 20 percent (464-466, CriticallyWoundedAggroMod). current_hate += current_hate x aggro_mod / 100 (468-470). The top is the largest current_hate, and any frenzied entry replaces it (472-475). Ties keep the earlier entry, because the test is strict >.
- Player preference (480-507). If a player was in melee range and the top is not a player-type entry (player, bot, merc, or a tank-flag mob), the player in melee range is returned. Otherwise the top is returned.
- Plain branch (515-550, when SmartAggroList is off): the largest stored hate, frenzy overrides.
- Target refresh (mob_ai.cpp). Engaged path (762-776): if rooted, the closest entity is taken (767); otherwise the top is set only when AI_target_check_timer fires (770-772). AI_Process (1046-1086): the cleanup timer gate (1051); an empty hate list means no longer engaged (1053-1058); rooted or blind takes the closest entity (1062-1063); otherwise, on the target-check timer, a non-focused creature without an improved taunt sets the top (1065, 1080-1082). So the top is re-picked on a timer, not on every hit.
- Stale cleanup (RemoveStaleEntries, 854-897; called at mob_ai.cpp 1052 with 600000 ms and the zone's npc_aggro_max_dist). An entry is removed when last_modified is more than 600000 ms old (867-869). Otherwise, when its squared distance from the creature is more than the leash squared, oor_count goes up, and the entry is removed when it reaches 2 (871-878); back in range resets it. The cleanup timer is 6000 ms (mob.cpp 129) and is disabled when NPCAggroMaxDistanceEnabled is false (447-449).

## 2. Key functions

- `Mob::AddToHateList`: `/mnt/frankendom-donors/EQEmu/zone/attack.cpp` 3054-3215 (hatemod 3090-3095, InitialAggroBonus 3098-3100, tunnel vision 3154-3166, damage cap 3175-3176, hand-off 3182).
- `HateList::AddEntToHateList`: `/mnt/frankendom-donors/EQEmu/zone/hate_list.cpp` 205-253.
- `HateList::GetMobWithMostHateOnList` (with the smart branch): same file 348-554.
- `HateList::RemoveStaleEntries`: same file 854-897.
- Target refresh and cleanup: `/mnt/frankendom-donors/EQEmu/zone/mob_ai.cpp` 762-776 and 1040-1095.
- Rule defaults: `/mnt/frankendom-donors/EQEmu/common/ruletypes.h` 712-735; interval `/mnt/frankendom-donors/EQEmu/common/features.h` 150.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Hate table per creature, accumulated per hit | No constant; the table is the mechanism |
| New entry bonus, so a first hit counts for more | InitialAggroBonus 100 (ruletypes.h 732) |
| Multiplier from equipment or effects on known entries | 100 + hatemod, floor 1 (attack.cpp 3090-3094) |
| Percent bonuses on the top pick | MeleeRangeAggroMod 10 (714); CurrentTargetAggroMod 0 (715); SittingAggroMod 35 (713); CriticallyWoundedAggroMod 100 under 20 percent HP (716; hate_list.cpp 464) |
| Integer percent arithmetic | aggro_mod / 100 with truncation (hate_list.cpp 469) |
| Hit-count cap for credit | HP left (attack.cpp 3175-3176) |
| Stale forget after no touch | 600000 ms (mob_ai.cpp 1052; a literal in the code) |
| Leash with two passes | npc_aggro_max_dist is zone data (mob_ai.cpp 1052); two passes (hate_list.cpp 873) |
| Cleanup cadence | 6000 ms (mob.cpp 129) |
| Target refresh cadence | 500 ms (features.h 150) |
| Tunnel vision | 0.75 (ruletypes.h 719); per-mob parameter overrides (attack.cpp 3159-3164) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: new-entry bonus or hatemod, tunnel vision, damage credit capped at HP left, then the top pick with the melee, critical and sitting percent bonuses and the frenzy override, the two-pass leash and the stale time, and a period gate for the target refresh. It replaces the donor's fallbacks (sanctuary, aura, mez, fear) with an exclusion, which the donor does not do. It omits: the player-type preference (480-507), pets and aggro immunity, spell and taunt multipliers (3178-3180), the damage-under-zero rule (3071-3073), faction, quest and XP hooks, the bot owner entry, rampage, the rooted and blind closest-target rule, and the no-longer-engaged event. The per-mob tunnel-vision parameter is replaced by the rule value. Ties keep the first entry in list order, as the donor's strict comparison does. The sketch's Gate stands in for AI_target_check_timer; the donor Timer semantics were not read.

@@SKETCH@@

## 5. Lands in

- TARGET `src/fight/hate.ts` (new module, proposed): one hate table per creature in the engine, with the top pick and the stale and leash cleanup. Parity-checklist row 2 (AI brain: target selection).
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the described mechanism and was not translated line by line.
- MAX_ATTACKERS = 3: the donor's hate list has no attacker cap. Every entry stays on the list until it goes stale or out of leash, and the top pick is the only selection. Frankendom must keep the hate table for all foes and apply the attacker cap after the top pick, as an engine rule.
- Integer percent math: the donor truncates (hate_list.cpp 469). The server must use the same integer rule, or replays drift. The sketch uses Math.trunc, which is the same for the positive values here (not tested).
- Refresh cadence: 500 ms is a zone-scale gate. A one-on-one duel has one opponent and needs no gate, so the gate should apply to many-on-one zones only, and the acceptance test must fix the tick at which the target changes.
- Sitting and tunnel vision are classic tuning. Frankendom has no sitting, and tunnel vision would be per-creature data if ever needed. The sketch leaves both out.
- Damage credit cap at HP left: the donor uses it for XP. Frankendom's one ledger and server-verified kills need the same cap in the server ledger, not in the client.
- The 600000 ms stale time suits zone creatures and is far too long for a duel; it belongs in zone data, not in the engine.
- The hit's base hate and damage must come from the server's hit record. The donor passes them in from the attack call; the server check on that path was not read.

@@BEST@@
