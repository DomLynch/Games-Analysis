# evennia-evennia: world-fiction feel note (WF003)

Read over ssh from the VPS donor tree only (read-only, nothing copied or run). Half read: BOTH. Data: `tutorials/tutorial_world/build.ev` (room, sign, tomb, obelisk and ghost text, read in full for the story rooms), `tutorials/evadventure/random_tables.py` (tables counted with an AST parse, names not reproduced). Server: `tutorials/tutorial_world/objects.py` (Obelisk, TutorialReadable), `tutorials/tutorial_world/rooms.py` (TeleportRoom), `tutorials/talking_npc/talking_npc.py`. Client half (`evennia/web/static/webclient/js`) not read.
Audit used first: AU019 (`/private/tmp/p2/wave2-haiku/batch3/AU019/evennia-evennia.assets.json`). Licence: BSD 3-Clause (`LICENSE.txt` line 3, "Copyright 2012- Griatch"). Contrib text falls under the BSD contributions rule (`docs/source/Licensing.md`).

## 1. What the player sees and feels
Walking into the ruin, the world speaks in short cards. A wooden sign has a warning title, and under it a second line carved in a rougher hand that contradicts the official voice and gives the hint. A ghost has two text states: alive it is a long, shifting description; dead it is a three-line howl that says it will return. At the obelisk, each look shows one carved scene picked at random from five (repeats are possible), so the player has to remember the last one they saw. Then five tomb doorways each show a mural of the same woman in a different scene, and the player walks into the one that matches what they remember. On a 375-wide phone each mural is one card of one to five short lines, which fits without scrolling.

## 2. Why it works / is striking
- Readable beat at 375 wide: yes. Murals are 1 to 5 source lines (blue-bird door 1 at build.ev line 1035; queen 3 at 1126-1128; horse 4 at 1079-1082; shield 4 at 1172-1175; hero 5 at 1219-1223). One card per door.
- One signature behaviour: the obelisk rerolls its carved scene on every look and stores the scene it showed on the viewer. The door then checks that stored key. The world remembers what you looked at.
- One signature sound or effect: none in the text (the only audio file is a web-client notification, not used here; not read).
- Could be made ours at 20-30 percent resemblance: yes. "A landmark shows a random clue on each look, the player's last clue is stored, and a gate checks it" transfers directly to a fight-zone rune wall or a Pit gate. The murals do not transfer; the figure-recurs-across-five-doors pattern does.

## 3. The rule behind it
A. Clue roll. On each look the obelisk picks one index uniformly from its list of descriptions (`tutorials/tutorial_world/objects.py` line 244, `random.randint(0, len(descs) - 1)`). The list has 5 entries (build.ev line 829, `@set obelisk/puzzle_descs`).
B. Clue store. The index is written onto the viewer's character (objects.py line 254, `caller.db.puzzle_clue = clueindex`). The last look wins.
C. Gate check. Each tomb is a TeleportRoom with its own `puzzle_value` (0 to 4, one per tomb). The check is equality (`tutorials/tutorial_world/rooms.py` line 1142). Match goes to the treasure room (`success_teleport_to`, build.ev line 1043); mismatch goes to the dark cell (`failure_teleport_to`, build.ev line 1041). All five tombs use the same two destinations (pairs at build.ev lines 1041/1043, 1088/1090, 1134/1136, 1181/1183, 1229/1231).
D. Death. A defeated player is sent to the dark cell by the ghost (build.ev line 858, `send_defeated_to`), with a defeat message that says the world turns black.
E. Sign and detail. A readable object carries one text attribute (`readable_text`, build.ev line 272). The room detail command (`CmdTutorialSetDetail`, rooms.py line 94) attaches extra text to keywords without making objects.
F. Names and trait cards (EvAdventure). `random_tables.py` holds `chargen_tables` (line 8): 10 trait slots of 20 entries each (physique, face, skin, hair, clothing, virtue, vice, speech, background, misfortune), plus 4 band tables (alignment 3 bands, armour 4, helmet or shield 4, starting weapon 3) and 2 gear lists of 20. A given-name list (`"name"`, 282 entries, all single capitalised words, no surnames, all unique). Counts from an AST parse, not a receipt.
G. Reaction band. A 5-band table keyed by range from 2 to 12 (`reactions`, random_tables.py line 604): Hostile, Unfriendly, Unsure, Talkative, Helpful. The roll method is in combat or chargen code that was not read.
H. Talking NPC. Five menu nodes (start, three info nodes, END), with 2 to 3 options each; the three info nodes loop back to each other (`talking_npc/talking_npc.py` lines 32-80). Thin: a demo, not a rumour system.

