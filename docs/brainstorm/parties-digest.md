# Digest: parties-guilds-chat (52 notes)

### Dawn-of-Light-DOLSharp (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/D002/out/parties-guilds-chat/Dawn-of-Light-DOLSharp.deep.md
best_idea: A party is a join-ordered roster with a hard size cap, invites only from its leader, and when one member would be left the party dissolves with that member, while a leader who leaves hands leadership to the first remaining player in join order.
decision: adapt - The join-order roster, leader succession and dissolve-at-one rule are simple server state that Frankendom can use, but the party cap (8) must stay separate from the fight cap MAX_ATTACKERS = 3, and the battlegroup loot rule is unread, so port only the roster.
acceptance: Server test: in a party of three the leader leaving makes the earliest-joined remaining player leader and keeps the party; in a party of two either member leaving removes both and deletes the party; joining a party at its cap is refused with full; accepting an invite in PvE combat is refused.
tags: new:party-roster,new:leader-succession,new:dissolve-at-one
gaps/risks(excerpt): - Copyleft (GPL-2.0): clean-room. The sketch is written from the described mechanism only.
- Party size 8 and MAX_ATTACKERS = 3 are different numbers for different rules. A party of eight cannot all attack one target under Frankendom's ruling; do not let party size set the fight cap.
- Two-member parties dissolve when either member leaves (the recursion at 245-249). That is a design choice in the donor; a Frankendom party of two may want it, but it should be a stated rule with a test, not an accident.
- Leader succession uses join order, which is a stable and testable rule. The donor's fallback (264) can pick a non-player living; Frankendom has no non-player party members, so do not port tha
checker: -

### 0ad-0ad (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/PG001/out/parties-guilds-chat/0ad-0ad.deep.md
best_idea: On a join, seat the newcomer in their own last seat if it is in range and free, otherwise in the lowest free seat, with an optional friends-only gate in front.
decision: adapt - The seat memory and friend gate fit a 3-attacker fight when a player drops and rejoins; the donor keys memory by display name and has no timer, so Frankendom must key by server account id and set an explicit grace window as data.
acceptance: A server test where a player who leaves a 3-attacker fight and rejoins inside the grace window gets the old attacker seat back if it is free, gets the lowest free seat otherwise, and a non-friend join gets no attacker seat when friends-only is on.
tags: new:seat-memory-rejoin,new:friend-gated-join,per-player-view,stale-state
gaps/risks(excerpt): - GPL version 2 or later (copyleft): clean-room only. The sketch is written from the mechanism.
- Memory is keyed by display name (`PlayerAssignmentsController.js` 116, 126, 148). Two players with the same name share memory, and a name can be taken by someone else on rejoin. Frankendom must key by account id.
- No timer: memory lasts for the whole setup session. Frankendom needs an explicit grace window (zone data), or a seat is held forever.
- An explicit unassign writes `-1` into memory (147-148), so a host unassign clears the seat memory. Decide whether a kick should do the same.
- The friend gate reads a per-client config list (`BuddyButton.js` 58), not server state. Frankendom's friend 
checker: -

### 2004Scape-Server (permissive, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/PG001/out/parties-guilds-chat/2004Scape-Server.deep.md
best_idea: Decide each viewer's view of a friend's online status with one ordered rule (staff, then the friend's ignore list, then the friend's privacy mode, where friends-only means the friend must list the viewer), and push one status entry to each online player whose list holds the changed player.
decision: adapt - Keep the ordered visibility rule and follower fan-out, but store friends, ignores and privacy mode in Frankendom's one server ledger and enforce the ignore list on private messages, which this donor does not do.
acceptance: A server test where player B sets friends-only and does not list A: A's friend list shows B with world 0; after B adds A, A's list shows B's world in the same tick; an ignored player's private message to the target is refused by the server and never delivered.
tags: per-player-view,new:privacy-mode-visibility,new:follower-fanout,new:tick-one-shot-gate,stale-state
gaps/risks(excerpt): - Ignore lists do not stop private messages on the server path read: the sender handler (`MessagePrivateHandler.ts` 14-34), the world send (`World.ts` 1669-1682), the friends server (`FriendServer.ts` 260-290) and the target delivery (`World.ts` 2036) have no ignore or mode check. The client may filter, which was not read. Frankendom must check the block list at send time, on the server.
- Friend traffic is dropped silently when the link is down: every world-side friend call returns with no send when the socket is not live (`FriendServer.ts` 558-560, and the same pattern in the other world-side methods). Nothing is queued. I did not read whether a reconnect replays logins, so stale presence 
checker: -

### Dawn-of-Light-DOLSharp (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/PG001/out/parties-guilds-chat/Dawn-of-Light-DOLSharp.deep.md
best_idea: Store one ladder of ranks by level, where each level is a superset of the level below, and gate every guild action through one server-side permission check that reads the rank's flag, with the leader defined as level 0 and chat hearing checked per recipient.
decision: adapt - Keep the single permission check, the superset ladder as data and the per-recipient hear check; give Demote its own flag instead of the donor's Promote alias, and add a server guard that keeps exactly one level-0 rank.
acceptance: A server test where a rank-2 officer (default ladder: invite and promote, no remove) can invite but not remove a member; a new member (rank 9) can hear guild chat but a guild send is refused; a leader edit that would leave no level-0 rank, or two, is refused with a message.
tags: new:rank-ladder-superset,new:single-permission-check,new:per-recipient-hear,presence-gated
gaps/risks(excerpt): - GPL version 2 or later (copyleft): clean-room only. The sketch is written from the mechanism, not translated.
- Demote has no permission column. It reads the Promote flag (`Guild.cs` 706-708). Probably deliberate because the table has no Demote member, but no comment says so. Frankendom should give demote its own flag.
- The leader rank-level edit has no guard (`guild.cs` 2656-2668). A leader can set any rank's level, so two rows can share level 0 (two leaders) or none can (no leader). `GetRankByID` returns the first match (`Guild.cs` 804), so a duplicate silently hides one row. Frankendom must check that exactly one level-0 rank exists before saving.
- Staff bypass is silent and total: pr
checker: -

### EQEmu (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/PG002/out/parties-guilds-chat/EQEmu.deep.md
best_idea: Keep a party as one fixed-size slot record on the server, with the leave rules (leader leaving, or a leave that drops below two, disbands it) and a server-checked accept.
decision: adapt - Slot record, size cap and minimum-two rule fit Frankendom; client-only invite and dead succession code do not fit server-verified and one ledger, so the invite must be server-held with an expiry.
acceptance: Refused accept from a gone inviter creates no party; a seventh accept is refused as full; a leader leaving clears every member's party in one write.
tags: new:fixed-slot-party,new:leader-leave-disband,new:accept-time-create,new:member-self-remove,new:size-floor-disband
gaps/risks(excerpt): - GPL-3.0-or-later: clean-room only. The sketch is written from the described mechanism and was typechecked (strict, es2020) on the VPS. It is not a translation of the donor lines.
- No server-held invite. The accept handler (client_packet.cpp 7401-7407) trusts the inviter name in the accept packet and checks only that the inviter is in this zone. In the handlers read there is no invite expiry, so the server cannot refuse a stale invite. Frankendom's server-verified ruling needs the server to hold each invite with an expiry. This is an adapt, not a copy.
- Leader leaving disbands the whole party at any size (661-663). Consistent and simple, but harsh. The succession code that would avoid it 
checker: -

### KsanaDock-Microverse (permissive, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/PG002/out/parties-guilds-chat/KsanaDock-Microverse.deep.md
best_idea: Let one actor hold at most one open session, check range and busy on both ends at start, end every session an actor is in with one call, and release a session whose reply fails (which the donor does not do).
decision: adapt - The one-session gate, the range check and the one-call end fit duel invites, trades and chat on the server; the open-ended turn loop and the failure hold do not fit a fast game, so take the gate and reject the loop.
acceptance: A second invite while either player is busy is refused; a session whose reply fails frees both players; a player leaving the zone ends every session they hold in one call; a server test asserts a start beyond the range value is refused.
tags: new:mutual-busy-gate,new:range-gated-start,new:end-all-for-one,stale-state,new:open-ended-session
gaps/risks(excerpt): - Open-ended by design: no turn cap and no timeout, so a session can run as long as the model answers. A fast game cannot leave a session open with no end. Sessions need a cap or timeout as data, not as a donor default.
- Stuck on failure: the three failure returns (195-197, 217-219, 117-119) leave both characters busy until someone presses L. The donor has no path that releases a session on failure. The sketch adds one (`replyFailed`); it must be tested, it is not proven by the donor.
- Client-side decision: the start is decided in a single Godot process, with the listener pick also done locally (CharacterManager 70-76). Frankendom's rule is server-verified; the server must run the range an
checker: -

### LostCityRS-Engine-TS (permissive, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/PG002/out/parties-guilds-chat/LostCityRS-Engine-TS.deep.md
best_idea: Compute each viewer's presence on the server from the other player's chat mode, ignore list and friend list (hidden when unknown), show hidden and offline the same, push changes only to followers, and allow one social action per player per tick.
decision: adapt - The visibility order, zero-as-hidden and follower push fit server-verified social state; the private message path with no server ignore check, and the silent login drop on a full world, do not fit, so enforce ignore before delivery and refuse full logins with a reason.
acceptance: A player on another's ignore list sees that player as offline and a whisper to them is refused by the server; a FRIENDS-mode player is seen only by viewers on their list; a 101st non-member friend is refused with a reason; a second social action in one tick is refused and accepted next tick; a login into a full world is refused with a message.
tags: new:per-viewer-presence,new:follower-fanout,new:offline-as-zero,new:tick-social-gate,new:world-slot-cap,stale-state
gaps/risks(excerpt): - No server-side ignore on private messages. The donor stores and delivers a message from an ignored player (in the code read). Frankendom must check the ignore list on the server before delivery; a test asserts the message is not delivered.
- Store before deliver. The donor writes the `private_chat` row before knowing the target is online, and the sender gets no answer when the target is offline (FriendServer 273-285, 480-485). Frankendom should decide what an undeliverable message means and test that it is not recorded as delivered.
- Login dropped on a full world (FriendServer 128-131). Frankendom must refuse the login with a reason, not drop it silently.
- Cap race. The cap is read from 
checker: -

