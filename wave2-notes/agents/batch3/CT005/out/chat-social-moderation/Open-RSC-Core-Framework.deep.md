# Open-RSC-Core-Framework (chat-social-moderation, cell 1)

Donor: `/mnt/frankendom-donors/Open-RSC-Core-Framework/server/src/com/openrsc/server/net/rsc/handlers/ChatHandler.java` | Licence: GNU Affero General Public License v3 (read from `/mnt/frankendom-donors/Open-RSC-Core-Framework/LICENSE`, "GNU AFFERO GENERAL PUBLIC LICENSE Version 3, 19 November 2007") | Java | symbol `ChatHandler.process` (with `MessageFilter.filter`, `ReportHandler.process`, `GameStateUpdater` chat delivery)

Checked: Read in full: ChatHandler.java (83 lines), MessageFilter.java (429 lines), ReportHandler.java (105 lines), ChatMessage.java (82), ReportStruct.java (11), Constants.java reportReasons (146-190), GameReport.java (30-60, chatlog part). Read in the relevant parts: Player.java (1346-1373, 2118-2135, 4425-4490, 837-838, 2836-2841), PlayerModerator.java mute() (293-345), FriendHandler.java PM and ignore branches (115-215), GameStateUpdater.java (584-660, 722-745), PlayerSettings.java (13-80), Payload203Parser.java (80-92), DataConversions.java stripBadCharacters (232-241), World.java snapshots (120-167, 471), default.conf and ServerConfiguration.java (chat keys only). Not read: DataConversions.speakTongues, DiscordService, the ChatLog query body, the rest of GameStateUpdater (the update-packet encoding and the modern-client echo path), Social.java beyond the ignore list, persistOfflineMute(), the IP-mute path beyond LoginRequest.java:154, and any packet-level rate limiter (none found by grep for spam/throttle/flood/ratelimit in src). Confidence: high on the public-chat filter, the mute gate and the report path (read end to end); medium on who receives a line (the visibility conditions were read, the encoding was not). Depth: full for the chat, filter, mute and report chain.

Best transferable idea: a write-time chat gate that runs mute and tutorial checks first, sends restricted lines to staff only and never logs them, and filters everything else with a goodword whitelist, a badword mask of the same length, and a length-preserving leet normaliser.
Decision (proposed): adapt - keep the gate order, the whitelist, the same-length mask, the staff-only route and the report reason table; fix the defects in section 6 and drop the Discord side effects from the filter, because chat in Frankendom is a presence message through the writer and the filter must stay pure.
Acceptance: A server test sends a public line with a listed badword from a normal player and asserts that the second player receives it with the badword masked to the same length; a line containing a whitelisted goodword is delivered unchanged; a shadow-muted player's line reaches staff only and is absent from the chat log.

## 1. Mechanism

- Entry: `ChatHandler.process` runs once per incoming CHAT_MESSAGE payload (ChatHandler.java 16). The payload is the message bytes passed through `StringUtil.decompressMessage` (Payload203Parser.java 83; that function was not read).
- Order of steps in `process`, as the code runs:
  (a) Mute notice: if the sender is muted and not shadow-muted, the sender is told whether the mute is permanent or temporary and how many minutes are left (17-25).
  (b) Tutorial notice (27-29).
  (c) `mutedChat = (tutorial || muted || babyModeFiltered) && !elevated` (34). Baby mode means a new account below the total-level threshold (41-42).
  (d) If not `mutedChat`, `MessageFilter.filter` runs (36-38). A restricted line is not filtered.
  (e) Unknown characters become spaces, then `DataConversions.upperCaseAllFirst` runs (46-48; `upperCaseAllFirst` itself was not read). The filter runs before this step.
  (f) A `ChatMessage` carrying the `muted` flag is set on the sender's update flags (53-73).
  (g) Restricted lines return before logging (75-78). Other lines go to the game logger (80) and to the snapshot deque as a `Chatlog` (81).
