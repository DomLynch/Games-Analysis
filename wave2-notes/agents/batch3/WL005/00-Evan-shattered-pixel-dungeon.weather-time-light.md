# Shattered Pixel Dungeon (weather-time-light, feel note, WL005)

Donor/Licence: 00-Evan-shattered-pixel-dungeon, GPL-3 (donor LICENSE.txt header read: GNU GPL v3). Shape only. No code, strings or art are carried over. Library matrix agrees (GPL-3, Java).

Checked: scenes/SurfaceScene.java (create(): day flag, sky, stars, clouds, grass, avatar, night frame, music call; Sky and Cloud classes), actors/buffs/Light.java (whole file), items/Torch.java, Dungeon.java (lines ~496-510 hero sight restore, ~895-935 observe), levels/Level.java (158, 250-280 level feelings, 445-460 restore), levels/HallsLevel.java (60-70), actors/blobs/Blob.java (evolve and act, 111-200), Blizzard.java, StormCloud.java, items/potions/exotic/PotionOfStormClouds.java, items/potions/brews/BlizzardBrew.java (seed lines), items/trinkets/ChaoticCenser.java (163-175, 316-330), actors/Actor.java (TICK), Challenges.java (DARKNESS), messages actors.properties (blob and light keys, grep). Confidence: high on the code facts quoted; a weather cycle was searched for and not found. Not read in full: tile lighting in tilemap classes (grep only), Sky gradient values (not recorded here on purpose).

Half read: both halves are the same codebase. This is an offline single-player Java game, so there is no server half in the box. I read the game logic and the client scene code (core/src/main/java), plus the string table by grep. Weather as such does not exist in the code: a text search for weather, rain, snow, storm, fog, dusk and dawn found only the gas blobs and the surface sky.

## 1. What the player sees and feels
On the surface camp scene the sky is a tall two-tone gradient with the hero standing in a framed window. In daylight the clouds drift to the right, grass patches are bright and the hero and pet are brightened. At night the sky goes deep blue, a field of about 100 white stars fades toward the horizon, the clouds drift to the left, the grass dims and the frame takes a cold tint. In the dungeon, "light" is a sight number: a torch lights you up (one turn, a burning sound, a flame burst) and holds sight at least 6 for 250 turns, dark levels cut sight to five eighths, and deeper Halls levels shrink sight by depth. At 375 wide the fog edge is the thing you read, so sight is the real weather.

