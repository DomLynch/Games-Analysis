# xu4-engine-u4 (parties-guilds-chat, cell 18)

Donor: /mnt/frankendom-donors/xu4-engine-u4/src/party.cpp | Licence: GPL-3.0 per COPYING (party.cpp carries no per-file notice) | C++ | symbol PartyMember / Party::join (input line 33 verified: `PartyMember::PartyMember`)

## 1. Mechanism
- This "party" is the single-player companion roster of an Ultima IV save: up to 8 slots, with the avatar in slot 0. It is not networked and has no chat or shared XP.
- Input: a character name, matched against the save's player records. Output: the matched record is swapped into the next free slot, a PartyMember wrapper is created around it, the member count goes up by one, and a MEMBER_JOINED event is emitted.
- join(name) (986-1014) scans slots from the current member count up to 8 (990). On a name match it refuses with JOIN_NOT_EXPERIENCED when members + 1 is greater than the avatar's max HP divided by 100 (integer division, 994). It refuses with JOIN_NOT_VIRTUOUS when the karma of the candidate's class is above 0 and below 40 (998-999). Otherwise it swaps the record with the one at the member-count slot (1002-1004) and returns JOIN_SUCCEEDED. No match returns JOIN_NOT_EXPERIENCED (1013, the same code as the experience refusal). Only the first name match is tested: a refusal returns immediately.
- On success join increments the save's member count itself: the `saveGame->members++` is inside the argument of the `PartyMember` constructor call (1006), in the same statement as `members.push_back`.
- syncMembers (1174-1180) rebuilds the wrapper list from save slots 0 to members-1 (without clearing-then-deleting the old wrappers: `members.clear()` only drops the pointers), for use after a load.
- size(), member(index) and memberIndex(person) (1185-1203) read the wrapper list; `member` does no bounds check, `memberIndex` returns -1 for no match.
- PartyMember::awardXp (200-203) adds XP through AdjustValueMax with a cap of 9999, then notifies. AdjustValueMax (utils.h lines 14, 18, 22) is `v += val; if (v > max) v = max;`: it clamps only the top, so a negative amount subtracts, and for the `unsigned short` overload below zero it would wrap.
- The PartyMember constructor (33-48) wraps a save record: it takes the creature of the class's tile, sets the movement behaviour to attack-the-avatar, sets `ranged` from the weapon range, and copies the status without notifications.
- Tick: event-driven. Party::endTurn exists (party.cpp line 820) but was not read.

## 2. Key functions
- Party::join: /mnt/frankendom-donors/xu4-engine-u4/src/party.cpp, lines 986-1014. Scan, experience and karma gates, slot swap, wrapper creation, event.
- PartyMember::PartyMember: /mnt/frankendom-donors/xu4-engine-u4/src/party.cpp, lines 33-48. Wraps a save record; sets movement and ranged from the weapon range.
- Party::syncMembers: /mnt/frankendom-donors/xu4-engine-u4/src/party.cpp, lines 1174-1180. Rebuilds the wrapper list from the save slots.
- PartyMember::awardXp: /mnt/frankendom-donors/xu4-engine-u4/src/party.cpp, lines 200-203. Adds XP clamped to 9999, then notifies.
- Party::size, Party::member, Party::memberIndex: /mnt/frankendom-donors/xu4-engine-u4/src/party.cpp, lines 1185-1187, 1192-1194 and 1196-1203. Read accessors over the wrapper list.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed-size roster with a swap-in on join and a refusal on each gate | 8 slots (theirs, party.cpp line 990) |
| Experience gate: count against a fraction of the leader's max stat | Divisor 100 on avatar max HP (theirs, line 994) |
| Gate on a per-class score held in a range | Karma refused when above 0 and below 40 (theirs, lines 998-999) |
| Capped XP add | Cap 9999 (theirs, line 201) |

