# yairm210-Unciv (asset audit, cell AU059)

Donor: /mnt/frankendom-donors/yairm210-Unciv/ (VPS only, read-only; 4193 files)
Halves: client (core/, desktop/, android/) and server (server/). Both are in the box. I read the client's data and asset listings and the server's build file only. The client's rules data is the data pack: android/assets/jsons/.
Data first: the rules tables are JSON (android/assets/jsons/Civ V - Vanilla/ with 20 files; Civ V - Gods & Kings/ with 25). Units.json, Ruins.json, Difficulties.json, Terrains.json and Policies.json are the ones to cite. Translations are .properties (51 entries).

## 1. Licence

- Code: Mozilla Public License 2.0 (LICENSE line 1).
- LICENSE-TextureArraySpriteBatch: CC0 1.0 Universal (line 3).
- Assets: mixed, per docs/Credits.md. The licence list at lines 5-10 names CC0, CC BY 3.0, CC BY 4.0, CC BY-SA 4.0 and public domain.
  - CC BY 3.0 for Noun Project icons (line 44: "either licenced under CC BY 3.0 or released into the Public Domain").
  - CC BY 4.0 for the Unciv logo (line 26) and for the Fantasy Hex base tiles (line 40).
  - CC BY-SA 3.0 for android/assets/ExtraImages/banner.png (line 38).
  - CC BY-SA 4.0 for two flags (Bangladeshi, Rusyn).
  - Sound credits (line 842 onward): "most sounds are from FreeSound.org", each CC0/Public Domain, CC BY 3.0 or CC BY 4.0, "with some exceptions".
- Base-game icons: docs/Modders/Making-a-new-Civilization.md line 80: "Icons directly from the base game belong to Firaxis, so I'm not sure we're legally allowed to use them - please use other sources!" The file does not say which icons these are.

## 2. Asset inventory (paths and counts)

