# OpenDAoC-OpenDAoC-Core (chat-social-moderation, cell 3)

Donor: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/commands/AbstractCommandHandler.cs` (with `GameServer/gameobjects/GameLiving.cs`, `GameServer/gameobjects/GamePlayer.cs`, `GameServer/commands/playercommands/whisper.cs`, `GameServer/commands/gmcommands/mute.cs`, `GameServer/commands/playercommands/chatgroup.cs`, `GameServer/commands/playercommands/friend.cs`, `GameServer/Managers/playermanager/FriendsManager.cs`) | Licence: GNU GENERAL PUBLIC LICENSE, Version 3, 29 June 2007 (the LICENSE file says v3; some source headers, e.g. `whisper.cs` 1-18, say "version 2 of the License, or (at your option) any later version"; clean-room, shape only) | C# | symbol `AbstractCommandHandler.IsSpammingCommand` (with `GameLiving.WhisperReceive` and `GameLiving.Whisper`)

Checked: Read in full: `AbstractCommandHandler.cs` 1-50 (the spam gate), `whisper.cs` 21-60 (the command), `GameLiving.cs` 3108-3165 (WhisperReceive and Whisper), `GamePlayer.cs` 7324-7336 (IsIgnoring), 7480-7600 (say, yell, whisper send and receive), 7464-7470 (SayReceive, in part), `AbstractServerRules.cs` 460-468, `mute.cs` 25-95, `report.cs` 33-102, `chatgroup.cs` 14-56 (the /chat send path), `ChatGroup.cs` 56-72, `ClientFilterSettingsHandler.cs` 18-38, `filter.cs` 37-40, `friend.cs` 28-80 and 106-114, `FriendsManager.cs` 103-160 and 225-268. Read by grep and line numbers only: `GamePlayer.cs` 7388 (PrivateMessageReceive guard), 7507, `ChatUtil.cs`, `guildchat.cs` 130, `WorldMgr.cs` constants, `ServerProperties.cs` 241. Not read: `FriendsManagerExtensions.cs` (80 lines, probably where `GamePlayer.AddFriend` lives), the body of `ModifyIgnoreList` and `IgnoreList` (GamePlayer 8057-8101), `ignore.cs`, the chat delivery bodies in `region.cs` and `yell.cs`, the language table, the speech bubble code, the GM ban path, and the friend online notify functions (284-318). Confidence: high for the spam gate, the whisper receive gate and the silent ignore; medium for the mute bypass (grep for `IsMuted` across GameServer shows no reference on the whisper, chat group or private message send paths, and I read those send paths). The clock units: `CurrentRegion.Time` and `GameLoop.GameLoopTime` are used as milliseconds by the 1500 ms and 500 ms constants; the unit of the clocks themselves was not read.

Best transferable idea: Gate each chat command with a per-player, per-command window that is written only when the command is accepted, so a refused attempt cannot extend the wait, and let staff bypass it.

Decision (proposed): adapt — keep the accepted-only command window and the sender-side whisper receive gate; move the mute check into one intake function that every chat path calls (the donor checks mute per command, so whisper, chat groups and private messages skip it); show the sender a refusal message on the receive gate (the donor is silent there); keep the ignore drop on the server and tell the sender success, which gives no oracle.
Acceptance: A server test sends two whispers within 500 ms and asserts one delivery, the second refused with a "slow" reason and the window not reset; a muted player's whisper, group chat line and private message are each refused; a whisper from a sender the target ignores is not delivered and the sender gets the same success reply as a delivered one.

## 1. Mechanism

- Command window (`AbstractCommandHandler.cs` 26-48). Key is the command name plus `"NOSPAM"` in the player's temp properties (31). Staff above the player privilege level pass at once (28). If the stored time is set and `now - stored < delay`, the command is refused (41-43). Otherwise the stored time is set to `now` (46) and the command runs. Because the write (46) is after the refusal (43), a refused attempt does not reset the window. Default delay is `COMMAND_SPAM_DELAY`, documented as 1500 ms (`ServerProperties.cs` 241); the whisper command passes its own 500 ms (`whisper.cs` 39). The whole check is one function, so it is the same gate for every command that calls it.
- Whisper send (`whisper.cs` 31-58): the command window (39, 500 ms, prints "Slow down!" on refusal), then a target check (the player's target object, 45-56), then `client.Player.Whisper(obj, text)` (58). The return value of `Whisper` is not read (no `if` on line 58).
- Whisper send in the player class (`GamePlayer.cs` 7560-7575): a null target gets a message (7562-7566); `IsAllowedToSpeak(this, "whisper")` (7568) is the server-rule check, which in the abstract rules only refuses a dead speaker (`AbstractServerRules.cs` 462-466); then `base.Whisper` (7570); if the target is a player, the sender sees "You whisper, ..." (7573).
- Whisper base (`GameLiving.cs` 3145-3165): refuses if the speaker is silent (`IsSilent`, 3147); refuses outside `WHISPER_DISTANCE` = 512 units (3152; `WorldMgr.cs` 32); then fires the event (3157) and calls the target's `WhisperReceive` (3161).
- Receive gate (`GameLiving.cs` 3108-3137): reads the sender's `WHISPERDELAY` (3119). If it is set and `now - 1500 < stored`, and the sender is a plain player (`PrivLevel == 1`, 3120), the receive is refused (3121-3123) with no message. On pass, the sender's stored time is set to now (3126), so the window is per sender across all targets. Quest notify calls follow (3128-3131), then the living's event (3134) and `return true` (3136).
- Ignore (`GamePlayer.cs` 7539-7552 and 7324-7336): the player override calls the base receive first (7541), then `IsIgnoring(source)` (7543); when it matches, it returns `true` and sends nothing. `IsIgnoring` loops the player's ignore names (7329) and matches `sender.Name` unless the sender's privilege is 2 or more (7331). The sender gets the same success reply as a delivered whisper (7573), so the ignore is not visible to the sender. The same check guards `PrivateMessageReceive` (7388), `SayReceive` (7468) and `YellReceive` (7507).
- Mute (`mute.cs` 25-95; `GameLiving.cs` 467-476; `GamePlayer.cs` 9996): a GM command. Target by name or `#session`. A GM can only mute a player of equal or lower privilege (50-54). `account` or `allchars` sets the account flag and copies it to the player, then saves it (62-65). `remove` clears both (72-75). Without a mode the session flag is toggled (88). The flag lives on the living base (`m_isMuted`, 467). An account mute is copied to the player at entry (9996). The mute is checked in some commands only: `say.cs` 55, `report.cs` 54, `yell.cs` 47, `emote.cs` 56, `guildchat.cs` 130, `trade.cs` 25, `region.cs` 26, `LFG.cs` 25, `advice.cs`, `appeal.cs`, `broadcast.cs`, `emotes.cs`. Not found in `whisper.cs`, `chatgroup.cs`, `GamePlayer.Whisper` or `GameLiving.Whisper` (grep, and the bodies were read).
- Chat groups (`chatgroup.cs` 14-54): the chat command is spam gated (18). A "listen" group lets only moderators speak (27-31). The text is built with the sender name and sent to each member (50-52). No mute check and no ignore check on this path.
- Client chat-type filter (`ClientFilterSettingsHandler.cs` 18-38): the client sends a 16-byte mask over the spell chat types, from `CT_Spell` to `CT_SpellPulse` (21-29), and the server stores which types the client has disabled (26, 28). The donor's own comment says the server then skips sending those types (lines 8-16). This is a per-viewer filter, not a profanity filter.
- No server profanity filter: `filter.cs` 37-40 is an empty command ("do nothing"). A filename search found no bad-word, censor or blocklist class under GameServer or CoreBase.
- Reports: `/report` is a bug report (`report.cs` 28-32, "Reports a bug"). It is spam gated (45-46), refused for muted players (54-57), capped by a bug queue of slot ids (63-80, `MAX_BUGREPORT_QUEUE`), and mailed to staff if configured (93-100). `MAX_REPORTS` = 100 (35) is declared and not used in this file. No player-abuse report command was found by filename search.
- Friends (`friend.cs` 28-80; `FriendsManager.cs` 103-154, 225-268): the friend command removes a name already in the list first (30). A partial name is resolved; a cross-realm player is turned into "not found" (40-41), and the not-found text (48) does not say whether the name exists. Adding is a duplicate check, then a list concat (119) and a DB read for the offline status (133-144). No count cap was found in `AddFriendToPlayerList` (103-154). The social snapshot skips anonymous and other-realm friends (236).
- Languages: a whisper or yell that the listener cannot understand is shown as "something in a language you don't understand" (`GamePlayer.cs` 7545-7550, with `IsAllowedToUnderstand`).
- Distances: whisper 512 (`WorldMgr.cs` 32), say 512 (36), yell 1024 (48).

