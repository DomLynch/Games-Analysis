# Asset audit: CellAO-CellAO-NightPredator

Donor tree: /mnt/frankendom-donors/CellAO-CellAO-NightPredator/ (VPS, read-only). Paths below are relative to that folder unless shown absolute. Receipts: receipts.tsv (verified). Machine-readable copy: CellAO-CellAO-NightPredator.assets.json.

**Best class: C**

## Code licence
No LICENSE or COPYING file in the tree. About 542 .cs files contain a BSD-style clause ('Redistributions of source code must retain the above copyright notice'), and about 520 carry 'Copyright (c) 2005-2014, CellAO Team'. Licence therefore unclear: class C for reuse.

## Asset licence
None stated for the game-data files (CellAO/Datafiles), the logos, the icons, the diagrams or the SQL schemas. Generated docs carry a MarkDownDocumentator footer naming the CellAO Team.

## Rights-holder status
unknown from the repo. README: an open-source emulator for Anarchy Online, a Funcom game, and thanks Funcom for giving the team the game. No file states who owns the data files. Inference only, not stated in the repo: the data files look extracted from a game client (Extractor Serializer tool; version string 18.8.11_EP2 at the start of the binary). Treat as game-derived.

## Asset groups

| kind | path | count/size | licence | class | note |
|---|---|---|---|---|---|
| game-derived data files (binary) | CellAO/Datafiles/items.dat (2.35 MB), nanos.dat (388 KB), playfields.dat (545 KB) | 3 binary files | none stated | C | Header string read with strings only. Not parsed or opened further. Do not import. |
| game-derived relation table (text) | CellAO/Datafiles/itemrelations.txt (852 KB) | 1 file, one numeric id per line in the first lines | none stated | C | First three lines read. Not reproduced. |
| SQL schemas | CellAO/Libraries/Source/CellAO.Database/SqlTables/ | 31 .sql files | code licence applies (unclear, see above) | C | Table definitions. Not read. |
| project logos | CellAO Logo.png (256x256), CellAO Logo small.png (48x42) | 2 PNG | none stated | C | Dimensions read from PNG header only; pixels not opened. |
| documentation diagrams | CellAO/Documentation/Playfield.png (1075x991), CellAO/Documentation/Character.png (1138x1261) | 2 PNG | none stated | C | Dimensions from PNG header only; not opened. |
| service icons | CellAO/Server/ZoneEngine/zone.ico (43 KB), CellAO/Server/ChatEngine/chat.ico (46 KB), CellAO/Server/LoginEngine/login.ico (44 KB) | 3 .ico in total (one per server engine) | none stated | C | One icon per server role. Not opened. |
| generated documentation (text) | CellAO/Documentation/*.md | 15 .md in CellAO/Documentation (enum and list pages such as ArmorSlots.md, Stats.md, ImplantSlots.md) | footer: 'Created by MarkDownDocumentator Version 1.4.2.3368'; Copyright footer in ArmorSlots.md names CellAO Team | C | ArmorSlots.md read in full (15 numbered slots). Stats.md head read. Others not read. |
| class diagrams | CellAO/Libraries/Source/CellAO.Core/ClassDiagrams/Character.cd, CellAO/Server/ZoneEngine/ClassDiagrams/Playfield.cd, CellAO/Server/WebEngine/ClassDiagram1.cd | 3 .cd XML files | code licence applies | D | Tool-generated class diagram XML. Not content. |
| source code (C#) | CellAO/**/*.cs, Tools/**/*.cs | 598 .cs files | unclear (see code_licence) | C | Code, listed for the licence picture. Not reviewed beyond headers. |

## Inspiration (own words, recreate from scratch)

- Equipment slot model: a fixed numbered list of body slots with symmetric pairs (shoulders, arms, wrists, fingers). Useful for a paper-doll screen where the same slot pattern repeats left and right.
- Generated documentation from code: enum and list pages are made by a tool and kept next to the source. A model for an in-game help or stats page that updates when the data updates.
- One icon per server role in a single family (zone, chat, login). A consistent set makes a service status panel easy to read.
- Plan-view playfield diagram in the docs, drawn to explain how a zone is laid out. A designer-facing diagram style worth recreating for our own zone plans.
- Separate data layers for items, nanos (abilities) and playfields, each its own file, with a text relation table tying them together. A clean way to keep item, ability and zone data apart in our own schema.
- Character diagram in the docs shows how a character's systems connect. A model for an onboarding diagram, not for art.

## Inspiration briefs

### Paper-doll slot grid
- **Why it works:** A symmetric slot layout around a central body lets a player see gear in place at a glance.
- **Traits worth keeping:** symmetric pairs for arms, shoulders, wrists and fingers; fixed slot order; central head and chest slots
- **Traits to change:** our own body silhouette, not a generic doll; slots drawn as the armour piece itself, not labels; a jewellery row separate from armour
- **Reference:** CellAO/Documentation/ArmorSlots.md (read in full: 15 numbered slots)

### Server-role icon family
- **Why it works:** Three icons in one frame make a status panel readable without text.
- **Traits worth keeping:** same frame and size per role; one glyph per role; a shared colour scheme
- **Traits to change:** our own glyph set; status colour on the frame edge; animated pulse when a service is down
- **Reference:** CellAO/Server/ZoneEngine/zone.ico (not opened; file name and size only)

### Small mark at 48 px
- **Why it works:** A simple small emblem reads at tab and toolbar sizes.
- **Traits worth keeping:** one simple shape; works at 48 px wide; no fine detail
- **Traits to change:** our own mark, not this one; a monochrome version for dark mode; a shape tied to our game name
- **Reference:** CellAO Logo small.png (48x42, header dims only; pixels not opened)

### Plan-view zone diagram
- **Why it works:** A top-down plan with labels explains a zone to designers faster than text.
- **Traits worth keeping:** plan view with labels; one diagram per zone; clear legend
- **Traits to change:** our own zone shapes and palette; markers for spawns and camps; a phone-sized version
- **Reference:** CellAO/Documentation/Playfield.png (1075x991, not opened)

## Cross-link to our cell topics
Camera: none. Zones: the playfield diagram and playfields.dat (not read). Spawns and loot: items.dat, nanos.dat and itemrelations.txt (data, not read beyond headers). HUD-UI: paper-doll slot grid (ArmorSlots.md) and the three service icons. VFX: none. Animation: none. Sound: none.

## Not read or not verified

- items.dat, nanos.dat, playfields.dat (size and header string only; not parsed)
- itemrelations.txt beyond its first three lines
- All 31 .sql schemas
- All .cs source beyond licence headers (grep counts only)
- All PNG and ICO pixel content (dimensions from header only, or not opened)
- The .cd class diagram XML
- Documentation .md except ArmorSlots.md (read) and the head of Stats.md
- Config/*.xml beyond the first lines (not reproduced)
