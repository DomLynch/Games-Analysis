# DCurrent-openbor (boss-staging, FEEL note)

Donor: /mnt/frankendom-donors/DCurrent-openbor (engine code under engine/)
Licence: the LICENSE file (top level, lines 1, 5 and 11) reads as BSD-style: three conditions, copyright 2003 Roel van Mastbergen and Senile Team, with OpenBOR Team on 2004. The donor library matrix (/mnt/frankendom-donors/_donor-library/matrix.tsv, row DCurrent-openbor) says UNCLEAR. Per the rule, it is shape only: no code, no donor numbers.

Checked: engine/openbor.c (checkdeath, kill_all_enemies, drop_driver, biker_takedamage, common_fall, update loop, spawn and music, HUD draw, victory pose), engine/openbor.h (slow-motion enum), engine/openborscript.c and engine/source/openborscript/level.c and commands.c (boss properties and level commands, grep plus a few lines), engine/translation.txt (360 lines, 0 "boss" strings). Half read: client (the engine). The game content packs are not in the box: no levels, no boss scripts, no models. Depth: thin, because boss AI, boss entrance and phase scripts live in content that is not here. The engine staging code is read in full.

## 1. What the player sees and feels

A boss comes in with its own music track, which takes over from the level music on spawn. While it lives, a status panel sits over the scene for any entity with a HUD popup defined: the boss's name, an icon that changes by state (idle, hurt, grabbed, dying), and a health graph. When the boss falls, the game slows right down for the death beat. The slow lasts until the boss hits the ground. Then every other live enemy on screen takes its remaining health as one hit, the level is marked complete, and any surviving player who is idle and grounded plays a victory pose. The death beat has a clear end: the landing.

## 2. Why it works / is striking

- Readable at 375 wide: the slow-motion ends on a visible event (the landing), so the player knows when the beat is over.
- One signature behaviour: the room is cleared the moment the last boss dies, so the boss death is the level's end, not a scatter of stragglers.
- One signature sound: the boss music switch on spawn, with an offset (sound content not read).
- Could be made ours at 20 to 30 percent resemblance: a boss death that slows until the body lands, clears the room, then gives a short victory pose.

## 3. The rule behind it

Order on a boss death, as read:

a) checkdeath (engine/openbor.c:36786). A boss-flagged target clears its flag and drops the boss count (openbor.c:36830 to 36832). When the count reaches zero and the target is an enemy: kill_all_enemies(), level_completed = 1, level_completed_defeating_boss set (openbor.c:36836 to 36838).

b) kill_all_enemies (openbor.c:47868). Each live enemy with a takedamage function takes its current health as one attack, typed ATK_BOSS_DEATH (openbor.c:47874, and the call at 47900).

c) Slow-motion. The loop runs slow while level_completed is set, boss_slow is on and tospeedup is off (openbor.c:51512). tospeedup is set in common_fall, the fall routine, when the boss is down and the level is complete (openbor.c:36072 to 36074). The comment at openbor.c:620 says it speeds the level back up "after a boss hits the ground". boss_slow defaults to on (openbor.c:24164) and a level command can turn it off (openbor.c:24523).

d) How slow. newtime is reset to 0 each pass (openbor.c:51504). It is set again only when the slow-motion counter equals its duration (openbor.c:51514, 51516), and the counter wraps at duration plus one (openbor.c:51525). The duration defaults to 2 (openbor.c:597). Reading it: at default settings the game logic steps on one loop pass in three. The on-screen ratio was not measured.

e) Victory. tryvictorypose (openbor.c:52964) needs a player that is not falling, not dead, not rising, idle and on its base height, then sets the victory animation and stops the player's movement. The gate check_victory_pose (openbor.c:52983) needs endgame bit 1 and level_completed_defeating_boss.

f) Boss spawn. A boss-flagged spawn starts the level's boss music with its offset (openbor.c:49627 to 49629). The spawn script increments the boss count (openborscript.c:12050 to 12053).

