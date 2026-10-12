# Gap check RP (rendering performance on phones: draw calls, batching, instancing, LOD, culling)
Date 2026-10-12. Frankendom repo read: frankendom-lead-catalogue at commit 517b32248 (read-only). Donor notes: 51 (RP002 to RP018, 3 each; RP001 does not exist). Client frame pacing, quality ladder, memory and zone streaming are in [CP.md](CP.md); this file does not repeat them.

## Summary for Dom
1. The duel is already built the cheap way: arena statics merged into few meshes (src/arena.ts:298, 367), crowd, banners, blood and burst FX as InstancedMesh (arena.ts:456, finisher-blood.ts:90-93, armfeel-fx.ts:10), a 40-mesh / 120k-triangle / 13 MB arena cost test (tests/arena.test.ts:120), a phone tier (quality.ts) with lower pixel ratio, 512 shadow map and simplified phone armour files (rank-look.ts:59-68). Most batching notes are therefore SKIP or REUSE for the fight.
2. Counts by donor note: REUSE 10, ADD 15, SKIP 26 (51 rows; the nakama row is a "no rendering code" verdict, not a note). ADD rows merge into 4 builds (G1 to G4). Ten of the ADDs wait on work that does not exist yet (client town and zone drawing); the notes are only useful then.
3. Real gaps: (a) nothing GATES draw calls per fight frame, only arena meshes; ?perf shows `draws` (main.ts:2062) and the beacon sends it, but no test or release row fails on it; (b) no render LOD or animation-rate LOD for far characters (grep of src and origins/presence finds none), yet launch gate S2 needs 40 animated geared characters at 30 fps; (c) phone limits are scattered `PHONE ?` branches, not one table.
4. Top 3 additions: G1 a measured fight draw-call and triangle ceiling per tier (counter plus test, no new batcher); G2 one quality-tier data table that all the scattered phone branches read (feeds the CP.md governor); G3 town crowd LOD (size-based mesh level, slower animation far away, shadow casters capped, enter/leave margin) built for launch gate S2.
5. Licence note: 31 of 51 donors are copyleft or restricted (GPL, AGPL, CC BY-SA, NetHack licence, Valve SDK, Sustainable Use, jynew conflict); no donor numbers from them appear here. Permissive donors (MIT, Apache, BSD, Zlib, CC0) are named but no numbers are carried; every budget must come from our own phone measurement.

## What we have today (shared by rows)
- Renderer: `antialias: true`, pixel ratio capped by tier (src/scene.ts:111-112, quality.ts `pixelCap`), PCF shadows, sun shadow map 512 on phone / 1024 else, fixed box (scene.ts:152-153). One-way drop to ratio 1 (scene.ts:755, main.ts:2056; ladder is CP.md).
- Phone tier: quality.ts `detectPhoneTier`; fighter textures capped at 1K (`budgetTextures`, quality.ts); rank-look armour has `-phone.glb` simplified files (rank-look.ts:59-68); rank-look copies cast no shadow on phone (characters.ts:624); rain count cut on phone (arena.ts:379).
- Instancing/merging: arena merged geometry (arena.ts:298, 367, 520); instanced banners, crowd (arena.ts:425, 456); Pit wall is two draws (pit/wall.ts:4); blood and burst pools (finisher-blood.ts:90-93, armfeel-fx.ts:10); 12 pooled ground splats (gore.ts:14-16).
- Culling: crowd sphere-vs-frustum per spectator (arena.ts:536-545); `frustumCulled = false` on skinned and FX meshes (characters.ts:422, lorarii.ts:82,116). The lorarii (guards on the wall) are OUT (arena.ts:590-601).
- Measuring: ?perf readout with draws, tris, programs (main.ts:2062-2070); perf beacon carries draws and tris (tests/perf-beacon.test.ts:9-20); `renderer.info.memory` (main.ts:1571).
- HUD is DOM (meters, hud.ts:30; four pooled damage-number spans, hud.ts:38) with a string key that skips unchanged writes (hud.ts:68).
- Server side: nearest-first cap of 40 characters and distance send-rate tiers (origins/presence/interest.ts:10-11, 113-123). No render LOD, no BatchedMesh, no LOD objects.
- Not built: any client zone/town drawing (no origins/client or zone render file). Gate S2 (docs/specs/origins/launch-gates.md:59) is open.

