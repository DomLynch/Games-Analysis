# DCurrent-openbor (zones-world, cell 2)

Donor: `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` (symbols `update_scroller` 49989-50420, spawn director 50013-50181, `smartspawn` 49512-49662) | Licence: BSD 3-clause (root `LICENSE`: "Redistribution and use in source and binary forms", plus the no-endorsement clause "Neither the name of the Senile Team") | C | symbol `update_scroller`

Checked: the level director is the spawn section of `update_scroller` (50013-50181), read in full, with `smartspawn` (49512-49662) read in full. The horizontal scroll branch (50193-50322) and the z branches OUTWARD and INWARD (50323-50445) were read; the UP/DOWN elevator branch (from 50447) was not read. Also read: the level-file parse for spawn entries (24789-24930, 25115-25130), `findent` and `count_ents` (34597-34624), the step loop call site and time step (51533-51605), `getinterval` (50810-50822). Not read: `timer_getinterval`, the `getinterval` call site, `spawn()` (28606), `scrollspeed` parsing, the level-end branch beyond 50034. `update_scroller` has one caller (51547). Confidence: high on the director order and its gates; high on the horizontal scroll rules; medium on the frame-step relation (the step loop was read, its interval source only partly). camera_scope: not a camera cell; the scroll section is a 2D side-scroll camera (see section 6).

Best transferable idea: a level director that spawns from an ordered list keyed to a progress clock, refills a group between a minimum and a maximum live count, and holds a lock until the group is clear.

