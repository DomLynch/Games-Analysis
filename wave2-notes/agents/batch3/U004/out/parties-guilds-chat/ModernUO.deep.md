# ModernUO (parties-guilds-chat, cell 18)

Donor: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Party/Party.cs` (with `DeclineTimer.cs` and `PartyCommands.cs` in the same folder; stat path in `Server/Mobiles/Mobile.cs`, loop in `Server/Main.cs`) | Licence: GPL-3.0, "GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007" (`/mnt/frankendom-donors/ModernUO/LICENSE`) | C# | symbol `Party.Invite`

Checked: Party engine read: `Party.cs` 11-100 (fields, capacity, stat broadcast), 136-220 (death and login hooks, `Get`, `Add`), 222-385 (accept, decline, remove, disband, invite), 486-530 (rejoin timer, in part). `DeclineTimer.cs` read in full. `PartyCommands.cs` read in full (150 lines). Stat path: `Mobile.cs` 2676-2712 and 2800-2876 (delta flags, in part) and 7850-7900 (delta queue). Loop: `Main.cs` 690-730 (in part). Corpse loot check: `Corpse.cs` 742-770 (in part). Range helpers: `Utility.cs` 530-545 (wrappers only; the `InRange` body was not read). Callers, checked: `DeclineTimer.Start` has one caller (`Party.cs` 383). The `IParty` stat callbacks are called from `Mobile.cs` 2865 and 2870; `OnStatsQuery` is called from `IncomingPlayerPackets.cs` 410 (grep). Not read: `Party.SendPublicMessage` and `SendPrivateMessage` bodies (401-418), `PartyPackets.cs`, `AddPartyTarget.cs`, the guild code (`Server/Guild.cs`, `Gumps/Guilds/`), the chat engine (`Engines/Chat/`, Channel.cs 481 lines, ChatUser.cs). This note covers parties only; guilds and chat are not judged. Confidence high on invite, expiry, accept, decline and capacity; medium on the stat timing, because the delta queue was read only in part. camera_scope: not a camera cell.

Best transferable idea: A group invite is a pending record with its own 30-second expiry, the group's capacity counts those pending invites as well as members, and stamina and mana updates go only to members within the server's update range who can see the player.
Decision (proposed): adapt — the invite expiry, pending-counts-toward-capacity rule and range-gated broadcast suit zone groups, but a party is a social roster, not a fight group, so Frankendom keeps the 10-seat party apart from the MAX_ATTACKERS = 3 fight group and does not copy the donor's roster into the engine.
Acceptance: a server test where an invite to player B expires at 30 s and B leaves the pending list, a re-invite at 20 s moves the expiry to 50 s, an invite that would take members plus pending invites to 11 is refused, and B's stamina and mana reach members within 18 tiles only.

## 1. Mechanism

- Structure. A `Party` holds the leader, the members (each a `PartyMemberInfo`), and `Candidates`, the list of pending invitees (`Party.cs` 16-25, 31-33). `Capacity` is 10 (13), and the count used against it is members plus candidates (PartyCommands.cs 18, 127).
- Invite, in order. `PartyCommands.OnAdd` refuses if members plus candidates is already at or above 10 (PartyCommands.cs 18-21), otherwise it starts the target picker (24). `Party.Invite` (Party.cs 341-384): faction check (346); a new party is created with the inviter as leader if none exists (353-358); the target is added to `Candidates` if not already there (360-363); the invite message and the invitation packet go out (366-380); the invitee's `Party` field is set to the inviter (381) as a marker for the pending leader; then `DeclineTimer.Start` (383).
- Expiry. `DeclineTimer` (DeclineTimer.cs) is one timer per invitee in a static table (8). It is 30 seconds (12). `Start` stops any older timer for the same invitee (20-24), so a repeat invite resets the 30 seconds. On tick it removes itself from the table (29), and only if the invitee still points at the same leader (31) does it call `OnDecline` (33).
- Accept (`PartyCommands.OnAccept`, 116-131). It reads the pending leader from `from.Party` and clears that field (118-119). It requires that the player is still a candidate (123) and that members plus candidates is at most 10 (127), counting the accepting player. Then `Party.OnAccept` (Party.cs 222-256): faction check unless forced (227); the join line goes to all members and listeners (249-250); the candidate is removed (254); `Add` (255) runs.
- Add (Party.cs 188-220). A new member gets a `PartyMemberInfo` (197) and `m.Party = this` (198). The member list goes to everyone (208-209). Each existing member and the newcomer exchange their status and attributes (211-217).
- Decline (`PartyCommands.OnDecline`, 133-148; `Party.OnDecline`, Party.cs 258-281). The leader and invitee get messages (261-263). The candidate is removed (265). If no candidates are left and only the leader remains (268), the party is cleared (273-280), so a lone leader with no pending invites is dissolved.
- Removal. A leader's removal disbands the party (Party.cs 285-288). A member's removal takes them out (292-300) and sends messages. When one member is left, the party says the last person has left and disbands (318-322).
- Logout and login. `EventSink_Logout` removes the player from the party at once (177-184). `OnLogin` (162-175): if the player is still in a party, a `RejoinTimer` starts (169), with a 1-second delay (RejoinTimer, 492). On tick it sends the member list and join lines to the other members (494-530). It never restores a seat: logout has already removed the member and nulled `Party` (177-184), so the timer only fires if `Party` survived, and then it only resends the lists.
- Death. A `PlayerDeathEvent` hook (Party.cs 138-160) sends the party a public line ("I killed myself", "I was killed" or "I was killed by <name>"). `Party.Active` is `Members.Count > 1` (28).
- Chat. `PartyCommands.OnPublicMessage` and `OnPrivateMessage` reject text over 128 characters (51, 70) and require party membership (58, 75-80). Routing into `Party.SendPublicMessage` was not read.
- Corpse loot flag. `PartyCommands.OnSetCanLoot` sets `CanLoot` on the member's roster entry (87-113). `UOContent/Items/Misc/Corpses/Corpse.cs` reads it: the owner or a GM is never criminal (752-755); a party member whose owner set `CanLoot` returns false (757-767); otherwise the function returns the notoriety test (769). The meaning of that final test was not checked.
- Stat broadcast. `IParty` has three methods: stamina, mana, and a stats query (Interfaces.cs 48-53). There is no hits callback. `Mobile.cs` 2859-2871 calls `OnManaChanged` and `OnStamChanged` on the mobile's party whenever a stamina or mana delta is processed. `Party.OnStamChanged` (Party.cs 53-68) sends the packet to each other member on the same map who is inside `Utility.InUpdateRange` and can see the player (63). `OnManaChanged` (70-85) does the same. `OnStatsQuery` (87-99) answers a member who asks, if they are in range.
- Timing. A mobile's delta is queued (`Mobile.cs` 7858-7861). `RunEventLoop` (Main.cs 705-) flushes the mobile delta queue (717) at the start of each loop pass, before the timer slice (725).

## 2. Key functions

- `Party.Invite`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Party/Party.cs` 341-384. Capacity is not checked here; the add command checks it first.
- `PartyCommands.OnAccept` and `OnDecline`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Party/PartyCommands.cs` 116-148. The accept capacity test and the pending-leader read.
- `DeclineTimer`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Party/DeclineTimer.cs` 6-36. One 30-second timer per invitee; a restart replaces the old one.
- `Party.OnStamChanged` / `OnManaChanged`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Party/Party.cs` 53-85. Range- and visibility-gated broadcast.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Group capacity counts pending invites as seats | 10 (Party.cs 13; PartyCommands.cs 18, 127) |
| Pending invite expires on its own timer | 30 s (DeclineTimer.cs 12) |
| A repeat invite resets the expiry | Stop old timer, start new (DeclineTimer.cs 20-24) |
| Rejoin after login | 1 s (Party.cs 169; RejoinTimer 492) |
| Stat broadcast gated by range | 18 tiles, `GlobalUpdateRange` (Main.cs 316) |
| Chat length cap | 128 characters (PartyCommands.cs 51, 70) |
| Leader alone with no invites dissolves | Count of 1, no candidates (Party.cs 268-280) |

## 4. TypeScript sketch

simplified: the sketch keeps the capacity count that includes pending invites, the capacity check before an invite (the donor does it in the add command, so it also refuses a repeat invite at capacity), the 30 s expiry with reset on a repeat invite, the accept check that counts the accepting candidate, the lone-member cleanup, the in-range stamina and mana broadcast, and removal on logout at once. It omits the faction check on invite and accept, the packet sends and their order, the per-invitee DeclineTimer table (the sketch uses one sweep over candidates), the rejoin timer (REJOIN_MS is declared but not used; the donor timer only resends the member list, it never restores a seat), the visibility check (CanSee), the stats-query reply, the public and private chat, the 128-character cap, the corpse-loot flag, and the staff listeners. Deviation from the donor: `accept` checks that the invite has not expired, which the donor does not do (it relies on the 30 s timer, so there is a race at the boundary, see Gaps); the sketch takes the safer rule on purpose. The tile-distance helper stands in for `InRange`, whose metric was not read.

```ts
// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
const CAPACITY = 10;        // members plus pending invites
const INVITE_MS = 30_000;   // a pending invite expires after 30 s
const UPDATE_RANGE = 18;    // tiles, the server-wide update range
const REJOIN_MS = 1_000;    // donor RejoinTimer delay after login; it only resends the member list (no seat is restored); declared, unused

