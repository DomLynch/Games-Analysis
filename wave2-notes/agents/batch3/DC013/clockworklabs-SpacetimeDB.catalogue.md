# clockworklabs-SpacetimeDB (catalogue, DC013)

Donor: /mnt/frankendom-donors/clockworklabs-SpacetimeDB/ (read over ssh, not copied)
Licence: demo/Blackholio is Apache License 2.0 (demo/Blackholio/LICENSE line 2 read). Repo LICENSE.txt is Business Source License 1.1 (taken from asset audit AU010, not re-read here).
Rule for every idea below: recreate as a clearly distinct original, never a copy. Mood and mechanism only, about 20-30 percent resemblance. Each idea names the trait KEPT and the trait CHANGED.

## What this donor is
A database engine with one small demo game (Blackholio: round bodies eat food pellets and smaller bodies, split and recombine). There is no creature roster, no classes, no weapons, no gear and no dungeons. The honest content is one arena and two entity kinds. The game's logic is all in one server file, which is the most useful part for Frankendom's tick and spawn rules.

## Halves read
- Server half: demo/Blackholio/server-rust/src/lib.rs (613 lines, read in full). demo/Blackholio/server-rust/src/math.rs (vector helpers; function list only, not read in full).
- Data pack: none in the box for this demo. The "data" is the constants block at the top of lib.rs (lines 16-29) and the init reducer (lines 128-148), which sets one config row and three timers.
- Client halves: client-godot (Circle2D.cs, StarfieldBackground.cs read in part), client-unity (EntityController.cs, CircleController.cs read in part), client-ts (EntityController.ts, CameraController.ts, math.ts read in part).
- Paired halves: server-csharp, server-cpp and server-ts hold the same game in other languages (folder names only, not read). client-unreal (folder name only, not read).

## 1. Creatures and bodies (counts: 2 kinds, 0 beasts)
Families (entity kinds in the server schema, lib.rs lines 37-73):
- Player body (circle): position, direction, speed, last split time, up to 16 per player (lib.rs line 24). Starts at mass 15 (lib.rs line 16, START_PLAYER_MASS).
- Food pellet: mass 2 to 4, target 600 on the map, refilled by a timer (lib.rs lines 20, 550).
No bosses, no elites, no AI bodies. Every body is a player. Abilities: move, split (the only "ability"), recombine.

Top striking (the list is short; each is a mechanic or a read, not a monster):
1. label: Split-and-rejoin body cluster. Why: one player becomes many bodies that pull back together, a readable many-from-one shape. Silhouette at 375 wide: a loose ring of discs. Signature behaviour: bodies gravitate for the last 2 seconds before rejoin (lib.rs line 362). Keep: split cap, half-mass split, pull ramp before merge, 5 second delay (lines 24-25, 506-507). Change: the bodies become attack-capable shards with a short life; merge is a fight beat with hit-stop, not a mass add. ref: lib.rs 24, 25, 362, 384, 495-520, 596-607.
2. label: Heavy slow body. Why: size makes you slower, a clear weight read. Keep: speed falls with the square root of mass (lib.rs line 309). Change: use our weight class table, not the raw formula. ref: lib.rs 308-309.
3. label: Pulsing pellet. Why: small pickups pulse faster than large bodies (5.0 against 2.2 rate), so size reads at a glance. Keep: pulse rate tiers by size. Change: pulse ties to loot rarity, not size. ref: client-godot/Circle2D.cs lines 68, 88.
4. label: Wobbling outline. Why: a seven-lobe sine wobble on the rim makes a still shape look alive. Keep: low-amplitude rim wobble. Change: lobe count and amplitude are ours. ref: client-godot/Circle2D.cs line 78.
5. label: Decaying giant. Why: big bodies lose 1 percent of mass every 5 seconds down to the base mass, a quiet pressure to keep moving. Keep: the floor (no decay at or below base) and the slow timer. Change: apply to a meter we own (stamina or focus), keep float state so the integer cast does not truncate. ref: lib.rs lines 137, 571-582.

Not built in the donor (TODO list, lib.rs line 12): viruses, ejecting mass and a leaderboard are unchecked. Do not copy plans that are not in code.

## 2. Classes, races, factions
None. One role only (player body). Progression shape: none. Respawn returns the player to the start mass in a random spot (lib.rs lines 210-218, 242-254). The death screen is client-side (client-ts/src/ui/DeathScreen.ts, not read).

## 3. Weapons
None. Attack-like effect: none. Contact rule instead: a body eats another only if the other is below 85 percent of its mass and its centre is inside the bigger radius (lib.rs lines 21, 300-301, 426-427).

