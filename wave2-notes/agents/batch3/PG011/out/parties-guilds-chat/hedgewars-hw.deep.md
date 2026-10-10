# hedgewars-hw (parties-guilds-chat, cell 2)

Donor: `/mnt/frankendom-donors/hedgewars-hw/gameServer/FloodDetection.hs` | Licence: GPL-2.0 (header of FloodDetection.hs: "version 2 of the License"; repo `COPYING`: "Version 2, June 1991") | Haskell | symbol `registerEvent` (with `boundaries`, `doCheck`, `updateInfo`)

Checked: The hint file `User_Mission_-_Teamwork_2.lua` (read 1-60) is a single-player mission script with a scripted enemy team (line 34). It has no social code. The mechanism is `gameServer/FloodDetection.hs` (read 1-85, whole file). Callers and order: `HWProtoLobbyState.hs` 49-52 (CHAT command, read), `HWProtoInRoomState.hs` 273 and 331 (grep line only), `Actions.hs` 76-82 and 898-907 (read), 114-130 (Warning read; ByeClient read only to line 130), `ServerCore.hs` 40-80 (read), `CoreTypes.hs` 110-115 and 152-163 (read). The Rust port `rust/chat_sanitizer/src/flood.rs` was read in full (9 lines). Confidence high on the rule and on the order of relay and check. Medium on why chat uses an absorb run of 3: the file has no comment on it, and no other source was read for it.

Best transferable idea: rate-limit chat per client with two tiers (warn at the limit, disconnect one step past it), count every line in a sliding window, and check each line before it is relayed.
Decision (proposed): adapt — keep the two-tier warn-then-disconnect rule and the per-kind windows; reject the absorb run (it lets steady senders through unchecked) and the relay-before-check order.
Acceptance: a server test with absorb 0, cap 2 in 10 s and 3 in 30 s: a client sending one line per second gets WARNING on line 3 (t = 2 s), is disconnected on line 4 (t = 3 s), and line 4 is never delivered to the room.

## 1. Mechanism

- Per client, per event kind, there is one list of `(count, time)` entries, newest first. The kinds are lobby chat, engine messages and room joins (`CoreTypes.hs` 157-159). A room rename shares the lobby chat list (`FloodDetection.hs` 39, 44).
- `registerEvent` (30-33): if the list is empty, or its head count is 0, run `doCheck`. Otherwise run `updateInfo`, which only decrements the head count by one (82-85). So after a checked event, the next `numPerEntry` events of that kind are not checked and not counted. Their handling only counts down (absorb run).
- `doCheck` (62-80), for a checked event:
  - keep only entries within the long window (66) → `l2` is their number;
  - `l1` is the number of those within the short window (68);
  - kick (`ac2`) if `l2 >= num2 + 1` or `l1 >= num1 + 1` (70-72); otherwise warn (`ac1`) if `l2 >= num2` or `l1 >= num1` (73-76); otherwise nothing;
  - store `(numPerEntry, now)` as the new head, followed by the kept entries (78), and set `pendingActions` to the result (79). An empty result clears the pending actions.
  - The new event is not in the counts it is judged against. Counts are of entries (checked events), not of every message.
- Numbers, from `boundaries` (47-51): chat `(3, (10 s, 2), (30 s, 3))` (48); engine messages `(8, (10 s, 4), (25 s, 5))` (49); room joins `(2, (10 s, 2), (35 s, 3))` (50). The `(sec, num)` pairs are the short window and the long window.
- Actions: warn sends `Warning! Chat flood protection activated` (53); kick is `ByeClient` with `Excess flood` (54). Warn is `AnswerClients [chan] ["WARNING", msg]` (`Actions.hs` 114-116). Kick is `ByeClient` (122), body not read beyond line 130.
- Order in the server (the important part). A `CHAT` line returns `[AnswerClients s ["CHAT", n, msg], RegisterEvent LobbyChatMessage]` (`HWProtoLobbyState.hs` 52). `ReactCmd` runs these in list order (`Actions.hs` 907). So the line goes out to the room's other clients first. Then `RegisterEvent` runs `registerEvent` (899), which only sets `pendingActions`. Back in `mainLoop`, the pending actions run (`ServerCore.hs` 58-60) and are cleared (61). A line that trips the flood rule is therefore delivered, and the warning or kick comes after it.

## 2. Key functions

- `registerEvent`: `/mnt/frankendom-donors/hedgewars-hw/gameServer/FloodDetection.hs` 30-33. Chooses check or absorb from the head count.
- `doCheck`: `/mnt/frankendom-donors/hedgewars-hw/gameServer/FloodDetection.hs` 62-80. Window counts, warn and kick tiers, new head, pending actions.
- `updateInfo`: `/mnt/frankendom-donors/hedgewars-hw/gameServer/FloodDetection.hs` 82-85. Decrements the head count only.
- `boundaries`: `/mnt/frankendom-donors/hedgewars-hw/gameServer/FloodDetection.hs` 47-51. The per-kind numbers and messages.
- Pending-action drain: `/mnt/frankendom-donors/hedgewars-hw/gameServer/ServerCore.hs` 57-61 (`mainLoop`). Runs the actions after the command is handled.
- `processAction (RegisterEvent e)`: `/mnt/frankendom-donors/hedgewars-hw/gameServer/Actions.hs` 898-900.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Per-kind bucket of checked events, pruned to the long window (theirs 66) | Window lengths 10 s (short), 30 s (long) for chat; 25 s and 35 s for the other kinds (theirs 48-50) |
| Two tiers: warn when a window reaches its limit, kick one step past it (theirs 70-76) | Chat limits 2 in 10 s and 3 in 30 s (theirs 48); engine 4 in 10 s and 5 in 25 s (theirs 49); join 2 in 10 s and 3 in 35 s (theirs 50) |
| Absorb run: after a checked event, the next N events are neither checked nor counted (theirs 78, 82-85) | N = 3 for chat (theirs 48), 8 for engine messages (theirs 49), 2 for joins (theirs 50) |
| Judge the new event against earlier entries only (theirs 66-68) | None |