- `MessageFilter.filter` (128-281), in order:
  1. Off switch: returns the message unchanged if `SERVER_SIDED_WORD_FILTERING` is false (129-131). An empty message becomes the placeholder `Cabbage` (133-135).
  2. Format codes: 5-character tags `@xxxx@` or `~xxxx~` are saved by index and removed before matching (143-150).
  3. Alert words are matched and reported but never censored (153-180). An exact alert word, wrapped in double quotes in the list, must have non-letter neighbours (156-167).
  4. Goodwords (whitelist) are masked with asterisks first, one hit at a time, and the original text is saved by index (182-193). This is the shield for words such as a place name that contains a badword.
  5. Badwords, longest first (95-98): each literal hit is masked with the same number of asterisks (196-203). Then the letters are checked with non-alphanumerics removed (205-209). Spaced-out matches are only masked when `SERVER_SIDED_WORD_SPACE_FILTERING` is on (207-209).
  6. Leet pass: `de1337` (364-391) normalises a copy of the message and the badword is looked up in that copy (214-238). Each hit is masked in the original message with the badword's length (226). Every substitution in `de1337` keeps the length, so indices line up (366-389).
  7. Goodwords are restored at their saved indices (240-243). Format codes are re-inserted at their saved positions (245-262). A format code that contains a badword of 5 characters or fewer is replaced with `@***@` or `~***~` (249-259).
  8. Any exception returns `Cabbage` (269-278). The whole line is replaced, so nothing unfiltered is sent.
  9. Hits are sent to Discord when a service is configured (264-268).
- Mute state: `Player.setMuteExpires` writes both `mute_expires` and `global_mute` (1358-1360). `isMuted` reads 0 as not muted (2122), -1 as muted forever (2124), and otherwise compares the expiry with now (2127). The mute command (PlayerModerator.java 293-345) sets the expiry to now plus minutes x 60000, or -1 for permanent (335). Duration 0 is an unmute (318). The shadow flag is set on an online target (341).
- Who receives a line: `GameStateUpdater` (636-657) decides, for each viewer and each nearby speaker, whether the line is added to the viewer's list. The viewer's chat privacy setting is one of three values (PlayerSettings 70-80): None (0) shows everyone; NonFriends shows friends only; All shows nobody. A line is added when the speaker is a friend and the setting is not All, or the speaker is not a friend and the setting is None, and the speaker is not on the viewer's ignore list (651-653). Moderators on either side always pass (654), and that OR sits outside the ignore check, so a moderator's line also gets past an ignore. Private messages always pass (recipient not null). A muted line is dropped unless the viewer is elevated (656). Staff who receive a muted line get update type 7 instead of 1 (733-739), with the comment "Not authentic! There is no update type 7."
- Reports (ReportHandler.process 19-88):
  1. No self-report, no empty name (26-34).
  2. Reasons 4, 6, 72, 70, 36, 37, 38, 39 and 44 are exempt from the speech check (37). For every other reason the reported name must appear in a snapshot from the last 60 s. The deque is walked newest first (`offerFirst` at World.java 167); the first snapshot older than 60 s ends the search (43-45).
  3. One report per 60 s, moderators exempt (62; Player.java 838; stamped at 83).
  4. The name must exist in the database (67-72).
  5. A `GameReport` is queued. It holds the reported player's position and the reported player's chat lines from the last 60 s (GameReport.java 39-45).
  6. If a moderator sets the suggest-or-mute byte, the reported player gets a permanent mute through the mute command (85-87).
- Global chat (Player.java 4433-4487): refused when muted (4433) and when a global cooldown has not elapsed (4449-4453; moderators have 0, 4455). Refused below the total-level requirement (4464) and for new accounts in baby mode (4475). Refused until global rules are accepted when that switch is on (4481). The time of the last global line is stamped at 4487.
- Private messages (FriendHandler.java 158-202): a muted sender can still message an elevated player (164). A private line goes to the recipient and into the snapshot deque (195). A delayed ignore adds an ignore entry and removes it after 150000 ms (203-215).

## 2. Key functions

