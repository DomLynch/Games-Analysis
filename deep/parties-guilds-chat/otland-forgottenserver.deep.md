# otland-forgottenserver (parties-guilds-chat, cell 18)

Donor: /mnt/frankendom-donors/otland-forgottenserver/src/party.cpp | Licence: GPL-2 | C++ | symbol Party::joinParty / Party::shareExperience (input line 167 verified: `joinParty`)

## 1. Mechanism
- Shared experience is a party setting. Only the leader can switch it on (Party::setSharedExperience). While it is on, the party keeps a party-wide "enabled" flag that is recomputed (updateSharedExperience, 322-331) on join (209), leave (111), a leadership change (148), a member's activity or its clearing (453, 462), and a player-side hook at player.cpp 1416 (a bare `party->updateSharedExperience()` call, read) and at 1806 and 1890 (not read). Turning sharing off does not reset the enabled flag (371-373); the award path requires both flags.
- Eligibility (getSharedExperienceStatus) checks the leader first, then each member, and returns the first failing reason. Checks per member (395-431), in this order: an empty member list fails at once (397); level at least ceil(2/3 of the highest level among leader and members) (401-411); within 30 tiles in x and in y and within 1 floor of the leader, inclusive (`isInRange` uses <=, position.h 40-43); and recent activity, unless the player has the NotGainInFight flag: a missing entry in the activity map, or one older than the config value `pzLocked` (default 60000 ms), fails (418-429).
- Activity is written by updatePlayerTicks(player, points) (449-455) when points is non-zero and the player lacks NotGainInFight, and cleared by clearPlayerPoints (457-464). The callers are in player.cpp: damage dealt to a hostile monster (3704-3717), healing a party partner or a partner's summon (3719-3736), and the idle-status hook which clears it (3695-3702).
- Join (joinParty, 167-217): a Lua hook can veto (170). If the member list is empty the leader's pending invitations are cleared (176). The member is appended, its party pointer is set, a join message is broadcast (181-183), its invitations are cleared, icons and skulls are refreshed, `updateSharedExperience` runs (209), and the joiner gets a message.
- Award (shareExperience): input is one experience amount and an optional source creature. A Lua hook may change the amount. The same amount is passed to every member, then to the leader (384-387), each through onGainSharedExperience, which calls gainExperience (player.cpp 3802, 3776-3783); that returns without effect for the NotGainExperience flag, a zero amount, or zero stamina minutes. The loop does not split the amount and does not re-check each member.
- Caller: Player::onGainExperience (player.cpp 3785-3800) sends a non-player kill to shareExperience only when shared XP is active and enabled, and returns before the killer's own gain.
- Output: experience added to each member and the leader. No return value.
- Tick: event-driven. party.cpp has no per-tick loop.

## 2. Key functions
- Party::joinParty: /mnt/frankendom-donors/otland-forgottenserver/src/party.cpp, lines 167-217. Veto hook, append member, refresh icons, recompute shared XP, message.
- Party::updateSharedExperience: /mnt/frankendom-donors/otland-forgottenserver/src/party.cpp, lines 322-331. Recomputes the party-wide enabled flag and refreshes icons only on change.
- Party::setSharedExperience: /mnt/frankendom-donors/otland-forgottenserver/src/party.cpp, lines 355-377. Leader-only toggle; on enable it sets the enabled flag and sends the status message.
- Party::shareExperience: /mnt/frankendom-donors/otland-forgottenserver/src/party.cpp, lines 379-388. Hook, then the same amount to every member and the leader.
- Party::getMemberSharedExperienceStatus: /mnt/frankendom-donors/otland-forgottenserver/src/party.cpp, lines 395-431. Empty-party, level floor, range and activity checks for one player.
- Party::getSharedExperienceStatus: /mnt/frankendom-donors/otland-forgottenserver/src/party.cpp, lines 433-447. Leader first, then each member; first failure wins.
- Party::updatePlayerTicks: /mnt/frankendom-donors/otland-forgottenserver/src/party.cpp, lines 449-455. Records the activity time that the range and activity checks read.
- Party::clearPlayerPoints: /mnt/frankendom-donors/otland-forgottenserver/src/party.cpp, lines 457-464. Drops the activity entry and recomputes.
- Player::onGainExperience: /mnt/frankendom-donors/otland-forgottenserver/src/player.cpp, lines 3785-3800. Routes a non-player kill into shareExperience.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Party-wide enabled flag from ordered per-member checks; first failing reason returned | Level floor ceil(2 x highest level / 3) (theirs, party.cpp line 408) |
| Range gate on the leader's position, tile window in x and y plus floor window | Range 30 tiles in x and 30 in y, floor window 1 each way (theirs, party.h lines 14-15, used at party.cpp 413-414; isInRange in position.h 40-43) |
| Activity gate from a timestamp map keyed by player id | Activity window pzLocked, default 60000 ms (theirs, configmanager.cpp line 265, read at party.cpp 426) |
| Award step with one amount passed to all members | No split in the C++ (theirs); a Lua hook may alter the amount (theirs, not read) |