| Group | Path | Count |
|---|---|---|
| UI atlases | android/assets/*.png and *.atlas (Icons, Skin, Tech, Tilesets, PolicyIcons, ReligionIcons, NationIcons, Flags, UnitPromotionIcons, AbsoluteUnits, ConstructionIcons, EasterEggs) | 29 PNG; 13 atlas |
| Logo and extra images | android/assets/ExtraImages/, extraImages/ (repo root) | 18 files under ExtraImages (plus banner, tutorials) |
| Sounds | android/assets/sounds/ | 41 MP3, 10 OGG (e.g. cityAncient.ogg to cityFuture.ogg) |
| Rules data | android/assets/jsons/Civ V - Vanilla/ (20), Civ V - Gods & Kings/ (25) | 45 JSON; Units.json has 100 unit entries; Policies.json about 70 |
| Tilesets | android/assets/jsons/TileSets/ (FantasyHex, HexaRealm, Minimal) | 3 JSON |
| Translations | android/assets/jsons/translations/ | 51 entries (Latin.properties about 9,088 lines) |
| Effects and binaries | android/assets/effects/fireworks.p; keystore.jks (repo root) | 1 each |

## 3. Rights-holder status

Fan project: an open-source remake of the Civ V game (README). The docs say base-game icons belong to Firaxis and the author is unsure they can be used (line 80). Credits name individual artists for logo, flags, icons, tiles and sounds. The rules data follows the Civ V model; Units.json line 3 cites the Civilization Wiki and a community site as its source. Their licences are not checked here.

## 4. Classes per group

- Noun Project and Freepik icons, CC BY 3.0: A (credit required).
- Unciv logo set, CC BY 4.0: A (credit required).
- Fantasy Hex base tiles, CC BY 4.0: A (credit required).
- Credited CC0 and CC BY sounds (FreeSound): A (credit required where the licence asks).
- banner.png (CC BY-SA 3.0) and the two CC BY-SA 4.0 flags: B.
- Base-game-derived icons (not identified) and any uncredited icon or sound: C.
- Rules JSON and translation text: C (no licence line in the data; source cited is a wiki).
- HexaRealm.json and Minimal.json: C (not checked).
- keystore.jks: C (binary, not opened).
- Code: shape only for our use by default; MPL 2.0 as the file states.
- Best class: A for the credited CC0 and CC BY groups only.

## 5. Inspiration (category level, own words)

- Ruins as discovery events. A short list of rewards, each with a notification line; some rewards are excluded on harder difficulties (Ruins.json; excludedDifficulties at line 12). The rule that picks a reward was not read. Fit for zone discovery and loot (row 18).
- Difficulty as a data row. One table of scalars per difficulty covers barbarian bonus, barbarian spawn delay, unit cost and happiness base (Difficulties.json; barbarianSpawnDelay at line 14). Fit for spawn tuning as zone data (row 23).
- Era-keyed ambience. One looping city bed per era, from ancient to future, plus information and atomic variants (android/assets/sounds/cityAncient.ogg to cityFuture.ogg). Fit for biome beds and border crossfades (sound-music).
- Tile variant rules with a fallback. A composite terrain (base plus feature) maps to an ordered list of tiles, with a fallback tileset and a flag to use colour as the base terrain (TileSets/FantasyHex.json lines 2 and 6). Fit for zone art variants and a colour fallback for the minimap (hud-ui).
- Unit roster as a data table. Each unit has a type, movement, strength, ranged strength, cost, required tech, obsolete tech and text uniques (Units.json; rangedStrength at line 96). Fit for catalogue fields (row 21).
- Policy list as data (Policies.json, about 70 entries; only the count was checked). If the entries form a tree, check that shape before reuse. Fit for progression (build diversity) once read.

## 5b. Inspiration briefs

Rule for every brief: recreate as a clearly distinct original, never a copy. Each brief names the trait kept and the trait changed. Full entries are in yairm210-Unciv.assets.json under "briefs".

1. Ruin discovery chest. Keep: a short reward list per ruin, a one-line notification, a difficulty gate (the selection rule was not read). Change: zone-tied loot rolls with a chest-lid reveal and a rarity sound; no free units. Ref: android/assets/jsons/Civ V - Vanilla/Ruins.json line 12.
2. Era-bed biome ambience. Keep: one bed per context, crossfade on change. Change: per-biome beds with a short stinger on a border crossing. Ref: android/assets/sounds/cityAncient.ogg (path only; not played).
3. Terrain variant with colour fallback. Keep: ordered variants per composite terrain and a colour fallback. Change: variants keyed by our zone tag and palette ramp. Ref: android/assets/jsons/TileSets/FantasyHex.json lines 2 and 6.

Top-striking criteria applied: silhouette at 375 wide (the chest and the variant tile), one signature behaviour (one roll per ruin), one signature sound (the era bed). Resemblance target 20-30 percent.

## 6. Cross-link to our topics

- camera: none read.
- zones: Ruins and tile variants (above).
- spawns: Difficulties.json barbarian spawn delay (line 14).
- loot: ruin discovery rewards (line 12).
- hud-ui: minimap colour fallback (TileSets line 2); unit-icon-per-class credits (Credits 'Units').
- vfx: none read.
- animation: none read.
- sound: era beds (sounds/city*.ogg); the sound credit list (docs line 842 onward).

## Unexpected

- keystore.jks is committed in the repo root (2084 bytes). Not opened. It is a signing keystore and should not be used or copied.

## Not read

- All PNG, MP3, OGG, atlas and .p files: names and counts only. Nothing opened, played or sized.
- Rules JSON beyond the cited lines (Units.json 3 and 96; Ruins.json 12; Difficulties.json 14; Terrains.json 4 as a listing). Gods & Kings folder: names only.
- translations: counted and sized only.
- HexaRealm.json and Minimal.json: names only.
- docs/Credits.md beyond the cited lines and the first sound credits (844-846).
- core/, desktop/ and server/ source: not read (server/build.gradle.kts line 4 only).
