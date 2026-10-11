# R7: Neverwinter (Cryptic / Perfect World MMO) sources, legal class and learning value

Research date: 2026-10-11. Read-only. Nothing was cloned, downloaded, run, or spent. No leak mirrors, torrents or rips were opened or linked. Leaked repos are named by account only.

Legal class key:
- **OPEN**: our own code under a licence that permits reuse (MIT, Zlib, Apache-2.0, GPL, AGPL). Ideas and code are usable within the licence terms.
- **SHAPE-ONLY**: leaked or restricted material. Learn the structure, never copy code or data.
- **UNCLEAR**: no licence, or the licence cannot be confirmed. Read-only, do not copy.
- **EXCLUDED**: bots or asset-capture tools. Not used.

Verification basis: "fetched" means the page was read this session. "snippet" means only the search result text was seen. Where a page could not be read, that is stated.

---

## 1. Plain-English verdict

- **Open code for Neverwinter Online (the MMO) exists, but it is thin.** The only clearly reusable item is `nohbdy/libhogg` (MIT, C++). It reads the Cryptic `hogg` archive format. It was last pushed in 2013 and is marked "educational use only". Its author states it does not modify the game or its data.
- **Cryptic's shared tooling does have open code.** `gibbed/Gibbed.Cryptic` (Zlib, C#) covers Champions Online, Star Trek Online and Neverwinter. It has a file-format project with readers for `Hog`, `Journal`, `Parse`, `ParseSchema`, `Texture`, `Blob`, `FieldList`, `PCode` and `Serialization` (folder names read from the GitHub listing; file contents not read). Last pushed 2021-10-03, so it is stale.
- **No Neverwinter Online server emulator was found.** Two GitHub searches (501 results for "neverwinter", 14 for "neverwinter online") showed no emulator. The web search also found none. Treat "does not exist" as "not found by this search", not proof.
- **The City of Heroes situation is the big legal trap.** Its Cryptic-engine source and data leaked in April 2019. A licensed fan server (Homecoming) has been running since a January 2024 deal with NCSoft. That licence covers hosting, not code release. There is no legitimate open-source CoH server. The leaked material is SHAPE-ONLY at best, and we recommend not opening it at all.
- **Live status of Neverwinter:** still running in 2026 (MassivelyOP roadmap, 2026-09-03, snippet). Module 34 is due later in 2026. Foundry (player-authored content) was switched off on 2019-04-11.
- **Usable documentation is press and forum level, not engineering.** No Cryptic architecture talk (Gameserver/Mapserver/Controller) was found. Combat material is 2012-era preview coverage. There is no current combat wiki (the Fandom page returned HTTP 402).
- **Open alternatives for action-combat MMO learning:** Erupe (MIT, archived, Monster Hunter Frontier), MHServerEmu (AGPL-3, Marvel Heroes, active), OpenDAoC (GPL-3, active). Frameworks: Colyseus (MIT), Nakama (Apache-2.0).

---

## 2. Table of every repo or project

### 2a. Neverwinter Online (the MMO) and Cryptic-shared tools

