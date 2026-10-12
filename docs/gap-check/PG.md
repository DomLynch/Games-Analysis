# Gap check PG (parties, guilds, group chat)
Date 2026-10-12. Frankendom repo read: frankendom-lead-catalogue at commit 517b32248 (read-only). Donor notes: 45 (PG001 to PG017, parties-guilds-chat). Chat itself is covered in [CT.md](CT.md); this file only adds the party/guild routing on top of it.

## Summary for Dom
1. DEFERRED: parties and guilds were deferred by Dom on 2026-10-10. Nothing below is a build order. It records what exists and what each donor idea would add, so the work is ready when you say go.
2. What exists today: a party is only a tag and a number. A boss fight records a party key per contributor with a cap of 4 (origins/boss/boss.ts:42, 107-111; MAX_PARTY at origins/progression/model.ts:80), and the XP split, level-gap rule and party share already exist (model.ts:81-88, 291-299). Presence has a friend-join that puts you on a friend's layer (origins/presence/interest.ts:46-53; origins/presence/server.ts:141-148). Item locations already allow a guild vault (origins/contracts/items.ts:133-135, ids.ts:34). There is NO party record, invite, leader, guild, rank, guild chat or friends list in code; presence server.ts:4 says guild/party lookup and speech come in their own PRs.
3. Counts across the 45 notes: REUSE 4, ADD 32, SKIP 9. The 32 ADDs collapse to five builds (G1 to G5 below).
4. Top 3 additions when this opens: (a) G1 one server-held party record (cap 4, invites count against the cap, leader-only changes, gates run before any change); (b) G2 guild rank table with one permission check that every guild action calls (nobody grants above their own rank, kick only what is strictly below you, always one leader); (c) G4 server-chosen chat recipients per channel (party, guild, zone), added to the CT.md intake gate, not built twice.
5. Licence note: most donors here are copyleft (GPL, AGPL) or restricted (Source SDK licence, Sustainable Use, BSL, one unclear licence). Shape and ideas only, no donor numbers are in this file. Permissive donors (MIT, Apache, BSD: 2004Scape, LostCity, Microverse, Colyseus, Daggerfall Unity, gawric, geckos.io, nakama, L2Solo, showdown, claudecraft and others) could be named with numbers, but none are needed. All numbers must come from our own rulings: party 4 and the split table (progression-proposal.md:196, 314), layer caps and chat limits (one-shard.md section 5, 6a).

## What we have today (shared by all rows)
- Party in the XP model: split rows pay `partySharePermille(n)` for n up to 4 and refuse more (origins/progression/model.ts:80-88); a member outside the level gap gets nothing (model.ts:88, 291-299). Worked example and refusal tests: model.test.ts:236, 315, 449.
- Party in the boss: each contributor stores level and party key at first hit; a party key over 4 members is refused; the defeat event passes the other members' levels to progression and mints one loot request per character (origins/boss/boss.ts:42, 104-111, 125-140). Nothing checks the party key against any real party; it is a free string of 1 to 64 characters (boss.ts:107).
- Encounter scope `solo | party | public` exists as data (origins/contracts/world.ts:445, 453), but no code forms a party for it.
- Friend-join: the presence server takes `?friend=<account id>`, checks it is a UUID, and the world places you on that friend's layer if it has room (origins/presence/server.ts:141-148; origins/presence/interest.ts:46-53, hard cap 100 at line 14). One-shard.md:64 says join-layer by party leader or guild-mate is the design; today only the friend path is built.
- Guild vault: location kind `guild-vault` with a container id (origins/contracts/items.ts:133-135; ids.ts:34, "a guild vault, a trade escrow"). Used in items.test.ts:90, 198, 219. No guild owns one yet.
- NPC faction "guilds" (Gothic) are a different system: docs/specs/origins/gothic-guilds-attitudes.md; feuds.md:247 notes player guilds do not exist yet.
- Specs that bind: one-shard.md:29 (name tag and guild tag sync), :64 (layer by party leader or guild-mate), :79 and 6a (mute, block, report, rate limit, strikes); launch-gates.md S4 (chat protected from day one).
- Not present: any origins/party, origins/guild or origins/social folder; no MAX_ATTACKERS constant (several notes assume it; searched src and origins, no hit).

