# keldaanCommunity-pokemonAutoChess (onboarding-first-5, widened to first 30 min, cell OB003)

Donor: /mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess (VPS, read-only)
Licence: GNU GPL v3 (LICENSE, read). Clean-room, shape only. No code, no sprites, no names copied. Pokemon species, names and sprites are third-party IP: category level only ("a three-starter pick on a portal ring").

Checked: app/rooms/commands/lobby-commands.ts, app/rooms/commands/game-commands.ts (phase machine, picking, fight setup, PvE shiny roll), app/config/game/stages.ts, app/models/shop.ts (stage-0 starter offer), app/core/mini-game.ts (portal ring, avatar timers, stop() payout), app/models/pve-stages.ts (stages 1, 2, 3, 9, 14 read; 11 stage keys total), app/models/pokemon-factory.ts (makePveBoard), app/models/colyseus-models/pokemon.ts (Magikarp class), app/rooms/game-room.ts (XP and ELO gates, placement XP), app/config/game/experience.ts, elo.ts, gadgets.ts, shop.ts, collection.ts, app/models/mongo-models/user-metadata.ts (giveUserExp), app/services/booster.ts, app/services/collection.ts (createBooster), app/rooms/preparation-room.ts (countdown chat). Data half: app/public/dist/client/locales/en/translation.json (JSON parsed: 355 top-level keys, 5234 leaf strings; onboarding-relevant keys read). Client: game-loading-screen.tsx, wiki-tutorials.tsx read; booster.tsx and notification-modal.tsx grep only.
Confidence: high on server order of operations for stages 0 to 3 and the XP gate. Medium on what the player sees on screen (client presentation not read). Timings below are config numbers, not measured.

## 1. What the player sees and feels (first 90 seconds, 375 wide)

A new account is created on first connect with a random generated name, a random starter avatar (one of 23 species) and 3 boosters in the bag (lobby-commands.ts 73-74; Starters.ts 3). Nothing tells the player what to do. The lobby is the hub.

A match starts with a chat countdown ("Game is starting in" 10 to 1; preparation-room.ts 173). While loading, a rotating hint card changes every 20 s, starting with "Don't tab out" and then 10 shuffled hints (game-loading-screen.tsx 25, 44; translation.json 4905-4915).

Stage 0 is a Treasure Town portal ring. The ring holds 3 to 9 portals (one per player plus one, clamped; mini-game.ts 447) orbiting a centre, each portal carrying synergy symbols that orbit it. Each avatar sits on the ring and cannot move for 12 s (mini-game.ts 317; move input ignored while timer > 0, mini-game.ts 792). The whole stage is 23 s (stages.ts 2, 18). Read as a design: the player sees the choice before any control, and the first input is delayed.

Stage 1 is a 20 s picking phase (stages.ts 3), then the first fight: two wild Magikarp (pve-stages.ts 44-48). The fight phase is 45 s max (stages.ts 16) and ends early when the simulation finishes.

## 2. First fight, first kill, first hit

- The first fight is winnable by fixed design, not by a curve. makePveBoard (pokemon-factory.ts 14-40) applies no level scaling; the first statBoosts entry is at stage 9 (pve-stages.ts 109, Gyarados), so stages 1 to 3 have none. The two Magikarp have 30 HP, Atk 1, and a skill named SPLASH (pokemon.ts 5174-5181). The SPLASH effect was not read; the name matches the no-op move in the Pokemon games, so treat the claim "does nothing" as inference.
- The stage 0 to 1 hop is forced in code so round 1 is never PvP (game-commands.ts 1331-1334 comment and assignment).
- Player life starts at 100 (player.ts 118). Round damage is ceil(stage/2) base (game-room.ts computeRoundDamage, not receipted).
- First hit feedback in the client (battle-manager.ts, pokemon-sprite.ts, animation-manager.ts): NOT READ. No first-hit presentation claim is made.
- First kill: no first-kill title or achievement found in the stage path. titles.ts was not searched for first-win titles beyond a grep for "first" (no hit).

## 3. First reward, first loot, first level, and how each is celebrated