## Gap table
| Donor note | Idea (8 words) | We have today | Gap | Call | Lands in |
|---|---|---|---|---|---|
| RP002 Cataclysm-DDA (CC BY-SA) | Batch same-colour tinted sprites, bounded union box | Per-fighter materials; 2-4 figures in a duel | Nothing to batch at this count | SKIP (fight has too few sprites) | none |
| RP002 openbor (BSD) | Frozen base layer under menu; z-band draw | Fight is not rendered while a card is up (main.ts:975 `paused`, first-frame.ts:1-3) | Already stops the fight draw; z-band not needed | REUSE | main.ts:975 |
| RP002 dfhack (Zlib) | Strip-per-worker light grid, max merge | No per-cell light grid | Feature absent; note itself rejects | SKIP | none |
| RP003 xash3d-fwgs (GPL) | Skyline-packed decal atlas pages | 12 pooled splats, fixed set (gore.ts:14-16) | Decals do not churn; no per-decal texture bind problem | SKIP | none |
| RP003 Funkin (Apache) | Draw overlay layers layer-by-layer | Overlays are DOM (hud.ts:30, 38) | No canvas overlay layers | SKIP | none |
| RP003 LostCity (MIT) | Adaptive send radius, nearest first, byte cap | Fixed 40 m radius, nearCap 40, packet byte cap (interest.ts:9-10, 149) | Adaptive radius not needed while pose-only wire is small | REUSE | interest.ts:113-123 |
| RP004 Terasology (Apache) | Cap per-frame uploads, nearest first | Sliced texture upload with time cap (first-frame.ts:1-3, scene.ts:318-338) | Only first frame; zone chunk uploads absent | REUSE; chunk uploads ADD in G4 | first-frame.ts |
| RP004 NetHack (NGPL) | Per-row dirty span, changed flag per cell | HUD key compare (hud.ts:68); DOM compositor | 3D view moves every frame | SKIP | none |
| RP004 OpenGothic (MIT) | Batch by mesh+material; patch dirty slots | Instanced pools already update matrices in place (armfeel-fx.ts:37) | Dirty-slot upload only if instance counts grow large | SKIP (revisit with G3 40-character crowd) | none |
| RP005 OpenRA (GPL) | One vertex buffer, flush on four events | three.js owns buffers; no sprite batch | Draw count is not a bounded, tested number | ADD counter only (G1) | see G1 |
| RP005 OpenRCT2 (GPL) | 128 px dirty grid, merged redraw rects | DOM HUD; hud.ts:68 skip | Browser already repaints only changed DOM | SKIP | none |
| RP005 OpenTTD (GPL) | Pan map by blit, redraw exposed strips | No 2D map view in client | No map to pan | SKIP | none |
| RP006 OpenXcom (GPL) | Capped catch-up timer; cull under full-screen layer | dt clamp 0.1 s (main.ts:1819); paused() skips world (main.ts:975) | Both exist; pacing detail in CP.md | REUSE | main.ts:1819 |
| RP006 Cubyz (GPL) | Coarsest ready level, swap children as a set | No streamed zone tiles | Needs client zone drawing | ADD, deferred (G4) | new src/zone-render.ts |
| RP006 openage (GPL) | Shelf atlas for HUD glyphs, one upload | HUD is DOM text | No canvas glyphs | SKIP | none |
| RP007 SRB2 (GPL v2) | Sort opaque draws by state, count calls | Arena mesh count tested (arena.test.ts:120); fight draws only shown in ?perf (main.ts:2062) | No fight draw ceiling, no per-frame test | ADD counter and ceiling (G1) | see G1 |
| RP007 Source SDK 2013 (restricted) | Rank shadow casters by size; blobs for rest | Crowd is shadowless (arena.ts:456); only fighters cast | Casters are 2-4 in a duel; matters only in towns | ADD, deferred (G3) | see G3 |
| RP007 Warzone2100 (GPL) | One draw per mesh with per-instance buffer | FX and crowd already instanced (list above) | Skinned characters cannot instance (lorarii.ts:11 says so) | SKIP | none |
| RP008 OpenLara (BSD) | Portal-graph walk, scissor per room | Single open arena | No indoor zones yet | SKIP now (revisit only for a dungeon zone) | none |
| RP008 OpenTESArena (MIT) | Per-chunk three-way cull, then sort | Per-person sphere test over the crowd (arena.ts:536-545, 586) | Fine for the arena; chunk test helps NPC/prop-heavy zones | ADD, deferred (G4) | new src/zone-render.ts |
| RP008 ZenKit (MIT) | Per-zone far plane and fog as data | Fog colour and density per arena theme (arena-themes.ts:23); no far-plane field seen | Draw distance not a zone data field | ADD small (G4) | arena-themes.ts for arenas; zone row for towns |
| RP009 isometric-city (MIT) | Pause ambient motion during touch pan | Duel camera is locked (GAME_SPEC.md:148); ambient already cut on phone (arena.ts:379) | No pan in a duel | SKIP | none |
| RP009 Beyond-All-Reason (GPL v2) | Instance pool, swap-remove, bulk upload | Fixed-slot pools exist (finisher-blood.ts:90, armfeel-fx.ts:10) | Fixed rings cover FX | SKIP | none |
| RP009 colyseus (MIT) | Frame accumulator, clamped alpha, eased correction | Fixed 60 Hz accumulator (CP.md rows); PvP rollback (docs/specs/origins/frankendom-baseline.md:49) | Eased server correction not verified | REUSE | main.ts frame() |
| RP010 DevilutionX (restricted) | Deadline clock; skip draw not logic | Same accumulator; stall bound 0.1 s (main.ts:1819) | Skip-draw gate = CP.md frame pacer | REUSE (see CP.md) | main.ts |
| RP010 keeperfx (GPL v2) | Animated tile slots, pointer swap, band upload | No tiled terrain | Nothing to atlas | SKIP | none |
| RP010 endless-sky (GPL) | Cull effects by box; group by sprite | FX are few pooled meshes; frustumCulled false by design | No per-effect cull; counts are small | SKIP (G1 counter will show if wrong) | none |
| RP011 freeorion (GPL) | Batch range rings by colour; cap by focus | One telegraph group (boss-telegraph.ts:15-18); focus cap is CP.md | Few rings | SKIP rings; cap in CP.md | none |
| RP011 gawric L2J (Apache) | One batch for all nameplates, pixel hysteresis | No nameplate code (grep of src, origins); damage numbers DOM (hud.ts:38) | Towns need names over 40 characters | ADD, deferred (G3: DOM label pool, nearest N) | new src/town-labels.ts |
| RP011 gemrb (GPL) | Fixed logic step, separate render pacing | Same accumulator | Already built | REUSE | main.ts |
| RP012 hedgewars (GPL v2) | Packed sprite atlas, one draw batch | GLB meshes and textures, no sprites | No sprite pipeline | SKIP | none |
| RP012 jynew (restricted) | One phone/desktop settings table, one apply path | Scattered phone branches: scene.ts:112,152; characters.ts:624; arena.ts:379; quality.ts `pixelCap` | No single table | ADD (G2) | quality.ts |
| RP012 nakama (Apache) | No note (verdict NONE: no rendering code) | n/a | n/a | SKIP | none |
| RP013 pokemonAutoChess (GPL) | Ref-counted per-species atlas load and free | Hand disposal (CP.md row) | Zone-streaming ledger is CP.md | SKIP here (CP.md) | none |
| RP013 l1j (GPL) | Server enter/leave diff, split radii | Per-tick nearest list (interest.ts:113-123); split enter/leave radius not seen | Possible flicker at the 40 m edge | ADD (G3) | origins/presence/interest.ts |
| RP013 levy-street (MIT) | Per-frame GPU prep budget with cost ledger | One map per frame warm-up (scene.ts:318-338) with time cap | No ongoing ledger; ladder is CP.md | REUSE first-frame.ts; ledger deferred to CP.md | first-frame.ts |
| RP014 lincity-ng (GPL) | Cache static view layer; pad window by tall props | Static arena is merged geometry, not a cached image | Moving 3D camera | SKIP | none |
| RP014 athena-crisis (MIT) | One low-rate clock for ambient animation | All ambient advances on frame dt | Little saved in 3D | SKIP | none |
| RP014 open-duelyst (CC0) | One floor batch; per-device quality flag | Floor/walls merged (arena.ts:298); flag exists (quality.ts) | Already met | REUSE | arena.ts |
| RP015 openmw (GPL) | Instanced foliage per chunk, distance cull | No foliage or zone drawing | Needs zones | ADD, deferred (G4) | new src/zone-render.ts |
| RP015 otclient (MIT) | Cache slow overlay layer, re-raster on change | Overlays are DOM | No canvas overlay | SKIP | none |
| RP015 orbiter (GPL/MIT mix, treated copyleft) | Shadow size from actor's screen size | Fixed 512/1024 map, fixed box (scene.ts:152-153) | Fight camera is locked; only towns vary | ADD, deferred (G3) | scene.ts shadow setup |
| RP016 pshenok (MIT) | Redraw readout only when counter moves | hud.ts:68 key skip | Exists | REUSE | hud.ts |
| RP016 ryzom (AGPL) | Shared face budget, smoothed LOD slot pick | Phone `-phone.glb` files are static LOD by tier (rank-look.ts:59); no runtime LOD | No per-frame budget for a crowd | ADD (G3) | new src/town-lod.ts |
| RP016 scummvm (GPL) | Pace by time since present; skip gate | No cap (CP.md) | Covered by CP.md frame pacer | SKIP here (CP.md) | none |
| RP017 supertuxkart (GPL) | LOD from size proxy; tier scales distance | No LOD objects found | Same as Ryzom; duel actors pinned to level 0 | ADD (G3) | new src/town-lod.ts |
| RP017 vcmi (GPL) | Redraw only when state changes | Live duel always draws | Skip unsafe in a duel | SKIP | none |
| RP017 veloren (GPL v3) | Greedy-merge same-material faces into quads | Static arena already merged (arena.ts:298) | Zone floors and walls later | ADD, deferred (G4) | new src/zone-render.ts |
| RP018 xoreos (GPL) | State-sorted queue; far-to-near transparents | three.js sorts opaque and transparent itself | No custom queue needed | SKIP | none |
| RP018 xu4 (GPL) | Per-chunk cached geometry buffer slots | No chunked zones | Needs zones | ADD, deferred (G4) | new src/zone-render.ts |
| RP018 Unciv (CC0 file) | Texture-slot table, one draw for many textures | DOM HUD | No canvas HUD | SKIP | none |

