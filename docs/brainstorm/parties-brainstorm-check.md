# Check of parties-brainstorm.md against parties-digest.md

Method: read the whole brainstorm and the whole digest (52 entries, line 1-606). I did not open the deep notes: every claim below is checked against the digest text only, and the digest is truncated at about 700 chars per gap list. The digest's own "checker:" lines (ModernUO, ClassicUO, ACE, swgemu, AAEmu, TrinityCore) were used where present. Brainstorm file not edited.

Overall: the brainstorm is sound. All 15 gems map to real digest entries with the right mechanism and the right licence class. I found no invented donor and no mis-attributed mechanism. The problems are small: 2 unsupported licence facts, 3 numbers that match or sit next to a copyleft donor constant, one misdescribed penalty tier, one internal test/number mismatch, and several preset field problems.

## 1. Top gems (15)

| # | Verdict | Finding |
|---|---|---|
| 1 | OK | DOLSharp D002 (join order, leader succession, dissolve at one), OpenDAoC (two-member dissolve), l1j (two-member dissolve), xoreos (rotation only) all match. Licence C is right. xoreos gives only a rotation, not "earliest-joined"; the brainstorm labels it "(rotation)", so fine. |
| 2 | OK | ModernUO checker confirms 30 s expiry, re-invite at 20 s moves expiry to 50 s ("extends"), pending counts toward capacity. veloren: 31 s expiry, pending counts. levy-street: 30 s expiry. l1j: one slot per invitee, second invite replaces. Tags C,C,P,C match. |
| 3 | OK | nakama seat hold and all-or-nothing batch, missing hold timeout (the brainstorm says so). levy-street validate-then-merge. xu4 gates before mutation. Tags P,P,C match. |
| 4 | OK | 0ad seat memory (last seat if free, else lowest free). The grace window is the brainstorm's own addition because the donor has no timer; it says so. |
| 5 | minor | TrinityCore pool times bonus, split by level weight among alive attackers: matches. DevilutionX credit mask and ax-grymyr pool-then-split: match. Wording "too-far members get zero" is the distance rule that the digest says to drop (replace with "in the fight"); the table row for TrinityCore is correct, only the gem wording is off. Tags C,R,P match. Also see numbers section (pool_bonus). |
| 6 | OK | OpenDAoC: random eligible in-view member with room, full pack falls through, exact-remainder fix for the ceil rounding. |
| 7 | OK | OpenRCT2 bitmask, grant ceiling, default least privilege; gawric no-grant-above-own; Cubyz grant ceiling and path walk; DOLSharp superset ladder. Tags C,P,C,C match. |
| 8 | OK | lila admin floor, admin cap, creator protected, kick hierarchy; DOLSharp level-0 unique; smogon strictly-below. Tags C,C,P match. |
| 9 | OK | OpenTTD three-route, Valve single send path and filter stack (mute, ignore, dead speaker), wesnoth stamp, SpacetimeDB server-stamped author, boardgame.io relay without store. Tags C,R,C,R,P match. |
| 10 | minor | OpenRA window with penalty that holds the window full, pokerth budget before fan-out, hedgewars two tiers: all correct. But the gem says the tiers are "warn, then silence". The only two-tier donor (hedgewars) is warn, then DISCONNECT. "silence" is the brainstorm's own idea (3.6 lists "warn","silence","disconnect"). Reword to "warn, then a stronger step (silence or disconnect, data)". |
| 11 | OK | pokerth shadow mute echoes to sender only and still spends budget. AGPL tag given as C. |
| 12 | OK | BAR account-id key, name as alias, hide not delete. |
| 13 | OK | 2004Scape order (staff, ignore list, privacy mode, friend list) and follower fan-out; LostCityRS hidden = offline, one social action per tick. Both P. Caveat: lichess-mobile says presence must stay OUT of the one ledger and never feed a fight, kill, loot or ledger rule. "Presence as a view over one ledger" is fine only if read as "friends, ignores and mode live in the ledger; online state is derived". Add that sentence. |
| 14 | OK | lichess-mobile snapshot on resume/reconnect and idempotent delta by id; ClassicUO roster rebuild from full server list; SpacetimeDB gives the online flag, and the session count is the fix for its defect (brainstorm's table shows this). Tags C,R,P match. |
| 15 | minor | colyseus fixed 1 Hz re-sort, widening by wait, forced after N cycles, wait counter on the entry: matches. pmbstyle role-first fill is correct. The words "duel/pit-adjacent queue" are risky under the Pit-frozen ruling. Say "duel queue that creates a fight request for the one engine; it never edits Pit". |

## 2. Defect -> fix rows

I scanned all 45 rows against the digest. Every row names a defect that the cited digest entry actually states. 12 spot-checked rows in detail:

| Row | Verdict | Note |
|---|---|---|
| DOLSharp D002 | OK | Non-player fallback leader and 8 vs 3 are both in the gap list. |
| 0ad | minor | Name key and no timer: correct. "Kick clears memory implicitly": the digest says an explicit host unassign writes -1 and asks whether a kick should do the same. Wording only. |
| EQEmu | OK | Trusts inviter name in accept, no expiry, leader leave disbands any size. |
| OpenDAoC | OK | ceil rounding, AddMember result ignored, invite key never expires (the last is hedged as "in the code read"). |
| OpenRCT2 | OK | Demote of higher rank, wall-clock cooldowns, dead branches. |
| OpenTTD | OK | Team id from packet, no rate limit on that path, byte count, private line no membership rule. |
| ax-grymyr | OK | Marked "suspected" and "not run" in both the digest and the brainstorm. |
| rathena | OK | Divisor includes bystanders, silent level gate, map id not distance. |
| ACE | OK | Matches the digest checker (gap 6-10 is proportional mode; ShareXP from DesiredShareXP; inflation). |
| ClassicUO | OK | Optimistic Leader = Inviter, 10 s trust window, null slots. |
| nakama | minor | "lock-free snapshot not needed" is not a defect; it is a not-adopted item. Move it out of the defect column. |
| colyseus | minor | Client rank/team id and averaging double count: correct. "Lone team never fills" is cut off in the digest ("hand trac"); the fix text (timeout, refund, fail with reason) is the brainstorm's own and should be tagged as ours. |

Other rows read cleanly. Licence tags in the table match the digest header for every donor.

## 3. Unsupported or invented facts

- "SpacetimeDB repo is BSL": BSL appears nowhere in the digest (it says only "restricted"). Likely true in real life but not supported by the source. Remove or mark "from memory".
- "lila is AGPL" (intro): not in the digest. Digest tags lila only as "copyleft". Remove or mark unverified.
- Intro line "pokerth (AGPL)" and "swgemu (AGPL)": supported (both notes say AGPL-3.0).
- "Valve is restricted": supported.
- Intro says "I read all 52 digest entries": true (52 headings).
- No donor invented. No mechanism mis-attributed.

## 4. Numeric values versus donor constants

Rule: shape only; numbers must be the brainstorm's own.

| Value in brainstorm | Donor value in digest | Verdict |
|---|---|---|
| `guild.invariants.admin_cap: 3` (3.5) | lila (AGPL, copyleft): 3 admins (and 10 leaders) in `TeamSecurity.scala` | wrong: identical to a copyleft constant. Pick another default (e.g. 2 or 4) or derive it. P3's 4 is fine. |
| P3 `party.cap: 6` | EQEmu (GPL-3): fixed 6-slot party, "seventh accept refused" | minor: matches a copyleft constant. Use 4 or 5 for the bigger-party preset. |
| `party.cap` default 5 (3.1, closing notes) | levy-street caps 5 and 10 (permissive); veloren acceptance uses 5 members (copyleft example) | minor: matches a permissive constant and a copyleft test example. Consider 4. |
| `pool_bonus` [1.00, 1.15, 1.25] (3.4, P2) | TrinityCore (GPL): 1.0 for one or two, 1.166 for three (Formulas.h 1.0/1.166/1.3/1.4) | minor: 1.15 is within 0.02 of 1.166 and the table shape (bonus indexed by counted members) is TrinityCore's. Not identical, but close enough that a reviewer will ask. Use 1.0/1.10/1.20 (P3 already uses it) or state a derivation. |
| `friends.cap` 80 / 120 | LostCityRS (permissive): 100 | OK (permissive, differs). |
| `invite.ttl_s` 45, P1 60 | ModernUO 30, veloren 31/30, levy 30 | OK (differs). |
| `review_days` 21 | daggerfall (permissive) 28 | OK. |
| `max_chars` 160, P5 80 | Valve 127, pokemonAutoChess 250, OpenTTD 900 | OK. |
| chat budget cap 4, refill 1500 ms, penalty 6 s | pokerth 5 lines per window, hedgewars cap 2/10 s and 3/30 s, OpenRA acceptance (about 13 s left, 19 s) | OK (differs). But see section 5. |
| `queue.tick_hz` 1 | colyseus (permissive) 1 Hz | OK (permissive). |
| `social_action_gate_ticks` 1 | LostCityRS (permissive) | OK. |
| N13 250 ms poll, 2 s fade | ClassicUO (permissive) | OK, and it cites ClassicUO. |
| Test E6 "10 coins over 3 members" | OpenDAoC acceptance example (copyleft) | minor: a test fixture, not a game constant, but it is the donor's exact example. Use 11 coins over 3 (credits 4,4,3). |
| E8 "300 chars capped" | Valve acceptance (300 capped at 127) | minor: test input only; use any other length. |

The closing note says all numbers are the brainstorm's own. That statement is false for admin_cap 3 (lila) and P3 cap 6 (EQEmu), and nearly false for pool_bonus. Fix those three and the statement becomes true.

## 5. Presets (internal consistency and rulings)

Rulings: server-verified, one ledger, MAX_ATTACKERS = 3, Pit frozen. No preset sets or overrides MAX_ATTACKERS, none touches Pit, none moves authority to the client. Good. Field findings:

| Preset | Verdict | Finding |
|---|---|---|
| P1 solo_friendly | minor | `invite.leader_only: false` contradicts gem 1 / 3.2 default (leader-only) and the veloren/l1j lesson (non-leader invite pulls inviter out of group). If intended, say so and keep the accept-time leadership check. Party is enabled but channels list has no "party" channel, so a party has no chat; either add it or note it. `xp.share_mode: off` is consistent with one ledger (each attacker credited alone). |
| P2 duo_and_trio | minor | `queue: {party_mode: "pre_made_ok"}` is set without `queue.enabled`, and 3.9 says the queue is a separate thing; add `queue.enabled` or drop the line. `party.cap: 3` is a literal equal to MAX_ATTACKERS; fine as data, but the no-alias test (table row DOLSharp D002) should cover it. |
| P3 guild_heavy | minor | Relies on "extras in reserve" (party cap 6, 3 attacker seats) but no data field for the reserve bench exists in section 3 (it appears only as novel idea N1). Add `party.reserve_bench` or `seat.attacker_seats` to 3.1/3.10. `ranks: 5-step ladder` is prose, not data. `pool_bonus` has 3 entries, which is right because only attackers (max 3) are counted. Cap 6 matches EQEmu (see section 4). |
| P4 casual_queue | minor | `chat.budget: tight` is a string, but 3.6 defines budget as an object {capacity, refill_ms, penalty_s}. The queue block omits `party_mode`, rank gap and widen fields. |
| P5 locked_down | minor | Same `budget: tight` string. `presence.default_mode` is not a field in 3.8 (only `modes`). `shadow mute on` appears under both `chat` and `mute.shadow.enabled`; keep only the 3.7 location. `max_chars: 80` is fine. |

Cross-cutting: shared XP bonus table and `explicit_total` apply in every XP preset, so the ledger total is always explicit (matches the ACE fix). Server verification and one ledger are engine-wide, not preset switches, which is correct.

Internal contradiction in the chat limit: the data is capacity 4 (3.6), yet the tests say "6th line inside window rejected" (3.6 test) and E8 says "6 lines in window". With capacity 4 the 5th line is rejected. The "6th" comes from pokerth's acceptance (5 reach, 6th rejected). Fix the test to "5th line", or set capacity 5 and accept the pokerth match.

## 6. New parity rows

What the digest actually says about parity rows (only these three, plus TrinityCore's one mention):
- colyseus: row 1 is a stretch; no row covers matchmaking.
- daggerfall: row 18 is a stretch; no row covers rank ladder or service permissions.
- exult: row 5 is a weak fit; none of rows 1-23 covers companion formation.
- TrinityCore: party pool/bonus/split is "the shape row 18 needs", so party XP may already be covered by row 18.
- forgottenserver: "no class-count rule in the parity list".

| Brainstorm new row | Verdict |
|---|---|
| 10 Matchmaking queue | OK, directly supported. |
| 4 Guild rank ladder and bitmask | OK, supported. |
| 5 Guild service/perk gating by rank | OK, supported (daggerfall), but it is conditional on guilds owning perks. |
| 14 Companion/formation | OK, supported; conditional on NPC companions. |
| 3 Party XP and loot share | minor: TrinityCore says row 18 already is the party-XP shape. Mark as "maybe covered by row 18; Lead to check" rather than new. |
| 1, 2, 6, 7, 8, 9, 11, 12, 13 | minor: not supported by any digest gap statement. They are the brainstorm's inference. The brainstorm admits it cannot see the table and calls the list unreliable, so this is honest, but they must be labelled "inferred, not a digest gap". |

## 7. Other small notes

- Section 8 says no donor shows an add-friend handshake. LostCityRS's acceptance does include a friend-list cap refusal (101st friend refused with a reason), so a cap exists; the handshake (mutual accept) is indeed absent. Reword to "no mutual-accept handshake".
- N12 (friend nicknames "in the viewer's data") must live in the server ledger, not on the client (one ledger, server-verified). Add that.
- 3.8 donor list names AAEmu (delta cache): AAEmu is party-state push, not presence; list it under 3.10 party_state only.
- The intro admits it did not read deep notes; true to the evidence, no overclaim found there.

## 8. Corrected list of required edits

1. Change `guild.invariants.admin_cap` default from 3 (lila constant) to another value.
2. Change P3 `party.cap` 6 (EQEmu) and the default party cap 5 (levy/veloren) to values with no donor match, e.g. 4 for the bigger preset and 4 or 5 labelled "ours, no donor match".
3. Change `pool_bonus` [1.0,1.15,1.25] (near TrinityCore 1.166) to e.g. [1.0,1.10,1.20] or give a derivation.
4. Remove "SpacetimeDB is BSL" and "lila is AGPL" or mark them as not in the digest.
5. Gem 10: replace "warn, then silence" with "warn, then a stronger step (silence or disconnect)".
6. Gem 15: remove "pit-adjacent"; state the queue only creates a fight request for the one engine.
7. Gem 5: drop "too-far" from the zero-share list (use "not in the fight").
8. Gem 13: add "online state is derived and never an input to fight, kill, loot or ledger rules".
9. Fix chat tests (capacity 4 means the 5th line is rejected) in 3.6 and E8.
10. Presets: P1 leader_only decision, P1 party channel, P2 queue.enabled, P3 reserve-bench field and ladder as data, P4/P5 `budget` as an object, P5 `default_mode` field and single home for shadow mute.
11. Defect table: move nakama "snapshot not needed" out of the defect column; tag the colyseus lone-team fix and the 0ad "kick" wording as ours/hedged.
12. Test fixtures E6 (10 coins over 3) and E8 (300 chars): change to non-donor values.
13. Parity section: label rows 1, 2, 6-9, 11-13 as "inferred", row 3 as "possibly covered by row 18", keep rows 4, 5, 10, 14 as digest-supported.
14. Section 8 and N12 wording fixes from section 7.
