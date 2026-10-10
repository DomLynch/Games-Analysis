# alexbatalov-fallout2-ce (parties-guilds-chat, cell 3)

Donor: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/party_member.cc` (with `src/party_member.h`, `src/critter.cc`, `src/combat.cc`, `src/object.cc`, `src/interpreter_extra.cc`, `src/combat_ai.cc`) | Licence: Sustainable Use License, Version 1.0 (LICENSE.md; restricted, not an open-source licence: clean-room only) | C++ | symbol `partyMemberAdd` / `partyMemberRemove`

Checked: Read `src/party_member.cc` 123-175 (init: base count and capacity), 175-274 (per-member description loop), 375-477 (add and remove, whole), 478-520 (save prep and unprep), 777-795 (reset), 860-915 (membership and active count); the struct `PartyMemberListItem` at 67-72 by grep; `src/party_member.h` (whole). Callers read: `src/critter.cc` 818-826 (critterKill), `src/object.cc` 343-350 (player added at setup), `src/interpreter_extra.cc` 3945-3967 (script ops), `src/combat_ai.cc` 3280-3295, `src/combat.cc` 4870-4885 (inside `_damage_object` at 4821; the enclosing condition was NOT read). `src/loadsave.cc` 1571-1598, 2437 and 2539 by grep only. Not read: `src/party_member.cc` 1292-1697 (per-member settings, level-up sync, position sync, rest heal), `protoGetProto` (prototype sharing). Data gap: `data/party.txt` is NOT in the donor (no data folder), so the base member count cannot be checked; the 20 slack is the donor's literal. Confidence: high on the add, remove, count and reset order; medium on which kill paths reach the roster removal (two callers read, one enclosing condition not read). camera_scope: n/a.

## 1. Mechanism

- The party is a fixed array of object references, `gPartyMembers`. Slot 0 is the player: `partyMemberAdd(gDude)` runs at setup (object.cc 347) and the donor exits if it fails. Removal searches from slot 1 (party_member.cc 437), so the player can never be removed.
- Capacity: allocated at init as the data count plus 20 (153). The data count is the number of `Party Member N` sections read from `data\party.txt` (127-144). The add check uses the same bound (377).
- Order of steps for `partyMemberAdd` (375-422): (a) full roster returns -1 (377-379). (b) A member already present, by the same pointer or the same pid, returns 0 and changes nothing (381-386). (c) The save lock returns -1 (388-391). (d) Insert: stable id = 18000 + (pid & 0xFFFFFF) (398); no-remove and no-save flags (399); script ownership and id rewrite (403-410); team set to 0 (412); queued script events removed (413); a dialog panel refresh if the speaker is the new member (415-419).
- Order of steps for `partyMemberRemove` (426-475): empty roster returns -1 (428-430); null returns -1 (432-434); search from slot 1, not found returns -1 (437-446); save lock returns -1 (448-451); swap the last member into the gap (453-455); clear the flags (457); decrement the length (459); clear script flags (461-464); remove queued script events (466); dialog refresh (468-472).
- Save: `_partyMemberPrepSave` sets the lock (480) and clears the no-remove and no-save flags on members (482-493) so they can be saved. `_partyMemberUnPrepSave` reverses both (499-517). Prep is called from the save path (loadsave.cc 2437); unprep from loadsave.cc 2539 and inside `_partyMemberClear` (779-780).
- Active count (`_getPartyMemberCount`, 900-913): starts at the full length (the player included), then subtracts each member that is not a critter, is dead, or is hidden (904-909).
- Membership test (`objectIsPartyMember`, 875-895): an id below 18000 is never a member (881-883); otherwise a linear scan of the roster (887-892).
- Reset (`_partyMemberClear`, 777-793): unprep if locked (779-781); remove members from the end, always taking slot 1 (783-785); set the length to 1 (787); clear scripts and the item list (789-790).
- Death: `critterKill` returns early for non-critters (820-822), then calls `partyMemberRemove` (826). So a killed member leaves the roster and the active count drops. `_damage_object` also calls `partyMemberRemove` (4881) under a condition not read.
- AI write: `critterSetAiPacket` (3280-3294) checks `_isPotentialPartyMember` (3288) and, if true, writes the packet into the prototype for that pid (3294). The membership test there compares roster slot i with description pid i (864).
- Ticks: none. Joins and leaves happen when a script op or a kill runs.

## 2. Key functions

- `partyMemberAdd`: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/party_member.cc` 375-422.
- `partyMemberRemove`: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/party_member.cc` 426-475.
- Save lock: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/party_member.cc` 478-517.
- Reset: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/party_member.cc` 777-793.
- Membership and count: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/party_member.cc` 860-913.
- Init capacity: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/party_member.cc` 123-175.
- Death caller: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/critter.cc` 818-826.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed roster; slot 0 is the player and is never removed | Slot 0 (theirs, object.cc 347; party_member.cc 437 loop starts at 1) |
| Capacity = base count plus a fixed slack | Slack 20 (theirs, party_member.cc 153 and 377); base count from data\party.txt (not in donor) |
| Repeat join is a no-op success | Rule (theirs, party_member.cc 383-385) |
| Stable id from the catalogue id plus an offset | Offset 18000 and 24-bit mask (theirs, party_member.cc 398, 881) |
| Active count excludes dead and hidden members | Rule (theirs, party_member.cc 907) |
| Swap-with-last removal | Rule (theirs, party_member.cc 453-455) |

