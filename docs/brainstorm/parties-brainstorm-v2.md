# Parties, Guilds, Chat and Presence Brainstorm (Frankendom) - v2

v2: the checker's 14 corrections (parties-brainstorm-check.md section 8) are applied. Original parties-brainstorm.md is unchanged. Changed values are marked "ours": they are our own tuning, derived as stated, not taken from any donor.

STATUS: NOTHING IS BUILT. This is a design brainstorm from parties-digest.md (52 notes). No code, schema, test or server exists for any part below. Every number is a starting guess to be tuned, not a measured value.

Source: /private/tmp/p2/brainstorm/parties-digest.md. I read all 52 digest entries. I did NOT read the full deep notes behind them (digest excerpts are truncated at about 700 chars per gap list), so a few gaps are cut off mid-sentence and are marked "(cut)". I also could not see the parity table (rows 1-23); the parity section below infers from the digest's own row mentions and says where it is a guess.

Rulings applied: server-verified everything, one ledger, one engine, MAX_ATTACKERS = 3 many-on-one, zones as data, Pit frozen, phone-first. Party size is NOT the fight cap: a party may be larger than 3, but at most 3 attackers engage one target. Pit: nothing here touches Pit; all social state lives outside the Pit engine (see experiment E1).

Rules applied to donors: keep the idea, fix the donor defect (written "defect -> fix"). Licence tags: [P] permissive (MIT/BSD/Apache, adaptable with notice), [C] copyleft (GPL/AGPL/LGPL/CC-BY-SA, shape only), [R] restricted/unclear/Valve (shape only). Shape-only donors: I copy no constants or code; all numbers below are my own derived values and are labelled "ours". Note donor names are cited by digest id plus note batch code (e.g. DOL/PG001).

Licence classes as recorded in the digest header: copyleft = DOLSharp, 0ad, EQEmu, OpenDAoC, OpenRA, OpenRCT2, OpenTTD, Cubyz, azerothcore, BAR, C&C Remastered, exult, gemrb, hedgewars, l1j-en-classic, lila, lichess-mobile, forgottenserver, pokerth (AGPL), rathena, veloren, wesnoth, xoreos, xu4, ModernUO, ACE, swgemu (AGPL), AAEmu, TrinityCore, pokemonAutoChess. Permissive = 2004Scape, LostCityRS, ax-grymyr-l2dn, amilich-isometric-city, boardgame.io, colyseus, daggerfall-unity, gawric-L2J, geckos.io, nakama (Apache-2.0), pmbstyle-L2Solo, smogon-showdown (MIT), opentibiabr-otclient, ClassicUO, levy-street-world-of-claudecraft, KsanaDock-Microverse. Restricted = Valve source-sdk-2013, fallout2-ce, SpacetimeDB, DevilutionX, jynew. (Only the class "restricted" is from the digest; no specific licence name is claimed for any repo here. Earlier mentions of BSL and AGPL for lila/SpacetimeDB were not in the digest and are removed.)

(Check: the digest tags several of these by the header class only. Treat every copyleft and restricted donor as shape-only. Specific licence names beyond the digest are unverified and not stated here, except pokerth and swgemu, which the digest notes say are AGPL-3.0.)

---

## 1. Top gems (15)

