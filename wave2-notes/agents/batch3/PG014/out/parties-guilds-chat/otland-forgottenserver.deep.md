# otland-forgottenserver (parties-guilds-chat, cell 2)

Donor: `/mnt/frankendom-donors/otland-forgottenserver/src/party.cpp` | Licence: GPL-2.0 (`LICENSE` is the GNU GPL version 2 text, "Version 2, June 1991"; the source header says "governed by the GPL-2.0 License") | C++ (with Lua event scripts) | symbol `Party::getMemberSharedExperienceStatus`, `Party::getSharedExperienceStatus`, `Party::shareExperience`, `Party::updateSharedExperience`

Checked: Read in full: `src/party.cpp` 1-472 (all of it). Read: `src/party.h` 1-25 (range and floor constants, status enum); `src/events.cpp` 614-645 (the C++ call that runs the Lua share hook); `data/events/scripts/party.lua` 43-67 (default share formula); `src/player.cpp` 1396-1416 (walk path), 2200-2210 (death path), 3586-3600 (in-fight end), 3695-3702 (idle clear), 3704-3736 (activity counting), 3738-3802 (kill XP and share call); `src/creature.cpp` 169-175 (base idle clear); `src/configmanager.cpp` 265 and `config.lua.dist` 8 (pzLocked); `src/tools.cpp` 1110-1113 (OTSYS_TIME). Not read: `Position::isInRange` (so the bounds are inclusive or not is taken as named, not verified), how `gainExp` is computed per kill (the monster XP formula), `src/guild.cpp` and `src/chat.cpp` (the guild and channel parts of this topic are not covered by this note). Camera: not applicable (camera_scope not applicable). Confidence: high on the share gate and split (read end to end, with arithmetic checked); medium on the exact range bounds (name read, function body not). Hint file `src/party.cpp` was the right file.

Best transferable idea: Split a kill's XP among the whole group with a multiplier that grows with the number of distinct classes, and gate each member on level, distance and recent activity at kill time.
Decision (proposed): adapt - take the gate-then-split shape and the group multiplier as zone data; evaluate eligibility at kill time on the server; drop the all-or-nothing gate unless Frankendom wants it, and drop the class-count bonus if Frankendom has no classes.
Acceptance: a server test shows that a kill worth 100 XP in a 3-member party (leader plus 2, two distinct classes) gives each member 44 XP (ceil(100 x 1.30 / 3)); a member 31 tiles away gets no share and the other members get none either, under the all-or-nothing option.

## 1. Mechanism

- Party XP sharing. When a party member kills a monster, the kill XP goes to every party member and the leader, each getting the same share. The share is the kill XP times a multiplier, divided by the party size. Sharing happens only when the party has its shared-XP mode on and a single cached flag says the whole party is eligible.
- Order of steps, as the code runs:
  - (a) Kill. `Player::onGainExperience` (3785-3800): if the target is not a player, the party exists, shared XP is active and the cached flag is enabled, it calls `party->shareExperience(gainExp, target)` and returns (3791-3795). Otherwise the killer gets the XP on its own (3798-3799).
  - (b) Share amount. `Party::shareExperience` (379-388) passes the raw amount to the Lua hook `Party:onShareExperience` (382). The default script (`data/events/scripts/party.lua` 43-67) computes the multiplier: 1.20 when the party has one or zero distinct vocations (44), otherwise `1 + size*(5*(size-1)+10)/100` where size is the number of distinct base vocations among the leader and members (61-63). It then divides: `ceil(exp * multiplier / (membersExcludingLeader + 1))` (65). The returned value replaces the amount (`events.cpp` 640).
  - (c) Give. The share goes to each member (385) and to the leader (387).
  - (d) Eligibility, per member, in this order (`getMemberSharedExperienceStatus`, 395-431): (1) level floor: the member must be at least `ceil(highestLevel * 2 / 3)`, where highestLevel is the highest level among the leader and members (401-411); (2) distance: the member must be within 30 tiles (x and y) and 1 floor of the leader (413-416); (3) activity: unless the member has the NotGainInFight flag, the member must have a tick entry for this party, and `OTSYS_TIME() - tick` must be at most `PZ_LOCKED` ms (418-428).
  - (e) All-or-nothing. `getSharedExperienceStatus` (433-447) checks the leader first, then each member, and returns the first failure. `updateSharedExperience` (322-331) stores the result in one flag, `sharedExpEnabled`, and refreshes every party icon if it changed. That one flag decides the kill-time branch in (a).
  - (f) Activity. `updatePlayerTicks` (449-455) stamps `ticksMap[playerId] = OTSYS_TIME()` when a player damages a hostile non-player monster (`player.cpp` 3704-3713) or heals a partner (3719-3733), if the points are non-zero and the player does not have NotGainInFight. `clearPlayerPoints` (457-464) removes the entry. It is called when the player's in-fight condition ends (`player.cpp` 3590-3591, which calls `onIdleStatus`, which calls `clearPlayerPoints` at 3700), and when the player dies (2208).
  - (g) Refresh triggers. `updateSharedExperience` runs on: leave (111), pass leadership (148), join (209), activity change (453 and 462), a walk step (`player.cpp` 1415-1416), and level change (1806, 1890). It does nothing when shared XP is off (324).
  - (h) Formation and leadership (read, not part of the XP split). `invitePlayer` (254-287) refuses a player already invited (256-258) and adds them to `inviteList`. `joinParty` (167-217): the first accepted invite forms the party, so the leader's other invitations are cleared (176-178); the joiner goes to the back of `memberList` (181) and clears their own invitations (186). `removeInvite` (219-240) disbands when the party is empty (235-237). `leaveParty` (57-122): if the leader leaves with members, leadership goes to `memberList.front()` (73-79); if the leader leaves with one member and no invitations, or the party ends up empty, it disbands (117-118). `passPartyLeadership` (124-165) puts the old leader at the front of `memberList` (146). `disband` (16-55) clears every member and deletes the party (54).
