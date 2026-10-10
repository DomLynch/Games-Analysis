# OpenGothic (world-fiction, cell WF010)

Donor: `/mnt/frankendom-donors/OpenGothic/common/` (C++ engine; a community re-implementation of Gothic 2: Night of the Raven, `README.md:2`; game data and scripts are not in the box, `README.md:25`) | Licence: MIT (`LICENSE:1`, permission grant at `LICENSE:5`, copyright line `LICENSE:3`, "Copyright (c) 2019 Try"). Game assets not in the box, so inspiration stays at category level (AU039 class C). No donor names, dialogue or textures reused.

Decision: adapt (idea), with each defect fixed in the sketch.
Verdict: STRONG (deed queue with one-tick delivery and per-deed range; quest journal with four statuses; chapter card with a pause and a queue; document pages with a map cursor).

Checked: engine half read for the files and functions cited. Opened 10 candidate files: `world/worldobjects.cpp`, `world/objects/npc.cpp`, `game/gamescript.cpp`, `game/questlog.h`, `game/questlog.cpp`, `ui/chapterscreen.cpp`, `ui/documentmenu.cpp`, `gothic.cpp`, `game/constants.h`, `world/perceptionmsg.h`. The hint files (AU039, DC040) point at water, sky and music; those are not this topic. Confidence high on the order of operations read; the reactions each deed triggers live in script (not in the box), so the reaction set is not known.
Half read: client/engine (single-player; no server half). Paired data donor in the box: none (AU039 found none).

## 1. What the player sees and feels
- A deed in view of others (a fight, a theft, a defeat, a body): nearby NPCs react a beat later. The near ones turn and speak; far ones do nothing. On a phone the reaction is a line or a stance change, visible within about a second of the deed, not on the same frame.
- Chapter card: a full-screen still, a title near the top, a subtitle at the bottom, a stinger when it opens. The world pauses. It waits until no dialogue runs, then closes after its set time or on Escape.
- Document: a note with pages. A map page draws the player as a small cursor on the map, turned to the player's heading.
- Journal: two sections (missions and notes). Each entry has a status and a list of appended lines.
- Readability at 375 wide: a chapter card reads as a title and one subtitle. A witness line is one short sentence. The map cursor is a small sprite and needs a larger size on a phone.

## 2. Why it works and is striking
- Readable beat: a witness turning toward the player after a deed is a clear beat at phone size.
- One signature behaviour: the delay. The witness reacts after the deed, one tick later, so the world seems to notice.
- One signature sound: the stinger played when a chapter card opens (`ui/chapterscreen.cpp:25`).
- Could be made ours at 20-30 percent resemblance: a witness queue with per-deed ranges (we use 3-6 deed kinds, not 32), a queued chapter card, a two-section journal with four statuses.
- Criteria: beat (yes), signature behaviour (delayed witness), sound (stinger), resemblance (yes).

## 3. The rule behind it (numbers as designer data fields)

