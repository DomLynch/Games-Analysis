# kivutar-goro (asset audit, AU029)

Donor: kivutar-goro, a Go client for Ragnarok Online (pre-renewal 2008 target). Half read: CLIENT. Data half (RO data folder) is not in the box. Server half (rAthena) is not in the box.
Code licence: MIT (LICENSE line 1; LICENSE line 3 copyright line; website index.html line 63).
Asset licence: none in the tree. The repo ships no RO game data (website/index.html line 474; docs/client-setup.md line 3).
Rights-holder status (from files): fan reimplementation. RO imagery is attributed to its rights holders on the website footer (index.html line 531).
Best class: D for shipped content (no usable game art, audio, models or maps). Website art is class C.
Checked: file tree listed by extension; LICENSE, README, website/index.html, docs/client-setup.md read; db/monster_tables.go, db/item_tables.go, game/items.go, game/level99_aura.go, game/damage_numbers.go, game/effects_cylinder.go, db/effects_hit.go read at the cited lines. Not read: see the json not_read list.

## 1. Licences
- Code: MIT, copyright line in LICENSE line 3.
- Website says MIT in two places (index.html lines 63, 530).
- No asset licence file, no CREDITS, no NOTICE.

## 2. Asset inventory
- Game data: none in tree (no .gr2, .rsm, .gnd, .spr, .act, .wav, .mp3, .ogg, GRF). Runtime loads a user-supplied RO folder (docs/client-setup.md).
- Website art: 16 webp files under website/assets (9 screenshots, 4 feature shots, 3 hero images). Class C. Hero art origin not stated in any file.
- Icons: 3 png (internal/appicon, website/assets, packaging/linux). Class C.
- Audio: code only (audio/*.go). No sound files. Class D.
- Data tables in code: db/monster_tables.go and db/item_tables.go hold id-to-name and id-to-look maps. Names not reproduced. Class C (RO-derived content, rights unclear).

## 3. Rights-holder status
Fan project. The README says the goal is to faithfully reimplement the original client (README line 22). The footer says the project is not affiliated with Gravity (index.html line 531). No other rights line found.

## 4. Inspiration (in my own words)
- Ground drop is a small physical object: fixed-step gravity at 60 steps per second, capped at 120 frames, a bounce ratio and a speed damping. It lands, bounces about twice and stops. The shadow is drawn at a quarter size so it does not overhang the sprite (game/items.go lines 55-60, loop near 815). Recreate with a ground ring and a rarity-tinted column.
- Prestige aura is three stacked layers (ground ring, body glow, floating bubble). Each has its own effect id and is synced to the actor every frame (game/level99_aura.go lines 11, 19). Recreate with a tier colour ramp and a slow glyph ring.
- Damage numbers are per-digit billboards cut from one strip with a 2 px gap, floated up with z-lift, scale and an alpha curve chosen by hit kind (game/damage_numbers.go 113-155, 187-232). Recreate with a pop scale and a hit-count tag.
- Hit ring: a flat ring that grows and fades over a few frames, plus a particle burst (db/effects_hit.go 8-30). Recreate with an element colour.
- Cylinder effect: one texture drawn as a column of staggered copies (game/effects_cylinder.go 12-30). Useful for teleports and boss entrances.
- Look-by-id maps: items and monsters map numeric ids to names and to art resource names (db/item_tables.go 8464-10909). Keep the id-to-look split so a new look does not rewrite the item row.
- Layered data folders: DATA.INI sets archive priority; the first archive with a file wins (docs/client-setup.md). A priority list is a clean way to let event packs override base data.

## 5. Briefs
Four briefs are in the json (Stepped drop bounce; Prestige ring aura; Kind-coloured damage digits; Flat hit ring). Each names the trait kept and the trait changed. Recreate as clearly distinct originals, not copies.

## 6. Cross-link
- camera: cylinder and aura effects need camera-facing billboards (not read in detail).
- hud-ui: damage digits are HUD feedback.
- vfx: hit ring, aura, cylinder.
- loot: drop motion.
- sound: no sound files in the box; audio code only.
- animation: no clips in the box; gr2 animation code exists (res/gr2*.go, not read).
- spawns: no spawn data read.