- `ChatHandler.process`: `/mnt/frankendom-donors/Open-RSC-Core-Framework/server/src/com/openrsc/server/net/rsc/handlers/ChatHandler.java` 16-82. The full gate and route.
- `MessageFilter.filter`: `/mnt/frankendom-donors/Open-RSC-Core-Framework/server/src/com/openrsc/server/util/MessageFilter.java` 128-281. Whitelist, badword mask, leet pass, restore, fail-closed.
- `MessageFilter.de1337`: same file, 364-391. Length-preserving normaliser.
- `ReportHandler.process`: `/mnt/frankendom-donors/Open-RSC-Core-Framework/server/src/com/openrsc/server/net/rsc/handlers/ReportHandler.java` 19-88. Reason gate, recency gate, cooldown, mod auto-mute.
- `Player.isMuted`: `/mnt/frankendom-donors/Open-RSC-Core-Framework/server/src/com/openrsc/server/model/entity/player/Player.java` 2120-2128. Zero, permanent and expiry.
- `Player.isElligibleToGlobalChat` (sic): same file, 4433-4487. Global chat gate.
- `PlayerModerator.mute`: `/mnt/frankendom-donors/Open-RSC-Core-Framework/server/plugins/com/openrsc/server/plugins/authentic/commands/PlayerModerator.java` 293-345. Mute, unmute, shadow flag.
- Chat delivery: `/mnt/frankendom-donors/Open-RSC-Core-Framework/server/src/com/openrsc/server/GameStateUpdater.java` 636-657 and 733-739.

## 3. Numbers vs mechanism

| Rule | Donor value | Where |
|---|---|---|
| Minimum word length in the lists | 3 characters (lines shorter are skipped) | MessageFilter.java:44 |
| Format code width | 5 characters (`@xxxx@`, `~xxxx~`) | MessageFilter.java:144 |
| Badword inside a format code is checked only if at most 5 characters | 5 | MessageFilter.java:250 |
| Recent-speech window for a report | 60000 ms (snapshot age) | ReportHandler.java:43 |
| Report cooldown, non-moderator | 60000 ms | Player.java:838 |
| Chat-log window attached to a report | 60000 ms | GameReport.java:45 |
| Mute duration | minutes x 60000 ms; -1 means forever; 0 means unmute | PlayerModerator.java:318, 335 |
| Global chat cooldown | config `global_message_cooldown`, default 0 ms; moderators 0 | default.conf:188; Player.java:4453-4456 |
| Global chat total-level requirement | config `global_message_total_level_req`, default 0 | default.conf:190; Player.java:4464 |
| Word filter switch | config `server_sided_word_filtering`, default true | default.conf:95 |
| Spaced-letter filter switch | config `server_sided_word_space_filtering`, default false | default.conf:96 |
| Delayed ignore | 150000 ms, then removed | FriendHandler.java:210 |
| Ignore list cap | 50 (line 33) or 100 (line 204) by client limits (the selection was not read) | ClientLimitations.java:33, 204 |
| Report reasons | 35 codes: 1-14, 33-44 (32+1 to 32+12), 64-72 (64+0 to 64+8) | Constants.java:146-190 |
| Placeholder for empty or failed filter | the string `Cabbage` | MessageFilter.java:134, 277 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for the gate and the filter: mute and tutorial first, then restricted lines to staff only, then goodword shield, literal badword mask, leet pass, goodword restore, and fail-closed on error. It differs in four places. (1) It replaces the donor's `replaceFirst` on user text with an index-based mask, so a goodword containing a regex character cannot mis-mask or throw. (2) Its leet table is the donor's table minus y, l, j, v and z, which the donor maps onto i, u or s and which masks ordinary words. (3) It omits format-code preservation, alert words, the space-filter masking (it does not run the spaced-letter check at all), the `speakTongues` path, the sentence capitalisation, the Discord calls, the mute notice text and the snapshot and log writes. (4) It returns a placeholder `[filtered]` where the donor returns `Cabbage`. It does not model per-viewer delivery; that is described in section 1 only.

