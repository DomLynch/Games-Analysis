# lichess-org-mobile (parties-guilds-chat, cell 18)

Donor: `/mnt/frankendom-donors/lichess-org-mobile/lib/src/model/relation/online_friends.dart` (with `lib/src/view/user/player_screen.dart` 25-33 for the watch wiring, and `lib/src/model/relation/relation_repository.dart` 33-36) | Licence: GNU GPL v3 (LICENSE header read, line 1: "GNU GENERAL PUBLIC LICENSE", version 3, 29 June 2007) — copyleft, clean-room, shape only | Dart | symbol `OnlineFriends` (`build`, `startWatchingFriends`, `stopWatchingFriends`, `_handleSocketTopic`, `_parseFriendsList`)

Checked: `online_friends.dart` read in full (1-136, depth full). `player_screen.dart` 18-36 read (the only caller of start and stop, found by grep across `lib`). `friend_list_sort.dart` read in full (1-21): UI enum only, no sort code. `relation_repository.dart` read in full (1-64). The hint file `lib/src/model/chat/chat.dart` (71 lines) was read: it defines chat option types only, no mechanism. `lib/src/model/chat/chat_mixin.dart` (1-229) was read in full and holds a real chat read-state mechanism (unread count from a persisted read watermark, own messages do not raise unread, troll messages shown only to their author, private chats play a sound). It is not written up here because this cell is the friend-list sync; it is a candidate for its own note under a chat cell. Not read: the socket layer (`SocketClient`, `connectedStream`, `isActive`), `UserId.fromUserName`, the server side of `following_onlines`, and the friend screen UI beyond its provider use (`friend_screen.dart` 57, 223, 281). Confidence: high on the client sync rules; I cannot say what the server pushes while a screen is paused. Camera_scope: not applicable.

Best transferable idea: Keep the online-friends list by taking a full snapshot whenever the screen regains focus or the socket reconnects, then applying small enter, leave and playing deltas only while the screen is listening.
Decision (proposed): adapt — take the snapshot-on-resume and snapshot-on-reconnect rule for Frankendom's friend list, but key every delta by user id and make enter idempotent (the donor appends without a check); presence stays a view and is never an input to a fight, kill or loot rule.
Acceptance: Server test: after a forced disconnect and reconnect the client list equals the server snapshot with no duplicate ids, and an enter event for an id already in the list leaves the list unchanged.

## 1. Mechanism

- State: one list of online friends, each with a user, a display name, an optional title, a patron colour and a `playing` flag (`online_friends.dart` 11, 109-119, 121-135). The list starts empty (48).
- Build (25-49): register a dispose hook (26-29), open the presence socket (31), subscribe to its stream (34) and to its connected event (37-40). The connected event sends `following_onlines` again. If the socket is already active, the snapshot is requested at once (42-43); otherwise the socket connects (45).
- Watch control (51-69). `startWatchingFriends` re-attaches both listeners (52-58) and reconnects or requests a snapshot (59-63). `stopWatchingFriends` cancels both listeners (67-68) and sends nothing to the server. The list is kept in state. The only callers in `lib` are the players screen's focus callbacks (`player_screen.dart` 25-33): focus gained starts watching, focus lost stops it (only if the context is still mounted, 30).
- Event handling (71-105), each event applied to the current list:
  - `following_onlines`: the whole list is replaced by the snapshot (76-77). This is the resync.
  - `following_enters`: the friend is appended with its `playing` flag (79-83). No check for an id already in the list.
  - `following_leaves`: the entry with that user id is removed (85-87).
  - `following_playing` and `following_stopped_playing`: the flag is set on the entry with that user id; other entries are unchanged (89-103).
  - Any event after the provider is disposed is dropped (72).
- Snapshot parsing (121-135): names come in as `TITLE name` or `name`; only the first two words are used (109-119). A patron colour is used only when the colour array is the same length as the friend array, and a value of 0 means not a patron (125-130). `playing` is set when the user id appears in the snapshot's playing array (124, 132).
- Order: nothing is buffered. While stopped, deltas are not seen, and the list is out of date until the next snapshot. Each resume and each reconnect requests a full snapshot, so the list is corrected by replacement, not by replaying missed deltas.
- Tick: none. The sync is event-driven on the socket.

## 2. Key functions

- `OnlineFriends.build`: `/mnt/frankendom-donors/lichess-org-mobile/lib/src/model/relation/online_friends.dart` 25-49. Subscribes, requests the snapshot on open and on reconnect.
- `OnlineFriends.startWatchingFriends` / `stopWatchingFriends`: same file, 51-69. Attach and detach; the snapshot is requested again on resume.
- `OnlineFriends._handleSocketTopic`: same file, 71-105. The delta rules: replace, append, remove by id, flag by id.
- `OnlineFriends._parseFriendsList`: same file, 121-135. Snapshot to list, with the patron-colour length guard and the playing set.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Full snapshot replaces the list on every resume and reconnect | None (the rule) |
| Deltas keyed by user id: remove, set flag | None |
| Enter appends with its flag (no duplicate check) | None |
| Patron colour used only when the colour array matches the friend array; 0 means none | 0 = not a patron (theirs, `online_friends.dart` 130) |
| Recent following carousel limit | 10 (theirs, `relation_repository.dart` 35; a different call, not the online list) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's rules: a snapshot replaces the list, enter appends, leave and playing act by id, deltas are dropped while not listening, the snapshot is requested again on resume and on reconnect (only while listening), and the patron-colour length guard. It differs in these ways: the donor subscribes at build time, so it receives events from the moment the provider exists, while the sketch starts paused and listens only after `resume()`; the donor's id comes from `UserId.fromUserName` (not read), and the sketch uses the lowercased name; the donor's socket layer is replaced by a `send` callback; the donor's `mounted` guard is folded into the listening flag; and the donor's `playing` on enter comes from `event.json`, which the sketch passes in directly.