| Name | What it is | Licence | Status | Legal class | Link | Verified |
|---|---|---|---|---|---|---|
| nohbdy/libhogg | C++ library and `hogg` CLI to extract/list files from Cryptic hogg archives (author says built and tested on Neverwinter Online; believes Star Trek Online uses the same format, unconfirmed). README: "does not modify the game"; "intended for educational use only". | MIT | Last push 2013-05-17. Dormant. 6 stars, 1 fork, 1 open issue. | OPEN (code). Assets read are the publisher's; use for format learning only. | https://github.com/nohbdy/libhogg | 2026-10-11, fetched (API + HTML) |
| gibbed/Gibbed.Cryptic | "Tools & code for Cryptic Studios developed games (Champions Online, Star Trek Online, Neverwinter)". C# file-format and conversion project: `ConvertObject`, `ConvertResource`, `ExportSchemas`, `FileFormats` (Hog, Journal, Parse, ParseSchema, Texture, Blob, FieldList, PCode, MATPYR, StashTable, Serialization), `GenerateSerializer`, `Grammars`, `Unpack`. Code file names read; contents not read. | Zlib | Last push 2021-10-03. Not archived. 33 stars. Stale. | OPEN (code). Treat any extraction use as asset-rip, out of scope. | https://github.com/gibbed/Gibbed.Cryptic | 2026-10-11, fetched (API + HTML + contents listing) |
| lokkju/pyhogg | Python toolkit for Cryptic hogg files. Lists files from DataList and Journal, extracts them, converts Wtex textures to DDS. Ships Kaitai `.ksy` specs: `hogg_spec.ksy`, `datalist_spec.ksy`, `mset_spec.ksy`, `wtex_spec.ksy`. The `.ksy` files are the most useful format-shape source found. Not opened. | None (no licence) | Last push 2022-11-30. 8 commits, no releases. Stale. | UNCLEAR (no licence means all rights reserved). Read the `.ksy` specs only. | https://github.com/lokkju/pyhogg (specs in `/kaitai/`) | 2026-10-11, fetched (API + search snippet) |
| nerfregen/Woofers | "City of Heroes protocol translation layer" (C++). Protocol-level, relevant to the protocol question. Not opened. | None | Last push 2014-06-13. Dormant. | UNCLEAR. Do not copy. | https://github.com/nerfregen/Woofers | 2026-10-11, metadata seen via API |
| JohnnyDoesStuff/nw-guild-tools | "Some tools to make life easier for working with data in the online game Neverwinter" (PowerShell). Not opened, so it is not known whether it touches game data or only guild spreadsheets. | MIT | Pushed 2026-10-11. 0 stars. Active. | OPEN (code). Check the data source before any reuse. | https://github.com/JohnnyDoesStuff/nw-guild-tools | 2026-10-11, metadata via API |
| AdamKnube/NWXplorer | Combat-log reader for Neverwinter Online (VB.NET). Idea-level reference for combat-log telemetry. | None | Last push 2020-01-19. Dormant. | UNCLEAR. | https://github.com/AdamKnube/NWXplorer | 2026-10-11, metadata via API |
| lokkju/nwotools | "Neverwinter Online Tools" (Python). Not opened. | None | Last push 2022-12-08. | UNCLEAR. | https://github.com/lokkju/nwotools | 2026-10-11, metadata via API |
| qpAHTA3EP/EntityTools | Plugin for an "Astral bot" that automates Neverwinter Online play. | None | Last push 2023-05-11. | EXCLUDED (automation bot). | https://github.com/qpAHTA3EP/EntityTools | 2026-10-11, metadata via API |
| Benio101/NWO-SCA-bot | Neverwinter Online "Sword Coast Adventures" bot (JavaScript). | CC-BY-4.0 | Archived. Last push 2016-09-30. | EXCLUDED (automation bot). | https://github.com/Benio101/NWO-SCA-bot | 2026-10-11, metadata via API |
| sharshazo/Neverwinter-Online-al-espa-ol | Spanish translation patch for the client, with install steps. | None | Pushed 2026-08-11. | UNCLEAR. Client-file patch. Not used. | https://github.com/sharshazo/Neverwinter-Online-al-espa-ol | 2026-10-11, metadata via API |
| djrapidpl/neverwinterfiles | "Pliki zwiazane z Neverwinter Online" (Polish). Old game files. | None | Last push 2014. | UNCLEAR. Likely asset dump. Not opened. Do not use. | https://github.com/djrapidpl/neverwinterfiles | 2026-10-11, metadata via API |
| Neverwinter Nights (NWN/NWN2) tools (niv/neverwinter.nim, nwnx, nwn-lib, nwnsc, etc.) | Tools for BioWare's Neverwinter Nights, not Neverwinter Online. Listed to avoid confusion. | Mixed (MIT, GPL, NOASSERTION) | Mixed | Not in scope. | e.g. https://github.com/niv/neverwinter.nim | 2026-10-11, API |

Not found: any Neverwinter Online server emulator, datamined powers/feats database, JSON/CSV game-data dump, or Foundry tooling. Searches for "neverwinter online datamined", "powers feats json csv" and "neverwinter online emulator" returned none relevant.

### 2b. City of Heroes (Cryptic engine) and related projects

