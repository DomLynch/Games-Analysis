# elberacasa-Lineage2Elbera (design catalogue, DC021)

Donor: /mnt/frankendom-donors/elberacasa-Lineage2Elbera/ (VPS, read-only)
Class: C (proprietary-derived; asset audit AU017). Inspiration stays category-level. No instance-level looks, no copied names, no copied lore.
Dom's rule: recreate as a clearly distinct original, never a copy. Each brief names the trait KEPT and the trait CHANGED.
Licence: see section 8.

## Halves read
- Read: the data and loader half (gateway/src tables that name NPCs, weapons, quests, henna, recipes, skill training), the client data-consumer half (editor/world/js and editor/charcreate, partly), and the tool half (tools/mesh, tools/src/char_pipeline, tools/dat, docs).
- Server half (aCis gameserver and loginserver): NOT in the box. gateway/src loaders read aCis datapack XML from a server path that is not present (npcnames.js, weapontypes.js, questnames.js). The XML was not read.
- Data pack (retail client files: npcgrp.dat, weapongrp.dat, armorgrp.dat, .utx, .ukx): NOT in the box. The tools reference assets/ paths the repo does not carry. Counts below come from docs and docstrings, not from data I could open.
- Paired donor candidates in the box (names only, not read, not verified as the aCis server): ax-grymyr-l2dn-server, cuteshaun-lineage2-api, NodeL2-NodeL2, pier-oliviert-lineage, pmbstyle-L2Solo, realratchet-Lineage2JS, shnok-l2-unity, gawric-Unity-Client-for-L2J.

## Counts (verified in the box)
- Creatures: 0 verified records. Docs claim 6,519 original NPC records and 495 built mesh transforms (docs/npc-visual-data.md:23). Not verifiable here.
- Classes: 9 fallback class entries across 5 races. These are placeholders: app.js says the fallback labels cannot supply appearance defaults.
- Weapons: 0 verified item records. Docs claim 181 weapon meshes covering 413 item ids (docs/weapon-pipeline.md:43).
- Gear sets: 0 verified. Armour slot rules are documented (see section 4).
- Zones: 0 verified tile records. Docs disagree on the world tile count: 153 (docs/tile-map.md:3) vs 157 (docs/map-format.md:4). Five starting-village town maps are named in docs (docs/minimap-mapping.md:12).

## 1. Creatures / beasts
Creature families (from docs and loaders; no creature data in the box):
- Translucent wraith family: 3 families, 7 NPC ids. They reuse living NPC meshes but select a different Shader with its own blend state (docs/native-npc-material-evidence.md:3-5, 42).
- Winged fallen-NPC family: 2 NPC ids, two-sided alpha-tested wings (docs/native-npc-material-evidence.md:77-84).
- Metal-sheen livestock: 1 NPC id, specular graph via an environment map; left unresolved by the author (docs/native-npc-material-evidence.md:12).
- Small pests and forest animals: named in docs as a bounded animation checkpoint (docs/npc-animation-variants.md:13, 114). No clip data read.
- Village guards and merchants: death-pose variants. Taking the first class for a mesh made corpse NPCs play a living idle (docs/npc-animation-variants.md:6). Docs say ten NPC records use four classes.
- Generic monster clip contract: idle, walk, run, attack, die, plus corpse and special (tools/src/char_pipeline/build_monsters.py:11).
Boss or elite pattern: not found in the box. Searches for named raid bosses returned only engine words (Core).

Top creatures (only five are verified enough to rank; I did not pad the list):
1. Wraith pack. Why: alpha-blended translucency reads as ghostly from a distance and needs no new mesh. Keep: translucent body and slow drift idle. Change: our own silhouette, rim glow, and a distinct stinger. Do not reuse any living NPC mesh. Ref: docs/native-npc-material-evidence.md:42; editor/world/js/npcmaterials.js:1-20.
2. Fallen watcher (winged corpse). Why: a body that reads dead while its wings still move reads as a threat not yet spent. Keep: death-pose idle and two-sided alpha-cut wings. Change: wings open on aggro, our own wing shape, no FinalBlend. Ref: docs/native-npc-material-evidence.md:77-84; docs/npc-animation-variants.md:1-12.
3. Gilded beast. Why: a sheen on an ordinary animal reads as rare at 375 px. Keep: the sheen as a rarity signal. Change: no environment map; use rim light and spark motes instead. Ref: docs/native-npc-material-evidence.md:12-14.
4. Small pest pack. Why: none verified beyond the naming. Weak evidence; listed only so a human can look. Keep: per-class idle variants. Change: our own pest design. Ref: docs/npc-animation-variants.md:13.
5. Standard monster clip set. Why: one readable set across many creatures makes the fight legible. Keep: the seven-clip set. Change: add a telegraphed special windup with a sound cue. Ref: tools/src/char_pipeline/build_monsters.py:1-11.

