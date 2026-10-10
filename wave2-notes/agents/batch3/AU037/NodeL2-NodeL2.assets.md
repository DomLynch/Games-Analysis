# NodeL2-NodeL2 (asset audit, cell AU037)

Donor: NodeL2-NodeL2 (Lineage II Chronicle 2 server emulator in Node.js). Tree: /mnt/frankendom-donors/NodeL2-NodeL2/ (228 files on the VPS, read-only).

Code licence: Apache License 2.0 (LICENSE line 2; README line 47).
Asset licence: none stated. The JSON datapack and HTML dialogue under data/ have no licence file or header. The Lineage II client is a separate download (README line 12) and is not in the box. The README (line 44) says 50 percent of the datapack is unimplemented.
Rights-holder status: unknown. The repo does not say where the datapack came from. README line 1 names LINEAGE II as the game being emulated.
Best class: C (data tables of unclear provenance). No art, audio, model, map or font file exists in the box: extension count js 171, json 39, html 11, sql 1, sh 1, md 1, ini 1, LICENSE 1.

Half read: server (src/GameServer, in part) and data pack (data/, in part). Client half not in the box. Paired donor in this batch: none.

## Asset groups
- Monster and NPC records: data/Npcs/npcs.json, 2223 records. Class C.
- Spawn coordinates: data/Npcs/Spawns/spawns.json, 7868 records. Class C.
- Drop tables: data/Npcs/Rewards/rewards.json, 3450 records. Class C.
- Items: weapons 473, armours 684, others 3488. Class C.
- Skills: data/Skills/Active/active.json, 393 records (other skill files not opened). Class C.
- Teleports, spawn templates, shop, other templates: partly read or not read. Class C.
- Dialogue: data/Html, 11 files, one read (126.html). Class C; text not reproduced.

## Inspiration
- Two-stage drop roll: an overall gate, then one weighted pick with first-hit-wins (NpcRewards.js:10-17). Recreate with our own tables.
- Spawn points as per-template coordinate lists with a bounds field (SpawnNpcs.js:12-14). Matches the zones-as-data ruling and row 23.
- Aggro as a per-creature hostile flag plus a radius (UpdateEnvironment.js:6, 22; Model/Npc.js:35).
- Leash: in combat, distance is checked each interval and combat drops at 150 units (Npc.js:57-66). Reuse the shape for row 4.
- Staggered replies after a long move instead of one burst (UpdateEnvironment.js:9-11). Relevant to the per-tick budget in row 18.
- Skill levels as rows of power, cost and item per level (data/Skills/Active/active.json:5). Matches catalogue rows 20 and 21.
- Dialogue as small HTML menu pages (data/Html/126.html:4). Keep the menu shape, write our own text.
- Defects to fix, not copy: zero-coordinates object in the combat timeout (Npc.js:57-61, use not read); a TODO z hack (UpdateEnvironment.js:24).

## Briefs
- Leashed roaming guard (own label): anchor, radius-on-enter, leash at distance. Keep radius aggro, leash, hostile flag. Change: zone-data anchor, visible walk-home, a new original design (Npcs/npcs.json:3, Npc.js:65-66).
- Two-roll drop bundle (own label): overall gate, then weighted pick. Keep the two stages. Change: rarity colour and a distinct sound cue, named weight tables (NpcRewards.js:10-17, rewards.json:4).

## Cross-links
Zones and spawns: spawn tables are the useful part. Loot: the drop shape. Camera, hud-ui, vfx, animation, sound: no assets in the box.

## Not read
Skills Tree, Passive and Switch files; Items content beyond counts; Templates other than Spawns; Admin shop; most of Html; the auth server; the network layer; database.sql. config/default.ini holds credential-style settings; values deliberately not recorded.
