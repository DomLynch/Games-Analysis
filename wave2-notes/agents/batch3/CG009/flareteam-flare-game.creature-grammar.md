# flareteam-flare-game (creature-grammar, cell CG009)

Donor/Licence: art and data CC-BY-SA 3.0 (README:21 in the donor root); audio not named, per-file credits point to a wiki (CREDITS.txt:104), so audio is unclear; engine GPL v3 or later (README:19), engine not read. Shape only, no art, sheets, sounds or stat values copied. Not legal advice.

Checked: DATA half read (mods/fantasycore/enemies/base, mods/empyrean_campaign/enemies, mods/empyrean_campaign/powers/categories/enemy.txt, beacon.txt, magician.txt, mods/fantasycore/animations/enemies/wyvern_fire.txt, enemies/docs/ranged_behavior.txt). Counts by grep on the VPS in this pass, not copied. Opened about 25 creature files across the wyvern, skeleton, antlion, goblin and zombie families. Confidence high on the element overlay rule (all 26 resist files classified). Medium on tier numbers (sampled). No PNG viewed. Paired half flareteam-flare-engine (engine: AI and power resolution) is named by the donor (docs/ranged_behavior.txt:6) and was not read. Server half: none in the box.

Best transferable idea: give each creature family one body and make element, tier and promotion each a short data overlay on it, with the element's projectile swap as the only new attack.

Tags: creature-family, recolour-tier, scale-tier, swapped-ability, boss-elite-pattern, naming-grammar, bleed, status-stack, fear, hit-sound, new:element-overlay, new:stat-per-level, new:idle-loop

## 1. What the player sees and feels
A wyvern family reads as one creature in several moods. The fire and ice wyverns share a body and a flying motion, but each swaps its own animation sheet and fires its own bolt: a fireball from the fire one, and an ice bolt from the ice one that slows the hero by 50 percent for 2 seconds. Idle is an 8-frame stance loop of 800 ms, so the creature visibly breathes when nothing is happening. Death on a wyvern uses one sound file for normal and critical death; the minotaur has a separate critical-death sound file. (Sound contents were not heard.) At 375 wide the element is shown by the bolt and the sheet, not by a new silhouette, which is the lesson for the player: one family teaches one element rule.

## 2. Why it works, and is it striking
- Readable silhouette at 375 wide: NOT checked. No PNG was viewed. Frame boxes in the fire wyvern stance block range from 129 to 241 px wide in the lines read (animations/enemies/wyvern_fire.txt:13-20, receipt F34).
- One signature behaviour: the ice variant pursues more (chance_pursue=2) than the fire variant (=1), and flees from a shorter range (flee_range 9 against 10) (lvl7_wyvern_ice.txt:34,38; lvl7_wyvern_fire.txt:34,38; F11, F12).
- One signature effect: the ice bolt (power 172) is tagged ice and applies slow_ice 50 percent for 2 s (enemy.txt:134, 137; F14, F15). The fire bolt (power 173) carries the fire trait (enemy.txt:156, F16); its other lines were not read.
- Could be made ours at 20-30 percent resemblance: yes. The transferable part is the overlay layering, not the body.