Idle vocabulary: NPC waits use a Wait animation with sound and effect events tagged to frames (AU017 captions; npcwaitanim.js not read). Death presentation: corpse NPCs keep their own death loop (docs/npc-animation-variants.md table, lines 1-12).

## 2. Classes / races / factions
- Races (5): human, elf, dark elf, orc, dwarf (editor/charcreate/app.js:16-52). Placeholder body build per race in app.js:301-306 (height and bulk only; placeholder rig).
- Class types: fighter (melee) and mystic (caster), by the type field. Dwarf has a fighter entry only (app.js:46-49).
- Signature mechanic per class: not in the box. Weapon-use gating decides which skills a class can cast (editor/world/js/weapongate.js:1-12).
- Progression shape: skills are trained at a trainer; costs and eligibility are server state (gateway/src/skilltraining.js:1-8). Henna symbols carry stat bytes over six stats; the header says these may be negative deltas, not totals (gateway/src/henna.js:7). No level curve read.
- Factions: not found in the box.

## 3. Weapons
Families by hand use, from the author's counts (docs/weapon-pipeline.md:65-68):
- One-hand: 92 meshes. Pole or staff: 25. Shield (left hand): 17. Two-hand: 16. Bow: 13. Dual fist: 11 (always worn in pairs). Dual sword: 5 (one item references two one-hand meshes). Other: 2.
Grades: NONE, D, C, B, A, S (0 to 5), docs/weapon-pipeline.md:29-34.
Special properties: skills list the weapon types they need, and a shield in the left hand can satisfy the gate (editor/world/js/weapongate.js:6, 19). Elemental and set bonuses: not in the box.
Visual tiers: by mesh, not by grade colour. Grade shows as a letter symbol, not a tint (editor/world/js/ui/tooltip.js:33).

Top weapons (striking if readable at 375 px):
1. Dual fist pair: always worn as a pair, so the pair reads as one silhouette. Keep the paired read; change the gloves design.
2. Pole/staff: a long single silhouette that reads at range. Keep the length; change the head and tip effect.
3. Bow: 13 meshes, ranged silhouette. Keep the draw read; change the string and nock light.
4. Dual sword: two blades read as one item. Keep the pairing; change the blade shape.
5. Shield stance: a left-hand shield unlocks a skill set (editor/world/js/weapongate.js:19). Keep the gate rule; change to a visible stance pose and a HUD hint.
Sound and elemental cues for weapons: not read.

## 4. Armour and gear
- Armour is slot substitution, not attachment. Equipping a chest piece replaces the upper-body mesh (tools/mesh/build_armor.py:1-20).
- Slots from the author's grouping of body_part (tools/mesh/build_armor.py:19-27): gloves (9, 145 meshes), chest (10, 95), legs (11), boots (12), full armour (15, 74 items, chest plus legs), cloak (13), hair accessories (17-19).
- Head slot: 96 items, zero geometry. Interlude does not draw helmets (tools/mesh/build_armor.py:27).
- Material tiers: grades NONE to S by crystal type. Materials (metal, gold, crystal) are not separated in the box. The tooltip uses a letter symbol after the name; the name itself stays white (editor/world/js/ui/tooltip.js:33).
- Gear-linked stat slots: henna symbols over six stats (INT, STR, CON, MEN, DEX, WIT). Stat bytes may be negative deltas (gateway/src/henna.js:1-7).
- Loot sink: a crystallize action, shown when the character has the ability (editor/world/js/ui/inventorywnd.js:614-616). Its yield table is not read.
- Sets: not in the box.

