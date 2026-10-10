# RuneStar-client (asset audit, AU045)

Donor: /mnt/frankendom-donors/RuneStar-client (VPS, read-only). RESTRICTED donor: _RESTRICTED-NOTE.txt line 1 says "Jagex-derived OSRS client. Study shape/idea only; never copy code or constants." Added by Dom on 2026-10-10. This is a note, not a licence. Inspiration here is category level only. No constants, colours, coordinates or code are copied. Receipts: receipts.tsv (verified, 10 rows for this donor).

Code licence: GNU AGPL-3.0. LICENSE line 1 "GNU AFFERO GENERAL PUBLIC LICENSE" (AGPL version 3 text). NOTICE line 1 "Copyright (C) 2017-2020, Hunter WB <hunterwb.com>"; NOTICE line 4 says the program is under the AGPL.
Asset licence: plugins/src/main/resources/org/runestar/client/plugins/emojis/LICENSE-GRAPHICS is the full CC BY 4.0 text (line 1 "Attribution 4.0 International"). It does not name which emoji files it covers or who holds the copyright. No licence file found for the RuneScape fonts (api/src/main/resources) or for the icon PNGs.
Rights-holder status: restricted donor note above. NOTICE names Hunter WB as code copyright holder. Owner of emoji art, fonts and icons is not stated in the files read.
Best class: C.

## Halves read
- Client: plugins/ (55 .kt plugin files; Implings.kt read in part), api/ (font and icon resources listed), README.MD line 1.
- Server: not in the repo (game server is Jagex's).
- Data half: cache-ids/ holds only pom.xml (no generated IDs in the box); raw/ and raw-base/ hold pom.xml; client.jar.version reads 2020-08-27-35a2496. The OSRS cache is not in the box.
- Paired other half in the box: runelite-runelite (client side, BSD). No server half.

## Asset groups
- Emoji sheet and shortcode list: plugins/.../emojis/emojis.png, names.csv, LICENSE-GRAPHICS. names.csv is one line with 1,740 commas (about 1,741 names), no line break. DATA TABLE (shortcodes such as grinning, smiley, smile). Class C: the CC BY file does not tie itself to the PNG, so the ambiguity rule applies. If Dom confirms holder and scope, this becomes A with attribution.
- Fonts: api/.../RuneScape-Plain-11.ttf, RuneScape-Plain-12.ttf, RuneScape-Bold-12.ttf. No licence; binary. Class C.
- Icons (6 PNG): plugins/.../screenshot/camera.png, clanchat/clanchat-ranks.png, notes/pencil-on-page.png; api/.../caret-up.png, cog.png, icon.png. No licence. Class C.
- Plugin docs (22 README.md): shape only, AGPL repo. Class C.
- Code (55 .kt, client, api, updater modules): AGPL-3.0. Clean-room, shape only. Class A in the sense of "code, not content".
- Data half (cache-ids, raw): no content in the box. Class D.

## Inspiration (own words; category level, restricted donor)
- Hunt-creature marker: a rare roaming creature gets a translucent outline and a short name tag, drawn at both the minimap and the main view (Implings.kt lines 38, 54, 63 for the scan, outline and name source). Recreate with our own silhouette and tag style.
- Shortcode chat sprites: a list of short names maps to one emoji sheet (emojis/names.csv, emojis.png). Recreate as a text-to-sprite chat set with our own art and names.
- Low-detail switch: lowdetail, flatshading and fpsthrottle are named as toggles (folder names; lowdetail/README.md present, not opened). Recreate as one visible low-detail switch for our 375 wide play.
- Frame throttle as a setting: fpsthrottle (folder name only). Recreate as a throttle option with our own numbers.

## Briefs (5b; Dom's rule: recreate as a clearly distinct original, never a copy)
In RuneStar-client.assets.json under "briefs" (3): hunt-creature tag (category level); shortcode chat sprite set; low-detail switch. Each names the kept and changed traits. No constants or colours.

## Cross-link
- Spawns and encounters: hunt-creature marker (above). Walk density not read.
- HUD and hud-ui: chat emoji (above); minimap marker; low-detail toggle is an accessibility and performance item.
- Sound-music: no sound files in the resources.
- VFX and camera: not read.
- Loot, progression, death and respawn: not located in the files read.

## Not read / unexpected
- Not read: emojis.png and all other PNG and TTF bodies; names.csv beyond the first line; plugin bodies other than Implings.kt; plugin READMEs other than the title line of README.MD; updater, updater-deob, updater-mapper and launcher modules.
- Unexpected: the emoji sheet has a CC BY 4.0 licence file next to it, but nothing ties the file to the sheet, so class C rather than A.
- Unexpected: the restricted note is a Dom instruction, not a licence. It was applied as given.
