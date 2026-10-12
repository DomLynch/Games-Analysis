# ACEmulator-ACE (chat-social-moderation, cell 2)

Donor: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Managers/SquelchManager.cs` (with `ACE.Server/Network/Structure/SquelchDB.cs`, `ACE.Entity/Enum/SquelchMask.cs`, `ACE.Server/Network/Handlers/TurbineChatHandler.cs`, `ACE.Server/WorldObjects/Player_Tick.cs`) | Licence: GNU Affero General Public License v3 (read from `/mnt/frankendom-donors/ACEmulator-ACE/LICENSE`, "GNU AFFERO GENERAL PUBLIC LICENSE Version 3, 19 November 2007") | C# | symbol `SquelchDB.Contains`

Checked: Read in full: SquelchManager.cs (298 lines), SquelchDB.cs (199), SquelchMask.cs (61), TurbineChatHandler.cs (387), TurbineChatChannel.cs (20), GameActionTell.cs (12-56), GameActionTalkDirect.cs (12-52), Player_Tick.cs (586-611, the gag countdown), PlayerManager.cs (779-812, gag and ungag), Player.cs (794-804, local speech), WorldObject_Networking.cs (1380-1408, local broadcast), RateLimiter.cs (58), SquelchInfo.cs (8-48), ChatMessageType.cs (281-289, ToMask), Session.cs (76-92, rate limiter fields), changelog.md (grep and the context lines of each entry cited). Read in part: GameActionChatChannel.cs (squelch and fan-out lines only, by grep), PropertyManager.cs (516-522 only, one default), WorldManager.cs and HouseManager.cs (the limiter line only). Not read: SquelchInfo.cs 49-66, the CharacterPropertiesSquelch write path (AddOrUpdateSquelch), the `LocalBroadcastRange` and `CachedHeartbeatInterval` values, the AdminCommands gag and squelch commands, and the offline behaviour of squelch rows. Confidence: high on the squelch model and its delivery checks (every delivery site was found by grep and the main ones read in full); medium on the local-speech range (the caller and the loop were read, the range value was not). Depth: full for the squelch, gag and channel-gate chain.

Best transferable idea: a per-recipient squelch set (account squelches, per-speaker channel bitmasks, one global mask) that is checked at each delivery site, with masks that collapse to "all channels" when every channel is set, so a squelched speaker is removed from the fan-out and never reaches the recipient.
Decision (proposed): adapt - keep the recipient-side set, the per-channel bitmask, the collapse-to-all rule and the check at fan-out; add a bit for each Frankendom channel (zone, party, guild, global, whisper); move the gag countdown onto the server tick with a data-driven duration; fix the defects in section 6.
Acceptance: A server test has player B squelch player A on the global channel; A's global line is absent from B's delivery list, A's whisper to B still delivers if B has not squelched the whisper bit, and after B squelches all channels, the stored mask equals the "all" value and removing one channel leaves the other channels squelched.

## 1. Mechanism

- A squelch is stored on the squelching player's character record, keyed by the squelched character's id (or by account for an account squelch). The squelching player's `SquelchDB` is rebuilt from those rows (SquelchManager.cs 287; SquelchDB.cs 46-93).
- Adding a squelch (SquelchManager.cs 126-151): the channel must be squelchable (74-82). The squelched target must exist and cannot be the squelcher (109). The new mask is the old mask ORed with the new one (138). If nothing changed, the player is told "already squelched" and nothing is written (140-144). Otherwise the mask is written to the character record (147).
- Mask rules (SquelchMask.cs 28-59): a bit is `1 << channel type` (ChatMessageType.cs 288). Add: if either side is AllChannels the result is AllChannels (32-33); if the OR equals the set of all squelchable channels (`Combined`), the result becomes AllChannels (37-38). Remove: if the mask is AllChannels it is first widened to Combined (50-51), then the bits are cleared (53), and if the result is Combined it collapses to AllChannels (55-56). Removing AllChannels clears everything (45-46).
- Unsquelching one channel (SquelchManager.cs 153-190): if the bit is not set, the player is told it is not squelched there (175-179). Otherwise the new mask is stored, or the row is deleted when the mask is None (181-186). Unsquelch on AllChannels deletes the row (163-169).
- Account squelch (SquelchManager.cs 195-250): stored with the AllChannels mask (228), keyed by the account id (217). It is checked by account name at delivery (SquelchDB.cs 138), so it covers every channel regardless of mask.
- Global filter (SquelchManager.cs 255-279): a single mask on the player (`SquelchGlobal`, 262-272). It is passed into every SquelchDB and checked last (SquelchDB.cs 91-92, 149-150).
- Delivery check (SquelchDB.cs 123-153): for a non-squelchable channel the check returns false (126). Otherwise: account squelch returns true (138); the character's mask must have all the bits of the channel (144); the global mask is checked last (149). For channel AllChannels, the required mask is 0xFFFFFFFF, so only a full mask matches.
- Where the check is applied (all sites found by grep): local speech broadcast (WorldObject_Networking.cs 1393), tell (GameActionTell.cs 39), talk-direct to a player (GameActionTalkDirect.cs 39), allegiance chat (TurbineChatHandler.cs 133), olthoi, society and general chat (203, 240, 314), fellowship and allegiance chat (GameActionChatChannel.cs by grep), combat and magic messages (Player_Combat.cs, SpellProjectile.cs, Player_Magic.cs by grep, not read).
- Turbine chat fan-out (TurbineChatHandler.cs 22-323): the server flag `use_turbine_chat` is checked first (22). A gagged sender is refused and sent the gag error (35-37). Allegiance chat goes to online members who are not booted, not squelched, and have the listen option on (125-139). Olthoi chat requires an olthoi sender (146), goes to olthoi players and admins (191), and checks AllChannels squelch (203). Society chat goes to the same society or admins (234), with the listen option (237) and AllChannels squelch (240). General, trade, LFG and roleplay share one loop over all online players (290-318): a listen option per channel (293-296), a channel disable switch (299-309), olthoi recipients skipped (311), and AllChannels squelch (314).
- Gag (PlayerManager.cs 779-795; Player_Tick.cs 588-611): gagging sets IsGagged, a timestamp and a 300-second duration, saves the biota and writes an audit line (786-792). The duration is counted down on the heartbeat for online players only (599). When it reaches zero the gag is cleared and saved (601-609).
- Tell (GameActionTell.cs 14-54): gag check first (20), then target lookup, then the echo to the sender (36-37; skipped when telling yourself), then the squelch check (39), then an AFK check: if the target is AFK the sender gets an AFK notice but the tell is still delivered (the `return` is commented out, so this is a social rule, not a block). A squelched sender receives "X has you squelched." (41) and the line is not delivered.
- Talk-direct (GameActionTalkDirect.cs 15-51): the target must be a creature (21-27). The echo to the sender comes first (29). For a player target the gag check (33) and the squelch check (39) follow.
- Local speech (Player.cs 794-804): if not gagged, the line is broadcast to nearby players with the Speech channel (798). Nearby is the known-player list within `LocalBroadcastRange`, compared by squared distance (WorldObject_Networking.cs 1391-1405).

## 2. Key functions

- `SquelchDB.Contains` (account and character squelches are checked only when the source is a Player; the global filter is checked for any source, so NPC speech can be globally filtered): `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Network/Structure/SquelchDB.cs` 123-153. The delivery check.
- `SquelchMask.Add` and `Remove`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Entity/Enum/SquelchMask.cs` 30-59. Collapse rules.
- `SquelchManager.SquelchCharacter`, `UnsquelchCharacter`, `HandleActionModifyAccountSquelch`, `HandleActionModifyGlobalSquelch`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Managers/SquelchManager.cs` 126-279.
- `TurbineChatHandler.TurbineChatReceived`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Network/Handlers/TurbineChatHandler.cs` 19-327. Channel routing, gates and fan-out.
- `Player.GagsTick`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Player_Tick.cs` 588-611. Heartbeat countdown.
- `PlayerManager.GagPlayer`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Managers/PlayerManager.cs` 779-795. Gag with 300 s.

