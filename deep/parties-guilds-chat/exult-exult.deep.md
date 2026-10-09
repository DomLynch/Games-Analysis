# exult-exult (parties-guilds-chat, cell 18)

Donor: /mnt/frankendom-donors/exult-exult/party.cc | Licence: GPL-2 | C++ | symbol Party_manager::add_to_party / move_followers (input line 58 verified: `add_to_party`; `move_followers` at 305; follower table at 243)

## 1. Mechanism
- The party is a fixed-size array of NPC numbers (`party`), sized `EXULT_PARTY_MAX` (8, party.h line 34), with a count. Dead members sit in a separate dead-party array (constructor, line 50).
- Join: `add_to_party(npc)` (58-76) refuses a null NPC, a full party, or an NPC already in the party (61). Otherwise it removes the NPC from the dead list, sets the NPC good-aligned, stores its party id (the current count), sets the in-party flag, sets okay-to-take recursively on its items, appends the NPC number, and refreshes the shortcut bar and the face buttons. `remove_from_party` (84-114) shifts later members down and fixes their ids.
- Following: `get_followers(dir)` (279-298) runs when the avatar steps in direction `dir` (0 to 7). It builds `valid[]`, a compacted list of party members that exist, are awake, not paralysed, not dead, not on a combat, wait or loiter schedule, and not already queued to walk (282-294).
- If `valid` is non-empty, `move_followers(avatar, -1, dir)` runs. A static table (243-253) indexed by 1 + the leader's party id (so the avatar is row 0) names up to two follower numbers, left and right. These numbers are party ids by the table's comment, but `move_followers` uses them as indexes into `valid[]` (319-320, bounds-checked against `validcnt`). Each named follower takes one step (`step`) toward the leader's tile plus a per-direction offset from `left_offsets` or `right_offsets` (259-272, indexed by dir/2, four directions, offsets of 2 tiles in each axis).
- `step` (555-589) computes one tile toward the destination (each axis clamped to one tile by `Get_step_tile`, 343-362); if that is the current tile it returns the given direction. It advances the walk-frame sequence, then tries the direct step if `Is_step_okay` (528-547: not blocked, height difference squared at most 4, and either one tile from the leader with dz at most 1 or a clear straight path to the leader within 4 tiles). Otherwise `Take_best_step` (485-522) scores seven candidate neighbour directions with `Get_cost` (437-477: blocked is 10000, a swap with a blocking party member costs 1, plus squared distance to the leader, plus 16 if the tile is more than one tile from the leader and the straight path to the leader is blocked, 470-474) and takes the cheapest, swapping places with a party member in the way. If every candidate is blocked, or the NPC died, the frame is rolled back and the old direction returned (582-587).
- After a follower steps (it returns a direction >= 0) and is not dead, `move_followers` recurses for that follower's own followers (330-335), so the whole party moves as a tree on each avatar step.
- Output: NPC positions and frames. No server contact. Runs on the client as part of the avatar's move.

## 2. Key functions
- `Party_manager::add_to_party` - /mnt/frankendom-donors/exult-exult/party.cc lines 58-76. Join path.
- `Party_manager::get_followers` - same file lines 279-298. Builds the available-follower list on each avatar step.
- `Party_manager::move_followers` - same file lines 305-336. Recursive formation move over the follower table.
- `followers` table - same file lines 243-253. Static left and right follower slots per party slot.
- `Party_manager::step` - same file lines 555-589. One-step move with best-step fallback.
- `Get_step_tile` - same file lines 343-362 (inline helper). One-tile clamp per axis.
- `Take_best_step` / `Get_cost` / `Is_step_okay` - same file lines 485-522 / 437-477 / 528-547. Fallback step choice and swap.
- `remove_from_party` - same file lines 84-114. Shift-down removal.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed-size party array with append-on-join and refusal when full | EXULT_PARTY_MAX = 8 (theirs, party.h line 34) |
| Filter the available followers each step before moving | Schedule set excluded: combat, wait, loiter (theirs, lines 289-291) |
| Tree-shaped formation: each member has a left and right follower | Follower table of up to two slots per member (theirs, lines 243-253) and the 2-tile left/right offsets (259-272) |
| One-tile-per-axis step toward an offset with fallback | One-tile limit (theirs, lines 351-360); best-step cost constants 10000 and 16 (lines 435, 473) |

