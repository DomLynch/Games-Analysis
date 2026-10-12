# 2004Scape-Server (chat-social-moderation, cell 1)

Donor: `/mnt/frankendom-donors/2004Scape-Server/src/network/game/client/handler/MessagePublicHandler.ts` (with `MessagePrivateHandler.ts`, `ReportAbuseHandler.ts`, `src/server/friend/FriendServer.ts`, `src/server/friend/FriendServerRepository.ts`, `src/engine/World.ts`) | Licence: MIT License, Copyright (c) 2023-2025 Lost City (LICENSE file, first lines read; code may be adapted) | TS | symbol `MessagePublicHandler.handle`

Checked: Read in full: `MessagePublicHandler.handle` (12-45), `MessagePrivateHandler.handle` (11-36), `ReportAbuseHandler.handle` (10-29), `FriendServerRepository.isVisibleTo` (332-355), `addFriend` and `addIgnore` caps (226-270), `WordPack.pack` and `WordPack.unpack`, `WordEnc.filter` (73-95), the friend-server PM branch (260-290) and `sendPrivateMessage` (508-525), `World.sendPrivateMessage` (1669-1681), `World.notifyPlayerMute` and `notifyPlayerReport` (2294-2323). Not read: the friend-server handler branches outside those lines, the logger thread's report storage, the client-side ignore filtering (not read, so what the client does with an ignore list is unknown), the wordenc data tables and the fragment, domain and TLD matchers, and `WordEncBadWords.ts` past line 120. Confidence: high for the per-tick social gate, the visibility rule and the list caps; medium for the profanity side, which is scoped out of the sketch. Scope of this note: the chat and social gate, not the whole profanity matcher.

Best transferable idea: Gate each player to one chat or social action per server tick, clear the gate in the per-player reset, and set the flag only after the message is accepted so refused attempts do not use the slot.

Decision (proposed): adapt — keep the per-tick social gate, the friend and ignore visibility modes and the 100 caps; fix the missing ignore check on private messages, enforce public chat modes on the server, and route private-message writes through the writer instead of a direct DB insert (the donor writes `private_chat` straight from the friend server, FriendServer.ts 278-288).
Acceptance: A server test sends two chat lines from one player inside one 600 ms tick and asserts that only the first is delivered; a muted sender is refused and its tick slot is not used; a private message to a player who ignores the sender is not delivered and the sender is not told why (policy choice, not donor behaviour).

## 1. Mechanism