## 3. The rule behind it
Layers, each a file or a block that INCLUDEs the one below it:
- L1 base template (34 templates: 21 in fantasycore/enemies/base, 13 in empyrean_campaign/enemies/base). Holds the animation key, sound keys, melee range and threat range. Wyvern base: melee_range=1.125, threat_range=8.0 (wyvern.txt:13-14; F04, F05).
- L2 element overlay. The element file INCLUDEs the base and swaps one animation line (wyvern_fire.txt:1,3; F01, F02). Its resist pair and projectile id are set in the monster file (lvl7_wyvern_fire.txt:25-26, 41; F06, F07, F09). The ice counterpart swaps the id to 172 (lvl7_wyvern_ice.txt:41; F10).
- L3 tier stats per file: hp, accuracy, avoidance, poise, melee and magic damage, absorb, cooldown, xp, loot table, rarity. Hand-set per file, not computed from a table.
- L4 behaviour knobs per file: chance_pursue, chance_flee (20 in the wyvern and skeleton files read), flee_duration 3s, flee_cooldown 1s, flee_range, threat_range, and power weights (power=melee,164,5 and power=ranged,173,60; lvl7_wyvern_fire.txt:38-41).
- L5 promotion: the spawn variant of the ancient wyvern is one INCLUDE of the parent plus one passive power, 194 (spawn runes, 533 ms) (lvl15_spawn_wyvern_ancient.txt:1,4; enemy.txt:481; F18, F19, F20). Named elites: the same base with a defeat tag and extra immunities. The final boss has a defeat tag and passive powers 185 (bleed) and 287 (slow and stun resist) (lvl16_lezaith.txt:9,17; F21, F22).
- L6 labyrinth scaling: stat_per_level lines (hp 30, accuracy 5, avoidance 5 per level in il_wyvern_fire.txt:34-36; F23). 166 such lines in 20 of the 124 top-level files.

Element resist pattern, counted over the 26 top-level files that carry an ice or fire resist line (fire on 25, ice on 26):
- 12 standard: own +25, opposite -50 (e.g. lvl7_wyvern_fire.txt:25-26; F06, F07; also lvl3 fire mage and lvl14 firethorn, F27).
- 6 labyrinth: own +50, opposite -50 (il_wyvern_fire.txt:30-31; F24).
- 5 late, levels 11 to 16: own +50 and opposite -25, or the mirror (lvl11_skeleton_blaze.txt:28-29, F25; lvl16_rakk.txt:24-25, F29).
- 2 odd (-25 fire, +10 ice on lvl5 frozen corpse and frostsword).
- 1 with ice only (lvl13_antlion_fossilized).

Ranged pursue weight, the donor's own rule: higher level is smarter, and ice is a little less careful than fire (docs/ranged_behavior.txt:50, 52; F39, F40). In the two pairs read, ice is less careful: wyvern 1 against 2 (F11, F12), skeleton mage 3 against 7 (lvl3_skeleton_fire_mage.txt:37, lvl3_skeleton_ice_mage.txt:37; F28).

Data fields (designer-tunable; donor value null because the donor is CC-BY-SA data):
- base_melee_range | game units (donor does not define the unit) | null
- threat_range_see, threat_range_miss | game units | null
- element_id | key | null
- element_resist_own, element_resist_opposite | percent | null (pattern id: standard, labyrinth, late)
- element_projectile_key | power key, not number | null
- element_status_slow_pct, element_status_slow_s | percent, seconds | null
- chance_pursue | weight | null
- chance_flee | weight (percent-like) | null
- flee_duration, flee_cooldown | seconds | null
- flee_range | game units | null
- power_weight_melee, power_weight_ranged | weight | null
- hp_base, hp_per_level | hit points, per level | null
- accuracy_per_level, avoidance_per_level | points, per level | null
- cooldown_ms | milliseconds | null
- passive_immunity_keys | key list (bleed, slow, stun) | null
- promotion_passive_key | power key | null

## 4. For Frankendom
- 700 zones as data: a zone population row names a base body, an element id, a tier and any promotion, and reuses one of the 100 Pit characters. A zone gets its own elite by one more row, not a new file. The spawn variant (one passive) is the cheapest promotion; that is zone-population work for row 23, not this note.
- Many-vs-one, MAX_ATTACKERS 3: the chance_pursue, flee and threat knobs are per creature and belong in the engine's target and leash logic (parity row 4 fight loop; row 2 AI brain). The donor's beacon pull (beacon.txt:9 radius 4.0; F38) becomes a data power that pulls the two nearest, with a cooldown, not a special case.
- Server-verified: element status (slow 50 percent for 2 s) and damage are server power effects. The client shows the element sheet, the projectile animation and the hit sound (rows 7, 10, 12). Keep that split so the element cannot drift between client and server.
- One ledger: resist and tier numbers are catalogue rows; the element table is one place. Power keys are names, not numbers (see the defect list).
- Keep: one body per family; element as an overlay (sheet, resist pair, projectile key); tier as a stat row; behaviour knobs as numbers; spawn variant as INCLUDE plus one passive; idle as an 8-frame looped stance.
- Change: element sheet keyed by element id; power refs by name; one named resist pattern table; stats computed from tier rows with overrides only for named elites.

