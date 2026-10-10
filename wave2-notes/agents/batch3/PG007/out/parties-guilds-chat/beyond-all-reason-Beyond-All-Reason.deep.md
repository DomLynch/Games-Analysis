# beyond-all-reason-Beyond-All-Reason (parties-guilds-chat, cell 1)

Donor: `/mnt/frankendom-donors/beyond-all-reason-Beyond-All-Reason/luaui/Widgets/api_ignore.lua` (with `gui_chat.lua` in the same folder) | Licence: GNU GPL v2 or later (both widget headers: api_ignore.lua line 9, gui_chat.lua line 9; repo LICENSE.md says GPL v2) | Lua | symbol `ignoreAccount`, `isPlayerIgnored`

Checked: Read `api_ignore.lua` in full (188 lines). In `gui_chat.lua` (4911 lines) read the channel prefix parser (1396-1404), the channel mapping (1486, 1490), the arrival check and flag path (1748, 722-735, 851), the drawing filter (2791), and the one-second ignore sync (2060, 2083, 2118-2141). Not read: chat drawing and history layout, the spectator-filter settings block (2143-2185, read only in part), and the engine side (I did not check whether the engine itself withholds messages from muted players). Confidence: high on the mute list and its API; medium-high on the chat sync (the nesting inside the one-second block is read from indentation, the block's closing line was not checked). Not a camera cell (`camera_scope` not applicable). No Frankendom repo checks were made for section 5.

Best transferable idea: Store a mute as a stable account-ID key with the name as an alias, and hide a muted player's lines instead of deleting them so unmute restores them.
Decision (proposed): adapt — The donor filters only on the client; Frankendom's one-ledger ruling needs the mute stored once on the server with a per-viewer filter, but the keying and hide-not-delete shape transfer.
Acceptance: Server test: after A mutes B, A's chat snapshot omits B's lines in every channel; after unmute the same snapshot includes them again and the server channel log is unchanged (no line deleted).

## 1. Mechanism

- The mute list (called the ignore list) is a table of ignored players keyed by stable account ID, with the display name as value (`api_ignore.lua` line 20). A second table, `ignoredAccountsAndNames`, is indexed by account ID and by name (line 21), so a player can match by either key.
- Adding: `ignoreAccount` (59-94). An account ID is accepted only when it is in the current game's `validAccounts` (line 62). The display name is resolved and stored under the ID and under the name (lines 70-82). If the ID is unknown, the function falls back to the player name alone (lines 89-91).
- Toggle: `toggleignoreCmd` (116-126) handles each parameter: it unignores when the ID or name is already in the set, otherwise it ignores. It is bound to the action `toggleignore` (line 150).
- Persistence: `GetConfigData` writes the set into widget config (171-174); `SetConfigData` restores it and clears empty keys (176-188).
- Map draws: `MapDrawCmd` returns true for a draw from an ignored player, except `erase` (163-169). The widget description says it blocks map draw commands from ignored players (line 6).
- Chat channel: each chat line's channel comes from a text prefix. `Allies: ` gives TEAM, `Spectators: ` gives SPEC, `Private: ` gives PRIVATE, and anything else is ALL (`gui_chat.lua` 1396-1404; the scope mapping is at 1486 and 1490).
- Arrival: a line whose sender name is in the set is passed to `addChatLine` with `ignore` set (1748-1749; the parameter is at 722-729). The record keeps `ignore = ignore` (851). The line is stored, not dropped, and the draw path skips lines with `ignore` set (2791).
- Sync: `widget:Update` (2060) runs a one-second block (`if uiSec > 1 then`, 2083). Inside it (by indentation), the chat widget compares its last copy of the set with the API's `WG.ignoredAccounts`. Each key no longer in the set clears the `ignore` flag on lines with that `playerName` (2121-2127, `ignore = nil`). Each key newly in the set sets the flag on matching lines (2132-2138, `ignore = true`). Then the local copy is replaced (2141).
- Order of operations for a new mute: the API set changes at once (`ignoreAccount`). Map draws from that player stop at the next draw call (`MapDrawCmd` checks the set on each call). Chat lines already on screen are hidden at the next one-second tick. New chat lines are checked when they arrive (1748). Unmuting clears the flag, so old lines reappear, because they were never removed.

## 2. Key functions

- `ignoreAccount`: `api_ignore.lua` 59-94. ID path 60-85; name-only fallback 86-92.
- `unignoreAccount`: `api_ignore.lua` 96-114. Clears the ID and name keys.
- `toggleignoreCmd`: `api_ignore.lua` 116-126. Toggle per parameter.
- `isPlayerIgnored`: `api_ignore.lua` 128-136. Account ID or name first (131-132), then the display-name lookup (134-135).
- `MapDrawCmd`: `api_ignore.lua` 163-169. Erase is exempt (165).
- `extractChannelPrefix`: `gui_chat.lua` 1396-1404.
- `addChatLine` signature: `gui_chat.lua` 722-735 (body partly read: the `ignore` record at 851).
- Ignore sync: `gui_chat.lua` 2060 (`widget:Update`), 2083 (one-second gate), 2118-2141 (diff and copy).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Mute keyed by a stable account ID, name kept as an alias; ID accepted only for a player in this match | None (rule) |
| Hide, do not delete: the record keeps a flag, so unmute restores the history | None (rule) |
| Diff the old set against the new set and flip only the lines whose state changed | Poll interval 1 s (`uiSec > 1`, `gui_chat.lua` 2083) |
| Channel from a text prefix, default ALL | Prefixes `Allies: ` (8 characters), `Spectators: ` (12), `Private: ` (9) (`gui_chat.lua` 1397, 1400-1402 region; the three prefix tests are read) |

## 4. TypeScript sketch

simplified: the sketch keeps the account-keyed set with name aliases, the hide-by-flag record, the diff sync and the one-second gate. It reorders in two places: the donor's arrival check uses the name only (1748), while the sketch checks both keys; and the donor's per-key loops become a per-line check (same result for muted keys). It omits the persisted config, the I18N echo messages, the spectator-hide rule (1388), the erase exemption and the map-draw path, the team-colour and player-name services, and the donor's rule that a line loses its flag on any unmute even if another reason set it.

```ts
// Licence: GNU GPL v2 or later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Key = string; // "acc:<accountId>" or "name:<playerName>"

type Scope = "ALL" | "TEAM" | "SPEC" | "PRIVATE";

interface ChatLine {
  keys: Key[];      // the sender's keys: account id (when known) and name
  scope: Scope;
  text: string;
  hidden: boolean;  // hidden, never deleted: unmuting shows the history again
}

// The channel comes from a prefix on the raw line; no prefix means ALL.
function parseLine(raw: string): { scope: Scope; text: string } {
  if (raw.startsWith("Allies: ")) return { scope: "TEAM", text: raw.slice(8) };
  if (raw.startsWith("Spectators: ")) return { scope: "SPEC", text: raw.slice(12) };
  if (raw.startsWith("Private: ")) return { scope: "PRIVATE", text: raw.slice(9) };
  return { scope: "ALL", text: raw };
}

class MuteList {
  private keys = new Set<Key>();

  constructor(private inGame: Set<number>) {}

  // An account id is used only for accounts present in this game; the name is always added as an alias.
  mute(accountId: number | null, name: string): void {
    if (accountId !== null && this.inGame.has(accountId)) this.keys.add(`acc:${accountId}`);
    if (name !== "") this.keys.add(`name:${name}`);
  }

  unmute(accountId: number | null, name: string): void {
    if (accountId !== null) this.keys.delete(`acc:${accountId}`);
    if (name !== "") this.keys.delete(`name:${name}`);
  }

  isMuted(keys: Key[]): boolean {
    return keys.some((k) => this.keys.has(k));
  }

  snapshot(): Set<Key> {
    return new Set(this.keys);
  }
}

// Diff the mute set between two checks and flip only the lines whose state changed.
function resyncHidden(log: ChatLine[], before: Set<Key>, after: Set<Key>): void {
  for (const line of log) {
    const wasMuted = line.keys.some((k) => before.has(k));
    const isMuted = line.keys.some((k) => after.has(k));
    if (!wasMuted && isMuted) line.hidden = true;       // newly muted: hide the history
    else if (wasMuted && !isMuted) line.hidden = false; // unmuted: show it again
  }
}

class ChatView {
  private acc = 0;
  private snap: Set<Key>;

  constructor(private log: ChatLine[], private mutes: MuteList) {
    this.snap = mutes.snapshot();
  }

  // New lines are checked once on arrival.
  receive(line: ChatLine): void {
    line.hidden = this.mutes.isMuted(line.keys);
    this.log.push(line);
  }

  // Runs in the UI update, but the mute diff is checked once per second, not per frame.
  update(dt: number): void {
    this.acc += dt;
    if (this.acc <= 1) return;
    this.acc = 0;
    const now = this.mutes.snapshot();
    resyncHidden(this.log, this.snap, now);
    this.snap = now;
  }

  visible(): ChatLine[] {
    return this.log.filter((l) => !l.hidden);
  }
}
```

## 5. Lands in

- TARGET `origins/server/social-chat.ts` (new, proposed; not checked against the Frankendom repo). The mute list and per-viewer filter are social state, so they belong in a server module outside `src/fight`.
- today: none (no chat or mute module was checked in Frankendom).
- Parity row: row 14 (HUD) is the nearest row, and it fits only the client panel that hides lines. No row in 1-23 covers server-side chat routing or mute enforcement, so that half has no parity row (none).
- Reuse tag: rewrite-from-idea (GPL v2 or later; clean-room only; the sketch is written from the mechanism)
- Brief rule served: one ledger (the mute set is stored once, on the server, and each view is derived from it); HUD client-only (the chat panel is a view)

## 6. Gaps and risks

- The donor only hides lines in the client. Its own code does not stop the engine or a modified client from receiving them (engine side not checked). Frankendom must filter on the server before a message leaves it.
- The donor matches by name on arrival (1748) and by ID elsewhere. A name can be reused, so the Frankendom version should key by account ID only and use the name for display.
- The donor hides old lines on a one-second poll, so a muted player's earlier lines can show for up to a second. Frankendom's state is server-verified; the view should update on the change, not on a timer.
- The mute set is stored in each client's config (171-188). Frankendom's one-ledger rule means the mute belongs to the account on the server, so it follows the player across devices.
- Map-draw gating has no obvious Frankendom counterpart. Only the per-sender gate transfers.
- The spectator-hide rule (1388) is a separate setting. Do not merge it into the mute list.
- Not read: how the engine delivers chat, and the history draw path.