## Gap table
| Donor note | Idea in 8 words | We have today | Gap | Call | Lands in |
|---|---|---|---|---|---|
| PG001 0ad | Rejoiner reclaims own old fight seat | Duel product, no attacker seats | Note assumes a 3-attacker fight that is not in the repo | SKIP (no seat book to restore; revisit with group fights) | none |
| PG001 2004Scape | Ordered visibility rule, push to followers | Friend-join only (interest.ts:49-53) | No friends or ignore store | ADD (G5) | new origins/server/social.ts |
| PG001 DOLSharp | One rank gate, flag per action, staff bypass | Nothing | No guild | ADD (G2) | new origins/server/guild.ts |
| PG002 EQEmu | Party is a fixed-size slot record | Free string party key (boss.ts:107) | No record | ADD (G1) | new origins/server/party.ts |
| PG002 Microverse | One open session per actor, release on failure | Nothing for invites | Needed so an actor holds one pending invite | ADD (G1) | as G1 |
| PG002 LostCity | Presence from chat mode, ignore, friends | Nothing | Same as 2004Scape; CT.md G2 | ADD (G5, CT.md G2) | as G5 |
| PG003 OpenDAoC | Party owns members, invites, succession; loot split | Boss loot is one request per character (boss.ts:125-140) | Lifecycle only; loot split conflicts with take-one loot | ADD lifecycle (G1); SKIP shared loot split | as G1 |
| PG004 OpenRA | Sliding-window chat limit holds for a time | Per-socket message close only (CT.md) | Chat gate, not party specific | ADD (CT.md G1) | CT.md G1 |
| PG004 OpenRCT2 | One rank bitmask checked before chat or command | Nothing | Rank gate for guild chat | ADD (G2) | as G2 |
| PG004 OpenTTD | Server picks recipients by destination type | No chat | Route table: party, guild, zone, whisper | ADD (G4) | new origins/server/chat-routing.ts |
| PG005 Cubyz | Most specific rule first; never reuse rank ids | Nothing | Resolver order and id rule | ADD (G2) | as G2 |
| PG005 Valve SDK | One send function; filter per recipient | No chat | Per-recipient filter by channel and ignore | ADD (G4) | as G4 |
| PG005 fallout2-ce | Protected slot 0; repeat join is a no-op | Nothing | Roster rules | ADD (G1) | as G1 |
| PG006 isometric-city | Invite code and one stored snapshot | Not our shape (invite by account id) | Peer-state sync conflicts with server authority | SKIP | none |
| PG006 l2dn | Pool split by level squared among fighters | Party share and gap rule exist (model.ts:81-88) | None; EQ-shaped table already ruled | REUSE model.ts | origins/progression/model.ts |
| PG006 azerothcore | Per-member daily cap on guild chest gold | guild-vault location kind (items.ts:133) | No withdrawal cap | ADD (G3) | new, beside trade limits migration 202610070005 |
| PG007 Beyond-All-Reason | Mute keyed by account id, hide not delete | Nothing (CT.md G2 block store) | Key by account id | ADD (G4 + CT.md G2) | as G4 |
| PG007 boardgame.io | Relay only after sender credential check | Presence checks token at connect (server.ts:141-143) | Per-line author check | ADD (G4) | as G4 |
| PG007 SpacetimeDB | Author and time from server, not client | One-ledger rule, server tick | Same rule applied to chat lines | ADD (G4) | as G4 |
| PG008 colyseus | Queue widens rank gap with waiting time | None | one-shard.md says queue only as a spike net | SKIP | none |
| PG008 daggerfall-unity | Rank ladder with review clock and reputation | Standing and faction docs for NPC factions | Different system (NPC factions, not player guilds) | SKIP (see openmw-factions-disposition.md) | none |
| PG009 DevilutionX | Credit mask, equal split over hitters | Boss contributors map plus 10% floor (boss.ts:104-140) | None | REUSE boss.ts | origins/boss/boss.ts |
| PG009 CnC Remastered | Pack gathers before it advances | Mob AI is per mob | Mob behaviour, not party | SKIP | none |
| PG009 exult | Companion formation as a slot tree | None | Follower AI, not multiplayer party | SKIP | none |
| PG010 L2J Unity client | Rank as bitmask; cannot grant own-missing bits | Nothing | Same as G2 | ADD (G2) | as G2 |
| PG010 geckos.io | One room id per connection; room vs broadcast | Presence has layers, not rooms (interest.ts) | Party and guild rooms | ADD (G4) | as G4 |
| PG011 gemrb | Ordered roster; leave shifts slots; refuse over cap | MAX_PARTY 4 (model.ts:80) | No roster | ADD (G1) | as G1 |
| PG011 hedgewars | Warn at limit, disconnect past it | See CT.md | None specific | ADD (CT.md G1) | CT.md G1 |
| PG011 nakama | Held seat for pending join; batch is all-or-nothing | Nothing | Invite count against cap | ADD (G1) | as G1 |
| PG012 jynew | Joining moves carried items into shared pool | One ledger, per-character items | Conflicts with one-ledger and take-one loot | SKIP | none |
| PG012 pokemonAutoChess | Channel rules as data; ban purges lines | Nothing | Channel table and role check | ADD (G4, G2 roles) | as G4 |
| PG012 l1j | One pending invite per invitee; leave under two disbands | Nothing | Invite slot, range and rights | ADD (G1) | as G1 |
| PG013 claudecraft | Group join all-or-nothing; invite expiry | Nothing | Validate all then write | ADD (G1) | as G1 |
| PG013 lila | Rank flags; at least one admin; kick hierarchy | Nothing | Structure-protecting rules | ADD (G2) | as G2 |
| PG013 lichess mobile | Snapshot on resume, deltas while listening | Nothing | Friend feed shape | ADD (G5) | as G5 |
| PG014 otclient | Roster refresh debounced to two redraws | Client UI only | Client detail, no server gap | SKIP | none |
| PG014 forgottenserver | Kill XP split with gate, class bonus | Split and gate exist (model.ts:81-88, 291-299) | Class multiplier not ruled | REUSE model.ts | origins/progression/model.ts |
| PG014 L2Solo | Rank candidates by role, require support roles | Nothing | Group finder, not in scope | SKIP | none |
| PG015 pokerth | Per-player budget, shadow mute echoes sender only | See CT.md | Shadow mute is a policy call | ADD (CT.md G1) | CT.md G1 |
| PG015 rathena | One XP pool, level spread gate | Same as model.ts:88 | None | REUSE model.ts | origins/progression/model.ts |
| PG015 showdown | Rank acts on ranks strictly below it | Nothing | Kick rule | ADD (G2) | as G2 |
| PG016 veloren | Leader-only changes; pending invites count to cap | Nothing | Party service | ADD (G1) | as G1 |
| PG016 wesnoth | Server stamps sender and picks channel recipients | Nothing | Same as G4 | ADD (G4) | as G4 |
| PG016 xoreos | Roster front is leader; leader change is a rotation | Nothing | Leader succession | ADD (G1) | as G1 |
| PG017 xu4 | All join gates run before any roster change | Nothing | Gate-then-swap order | ADD (G1) | as G1 |

