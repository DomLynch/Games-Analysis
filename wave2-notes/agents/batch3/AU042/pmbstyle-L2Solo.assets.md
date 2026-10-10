# pmbstyle-L2Solo (assets audit, AU042)

Donor/Licence: L2Solo, a Lineage II C4 server emulator in Node.js (server half only). Code licence Apache-2.0: LICENSE is the Apache 2.0 text; README line 290 says 'licensed under the Apache 2.0 license'; package.json line 6 defers to LICENSE. README line 288: a heavily modified fork of the NodeL2 Server Emulator.
Asset licence: none separate. The data is C4-style game data and the files do not state its source or licence. Crest BMPs come from a third-party gallery (data/crests/README.md line 3); its licence is not stated. Class C overall; D for audio and fonts (none in data/).
Rights holder: unknown from the files. README names the game it emulates (line 10). No NCSoft, trademark or copyright statement found in README.md. Treated as commercial-game-derived: category-level inspiration only.
Halves: this is the server half. The client is an external download link in README (not followed; not in the box). The upstream NodeL2 fork source is named in README line 288 and exists in the box as NodeL2-NodeL2 (not opened).

## Asset groups (data first)
- NPC and monster templates: data/Npcs/*.json (48 at top level), Spawns/ (41), Minions/, ai.json. Block structure per template: identity, base attributes, combat stats, speed, vitals (c4_heine.json block headers at lines 11, 19, 30, 34; short lines, not receipted). Class C.
- AI role table: data/Npcs/ai.json maps NPC ids to FIGHTER, ARCHER or BALANCED (line 1). Class C.
- Items: data/Items (64 files: Armors, Weapons, Others, soul_crystals.json, weapon_sa.json, c4_unseal.json, markdown notes). Class C.
- Skills: data/Skills (Active, Passive, Switch, Tree). Class C.
- Recipes: data/Recipes/recipes.csv (semicolon separated; line 1 is the row format). Class C.
- Teleports: data/Teleports/teleports.json with schema. Coordinates not copied. Class C.
- Crests: data/crests/ally (245 BMP, 8 x 12 px per the header of crest-001.bmp) and data/crests/clan (240 BMP, 16 x 12 px per README line 6). Source gallery licence not stated. Class C.
- HTML pages: data/Html (337 files; Admin 18, Gatekeeper 15, help and numbered pages). Protected text likely; never reproduce. Class C.
- Name lists and folders: clan-names.json, Templates, Pets, Henna, ClanHalls, Admin, KnowledgeBase. Listed only. Class C.
- Logo: l2solo-logo.png (repo root, about 2.3 MB). Class C.
- SQL: database/sql (3 files). Code. Class A under the project Apache licence (not read).
- Audio, fonts, 3D models: none found in data/. Class D (repo-wide audio search not run).

## Inspiration (category level; the donor is commercial-game-derived)
1. Three tiers by distance: README lines 30-34 describe visible bots with full detail, out-of-view bots on a cheaper background loop that keeps goals and parties, and static bots with no brain. A cold bot is promoted when a player comes near. Idea for row 23 and the row 18 sub-line 'per-tick NPC budget'. Keep the tiers and the promotion rule; change the names and distances.
2. Budget that tightens with a player online: PopulationConfig.js line 12 (scheduler slice 12 ms), line 13 (idle budget 2500 ms), line 14 (player budget 100 ms), lines 16-17 (resolves per tick: 100 idle, 12 with a player). Idea for the server tick: two states, not one fixed cap.
3. Lease for background work: cold owner lease 30000 ms (line 26) with renewal and recovery intervals. A worker claims, renews, and a lost claim is recovered. Idea for background simulation that must not stall the loop.
4. Yield to players in flight: the cold worker's in-flight cap is 8 while a player is online (line 34). Idea for the many-on-one case: background work gives way when a fight needs the loop.
5. Tuning without code: each budget has an environment name (line 248 onwards, for example BOT_POPULATION_SCHEDULER_PLAYER_BUDGET_MS). Idea for zone data: caps set per deployment.
6. Stat block split into groups: identity, base attributes, combat stats, speed and vitals in each template. Idea for row 21 (catalogue fields).
7. Role tags as data: ai.json (line 1) gives each NPC id a role tag. Idea for row 2 (AI brain): the brain reads a tag, no code per creature.
8. Boss with minions in data: ColdCombatProfile.js line 12 loads a raid boss minion file. Idea for boss set pieces: a boss plus a separate minion list.

## Briefs (recreate as clearly distinct originals; never copies)
- Tiered crowd band (own label): keep three tiers by distance and promotion on approach; change tier names, distances and a fight-only tier that is always full. Ref: README.md lines 30-34; src/GameServer/Bot/Population/PopulationConfig.js lines 9-17.
- Role-tag duelist (own label): keep one role tag per creature in data; change role names (for example brawler, skirmisher, sentinel) and silhouettes. Ref: data/Npcs/ai.json line 1.
- Minion-led boss set piece (own label): keep the boss plus a separate minion list; change silhouette, palette and wave timing. Ref: src/GameServer/Bot/Population/ColdCombatProfile.js line 12 (minion file not opened).

Readability at 375 px, sound and silhouette: not read (no art or audio in this donor).

## Not read
See the .assets.json not_read list. In short: most template, item, skill and HTML files; crests beyond one header; the logo; the Bot code beyond the population config and grep lines; the paired upstream NodeL2-NodeL2 donor.
