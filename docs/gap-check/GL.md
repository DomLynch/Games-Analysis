# Gap check GL (gods, legends, favour) - 2026-10-12 - Frankendom repo commit 8d6ae33a9

Summary for Dom:
- 18 donor notes checked (GL001-GL006). REUSE 3, ADD 7, SKIP 8.
- The 7 ADDs are really 3 builds: (A) one favour/standing ledger with a kill-hit table (crawl, Ryzom, TrinityCore, Daggerfall, swgemu), (B) a derived standing read (openmw), (C) spend favour to advance a boss ladder (ModernUO).
- Top additions: 1) the ledger A: kill hits to rival/ally gods, diminishing gain, auto-drop below a floor, sister spill with carry; 2) the standing write path (quest rewards of standing are refused today); 3) derived standing, worst of the groups, temporary penalty cleared on pay (openmw).
- The 8 SKIPs: no timed buffs or prayer-for-fixes (patron perks are fixed small sidegrades), no death penalty (a ruling), no relic-carry mode, no guild cities.
- Every proposed target path is wrong: no src/fight/ and no origins/favour.ts exist. Nearest real home is a new folder origins/standing/ beside origins/patrons/.

Facts in the repo that drive the calls:
- Standing contract exists, unbuilt: origins/contracts/world.ts:241-275 (FactionStanding, clamp -1000..1000, attitude bands, ranks, expelled flag, directional reactions).
- Nothing writes it: origins/server/story.ts:81-88 refuses stages that reward standing (501).
- Clean-room specs already written: docs/specs/origins/eqemu-faction.md, openmw-factions-disposition.md, modernuo-virtues.md, modernuo-champion-spawns.md.
- Patrons: origins/patrons/patrons.ts (perks fixed at +-3%, clock/moon conditions line 36-45, resolvePerk line 325, leave/switch rules line 153).
- Rulings: progression-proposal.md line 318 "no death penalty, no decay"; encounters.test.ts:89 player death costs nothing; GAME_SPEC never gear loss.