Decision (proposed): adapt - take the refill band (min, max) and the ordered, position-keyed entry list as zone data for zone population; replace the scroll clock with zone progress (a player crosses a zone's trigger line, server-side); reject the donor's coupling of lock and bounds entries to the enemy band.

Acceptance: a server test with band min 2, max 4: with 1 enemy alive and 4 spawn entries due, exactly 3 spawn in that step; with 2 alive, none spawn; a lock entry at the head of the queue is applied on the next step even while the band is full, and the zone boundary stays put until the last enemy dies.

## 1. Mechanism

- Step: `update_scroller` runs once per update step while `ingame == 1` (51545-51547). The step loop is `while(_time < newtime)` (51538), with `++_time` at the end of each pass (51604). `newtime = _time + interval` (51521); the frame is capped at 100 units ahead (51533-51535). `interval` comes from `timer_getinterval(game_speed)` via `getinterval` (50812), reset to 1 if above `game_speed` and capped at `game_speed / 4` (50813-50819). So the simulation advances in one-unit steps, and the number of steps per frame follows measured frame time.
- The director (50030-50144), in order:
  1. Completion (50030-50036): when every entry is used (`current_spawn >= numspawns`), no enemy is alive and a player is alive, the level is complete if the level-end checks pass (no endlevel entity; for `level->type == 1` also no item or obstacle, 50032-50034).
  2. Refill (50037-50041): only when the live enemy count is below `groupmin`, a loop runs while the count is below `groupmax`, entries remain, and the clock has reached the entry's `at` (`level->pos >= at`, 50041).
  3. Each due entry is handled in order (50044-50141). Music, group (50060-50064), nojoin, scroll bounds (50069-50080), blockade, palette, light and shadow entries change state and consume the entry. A wait entry sets `level->waiting` (50055-50057). An ordinary entry calls `smartspawn` (50140), then the index advances (50142) whether or not the spawn succeeded.
- `smartspawn` (49512-49662): returns NULL when the entry's player-count threshold is at or above the party size (49528-49535). The threshold is `spawnplayer_count`, set by 2P/3P/4P spawn commands to 1, 2, 3 (24899-24907), so an entry marked 2P spawns in parties of two or more. Health is taken per party size (49575-49577). On horizontal levels the spawn x is the entry x plus the screen scroll `advancex` (49543), so entries are authored relative to the screen (z-scroll levels, INWARD or OUTWARD, use `advancey` for the z position, 49537-49539).
- Lock release (50170-50181): while `waiting`, when no enemy is alive, the lock clears, the level timer resets (unless `noreset` is above 1, 50176-50179), and `go_time` is set to `_time + 3 * game_speed` (50180).
- Scroll (50184-50322 for the horizontal branch): if no player is present, return (50184-50186). Otherwise the target is the midpoint of the players' x range minus half the screen plus `cameraxoffset` (50204); if the spread is wider than the screen, the target holds at the current x (50198-50200). The target is clamped to `scrollminx..scrollmaxx` (50207-50214), limited to `scrollspeed` per step (50223-50227), and the clock follows: `level->pos = (int)advancex` (50254). When pinned at the far end (50242-50248), the clock increments by one per step instead (50250). A level narrower than the screen is pinned from the start (50196).
- Scroll is frozen while `waiting` (50191).

## 2. Key functions

- `update_scroller`: `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` 49989-50420 (director 50030-50144; lock 50170-50181; horizontal scroll 50193-50322; z branches 50323-50445).
- `smartspawn`: `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` 49512-49662 (player gate 49528; spawn 49539-49543; health 49575-49577).
- Count helpers: `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` 34597-34624 (`findent` 34597; `count_ents` 34614).
- Entry parse: `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` 24855-24868 (group), 24869-24908 (spawn and player variants), 25115-25130 (`at`; append in file order).
- Step loop: `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` 51521-51547 and 51604.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Refill band: spawn only below a minimum live count, up to a maximum | Defaults min 100 and max 100 (theirs, openbor.c 23908-23909); a group entry sets both (24858-24859) |
| Position-keyed, ordered entry list | Entry key `at` in scroll units (25117); file order, no sort found (25125-25126) |
| Player-count variants | Threshold `spawnplayer_count` 0..3 for 1P..4P (24899-24907); health per party size (49577) |
| Lock until clear, then short delay | Delay 3 * game_speed after clear (50180); scroll frozen while locked (50191) |
| Clock keeps running at a dead end | Plus one per step while pinned (50250) |
| Step budget per frame | Interval capped at game_speed / 4 (50817-50819); at most 100 units ahead (51533-51535) |
| Scroll rate and clamp | scrollspeed per step (50223, parse not read); clamp to scrollminx..scrollmaxx (50207-50214) |

## 4. TypeScript sketch

simplified: keeps the donor's order: director (refill below the minimum band up to the maximum, due entries in file order, wait lock, group entries), then lock release, then camera target, rate-limited scroll and the clock (plus one per step when pinned). Changes on purpose: (a) an entry whose spawn fails stays due for the next step (the donor consumes it, 50140-50142); (b) lock and group entries are applied when due, whatever the band; the band gates only spawn entries (the donor gates every entry behind the band, 50037-50041); (c) the player-count gate is kept as `minPlayers` (donor `spawnplayer_count + 1`). It omits: completion and the endlevel and item or obstacle checks (50030-50035); music, palette, blockade, light and shadow entries; the z-axis and elevator branches; the `numplay == 0` early return (50184-50186); the scroll bounds carried per entry and their flag bit (50069-50080); the `nojoin` flag; the step loop. `allowBack` is fixed to false (right-scroll levels); the donor's back-scroll with a blockade is not modelled.

```ts
@@SKETCH@@
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population: the band, the entry list and the lock are engine logic; the numbers are zone data). Parity-checklist row 23 (zone population). Row 23 fits the refill band, the position-keyed list and player-count variants. It does not fit the donor's scroll clock (2D side-scroll, client-side); the Frankendom trigger would be a server-side zone entry. Despawn and respawn grace timers are not in this donor.
- today: not read (Frankendom's current files were not inspected; the path is from the addendum).
- Reuse tag: adapt-from-idea (BSD-3 licence; adaptation is permitted, but the sketch is written fresh)
- Brief rule served: zones as data (bands, entries and variants are data); server-owned spawns; parity row 23.

## 6. Gaps and risks

- BSD-3 permits adaptation. The sketch is still written fresh from the described mechanism.
- Coupling: music, scroll bounds, blockade, palette and wait entries are processed only inside the refill branch, so they wait for the live count to drop below `groupmin` (50037, 50039-50042). A lock can sit behind a full band. Frankendom must apply lock and bounds entries independently of the band (the acceptance test asserts this).
- Lost entries: `smartspawn` can return NULL for the player-count gate (49528-49535) or when `spawn()` gives no entity (49546-49549), and the index still advances (50142). Only the player-count case is intended. Frankendom must keep a failed spawn due.
- A wait does not stop later due entries in the same step: after the wait branch the `while` continues (50055-50059, 50039-50042), so entries already due spawn while the zone is locked. Decide whether that is the rule for us.
- Order: entries are appended in file order (25125-25126). No sort was found in the parse path; an out-of-order `at` blocks every later entry. Frankendom must validate order at load.
- Two definitions of "alive": `count_ents` counts a dead but not corpse entity as live (34621), while `findent` ignores only entities that are both dead and corpse (34604). Frankendom has one ledger: one server-verified kill, one definition.
- Clock: a 2D side-scroll clock (`level->pos`). For Frankendom the clock is zone progress, not a scroll. Only the rate limit and the clamp (50207-50227) carry over. The scroll is a 2D camera: for a third-person world camera it gives a clamp and a speed limit only, with no shoulder offset, no collision and no pitch. The camera is client-only under the rulings.
- Step budget: the donor's catch-up is at most 100 units per frame (51533-51535) and its unit is `_time` (51604). For the server tick (row 18 / post-K item 3, sub-line "server tick: fixed step, input intake, per-tick NPC budget") this is a per-frame catch-up cap to decide, not copy.
- Streaming: the donor loads each spawn's model while the level file is parsed (24886), not at run time. The donor does not stream spawns or assets at run time, so the streaming part of the topic has no transfer here.
- Naming: the group maximum is a population cap, not the attacker limit. Do not reuse the name MAX_ATTACKERS for it (ruling = 3).