interface Player { id: string; map: number; x: number; y: number; party: Party | null; }

class Party {
  members: Player[] = [];
  candidates = new Map<string, number>(); // invitee id -> expiry (ms timestamp)
  constructor(public readonly leader: Player) {
    this.members.push(leader);
    leader.party = this;
  }
  get count(): number { return this.members.length + this.candidates.size; }
}

// Tile distance helper; the donor's InRange metric was not read.
function withinRange(a: Player, b: Player, range: number): boolean {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) <= range;
}

// Invite: refused if members plus pending invites already reach capacity (checked before targeting).
// A repeat invite to the same target resets that target's expiry.
function invite(p: Party, target: Player, now: number): boolean {
  if (p.count >= CAPACITY) return false;
  p.candidates.set(target.id, now + INVITE_MS);
  return true;
}

// Accept: counts the accepting candidate, so members + candidates must still fit capacity.
function accept(p: Party, from: Player, now: number): boolean {
  const expiry = p.candidates.get(from.id);
  if (expiry === undefined || now >= expiry) return false; // deviation: the donor has no expiry check here (race, see Gaps)
  if (p.count > CAPACITY) return false;
  p.candidates.delete(from.id);
  p.members.push(from);
  from.party = p;
  return true;
}

// Expiry pass: runs on each pending invite's own 30 s timer in the donor, not a shared sweep.
function expire(p: Party, now: number): void {
  for (const [id, expiry] of p.candidates) {
    if (now >= expiry) p.candidates.delete(id);
  }
  if (p.candidates.size === 0 && p.members.length === 1) {
    p.leader.party = null;
    p.members = [];
  }
}

