# Rulings for Dom, 2026-10-12

| Block | Decisions | Note |
|---|---|---|
| Urgent this week | 45 | Most important: U1, who pays the market fee (recommend the seller) |
| Soon | 79 | Skills, spells, enemy AI, chat, quests, replay |
| Parked | 16 | Zone generation, healer resurrect, companions |
| Design-brief questions | 15 | 12 are accept-in-one-yes; 3 are not the brief's call (B1 launch target, B2 kids/age, B3 test box) |
| Licences | 3 | L3 TRELLIS.2 / nvdiffrast is pending Dom |

## FOR DOM: only these 19 are yours (Strategy ruled the other 139). Say "accept all" or name changes.

- **B1. [NOT the brief's call: launch target. Dom confirms.]** How many players do we plan for on launch day? Strategy recommends planning for 1,000 at once, and buying hosts for 10,000 only when the test shows 80 percent of one host used. [server-performance-scaling #1]
- **B2. [NOT the brief's call: kids/age rule. Dom decides, legal.]** Do children play? If yes we need an age rule and the specs have none. The brief suggests no analytics beyond anonymous counts for anyone, but that is not the brief's to recommend. [analytics-telemetry #2]
- **B13. Keep 90-day retention of analytics?** Accept: yes, same as duel metrics. [analytics-telemetry #3]
- **B14. Who gets alerts?** Accept: one daily summary to Dom; a page only for "server down". [analytics-telemetry #4]
- **L3. TRELLIS.2 uses nvdiffrast (NVIDIA non-commercial), which blocks shipping TRELLIS.2 output.** Pending Dom. Strategy raises this with Dom and recommends TRELLIS.2 for look-development and prototypes only; before any paid launch either swap the rasterizer or re-make the shipped assets another way. [character-build-recipe]
- **S10. How strong are ranks?** Four ranks at 100 / 150 / 175 / 200 percent power, tuned in playtests; the stronger OpenRA numbers are the alternative for fast duels. [freeciv SK014, OpenRA SK014]
- **S39. Do hunters remember a target for a time after losing sight, by creature tier?** Yes; Dom picks the values. [Crawl AI002]
- **S41. Do enemies flee from a much stronger player?** Yes; Dom sets the strength gap (do not use the donor's 25). [Angband AI002]
- **S43. How long may a cornered afraid creature stay frozen?** A capped number of turns, about 10; Dom sets it. [Angband AI002]
- **S50. Can a report set a mute length?** No. Reports add to a count; a moderator picks 10 min / 1 h / 24 h / 7 d (gag choices 5, 30, 60 minutes); one report never means a permanent mute. [rAthena CT004, ACE CT005, Open-RSC CT005]
- **S52. A short chat delay for brand-new characters?** Yes, 30 minutes for zone and world chat only; party, guild and whisper work at once. [AzerothCore CT004]
- **S68. Keep every PvP fight (random seed, inputs, rule version) so any fight can be replayed?** Yes, including guest fights, and how long to keep them is your call. [OpenBW, OpenRA DT001; Hedgewars, Showdown DT002; Return to the Roots DT003]
- **U1. Who pays the market fee, the seller or the buyer?** Seller: a cut taken from the seller, because then the price a buyer sees is the price they pay. [OpenDAoC TR005; the donor charges the buyer]
- **U2. Should a direct player-to-player trade carry any fee?** No fee on trades; fees only on market listings, because a fee on a two-person swap is easy to dodge and annoying. [EvEmu TR005]
- **U12. What is the lowest price a shop pays when buying from a player?** 1 gold, plus a per-item minimum set in the item's data, so a rare item can never sell for 0. [2004Scape TR005]
- **U38. After a death in an open zone, must the player wait a rolling 30 / 60 / 120 second reclaim delay (PvE deaths included, never in the Pit)?** Yes, because without a delay death has no cost. [AzerothCore DR004, cMaNGOS DR004]
- **U40. Does death cost XP or money?** No XP tax and no money tax for now; if an XP tax comes back, an insurance item skips it. [rAthena DR004]
- **U41. On a player kill, does the killer take exactly one item (PvP zones only, never the Pit), at a rate set per zone?** Yes, never the donor's drop-everything. [rAthena DR004, Open-RSC DR005]
- **U42. What does a player keep on death?** Keep 3 items unflagged, 0 if skulled (marked as an attacker), plus 1 with the protect ability, worn gear kept in unflagged zones; numbers are zone data so open-PvP zones can differ. [Open-RSC DR005]

Strategy's ruling (2026-10-12): the 139 other decisions are ruled as written, every number kept as data and tuned in playtests. Lines are marked [ruled by Strategy 2026-10-12] below.


How to read this: each line is one question. Answer "yes" to accept my recommendation, or write the change. Where several donor games asked the same thing, they are listed in brackets. Where two donors disagreed I say so and pick one.

## Urgent this week (live match flow and economy)

### Trading and the market
- **U1. Who pays the market fee, the seller or the buyer?** Seller: a cut taken from the seller, because then the price a buyer sees is the price they pay. [OpenDAoC TR005; the donor charges the buyer]
- **U2. Should a direct player-to-player trade carry any fee?** No fee on trades; fees only on market listings, because a fee on a two-person swap is easy to dodge and annoying. [EvEmu TR005]
- **U3. Must a trade start with a request that the other player accepts?** Yes, because an unrequested window popping up is spam. [OpenDAoC TR005] [ruled by Strategy 2026-10-12]
- **U4. Should a trade close by itself if the two players move out of range?** Yes, at once, with nothing handed over and any escrowed items returned, because otherwise people trade across the map. [AzerothCore TR004, l1j TR004] [ruled by Strategy 2026-10-12]
- **U5. If either player changes the offer, do both confirmations reset?** Yes, because otherwise someone swaps the deal after the other side has agreed. [l1j TR004; EvEmu and OpenDAoC use the same rule] [ruled by Strategy 2026-10-12]
- **U6. Should trade money be checked only at the moment the trade completes?** Yes, because it removes the need for refunds and is easy to test. [OpenDAoC TR005] [ruled by Strategy 2026-10-12]
- **U7. Should trade work only in the same zone and only when neither player is in a fight?** Yes for the first version, and add trade as its own line on the launch checklist, because no checklist line covers trade today. [EvEmu TR005] [ruled by Strategy 2026-10-12]
- **U8. May a trade or barter take an unworn spare copy of a unique item while the player wears one?** No, the player must take the worn one off first, because it avoids a duplicate-item bug. [Doddler TR004] [ruled by Strategy 2026-10-12]
- **U9. Can a shop discount ever push a price below zero?** No, discounts apply to the money price only and the price never goes under zero, because the donor's version paid players to buy. [Doddler TR004] [ruled by Strategy 2026-10-12]
- **U10. Can an item picked up as "take one" loot be traded?** No in the first version; if wanted later, one bind-after-pickup rule, because free trade of take-one loot defeats the point of take-one. [AzerothCore TR004] [ruled by Strategy 2026-10-12]
- **U11. Is shop stock shared by everyone in a zone, and does it refill on a timer?** Shared per zone, refilling on the zone's timer (not when someone looks at the shop), because it stops refill tricks and reset-by-browsing. [2004Scape TR005, AzerothCore TR004] [ruled by Strategy 2026-10-12]
- **U12. What is the lowest price a shop pays when buying from a player?** 1 gold, plus a per-item minimum set in the item's data, so a rare item can never sell for 0. [2004Scape TR005]
- **U13. Should a suspicious trade or login ban the account automatically?** No: cancel, log, and flag for a person to review, because automatic bans hit innocent players on bad connections (the donors turned theirs off). [l1j TR004, Open-RSC NW003] [ruled by Strategy 2026-10-12]

### Inventory and quest rewards
- **U14. If the pack is full when a quest reward is claimed, what happens?** The quest stays claimable until there is room, so nothing is lost and no mailbox is needed. [ModernUO QU003] [ruled by Strategy 2026-10-12]
- **U15. How do stacks work when only part of a stack is traded?** No note asks this directly; the trade tests assume you can offer 1 from a stack of 100 and receive exactly 1, so I recommend yes, because players expect it. [EvEmu TR005 test line; this is my reading, not a donor ruling] [ruled by Strategy 2026-10-12]

### Quest and contract status rules
- **U16. Which status moves may a quest make?** Only forward: Running to Success, Failed or Obsolete, never back, because it stops reward-twice bugs. [OpenGothic QU001] [ruled by Strategy 2026-10-12]
- **U17. Can a finished quest be done again?** No by default, with a per-quest "repeatable" switch, because repeats should be a deliberate choice. [evennia QU002] [ruled by Strategy 2026-10-12]
- **U18. When a delivery quest expires, can it still be handed in?** No, expiry is final and written on the quest, because the donor's grey area caused arguments. [ModernUO QU003] [ruled by Strategy 2026-10-12]
- **U19. If a timed quest is shared, does the friend get the giver's remaining time or a fresh clock?** The remaining time, because otherwise a party buys extra time. [AzerothCore QU003] [ruled by Strategy 2026-10-12]
- **U20. Are quest-only items destroyed when the quest fails or is dropped?** Yes by default, with a per-quest switch to keep them, because it keeps the economy clean. [AzerothCore QU003] [ruled by Strategy 2026-10-12]

### Fights and connection (netcode)
- **U21. When a fight's input queue is full, drop the oldest input or the newest?** Drop the oldest, because the newest is what the player just did. [Nakama NW002] [ruled by Strategy 2026-10-12]
- **U22. Should each player have a cap on how many actions count per game step?** Yes: start at 5 actions per step (one applied move per step for movement), a refused action still spends the cap, and measure with a real phone before changing it, because a flood must not push out real inputs. [2004Scape NW003, Teeworlds NW001, Nakama and geckos.io NW002 on the per-second cap] [ruled by Strategy 2026-10-12]
- **U23. If a fight cannot keep up, should it slow down and skip enemy work, or end?** Slow down and skip enemy work, never end the fight, because ending hurts the players for the server's problem. [Nakama NW002] [ruled by Strategy 2026-10-12]
- **U24. Should a bad input (impossible direction or value) be rejected or quietly corrected?** Rejected and counted, never corrected, because quiet corrections are how cheats hide. [Teeworlds NW001] [ruled by Strategy 2026-10-12]
- **U25. Should an input that arrives slightly late be forgiven?** Yes: move it into the allowed time window and count how often, because a player on a bad link should not be punished for jitter. [ioq3 NW001] [ruled by Strategy 2026-10-12]
- **U26. Should attacks happen only on the server's own step, never the instant a message arrives?** Yes, the server applies each input on its next step, because it keeps fights fair and replayable. [Teeworlds NW001, Return to the Roots DT003, Quake DT003] [ruled by Strategy 2026-10-12]
- **U27. After a lost message, are movements replayed and attacks dropped?** Yes: movement is replayed up to a cut-off set in data, attacks and blocks are never replayed, because a replayed attack is a double hit. [Quake DT003] [ruled by Strategy 2026-10-12]
- **U28. If the same command arrives twice (retry after reconnect), is it applied once?** Yes, once within 15 seconds, and results like loot or XP are never sent as repeats, because retries must not double-hit or double-spend. [geckos.io NW002] [ruled by Strategy 2026-10-12]
- **U29. Should reconnecting within 60 seconds put the player back in the live fight?** Yes, because a dropped phone signal should not lose the fight. [2004Scape NW003] [ruled by Strategy 2026-10-12]
- **U30. Does the server decide where players are for range and "is moving" checks, and refuse unknown connections?** Yes to both, because the client must not be trusted on position. [Warcraft Arena Unity NW003] [ruled by Strategy 2026-10-12]
- **U31. Is the wrong-password lock per account as well as per address, and does login reveal nothing before the password?** Yes to both, with one generic failure message, because guessers rotate addresses and "already online" leaks who plays. [Open-RSC NW003] [ruled by Strategy 2026-10-12]
- **U32. One server step size for everything (zones, Pit, enemies)?** Yes, one fixed step, because it is what makes a fight replayable. [ioq3 NW001] [ruled by Strategy 2026-10-12]

### Lag compensation (how far back the server may look to judge a hit)
- **U33. How far back may the server look?** 250 ms for duels, tested on a 150 ms phone link before any change; loosen only if real phones need it. The donors disagree (Valve proposes 250 ms against its own 1 s; Colyseus uses 500 ms), and a tighter window favours the target. [Valve NW001, Colyseus NW002] [ruled by Strategy 2026-10-12]
- **U34. Does it apply to melee as well as ranged, and look back at only the one player struck?** Yes to both, because melee needs it on a phone and checking one target keeps the cost low. [Colyseus NW002, Valve NW001] [ruled by Strategy 2026-10-12]
- **U35. If a player's claimed time is more than 200 ms off the server's estimate, replace it with the server's?** Yes, the cheapest cheat guard there is. [Valve NW001] [ruled by Strategy 2026-10-12]
- **U36. One 200 ms "future" limit for every mode, or shorter in duels?** One limit for now, because per-zone limits are an exploit surface; measure first. [ioq3 NW001] [ruled by Strategy 2026-10-12]
- **U37. Does the Pit (client-only arena) use any lag compensation?** No, unless the Pit moves its fights to the server. [Colyseus NW002] [ruled by Strategy 2026-10-12]

### Death penalty
- **U38. After a death in an open zone, must the player wait a rolling 30 / 60 / 120 second reclaim delay (PvE deaths included, never in the Pit)?** Yes, because without a delay death has no cost. [AzerothCore DR004, cMaNGOS DR004]
- **U39. Does gear wear out on death?** No until the repair system exists, because it punishes players with nothing to spend on. [AzerothCore DR004, cMaNGOS DR004] [ruled by Strategy 2026-10-12]
- **U40. Does death cost XP or money?** No XP tax and no money tax for now; if an XP tax comes back, an insurance item skips it. [rAthena DR004]
- **U41. On a player kill, does the killer take exactly one item (PvP zones only, never the Pit), at a rate set per zone?** Yes, never the donor's drop-everything. [rAthena DR004, Open-RSC DR005]
- **U42. What does a player keep on death?** Keep 3 items unflagged, 0 if skulled (marked as an attacker), plus 1 with the protect ability, worn gear kept in unflagged zones; numbers are zone data so open-PvP zones can differ. [Open-RSC DR005]
- **U43. Does a death count as PvP if any player hurt the victim recently, even if they have since logged out?** Yes, because the drop outcome changes and logging out must not erase blame. [2004Scape DR005; the donor says no] [ruled by Strategy 2026-10-12]
- **U44. Does kill credit reset on a full heal or after idle time?** After idle time (10 steps by default), because a heal should not wipe credit. [2004Scape DR005] [ruled by Strategy 2026-10-12]
- **U45. Does an attack that misses still mark the attacker as a player-killer?** Yes, because choosing to attack is the offence. [2004Scape DR005] [ruled by Strategy 2026-10-12]

## Soon (skills, spells, enemy AI, chat, quests, replay)

### Skills and ranks
- **S1. Stun and other crowd control: one diminishing ladder (full, half, quarter, then immune) with a 15 second reset, counting stuns from enemies and bosses too?** Yes; three attackers landing a stun in one step count as one step, with the ladder numbers as data, because it stops stun-locking. [AzerothCore MG012/SK013, Doddler MG012/SK013, Brogue MG012] [ruled by Strategy 2026-10-12]
- **S2. Keep a penalty for being ganged up on (a third attacker costs defence)?** Yes, with a bigger per-attacker value than the donors use, because with three attackers max a tiny value does nothing. [Doddler SK013, KeeperRL SK014] [ruled by Strategy 2026-10-12]
- **S3. A 95 percent hit cap on player-versus-player hits?** Yes, as data. [Doddler SK013] [ruled by Strategy 2026-10-12]
- **S4. Stat tables as spreadsheet-style rows, not fixed in code?** Yes, donor numbers as the starting values. [Doddler SK013] [ruled by Strategy 2026-10-12]
- **S5. Skill-ups: a random roll per use?** Yes, using the game's recorded random numbers so replays match. [AzerothCore SK013] [ruled by Strategy 2026-10-12]
- **S6. Skill cap: 5 times level for everyone?** Yes, with an override for special skills. [AzerothCore SK013] [ruled by Strategy 2026-10-12]
- **S7. Hand out strength and life growth items on a measured schedule (about one life item every four levels), counted when generated?** Yes, because pure luck leaves some players behind. [Brogue SK013] [ruled by Strategy 2026-10-12]
- **S8. Keep ally XP fed by exploring, with a bond level and a companion feat?** Yes, per character. [Brogue SK013] [ruled by Strategy 2026-10-12]
- **S9. Do ranks come from kills or from fighting stronger foes?** From kills with a bigger award for harder foes, and no rank from killing a helpless target; the donors disagree. [OpenRA SK014, freeciv SK014] [ruled by Strategy 2026-10-12]
- **S10. How strong are ranks?** Four ranks at 100 / 150 / 175 / 200 percent power, tuned in playtests; the stronger OpenRA numbers are the alternative for fast duels. [freeciv SK014, OpenRA SK014]
- **S11. Does the rank bonus apply to attack and defence?** Yes, both. [freeciv SK014] [ruled by Strategy 2026-10-12]
- **S12. May an elite self-heal in a duel?** No, only where a zone allows it. [OpenRA SK014] [ruled by Strategy 2026-10-12]
- **S13. Damage from an attack-over-defence curve instead of flat damage?** Yes, once the health scale is fixed. [KeeperRL SK014] [ruled by Strategy 2026-10-12]
- **S14. Combat XP from the current attack gap, not the best ever?** Yes. [KeeperRL SK014] [ruled by Strategy 2026-10-12]

### Spells
- **S15. Does a blocked or parried hit interrupt a cast?** No, only landed damage does. [Doddler MG012, AzerothCore MG012] [ruled by Strategy 2026-10-12]
- **S16. Is there a floor on how fast stats can make you cast?** Yes, half the base time, set as data, so no build casts instantly. [Doddler MG012] [ruled by Strategy 2026-10-12]
- **S17. Mana pool or item charges that recharge?** Item charges, as the donor does, because a second bar on a phone is clutter. [Brogue MG012] [ruled by Strategy 2026-10-12]
- **S18. May melee drain staff charges?** No, refill only at first. [Brogue MG012] [ruled by Strategy 2026-10-12]
- **S19. Does a zap refused by an empty known staff cost a turn?** No, it is free; a fizzle on an unknown staff costs the turn. [Brogue MG012] [ruled by Strategy 2026-10-12]
- **S20. Every spell is a row naming one effect from a fixed list, new effects only after review?** Yes. [Forge MG013] [ruled by Strategy 2026-10-12]
- **S21. A multi-target spell when some targets are gone: still hits the rest?** Yes, the effect is split among survivors. [Forge MG013] [ruled by Strategy 2026-10-12]
- **S22. A temporarily stolen unit returns to its owner?** Yes. [Forge MG013] [ruled by Strategy 2026-10-12]
- **S23. Dispel in PvP: automatic or a resist roll?** A resist roll in PvP only. [Duelyst MG013] [ruled by Strategy 2026-10-12]
- **S24. Do auras always apply on top of a fixed modifier?** Yes. [Duelyst MG013] [ruled by Strategy 2026-10-12]
- **S25. Sleep clause (only one foe asleep per side) in open PvP?** Yes. [Showdown MG013] [ruled by Strategy 2026-10-12]
- **S26. Confirm we copy status rules only, never Pokemon names, moves or species?** Confirm. [Showdown MG013] [ruled by Strategy 2026-10-12]
- **S27. Confusion self-hit chance?** Tune per zone, default below the donor's 33 percent for phone fights. [Showdown MG013] [ruled by Strategy 2026-10-12]

### Enemy AI
- **S28. How does an enemy decide what to do each moment?** A short priority list (about six items) checked every step, with explicit halts when a higher priority takes over; brains are data rows with no script reader in the browser. [BehaviorTree AI001] [ruled by Strategy 2026-10-12]
- **S29. May a re-plan interrupt a wind-up or committed swing?** No for wind-ups, yes for idling and repositioning, set per ability. [GOAP AI001] [ruled by Strategy 2026-10-12]
- **S30. Do enemies re-plan on events with a slow fallback, with a cap per step across all enemies?** Yes. [GOAP AI001] [ruled by Strategy 2026-10-12]
- **S31. Are all AI timers counted in game steps, not clock seconds?** Yes, so replays and pauses work. [GOAP AI001] [ruled by Strategy 2026-10-12]
- **S32. Does a boss switch target only when someone clearly out-threatens the current one (110 percent melee, 130 percent ranged)?** Yes, because without a margin a three-attacker fight flips target every step. [TrinityCore AI001, cMaNGOS AI003] [ruled by Strategy 2026-10-12]
- **S33. Does a taunt move aggro for its duration, and does a second taunt override the first?** Yes to both. [TrinityCore AI001] [ruled by Strategy 2026-10-12]
- **S34. Is threat from a stunned or immune source dropped rather than saved up?** Dropped, to avoid a burst when the stun breaks. [TrinityCore AI001] [ruled by Strategy 2026-10-12]
- **S35. Is a heal's threat split among attackers?** Split, not copied to each. [cMaNGOS AI003] [ruled by Strategy 2026-10-12]
- **S36. Do enemies give up a chase by one shared formula with four numbers on the creature (and bosses may "never break off")?** Yes; the clock runs from the target's last hit on the creature. [Veloren AI003] [ruled by Strategy 2026-10-12]
- **S37. Does a downed ally or item pickup outrank a hostile target?** Not against players; only for NPC allies. [Veloren AI003] [ruled by Strategy 2026-10-12]
- **S38. Does a creature that cannot reach its target retreat if smart and retry the path rarely (1 step in 12)?** Yes; timer is one fixed value for now. [Crawl AI002, cMaNGOS AI003] [ruled by Strategy 2026-10-12]
- **S39. Do hunters remember a target for a time after losing sight, by creature tier?** Yes; Dom picks the values. [Crawl AI002]
- **S40. Do beasts flee on low health but never bosses?** Yes, as a per-creature switch. [Crawl AI002] [ruled by Strategy 2026-10-12]
- **S41. Do enemies flee from a much stronger player?** Yes; Dom sets the strength gap (do not use the donor's 25). [Angband AI002]
- **S42. Do animal packs ambush instead of charging when the player is in the open and above half health?** Yes, per-creature switch. [Angband AI002] [ruled by Strategy 2026-10-12]
- **S43. How long may a cornered afraid creature stay frozen?** A capped number of turns, about 10; Dom sets it. [Angband AI002]
- **S44. Three awareness bands (lose a player far away, 97 percent keep, 25 percent notice per step in view)?** Yes. [Brogue AI002] [ruled by Strategy 2026-10-12]
- **S45. Track scent only in zones with a player in them, and do cautious groups avoid chokepoints?** Yes to both, because it caps cost and fits the three-attacker rule. [Brogue AI002] [ruled by Strategy 2026-10-12]
- **S46. Melee advance distances: one simple dial per creature, no circling for casters, and circle chance never below 10 percent?** Yes to all three, because it is easy to tune and nothing freezes behind a wall. [CombatPathingRevolution AI003] [ruled by Strategy 2026-10-12]
- **S47. Do idle town creatures wander about 5 tiles from home, on their own seeded random stream, and walk back when they stray (never snap)?** Yes. [LostCityRS QU003] [ruled by Strategy 2026-10-12]

### Chat and reports
- **S48. Reports need a reason from a short fixed list (plus a 120-character note), with a recency check?** Yes, one report per player per suspect until a moderator closes the case. [AAEmu CT004, swgemu CT005] [ruled by Strategy 2026-10-12]
- **S49. Who clears a suspect?** A moderator action that writes a record, not an NPC conversation. [AAEmu CT004] [ruled by Strategy 2026-10-12]
- **S50. Can a report set a mute length?** No. Reports add to a count; a moderator picks 10 min / 1 h / 24 h / 7 d (gag choices 5, 30, 60 minutes); one report never means a permanent mute. [rAthena CT004, ACE CT005, Open-RSC CT005]
- **S51. Does a mute keep counting while the player is logged out?** Yes, it expires by the wall clock. [rAthena CT004] [ruled by Strategy 2026-10-12]
- **S52. A short chat delay for brand-new characters?** Yes, 30 minutes for zone and world chat only; party, guild and whisper work at once. [AzerothCore CT004]
- **S53. Silent drop of filtered whispers, with the sender told "filtered"?** Yes, so spammers cannot learn which word hit. [AzerothCore CT004] [ruled by Strategy 2026-10-12]
- **S54. Does a spam report keep the last 20 messages for 10 minutes for moderators?** Yes. [AzerothCore CT004] [ruled by Strategy 2026-10-12]
- **S55. When someone blocks you, do you get told?** Yes, keep the notice; and let players block per channel (trade, group-finder, roleplay). [ACE CT005] [ruled by Strategy 2026-10-12]
- **S56. A public-chat speed limit of 1 line per 1.5 seconds (staff exempt)?** Yes. [Open-RSC CT005] [ruled by Strategy 2026-10-12]
- **S57. May staff see muted or filtered lines unfiltered?** Yes, staff only, and the viewing is logged. [Open-RSC CT005] [ruled by Strategy 2026-10-12]
- **S58. Do short banned words need word boundaries, and is profanity masked in chat rather than blocked (hits logged)?** Yes to both. [swgemu CT005] [ruled by Strategy 2026-10-12]
- **S59. Add chat and reports as their own line on the launch checklist?** Yes. [rAthena CT004] [ruled by Strategy 2026-10-12]

### Quests and NPC schedules
- **S60. Quests as data rows, not code, advanced by named events like "killed X"?** Yes, so a new quest needs no code change. [evennia QU002, ModernUO QU003] [ruled by Strategy 2026-10-12]
- **S61. Is a quest a forward-only list of steps, referred to by id (not display name)?** Yes. [openmw QU001] [ruled by Strategy 2026-10-12]
- **S62. NPC daily schedules as time windows in zone data?** Yes, so a designer can change them without code. [OpenGothic QU001, openmw QU001, AzerothCore QU003] [ruled by Strategy 2026-10-12]
- **S63. Is dialogue memory (lines already heard) kept per character?** Yes. [OpenGothic QU001] [ruled by Strategy 2026-10-12]
- **S64. Do quest rumours stay until the quest ends, one rumour per NPC per talk, with travel time as the sum of all places?** Yes to all three. [Daggerfall QU001] [ruled by Strategy 2026-10-12]
- **S65. Do ambient NPC barks rotate through all lines once per pass in a per-character order, with quest-giver lines most specific first and an optional cooldown?** Yes. [Yarn QU002, inkjs QU002] [ruled by Strategy 2026-10-12]
- **S66. Does the server refuse a dialogue choice that was not on offer?** Yes. [Yarn QU002] [ruled by Strategy 2026-10-12]
- **S67. Once-only dialogue choices: hide after used, with a saved flag for quest steps?** Yes. [inkjs QU002] [ruled by Strategy 2026-10-12]

### Fight replay and fairness
- **S68. Keep every PvP fight (random seed, inputs, rule version) so any fight can be replayed?** Yes, including guest fights, and how long to keep them is your call. [OpenBW, OpenRA DT001; Hedgewars, Showdown DT002; Return to the Roots DT003]
- **S69. Separate random streams (damage, loot, enemy AI, spawns) from one seed?** Yes, so a change in one never shifts another. [OpenBW DT001, Showdown DT002, Quake DT003, openage DT003] [ruled by Strategy 2026-10-12]
- **S70. A fingerprint every 32 steps or each turn, so a bad replay names its first bad moment?** Yes; a mismatch is logged, never skipped, and the fingerprint is an alarm, not a judge. [OpenBW DT001, Hedgewars DT002, Return to the Roots DT003] [ruled by Strategy 2026-10-12]
- **S71. A fixed set of golden fights replayed on every rule change in automatic tests, and refuse to replay with a different rule version?** Yes. [OpenRA DT001, Beyond All Reason DT001] [ruled by Strategy 2026-10-12]
- **S72. Is a leave or kick applied at a set step for everyone?** Yes. [OpenBW DT001] [ruled by Strategy 2026-10-12]
- **S73. Does the client ever show a roll before the server answers, or does the player see raw random numbers?** Never; the server seed comes from a secure source and stays on the server, 64 bits, stored with each replay. [boardgame.io DT002, Return to the Roots DT003] [ruled by Strategy 2026-10-12]
- **S74. Do admin actions enter the fight record?** No, they go to a separate log. [Showdown DT002] [ruled by Strategy 2026-10-12]
- **S75. Do all fight timers (damage over time, cooldowns, respawn grace) share one ordered queue, with overflow carried to the next step and logged?** Yes. [openage DT003] [ruled by Strategy 2026-10-12]
- **S76. Save/restore of a live fight?** Developer tool only, never in multiplayer. [Beyond All Reason DT001] [ruled by Strategy 2026-10-12]
- **S77. Does the Pit show cooldowns only after the server accepts?** Yes for version one; add prediction only if lag is felt on a phone. [Warcraft Arena Unity NW003] [ruled by Strategy 2026-10-12]
- **S78. Do recipes live as validated data rows (no duplicate inputs, price above zero)?** Yes. [Doddler TR004] [ruled by Strategy 2026-10-12]
- **S79. Should an idle ghost auto-release to the graveyard after 6 minutes outside instances?** Yes, as zone data. [AzerothCore DR004] [ruled by Strategy 2026-10-12]

## Parked (zone generation and low-priority rulings)
- **P1. If a generated zone fails a check, retry with the next seed (up to about 10) and then fail the build, never at player login?** Yes, because a half-built zone must never ship. [Luanti PR006, Wesnoth PR007, Hedgewars PR007] [ruled by Strategy 2026-10-12]
- **P2. Can one template row serve several zone families, with per-family overrides (about 50 rows instead of 700)?** Yes. [Hedgewars PR007] [ruled by Strategy 2026-10-12]
- **P3. Is a healer's or ally's resurrect held back by the same reclaim delay as a self-reclaim?** Yes, otherwise the delay only slows lone players. [cMaNGOS DR004] [ruled by Strategy 2026-10-12]
- **P4. Build zones ahead of time from blueprint rows and a stored seed, commit the results, and block a batch if checks fail (reachable, minimum counts, entry points)?** Yes. [Brogue PR006, Wesnoth PR007] [ruled by Strategy 2026-10-12]
- **P5. Every zone stores its seed and grammar version, with its noise seed derived from the world seed plus zone id and every roll from the zone's own stream?** Yes. [Terasology, Luanti PR006; Wesnoth PR007] [ruled by Strategy 2026-10-12]
- **P6. Each zone row names the steps it runs, and the build refuses a missing step?** Yes. [Terasology PR006] [ruled by Strategy 2026-10-12]
- **P7. Do zones need depth layers or stay flat in the first slice?** Flat for now. [Terasology PR006] [ruled by Strategy 2026-10-12]
- **P8. First zone shape: rooms-and-walks with a reward vault inside?** Both in one zone row. [Luanti PR006] [ruled by Strategy 2026-10-12]
- **P9. Reward pacing (one vault per N zones per tier) as a target in zone data?** Yes, decided after the first ten zones are looked at. [Brogue PR006] [ruled by Strategy 2026-10-12]
- **P10. Mirrored fair copies for duel islands only?** Yes; the open world uses hand-tuned families. [freeciv PR007] [ruled by Strategy 2026-10-12]
- **P11. If spawn points fail the walkability check, re-roll first and relax only the quality bar?** Yes, and reject zones whose spawns are not connected. [freeciv PR007, Wesnoth PR007] [ruled by Strategy 2026-10-12]
- **P12. Spacing and quality as separate settings?** Yes, spacing fixed. [freeciv PR007] [ruled by Strategy 2026-10-12]
- **P13. A loop-density dial for dungeons, low by default?** Yes, so fights stay readable and attackers can flank. [Hedgewars PR007] [ruled by Strategy 2026-10-12]
- **P14. Does a held companion expire when you leave the zone?** Yes. [Brogue DR005] [ruled by Strategy 2026-10-12]
- **P15. Is a shrine raise free (one charge per shrine, logged)?** Yes. [Brogue DR005] [ruled by Strategy 2026-10-12]
- **P16. Does a companion that dies in the Pit enter the pool?** No. [Brogue DR005] [ruled by Strategy 2026-10-12]

## Appendix: Design-brief questions
Strategy's ruling: 12 of 15 are "accept the recommendation" in one yes. Three are not the brief's to recommend (marked).

- **B1. [NOT the brief's call: launch target. Dom confirms.]** How many players do we plan for on launch day? Strategy recommends planning for 1,000 at once, and buying hosts for 10,000 only when the test shows 80 percent of one host used. [server-performance-scaling #1]
- **B2. [NOT the brief's call: kids/age rule. Dom decides, legal.]** Do children play? If yes we need an age rule and the specs have none. The brief suggests no analytics beyond anonymous counts for anyone, but that is not the brief's to recommend. [analytics-telemetry #2]
- **B3. [NOT the brief's call: test box. Strategy rules.]** Where do we load-test with bots? Strategy rules: on the VPS in a spare window, never in a release window; the Hugging Face CPU only if the test needs more cores than the VPS has. This replaces the brief's "separate rented box". [server-performance-scaling #5] [ruled by Strategy 2026-10-12]
- **B4. Move player presence to its own host before beta?** Accept: yes, before the load test, so the test reads a clean box. [server-performance-scaling #2] [ruled by Strategy 2026-10-12]
- **B5. Save player location to the database every 120 seconds, plus on leave?** Accept: yes; it halves database cost and nothing pays from it. [server-performance-scaling #3] [ruled by Strategy 2026-10-12]
- **B6. When a phone cannot keep up, skip its updates or kick it?** Accept: skip first, kick after 10 seconds stuck. [server-performance-scaling #4] [ruled by Strategy 2026-10-12]
- **B7. Low Power Mode: cap at 30 frames on purpose?** Accept: yes. [phone-performance-battery #1] [ruled by Strategy 2026-10-12]
- **B8. Tell the player when quality drops?** Accept: no message; show it only in the perf view. [phone-performance-battery #2] [ruled by Strategy 2026-10-12]
- **B9. Allow 120 fps on high-end phones?** Accept: no for launch. [phone-performance-battery #3] [ruled by Strategy 2026-10-12]
- **B10. Which phones are the test devices?** Accept: an older Android around 3 GB for low, iPhone 12 for mid. [phone-performance-battery #4] [ruled by Strategy 2026-10-12]
- **B11. Idle menus at 30 fps to save battery?** Accept: yes. [phone-performance-battery #5] [ruled by Strategy 2026-10-12]
- **B12. Where do the 4 dashboards live?** Accept: a private page reading the database tables plus the health report. [analytics-telemetry #1] [ruled by Strategy 2026-10-12]
- **B13. Keep 90-day retention of analytics?** Accept: yes, same as duel metrics. [analytics-telemetry #3]
- **B14. Who gets alerts?** Accept: one daily summary to Dom; a page only for "server down". [analytics-telemetry #4]
- **B15. Count fight win-rates from the first public test?** Accept: yes, aggregated only, never per player. [analytics-telemetry #5] [ruled by Strategy 2026-10-12]

## Appendix: Licences
- **L1. CC0 (Duelyst code) and Unlicense (Warcraft Arena Unity) may be used like MIT?** Permitted: yes for code, no credit needed; leave Duelyst's art out. [Duelyst MG013, Warcraft Arena Unity NW003] [ruled by Strategy 2026-10-12]
- **L2. OpenBW has no licence file.** Ideas only, no code copied. [OpenBW DT001] [ruled by Strategy 2026-10-12]
- **L3. TRELLIS.2 uses nvdiffrast (NVIDIA non-commercial), which blocks shipping TRELLIS.2 output.** Pending Dom. Strategy raises this with Dom and recommends TRELLIS.2 for look-development and prototypes only; before any paid launch either swap the rasterizer or re-make the shipped assets another way. [character-build-recipe]