## Merged additions (one build each)
- G1 Fight draw budget. Notes: OpenRA, SRB2 (counter parts). Build: a Playwright release row at the fight camera on the phone tier that reads `renderer.info.render.calls` and `triangles` (same fields as main.ts:2062 and the beacon) and fails above a ceiling stored as data per tier. Rules: ceiling set from our own phone measurement, not a donor figure; no custom batcher (three.js owns sorting); count at ready-idle and mid-fight; extend the arena 40-mesh test, do not replace it (tests/arena.test.ts:120). Lands: new check beside tests/perf-beacon.test.ts and the CI rows (see ci-runners-first); the VPS or CI runs it, not the Mac.
- G2 One quality-tier table. Notes: jynew (shape only, restricted licence). Build: a typed table keyed by tier (phone, full) holding pixel cap, shadow map size, rank-look shadows, rain/ambient counts, texture cap, applied at boot by one function. Rules: per-field fallback; `?gfx=` and `?dpr=` overrides keep winning (quality.ts); build it as the static half of the CP.md quality governor so the governor only moves between table rows; telegraphs never degrade. Lands: src/quality.ts (exists), values consumed at scene.ts:111-112, 152 and arena.ts:379.
- G3 Town crowd budget and LOD (for launch gate S2). Notes: Ryzom, STK (LOD pick); Source SDK and Orbiter (shadow casters and shadow size); l1j (enter/leave margin); gawric (DOM name labels). Rules: one source of truth per actor for LOD (size proxy times tier scale); duel and target actors pinned to full level; far characters animate at a lower rate using the same distance steps as send rate (interest.ts:11); shadow casters capped to the nearest few, rest unshadowed; enter radius smaller than leave radius so the 40-character edge does not flicker; name labels only for the nearest few, as a DOM pool; prove it on the physical test phones in gate S2 before fixing the 40 cap. Lands: new src/town-lod.ts and src/town-labels.ts (neither exists); margin in origins/presence/interest.ts.
- G4 Zone draw list (deferred). Notes: Cubyz, OpenTESArena, ZenKit (far plane as zone data), OpenMW, Veloren, xu4, Terasology (chunk uploads), plus OpenLara only if an indoor zone appears. Merge with the CP.md zone-streaming row into one module. Rules: zones are data rows; chunk is an XZ cell chosen by view radius; hidden/visible/partial test per chunk; draw distance and foliage density are zone data with a per-tier cap; static floors and walls merged by material (arena.ts:298 is the precedent); chunk builds spread over frames (first-frame.ts); skinned characters are never instanced. Do not start until the client draws a zone.

## Could not verify
- Whether origins/presence/interest.ts has an enter/leave margin: I read lines 1-60 and 113-123 only; the l1j row assumes none.
- Whether an eased server-correction exists in the PvP rollback code (colyseus row): only the baseline doc line 49 was seen.
- The accumulator at main.ts:637-640 and 1835 is cited through CP.md; I opened only main.ts:1815-1822 (dt clamp).
- Arena water/lava and any animated materials (keeperfx row) were not searched beyond grep; marked SKIP on "no tiled terrain".
- No nameplate or label code was found by grep in src and origins; a town label system may live outside those folders.
- Checker-findings blocks in the notes were not read in full; I used the Best idea and Decision lines. Notes carry no "Lands in" line, so all targets are my nearest-real-file picks.
- RP008 ZenKit note is a thin PARTIAL verdict file (no runtime in the donor); only the far-plane data idea was used.
