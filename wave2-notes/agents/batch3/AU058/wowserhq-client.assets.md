# wowserhq-client (asset audit, AU058)

Donor: /mnt/frankendom-donors/wowserhq-client (VPS, read-only). Half read: CLIENT half (TypeScript WebGL UI engine plus shipped UI XML). Matching other half in the box: wowserhq-wowser (pipeline/server half, read in its own entry).

## 1. Licences (as the files say)
- Code: MIT. LICENSE line 1 is "MIT License", copyright "Copyright (c) 2019-2024 Wowser Contributors" (receipt: LICENSE 3).
- Repo-wide blanket: README line 81 says "Except where otherwise noted, Wowser Client is copyright" and line 82 says it is "under the **MIT license**" (receipts README 81-82).
- No separate asset licence, CREDITS or NOTICE file in the tree. AUTHORS lists two names.
- Game art and data: none in the box. The README (line 27) says a copy of the official Wrath of the Lich King client is required, and line 70 says "do not distribute game data you do not own" (receipts README 27, 70).

## 2. Asset inventory (real paths)
- public/Wowser/Wowser.toc, WowserParent.xml, WowserFrame.xml: 3 UI layout files. The XML references Blizzard texture paths such as Interface\Glues\LoadingScreens\LOADSCREENNORTHREND (receipt WowserFrame.xml 8). Those files are not in the box.
- public/Shaders/{pixel,vertex}/glsles300: UI.frag (178 B), DebugLine.frag (115 B), UI.vert (251 B), DebugLine.vert (78 B). Contents not read.
- src/ui/scripting/vendor/bit.lua and compat.lua: 2 vendored Lua helpers. bit.lua header points to a fengari test file (receipt bit.lua 1). Upstream licence text is not in the box.
- No PNG, audio, model, font, map or string-table content in the box. No BLP or MPQ files.

## 3. Rights-holder status
unknown. The repo does not say who holds the Blizzard UI files it references, and it does not say whether the project is clean-room. It says it needs the user's own client. Authors are listed in AUTHORS (fallenoak, timkurvers).

## 4. Classes per group
- A: public/Wowser XML and TOC (MIT blanket, keep the copyright notice); public/Shaders (MIT blanket).
- C: src/ui/scripting/vendor/*.lua (upstream licence not in file).
- D: Blizzard Interface files referenced by the XML and TOC (not in box).
- best_class: A (only layout and shader files are shipped, all under MIT).

## 5. Data first
- Data tables: none shipped. The layout data is declarative XML (WowserFrame.xml lines 3-16: Frame nodes with Anchor and AbsDimension). That XML is the only table-like data in the box.
- Half read: client. The data half the client expects (Blizzard XML and DBC) is not in this repo; see wowserhq-wowser.

## 6. Inspiration (category level, art is not in the box)
- Loading screen as three stacked layers: full-bleed backdrop, one small emblem near the bottom centre, one small corner caption (WowserFrame.xml 7-39; receipts 8, 18, 31). It says the game is alive while data loads.
- The corner caption is a version string in this donor. Ours can be a rotating tip with a progress bar in the same slot.
- Lua vendored for UI scripting (src/ui/scripting) plus XML layout is a data-first UI: layout as a tree, behaviour as script. Relevant to hud-ui; only the vendor headers were read.
- No creature, item, armour, zone or effect content exists here, so no creature briefs.

## 7. Inspiration briefs
1. Quiet loading screen stack. Why: calm, readable at 375 wide, shows the game is alive. Keep: three layers, centred low emblem, small corner caption. Change: original backdrop painted in our palette; our own emblem; caption carries a tip and a progress bar. Recreate from scratch as an original, never copied. Ref: public/Wowser/WowserFrame.xml lines 7-39.

## 8. Cross-link to our cell topics
- hud-ui: XML anchor layout and scripted events (above).
- camera, zones, spawns, loot, vfx, animation, sound: no content in this donor.

## Not read
- src/gfx/apis/webgpu and src/ui/components/* (TypeScript logic, skimmed by name only).
- The shader bodies (sizes only). package-lock.json, vite config, .github CI.
- Only src/utils/fetch.ts line 6 was read (fetch of a path).
