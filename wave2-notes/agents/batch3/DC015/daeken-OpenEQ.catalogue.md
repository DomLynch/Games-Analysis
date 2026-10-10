# daeken-OpenEQ: design catalogue (DC015)

Donor: /mnt/frankendom-donors/daeken-OpenEQ (read-only, VPS)
Half read: client half only (crates/openeq, openeq-assets, openeq-net, openeq-render, openeq-ui; Rust, Bevy and wgpu), plus the docs and the zone table cited below. The server half is not read: only server patches (tools/eqemu-patches/*.patch) exist in the tree, read by name. The data-pack half is the user's own EverQuest install, which is not in the box. Paired server half in the box: EQEmu (/mnt/frankendom-donors/EQEmu, named in audit AU018); not read by me.
Licence (as the files say): code MIT OR Apache-2.0 (Cargo.toml line 14, inherited by every crate); no LICENSE file in the tree. No original client assets are distributed (README line 331). Audit class D overall: rights unclear, the client reads the user's own data.

Rule for every idea below: recreate as a clearly distinct original, never a copy. Each item names the trait KEPT and the trait CHANGED. Inspiration here is shader technique and category-level only.

Counts (my own): creatures 0 (no creature table in the client half); playable classes 16; races 16; weapons 0; gear sets 0; zone environment rows 620.

## 1. Creatures and beasts

None in this donor. The client half has no creature, NPC, spawn or item table (grep for NPC and spawn tables under crates/ finds none). Two docs name server-side tables (docs/SERVER_SETUP.md, docs/QUEST_HANDIN_PLAN.md); found by grep only, not read. Top 8: none.

## 2. Classes, races and factions

Classes (crates/openeq/src/account_ui.rs:1633, class_name): Warrior, Cleric, Paladin, Ranger, Shadowknight, Druid, Monk, Bard, Rogue, Shaman, Necromancer, Wizard, Magician, Enchanter, Beastlord, Berserker. Index 0 is Unknown. The raid and guild UIs carry class-name lists too (partly read).

Races (crates/openeq/src/account_ui/creation.rs:669, race_name): Human, Barbarian, Erudite, Wood Elf, High Elf, Dark Elf, Half Elf, Dwarf, Troll, Ogre, Halfling, Gnome, Iksar, Vah Shir, Froglok, Drakkin; any other code shows as "Race N".

Progression, skills and factions: not in the client half (not read beyond the name tables).

## 3. Weapons

None in this donor. Gear arrives from the server; the client resolves equipment by numeric code (crates/openeq-assets/src/character/equipment.rs:223 fn equipment_id; equipment.rs:11 load_equipment_scene). Top 5: none.

## 4. Armour and gear

No material ladder, tier names or set bonuses in the client half. What the client does have: character model modules for Luclin, modern and modern-Drakkin characters (crates/openeq-assets/src/character/: luclin.rs, modern.rs, modern_drakkin.rs, appearance.rs, customization.rs, equipment.rs). The equipment array carries a material id per slot (a test in crates/openeq-render/src/actors.rs sets one; slot count not read). Tier visuals are not established from this donor. Top 5: none.

## 5. Zones and dungeons

Zone atmosphere table: crates/openeq-assets/data/peq-zone-environment.txt, 620 zone rows, 31 columns (header at line 3). Columns: short name, version, zone id, four fog sets (red, green, blue, fog start, fog end), fog density, minimum and maximum clip, sky, ztype, time type, castout-door flag, timezone. Source is a third-party EQEmu database dump with no licence line (class C). Counts I made on the categorical columns (meanings not read beyond the header):
- ztype: 255 on 407 rows, 0 on 158, 1 on 55.
- time_type: 2 on 226, 0 on 188, 1 on 177, 5 on 16, 3 on 9, 4 on 4.
- sky: 0 on 317, 1 on 279, 2 on 21, 255 on 2, 8 on 1.

Hazard and terrain features (names and docs; most not read beyond the lines cited):
1. Lava regions: a per-region colour expression and a two-layer lava material (crates/openeq-render/src/shaders/lava.wgsl, see section 6).
2. Waterfall curtains: authored surfaces with an independent scroll (docs/EQG_WATERFALL_RENDERING.md).
3. Anguish basin: an authored water box that does not fill the central room. The doc (docs/ANGUISH_BASIN_ROUTE.md, opening lines read) reports the traversed route is dry and the final floor sits about 47 units above the registered water box. A registered volume and the visible surface can disagree; design a check for that.
4. Liquid regions: crates/openeq-assets/src/liquid_regions.rs (file name only, not read).
5. Zone fog and clip as one flat record per zone (the table above): one data row carries the whole atmosphere.

Top 5 striking are the five items above; the zone table is the strongest data pattern (one row per zone, four fog sets).

## 6. Item and effect looks worth recreating

- Two-layer molten pool. Technique: one atlas sampled twice with two scroll offsets (lava.wgsl lines 15 and 16). The bottom layer is doubled (line 19: mix of 2.0 times the bottom colour with the lit top, by the top alpha). The result is opaque and fogged. Ref: crates/openeq-render/src/shaders/lava.wgsl:15-19.
- Falling sheet. Technique: colour and opacity from one texture, with the opacity scrolling on its own, source-alpha blending and an alpha cutoff. Ref: docs/EQG_WATERFALL_RENDERING.md:4 and :67.
- Caster hand glow. Technique: spell visuals follow skeletal hand sockets for classic, Luclin and modern characters; first-person casting uses a camera-relative hand location because the player's body is not drawn in that view; unknown codes fall back to the body anchor. Ref: docs/SPELL_EFFECT_RENDERING.md:8-10; crates/openeq-render/src/actors.rs:128.
- Time-of-day ambient light. Technique: the sky's reserved colour-map column supplies environment light, read by a time slot. Ref: docs/SKY_LIGHT_COLOR_INPUTS.md:4.
- Data-bound HUD. Technique: a UI document becomes named widgets with atlases, timed animations and an explicit frame index; gauges are bound as a 0 to 1 fraction (HP at 0.73 in the example). Ref: crates/openeq-ui/README.md:14 and :30. State variants (pressed, hovered, disabled) are named in the asset audit, not in the lines read.

## 7. Inspiration for Frankendom

1. Molten pool. Idea: a lava or slag pool from one atlas with two offset layers. Keep: two scroll offsets on one texture; top-alpha blend; opaque and fogged. Change: our own crust pattern and a cooler violet tint.
2. Falling curtain. Idea: a waterfall sheet with independent colour and opacity scroll. Keep: independent opacity scroll with an alpha cutoff. Change: a wider top, a frayed base and a foam strip of our own.
3. Caster hand glow. Idea: a spell glow anchored to the hand socket, with a camera-relative fallback in first person. Keep: socket anchoring and the fallback. Change: school colours and a curling arc of our own. Fits hero actor and specials rows (6 and 13).
4. Day-cycle ambient. Idea: ambient light from a colour table at fixed times of day. Keep: fixed sample times on one table. Change: our own palette table, not the donor's sample values. Fits colour grade row 16.
5. Bind-return death. Idea: the donor's plan names forced return to bind as the first death target; hover recovery is a separate server mode. Keep: one default recovery path, other modes as explicit settings. Change: our own penalty and presentation. Fits death and respawn row 17.
6. Data-bound HUD. Idea: layout from named widgets and bindings, gauges as 0 to 1 fractions. Keep: bindings in, one layout pass out. Change: our own frame art and states. Fits HUD row 14.
7. Zone atmosphere record. Idea: one flat row per zone holding fog, clip and sky. Keep: one row, one zone. Change: our own fields and values (none copied). Fits zones as data (row 20 catalogue fields and row 23 zone population).
8. Hanging lantern. Idea: a fixed-mount light that swings on a chain instead of spinning (from the asset audit; docs/WLD_LAMP_ANIMATION.md not read). Keep: fixed mount, motion on one axis. Change: warm ember light and a brass cage of our own.

## Not read (full list in the JSON)
- Server half (not in the box) and data-pack half (the user's install, not in the box).
- Binary blobs native_witness.bin and native_controls.bin (class C): not opened.
- Bodies of the zone environment and sky colour sample tables: headers and counts only.
- Docs beyond those cited (titles or opening lines only), shaders other than lava.wgsl, Cargo.lock, tools bodies, third-party licences.