- One social action per player per tick. Public chat, private chat, friend add and remove, and ignore add and remove each check `socialProtect` first and set it to `true` on success (MessagePublicHandler.ts 15 and 43; MessagePrivateHandler.ts 14 and 34; IgnoreListAddHandler and friend handlers set it too, per grep, not read line by line). The flag is cleared in the per-player reset `Player.ts` 466 (`this.socialProtect = false;`). The reset runs once per tick: `cycle()` schedules `nextTick = now + TICKRATE` (World.ts 362, TICKRATE 600 at line 120), calls `processCleanup()` (444), which calls `player.resetEntity(false)` (1158).
- Order inside `MessagePublicHandler.handle`: (a) the tick gate and the colour, effect and input-length checks (15); (b) the mute check (19), which returns before the flag is set, so a muted attempt does not use the slot; (c) unpack and filter (`WordEnc.filter`, line 36); (d) pack and set `CHAT` mask; (e) set `socialProtect = true` (43). The private handler is the same shape without the colour fields.
- Length: input over 100 characters is refused (MessagePublicHandler 15, MessagePrivateHandler 14). Outgoing text packed by `WordPack.pack` is clamped to 80 characters (WordPack.ts 44-45).
- Private message path: the friend server first inserts the row into `private_chat` (FriendServer.ts 278-288), then forwards to the target's world socket (290; send at 508-525). The send path looks up only the target's world (509). Read of 260-290 and 508-525: no ignore check and no privacy-mode check in this path.
- Online-status visibility (FriendServerRepository.ts 332-355): staff viewers always see the player; an ignore by the other player hides the viewer (340-342); private chat OFF hides (346-347); FRIENDS shows only to the other player's friends (350-351); ON shows to all. Default when no mode is stored is OFF (344).
- Caps: `addFriend` refuses at 100 entries (233); `addIgnore` refuses at 100 (268). A TODO at 152 says the friend-list read is not capped there.
- Reports: a reason outside the enum range (0 to 11; ReportAbuse.ts 5 and 16) gets an automated 2-day ban (ReportAbuseHandler 15-16). A staff reporter on production with a moderator-mute flag puts a 2-day mute on the offender (20-22). Every accepted report is passed to `World.notifyPlayerReport` (25), which for MACROING and BUG_ABUSE sets `submitInput = true` on the offender (World.ts 2309-2313), then posted to the logger thread (2316). LoggerThread.ts 62 hands it to the logger client; that client's storage is (not read).
- Mutes: staff command `::mute <name> <minutes>` (ClientCheatHandler.ts 560, production only). Minutes default to 60 and are clamped at 0 (569). The mute is set in memory on this node (World.ts 2297) and written to the account row (LoginServer.ts 560). The code has `// todo: audit log` (LoginServer.ts 555).
- Profanity: outgoing public text is run through `WordEnc.filter` (MessagePublicHandler 36). The filter lowercases, runs the TLD, bad-word, domain and fragment matchers, restores a whitelist of harmless words (`cook`, `cooks`, `seeks`, `sheet`; WordEnc.ts 35), and rebuilds case. In the bad-word matcher, two passes run (WordEncBadWords.ts 15), and a span is masked with `*` only when its numerals do not outnumber its letters (107-108; mask at WordEnc.ts 132). This matcher is read only in part, so no more is claimed about it.
- Tick: the cycle is a fixed 600 ms step; the next tick is scheduled from `Date.now() + TICKRATE` (World.ts 362). Drift is measured at the top of `cycle()` (372) (not read past that line).

## 2. Key functions

- `MessagePublicHandler.handle`: `/mnt/frankendom-donors/2004Scape-Server/src/network/game/client/handler/MessagePublicHandler.ts` 12-45. Gate, mute, filter, set flag.
- `MessagePrivateHandler.handle`: `/mnt/frankendom-donors/2004Scape-Server/src/network/game/client/handler/MessagePrivateHandler.ts` 11-36. Same gate; invalid username bans for 2 days (24).
- `ReportAbuseHandler.handle`: `/mnt/frankendom-donors/2004Scape-Server/src/network/game/client/handler/ReportAbuseHandler.ts` 10-29. Reason range check, moderator mute, report routing.
- `FriendServer` PM branch and `sendPrivateMessage`: `/mnt/frankendom-donors/2004Scape-Server/src/server/friend/FriendServer.ts` 260-290 and 508-525.
- `isVisibleTo`: `/mnt/frankendom-donors/2004Scape-Server/src/server/friend/FriendServerRepository.ts` 332-355. The one visibility rule.
- `addFriend` and `addIgnore` caps: `/mnt/frankendom-donors/2004Scape-Server/src/server/friend/FriendServerRepository.ts` 231-234 and 266-270.
- `World.notifyPlayerMute` and `notifyPlayerReport`: `/mnt/frankendom-donors/2004Scape-Server/src/engine/World.ts` 2294-2323.

## 3. Numbers vs mechanism