```ts
// Licence: GPL-3.0 (donor LICENSE). Clean-room: shape only, written from the described rules, not a translation.
// clean-room
interface Friend { id: string; name: string; title: string | null; patronColor: number | null; playing: boolean }

type PresenceEvent =
  | { topic: 'snapshot'; raw: string[]; patronColors: number[]; playingIds: string[] }
  | { topic: 'enters'; raw: string; patronColor: number | null; playing: boolean }
  | { topic: 'leaves'; raw: string }
  | { topic: 'playing'; raw: string }
  | { topic: 'stopped_playing'; raw: string };

// "TITLE Name" or "Name". Only the first two words are used, as in the donor.
function parseName(raw: string): { id: string; name: string; title: string | null } {
  const parts = raw.split(' ');
  const name = parts.length > 1 ? parts[1] : parts[0];
  const title = parts.length > 1 ? parts[0] : null;
  return { id: name.toLowerCase(), name, title };
}

function snapshotList(ev: Extract<PresenceEvent, { topic: 'snapshot' }>): Friend[] {
  return ev.raw.map((r, i) => {
    const colorRaw = ev.raw.length === ev.patronColors.length ? ev.patronColors[i] : null;
    const patronColor = colorRaw !== null && colorRaw > 0 ? colorRaw : null; // 0 means not a patron
    const p = parseName(r);
    return { ...p, patronColor, playing: ev.playingIds.includes(p.id) };
  });
}

class PresenceList {
  private list: Friend[] = [];
  private listening = false;

  constructor(private readonly send: (topic: string) => void) {}

  // Called when the screen gains focus: listen, then ask for a full snapshot.
  resume(): void {
    this.listening = true;
    this.send('following_onlines');
  }

  // Called when the screen loses focus: stop applying events. The list is kept.
  pause(): void {
    this.listening = false;
  }

  // Called on every socket (re)connect; only while listening, as in the donor.
  onConnected(): void {
    if (this.listening) this.send('following_onlines');
  }

  apply(ev: PresenceEvent): Friend[] {
    if (!this.listening) return this.list;
    switch (ev.topic) {
      case 'snapshot':
        this.list = snapshotList(ev); // the snapshot replaces everything
        break;
      case 'enters': {
        const p = parseName(ev.raw);
        // Appended without a duplicate check, as in the donor.
        this.list = [...this.list, { ...p, patronColor: ev.patronColor, playing: ev.playing }];
        break;
      }
      case 'leaves': {
        const id = parseName(ev.raw).id;
        this.list = this.list.filter((f) => f.id !== id);
        break;
      }
      case 'playing':
      case 'stopped_playing': {
        const id = parseName(ev.raw).id;
        const on = ev.topic === 'playing';
        this.list = this.list.map((f) => (f.id === id ? { ...f, playing: on } : f));
        break;
      }
    }
    return this.list;
  }
}
```

## 5. Lands in

- TARGET `origins/server/presence.ts` (proposed new): the server-side friend presence feed (snapshot and deltas), with the client view held in the Players screen. Frankendom's code was not read, so I cannot say what it already has.
- Parity row: none. No row in the checklist covers friend lists or presence; this is social state, not fight state.
- Reuse tag: rewrite-from-idea (GPL v3: clean-room; shape only, written from the rules above, not a translation)
- Brief rule served: 1 (one engine: presence is server state; the client view is not a rule input)

## 6. Gaps and risks

- Duplicate risk: the donor appends on `following_enters` without checking the id (83). If the server ever sends an enter for a friend already in the list, the list shows that friend twice until the next snapshot. Frankendom must key the list by user id and make enter idempotent.
- Stop does not unsubscribe on the server. The donor only cancels its client listeners (67-68). Whether the server keeps sending while the screen is paused is not read. Frankendom should decide explicitly whether to stop the feed server-side.
- Presence is informational. It must never be an input to a fight, kill, loot or ledger rule. Keep it out of the one ledger; the donor has no ledger here.
- Names: the donor splits on spaces and uses only the first two words (110-112). A name with an extra space loses data. Frankendom should validate names instead of parsing them.
- Patron colour arrays are parallel to the friend array with a length check (126). If the lengths differ, every colour is dropped silently. Frankendom should send one record per friend, not parallel arrays.
- The recent-following carousel (`relation_repository.dart` 33-36) is an HTTP read with a limit of 10, separate from this socket list. It is not a sync rule.
- Not read: the socket layer's reconnect behaviour (`isActive`, `connectedStream`), `UserId.fromUserName`, the server's `following_onlines` payload, and the friend screen's full UI (57, 223, 281 only).
- Chat read state (not written up): `chat_mixin.dart` 97, 134-141, 145-166, 188-195, 216-220. A candidate note of its own.

Reuse tag: rewrite-from-idea (GPL v3, clean-room shape only)
Brief rule served: 1 (one engine: presence is server state, the client view is not a rule input)
