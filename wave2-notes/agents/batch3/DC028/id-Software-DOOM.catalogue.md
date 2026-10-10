# id-Software-DOOM (design catalogue, DC028)

Donor tree: /mnt/frankendom-donors/id-Software-DOOM/ (read over ssh only, nothing copied or run). Engine tree: linuxdoom-1.10/.
Asset audit used first: AU025 (`/private/tmp/p2/wave2-haiku/batch3/AU025/id-Software-DOOM.assets.md`). Not repeated here.
Receipts: `receipts.tsv` in this folder (rows for this donor verified with verify_receipts.py). Numbers quoted from mobjinfo rows (health, pain chance, speed) were parsed with awk and are not receipted, because those lines hold tab-separated values.

**Half read:** engine data tables and the engine functions that use them (info.c/h, sounds.c/h, doomdef.h, d_items.c weapon table, and excerpts from p_enemy.c, p_inter.c, p_lights.c, p_spec.c, p_mobj.c, r_things.c). **Data pack:** the WAD (sprites, sounds, maps, textures) is not in the box. I checked the top level and linuxdoom-1.10/ with ls; no .wad file is there. Its pairing half is therefore absent from the box. Engine code is not paired with any other donor in the box.

**Licence (as the files say; they conflict):** LICENSE.TXT is GPL v2. README.TXT says the source is "released for your non-profit use". Source headers cite a "DOOM Source Code License" that is not in the tree. Copyright lines name id Software and, in README.TXT, ZeniMax Media. Class C: clean-room, shape only. No asset licence applies (no assets in box).

**Important limit:** no art, sound or map data. Looks are state-chain, flag and table level only.

## Counts
- creatures: 20 (18 kill-counted monsters that carry the COUNTKILL flag, plus the lost soul and the boss brain, which do not). Counted by parsing the flags field of the 137 mobjinfo rows (info.c:1106 on).
- classes: 1 (the player marine, MT_PLAYER). No classes or races.
- weapons: 9 (doomdef.h, NUMWEAPONS enum; weapon table in d_items.c:47).
- gear_sets: 2 armour tiers (green and blue). Six powerup kinds are listed separately.
- zones: 0 map zones (no level data in the box). Six sector special cases and four light-effect types are in code and listed in section 5.

## 1. Creatures and beasts
Object types: 137 in the mobjtype enum (info.h:1164-1300) and the mobjinfo table (info.c:1106 on). Families by name prefix and flags:
- **Light grunts** (hitscan or shotgun infantry; low health, high pain chance): POSSESSED, SHOTGUY, CHAINGUY, TROOP, WOLFSS.
- **Mid infantry** (150 to 300 health): SERGEANT, SHADOWS (fuzzy), UNDEAD (missile skeleton).
- **Floaters and heavies** (400 to 1000 health): HEAD (floating disc), PAIN (summoner), KNIGHT, BABY, FATSO, VILE (resurrector), BRUISER.
- **Bosses**: SPIDER (3000 health), CYBORG (4000 health), BOSSBRAIN (250 health, no kill count; its spit and target helpers are MT_BOSSSPIT and MT_BOSSTARGET, not creatures).
- **Specials**: SKULL (flaming flyer, no kill count), KEEN (100 health, kill-counted), barrel (explosive, 20 health).
- **Missiles and effects**: rocket, plasma, BFG, tracer, puff, blood, teleport fog. Not creatures.

Escalation: health goes from about 20 to 4000 across the grunt, mid, heavy and boss tiers (parsed; not receipted). Pain chance is per-monster and runs from 10 (VILE) to 256 (always flinches). See section 3.
Signature abilities (one line each): floaters fly without gravity; the resurrector scans for corpses ahead of its move; the summoner spawns flaming flyers; the shadow monster is fuzzy to aim; bosses have a low pain chance.