## 2. Key functions

- `IsSpammingCommand(player, commandName, delay)`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/commands/AbstractCommandHandler.cs` 26-48. The per-command window with the accepted-only write.
- `GameLiving.WhisperReceive`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameobjects/GameLiving.cs` 3108-3137. The sender-side 1500 ms receive gate.
- `GameLiving.Whisper`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameobjects/GameLiving.cs` 3145-3165. Silence check, distance, then the target's receive.
- `GamePlayer.WhisperReceive` and `IsIgnoring`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameobjects/GamePlayer.cs` 7324-7336 and 7539-7552.
- `WhisperCommandHandler.OnCommand`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/commands/playercommands/whisper.cs` 31-58.
- `mute` command: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/commands/gmcommands/mute.cs` 25-95.

## 3. Numbers vs mechanism

| Reusable rule | Donor constant (where) |
|---|---|
| Per-command spam window (default) | 1500 ms (ServerProperties.cs 241, documented default) |
| Whisper command window | 500 ms (whisper.cs 39) |
| Sender receive window | 1500 ms (GameLiving.cs 3120) |
| Whisper distance | 512 units (WorldMgr.cs 32) |
| Say distance | 512 units (WorldMgr.cs 36) |
| Yell distance | 1024 units (WorldMgr.cs 48) |
| Report queue | MAX_BUGREPORT_QUEUE (report.cs 66-80); MAX_REPORTS = 100 unused (report.cs 35) |
| Friend or ignore cap | none found |
| Mute length | none (flag, not timed) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order for the window (staff pass; otherwise compare with the last accepted time; write the time only on accept), and the sender-side receive gate with the same 1500 ms value. It moves the mute check to the front of one shared intake function (a fix, since the donor checks mute per command), returns a refusal reason where the donor is silent on the receive gate (a fix), and keeps the ignore as a server-side drop that reports success (the donor's behaviour). It omits the target lookup, the distance check, the quest and event notifications, the language gate, the "Slow down!" text, the donor's equal-time removal branch (lines 34-37) and the dead local `changeTime` (39). The clock is passed in as milliseconds.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
const COMMAND_WINDOW_MS = 1500;    // per player, per command name (donor documented default)
const WHISPER_COMMAND_MS = 500;    // whisper command window (donor value)
const RECEIVE_WINDOW_MS = 1500;    // per sender, across all targets (donor value)

type Refusal = 'slow' | 'muted';
type Decision = { ok: true } | { ok: false; reason: Refusal };

interface Intake {
  muted: boolean;
  staff: boolean;                          // staff are exempt from the windows (donor: privilege above player)
  lastAccepted: Map<string, number>;       // command name -> time of the last accepted use, ms
  lastReceiveMs: number | null;            // time of the last accepted whisper received, ms
}

// One intake gate for every chat command. Mute is checked here once, before any window (fix: donor checks mute per command).
// The timestamp is written only on accept, so a refused attempt does not extend the window (donor: line 46).
function intake(p: Intake, command: string, windowMs: number, nowMs: number): Decision {
  if (p.muted) return { ok: false, reason: 'muted' };
  if (!p.staff) {
    const last = p.lastAccepted.get(command);
    if (last !== undefined && nowMs - last < windowMs) return { ok: false, reason: 'slow' };
  }
  p.lastAccepted.set(command, nowMs);
  return { ok: true };
}

// Target-side receive gate on the sender's last accepted whisper. The refusal must be shown to the sender (fix: donor is silent).
function receiveWhisper(sender: Intake, nowMs: number): Decision {
  if (!sender.staff && sender.lastReceiveMs !== null && nowMs - sender.lastReceiveMs < RECEIVE_WINDOW_MS) {
    return { ok: false, reason: 'slow' };
  }
  sender.lastReceiveMs = nowMs;
  return { ok: true };
}

// Ignore is a server-side drop that still reports success to the sender (donor: IsIgnoring then return true).
function deliverWhisper(targetIgnores: Set<string>, senderName: string, senderIsStaff: boolean): 'delivered' | 'dropped' {
  if (!senderIsStaff && targetIgnores.has(senderName)) return 'dropped';
  return 'delivered';
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/ct003-odaoc-intake-gate.ts`, exit 0 (TSC_OK).

## 5. Lands in

- TARGET `origins/server/chat-gate.ts` (proposed; same module as cells 1 and 2). The window and the mute check run in the writer at intake, before the message is routed, so the state is server-side.
- Parity-checklist row 5 (controls/input, the intake rule). No row of the 23 covers chat. The server tick sub-line is not used here: these windows are wall-clock per command, not per tick.
- Reuse tag: adapt-idea (GPL-3.0 LICENSE; file headers say GPL v2 or later; clean-room only)
- Brief rule served: Strategy CT rulings (spam limits; mute tiers; chat through the writer); addendum rule "keep the idea, fix the defect".

## 6. Gaps and risks

- Defect, fix: the mute flag is checked per command, not in the send path. `whisper.cs` (39-58), `GamePlayer.Whisper` (7560-7575), `GameLiving.Whisper` (3145-3165) and `chatgroup.cs` (18-52) have no mute check, so a muted player can still whisper and post to a chat group (grep for `IsMuted` across GameServer shows no hit on those paths). Fix: one intake function with the mute check first (the sketch's `intake`).
- Defect, fix: a refused whisper on the receive gate is silent. `GameLiving.cs` 3121-3123 returns false with no message, and `whisper.cs` 58 ignores the result. The 500 ms command gate does print "Slow down!" (whisper.cs 41), so the two gates behave differently. Fix: send the sender the same "slow" text on the receive refusal.
- Defect, fix: the mute check on the report command (`report.cs` 54-57) says a muted player is "not allowed to submit bug reports". Bug reports and abuse reports are not separated; there is no player-abuse report row. Fix: add a reason row for player reports (rule: report path with a reason row, Strategy CT).
- Defect, fix: `MAX_REPORTS` (report.cs 35) is declared and unused. Remove it.
- Defect, fix: `changeTime` (AbstractCommandHandler.cs 39) is computed and never read; the equal-time branch (34-37) removes the stored key but the local still refuses the call once. Fix: drop the dead local and test the equal-time case.
- Defect, fix: the mute command checks `playerClient` for null (mute.cs 60, 70) but then dereferences `playerClient.Player` (62-63, 72-73, 88, 92) without a check on the Player. A client that has not entered the world may have no Player; the line would then throw (reasoning from the code; not run). Fix: check the Player, or apply the account flag on entry (GamePlayer.cs 9996 already does this).
- Gap: there is no friend cap and no ignore cap found (FriendsManager.cs 103-154; GamePlayer `IgnoreList` stores names, body (not read)). Frankendom needs a cap as data.
- Gap: the chat-type mask is per viewer and only covers spell types (ClientFilterSettingsHandler.cs 21-29). A Frankendom filter for chat types should cover all types and say so in the donor's own comment: a player who re-enables a type does not see the old lines.
- Gap: no server profanity filter. `/filter` does nothing (filter.cs 39). Frankendom's write-time display-name blocklist is not in this donor.
- Gap: no child-safety default, no emote animation rows and no chat-bubble mapping were read in this donor.
- Gap: the donor's friend list is a list of names with no privacy setting other than the anonymous flag (`FriendsManager.cs` 236). Frankendom's FRIENDS-only presence rule (from cell 1) is not here.
- Not read: `region.cs` and `yell.cs` bodies, the language table (LanguageMgr), `ignore.cs`, the friend online notify functions (`FriendsManager.cs` 284-318), the GM ban path, and the database storage of the reports (`DbBugReport`).

Reuse tag: adapt-idea (GPL-3.0 LICENSE; file headers say GPL v2 or later; clean-room only)
Brief rule served: Strategy CT rulings (spam limits; mute tiers and durations; chat through the writer; report path with a reason row); addendum rule "keep the idea, fix the defect".
