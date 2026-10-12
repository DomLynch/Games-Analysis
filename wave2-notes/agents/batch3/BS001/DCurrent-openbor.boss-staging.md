# DCurrent-openbor (boss-staging, FEEL note)

Donor: /mnt/frankendom-donors/DCurrent-openbor (engine code under engine/)
Licence: the LICENSE file (top level, lines 1, 5 and 11) reads as BSD-style: three conditions, copyright 2003 Roel van Mastbergen and Senile Team, with OpenBOR Team on 2004. The donor library matrix (/mnt/frankendom-donors/_donor-library/matrix.tsv, row DCurrent-openbor) says UNCLEAR. Per the rule, it is shape only: no code, no donor numbers.

Checked: engine/openbor.c (checkdeath, kill_all_enemies, drop_driver, biker_takedamage, common_fall, update loop, spawn and music, HUD draw, victory pose), engine/openbor.h (slow-motion enum), engine/openborscript.c and engine/source/openborscript/level.c and commands.c (boss properties and level commands, grep plus a few lines), engine/translation.txt (360 lines, 0 "boss" strings). Half read: client (the engine). The game content packs are not in the box: no levels, no boss scripts, no models. Depth: thin, because boss AI, boss entrance and phase scripts live in content that is not here. The engine staging code named above was read, but the end of the slow-motion was first read wrong (see section 3c and the checker findings).

## 1. What the player sees and feels

A boss comes in with its own music track, which takes over from the level music on spawn. While it lives, a status panel sits over the scene for any entity with a HUD popup defined: the boss's name, an icon that changes by state (idle, hurt, grabbed, dying), and a health graph. When the last boss is killed, every other live enemy on screen takes its remaining health as one hit at once, the level is marked complete, and the game slows right down. In the code as read, that slow has no landing release on the normal path: it lasts until the next level loads. Surviving players can then get a victory pose (see 3e for the odd gate).

## 2. Why it works / is striking

- The idea worth keeping (ours, not the donor's): a slow-motion that ends on a visible event, the landing. The donor intends this (comment at openbor.c:620) but, as read, does not deliver it.
- One signature behaviour: the room is cleared the moment the last boss dies, so the boss death is the level's end, not a scatter of stragglers.
- One signature sound: the boss music switch on spawn, with an offset (sound content not read).
- Could be made ours at 20 to 30 percent resemblance: a boss death that clears the room, slows until the body lands, then gives a short victory pose.

## 3. The rule behind it

Order on a boss death, as read:

a) checkdeath (engine/openbor.c:36786). A boss-flagged target clears its flag and drops the boss count (openbor.c:36830 to 36832). When the count reaches zero and the target is an enemy: kill_all_enemies(), level_completed = 1, level_completed_defeating_boss set (openbor.c:36836 to 36838).

b) kill_all_enemies (openbor.c:47868). Each live enemy with a takedamage function takes its current health as one attack, typed ATK_BOSS_DEATH (openbor.c:47874, and the call at 47900).

c) Slow-motion. The loop runs slow while level_completed is set, boss_slow is on and tospeedup is off (openbor.c:51512). tospeedup is set in common_fall only inside a check that the faller still has its boss flag and the level is complete (openbor.c:36072 to 36074). The comment at openbor.c:620 says it speeds the level back up "after a boss hits the ground". Verified problem: checkdeath clears the boss flag before the body ever falls (step a, openbor.c:36832) and runs at damage time, and level_completed is only set after that, so for the last boss the check cannot be true. tospeedup is otherwise reset only at level load (openbor.c:23917). Reading: the slow-down lasts to the end of the level, and the landing release is a donor defect (intent present, not working). Not play-tested, so this is a code reading. Our fix: end the slow on the landing event for real, driven by our own state. boss_slow defaults to on (openbor.c:24164) and a level command can turn it off (openbor.c:24523).

d) How slow. newtime is reset to 0 each pass (openbor.c:51504). It is set again only when the slow-motion counter equals its duration (openbor.c:51514, 51516), and the counter wraps at duration plus one (openbor.c:51525). The duration defaults to 2 (openbor.c:597). Reading it: at default settings the game logic steps on one loop pass in three. The on-screen ratio was not measured.

e) Victory. tryvictorypose (openbor.c:52964) needs a player that is not falling, not dead, not rising, idle, on its base height and, oddly, flagged in pain (the test is inpain AND NOT none, and none is zero, so any pain bit passes; openbor.h:331 to 334). That reads like a donor slip; we keep the idle-on-ground gate and drop the pain part. It then sets the victory animation and stops the player's movement. The gate check_victory_pose (openbor.c:52983) needs endgame bit 1 and level_completed_defeating_boss.

f) Boss spawn. A boss-flagged spawn starts the level's boss music with its offset (openbor.c:49627 to 49629). The boss count is first filled at level load from the level's boss command (openbor.c:24911 to 24912), and the spawn script also increments it (openborscript.c:12050 to 12053). A spawn skipped by player-count also decrements it (openbor.c:49530 to 49533).

g) HUD panel. The per-frame draw checks each entity for a HUD popup (openbor.c:34103) and calls drawenemystatus (openbor.c:26865). It draws the name at a set position (openbor.c:26875), the icon by state (dead, pain, getting, default) and a health graph if the model has one.