Top 8 (picked by name, flags and code; labels are my own):
1. **Floating eye disc** (MT_HEAD, info.c:1472, flags at 1494). Why: a sphere that floats and closes in, readable at 375 px. Keep: float with no gravity and a close-in approach. Change: our own shell, eye and silhouette.
2. **Ember skull dasher** (MT_SKULL, info.c:1576, flags at 1598; not kill-counted). Why: a flyer that rams. Keep: flying ram that is not a counted kill (a summoned minion). Change: our own look and ram path.
3. **Soul-spawner floater** (MT_PAIN, info.c:1680, flags at 1702). Why: a summoner that spawns minions. Keep: summon with a cap (section 3). Change: our look; fix the cap (section 3).
4. **Resurrector caster** (MT_VILE, info.c:1186, flags at 1208). Why: raises fallen allies, a strong many-on-one threat. Keep: corpse raise by scanning ahead of its move. Change: our look, timing, and a cooldown.
5. **Shadow stalker** (MT_SHADOWS, info.c:1446, flags at 1468). Why: a fuzzy target that makes ranged aim less accurate. Keep: fuzzy aim penalty. Change: our translucent shimmer and our jitter amount.
6. **Armoured colossus** (MT_CYBORG, info.c:1654, flags at 1676). Why: a boss with a rocket-style attack and a low pain chance. Keep: low flinch on a big body. Change: our own weapons and design.
7. **Multi-gun arachnid boss** (MT_SPIDER, info.c:1602, flags at 1624). Why: a 3000-health boss with a wide silhouette. Keep: heavy mass and slow lumber. Change: our design.
8. **Bone missile skeleton** (MT_UNDEAD, info.c:1238, flags at 1260). Why: a skeleton that fires a homing missile. Keep: homing missile type (the tracer object is MT_TRACER, info.c:1264, by name). Change: our skeleton look.

## 2. Player and weapon families
- Player: one marine (MT_PLAYER, info.c:1110-1131). Extreme-death branch (info.c:301).
- Weapons (9, doomdef.h:181-190): fist, pistol, shotgun, a second shotgun (SHT2 sprite family), chaingun, rocket launcher, chainsaw, plasma, BFG (the sprite-to-weapon names are by name; not every mapping was traced). Weapon table in d_items.c:47: each entry has up, down, ready, attack and flash states (the weapon chain). The fist chain (info.c:138-141) is ready, lower, raise and fire. Each weapon is one sprite family (sprnames, info.c:40-41).
- Readable at 375 px: each weapon is one sprite family, so the silhouette is per family (not checked on screen).
- Top 5 (name-based):
  1. **Plasma stream** (PLSG family). Keep: a fast fire chain with a flash state. Change: our look, rate and sound.
  2. **Rocket launcher** (MISG family). Keep: a slow single heavy shot. Change: our projectile.
  3. **Chainsaw** (SAWG family). Keep: a melee weapon with its own fire chain. Change: our design.
  4. **Double-barrel shotgun** (SHT2 family). Keep: a second shotgun state. Change: our sprite.
  5. **BFG** (BFGG family). Keep: a charged big shot. Change: our projectile and sound.

## 3. Behaviour (AI, pain, death) with reference
- **Wake on sight or any shot:** A_Look clears the threshold so any shot wakes the monster (p_enemy.c:604-608). Keep: any shot wakes it.
- **Pain chance on every hit:** a hit rolls P_Random against painchance (0 to 255); if it passes, the monster enters its pain state (p_inter.c:894). Values are per monster: VILE 10, CYBORG 20, BRUISER and KNIGHT 50, SPIDER 40, UNDEAD 100, TROOP and POSSESSED 200, KEEN and skull 256 (always). Parsed; not receipted. Keep: per-monster flinch rate. Change: our values.
- **Melee damage:** the trooper's melee does 3 to 24 damage ((P_Random()%8+1)*3, p_enemy.c:924).
- **Death chains:** the trooper's normal death is five frames (info.c:593-597). Its extreme death is eight frames (info.c:598-605). The raise chain steps back through the death frames 12 down to 8 (info.c:606-610). Keep: reverse-frame raise. Change: our frames.
- **Resurrector:** A_VileChase checks the corpse under its next step: it reads the position ahead (speed times direction), then scans the blockmap cells around it for corpses to raise (p_enemy.c:1167-1182).
- **Summoner (defect found):** A_PainAttack spawns a flaming flyer. Before spawning it scans every thinker to count skulls (p_enemy.c:1464-1475), and the check is `if (count > 20)` (p_enemy.c:1478). Because the check is greater-than, 21 skulls can exist. Fix: use `count >= 20` and a live counter instead of a full scan (keep the idea: summon only under a cap). A summon that is blocked by a wall is killed at once (p_enemy.c:1496-1499; keep this rule).
- **Death presentation:** a dying monster plays its chain and stays as a corpse (the corpse is the raise target in section 1). No respawn rule for monsters in this code path (not read).