| Reusable rule | Donor constant (where) |
|---|---|
| One social action per tick, flag cleared per tick | 1 per tick (MessagePublicHandler.ts 15; Player.ts 466) |
| Server tick | 600 ms (World.ts 120) |
| Input cap | 100 characters (MessagePublicHandler.ts 15; MessagePrivateHandler.ts 14) |
| Output clamp | 80 characters (WordPack.ts 44-45) |
| Friend list cap | 100 entries (FriendServerRepository.ts 233) |
| Ignore list cap | 100 entries (FriendServerRepository.ts 268) |
| Report auto-ban (bad reason) | 172800000 ms = 2 days (ReportAbuseHandler.ts 16) |
| Moderator report mute | 172800000 ms = 2 days (ReportAbuseHandler.ts 22) |
| Staff mute default | 60 minutes (ClientCheatHandler.ts 569) |
| Private chat modes | ON 0, FRIENDS 1, OFF 2 (ChatModes.ts 8-12) |
| Public chat modes | ON 0, FRIENDS 1, OFF 2, HIDE 3 (ChatModes.ts 1-6); stored but not enforced server-side (ChatSetModeHandler.ts 8 is the only write found by grep) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for a chat line (tick gate, then length, then mute, and the slot is taken only on success), the end-of-tick reset, and the visibility rule. It adds the two fixes (ignore and OFF checked before a private message is forwarded) and the capped list add. It omits the profanity filter, the DB write of the private message, the staff flag source (passed in as a boolean), the public-mode fan-out (the donor does not enforce it, so none is copied), the report path and the logger. Constants are as in the donor and are data fields, not tuned values.

```ts
// Licence: MIT (donor 2004Scape-Server, Lost City). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type ChatMode = 'on' | 'friends' | 'off';

interface SocialState {
  muted_until: number | null;      // epoch ms; null = not muted
  socialUsedThisTick: boolean;     // one social action per server tick
  publicChat: ChatMode;
  privateChat: ChatMode;
  friends: Set<string>;
  ignores: Set<string>;
}

const TICK_MS = 600;               // server tick
const MAX_INPUT = 100;             // chars accepted from the client
const MAX_OUTPUT = 80;             // chars kept after the clamp
const LIST_CAP = 100;              // friends and ignores, each

type ChatResult = { ok: true; text: string } | { ok: false; reason: 'rate' | 'length' | 'muted' };

// Gate one public or private chat line. Order: tick gate, length, mute; the slot is taken only on success.
function acceptChat(p: SocialState, raw: string, nowMs: number): ChatResult {
  if (p.socialUsedThisTick) return { ok: false, reason: 'rate' };
  if (raw.length > MAX_INPUT) return { ok: false, reason: 'length' };
  if (p.muted_until !== null && p.muted_until > nowMs) return { ok: false, reason: 'muted' };
  p.socialUsedThisTick = true;
  return { ok: true, text: raw.slice(0, MAX_OUTPUT) };
}

// Called once per tick for every player (donor: per-player reset in the cycle).
function endTick(p: SocialState): void {
  p.socialUsedThisTick = false;
}

// Online-status visibility. Mirrors isVisibleTo: staff see all, an ignore hides, OFF hides, FRIENDS shows to friends only.
function canSeeStatus(viewer: string, other: SocialState, viewerIsStaff: boolean): boolean {
  if (viewerIsStaff) return true;
  if (other.ignores.has(viewer)) return false;
  if (other.privateChat === 'off') return false;
  if (other.privateChat === 'friends') return other.friends.has(viewer);
  return true;
}

// Fix to the donor: its private-message send path checks no ignore list, so ignore and OFF are checked here before forwarding.
function canDeliverPrivate(sender: string, target: SocialState): boolean {
  if (target.ignores.has(sender)) return false;
  return target.privateChat !== 'off';
}

// Capped add to a friend or ignore list (donor: 100 each).
function addCapped(list: Set<string>, name: string): boolean {
  if (list.size >= LIST_CAP) return false;
  list.add(name);
  return true;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/ct003-2004-chat-gate.ts`, exit 0 (TSC_OK).

## 5. Lands in

- TARGET `origins/server/chat-gate.ts` (proposed new module; no Frankendom chat file exists to my knowledge, the Frankendom repo was not read for this pass). The gate sits in the server writer path, so chat goes through the writer and never a direct DB insert.
- Parity-checklist row 5 (controls/input, which is the input-intake rule). No row of the 23 covers chat. Row 5 is the nearest; the server tick sub-line "server tick: fixed step, input intake, per-tick NPC budget" (row 18 / post-K item 3) supplies the 600 ms step only.
- Reuse tag: adapt-idea (MIT, Lost City 2023-2025: code may be adapted; this sketch is clean-room)
- Brief rule served: Strategy CT rulings (chat through the writer, never direct DB; display-name filter is write-time; report path with a reason row; spam limits), and the addendum rule to keep the idea and fix the defect.

