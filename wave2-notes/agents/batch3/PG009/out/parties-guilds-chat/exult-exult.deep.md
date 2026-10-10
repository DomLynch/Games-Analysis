# exult-exult (parties-guilds-chat, cell 18)

Donor: `/mnt/frankendom-donors/exult-exult/party.cc` (with `party.h`, `actors.cc`, `actions.cc`, `usecode/intrinsics.cc`) | Licence: GNU GPL version 2 or any later version (per the `party.cc` header, lines 10-11; repo `COPYING` is GPL v2) | C++ | symbol `Party_manager::move_followers`

Checked: `party.h` read in full (172 lines). `party.cc` read in full (599 lines): add/remove/dead list (50-186), link after load (193-233), follower table and offsets (243-272), `get_followers` (279-298), `move_followers` (305-336), `Get_step_tile` (343-362), `Find_member_blocking` (371-389), `Clear_to_leader` (404-427), `Get_cost` (437-477), `Take_best_step` (485-522), `Is_step_okay` (528-547), `Party_manager::step` (555-589), `get_actor` (591-599). Callers read: `get_followers` from `Path_walking_actor_action::handle_event` (actions.cc 312-318; the other `get_followers` callers in gamewin.cc 1852-2006 were not read); `update_party_status` from `Actor::die` (actors.cc 4309, call at 4483) and `Actor::resurrect` (4562, call at 4595); `add_to_party` and `remove_from_party` from usecode intrinsics (intrinsics.cc 408-425); `link_party` from ucinternal.cc 3278 and 3290 (not read). Not read: `Get_direction` (the 8-way numbering), `Actor::blocks`, `is_blocked`, `step`, `Frames_sequence`, `Main_actor::get_followers` (actors.cc 4671). Confidence: high on the party list, the follower tree and the step order; medium on the blocking helpers, which the sketch calls as black boxes. Camera: not applicable. Chat, guild ranks, friend lists: none in this donor (grep for chat/guild not run; the donor is Exult, the Ultima VII engine, and `party.cc` is the only party file).

## 1. Mechanism