| Name | What it is | Licence | Status | Legal class | Link | Verified |
|---|---|---|---|---|---|---|
| Leaked CoH Cryptic-engine source (a GitHub repo under the account "Thunderspies", description says "Cryptic engine source code for City of Heroes up until its shut down in 2012") | Claims to be the leaked CoH client/server engine source. **Not linked, not opened, not cloned.** | None | Pushed 2026-10-10 (listing metadata only). | **LEAKED. SHAPE-ONLY at most. Tainted.** Recommend no use. | Not linked (leak mirror) | Metadata seen in API listing only |
| "The plain-text data for City of Heroes Issue 24" (repo under the same "Thunderspies" account) | Claims to be the CoH i24 game data. | None | Pushed 2026-10-01. | **LEAKED. Game data. Do not use.** | Not linked (leak mirror) | Metadata seen in API listing only |
| n15g/coh-content-db | "City of Heroes Content Database" (TypeScript). Not opened. Likely built from game data. | Unlicense | Pushed 2026-10-11. | UNCLEAR. Provenance not checked. | https://github.com/n15g/coh-content-db | 2026-10-11, metadata via API |
| emersonrp/bindcontrol | Keybind, macro and popmenu manager for CoH (Python). A client-side tool with no server code. | GPL-3.0 | Pushed 2026-10-07. Active. 8 stars. | OPEN. | https://github.com/emersonrp/bindcontrol | 2026-10-11, metadata via API |
| Chronimal/Launcher | Alternative launcher for Ourodev's CoH server (GDScript). | MIT | Archived. Last push 2020-07-02. | OPEN. Dead. | https://github.com/Chronimal/Launcher | 2026-10-11, metadata via API |
| auroris/City-of-Heroes-Account-Portal | PHP account portal for CoH servers. | MIT | Archived. Last push 2021-11-24. | OPEN. Dead. | https://github.com/auroris/City-of-Heroes-Account-Portal | 2026-10-11, metadata via API |
| CaitlynMainer/CityVault | Account panel and management system for CoH servers. | MIT | Pushed 2025-12-16. | OPEN. Stale-ish. | https://github.com/CaitlynMainer/CityVault | 2026-10-11, metadata via API |
| joelc67/hero-companion | Offline CoH: Homecoming build planner that "optimizes from the game's actual math". Fan project, description says "free & noncommercial". Not opened. | CC BY-NC-SA 4.0 (from description) | Unknown (truncated listing). | UNCLEAR. NonCommercial. Do not copy into a commercial product. | https://github.com/joelc67/hero-companion | 2026-10-11, description only |
| TalonGrayson/hero-ogler | Helper for capturing 3D models of CoH with OGLE and GLIntercept. | None | Last push 2022-01-30. | EXCLUDED (asset capture). | https://github.com/TalonGrayson/hero-ogler | 2026-10-11, metadata via API |
| Homecoming fan server (wiki.homecomingservers.com) | Fan server, licensed by NCSoft 2024-01-04. Its public wiki describes a server layout (auth, web, DB per shard, mapserver sizes). Derived from the leaked code. Not used. | Proprietary | Live (per news snippet). | SHAPE-ONLY at most, tainted. Not used for architecture. | Not linked | cgmagonline news fetched; wiki not opened |

### 2c. Other Cryptic titles

| Name | Status | Legal class | Verified |
|---|---|---|---|
| Champions Online, Star Trek Online | No public emulator or server code found. Gibbed.Cryptic covers the same formats (see 2a). | Not applicable | Search only |
| Dungeons & Dragons Online (Turbine, not Cryptic) | Only `WestonChan/ddo-data` found (MIT, see 2d). | — | API |

### 2d. Legitimately open alternatives to learn the same ideas from

