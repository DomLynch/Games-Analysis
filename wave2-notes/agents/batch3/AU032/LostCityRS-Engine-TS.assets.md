# LostCityRS-Engine-TS (asset audit, AU032)

Donor/Licence: code MIT (Lost City, 2023-2026). Asset licence: none stated for the packaged assets; the one SoundFont says Public Domain in its own metadata. Game content is NOT in the box. Best class: A for code and the SoundFont (self-declared); D for game content.

Half read: server half (this folder), read in part. Paired client halves are in the box: LostCityRS-Client-TS and LostCityRS-Client-Java (separate notes). Data pack (Content repository, the .npc, .obj, .loc and similar sources): NOT in the box.

## 1. Licence files

- `LICENSE` (MIT): line 3 "Copyright (c) 2023-2026 Lost City". README says the project is MIT.
- `src/db/dialect/LICENSE`: MIT, "Copyright (c) 2024 Dylan Blokhuis" (line 3).
- `src/3rdparty/bzip2-wasm/LICENSE`: bzip2 licence text, "copyright (C) 1996-2019 Julian R Seward" (line 5). The text itself was read in part (redistribution conditions).

## 2. Asset inventory

- 574 files in the box, about 8 MB. Of those, 517 are .ts, and the rest are config, lock, ejs views, prisma schemas and SQL migrations, a few JS bundles, and small assets.
- `public/client/SCC1_Florestan.sf2`: SoundFont, 3,272,882 bytes, RIFF sfbk. RIFF INFO fields read via strings on the first KB (binary, metadata only, no receipt): ICOP reads "Public Domain"; ICMT carries two author web addresses (not copied).
- `public/client/client.js` (350,315 bytes), `ondemandworker.js` (10,134 bytes), `tinymidipcm.wasm` (59,802 bytes): prebuilt client bundle and its worker and MIDI wasm.
- `public/maped/`: map-editor script (maped.js, 293,543 bytes), worker (9,120 bytes), three icons (86, 984 and 1,802 bytes).
- `data/raw/wordenc`: word-filter source, 13,463 bytes, 174 lines. Feeds src/cache/wordenc (bad words, domains, fragments, TLDs). Contents not reproduced.
- `data/config/public.pem` (223 bytes) and `private.pem` (562 bytes): key files. Not opened, not reproduced.
- Game content: not in the box. `src/util/WorldConfig.ts` line 142 sets `srcDir: '../content'`. The pack tools accept text config sources by extension (`tools/pack/config/PackShared.ts` line 87 maps `.npc`; also `.obj`, `.loc`, `.seq`, `.flo`, `.dbtable`). Sprites, MIDI and SoundFont inputs are in that repo too.

## 3. Rights-holder status (from the files only)

- Lost City holds the MIT copyright line (LICENSE line 3).
- README line 8: "Reverse-engineered engine code designed to accurately simulate the cycle behaviors of early RS2."
- README line 41 calls the Client-TS "a human-driven port of the original code to modern browsers". README line 39 calls the Client-Java "a research project to decompile and understand the original code".
- The original game owner is not named in this folder. Treat original game content as restricted. Mechanisms are re-expressed from the code, and the code is MIT as stated.

## 4. Class per group