- A party is a fixed array of up to 8 NPC numbers, `EXULT_PARTY_MAX` 8 (party.h 34, 41). Each member's party id is its array index (party.cc 66, 224). The Avatar is id -1 and is not in the array (`get_actor(-1)` returns the Avatar, 591-593).
- A dead member leaves the party and goes to a separate dead list of up to 16 (party.h 45). `update_party_status` (party.cc 175-186) is called from `Actor::die` (actors.cc 4483) and `Actor::resurrect` (actors.cc 4595). A dead NPC is removed from the party and added to the dead list (178-179). A living NPC on the dead list is removed from it and added back to the party (182-183).
- Add (party.cc 58-76). Refused if the NPC is missing, the party is full, or the NPC is already a member (61). Otherwise: remove from the dead list (64), set alignment good (65), set the party id (66), set the in-party flag and "okay to take" on the NPC and its items (67-69), append (70).
- Remove (84-114). Refused if not found or the stored id does not match (93-96). Shifts later members down and renumbers them (98-104), clears the in-party flag (105), decrements the count (106-107), and clears the NPC's id (108).
- Load (193-233). After usecode loads the NPCs, `link_party` re-links ids in the saved order (224-225). Dead entries go to the dead list, and entries past the dead-list size are dropped silently (218-220).
- Formation, step by step (279-336). Each time the Avatar steps under user control, `get_followers` (called from actions.cc 314) builds `valid`: members that are not asleep, paralyzed or dead, and whose schedule is not combat, wait or loiter, and that are not already walking (282-293). If any are valid, `move_followers` runs from the Avatar with the Avatar's direction (295-297).
- Follower tree (243-253). Member ids form a binary tree. The Avatar has children 0 and 1; 0 has children 2 and 3; 1 has child 4 and no second child; 2 has child 7; 3 has children 5 and 6; 4 has child 8 (the table, row index = id + 1). Each member has at most two followers, one on each side.
- Slot offsets (259-272). Per 4-way facing (0 N, 1 E, 2 S, 3 W; the facing is the 8-way direction divided by two, 318), a left follower's slot is two tiles behind and two to the left of its parent, and a right follower's slot is two tiles behind and two to the right. Example: facing North (0), left = (-2, +2), right = (+2, +2) in tile offsets from the parent.
- Walk (305-336). Each member that has children steps those children toward their slots (325, 328). A child's own children are then walked (330-335), in the direction the child's step returned. A step returns a direction whether or not the NPC moved (it returns the given direction on "not moving" at 564 and on failure at 586), so the walk continues down the tree either way.
- One step (555-589). The slot tile is limited to one tile per axis (343-362, 561-562). If the clamped step toward the slot is zero (the NPC is already in its slot), it returns without moving (563-565). Otherwise it tries the direct step if `Is_step_okay` (533-546): not blocked, height change at most two (squared at 537-538); if adjacent to the leader, height change at most one (543-544); if farther, `Clear_to_leader` (546). If the direct step fails, it runs `Take_best_step` (578-582).
- Best step (485-522). Seven directions around the wanted one are scanned in the order {0, 1, 7, 2, 6, 3, 5} (491); the reverse is never tried. Each candidate's cost comes from `Get_cost` (437-477): blocked gives 10000 unless a party member is there, in which case it costs 1 more and the two may swap (447-456, 510-521); otherwise the cost is the height change squared plus the squared tile distance to the leader (461-469); 16 is added when the leader is more than one tile away and `Clear_to_leader` fails (470-474). The lowest cost wins, with the first in scan order winning ties (501).
- `Clear_to_leader` (404-427). Fails if the leader is more than four tiles away (410-411). Otherwise it walks the straight line toward the leader; a tile held by a non-member fails it (416-419); the final height difference must be at most one (425-426).
- Timing: no timer, no accumulator. The formation moves once per user step of the Avatar, synchronously, inside the step call.

## 2. Key functions

- `Party_manager::move_followers`: `/mnt/frankendom-donors/exult-exult/party.cc` 305-336. The tree walk: slot offsets, child steps, recursion.
- `Party_manager::step`: `/mnt/frankendom-donors/exult-exult/party.cc` 555-589. Slot tile, direct step, best-step fallback.
- `Take_best_step` and `Get_cost`: `/mnt/frankendom-donors/exult-exult/party.cc` 437-522. The seven-direction scan and the cost.
- `Party_manager::get_followers`: `/mnt/frankendom-donors/exult-exult/party.cc` 279-298. Who is eligible each user step.
- `Party_manager::add_to_party` and `remove_from_party`: `/mnt/frankendom-donors/exult-exult/party.cc` 58-114.
- `Party_manager::update_party_status`: `/mnt/frankendom-donors/exult-exult/party.cc` 175-186. The dead-list move in both directions.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Party capacity, fixed array | 8 (party.h 34); dead list 16 (party.h 45) |
| Follower slots as a binary tree | Child table (party.cc 243-253) |
| Slot offset two tiles behind, two to the side | `{-2, 2}` etc. (party.cc 259-272) |
| One tile per axis per step toward the slot | `Get_step_tile` clamp to plus or minus 1 (party.cc 351-360) |
| Blocked tile costs 10000; swap with a member costs 1 | `max_cost = 10000` (party.cc 435); `cost += 1` (456) |
| Cost: height squared plus squared distance to the leader | (party.cc 468-469) |
| Penalty 16 when the leader is not reachable in a straight line | (party.cc 473) |
| Scan order around the wanted direction, reverse excluded | `{0, 1, 7, 2, 6, 3, 5}` (party.cc 491) |
| Leader beyond four tiles fails the straight-line check | (party.cc 410) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order for the parts that transfer: the slot offset per facing, the one-tile-per-axis step toward the slot, the direct step when the tile is free, the best-neighbour fallback over seven directions with the reverse excluded and the first one winning ties, and the tree walk in which each child moves and then its own children follow. It omits the swap with a party member, the height terms, the 16-point penalty and the straight-line clearance check (which the donor applies to direct steps), the eligibility filter in `get_followers`, the dead list, and the frame and animation calls. Its direction numbering (0 north, clockwise) is the sketch's own, because the donor's 8-way numbering was not read. In the sketch the children of a member that did not move keep the leader's facing, as the donor does.