## 6. Gaps and risks

- No parity row covers chat, so this lands on row 5 by proxy. Strategy should rule whether chat needs its own row.
- Defect, fix: the private-message send path checks no ignore list (FriendServer.ts 508-509, read in full). Fix: the sketch checks ignore and OFF before forwarding (`canDeliverPrivate`).
- Defect, fix: public chat mode is stored (ChatSetModeHandler.ts 8) but grep finds no server reader, so it is not enforced on the server. Fix: enforce the mode at fan-out in the writer and test it. Whether the client hides public lines itself is (not read).
- Defect, fix: `maskChars(offset, length, chars)` loops `index < length` (WordEnc.ts 131), so the second argument is an end index, not a length. It works when called as the donor does (WordEncBadWords.ts 108) but the name is wrong. Fix: rename the parameter to `end` and add a test.
- Defect, fix: the friend-list read is not capped (FriendServerRepository.ts 152 TODO). Fix: cap the read to the same 100 as the add.
- Defect, fix: mute has no audit row (LoginServer.ts 555 todo). Fix: write an audit row with staff, target, until and reason. Frankendom rules want one ledger, so this is a real gap, not cosmetic.
- Private messages are written straight to a DB table from the friend server (FriendServer.ts 278-288). This conflicts with the Frankendom ruling "chat through the writer, never direct DB". Reject that part; keep the rule.
- Not in the donor: a child-safety default (no age or minor rule found in the parts read), a display-name blocklist at write time (the donor filters outgoing chat text only), channels beyond public, private and trade-duel (no party, guild or zone channel found), emotes as animation rows, and a report review queue (the logger stores it; the review path is (not read)).
- The profanity matcher is read in part (WordEncBadWords.ts 1-120 and the filter entry). The fragment, domain and TLD tables are (not read). Do not port the word lists; they are data and their licence was not checked.
- Client-side ignore handling is (not read), so this note does not claim the donor hides an ignored player's messages in the client.

Reuse tag: adapt-idea (MIT, Lost City 2023-2025: code may be adapted; this sketch is clean-room)
Brief rule served: Strategy CT rulings (chat through the writer; write-time name filter; report path with a reason row; spam limits); addendum rule "keep the idea, fix the defect".


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
Errors: None found. Verified: MessagePublicHandler gate/mute/filter/flag order (15,19,36,43); MessagePrivateHandler 14,18,23-24,34; ReportAbuseHandler 15-16,20-22,25; Player.ts:466 reset; World.ts TICKRATE 120, nextTick 362, drift 372, notifyPlayerMute 2294-2306, notifyPlayerReport 2308-2323 (MACROING/BUG_ABUSE submitInput); FriendServerRepository caps 233/268, TODO 152, isVisibleTo 332-355 incl default OFF 344; FriendServer PM branch 260-290 and sendPrivateMessage 508-525 (no ignore check); ChatModes 1-12; WordPack 44-45 clamp 80; WordEnc whitelist 35, maskChars 130-133 (end-index bug real); WordEncBadWords 15,107-108; ClientCheatHandler 560/569; LoginServer 555 todo; MIT licence. Acceptance (two lines in one tick, muted refused without using slot) passes against sketch acceptChat.
Missed: Private messages are profanity-filtered in the OUTGOING ENCODER (network/game/server/codec/rs225/MessagePrivateEncoder.ts:22 and rs244/MessagePrivateEncoder.ts:21 call WordEnc.filter), while the raw text is stored unfiltered in private_chat (FriendServer.ts:278-288). The note says only public text is filtered and lists nothing for PMs. Also the PM handler does not run the colour/effect checks (stated) and sends before setting the flag, same as public (fine).
