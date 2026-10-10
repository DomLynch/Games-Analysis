# Top 20 learnings so far (2026-10-09)
Marked (checked) = verified in the notes by the main session; the rest come from reader reports backed by quote-checked donor lines. The "apply" parts are suggestions.

1. (checked) Quake 2: knockback comes from its own value, not damage -> tune push-back separately.
2. (checked) Fallout 2: crits use two stats (chance, severity) -> two crit dials.
3. (checked) Forgotten Server: bell-curve rolls (normal_random 1..100) -> a weight of 10 is not 10%; choose the curve on purpose.
4. Teeworlds: one compact server damage function (knockback, friendly fire, halved self-damage, armour) -> template for row 1.
5. Mindustry: pierce shots lose damage per target -> natural limit for area/pierce specials.
6. AzerothCore: mob switches target only at 110% (melee) / 130% (ranged) of current threat -> stops target flicker in many-on-one.
7. RuneScape engine: throttled, range-limited target scan with filters then random pick -> cheap server aggro.
8. BrogueCE: flee at 1/4 HP, stay fleeing until 3/4, then re-engage -> no yo-yo at the flee line.
9. OpenDUNE: score every enemy, take the best -> base for the 3-attacker cap.
10. (checked) Quake 2: dropped items ignore the dropper for 1 s -> no instant re-grab.
11. Quake: death drops a backpack with weapon + ammo that vanishes after 120 s -> cheap tense death loot.
12. Angband: drop level = max(monster level, avg(monster level, depth)) -> rewards out-of-depth kills.
13. KeeperRL: kill XP scales with victim vs killer strength, clamped -> stops weak-enemy farming.
14. (checked) OpenRCT2: desync marks the connection, records the tick, closes; repair is separate -> simple safe fallback for server-verified kills.
15. ModernUO: 8 ms loop on a timer wheel that catches up missed ticks -> efficient cooldown/respawn timers.
16. OTClient: client-side walk prediction with a rollback timer -> instant feel, server stays in charge.
17. SuperTuxKart: catch-up spawner scaled by difficulty and struggling players -> adaptive zone spawns.
18. Doom: "Virtua Fighter in a 3D world" (Romero, secondhand via Wikipedia) -> keep duels fast and readable.
19. (checked) Across 124 games: save/load in 91, modding 82, netcode 72; cooking 8, farming 7, matchmaking 4 -> rare systems are chances to stand out.
20. (checked) The library itself: first notes ~48% right; a quoted donor line behind every claim fixed it -> use the same rule for anything lanes build from donors.
