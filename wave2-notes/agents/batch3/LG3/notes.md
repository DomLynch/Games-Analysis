# LG3 notes (legend art research, batch 3). Research only; nothing downloaded.

Scope: list.txt has 8 lines, but two of them hold several games (Lineage 1 and 2; Fallout 1 and 2; Doom / Quake / Wolfenstein). I split them into 12 rows so each game has its own row. Box checks ran over ssh on /mnt/frankendom-donors with narrow find (maxdepth 3 to 6) and head/ls only. Excluded from use as sources: Internet Archive "free download" items, fan download sites (romsfun, gamepressure, freegogpcgames, gogunlocked), the RSC private server (runescapeclassic.org), and private-server Lineage client hosts. None of them were opened or followed.

## World of Warcraft
- Blizzard EULA (https://www.blizzard.com/en-us/legal/fba4d00f-c7e4-4883-b8b9-1b4500a402ea/blizzard-end-user-license-agreement) bars derivative works except as set out in Blizzard Fan Policies. The Fan Policies were not retrieved, so no reuse right is confirmed.
- Blizzard Fan Art terms (search snippet only) cover only submissions to the Fan Art Program.
- Wowpedia copyright policy (https://wowpedia.fandom.com/wiki/Wowpedia:Copyright_policy) is a fan wiki rule, usable for describing the look only.
- Substitute: none verified with a clear licence. Kenney UI packs (CC0, see Kenney line below) are a generic UI option only.

## RuneScape (Classic, OSRS)
- Jagex news (https://secure.runescape.com/m=news/new-official-client--next-steps?oldschool=1) and the OSRS Official Client wiki page (https://oldschool.runescape.wiki/w/New_Official_Client): RSC servers closed 6 Aug 2018; the free OSRS client is for play, with no reuse right.
- Box: 2003scape-rsc-c/cache/*.jag (~2.3 MB) holds RSC archive data, but its origin is not stated in the donor. Dom needs to rule on provenance before any use; I have not treated it as legal.
- Substitute: Open-RSC is AGPL-3 code, and its sprite folders (Client_Base/src/res) have no clear art licence. Kenney CC0 UI packs are the clean UI option.

## Lineage 1
- Box: l1j-en-classic and uglyoldbob-l1j-client hold server data and a client skeleton, with no sprites or tiles.
- No free official release or licensed art was found in this run. The only page read was https://en.wikipedia.org/wiki/Lineage_(series), which is not a rights source.
- Substitute: none verified.

## Lineage 2
- NCSoft press room (https://about.ncsoft.com/en/news/brands/lineage2) is press and describe only. No free client was found; the download hits were private-server archives, which are forbidden.
- Box, open question for Dom: cuteshaun-lineage2-api/public/icons holds 4,002 item icon PNGs, described in public/landing-icons/README.md as extracted from an "approved icon-pack screenshot". The MIT licence covers the code only, not these icons. Their source is unverified, so please rule before any use.
- Box: ax-grymyr-l2dn-server has MIT static XML only, and pmbstyle-L2Solo is a C4 server with no client art.
- Substitute: none verified.

## Ragnarok Online
- Gravity / GNJOY terms (https://ro.gnjoy.asia/termofservice/): Gravity keeps the IP in graphics, audio, designs and "look and feel", and bars derivative works and copying. The official free-to-play client is personal use only, with no reuse right.
- Box: Doddler-RagnarokRebuildTcp/README.md line 5 says it has no RO assets and line 35 says it excludes RO sprites on purpose. guilhermelhr-unityro's README (line 76) needs a user GRF. Its 57 MB UnityClient/Assets has no stated provenance, so it needs a ruling. drgomesp-midgarts holds synthetic test GRFs only.
- Substitute: Kenney CC0 sets or the OpenGameArt CC0 Zelda-like RPG tileset (https://opengameart.org/content/zelda-like-tilesets-and-sprites, listed CC0 by its author, not opened in full) as a generic top-down RPG look.

## MapleStory
- Nexon Legal Documents (https://support-maplestory.nexon.com/hc/en-us/articles/360045727091-Legal-Documents) is the controlling ToS page. It was not fully read; the clause text came from a Nexon notice and search snippets. Nexon's notice says the client, art, characters and music are Nexon's IP.
- Box: ryantpayton-MapleStory-Client has 52 images, mostly third-party docs, and no .wz. Elem8100-MapleNecrocer needs .wz, which is not in the box.
- Substitute: the same OpenGameArt CC0 RPG tileset as Ragnarok, as a generic look only.

## Fallout 1
- Box: alexbatalov-fallout1-ce/README.md line 9 says the owner must have the game (GOG and Steam named), and line 17 says the Windows install is the data base. No master.dat or critter.dat is in the box.
- No free official release found in this run. The search results held only archive uploads, which are excluded.
- Substitute: OpenGameArt "300+ Isometric Overworld Tiles" (https://opengameart.org/content/300-isometric-overworld-tiles), listed CC0 in search results and not opened, is a generic isometric base, not a Fallout look.

## Fallout 2
- Box: alexbatalov-fallout2-ce/README.md line 11 names GOG, Epic and Steam and says the owner must have the game. The Prime Gaming promotion in search results is past, not current.
- Substitute: same OpenGameArt isometric tiles as Fallout 1.

## Dungeon Keeper
- KeeperFX README (box, dkfans-keeperfx/README.md lines 18-19 and 42-45) requires the original DK files as proof of ownership and names EA, GOG and Steam (https://store.steampowered.com/app/1996630/Dungeon_Keeper_Gold/). Owner copy only.
- Box: levels/ and campgns/ are in the box, but no original DK DAT/SPR art.
- Substitute: miki151-keeperrl/COPYING-MEDIA.txt says data_free is CC BY-SA 2.0. data_free is 124 files, 4.2 MB, already in the box. data/ is limited to the official binary. This is a usable Dungeon-Keeper-style substitute with attribution and share-alike.

## Doom (1993)
- Freedoom (https://freedoom.github.io/about.html, read this run): "liberally licensed under the BSD license", keep the copyright notice and credit the project. Textures, sounds and music are reusable royalty-free.
- Box: id-Software-DOOM is source under GPL-2.0 (LICENSE.TXT) and contains no DOOM1.WAD or IWAD. dhewm-dhewm3 is Doom 3, with base/ cfg only.
- Recommendation: Freedoom is the legal route, a total-conversion substitute, not Doom art. The download needs Dom's approval.

## Quake
- Quake Wiki pak0.pak page (https://quakewiki.org/wiki/pak0.pak) describes the official free shareware first episode (quake106.zip) and that pak1 is the paid full game. Shareware is for personal use and grants no reuse right.
- Box: id-Software-Quake has WinQuake and QW source with build-generated progs files and no pak0.pak. ioquake-ioq3 is an engine with no pak. id-Software-Quake-2 has source and baseq2 config only.
- Substitute: none verified with a clear licence. Xonotic's legal page (https://github.com/xonotic/xonotic/wiki/Legal) says artwork must be GPL-compatible and that CC-BY-SA and NC variants are not accepted into the project, so per-file checks are needed.

## Wolfenstein 3D
- Box: id-Software-wolf3d/WOLFSRC/README/LICENSE.DOC is an id limited-use licence covering "Source Code, artwork data, music and software tools": no distribution for money, no modifications. The donor README (lines 33-35) says you need the data from a released Wolf version, with the shareware option.
- No VSWAP, GAMEMAPS or MAPHEAD data is in the box. WOLFSRC.DAT is 208 bytes and not game data.
- Recommendation: describe-only. The licence restricts reuse, and no free substitute was verified.