### 3a. Deed queue with one-tick delivery
- Order: a deed is pushed onto a passive queue during the tick (`world/worldobjects.cpp:922`). At the start of the next tick the queue is moved out and cleared (`:153`). Each near NPC in normal AI state (`:259`) takes each queued deed (`:260-261`). The actor never reports its own deed (`:951`). The NPC is skipped unless it is in normal AI state (`:948`). The squared distance must be within the deed's range (`:957`, range read at `:955`). Then the deed goes to the NPC's perception (`:971`), which runs script reactions (not in box).
- Cadence: each NPC runs its own perception only when its due time has arrived (`:255`). The next due time is now plus the NPC's perception time, clamped to at least one tick (`npc.cpp:4229`, `:4168`).
- Range: a script may set a range per deed kind (`gamescript.cpp:3319`). Unset falls back to the NPC's own sense range (`gamescript.cpp:83`).
- Deed kinds: 32 perception types numbered 1 to 32, plus a none slot (`game/constants.h:400-432`). Observed names, by group: assess player, enemy, body and magic; crime (murder, theft, removing a weapon, catching a thief); fight (fight sound, others' damage, defeat, threat, warn); movement (enter room, quiet sound, use a mob).
- Data fields: `deed_kind` (enum), `range` (world units, -1 = unset), `sense_range` per NPC (world units), `perception_time` per NPC (ticks, minimum 1), `quiet` (bool per deed), `hears` (bool per NPC), `delivery_delay` (fixed 1 tick).
- Defect and fix: the range lookup treats 0 as unset (`gamescript.cpp:84`, test `rr>0`). Fix: use -1 as the unset value and honour 0 (sketch).
- Design decision: the hearing check for quiet deeds is commented out (`worldobjects.cpp:963-966`, the note says it is vanilla behaviour). Keep the gate ON for us (quiet deeds need a hearing witness). This is our choice, not a defect in the donor's design.
- Sketch typechecks (VPS, `tsc --strict`): `WF010/OpenGothic.world-fiction.sketch.ts`.

### 3b. Quest journal
- Two sections (mission = 0, note = 1), four statuses (running = 1, success = 2, failed = 3, obsolete = 4) (`game/questlog.h:13-23`).
- Script bindings: create a topic (`gamescript.cpp:3274`), set status (`:3279`), add an entry (`:3287`).
- Order: a status set on an unknown topic is ignored when the status is obsolete (`questlog.cpp:19`). An entry on an unknown topic is dropped without a message (`questlog.cpp:26-27`).
- Data fields: `topic_key` (string), `section` (0 mission, 1 note), `status` (1-4), `entry_text` (string), appended in order.
- Defect and fix: silent drop of entries on an unknown topic. Fix: create the topic in the note section on first entry, or log a warning.
- Save and load keep the whole list (`questlog.cpp:37`, `:45`). Not read beyond that.

### 3c. Chapter card
- Show fields: title, subtitle, image, sound, time (`gothic.cpp:1043-1046`; the time unit is whatever the script passes, not checked).
- Flow: the call stores the card and sets a pending flag (`gothic.cpp:1044`). The tick shows it only when no dialogue runs (`gothic.cpp:601-602`). Showing it pauses the game (`ui/chapterscreen.cpp:18`), starts a timer from the time (`:23`), and plays the stinger (`:25`). Layout: title at the top with an offset, subtitle at the bottom (`:46-54`). Escape closes it (`:71-75`).
- Defect and fix: one pending slot. A second call before the dialogue ends overwrites the first (`gothic.cpp:1046`). Fix: a short queue of cards.
- Defect and fix: a missing image leaves the card active and paused with nothing drawn (`chapterscreen.cpp:16-18`, `:30`). Fix: do not pause when the image failed to load.
- Data fields: `title`, `subtitle`, `image`, `stinger` (name), `time` (donor unit: script value, to be set for ours), `pause` (bool).

### 3d. Document pages and map cursor
- Fit factor: `k = min(1, (800 + margin) / page width)` (`ui/documentmenu.cpp:62`). Page width is `k x scale x image width` (`:85`). Margins and font use `scale` alone (`:80`, `:94`), so when `k` is below 1 the text keeps full margins and full font on a shrunk page. Defect and fix: scale margins and font by `k` too.
- Map cursor: the player's world position is mapped from the world bounds to the page (`:102`), then the cursor is drawn turned by the heading (`:111`).
- Data fields: `pages` (text, image, margins, font, flags), `world_bounds` (x, y, w, h, world units), `show_player` (bool), `margin` (px, scaled).

## 4. For Frankendom
- Witness queue on the server: a kill, a theft or a fallen captain is a server deed. It is queued during the tick and delivered at the next tick to creatures within range for that deed kind. A witness adds to the hate list (engine logic in src/fight) and does not add an attacker. MAX_ATTACKERS stays 3.
- 700 zones as data: each zone sets its own deed ranges and sense ranges as data, so a quiet zone and a busy zone differ by numbers only.
- Chapter card for zone entry and boss intro (name card plus stinger), queued until the current fight ends. The donor's "no dialogue" gate maps to our "not in a fight" gate. Never pauses a fight.
- Journal on the phone: missions and notes with four statuses. The status lives on the server (one ledger); the client shows it.
- Keep: one-tick delivery; per-deed range with a sense-range fallback; per-NPC cadence; queued card; two-section journal; note pages with a map cursor.
- Change: our deed kinds (about 6, not 32); script reactions replaced by our data rows; the hearing gate on; the defects above fixed; no donor names, dialogue or textures.

## 5. Five-minute look test (Dom on his phone)
- In the test zone, kill one creature in view of two others, one at about 5 m and one at about 12 m. The nearer one should turn and show a line one beat later; the far one should do nothing. Judge whether the beat reads as "noticed".
- Chapter card at 375 wide: title at the top, subtitle at the bottom, a three-second pause and a stinger. Compare with a plain subtitle line that does not pause.
- Target file: `src/fight/witness.ts` (new). Parity row 4 (fight loop: aggro, chase, leash). Sub-line for the one-tick delay: row 18 (server tick: fixed step, input intake, per-tick NPC budget).

## 6. Gaps
- Not in box: the Gothic 2 scripts (the reaction to each deed), world and dialogue data, all textures, music and sound, and the data pack. The reaction set and its counts are unknown and not guessed.
- Read: the engine files named above. Not read: `world/objects/npc.cpp` beyond lines 4167-4264, `common/ui/gamemenu.cpp` (journal screen UI), `documentmenu.cpp` tick and input paths beyond the paint path, `game/gamescript.cpp` beyond the bindings cited, the shader folder, and the `spacer` editor folder.
- Empty submodule dirs (AU039): ZenKit has no entries in the box, so the format library is not read.
- Gap against the rulings: witness delivery maps to row 4 with row 18 as a sub-line. No parity row covers chapter cards or the journal; the HUD row (14) is the closest for the card, and needs a Lead ruling.
- Reuse tag: not checked against Frankendom PRs (no repo access in this task).
- Brief rule served: keep-the-idea, fix-the-defect; the hearing gate is a stated design choice, not a rejection.

## Counts (from the code, data not in box)
- Perception types: 32 numbered 1 to 32, plus a none slot (33 slots including the count).
- Quest sections: 2. Quest statuses: 4. Chapter pending slots: 1.
