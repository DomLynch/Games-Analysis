# opentibiabr-otclient (quests-dialogue, cell 12)

Donor: /mnt/frankendom-donors/opentibiabr-otclient | Licence: MIT ("OTClient is made available under the MIT License", LICENSE line 1; code may be adapted) | Lua client (modules/game_questlog/game_questlog.lua) with C++ protocol side (src/client/protocolgamesend.cpp, src/client/protocolgameparse.cpp) | symbol onQuestTracker / onUpdateQuestTracker / sendQuestTracker

Checked: opened game_questlog.lua 37-300, 766-818, 820-961, 998-1091, 1313-1334 (hint file, read in part); protocolgamesend.cpp 815-835; protocolgameparse.cpp 3328-3364; src/client/game.h line 471 (grep line); LICENSE line 1. Callers of sendQuestTracker: read 778, 784, 789, 1089, 1329; not read 706, 1147. Callers of onQuestTracker: the protocol parse (protocolgameparse.cpp:3347) and the controller table binding (game_questlog.lua:1290). camera_scope: not a camera cell. Confidence medium: the client half and the wire format are read end to end, but the server half that produces quest state, completes missions and reconciles the login push is NOT in this donor's client code and was not read. Also not read: game_taskboard and game_prey (grep hits only), the quest-log window code at 427-535 except via calls. Depth: thin.

Best transferable idea: the client keeps a non-authoritative mirror of tracked missions; the server pushes a full replace on login and a single-mission upsert afterwards, and the client sends back only a capped selection, never a completion.
Decision (proposed): adapt — the mirror and push split fit a Frankendom quest tracker HUD, with completion and rewards staying server-side; keep the full-replace vs upsert split and the capped selection, and drop the client-side hacks listed below.
Acceptance: a server test asserts that after a full push of two missions a track request for the 256th mission returns "full" and the payload carries 255 ids; an upsert changes one mission's text without reordering the list; a client mirror entry cannot mark a quest complete.

## 1. Mechanism

The quest tracker is a client mirror of server state. Three kinds of event touch it:

- Login: `onGameStart` (1313-1334) rebuilds the tracker from the local JSON cache (`/settings/questtracking.json`, keyed by character name) and sends the whole cached list to the server as a 0xD0 request. The comment says the server reconciles that payload during the initial sync window (server side not read).
- Server push, full: `parseQuestTracker` type 1 (protocolgameparse.cpp:3332-3347) hands the whole list to `onQuestTracker`. The Lua handler clears the mirror and rebuilds it from the push, then debounces a save (915).
- Server push, single: type 0 goes to `onUpdateQuestTracker`, which upserts one entry by mission id (948-958) and debounces a save (960).
- Player action: checking the tracker box adds to the mirror (1053), unchecking removes (1074), and both save and send the mirror to the server (1087-1089). Menu toggles for auto-track also send (778, 784, 789).

The send path caps the list at 255 unique mission ids on the Lua side (251-253) and again in C++ (protocolgamesend.cpp:819), so the count fits one byte. Ids are u16 on the wire. From client 1410 the send adds two flag bytes and one extra byte (protocolgamesend.cpp:826-829). The Lua side sets the extra byte at random (257); the C++ default is 0x2A (game.h:471).

Guards: `isReceivingQuestTracker` (43, 884-886, 924-926) stops `rebuildTrackerFromSettings` from running while a server push is applied (809). `isNavigating` (868-873) suppresses checkbox events during auto-selection; it is cleared by a 100 ms timer, not by the call that set it.

Save: `deferredSave` (192-201) cancels and reschedules a 500 ms timer on every call (the 500 is at line 200; the receipt for that line is too short to quote, so it is stated from reading only). The local file is refused above 100 MB (158-160).

## 2. Key functions

- `ensureQuestTrackerState` (105-143): client version gate (106: below 1280 nothing runs), loads the cache once, ensures per-character list exists.
- `sendQuestTracker` (236-273): dedupes and caps at 255, sends via `g_game.sendRequestTrackerQuestLog` (267).
- `rebuildTrackerFromSettings` (275-295): rebuilds the HUD labels from the cache; unknown quest ids fall back to 0 (286-287).
- `onQuestTracker` (878-916): full replace; `table.clear` at 890.
- `onUpdateQuestTracker` (918-961): single upsert; linear scan at 948-954; append at 956-958.
- `questLogController:onCheckChangeQuestTracker` (998-1091): track and untrack paths; save and send at 1087-1089.
- C++ `ProtocolGame::sendRequestTrackerQuestLog` (protocolgamesend.cpp:815-833); C++ `ProtocolGame::parseQuestTracker` (protocolgameparse.cpp:3328-3364).

## 3. Numbers vs mechanism

- Max tracked missions sent: 255 (Lua 251; C++ 819). The count is one byte (C++ 820).
- Version gates: tracker needs client 1280 or later (game_questlog.lua:106); quest id needs 1410 or later in both push types (protocolgameparse.cpp:3339-3341, 3351-3353); quest name in single pushes needs 1410 (3356-3358); the send adds the flag bytes from 1410 (protocolgamesend.cpp:826). Quest name in full pushes is read for every version (3342).
- Save debounce: 500 ms (line 200, not quoted). Navigation guard: 100 ms (line 871-873).
- Local file cap: 100 MB (game_questlog.lua:158).
- Extra byte: random in Lua (257), 0x2A as the C++ default (game.h:471).

## 4. TypeScript sketch

simplified: omits the Lua per-character keying (namePlayer), the mission-to-quest map, the sort and the widget rebuild, the 500 ms debounce (the caller decides when to write), the navigation guard, the random extra byte, and the client version gates. The cap is enforced in `track` and `payload` (the donor enforces it only when sending). Order of operations matches the donor: a server push replaces or upserts first, then the save is marked.