h) Mount drop, a related rule. The mount's takedamage routine is biker_takedamage (openbor.c:49317). For an attack with no pain, it applies the damage first and returns early while the mount is still alive (openbor.c:49336 onward). Otherwise it goes on: it sets the mount to its crash think routine (openbor.c:49352), spawns its rider with drop_driver (openbor.c:49354), sets the rider to drop (openbor.c:49357), and hands the rider the same attack through its takedamage (openbor.c:49361). Then the mount's health goes to zero and checkdeath runs (openbor.c:49368). drop_driver takes the rider model from the mount's model data (openbor.c:36741), spawns it 10 units above the mount (openbor.c:36749), and copies the mount's name, item and colour. The comment at openbor.c:36732 says "dont takedamage", but the code does call takedamage on the rider. Trust the code, not the comment.

## 4. For Frankendom

- 700 zones as data: boss count per zone, boss music track, boss HUD name and icon set, and the slow-motion flag belong in zone data.
- Clear-the-room: kill_all_enemies is a server event. The clear-out should go through the same kill path as any kill, but be flagged as a cleared kill, so loot and XP rules can choose to count or skip it. This is a design decision, not in the donor.
- Slow-to-landing is our idea, not working donor behaviour. It is presentation only. The server records the death at the death tick; the client stretches the animation until the landing. The server does not slow time.
- Victory pose and HUD panel are client-only.
- Many-vs-one: the donor has one boss per room in practice. For us, the boss count is per zone, and the clear-out should not fire until all bosses in the zone are down.
- Mount rule for dragons (MG011): when the mount's crash path runs, the rider is thrown with the same attack. For fast duels that gives a clean dismount on the mount's death. The code I read shows no dismount on a non-fatal hit.
- Keep: the landing as the end of the slow-motion (our own implementation); one boss count per zone; the victory pose gate (idle and grounded, without the pain quirk); the HUD panel with name, icon and bar.
- Change: no slow-motion as a server rule. Use the ledger for the cleared kills, not a silent kill.

## 5. A 5-minute look test Dom can judge on his phone

Put it in /preview/ with no release rows. Two clips of the existing boss at 375 wide:
1. Boss death as today, the instant kill.
2. Boss death with a slow-motion until the landing (our own timing, since the donor never releases it), then a one-second hold on the victory pose, with the room's minions cleared at the landing.
Dom judges whether the landing makes a clear end and whether the victory pose reads at phone size.

## 6. Licence / IP

Shape only. The LICENSE file reads as BSD-style (LICENSE:5 and :11), but the donor library says UNCLEAR, so no code, no constants and no text are copied. Keep the ideas: boss death slows until landing, clears the room, victory pose after. Build our own timings.

## 7. Gaps

- Not read: content packs (no boss AI, entrance or phase scripts in the box), the sound files, the sprite layout for the HUD, the openbor tests folder (tests/test_invariant_borpak.c, not read).
- Half read: client (engine). The data pack is absent from the donor box.
- The grep for "boss" over engine .c and .h gives about 125 hits in all files, including non-boss matches. The boss death, spawn, HUD and slow-motion code is read; common_fall's release of the slow was misread at first and is corrected in 3c. The rest is not.
- "White Dragon" in the source is a maintainer's handle in comments. It is not a dragon. No dragon creature code was found.
- Dragons and big creatures (MG011): no breath cones, no flight movement, no taming, no per-body-part armour found in engine code. "fly" in the code is obstacles flying when hit (openbor.c:49391 onward), not flight. Mounts are the only related rule (section 3h).
- Walk density, loot ceremony, idle and ambient behaviour, readability at 375 wide: not in this donor's engine code (not read).
- Asset audit and catalogue for this donor (batch3 AU* / DC* files): not present in batch3, not read.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: WRONG
Errors: Main claim 'slow-motion lasts until the boss hits the ground, tospeedup set in common_fall when boss is down and level complete (openbor.c:36072-36074)' does not hold on the normal path: the condition is `self->boss && level_completed`, but checkdeath clears the flag first (openbor.c:36832 `target_entity->boss = 0`) and checkdeath runs at damage time (39322, 49369, 49425), before common_fall (36043). level_completed is only set after boss==0, so the branch is effectively unreachable for the last boss; tospeedup is otherwise only reset at level load (23917). The 'landing ends the slow' beat and the look-test/Keep list built on it are unsupported. Also tryvictorypose (52964) requires `ent->inpain & ~IN_PAIN_NONE` (in pain) which the note omits while saying 'idle'; note's grep 'fly' etc not rechecked. Verified OK: checkdeath 36786/36830-36838, kill_all_enemies 47868/47874/47900, newtime 51504, slow cond 51512, counter wrap 51525, duration 2 (597), boss_slow default 24164, spawn music 49625-49629, boss count 12050-12053, HUD 34103/26865/26875, biker_takedamage order and drop_driver (+10, comment 'dont takedamage'), LICENSE BSD-style/three-clause.
Missed: Never noticed that boss flag is cleared before the fall; never checked whether the slow ever ends. Note's confidence 'engine staging code is read in full' is overstated.
Fixed 2026-10-12 (Sonnet fixer): verified over ssh that the boss flag is cleared at openbor.c:36832 before common_fall's check at 36072, so the landing release of the slow-motion never fires on the normal path (tospeedup reset only at 23917); rewrote intro, 3c, 3e, sections 2, 4, 5 and gaps to call the landing release our idea and a donor defect. Also found: tryvictorypose passes on any pain bit (inpain & ~IN_PAIN_NONE, none = 0), so the donor gate is a quirk, not 'idle'; boss count is also filled at level load (24911) and decremented on a player-count skip (49532).