### OpenDAoC-OpenDAoC-Core (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/PG003/out/parties-guilds-chat/OpenDAoC-OpenDAoC-Core.deep.md
best_idea: A party is one server-side object that owns membership, a capacity, a one-shot invite consent, leader succession and a shared loot split, and the presence and opt-out filter decides who can receive a drop.
decision: adapt - Take the membership lifecycle (leader-only one-shot invite, capacity, succession) and the loot eligibility filter (present, opted in, has room, random pick with full-pack fallthrough); change the ceil coin rounding (creates coins), the ignored AddMember result on accept, and drop the PvP pet/guild-ID packet hack.
acceptance: A server test where a 9th invite is refused as party full, a two-member party dissolves when one member leaves, a dropped item goes to exactly one random eligible in-view member with room, and a 10-coin drop across 3 eligible members credits exactly 10 on the one ledger.
tags: presence-gated,drop-filter,fixed-step,new:invite-consent-one-shot,new:leader-succession,new:two-member-dissolve
gaps/risks(excerpt): - GPL-3.0 copyleft: clean-room only. The sketch is written from the mechanism and was not copied from the donor.
- Coin rounding (Group.cs 591, 600): `ceil` credits each eligible member the rounded-up share, so the total paid can exceed the pile by up to n-1 coins. Frankendom's one ledger must distribute the exact remainder (for example the first members take the extra coin). Do not port the ceil.
- `accept` ignores the `AddMember` result (DialogResponseHandler.cs 154; the caller check on line 148 is a pre-check only). If the add fails, `AcceptGroup` still fires. The engine must check the result.
- The invite key has no expiry in the code read (DialogResponseHandler.cs 125 consumes it, nothi
checker: -

### OpenRA-OpenRA (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/PG004/out/parties-guilds-chat/OpenRA-OpenRA.deep.md
best_idea: Gate chat on the server with a sliding-window limit whose penalty holds the window full for a fixed time after the message that trips it, so spam control does not depend on the client.
decision: adapt - The window-plus-penalty gate is the right shape for our server intake and is cheap to test, but OpenRA broadcasts every chat line and filters on receive, which breaks our server-verified rule, so the recipient set must be resolved on the server.
acceptance: Five chat lines at t=0..4 s from one player: the sixth at t=6 s is dropped with about 13 s left, no line is accepted before 19 s, and a party-only line reaches party sockets only (an outsider socket receives nothing).
tags: new:sliding-window-rate-limit,new:penalty-push-out,grace-timer,new:channel-routing,new:receiver-side-filter
gaps/risks(excerpt): - Recipient filter: the donor sends every team line to every connection and hides it on the receiver (Server.cs 1030; UnitOrders.cs 161-165). Under our server-verified ruling the server must resolve the party or guild recipient set and send only to them. Do not copy the broadcast.
- The server does not check the channel number or the sender's team (Server.cs 1027-1033 shows no check). A modified client can send any channel number. Frankendom's server must check membership before it stamps or routes the line.
- Length cap is enforced only on receive (UnitOrders.cs 119-121); the server relays the full string (Server.cs 1030). Frankendom must cap at intake, with a test.
- One ledger: the stamps
checker: -

### OpenRCT2-OpenRCT2 (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/PG004/out/parties-guilds-chat/OpenRCT2-OpenRCT2.deep.md
best_idea: Give each member one rank whose permission bitmask the server checks before any chat line, command or rank change, and let a rank change touch only what the actor already holds.
decision: adapt - The bitmask rank and server gate fit our guild ranks, but the donor lacks a rule against demoting a higher rank, uses wall-clock cooldowns and loads rights with a toggle, so we add the ceiling and fixed-tick cooldowns.
acceptance: An officer who tries to move a leader down, or promote a member to leader, is refused with 'Not allowed' and a server test asserts the rank table is unchanged; a second command inside its cooldown ticks is refused with 'slow down'.
tags: new:rank-permission-bitmask,new:server-command-gate,new:grant-ceiling,new:per-command-cooldown,new:default-least-privilege,new:scoped-send,new:persisted-user-rank
gaps/risks(excerpt): - Demotion of a higher rank: `SetPlayerGroup` checks the target is not the host (3630) and that a promotion to Admin comes from Admin (3636). It does not check the target's current rank. So an actor whose rank holds `setPlayerGroup` can move an Admin to any other rank. Frankendom needs the target-rank ceiling (the sketch adds it).
- Rights edits: a toggle is limited to rights the actor holds (3726), but the non-toggle branch can never change anything as read. `mygroup` is set only inside the toggle branch (3723-3725), and the non-toggle branch runs only `if (mygroup != nullptr)` (3740), so it is always false there. Treat the "copy my rights" and "clear all" paths as dead code, and do not por
checker: -

### OpenTTD-OpenTTD (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/PG004/out/parties-guilds-chat/OpenTTD-OpenTTD.deep.md
best_idea: The server picks every chat recipient from a destination type (everyone, one team, one person), and a team line goes to the sender's team by server state, not by the id in the packet.
decision: adapt - The three-route table with server-chosen recipients is the chat intake we need for parties and guilds, but the donor trusts the team id in the packet and has no chat rate limit on this path, so we take the team from server membership and add a window limit.
acceptance: A party line reaches only authorised party members, a forged party id in a packet reaches nobody outside the sender's party, and a private line reaches only the named authorised player (all three as server tests).
tags: new:server-chosen-recipients,new:three-route-chat,new:scoped-send,new:echo-suppression,new:receiver-side-filter
gaps/risks(excerpt): - Team id trust: `dest` for a team line comes from the packet (1441), and `ReceiveClientChat` passes it on without a company check (1453). The command path does check the sender's company (1149, 1169). So a client can post into another company's team chat by sending that company's id. Frankendom must take the party or guild from server state.
- No chat rate limit was found on this path (search above). Pair this route with a server window limit before use; the OpenRA cell in this batch has one.
- The length cap counts bytes, including the terminator (900). Frankendom counts characters at intake, with a test for multi-byte text.
- Private lines have no membership rule: any authorised client ca
checker: -

### PixelGuys-Cubyz (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/PG005/out/parties-guilds-chat/PixelGuys-Cubyz.deep.md
best_idea: Resolve a guild action by walking from the most specific permission path up to the root, so a member's own deny beats any rank allow, and never reuse a deleted rank's id so an old membership cannot match a new rank.
decision: adapt - Frankendom needs ranks as permission sets the engine checks; take the resolver order and never-reused rank ids, but not the donor's warn-and-grant rule, root wildcard, or global chat.
acceptance: A server test: an officer with guild/kick from their rank can kick; a personal deny on guild/kick blocks them although the rank allows it; re-creating a rank with the same name does not restore old members' rights; an officer without guild/invite is refused when granting it to a rank.
tags: new:path-permission-walk,new:stale-group-id,new:grant-ceiling
gaps/risks(excerpt): - GPL-3.0: clean-room only. The sketch is written from the described order, not from the donor lines.
- The donor has no guild, party, friend list or chat channel. This cell covers only the permission side of ranks. Party formation and friend lists need another donor.
- The donor's grant check warns and grants anyway (group.zig 105-116). Frankendom's rule must be refuse: a rank holder cannot grant a permission they do not hold.
- Root wildcard: a whitelist `/` answers yes for every path not decided earlier (permission.zig 108). For guild ranks Frankendom should default-deny the root instead.
- Path strings are not typed. A typo in a path grants nothing, silently. Frankendom should validate e
checker: -

### ValveSoftware-source-sdk-2013 (restricted, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/PG005/out/parties-guilds-chat/ValveSoftware-source-sdk-2013.deep.md
best_idea: Send every chat line through one server function that takes a channel tag, sanitises the text, then filters each recipient by channel relation, ignore mode, dead-speaker rule and mute list before the send.
decision: adapt - Frankendom needs party and guild channels checked on the server at each send; take the single send path and per-recipient filters, not the client-chosen channel word or the base rule that silently drops team chat.
acceptance: Two-client server test: a party-channel line reaches party members and not a non-member; an ignore-team listener gets no party line from a non-member; a downed player's line is not delivered to a living listener; a 300-character line arrives capped at 127; a sender with no party id is refused with a message.
tags: new:single-send-path,new:listener-filter-stack,new:text-sanitiser
gaps/risks(excerpt): - Restricted Valve licence: clean-room, shape only. The sketch is written from the described order, not from the donor lines.
- The donor takes the channel from the client's command word and then passes a flag. Frankendom must pick the channel on the server from the sender's state (party id, guild id), never from client text.
- In the base multiplay rule `say_team` reaches only the sender (multiplay_gamerules.cpp 1105). That is a silent failure if a game leaves team ids empty. Frankendom must refuse a party channel for a sender with no party id, and say so.
- Quote handling: a leading quote is dropped together with the last character, without checking that the last character is a quote (clie
checker: -

### alexbatalov-fallout2-ce (restricted, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/PG005/out/parties-guilds-chat/alexbatalov-fallout2-ce.deep.md
best_idea: Keep the party as a fixed roster with the player in slot 0 that can never be removed; refuse a join at the base-plus-slack cap, make a repeat join a no-op success, remove a killed member on the kill path, and count only living, visible members.
decision: adapt - Frankendom needs a party roster with a protected leader slot, a cap and kill-path removal; take those, but not the global prototype write, the positional membership match, or the id offset as the id scheme.
acceptance: Server test: player plus two allies accepts a third ally only under the cap; a second add of the same ally adds no slot; a fallen ally leaves and the active count drops by one; a join during a zone hand-off is refused with a message; reset never removes the player.
tags: population-cap,new:protected-leader-slot,new:swap-remove,new:stable-id-offset,new:save-lock
gaps/risks(excerpt): - Restricted licence: clean-room, shape only. The sketch is written from the described order, not from the donor lines.
- The base member count is read from a data file that is not in the donor, so the donor's capacity cannot be checked. Frankendom sets its own cap as data.
- `_isPotentialPartyMember` (party_member.cc 864) matches roster slot i against description pid i. Removal swaps the last member into the gap (453-455), so the order changes and that match becomes unreliable. Not tested; do not port it.
- `critterSetAiPacket` writes a prototype (combat_ai.cc 3294) that every object with that pid shares. A Frankendom party member's AI state must be per instance (per-player view), not a sha
checker: -

### amilich-isometric-city (permissive, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/PG006/out/parties-guilds-chat/amilich-isometric-city.deep.md
best_idea: A short invite code plus one stored snapshot that a joiner loads once, with a first-wins guard and a creator guard, gives party join without any peer authority.
decision: adapt - Keep the code shape and join order; drop peer state-sync and peer actions because the server must own kills and the ledger.
acceptance: A test joins by code, receives the server snapshot before any player action, and rejects a second snapshot from another client while the server snapshot stands.
tags: stale-state,new:room-code-join,new:first-snapshot-wins,new:throttle-trailing-save
gaps/risks(excerpt): - **Peer authority.** Any peer can send any action with a `playerId` it chooses, and receivers apply it (`supabaseProvider.ts` 199-200; `useMultiplayerSync.ts` 99-166). No server checks it. A kill, loot or budget change sent by one client is applied as is. This breaks server-verified kills and one ledger. Do not copy the broadcast.
- **Stale joiner state.** The first snapshot can come from a peer whose state is up to about 2 s old (hook throttle at `useMultiplayerSync.ts` 275), and nothing compares snapshots. Frankendom should send a server tick and version with each snapshot.
- **Hook dedupe by tick.** The hook keys snapshots by `tick` only (`useMultiplayerSync.ts` 83-84). A peer snapshot w
checker: -

### ax-grymyr-l2dn-server (permissive, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/PG006/out/parties-guilds-chat/ax-grymyr-l2dn-server.deep.md
best_idea: Scale one pool by party size, split it by level squared over the members who fought, then cut each member by a level-gap percent set as data, so no share is handed to another member.
decision: adapt - Keep the pool-then-split order and the gap table as zone data; drop the bonus entries above 3, the side-effect ledgers and the double damage share, since our ledger must be one and the kill is server-verified.
acceptance: A three-player server test with levels 30, 25, 15, pool 100 and bonus 1.65 credits 84.86 and 58.93 and 0 to the level-15 player, with 21.21 not re-spread and one credit per member.
tags: xp-share,level-gap,new:level-squared-share,new:pool-then-split
gaps/risks(excerpt): - **Damage share applied twice (not run).** `calculateExpAndSp` multiplies by `partyDmg / totalDamage` (`Attackable.cs` 678, pool formula at 1442), and then `exp *= partyMul` multiplies by the same ratio again (674, 687). For a party that did a fraction f of the damage (f below 1), the pool looks like R x f x f, while the solo branch gives R x f (528). This looks like a double count. It was read, not run; do not copy either version until a test settles it. Frankendom should apply the share once and test it.
- **Unmatched level gap.** Under `highfive`, `xp` starts as the full amount (`Party.cs` 873). If no gap rule matches, the player is not credited (879-885 only credit inside a match), but 
checker: -

### azerothcore-azerothcore-wotlk (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/PG006/out/parties-guilds-chat/azerothcore-azerothcore-wotlk.deep.md
best_idea: A per-rank daily cap on how much a member may take out of a shared chest, with one counter per member, a check before the debit, a rollback if the player credit fails, and one global reset time.
decision: adapt - Keep the gold cap, the counter, the order of checks and the single daily reset; drop the item-slot counter (counts removals, not items) and the repair path. Only worth building if Frankendom has a guild chest.
acceptance: A server test with a 500-gold rank cap: 300 succeeds, a second 300 is refused with the bank unchanged, 200 succeeds, the reset restores 500, and a refused player credit leaves the bank and the counter unchanged.
tags: new:daily-cap-per-rank,new:one-counter-per-member,new:debit-then-credit-rollback,new:global-daily-reset
gaps/risks(excerpt): - **Counts removals, not items, for items.** `_UpdateMemberWithdrawSlots` adds 1 per removal call (`Guild.cpp` 866, 2651), so a split stack counts as one slot, and the check is `remaining != 0` (`HasWithdrawRights`, 836-847). Frankendom should count units if it ever caps items.
- **Repair spends the same daily cap.** `UpdateBankWithdrawValue` runs for repairs (1782), but the player is not credited (1770-1779). A repair therefore uses the member's gold cap and the bank's money, and the player gets nothing. This may be intended; it is not stated in the code.
- **Reset is global and time-based.** One next-reset time is shared by all guilds (`World.cpp` 1952), and the reset is driven by the worl
checker: -

### beyond-all-reason-Beyond-All-Reason (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/PG007/out/parties-guilds-chat/beyond-all-reason-Beyond-All-Reason.deep.md
best_idea: Store a mute as a stable account-ID key with the name as an alias, and hide a muted player's lines instead of deleting them so unmute restores them.
decision: adapt - The donor filters only on the client; Frankendom's one-ledger ruling needs the mute stored once on the server with a per-viewer filter, but the keying and hide-not-delete shape transfer.
acceptance: Server test: after A mutes B, A's chat snapshot omits B's lines in every channel; after unmute the same snapshot includes them again and the server channel log is unchanged (no line deleted).
tags: per-player-view,new:account-keyed-mute,new:hide-not-delete
gaps/risks(excerpt): - The donor only hides lines in the client. Its own code does not stop the engine or a modified client from receiving them (engine side not checked). Frankendom must filter on the server before a message leaves it.
- The donor matches by name on arrival (1748) and by ID elsewhere. A name can be reused, so the Frankendom version should key by account ID only and use the name for display.
- The donor hides old lines on a one-second poll, so a muted player's earlier lines can show for up to a second. Frankendom's state is server-verified; the view should update on the change, not on a timer.
- The mute set is stored in each client's config (171-188). Frankendom's one-ledger rule means the mute 
checker: -

### boardgameio-boardgame.io (permissive, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/PG007/out/parties-guilds-chat/boardgameio-boardgame.io.deep.md
best_idea: Relay a match chat message only after checking the claimed sender against that seat's own credential, then fan it out unchanged to everyone in the match without storing it.
decision: adapt - The donor takes the author from the message body and checks it against a seat credential; Frankendom's server-verified rule needs the author bound to the server session instead, so keep the relay and the check but change where identity comes from. The donor has no guild, rank, friend or party code to reuse.
acceptance: Server test: a message sent with another player's seat id is refused, a spectator send is refused, and the seat owner's message reaches every match client, spectators included, unchanged.
tags: new:credential-checked-sender,new:relay-no-store,new:seat-claim-credential
gaps/risks(excerpt): - Authorship is a claim in the body. The `sender` field comes from the client (client.ts 340). When no seat holds credentials, the check is skipped (auth.ts 85), so any client can send as any seat string. Frankendom must bind the author to the server session, not the message field.
- With the auth object absent, no check runs at all (master.ts 618-650 tests `this.auth` first). Whether the donor's server always has the object is not checked (server/index.ts line 118 builds `Auth`; where it is attached was not read). A spectator can send only in that case.
- History is lost on reload or late join (chat.md line 30). A guild chat that needs history needs a store, which is a separate decision.
- 
checker: -

### clockworklabs-SpacetimeDB (restricted, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/PG007/out/parties-guilds-chat/clockworklabs-SpacetimeDB.deep.md
best_idea: Take the author and the server time from the server's call context, never from the client, and keep presence as one online flag on the account row set by connect and disconnect hooks.
decision: adapt - Server-verified authorship is Frankendom's rule and this module shows it in a few lines; the donor has no session count, so one closed tab would mark a player offline, and the licence is restricted, so only the shape transfers.
acceptance: Server test: an account with two open sockets stays online after one closes and goes offline only when the last closes; a chat line carries the server's author id and server time whatever the client sent.
tags: new:server-stamped-author,new:presence-lifecycle,new:predicate-view-transition
gaps/risks(excerpt): - The donor does not reject an unnamed sender. Its own TODO says so (`lib.rs` 53; `index.ts` 47). Frankendom's chat needs a rule for that.
- No rate limit on `send_message` (`lib.rs` 52; `index.ts` 46). A spam path is open in this donor.
- Presence has no session count. Any disconnect sets `online` false (`lib.rs` 88), so a player with two open sockets (two tabs) shows offline when one closes. Frankendom needs a count per account, or the flag is wrong for the second tab.
- Presence is written on connect and disconnect only. A socket that drops without a close event is not covered by this module; the donor does not handle timeouts itself (SDK behaviour not read).
- Messages are kept in a publ
checker: -

### colyseus-colyseus (permissive, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/PG008/out/parties-guilds-chat/colyseus-colyseus.deep.md
best_idea: A fixed 1 Hz queue cycle that re-sorts waiting players by rank, widens the accepted rank gap as they wait, and forces them into a group after a set number of cycles, with the wait counter kept on each queued player.
decision: adapt - Keep the wait-based widening and the cycle re-sort, which fit a fast-duel queue. Reject the client-supplied rank and team id (join options, lines 210-211) and the team-mode averaging (lines 297, 302, 340-341) as written. Parity row 1 is a stretch: no row covers matchmaking, so Lead should decide whether to add one.
acceptance: A player queued for a duel sees the queue count change at most once a second and is matched or released within about 16 s; a server test sends a join message with a made-up rank and asserts the server ignores it and uses the profile rank.
tags: wait-gate,group-refill,level-gap,fixed-step,new:rank-widen-by-wait
gaps/risks(excerpt): - Client-supplied rank and team id: `rank: options.rank` and `teamId: options.teamId` (210-211). Frankendom's rulings say the server verifies. The port must read rank and party id from the server profile and party record. This is the main reason the donor is not a copy.
- Team-mode averaging is wrong (hand trace, not run). Line 297 computes the team total before the split, and line 302 passes that total into `redistributeClients`, which adds each member's rank again (340-341). Example: one team with ranks 10 and 20 gives a group average of 30 after the second member (true average 15). Do not port `redistributeTeams` as written; the sketch sums members once.
- Lone team never fills (hand trac
checker: -

### daggerfall-unity (permissive, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/PG008/out/parties-guilds-chat/daggerfall-unity.deep.md
best_idea: A guild rank ladder where each rank needs the one below it, a reputation bar plus skill counts at two levels, re-checked on a 28-day clock that resets only when the rank changes; rank then gates services and scales rewards.
decision: adapt - Take the cumulative ladder, the 28-day clock that resets only on a rank change, and the rank-gated service table as data. Reject the donor's client-side review at window open (Guild.cs 74 via popup 164): the port must run the review on the server from the ledger. Parity row 18 is a stretch: no row covers the rank ladder or service permissions, so Lead should decide whether to add one.
acceptance: A server test sets reputation 40 with guild skills 31 and 9, runs the server's review, and asserts rank 2; opening the guild screen on the client does not change rank.
tags: new:cumulative-rank-ladder,wait-gate,status-meter,new:rank-perk-scale
gaps/risks(excerpt): - The donor runs the review on the client, at window push (popup 164). A rank can change because the player opened a screen, and a player who never opens the guild is never reviewed. Frankendom's server-verified ruling means the review must run on the server, on a clock or at login, and the window may only read the result.
- Reputation and skills come from the client-side player entity (Guild.cs 124 `playerEntity.Skills.GetPermanentSkillValue`; 162 `FactionData.GetReputation`). The port must read them from the server ledger.
- Skill shortfall expels, it does not demote. When rank 0's bars fail, `computeRank` returns -1 (111-115), and `UpdateRank` treats -1 as an expulsion (87-89). Frankendom
checker: -

### diasurgical-DevilutionX (restricted, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/PG009/out/parties-guilds-chat/diasurgical-DevilutionX.deep.md
best_idea: A per-target bitmask of everyone who landed a hit, with an equal split of the base reward over the set bits and a level-gap scale, computed once on the server at the kill, is a small, checkable party-XP rule.
decision: adapt - Keep the credit mask and equal split, but compute on the server from the fight ledger (living, in-zone attackers) once per kill; the donor computes a share per client, drops a dead tagger's share, and overwrites stored copies. Our MAX_ATTACKERS = 3 replaces the donor's 4 slots.
acceptance: A server test with three tagged attackers and base 90 exp gives each living attacker 30 before the level-gap scale; an attacker who dies before the kill gets nothing and does not reduce the others' share; a second client receives the same award number as the first.
tags: xp-share,level-gap,hit-aggregation,clamp-and-report,per-player-view
gaps/risks(excerpt): - Restricted licence: clean-room only. The sketch is written from the mechanism; no donor line was copied.
- Client-side award: each client computes its own share from a replicated mask (player.cpp 2480-2481). Our rulings say kills are server-verified and there is one ledger. The split must run once, on the server, and write to one ledger. A client may display it, never compute it.
- A dead or absent tagger takes a share and the share is lost. The divisor counts every set bit (player.cpp 2471-2476), but the grant needs a living local player (2432). No code path removes a bit directly: the writes to the live field `whoHit` are the init reset (monster.cpp 229), the tag (4973), the live OR (syn
checker: -

### electronicarts-CnC_Remastered_Collection (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/PG009/out/parties-guilds-chat/electronicarts-CnC_Remastered_Collection.deep.md
best_idea: A pack gathers before it advances, centred only on members that have already arrived, and holds the arrived ones while laggards catch up; a hit from outside the pack changes its target only when the current target cannot hit back from range.
decision: adapt - Take the arrive-then-advance centre, the one-third reinforce and the hold-on-retarget rule for mob packs. Reject the priority-gated transfer and the suspend-and-disband for anything a player owns (no party or guild model in this donor). The donor has no attacker cap, so MAX_ATTACKERS = 3 is ours.
acceptance: A server test with a pack of 3 mobs (desired 3, reinforcable): when one member is left the pack stops advancing and walks to its retreat point; a hit from a non-member while the current target is armed and within range of the pack centre leaves the target id unchanged; with three attackers in range the pack never has more than MAX_ATTACKERS = 3 mobs on the player at once.
tags: group-refill,wait-gate,hysteresis,population-cap,new:priority-transfer,new:captain-succession
gaps/risks(excerpt): - Copyleft licence with additional terms: clean-room only. Shape, not lines.
- The donor is AI squad logic. It has no player party, no guild roster, no chat and no friend list. Do not read it as a party design.
- No attacker cap: the team coordinates all members on one target (`Coordinate_Attack`, 1137-1147). Our rule is MAX_ATTACKERS = 3, so the pack's attack step must take at most three attackers from the pack and leave the rest to wait. The donor does not show this.
- Priority gap: the comment says the scale is 0-15 (TEAMTYPE.H 202), but the only caller passes 20 (TECHNO.CPP 3779). By that comment every team has a priority below 20 and would be suspended. The scenario data was not read, s
checker: -

### exult-exult (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/PG009/out/parties-guilds-chat/exult-exult.deep.md
best_idea: A companion formation as a small binary tree, where each member holds a fixed slot two tiles behind and to one side of its parent, moves one tile per axis per step toward it, and takes the cheapest free neighbour when blocked.
decision: adapt - Take the slot tree, the one-tile-per-axis step and the cheapest-free-neighbour fallback for companions in zones. Do not take the swap with a party member or the input-driven walk inside a fight. Take the dead-roster idea, but fix the donor's full-party resurrect loss first. Parity row 5 is a weak fit (none of rows 1-23 covers companion formation).
acceptance: A test with a leader and three companions: after four steps north each companion sits in its left or right slot two tiles behind its parent; with a wall on one companion's slot it takes the cheapest free neighbour and never moves more than one tile per axis in a step; resurrecting a member into a full party keeps it on the dead roster or a waiting list instead of dropping it.
tags: follow-point,fixed-step,clamp-and-report,new:binary-follow-tree,new:dead-roster
gaps/risks(excerpt): - GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism.
- Membership gap, read in the code and not run: `update_party_status` removes a resurrected NPC from the dead list (party.cc 182) and then calls `add_to_party` with its result unchecked (183). `add_to_party` returns false when the party already has 8 members (61). So a resurrected NPC into a full party is in neither list. The donor's `resurrect` (actors.cc 4595) then gives it a loiter schedule (set_schedule_type, 4597), so it stands around as an orphan. A scenario needs eight members plus one death, one recruit and one resurrection; it is plausible in play, not confirmed in play.
- Silent drop at load: `link_party
checker: -

### gawric-Unity-Client-for-L2J (permissive, scope=-, verdict=STRONG, depth=thin)
note: /private/tmp/p2/wave2-haiku/batch3/PG010/out/parties-guilds-chat/gawric-Unity-Client-for-L2J.deep.md
best_idea: a guild rank as one bit-mask of single-bit rights, with an edit refused by the server unless the editor holds MANAGE_RANKS and cannot grant a bit the editor does not hold
decision: adapt - keep the one-bit-per-right mask and the no-grant-above-own-rights rule; drop the 22-flag, three-group clan-hall and castle layout until Frankendom has guilds that own places; the brief's rulings do not cover guilds, so this is a design input
acceptance: a server test shows that a member without MANAGE_RANKS gets a refused edit, that an officer cannot grant a bit they lack (refused), and that an officer's valid edit is saved and read back identically
tags: new:privilege-bitmask,new:grade-readonly-view,new:leader-display-override
gaps/risks(excerpt): - The donor has no client-side enforcement at all. Anything that gates a button on this mask would be a fake gate: the server must refuse the command (the sketch's `applyRankEdit`).
- The server half of the mechanism is not in the donor, so what action 1 and action 2 do, and what the server refuses, is unknown. Frankendom has to write both halves.
- Copy the no-grant rule, not the donor's leader override as a UI patch: if the server does not also treat the leader as holding all bits, the display lies.
- Do not copy the one-box shortcut in `GetCalcNewRank` (180-183): a single box skips the single-bit check.
- `CP_CS_MANOR_ADMIN` is defined but has no checkbox, so it cannot be edited here. Do 
checker: -

### geckosio-geckos.io (permissive, scope=-, verdict=STRONG, depth=thin)
note: /private/tmp/p2/wave2-haiku/batch3/PG010/out/parties-guilds-chat/geckosio-geckos.io.deep.md
best_idea: a party or guild chat is one room id per connection, where a room send reaches everyone in the room and a broadcast reaches everyone except the sender, and a social event is re-sent with one id that the receiver dedupes
decision: adapt - take the room id per connection and the room-versus-broadcast split for party, guild and zone chat; take the same-id repeat only as a delivery nudge with an idempotent handler and a server re-read; reject the implicit lobby as default room and the no-ack repeat as a guarantee
acceptance: a server test joins two players to one party room and leaves a third outside it, sends a party message from one, and asserts the two members receive it once and the third receives nothing; a party-invite event sent 10 times is applied once
tags: new:room-membership,new:room-vs-broadcast,new:repeat-send-reliable,new:dedupe-window,new:drop-on-buffer
gaps/risks(excerpt): - A repeated reliable message is a delivery nudge, not state. The party roster, guild ranks and friend list must be re-read from the server ledger after a miss; the repeats are not the truth.
- No acknowledgement and no resync: the sender sends 10 copies over about 1.35 s and stops. A client offline longer than that misses the event, and the donor has no catch-up path.
- The 15 s dedupe window ends. A copy arriving after 15 s is accepted again, so an invite or a rank change could apply twice. Make the Frankendom handler idempotent (apply by id or by version); do not rely on the window.
- An unreliable chat line is dropped silently while the channel has queued bytes (`channel.ts` 208-218). Ch
checker: -

### gemrb-gemrb (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/PG011/out/parties-guilds-chat/gemrb-gemrb.deep.md
best_idea: Keep the party as one ordered roster with 1-based slots: a join takes the next slot, a leave shifts higher slots down, and the server refuses joins over the cap instead of allowing an overflow state.
decision: adapt - The roster and slot-shift rule are simple and testable, which suits server-owned social state. Reject the donor's over-cap-then-reform flow: Frankendom refuses over-cap joins on the server, so no overflow state exists.
acceptance: A server test with cap 3 and three members returns full for a fourth join and leaves the roster unchanged; after the member in slot 2 leaves, the other two show slots 1 and 2 in the next state sync.
tags: population-cap,new:party-slot-compaction
gaps/risks(excerpt): - GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism.
- The donor lets a join succeed over the cap and then forces a reform screen. Frankendom must refuse the join on the server; an over-cap roster state must not exist.
- The donor's cap is a game-wide engine variable, not a per-zone value. Frankendom has no party cap ruling yet. MAX_ATTACKERS = 3 limits attackers in a fight and is not a party size. Lead needs to set the party cap as a product decision.
- Nothing here says whether a party can enter a duel or a many-on-one fight. This is a question for Lead. The sketch does not invent it.
- Leave returns critical items to slot 1 (`PCs[0]`, 379-386) by moving them thro
checker: -

### hedgewars-hw (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/PG011/out/parties-guilds-chat/hedgewars-hw.deep.md
best_idea: Rate-limit chat per client with two tiers (warn at the limit, disconnect one step past it), count every line in a sliding window, and check each line before it is relayed.
decision: adapt - The two-tier warn-then-disconnect rule and per-kind windows are simple and fit server-side chat checks. Reject the absorb run, which lets steady senders through unchecked, and the donor's relay-before-check order.
acceptance: A server test with absorb 0, cap 2 in 10 s and 3 in 30 s: a client sending one line per second gets WARNING on line 3 (t = 2 s), is disconnected on line 4 (t = 3 s), and line 4 is never delivered to the room.
tags: new:two-tier-flood-gate,new:absorb-run
gaps/risks(excerpt): - GPL-2.0: clean-room only. The sketch is written from the rules, not the lines.
- The absorb run is a hole. With N = 3, a sender gets one checked line in four, and steady senders are warned forever without a kick at a 2 s cadence (simulation above). Frankendom must count every line. Set absorb to 0 for chat; the donor's value is not adopted.
- The donor relays before it checks, so the offending line reaches other players. Frankendom checks first (server-verified). Acceptance below depends on this.
- Chat limits here are per connection. Frankendom has no channel rule yet. Whether a room or guild channel gets a shared budget is a question for Lead.
- Room rename shares the chat budget in the 
checker: -

### heroiclabs-nakama (permissive, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/PG011/out/parties-guilds-chat/heroiclabs-nakama.deep.md
best_idea: Hold a seat for a pending join while it is confirmed elsewhere, so the cap counts it and a failed confirm gives it back; a batch join is all-or-nothing against the cap.
decision: adapt - The seat hold across an async confirm, the all-or-nothing batch check and oldest-member succession are simple, testable server rules. Reject the lock-free read snapshot unless Frankendom's server is multi-threaded, and add a hold timeout the donor does not have.
acceptance: A server test with max 3: an accept whose stream confirm fails leaves the roster at its old size and frees the seat, so the next accepted request still succeeds; a fourth accept while three members are present returns full.
tags: population-cap,new:seat-hold-confirm,new:all-or-nothing-batch,new:oldest-leader-succession
gaps/risks(excerpt): - Apache-2.0 permits adaptation. The sketch was still written from the mechanism. Any copied code must keep the licence notice.
- The donor's read snapshot is there for lock-free reads in Go. Frankendom's server runtime is not stated in the brief; if it is single-threaded, the snapshot is not needed. Not adopted in the sketch.
- Maximum size is set by the creator, and its values are not read (`server/api_party.go` not read). Frankendom must decide a cap per party type (Lead). MAX_ATTACKERS = 3 limits attackers in a fight and is not a party size.
- The seat is only held while a join is confirmed. No timeout on the hold is visible in `Accept`: it waits on the stream call, so if that call never
checker: -

### jynew-jynew (restricted, scope=-, verdict=STRONG, depth=thin)
note: /private/tmp/p2/wave2-haiku/batch3/PG012/out/parties-guilds-chat/jynew-jynew.deep.md
best_idea: A party roster where joining moves the member's carried items into one shared pool and strips their gear, and leaving strips gear and restores the member, with the size cap checked inside join.
decision: adapt - Take the roster rule and the item move on join, but put the size cap, hero-cannot-leave and map-only rules inside the engine; the donor checks them only in Lua and UI.
acceptance: A server test: a 7th join to a full party returns full and leaves the shared pool unchanged; joined items appear in the pool exactly once; a leave off the world map is refused.
tags: new:party-roster,new:join-moves-carried-items,new:leave-restores-member
gaps/risks(excerpt): - The cap is NOT enforced in the donor's join (JoinRoleToTeam 404-450 has no check). A script that skips `TeamIsFull` can overfill the party. Frankendom must check the cap in the engine join, and must not reuse the fight cap of MAX_ATTACKERS = 3 for the party size.
- Single-player: there is no server, so join and leave are client state changes. Frankendom must make them server-verified.
- One ledger: the donor moves carried items to the shared pool (425) but the gear clear at 443-445 does not show the equipped items going anywhere. Whether equipped gear is returned or lost is an open question (`UnequipItem` not read); do not copy the gear behaviour until it is read.
- The cap value is in a g
checker: -

### keldaanCommunity-pokemonAutoChess (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/PG012/out/parties-guilds-chat/keldaanCommunity-pokemonAutoChess.deep.md
best_idea: Keep each channel's posting rule and length cap as data, check the sender's role on the server for every action, and make a ban purge the user's messages before closing their sessions.
decision: adapt - Take the per-channel rule table and server-side role checks; reject the fire-and-forget store write and the inconsistent memory/store order, which lose messages without retry.
acceptance: A server test: 300 characters are cut to 250; a non-staff post to the broadcast channel is refused; a moderator can ban a moderator but not an ADMIN; after a ban the target's sessions close and their messages are gone.
tags: new:channel-post-rules,new:staff-delete-gate,new:ban-purge-disconnect,new:ban-admin-protection,new:store-memory-order
gaps/risks(excerpt): - No party, friend list, guild or club system was found in the donor. A `grep -rn -i "friend\|clubs\?\b\|guild"` over models, rooms, core, services, types and utils returns only: title names GUILDMASTER and GUILD_HERO (`types/enum/Title.ts` 96-97), a title award in `models/expeditions.ts` (53), a cron title award (`services/cronjobs.ts` 270-271), an item name FRIEND_BOW (`rooms/commands/game-commands.ts` 915) and dungeon names. Do not cite this donor for guilds or friends. The word `party` was not searched on its own in this pass.
- Ordering is inconsistent: adding a message updates memory before the store (lobby-state 23 then 25), but removing it updates the store before memory (37 then 41)
checker: -

### l1j-en-classic (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/PG012/out/parties-guilds-chat/l1j-en-classic.deep.md
best_idea: A party roster with one pending-invite slot per invitee, invites limited by map, tile range and leader rights, and a leave that disbands a two-member party and sends one notice per member.
decision: adapt - Take the roster, the one-slot invite and the leader-only invite; clear the pending slot on accept, re-check the accepter is not already in a party, and report a full party explicitly. The donor does none of these.
acceptance: A server test: an invite from 6 tiles is refused; a second invite replaces the first; accepting a replaced invite returns no-invite; accepting into a full party returns party-full with the roster unchanged; a two-member party dissolves when either member leaves.
tags: new:party-roster,new:single-invite-slot,new:leader-only-invite,new:party-meters-sync,new:two-member-dissolve
gaps/risks(excerpt): - Pending slot is never cleared on a successful accept (C_Attr 424-436 has no reset; `setPartyID(0)` appears only on decline, C_Attr 395 and 421). The accepter's stored inviter id stays. A client that sends the answer packet again with no dialog can re-enter that party if it has a vacancy. Frankendom must clear the slot on accept and reject any accept without a live pending invite. (Checked with grep and the read branch; not exercised.)
- No check that the accepter is free: the accept branch reads only the inviter's party (C_Attr 424-426). If the accepter is already in another party, `addMember` sets its party link to the new party but does not remove it from the old roster (L1Party.java 53-
checker: -

### levy-street-world-of-claudecraft (permissive, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/PG013/out/parties-guilds-chat/levy-street-world-of-claudecraft.deep.md
best_idea: A group join is an all-or-nothing server merge: validate every premade unit first, then write, so one stale member snapshot changes nothing.
decision: adapt - Server-owned group state, one group per player, and an all-or-nothing merge fit the Frankendom rulings; the 5 and 10 caps must be zone data, and the donor's ephemeral Sim is not the server.
acceptance: Server test: a merge request holding one stale member snapshot returns null and leaves every group unchanged; an invite accepted after more than 30 seconds of server ticks is refused as expired.
tags: stale-state,grace-timer,new:one-group-per-pid,new:validate-then-merge,new:leader-succession,new:sub-group-numbering
gaps/risks(excerpt): - Ownership: the donor keeps groups in the ephemeral Sim (`server/social.ts` 3, a comment, read). Frankendom's rule is that kills and state are server-verified, so the group must live on the server and be created only from the server's own session list. The donor's `server/game.ts` 7041 bounds a client-supplied pid list by `RAID_MAX` (grep line only; the surrounding handler was not read). Frankendom must check each pid against its own session, not trust a client list.
- Caps as data: `party.ts` 28 and 36 are code constants. Frankendom should carry the group cap as zone or activity data (zones as data), with the engine holding only the rule that a cap exists.
- `MAX_ATTACKERS = 3` is a fight 
checker: -

### lichess-org-lila (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/PG013/out/parties-guilds-chat/lichess-org-lila.deep.md
best_idea: A guild rank is a set of independent permission flags, and the rules that protect the rank structure (at least one admin, a hard cap on admins, creator keeps admin, no rank change through the edit form) are checked before any write.
decision: adapt - The flag-set rank and its invariants (an admin always exists, admins are capped, the creator keeps admin, rank changes go through one validated edit) fit a server-owned guild; the donor's flag names are forum and tournament features and must be replaced, and the caps must be data.
acceptance: Server test: an edit that would leave no admin, or name 4 admins, is refused and every member's flags are unchanged; a player with only the kick flag can remove a plain member but is refused on a leader; a kicked player's immediate re-invite is refused by a declined-request record (the donor's join-side check was not read, so this is a spec to build, not a donor-verified rule).
tags: new:flag-rank,new:admin-floor,new:admin-cap,new:kick-hierarchy,new:declined-rejoin-block,new:creator-protected,new:validate-then-write
gaps/risks(excerpt): - Not Frankendom's model: the donor's flags are feature switches for a forum and tournament site. Frankendom needs flags that match its own actions (for example invite, kick, edit ranks, manage loot), and it should use only the ones a guild needs.
- Caps as data: 10 leaders and 3 admins are code constants here (`Team.scala` 91; `TeamSecurity.scala` 129). Frankendom should carry them as guild or realm data, with the engine holding only the rule that a cap exists.
- Race: the donor's permission save is two writes, unset-all then set-each (`TeamSecurity.scala` 39-40), and the controller calls it directly (`app/controllers/Team.scala` 175), not through the team sequencer. A reader cannot tell fr
checker: -

### lichess-org-mobile (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/PG013/out/parties-guilds-chat/lichess-org-mobile.deep.md
best_idea: Keep the online-friends list by taking a full snapshot whenever the screen regains focus or the socket reconnects, then applying small enter, leave and playing deltas only while the screen is listening.
decision: adapt - Snapshot-on-resume and snapshot-on-reconnect is a simple, correct way to keep a presence list in sync with no replay; Frankendom must key deltas by id and make enter idempotent, and keep presence out of every rule.
acceptance: Server test: after a forced disconnect and reconnect the client list equals the server snapshot with no duplicate ids, and an enter event for an id already in the list leaves the list unchanged.
tags: stale-state,new:snapshot-on-resume,new:snapshot-on-reconnect,new:delta-by-id,new:listen-gate
gaps/risks(excerpt): - Duplicate risk: the donor appends on `following_enters` without checking the id (83). If the server ever sends an enter for a friend already in the list, the list shows that friend twice until the next snapshot. Frankendom must key the list by user id and make enter idempotent.
- Stop does not unsubscribe on the server. The donor only cancels its client listeners (67-68). Whether the server keeps sending while the screen is paused is not read. Frankendom should decide explicitly whether to stop the feed server-side.
- Presence is informational. It must never be an input to a fight, kill, loot or ledger rule. Keep it out of the one ledger; the donor has no ledger here.
- Names: the donor sp
checker: -

### opentibiabr-otclient (permissive, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/PG014/out/parties-guilds-chat/opentibiabr-otclient.deep.md
best_idea: Refresh a roster with a leading run plus one trailing run per debounce window, so a burst of membership events costs at most two redraws.
decision: adapt - The debounce shape fits Frankendom, but the donor takes membership from visible shields and keeps out-of-view members; Frankendom needs the roster to come from the server (one ledger), so only the refresh shape is taken.
acceptance: A server test asserts that after a member leaves while out of view, the next roster snapshot removes that member; and a client test shows 5 join/leave events inside one 500 ms window cause at most 2 roster renders.
tags: new:trailing-debounce,stale-state,per-player-view,presence-gated
gaps/risks(excerpt): - Membership is inferred from visible shields. A tracked member who leaves while out of view is never removed by `performUpdate` (684-719 only act on members still in `spectators`). Frankendom's one-ledger rule needs the roster to come from the server, so the donor's inference must not be ported.
- Leave with shield `none` is not removed. Line 711 requires a shield that is not `ShieldNone`, so a member whose shield clears to none stays in `membersData` until the local player leaves. Whether the server clears to `none` on leave is not read.
- The two party helpers disagree. `Player:isPartyMember` counts `ShieldWhiteYellow` as a party shield (`modules/gamelib/player.lua` 621-625), but `PartySt
checker: -

### otland-forgottenserver (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/PG014/out/parties-guilds-chat/otland-forgottenserver.deep.md
best_idea: Split a kill's XP among the whole group with a multiplier that grows with the number of distinct classes, and gate each member on level, distance and recent activity at kill time.
decision: adapt - Keep the gate-then-split shape and the group multiplier as zone data, evaluated on the server at kill time; the donor's all-or-nothing gate and the class-count bonus need a Frankendom decision because the donor's cached flag can go stale.
acceptance: A server test shows a 100 XP kill in a 3-member party with two distinct classes gives each member 44 XP (ceil(100 x 1.30 / 3)); a member 31 tiles from the leader gets no shared XP, and the test states whether the other members also get none (all-or-nothing option).
tags: xp-share,level-gap,presence-gated,grace-timer,stale-state,new:all-or-nothing-gate,new:class-count-bonus
gaps/risks(excerpt): - All-or-nothing gate. One member 31 tiles away, or one under the level floor, switches shared XP off for the whole party until the next refresh. The killer keeps only their own XP. Decide whether Frankendom wants that or a per-member gate; the donor's choice is a design decision, not a fact of the game.
- The flag is cached. Eligibility is recomputed only at the triggers in section 1 (g). A change in range or activity between triggers is not seen until the next trigger. Frankendom's server-verified kills need the check at kill time instead of a cached flag.
- The multiplier formula counts distinct vocations (classes). Frankendom has no class-count rule in the parity list; if it has none, dr
checker: -

### pmbstyle-L2Solo (permissive, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/PG014/out/parties-guilds-chat/pmbstyle-L2Solo.deep.md
best_idea: Build a group by ranking free candidates on role order and then level, take one of each support role first, and refuse to start until the required roles are present (no silent fallback).
decision: adapt - The ranked role-first roster and guest backfill fit Frankendom's zone-as-data group builds; the donor's fallback that starts without tank, healer or buffer and its forced-success resolve do not fit, so only the roster shape is taken.
acceptance: A server test with candidates dps 80, dps 79, healer 40, tank 30 and a cap of 4 builds the group tank, healer, dps 80, dps 79 in that order; a group with no healer is not started unless the zone sets allow_role_fallback.
tags: new:role-first-roster,new:guest-backfill,compute-budget,clamp-and-report,new:no-silent-fallback
gaps/risks(excerpt): - The role check is advisory. The final roster uses `allowRoleFallback: true` (`ClanPartyService.js` 284), so an operation starts with three members and no tank, healer or buffer. Frankendom must make required roles an explicit zone rule and reject a group that lacks them, unless the zone says otherwise.
- The donor's success is forced. `success = !forceFailure` (338) means an operation succeeds unless a test forces failure. There is no combat outcome here, so the donor cannot inform the kill rules. Do not port the success branch as a kill result.
- One drop roll per operation (327-336, `maxItems: 1`). The donor does not split loot per member at this point. The roll internals are not read, s
checker: -

### pokerth-pokerth (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/PG015/out/parties-guilds-chat/pokerth-pokerth.deep.md
best_idea: Gate every chat line on one per-player server budget, checked before any fan-out, and let a shadow mute echo the line to the sender only so the sender cannot tell.
decision: adapt - Frankendom needs the same order (budget, then mute, then fan-out) and the same server-side check, but the donor's fixed window lets about 10 lines through at a boundary, so use a sliding window or token bucket, keyed on the character not the socket, and read the mute from the one ledger rather than a 10 s database poll.
acceptance: A server test sends 6 chat lines from one character within 1 s: 5 reach the room and the 6th returns a reject to the sender only; a shadow-muted character's lines reach only that character, and they still spend its budget.
tags: new:chat-budget-window,new:shadow-mute,clamp-and-report
gaps/risks(excerpt): - AGPL-3.0-or-later: clean-room only. The sketch is written from the mechanism.
- The donor's window is fixed, so it allows a burst of up to 10 lines around a boundary (section 3). Frankendom should use a sliding window or a token bucket if it keeps the same numbers.
- The budget is per `SessionData` (per connection). The code read does not show whether one player can hold two sessions, so whether the limit is per player is not established. Frankendom has one character and one ledger, so the budget should be keyed on the character, not the socket.
- The shadow-mute list is refreshed from the database every 10 s, so a new mute can take up to 10 s to apply (the donor's own comment at 77). Fran
checker: -

### rathena-rathena (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/PG015/out/parties-guilds-chat/rathena-rathena.deep.md
best_idea: Share a kill's XP through one pool per party, weighted by each attacker's damage fraction, and switch the share off by a visible rule when the party's level spread breaks.
decision: adapt - The damage-fraction pool and the level-band gate fit Frankendom's party XP and server-verified kills; adapt because the donor divides among every living party member on the map (bystanders included), switches the share off silently, and has a family exemption and config forks that Frankendom should not copy.
acceptance: A server test with a party at levels 20, 22 and 35 and band 10 asserts the share is off and each attacker is paid alone; at levels 20, 22 and 24 the pooled XP from two attackers is split evenly among the three living members in the zone, and each member's XP is one ledger line.
tags: xp-share,level-gap,hit-aggregation
gaps/risks(excerpt): - GPL-3.0: clean-room only. The sketch is written from the mechanism.
- The divisor counts living party members on the mob's map who never hit the mob (party.cpp 1253, 1260). In a busy zone that pays bystanders. MAX_ATTACKERS = 3 caps who can hit, but the donor's rule decides who shares. Frankendom must choose: attackers only, party members in the fight, or party members in the zone. Copying the donor's rule is not the answer.
- Range: party.cpp 1253 checks only the map id, not distance. Frankendom's zones are data, so a fight radius would be a new rule, not a copy.
- The level gate switches the share off silently at the char server (int_party.cpp 61-64, 110-111). Frankendom must show the st
checker: -

### smogon-pokemon-showdown (permissive, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/PG015/out/parties-guilds-chat/smogon-pokemon-showdown.deep.md
best_idea: Give every rank a jurisdiction, with one rule meaning any rank strictly below mine, so an officer can act on any member below officer without a table entry per rank, and require the permission on both ends of a promotion.
decision: adapt - The rank ladder, the strictly-below rule and the two-ended promotion fit Frankendom's guild ranks and server-side checks; adapt because the donor fails open for unknown groups, lets a section leader act across rooms, and mixes account trust into ranks, none of which Frankendom should copy.
acceptance: A server test with a leader (rank 4), an officer (rank 3) and a member (rank 1): the officer kicks the member (allowed), kicks another officer (refused), promotes the member to rank 2 (allowed), promotes the member to rank 3 (refused).
tags: new:rank-jurisdiction,new:promote-both-ends,new:room-rank-override
gaps/risks(excerpt): - MIT: code may be adapted. The sketch is written from the documented rules and the check order, not copied.
- The section-leader override (user-groups.ts 141-149): a global role gives room moderator powers in its section, unless the room rank is already higher. Frankendom should not add a cross-guild role unless it is designed on purpose.
- The pseudo-ranks ('whitelist', 'trusted', 'autoconfirmed', user-groups.ts 135 and 71-88) mix account trust with rank. They are not in Frankendom's ladder; do not import them.
- Locked or semilocked users fail the instance `atLeast` check (user-groups.ts 78), which the room override path uses. Frankendom needs an equivalent (a removed or muted member), st
checker: -

### veloren-veloren (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/PG016/out/parties-guilds-chat/veloren-veloren.deep.md
best_idea: Keep party state on the server with a leader-only check on every change, and count pending invites against the size cap so a party cannot overfill.
decision: adapt - Keep the leader-only gates, pending-invite capacity count, server-side 31 s expiry with a 30 s prompt, and leader-leave disband; do not port the notifier/slab design or the pet role.
acceptance: Player A invites B; B's prompt counts down from 30 s; at 31 s the server clears the invite and A sees 'invite timed out'. With 5 members and 1 pending invite, a further invite is refused by the server. A non-leader's kick request is refused and party state is unchanged.
tags: new:party-leader-gate,new:invite-expiry-scan,new:pending-count-capacity,new:leader-leave-disbands
gaps/risks(excerpt): - GPL-3.0: clean-room only. The sketch is written from the mechanism.
- The donor's invite check does not require the inviter to lead. The donor's `can_invite` (`group_manip.rs` 30-36, 59-62) allows a non-leader to send an invite, and on accept `add_group_member` (`group.rs` 207-210) pulls that inviter out of its group (the match arm at 207-210). Frankendom must check leadership at invite time and again at accept time.
- Client-side checks are not read. If the donor's UI hides invite for non-leaders, that is a client guard only; the server path above does not stop it.
- The donor says of itself that the group model is primitive and relies on careful management (`group.rs` 9-13). Frankendom's
checker: -

### wesnoth-wesnoth (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/PG016/out/parties-guilds-chat/wesnoth-wesnoth.deep.md
best_idea: The server stamps the sender's name and side on every chat message and picks recipients by channel (all, spectators, or the owners of listed sides), so a client cannot spoof identity or reach a channel it is not in.
decision: adapt - Take the stamp-and-route rule and the mute check as server logic; do not copy the turn-stream embedding or the repackage shortcut, since Frankendom chat should be its own message type.
acceptance: A client sends chat claiming another player's name and a side it does not own; the server test asserts the delivered message carries the real name and side. A muted spectator's message to the team channel is refused and reaches nobody.
tags: new:chat-identity-stamp,new:channel-recipients,new:mute-channel-limit,new:side-owner-routing
gaps/risks(excerpt): - GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism.
- Chat lives inside the turn command stream (`process_turn` 975; caller `server.cpp` 2224-2228). Frankendom's ruling is one engine with server-verified state; chat as a game command mixes two concerns. Keep chat as its own message type.
- The repackage flag (988, 1013) is a shortcut: untargeted, unmuted chat is forwarded as received, while targeted chat is rebuilt. Frankendom should route every chat message through one function, so the two paths cannot drift.
- Side correction (1028-1032) gives a current player their current side and other players their first owned side. A player who owns two sides always gets the
checker: -

### xoreos-xoreos (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/PG016/out/parties-guilds-chat/xoreos-xoreos.deep.md
best_idea: Keep the party as one ordered roster whose front is the leader, so a leader change is a single rotation with one notification point, and count forced members toward the companion cap.
decision: adapt - Keep the rotation-based leader change, the single change notification and the forced-slots-count-toward-cap rule; do not copy the per-creature usable and animation flags, which belong in the client input layer.
acceptance: A player with a leader and two companions presses Tab; on key release the next companion becomes the controlled character, the previous one is free to act, and the new one stops taking its own orders. A party picker with two forced slots shows zero remaining and refuses a third choice; the server test asserts the roster is unchanged.
tags: new:leader-rotation,new:forced-slot-cap,new:heartbeat-all-members
gaps/risks(excerpt): - GPL-3.0: clean-room only. The sketch is written from the mechanism.
- No guard on the accept path: `PartySelectionGUI::callbackActive` (`gui/partyselection.cpp` 99-114) indexes `slotSelected[_activeSlot]` (102, 104, 108) with no check for -1. The accept button is not disabled when no slot is active (only its label is set, 165-166). Whether the GUI layer can click it with no active slot was not read. Frankendom must guard the index on the server.
- `PartyController::getPartyLeader` (`partycontroller.cpp` 44-46) and `setPartyLeaderByIndex` (108-112) read `_party[0]` with no empty check. The Tab caller guards it (`!_party.empty()` at 156); the portrait-button path was not checked for an empty
checker: -

### xu4-engine-u4 (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/PG017/out/parties-guilds-chat/xu4-engine-u4.deep.md
best_idea: Run every join gate on the ledger before any roster mutation, and cap party size by the leader's level, so a refused join can never leave a half-changed roster.
decision: adapt - Keep the gate-then-swap order and the size cap by leader level for a future co-op group; reject the karma band, which is Ultima IV virtue design with no Frankendom counterpart.
acceptance: A server test where a level-2 leader accepts one companion, refuses a third with the size-cap result, and the roster and emitted-event count are unchanged after the refused join.
tags: new:join-gate-by-level,new:band-gate,new:roster-slot-swap,new:view-over-ledger,new:sync-bus-emit
gaps/risks(excerpt): - Topic coverage: the donor has no guild ranks or permissions, no chat channels, no friend lists and no network code. Those parts of the topic stay NONE for this donor. Frankendom needs another donor for them.
- Licence: GPL-3.0 copyleft. Clean-room, shape only. Do not port `join` line by line.
- Trust: the join is a plain local call from a conversation or the cheat. Nothing is checked on a server. Frankendom must run the same gates on the server against the ledger, and a client must not be able to call the join directly.
- No leave: once a companion joins, src has no removal path (grep). A dead member stays in the roster: in combat `applyDamage` (party.cpp 338-371) only removes the map spri
checker: -

### ModernUO (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/U004/out/parties-guilds-chat/ModernUO.deep.md
best_idea: A group invite is a pending record with its own 30-second expiry, the group's capacity counts those pending invites as well as members, and stamina and mana updates go only to members within the server's update range who can see the player.
decision: adapt - The invite expiry, pending-counts-toward-capacity rule and range-gated broadcast suit zone groups, but a party is a social roster, not a fight group, so Frankendom keeps the 10-seat party apart from the MAX_ATTACKERS = 3 fight group and does not copy the donor's roster into the engine.
acceptance: A server test where an invite to player B expires at 30 s and B leaves the pending list, a re-invite at 20 s moves the expiry to 50 s, an invite that would take members plus pending invites to 11 is refused, and B's stamina and mana reach members within 18 tiles only.
tags: wait-gate,population-cap,presence-gated,new:pending-invite-expiry
gaps/risks(excerpt): - GPL-3.0: clean-room only. The sketch is written from the mechanism; no donor line was copied.
- Logout removes the player from the party at once (Party.cs 177-184). There is no seat hold. Frankendom must decide whether to hold seats, and write that decision as a test.
- Hit points are not pushed to party members. `IParty` has no hits callback (Interfaces.cs 48-53). A party health view needs its own rule; do not assume this path covers it.
- The invitee's `Party` field carries the pending leader before accept (Party.cs 381), so the field holds either a `Party` or a `Mobile`. Frankendom should keep a separate invitation record, not overload one field.
- The accept window has no expiry check.
checker: Verified: Capacity 10 (Party.cs 13); OnAdd check 18-21; Invite 341-384 incl. faction 346, new party 353-358, candidate add 360-363, Party=from at 381, DeclineTimer.Start 383; DeclineTimer 30 s (12), stop old (20-24), remove self (29), same-leader check (31), OnDecline (33); OnAccept 116-131 with <=10 at 127; Party.OnAccept 222-256; Add 188-220; OnDecline 258-281 with lone-leader clear at 268-280; Remove 283-323; Logout 177-184; Login 162-175; RejoinTimer 1 s at 492; stat broadcast 53-85 using In

### ClassicUO (permissive, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/U009/out/parties-guilds-chat/ClassicUO.deep.md
best_idea: The server sends the whole party roster and the client rebuilds from it, and a teammate's map marker is queried only when that teammate is out of sight, at most one query per 250 ms poll, and disappears about 2 s after its last update.
decision: adapt - Frankendom's one-ledger, server-verified rule fits the roster mirror and the one-query-per-poll budget, but the client must never write the leader locally before the server confirms it, and the 10 s trust window that accepts local guesses must not be copied.
acceptance: A server test sends a 3-member roster and then a removal of slot 0 and asserts the client view is empty; a poll test with two teammates out of view asserts exactly one party-position query per 250 ms; a marker not refreshed for 2 s is gone from the map.
tags: presence-gated,stale-state,per-player-view,compute-budget,new:roster-rebuild,new:leader-by-slot
gaps/risks(excerpt): - The donor is a client mirror. Frankendom's one-ledger rule means the server writes the roster. Do not copy the optimistic `Leader = Inviter` write (PartyInviteGump.cs:66): the client should show "pending" until the server's roster arrives.
- Roster slots are packet positions with nulls left by removal (PartyManager.cs:106-108). Decide whether slot numbers are stable on purpose (the donor uses slot numbers for numbered tell targets, SystemChatControl.cs:497-499, grep-read only) or compact the roster and test it.
- Removing the slot-0 member clears the whole party for this client (PartyManager.cs:99-102). Whether that is the server's intent was not read (server code is not in the donor). Fra
checker: All checked claims hold: PARTY_SIZE=10 (16); ParsePacket 32-191, count<=1 clear 47-78, Clear 80, to_remove 86, remove_all 91, loop 94-131 (slot=packet index 108, done 111, leader 114-117, slot-0 removal 99-102), post-loop dissolve 133-148, code 7 inviter 182-186; PartyInviteGump 61-80 optimistic Leader=Inviter at 66; Enabled 54-62; RequestServerPartyGuildInfo 200-236 (250 ms at 211, one party query then break 230-232, guild query sub-code 0x01 OutgoingPackets 2505, party 0x00 at 2537); AddOrUpda

### ACEmulator-ACE (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/V003/out/parties-guilds-chat/ACEmulator-ACE.deep.md
best_idea: A party's kill XP is a size-indexed share, scaled per member by distance, and the mode is picked from the level gap, so the rule can be a few zone-data numbers and one server function.
decision: adapt - Take the share-by-size table (capped at MAX_ATTACKERS = 3), the distance falloff and the level-gap band as one server function; drop the indoor/landblock rules and the 9-member table, and keep the group total explicit in the ledger (the table makes the group total exceed the kill XP).
acceptance: Server test: 3-member party, two members within 600 units and one at 900 units, all within 10 levels of the leader: a 1000 XP kill grants 600, 600 and 300 (total 1500), the ledger records each grant with its reason, and a member beyond 1200 units gets 0.
tags: xp-share,level-gap,stale-state,new:share-table-by-size,new:distance-falloff
gaps/risks(excerpt): - Ledger inflation: the even-share table makes the group total grow with party size (1.5x for two, 2.7x for nine when all are in range). Frankendom's one ledger must state the per-kill total explicitly. Do not port the table as a silent multiplier.
- Frankendom caps the party at MAX_ATTACKERS = 3. Use a table for 1-3 only, and treat any larger party as a rule error, not as a silent cap at 9.
- Proportional share loses out-of-range shares (the weights sum over all members, 545-549, but out-of-range members get 0 at 551 and nothing is redistributed). Frankendom needs one rule: either normalise over in-range members or record the lost share in the ledger.
- Stale comments: the even-share and pr
checker: 1) Acceptance says 'all within 10 levels of the leader' yields 600/600/300 but that only holds for gap<=5 (even share, Fellowship.cs 479); a gap of 6-10 (and not all >=50) is proportional mode (484) giving ~333/333/167. 2) CalculateXPSharing sets ShareXP = DesiredShareXP (468,481,486), not true; the member opt-out flag is not mentioned. Everything else verified: 453/502/604/639, table 1/.75/.6/.55/.5/.45/.4/.35/.3, MaxFellows 26, MaxDistance 633, 659/662/665, calls at 160/220/341/373/701/776, As

### swgemu-Core3 (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/V006/out/parties-guilds-chat/swgemu-Core3.deep.md
best_idea: A party's encounter level is the highest member's level in full plus one fifth of every other player and pet level, rounded once, computed on the server from the member list, so the result does not depend on join order.
decision: adapt - The order-independent rule is a small, testable way to pick a zone encounter level from a party, which fits zones as data and one engine; but the donor applies it only to spawn difficulty, and Frankendom's MAX_ATTACKERS = 3 many-on-one fights must not get stronger enemies from party size without a separate ruling, so take the shape for encounter choice only and keep the band thresholds as zone data.
acceptance: A server test: a party of levels 10, 8 and 6 gets encounter level 13 in every member order, a solo player gets their own level, and a zone encounter at lair level 40 for a player at level 13 picks building level 2; no fight damage or hit number changes with party size.
tags: new:party-level-aggregate,level-gap,stale-state
gaps/risks(excerpt): - AGPL-3.0: clean-room only. The sketch is written from the mechanism; no donor line is translated.
- Scope: the donor uses the party level only to pick the difficulty of a lair spawn. It does not feed damage, hit chance or fight stats. Frankendom has MAX_ATTACKERS = 3 many-on-one fights; if the party level is used to scale enemy damage, that needs its own ruling. Keep it to encounter choice (zone data) for now.
- Stale state: the donor caches `groupLevel` and recalculates at the hooks listed (167, 260, 781, 652). I read only these four hooks. A level change that bypasses `setLevel` would leave a stale value. Frankendom should compute the party level on demand from the server's member list (
checker: None found. calculateGroupLevel 562-625, reset lines 563-565, pet branch 598-605, new-highest 607-609, else 611, round at 624, legacy comment 571-582, hooks at 167/260/781 and CreatureObjectImplementation 652, IDL 34-35 and 115-119, getPlayerSpawnLevel 404-428 (group 415), tryToSpawn 278/301/303-312, notifyPositionUpdate 23-57, AGPL COPYING all match. Worked 10/8/6 = 12.8 -> 13 and closed form hold; faction int truncation matches sketch.

### AAEmu-AAEmu (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/V008/out/parties-guilds-chat/AAEmu-AAEmu.deep.md
best_idea: Party member state is pushed on a fixed cadence, but only when it changed (HP and MP exact, position within a tolerance) or after a long gap, with one batch per recipient.
decision: adapt - The change-only send with a tolerance and a forced resync is a good template for party HP in a fight; the 500 ms handler, the region skip and the missing acknowledgement must not be copied.
acceptance: Server test: a teammate's HP change reaches the other member in the next sync pass; an unchanged teammate is not resent for 5 s; a teammate moved by less than 0.01 units is not resent; an offline teammate is skipped.
tags: presence-gated,per-player-view,stale-state,variable-step,new:delta-cache-resync
gaps/risks(excerpt): - Scheduler is variable-step. The handler runs when its rate has elapsed, the loop sleeps 20 ms, and a slow handler delays every other handler (TickManager.cs:23, 27, 92). Frankendom must run this inside the fixed server step with a per-tick budget. Reject the 500 ms handler as it stands.
- Acknowledgement is missing. The forced resync is there "against packet loss" (TeamManager.cs:32, the donor's own comment). Nothing is acknowledged. If Frankendom needs reliable party state, it needs sequence numbers, not a 5 s repeat.
- Quadratic pair walk. The walk is upper-triangle over online members per team per pass. For parties this is small; the donor's raid estimate (727-730) is a comment. Franken
checker: All cites hold: 500 ms/5000 ms/5 min consts (31,33,40), Subscribe at 705 (useAsync false), UpdateAllTeams 732-786, TryClaimSnapshot 794-818, HasSameSnapshotAs 1000-1006, PositionEpsilon 0.01f (996), AreInRenderDistance 958-972, TickLoop sleep 20 ms (27), delta>rate (92), first run immediate (91), 2,450 comment (730), ClearSyncState callers 406/440/591/866, SetOffline 558-600, README LGPL v3-or-later at 36-38. Sketch order matches (one-sided claim per direction, batch per recipient).

### TrinityCore-TrinityCore (copyleft, scope=-, verdict=STRONG, depth=full)
note: /private/tmp/p2/wave2-haiku/batch3/V011/out/parties-guilds-chat/TrinityCore-TrinityCore.deep.md
best_idea: Split one party kill's XP as a pool: base XP times a bonus that rises with the number of counted members (1.0 for one or two, 1.166 for three), shared by level weight among alive attackers, with dead or over-levelled members at zero.
decision: adapt - The pool, the count-based bonus and the level-weighted split are the shape Frankendom's row 18 needs for up to three attackers on one ledger; drop the raid row, the reward-distance rule (replace with attacker in the fight), the rested and recruit bonuses, and the level cutoff unless zones carry levels.
acceptance: Two alive level-10 attackers kill a target with base XP B: each ledger entry gets about 0.5B (total 1.0B, as for one attacker); with three alive attackers each gets about 0.389B (total 1.166B); a third attacker who is not the killer and dies before the kill is left out of the split (a server test asserts the shares sum to base times the bonus for the counted attackers and the dead one gets 0).
tags: presence-gated,level-gap,new:pool-bonus-split
gaps/risks(excerpt): - GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not from the lines.
- Who counts differs. The donor counts party members within reward distance (`IsAtGroupRewardDistance`, not read) who are alive. Frankendom counts attackers in the fight, capped at MAX_ATTACKERS = 3. The donor's distance rule must not be ported as it is; Frankendom needs a test for "who is in the split".
- The killer always counts even if dead (KillRewarder.cpp 97), so a dead killer still pulls level weight from the others while getting zero. Frankendom should decide whether a dead killer counts. The sketch follows the donor here.
- The donor's comment (49) says full XP needs all members not gr
checker: All main claims verified: KillRewarder.cpp 97,101-119,116,148-152,159,163,205-210,222,227,238,246-247,279; Formulas.h 229,238,241,244,248 (0.99/1.0/1.166/1.3/1.4); Player.cpp 2121,2139,2146,2150; licence header and COPYING v2 OK; GetGrayLevel at Formulas.h 70, Gain at 181 OK. Errors: (1) Group.cpp is 1877 lines, note says 1-1862 (trivial). (2) Sketch returns shares only for members.filter(inRange), but donor 246 rewards the killer even when out of range (killer == member ||); the note itself say