- Tick: event-driven, not a per-frame loop. The eligibility flag is cached and recomputed only at the triggers above; there is no timer that re-checks distance or activity between triggers. `Player::addInFightTicks` creates the in-fight condition for `PZ_LOCKED` ms (`player.cpp` 2275-2276; other callers not read), and its end clears the entry and refreshes the flag (3590-3592). So an inactive member is dropped at the end of the in-fight window, not the moment the 60 s passes.

## 2. Key functions

- `Party::getMemberSharedExperienceStatus`: `/mnt/frankendom-donors/otland-forgottenserver/src/party.cpp` 395-431. Level floor, distance, activity, in that order.
- `Party::getSharedExperienceStatus`: same file, 433-447. Leader first, then members; first failure wins.
- `Party::shareExperience`: same file, 379-388. Calls the Lua hook, then gives the share to members and leader.
- `Party::updateSharedExperience`: same file, 322-331. Recomputes the one cached flag and refreshes shields if it changed.
- `Party::updatePlayerTicks` and `Party::clearPlayerPoints`: same file, 449-464. The activity map.
- `Player::onGainExperience`: `/mnt/frankendom-donors/otland-forgottenserver/src/player.cpp` 3785-3800. The kill-time branch.
- Default formula: `/mnt/frankendom-donors/otland-forgottenserver/data/events/scripts/party.lua` 43-67 (Lua, server data, not C++).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Share = kill XP x group multiplier / (members + 1), rounded up | Base multiplier 1.20 for one vocation (theirs, `party.lua` 44) |
| Group multiplier grows with the number of distinct classes in the party | 1 + size*(5*(size-1)+10)/100: size 2 gives 1.30, size 3 gives 1.60, size 4 gives 2.00 (theirs, `party.lua` 62; the values are computed from that formula, not read from a table) |
| Level floor relative to the highest level in the party | ceil(highest * 2 / 3) (theirs, `party.cpp` 408) |
| Distance gate from the leader | 30 tiles on x and y, 1 floor (theirs, `party.h` 14-15) |
| Activity window after the last damage or heal | `pzLocked` = 60000 ms (theirs, `configmanager.cpp` 265; `config.lua.dist` 8); clock is `OTSYS_TIME` in ms (`tools.cpp` 1112) |
| All-or-nothing: one failing member disables sharing for everyone | None (structural rule, `party.cpp` 433-447 and 325) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for the per-member gate (level floor, then distance from the leader, then activity), the leader-first whole-party check with first failure winning, and the share formula with the same ceil and the same 1.20 default. It takes the vocation count as a number instead of reading vocations, takes the group multiplier as the default formula only (the Lua hook override is not modelled), and omits the cached flag and its refresh triggers, the NotGainInFight exception is kept only as a boolean, and the messages, shield refresh, XP application and the killer's own XP path. Range bounds are inclusive in the sketch; the donor's `isInRange` was not read. The sketch was typechecked with `tsc --strict --target es2020` on the VPS (exit 0).

