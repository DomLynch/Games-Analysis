# ValveSoftware-source-sdk-2013 (parties-guilds-chat, cell 2)

Donor: `/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/server/client.cpp` (with `game/shared/teamplay_gamerules.cpp`, `game/shared/multiplay_gamerules.cpp`, `game/server/basemultiplayerplayer.cpp`, `game/server/tf/tf_player.cpp`) | Licence: Source 1 SDK LICENSE (Valve Corporation; free use and modification for Valve-engine games with distribution conditions; restricted: clean-room only) | C++ | symbol `Host_Say`

Checked: Read `game/server/client.cpp` 114-165 (CheckChatText), 173-380 (Host_Say, whole function), 843-878 (say and say_team commands); `game/shared/teamplay_gamerules.cpp` 372-396; `game/shared/multiplay_gamerules.cpp` 1097-1106; `game/server/basemultiplayerplayer.cpp` 113-130 (the rest of the function after 130 not read); `game/server/tf/tf_player.cpp` 19794-19822 (rest not read); `game/server/vscript_server.cpp` 1620-1634. Callers of `Host_Say` (grep): client.cpp 850, 860, 874 and vscript_server.cpp 1628, 1633. Hint file `hud_basechat.cpp` is the chat HUD: lines 1644-1645 pick the `say` or `say_team` command word; the send path itself is in client.cpp. Not read: `CanSpeak` and `CanPlayerTalk` bodies, the `GetChatFormat`, `GetChatPrefix` and `GetChatLocation` rule implementations, `UTIL_SayText2Filter`, `GetVoiceGameMgr()->IsPlayerIgnoringPlayer`, `GetTeamID`, `CTeamplayRoundBasedRules::CheckChatText`, and the hl2mp `CheckChatText` override (`game/server/hl2mp/hl2mp_player.cpp` 1547). Seen by grep only, possible separate cell: TF2 party code (`game/client/tf/clientmode_tf.cpp` 2091-2120 and `BIsFriendOrPartyMember` at 2312; `game/server/tf/tf_gc_server.cpp` 2348). Confidence: high on the Host_Say order and the team-id rule; medium on which game uses which rule (HL2MP inherits CTeamplayRules; the base chain of TF2 was not read). camera_scope: n/a.

## 1. Mechanism

- Two channels only: all (`say`) and team (`say_team`). Both call one function, `Host_Say`, with the team flag 0 or 1 (client.cpp 850, 874). The client's command word picks the channel (hud_basechat.cpp 1644-1645).
- Order of steps for a player's line (`Host_Say`, client.cpp 173-380):
  (a) Text: for `say` and `say_team` the argument string is the message; otherwise the command word is put in front of the raw text (189-213).
  (b) Sanitise (222): if the text starts with a quote, that quote and the last character are dropped (125-129); the first CR, LF or ESC ends the text (137-150); the text is cut to 127 characters (159-160). If nothing is left, return (225-226).
  (c) Speak gate (230): if the sender cannot speak, return. The player's own hook then runs (234), and the sanitiser runs again (238). Empty means return.
  (d) The sender-dead flag is set from the life state (245, 249). It is never read in `Host_Say`.
  (e) Prefix: the game rules give a format, prefix and location (255-260); without a format the line is "name: " (277). The line is cut to fit a fixed buffer after the prefix (280-282).
  (f) Recipient loop (293-325): skip the sender (300); skip non-net clients (303); if teamonly, the listener must be a teammate by the game rules (305); the listener's `CanHearAndReadChatFrom` must allow the sender (308); the voice-ignore list must not block the sender (311). Survivors get a reliable message (315), in the game-rules format if one exists (317-324).
  (g) Sender echo (327-341); server-console echo on a dedicated server (345-346); a log line that says `say` or `say_team` (366-369); a `player_say` event fired after the send (371-379).
- Listener filter (`CBaseMultiplayerPlayer::CanHearAndReadChatFrom`, basemultiplayerplayer.cpp 113-130): ignore-all hears nothing (120-121); ignore-team hears only teammates (124-125); a dead speaker is not heard by a living listener (128-129). TF2's override adds: the coach and the student are always heard (tf_player.cpp 19797-19802), and in Mann vs Machine the teams always hear each other (19817-19822).
- Team relation: the teamplay rule says teammate when both players have the same non-empty team id (teamplay_gamerules.cpp 379-383; `PlayerCanHearChat` 395). The base multiplay rule has no teammates: its relation always returns not-teammate (multiplay_gamerules.cpp 1105), so in that base `say_team` reaches only the sender.
- Scripts: `vscript_server.cpp` 1628 calls `Host_Say` with the script's team flag; with no player it calls it as the console (1633). The talk-interval check is commented out in that path (1627). `Host_Say` still applies the speak gate for an entity sender (230).
- Ticks: none. A line is sent once, when the command runs. No per-frame loop.