## 4. Gear, pickups and tiers
- Armour (two tiers): green gives a pool of 100 and absorbs one third of incoming damage (type 1, p_inter.c:258, 857). Blue gives a pool of 200 and absorbs one half (type 2, p_inter.c:377, 857-859). When the pool runs out, the armour type is cleared (p_inter.c:861-866).
- Armour bonus: adds one point and caps at 200; gives green if no armour (p_inter.c:392-396).
- Powerups (six kinds): invulnerability, berserk (strength), invisibility, radiation suit (iron feet), computer map, light amplification (infrared) (p_inter.c:489-526). Each is a timed power in the player's power table.
- Sprite families for pickups: ARM1 and ARM2 (green and blue armour), BON1 and BON2 (bonuses), STIM and MEDI (health), SOUL and MEGA (health tiers), and the powerup prefixes (sprnames, info.c:40).
- Top 5 (name-based):
  1. **Blue armour** (ARM2). Why: a second armour tier with a bigger pool and a bigger absorb. Keep: tier by pool and absorb. Change: our tier values.
  2. **Megasphere** (MEGA family). Why: a top health tier by name (its effect code is not read). Keep: top tier idea. Change: our values.
  3. **Soul sphere** (SOUL). Why: a health pickup above the stimpack by name (effect code not read). Keep: a tiered health pickup. Change: our values.
  4. **Invisibility power** (pw_invisibility). Why: a timed stealth status. Keep: timed stealth. Change: our effect.
  5. **Radiation suit** (pw_ironfeet). Why: a timed status that changes hazard damage (section 5). Keep: suit that gates hazards. Change: our suit rules.

## 5. Zones (code only, no maps) and hazards
- **Sector specials** (p_spec.c:1009 on, P_PlayerInSpecialSector): six cases.
  - Hellslime (5): 10 damage every 32 tics, fully blocked by the iron-feet suit (p_spec.c:1025-1026).
  - Nukage (7): 5 damage every 32 tics, fully blocked by the suit (p_spec.c:1032-1033).
  - Super hellslime (16) falls through to strobe hurt (4): 20 damage every 32 tics. With a suit, a check still hurts when P_Random is under 5 (5 in 256) (p_spec.c:1043-1044).
  - Secret sector (9): counts a secret and clears the special.
  - Exit super-damage (11): 20 damage every 32 tics, and the level exits when health is 10 or less (E1M8 finale, per the comment).
  - The 32-tic cadence is `leveltime & 0x1f` (about 0.9 s at 35 tics per second; TICRATE is at doomdef.h:122).
  - Keep: a periodic floor tick gated by a suit. Change: our numbers and cadence per zone.
- **Light effects** (p_lights.c, p_spec.h:176-179): fire flicker (4-tic steps, random darkening up to 48), light flash (random on and off phases), strobe (bright 5 tics, dark 15 or 35 tics), glow (8 light units per tic, GLOWSPEED). Keep: four light modes as zone data. Change: our palette and rates.
- **Defect (light flash):** `flash->count = (P_Random()&flash->maxtime)+1;` with maxtime 64 (p_lights.c:111, 140). Mask 64 has one bit, so the lit phase is 1 or 65 tics, not a range. Fix: use mask 63 for 1 to 64 tics, or a plain range. Keep the idea of random phases.
- **Door, lift and crusher code** (p_doors.c, p_plats.c, p_ceilng.c): not read.

