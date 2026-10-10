# endless-sky-endless-sky (onboarding-first-30min, cell OB008)

Donor: `/mnt/frankendom-donors/endless-sky-endless-sky/` | Licence: GPL-3.0-or-later (`copyright` line 9, `Files: *`); data text GPL-3+ per AU018 | C++ engine, plain-text data in `data/*.txt` | Decision: adapt (idea) | Verdict: STRONG | Best transferable idea: a once-per-state help popup that opens only when the player first reaches that state, plus a pre-launch check that names the one missing part and sends the player to fix it.

Checked: Read `data/starts.txt` lines 1-140 (default and deep starts in full, paradise start head; the other starts only by grep). Read `data/human/intro missions.txt` lines 1-132, 211-345, 440-660, 792-845, 925-960, 1394-1421, 1878-1905, 2252-2319 (the default start's mentor chain, the convoy escort, the evade intro, the end-of-intro talk, plus the first mission of the Midgard, Mainsail and Delve chains). Read `data/_ui/help.txt` lines 1-13 and 149-212, and all of `data/_ui/flight checks.txt`. Source read: `source/Panel.cpp` 531-546 (`DoHelp`), `source/MainPanel.cpp` 485-540 (`ShowHelp` trigger order), `source/AI.cpp` 160-175 and 1685-1700 (`IsArmed`, target score), `source/PlayerInfo.cpp` 1240-1250 (header of `FlightCheck` only). Grep only: `source/Account.cpp` (mortgage pay, lines 139-146 and 210-231 read), `source/PlanetPanel.cpp` line 410 and context, `source/BankPanel.cpp`, `source/ShipyardPanel.cpp`, `source/TradingPanel.cpp`, `source/ShopPanel.cpp` (DoHelp call sites). Confidence: high on help, flight check, mortgage and AI target score (code read); medium on pacing (estimated from mission order, not timed).

## Onboarding items (1)-(9)

**(1) First 90 seconds.** The game opens on a text-only loan scene: a bank lobby, a loan officer, an automatic clerk, and a document with a daily payment figure (`data/starts.txt` line 84). The player sees no controls until the shipyard, where they choose one of four affordable hulls. The first control appears when the new ship is flown out of the yard. Nothing is labelled as a tutorial. Five start blocks exist (default, deep, paradise, syndicate, hai space), each with its own money and intro scene.

**(2) First fight, first hit, staging.** There is no tutorial fight. The first hostile contact is a convoy escort (`mission "Intro [1 Interceptor]"`, line 792): the player escorts two freighters, the pirates are two named NPC ships, and the mission text tells a new pilot with no combat record that the win is the convoy surviving, not kills (`data/human/intro missions.txt` line 834). Freighters are slow, so the player waits behind them. A second first contact is an evade mission: the enemy's shields are many times stronger, and the mentor says to leave for hyperspace at once (line 307). So the first encounter is staged to be unwinnable by trading blows, and winnable by positioning and escape. Hit feedback (sparks, shake, sound) was not read in code; the effect frame strips are listed in AU018 only (not read).

**(3) First reward, loot, unlock.** The first payout is a fixed credit chip on completion, handed over by the mentor in a short beat after the first trip (`mission "Intro [0]"`, line 579; `conversation "mission intro end"`). There is no XP level. The first unlock is capacity: the next transport mission shows as "blocked" until the ship has the bunks or cargo space, and the mentor's text says to cancel another job or come back later (`mission "Intro [1 Transport]"`, line 607). Celebration is a line of dialogue, not a screen.

**(4) First hub and services.** The home spaceport holds the bank (loan), the shipyard, the outfitter, the trading centre and a bar where missions appear. The mentor introduces them one at a time by instruction: sell cargo at the trading centre, then buy a map at the outfitter. Each panel shows its help popup the first time it is opened (`source/Panel.cpp` 535-543; `DoHelp("bank")` in `BankPanel.cpp` 65, `DoHelp("trading")` in `TradingPanel.cpp` 87, `DoHelp("shipyard")` in `ShipyardPanel.cpp` 75). Services are introduced by the screen itself, not by a tour.

**(5) First meaningful choice.** Which hull to buy. Three shipyard missions catch bad buys at once: a fighter with no hyperdrive, a drone with no crew space, and a pre-owned Jackal with broken outfits (`mission "Intro [0 Fighter]"`, `"Intro [0 Drone]"`, `"Intro [0 Jackal]"`, lines 485-578). Each one is a conversation that names the problem and offers a fix. The Jackal path becomes a trade of spare mining drones for the ship. The mentor offer is itself a choice: accept, or decline and go it alone.

**(6) Pull-forward hooks.** The debt is the hook. The loan's daily payment sits on the first screen, and a missed payment is reported as a message (`source/Account.cpp` 220-222). The mentor's "blocked" missions are visible locked doors with a stated key (the ship's capacity). The convoy escort is the first rival-pirate beat (named ships). The end-of-intro talk offers four questions (where to avoid pirates, aliens, trade routes, jobs), each a tip that points to the next zone. Minute mapping (about minute 0, minute 5-10, minute 30) is estimated from the order of the mission chain, not timed.

**(7) Tutorial style.** No forced tutorial. The mentor carries the teaching as dialogue with short choice lines. The help popups are shown once per topic, and only when the player reaches that state: `source/MainPanel.cpp` 492-540 checks the control-mode tip, navigation, dead or disabled, stranded, a friendly disabled ship, and multiple ship controls, in that order, and returns after the first one it shows. Text length: the default start conversation is about 645 words; the mentor's intro conversation about 1,200 words across branches; the evade intro about 1,275 words. Those are long for a phone. Every beat has a decline option. Whether a declined mentor is offered again was not traced.

**(8) Drop-off risks it avoids or has.** Avoids: a pre-launch flight check blocks a bad launch and names the missing part in one conversation (`source/PlanetPanel.cpp` 410; `data/_ui/flight checks.txt` has five conversations: no power, no thruster, no steering, overheating, no bunks). Avoids: help appears in the moment of need (the stranded help, `data/_ui/help.txt` line 193). Risks: about 3,700 words of help text in total, and about 1,900 words of intro dialogue (default start plus mentor intro) before the player has a stable income; the bank scene is all text before any control.

**(9) Could be ours at 20-30% resemblance, plus the look test.** Keep the once-per-state help popup and the flight-check gate. Keep the first contact as a convoy escort with a protect-don't-kill win. Keep the evade-first contact as a choice taught by losing a fight. See the look test below.

## Half read and counts

Half read: data (`starts.txt`, mission and conversation text, `_ui` help and flight-check text) plus client-side source (panels, AI target score, account). The server half is not in this engine (single-player); AI is read as the opposing-ship logic.

Counts (counted on the VPS; receipts only for the lines cited): start blocks 5 (`starts.txt`); intro mission blocks 53 in `data/human/intro missions.txt` (default 14 including 3 shipyard guards, Midgard 14, Mainsail 14, Delve 11); help topics 40 (`help "..."` entries in `data/_ui/help.txt`, about 3,700 words); flight-check conversations 5 (`data/_ui/flight checks.txt`, about 710 words). Loan terms: 365 days in the three loan starts that were read (default, deep, syndicate; `starts.txt` lines 32, 107, 186); the hai space start was not read.

## THE RULE BEHIND IT

The rule is the order of teaching by state: (a) a state is entered (stranded, dead, disabled, first panel opened); (b) its help flag is checked; (c) if unset, the popup opens and the flag is set (`source/Panel.cpp` 535-543); (d) the flag persists, so the popup never repeats. A second rule: the first contact with danger is chosen so the player can win by escape or by protecting an NPC, not by a damage race. A third: a bad purchase is a conversation with a fix, not a failure state.

Data fields (designer-tunable; GPL donor, so no donor values are carried over and each is null):

| name | unit | donor value |
|---|---|---|
| help_topic_flag (per screen, once per install) | bool | null |
| debt_daily_payment | credits per day | null |
| debt_term | days | null |
| first_payout | credits | null |
| convoy_size | ships | null |
| evade_enemy_shield_multiple | x player shields | null |
| blocked_mission_capacity_needed | slots | null |

## FOR FRANKENDOM

- Death and recovery (parity row 17, death/respawn): a once-per-state help line the first time the player goes down, saying what happens next. Target file: `src/fight/<module>.ts` (module name not verified; the Frankendom repo was not in my brief).
- First reward (row 18, loot roll and XP award): the first payout is a small named credit line in the town hall, not a fanfare; the ledger is one line.
- Zone population (row 23): the convoy escort is an encounter template with spawn caps and a leash, not a fight in the Pit. Row 4 (aggro, chase, leash) is the rule it needs.
- Many-vs-one (MAX_ATTACKERS = 3): the donor's convoy has two pirate ships; our cap of three attackers applies, and the escort's attackers are the ones that matter for target selection.
- Keep: once-per-state help; the convoy protect-don't-kill win; the evade-first contact; the mentor who is also the first mission giver; the debt on the first screen.
- Change: about 25 words per popup for 375 wide; no multi-screen loan scene before the first control; no long intro conversation before the first hit.
- Server-verified: payouts, debt payments and the flee or escort outcome are server events; the client only plays the line.

## 5-MINUTE LOOK TEST (phone, 375 wide)

Build a three-beat prototype on the existing Pit, no release rows and no lock. Beat 1: a first screen with a debt line and one engage button. Beat 2: the first knockdown shows a once-only help line (25 words max). Beat 3: a convoy-escort variant of the first fight, with a visible keep-the-NPC-alive objective, set next to the normal ring fight. Dom plays each once and says (a) whether he knows what to do within 10 seconds, and (b) which first fight feels like the first 30 minutes. Pass if he can name the next goal in one sentence after the escort run.

## LICENCE / IP

GPL-3.0-or-later for code and data text (copyright file `Files: *`, line 9). Clean-room, shape only: no dialogue, mission names, ship names or numbers are carried over. The ideas (once-per-state help, flight-check gate, escort win, flee-first contact, debt on screen) are categories; our own names and numbers go in. Kept: the state-triggered help pattern and the escort win condition. Changed: all names, copy, numbers and pirate or convoy content. No legal conclusion.

## GAPS

Not read: intro missions lines 133-210 (earth, freighter, ingot), 346-440 (mining intro), 660-792 and 845-925 (transport, freighter and interceptor branches beyond their first missions), 1878-2251 (Delve chain beyond its first mission), `starts.txt` lines 141-375 (paradise, syndicate and hai space bodies), `data/_ui/tooltips.txt`, `messages.txt`, `landing messages.txt`, the body of `PlayerInfo::FlightCheck`, hit feedback code (sparks, shake, sound), and the shipyard and outfitter UI code beyond the DoHelp call lines. Asset facts (effect frame strips, planet sprites, ambient mp3s) come from AU018 and were not checked here. Minute timings are estimates.

## Receipts

`/private/tmp/p2/wave2-haiku/batch3/OB008/receipts.tsv` (ES rows): verified with `verify_receipts.py`, all passing.