## 3. Numbers vs mechanism

| Rule | Donor value | Where |
|---|---|---|
| Squelchable channel bits | 14 types: Speech, Tell, Combat, Magic, Emote, Appraisal, Spellcasting, Allegiance, Fellowship, CombatEnemy, CombatSelf, Recall, Craft, Salvaging (bit = 1 << type) | ChatMessageType.cs 283-288; SquelchManager.cs 47-69 |
| All-channels value | 0xFFFFFFFF; a full set of the 14 bits collapses to it | SquelchMask.cs 25, 37-38, 55-56 |
| Gag duration | 300 seconds, fixed (not an argument) | PlayerManager.cs 788 |
| Gag countdown | subtracted by the heartbeat interval, online only | Player_Tick.cs 599 |
| Rate limiter (in use for world update, DDD and house update; not chat) | 60 events per 1 s (world update); 1000 per 1 min (DDD, Session.cs 80); 1 per 1 min (house manager update, HouseManager.cs 47) | WorldManager.cs 313; Session.cs 80; HouseManager.cs 47 |
| General chat disable switch default | false | PropertyManager.cs 516 |
| Local speech range | `LocalBroadcastRange` (value not read) | Player.cs 798; WorldObject_Networking.cs 1389-1405 |
| Turbine channel IDs | Allegiance 1, General 2, Trade 3, LFG 4, Roleplay 5, Society 6, CelestialHand 7, EldrytchWeb 8, RadiantBlood 9, Olthoi 10 | TurbineChatChannel.cs 5-18 |
| Account time gate (general channels) | `chat_requires_account_time_seconds`, only when above 0; the account 15-day gate is a separate switch | TurbineChatHandler.cs 263, 270 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's collapse rules (add to all, remove expands from all), the delivery check order (account, then per-character mask, both only for player sources, then global for any source), and the gag-before-echo order of GameActionTell. It omits: the Turbine channel routing (allegiance, society, olthoi, admin bypass), the per-channel listen options and disable switches, the echo and reject responses, the chat requirement gates, the local-range broadcast, the 4x SquelchInfo packing, the database rows and their load by name, the audit log and the save calls. The gag is a plain timer that counts only the heartbeat it is given. The sketch does not echo a gagged speaker's line (as donor GameActionTell does), whereas donor GameActionTalkDirect echoes first and then checks the gag (see section 6).

