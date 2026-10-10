# ModernUO (world-fiction, cell WF006)

Donor: ModernUO. Code licence GPL-3.0 (LICENSE line 1; no MIT/Apache/BSD donor values may be used). Content: names, town, faction, sign and rumour text come from the emulated game; rights status unknown (AU034). Shape only.

Checked: TownCrier.cs (full), PlayerBarkeeper.cs (rumour slots and speech), Engines/Factions/Core/Town.cs (income, capture, upkeep, finance list), Engines/Factions/Instances (4 factions, 8 towns), NameList.cs and Distribution/Data/names.json (counts), SignParser.cs, SubtextSign.cs and Distribution/Data/signs.cfg, Projects/Server/Regions/Region.cs (compare, parent), Distribution/Data/regions.json (counts). Confidence: high on the code paths above. Medium on design intent (no comments say why). Half read: server and data. Client half (localised text for labels, faction titles) is not in the box.

## 1. What the player sees and feels
Walk into a town square and a town crier calls out a short bulletin: one line overhead at a time, a few seconds apart, after a fixed call line. Say the news keyword within reach and the same crier starts a bulletin on demand. Inside a tavern the barkeeper keeps three rumour slots; when a player says the keyword, the matching rumour hangs over the barkeeper's head. Town signs carry a short label that appears on single click. Each of eight towns sits under one of four factions; a captured town gets an announcement, the capturing faction gets a silver bonus, and a town that runs out of silver quietly loses vendors and guards. At 375 wide, the story is three short overhead lines in sequence, not a text block.

## 2. Why it works or is striking
- Readable beat: each line lands on its own beat, so a three-line story reads as three steps.
- Signature behaviour: one crier, two triggers (a timer and a keyword), same content.
- Signature effect: a fixed call line ("Hear ye") before any bulletin. Cheap, and it tells the player to look up.
- Could be made ours at 20-30 percent resemblance: a square crier with a bulletin queue, a tavern with keyword rumours, a town that loses its hirelings when broke. The faction names, town names and label text are the donor's and must not carry over.

## 3. The rule behind it
Rule A, timed bulletin queue (TownCrier.cs). A bulletin is an ordered list of lines plus an expiry. Duration is clamped between 0 and 365 days (line 101). The crier's auto-shout timer starts 5 s after the first bulletin is added, then repeats every 60 s (line 430). Each shout picks a bulletin; when both a per-crier list and the global list exist, a coin flip chooses which (line 386). Lines: the first at 1 s, then one every 3 s (lines 445-446). One bulletin per crier at a time (the _newsTimer guard). Expired bulletins are dropped when read.
Rule B, rumour slots (PlayerBarkeeper.cs). Three slots (line 127). Each slot has a message and a keyword. Keyword match is case-insensitive (line 276). Speech range is 3 tiles (line 234).
Rule C, town economy (Town.cs). Daily income = base x (100 + tax percent) / 100 (line 109). Income period is one day (line 14). Tax may change every 12 h (line 13). Capture of an unowned town pays the silver bonus to the new owner (lines 11, 413). If silver plus net flow would go below zero, random vendors or guards are deleted until it does not (line 246; the finance list is vendors then guards, lines 261-275).
Rule D, names (NameList.cs, names.json). Flat pools keyed by a type string. 28 pools, 5,509 names in total (counts from names.json). A name is a uniform random element of its pool (NameList.cs line 32). No syllable or morpheme grammar: the grammar is the pool key, for example one pool per culture and gender, and separate pools for creature kinds.
Rule E, faction and town map (Instances). 4 factions, 8 towns. Each faction has 10 rank rows (rank, required value, max wearables, title id; Minax.cs line 59) and 4 guard types as data (Minax.cs line 72). regions.json has 116 TownRegion rows; Town.FromRegion (Town.cs line 145) maps a region to its town.
Rule F, sign labels (signs.cfg, SignParser.cs). 509 rows: map code, item id, x, y, z, label id (signs.cfg line 1). Map code 0 places the row on both Britannia facets, so one row becomes two placements (SignParser.cs lines 26 onward). The label is a text id, not text. 376 distinct label ids and 86 distinct item ids in the file (counted).
Rule G, region nesting (Region.cs). A child region inherits its parent's priority (line 176). Overlap order: priority difference first, then nesting depth (line 252). regions.json: 398 rows; Felucca 107, Trammel 145, Ilshenar 72, Malas 20, Tokuno 5, TerMur 49. Parent key on 134 rows, Music on 93, Entrance on 56 (counted).