```ts
// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Tile = { x: number; y: number };
const MAX_COST = 10000;
const DIR8: Tile[] = [
  { x: 0, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 0 }, { x: 1, y: 1 },
  { x: 0, y: 1 }, { x: -1, y: 1 }, { x: -1, y: 0 }, { x: -1, y: -1 }
];                                                  // sketch's own numbering: 0 = north, clockwise
const DELTADIR = [0, 1, 7, 2, 6, 3, 5];             // straight, then 45s, then 90s; 4 (reverse) is never tried
// Behind-left and behind-right slot offsets per 4-way facing (0 N, 1 E, 2 S, 3 W).
const LEFT: Tile[] = [{ x: -2, y: 2 }, { x: -2, y: -2 }, { x: 2, y: -2 }, { x: 2, y: 2 }];
const RIGHT: Tile[] = [{ x: 2, y: 2 }, { x: -2, y: 2 }, { x: -2, y: -2 }, { x: 2, y: -2 }];
// Child ids per member; row 0 is the leader (id -1), then members 0..7. -1 = no child.
const CHILDREN: [number, number][] = [[0, 1], [2, 3], [-1, 4], [7, -1], [5, 6], [-1, 8], [-1, -1], [-1, -1], [-1, -1]];

const clampStep = (d: number): number => Math.max(-1, Math.min(1, d));

// Cost of a tile: blocked is huge; otherwise the squared distance from the leader.
function tileCost(to: Tile, leader: Tile, blocked: (t: Tile) => boolean): number {
  if (blocked(to)) return MAX_COST;
  const dx = to.x - leader.x;
  const dy = to.y - leader.y;
  return dx * dx + dy * dy;
}

// Try the seven usable directions around dir8; keep the cheapest (the first one wins ties).
function bestStep(pos: Tile, leader: Tile, dir8: number, blocked: (t: Tile) => boolean): Tile | null {
  let best: Tile | null = null;
  let bestCost = MAX_COST + 8;
  for (const i of DELTADIR) {
    const d = DIR8[(dir8 + i) % 8];
    const to = { x: pos.x + d.x, y: pos.y + d.y };
    const c = tileCost(to, leader, blocked);
    if (c < bestCost) { bestCost = c; best = to; }
  }
  return bestCost >= MAX_COST ? null : best;
}

// One follower: one tile per axis toward its slot; if that tile is blocked, take the best neighbour.
function stepFollower(pos: Tile, slot: Tile, leader: Tile, dir8: number, blocked: (t: Tile) => boolean): Tile | null {
  const want = { x: pos.x + clampStep(slot.x - pos.x), y: pos.y + clampStep(slot.y - pos.y) };
  if (want.x === pos.x && want.y === pos.y) return pos;     // already in its slot
  if (!blocked(want)) return want;
  return bestStep(pos, leader, dir8, blocked);
}

// Walk the tree: each child steps toward its slot beside its parent's tile, then its own children follow.
function moveFollowers(leaderId: number, leaderPos: Tile, dir8: number,
                       positions: Map<number, Tile>, blocked: (t: Tile) => boolean): void {
  const dir4 = Math.floor(dir8 / 2);                        // as the donor: 8-way facing / 2 picks the slot row
  const [l, r] = CHILDREN[leaderId + 1];
  const sides: [number, Tile][] = [[l, LEFT[dir4]], [r, RIGHT[dir4]]];
  for (const [child, off] of sides) {
    if (child < 0) continue;
    const pos = positions.get(child);
    if (pos === undefined) continue;
    const slot = { x: leaderPos.x + off.x, y: leaderPos.y + off.y };
    const next = stepFollower(pos, slot, leaderPos, dir8, blocked);
    let childDir = dir8;                                    // if it did not move, its children keep the leader's facing
    if (next !== null && (next.x !== pos.x || next.y !== pos.y)) {
      positions.set(child, next);
      childDir = DIR8.findIndex(d => d.x === clampStep(next.x - pos.x) && d.y === clampStep(next.y - pos.y));
    }
    moveFollowers(child, positions.get(child) ?? pos, childDir, positions, blocked);
  }
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/pg009-exult-check.ts` (sketch plus `export {}`), exit 0. The Edit hook reported tsc as unavailable on the Mac; the VPS check is the one that ran.

