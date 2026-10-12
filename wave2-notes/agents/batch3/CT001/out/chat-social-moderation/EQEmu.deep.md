# EQEmu (chat-social-moderation, cell 3)

Donor: `/mnt/frankendom-donors/EQEmu/zone/client.cpp` | Licence: GPL-3.0 (`LICENSE.md`: "Version 3, 29 June 2007"; source headers: "either version 3 of the License, or (at your option) any later version"; copyleft, clean-room, shape only) | C++ | symbol `Client::ChannelMessageReceived` (anti-spam block; karma in `zone/client_process.cpp`)

Checked: Read in full: the anti-spam block of `Client::ChannelMessageReceived` (client.cpp 1263-1300; the function starts at 1201, and awk found no other function start between 1201 and 1262; the function's end was not read). Read in full: the karma award (client_process.cpp 257-260), the karma load (client_packet.cpp 778), the rule defaults (ruletypes.h 919-929). Read: the UCS channel limiter (ucs/clientlist.cpp 1346-1380), the karma gate for global channels (client.cpp 1400-1410), the UCS ignore and buddy commands (ucs/clientlist.cpp 409-449) and table (ucs/database.cpp 666-712), the OOC mute command (zone/gm_commands/set/set_ooc_mute.cpp 23-47) and its check (client.cpp 1436). Not read: whether the zone chat path for say, group and guild is limited (the block's condition at 1267 excludes them, but the rest of the function was not read); whether the karma timer pauses while a client is offline; the UCS enforcement of the ignore list (grep finds the commands, not a delivery check). Confidence: high on the zone budget and karma (read end to end, numbers from rules); medium on the UCS branch. Not run. Camera scope: not applicable.

Best transferable idea: A chat budget per interval whose allowance grows with earned trust (a karma point per active period, capped), refuses over-allowance lines with a seconds-left notice, and disconnects only above an absolute attempt count.
Decision (proposed): adapt — keep the interval budget, the trust-scaled allowance, the seconds-left notice and the absolute kick; use one budget for every chat channel (the donor has two, zone and UCS); accrue karma only while the player is active; store trust per account as a writer row.
Acceptance: A player at zero karma sends 4 OOC lines in a minute and the 5th is refused with a seconds-left notice; after 8 karma points the allowance is 12; a 21st attempt in one minute disconnects; karma rises only in periods where the player sent a line or moved.

## 1. Mechanism

- Scope. The budget runs in `ChannelMessageReceived` for shout, auction, OOC and tell (client.cpp 1263-1267). The UCS channel path runs it for channel speakers when the channel is unmoderated or the speaker has voice, owns, moderates or administers the channel (`ucs/clientlist.cpp` 1350-1353).
- Interval. The first attempt after the interval timer expires restarts the timer and zeroes the attempt count (client.cpp 1271-1275). The interval is `IntervalDurationMS` = 60000 (ruletypes.h 927).
- Allowance. Allowed = `MinimumMessagesPerInterval` (4) + `TotalKarma`, clamped to `MaximumMessagesPerInterval` (12) (client.cpp 1278-1279). Trust is therefore worth at most 8 extra lines a minute, reached at 8 karma.
- Bypass. A status at or above `MinStatusToBypassAntiSpam` (100) sets the allowance to 10000 (client.cpp 1281-1282).
- Count. The attempt count goes up before the test, so refused attempts count too (1284-1285).
- Response. Over the allowance: if attempts are over `MaxMessagesBeforeKick` (20), the client is kicked with "Sent too many chat messages at once." (1287-1289, return). Otherwise it is told it is rate limited and how many seconds remain (1292-1294, return). With no timer, the notice says 60 seconds.
- Karma. Karma is a per-account counter, loaded from the database (client_packet.cpp 778; the enclosing function was not read). A timer set up with the client (client.cpp 289; enclosing function not read) fires every `KarmaUpdateIntervalMS` = 1200000 ms (20 min) of client processing; each firing adds one point and saves it (client_process.cpp 257-260; ruletypes.h 928). Nothing in lines 257-260 checks activity.
- Global chat gate. On the auction path (read), a player below `KarmaGlobalChatLimit` (72) and below the level limit is refused (client.cpp 1404-1406). Two other global-chat paths also use the karma gate (client.cpp 1448 and 1496; not read). 72 points at 20 min each is 24 hours of client time.
- Server-wide OOC mute. A GM sets one server flag (set_ooc_mute.cpp 36, sent to the world server); the zone refuses OOC from anyone below GM admin while the flag is set (client.cpp 1436). There is no duration.

## 2. Key functions

- `Client::ChannelMessageReceived`: `/mnt/frankendom-donors/EQEmu/zone/client.cpp` 1201 (start), anti-spam block 1263-1300.
- Karma award: `/mnt/frankendom-donors/EQEmu/zone/client_process.cpp` 257-260.
- Karma load: `/mnt/frankendom-donors/EQEmu/zone/client_packet.cpp` 778.
- UCS limiter: `/mnt/frankendom-donors/EQEmu/ucs/clientlist.cpp` 1350-1380.
- UCS ignore and buddy commands: `/mnt/frankendom-donors/EQEmu/ucs/clientlist.cpp` 409-449; table writes in `/mnt/frankendom-donors/EQEmu/ucs/database.cpp` 666-712.

## 3. Numbers vs mechanism

