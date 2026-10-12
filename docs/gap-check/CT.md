# Gap check CT (chat, social, moderation)
Date 2026-10-12. Frankendom repo read: frankendom-lead-catalogue at commit 8d6ae33a9 (read-only). Donor notes: 9 (CT001, CT002, CT003).

## Summary for Dom
1. Frankendom has NO chat, friends, block, mute or report code today. The rules are written (docs/specs/origins/one-shard.md section 6a; launch gate S4 in docs/specs/origins/launch-gates.md, status open) but nothing is built. GAME_SPEC.md lists chat as NOT NOW for the duel product; this is Origins work.
2. Counts by donor note: REUSE 0 whole, ADD 9, SKIP 0. Two sub-ideas SKIP (EQEmu karma-scaled allowance, 2004Scape per-tick gate). One pattern is reusable inside the ADDs: the presence server's per-socket one-second counter and per-IP bucket (origins/presence/server.ts:16, 138-139, 190-192).
3. The nine notes collapse to three real additions (merged below): G1 one chat intake gate (6 notes), G2 one visibility/block gate (3 notes), G3 report with filing-time chat copy (1 note).
4. Top 3 additions: (a) G1 chat intake gate: refused lines never use the budget, warn band then timed mute, never shorten a mute, staff exempt, party/guild not exempt; (b) G2 single visibility gate with fixed precedence (staff, ignore/block, privacy mode, friends-only), unknown mode fails closed to OFF, same error for blocked and unknown; (c) G3 report that copies the reporter's last server-stamped lines at filing time, one open report per reporter.
5. Licence note: EQEmu, ModernUO, TrinityCore, OpenDAoC, Veloren are copyleft (GPL); clean-room only, no donor numbers are in this file. Every number (budget, bands, windows) must come from one-shard.md section 6a (about 1 message per 2 s with a burst cap; strikes warning, 10 min, 24 h, chat ban) and our own tests.

## What we have today (shared by all rows)
- Presence service: origins/presence/server.ts. Header comment line 4 says speech arrives with its own PR. Has per-socket messages-per-second close (LIMITS line 16, count at 190-192), per-IP socket and join caps (138-139), size cap. Wire is binary pose-only (origins/presence/wire.ts, 8-byte up packet), no text frame type.
- Writer (all durable writes): origins/server/server.ts createWriter, handlers table origins/server/handlers.ts:68-72. Place comes from presence via origins/presence/where.ts.
- Admin roster: supabase/migrations/202609210001_admins.sql (usable as the staff-exempt source).
- Rate-limit-in-database precedent: supabase/migrations/202609210002_fight_records.sql insert policy (per-poster hourly count); trade limits in 202610070005_origins_trade_limits.sql (draft).
- Nothing for: chat text, filter, mute, block, ignore, friends list, report, strike ladder. No origins/chat or origins/social folder exists.

## Gap table
| Donor note | Idea in 8 words | We have today | Gap | Call | Lands in |
|---|---|---|---|---|---|
| CT001 TrinityCore | Burst of close lines becomes timed mute | Per-socket msg/s close only (presence/server.ts:190-192); no text, no mute | No chat intake, no mute row | ADD (merged into G1) | Proposed target not verifiable (no path in note). Nearest real: origins/presence/server.ts for the gate, new origins/chat/gate.ts (does not exist) for pure logic, mute as a writer row via origins/server/handlers.ts + new supabase migration |
| CT001 EQEmu | Chat budget grows with earned trust, kicks on abuse | Same as above | Base budget is G1. Trust-scaled allowance not in any ruling | ADD budget (merged into G1); SKIP karma scaling (not in the 6a ruling; revisit after S4 closes) | As G1 |
| CT001 ModernUO | Report carries reporter's server-stamped recent lines | Nothing; no report path | Needs a stored chat window per player and a report row | ADD (G3) | New origins/chat/report.ts (not present), row written by the writer (handlers.ts), table in a new migration after 202610080003 |
| CT002 evennia | Sliding one-second accept log; rejects never count | Fixed one-second window that closes the socket (presence/server.ts:190-192), counts every frame | Chat needs refuse-with-warning, not close; rejected lines must not count; chat budget must be separate from pose frames | ADD (merged into G1); reuse the counter pattern only | As G1; keep pose budget (LIMITS.perSecond) untouched |
| CT002 nakama | Block is one-way edge; DM and friend gates read it | Nothing; presence has only join-friend by account id (presence/server.ts:141-148, interest.ts:49-53) | No block store, no DM gate | ADD (G2) | New supabase migration (blocks table, owner-side row) + writer handler; gate logic new origins/chat/visibility.ts (not present) |
| CT002 LostCity | One visibility gate, fixed precedence, fail-closed mode | Nothing | Same gate as nakama; child-safety default must resolve unknown mode to OFF | ADD (merged with nakama into G2) | As G2 |
| CT003 OpenDAoC | Per-command window written only on accept; staff bypass | Nothing for text | Same as G1; adds one intake function every path (whisper, group, DM) must call | ADD (merged into G1) | As G1: one intake function, called by every chat path |
| CT003 2004Scape | One social action per tick; ignore and privacy modes | Presence has a tick (origins/presence/ticks.ts) but no chat | Ignore/privacy modes are G2. Per-tick social gate adds nothing over the G1 budget | ADD modes (merged into G2); SKIP per-tick gate (G1 budget covers it) | As G2 |
| CT003 Veloren | Decayed rate estimate, warn band then mute band | Nothing | Warn-then-mute shape matches our strike ladder start (warning, 10 min) | ADD (merged into G1) | As G1 |

## Merged additions (one build each)
- G1 Chat intake gate. Notes: TrinityCore, EQEmu (budget part), evennia, OpenDAoC, Veloren, 2004Scape (dropped tick part). Rules to carry: one intake function for every chat path; refused lines do not consume budget; refusal tells the sender why (seconds left); mute never shortened; staff exempt via admins roster; party and guild chat not exempt; mute stored as a writer row, not socket state; ties to launch gate S4 (rate limit and link refusal tests). Overlaps with the filter, strike ladder and report button in S4: build G1 and G3 inside the S4 plan, not separately.
- G2 Visibility and block gate. Notes: nakama, LostCity, 2004Scape (ignore part), OpenDAoC (receive gate). Rules: check both directions; same error for blocked and unknown target; ignore drop is silent to the sender; unknown saved mode resolves to OFF; extend to party, guild and zone chat.
- G3 Report with chat copy. Note: ModernUO. Rules: server-stamped window copied at filing time and pruned first; harassment reports only; one open report per reporter; write through the writer; no email or Discord copy.

## Could not verify
- The notes carry no explicit "Lands in" line; targets above are my nearest-real-file picks.
- Whether the Strategy rulings "friends list and blocking" and "child-safety defaults" (quoted in the LostCity and nakama notes) exist as written text: grep of PROJECT_STATE.md and docs found no such file, only one-shard.md 6a and launch-gates S4.
- Checker-findings sections were only read as headers (grep); not their contents.
- Donor licences for 2004Scape, LostCity, evennia and nakama not checked; treated as no-numbers to be safe.