## 2. Key functions

- `Host_Say`: `/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/server/client.cpp` 173-380 (whole function read).
- `CheckChatText`: `/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/server/client.cpp` 114-165.
- `say` and `say_team` commands: `/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/server/client.cpp` 843-862 and 867-878.
- Listener filter: `/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/server/basemultiplayerplayer.cpp` 113-130 (read to 130).
- Team relation: `/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/shared/teamplay_gamerules.cpp` 372-385 (`PlayerRelationship`) and 393-396 (`PlayerCanHearChat`).
- Base multiplay relation: `/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/shared/multiplay_gamerules.cpp` 1097-1106.
- TF2 override: `/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/server/tf/tf_player.cpp` 19794-19822 (read to 19822).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Sanitise: cut at CR, LF or ESC, then cap the length | Cap 127 characters (theirs, client.cpp 159-160 and 234); blacklist CR, LF, ESC (theirs, client.cpp 139) |
| Prefix plus body must fit a fixed buffer | Buffer size minus 2 (theirs, client.cpp 280) |
| Channel as a flag on one send path | Team flag 0 for say, 1 for say_team (theirs, client.cpp 850, 874) |
| Team relation: same non-empty team id | Empty id never matches (theirs, teamplay_gamerules.cpp 379) |
| Ignore modes: none, team only, all | Ignore values CHAT_IGNORE_TEAM and CHAT_IGNORE_ALL (theirs, basemultiplayerplayer.cpp 120, 124) |
| Dead speaker hidden from a living listener | Rule (theirs, basemultiplayerplayer.cpp 128-129) |
| Event after the send | Event priority 1, HLTV only (theirs, client.cpp 377) |

## 4. TypeScript sketch

SKETCH_SIMPLIFIED

```ts
SKETCH_BLOCK
```

## 5. Lands in

- TARGET `origins/server/chat-channels.ts` (new, server): the one send path that every chat channel will use (say, party, guild), with the sanitiser and the per-recipient filters. The client shows lines; it never decides who hears them.
- Parity row: none fits. Rows 1-23 have no chat row. The nearest is row 17 (death and respawn), which only names the dead and is not a chat rule. Written as `none`; the target file is named above.
- Reuse tag: rewrite-from-idea (Valve SDK licence: restricted; clean-room only)
- Brief rule served: one ledger (channel membership and listener rules are checked on the server before any line is sent); server-verified

## 6. Gaps and risks

- Restricted Valve licence: clean-room, shape only. The sketch is written from the described order, not from the donor lines.
- The donor takes the channel from the client's command word and then passes a flag. Frankendom must pick the channel on the server from the sender's state (party id, guild id), never from client text.
- In the base multiplay rule `say_team` reaches only the sender (multiplay_gamerules.cpp 1105). That is a silent failure if a game leaves team ids empty. Frankendom must refuse a party channel for a sender with no party id, and say so.
- Quote handling: a leading quote is dropped together with the last character, without checking that the last character is a quote (client.cpp 125-129). Not tested. Frankendom should strip quotes only when both ends match.
- The 127 cut is written at buffer index 127 (client.cpp 159-160). With a stripped leading quote, the kept text is then 126 characters. This is derived from the code and was not tested.
- `bSenderDead` is assigned (245, 249) and never read in `Host_Say`. Dead code in the donor; do not port it.
- The voice-ignore check (client.cpp 311) belongs to a separate voice system (`GetVoiceGameMgr`, not read). Frankendom's mute list should be a ledger row, not a voice call.
- The script path skips the talk-interval check (vscript_server.cpp 1627 is commented out). Frankendom: every channel send, including scripted ones, goes through one rate check.
- The donor's team flag is per line, not membership. A Frankendom party channel needs membership checked on the server at each send, not only when the client opens the channel.

Best transferable idea: Send every chat line through one server function that takes a channel tag, sanitises the text, then filters each recipient by channel relation, ignore mode, dead-speaker rule and mute list before the send.
Decision (proposed): adapt - take the single send path with per-recipient filters and the sanitiser; do not take the client-chosen channel word, the base-multiplay rule that sends team chat to nobody, or the unchecked quote strip.
Acceptance: A two-client server test: a party-channel line reaches party members and not a non-member; a listener set to ignore-team gets no party line from a non-member; a downed player's line is not delivered to a living listener; a line containing a line break is cut at the break; a 300-character line arrives capped at 127 characters; a sender with no party id is refused the party channel with a message, not a silent drop.

Reuse tag and brief rule are in section 5.