g) HUD panel. The per-frame draw checks each entity for a HUD popup (openbor.c:34103) and calls drawenemystatus (openbor.c:26865). It draws the name at a set position (openbor.c:26875), the icon by state (dead, pain, getting, default) and a health graph if the model has one.

h) Mount drop, a related rule. The mount's takedamage routine is biker_takedamage (openbor.c:49317). For an attack with no pain, it applies the damage first and returns early while the mount is still alive (openbor.c:49336 onward). Otherwise it goes on: it sets the mount to its crash think routine (openbor.c:49352), spawns its rider with drop_driver (openbor.c:49354), sets the rider to drop (openbor.c:49357), and hands the rider the same attack through its takedamage (openbor.c:49361). Then the mount's health goes to zero and checkdeath runs (openbor.c:49368). drop_driver takes the rider model from the mount's model data (openbor.c:36741), spawns it 10 units above the mount (openbor.c:36749), and copies the mount's name, item and colour. The comment at openbor.c:36732 says "dont takedamage", but the code does call takedamage on the rider. Trust the code, not the comment.

## 4. For Frankendom

- 700 zones as data: boss count per zone, boss music track, boss HUD name and icon set, and the slow-motion flag belong in zone data.
- Clear-the-room: kill_all_enemies is a server event. The clear-out should go through the same kill path as any kill, but be flagged as a cleared kill, so loot and XP rules can choose to count or skip it. This is a design decision, not in the donor.
- Slow-to-landing is presentation only. The server records the death at the death tick; the client stretches the animation until the landing. The server does not slow time.
- Victory pose and HUD panel are client-only.
- Many-vs-one: the donor has one boss per room in practice. For us, the boss count is per zone, and the clear-out should not fire until all bosses in the zone are down.
- Mount rule for dragons (MG011): when the mount's crash path runs, the rider is thrown with the same attack. For fast duels that gives a clean dismount on the mount's death. The code I read shows no dismount on a non-fatal hit.
- Keep: the landing as the end of the slow-motion; one boss count per zone; the victory pose gate; the HUD panel with name, icon and bar.
- Change: no slow-motion as a server rule. Use the ledger for the cleared kills, not a silent kill.

## 5. A 5-minute look test Dom can judge on his phone

Put it in /preview/ with no release rows. Two clips of the existing boss at 375 wide:
1. Boss death as today, the instant kill.
2. Boss death with a slow-motion until the landing, then a one-second hold on the victory pose, with the room's minions cleared at the landing.
Dom judges whether the landing makes a clear end and whether the victory pose reads at phone size.

## 6. Licence / IP

Shape only. The LICENSE file reads as BSD-style (LICENSE:5 and :11), but the donor library says UNCLEAR, so no code, no constants and no text are copied. Keep the ideas: boss death slows until landing, clears the room, victory pose after. Build our own timings.

## 7. Gaps

- Not read: content packs (no boss AI, entrance or phase scripts in the box), the sound files, the sprite layout for the HUD, the openbor tests folder (tests/test_invariant_borpak.c, not read).
- Half read: client (engine). The data pack is absent from the donor box.
- The grep for "boss" over engine .c and .h gives about 125 hits in all files, including non-boss matches. The boss death, spawn, HUD and slow-motion code is read. The rest is not.
- "White Dragon" in the source is a maintainer's handle in comments. It is not a dragon. No dragon creature code was found.
- Dragons and big creatures (MG011): no breath cones, no flight movement, no taming, no per-body-part armour found in engine code. "fly" in the code is obstacles flying when hit (openbor.c:49391 onward), not flight. Mounts are the only related rule (section 3h).
- Walk density, loot ceremony, idle and ambient behaviour, readability at 375 wide: not in this donor's engine code (not read).
- Asset audit and catalogue for this donor (batch3 AU* / DC* files): not present in batch3, not read.