Defects found (keep the idea, fix the defect):
1. Ice wyvern template names a water animation sheet (wyvern_ice.txt:3; F03). Fix: look up the sheet by element id and fail the load if it is missing.
2. Power id 132 means different things per namespace: beacon base (beacon.txt:2, F35), magician power (magician.txt:146, F37), and a skill-tree node (trees/default.txt:847, id=132 seen in grep). The empyrean beacon uses 161 (F36). Fix: reference powers by key; reject duplicate or unknown ids at load time.
3. Resist patterns vary across the set with no named rule (see the counts above). Fix: three named pattern rows in one element table; each element file points at one pattern id.
4. Hand-set stats per file with no tier table; xp runs to large powers of two in the named tiers (lvl15 ancient wyvern xp=32768 at lvl15, lvl15_wyvern_ancient.txt:7; lvl16 Lezaith xp=262144, lvl16_lezaith.txt:7; the catalogue reports a possible typo in enemies/xp_scaling/il.txt, not verified by me). Fix: xp from the tier row, with an override only for named elites.
5. lvl13_zombie_miner.txt has no base INCLUDE and is a full standalone file (one of 3 top-level files with no INCLUDE; the other two are catacomb boulders). Fix: give it a base or mark it as a set piece.

## 5. Five-minute look test
Build one flying or walking base in the existing fight scene, behind a look flag, with three looks from one body: plain, warm (fire) and cold (ice). Each look gets its own projectile: an orange bolt, and a blue bolt that leaves a short slow ring. Play the 8-frame idle at 800 ms. Publish to the /preview/ folder with no release rows. Dom checks on his phone at 375 wide with the fight camera: can he name the element in under one second without the HUD, and do the three read as one family? Compare with the current catalogue creature.

## 6. Licence and IP
Art and data are CC-BY-SA 3.0 (README:21; F42). ShareAlike means copying the sheets, the stat values or the file layout into Frankendom would carry share-alike terms, so the inspiration stays category-level: a winged body with two element overlays and one element bolt. No sheet, no value and no name is reused. Audio is unclear (CREDITS.txt:104, F43), so no sound is reused. The engine is GPL v3 or later (README:19, F44); engine code is not used. Recreate as an original: keep the layering and the element overlay, change the body plan, the palette, the bolt and every number.

## 7. Gaps
- Not read: any PNG (sizes and frame boxes from text only, no colour, no silhouette judged), any audio, the flareteam-flare-engine half (AI and power resolution), the scripts folder (scripts/powers/goblin_steal.txt), loot tables and loot animations (only the loot references), locale files, the zone spawn blocks and the walk density.
- Catalogue-reported and not re-verified in this pass: 745 enemy placement blocks over 56 maps; a probable xp typo in enemies/xp_scaling/il.txt (line 17, per the catalogue). In this pass I counted 8 top-level files with defeat_status.
- Half read: data only (mods/*). Paired engine half named (flareteam-flare-engine). Server half: none in the box.
- Where seen: idle is the 8-frame stance loop (wyvern_fire anim); death is the same sound for normal and critical on wyverns, a separate critical sound on the minotaur (minotaur.txt:9; F30, F31); loot ceremony not read beyond the loot file reference (loot=loot/level_7.txt, lvl7_wyvern_fire.txt:31); walk density not measured here; readability at 375 wide not checked.