Data fields (designer-tunable; donor values are allowed because the donor is BSD-3):
- clue_count: unit count; donor value 5 (obelisk list).
- door_value: unit index 0..N-1; donor value 0 to 4 (one per tomb).
- clue_store: per-character, last-look key; no donor value (one attribute).
- gate_match: rule equality; no number.
- success_zone and failure_zone: zone ids; donor values tut#15 and tut#08.
- death_zone: zone id; donor value tut#08.
- trait_slots: unit count; donor value 10 (chargen_tables).
- trait_entries_per_slot: unit count; donor value 20.
- reaction_bands: unit count; donor value 5.

## 4. For Frankendom
Shape maps well. 700 zones as data: each zone carries its own clue set (2 to 5 one-card scenes) and its own door set; the same door rule (stored clue, equality gate, known failure place) is reused across zones, so the 100 Pit characters can appear behind doors in many zones without new code. Server-verified: the clue roll and the stored key must live on the server, on the one character ledger. The client only draws the card. A refresh must not reroll the clue: seed the roll per character, zone and day, not per client call.
Keep: one card per clue, a stored last-look key, an equality gate, a failure that is a place the player can read, and a death text in a second state (alive or dead).
Change: their failure teleports to a dark cell and their clue reroll is client-side (`return_appearance`). Ours: failure costs something legible (a 3-attacker fight at the door, or a lost turn), and the roll is server-side. Their two-voice sign (official title plus rough carved line) is a good rumour pattern for zone signs: one line from the authority, one line from a player or creature, both short.
Ruling fit: row 17 (death and respawn presentation), row 19 (fight record: the clue store is the same kind of state), row 20 and 21 (catalogue fields for the card text and the door values). No engine row changes.

## 5. A 5-minute look test
Build one wall in one zone. Five door cards on one screen, one of them correct for the last clue seen. Look at the wall, step back, look again: the clue card changes. Compare two versions: (a) murals of 4 to 5 lines, (b) murals of 1 line. On the phone, time how long it takes to read the card and pick a door. Judge: does a 1-line card feel like a clue, and does a wrong door feel fair (a message, no death)? Second compare: the two-voice sign with and without the rough second line.

## 6. Licence and IP
Code: BSD 3-Clause (`LICENSE.txt`). Contributions in `evennia/contrib` are under the same licence (`docs/source/Licensing.md`). Knave-derived EvAdventure tables are credited in the README as Creative Commons Attribution (`tutorials/evadventure/README.md` line 21, "released under the Creative Commons Attribution"). That is the README's statement, not checked against Knave. Usable here with attribution. Recreate murals and clues as our own; do not copy the tomb texts, the names list or the trait words. The logo licence points to a missing `evennia/LICENCE`; the documentation screenshot and webfont have no licence line (class C in the audit).

## 7. Gaps
Not read: the web client JavaScript (21 files) and CSS; 803 documentation markdown files (only `docs/source/Licensing.md` read); `evadventure/combat_*.py` bodies; `chargen.py`, `shops.py`, `quests.py` bodies (quests.py read only its module docstring); `tutorial_world/mob.py` bodies and `tests.py`; the random_tables name list values (counted, not read or reproduced); `intro_menu.py`; `mirror`, `red_button` and `bodyfunctions` contribs. Half read: server and data both, client not read. No pair for this donor is in the box. Idle and ambient behaviour: not seen beyond the ghost's two states. Loot ceremony, walk density, boss staging: not in this donor's world text. Readability at 375 wide: judged from the source text lengths only, not rendered.
