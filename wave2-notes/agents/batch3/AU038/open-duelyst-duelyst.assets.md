# open-duelyst-duelyst (asset audit, AU038)

Donor: /mnt/frankendom-donors/open-duelyst-duelyst (VPS, read-only). Version 1.97.13 (version.json).
Class: C overall for all art, music, sound and fonts. Code is CC0 by the repo's own line (class A for code only).

## Licences (as the files say)
- Code and project: CC0 1.0 Universal. README.md:53 ("OpenDuelyst is licensed under the Creative Commons Zero v1.0 Universal license"); package.json:3 ("license": "CC0-1.0"); LICENSE and COPYING are the same CC0 text (LICENSE:3).
- Third-party packages keep their own: packages/warlock/LICENSE (MIT, line 1); packages/backfire/LICENSE (Firebase copyright, line 1); app/vendor/cocos2d-html5/licenses (copyright lines only, not read in full).
- Assets: the only statement is the repo-wide CC0 line. There is no per-asset licence, attribution or credit file for art, music, sound or fonts (name search found none). README.md:6 says the game was developed by Counterplay Games and released in 2016. The files do not show a grant from that developer for the art.
- Ruling for this audit: ambiguous chain of title for a commercial game's art, so class C. If a human confirms the title chain, the CC0 line would change this. I do not give a legal conclusion.

## Which half was read
- Client (app/): read in part (sdk cards, spells, step class line, localization key names, asset listings).
- Server (server/, 2.9 MB): not read.
- Data pack: stats and text live in code and JSON in the same repo; no separate pack. No paired donor in the box.

## Asset inventory
- Units and bosses: app/resources/units (1,392 files, 57 MB; 696 plist atlases). app/resources/boss_battles (90 files, 31 MB). One unit png header reads 1024 x 1024 (boss_andromeda.png).
- Frame names: '<unit>_<animation>_<index>' (units/boss_andromeda.plist:7).
- Portraits: boss_battles hex portraits with @2x twins; generals (124 files, 74 MB); icons (746); profile_icons (256).
- Scenes and maps: maps (79 files, 67 MB); scenes (128, 29 MB); tiles (72); card_backgrounds (138); fx (423); particles (145); prismatic (13 files: 3 gradient overlays, 1 atlas).
- Music: app/resources/music (22 m4a, 63 MB; battle-map tracks). Codex audio (m4a) inside codex/ (146 MB folder).
- Sound: app/resources/sfx (671 m4a, 20 MB; announcer lines per faction, first and second).
- Fonts: app/resources/fonts (31 files: Averta and Lato ttf); app/original_resources/fonts (6 ttf, Font Awesome, Lato). No licence file for these in the repo.
- Source art: app/original_resources (588 MB, 2,795 png, 433 jpg).
- Localisation: app/localization/locales/{en,de,zh-tw}: 69 json files, English 34. Keys split by feature; each card has a name key and a description key (cards.json:2).
- Card and rule code: app/sdk/cards (84 coffee files). Spell example read: spellDoubleAttributeBuffs.coffee.

## Rights-holder status
Original company named in the files: Counterplay Games (README.md:6). The repo states CC0 for the whole project and says the game was preserved after a 2020 shutdown. Whether the art was granted to that licence is not stated in the files.

## Inspiration (own words, no copied text; category level, class C)
- Copy the bonus, not the base: a spell takes the difference between a unit's current and base stats and applies only that difference; zero means no effect (spellDoubleAttributeBuffs.coffee:15-21). Good for a modifier-stack rule (parity row 3 area).
- One atlas per creature with frame names that carry animation and index (boss_andromeda.plist:7). Keep the naming scheme; use our own sheets.
- Rarity as an overlay: three gradient overlays plus one atlas show rarity without new card art (app/resources/prismatic/).
- Hex portrait frame with a high-resolution twin (app/resources/boss_battles/).
- Two-stage announcer per side (app/resources/sfx/sfx_announcer_*_1st and _2nd).
- Music bed per battle map (app/resources/music/music_battlemap*).
- Locale file per feature, name and description keys per item (app/localization/locales/en/).

## Briefs (recreate as clearly distinct originals, never copies; category-level)
1. Bonus-copy spell. Keep: copy the current-minus-base difference; zero does nothing. Change: copy a different stat (speed into shield); show a tick, not a number. Ref: spellDoubleAttributeBuffs.coffee:15-21.
2. Hex-framed warden portrait. Keep: hex frame, two sizes with @2x. Change: round ember-ring frame, different palette, head crop. Ref: app/resources/boss_battles/ portrait pair.
3. Rarity shine overlay. Keep: one gradient overlay per rarity colour. Change: shine moves on a timer over a dark frame. Ref: app/resources/prismatic/.
4. Two-line boss call. Keep: one line on entry, one on the first big hit. Change: one voice per boss, not a faction announcer. Ref: app/resources/sfx/sfx_announcer_*.

## Cross-link
- Row 3 (guard, parry, stamina) and stat modifiers: bonus-copy rule.
- Row 6 and 7 (hero and creature animation): frame naming and one atlas per creature.
- Row 12 and sound-music: two-line call, music bed per map.
- Row 14 (HUD) and row 15 (gear): rarity overlay; portrait frame.
- Rendering: the particle and fx folders are the spell-effect vocabulary (not opened).

## Not verified
Server half. Art, music and sound content beyond names and counts (one png header only). Card stat values in the card files. Full locale text. Font licences (none found in the repo). Licence full texts for cocos2d-html5 and chroma-js.