## 4. TypeScript sketch
Sketch type: clean-room (GPL-2 donor). Written from the formation mechanism above, no lines translated.

simplified: followers are looked up by party slot (`bySlot`), where the donor indexes its compacted `valid[]` list (see section 6), so the sketch does not reproduce that index shift. The sketch has one fixed offset for every direction (the donor has four per-direction left and right offsets), no `dir` argument, no `Is_step_okay` legality test, no best-step or swap fallback, no dead-after-step check before recursing, and `stepToward` always moves when not already on the target tile.

```ts
// Licence: GPL-2 - clean-room sketch, no lines translated
type Member = { id: number; x: number; y: number; available: boolean; leftSlot: number; rightSlot: number };

// One step toward a target, at most one tile per axis.
function stepToward(m: Member, tx: number, ty: number): { x: number; y: number; moved: boolean } {
  const dx = Math.max(-1, Math.min(1, tx - m.x));
  const dy = Math.max(-1, Math.min(1, ty - m.y));
  if (dx === 0 && dy === 0) return { x: m.x, y: m.y, moved: false };
  return { x: m.x + dx, y: m.y + dy, moved: true };
}

// Each member follows its left and right follower slot, recursively.
function moveFollowers(
  leader: Member,
  bySlot: Map<number, Member>,
  offsetFor: (side: 'l' | 'r') => [number, number],
): void {
  for (const side of ['l', 'r'] as const) {
    const slot = side === 'l' ? leader.leftSlot : leader.rightSlot;
    const f = bySlot.get(slot);
    if (!f || !f.available) continue;
    const [ox, oy] = offsetFor(side);
    const next = stepToward(f, leader.x + ox, leader.y + oy);
    f.x = next.x;
    f.y = next.y;
    moveFollowers(f, bySlot, offsetFor);
  }
}
```

## 5. Lands in
- Frankendom target: NEW `origins/presence/follow.ts` (follow-the-leader is walk-layer, not fight code; companions are not in scope today) (client-side cosmetic follow, server owns party membership in `origins/presence/social.ts`, new). Neither exists today. Party membership and layer assignment by party leader are in `docs/specs/origins/one-shard.md` §5 (VPS snapshot /root/work-k7, not main).
- Parity-checklist row: none of rows 1 to 22 (row 6 is the hero actor and animations; party following is not part of it). Feature-map section: parties, guilds and chat (later phase).
- Reuse tag: rewrite-from-idea (GPL-2 donor; the sketch is clean-room)
- Brief rule served: (category default, not per-cell) 10 (zone copies); rules 7-9 n/a

## 6. Gaps and risks
- Donor index mismatch (read from the code, not run): the follower table holds party ids (comment 235-241) but `move_followers` uses them to index `valid[]`, the compacted list of available members (319-320). When any earlier member is unavailable (asleep, in combat, waiting) the entries shift and a follower slot is filled by the wrong member, or is skipped when the number is >= `validcnt`. The sketch avoids this by keying on party slot; a Frankendom port must pick one scheme on purpose.
- The formation is a static tree of at most two followers per member, sized for 8 members (243-253). Frankendom's party size and shape would need its own table.
- Movement is client-side and frame-stepped; nothing here is server-verified. Any party benefit (shared XP, loot) needs a server path under the server-verified-kills and one-ledger rulings, and this file has none. MAX_ATTACKERS = 3 is not touched by following; a party of more than 3 near one creature is a combat-side question.
- Pit is a client only and has no use for party following. Zones are data: formation offsets would be engine data, not zone code.
- Not read: `party.cc` lines 130-224 (dead-party and link bookkeeping). The add, remove, follow, step and best-step paths were read.
