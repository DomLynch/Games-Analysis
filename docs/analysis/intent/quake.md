# Quake (1996) - design-intent brief

Source keys: [W] https://en.wikipedia.org/wiki/Quake_(video_game) ; [H] https://quake.fandom.com/wiki/History_of_Quake ; [P] https://postgamecontent.com/post/169573214773/quake ; [Q] https://dondeq2.com/2017/10/11/the-history-of-quakeworld-a-look-back-at-the-making-of-one-of-the-most-important-advancements-in-multiplayer-gaming-by-john-jcal-callaham/ ; [J] https://quakewiki.org/wiki/Trick_Jumps ; [G] https://gamicus.fandom.com/wiki/Quake ; [K] https://knowledge.wharton.upenn.edu/article/joyriding-with-the-masters-of-doom-a-tale-of-two-video-game-programmers/ ; [S] https://bloody-disgusting.com/video-games/3636234/quake-level-designer-sandy-petersen-reveals-scrapped-ideas-games-bosses/
(Most of [H], [P], [J], [G], [S] were seen only through search-result summaries.)

## 1 Design pillars
- Full real-time 3D: polygonal models instead of sprites, full 3D level geometry, prerendered lightmaps. [https://en.wikipedia.org/wiki/Quake_(video_game)]
- Original concept was a medieval, hammer-wielding RPG-ish fighter. Romero said he wanted "Virtua Fighter in a 3D world", but nobody else had faith in it (Edge interview, paraphrased). [https://en.wikipedia.org/wiki/Quake_(video_game)]
- Romero revived the Quake concept after Doom II promising constant, hectic action. [https://en.wikipedia.org/wiki/Quake_(video_game)]
- Internet-capable multiplayer via a TCP/IP networking model built alongside the engine. [https://en.wikipedia.org/wiki/Quake_(video_game)]
- Moddability: QuakeC let end users partly program the game; source released December 1999. [https://en.wikipedia.org/wiki/Quake_(video_game)]
- The team ended up favouring Doom-style weaponry (American McGee's proposal won overwhelming support), at Romero's disappointment. [https://quake.fandom.com/wiki/History_of_Quake]

## 2 Why players loved it
- Movement depth: bunnyhopping, strafe-jumping and rocket jumping are central to play, giving a high skill ceiling and fast pace. [https://en.wikipedia.org/wiki/Quake_(video_game)]; [https://quakewiki.org/wiki/Trick_Jumps]
- Most of those techniques were not planned by designers; some sources say rocket jumping was at least partly anticipated (e.g. a high teleporter in E4M4). [https://quakewiki.org/wiki/Trick_Jumps]; [https://gamicus.fandom.com/wiki/Quake]
- Deathmatch (FFA, 1v1 duels, teams) with immediate respawn and item respawn timers. [https://en.wikipedia.org/wiki/Quake_(video_game)]
- QuakeWorld's client-side prediction made dial-up play responsive, letting modem players compete and bringing in many more online players and clans. [https://dondeq2.com/2017/10/11/the-history-of-quakeworld-a-look-back-at-the-making-of-one-of-the-most-important-advancements-in-multiplayer-gaming-by-john-jcal-callaham/]
- Custom skins let clans show identity (over 5,000 usable skins about three months after QuakeWorld). [https://dondeq2.com/2017/10/11/the-history-of-quakeworld-a-look-back-at-the-making-of-one-of-the-most-important-advancements-in-multiplayer-gaming-by-john-jcal-callaham/]
- Mod ecosystem: Team Fortress, ThreeWave CTF, Rocket Arena and others. [https://en.wikipedia.org/wiki/Quake_(video_game)]; [https://dondeq2.com/2017/10/11/the-history-of-quakeworld-a-look-back-at-the-making-of-one-of-the-most-important-advancements-in-multiplayer-gaming-by-john-jcal-callaham/]
- It became one of the first esports (QuakeCon, CPL; pro players such as Thresh and Fatal1ty). [https://en.wikipedia.org/wiki/Quake_(video_game)]
- Critical reception 93% GameRankings / 94 Metacritic; GDC Choice awards 1997. [https://en.wikipedia.org/wiki/Quake_(video_game)]

## 3 Pacing and progression feel
- Single-player: four episodes of 7-8 levels, a hub START level, easy/medium/hard paths per episode, episodes in any order; collecting four runes opens the final level. [https://en.wikipedia.org/wiki/Quake_(video_game)]
- Death returns you to the start of the level; 8 carried weapons, four ammo pools, three armor tiers. [https://en.wikipedia.org/wiki/Quake_(video_game)]
- Episode 4 (Petersen's maze-like maps) is considerably harder and held levels id had no other place for. [https://bloody-disgusting.com/video-games/3636234/quake-level-designer-sandy-petersen-reveals-scrapped-ideas-games-bosses/]
- Levels were built in isolation, so each episode has its own look; Romero tied them together by starting each at a military base with teleports. [https://en.wikipedia.org/wiki/Quake_(video_game)]
- Progression is gear/ammo/power-up based (Quad Damage etc.), not stat-based. [https://en.wikipedia.org/wiki/Quake_(video_game)]
- Multiplayer progression is skill and the community scene (clans, skins, rankings). Carmack's planned global ranking and pay-to-rank system was dropped (unstable master server, players unwilling to risk rankings). [https://dondeq2.com/2017/10/11/the-history-of-quakeworld-a-look-back-at-the-making-of-one-of-the-most-important-advancements-in-multiplayer-gaming-by-john-jcal-callaham/]

## 4 Signature features and systems
- True 3D engine with polygonal models and lightmaps. [https://en.wikipedia.org/wiki/Quake_(video_game)]
- QuakeC scripting and open source. [https://en.wikipedia.org/wiki/Quake_(video_game)]
- QuakeWorld: client-server split, client prediction, master server, server browser, 32 player limit. [https://dondeq2.com/2017/10/11/the-history-of-quakeworld-a-look-back-at-the-making-of-one-of-the-most-important-advancements-in-multiplayer-gaming-by-john-jcal-callaham/]
- Hardware accelerated builds (GLQuake, January 1997) and ports. [https://en.wikipedia.org/wiki/Quake_(video_game)]
- Push-against-object interaction, no use key. [https://en.wikipedia.org/wiki/Quake_(video_game)]

## 5 Known flaws and regrets
- Carmack built a full 3D engine and a networking model at once and said they should have been separate projects. [https://en.wikipedia.org/wiki/Quake_(video_game)]
- Launch netcode assumed fast connections; Carmack admitted a wrong basic assumption and rewrote it from scratch for QuakeWorld. [https://dondeq2.com/2017/10/11/the-history-of-quakeworld-a-look-back-at-the-making-of-one-of-the-most-important-advancements-in-multiplayer-gaming-by-john-jcal-callaham/]
- About fifty R&D levels were reworked or scrapped; crunch from December 1995 to June 1996; creative conflict led to Romero's departure after release. [https://en.wikipedia.org/wiki/Quake_(video_game)]
- Lack of vision/leadership: Petersen said he offered to lead and was turned down (2021). [https://en.wikipedia.org/wiki/Quake_(video_game)]
- Critics: single-player shallow without a plot; EGM said it is not a great one-player game and earned its reputation in multiplayer. [https://en.wikipedia.org/wiki/Quake_(video_game)]
- Giant-boss ideas scrapped because scaled-up monsters looked bad; episodes 2 and 3 lack bosses. [https://bloody-disgusting.com/video-games/3636234/quake-level-designer-sandy-petersen-reveals-scrapped-ideas-games-bosses/]
- Prediction corrections can make QuakeWorld feel erratic. [https://dondeq2.com/2017/10/11/the-history-of-quakeworld-a-look-back-at-the-making-of-one-of-the-most-important-advancements-in-multiplayer-gaming-by-john-jcal-callaham/]

## 6 What Frankendom should take
1. Netcode for the real audience first. Build prediction for high-latency browser clients from day one; QuakeWorld's lesson is that responsiveness equalises players. SOURCED [https://dondeq2.com/2017/10/11/the-history-of-quakeworld-a-look-back-at-the-making-of-one-of-the-most-important-advancements-in-multiplayer-gaming-by-john-jcal-callaham/]
2. Duel feel: Romero's original "Virtua Fighter in 3D" idea is a direct match for Frankendom's fast duels. SOURCED (idea) [https://en.wikipedia.org/wiki/Quake_(video_game)]; using it as a spec is INFERRED.
3. Leave room for emergent movement/skill tech (rocket jumps, strafe jumps were largely unplanned yet defined the competitive scene); keep movement rules consistent and do not patch out healthy skill expression. SOURCED that these were largely unplanned and community-preserved [https://quakewiki.org/wiki/Trick_Jumps]; policy is INFERRED.
4. Items that respawn on timers plus immediate respawn give duels and many-vs-one fights a map-control layer. SOURCED mechanism [https://en.wikipedia.org/wiki/Quake_(video_game)]; INFERRED fit.
5. Identity and community tools (skins, clans, servers, mod scripting) drove retention; build cosmetics and a modding hook early. SOURCED [https://dondeq2.com/2017/10/11/the-history-of-quakeworld-a-look-back-at-the-making-of-one-of-the-most-important-advancements-in-multiplayer-gaming-by-john-jcal-callaham/]
6. Do not run two hard unknowns at once, and settle creative direction early (engine plus net model; RPG vs Doom-style fight). SOURCED [https://en.wikipedia.org/wiki/Quake_(video_game)]

## Claims not sourced / weak
- Id's own statement of competitive intent for Quake movement: not found; sources agree most techniques were unplanned.
- Single-player first/mid/late pacing: only structure is sourced; feel is INFERRED.
- Abrash design intent: not found (only technical articles listed on https://www.bluesnews.com/s/12582/mike-abrash_s-quake-articles, not read).
- Several details came from search-result summaries rather than opened pages ([H], [P], [J], [G], [S]).