| Item | Donor value | Where |
|---|---|---|
| Interval length | 60000 ms | `ruletypes.h` 927 |
| Floor allowance | 4 per interval | `ruletypes.h` 924 |
| Ceiling allowance | 12 per interval | `ruletypes.h` 925 |
| Karma added to allowance | +1 line per karma point (capped by the ceiling) | `client.cpp` 1278-1279 |
| Kick threshold | attempts above 20 in one interval | `ruletypes.h` 926; `client.cpp` 1287 |
| Karma award period | 1200000 ms (20 min of client time) per point | `ruletypes.h` 928; `client_process.cpp` 258-259 |
| Karma for global chat | 72 points (about 24 h of award time), or level limit | `ruletypes.h` 929; `client.cpp` 1404-1406 |
| Bypass status | 100 | `ruletypes.h` 923; `client.cpp` 1281 |
| Karma to reach the ceiling | 8 points (4 + 8 = 12) | derived from 1278-1279 |

## 4. TypeScript sketch

simplified: keeps the interval budget, the trust-scaled allowance, the refusal notice, the kick above an absolute count and the karma award with a fixed period. It reorders on purpose: karma accrues only when the player was active (fix: the donor awards on client time alone; `tickKarma` takes an `active` flag). It omits the zone and UCS split (one budget here), the seconds-left text, the global-channel level test beyond a boolean, the server-wide OOC mute, the per-account storage and the donor's timer objects. The bypass uses `Number.MAX_SAFE_INTEGER` where the donor sets 10000; both mean "never refused".

```ts
// Licence: GPL-3.0 (donor, EQEmu). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Shape only: a per-interval chat budget whose allowance grows with earned trust (karma), with a kick above an absolute count.
export interface BudgetRules {
  minPerInterval: number;   // data: floor allowance (donor MinimumMessagesPerInterval 4)
  maxPerInterval: number;   // data: ceiling allowance (donor MaximumMessagesPerInterval 12)
  kickAfter: number;        // data: attempts in one interval before a disconnect (donor MaxMessagesBeforeKick 20)
  intervalMs: number;       // data: interval length (donor IntervalDurationMS 60000)
  karmaEveryMs: number;     // data: active time that earns one karma point (donor KarmaUpdateIntervalMS 1200000)
  karmaGlobalGate: number;  // data: karma needed to speak in global channels below the level limit (donor 72)
}

export interface BudgetState {
  intervalStartMs: number;
  attempts: number;         // every attempt counts, including refused ones
  karma: number;
  lastKarmaMs: number;
}

export type Verdict = 'send' | 'rate-limited' | 'kick';

// Karma accrues at most one point per check, and only while the player was active (fix: donor accrues on connected time alone).
export function tickKarma(st: BudgetState, r: BudgetRules, nowMs: number, active: boolean): BudgetState {
  if (!active || nowMs - st.lastKarmaMs < r.karmaEveryMs) {
    return st;
  }
  return { ...st, karma: st.karma + 1, lastKarmaMs: nowMs };
}

export function chatAttempt(
  st: BudgetState, r: BudgetRules, nowMs: number, bypass: boolean
): { verdict: Verdict; state: BudgetState } {
  let s = st;
  if (nowMs - s.intervalStartMs >= r.intervalMs) {
    s = { ...s, intervalStartMs: nowMs, attempts: 0 };
  }

  const allowed = bypass
    ? Number.MAX_SAFE_INTEGER
    : Math.min(r.minPerInterval + s.karma, r.maxPerInterval);

  s = { ...s, attempts: s.attempts + 1 };

  if (s.attempts > allowed) {
    return { verdict: s.attempts > r.kickAfter ? 'kick' : 'rate-limited', state: s };
  }
  return { verdict: 'send', state: s };
}

export function canSpeakGlobal(st: BudgetState, r: BudgetRules, levelOk: boolean): boolean {
  return st.karma >= r.karmaGlobalGate || levelOk;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/ct001-eqemu-chat-budget.ts`).

## 5. Lands in

- TARGET `origins/server/chat-budget.ts` (new). One budget for all chat channels, checked at server intake before delivery through the writer. Parity-checklist row 5 (controls and input; intake sub-line). Not src/fight.
- Karma is a per-account trust row written through the writer (one ledger), read by the budget. It is not stored in the client.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only).
- Brief rule served: server-verified (the budget and the trust counter live on the server) and one ledger (one trust row and one budget, not one per channel server).

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism.
- Karma farming. The award fires on client processing time with no activity check (`client_process.cpp` 257-260). An idle client that stays connected earns trust. Fix: accrue only in active periods (the sketch's `active` flag). Whether the timer pauses offline was not read.
- Two budgets. The zone path and the UCS path each keep their own limiter (`client.cpp` 1263-1294; `ucs/clientlist.cpp` 1351-1375), with different scopes. Frankendom needs one budget (fix: one writer-side budget for all channels).
- Refused attempts count toward the kick (`client.cpp` 1284-1287). A player who keeps trying is disconnected inside one interval. This is deliberate; keep it, but the acceptance test must pin it.
- Karma is per account (`database.UpdateKarma(AccountID(), ...)`, `client_process.cpp` 260). Trust carries across characters on one account; that is intended for anti-alt, but it also means a new character starts with the account's trust.
- Global OOC mute is one server flag with no duration (`set_ooc_mute.cpp` 36; `client.cpp` 1436). Frankendom mute tiers and durations belong in the ledger (see the TrinityCore note).
- The UCS ignore list is stored as friends rows with type 0 (ignore) and type 1 (buddy) (`ucs/clientlist.cpp` 444-449, 409-413; `ucs/database.cpp` 666). The delivery check that applies it was not found by grep; do not copy the list without the check.