## 6. Looks worth recreating (technique, reference)
- **Full-bright frame:** a frame flag (32768) draws the sprite unlit (info.c:229 for the puff; r_things.c:588). Technique: an emissive first frame for impacts and muzzle flashes.
- **Fuzz (shadow monster):** MF_SHADOW draws a fuzzy, translucent sprite (info.c:1468; r_things.c:578) and jitters aim (p_mobj.c:909, inside P_SpawnMissile at p_mobj.c:889). The jitter is `(P_Random()-P_Random())<<20`, which is about 22 degrees at most (2^20 of a 2^32 circle, times 255). Technique: a shimmer shader plus an aim penalty.
- **Colour translation:** sprites drawn with a palette translation table (r_things.c:417-421). Technique: one sprite, many colour variants of a monster.
- **Blood and puff chains:** blood is three frames at 8 tics each (info.c:226-228); the puff is a short chain with the full-bright first frame (info.c:229-231). Technique: a short, cheap state chain per effect.
- **Weapon chain:** ready, lower, raise, fire, plus flash frames (info.c:138-141; d_items.c:47). Technique: four-state weapon animation with a separate flash sprite.
- **Hit feedback:** a hit that passes painchance switches to the pain state (p_inter.c:894-900). Technique: a flinch on a random roll, not on every hit.

## 7. Sound (table only; the mixer is not read)
- S_sfx table: 176 entries including a dummy at index 0 (sounds.c:114 on; the first real entry is at line 119). Each entry has a name, a singularity flag, a numeric priority, a link, pitch, volume and data (sounds.h:40-41 gives the priority field). Example: pistol priority 64 (sounds.c:119).
- The mixer reads priority (s_sound.c:286-298), but the lines between are not read.
- Keep: a priority number per cue, so loud cues win when many play at once. Change: our cue set and numbers.

## 8. Inspiration for Frankendom (originals; recreate as distinct, never a copy)
1. **Corpse raiser that walks the field.** Keep: scan ahead of the move for corpses within a bounded radius, and raise one. Change: our look, timing, cooldown. Fix the scan to a bounded cell radius. Ref: p_enemy.c:1167-1182.
2. **Capped summoner.** Keep: summon only under a cap, and kill a summon that spawns inside a wall. Change: our look and numbers. Fix: a live counter with `>=`. Ref: p_enemy.c:1464-1499.
3. **Fuzzy-target stalker.** Keep: an aim penalty for shadow targets. Change: our shimmer and jitter (for example 8 degrees, not 22). Ref: p_mobj.c:909; r_things.c:578.
4. **Per-monster flinch rate.** Keep: each monster has its own pain chance, bosses flinch least. Change: our values. Ref: p_inter.c:894.
5. **Reverse-frame raise.** Keep: a raise chain that plays the death frames backwards. Change: our frames. Ref: info.c:598-606.
6. **Suit-gated hazard tick.** Keep: a floor tick every 32 tics that a suit can block. Change: our numbers and suit name. Ref: p_spec.c:1025-1044.
7. **Armour pool with an absorb fraction.** Keep: a pool that absorbs one third (light) or one half (heavy) until it runs out. Change: our values. Ref: p_inter.c:258, 857-866.
8. **Light modes as zone data.** Keep: flicker, flash, strobe and glow as data on a zone. Change: our palette and rates; fix the flash mask. Ref: p_lights.c:98-160, 314-340.
9. **Priority-tagged cues.** Keep: a priority number per sound cue. Change: our cue set. Ref: sounds.c:119; sounds.h:41.

## Fold-ins by topic (Strategy)
- sound-music: priority per cue (section 7). Layering and ambience beds are not in the box.
- loot and gear: armour pools and absorb fractions, powerup kinds (section 4).
- spawns and encounters: summon cap and defect (section 3). Walk density (what appears every 20 seconds) needs map data, which is absent.
- idle and ambient animation: the trooper look loop and flinch (info.c, around line 578-586). Not receipted.
- death and respawn presentation: death chains, raise chain, corpse raise (section 3).
- readability at 375 px: not checked (no art in box).

## Not read
- WAD, sprites, sounds, maps (absent from the box).
- d_englsh.h and dstrings.h text (counts only: 286 and 5 #define lines, from AU025).
- Monster AI beyond the functions named above (p_enemy.c beyond the listed lines), p_pspr.c, st_stuff.c, hu_stuff.c, r_* beyond r_things.c lines, s_sound.c beyond the priority lines, p_doors.c, p_plats.c, p_ceilng.c.
- sndserv/, ipx/, sersrc/ (network and sound server; names only).
- The DOOM Source Code License text (not in the box; not searched for).