```ts
// Licence: AGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
export {};

type Delivery = 'everyone' | 'staff-only';

// expiresMs: 0 = no mute, -1 = permanent, otherwise an epoch-ms expiry (donor convention, Player.java 2120-2128).
interface MuteRow { expiresMs: number; shadow: boolean; }

interface ChatSender {
  staff: boolean;
  tutorial: boolean;
  babyMode: boolean;
  mute: MuteRow | null;
}

const MIN_WORD_LEN = 3;

// Word list loader: lowercase, drop words shorter than 3, longest first (donor MessageFilter 44 and 95-98).
export function prepareWords(words: string[]): string[] {
  return words
    .map((w) => w.toLowerCase())
    .filter((w) => w.length >= MIN_WORD_LEN)
    .sort((a, b) => b.length - a.length);
}

// Length-preserving leet normaliser, so an index found in the normalised text is valid in the original text.
// Donor de1337 (MessageFilter 364-391) also maps y, l, j, v, z, 6, 9 and more; those are left out here (see section 6).
const LEET: Array<[string, string]> = [
  ['13', ' b'], ['ph', ' f'], ['vv', 'w '], ['3', 'e'], ['7', 't'], ['4', 'a'], ['@', 'a'],
  ['0', 'o'], ['5', 's'], ['1', 'i'], ['9', 'g'], ['6', 'g'],
];

function normalise(s: string): string {
  let out = s.toLowerCase();
  for (const [from, to] of LEET) out = out.split(from).join(to); // literal replace, no regex
  return out;
}

function mask(text: string, start: number, len: number): string {
  return text.slice(0, start) + '*'.repeat(len) + text.slice(start + len);
}

export interface FilterResult { text: string; hits: string[]; failed: boolean; }

// Pipeline: goodwords shielded first, then literal badwords, then the leet pass, then goodwords restored.
// Fail closed: any error returns a neutral placeholder instead of the raw text.
export function filterText(raw: string, bad: string[], good: string[]): FilterResult {
  try {
    const hits: string[] = [];
    let msg = raw;

    // 1. Goodwords (whitelist): mask in place and remember the original text by index.
    const saved = new Map<number, string>();
    for (const g of good) {
      let i = msg.toLowerCase().indexOf(g);
      while (i !== -1) {
        saved.set(i, msg.slice(i, i + g.length));
        msg = mask(msg, i, g.length);
        i = msg.toLowerCase().indexOf(g);
      }
    }

    // 2. Badwords, literal match, longest first. Each hit is masked with the same number of stars.
    for (const b of bad) {
      let i = msg.toLowerCase().indexOf(b);
      while (i !== -1) {
        hits.push('badword:' + b);
        msg = mask(msg, i, b.length);
        i = msg.toLowerCase().indexOf(b);
      }
    }

    // 3. Leet pass: normalise both sides, mask hits in the original text.
    for (const b of bad) {
      const nb = normalise(b);
      let i = normalise(msg).indexOf(nb);
      while (i !== -1) {
        hits.push('leet:' + b);
        msg = mask(msg, i, b.length);
        i = normalise(msg).indexOf(nb);
      }
    }

    // 4. Restore goodwords at their saved indices (masks kept every length, so the indices still line up).
    for (const [i, original] of saved) {
      msg = msg.slice(0, i) + original + msg.slice(i + original.length);
    }
    return { text: msg, hits, failed: false };
  } catch {
    return { text: '[filtered]', hits: ['error'], failed: true };
  }
}

function isMuted(mute: MuteRow | null, nowMs: number): boolean {
  if (!mute || mute.expiresMs === 0) return false;
  if (mute.expiresMs === -1) return true;
  return mute.expiresMs > nowMs;
}

export interface ChatRoute {
  delivery: Delivery;
  text: string;
  notice: string | null;   // sent back to the sender only, and only for a visible (non-shadow) mute
  logged: boolean;         // restricted chat is never written to the chat log
}

// Gate order: mute and tutorial/baby-mode first; restricted text skips the filter (as in donor ChatHandler 34-38)
// and goes to staff only; ordinary text is filtered and goes to everyone.
export function routeChat(sender: ChatSender, raw: string, bad: string[], good: string[], nowMs: number): ChatRoute {
  const muted = isMuted(sender.mute, nowMs);
  const restricted = (muted || sender.tutorial || sender.babyMode) && !sender.staff;

  let notice: string | null = null;
  if (muted && sender.mute && !sender.mute.shadow) {
    notice = sender.mute.expiresMs === -1 ? 'You have been permanently muted.' : 'You have been temporarily muted.';
  }

  if (restricted) {
    return { delivery: 'staff-only', text: raw, notice, logged: false };
  }
  const filtered = filterText(raw, bad, good);
  return { delivery: 'everyone', text: filtered.text, notice, logged: true };
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/ct005-open-rsc-chat-filter.ts` (copy of `/private/tmp/p2/wave2-haiku/batch3/CT005/work/open-rsc-chat-filter.ts`): exit 0.