- Starting boosters: 3 at account creation (lobby-commands.ts 73). A booster is 10 cards (services/collection.ts 179); the last card is drawn from the unique and legendary pool (services/collection.ts 185, guaranteedUnique). Shiny per card 5 percent, god pack 1 in 1000 (collection.ts 182 and the shiny line). Duplicate cards turn into dust, 50 per card, 250 for a shiny (booster.ts 108; collection.ts 4-5). So an opened booster is never a dead pack.
- Stage 0 starter offer: 3 propositions (NB_STARTERS, shop.ts 4 and 426-428), each with a random item component attached.
- PvE loot ladder: stage 1 gives one random item component (pve-stages.ts 52). Stage 2 offers 3 components that have not been given yet and the player picks one (pve-stages.ts 67). Stage 3 gives one more non-repeating component (stage 3 block, not receipted). A 1 in 40 shiny chance applies to the stage 1 PvE encounter (pve-stages.ts 50; roll at game-commands.ts 1628).
- Account XP and level: placement XP is 700, 400, 350, 300, 250, 200, 200, 200 (experience.ts 2; awarded at game-room.ts 995). Level threshold is 1000 XP (experience.ts 4). Each level-up adds one booster (user-metadata.ts 254). A level-up notification is only sent for levels 1 and 2 (user-metadata.ts 257).
- IMPORTANT GATE: XP is only given when the room has at least 2 players AND the game reached stage 10 (game-room.ts 973-975, grant at 1025; threshold elo.ts 4). A player who leaves or is eliminated before stage 10 gets no XP, no booster and no gadget progress. ELO has the same stage gate plus a "left before end" clause (game-room.ts 927, 991).
- Gadget unlocks by account level (gadgets.ts 30-95): trainer_card L0, bag L1 (gadgets.ts 36), team_planner L2, jukebox L3, palette L4, certificate L5, recorder L10, synergy_wheel L15, gameboy L20, tier_list_maker L25, pokeguesser L30, bot_builder L40 (disabled when BOTS_ENABLED is false; game.ts sets true), sprite_tracker L50.
- Celebration: level-up goes to the notification modal (notification-modal.tsx 79-90 title and message strings only; the modal layout was not read). The booster opening UI (booster.tsx, 106 lines) was NOT READ beyond a grep; no claim about the reveal ceremony.
- The avatar hint explains the loop in one sentence: "Each level grants you a booster which when opened gives you new avatars" (translation.json 4915).

## 4. First hub and services, introduced one at a time

- There is no bank. The services are the shop (SHOP_SIZE 6, shop.ts 3) with a refresh for 1 gold (locale refresh_gold_hint) and the collection (boosters, avatars).
- Services are introduced by the game stages, not by a hub tour: stage 0 is the starter ring; stages 1 to 3 are picks and PvE rewards; stage 4 is the first item carousel (ItemCarouselStages starts at 4, stages.ts 20) and the first town encounter (TownEncountersByStage starts at key 4, town-encounters.ts 5-17).
- A merchant-style encounter is an NPC on the ring that sells one item at a price. Dialog lines are "tell price" and "thank you" (mini-game.ts 187-199; locale npc_dialog). Price-check is the first money decision.

## 5. First meaningful choice

Stage 0 is the first real choice, and it has two consequences. The portal you take sets your map (region) and re-rolls berry tree types (mini-game.ts stop(), region and berry branch), and it sets the starter offer through the synergies on that portal (shop.ts 388-430, assignUniquePropositions). Picking one of 3 starters is the first decision the player owns. If a player does not pick, the server forces a random untaken portal (mini-game.ts 865), so there is never a dead screen.

## 6. Pull-forward hooks at minute 5, 10, 30

These minute marks are estimates from config (23 s + 20 s + 45 s per stage, fights can end early), not measured:
- Minute 5 (about stage 4): first item carousel, first town NPC, first shop-style sale. Hook: a NPC rumour and a fugitive. The Magnezone encounter sets a wanted outlaw stage at random between 5 and 15 (mini-game.ts MAGNEZONE branch; locale npc_dialog.magnemite "Have you seen the fugitive?").
- Minute 10 (about stage 10): the XP and ELO gate opens. Stage 10 is a portal carousel stage (PortalCarouselStages = 0, 10, 20; stages.ts 22) that offers a unique-pick choice (shop.ts 397-399). Hook: the visible next goal is the first level-up and the first booster.
- Minute 30 (roughly stage 20 if the games run long): the second portal carousel, and at most one to two full games for a new player. Hook: locked gadgets at levels 1 to 5, and "Play more games to level up and earn new boosters" (translation.json 4210).
- Locked door in the lobby: gadgets sit behind levels (see section 3).

