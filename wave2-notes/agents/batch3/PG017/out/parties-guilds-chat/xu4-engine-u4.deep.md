# xu4-engine-u4 (parties-guilds-chat, cell 18)

Donor: `/mnt/frankendom-donors/xu4-engine-u4/src/party.cpp` | Licence: GPL-3.0 (repo `COPYING`: "GNU GENERAL PUBLIC LICENSE" / "Version 3, 29 June 2007"; party.cpp has no licence line of its own) | C++ | symbol `Party::join`

Checked: Read `Party::join` (src/party.cpp 986-1014) in full, plus `Party::canPersonJoin` (785-799), `PartyMember` construction and change path (party.cpp 33, 60-62, 497-500, 1174-1180; party.h 131), the bus (src/support/notify.c 87-96; src/xu4.h 70), the two callers (src/discourse_tlk.cpp 157-171; src/cheat.cpp 202-210), the save record (src/savegame.h 211, 227), and the death path (party.cpp 338-371, 1062-1081). Confidence high for the join rule as written. Narrow for the topic: a grep for guild, friend, chat, channel, rank, permission, roster, multiplayer, network, socket and server found no guild-rank, chat, friend-list or network code. The only "guild" hits are vendor shops (module/Ultima-IV/vendors.b, maps.b; not read). No member removal exists in src (grep found no `members--`, `erase` or `pop_back` on the party). Camera scope: not applicable (topic is not camera).

## 1. Mechanism

The donor is Ultima IV: one player, one party of up to 8 characters. Party formation is a companion joining from a conversation. The name comes from the conversation, the roster is searched, two gates run, and only then is the record moved into the next free slot.

- Entry: the conversation's "join" branch calls `canPersonJoin(name, &virt)` (src/discourse_tlk.cpp 160), which scans slots 1 to 7 by name (party.cpp 791-797). If that passes it calls `join(name)` (discourse_tlk.cpp 161). The cheat command also calls `join` (cheat.cpp 207-208).
- Scan: `join` looks only at slots from `members` (current size, leader included) up to slot 7 (party.cpp 990). A name in a filled slot and a name not on the roster both fall through to `JOIN_NOT_EXPERIENCED` (1013), so the caller cannot tell them apart.
- Gate 1, size against level (994-995): the size after the join, `members + 1`, must not exceed the leader's level. The leader is `players[0]`; level is `hpMax / 100` (the same division as `getRealLevel`, party.cpp 135). So party size is at most the leader's level. Failure returns `JOIN_NOT_EXPERIENCED`.
- Gate 2, virtue band (998-1000): the candidate's class index selects a value from the party-wide karma array. Values 1 to 39 block (`> 0` and `< 40`). 0 and 40 to 99 pass. Failure returns `JOIN_NOT_VIRTUOUS`. Values are capped at 99 on gain (633-634). The donor treats 0 as "enlightened" (623) and does not block it.
- Commit, only after both gates pass: swap the candidate record with the record at index `members` (1002-1004), build a `PartyMember` that points at that record and increment `members` (1006), emit `MEMBER_JOINED` (1007-1008), return `JOIN_SUCCEEDED` (1009).
- Sync: each `PartyMember` holds a pointer into the save record (party.h 131; constructor party.cpp 33). A change to a member calls `party->notifyOfChange(this)` (party.cpp 62), which emits a `SENDER_PARTY` message (499) on the global bus. `notify_emit` calls each listener whose mask has the sender's bit (notify.c 91, 93-94), synchronously, inside the emitting call. After a record swap, `syncMembers` clears the wrapper vector and rebuilds it from the records (1174-1180).
- Loop: none. `join` runs once per call from a conversation or the cheat. There is no per-frame or per-tick code in this path.

## 2. Key functions

- `Party::join`: `/mnt/frankendom-donors/xu4-engine-u4/src/party.cpp` 986-1014 (scan, both gates, swap, count, event).
- `Party::canPersonJoin`: `/mnt/frankendom-donors/xu4-engine-u4/src/party.cpp` 785-799 (name match over slots 1 to 7; returns the class as the virtue index).
- `PartyMember::notifyOfChange` and `Party::notifyOfChange`: `/mnt/frankendom-donors/xu4-engine-u4/src/party.cpp` 60-64 and 497-500.
- `Party::syncMembers`: `/mnt/frankendom-donors/xu4-engine-u4/src/party.cpp` 1174-1180.
- `notify_emit`: `/mnt/frankendom-donors/xu4-engine-u4/src/support/notify.c` 87-96 (no re-entrancy guard in the emit loop).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Scan the free slots, run every gate, and only then mutate the roster, so a refused join changes nothing | None (ordering) |
| Party size after the join must not exceed the leader's level | Roster of 8 (theirs, party.cpp 990; savegame.h 211); level = hpMax / 100 (theirs, party.cpp 135 and 994) |
| A band gate on a per-candidate value: a band blocks, the edges pass | Block band 1 to 39; 0 and 40+ pass (theirs, party.cpp 998-999); an Ultima IV virtue design |
| Cap a stored progress value at 99 on gain | 99 (theirs, party.cpp 633) |
| Wrappers as views over one set of records; rebuild after a swap | None |
| Event after the change, selected by sender bit | Sender as a bit in a 32-bit mask (theirs, notify.c 91) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: scan free slots from `members`, the level gate, the virtue band, then swap, count and emit. It omits the `PartyMember` wrapper objects and the bus (the emit is a callback here), every save-record field except name and class, the karma cap at 99, the "enlightened" meaning of 0 (here 0 simply passes the band), the message text, the caller's removal of the NPC from the map (discourse_tlk.cpp 166), and the donor's cheat loop. It also drops the `Virtue` out-parameter.

