# Top 50 learnings, final (reviewed by Strategy and Lead, 2026-10-12)
Phone version. Build lanes are HELD by Dom. Order of record for builds: Lead's dependency order (clock and sleep, zone lookup, camp seed, spawn; writer limit, stack-first, loot plan, one-step moves, reward claim). Draft with donors and tags: TOP-50-LEARNINGS-2026-10-12.md.

## Do now (1-10)
1. If the server falls behind, it drops the backlog instead of bursting.
   No sudden stalls or speed-ups for everyone.
2. A new boss, weapon, finisher, spell or zone is one data row, never a code change.
   Content ships daily without a release risk.
3. The camera sits over the shoulder and pulls in before walls.
   You can always see your hero.
4. Zones nobody is in go to sleep; far creatures get checked rarely.
   700 zones cost almost nothing until players arrive.
5. Content is checked when it loads, with named reasons for any refusal.
   Bad zone data never reaches players.
6. "Which zone am I in" comes from the zone rows, not a short fixed list.
   Every one of the 700 zones can actually run.
7. Each camp has its own seed, and each system its own random stream.
   One camp can be rebuilt alone and fights replay exactly.
8. Each zone refills its own creatures, one at a time, out of sight.
   Zones feel alive and nothing pops up in your face.
9. Actions are limited per account, and a refusal changes nothing.
   Phone users on shared networks are not punished for others.
10. A matching stack tops up before it needs a new slot.
   Fewer "pack full" refusals.

## Next (11-20)
11. One budget for effects, one picture-cost ceiling, one quality ladder.
   The game stays smooth on weaker phones.
12. Loot is worked out first: what fits goes in, the rest stays claimable.
   A full pack never eats your take-one pick.
13. Every item or metal move is checked in full, then done in one step.
   No lost items and no duplicated loot.
14. A quest reward pays once, only if the bag has room, all or nothing.
   Finishing a quest always feels clean.
15. A hunting creature has moods: notice, chase, search, go home.
   Enemies chase you, give up, and reset instead of standing still.
16. Pursuit ends on a clock, and weak creatures run from a much stronger player.
   Fights end fairly instead of dragging across the map.
17. A creature sticks with its target unless another is clearly ahead.
   Enemies stop flickering between heroes.
18. Magic rides on the special-move rows: a spell names a template and its numbers.
   Dragons, necromancy, telepathy and persuasion arrive as rows, not new engines.
19. One world clock drives day, night and townsfolk daily routines.
   Towns look lived-in.
20. A zone row can name a parent and change only a few keys.
   700 zones are easier to author.

## Soon (21-30)
21. Shops buy back for less than they sell, and check room first.
   A clean first place to spend metal.
22. Swapping gear is one tap and puts the old piece back in the pack.
   No fiddly unequip steps.
23. The thumb stick ramps up smoothly, and a tap during recovery is not lost.
   Controls feel right on the phone.
24. Every zone move uses one path and lands you outside the trigger.
   Zones connect without stuck or exploitable doors.
25. Loot tables pay by rules, and weak or repeat victims pay less.
   Farming the easy stuff stops being the best plan.
26. Every screen is checked in Safari at the smallest phone landscape, not just Chrome.
   No layout break that only Apple phones see.
27. Heavy work in a fight (skinning, raycasts, shader builds) is warmed up or done once per frame.
   No stutter in the middle of a fight.
28. Teach one hint at a time, when it matters, and always allow skip.
   New players are guided, never lectured.
29. Always show what is next, and open town services one at a time.
   Players know their next goal after every fight.
30. Cap how many enemies attack at once; the rest wait their turn.
   Crowds stay fair and readable on a small screen.

## Later (31-40)
31. An enemy health bar shows only when targeted, hurt or hunting you.
   A clean screen with the useful bars.
32. The map fits the zone, shows a direction line, and reveals only what you know.
   You find the forge without getting lost.
33. Many hits on one target show as one clear reaction.
   Group fights stay readable.
34. Bosses show their next move, change at health steps, and cap helpers at three.
   Boss fights are tough but fair.
35. Elite and boss versions look like the base creature with clear extra cues.
   You read the danger at a glance.
36. Zones get names, signs, a short card and rumours from a seeded set.
   Each zone feels like a place.
37. Your own walking shows at once, and the server quietly corrects drift. Test first.
   Moving feels instant even on a bad signal.
38. A replay mismatch names the first moment that differs.
   Disputes and bugs get solved quickly.
39. Suspicious accounts are flagged for a person, never banned by a machine.
   Honest players are not banned by mistake.
40. Walking speed is limited by real elapsed time, warn first, then act. Test first.
   Speed hacks fail without punishing a laggy phone.

## Parked (41-50)
41. Chat has one gate: refused lines cost nothing, then a warning, then a timed mute.
   Chat stays calm from day one, and one report never silences anyone for good.
42. Who can hear whom is one gate: staff, block, privacy, friends only.
   Blocked really means blocked.
43. Barter trade closes if players move apart, and any change resets both confirms.
   Safe swaps with no scams and no lost items.
44. The server sends only what is near and what changed; slow phones get fewer updates.
   One slow phone cannot hurt the rest.
45. World events fire once, with the end time sent by the server.
   Banners and countdowns always agree.
46. A hit can pull the camp, with a cap; some camps ambush or patrol.
   Camps feel like groups, not statues.
47. A new kind of anything is a row in a registry; names, labels and looks live in rows, never as if-this-name branches.
   The game never needs a code change to grow.
48. One slot per status effect on a target; the stronger replaces the weaker.
   Status effects stay readable.
49. Widen the existing ranked ladder's match window the longer a player waits.
   Fair, fast matches.
50. In group fights, credit follows who really did the damage (waits for parties).
   Loot goes to people who earned it.

---
Changes applied 2026-10-12. Dropped (already built, per Lead's check of trunk 4dc0f8b1c): server replay before reward, one stun ladder, asset licence rows. Dropped (Strategy): chat report entry (folded into the chat gate), zone-run lifetime. Rewritten: replay mismatch names the first bad moment; shop buy-back; gear swap returns the old piece. Added: one data row for everything; magic as special-move rows; registry rows (merged with Lead's no-name-branches entry); Safari smallest-phone check; fight work warmed up. Compromise to know: Lead's build order puts camp seed and spawn in Do now, so the effects budget (Strategy asked for 8) is at 11.