```ts
// Quest tracker sync: the client keeps a per-character mirror of tracked
// missions. The server is authoritative: a full replace (list push) and an
// upsert (one mission push) overwrite the mirror. The mirror is only sent
// back as a selection, capped by the protocol.
export {};

export const MAX_TRACKED = 255; // protocol count is one byte

export interface TrackedEntry {
  missionId: number;
  questId: number;
  name: string;
  desc: string;
}

export interface Tracker {
  entries: TrackedEntry[]; // client mirror, never authoritative for completion
  applying: boolean; // true only while a server push is applied (no timers)
  dirty: boolean; // a save is wanted; the caller decides when to write
}

export function newTracker(): Tracker {
  return { entries: [], applying: false, dirty: false };
}

// Server full replace: clears and rebuilds the mirror.
export function applyFull(t: Tracker, list: TrackedEntry[]): void {
  t.applying = true;
  try {
    t.entries = list.map((e) => ({ ...e }));
    t.dirty = true;
  } finally {
    t.applying = false;
  }
}

// Server upsert: one mission changed (progress text, name, quest id).
export function applyUpsert(t: Tracker, e: TrackedEntry): void {
  t.applying = true;
  try {
    const i = t.entries.findIndex((x) => x.missionId === e.missionId);
    if (i >= 0) t.entries[i] = { ...e };
    else t.entries.push({ ...e });
    t.dirty = true;
  } finally {
    t.applying = false;
  }
}

// Player tracks a mission. Refuses past the cap instead of dropping silently.
export function track(t: Tracker, e: TrackedEntry): "ok" | "full" | "dup" {
  if (t.entries.some((x) => x.missionId === e.missionId)) return "dup";
  if (t.entries.length >= MAX_TRACKED) return "full";
  t.entries.push({ ...e });
  t.dirty = true;
  return "ok";
}

export function untrack(t: Tracker, missionId: number): void {
  t.entries = t.entries.filter((x) => x.missionId !== missionId);
  t.dirty = true;
}

// Payload for the server: unique ids, capped. The overflow count is returned
// so the caller can tell the player.
export function payload(t: Tracker): { ids: number[]; dropped: number } {
  const seen = new Set<number>();
  const ids: number[] = [];
  for (const e of t.entries) {
    if (seen.has(e.missionId)) continue;
    seen.add(e.missionId);
    if (ids.length < MAX_TRACKED) ids.push(e.missionId);
  }
  return { ids, dropped: seen.size - ids.length };
}

// The caller decides when to write (the donor debounces 500 ms with a timer).
export function flushIfDirty(t: Tracker, write: (json: string) => void): boolean {
  if (!t.dirty) return false;
  write(JSON.stringify(t.entries));
  t.dirty = false;
  return true;
}

// Example: a server full push, one upsert, one track request, then payload.
const t = newTracker();
applyFull(t, [{ missionId: 1, questId: 10, name: "Q", desc: "kill 3" }]);
applyUpsert(t, { missionId: 1, questId: 10, name: "Q", desc: "kill 2 of 3" });
const r = track(t, { missionId: 2, questId: 10, name: "Q", desc: "find key" });
const p = payload(t);
flushIfDirty(t, () => {});
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

Target: origins/quests/tracker.ts (client HUD mirror and push handlers; the server owns quest state and completion).
Parity row: 14 (HUD). The tracker is a HUD view. Quest rewards, if any, would land in row 18 through the one ledger, not here.

## 6. Gaps and risks

- One engine and server-verified: this donor is a client that displays server state. Frankendom must keep completion and rewards in the server; the tracker only displays. The acceptance test is the guard.
- Zones as data: mission names and descriptions come from the server push, not from zone data. Frankendom should read them from the quest data and push ids only.
- One ledger: no rewards appear in this mechanism; the server side (not read) decides them.
- Pit as client: the tracker is a HUD client and does not run in the Pit.
- MAX_ATTACKERS = 3: not applicable.
- Defect 1 (hack): game_questlog.lua:833-835 forces the second entry of every quest list to incomplete (`if _ == 2 and true then` / `questCompleted = false`), overwriting the server flag and leaving a no-op `and true`. fix: delete the lines; trust the server flag and cover it with a test.
- Defect 2 (silent cap): the list is cut at 255 on the Lua side (251-253) and again in C++ (protocolgamesend.cpp:819) with no message; tracked missions past 255 never reach the server. fix: refuse at track time with a message (the sketch's `track` returns "full") and report `dropped` from `payload`.
- Defect 3 (timer guard): `isNavigating` is cleared 100 ms after the click (868-873), so the guard holds only if the checkbox event fires within that window. fix: clear the guard in the same call stack, or pass the source of the change, instead of using a timer.
- Defect 4 (unused field): `onQuestTracker` takes `remainingQuests` (878), which the parser reads (protocolgameparse.cpp:3333) but the handler never uses. fix: show "N remaining" on the HUD or remove the field from the wire.
- Defect 5 (fallback to 0): an unknown quest id is stored as 0 (286-287) and the tracker proceeds. fix: mark it unknown and request the quest line rather than inventing 0.
- Defect 6 (unexplained byte): the extra byte is random in Lua (257) and 0x2A in C++ (game.h:471); the purpose is not documented here and the server side was not read. fix: document it or drop it.
- Minor inconsistency: `onQuestTracker` saves at once when the push has no missions table (893-895) but debounces otherwise (915). fix: one save path.

Reuse tag: donor-only (MIT); no Frankendom search was done in this pass.
Brief rule served: judge the idea, not the genre (rule 2); receipts for every cited line (rule 10; receipts.tsv verifies 139 lines across the three cells); keep the idea and fix the defects (Dom's 2026-10-10 rule).
