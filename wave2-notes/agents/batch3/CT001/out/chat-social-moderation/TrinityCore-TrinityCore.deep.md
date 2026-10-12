# TrinityCore-TrinityCore (chat-social-moderation, cell 2)

Donor: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Player/Player.cpp` | Licence: GPL-2.0-or-later (`COPYING`: "Version 2, June 1991"; source headers: "either version 2 of the License, or (at your option) any later version"; copyleft, clean-room, shape only) | C++ | symbol `Player::UpdateSpeakTime`

Checked: Read in full: `Player::UpdateSpeakTime` (Player.cpp 21720-21770) and the `ChatFloodThrottle` struct (Player.h 2628-2646). Read in full: `WorldSession::HandleChatMessage` from its start (ChatHandler.cpp 145) through the gate block (196-245), with the delivery switch read in part. Read: `CanSpeak` (WorldSession.cpp 782-787), mute expiry in `Player::Update` (Player.cpp 940-950), the complaint handlers (TicketHandler.cpp 60-135), `SocialMgr.cpp` 40-62 and 206-208. Read only the delivery line for channels (Channel.cpp 976; the enclosing function was not read). Config read: World.cpp 796-800, worldserver.conf.dist 2077-2111. Confidence: high on the gate (read end to end; numbers from config and code); medium on the command-ordering claim (read in the function; the command handler was not read). Not run. Camera scope: not applicable.

Best transferable idea: A chat flood gate counts messages in a chain of short gaps and turns a burst into a timed mute, never shortens an existing mute, and resets its counter on each trip.
Decision (proposed): adapt — keep the gap-chain counter and the never-shorten mute; use milliseconds; refuse the tripping line; count only validated text; keep the mute as a server row written through the writer, not session state.
Acceptance: A server test sends 10 lines 0.5 s apart: the 10th is refused with a mute notice; lines during the mute are refused and not counted; a line 10 s after the trip is delivered; a staff account with the skip permission is never muted.

## 1. Mechanism

- Entry. `HandleChatMessage` resolves the language, then checks the mute (ChatHandler.cpp 211). A muted line is refused with the time left (211-215) and is not counted.
- Exclusions. Away and do-not-disturb messages skip the counter (218).
- Counter. `UpdateSpeakTime(REGULAR)` (219) returns at once for a staff account with the chat-spam skip permission (Player.cpp 21727). It reads the REGULAR limit and gap from config (21735-21736). The clock is game time in whole seconds (21746). The ADDON channel has its own pair of keys and state (21738-21740).
- Inside the gap. If the previous line's window is still open (`Time > now`, 21747), the counter goes up by one (21752). When it reaches the limit (21753), the mute is set to now plus the mute length (21756), but only if that is later than the mute already set (21757-21758), and the counter resets to 0 (21760).
- Outside the gap. The counter restarts at 1 (21764) and the limit is not tested on this branch. So the first line of a burst is never a trip; with a limit of 1, the second line inside the gap trips (reading).
- Window end. Every counted line moves the window end to now plus the gap (21766), whether it tripped or not. So a run of lines each less than one gap apart stays in one burst.
- After the counter. Back in `HandleChatMessage`: the GM-silence aura check (221), the length check of more than 511 bytes (227), the empty check, then command parsing (233), character validation and hyperlink checks (237-242), then the delivery switch. Nothing after the counter reads the new mute, so the line that trips the limit is delivered (reading; not run).
- Expiry. `Player::Update` clears an expired mute and writes the login database (945-950). The trip itself writes nothing; only the expiry branch does.

## 2. Key functions

- `Player::UpdateSpeakTime`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Player/Player.cpp` 21724-21768. The whole gate.
- `WorldSession::HandleChatMessage`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Handlers/ChatHandler.cpp` 145-245. Mute check at 211, counter at 219, then the checks that follow.
- `WorldSession::CanSpeak`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Server/WorldSession.cpp` 782-787. Mute end compared with game time.
- Mute expiry: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Player/Player.cpp` 945-950.
- Social list limit: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Player/SocialMgr.cpp` 44-48 (limit test at 47); ignore test at 206-208.
- Complaint entry points: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Handlers/TicketHandler.cpp` 68-82 (live path) and 98-106 (a stub that replies only).

## 3. Numbers vs mechanism

| Item | Donor value | Where |
|---|---|---|
| Burst size before a mute | 10 counted lines (`ChatFlood.MessageCount`) | `World.cpp` 796; `worldserver.conf.dist` 2082 |
| Gap that keeps a burst open | 1 s, whole-second clock | `World.cpp` 797; `Player.cpp` 21746-21747, 21766 |
| Mute after a trip | 10 s (`ChatFlood.MuteTime`); never shortened by a later trip | `World.cpp` 800; `worldserver.conf.dist` 2111; `Player.cpp` 21756-21758 |
| Addon messages | own counter, 100 lines, 1 s gap | `World.cpp` 798; `Player.cpp` 21738 |
| Exemption | staff with `RBAC_PERM_SKIP_CHECK_CHAT_SPAM` | `Player.cpp` 21727 |
| Not counted | away and do-not-disturb lines | `ChatHandler.cpp` 218 |
| Max line length | 511 bytes (`msg.size() > 511`) | `ChatHandler.cpp` 227 |
| Friend list / ignore list | 50 each, one shared flag map | `SocialMgr.h` 100-101; `SocialMgr.cpp` 47 |

Worked numbers from the defaults: 10 lines each under 1 s after the last one trip the gate; the tenth is delivered, and the player is muted for 10 s from that tenth line.

## 4. TypeScript sketch

simplified: keeps the gap-chain count, the never-shorten mute and the reset on trip. It reorders on purpose: the mute check comes first (as in the donor), then validation, then the count (the donor counts before length and command checks). It refuses the line that trips the limit (the donor delivers it). It uses milliseconds (the donor uses whole seconds). It omits the addon counter, the away and do-not-disturb exclusion, the GM silence aura, command parsing, the database write on expiry, and the expiry cleanup in Update.

```ts
// Licence: GPL-2.0-or-later (donor, TrinityCore). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Shape only: a gap-counting chat flood gate that turns a burst into a timed mute, and never shortens an existing mute.
export interface FloodConfig {
  messageCount: number;   // data: messages in one burst before a mute (donor ChatFlood.MessageCount 10)
  messageDelayMs: number; // data: a gap longer than this starts a new burst (donor 1 s)
  muteMs: number;         // data: mute length after a trip (donor ChatFlood.MuteTime 10 s)
}