```ts
// Licence: AGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
export {};

// Channel bits: one bit per squelchable channel type, bit = 1 << type (donor ChatMessageType.ToMask).
const SQUELCHABLE_BITS: number[] = [2, 3, 6, 7, 12, 16, 17, 18, 19, 21, 22, 23, 24, 25];
const ALL_CHANNELS = 0xffffffff;
const COMBINED = SQUELCHABLE_BITS.reduce((m, b) => (m | (1 << b)) >>> 0, 0);

// Add: a full set of squelchable channels collapses to ALL_CHANNELS (donor SquelchMask.Add, SquelchMask.cs 30-41).
function addMask(a: number, b: number): number {
  if (a === ALL_CHANNELS || b === ALL_CHANNELS) return ALL_CHANNELS;
  const r = (a | b) >>> 0;
  return r === COMBINED ? ALL_CHANNELS : r;
}

// Remove: clearing from ALL_CHANNELS first expands it to COMBINED (donor SquelchMask.Remove, SquelchMask.cs 43-59).
function removeMask(a: number, b: number): number {
  if (b === ALL_CHANNELS) return 0;
  const base = a === ALL_CHANNELS ? COMBINED : a;
  const r = (base & ~b) >>> 0;
  return r === COMBINED ? ALL_CHANNELS : r;
}

// hasAll: every bit of `need` is set (donor SquelchInfo.Filters[0].HasFlag).
function hasAll(mask: number, need: number): boolean {
  return ((mask & need) >>> 0) === need;
}

// One recipient's squelch set: account names squelched on every channel, per-character masks, and a global mask.
interface SquelchSet {
  accounts: Set<string>;
  characters: Map<string, number>;   // key: character id, value: channel mask
  global: number;
}

interface Speaker { id: string; account: string; isPlayer?: boolean; } // isPlayer defaults true; donor only checks account/character squelches for Player sources

// Contains: is this speaker squelched by this recipient on this channel? channel = null means "all channels".
// Non-squelchable channels are never squelched (donor SquelchDB.Contains line 126).
export function isSquelched(set: SquelchSet, speaker: Speaker, channelBit: number | null, squelchable: Set<number>): boolean {
  const need = channelBit === null ? ALL_CHANNELS : (1 << channelBit) >>> 0;
  if (channelBit !== null && !squelchable.has(channelBit)) return false;
  if (speaker.isPlayer !== false) {
    if (set.accounts.has(speaker.account)) return true;               // account squelch covers every channel
    const perChar = set.characters.get(speaker.id);
    if (perChar !== undefined && hasAll(perChar, need)) return true;
  }
  return set.global !== 0 && hasAll(set.global, need);
}

// Delivery fan-out: only recipients who have not squelched the speaker receive the line.
export function fanOut<R extends { id: string; set: SquelchSet }>(
  recipients: R[], speaker: Speaker, channelBit: number | null, squelchable: Set<number>,
): R[] {
  return recipients.filter((r) => !isSquelched(r.set, speaker, channelBit, squelchable));
}

// Gag: a timer on the player record. Only heartbeats count down, so time offline does not burn the gag.
export interface Gag { remainingS: number; }

export function gagTick(gag: Gag | null, heartbeatS: number): Gag | null {
  if (gag === null) return null;
  const left = gag.remainingS - heartbeatS;
  return left <= 0 ? null : { remainingS: left };
}

// Gate order for a speak action: gag first (so a gagged speaker gets no echo), then squelch at delivery.
export function canSpeak(gag: Gag | null): boolean {
  return gag === null;
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/ct005-ace-squelch-gag.ts` (copy of `/private/tmp/p2/wave2-haiku/batch3/CT005/work/ace-squelch-gag.ts`): exit 0.

