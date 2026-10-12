# smogon-pokemon-showdown (spectator-coach-wagers-replays, cell 1)

Donor: `/mnt/frankendom-donors/smogon-pokemon-showdown/sim/battle.ts` (with `sim/battle-stream.ts`, `server/sockets.ts`, `server/room-battle.ts`, `server/rooms.ts`, `server/replays.ts`) | Licence: MIT (LICENSE line 1: "The MIT License (MIT)"; code may be adapted) | TypeScript | symbol `extractChannelMessages`

Checked: Read in full: `extractChannelMessages` (sim/battle.ts 35-56), `addSplit` (3081-3089), `add()` closure path (3093-3110, read to the `addSplit` call), `sendUpdates` (3265-3272), `getPlayerStreams` (sim/battle-stream.ts 396-440), `BattleStream` replay branch (battle-stream.ts 56-66), socket channel handlers (server/sockets.ts 125-126, 228-268), seat channel logic (server/room-battle.ts 120-160). Read in part: saved-replay code (server/rooms.ts 1960-2081; the function's later lines not read), replay row type (server/replays.ts 29-50). Test file read in part (test/server/sockets.js 1-30, 195-215). Confidence: high on the split-log mechanism (receipts verified, sketch typechecked); medium on the replay branch. Coach, wager and coached-fight pricing: grep for `coach`, `wager`, `betting`, `\bbet\b` over `server/`, `sim/`, `lib/` found no code (the `bet` hits were words like "better"; not read individually). Not read: the client, `test/` beyond the lines above, the lobby list (server/rooms.ts 1602-1611 seen in grep only).

Best transferable idea: write each fight event once with a private version for one seat and a shared version for everyone else, then let the server pick each viewer's channel, so spectators, a coach and the owner all read one record and no client chooses what it sees.
Decision (proposed): adapt - take the one-record-many-views shape and the server-set viewer channel; drop the text protocol, and key channels by role (spectator, coach, combatant), not by seat number. Frankendom has one ledger and server-verified kills, and the donor's channel is set by the server (room-battle.ts 143), which fits.
Acceptance: A Pit bout test with a coach seat asserts that the spectator view contains no coach-only line, the coach view contains it, and the owner/debug view contains both.

## 1. Mechanism

- One log, two versions per event. An event that viewers must see differently is written with `addSplit` (sim/battle.ts 3081-3089): a header `|split|<side>`, then the secret line for the owner, then the shared line; if there is no shared version it pushes an empty line (3087). `add()` with closure parts (3102 calls `part()` and collects a secret and a shared string per part) builds both versions from one call.
- Flush. `sendUpdates` (3265-3272) sends the unsent slice of the log as one `update` and moves `sentLogPos` to the end. It runs at the end of each `BattleStream` write (sim/battle-stream.ts:46) and when more than 500 lines are pending (sim/battle.ts:3027, commented in the donor as "workaround for tests"). Other callers at battle-stream.ts 171 and 174 (not read).
- Per-viewer streams. `getPlayerStreams` (battle-stream.ts 396-440) runs `extractChannelMessages(data, [-1, 0, 1, 2, 3, 4])` once per update (435). The omniscient stream gets channel -1 (436), the spectator stream gets channel 0 (437), and the seat streams p1-p4 take channels 1-4 the same way.
- The split rule (`extractChannelMessages`, sim/battle.ts 35-56). Regex (33) matches either a three-line split block or a single line. An unsplit line (player 0) goes to every requested channel. For a split, the line is the secret text when the channel is -1 or equals the split's seat, otherwise the shared text (51). An empty result is skipped (52), so a viewer gets nothing for an event that has no version for it.
- Live room. `server/sockets.ts` `:` handler (249-268): one extraction for channels 0-4 (261), then each socket in the room gets the text for its channel (default 0, line 264). The channel is set by the server, not the client: the `.` handler (229-248) applies it (`channelid === 0` removes the entry, 243-246), and the message arrives from the main process over the worker stream (126). Only `server/room-battle.ts` calls `Sockets.channelMove`: on seat join (143), in `updateChannel` (158), and on seat destroy with channel 0 (151).
- Saved replay. `server/rooms.ts` 2066-2069: `hideDetails` is true unless the format is a custom game; a team format that has ended sets it false (2067). The saved log is channel 0 when hidden, else channel -1 (2069). Visibility: `isPrivate` from the room settings or `hideReplay` (2076). The save code is 10 for autosave (2077), 2 for punishment or unlisted (2078), 1 for private (2079), otherwise 0 (2080, no receipt). Stored row values: 0 public, 1 private, 2 "NOT USED" (replays.ts 43), 3 deleted, 10 autosaved (replays.ts 41-47). A save code 2 is stored as private 1 with the password cleared (replays.ts 86-88, read in part: the `if` at 86 is the else branch of the password-generation check at 83).
- Playback. A `BattleStream` in replay mode (sim/battle-stream.ts 59-66): `'spectator'` replay keeps only channel 0 (61-62); any other replay value keeps channel -1 (the else branch, 64-65).

## 2. Key functions

- `extractChannelMessages`: `/mnt/frankendom-donors/smogon-pokemon-showdown/sim/battle.ts` 35-56 (the rule above).
- `addSplit`: `/mnt/frankendom-donors/smogon-pokemon-showdown/sim/battle.ts` 3081-3089; `add()` closure path 3093-3110.
- `sendUpdates`: `/mnt/frankendom-donors/smogon-pokemon-showdown/sim/battle.ts` 3265-3272.
- `getPlayerStreams`: `/mnt/frankendom-donors/smogon-pokemon-showdown/sim/battle-stream.ts` 396-440.
- Live fan-out and channel map: `/mnt/frankendom-donors/smogon-pokemon-showdown/server/sockets.ts` 229-268 (`.` handler 229-248, `:` handler 249-268) and `channelMove` at 125-126.
- Seat channel: `/mnt/frankendom-donors/smogon-pokemon-showdown/server/room-battle.ts` 122 (channelIndex), 143, 151, 158.
- Saved replay log choice: `/mnt/frankendom-donors/smogon-pokemon-showdown/server/rooms.ts` 2066-2081.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| One event, shared and private versions, one log | Five channels: owner -1, public 0, seats 1-4 (`ChannelID`, sim/battle.ts:29) |
| Flush the unsent slice, move the pointer | Forced flush above 500 pending lines (sim/battle.ts:3027; comment says test workaround) |
| Viewer picks its text by channel | Channel = seat number (room-battle.ts:122); multi-battle maps seats 3 and 4 to 1 and 2 (same line; see gaps) |
| Empty text is skipped | Rule (sim/battle.ts:52) |
| Saved replay shows less than the live log | Hidden unless custom game; team formats show full log after end (rooms.ts 2066-2067) |
| Replay visibility | Save codes 10 autosave, 2 punishment or unlisted, 1 private, 0 otherwise (rooms.ts 2077-2080); stored values 0, 1, 3 deleted, 10 autosaved (replays.ts 41-47); save code 2 becomes stored private 1 with no password (replays.ts 86-88) |

## 4. TypeScript sketch

simplified: typed entries replace the `|split|pN` text protocol and its regex, so there is no string parse. The sketch keeps the donor order (one event added once, one batch flushed, then each channel reads its own text with the same secret / shared / empty rule). It omits the `update` batching and socket layer, the channel map, the replay modes, the debug log, and the multi-battle mapping. Nothing is reordered. Typechecked on the VPS (`tsc --noEmit --strict --target es2020`, exit 0).

```ts
// Licence: MIT (donor, LICENSE line 1). Own code, shape taken from sim/battle.ts 33-56 and 3081-3110.
// clean-room
type Channel = -1 | 0 | 1 | 2 | 3 | 4; // -1 owner/debug view, 0 public (spectators), 1-4 one seat each
type Seat = 1 | 2 | 3 | 4;

type LogEntry =
	| { kind: 'public'; line: string }
	| { kind: 'split'; seat: Seat; secret: string; shared: string };

class FightRecord {
	private entries: LogEntry[] = [];
	private sentUpTo = 0;

	addPublic(line: string): void {
		this.entries.push({ kind: 'public', line });
	}

	// One event, two versions: a private line for one seat (and the owner view) and a shared line
	// for everyone else. An empty shared line means other viewers see nothing for this event.
	addSplit(seat: Seat, secret: string, shared: string = ''): void {
		this.entries.push({ kind: 'split', seat, secret, shared });
	}

	// Entries appended since the last flush; the caller sends this batch to every viewer.
	flush(): LogEntry[] {
		const batch = this.entries.slice(this.sentUpTo);
		this.sentUpTo = this.entries.length;
		return batch;
	}

	// Text one channel sees in a batch. The owner view (-1) sees every secret line; a seat sees its own
	// secret line; spectators (0) and other seats see the shared line; empty results are skipped.
	viewFor(channel: Channel, batch: LogEntry[]): string {
		const out: string[] = [];
		for (const entry of batch) {
			if (entry.kind === 'public') {
				out.push(entry.line);
				continue;
			}
			const line = channel === -1 || entry.seat === channel ? entry.secret : entry.shared;
			if (line) out.push(line);
		}
		return out.join('\n');
	}
}

// Usage shape only: one event is added once, the batch is flushed once, then each viewer reads its own text.
const record = new FightRecord();
record.addPublic('hit: duelist A lands a strike');
record.addSplit(1, 'stamina: 42', 'stamina: low');
const batch = record.flush();
const coachView = record.viewFor(1, batch);     // seat 1 sees "stamina: 42"
const spectatorView = record.viewFor(0, batch); // spectators see "stamina: low"
const ownerView = record.viewFor(-1, batch);    // owner view sees "stamina: 42"
export { coachView, spectatorView, ownerView };
```

## 5. Lands in

- TARGET `src/fight/record.ts` (new module: one fight record with per-viewer views; the Pit and the zones read a view, they do not own the record). Parity-checklist row 19 (fight record / replay). A coach seat is a role channel on the same record; the server sets it on connect, as the donor does (room-battle.ts 143).
- Donor's replay rule (saved log is the public view unless the format says otherwise) is a data choice for Frankendom: a per-mode field, not a constant.
- Reuse tag: adapt-idea (MIT: code may be adapted; this sketch is own code written from the shape)
- Brief rule served: one ledger (one record, many views); the server decides what each viewer gets; the client renders only the view it is sent.

## 6. Gaps and risks

- Coach, wager and coached-fight pricing do not exist in this donor (grep over server/, sim/, lib/ found none). Only the spectator and replay side transfers. The coach role in Frankendom is our design on top of the seat channel, not a donor mechanism. No wager or pricing is taken from this donor.
- Lobby shape not read in full. Seen in grep only: server/rooms.ts 1602-1611 filters room listings by `isPrivate` (`hidden`, `voice`). Not a fighting-game lobby.
- The donor's channel is the seat number. Frankendom's ruling is MAX_ATTACKERS = 3 (one hero plus up to three attackers = four combatants), which fits the donor's four seat channels, but a spectator and a coach are roles, not seats. Key channels by role or the seat count will not scale.
- Multi-battle mapping (open question, not run): server/room-battle.ts 122 maps seat 3 to channel 1 and seat 4 to channel 2. By the rule at sim/battle.ts 51, a split for seat 3 reaches channel 1 only as the shared text, so as read, seat 3 does not get its own secret lines. I found no test for this; test/server/sockets.js (grep for channel/split) covers extraction, channelMove and fan-out. Do not copy the seat-to-channel mapping until this is checked.
- Defect: server/sockets.ts 265 tests the cached text with truthiness, so an empty channel text is re-joined for every socket. Performance only. Fix: test `=== undefined`.
- Risk: the split is a three-line text block. Any writer that bypasses `addSplit` and writes a split header without its third line would fall through to the single-line alternative in the regex (33), and the secret would be sent as public text. The donor relies on `addSplit` always pushing three entries (3082-3087). Fix for Frankendom: typed entries, so there is no text to mis-parse.
- Replay content: the donor saves the public view for most formats and the full view only for custom games and ended team formats (rooms.ts 2066-2069). Frankendom must decide what a saved Pit bout holds. Fix: make it a data field per mode, default public, with the full record kept for debug.
- The 500-line flush (sim/battle.ts:3027) is commented as a test workaround. Do not treat it as a tuned budget.
- Not read: the test file beyond the lines above, the client renderer, and the rest of the saved-replay function (rooms.ts after 2081).