Data fields (designer-tunable; donor value null because the donor is GPL):
- news.first_line_delay | s | null. Our start: 1.0
- news.line_gap | s | null. Our start: 2.5
- news.repeat_interval | s | null. Our start: 90
- news.entry_max | days | null. Our start: 7 (clamp in the entry, not in the crier)
- news.keyword_range | tiles | null. Our start: 4
- rumour.slots | count | null. Our start: 3
- rumour.keyword_range | tiles | null. Our start: 3
- town.daily_income | silver per day | null. Our start: set by Economy lane
- town.capture_bonus | silver | null. Our start: set by Economy lane
- town.tax_change_period | hours | null. Our start: 12
- town.broke_policy | enum (drop random hireling) | null. Ours: warn one day, then drop
- names.pool_key | string | null
- sign.label_ref | text id | null
- region.priority | integer | null

## 4. For Frankendom
- 700 zones as data: a zone row can carry its bulletin lines, sign labels and rumour slots as text ids. One crier model, reused across zones (the 100 Pit characters can wear the crier role), differs by zone data only.
- Server-verified events: the bulletin is a server event with an expiry. The server picks the bulletin and owns the clock; the client only shows the lines at the cadence the event sends. This matches the "server-verified events driving client presentation" rule.
- Many-vs-one: none of this is combat. It belongs to walk density: a crier, a rumour and a sign are the things seen every few minutes of walking.
- Faction map: town control maps onto zone ownership on one ledger. Capture changes the owner and writes one ledger entry (the bonus). Upkeep deletes hirelings, which is a row 23 zone-population consequence (spawn cap falls when a zone goes broke). Keep the consequence visible: a warning before anything is removed.
- Naming: flat pools keyed by culture or creature kind keep 100 Pit characters distinct with no runtime grammar. Keep it flat until a grammar is needed.
- Parity rows: row 14 (HUD) for the bulletin overlay; row 23 for hireling and spawn consequence; server tick (row 18 sub-line) for the bulletin timer. Keep it server-side, never a client timer.
- Change: each crier owns its own timers here. Ours must be one server schedule, not one timer per NPC. Donor timers are wall clock; ours are tick counts.
- Keep: one line per beat, keyword recall, fixed call line, expiry on each bulletin, region parent priority for dungeon-inside-zone nesting.

Defects found in the donor (keep the idea, fix the defect):
- A zero-length bulletin is accepted by the prompt (TownCrierDurationPrompt, TimeSpan.TryParse then no minimum) and expires at once, so it is never shown and the GM is not told. Fix: reject durations of zero with a message.
- No cap on lines per bulletin or characters per line. Fix: cap at 3 lines and about 40 characters each for 375 wide.
- Broke town deletes random hirelings with no warning (line 246). Fix: warn the sheriff one day before, then remove the chosen hireling.

## 5. Five-minute look test (Dom, on the phone)
Build one flag in the existing zone scene: one square crier from the Pit roster with a three-line bulletin. Show three versions and compare on a 375-wide phone:
A. one line per beat, 2.5 s apart (proposed)
B. one line per beat, 1.0 s apart
C. all three lines at once (control)
Judge: does A read as a story, does the crier look like he is calling, can you read each line in one glance. Second check: one tavern rumour and one sign label with the same content, so Dom can see keyword recall and single-click label side by side.

## 6. Licence and IP
Code: GPL-3.0 (LICENSE). Clean-room, shape only; do not adapt code. Content: names, faction and town text, sign labels and rumour text are from the emulated game with rights status unknown. Keep category level only: "a crier who calls a bulletin in three lines", "four rival houses over eight towns", "a tavern with three keyword rumours". Do not copy any name, title, label or faction text from the donor.

## 7. Gaps
- Not read: client localisation (label and faction text ids are not resolvable in the box), Projects/Server beyond Region.cs, Heartwood quest body (one excerpt only, 3908 lines), Add_Static in SignParser.cs (lines 80 onward), Election.cs, Generator.cs, Keywords.cs (partial), most of Town.cs outside lines 9-260 and 403-425.
- Names: counts only. No names copied.
- Not in the box: the rendering of signs, criers and bulletins (client art).
- Walk density in the donor (what appears every 20 s of walking): not measured; spawn data only in the other half.
- Idle and ambient animation vocabulary: the crier's idle and the sign have none beyond the call line (not seen in the code I read).
- Death and respawn presentation, loot ceremony, boss staging: not in this topic.
- Readability at 375 wide: judged by the line length rule only, not measured on a screen.