Simulation (my hand-run of these rules, not run on the donor; the cadence is a steady sender with messages exactly on those times): at one chat line per second, the first warning is at 8 s and the kick at 16 s. At one line every 2 s, the warnings start at 24 s and the kick never comes. At one line every 4 s, no warning at all. The sender at 2 s cadence is checked on every fourth line only.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's check rule (window counts, warn at the limit, kick one step past it) and the absorb run. It changes the order: it checks first and relays only after the check, where the donor relays first and checks after. A kicked line is never relayed. It omits: the per-kind lists for engine messages and joins (only chat is set up), the room rename that shares the chat bucket (a caller would pass the same bucket), the `pendingActions` queue, the `ByeClient` and `Warning` processing, and the client-side state. Chat limits are written as the donor's numbers, but the Frankendom setting in the acceptance line uses absorb 0.

```ts
// Licence: GPL-2.0 (donor, version 2). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Verdict = "pass" | "warn" | "kick";

interface Limit {
  absorb: number;                        // messages after a checked one that are neither counted nor checked
  shortSec: number; shortMax: number;    // warn at shortMax entries in shortSec; kick at shortMax + 1
  longSec: number; longMax: number;      // warn at longMax entries in longSec; kick at longMax + 1
}

interface Entry { at: number; absorb: number; }  // newest first
interface Bucket { entries: Entry[]; }

function check(b: Bucket, lim: Limit, now: number): Verdict {
  const head = b.entries[0];
  if (head !== undefined && head.absorb > 0) {   // inside an absorb run: count down, no check
    head.absorb -= 1;
    return "pass";
  }
  const recent = b.entries.filter(e => now - e.at <= lim.longSec);
  const l2 = recent.length;
  const l1 = recent.filter(e => now - e.at <= lim.shortSec).length;
  b.entries = [{ at: now, absorb: lim.absorb }, ...recent];
  if (l2 >= lim.longMax + 1 || l1 >= lim.shortMax + 1) return "kick";
  if (l2 >= lim.longMax || l1 >= lim.shortMax) return "warn";
  return "pass";
}

// Frankendom order: check first, then relay. A kicked message is never relayed.
function onChat(b: Bucket, lim: Limit, now: number, relay: () => void, warn: () => void, kick: () => void): void {
  const v = check(b, lim, now);
  if (v === "kick") { kick(); return; }
  if (v === "warn") warn();
  relay();
}

const chatLimit: Limit = { absorb: 3, shortSec: 10, shortMax: 2, longSec: 30, longMax: 3 };
```

Typecheck: the block plus `export {}` compiles with `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `origins/server/chat-flood.ts` (new; the server checks chat before relay). Not checked against the repo (not read).
- Parity row: none. No row 1-23 covers chat or flood control. Not claimed as any other row.
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
- Brief rule served: the server verifies the chat rule before the line is relayed. Rules on fight, camera and the Pit do not apply.

## 6. Gaps and risks

- GPL-2.0: clean-room only. The sketch is written from the rules, not the lines.
- The absorb run is a hole. With N = 3, a sender gets one checked line in four, and steady senders are warned forever without a kick at a 2 s cadence (simulation above). Frankendom must count every line. Set absorb to 0 for chat; the donor's value is not adopted.
- The donor relays before it checks, so the offending line reaches other players. Frankendom checks first (server-verified). Acceptance below depends on this.
- Chat limits here are per connection. Frankendom has no channel rule yet. Whether a room or guild channel gets a shared budget is a question for Lead.
- Room rename shares the chat budget in the donor (44). A rename spam counts as chat. Frankendom must decide; the sketch does not.
- The Rust port is a stub. `rust/chat_sanitizer/src/flood.rs` (read in full, 9 lines) has `FloodChecker::check` return `Severity::Pass` for every message (line 7). The Rust server does not enforce this rule. Not a model to copy.
- The kick (`ByeClient`, `Actions.hs` 122) was read only to line 130: what it does to room and game state is not read.
- Secondary find, thin, not the subject of this note: team chat (`TEAMCHAT`, `HWProtoInRoomState.hs` 380-383) relays only to clients with the same clan colour (`HandlerUtils.hs` 53-60; clan colour set at `HWProtoLobbyState.hs` 114). It is a per-group chat scope, a few lines. Frankendom could reuse the filter shape for a guild channel. Not read: the rest of `HWProtoInRoomState.hs`.
- Not read: the client-side chat widget (`frontend-qt6/ui/widget/chatwidget.cpp`), `Votes.hs`, and the join path beyond the grep line (`Actions.hs` 215).