| Group | Path | Licence per file | Class |
|---|---|---|---|
| SoundFont | public/client/SCC1_Florestan.sf2 | INFO ICOP "Public Domain"; no licence text | A (self-declared; verify source) |
| Map-editor icons | public/maped/*.png | repo MIT | A |
| Word-filter source | data/raw/wordenc | repo MIT; origin not stated | A (check origin before reuse) |
| Prebuilt client and workers | public/client/client.js, ondemandworker.js | repo MIT | A |
| MIDI wasm | public/client/tinymidipcm.wasm | third-party submodule; no licence in box | C |
| Key files | data/config/*.pem | not content | D (flag, see section 8) |
| Game content | external ../content | not in box | D |

## 5. Inspiration (own words; the code is read, nothing copied)

- Fixed world tick. The world ticks every 600 ms (`src/engine/World.ts` line 120). Each cycle runs a stated order: client input (line 355), the NPC event queue for spawn and despawn triggers (line 358), NPC processing (line 367), zones with loc and obj respawn (line 390), and cleanup (line 415).
- Gap against the Frankendom sub-line "server tick: fixed step, input intake, per-tick NPC budget". The fixed step and input intake exist. I found no per-tick NPC budget: `processNpcs` turns every NPC in the list each tick (World.ts line 667). Design the budget ourselves.
- Respawn speeds up with population. `removeNpc` and `removeObj` scale the respawn duration by (4000 minus players) over 4000, with players clamped at 2000 (World.ts lines 1733 and 1734, applied at 1313 and 1523). A busy zone refills up to twice as fast at the cap. The code comment says the author is not sure the cap is right (World.ts line 1732). This is the zone-population lever for row 23.
- Three lifecycle states (`src/engine/entity/EntityLifeCycle.ts` lines 2 to 4): FOREVER, RESPAWN and DESPAWN. Spawn caps and despawn policy can key off the state. No despawn grace timer exists here (a search for grace found none), so the grace-on-empty rule is ours to design.
- Respawn countdown is gated. `Npc.turn` decrements its lifecycle tick only while the NPC is not delayed (`src/engine/entity/Npc.ts` line 121). A delayed NPC's respawn clock stops. Check whether that is intended; it may be a defect to fix, not a rule to copy.
- Lifecycle tick clamps to at least one tick (`src/engine/entity/Entity.ts` line 40), so a zero duration cannot stall a respawn.
- Effects as data. The spot-animation pack reads model, anim, resizeh, resizev and recol pairs (`tools/pack/config/SpotAnimConfig.ts` lines 77 and 123). Effects are text config, packed for client and server.

Best transferable idea: a population-scaled respawn with a clamp, plus a three-state lifecycle, gives zone population rules with no art. The grace timer and the per-tick NPC budget are gaps we must add.

## 6. Briefs (rule: recreate as a clearly distinct original, never a copy; the test is a readable silhouette at 375 px, one signature behaviour, one signature sound or effect, and about 20 to 30 percent resemblance at most)

No creature or item art is in the box, so these briefs are mechanism-level and zone-level.

1. **Population-scaled respawn clock (zone pulse)**. Why: quiet zones refill slowly and busy zones refill fast, with no art and one formula. Keep: a linear scale in player count, a hard clamp so the scale stops growing, the same rule for NPCs and objects. Change: our clamp point and floor (for example a floor at a quarter of the base time), a per-zone coverage value, a despawn grace timer on empty zones. Ref: `src/engine/World.ts` lines 1733 and 1734.
2. **Three-state entity lifecycle**. Why: separating permanent, respawning and script-placed entities keeps spawn rules readable. Keep: the three distinct states. Change: our names, a fourth state for a timed event or boss lock, the state drives the cap rules. Ref: `src/engine/entity/EntityLifeCycle.ts` lines 2 to 4.
3. **Recolour-variant effect record**. Why: one model, one animation and a few colour pairs give many effect variants with no new art. Keep: model, animation, resize and colour pairs as text fields. Change: our colour pair set and resize values, our effect names, a per-rarity palette. Ref: `tools/pack/config/SpotAnimConfig.ts` line 123.
4. **Fixed-step turn order**. Why: a stated turn order (input, triggers, NPCs, zones, cleanup) makes timing bugs easy to find. Keep: a fixed step length, a named phase order, cleanup last. Change: our own phase list with the boss phase separate, and a per-tick NPC budget that defers work instead of dropping it. Ref: `src/engine/World.ts` lines 120 and 355 to 415.

## 7. Cross-link to our cell topics

- spawns and zones: the population-scaled respawn and lifecycle states above (parity row 23).
- loot: object respawn uses the same scaled timer (World.ts line 1523).
- sound and vfx: the SoundFont is a bank for the client's MIDI player; effects are data (spot animations).
- camera, hud-ui, animation: not in this folder (client-side; see the client notes).

## 8. Flag for Dom (not a licence finding)

- `data/config/private.pem` is a private key file in the committed tree. I did not open it and did not reproduce it. Check whether it is a live key before any sharing, and whether it should be in the repo at all.

## 9. Not read

- Content repository (absent from the box).
- Most of src/engine/script and its handlers (only NpcOps line 94 was read).
- tools/pack graphics, sound and MIDI packers (listed only).
- The SoundFont audio (binary; metadata only).
- public/client/client.js and public/maped/maped.js (size only).
- The key files (existence and size only).
- Halves: server half read in part; client halves in the box (separate notes); data pack absent.
