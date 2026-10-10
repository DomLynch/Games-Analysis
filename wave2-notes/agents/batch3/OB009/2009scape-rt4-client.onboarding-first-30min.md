# 2009scape-rt4-client (onboarding-first-30min, OB009)

Donor: 2009scape-rt4-client (/mnt/frankendom-donors/2009scape-rt4-client, VPS). Depth: thin. Half read: client only (Java rt4 client files and two plugin files). The onboarding content (tutorial scripts, guide dialogue, first-fight rules) is server and data side and is not in this half.
Licence: code under GNU AGPL v3 (LICENSE). RESTRICTED donor (_RESTRICTED-NOTE.txt): Jagex-derived RuneScape rev 530 client; study shape and idea only; never copy code or constants. Nothing below quotes a constant, coordinate or colour, and the rectangles used by the client are described by shape only.
Checked: searched the client tree for tutorial, newbie, hint and levelup terms with grep, then opened the matching code (Player.java, Protocol.java, ServerProt.java, the two plugin files). Opened 5 candidate files; the tab-flash renderer and the level-up dialog were not found by grep (see gaps). Confidence high on the gate sites and the hint-arrow message shape; medium on what each gated message class is, since I did not open every gate site.

## 1. What the player sees and feels
On a fresh start the screen is quiet. In the onboarding area the client silently drops a set of social messages (trade requests, trade lines, quick-chat phrases and others) so the first minutes are not full of other players' trade chatter. A hint arrow sits over an NPC or a tile when the server points one out, and a map marker shows where to go. The player does not see the gating; they only see fewer distractions and arrows that point at what the server wants them to touch next.

## 2. Why it works / is striking
- Readable at 375 wide: the hint arrow is a single sprite over a target, with a shape that depends on the target type (actor or coordinate). It does not need text.
- One signature behaviour: onboarding is decided by where the player stands, not by a flag the player sets. The client keeps a flag per position update.
- One signature sound/effect: none read in this half.
- Could be ours at 20-30 percent resemblance: a zone-based mute of social noise during the first 30 minutes, plus a typed hint-arrow message with a target kind.

## 3. The rule behind it
- Zone flag: the client sets an onboarding flag by testing the player's tile against onboarding rectangles (two zones, read from Player.setTutorialIsland; a third rectangle inside them clears the flag). The function is called from Player.java line 292; the method that contains that call was not checked, so "each position update" is not verified. Values are not copied here.
- Message gate: fourteen places in Protocol.java test the flag before showing an incoming message (trade request at line 992, trade line near 1027, quick-chat near 1155, and about eleven more; see the grep list in the JSON). A message is shown only when the flag is off.
- Hint arrow: the server sends HINT_ARROW (ServerProt.java line 101). The handler (Protocol.java 1887-1893) reads one flags byte: slot is the high bits and target type the low bits; then a sprite index; then, for target types 1 and 10, an actor id; for types 2 to 6, a coordinate-style target (the per-type branch was only partly read; type 2 sets fixed fine offsets). Rendering: Player.renderHintArrow (Player.java line 553) asks HintArrowManager for a model (line 559) and draws it over the actor; Player.java line 451 loops over MiniMap.hintMapMarkers for the minimap markers.
- Tab flash: the server sends a tab index (TutFlash, in the server half). The client renderer for it was not found in rt4 (grep for flash finds only chat colour codes in LocalizedText.java lines 36-42). Not read further.

Data fields (names and units only; no donor values, because the donor is restricted):
- onboarding_zone_count | zones | null (two, shape only)
- onboarding_exit_zone_count | zones | null (one, shape only)
- gated_message_classes | sites | null (14 gate sites counted)
- hint_arrow_target_types | types | null (actor and coordinate families)

## 4. For Frankendom
- Map: our 700 zones as data: each zone row carries an onboarding flag (on or off). The client reads the flag from the zone the player stands in, the same way the donor does. The flag is data, not a timer, so zones like the first ring and the starter town both switch on without code.
- Server-verified: the hint arrow is a server message. The client never decides what to point at.
- Parity rows: 14 HUD (hint arrow and minimap marker) is the only row this client half touches. Per ruling the camera, HUD and sound are client-only, so the message gate is a client presentation rule and not a fight rule. The fight itself is not in this half.
- Keep: the zone-based mute of social noise during onboarding; the one hint arrow with a target kind (actor or tile); the mini-map marker for the same target.
- Change: the donor hides messages outright; we would dim or collapse them so a late trade or a rival's shout still shows once. The donor's rectangles are its own; ours come from the zone data row.

## 5. Five-minute look test (Dom, phone, 375 wide)
Two runs, same first 90 seconds:
A. Social noise on (normal chat shows trade lines and quick-chat during the first fight).
B. Social noise off in the onboarding zone, with a single hint arrow over the next target and a minimap marker.
Compare: whether the arrow is found in under 3 seconds; whether the first fight reads clearly with less chatter; whether a rival's message is missed when it matters.

## 6. Licence / IP
- Code: GNU AGPL v3 (LICENSE). Clean-room, shape only. Do not copy the message gate lines, the rectangle logic or the arrow decoder. Recreate the idea from scratch with our own zone data.
- Content: "Jagex-derived RuneScape rev 530 client" (_RESTRICTED-NOTE.txt). Category-level inspiration only; no instance-level look.
- No legal conclusions.

## 7. Gaps
- Read: Player.java (the onboarding flag function and the arrow renderer), Protocol.java (the arrow decoder and the gate sites by line number; about 11 gate bodies not opened one by one), ServerProt.java (HINT_ARROW), LocalizedText.java (for the flash grep), plugin-playground LoginTimer/plugin.kt (lines 1-60; it shows a timer on the report-abuse button, not onboarding). ToggleResizableSD was not read.
- Not read: the tab-flash renderer (not located); the level-up dialog (not in this half); the guide and tutorial text (server half: see 2004Scape-Server); the death and respawn presentation; the loot reveal; walk density; any sound cue for onboarding.
- Paired server for this rev 530 client: not identified in the box. The other donor (2004Scape-Server) is a different server with its own protocol table, so it is not a verified pair for this client.
- Half read: client only.

## Onboarding checklist (per brief items 1-9)
1. First 90 seconds: client side is silent; the server drives the text (see 2004Scape-Server). Client shows the arrow and marker only.
2. First fight and first hit feedback: not in this half.
3. First reward and level: not in this half.
4. First hub and services: not in this half.
5. First meaningful choice: not in this half.
6. Pull-forward hooks: the arrow and marker point at the next target; nothing else found in the client half.
7. Tutorial style: not in this half (server has the text).
8. Drop-off risks: the flag can trap a player who stands in an onboarding tile while expecting normal chat. Not tested. The donor does not show a warning when messages are hidden.
9. Could be ours at 20-30 percent resemblance: section 4 and the look test in section 5.

Also seen (where the donor has it): idle and ambient: none read; death and respawn: none read; loot reveal: none read; walk density: none; readability at 375 wide: the hint arrow is a sprite over the target; no 375-wide layout was checked.