export interface FloodState {
  windowUntilMs: number;  // the burst stays open until this time
  count: number;          // messages counted in the open burst
  muteUntilMs: number;    // 0 when not muted
}

export type GateResult =
  | { ok: true; state: FloodState }
  | { ok: false; reason: 'muted' | 'flood-trip' | 'invalid'; state: FloodState };

// Order: mute check first (a muted message is not counted), then validation (fix: an invalid line is not counted),
// then the burst count. The message that trips the limit is refused (fix: donor delivers it).
export function speakGate(
  st: FloodState, cfg: FloodConfig, nowMs: number, exempt: boolean, valid: boolean
): GateResult {
  if (exempt) {
    return { ok: true, state: st };
  }
  if (st.muteUntilMs > nowMs) {
    return { ok: false, reason: 'muted', state: st };
  }
  if (!valid) {
    return { ok: false, reason: 'invalid', state: st };
  }
  if (cfg.messageCount <= 0) {
    return { ok: true, state: st };
  }

  let count = 1;
  let muteUntilMs = st.muteUntilMs;
  if (st.windowUntilMs > nowMs) {
    count = st.count + 1;
    if (count >= cfg.messageCount) {
      muteUntilMs = Math.max(muteUntilMs, nowMs + cfg.muteMs);
      const tripped: FloodState = { windowUntilMs: nowMs + cfg.messageDelayMs, count: 0, muteUntilMs };
      return { ok: false, reason: 'flood-trip', state: tripped };
    }
  }
  return { ok: true, state: { windowUntilMs: nowMs + cfg.messageDelayMs, count, muteUntilMs } };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/ct001-trinity-chat-flood-gate.ts`).

## 5. Lands in

- TARGET `origins/server/chat-flood.ts` (new). A server intake gate for chat lines, run before delivery through the writer. Parity-checklist row 5 (controls and input; the intake sub-line). Not src/fight: chat is outside the duel.
- Mutes are server rows (one ledger), read by the gate. No session-only state, so a restart cannot quietly drop an active mute.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only).
- Brief rule served: server-verified (the gate and the mute live on the server) and one ledger (the mute is a row written through the writer).

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism.
- Whole-second clock. The gap test uses integer seconds, so a burst can break or join at a second boundary. Fix: milliseconds (sketch).
- The tripping line is delivered (`ChatHandler.cpp` 219, then the delivery switch after 233). Fix: refuse the tripping line (sketch).
- Counting before validation: an over-long or empty line still counts (`ChatHandler.cpp` 219 before 227-231). Fix: validate first (sketch).
- Trips are not written at the trip. `UpdateSpeakTime` makes no database call; only the expiry branch does (`Player.cpp` 945-950). Whether the session saves an active mute on logout was not read, so a restart may or may not keep it. Fix: the mute is a writer row written at the trip.
- Commands count toward the burst, because counting precedes command parsing (`ChatHandler.cpp` 219 before 233). Frankendom must decide; the sketch does not cover commands.
- Staff bypass is a silent permission (`Player.cpp` 21727). Frankendom needs the bypass explicit and logged.
- The complaint path takes the chat log from the client (`TicketHandler.cpp` 76). That is not server-verified. Fix: the server keeps the window (see the ModernUO note).
- `HandleComplaint` is a stub: it sends a result and nothing else (`TicketHandler.cpp` 98-106). Its comment (99) says the client auto-ignores the spammer; the server does not add an ignore in that handler (reading). Do not copy the stub.
- Ignore is by character or by account (`SocialMgr.cpp` 208). Keep the account match: it stops ignore from being dodged on an alt. Friends and ignore share one flag map with a 50 limit each (`SocialMgr.cpp` 47).


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
Errors: Verified: UpdateSpeakTime 21724-21767 (staff skip 21727, window test 21747, count>=limit 21753, never-shorten mute 21756-21758, reset 21760, count=1 else branch 21764, window end 21766), HandleChatMessage order (mute 211, AFK/DND skip 218, counter 219, GM silence 221, 511 at 227, commands 233, validate 237-242), defaults 10/1/10/100 (World.cpp 796-800, conf.dist 2082/2111), CanSpeak 785, expiry 945-950, friend/ignore limit 50u (SocialMgr.h 100-101), ignore by account 208, HandleComplaint stub 98-106, ChatLog from packet 76. Acceptance (10 lines 0.5s apart, 10th refused, 10s after trip delivered) is satisfied by the sketch.
Missed: none