## Merged additions (one build each; all DEFERRED)
- G1 Party record. Notes: EQEmu, Microverse, OpenDAoC, fallout2, gemrb, nakama, l1j, claudecraft, veloren, xoreos, xu4. Rules to carry: one server record per party keyed by account id; size capped by MAX_PARTY (model.ts:80), never by a copy of the number; invites count against the cap and expire; one pending invite per invitee; leader-only invite, kick and disband; leave below two disbands; leader leaving passes the lead by rotation; every gate runs before any change so a refused join never half-changes the roster; party id replaces the free string in boss.ts:107 and layer assignment by leader (one-shard.md:64). Loot stays take-one per character (no shared split).
- G2 Guild ranks. Notes: DOLSharp, OpenRCT2, Cubyz, L2J client, lila, showdown, pokemonAutoChess (roles). Rules: one rank table as data; one permission check every guild action calls; staff bypass from the admins roster; nobody grants or edits a right they lack; kick only ranks strictly below yours; always at least one leader; rank ids never reused; guild tag sync per one-shard.md:29.
- G3 Guild vault limit. Note: azerothcore. Rules: per-rank daily withdrawal cap checked before the debit, rolled back if the credit fails, one reset time; the vault must go through the one ledger (guild-vault location, items.ts:133). Ties to trading limits (migration 202610070005, per CT.md).
- G4 Party and guild chat routing. Notes: OpenTTD, Valve, geckos, boardgame.io, SpacetimeDB, wesnoth, pokemonAutoChess, BAR. Rules: no new intake; party and guild lines pass the CT.md G1 gate (not exempt); recipients picked on the server from party or guild membership, never by the client; author and time stamped by the server; mute and ignore keyed by account id; a left or kicked member stops receiving at once.
- G5 Friends and presence feed. Notes: 2004Scape, LostCity, lichess mobile. Rules: friends and ignore in the one ledger; ordered visibility rule and fail-closed mode as in CT.md G2; push changes only to followers; full snapshot on reconnect then small changes; join-friend (interest.ts:49) checks the friend list instead of trusting any account id.

## Could not verify
- Whether the Strategy ruling for friends, party and guilds exists beyond one-shard.md and launch-gates.md; I read grep hits only, not PROJECT_STATE.md in full.
- progression-proposal.md:196 and :314 were seen via grep lines, not read in full.
- Notes assume MAX_ATTACKERS = 3, a fight-seat idea that is not in this repo; marked SKIP for that reason.
- Licences were taken from each note's own Licence line; not re-checked against the donor repos.
- Checker-findings blocks exist in 11 of the 45 notes; I read the Best idea, Decision and Lands in lines, not those blocks.