Top gear:
1. Full-armour single piece (74 items, chest plus legs): one piece substitutes both upper and lower body. Keep: one slot, one mesh. Change: our own fit and cloth/plate split.
2. Cloak slot: a separate slot that reads over the body. Keep the separate slot; change the cloth physics.
3. Grade letter badge: tiers read by a letter, not colour alone. Keep the badge; change the glyphs and add a shape cue.
4. Henna stat symbols: stat slots on the body. Keep the six-stat set; change the symbols.
5. Crystallize sink: gear is spent for a material return. Keep the sink; change the yield table (the donor's table was not read).

## 5. Zones and dungeons
- Starting villages: one town map per race start (talking, elf, darkelf, orc, dwarf) (docs/minimap-mapping.md:12). Giran area has the only per-tile town map textures, three tiles (docs/minimap-mapping.md:13, 26).
- World: a tile grid of geodata, with north as negative Y and south as positive Y. Dwarven lands north, Talking Island south (docs/tile-map.md:13).
- Sky layers: flat background, a haze band (main.js, not read), a cloud sheet, two starfield sheets, and sun, moon and lens-flare rig (editor/world/js/sky.js:7). Sun and moon can show at the same time (editor/world/js/sky.js:56).
- Interiors: built from a BSP pipeline; repeated columns (AU017 captions; not read).
- Dungeon archetypes and hazards: not in the box.

Top zones:
1. Race start village with its own town map. Keep one start zone per race. Change the layout and the name.
2. Layered night sky with starfield and moon. Keep the layers; change the palette and the moon count.
3. Two-celestial dusk: sun and moon together. Keep the simultaneous read; change the positions and palette.
4. Giran-style detailed town map. Keep a single detailed town; change the layout.
5. BSP interior with repeated columns. Not read; listed from captions only.

## 6. Item and effect looks worth recreating
- Skill VFX: camera-facing quads with colour ramp, opacity fade in and out, size-over-life curve, burst or stream spawn (editor/world/js/skillvfx.js:1-16). 714 sprite emitters and 408 mesh emitters rendered, per the header claim (skillvfx.js:16).
- Magic circle under casters, a mesh emitter ring (editor/world/js/skillvfx.js:20).
- Cloud: a flat colour times an alpha mask, so the alpha carries the shape (editor/world/js/sky.js:18).
- Two-sided alpha-tested wings with a FinalBlend (docs/native-npc-material-evidence.md:77-84).
- Translucent ghost blend (docs/native-npc-material-evidence.md:42).
- Tooltip frame: nine-slice, 8 px corners (editor/world/js/ui/tooltip.js:36).
- Armour slot substitution (tools/mesh/build_armor.py:19-27).
- Floating damage text and ground loot pile after a kill: captions only (AU017; docs/img not read).

## 7. Inspiration for Frankendom (originals, not copies)
1. Wraith Drift: a translucent pack that drifts and flickers on hit. Keep the translucent body and drift idle. Change our own silhouette, rim glow and stinger. No living-NPC mesh reuse.
2. Watching Corpse: a fallen guard whose wings open on aggro. Keep the death-pose idle and the alpha-cut wings. Change the wing shape and the open trigger.
3. Gilded Hog: a rare livestock creature. Keep the sheen as the rarity cue. Change: rim light and spark motes, no environment map.
4. Caster Ring: a ring under the caster. Keep the mesh-ring idea. Change the pattern and team colour.
5. Grade Badge: letter badges NONE to S beside the item name. Keep the symbol approach. Change the glyphs and add a shape cue for colour-blind players.
6. Shield Stance: a left-hand shield opens a skill set. Keep the gate rule. Change to a visible stance pose and a HUD hint.
7. Paired Fists: paired fist weapons read as one item. Keep the pair. Change the glove design.
8. Two-Celestial Dusk: sun and moon visible together. Keep the layered read. Change the palette and positions.

## 8. Licence
- Project code: MIT (LICENSE line 3, as AU017 states; not re-read by me). Vendored three.js is MIT, so code may be adapted with the notice kept.
- Game content: no licence granted. The README says the original content belongs to its owners (AU017, README lines 491-492).
- Screenshots: not redistributable (docs/img/README.md:31, per AU017).
- Class C: category-level inspiration only. Idea adaptation, no copying of names or art.

## 9. Not read
- Server half (aCis gameserver and loginserver): not in the box.
- Data pack: not in the box.
- Client files under editor/world/js beyond the cited files; npcwaitanim.js, skillfx_anim.js, and most of the 100+ check scripts in tools/ui.
- progress.md (267 KB) and the docs/img captions.
- AGENTS.md in the donor was treated as data and not followed.
- gateway/src/questnames.js, recipes.js: line counts only.
