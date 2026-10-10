# Danjb1-rsc-remastered (onboarding first 30 min, OB015)

Donor: /mnt/frankendom-donors/Danjb1-rsc-remastered (VPS, read-only; nothing copied, nothing decompressed into the output). RESTRICTED donor: _RESTRICTED-NOTE.txt line 1 says it has no licence and is derived from the RuneScape Classic client. Study shape only. Inspiration here is category-level only: no coordinates, no constants, no colour codes, no code.

Checked: AU013 audit first (client and data halves, licences, asset inventory). Then the first-run path: rsc-client/src/client/RuneClient.java (start), loading/LoadingScreen.java (whole file, progress stages), login/LoginScreen.java (whole file), game/Game.java (spawn constants and loggedIn), docs/ideas.md (feature list), and a grep of rsc-client/src for tutorial, welcome, intro, starter, new player and experience terms. Data: the ten XML definition files (names and counts only, by tag occurrence; no content quoted). Confidence high for the cited lines.

Half read: client, plus names and counts from the data pack. Server half: not in this tree (there is no server source; the client points its connection at localhost). Data bodies: not decompressed beyond tag counts.

Verdict: PARTIAL. There is no onboarding in the code read. The closest first-run code is the loading, login and spawn path, shown below.

## 1. What the player sees and feels
The window shows a loading bar with a line of text that changes at each stage. The stages are, in order: configuration, media, entities, textures, 3d models, sound effects, and "Starting game". Then a login screen with no fields: one left click connects to the local address and enters the world. There is no account step (the login packet is still a TODO). The world loads a fixed sector and places the player on a fixed tile. There is no welcome line, no tip and no tutorial. The first thing the player does is walk.

## 2. Why it works, or why it does not (own criteria)
- Readable at 375 wide: not assessed as a phone layout (desktop client). The loading text is one short line, which would read well on a phone.
- One signature behaviour: a named loading stage on a bar. The idea is that a slow load reads as progress, not as a hang.
- One signature sound or effect: 37 short sound cues, named by AU013 (click, door, anvil, coins, eat, death, victory, under attack, spell ok, spell fail). Not opened. The naming pattern is a success and a failure cue per verb.
- Could be made ours at 20-30 percent: named loading stages, and a single click to enter with no account step for a demo mode.

## 3. The rule behind it
- Loading is a sequence of progress steps. Each step sets a percentage and a label, then does its work. The steps are 15, 30, 45, 60, 75, 90, then 100 with the last label (LoadingScreen.java 79, 99, 107). The next state is the login screen (line 110).
- Login: any left click calls connect() with a fixed address (LoginScreen.java 32). The login packet is not sent (line 48 TODO).
- Spawn: the logged-in hook creates the player and loads a fixed sector (Game.java 227-232). The sector coordinates are constants (line 43); the start tile is a fixed multiple of the tile size (line 230).
- Data: the ten XML definition files hold roughly 1979 NPC blocks (proxy: drop-table tags), 1314 item blocks, 1189 object blocks and 14 prayer definitions (tag counts; not parsed). None of the ten files matches the words tutorial, starter or intro (case-insensitive count 0 each). So the donor's data carries no starter script.
- Docs (docs/ideas.md, lines 18-20): number-key dialogue, a health and prayer bar on screen, and on-screen XP gains are listed as planned quality-of-life features. Not found in the code read; the XP grep matched only unrelated render names.

## 4. For Frankendom
- Map: the loading stage labels map to our load of 700 zones as data. Name each stage on the bar.
- The fixed spawn is the same shape as a first-zone constant in zone data. No one-off code needed.
- Login without an account step fits a demo or preview mode only. Keep account handling for the real game.
- Keep: named loading stages, one quick entry path, a single first zone as data.
- Change: the donor has no onboarding; our first-30-minute design is the ModernUO one (protection, quest chain, service tour), not this.
- Defects to avoid: the login is a TODO (no real login check). Fix: keep auth in our server, never in the client.

## 5. A 5-minute look test Dom can judge on his phone
Show the loading screen twice on the existing scene at 375 wide: one with a single spinner, one with seven named stages on a bar. Judge whether the named stages make the wait read as progress. Then a second pair: "click to enter" with no name versus a one-line "entering the first zone" card for two seconds. Judge which one feels like a game and which feels like a stub.

## 6. Licence and IP
RESTRICTED: no licence, derived from the RuneScape Classic client. Category-level only. The stage labels, the cue names and the feature list are described in our own words. No copied text, constants or code. Our versions would be original labels and original cues.

## 7. Gaps
- Not in the tree: a server half, any tutorial or intro text, any welcome text, any first-kill or first-loot code path, and any XP readout code.
- Not read: the world and NPC spawns for the start sector; the sound cue bodies; the combat code for first-hit feedback; the render code for the side tab column (already in AU013).
- Walk density, idle animation, death and respawn presentation, loot reveal and boss staging: not read in this donor.
- Half read: client, with names and counts from the data pack. No server half.
