# eq-p99-tools-eq-client (design catalogue, DC023)

Donor: /mnt/frankendom-donors/eq-p99-tools-eq-client (Rust, 172 .rs files plus docs and config; 186 files in total)
Licence: code MIT (LICENSE line 1 "MIT License"). README line 6: the repo and its build artifacts "do not contain or redistribute EverQuest assets"; game data is read from the user's own install at run time. Asset class D (AU018 audit). Inspiration is CATEGORY-LEVEL only, and no instance-level looks, names or strings are taken. Not legal advice.
Note on scope: this is a client for live-style EverQuest servers (README intro, lines 17-27; online sections 164-262). I read only the presentation, HUD, rules-of-feel and asset-selection code. I did not study the packet or protocol code, and no protocol reuse is suggested.
Dom's rule for every idea below: recreate as a clearly distinct original, never a copy, about 20-30 percent resemblance in mood only.

## Which half was read
- Client half: READ, selectively. crates/eq-client-core/src/races.rs (whole), classes.rs (lines 1-30 and the function list), outfit.rs (lines 1-60 and 86-162), movement/falls.rs (lines 1-25 and the function list), movement/liquids.rs (header and function list), daylight.rs (lines 1-25 and the function list), regions.rs (header, lines 35-58, 314-332), eq-client-render: outfit.rs (lines 1-40), skinned/looks.rs (lines 1-80), resurrection.rs (lines 1-30), hud/action_bar.rs (by grep, lines 271 and 320), entities.rs (by grep, lines 145 and 151), target/marker.rs (by grep, header). Full file list read (186 files).
- Not read: combat, buffs and hotbar bodies, world/*, movement path and route, characters/model bodies, items.rs, spells, strings, sidl, ui.rs, the skinned/* bodies, windows/*, chat, inventory, the test bodies.
- README.md read at: intro (1-28), 188-262 (armour, terrain, status list), 526-580 (posture, spell gems, zone transfer, water roadmap), 632-662 (licence, target selection and ground ring), 638 (Tab targeting). Not read: lines 29-188, 262-526 (except the parts named above), 580-632, 662-947, 947-end.
- Server half: not in this repo. The online client consumes typed events from the separate eq-network crates (README intro, lines 17-27); that repo is NOT in the box and was not fetched.
- Data pack: NOT IN THE BOX. The archives and tables (S3D/WLD archives, the spell and string tables) come from the user's own install, which is not on the VPS. The 186-file listing shows no archive or table files.
- Paired donor in the box: none.

## 1. Creatures / beasts
Counts: no named creature families in the box. The model table in crates/eq-client-core/src/races.rs (declared as 179 entries, lines 10-191) maps race numbers to three-letter model codes (male, female, neuter). It mixes playable races and creature or NPC models; the code does not separate them, and creature names are not in the box.
Escalation with level: not in the box (creature stats come from the server and the install).
Behaviour and ambient vocabulary (what a body does when nothing happens):
- Posture from server state: sitting, crouching, kneeling and lying transitions hold their final frame; movement while crouched uses a crouch-walk clip; posture never moves the body (README lines 533-535).
- Models missing a track inherit it from a documented donor model, while their own tracks keep priority (README lines 533-538). A practical rule for any cast of models.
- Single-model creatures use the same model for every gender (races.rs:249-250).
- Unseen placement markers: spawn points and teleport pads are server-placed markers drawn as nothing (races.rs, function drawn, line 221 and the doc above it).
- Model fallback chain: own gender, then neutral, then male, then female (races.rs, function model, lines 229-240). A missing variant still draws.
- Draw budget: 200 entities at most, with a default distance of 200 (crates/eq-client-render/src/entities.rs:145 and 151; README line 240). This is the readability lever at 375 wide.

Top creatures: 0 of 8 possible. No creature family is named in the box, so no label, why, keep or change can be honestly written for a creature. The behaviour and placement rules above are the usable part.

## 2. Classes / races / factions
- Classes: 16 numbered classes, from a warrior at 1 to a berserker at 16 (crates/eq-client-core/src/classes.rs:4-23, function class_name). Category-level: a spread of frontline, support and caster roles. Role mechanics are not in the box (the server and spell data decide them).
- Progression shape (classes.rs:29-31, function title_string): the class name shows below level 51, then a title at 51, 55, 60 and 65. Four title steps and a name for the low band. Titles are a cheap progression reward.
- Races: 16 named races (crates/eq-client-core/src/races.rs:195-212, function race_name). Category-level: humans, small folk, large folk, beast-like races, a reptile-like race, and others.
- Gender: three values (male, female, neuter) pick a model (races.rs model function).
- Factions: deities are named (classes.rs:53, function deity_name). Count not taken.
- Progression beyond titles (spells, levels): server-driven, not in the box.

## 3. Weapons
Families in the box: none counted. Held items are drawn by item model number in the hand (crates/eq-client-core/src/outfit.rs, function held_model; test name "hands hold item models by number", line 298). A shield sits on a shield point; classic shields and flat later models go to that point (outfit.rs test at line 287).
Special properties: not in the box (items.rs, 230 lines, not read).
Visual tiers: not in the box.
Top weapons: 0 of 5. The shield-point rule is the one usable idea:
1. Shield point rule: classic shields and flat later models share one attachment point, so the shield reads at the same place across model generations (outfit.rs:287 test name, function on_shield_point at line 174).

## 4. Armour / gear
Slots: seven texture slots by two-letter code: head, chest, arms, wrist, hands, legs, feet (crates/eq-client-core/src/outfit.rs:99-110, function slot).
Material tiers: material numbers 1 to 4 are drawn (outfit.rs:13, DRAWN_MATERIALS). README line 200-201 says each body part draws with the leather, chain or plate texture the server reports for its slot, then tinted.
Robe sets: six robed races (outfit.rs:17, ROBED_RACES) take a robe body when the chest material is in 10 to 23 (outfit.rs:20, ROBES). That is 14 robe material numbers swapping the whole body.
Faces: a face number from 0 to 9 swaps the face texture (outfit.rs:118-145, function dressed, head branch).
Tints: each slot has its own tint; robes take the chest tint; a helm takes the head tint; faces are never tinted (outfit.rs:145 doc, function tint at line 147).
Helm visibility: other characters' helms always show; the player's own helm follows an option (outfit.rs:33-37 doc).
How tiers look: material texture swap plus a per-slot tint. Silhouette changes only through the body and head shape chosen (outfit.rs function shape, line 39). No metallic, gold or glow shader in the box (grep for metal, specular, gold, shine, glow over crates found only coin tests and a comment).
Gold coins are data, not a shader (crates/eq-client-core/src/world/tests.rs, coin tests). Not a look.

Top gear ideas (5 wanted; this is what is real):
1. Slot-coded material swap with a per-slot tint, and a face that is never tinted (outfit.rs:113-160). Keep: the swap-and-tint pairing; faces protected. Change: our tier names and tint palette.
2. Robe as a whole-body override chosen by chest material (outfit.rs:17-20). Keep: one material number switches the whole body. Change: our robe sets.
3. Other people's helms always show; the player's own helm is an option (outfit.rs:33-37). Keep: social readability. Change: our default.
4. A head pick by material number that also carries the face (outfit.rs:118-145, head branch).
5. Shield point rule for old and new models (outfit.rs:174, 287).

## 5. Zones / dungeons
Counts: zones are data in the install; none are in the box (not counted).
Region fill kinds read by name prefix: seven kinds (water, lava, zone line, player-versus-player, slime, ice, and VWA regions; crates/eq-client-assets/src/regions.rs doc lines 48-50). Water and lava are zone fill regions, not meshes (regions.rs header line 2; AU018 cites line 35).
Terrain kinds (README section "Status and remaining stages", first bullet): repeating and transparent materials, plus static trees and buildings.
Hazards:
- Water and lava block walking. A step stops before the head goes under water or the feet into lava; shallow water is waded (liquids.rs header, lines 1-8).
- Falls: damage is zero up to a harmless drop, then grows with the square of the drop past it (falls.rs:12-15 and doc lines 10-14; all values marked inferred in the file).
- Safe Fall skill reduces the share, capped at a skill of 200 (falls.rs:17-20).
- Day and night: a provisional dawn-and-dusk model with night exposure in stops, twilight colour temperature and sky colour per time (crates/eq-client-core/src/daylight.rs:36 and doc line 2). The file says every number is provisional.

Biome list: not in the box beyond the ground kinds and the water and lava fill rules above.
Dungeon archetypes: not in the box.

Top zone ideas (5):
1. Water and lava as zone fill regions chosen by a name prefix, not meshes (regions.rs:35-37, 314-318). Keep: fill by prefix. Change: our own prefix keys and fill rules.
2. Shallow wading, deep stops (liquids.rs header lines 1-8). Keep: the waterline rule. Change: a swim mechanic that our game already has.
3. Fall damage curve with a harmless band and a skill cap (falls.rs:12-20). Keep: quadratic growth past a harmless band; cap on the mitigation. Change: our constants.
4. Provisional day-night model: dawn and dusk windows and twilight colour (daylight.rs:36). Keep: time windows, not a clock switch. Change: our palette.
5. Fill regions by name for lethal ground (ice, slime, VWA) (regions.rs:48-50). Keep: the prefix idea. Change: our hazard list.

## 6. Item and effect looks worth recreating
- Armour swap and tint: material digits swap per slot, then a tint (crates/eq-client-core/src/outfit.rs:113-160).
- Posture hold: a final frame held for sit, crouch, kneel and lie (README line 533).
- Waiting pulse on the ability bar: a waiting state pulses its brightness with a sine on the clock (crates/eq-client-render/src/hud/action_bar.rs:320; line 271 doc "waiting states pulse at full width").
- Ground ring: depth-tested, follows the selected entity, hides when unavailable (crates/eq-client-render/src/target/marker.rs, header line 1; README lines 632-662, target and ground ring paragraphs).
- Window fade on pointer leave: a window's background holds its alpha, waits a delay, then fades to a second alpha over a duration (crates/eq-client-render/src/skinned/looks.rs:54, function opacity).
- Bag colour per storage slot (README line 190): colours belong to the storage slot, not to the item.
- Chat channel tabs with unread counts and a 200-message history per channel group (README lines 205, 220).

## 7. Idle, death, spawn, HUD fold-ins
- Death and respawn presentation: a resurrection offer opens the skin's confirmation dialog with the caster's name; Yes or No answers it (crates/eq-client-render/src/resurrection.rs:1-10, QUESTION constant at line 10). The offer uses the installed client's question string when available.
- Death and zone transfer: pending transfers disable gameplay input but keep the spellbook and cooldowns; a rejected transfer restores access (README section at lines 526-580, zone transfer paragraph).
- Cast guard and retry: a cast waiting on the server blocks duplicate requests; after five seconds without acknowledgement a fresh manual attempt is allowed; it never resends automatically (README lines 550-552).
- Target UX: Tab cycles nearby entities in stable ID order; F1 selects self; Escape clears (README line 638).
- Not read or not in the box: minimap or world map (a map.rs module exists, not read), touch UX (none found by file name), input buffer and lock-on forgiveness, accessibility, sound and music (no audio module; ui.rs line 892 only has a Sound flag), loot drop ceremony, spawn walk density.

## 8. Inspiration for Frankendom (originals; never copies)
1. Gear by swap and tint. Each body slot takes a material from the server's slot value and a tint from the same slot; faces are never tinted. Keep: slot-coded swap, tint, face protection. Change: our own tiers and palette. (Parity row 15 gear dressing.)
2. Posture from state, hold the last frame. Sit, crouch, kneel and lie hold their final frame, move with a crouch-walk clip, and never move the body. Keep: the hold and the no-move rule. Change: our states and poses. (Parity rows 6 and 7 hero and creature actors.)
3. Pending-cast pulse with manual retry. The ability bar pulses while the server has not confirmed a cast; there is no automatic resend; a manual retry is allowed after five seconds. Keep: never auto-resend; visible pending state. Change: our ability bar and timer numbers. (Parity rows 13 specials and 14 HUD.)
4. Ground ring by state. A depth-tested ring follows the selected body and hides when the target is not available. Keep: the depth test and the hide rule. Change: our ring shape and colours. (Parity row 14 HUD.)
5. Stable target cycle. Tab cycles in stable ID order, a key selects self, Escape clears. Keep: stable order. Change: a touch version for 375 wide. (Parity row 5 controls and input.)
6. Fall damage with a harmless band. Zero damage up to a harmless drop, then growth with the square of the drop, with a capped mitigation skill. Keep: harmless band and cap. Change: our constants. Note: no parity row covers falls yet; this is a candidate movement rule.
7. Waterline wading. Shallow water is waded, deep water stops the walk. Keep: the waterline rule. Change: our swim rule. Note: candidate under the zone-data rule (row 23 only covers spawns).
8. Window fade on pointer leave. Hold, delay, then fade to a set alpha over a duration. Keep: delay then fade. Change: our HUD timings. (Parity row 14 HUD.)
9. Resurrection confirm with a name. A dialog states who offers, with Yes and No. Keep: an explicit accept step naming the caster. Change: our wording. (Parity row 17 death and respawn.)
10. Draw budget at 375 wide. A default distance and a hard cap of 200 entities. Keep: cap and default distance. Change: our numbers. (Parity row 11 fight camera and row 23 population.)

licence_note: MIT code; no EverQuest assets in the repo; the client reads the user's own install at run time (README lines 3-6). Protocol code and the eq-network repo are not in the box and were not studied. Asset class D: category-level inspiration only.
Counts and receipts: see receipts.tsv in this folder.
