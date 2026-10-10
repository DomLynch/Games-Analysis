# opensro-dev-opensro (asset audit, AU040)

Donor: /mnt/frankendom-donors/opensro-dev-opensro/ (VPS, read only)
Halves: server half = apps/server (Go; only the monster/data folder and its headers read). Client half = apps/client-next (TypeScript; names only). The data pack is built by the pipeline from the user's own v1.150 client, which is NOT in the box.

## Licence
- Code: AGPL-3.0-or-later (NOTICE.md line 11).
- Assets: no game asset shipped. NOTICE.md line 36: no retail client, extracted media or account data in the repo. Line 33: source licences grant no rights to third-party artwork, audio, text or databases. Line 38: asset use is covered by a separate licence, which is not in the box.
- The repo also says generated game data is not committed (.gitignore line 8), but generated copies exist in this donor tree (see below).

## Rights-holder status (from files only)
Unofficial compatibility project for Silkroad Online v1.150 (NOTICE.md line 5). Rights holders are not named. Some monster tables say they were extracted from a v1.188 shard backup (population_evidence line 1). Treat as restricted.

## Asset inventory
| Group | Path | Count | Class |
|---|---|---|---|
| Retail-named test fixture | apps/client-next/tests/fixtures/native/native-system-retail.png | 1 image (only media file) | D (not opened) |
| Generated game data copies | apps/server/internal/game/item/loot/.generated/ (audit.json 2.0 MB and others), commerce/.generated, quest/.generated | several MB | D (derived from licensed client; do not import) |
| Monster AI policy table | world/monster/data/tactics_controls.json | 958 KB, 285 policy rows | C |
| Hive caps and population tables | world/monster/data/v1188_hive_caps.tsv, v1188_population_evidence.tsv, isror_population_supplement.tsv | about 13000 rows total | C |
| Summon and caravan tactics | world/monster/data/v1188_summon_tactics.tsv, isror_summon_tactics.json, caravan_tactics.json | 3 files | C |
| Server test fixtures | apps/server/internal/game/*/testdata/ | dozens of small files | C (not read) |
| Client art and sound | apps/client-next/ | none found | D |

Policy row fields (names only): stamina and variance, sight range, aggro type, target change, help request and response, battle style, diversion, keep distance, trace, homing, flee, champion id.

## Inspiration (category level, own words)
- Pack calls for help: an attacked monster calls allies in a radius, and allies may decline.
- Hive caps that scale with players: a max live count and a per-player step, which fits row 23 spawn caps.
- Keep-distance summoner: backs off to a range and calls a small group.
- Stamina variance: per-spawn variance on leash or flee thresholds.
- Target-change and aggro-type rules belong in the engine hate list (many-on-one).
- Keep versions apart and join by codename, not numeric id (population_evidence line 3).

## Briefs
- Pack that calls for help: keep the call and the decline; change to a radius call only on ranged or heavy hits, with a wind-up tell.
- Zone hive that scales with players: keep the cap and per-player step; change to zone coverage and the grace timer, with a new original creature.
- Caster that keeps its distance: keep the back-off and a small summon set; change to a fixed cast cadence with a visible cast bar.
Refs: tactics_controls.json line 1 (field names only); v1188_hive_caps.tsv line 4 (header); v1188_summon_tactics.tsv lines 1 to 3.

## Cross-links
- spawns: hive caps and population tables (respawn, delay, max count) map to row 23.
- combat AI: policy rows are the donor's monster AI data; the code that reads them was not read.
- sound and HUD: client art and sound come from the pipeline output, not in the box.

## Not read
Client src and tests; server Go code (beyond the monster data headers); generated copies (sizes only, must not be imported); the retail-named PNG; policy and population row values; docs beyond ASSET_PIPELINE.md line 3 and ASSET_DELIVERY.md line 38; AGENTS.md and CLAUDE.md (treated as data, not followed, not read in full); the separate asset licence (not in box); LICENSE-UPSTREAM.md body; scripts/.