// Stamina and mana changes go to other members in range; hits are not pushed by this path.
function broadcastStam(p: Party, changed: Player, send: (to: Player) => void): void {
  for (const m of p.members) {
    if (m !== changed && m.map === changed.map && withinRange(m, changed, UPDATE_RANGE)) send(m);
  }
}

// Logout removes the member at once (donor 177-184). There is no seat hold; the donor's login RejoinTimer only resends the member list.
function onLogout(p: Party, who: Player): void {
  p.members = p.members.filter(m => m !== who);
  who.party = null;
}

export {};
```

## 5. Lands in

- TARGET `origins/server/party.ts` (proposed new module; the name is a proposal and was not checked against the Frankendom tree). Roster, pending invites and the broadcast live on the server.
- Parity-checklist row 14 (HUD): the party's stamina and mana view is a per-player HUD rule: members see each other's values only in range and only when visible. The donor sends no hit points through this path.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: one ledger (the roster and its seats are server state, and the loot-permission flag is read by the server); MAX_ATTACKERS = 3 (the 10-seat party is social; the fight group stays at three).

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism; no donor line was copied.
- Logout removes the player from the party at once (Party.cs 177-184). There is no seat hold. Frankendom must decide whether to hold seats, and write that decision as a test.
- Hit points are not pushed to party members. `IParty` has no hits callback (Interfaces.cs 48-53). A party health view needs its own rule; do not assume this path covers it.
- The invitee's `Party` field carries the pending leader before accept (Party.cs 381), so the field holds either a `Party` or a `Mobile`. Frankendom should keep a separate invitation record, not overload one field.
- The accept window has no expiry check. The 30-second timer removes the candidate, so there is a race at the boundary. Frankendom should check expiry against server time at accept.
- The capacity test is split: the add command checks 10 before targeting (PartyCommands.cs 18), and accept checks at most 10 including the candidate (127). Frankendom should state one rule and test the boundary.
- The corpse-loot flag is a per-member toggle on the roster (PartyCommands.cs 87-113) that the corpse code reads (Corpse.cs 757-767). Loot ownership must be decided on the server, not on the client's flag.
- The final notoriety test in `Corpse.IsCriminalAction` (Corpse.cs 769) was not checked for its meaning; do not port the criminal rule from this read.
- Guilds and chat channels were not read. Nothing in this note covers them.


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** Verified: Capacity 10 (Party.cs 13); OnAdd check 18-21; Invite 341-384 incl. faction 346, new party 353-358, candidate add 360-363, Party=from at 381, DeclineTimer.Start 383; DeclineTimer 30 s (12), stop old (20-24), remove self (29), same-leader check (31), OnDecline (33); OnAccept 116-131 with <=10 at 127; Party.OnAccept 222-256; Add 188-220; OnDecline 258-281 with lone-leader clear at 268-280; Remove 283-323; Logout 177-184; Login 162-175; RejoinTimer 1 s at 492; stat broadcast 53-85 using InUpdateRange+CanSee at 63/80; IParty 48-53 (no hits); Mobile.cs 2859-2871; delta queue 7858-7861; Main.cs 717 before Timer.Slice 725; GlobalUpdateRange 18 (Main.cs 316) and InUpdateRange uses it (Utility.cs 536); chat cap 128 at 51/70; CanLoot 87-113; Corpse.cs 752-769; licence GPL-3 OK. Errors: (1) Sketch comment/onLogout: 'login restores the seat after one second if still in a party' is misleading - logout already removes the member and nulls Party (177-184), so in the donor RejoinTimer only fires if Party survived (e.g. no logout event); it never restores a seat, it only resends the member list/messages (494-530). The note's Gaps correctly says there is no seat hold, so sketch comment contradicts the note. (2) Sketch accept() adds an expiry check (now >= expiry) that the donor does not have; the note flags the race in Gaps but the sketch header claims to keep donor behaviour. (3) Corpse.cs path given without its folder (UOContent/Items/Misc/Corpses/Corpse.cs); cosmetic. (4) Chebyshev withinRange is an admitted stand-in; donor InRange body (Utility.cs ~530) not read.

**Missed:** PlayerDeathEvent hook (Party.cs 138-160) broadcasts 'I was killed by X' to the party - not covered. DeclineTimer entry is not stopped when the invite is accepted or declined (it ticks and no-ops because Party no longer equals leader) - a quirk relevant to the 'expiry' design. Party.Active = Members.Count > 1 (28) is the notion of a real party.