```ts
// Licence: GPL-2.0 (donor). Clean-room sketch written from the described mechanism; not a translation.
interface PartyMember {
  id: number;
  level: number;
  x: number;
  y: number;
  z: number;
  lastTickMs: number | null;   // last damage or heal that counted as activity; null = none
  notGainInFight: boolean;     // flag that exempts the activity check
}

type ShareStatus = 'ok' | 'empty' | 'level-spread' | 'too-far' | 'inactive';

interface SharePolicy {
  rangeTiles: number;          // EXPERIENCE_SHARE_RANGE in the donor
  floors: number;              // EXPERIENCE_SHARE_FLOORS in the donor
  activityWindowMs: number;    // pzLocked in the donor config
  baseMultiplier: number;      // share multiplier with one vocation
}

const POLICY: SharePolicy = { rangeTiles: 30, floors: 1, activityWindowMs: 60000, baseMultiplier: 1.2 };

// Per-member check, in donor order: level floor, then distance from the leader, then recent activity.
function memberStatus(leader: PartyMember, highestLevel: number, m: PartyMember, nowMs: number, p: SharePolicy): ShareStatus {
  if (m.level < Math.ceil((highestLevel * 2) / 3)) return 'level-spread';
  if (Math.abs(m.x - leader.x) > p.rangeTiles || Math.abs(m.y - leader.y) > p.rangeTiles ||
      Math.abs(m.z - leader.z) > p.floors) return 'too-far';
  if (!m.notGainInFight && (m.lastTickMs === null || nowMs - m.lastTickMs > p.activityWindowMs)) return 'inactive';
  return 'ok';
}

// One boolean for the whole party: the first failing member turns sharing off for everyone.
function partyShareStatus(leader: PartyMember, members: PartyMember[], nowMs: number, p: SharePolicy): ShareStatus {
  if (members.length === 0) return 'empty';
  const all = [leader, ...members];
  const highest = Math.max(...all.map(m => m.level));
  for (const m of all) {
    const s = memberStatus(leader, highest, m, nowMs, p);
    if (s !== 'ok') return s;
  }
  return 'ok';
}

// Each member gets the same share: kill XP x multiplier, split over every party member including the leader.
function perMemberShare(exp: number, distinctVocations: number, membersExcludingLeader: number, p: SharePolicy): number {
  const size = distinctVocations;
  const multiplier = size > 1 ? 1 + (size * (5 * (size - 1) + 10)) / 100 : p.baseMultiplier;
  return Math.ceil((exp * multiplier) / (membersExcludingLeader + 1));
}
```

## 5. Lands in

- TARGET `src/fight/xp-share.ts` (new, proposed path; the repo layout was not checked). The engine computes the share on the server, from server positions and server-held levels, when a kill is verified. The client only shows the result.
- Parity-checklist row 18 (loot roll and XP award). This is the closest row: the donor's mechanism is the XP award for a party kill.
- Reuse tag: rewrite-from-idea (GPL-2.0, clean-room only; the sketch is written from the described mechanism).
- Brief rule served: one ledger (XP is credited once, by the engine) and server-verified kills (eligibility uses server state).

## 6. Gaps and risks

- All-or-nothing gate. One member 31 tiles away, or one under the level floor, switches shared XP off for the whole party until the next refresh. The killer keeps only their own XP. Decide whether Frankendom wants that or a per-member gate; the donor's choice is a design decision, not a fact of the game.
- The flag is cached. Eligibility is recomputed only at the triggers in section 1 (g). A change in range or activity between triggers is not seen until the next trigger. Frankendom's server-verified kills need the check at kill time instead of a cached flag.
- The multiplier formula counts distinct vocations (classes). Frankendom has no class-count rule in the parity list; if it has none, drop the count bonus and keep only the base multiplier.
- Cost. Every walk step of a party member calls `updateSharedExperience` (`player.cpp` 1415-1416). When shared XP is active, each call loops over all members (324-325, 433-447). Not measured. Under a fight tick budget this may matter at large party sizes.
- Lua override. The multiplier can be replaced by a server script (`events.cpp` 640). This is a per-server hook, not a per-zone table.
- The donor's messages ("Shared Experience is now active", "too far away", "level spread", "inactive") are the only feedback the player gets for why sharing is off. Frankendom needs the same reason codes on the server side, not free text.
- Not covered by this note: guild ranks and permissions (`src/guild.cpp`, 88 lines, not read), chat channels and the party channel (`src/chat.cpp`, not read). Formation and leadership rules are summarised in section 1 (h) only; no separate note.
- Shield icons: `party.cpp` sends `sendCreatureShield` and `updatePlayerShield` to show party state (for example 27, 276-277). The otclient donor (cell 1) infers its roster from those icons. The shield values the server sends for invitees were not read.

Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
Brief rule served: one ledger (XP credited once by the engine); server-verified kills (eligibility from server state)