## 5. Lands in

- TARGET `origins/server/chat-squelch.ts` (new; the recipient-side squelch set and the delivery check on the chat writer). Not in src/fight.
- Parity row 5 (controls/input; the intake sub-line, since the check decides what a client is sent). No parity row covers chat. Strategy should confirm or add a chat row.
- Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
- Brief rule served: chat as presence messages through the writer (TOPICS-FOCUS3 CT rule); the squelch check runs on the server before a line is sent.

## 6. Gaps and risks

- AGPL-3.0: clean-room only. The sketch is written from the mechanism.
- Defect (echo before gag): GameActionTalkDirect.cs 29 echoes "You tell X" to the sender before the gag check (33). A gagged player sees their own line echoed, then a gag error, and the line is not delivered. Fix: gag check first, as GameActionTell.cs 20 does (the sketch does this).
- Defect (channel disable check inside the loop): TurbineChatHandler.cs 299-309 checks the disable switch inside the recipient loop, and the loop returns on the first recipient who passes the listen filter (293-297). If no online player listens, the check is never reached. Fix: check the switch once, before the loop.
- Gap (no per-channel squelch for Trade, LFG, Roleplay): squelch on these channels is only AllChannels (TurbineChatHandler.cs 314), because the squelch model has no bit for them (the bit list is the 14 types in section 3). Frankendom should give each channel its own bit.
- Gap (no chat rate limit): no per-player line limit exists in the chat path. The limiter in the donor (`RateLimiter`, RateLimiter.cs 6-56) is used for the world update, DDD and house update (WorldManager.cs 313; Session.cs 80; HouseManager.cs 47), not for chat. The class is reusable: a pacing limit of a fixed number of lines per period would fit `RegisterEvent` and `GetSecondsToWaitBeforeNextEvent`.
- Gap (fixed gag duration): 300 s is hard-coded (PlayerManager.cs 788). Frankendom: duration is a moderator argument with a data-defined maximum.
- Ruling (block notice): a squelched sender is told "X has you squelched." (GameActionTell.cs 41). That reveals the block. See Ruling 1 in section 10.
- Ruling (gag and NPCs): a gagged player can still talk-direct to a creature that is not a Player, because the gag check sits inside the player branch (GameActionTalkDirect.cs 31-33). The donor records no intent. Frankendom must decide (Ruling 2 is about the duration; this is separate).
- Risk (offline gag): the countdown runs on the heartbeat only (Player_Tick.cs 599), so a gag does not run down while the player is offline. This is a feature for a staff tool, but it means a gag can outlast a session and nothing shows the remaining time to the player (not verified).
- Risk (squelch rows and names): the account squelch is keyed by account name at delivery (SquelchDB.cs 138) while the row is keyed by account id (SquelchManager.cs 217). Renames and cross-account lookups were not read. Frankendom: key both by one id.
- Ruling against Frankendom: one ledger. The squelch set is stored on the character record and rebuilt on demand (SquelchManager.cs 287). Frankendom: one row per (recipient, speaker), written through the writer, not a rebuilt cache.

## 7. As-data shape

