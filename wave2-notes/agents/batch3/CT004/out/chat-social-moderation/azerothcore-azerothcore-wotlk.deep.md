# azerothcore-azerothcore-wotlk (chat-social-moderation, cell 2)

Donor: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Entities/Player/PlayerMisc.cpp` (with Handlers/ChatHandler.cpp, Entities/Player/Player.cpp, Globals/ObjectMgr.cpp, Chat/Channels/Channel.cpp, Handlers/MiscHandler.cpp, World/WorldConfig.cpp, Server/WorldSocket.cpp, scripts/Commands/cs_misc.cpp) | Licence: GNU GPL v2 (LICENSE lines 1-2: "GNU GENERAL PUBLIC LICENSE" / "Version 2, June 1991"; file headers "either version 2 of the License") | C++ | symbol `Player::UpdateSpeakTime`

Checked: Read in full: Player::UpdateSpeakTime and CanSpeak (PlayerMisc.cpp 31-74), ChatFloodThrottle struct (Player.h 2362-2372), WorldSession::HandleMessagechatOpcode (ChatHandler.cpp 61-330, the flood call at 248-249, length cap 292, mute gate 310), text emote path (714-736), whisper and say filter (Player.cpp 9581-9591, 9690-9722), chat_filter load and match (ObjectMgr.cpp 9140-9205), GM mute command (cs_misc.cpp 2900-2960, unmute zeroing 3032), login mute load (WorldSocket.cpp 665-674), session field (WorldSession.h 643), mute expiry (PlayerUpdates.cpp 124-126), spam report (MiscHandler.cpp 1141-1166), config defaults (WorldConfig.cpp 200-203, 346-352; worldserver.conf.dist 4355-4490, 608-613), channel ban and Say (Channel.cpp 97-100, 316-460, 770-809, Channel.h 27), social limits (SocialMgr.h 97-98, SocialMgr.cpp 44), battleground announce throttle (BattlegroundSpamProtect.cpp 27-107). Confidence: high that the flood code was read line by line; the checker found it was misread, see the defect in section 6: the REGULAR case in UpdateSpeakTime falls through to `return`, so the donor's flood gate never counts or arms a mute. High for the mute storage and CanSpeak. Medium for the filter (match semantics read in code, not run). Not read: ParseCommands (whether commands check the mute), the Aho-Corasick library, chat_log.cpp, guild and group ignore call sites beyond the grep lines, the caller of the battleground announcer, the BG queue cooldown config value. camera_scope: not a camera cell.

Best transferable idea (intended by the donor, but dead in this tree, see section 6): count every chat attempt in a sliding window, arm a timed mute on the Nth attempt in a run, and check the mute after counting, so a burst mutes the burster and never a slow talker.
Decision (proposed): adapt - the donor demonstrates the intended mechanism (config keys, counter shape, mute field, gate order) but its own flood gate is dead code (PlayerMisc.cpp 44-49: REGULAR case reaches `[[fallthrough]]` into `default: return;`). Keep the idea and fix the defect: take the count-then-arm flood gate and its three data fields (count, window, mute seconds); store the mute per character as a wall-clock expiry instead of per account (donor WorldSession.h:643).
Acceptance: a server test sends 10 chat lines 0.5 s apart; the 10th is refused with a wait notice showing the remaining seconds; a line sent 11 s after the trip is accepted; 10 lines sent 1.5 s apart never trip the gate.

## 1. Mechanism

The gate is a per-session counter with a sliding window, and a timed mute stored on the session. Nothing is persisted per message.

Order of steps for a normal (non-addon) chat message, as the code runs in HandleMessagechatOpcode (ChatHandler.cpp 61-330):

(a) Type and language checks, then the language branch (186-246). The flood counter is at 248-249 and runs for every non-addon typed message except AFK and DND, using the REGULAR bucket. The ADDON bucket is selected by a ternary that sits inside the non-addon branch, so it is never chosen from this handler (see section 6).

(b) Flood counting, Player::UpdateSpeakTime (PlayerMisc.cpp 31-69):
- A GM with RBAC_PERM_SKIP_CHECK_CHAT_SPAM returns at once (34-35).
- Limit and delay come from config for the REGULAR bucket (45-47, WorldConfig.cpp 346-347). DONOR DEFECT: the REGULAR case has no `break`; `[[fallthrough]]` (48) runs into `default: return;` (49), so UpdateSpeakTime returns before any counting for REGULAR. Only the ADDON case (40-43, ends in `break`) reaches the counting code below, and section 6 shows ADDON is never selected from the chat handler. So in this tree the steps below never run and no flood mute is ever armed. What follows is the code as written for the intended path; the sketch implements it with the missing break fixed.
- If the window is open (Time > now), Count += 1; otherwise Count = 1 (52-66).
- If Count >= limit (55): new mute = now + MuteTime (58), and m_muteTime is raised to it only if that is later (59-60). Count is reset to 0 (62).
- The window is then re-armed at now + delay (68). Every message moves the window forward, so a steady stream never closes it.

(c) Validation, after counting: a message longer than 255 bytes, or one containing "|0", is refused (ChatHandler.cpp 292-293). Empty messages are refused (297-298). Commands are parsed (307) before the mute check.

(d) The mute gate: `if (!_player->CanSpeak())` (310) refuses the message and sends LANG_WAIT_BEFORE_SPEAKING with the remaining time (311-313). CanSpeak is `m_muteTime <= now` (PlayerMisc.cpp 71-74). A message that trips the mute is itself refused, because the gate runs after the counter (intended order; with the donor defect the counter never trips, so CanSpeak only ever reflects GM mutes or the first-login mute).

(e) Mute storage. The mute is WorldSession::m_muteTime (WorldSession.h:643), so it is per account, not per character. Login reads a negative stored value as "minutes from now" (WorldSocket.cpp 665-674; the comment says minutes but the code adds seconds, see section 6). Expiry clears the field in the session update (PlayerUpdates.cpp 124-126). A GM mute sets the field and the login row (cs_misc.cpp 2943-2944 online; 2958 offline stores a negative value). Unmute sets it to 0 (cs_misc.cpp 3032).

(f) Text emotes call the same counter and gate (ChatHandler.cpp 731 and 733).

(g) Word filter. ObjectMgr::LoadChatFilter reads the `chat_filter` table into an Aho-Corasick automaton of lower-cased words (ObjectMgr.cpp 9140-9180). IsChatFiltered lower-cases the text and asks whether any word occurs in it, which is a substring match (9193-9204). Config per channel: Whisper on, Say, Yell and Emote off (WorldConfig.cpp 200-203). A filtered say is refused with a notice (Player.cpp 9587-9589). A filtered whisper is not delivered to the target, and the sender gets a CHAT_MSG_FILTERED echo (9697-9712).

(h) Channels. Channel::Say refuses non-members (778-784) and muted members (788-794). Channel bans are keyed by character GUID with an expiry of now + CHANNEL_BAN_DURATION (Channel.cpp 97-100, 422-423; Channel.h 27 `DAY*60`). Bans are written to the DB (AddChannelBanToDB, 423). Offline bans are allowed for same-team characters only (351-367). A non-moderator cannot ban or kick a GM or a constant moderator (391-415). Channel chat is a normal chat type, so it goes through (b) and (d).

(i) Ignore. A player may ignore up to 50 names (SocialMgr.h:98, enforced in SocialMgr.cpp:44). A player who ignores someone cannot be invited to a channel by them (Channel.cpp 856, in Channel::Invite at 811), and a recipient who ignores the sender is skipped when a channel message is delivered (916, in Channel::SendToAll at 913). Ignore also applies to guild chat (Guild.cpp 2183), guild invites (Guild.cpp 1486), group invites (GroupHandler.cpp 130) and arena invites (ArenaTeamHandler.cpp 129). HandleChatIgnoredOpcode (ChatHandler.cpp 789-804) only sends a CHAT_MSG_IGNORED notice to the other player. It stores nothing.

(j) Spam report. HandleComplainOpcode (MiscHandler.cpp 1141-1166) sends the complaint result and, when LogSpamReports is on (worldserver.conf.dist 608-613, default 1), inserts one DB row with the spam type, spammer GUID, message type, channel id, seconds since the message, the client's description, and a timestamp (1151-1164). No check on the spammer or on the message body was seen in this handler.

(k) Battleground announce throttle (BattlegroundSpamProtect.cpp 27-107): one timestamp per player and one per bracket. A player can announce again only after the cooldown (49, 84); the timestamp moves only on success (32, 105, 131). The donor comment says the default is 30 s (48, 68).

## 2. Key functions

- Player::UpdateSpeakTime: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Entities/Player/PlayerMisc.cpp` 31-69.
- Player::CanSpeak: same file, 71-74.
- ChatFloodThrottle (Time, Count): `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Entities/Player/Player.h` 2362-2372.
- WorldSession::HandleMessagechatOpcode: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Handlers/ChatHandler.cpp` 61; flood call 248-249; gate 295-315.
- ObjectMgr::IsChatFiltered: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Globals/ObjectMgr.cpp` 9193-9205.
- HandleComplainOpcode: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Handlers/MiscHandler.cpp` 1141-1166.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants (file:line) |
|---|---|
| Sliding-window message count | 10 messages (WorldConfig.cpp 346); window 1 s (347) |
| Mute length when tripped | 10 s (WorldConfig.cpp 350) |
| Mute never shortened by a later trip | max of current and new (PlayerMisc.cpp 59-60) |
| Addon bucket (declared, see section 6) | 100 messages, 1 s (WorldConfig.cpp 348-349) |
| First-login speech delay | off (351); 120 minutes when on (352); ChatHandler.cpp 148-152 |
| Channel ban length | DAY*60 (Channel.h 27; DAY not read) |
| Ignore list size | 50 (SocialMgr.h 98); friends 50 (97) |
| Chat message length | 255 (ChatHandler.cpp 292) |
| Filter scope | Whisper on, Say/Yell/Emote off (WorldConfig.cpp 200-203) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order: count the attempt first, then arm the mute, then decide. It omits the GM bypass, the addon bucket, the length and "|0" checks, the command parse, the first-login delay, channel membership and bans, the ignore list, the spam report row and the battleground throttle. It changes the mute to a per-character expiry (the donor is per account) and the word check to whole-token matching (the donor is substring). Evasion by spacing or leetspeak is not solved in the sketch.

```ts
// Licence: GPL-2.0 (donor). Clean-room sketch written from the described mechanism (sliding-window flood counter that arms a timed mute, checked after counting), not a translation of the donor lines.
// Frankendom fix: the mute is a per-character expiry timestamp (not per account), the word list matches whole tokens, and the state is bounded (one bucket per character).

