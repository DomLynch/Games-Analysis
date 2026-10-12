# Pass 2 + four new topics: summary (2026-10-12)

Method: Strategy's review (docs/wave2-pipeline/TOPICS-FOCUS5.md, PASS2-ADDENDUM.md). Readers Haiku 5.5 high, checkers and fixers Sonnet 5.5 medium. Receipts never pushed.

## What was read (24 groups, 72 donor notes, all STRONG)
| Topic | Groups | Donors |
|---|---|---|
| Trading (TR second pass) | TR004-005 | AzerothCore, Ragnarok Rebuild, l1j, EvEmu, 2004Scape, OpenDAoC |
| Death/respawn (DR second pass) | DR004-005 | AzerothCore, rAthena, cMaNGOS, Open-RSC, 2004Scape, Brogue |
| Procgen (PR second pass) | PR006-007 | Brogue, Terasology, Luanti, Wesnoth, Freeciv, Hedgewars |
| Skills (SK second pass) | SK013-014 | AzerothCore, Ragnarok Rebuild, Brogue, Freeciv, OpenRA, KeeperRL |
| Magic (MG second pass) | MG012-013 | AzerothCore, Ragnarok Rebuild, Brogue, Forge, Duelyst, Showdown |
| Chat (CT second pass) | CT004-005 | rAthena, AzerothCore, AAEmu, Open-RSC, ACE, SWGEmu |
| NEW quests/dialogue/NPC routines (QU) | QU001-003 | OpenGothic, OpenMW, Daggerfall Unity, YarnSpinner, inkjs, Evennia, LostCityRS, ModernUO, AzerothCore |
| NEW enemy AI (AI) | AI001-003 | BehaviorTree.CPP, GOAP, TrinityCore, Crawl, Brogue, Angband, Veloren, cMaNGOS, CombatPathingRevolution |
| NEW netcode/session integrity (NW) | NW001-003 | Teeworlds, ioquake3, Valve SDK, geckos.io, Colyseus, Nakama, 2004Scape, Open-RSC, Warcraft Arena Unity |
| NEW determinism/replay (DT) | DT001-003 | OpenRA, OpenBW, Beyond All Reason, Showdown, boardgame.io, Hedgewars, Quake, openage, Return to the Roots |

## Quality loop (Sonnet 5.5 medium checkers, then fixers)
- Earlier batch (70 notes on missing features, wave 1 of this session): 30 clean, 40 minor, 0 wrong. All fixed.
- Pass-2 batch: 61 notes checked (13 clean, 44 minor, 4 wrong), plus 11 in the last batch (3 clean, 8 minor, 0 wrong). All fixed.
- The 4 wrong notes (all corrected): Showdown sleep rule (MG013), Duelyst damage and aura skip (MG013), AzerothCore chat flood gate (CT004), Hedgewars braid dial (PR007).
- Checkers can be wrong too: fixers re-verify against donor code before editing (two checker claims were rejected: rAthena mute check, Brogue changelog line).

## Still open
- Not checked: ~130 older new-topic notes from the first quality loop (sound 47, skills 20, magic 14, boss staging 7, procgen 6, others). Informational "missed" lines for the first 10 clean notes of the first round.
- Parity checklist has no rows for quests/dialogue, trade, chat/names. Lead should add.
- Not covered by any note: pathfinding internals, group tactics, replay file formats of closed engines.
- Target file names in notes are proposals; no note compared with the real Frankendom code.
- Licence calls for Dom: CC0 (Duelyst), Unlicense (Warcraft Arena Unity), OpenBW (no licence file, treated as restricted), nvdiffrast (asset pipeline).
- Each note ends with up to three plain-English rulings for Dom.