## 7. Tutorial style

- No in-game tutorial was found. The grep over app/config, app/rooms, app/services, app/models, app/types, app/utils, app/public/src (pages, game, stores, i18n, index) and the client localStorage calls found no first-run flag and no tutorial step.
- The only tutorial content is the wiki: six embedded external YouTube videos (wiki-tutorials.tsx 42 and five siblings; titles are short, for example "How to position your units").
- Text is one to two sentences per hint. Hints are not dismissible in the code read (not read: a close control, if any).
- Show-don't-tell: the ring itself is the lesson. The starter line is text-light ("Choose your first partner Pokemon. You will get a copy of it every stage up to stage 10", translation.json 4379).

## 8. Drop-off risks

- Avoided: no forced tutorial, no dead-end pick (forced portal and forced item), a fixed winnable first fight, 3 free boosters before any play.
- Has: the stage-10 XP gate. A new player who quits at stage 3 to 9 sees no progress at all. This is the single biggest drop-off risk in the donor's first 30 minutes.
- Has: a 12 s no-input window at stage 0. Designed as a look-before-touch, but impatient players may read it as lag. Not tested.
- Has: a 3-minute loading cap and the disconnection kick (loading hints, translation.json 4905-4915) that are visible to new players.

## 9. Could be ours at 20 to 30 percent resemblance, and the 5-minute phone look test

Idea (category level, not copying): a glowing ring of three to six doors in the hub, each door a different starter-like gift; pick one before any control; a 12 s look-before-touch with a countdown ring; a fixed, winnable first fight against two weak foes; one loot card with a 1 in 40 rare-variant roll; three gifts stored on day one.

Frankendom mapping:
- Zone data: the first ring is a zone-data entry (row 23 zone population: spawn caps and grace timers as data fields). The stage-0 ring is one zone, one ring template, not a per-zone script.
- Pit characters: the three starter doors pull from the Pit roster (100 Pit characters reused across zones), not a separate starter list.
- Many-vs-one: the first fight uses the engine as is (src/fight), with a fixed two-foe board. MAX_ATTACKERS = 3 is respected.
- Server-verified: the starter pick, the forced default if idle, and the first XP are server events; the ring animation is client-only.
- Keep: the forced default pick (no dead screen), the fixed winnable first fight, 3 starter boosters, the rare-variant roll on the first fight.
- Change: do NOT gate the first XP and first level behind a late stage. Give the first level-up on the first win (rule: first XP at the first fight, row 18 loot roll and XP award).

Look test (5 minutes, Dom on phone, no server): one static HTML page at 375 wide. Screen 1: three doors on a ring, 12 s locked with a countdown, then tappable. Screen 2: if the player has not tapped by 23 s, the page picks a door for them. Screen 3: a two-foe fight card with a fixed result. Screen 4: one loot card with a 1 in 40 shiny sparkle. Compare: (a) locked 12 s vs instant control, (b) forced default vs free wait, (c) first XP on win vs first XP at stage 10.

## Licence and IP note

GPL v3 code. Clean-room only. Pokemon species names, sprites, and locale text are third-party. Do not carry species names or the hint text. Frankendom names and art must be original.

## Gaps

- Not read: client battle presentation (battle-manager.ts, pokemon-sprite.ts, animation-manager.ts, abilities-animations.ts), booster reveal (booster.tsx beyond grep), after-game screen, the lobby page layout, titles.ts in full, the stage 3 and later PvE blocks in full, bot filling code (preparation-commands.ts), the Splash effect.
- Not measured: on-screen timings, actual first-90-second frame count, hint-card visibility.
- Half read: server and data read; client read only for the loading screen and the wiki.
- Not in the half I read: an in-game tutorial. The grep covered the server and the client src; a tutorial could live in an asset-only path (not searched).

Best transferable idea: a forced-default pick on a visible ring before any control, with the first level-up on the first win and never behind a late stage.