interface FloodBucket {
  windowEndMs: number; // the window slides on every message (donor PlayerMisc.cpp:68)
  count: number;
}

interface SpeakState {
  muteUntilMs: number; // 0 = not muted
  regular: FloodBucket;
}

// Data fields (donor WorldConfig.cpp:346-350): count 10, delay 1 s, mute 10 s.
const FLOOD_MESSAGE_COUNT = 10;
const FLOOD_MESSAGE_DELAY_MS = 1000;
const FLOOD_MUTE_MS = 10_000;

// Count every attempt first, then decide (donor ChatHandler.cpp:249 runs before the mute check at :310).
export function onChatAttempt(s: SpeakState, nowMs: number): { allowed: boolean; muteUntilMs: number } {
  const b = s.regular;
  if (b.windowEndMs > nowMs) {
    b.count += 1;
  } else {
    b.count = 1;
  }
  if (b.count >= FLOOD_MESSAGE_COUNT) {
    // Never shorten an existing mute (donor PlayerMisc.cpp:59-60).
    s.muteUntilMs = Math.max(s.muteUntilMs, nowMs + FLOOD_MUTE_MS);
    b.count = 0;
  }
  b.windowEndMs = nowMs + FLOOD_MESSAGE_DELAY_MS;
  return { allowed: s.muteUntilMs <= nowMs, muteUntilMs: s.muteUntilMs };
}