## 5. Lands in

- TARGET `origins/party/formation.ts` (new module, proposed; the Frankendom repo was not opened in this pass): companion formation behind the hero in a zone, driven by the hero's steps. Parity row 5 (controls/input): the formation moves on each user step. This is a weak fit and it is said plainly: none of rows 1-23 covers companion formation or player party membership. Row 5 is the nearest because the donor's formation is input-driven, and it is not a fight row.
- today: no equivalent read in this pass.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later: clean-room, shape only)
- Brief rule served: zones as data (the offsets and the tree are data, not per-zone code); one engine for the step rule. The donor's formation is client-only and has no server state, so Frankendom must decide whether companion positions are server state; this note does not decide it.

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism.
- Membership gap, read in the code and not run: `update_party_status` removes a resurrected NPC from the dead list (party.cc 182) and then calls `add_to_party` with its result unchecked (183). `add_to_party` returns false when the party already has 8 members (61). So a resurrected NPC into a full party is in neither list. The donor's `resurrect` (actors.cc 4595) then gives it a loiter schedule (set_schedule_type, 4597), so it stands around as an orphan. A scenario needs eight members plus one death, one recruit and one resurrection; it is plausible in play, not confirmed in play.
- Silent drop at load: `link_party` drops dead entries once the 16-slot dead list is full (party.cc 218-220), without a message.
- A failed step returns the leader's facing (583-586), so the children of a stuck member still walk, toward slots computed from the stuck member's real tile. Reads as deliberate. Our tests should cover a stuck member with two children.
- Swapping positions (510-521): a companion can exchange tiles with another companion when the best step is occupied by a member. In a duel or a close fight, a swap can move a companion through the hero's side. Do not port the swap into fights.
- Ids are array indices, and removal shifts later members down and renumbers them (party.cc 98-104). Frankendom should key the roster by a stable id.
- Formation is single-player client logic: `Game_window` is a singleton and there is no network code in `party.cc`. Frankendom's rulings make the client a view, so companion positions that decide reach or blocking must be server state. That is a Lead decision.
- Offsets are in tiles and the donor's grid is tile-based. A third-person world would use its own unit, so the two-behind, two-to-side numbers are a starting point and must be data fields.
- Not read: the 8-way direction function, the blocking and step methods of `Actor`, the frame sequence, `Main_actor::get_followers` (actors.cc 4671), and the other callers of `get_followers` (gamewin.cc).

Best transferable idea: a companion formation as a small binary tree, where each member holds a fixed slot two tiles behind and to one side of its parent, moves one tile per axis per step toward it, and takes the cheapest free neighbour when blocked.

Decision (proposed): adapt - take the tree of slots, the one-tile-per-axis step and the cheapest-free-neighbour fallback for companions in zones; do not take the swap with a party member or the input-driven walk inside a fight; take the dead-list idea but fix the full-party resurrect case first.
Acceptance: a test with a leader and three companions: after four steps north each companion sits in its left or right slot two tiles behind its parent; with a wall on one companion's slot it takes the cheapest free neighbour and never moves more than one tile per axis in a step; resurrecting a member into a full party keeps it in the dead list (or a waiting list) instead of dropping it, which the donor does not do.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later: clean-room, shape only)
Brief rule served: zones as data (offsets and tree as data); one engine for the step rule; the server decides any companion position that affects reach or blocking.