## 4. TypeScript sketch

simplified: The sketch keeps the donor order for add (full roster, then the duplicate no-op, then the save lock, then insert) and for remove (empty check, search from slot 1, save lock, swap the last member into the gap, pop), plus the active count, the id-range quick reject, and reset (unlock, then remove every member but the player). It omits: the script ownership and script-event clears, the dialog refresh, the per-member description and level data, the item save and recover, the position sync, and the NULL checks. It takes the base count as a constructor argument; the donor reads it from `data\party.txt`, which is not in the donor. The slack of 20 is the donor's literal.

```ts
SKETCH_BLOCK
```

## 5. Lands in

- TARGET `origins/server/party-roster.ts` (new, server): the party roster, its capacity from zone or game data, the join and leave checks, and the active count. The client shows the roster; it does not decide membership.
- Parity row: none fits. Rows 1-23 have no party or roster row. The nearest is row 17 (death and respawn), and only for its rule that a killed member leaves the roster. Written as `none`; the target file is named above.
- Reuse tag: rewrite-from-idea (Sustainable Use License 1.0: restricted; clean-room only)
- Brief rule served: one ledger (the roster is one server-side list that the engine checks); one character (the player is slot 0 and cannot be removed)

## 6. Gaps and risks

- Restricted licence: clean-room, shape only. The sketch is written from the described order, not from the donor lines.
- The base member count is read from a data file that is not in the donor, so the donor's capacity cannot be checked. Frankendom sets its own cap as data.
- `_isPotentialPartyMember` (party_member.cc 864) matches roster slot i against description pid i. Removal swaps the last member into the gap (453-455), so the order changes and that match becomes unreliable. Not tested; do not port it.
- `critterSetAiPacket` writes a prototype (combat_ai.cc 3294) that every object with that pid shares. A Frankendom party member's AI state must be per instance (per-player view), not a shared template.
- Save prep clears member flags and unprep restores them (party_member.cc 482-512). Not tested for an interrupted save. Frankendom should keep joins and leaves out of any zone hand-off.
- Two kill paths remove members (critter.cc 826 and combat.cc 4881, the second under a condition not read). Frankendom has one kill path (server-verified kills), so the roster removal must sit on that one path.
- A join is gated only by capacity and the save lock. There is no distance or zone check. Frankendom's zone rule would need to add that check to the join.
- Per-member settings and level-up sync (party_member.cc 1292-1562, level data up to `PARTY_MEMBER_MAX_LEVEL` 6 at line 45) were not read. Out of this cell's scope; a candidate for a progression cell.

Best transferable idea: Keep the party as a fixed roster with the player in slot 0 that can never be removed; refuse a join when the roster is at its base-plus-slack cap, make a repeat join a no-op success, remove a killed member from the roster on the kill path, and count only living, visible members.
Decision (proposed): adapt - take the fixed roster with a protected slot 0, the capacity check, the no-op repeat join, the kill-path removal and the living-only count; do not take the global prototype write, the positional membership match, or the id offset as Frankendom's id scheme.
Acceptance: A server test: a party of the player plus two allies accepts a third ally only while the roster is under its cap; a second add of the same ally succeeds without a second slot; a fallen ally leaves the roster and the active count drops by one; a join during a zone hand-off is refused with a message; a reset never removes the player.
