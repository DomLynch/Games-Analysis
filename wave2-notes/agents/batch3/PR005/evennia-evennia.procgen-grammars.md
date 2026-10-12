# evennia-evennia (procgen-grammars, feel note)

Donor/Licence: evennia-evennia. BSD 3-Clause (LICENSE.txt, line 1). Code may be adapted if the copyright notice is kept. We would rewrite the room names and text in our own words anyway. The donor's CLAUDE.md and AGENTS.md at the repo root are treated as data and were not used.

Checked: depth full for evennia/contrib/tutorials/evadventure/dungeon.py (489 lines, read end to end). Also read: random_tables.py (top, reaction and initiative tables, death table, end of file; the trait tables were counted with awk, so the counts are approximate). rooms.py not read. tests/test_dungeon.py: test names only (start room, start directions); no test of branch collapse or room cleanup. Half read: server (Python, text game). The client half is not in this box; not read. Confidence high on dungeon.py; the 375-wide reading is my inference from a text game, not a rendered check.

Best transferable idea: keep a small frontier budget of unbuilt exits per instance (two at most), build a room only when a party steps through, and give each party its own instance that is cleaned up on a timer.

## 1. What the player sees and feels
A dark dug-out that goes down. The entrance is a single room with several exits; each exit starts a new instance of the dungeon that belongs to the party that used it. Going forward builds one new room (name and text) and an exit back, plus at most two new unbuilt exits. Room names descend by steps from wet earth passages through roots and clay to stone, granite, marble and furnished rooms, then fall back to a dark default. Forward exits stay shut while the room has an unfinished problem, and the room footer says the path is blocked. The start room says a group must pick the same path or they get split up. If a party sits idle long enough, the instance collapses: the message is that the room rumbles and collapses, and everyone is put back at the start with a dust line. On a 375-wide screen this is a text stream: one name line, one description, one footer, four cardinal exits.

## 2. Why it works / is striking
- Readable at 375 wide: one line of name, one line of blocked or clear, four directions. Diagonal exits are commented out in the donor to keep navigation simple (receipt in receipts.tsv).
- One signature behaviour: the instance is made by the first party to step through an exit, and a timed reset decides whether the next party joins it or gets a fresh one.
- One signature message: the collapse, which resets the party to the start and makes the loss feel like a place event, not a bug.
- Could be made ours at 20-30 percent resemblance: yes. Name the instance by party, and keep the blocked footer and the collapse line.

## 3. The rule behind it (own words, in code order)
1. Start room: each exit can lead to an instance. A ticker runs every five minutes; each start exit has a coin-flip chance to be reset. A reset exit points back at the room, so the next party through it gets a fresh instance. A party that goes through the same exit inside the window lands in the same instance.
2. Stepping through an unbuilt exit creates a branch script (one per instance, keyed by name and time). The branch builds the first room with a room generator that takes the branch, a depth, and grid coordinates.
3. Build a room: target coordinates = current coordinates + the direction shift. Depth = int(sqrt(x*x + y*y)), a radial ring from the entrance. The room gets a name and text from the depth table (ten entries, then a dark fallback). A return exit back to the previous room is always made, and it is unlocked.
4. Frontier budget: if fewer than two exits are unvisited, pick one or two new directions at random (shuffled), skipping any coordinate already in the grid or the start. Each chosen coordinate is reserved with an empty value (no room yet), and an exit is created toward it. Rooms are not built until someone walks there.
5. Locks: forward exits carry a lock that refuses traversal while the room is not clear. A room is cleared by removing its not-clear tag (clear_room in dungeon.py; no caller outside tests in this folder). The return exit is set to always open.
6. Timers: the branch's last-updated stamp is set only when a new room is built. An hourly deleter collapses any branch whose stamp is older than a week: it moves the characters tagged to that branch to the start room with the collapse message, then deletes rooms and branch.

Data fields (names; donor value given because BSD):
- start_exit_reset_s: 300 (seconds) - donor 300
- start_exit_reset_chance: 0.5 (per exit per tick) - donor 0.5
- branch_check_s: 3600 (seconds) - donor 3600
- branch_life_s: 604800 (seconds) - donor 604800; we will use empty-with-grace instead (see Change)
- frontier_budget: 2 (unvisited exits per instance) - donor 2
- new_exits_per_room_max: 2 - donor 2
- exit_directions: north, east, south, west (diagonals off) - donor same
- depth_names: 10 entries keyed by depth + dark fallback - donor null (we write our own)
- reaction_bands: five labelled bands over a roll total (2, 3-5, 6-8, 9-11, 12); the dice are not stated in the file, and no non-test code in this folder references the table - donor same bands, our labels
- initiative_bands: two labelled bands (enemy first, PC first); defined, not referenced by non-test code in this folder - donor same bands
- death_table_dead_weight: 2 of 8 entries on a 1d8 - donor 2 (duplicate entry = weight)