## 4. TypeScript sketch
Clean-room. Written from the mechanism above, not from the donor's lines.

simplified: omits the NotGainInFight bypass of the activity check, the Lua hooks (join, share), the zero-amount and zero-stamina early returns in gainExperience, the active-versus-enabled flags and their icon refresh, and the gate in `onGainExperience`. The activity map is replaced by a `lastActiveMs` field per member. Range uses `>` on the far side, matching the donor's inclusive `<=`. Check order (empty, level, range, activity; leader first) matches the donor, and the award order (members, then leader) matches.

```ts
// Licence: GPL-2 - clean-room sketch, no lines translated
// Mechanism only: a party-wide flag gated by ordered member checks, then one amount to each member.

type Member = { level: number; x: number; y: number; floor: number; lastActiveMs: number | null };
type Status = 'ok' | 'empty' | 'level' | 'far' | 'inactive';

const RANGE_XY = 30;
const FLOOR_WINDOW = 1;
const ACTIVE_WINDOW_MS = 60_000;

function memberStatus(m: Member, leader: Member, highest: number, now: number): Status {
  if (m.level < Math.ceil((highest * 2) / 3)) return 'level';
  const far =
    Math.abs(m.x - leader.x) > RANGE_XY ||
    Math.abs(m.y - leader.y) > RANGE_XY ||
    Math.abs(m.floor - leader.floor) > FLOOR_WINDOW;
  if (far) return 'far';
  if (m.lastActiveMs === null || now - m.lastActiveMs > ACTIVE_WINDOW_MS) return 'inactive';
  return 'ok';
}

export function partyShareStatus(leader: Member, members: Member[], now: number): Status {
  if (members.length === 0) return 'empty';
  const all = [leader, ...members];
  const highest = Math.max(...all.map((m) => m.level));
  for (const m of all) {
    const s = memberStatus(m, leader, highest, now);
    if (s !== 'ok') return s;
  }
  return 'ok';
}

export function shareXp(amount: number, members: Member[], leader: Member, grant: (who: Member, xp: number) => void): void {
  for (const m of members) grant(m, amount);
  grant(leader, amount);
}
```

## 5. Lands in
- Frankendom target: NEW `origins/server/party-xp.ts` (eligibility and equal-share award), called from `origins/server/mob-rewards.ts` (it exists on the VPS snapshot /root/work-k7, not main; its content was not read). Party membership itself would come from a later `origins/presence/party.ts`.
- Parity-checklist row: 18 (loot roll and XP award; post-K item 3: the server tick unifies rewards). Parties as a feature are a later phase (feature-map section: parties, guilds and chat).
- Reuse tag: rewrite-from-idea (GPL-2 donor; the sketch is clean-room)
- Brief rule served: (category default, not per-cell) 10 (zone copies); rules 7-9 n/a

## 6. Gaps and risks
- Server-verified kills and one ledger: the award must be decided once on the server from a verified kill, then written as one ledger entry per member. The donor hands each member a separate `gainExperience` call with no shared transaction.
- The donor gives every member the full amount (no split, 384-387), and the leader is paid after the members. Frankendom must choose its own split rule; do not copy this default.
- The award step does not re-check each member at award time; only the party-wide enabled flag gates it (`onGainExperience` 3791-3792), so a member who just walked out of range still gets paid until the next recompute.
- Activity is fed by damage to a hostile monster and heals to a partner (player.cpp 3704-3736). Frankendom must feed the same timestamp only from server-verified combat events. A party member who stays near and heals can keep a non-fighter eligible.
- Party state, the activity map and the flags live in memory; nothing is persisted, a restart clears them.
- MAX_ATTACKERS = 3 is a combat cap and is independent of party size; do not let the XP share rule pull more than three attackers into a fight.
- Chat, invitations, icons and skulls (the message and icon calls in 181-207) are UI and protocol work this read does not use.
- Lua hooks (onJoin, onShareExperience, onRevokeInvitation, onDisband) are the donor's extension points; Frankendom has no equivalent here.
- Pit is a client only and has no party XP. Zones are data: range and floor window are engine constants, not per-zone code.
- Not read: `Party::disband` bodies beyond the opening lines, player.cpp 1806 and 1890, and `Position::getDistanceZ`. `Party::leaveParty` (57-122) was read.
