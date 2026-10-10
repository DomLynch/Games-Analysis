# darkanrs-client: asset audit (AU014)

Restricted. The repo's own _RESTRICTED-NOTE.txt says: "Study shape/idea only; never copy code or constants." Class D for usable content.

## Licence
- Code: GNU GPL v3. The LICENSE file is the GPLv3 text (line 2: "Version 3, 29 June 2007"). README does not name a licence.
- Assets: none stated. The repo holds no art, audio, model or map files.
- Rights holder (per files): Jagex-derived. README: "refactoring an obfuscated version of the Runescape game client ... (Client build #727)". Restricted note: "Jagex-derived RuneScape client."

## Which half was read
CLIENT half only (src/main/java, client.jar listing, lib/clientlibs.jar listing). The matching SERVER half is not in this repo. Folder names in the box that may pair with it, by name only and not opened: LostCityRS-Engine-TS, Open-RSC-Core-Framework.

## Inventory
- src/main/java: 1060 Java files. No images, sounds, models or maps.
- client.jar: 1078 entries (1058 .class, one MANIFEST, directories). Listed only; not extracted.
- lib/clientlibs.jar: 36 legacy stub classes (netscape/security and com/ms). Listed only; licence not stated.
- Runtime cache: the client reads an indexed cache at run time (Engine.java lines 350 and 353 reference "main_file_cache.idx" names). The cache files are not in the repo, so game art and data are not in the repo.
- External splash image: Loader.java line 59 points at a runescape.com URL. Not shipped.
- Item icons: RouteFinder.java line 212 expects ./items/<id>.png at run time. Not shipped.

## Data tables (DATA FIRST)
- No item, NPC or map tables in the repo. That data lives in the server-supplied cache.
- The only config table in the source is the loader parameter string (Loader.java line 76). It names loading-bar parts and a font. Read as a table; not loader logic.

## Class per group
| group | class |
|---|---|
| Java source | D (code; GPLv3) |
| client.jar | D (code only, no image or audio entries) |
| cache references | C (names only; restricted) |
| splash URL | C (third-party URL; do not reuse) |
| loading-bar parameter string | C (filenames only) |
| item icon convention | C (names only) |

## Inspiration (category level, Jagex-derived so no instance-level looks)
- The loading bar is built from separate slices (caps, middle, outline pieces, fill). Our own pixel slices give the same modular build.
- An indexed cache (index plus data per group) streamed at start-up is an architecture idea for our pipeline.
- Item icons keyed by numeric id in one folder: an easy naming convention for our own icon set.
- Ship the splash and loading art locally rather than fetching it.
- Nothing visual to emulate in the repo. The lesson is loader and cache structure only.

## Briefs
None. The repo has no creature, item, armour, zone or effect art to brief from.

## Cross-links (task item 6)
- hud-ui: the loading bar is the only UI construction visible. Worth a look for structure.
- zones, spawns, loot, camera, vfx, animation, sound: no assets in repo. The data for those lives in the server cache, which is not here.

## Not read
client.jar class bodies; lib/clientlibs.jar contents beyond the listing; gradle-wrapper.jar; Java method bodies (grep hits only); build.gradle.kts and .gitlab-ci.yml (grep only); all binary bodies.

Receipts: receipts.tsv (rows for darkanrs-client; verified).