## 5. Lands in

- TARGET `origins/server/chat-filter.ts` (new; the chat writer's intake gate and word filter, server side). Not in src/fight.
- Parity row 5 (controls/input; the intake sub-line). No parity row in the addendum covers chat. Row 5 is the nearest because the gate runs on the incoming payload. Strategy should confirm or add a chat row.
- Today: Frankendom's own chat code was not read for this note. This note does not name a current file.
- Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
- Brief rule served: chat as presence messages through the writer (TOPICS-FOCUS3 CT rule); the filter and the mute gate run on the server, never in the client.

## 6. Gaps and risks

- AGPL-3.0: clean-room only. The sketch is written from the mechanism.
- No chat-line rate limit was found. Only the global cooldown (off by default, default.conf:188) and the report cooldown exist. Frankendom needs a per-player line limit for public chat, with a moderator exemption.
- Defect (regex): `replaceFirst` (MessageFilter.java:190) uses the user's own text as a regex. A goodword that contains a regex character can mask the wrong text or throw, and the throw turns the whole line into `Cabbage` (277). Fix: index-based mask (sketch step 1).
- Defect (over-broad leet): `de1337` maps y, l and j onto i (376-378), z onto s (383) and v onto u (387). Ordinary words are masked. Fix: map digits and symbols only (sketch table).
- Defect (goodword shield is exact-only): the goodword match is a lowercase substring (185-186). A leet-spelled goodword is not shielded, so a badword inside it is masked. Fix: shield the normalised form too (not built in the sketch).
- Defect (memory): the snapshot deque is a `LinkedList` (World.java:137) that gets an entry for every public, private and global line (ChatHandler.java:81; FriendHandler.java:190, 195; RegularPlayer.java and Admins.java call sites). The only clear is at world unload (World.java:471). Nothing trims it in the code read. Fix: a bounded 60 s window or a TTL'd row. Frankendom: chat log as rows with expiry, through the writer.
- Risk (one-click permanent mute): a moderator with the suggest-or-mute byte silences the reported player forever with one report (ReportHandler.java:85-87). Fix: a timed mute, plus a second staff check before a permanent mute.
- Risk (filter has side effects): the filter calls Discord (MessageFilter.java:175-177, 265-268, 273-274). It is not pure. Fix: emit a hit row instead.
- Risk (stale mute flags): offline mutes call `persistOfflineMute` without the shadow flag (PlayerModerator.java:300-316; the body was not read). Shadow status for offline players is unverified.
- Risk (staff see restricted text unfiltered): restricted lines skip the filter (ChatHandler.java:34-38) and staff receive the raw text (GameStateUpdater.java:739). The donor accepts this. Frankendom must decide (ruling 3).
- Risk (two copies of the privacy setting): the setting is in a byte array and in a cache key (PlayerSettings.java:46-64). Fix: one row per player.
- Ruling against Frankendom: one ledger. The chat log is a side table here (the `Chatlog` deque and the `ChatLog` query). Frankendom: chat lines are presence messages through the writer, not a second store.

## 7. As-data shape

- Word lists are text files, one word per line: `badwords.txt`, `goodwords.txt`, `alertwords.txt`, loaded from the working directory (MessageFilter.java:40, 59, 78). Each word is lowercased and kept if its length is at least 3 (44, 63, 82).
- Row fields, word list: `word: string` (lowercase, length >= 3); `list: enum {bad, good, alert}`; `exact: bool` (alert only; true when wrapped in double quotes, 156).
- Row fields, mute: `player_id: int`; `expires_ms: int` (0 none, -1 forever, else epoch ms); `shadow: bool`; `scope: enum {regular, global}`. The donor writes a regular mute to both scopes (Player.java:1358-1360).
- Row fields, report: `reporter_id`; `target_name: string`; `reason: int` (code from Constants.java:146-190); `suggests_or_mutes: byte`; `at_ms: int`; `chatlog: text` (60 s of the target's lines, GameReport.java:45).
- Config keys (default.conf): `server_sided_word_filtering`, `server_sided_word_space_filtering`, `global_message_cooldown`, `global_message_total_level_req`, `global_message_reading_total_level_req`, `baby_mode_level_threshold` (ServerConfiguration.java:496).
- A new bad word is one row: yes (one text line; no code change).
- A new report reason is one row: partly. The row is one entry in the reason map (Constants.java), but whether it needs the speech check is decided by a hard-coded list of numbers (ReportHandler.java:37), so a new exempt reason needs code. Fix: a flag on the reason row.
- A new mute tier (for example, a timed chat-only mute): no. It needs a new scope value and a new branch in the gate.

## 8. Provenance

- Donor repo: Open-RSC-Core-Framework (`/mnt/frankendom-donors/Open-RSC-Core-Framework`).
- Licence: `LICENSE` in the donor root, GNU Affero General Public License v3. Class: copyleft. Shape only; the contract (word files, reason strings) may not be copied.
- Per claim: the filter, gate and report facts come from ChatHandler.java, MessageFilter.java, ReportHandler.java, Player.java, PlayerModerator.java, GameStateUpdater.java, FriendHandler.java, PlayerSettings.java, Constants.java, World.java and GameReport.java, all under `/mnt/frankendom-donors/Open-RSC-Core-Framework/server/` (PlayerModerator.java is under `server/plugins/`). The line numbers are in the receipts file.

## 9. What they patched later

- No git history on the donor box (`git log` reports "not a git repository"). Hidden rules are recorded in code comments only:
- MessageFilter.java:95: "Longest words must go first to match first before being censored" (longest-first order was a fix).
- MessageFilter.java:216-217: "avoid false flags" (the goodword pass on the leet copy exists to stop false hits).
- PlayerModerator.java:303-306: an offline regular unmute left a stale `global_mute`, and the fix mirrors the regular write to the global key.
- Player.java:254: the comment reads "Time last report was sent, used to throttle reports". It states the purpose only; no reason for the change is recorded.
- ReportHandler.java:36 and 52 (comments): line 36 says the speech exemption covers "botting or bug exploiting; 'other' or impersonating jagex staff", and line 52 says the newest-first snapshot check is "needed in case there is not a message in the queue older than 1 minute". Neither records a dated change.
- ChatHandler.java:55-57: a comment says possessed-entity chat is sent by the possessed entity; the branch for players checks `isAdmin()`. No history is recorded.

## 10. Rulings for Dom

1. Public chat per-line limit: do we add one (proposed 1 line per 1.5 s for non-staff, staff exempt)? Recommendation: yes; the donor has none.
2. Report-to-mute: should a single moderator report ever trigger a permanent mute? Recommendation: no; timed mute (60 min) pending a second staff check.
3. Restricted-line staff view: should staff see muted and tutorial lines unfiltered, as the donor does? Recommendation: yes for staff only, and log the view.

Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
Brief rule served: chat as presence messages through the writer (TOPICS-FOCUS3 CT rule); server-side only.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
- All spot checks held (ChatHandler order, MessageFilter, ReportHandler, mute handling, GameStateUpdater, snapshots, config lines, AGPL-3.0).
- Missed (not edited into the note): the goodword regex defect also occurs at MessageFilter.java:218 (de1337edMessage.replaceAll treats goodwords as regex), not only line 190.
- Missed: online unmute (PlayerModerator 318-328) never clears the shadow flag (setShadowMute only in the mute branch, 341), so a later mute can inherit a stale shadow.
- Leet-pass hit index taken from the de1337 copy is safe only because de1337 is length-preserving (the note already says so).