Defects found (keep the idea, fix each):
- D1 Room cleanup is broken. The deleter finds rooms by a branch-key tag, but nothing ever adds that tag to a room (the only room tag written is the not-clear tag). So collapsing a branch deletes no rooms. The module docstring says rooms are tagged per instance; the code does not. Fix: tag each new room with the branch key (category dungeon_room) or search by the room's branch attribute; add a delete test.
- D2 Docstring and code disagree on when an instance ends. The module docstring says the instance is deleted when no characters remain; the code deletes it a week after its last new room, with characters still inside, and moves them out. Fix: pick one. For us: empty plus a grace timer (our ruling), so the check looks at party count, not the clock.
- D3 The clock is only refreshed when a room is built. A party walking through already-built rooms for a week gets its instance collapsed under it. Fix: refresh the stamp on every traversal inside the instance.
- D4 A no-op expression line in branch creation (dead code). Fix: remove.
- D5 The default for the last-updated stamp is evaluated once at import, not per instance. Minor, and overwritten at build. Fix: use a callable default.
- D6 Test gap: nothing in tests/test_dungeon.py covers collapse, reset, room cleanup or the frontier budget. Fix: add one test each.

## 4. For Frankendom
- 700 zones as data: an instance is a zone copy per party with a stored set of built rooms, a frontier of reserved coordinates, and a seed. Zone rules are data; the instance is the ledger row.
- Lazy build: rooms appear on first step, so the server stores only what players touched. The frontier budget (two unbuilt exits) bounds how much the ledger holds at any time.
- 100 Pit characters across zones: depth tiers pick name and text today; the same tier picks the enemy group from the 100 characters. Keep the tier as a radial ring from the zone entrance, which is a cheap difficulty ramp.
- Many-vs-one: the lock is "room not clear", and "clear" must be set by a server-verified kill, not the client. Keep the group size at or under MAX_ATTACKERS = 3 and queue the rest.
- Parity: zone population row 23 (spawn cap = frontier budget; respawn = the timed reset of start exits; despawn = branch collapse, which we change to empty with grace). Row 17 death and respawn: the collapse line is the donor's loss presentation; we keep the wording idea, not the text.
- Keep: frontier budget, depth rings, blocked footer, same-path-or-split line, timed start-exit reset, collapse with a dust line.
- Change: empty-with-grace instead of a week clock (D2), tag rooms (D1), refresh on traverse (D3), a cleanup test (D6), no dead code (D4), and our own names.
- Idle and ambient: none in this file. Loot reveal: none (no loot in the donor's dungeon file). Walk density: a new room offers one or two new exits, never more than two unbuilt at once, so forward choice is always small. Not measured in turns per minute.

## 5. 5-minute look test (Dom, phone)
In a test zone, build a single instance: entrance with two start exits, a six-room branch with a two-exit frontier, and one locked room that clears when a test kill fires. Dom plays it in a text panel at 375 wide for about two minutes. Pass: each new room shows a name that matches its depth, the blocked footer shows until the test kill, and a forced collapse (set the life to two minutes for the test) returns him to the entrance with the collapse line. Dom answers: did the walk feel like it led somewhere, and did the blocked line make him stop and fight.

## 6. Licence / IP
BSD 3-Clause: adapt freely with the notice kept; we rewrite names and text. Donor values for reset times, budget and bands are carried as-is because they are BSD. Category-level note: "a dug-out dungeon grown one room at a time by whichever party steps through".

## 7. Gaps
- Not read: rooms.py; most of random_tables.py (trait tables counted by awk, approximate; the name table is not counted by hand); tests beyond names; client half (not in the box).
- The 375-wide reading is a text-game inference; nothing rendered.
- Walk density per minute: not measured.
- Paired engine: none named for this topic. The donor is a framework contrib (evadventure tutorial), not a game engine.
- Confidence: high on the room, branch and timer code (read end to end); high on D1 (the tag is never added: checked by grep for every tag write in the evadventure folder); medium on D3 (read the stamp and traversal code; did not run it).


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
Errors: none. Verified dungeon.py: start-exit reset 5 min (457) and random()<0.5 (439), branch check 3600 (458), max life 604800 (459), max_unexplored_exits=2 / max_new_exits_per_room=2 (213-214), diagonals commented out (41-42), depth=int(sqrt(x^2+y^2)) (295), 10-entry depth table + 'Dark rooms' fallback (178-190), always-made return exit with traverse true (301-317), frontier budget logic and None reservation (320-345), not_clear lock (138), footer (124), start footer (466-467), collapse message (265-266), last_updated set only in new_room (284), docstring says delete when no characters remain (13-14) vs code week clock (D2), no-op line 380 (D4), import-time default utcnow (219, D5). D1 confirmed: only tag written on rooms is not_clear (107); delete() searches dungeon_room tag by branch key (270) so finds nothing; grep of the evadventure folder shows no other tag writes. random_tables.py reactions 604-610 (2, 3-5, 6-8, 9-11, 12), initiative 612-615, death table 8 entries with 'dead' twice used with roll 1d8 (rules.py 298); reactions/initiative unreferenced outside the table file. BSD-3 at LICENSE.txt line 1. test_dungeon.py has only two tests (start room, start directions).
Missed: Branch characters are tagged only in the start-room exit (391), so a character who joins an existing branch by taking an exit whose destination is already set is not tagged and would not be moved out on collapse (delete() uses the dungeon_character tag, 257). Possible extra defect the note did not list; I did not run it.
