# smogon-pokemon-showdown (onboarding-first-5, widened to first 30 min, cell OB003)

Donor: /mnt/frankendom-donors/smogon-pokemon-showdown (VPS, read-only)
Licence: MIT (LICENSE, read: "The MIT License (MIT), Copyright (c) 2011-2026 Guangcong Luo and other contributors"). Code may be adapted with attribution. Pokemon names, species data and battle text are third-party IP: category level only.

Checked: server/users.ts (guest naming, lines 80-90), config/formats.ts (Random Battle and Unrated Random Battle entries, lines 25-70), server/chat-commands/info.ts (/intro and /smogintro, lines 1815-1840), server/chat-plugins/smogtours.ts (tournaments landing page, lines 395-410), server/room-battle.ts (timer constants lines 40-60, timer settings 183-215, timer start and request 216-250, per-turn add 280-300), data/text/default.ts (lines 1-40, battle log templates), data/random-battles (directory listing only: 7 gen9 files).
Not read: sim/ (battle engine), the team generator internals in data/random-battles/gen9, server/ladders*.ts, the team validator, and the web client. The client is not in this box.

Half read: server plus the data text file. Client: NOT in the box, so every first-90-second screen claim below is "not in the half I read". The server sends text and state; the screens are not seen.

## 1. What the player sees and feels (first 90 seconds)

- On connect an anonymous visitor becomes "Guest N" (users.ts 83-84). Guests can play; the name is a number, not a choice.
- No tutorial, no first-run flag and no onboarding step is in the server code read. Smogon's onboarding is text in chat, on request: "/intro" shows a short box about competitive Pokemon with four links (info.ts introhelp 1821-1822 and the intro block), and "/smogintro" shows a 2-line welcome with two forum links (info.ts 1828-1831).
- The first battle a new user is pointed at is a Random Battle format, where the server generates the team (formats.ts 29-32, "[Gen 9] Random Battle", team random, bestOfDefault true at line 33). An unrated random format exists for play without rating (formats.ts 37-41). Note: the team generator and which format the client shows first are not read.
- The battle log text is a plain grammar in data/text/default.ts: "Battle started between {TRAINER1} and {TRAINER2}!" (line 3), "Go! {FULLNAME}!" for your own switch-in (line 17), "{POKEMON} fainted!" (line 21). Text, not motion. Motion is in the client (not read).

## 2. First fight, first kill, first hit

- The first battle has no build step: a generated random team (formats.ts 32). Fairness comes from the format rules and the generator (data/random-battles, not read), not from a scripted first fight. No rigging is claimed.
- No first-kill title or achievement was found in the server files read.
- First-hit feedback is the log line plus the client animation (client not read). No claim about hit-stop, shake or flash.

## 3. First reward, first loot, first level

- Not in the half I read: XP, loot or level code for first-run users. Showdown's reward is the ladder rating (server/ladders*.ts and sim/ not read). State as "not read", not as absent.

## 4. First hub and services, introduced one at a time

- The hub is the room list and the tournaments page. The tournaments page (smogtours.ts 399-408) opens with a "Welcome!" heading (line 400) and a paragraph that says official tournaments exist and to "sign up if you are eager to participate or check it out if you want to spectate" (line 405 onward).
- Services (calculator, dex links, help) are chat commands, found by typing a slash command. The command set is in server/chat-commands/ (only info.ts read).

## 5. First meaningful choice

- The first real choice is the format (Random Battle, Unrated Random Battle, others in formats.ts). The choice is read from a long list, not guided. No first-choice guidance was found in the server code read.

## 6. Pull-forward hooks at minute 5, 10, 30

- The tournaments page is the only pull-forward in the code read: an official tournament calendar with sign-up (smogtours.ts 399-410).
- The battle timer is a pull-forward only when someone asks for it: "Battle timer is ON: inactive players will automatically lose when time's up" (room-battle.ts 237). It is never forced at the start.
- No visible next goal, rival or rumour in the server code read. Not in the half I read: client menus.

## 7. Tutorial style

- None in code. The help is opt-in: /intro and /smogintro (info.ts 1821-1836). Text is 2 to 4 short lines with external links. Nothing is forced or skippable because nothing is forced.

## 8. Drop-off risks

- Avoided: no forced tutorial, no forced timer, no rating loss for a first game (unrated format exists, formats.ts 37-41), and a fresh guest needs no sign-up to play.
- Has: no progression at all in the server code read, so there is no first-30-minute reward to keep a new player. This is a different design goal from a game with a loot loop.

## 9. Timing as a design rule (the transferable part), and the 5-minute phone look test

Battle timer rule (room-battle.ts): the timer is opt-in. When turned on, each side starts with a bank of 150 s plus a 60 s grace (lines 45, 48), gains 25 s per turn in non-singles or 10 s per turn in singles (line 199), and the server kicks a player whose bank reaches zero. Re-enabling is blocked for 20 s after someone disabled it (line 55, TIMER_COOLDOWN). A disconnected player has 60 s (line 51). The per-turn add is accelerated after turn 100 and 200 only when the timer has no rule set (lines 203, 292-300).

Keep the idea: a bank plus a per-turn add, plus an opt-in with a re-enable cooldown so nobody toggles the clock every turn. Fix nothing: the code is already correct as read.

Frankendom mapping: the fast duels are real time, so a turn bank does not fit the fight loop. It fits any turn-based or menu step in the Pit or the town hall (ledger and trade screens), not the fight itself. Server-verified: the bank is server state, the warning is a client message.

Look test (5 minutes, Dom on phone, no server): one static HTML page at 375 wide. A two-option first screen: "Random first fight" and "Build my own". A bank pill counting down 150 s with +25 per action. A toggle that is disabled for 20 s after turning off. Compare: (a) bank visible vs hidden, (b) random first fight vs build, (c) timer opt-in vs forced.

## Licence and IP note

MIT code: adaptation allowed with attribution. Pokemon names, sprites, data and battle text are third-party IP. Do not carry species names or the battle log templates into Frankendom. Name the rule (a timed bank with an opt-in and cooldown), not the text.

## Gaps

- Not read: client (not in box), sim/ battle engine, data/random-battles generator, server/ladders*.ts, the team validator, data/text beyond lines 1-40, the rest of smogtours.ts, the chat-command set beyond info.ts.
- Half read: server plus data text. The first-90-second screen is "not in the half I read".
- The 150 s and 60 s numbers are from the server constants, not from a measured client.

Best transferable idea: an opt-in bank-style turn timer with a re-enable cooldown, used only in a non-fight step, and a random first team so the first battle needs no build.