| # | Gem (keep the idea) | Donor / note | Licence | Why for Frankendom |
|---|---|---|---|---|
| 1 | Party = one server object: join-ordered roster, hard cap as data, leader-only invite, leader leave hands lead to earliest-joined, dissolve when one is left | DOLSharp / D002; OpenDAoC / PG003; l1j / PG012; xoreos / PG016 (rotation) | C | The whole roster lifecycle is a small deterministic state machine. Testable with no network. |
| 2 | Invite as its own pending record with an expiry; pending invites count toward the cap; re-invite replaces and extends | ModernUO / U004; veloren / PG016; levy-street / PG013 (expiry); l1j / PG012 (one slot per invitee) | C, C, P, C | Server-held invite closes the "client says who invited me" hole in the EQ-style donors. |
| 3 | Seat hold during an async confirm (cap counts the hold, a failed confirm gives it back); batch join all-or-nothing | nakama / PG011; levy-street / PG013 (validate-then-merge); xu4 / PG017 (gates before mutation) | P, P, C | Prevents half-changed rosters and double-accept races. Needs the hold timeout nakama lacks. |
| 4 | Seat memory on rejoin: drop and rejoin in a grace window and get your old attacker seat if free, else lowest free | 0ad / PG001 | C | Directly fits the 3-attacker many-on-one fight on a flaky phone connection. |
| 5 | Pool-then-split party XP: scale one pool by counted attackers, split by level weight among living in-fight attackers, dead or not-in-the-fight members get zero | TrinityCore / V011; DevilutionX / PG009 (credit mask); ax-grymyr / PG006 (pool-then-split, level-gap table) | C, R, P | Fits the ledger: one kill, one pool, one line per member, with the per-kill total written explicitly (fixes ACE inflation). "In the fight" replaces the donor distance rule. |
| 6 | Loot to one random eligible in-view member with room, full pack falls through; coin split uses the exact remainder | OpenDAoC / PG003 | C | Eligibility filter plus exact-remainder split keeps the ledger conserved. |
| 7 | Guild rank = permission bitmask, one server check before every guild action, grant ceiling (cannot grant a bit you lack), default least privilege | OpenRCT2 / PG004; gawric-L2J / PG010; Cubyz / PG005 (grant ceiling, path walk); DOLSharp / PG001 (superset ladder) | C, P, C, C | Ranks as data, one gate function, easy to test. |
| 8 | Rank invariants checked before write: always exactly one leader, admin cap, creator protected, kick hierarchy; rank jurisdiction "strictly below me" | lila / PG013; DOLSharp / PG001 (level 0 unique); smogon / PG015 | C, C, P | Prevents ladders with zero or two leaders and officers kicking officers. |
| 9 | Single chat send path: server picks the channel from sender state, stamps author and server time, resolves recipients (party id / guild id from server membership, never from packet), then runs a per-recipient filter stack (mute, ignore, dead-speaker) | OpenTTD / PG004 (three-route); Valve / PG005 (filter stack); wesnoth / PG016 (stamp); SpacetimeDB / PG007 (server-stamped author); boardgame.io / PG007 (relay no store) | C, R, C, R, P | One function means no drift between channels, and nothing can be forged. |
| 10 | Sliding-window chat limit with a penalty that holds the window full; check before fan-out; two tiers (warn, then a stronger step: silence or disconnect, chosen as data) | OpenRA / PG004; hedgewars / PG011; pokerth / PG015 | C, C, C | Spam control without trusting the client. Order: budget, then shadow-mute, then fan-out. |
| 11 | Shadow mute: muted sender's line echoes to sender only and still spends budget | pokerth / PG015 | C | Moderation tool that does not start an arms race. |
| 12 | Account-keyed mute with name as alias; hide not delete so unmute restores | BAR / PG007 | C | Server-held per-viewer filter on stable ids. |
| 13 | Per-viewer presence from one ordered rule (staff, ignore list, privacy mode, friend list), hidden and offline look the same; push to followers only; one social action per tick per player | 2004Scape / PG001; LostCityRS / PG002 | P, P | Friends, ignores and mode live in the ledger; online state is derived from sessions and is never an input to fight, kill, loot or ledger rules. Cheap fan-out. |
| 14 | Presence sync: full snapshot on resume and reconnect, small enter/leave deltas keyed by id and idempotent; online flag backed by a session count per account | lichess-mobile / PG013; SpacetimeDB / PG007; ClassicUO / U009 (roster rebuild from full server list) | C, R, P | Correct under tab-switching and reconnects with no replay log. |
| 15 | Matchmaking queue as a fixed-rate cycle: waiting players re-sorted by rank, accepted rank gap widens with wait, forced match after N cycles, wait counter on the queued entry | colyseus / PG008 | P | A duel queue that only creates a fight request for the one engine (it never edits Pit) and always resolves; also fits role-first group fill (pmbstyle-L2Solo / PG014 [P]). |

Honourable mentions: ClassicUO one-query-per-poll marker budget (U009 [P]); AAEmu change-only party HP push with forced resync (V008 [C]); amilich invite code + one server snapshot (PG006 [P]); azerothcore daily per-rank bank cap (PG006 [C], only if a guild chest exists); daggerfall cumulative rank ladder on a server clock (PG008 [P]); swgemu order-independent party encounter level (V006 [C, AGPL]); xu4 party size by leader level (PG017 [C]); geckos.io idempotent repeat-send (PG010 [P]).

---

## 2. Defect -> fix table