| Name | What it is | Licence | Status | Legal class | Link | Verified |
|---|---|---|---|---|---|---|
| Mezeporta/Erupe | Monster Hunter Frontier server emulator in Go. Sign, Entrance and Channel servers. Reverse-engineered. Event systems. Good reference for an action-combat MMO's server split. README does not document the wire protocol; points to an Erupe wiki and `docs/scenario-format.md`. | MIT | Archived (read-only). Last push 2026-07-17. | OPEN | https://github.com/Mezeporta/Erupe | 2026-10-11, fetched (HTML README) |
| Crypto137/MHServerEmu | Marvel Heroes server emulator (action ARPG, a Cryptic-like instanced/zone game). Full support for build 1.52.0.1700. Systems restored to the 2017 shutdown state. Docs index at `docs/Index.md`. | AGPL-3.0 (copyleft, so read for ideas only) | Active. Pushed 2026-10-08. 564 stars. | OPEN (AGPL) | https://github.com/Crypto137/MHServerEmu | 2026-10-11, fetched (HTML README) |
| OpenDAoC/OpenDAoC-Core | Dark Age of Camelot server emulator (C#). Tab-target MMO combat, realm PvP. | GPL-3.0 | Active. Pushed 2026-09-25. 69 stars. | OPEN | https://github.com/OpenDAoC/OpenDAoC-Core | 2026-10-11, API |
| ServUO/ServUO | Ultima Online emulator (C#). | GPL-2.0 | Active. Pushed 2026-10-06. 757 stars. | OPEN | https://github.com/ServUO/ServUO | 2026-10-11, API |
| modernuo/ModernUO | Ultima Online emulator (C#), a performance-oriented fork. | GPL-3.0 | Active. Pushed 2026-10-10. 361 stars. | OPEN | https://github.com/modernuo/ModernUO | 2026-10-11, API |
| EQEmu/EQEmu | EverQuest server platform (C++). Named in our donor-game list. | GPL-3.0 | Active. Pushed 2026-08-26. 635 stars. | OPEN | https://github.com/EQEmu/EQEmu | 2026-10-11, API |
| azerothcore/azerothcore-wotlk | WoW WotLK server core (C++). Modular. | GPL-2.0 | Active. Pushed 2026-10-11. 9022 stars. | OPEN | https://github.com/azerothcore/azerothcore-wotlk | 2026-10-11, API |
| LandSandBoat/server | FFXI server emulator (Lua). | GPL-3.0 | Active. Pushed 2026-10-11. 511 stars. | OPEN | https://github.com/LandSandBoat/server | 2026-10-11, API |
| NoCode-NoLife/Melia | "Open-Source MMORPG Server Emulator" (C#). The game it targets was not verified. | GPL-3.0 | Active. Pushed 2026-05-19. | OPEN. Game unverified. | https://github.com/NoCode-NoLife/Melia | 2026-10-11, API description only |
| colyseus/colyseus | Node.js multiplayer framework (rooms, state sync). Relevant to a real-time combat server. | MIT | Active. Pushed 2026-10-09. 7359 stars. | OPEN | https://github.com/colyseus/colyseus | 2026-10-11, API |
| heroiclabs/nakama | Open-source game backend: matchmaking, leaderboards, chat, social, multiplayer. Relevant to parties, guilds and matchmaking. | Apache-2.0 | Active. Pushed 2026-10-08. 13492 stars. | OPEN | https://github.com/heroiclabs/nakama | 2026-10-11, API |
| WestonChan/ddo-data | DDO Tools game-data ETL pipeline and public API (Rust). Community-sourced data. | MIT | Active. Pushed 2026-10-07. | OPEN. Data provenance not checked. | https://github.com/WestonChan/ddo-data | 2026-10-11, API |
| DarkstarProject/darkstar | FFXI emulator, deprecated (superseded by Project Topaz). | GPL-3.0 | Archived. | OPEN. Dead. | https://github.com/DarkstarProject/darkstar | 2026-10-11, API |

---

## 3. Architecture and design learnings (with primary sources)

Confidence is marked on each point. Where the source is a search snippet only, that is stated.

**Engine and studio**
- Neverwinter runs on Cryptic's own in-house engine, shared with Champions Online and Star Trek Online (Giant Bomb states this; snippet). GameGPU describes the engine as Cryptic's own, using DirectX 9 (snippet). https://giantbomb.com/wiki/Games/Neverwinter · https://en.gamegpu.com/test-gpu/mmorpg-onlajn-igry/neverwinter-dungeons-a-dragons-test-gpu (search snippet only)
- Cryptic licensed Simplygon, a 3D-optimisation tool, for Neverwinter's art pipeline (snippet). https://www.gamebanshee.com/xfh6
- A 2012 GDC Europe session by Cryptic COO Craig Zinkievich was announced on "User-Generated Content In MMOs – From Champions Online To Neverwinter". No recap or slides were found, so it is unverified that it happened as scheduled. https://www.gamedeveloper.com/design/gdc-europe-adds-i-witcher-2-i-i-love-i-postmortems-and-more (snippet)

**Server architecture (Gameserver / Mapserver / Controller)**
- **Not found in any public Cryptic documentation.** The names "mapserver" and "gameserver" appear only in player-level fan wikis for City of Heroes (error messages), and in a fan project's layout (auth, web, per-shard DB, mapservers). That fan layout comes from leaked code, so it is tainted and is not used here.
- Cryptic's job postings describe databases, networking, transactions and chat at large scale (snippet). No architecture diagrams were found.
- **Learning move:** use the `gibbed/Gibbed.Cryptic` FileFormats folder structure (Parse, ParseSchema, FieldList, PCode, Serialization) as evidence that Cryptic uses schema-driven serialised data. Confirm by reading the files, which this session did not do.

**Powers and combat (dated: 2012 previews, not current)**
- Early previews listed at-will, encounter, daily and utility powers. Daily powers were not on a real-time timer. They charged through class-specific actions (forum quote of early testing; snippet). https://www.tentonhammer.com/articles/neverwinter-hands-on-at-e3-2012.amp (snippet)
- Stamina pays for dodge, shift, sprint, guard and roll. Guardian Fighters use a Guard Meter instead. Early coverage describes dodge as a double-tap of movement keys, with brief invulnerability (snippet). https://neverwinter.fandom.com/wiki/Fighter (snippet)
- Aggro complaints in early testing; Paladin threat tools described as an encounter AoE threat ability and a daily to hold boss threat (snippet). https://www.gamebanshee.com/kwrfa (snippet)
- Companion design in preview: a "henchman" interface with summon/dismiss outside combat (snippet). Treat as pre-release.
- Feat system overhaul: the Feats tab and feat trees were removed. Each paragon path has 5 pairs of feats, and the player picks one from each pair. This comes from a developer blog on class changes (snippet; date unknown).
- Champions Online's powers design moved away from archetype-locked power sets toward an open, toolkit-like system, with Advantages for customisation (Bill Roper and Randy Mosiondz interviews; snippet). https://www.tentonhammer.com/articles/champions-online-powers-interview-sorcery-darkness-and-supernatural (snippet)
- **Not verified:** tab targeting, current stamina numbers, current power slot limits, and the current companion system.

**Foundry (player-authored content)**
- Launched 2012. Developer blog 2012-09-23 (BuckGB, GameBanshee; fetched): content found through a landing page, job boards in public zones, and "Harper Agents". Authors can use NPCs, objects and monsters from public and adventure zones. Content can sit inside adventure zones (instanced) or in a separate world. Design goal: player content should not stand out from Cryptic's own adventures. https://www.gamebanshee.com/xfhd (fetched)
- 2012 preview coverage (GameSpot/Engadget, snippet): authors start from story, map, dialogue or costume. Maps are assembled from dozens of preset rooms that connect by doorway alignment. Authors can test live. Rewards are set by the engine, not the author. Limits on exploits: one respawn campfire per map, no random chests, one automatic "Super Chest" per quest.
- **Sunset:** announced 2019-03-05 by Cryptic. Foundry closed for Neverwinter and Star Trek Online on 2019-04-11. Stated reason: the legacy knowledge needed to maintain it at quality was lost, and the cost would take from new features. The article does not say whether existing Foundry content stays playable. https://www.gamebanshee.com/k4yrd (fetched via redirect)

**Economy (snippets from the Neverwinter wiki and forums, mostly 2013–2018)**
- Two currencies: Astral Diamonds (AD), earned in play, and Zen, the premium currency. An AD-to-Zen exchange lets players trade time for money. https://neverwinter.fandom.com/wiki/Zen (snippet)
- Auction house: purchases are paid in AD. The house takes a 10% seller cut. Each character can list up to 40 items. Proceeds and unsold items are collected from a Postal Courier NPC (snippet). https://neverwinter.fandom.com/wiki/Auction_House (snippet)
- Zen is required only for a limited set of items: character slots, active companion slots, and account-wide mounts (snippet).
- Balance problems: developers said AD was over-supplied on PC through exploits, and under-supplied on Xbox One. Exchange orders took days in 2018. During open beta, players auctioned negative AD and doubled their money; the fallout led to a rollback and compensation (snippet). https://forum.arcgames.com/neverwinter/discussion/1203585/astral-diamond-changes (snippet)
- Current fees and exchange rates were not verified.

**Party, guild and instances**
- No primary source on the current party, guild or instanced-dungeon flow was found. The Foundry note above (instanced vs seamless placement chosen by the author) is the only instancing detail from a primary source.

**Live status**
- Still running in 2026. A MassivelyOP roadmap article (2026-09-03, snippet) describes the Monoliths of Madness patch cycle, Module 34 later in 2026, and 2027 class and item-level changes. https://massivelyop.com/2026/09/03/neverwinter-lays-out-its-roadmap-for-the-remainder-of-2026-and-into-early-2027/ (snippet)
- A 2026 report (snippet) says Cryptic founder Jack Emert returned as CEO. Regional shutdowns (HK, June 27) are reported, year not confirmed.

**Legal history of City of Heroes (for context)**
- The CoH client and server source leaked in April 2019, after a secret server (SCORE) was exposed. Leaked code spread and fan servers appeared. Sources disagree on the origin (news reports, snippet). https://massivelyop.com/2019/04/15/score-city-of-heroes-emulator-leak/ (snippet) · https://www.pcgamer.com/au/after-a-secret-server-shocked-the-community-100000-fans-are-finally-playing-city-of-heroes-again/ (snippet)
- On 2024-01-04 NCSoft granted Homecoming a licence to host and develop the game. It covers Homecoming only. "NCSOFT still owns the City of Heroes intellectual property and its derivatives." Homecoming says it does not share its source code. The article makes no statement about open-source licensing. https://www.cgmagonline.com/news/city-of-heroes-homecoming-fan-server-win (fetched)

---

## 4. What Frankendom could borrow (ideas only, licence-safe)

Ideas only. No code, data or assets from any SHAPE-ONLY or UNCLEAR source.

1. **Author-built zone blocks.** Foundry built maps from dozens of preset rooms connected by doorway alignment. Frankendom has 700+ zones, so a snap-together room kit with doorway alignment could make zone authoring faster.
2. **Author chooses seamless or instanced placement.** One flag per authored zone. Good for a lot of small content.
3. **Engine-owned rewards.** Authors choose the content, the engine decides the rewards. This removes a large exploit class. Foundry's hard caps (one campfire per map, one automatic chest per quest) are a cheap guard to copy as design rules.
4. **Discovery by job board and spotlight.** Feature a few player-made missions on the landing page and on in-zone boards.
5. **Stamina-gated evasion.** One pool pays for dodge, sprint and guard. Guard-meter variant for tanks. Early previews only; verify the current design before copying the numbers.
6. **Charge-by-action powers.** Daily-style powers that charge through class actions instead of a real-time timer. Avoids timer-driven play.
7. **Paired feat choices.** Feats removed as trees; each path offers pairs and the player picks one from each. Simple to build and to balance.
8. **Two-currency economy with a time-to-premium exchange.** Earned currency (AD) and a premium currency (Zen). Use a listing cap (40), a seller fee (10%), and a postal collection step. Watch for negative-price exploits (the beta lesson). Only as a design pattern.
9. **Party, matchmaking and social back end.** Nakama (Apache-2.0) and Colyseus (MIT) provide matchmaking, parties and rooms as ready-made patterns, with licence-safe reuse.
10. **Authoring safety.** Schema-driven data (Gibbed.Cryptic's Parse / ParseSchema / FieldList idea): one schema for all zone and power records, with a validator. This is an idea from file-structure names only; read the code before relying on it.

---

## 5. Unverified items

- Whether `JohnnyDoesStuff/nw-guild-tools` reads game data or only guild spreadsheets (not opened).
- Whether `n15g/coh-content-db` is built from game files (not opened).
- Contents of `gibbed/Gibbed.Cryptic` FileFormats and `lokkju/pyhogg` `.ksy` specs (only names read, not contents).
- Whether `nohbdy/libhogg` and `Gibbed.Cryptic` correctly parse current Neverwinter Online builds (2013 and 2021 code).
- The current Neverwinter combat system: stamina, tab targeting, current power slots and companions. No current combat wiki was readable (Fandom returned HTTP 402).
- Whether the Cryptic GDC Europe 2012 session happened as scheduled and what it covered.
- Cryptic's server architecture (Gameserver/Mapserver/Controller). No primary source was found.
- Current Neverwinter AD, auction house fees and Zen exchange rates (wiki figures are from search snippets).
- Whether the Foundry content from 2012–2019 is still playable after the 2019 sunset.
- The game targeted by `NoCode-NoLife/Melia`.
- Whether Champions Online or Star Trek Online have any open server code beyond Gibbed.Cryptic (search returned none, but the search was combined and not exhaustive).
- Whether the Neverwinter Online Spanish translation patch repo or any other client-file repo is safe to open (not opened; treated as UNCLEAR).
- The Homecoming fan wiki's server layout, which is derived from leaked code (not read, not used).
- Dates of the Neverwinter dev blog on class changes and feats (undated snippet).
- Regional shutdown year for Neverwinter (HK, June 27).

Rule compliance: no downloads, clones, runs or spend. No leak mirror was opened or linked. The CoH leak repos are named only by account and class (LEAKED, not linked). Automation bots are EXCLUDED and not for use.
