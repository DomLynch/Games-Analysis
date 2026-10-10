# Asset audit: eq-p99-tools-eq-client (AU018)

- Code licence: MIT (LICENSE line 1 "MIT License"; line 3 Copyright (c) 2026 eq-p99-tools contributors).
- Asset licence: none shipped. README says the repo and its build artifacts do not contain or redistribute EverQuest assets. Game data comes from a user-supplied EverQuest install at run time.
- Rights-holder status: client that reads a user's own EverQuest install (README example path under 'Sony\EverQuest', line 43). No owner named for the game data in the repo files beyond that path.
- Best class: D. The only non-code content is markdown docs and toml config (MIT, class A, not visual).

## Inventory (VPS: /mnt/frankendom-donors/eq-p99-tools-eq-client/)
- Code: 172 .rs files across crates/ and apps/eq-client.
- Config: 7 .toml, 1 .yml, rustfmt.toml, .gitignore.
- Docs: README.md (73 KB), ARCHITECTURE.md, SUPPORT.md.
- Art, audio, fonts, shaders, maps: none found by extension.
- Game data: not in repo; read from the user's install.

## Inspiration (own words)
- Armour tiers by texture swap per body part, chosen from the server-reported slot, then tinted (README line 200). Recreate with our own tiers.
- Coordinate conversion kept in one crate, so camera and world maths share one definition (cross-link camera).
- Terrain material kinds: repeating ground, transparent cut-outs and static props (README line 250).
- Water and lava as zone fill regions, not meshes (crates/eq-client-assets/src/regions.rs, module comment lines 2 and 35).
- Appearance state drives model posture (README lines 532-538).
- Spell-gem bar and memorised-spell list fed from events (hud-ui cross-link).

## Briefs
1. Tiered body armour swap (ref: README.md line 200).
2. Fill regions for water and lava (ref: crates/eq-client-assets/src/regions.rs lines 2 and 35).
3. Stance from appearance state (ref: README.md lines 532-538).

## Cross-link
- camera: the single-definition axis converter.
- vfx and animation: posture mapping and water roadmap (README line 573).
- hud-ui: spell-gem hotbar pattern.
- sound, spawns, loot: nothing visual or audio here.

## Not verified
Code bodies (only grep hits and README lines). Any game data (none in repo; not sought).