```ts
// Licence: GPL-3.0 (donor). Clean-room sketch of the join rule as described in this note, not a translation of party.cpp.

interface SaveRecord {
  name: string;
  klass: number;          // index into the party-wide virtue array
}

interface PartyState {
  records: SaveRecord[];  // fixed 8 slots; slot 0 is the leader (avatar)
  members: number;        // slots in use, leader included
  leaderHpMax: number;    // level = floor(leaderHpMax / 100)
  virtues: number[];      // one value per class, 0..99
}

type JoinEvent = { type: "member-joined"; slot: number };
type JoinResult = "joined" | "not-experienced" | "not-virtuous";

const SLOTS = 8;
const HP_PER_LEVEL = 100;

function joinByName(
  p: PartyState,
  name: string,
  emit: (ev: JoinEvent) => void,
): JoinResult {
  for (let i = p.members; i < SLOTS; i++) {
    const cand = p.records[i];
    if (cand.name !== name) continue;

    // Gate 1: party size after the join must not exceed the leader's level.
    const level = Math.floor(p.leaderHpMax / HP_PER_LEVEL);
    if (p.members + 1 > level) return "not-experienced";

    // Gate 2: a virtue value from 1 to 39 blocks the join; 0 and 40 to 99 pass.
    const v = p.virtues[cand.klass];
    if (v > 0 && v < 40) return "not-virtuous";

    // Only after both gates: move the candidate into the first free slot.
    const tmp = p.records[p.members];
    p.records[p.members] = p.records[i];
    p.records[i] = tmp;
    p.members += 1;
    emit({ type: "member-joined", slot: p.members - 1 });
    return "joined";
  }
  // Not found in a free slot: the donor returns the same code for this case.
  return "not-experienced";
}
```

## 5. Lands in

- TARGET `origins/party/join.ts` (proposed new module; the path is not checked against the Frankendom repo). The server-side join check for a group feature, only if one is approved.
- Parity-checklist row: none. No row 1-23 covers party formation or roster membership. The closest is row 18 (loot roll and XP award), which does not fit because `join` touches neither loot nor XP. Written as "none" per the brief.
- Reuse tag: rewrite-from-idea (GPL-3.0 copyleft; clean-room, shape only)
- Brief rule served: one ledger (the donor's members are views over the save records); server-verified joins (Frankendom ruling; the donor has no server check). No numbered brief rule checked.

## 6. Gaps and risks

- Topic coverage: the donor has no guild ranks or permissions, no chat channels, no friend lists and no network code. Those parts of the topic stay NONE for this donor. Frankendom needs another donor for them.
- Licence: GPL-3.0 copyleft. Clean-room, shape only. Do not port `join` line by line.
- Trust: the join is a plain local call from a conversation or the cheat. Nothing is checked on a server. Frankendom must run the same gates on the server against the ledger, and a client must not be able to call the join directly.
- No leave: once a companion joins, src has no removal path (grep). A dead member stays in the roster: in combat `applyDamage` (party.cpp 338-371) only removes the map sprite and leaves a corpse; `reviveParty` (1062-1081) revives every member. The caller of `reviveParty` was not read. Frankendom will need its own leave and revive rules, not this one.
- Ambiguous result: an unknown name and an already-joined companion both return `JOIN_NOT_EXPERIENCED`. Frankendom should return distinct codes and test them.
- Level from HP: the donor derives level from max HP (`hpMax / 100`). That is an Ultima IV encoding. Frankendom should read its real progression level.
- Karma band: the 1 to 39 block is Ultima IV virtue design with no counterpart in Frankendom's rulings. Reject it.
- Sync: the wrappers are rebuilt after a swap (`syncMembers`). A stale wrapper would show the wrong companion. Frankendom must not keep a second roster copy.
- Bus: `notify_emit` has no re-entrancy guard (notify.c 87-96). A listener that changes the roster during an emit would re-enter the emit loop. This was not tested, only read.

Reuse tag: rewrite-from-idea (GPL-3.0 copyleft; clean-room only)
Brief rule served: one ledger (views over the save records); server-verified joins (Frankendom ruling). No numbered brief rule checked.

Best transferable idea: Run every join gate on the ledger before any roster mutation, and cap party size by the leader's level, so a refused join can never leave a half-changed roster.
Decision (proposed): adapt - keep the gate-then-swap order and the size cap by leader level for a future co-op group; reject the karma band, which is Ultima IV virtue design.
Acceptance: a server test where a level-2 leader accepts one companion, refuses a third with the size-cap result, and the roster and emitted-event count are unchanged after the refused join.