## 4. TypeScript sketch
Clean-room. Written from the mechanism above, not from the donor's lines.

simplified: the sketch returns early for an unknown name and tests only the first name match, as the donor does. It omits the wrapper creation (`PartyMember`), the MEMBER_JOINED event and the member-count increment (the sketch's caller does it), and it does the swap on a plain array. The donor reads the avatar's max HP and the karma table from the save; the sketch takes them as arguments. The experience test uses real division where the donor uses integer division; the two give the same answer for integer member counts.

```ts
// Licence: GPL-3 donor - clean-room sketch written from the section 1 description; original structure, no donor lines.
// Mechanism only: a fixed-size roster; recruiting finds the named record among the not-yet-recruited slots,
// runs ordered refusal checks, then swaps it into the first free recruited position. The caller bumps the member count.

type Rec = { name: string; klass: number };
type JoinResult = 'joined' | 'not_experienced' | 'not_virtuous';

const SLOTS = 8;
const HP_PER_MEMBER = 100;                    // theirs: experience scale on the leader's max HP
const REFUSED_KARMA = { above: 0, below: 40 }; // theirs: a class score strictly inside this window blocks joining

export function joinRoster(
  roster: Rec[],
  members: number,
  karma: number[],
  leaderHpMax: number,
  name: string,
): JoinResult {
  const pending = roster.slice(members, SLOTS);
  const found = pending.findIndex((r) => r.name === name);
  if (found < 0) return 'not_experienced'; // an unknown name reports the same code as the experience refusal

  const candidate = pending[found];
  const score = karma[candidate.klass];
  // Refusals are checked in this order; the first that applies wins.
  const refusals: Array<[boolean, JoinResult]> = [
    [members + 1 > leaderHpMax / HP_PER_MEMBER, 'not_experienced'],
    [score > REFUSED_KARMA.above && score < REFUSED_KARMA.below, 'not_virtuous'],
  ];
  const blocked = refusals.find(([applies]) => applies);
  if (blocked) return blocked[1];

  const displaced = roster[members];
  roster[members] = candidate;
  roster[members + found] = displaced;
  return 'joined';
}

export function memberAt(roster: Rec[], members: number, index: number): Rec | undefined {
  return index >= 0 && index < members ? roster[index] : undefined;
}
```

## 5. Lands in
- Frankendom target: NEW `origins/presence/party.ts` (roster; same module as the Nakama-style seat roster) if a recruit gate is ever wanted; recruiting is not a current Frankendom feature. Nothing exists today. Parties and layer assignment by party leader are in `docs/specs/origins/one-shard.md` §5 (VPS snapshot /root/work-k7, not main).
- Parity-checklist row: none of rows 1 to 22. Feature-map section: parties, guilds and chat (later phase).
- Reuse tag: rewrite-from-idea
- Brief rule served: (category default, not per-cell) 10 (zone copies); rules 7-9 n/a

## 6. Gaps and risks
- Single-player only. The roster lives in the save file on the local client. There is no server authority, no shared roster across players, and no chat.
- Frankendom must not copy the save-as-authority model (the join mutates `saveGame` directly, 1002-1006): roster state has to be server-owned, with the client a view. That conflicts with the server-verified ruling and the one ledger.
- The experience gate uses max HP, not level; the karma gate is a moral system specific to this game. Neither is a Frankendom rule.
- AdjustValueMax does not clamp below, so a negative XP award reduces XP and an unsigned field would wrap (utils.h 14-22). Frankendom awards go through the ledger with integer and range checks.
- `join` checks only the first name match and trusts `saveGame->members` to be consistent with the wrappers; `syncMembers` is the only repair.
- Pit is a client only; zones are data. A companion roster does not interact with MAX_ATTACKERS = 3 here (companions would be extra attackers on the player side, a combat decision).
- Not read: `Party::endTurn` (line 820), the gear and status effects on members, and `Party::swapPlayers` (1156).