// Whole-token blocklist (donor ObjectMgr.cpp:9204 is a substring match, so "ass" hits "class").
// Fix: token match on lower-cased words. Evasion (spacing, leetspeak) is NOT solved here.
export function containsBlockedToken(text: string, blocked: ReadonlySet<string>): boolean {
  const tokens = text.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 0);
  return tokens.some((t) => blocked.has(t));
}

export {};
```

## 5. Lands in

- TARGET `origins/server/chat-gate.ts` (new module, shared with the rAthena note): flood counter and speech gate on the server intake, per-character mute expiry, token blocklist. Parity-checklist row 5 (controls/input, intake). The checklist has no chat or social row (see ruling 3 in the rAthena note).
- today: not checked (no Frankendom chat code was opened for this pass).
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
- Brief rule served: rule 8 (target and parity row named); CT ruling 2026-10-12 (channels, filter as a write-time or intake rule, mute tiers, spam limits); one character and one ledger.

## 6. Gaps and risks

- DONOR DEFECT, flood gate is dead (PlayerMisc.cpp 44-49): the REGULAR case sets limit and delay, then `[[fallthrough]]` into `default: return;`, a missing `break`. Neither caller (ChatHandler.cpp 249 and 731) can therefore ever count or arm a mute for regular chat; the ADDON branch that would work is unreachable (next bullet). Net: the donor shows the intended design, not a working one. Fix in the sketch: one bucket path with an explicit break, and a test that the 10th line in a second really trips (the acceptance test).
- Addon-language messages skip both the counter and the gate. The counter is at 248-249, inside the non-addon `else` (211-250). The addon branch (186-210) never calls UpdateSpeakTime, and the gate at 310 is inside the non-addon `else` of 305-316 too. So the ADDON bucket (PlayerMisc.cpp 40-43) is unreachable from this handler, and ChatFlood.AddonMessageCount has no effect here. Whether addon sends can carry player text into a visible channel was not read. Fix: count and gate every message type that a player can send, and do not special-case a language.
- Count before validation. A message over 255 bytes or with "|0" is counted before it is refused (248-249 before 292-293). This is a deliberate spam guard. Keep it, and say so in the test.
- Commands before the gate. ParseCommands runs at 307, before CanSpeak at 310. Whether ParseCommands checks the mute was not read. Frankendom: put the gate before any player-facing command dispatch.
- AFK and DND skip the counter and the gate (248 and 295). Not tested as an exploit. Frankendom has no AFK or DND type, so do not copy the exemption.
- Per-account mute. WorldSession.h:643 and cs_misc.cpp 2943-2944 store the mute on the account, so every character on the account is muted. Conflicts with one character, one ledger. Fix: per-character expiry.
- Substring filter. ObjectMgr.cpp 9204 is a substring match, so a blocked word inside a longer word matches (the donor's own config comment says "substring match", worldserver.conf.dist 4475-4477). Fix: token match (in the sketch). Evasion is not handled by the donor (no normalisation in 9174 or 9202).
- Spam report stores no message. MiscHandler.cpp 1161 stores the client's Description and SecondsSinceMessage, not the message text, and no spammer or message check was seen (1141-1164). Fix: keep a short server-side message ring per speaker and attach the message to the report row; dedupe reports per reporter per target.
- Auto-ignore is client behaviour. The comment at MiscHandler.cpp 1145 says the spammer is auto-ignored until logout, but the handler does not add an ignore entry. CharacterHandler.cpp 831 advertises COMPLAINT_ENABLED_WITH_AUTO_IGNORE, so the client does it. Client code not read.
- Mute length unit mismatch. WorldSocket.cpp 665 says "minutes", but the code adds the stored value as seconds (668), and cs_misc.cpp 2918 and 2958 produce seconds. Fix: one unit in the schema, named in the field.
- First-login delay comment. ChatHandler.cpp 128 says chatting "requires 2 hours played", but the default is off (WorldConfig.cpp 351). The comment states a rule the shipped default does not enable.
- Channel ban is 60 days by constant (Channel.h 27), not by data, and the ban is only for channel membership (422-423).
- GPL-2.0: clean-room only.

Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
Brief rule served: rule 8 (target and parity row named); CT ruling 2026-10-12 (channels, spam limits, mutes; the display-name blocklist stays a write-time rule per the ruling, and this chat filter is a runtime rule).

As-data shape (PASS2 1):
- Donor data is config keys plus one table. Config: ChatFlood.MessageCount, ChatFlood.MessageDelay, ChatFlood.AddonMessageCount, ChatFlood.AddonMessageDelay, ChatFlood.MuteTime (WorldConfig.cpp 346-350), Chat.MuteFirstLogin and Chat.MuteTimeFirstLogin (351-352), ChatFilter.Whisper/Say/Yell/Emote (200-203). Table: `chat_filter(ID, Word)` (CharacterDatabase.cpp 625-628).
- Row fields as the donor would express them: `chat_filter.word: string (lower-cased on load)`; `session.muteUntil: time (per account)`; `flood bucket: {windowEnd, count}` per session and type.
- A new filter word is one row: yes (chat_filter table; reload with `.reload chat_filter`, cs_reload.cpp 149).
- A new flood tier per channel is one row: no. One counter per message type, one global set of config keys (WorldConfig.cpp 346-350).

Provenance per claim: every receipt in receipts.tsv names the donor file and line. Licence GPL-2.0 (LICENSE lines 1-2), copyleft, so shape only.

What they patched later: no history available (no .git directory in /mnt/frankendom-donors/azerothcore-azerothcore-wotlk). Hidden rules in comments: "pussywizard" tags (ChatHandler.cpp 128; Channel.cpp 336, offline ban); the spam-report NOTE (MiscHandler.cpp 1145); the WorldSocket "minutes" comment (665); the ChatFlood explanations in worldserver.conf.dist 4355-4390.

Rulings for Dom:
1. Should a new character face a short public-chat delay (AzerothCore's first-login mute: off by default, 120 minutes when on)? Recommend: yes, 30 minutes for zone and world chat only; party, guild and whisper open at once.
2. Should a filtered whisper be silently dropped for the receiver while the sender sees a "filtered" notice (donor behaviour)? Recommend: yes, same as donor, so a spammer cannot tell which word hit.
3. Should the spam report keep the message text server-side for 10 minutes so a moderator can see it? Recommend: yes, a per-speaker ring of the last 20 messages, attached to the report row.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: WRONG.
- Main claim false: UpdateSpeakTime REGULAR case falls through to `default: return;` (PlayerMisc.cpp 44-49), so the flood counter never counts or arms a mute; the whole donor flood gate is dead code (confirmed on the VPS).
- Confidence line "high, every line opened" was not supported; corrected.
- Other claims held (flood call 249, length 255, CanSpeak gate after ParseCommands, config defaults, filter substring, channel ban DAY*60, per-account m_muteTime).
- Checker also said HandleComplainOpcode calls UpdateSpeakTime; not confirmed (grep shows only ChatHandler.cpp 249 and 731), so not added.

Fixed 2026-10-12: Confidence line, best-idea line, Decision, step (b) and (d), and section 6 now state the dead-gate donor defect (missing break) while keeping the count-then-arm idea; sketch unchanged in logic (it already implements the intended path), comment added in work/ file.
