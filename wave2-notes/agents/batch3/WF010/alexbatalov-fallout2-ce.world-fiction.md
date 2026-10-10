# alexbatalov-fallout2-ce (world-fiction, cell WF010)

Donor: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/` (C++ engine re-implementation; source only) | Licence: Sustainable Use License 1.0 (`LICENSE.md:1`; line 15 limits use to internal business, non-commercial or personal use; no removing notices). Game data is user-supplied and not in the box (AU003, class D). Restricted donor: inspiration is CATEGORY-LEVEL only. Nothing copied; no donor titles, town names or lines reused.

Decision: adapt (idea), with each defect fixed in the sketch.
Verdict: STRONG (stacked endings, gated weighted death card, discovery-gated standing ladder, quest list with strike-through completion, voice-timed subtitles).

Checked: engine half read in full for the functions below. Opened 9 candidate files: `endgame.cc`, `character_editor.cc`, `pipboy.cc`, `message.cc`, `worldmap.cc`, `map.cc`, `reaction.cc`, `scripts.cc`, `game_vars.h`. The AU003 hint pointed at lip-sync and automap, which are not the narrative mechanism. Confidence high on order of operations and on the defects (each one re-read in the source). Data rows (`data/endgame.txt`, `enddeath.txt`, `quests.txt`, `holodisk.txt`, `genrep.txt`, `karmavar.txt`) and all `text/*.msg` string tables are NOT in the box, so their row counts are unknown.
Half read: client/engine (single-player; no server half exists in this donor). Paired data donor in the box: none (AU003 and DC005 found none; the Fallout 1 sibling has the same gap).

## 1. What the player sees and feels
- Ending: when a run closes, the screen fades to black, then one or more panels play in turn. Each panel is a still image or a slow pan, with a narrator voice and subtitles on a solid strip at the bottom, centred. Several panels can play in one ending, because every matching row plays.
- Death: a short narrated card with a voice line, drawn from a weighted pool. The pool is narrowed by what the character has done (zones found, level reached). A timeout also plays its own movie before the card.
- Standing: the character sheet lists each discovered town with one of seven bands, from the lowest to the highest. Undiscovered towns are not listed at all, so the ladder grows as you explore.
- Notes: the Pip-Boy quest list groups quests by place. A quest appears once its display flag reaches its threshold. A completed quest is drawn struck through. Holodisk notes appear once their flag is set, and read in pages of 35 lines.
- At 375 wide: the donor wraps subtitles at 540 px inside a 640 by 480 frame. On a phone the same rule gives about three short lines of about 40 characters, bottom anchored, on the strip.

## 2. Why it works and is striking
- Readable at 375: a card of at most three short lines on a solid strip, bottom anchored. The donor caps a card at 50 lines (`endgame.cc:41`), so the cap is the thing to shrink, not the idea.
- One signature behaviour: stacking. The same engine writes different endings from data rows, so new endings need rows, not code.
- One signature sound: a narrator clip per card, with text timed to the clip.
- Could be made ours at 20-30 percent resemblance: a three-line zone story card, a death card from a weighted pool, a seven-band standing ladder. All ours.
- Criteria: one beat per card (yes), one signature behaviour (stacking), one sound (voice clip per card), resemblance (yes).

## 3. The rule behind it (numbers as designer data fields)

### 3a. Stacked endings (rows in data order)
- Order: for each row in file order, show it if its flag equals its value (`endgame.cc:217-220`). There is no break, so several rows show. Each row carries: flag id, value, panel id, narrator clip name, and a direction for panning scenes (default 1; panel id 327 is the donor's pan case, `endgame.cc:221`). Rows come from `data/endgame.txt` (`endgame.cc:904`).
- Data fields: `flag` (id), `value` (int), `panel` (id), `clip` (name), `direction` (1 or -1, pan only), `line_key` (text key). Donor values: not in box.

### 3b. Subtitle timing from the voice
- Order: the clip duration is shared over the whole text in proportion to character count (`endgame.cc:688`). Each line's time is its characters times that rate, summed (`endgame.cc:698`). Without a clip, the rate is 0.08 seconds per character (`endgame.cc:690`), about 12.5 characters a second.
- Data fields: `fallback_s_per_char` (unit seconds), `line_cap` (unit lines), `wrap_px` (unit px, ours to test at 375). Donor values withheld: the donor is under SUL, so no donor numbers are carried over.

### 3c. Gated, weighted death card (fix the index)
- Order: each row is checked. Disabled if its flag is at or past its value (`endgame.cc:1186`), if the zone-known or zone-unknown gate fails, or if the level is below its minimum (`endgame.cc:1203`). Enabled rows are flagged (`endgame.cc:1207`) and add their weight to a total (`endgame.cc:1209`). A roll runs inclusive from 0 to the total (`endgame.cc:1147`). Enabled rows are then walked, adding weight until the running sum reaches the roll (`endgame.cc:1153-1158`). A special flag forces one fixed row (`endgame.cc:1137`).
- Data fields: `weight` (percent, unit percent), `flag_below` (flag, value), `zone_known` / `zone_not_known` (zone id), `min_level` (level), `line_key`. Donor values: not in box.
- Defect and fix: the row index only moves on enabled rows (`endgame.cc:1158`), but is then used as an index into the whole list (`endgame.cc:1163`). A disabled row before the chosen one shifts the pick onto the wrong row. With no enabled row, the pick falls back to row 0, which may be disabled. Fix: return the chosen row itself (sketch). The idea stays.
- Defect and fix: the forced row is a fixed index, 12 (`endgame.cc:1137`), not checked against the pool. Fix: name the forced card by key.
- Sketch typechecks (VPS, `tsc --strict`): `WF010/alexbatalov-fallout2-ce.world-fiction.sketch.ts`.

### 3d. Standing ladder with a discovery gate
- Order: for each tracked zone group, the band is shown only if the zone is discovered (`character_editor.cc:4570`). The band is chosen from the standing value: below -30, below -15, below 0, exactly 0, below 15, below 30, otherwise the top band (`character_editor.cc:4586-4599`). That gives seven bands, each a message id.
- Counts: 23 standing variables are declared (`game_vars.h:54-73`, plus three more further down). The character sheet table holds 19 (`character_editor.cc:105`). Four are not in the table and have no reader in any `.cc` (`game_vars.h:65, 67, 69, 635`). A data script may read them (not in box): not in the half I read.
- Generic reputation: a descending threshold list, first threshold met wins (`character_editor.cc:4542`, sort `:7159`). Loaded from `data/genrep.txt` (`:7088`).
- Scripted penalty: one movie branch subtracts 15 from one town (`scripts.cc:488`). Data field: `penalty` (points).
- Data fields: `standing` (int, unit points), `bands` (list of thresholds, unit points; ours to set), `zone` (id), `discovered` (bool). Donor values withheld (SUL).

### 3e. Quest list and notes
- Order: a quest is listed when its display threshold is at or below its flag (`pipboy.cc:1237`). It is drawn struck through when its flag reaches the completed threshold (`pipboy.cc:1181`). A note (holodisk) is listed when its flag is non-zero (`pipboy.cc:1409`). A note's text is a run of message ids ended by a sentinel string (`pipboy.cc:1288`), paged at 35 lines (`pipboy.cc:62`).
- Data fields: quest `location` (id), `description` (id), `flag`, `display_threshold`, `completed_threshold`; note `flag`, `name` (id), `text_start` (id), `lines_per_page` (unit lines; ours to test at 375, likely 5-6). Donor values withheld (SUL).
- Defect and fix: the page-search loop tests `holodiskTextId < holodiskTextId + 500`, which is always true, so the 500 bound never applies (`pipboy.cc:1308`). Fix: compare with the start plus 500. The list also reads one row past the end on the last quest (`pipboy.cc:1258`; the donor's own FIXME). Fix: bound check.
- Defect and fix: quests sort by location only (`pipboy.cc:2521`, `qsort` at `:2490`), and `qsort` is not stable, so the order within a place is not kept. Fix: tie-break on data row order.

### 3f. Names and text
- City names are a table: message id equals a base (1500) plus the area index (`map.cc:579`, `worldmap.cc:5571`). Naming is a lookup keyed by place, not a generator.
- Defect and fix: the area-name copy takes 40 characters and sets no terminator (`worldmap.cc:5572`). Fix: bounded copy with a terminator.
- Gender markup: a text can carry a marked choice (male side, a separator, female side) that is resolved when a gender option is on (`message.cc:609-612`). Off by default (sfall flag). Idea for us: inline variant tokens for rumour and sign text, resolved on the client from one character field (the ledger). Data fields: `variant_token`, `gender` (value).
- Message lists are triplets of number, audio name and text (`message.cc:252-257`), in a language folder with an English fallback (`message.cc:228-234`).

## 4. For Frankendom
- 700 zones as data: each zone's story is up to three rows `{zone, flag, value, line_key, order}`. Rows stack in data order, so a zone can say different things as the ledger changes. Cap at three rows per card on the phone.
- 100 Pit characters reused across zones: the standing ladder is per faction group, not per zone, with a discovery gate. The player's generic reputation uses one descending threshold list. A rumour line can use a variant token resolved from one character field.
- Many-vs-one: the death card's pick is a server decision. Witness reports (see OpenGothic note) feed the hate list only; MAX_ATTACKERS stays 3.
- Server-verified events: the pick, the flag change and the standing change happen on the server; the client shows the card and the row id it was sent. The client never picks.
- Keep: stacked rows; the weighted gated pick; discovery-gated bands; voice-timed lines on a solid strip; quest list with strike-through completion; note pages with an end sentinel.
- Change: 640 by 480 layout becomes a 375 phone layout; the death card is a card, not a movie; no 40-character name copy; no donor names; our band words; our fallback timing, tuned by test; the forced card named by key.

## 5. Five-minute look test (Dom on his phone)
- Build a debug zone story: three stacked rows at 375 wide, each a line on a solid strip, bottom anchored, timed at the 0.08 s per character fallback. Compare with the same text as one line.
- Build a death card from a pool of three rows with weights 50, 30 and 20, one row gated on minimum level. Die ten times in the test zone; a disabled row must never show, and the picks should match the weights roughly.
- Show the seven-band standing ladder for three discovered zones and one undiscovered zone (the undiscovered one must be absent).
- Target file: `src/fight/death-card.ts` (new). Parity row 17 (death and respawn).

## 6. Gaps
- Not in box: `data/endgame.txt`, `enddeath.txt`, `quests.txt`, `holodisk.txt`, `genrep.txt`, `karmavar.txt`, all `text/*.msg`, voice clips, art, and the data pack. Counts of endings, death rows, quests and notes are unknown and are not guessed.
- Read: engine half for the functions cited. Not read: `credits.cc` body (only the scroll step constant, 38 ms per pixel row, `credits.cc:28`), `worldmap.cc` beyond the name lookup, `dialog.cc`, the karma title body, the full Pip-Boy draw path (only the quest and note functions).
- Gap against the rulings: no parity row 1-22 covers zone narration or standing. Death card (row 17) is the closest. Needs a Lead ruling.
- Reuse tag: not checked against Frankendom PRs (no repo access in this task).
- Brief rule served: keep-the-idea, fix-the-defect; no mechanism rejected for a defect alone.

## Counts (from the code, data not in box)
- City enum: 49 named entries plus a count sentinel (`worldmap.h:26-77`); 13 special-encounter entries; 4 random biome entries.
- Standing variables: 23 declared; 19 displayed; 4 with no `.cc` reader.
- Karma flags: 9. Endgame movie flags: 18.
- Standing bands: 7. Holodisk page: 35 lines. Subtitle cap: 50 lines.