- Row fields, character squelch (as stored, `CharacterPropertiesSquelch`, read from the calls at SquelchManager.cs 147 and 184 and SquelchDB.cs 52-55): `character_id: uint`; `account_id: uint` (0 for a character row); `type: uint` (the channel mask). The account row uses the same table with `account_id` set and a mask of AllChannels (SquelchManager.cs 228).
- Row fields, global filter: a single property `SquelchGlobal` on the player (Player_Properties.cs 1276-1279), an int with 0 as "none".
- Row fields, squelch view (SquelchDB): `accounts: name -> character guid`; `characters: guid -> SquelchInfo { filters, name, account }`; `globals: SquelchInfo`.
- Channel table (data): TurbineChatChannel.cs 5-18, one id per channel, plus `ChatMessageType` values for the local channels (ChatMessageType.cs 52-63).
- A new squelchable channel is one row: no. The mask is 32-bit, the bit is `1 << type`, and the squelchable list is a switch statement (SquelchManager.cs 47-69). A new channel needs code.
- A new account squelch is one row: yes (same table, account id set).
- Gag: one player property with a duration (PlayerManager.cs 786-788). A different duration per staff action is one argument (not built).

## 8. Provenance

- Donor repo: ACEmulator-ACE (`/mnt/frankendom-donors/ACEmulator-ACE`).
- Licence: `LICENSE` in the donor root, GNU Affero General Public License v3. Copyleft. Shape only.
- Per claim: squelch and mask facts from SquelchManager.cs, SquelchDB.cs, SquelchMask.cs and SquelchInfo.cs; channel and gate facts from TurbineChatHandler.cs and TurbineChatChannel.cs; gag from PlayerManager.cs and Player_Tick.cs; tell and talk-direct from the two GameAction files. All paths are under `/mnt/frankendom-donors/ACEmulator-ACE/Source/`. The changelog is at `/mnt/frankendom-donors/ACEmulator-ACE/changelog.md`.

## 9. What they patched later

- No git history on the donor box (no `.git` directory). The changelog records dated changes (headers are `### YYYY-MM-DD`; newest first):
- 2019-01-04: "Adding LocalBroadcastRange for chat messages" (changelog.md 3823). Local speech got a range.
- 2019-02-04: "Adding squelches" (changelog.md 3547). First squelch system.
- 2019-04-03: "Fix issue with long chat messages" (changelog.md 3113).
- 2019-07-31: "Improved squelch system" and "Added support for global /filters by message type" (changelog.md 1689-1690). The global `@filter` mask came with this change.
- 2019-07-31: "Fixed a bug with some emotes such as *wave* playing multiple times" (changelog.md 1692). Emotes are chat-adjacent.
- 2020-01-21: "Fixed *wave* spam" (changelog.md 752).
- 2020-05-08: "Enable global chat toggling" (changelog.md 92). The changelog line does not name the code it touched; the channel disable switches are at TurbineChatHandler.cs 299-302 (not dated).
- Code comment (SquelchInfo.cs 21-22): the squelch packet is sent four times because a single send leaves the client's checkbox unchanged. This is a protocol fix recorded only as a comment.
- Code comment (SquelchDB.cs 22): the account part of the protocol is always empty in retail captures, so account squelches are sent in the character table.

## 10. Rulings for Dom

1. Blocked whisper: should the sender be told "X has you squelched" (the donor does) or see a normal-looking delivery? Recommendation: keep the notice; it stops repeat attempts and is what the donor does.
2. Gag duration: fixed 5 minutes (donor) or a moderator choice from a short list (5, 30, 60 minutes)? Recommendation: a choice from the list, stored as a data row.
3. Per-channel squelch for trade, LFG and roleplay: does Frankendom need it, or is "block all of one player's chat" enough? Recommendation: one bit per channel, so a player can silence trade without silencing guild chat.

Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
Brief rule served: chat as presence messages through the writer (TOPICS-FOCUS3 CT rule); the squelch check is server-side before the send.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Rate-limiter list omitted HouseManager.cs:47 (1 per 1 min).
- Contains(): account and character squelches apply only to Player sources; global filter applies to any source. Note and sketch presented the chain as unconditional.
- 'Tell: gag, lookup, echo, squelch' omitted that echo is skipped when telling yourself.
- Missed: AFK notice on tell still delivers (return commented out); global filter on non-player sources (NPC speech).

Fixed 2026-10-12: rate-limiter row and gap line, Contains conditionality (note and sketch, work file synced), Tell order, AFK line.