| Donor (licence) | Defect | Fix in Frankendom |
|---|---|---|
| DOLSharp D002 (C) | Fallback leader can be a non-player; party size 8 confusable with fight cap | Leader is always a player in join order; party cap and MAX_ATTACKERS are separate data fields with a test that they cannot alias. |
| 0ad (C) | Seat memory keyed by display name; no timer; kick behaviour unspecified | Key by account id; `seat_grace_s` as data; whether a kick clears memory is an explicit rule (the donor leaves it as an open question). |
| 2004Scape (P) | Server does not check ignore list on private message; friend traffic dropped silently when link down | Ignore checked at send time on the server; link-down queues a presence snapshot on reconnect (no silent drop). |
| DOLSharp PG001 (C) | Demote reads the Promote flag; no guard on rank edit (0 or 2 leaders) | Own `demote` bit; validate "exactly one leader rank" before saving. |
| EQEmu (C) | Accept trusts inviter name in packet; no invite expiry; leader leave disbands any size | Server-held invite record with expiry; accept verified against it; leader-leave = succession by default, disband as a preset switch. |
| KsanaDock (P) | Session can stay open forever; failure leaves both parties busy | Session cap/timeout as data; reply failure releases both (tested). |
| LostCityRS (P) | No server ignore on whisper; row stored before delivery known; login dropped silently on a full world; cap race | Ignore before delivery; undeliverable is recorded as undelivered; refuse with a reason; check-and-reserve the slot atomically. |
| OpenDAoC (C) | ceil coin rounding creates coins; accept ignores AddMember result; invite key never expires | Exact-remainder split; accept returns the add result and aborts on failure; invite expiry. |
| OpenRA (C) | Broadcast then filter on receiver; no channel/team check; length checked on receive only | Server resolves recipients from membership; cap length at intake in characters. |
| OpenRCT2 (C) | Rank holder can demote a higher rank; wall-clock cooldowns; dead branches in rights edit | Target-rank ceiling; cooldowns in fixed ticks; do not port dead paths. |
| OpenTTD (C) | Team id taken from packet; no rate limit on this path; byte-count cap; private line has no membership rule | Team from server state; window limit added; count characters; private lines require both parties authorised and not ignoring. |
| Cubyz (C) | Warns and grants anyway; root wildcard allows all; untyped path strings | Refuse on missing bit; default-deny root; validate permission names against a typed list. |
| Valve (R) | Channel chosen from client command word; silent drop when team ids empty; quote-trim bug | Channel chosen from sender state; refuse with a message when sender has no party; sanitise text with a tested function. |
| fallout2-ce (R) | Global prototype write shares state across instances; positional membership match breaks after swap-remove | Per-instance party-member state; match by stable id (never slot). |
| amilich (P) | Any peer can send any action; first snapshot may be about 2 s stale; dedupe by tick only | Server owns the snapshot with tick + version; clients cannot send actions as others. |
| ax-grymyr (P) | Damage share applied twice (suspected); unmatched level gap silently not credited | Apply share exactly once and test; level-gap table must have a catch-all row or be rejected on load. |
| azerothcore (C) | Item slot cap counts removals not units; repair spends the daily cap with no credit | Count units; repairs, if ever, are a separate ledger reason. |
| BAR (C) | Mute filtered only on the client; name match at arrival; one-second poll | Filter server-side before send; account-id key; update on change. |
| boardgame.io (P) | Author is a claim in the body; no check when no credentials set | Author bound to the server session only. |
| SpacetimeDB (R) | No session count (two tabs show offline); no rate limit; unnamed sender allowed | Session count per account; chat budget; reject empty name. |
| colyseus (P) | Rank and team id from client options; team averaging double counts; lone team never fills | Rank and party from server profile/party; sum members once; lone-team timeout fills with bot-free refund (re-queue) or fails with reason (the donor's lone-team gap is cut off in the digest, so this fix is our own design). |
| daggerfall (P) | Rank review runs on the client at window open; skill shortfall expels instead of demoting | Review on the server clock/at login; shortfall demotes one step (switchable to expel). |
| DevilutionX (R) | Each client computes its share; dead tagger's share lost | One server split at kill from the fight ledger; dead attackers excluded from the divisor. |
| C&C Remastered (C) | No attacker cap; priority scale mismatch | Pack/attack step takes at most MAX_ATTACKERS = 3; priority is data validated on load. (Mob-pack idea only, not a social feature.) |
| exult (C) | Resurrect into a full party drops the member from both lists | Dead roster/waiting list keeps the member; add result always checked. |
| gawric-L2J (P) | No client enforcement; one-box shortcut skips single-bit check; leader override as UI patch | Server refuses every command; leader holds all bits on the server, not only in display. |
| geckos.io (P) | Repeat-send is a nudge not a guarantee; 15 s dedupe window then applies twice; chat dropped silently on a busy channel | Handlers idempotent by event id/version; re-read roster from ledger after a miss; send explicit "dropped" notices. |
| gemrb (C) | Join succeeds over cap then forces reform; cap global | Refuse over-cap on server; per-activity cap as data. |
| hedgewars (C) | Absorb run lets steady senders through unchecked; relay before check; shared budget with room rename | Absorb 0; check before relay; separate budgets per action kind. |
| nakama (P) | No hold timeout | Add hold timeout. (Not adopted, not a defect: its lock-free snapshot is not needed in a single-threaded fixed-step server.) |
| jynew (R) | Cap not enforced in join; gear fate unknown | Cap inside the engine join; gear is never moved by joining (decision, see questions). |
| pokemonAutoChess (C) | Fire-and-forget store write; inconsistent memory/store order; no friends/guilds present | Write then apply in one order with retry; do not cite for friends/guilds. |
| l1j (C) | Pending slot never cleared on accept; accepter not checked free; full party silent | Clear on accept; reject accept without a live invite; check not already in a party; return explicit full. |
| levy-street (P) | Groups held in ephemeral Sim; caps are code constants | Server owns groups, created from the server's session list; caps in zone data. |
| lila (C) | Two-write permission save (race); caps are constants | Single transactional write; caps as data. |
| lichess-mobile (C) | Enter appended without id check (duplicates); stop does not unsubscribe server-side | Idempotent by id; server stops the feed on listen-off. |
| opentibiabr-otclient (P) | Membership inferred from visible shields; leave with shield none not removed | Roster from server only; debounce is a render policy only. |
| forgottenserver (C) | All-or-nothing gate; cached eligibility flag goes stale | Per-member gate evaluated at kill time (preset can choose all-or-nothing). |
| pmbstyle-L2Solo (P) | Role check advisory, fallback starts short-handed; forced success | Required roles are zone rules; no start if missing unless `allow_role_fallback`. |
| pokerth (C) | Fixed window allows burst at boundary; budget per connection; mute refreshed every 10 s | Sliding window/token bucket; key on character; mute read from ledger on change. |
| rathena (C) | Divisor includes bystanders; silent level-gate off; map-wide not distance | Share over in-fight attackers only; show "XP share off: level gap" to the party. |
| smogon (P) | Fails open for unknown groups; section leader acts across rooms | Unknown rank = no rights; no cross-guild role unless designed. |
| veloren (C) | Non-leader can invite and pull inviter out of their group | Leadership checked at invite and again at accept. |
| wesnoth (C) | Chat inside the turn command stream; repackage shortcut; side correction picks first owned side | Chat is its own message type; one send function. |
| xoreos (C) | No index guard on empty slot | Server guards every index; empty roster handled. |
| xu4 (C) | No leave path; join callable from the client | Leave defined; join gates run server-side only. |
| ModernUO (C) | Logout removes at once (no seat hold); invitee field overloaded; no accept-expiry check | Seat hold policy as data; separate invite record; accept re-checks expiry. |
| ClassicUO (P) | Optimistic `Leader = Inviter`; 10 s trust window; null slots left by removal | Show "pending" until server roster; stable ids over slot numbers. |
| ACE (C) | Table inflates ledger total; out-of-range share lost; checker found the acceptance was wrong (gap 6-10 is proportional mode; ShareXP set from DesiredShareXP) | Write per-kill total explicitly; renormalise over in-range; do not reuse the donor's acceptance numbers. |
| swgemu (C, AGPL) | Cached group level can go stale; used only for lair difficulty | Compute on demand; encounter choice only, never damage. |
| AAEmu (C) | Variable-step 500 ms handler; no acknowledgement | Inside the fixed server step with per-tick budget; sequence numbers if reliability is required. |
| TrinityCore (C) | Dead killer still pulls weight; distance rule inapplicable | Decide dead-killer weight (default: excluded), "in the fight" replaces distance. |

---

## 3. Composable parts (each switchable, data-driven)

All parts read from one `social.json`-style data block (zone-overridable). Each part has `enabled` plus its own fields. Engine holds the rule shapes; numbers are data. Numbers are ours.

### 3.1 Party roster [thin donor coverage for formation; roster itself well covered]
- Data: `party.enabled`, `party.cap` (ours: 4, derived as MAX_ATTACKERS + 1 reserve seat), `party.reserve_bench` (ours: 1; members beyond the attacker seats; 0 = party equals fight group), `seat.attacker_seats` (engine value = MAX_ATTACKERS = 3, not preset-editable), `party.min_members_to_exist` (2), `party.cap_by_zone` override, `party.leave_policy` ("dissolve_at_one"), `party.one_party_per_account` true.
- Rules: roster is join-ordered list of account ids; slot index derived, never stored as identity; leave compacts.
- Donors: DOL/D002 [C], gemrb [C], xoreos [C], fallout2-ce [R] (protected leader), ModernUO [C].
- Test: cap full returns `full`, roster unchanged; `party.cap` and `seat.attacker_seats` cannot alias (changing one never changes the other); leave compacts; two-member dissolve toggles with `min_members_to_exist`.

### 3.2 Invite flow
- Data: `invite.enabled`, `invite.ttl_s` (ours: 45), `invite.leader_only` true, `invite.count_pending_toward_cap` true, `invite.range_zone_only` (same zone), `invite.busy_gate` (from KsanaDock: either side in duel/trade refuses), `invite.code_join.enabled` (amilich code shape), `invite.decline_cooldown_s`.
- Donors: veloren, ModernUO, l1j, levy-street, nakama, amilich, KsanaDock.
- Test: expiry at ttl; re-invite replaces; accept after leader changed refuses; accept with live invite but full refuses; seat hold released on failure.

### 3.3 Leader succession
- Data: `succession.mode` in {"earliest_joined","highest_level","random","disband"}, `succession.leader_afk_s` (auto-succeed after idle), `leader.rotation_key` (xoreos rotate).
- Donors: DOL/D002, nakama (oldest), xoreos (rotation), EQEmu (disband), veloren (disband).
- Test: each mode, plus "leader disconnect inside grace keeps lead".

### 3.4 XP / loot share
- XP data: `xp.share_mode` in {"off","even","level_weighted","damage_weighted"}, `xp.counted` ("attackers_in_fight"), `xp.pool_bonus` table by counted members (ours: [1.00, 1.10, 1.20] for 1 to 3; derived as a linear +0.10 per extra counted attacker, not a donor table), `xp.level_gap_table` with required catch-all row, `xp.dead_counts` false, `xp.explicit_total` true.
- Loot data: `loot.mode` in {"free_for_all","random_eligible","round_robin","leader","need_greed_later"}, `loot.coin_split` "exact_remainder", `loot.eligible` {present, opted_in, has_room}.
- Donors: TrinityCore, DevilutionX, ax-grymyr, rathena, ACE, forgottenserver, OpenDAoC.
- Test: pool conserves (sum equals base x bonus), dead gets 0, coin split sums exactly, full pack falls through, each ledger line has a reason.

### 3.5 Guild ranks as permission bitmasks
- Data: `guild.ranks[]` each `{id (never reused), name, level, mask}`; bits: `invite, kick, promote, demote, edit_ranks, chat_speak, chat_hear, manage_motd, chest_withdraw, chest_deposit, disband, set_privacy`; `guild.invariants` {one_leader:true, admin_cap: 2 (ours; derived as one admin per ten expected early members, rounded down for small launch guilds), creator_protected:true}; `guild.grant_ceiling` true; `guild.jurisdiction` "strictly_below".
- Donors: OpenRCT2, gawric-L2J, DOLSharp, Cubyz (id never reused), lila, smogon.
- Test: officer cannot kick officer; cannot grant bit not held; edit leaving zero or two leaders refused; recreated rank name does not restore old rights.

### 3.6 Chat channels and rate limit
- Data: `chat.channels[]` each `{id, route ("zone"|"party"|"guild"|"private"|"global_lobby"), post_mask, hear_mask, max_chars (ours: 160), budget:{capacity (ours: 4), refill_ms (ours: 1500), penalty_s (ours: 6)}, history:{kept, store}}`, `chat.sanitiser`, `chat.mode_penalty` ("warn","silence","disconnect").
- Donors: OpenTTD, Valve, wesnoth, OpenRA, hedgewars, pokerth, pokemonAutoChess (per-channel rules), boardgame.io (relay-no-store), geckos.io (rooms).
- Capacity note: with `capacity` 4, four lines pass and the 5th line inside the window is rejected. Tests below are written to that capacity; if capacity is retuned, the tests read it from data.
- Test: forged party id reaches nobody; 5th line inside window rejected to sender only; party line never reaches outsider socket; a 200-character line is capped to `max_chars` (160).

### 3.7 Mute / ignore
- Data: `mute.enabled`, `mute.keyed_by` "account_id", `mute.hide_not_delete` true, `ignore.blocks` {whisper, invite, trade, presence}, `mute.shadow.enabled`, `mute.max_entries`.
- Donors: BAR, pokerth, 2004Scape, LostCityRS, Valve.
- Test: A mutes B: A's snapshot omits B everywhere; unmute restores; log unchanged; ignored whisper refused at server.

### 3.8 Presence and friends
- Data: `presence.enabled`, `presence.modes` ["online","friends_only","hidden"], `presence.default_mode` (one of `modes`; ours: "online"), `presence.rule_order` ["staff","ignore","mode","friend_list"], `friends.cap` (ours: 80), `friends.mutual_required` false, `presence.snapshot_on_resume` true, `presence.fanout` "followers", `presence.session_count` true, `presence.social_action_gate_ticks` 1.
- Donors: 2004Scape, LostCityRS, lichess-mobile, SpacetimeDB, ClassicUO. (AAEmu is party-state push, listed under 3.10 only.)
- Test: friends-only hides unless mutual list; reconnect snapshot equals server list; two tabs stay online until last closes.

### 3.9 Matchmaking queue [thin: one donor]
- Data: `queue.enabled`, `queue.tick_hz` 1, `queue.rank_gap_start`, `queue.rank_gap_widen_per_cycle`, `queue.force_after_cycles`, `queue.party_mode` ("solo_only","pre_made_ok"), `queue.role_requirements` (pmbstyle), `queue.entry_source` "server_profile".
- Donor: colyseus / PG008 [P]; pmbstyle-L2Solo / PG014 [P]; swgemu aggregate [C].
- Test: spoofed rank ignored; matched or released inside forced timeout; queue count updates at most once per second.

### 3.10 Extra optional parts (smaller)
- Seat memory / rejoin (0ad) : `seat.grace_s` (ours: 25), `seat.keyed_by` "account_id".
- Party status push (AAEmu, change-only HP push with forced resync): `party_state.cadence_ticks`, `party_state.resync_s`, `party_state.hp_tolerance`.
- Guild chest daily cap (azerothcore): only if guild chest exists.
- Rank review clock (daggerfall): `guild.review_days` as data.

---

## 4. Presets (switchable bundles)

Presets are only data. Switching a preset swaps the data block; no engine change.

### P1 solo_friendly
```
party: {enabled: true, cap: 3, leave_policy: "dissolve_at_one"}
invite: {ttl_s: 60, leader_only: true}      # leadership checked at invite and again at accept (veloren/l1j lesson)
xp: {share_mode: "off"}               # each attacker credited alone
loot: {mode: "free_for_all"}
guild: {enabled: false}
chat: {channels: ["zone","party","private"]}   # a party has its own channel
presence: {modes: ["online","hidden"], default_mode: "online"}
queue: {enabled: false}
```
Goal: nobody is ever forced to group; the many-on-one fight is still possible with strangers via zone presence.

### P2 duo_and_trio_many_on_one
```
party: {cap: 3, succession.mode: "earliest_joined"}
seat: {grace_s: 25}
xp: {share_mode: "level_weighted", counted: "attackers_in_fight", pool_bonus: [1.0,1.10,1.20]}
loot: {mode: "random_eligible"}
guild: {enabled: false}
chat: {channels: ["zone","party","private"]}
queue: {enabled: true, party_mode: "pre_made_ok"}
```
Goal: party size equals fight size so the 3-attacker many-on-one is the core loop.

### P3 guild_heavy
```
party: {cap: 4, reserve_bench: 1}     # ours: 3 attacker seats + 1 reserve
guild: {enabled: true,
        ranks: [ {id: 1, name: "leader",  level: 0, mask: ["all"]},
                 {id: 2, name: "admin",   level: 1, mask: ["invite","kick","promote","demote","edit_ranks","manage_motd","set_privacy","chat_speak","chat_hear","chest_withdraw","chest_deposit"]},
                 {id: 3, name: "officer", level: 2, mask: ["invite","kick","promote","manage_motd","chat_speak","chat_hear","chest_withdraw","chest_deposit"]},
                 {id: 4, name: "member",  level: 3, mask: ["chat_speak","chat_hear","chest_deposit"]},
                 {id: 5, name: "recruit", level: 4, mask: ["chat_speak","chat_hear"]} ],
        invariants: {one_leader: true, admin_cap: 4, creator_protected: true}, review_days: 21}
chat: {channels: ["zone","party","guild","private","global_lobby"]}
presence: {modes: ["online","friends_only","hidden"], default_mode: "online", friends.cap: 120}
xp: {share_mode: "even", pool_bonus: [1.0,1.10,1.20]}
loot: {mode: "round_robin"}
```
Goal: social persistence; guilds carry ranks and chat; fights still capped at 3 attackers with extras in reserve.

### P4 casual_queue (matchmaking-forward)
```
queue: {enabled: true, tick_hz: 1, party_mode: "solo_only", rank_gap_start: 100, rank_gap_widen_per_cycle: 25, force_after_cycles: 12}   # gap numbers are ours, tune on phone
party: {cap: 3}
chat: {channels: ["zone","party"], budget: {capacity: 3, refill_ms: 2000, penalty_s: 8}}   # "tight" = these ours values
presence: {modes: ["online","hidden"], default_mode: "online"}
```
Goal: quick pickup fights on phone.

### P5 locked_down (moderation test)
```
chat: {channels: ["zone","party","private"], max_chars: 80, budget: {capacity: 3, refill_ms: 2000, penalty_s: 8}}   # global_lobby not in the list = disabled
presence: {modes: ["online","friends_only","hidden"], default_mode: "friends_only"}
mute: {shadow.enabled: true}           # single home for shadow mute
```
Goal: safe default for younger players.

---

## 5. Novel ideas (20)

N1. Reserve bench: party can exceed 3, only 3 hold attacker seats; the rest are "reserve" and can swap in at a tick boundary (seat memory from 0ad + MAX_ATTACKERS).
N2. Tag-in handoff: a tired attacker can hand their seat to a reserve member in one action; ledger records a "seat transfer", XP weight starts at zero for the incoming member for N ticks (stops seat-selling for XP).
N3. Party-level encounter picks the zone encounter table only (swgemu shape), never changes enemy stats; displayed to the party as "encounter tier".
N4. XP share meter shown to all members with the reason when sharing is off ("level gap too wide"), fixing rathena's silent off.
N5. Two-tab-safe presence: session count per account plus one "last seen" timestamp; phone backgrounding is "away" before "offline".
N6. Invite by short code or QR for in-person phone play (amilich shape); code is single-use, ttl-bound, server-checked.
N7. Rank by contribution, not just by promotion: a guild rank ladder computed from ledger contributions (daggerfall review clock shape), with demotion one step.
N8. Guild "whisper chain": officers can opt into a hear-only channel for new-member chat moderation (per-recipient hear check from DOLSharp).
N9. Ghost party: a disconnected member stays on the roster for `seat.grace_s` as an "offline" slot; the party can still start a fight with the remaining members.
N10. Shadow-mute auto-escalation: repeated rate-limit hits move a sender to shadow mute for N minutes, then clear (tiered penalty from hedgewars/pokerth).
N11. Presence-aware invites: invite is hidden for hidden/ignoring targets so refusal does not leak whether they are online.
N12. Per-viewer friend nicknames stored in the viewer's record in the server ledger (never on the client), never shown to others.
N13. Party markers on the world map with one query per 250 ms poll (ClassicUO) and a 2 s fade, but only for teammates out of view.
N14. Guild perks as rank-scaled rewards (daggerfall) with caps as data: bigger guild, bigger cap but not stronger fights.
N15. Mentor/recruit pairing: a new player and a veteran form a 2-party with a special XP pool bonus (ours), time-limited.
N16. Auto-queue replacement: when a party member drops mid-queue, the system fills with the next queued player of similar rank (colyseus widen shape), shown as "replacing X".
N17. Chat history as a view: history is a server log with a per-viewer filter (mute, ignore); late join gets last N lines through the same filter.
N18. Social action tick gate with a visible cooldown bar so phone players know why a button is greyed out.
N19. "Quiet mode" preset flips all channels to hear-only except party; one switch for noisy zones.
N20. Fight-aware chat throttle: during a fight, only party and private channels are open; zone channel is queued and delivered after the fight (data flag per zone).
N21. Daily guild event board using the global daily reset (azerothcore shape), data-driven.
N22. Report button writes a ledger record that freezes the last N chat lines and the muted-by lists for a moderator (ban purge shape from pokemonAutoChess, ban protection for admins).

---

## 6. Parity-row gaps (rows Lead should add)

I could not see the parity table. Only four proposed rows are supported by the digest; the rest are my inference and are labelled so. Row numbers are unreliable; Lead to number them.

Supported by the digest (a donor note says no existing row covers it, or a row is a stretch):
- Matchmaking queue (rank widening by wait). Supported: colyseus says row 1 is a stretch and no row covers matchmaking.
- Guild rank ladder and permission bitmask (grant ceiling, one-leader invariant). Supported: daggerfall says row 18 is a stretch and no row covers rank ladders.
- Guild service/perk gating by rank (daggerfall/azerothcore). Supported, but only if guilds own perks.
- Companion/formation (exult, xoreos). Supported (exult: row 5 is a weak fit, none of rows 1-23 covers it); only if NPC companions exist, otherwise drop.

Possibly covered already: Party XP and loot share on the one ledger (explicit total, exact remainder). TrinityCore says row 18 is the party-XP shape, so Lead to check whether row 18 already covers it before adding a row.

Inferred by me, NOT a digest gap statement (proposals only):
- Party formation: invite, accept, cap, expiry, seat hold, many-on-one seat assignment with reserve bench.
- Party leader succession and dissolve rules.
- Chat channel routing from server membership.
- Chat rate limit and shadow mute.
- Mute/ignore as a ledger-backed per-viewer filter.
- Presence, privacy mode and friends list.
- Rejoin/seat memory after disconnect (grace window).
- Social action tick gate and busy gate (one session per actor).
- Moderation: ban purge, admin protection, report freeze.

Existing rows that likely cover related areas (guess only): kill XP/ledger, anti-cheat/server-verification, persistence. I did not verify which row numbers.

---

## 7. Experiment plan (headless server tests)

All run on the VPS (standing rule), headless, deterministic fixed-step server with fake clocks and in-memory sockets. None exists yet.

E1. Pit isolation: with social modules on and off, Pit fight snapshots are byte-identical.
E2. Roster lifecycle: cap, compaction, succession modes, dissolve rules (gems 1, 3.1, 3.3).
E3. Invite: expiry, replace, pending counts toward cap, accept with gone inviter, double-accept race with seat hold.
E4. Seat memory: 3-attacker fight, drop and rejoin inside and outside grace, friends-only gate.
E5. XP pool: conservation, dead attacker, gap table with catch-all, each ledger line has reason.
E6. Loot: random eligible, full pack, exact coin remainder (11 coins over 3 members credit 4, 4, 3 = exactly 11).
E7. Permission bitmask: officer cases, grant ceiling, invariant refusals, id never reused.
E8. Chat send path: forged channel/party id, muted/ignored listener, 5 lines in window (capacity 4: the 5th is rejected), a 200-character line capped to 160, empty-name sender.
E9. Presence: privacy order, followers fanout, reconnect snapshot equality, two-tab session count.
E10. Matchmaking: spoofed rank ignored, widening by cycle, forced resolution, lone entry timeout.
E11. Load: 500 simulated accounts, 20 parties, 10 guilds; measure per-tick time budget and message volume.
E12. Fuzz: random sequences of invite/accept/leave/kick/disconnect; invariants (no account in two parties, no over-cap, ledger sums conserved).

Pass criteria: every acceptance line in the digest becomes a test, plus a "refused with a reason" assertion for each refusal.

---

## 8. Thin or uncovered parts

- Party formation (invite code join, queue-based formation): thinly covered. Invite lifecycle has about six donors, but queue-based formation is covered by colyseus alone, and the role-first group by pmbstyle alone.
- Matchmaking queue: one donor (colyseus) with known defects; the rest is ours.
- Friend requests (mutual accept, pending requests): no donor shows a mutual-accept handshake. LostCityRS does show a friend-list cap refusal with a reason, and the visibility rule and fan-out are covered; the handshake is not.
- Voice/emote/quick-chat (phone-first): no donor coverage.
- Guild creation/disband/treasury flows: covered only by azerothcore (bank cap) and rank donors; no donor for creating or dissolving a guild with a fee.
- Reporting, block lists across devices, age gating: no donor coverage.
- Cross-zone party travel (party follows into another zone): no donor beyond xu4 (gate before roster) and jynew (map-only leave).
- Notifications on phone (push when invited offline): no donor coverage.
- Spectating a party fight: only boardgame.io's spectator send refusal.

---

## 9. Questions for Dom (max 6)

1. Party size: should a party be able to exceed 3, with extra members as a reserve bench behind the 3 attacker seats, or is party size capped at 3 so party equals fight group?
2. Is shared XP supposed to be worth more than solo (a visible group bonus on the ledger) or equal-total (pure split)? Either is easy as data, but it changes how the ledger totals read.
3. Do guilds exist at launch, or is the first release party plus chat plus presence only? This decides whether the rank bitmask part is built first or parked.
4. Should the global lobby chat exist, or only zone, party, guild and private? (Safety and moderation load differ a lot.)
5. When a party member disconnects mid-fight, hold their seat for a grace window (ours: 25 s) or drop them at once?
6. Do you want a matchmaking queue for duels at launch, or only invite-based play?

---

## 10. Closing notes

- Nothing is built. This file proposes designs; no schema, code or test exists.
- Verified against the digest only. I did not re-read the deep notes or donor code. Where the digest cut a gap list mid-sentence I did not guess its continuation.
- Shape-only donors (copyleft, restricted): no donor constants copied. Values here (party cap 4 = 3 attacker seats + 1 reserve, admin cap 2, invite ttl 45 s, chat budget 4 lines refilling at 1.5 s, penalty 6 s, seat grace 25 s, pool bonus 1.0/1.10/1.20 as linear +0.10 per extra attacker) are our own tuning, derived as stated and not taken from any donor; tune on phone. The checker found earlier values (admin cap 3, party cap 6, pool bonus 1.15, test fixture of 10 coins over 3) matched copyleft donor constants or examples; those were replaced.
- Licence caution: the digest marks SpacetimeDB and Valve restricted, and pokerth and swgemu AGPL-3.0. No other specific licence names are claimed here (unverified). Shape only.