| Donor note | Idea (8 words) | We have today | Gap | Call | Lands in |
|---|---|---|---|---|---|
| GL001 ModernUO | spend favour to advance boss ladder, weekly decay | origins/boss/boss.ts staged boss (dormant, gathering, boss, defeated); specs modernuo-virtues.md and modernuo-champion-spawns.md | no spend currency, no per-region once-only challenge, no decay. Note: progression rule 9 says no decay, so drop the decay or get Dom's ruling | ADD (build C; decay needs a ruling) | origins/boss/boss.ts (a wake or advance action) plus ledger A; proposed origins/favour.ts does not exist |
| GL001 NetHack | prayer timeout gate, anger ladder, offering cut | nothing | prayer-for-fixes and anger ladder have no fit: no healing or boons from an altar in a no-stat duel game | SKIP (reason: no prayer boon system fits) | proposed origins/favour.ts does not exist |
| GL001 crawl | penance-first ledger, level-gap kill curve | level-gap falloff and grey kills pay nothing: origins/progression/model.ts:67-79 | only the ledger per god and penance-first rule are missing | ADD (merge into ledger A; reuse model.ts falloff for the level gap) | origins/standing/standing.ts (new) |
| GL002 EQEmu | check all slots, charge once, renew timer | patron perks fixed, no timers; arena has no timed buffs | timed paid blessings clash with the fixed +-3% perk budget | SKIP (reason: perks are fixed sidegrades) | src/fight/favour.ts does not exist |
| GL002 OpenDAoC | one carrier of a unique relic, return clock | rarity 'relic' is only a loot tier (origins/contracts/items.ts:38); town war goals in living-world.md | no realm-versus-realm capture mode | SKIP (reason: no relic-carry mode planned) | src/fight/relics.ts does not exist |
| GL002 Shadowbane | shrine favour pool filled by offerings | 'shrine-offerings' only a town resource name, living-world.md:199 | guild-owned city shrines have no fit | SKIP (reason: no guild cities; revisit with town economy) | src/fight/boons.ts does not exist |
| GL003 openmw | derived standing: base, penalty, worst group | spec openmw-factions-disposition.md; FactionStanding has expelled flag, world.ts:265 | no function that derives it; expelled-first defect to avoid | ADD (build B) | origins/standing/standing.ts (new); src/fight/standing.ts does not exist |
| GL003 ryzom | gain slows near cap, auto-drop below floor | clamp only (STANDING_MIN/MAX, world.ts:253) | diminishing gain, declare gate, auto-drop | ADD (merge into ledger A) | origins/standing/standing.ts; src/fight/favour.ts does not exist |
| GL003 wesnoth | tag modifier by time of day per zone | clock-half day/night and moon conditions, patrons.ts:36-45, resolved at patrons.ts:325; world clock in living-world.md 10.3 | none needed: a legend's domain is a perk template row, capped +-3% | REUSE (patrons.ts perk templates) | origins/patrons/patrons.ts; src/fight/domain.ts does not exist |
| GL004 TrinityCore | tiers from thresholds, spill to sisters, overflow | tiers and directional reactions in FactionDefinition (world.ts:255-262); feuds standing deltas (feuds.ts:28-30) | spill with carry; paragon overflow (note progression already counts credit past cap) | ADD (merge into ledger A) | origins/standing/standing.ts |
| GL004 daggerfall | donation raises favour with falling chance | nothing | falling-chance gain; rank-scaled boons would need fixed perks; decay clashes with rule 9 | ADD (merge into ledger A; take rank table only, decay needs ruling) | origins/standing/standing.ts |
| GL004 l1j | signed meter, ladder, one-way reset | signed standing and bands (world.ts:250-254); leave/switch cooldowns and cost (patrons.ts:153) | none worth adding; karma purchase not needed | REUSE (world.ts bands, patrons.ts leave/switch) | origins/contracts/world.ts, origins/patrons/patrons.ts |
| GL005 LostCityRS | blessing boost and curse drain, decays to base | no buff or debuff system in origins/; arena perks fixed | whole timed-effect ladder | SKIP (reason: no timed buffs by design) | src/fight/effects.ts does not exist |
| GL005 Open-RSC | favour pool drains while blessings run | nothing | running-cost blessings | SKIP (reason: same as LostCityRS and EQEmu) | src/fight/blessings.ts does not exist |
| GL005 WarEmu | kill pays standing by rank, party split, carry | party split and falloff done: model.ts:51-79 (split and each); rank overshoot carries in progression-proposal | nothing new for XP; only a standing hit, which is ledger A | REUSE (progression model.ts) | origins/progression/model.ts |
| GL006 AAEmu | death streak raises wait, XP loss capped | player death costs nothing and retries at once (encounters.test.ts:89) | contradicts the no-death-penalty ruling | SKIP (reason: ruling: no death penalty) | src/fight/death.ts does not exist |
| GL006 ACE | death debt on vitals paid by XP | same as AAEmu; progression-proposal.md:318 | contradicts the ruling | SKIP (reason: ruling: no death penalty) | src/fight/death.ts does not exist |
| GL006 swgemu | kill moves rival and ally standings, rank cap | spec eqemu-faction.md 5.4 (kill hit lists, same shape); directional reactions in world.ts; feuds standing deltas | no server code applies a kill hit list; no write path | ADD (merge into ledger A; the spec is already written, so build from eqemu-faction.md) | origins/standing/standing.ts plus a writer in origins/server/ (story.ts:88 gap) |

Merge notes: crawl, Ryzom, TrinityCore, Daggerfall, swgemu and (partly) NetHack all propose the same ledger; they land in one file. EQEmu, LostCityRS and Open-RSC are one SKIP (timed blessing rows). AAEmu and ACE are one SKIP (death cost). Decay appears in ModernUO, Daggerfall, Shadowbane and conflicts with the "no decay" line in progression-proposal.md; one ruling from Dom settles all three.