## 4. Armour and gear
None. Gear sets: 0. Tiers: none. Only a mass number.

## 5. Zones and dungeons (counts: 1 zone)
- One open square arena, world size 1000 (lib.rs line 133). Border and backdrop are client art (ArenaBorderMaterial in the Unity assets listed in AU010, not read).
- Dungeon archetypes: none. Hazards: none except bigger bodies.
Top striking:
1. Layered starfield arena: low-alpha nebula discs plus twinkling stars give depth on a flat square (client-godot/StarfieldBackground.cs lines 30, 36). Keep: three soft discs and per-star twinkle. Change: our palette and fight-arena framing.
2. Timed refill: pickups are topped up to a target count every 500 ms (lib.rs lines 141, 550). Keep: target-count refill on a short timer. Change: zone data field (cap, chance, respawn seconds, grace) per row 23.
3. Camera breathes with mass: zoom-out is capped (client-ts/src/game/math.ts lines 18-19, CameraController.ts line 32). Keep: capped zoom-out. Change: tie the cap to our weight and combo count.
(Zones 4 and 5 not found in this donor.)

## 6. Item and effect looks worth recreating (no colour codes)
- Layered halo disc: outer halo at low alpha, body disc, inner core, offset highlight; halo radius pulses. (client-godot/Circle2D.cs lines 68-72.) Technique: draw order and alpha, not textures.
- Consumed pickup slides into the eater and shrinks to zero in 0.2 s, with a draw-order bump so it renders above the eater (client-unity/Assets/Scripts/EntityController.cs lines 52-60; client-ts/src/game/EntityController.ts lines 48-56). Technique: tween toward the target, scale to zero, then destroy. Good for loot pickups.
- Position interpolation over 100 ms between server updates (client-ts/src/game/EntityController.ts lines 5, 64; client-unity EntityController.cs line 11). Technique: lerp to last server position.
- Palette chosen by player index (client-unity/Assets/Scripts/CircleController.cs lines 9, 35). Technique: index mod palette length. Values not copied.
- Silhouette wobble on the rim (client-godot/Circle2D.cs lines 74-82). Technique: polyline of about 72 points with sine offset.

## 7. Inspiration for Frankendom (originals, not copies)
1. Mirror Shards (hero ability). Keep: a time-limited split into a few bodies, half strength each, that pull back together in the last two seconds before the end. Change: shards attack, cap at 3, the merge is a fight beat with hit-stop; server-verified like any engage. Rows: 4 (fight loop) and 9 (finishers ceremony).
2. Heavy Tide (elite). Keep: weight slows movement by a square-root curve, and a smaller minion is only absorbed when the ratio is below 0.85. Change: absorbing a fallen minion heals or grows reach; no player bodies are absorbed. Rows: 7 (creature actor) and 18 (loot and XP).
3. Ember Motes (loot pickups). Keep: pulse faster when small, slide into the collector over 0.2 s with a draw-order bump. Change: rarity sets colour and sound per tier (see the loot ruling for the phone inspect flow). Rows: 18 and 12.
4. Fading Focus (pressure meter). Keep: a slow timed decay that stops at a floor. Change: the meter is hero focus, decays 1 percent every 5 s above a base, kept as float. Rows: 3 (stamina) and 14 (HUD).
5. Breathing Camera. Keep: zoom-out capped by mass and by extra bodies. Change: cap tied to hero weight class and combo, eased per second. Row: 11 (fight camera).
6. Shore Arena (zone). Keep: one bounded arena, layered starfield backdrop, arena border. Change: a fight arena with a corner hazard instead of open food. Row: 23 (zone population, arena as a zone data record).

Reuse tag: donor-idea (Apache demo, mood and mechanism only; no code copied).

## Not read
- server-csharp, server-cpp, server-ts, client-unreal (folder names only).
- client-ts: BlackholioScene.ts, input.ts, leaderboard.ts, GameManager.ts, PlayerController.ts, DeathScreen.ts, StatusHud.ts (names only).
- client-godot: GameManager.cs, Instantiator.cs, CameraController.cs, PlayerController.cs, module bindings.
- server-rust/src/math.rs body (names only).
- crates/ (the database engine). It is not game content and was out of scope.
- Art files and shaders (covered in AU010, not re-read).

## Receipts
clockworklabs-SpacetimeDB.receipts.tsv (38 rows). Verified with verify_receipts.py: receipts ok 38, failed 0. The check proves each quote is on its line; the claims above were read from the surrounding code.

## Unverified or caveats
- The "2 kinds" count is my reading of the server schema, not a runtime test.
- The Blackholio demo has never been run here.
- Client-side speeds and tween durations are read from source only.