## 2. Why it works / is striking
- Readable at 375: the surface window is a small fixed frame (the sky sprite area is 80 by 112 with an 88 by 125 frame), so the whole time cue fits one glance. The cloud direction flip is the single fastest time signal in the scene.
- One signature behaviour: the drift reversal (clouds move with the sky's day sign). One signature sound: the torch lighting (a burning sound and a flame emitter) is the only sound tied to light I found; no night music exists (the surface plays the same two theme tracks at any hour).
- Could be made ours at 20-30 percent resemblance: yes. A palette and drift flip for a zone "dusk/night" state, plus a torch that floors sight, is a small, cheap, checkable change.

## 3. The rule behind it
Day/night (surface scene only): the day flag is the device local hour in the closed range 8 to 19. Night draws the stars, and each cloud's drift speed is its scale times a base, with sign set by the day flag. Grass brightness is a day and night pair per row.

Sight (dungeon): hero sight starts from the level value. The level value is 8 normally and 2 under the Darkness challenge. A dark level feeling multiplies it by 5/8 (rounded), and the same rule runs again when a level is restored. Halls levels cap it at 26 minus depth. A torch adds a Light buff for 250 turns that floors hero sight at max(level sight, 6); removing it restores level sight. Six monster classes (Scorpio, Eye, RipperDemon, YogFist, Succubus and a YogDzewa phase) use the same 6 as their own sight.

Gas fields (weather-like hazards, same code path): each blob cell on each step becomes the integer average of itself and its four orthogonal non-solid neighbours, minus 1, and 0 when the sum is below the count (Blob.java evolve, about 150-190). A potion seeds 120 in each non-solid cell of the eight surrounding cells; the centre gets 120 plus 120 for each solid neighbour (BlizzardBrew shatter, 50-59). Interaction order inside one cell is fixed: a blizzard clears fire and frost first, then if inferno is present it clears inferno and stops; otherwise it freezes the cell twice. A storm sets the cell to water, clears fire, and damages fiery creatures by 1 plus the scaling depth divided by 5.

Data fields (designer-tunable; donor values null because GPL-3):
- day_start_hour, unit: local hour, value 8, inclusive
- day_end_hour, unit: local hour, value 19, inclusive
- star_count, unit: count, value 100 (read as a constant)
- cloud_count, unit: count, value 5
- cloud_drift_base, unit: scene speed units, value 8 (sign by day)
- grass_brightness_back_day / back_night, unit: multiplier, values 0.7 / 0.4
- grass_brightness_front_day / front_night, unit: multiplier, values 1.0 / 0.8
- hero_brightness_day, unit: multiplier, value 1.2
- sight_default, unit: tiles, value 8
- sight_darkness_challenge, unit: tiles, value 2
- sight_dark_feeling_num / den, unit: ratio, values 5 / 8
- sight_halls_cap, unit: tiles, formula 26 - depth
- light_turns, unit: turns, value 250
- light_sight_floor, unit: tiles, value 6
- blob_seed_per_open_neighbour, unit: volume, value 120 (eight neighbours; centre adds 120 per solid neighbour)
- blob_decay_per_step, unit: volume, value 1
- storm_fiery_damage, unit: hp, formula 1 + scalingDepth/5

## 4. For Frankendom
- 700 zones as data: each zone gets a time_mode field (none, or server-clock day window). The palette and drift flip is client presentation only and reads a server flag, never the device clock. The device clock in the donor is the thing to change.
- Sight is engine data, not a client effect: sight is a per-character number in src/fight, with floors (torch-like buff floor of 6) and ratios (dark zone 5/8) and depth caps read from zone data. The client draws the fog edge from that number.
- Many-vs-one: sight decides when you see the three attackers. At 2 (dark zone) you are surprised; at 6 the three are seen approaching. Keep max 3 attackers visible at the fog edge.
- Keep: sight as floor with reset on expiry, dark-feeling ratio, depth cap, sign-flip cue, star field fading to the horizon, and the cell-level fixed-order interaction for hazards.
- Change: turns become server ticks; the hazard field is a per-arena grid only (not per zone) to respect the per-tick budget (parity row 18); no device clock anywhere.

## 5. Five-minute look test (Dom, phone)
Build a stub zone with three sight values (8, 5, 2) and a torch floor (2 to 6). Place three attackers at 4, 6 and 8 cells. Take three stills at 375 wide and one day and one night sky (server flag, not device clock). Dom picks the still where he can react in time. Target file: src/fight/sight.ts (new, sight number and floors, read by the fight loop). Parity row: 4 (fight loop: aggro, chase, leash), since aggro is what sight drives.

## 6. Licence and IP
GPL-3 code. Clean-room: keep the shape (fixed-order cell interaction, sight floor with reset, ratio for dark feeling, sign flip for time). Do not copy the sky gradient values, the sprites or the message text. Recreate a distinct palette and a distinct torch name.

## 7. Gaps
- Not read: tile lighting shader and tilemap classes (grep only), where SurfaceScene is entered (death or exit path), loot reveal, walk density (what appears every 20 seconds), idle animation of creatures beyond the surface scene.
- Not in the half read: nothing server-side (no server in the box).
- Half read: client and logic in one codebase. Unverified: exact numeric units of Noosa cloud speed (px/s assumed).
- Explored-map reveal ignores low sight: `Dungeon.observe` marks cells out to max(hero view distance, 8) (Dungeon.java 898), so the Darkness challenge shrinks the field of view but not the remembered-map radius.
- The Rankings and rats (Ratmogrify) details on the surface are seen but not traced.

Best transferable idea: a single sight number, floored by a timed light buff and scaled by zone darkness and depth, lets the fog edge carry the mood without a lighting pass.

Verdict: STRONG (read the code; mechanism is small and self-contained; not a combat game, judged on the idea).
Decision: adapt (idea), with the device clock removed.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: (1) Blizzard order: note says 'clears fire first, then if inferno...'; real Blizzard.evolve (31-60ish) clears fire AND freezing first, then inferno check, then Freezing.freeze twice. (2) Seeding: note says '120 per open neighbour'; real PotionOfStormClouds/BlizzardBrew: 120 per non-solid 8-neighbour, centre gets 120 plus 120 for each solid neighbour (lines 50-59). (3) Storm damage uses Dungeon.scalingDepth()/5 not depth. (4) Blob.evolve averages over itself and 4 orthogonal non-solid neighbours with integer division and 'sum>=count ? sum/count-1 : 0' (Blob.java ~150-175); note says 'open neighbours' without 4-vs-8 or integer division. Verified OK: day hour 8..19 (SurfaceScene 120), NSTARS 100, NCLOUDS 5, cloud speed +-8 by day, grass 0.7/0.4 and 1.0/0.8, hero 1.2, frame hardlight 0xDDEEFF night, sky 80x112 frame 88x125, Light DURATION 250 DISTANCE 6 attach/detach, Dungeon 506, Level 158 (8/2), 274 and 455 (5/8), HallsLevel 66 (26-depth), six mob classes with Light.DISTANCE, Torch 1 turn+BURNING sound+FlameParticle, music two themes, GPL-3 LICENSE.txt.
Missed: Dungeon.observe() (Dungeon.java:898) marks visited cells with distance max(hero.viewDistance,8) (plus FARSIGHT), so the visible-memory radius is never below 8 even at sight 2; the note's 'at 2 you are surprised' is about FOV, fine, but the Darkness challenge does not shrink the explored-map reveal. Not a major miss.

Fixed 2026-10-12 (Sonnet fixer): gas rule corrected (4 orthogonal neighbours, integer average, sum < count gives 0; seeding is 8-neighbour with solid cells adding to the centre; blizzard clears frost as well as fire; storm damage uses scaling depth). Also found: observe radius is at least 8. All verified over ssh.
