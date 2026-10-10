# OpenRCT2-OpenRCT2 (parties-guilds-chat, cell 18)

Donor: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/network/NetworkBase.cpp` (symbols `NetworkBase::ServerHandleChat`, `NetworkBase::ServerHandleGameAction`, `SetPlayerGroup`, `ModifyGroups`, `NetworkBase::ServerSendChat`) with `NetworkGroup.h` / `NetworkGroup.cpp` (the rank bitmask) and `NetworkAction.cpp` (the permission table); script side `src/openrct2/scripting/bindings/network/ScNetwork.cpp` | Licence: GPL version 3 (exact header text: "OpenRCT2 is licensed under the GNU General Public License version 3."; `licence.txt` is the GPL text; no "or later" clause is in the header read) | C++ | symbol `ServerHandleGameAction`

Checked: Read in full: `NetworkGroup.h`, `NetworkGroup.cpp`, `NetworkAction.h`. Read: `NetworkBase.cpp` 219-232 (cooldown decay), 480-486 (delta time), 1023-1056 (rank lookup and default), 1085-1116 (default ranks), 1532-1552 (scoped chat send), 2212-2252 (join), 2968-2996 (chat gate and relay), 3034-3092 (game-action gate and cooldown), 3614-3671 (`SetPlayerGroup`), 3712-3759 (`ModifyGroups` permission branch); `NetworkAction.cpp` 39-62 and 218-240 (sampled entries); `ScNetwork.cpp` 269-300. Grep only: `NetworkBase.cpp` 558 (decay call, inside the server tick, 540-558 not read in full), `NetworkBase.cpp` 3881 (client copy of rights), `NetworkUser.cpp` 27 and 29-80 (user store, not read in full), `RideDemolishAction.cpp` 46-48 and `SmallSceneryPlaceAction.cpp` 59-61 (cooldown values), `Chat.cpp` 53-54, 249, 261 (hint file: it is the window and sends through `Network::SendChat`, with no rank logic). Callers: `ServerHandleGameAction` is the server handler for `Command::gameAction` (`NetworkBase.cpp` 143); the chat gate is reached from the chat command handler (not read). Confidence: high on the rank gate, the ceiling rules and the scoped send; medium on the cooldown clock (decay read, its call site read by grep). Not a camera cell, so no camera_scope tag.

Best transferable idea: Give each member one rank whose permission bitmask the server checks before any chat line, command or rank change, and let a rank change touch only what the actor already holds.
Decision (proposed): adapt - the bitmask rank and the server gate fit our guild ranks, but the donor lacks a rule against demoting a higher rank, uses wall-clock cooldowns, and loads rights with a toggle; we add those.
Acceptance: An officer tries to move a leader to member and to promote a member to leader; the server refuses both, the officer sees "Not allowed", and a server test asserts the rank table is unchanged; a second command inside its cooldown ticks is refused with "slow down".

## 1. Mechanism

- A rank is one 64-bit mask (8 bytes) of 24 permissions. A bit is tested with `(actionsAllowed[byte] & (1 << bit)) != 0` (NetworkGroup.cpp 120). The permission list is an enum (NetworkAction.h 21-48) with a name table for each entry (NetworkAction.cpp 56 on).
- Default ranks (NetworkBase.cpp 1085-1116): Admin (id 0) has all bits (1090). Spectator (id 1) has only chat (1097). User (id 2) starts from all bits and clears seven of them: kick, modify groups, set player group, cheat, passwordless login, modify tile, edit scenario options (1104-1111). The default rank for new players is Spectator (1115), so a new player can chat and do nothing else.
- Join (NetworkBase.cpp 2212-2237): an unknown key gets the default rank (2227). A saved user gets the rank saved for that key, or the default if it has none (2235). `GetGroupIDByHash` (1023-1043) does the same lookup and falls back to the default when the saved rank no longer exists (1031-1040).
- Chat gate (2974-2981): a client's chat is dropped silently unless its rank has the chat bit. Only then is it formatted, added to history and sent to everyone (2993-2995).
- Command gate, in order (3034-3092): (a) `togglePause` and `loadOrQuit` are refused from clients (3048-3051); (b) any command except `custom` must pass the rank's `canPerformCommand`, which maps the command to its permission (3053-3062; mapping in NetworkGroup.cpp 123-131); a refusal sends `STR_PERMISSION_DENIED` back (3059); (c) the action object is created (3065); (d) unless the player is the host (3075), a cooldown already running for that command refuses the action (3077-3085); (e) the action's own cooldown is stored for that player and command (3087-3091).
- Rank changes are game actions (`PlayerSetGroupAction::Query` and `Execute` call `SetPlayerGroup`, PlayerSetGroupAction.cpp 39-47). `SetPlayerGroup` (3614-3671) refuses: a missing target; a missing target rank; the host (3630); a promotion to Admin unless the actor is in Admin (3636). When it runs, it sets the rank, saves the user to the user store and logs (3643-3668).
- Rank-edit rights (`ModifyGroups`, 3713-3759): nobody edits Admin's rights (3715-3718). A permission toggle is allowed only if the actor's own rank holds that permission (3720-3731). Setting, clearing or copying a whole mask runs only inside the non-toggle branch, which needs the actor's rank (3738-3750).
- Cooldowns are wall-clock: `Platform::GetTicks()` gives milliseconds (485); each tick subtracts the elapsed time (486, 226) and removes entries at zero or below (227-228). It runs once per connection in the server tick (558).
- Scoped chat (1532-1552): with an empty recipient list the line goes to all clients (1537-1541); with a list, it is queued only to the listed connections (1544-1550). Scripts reach this through `sendMessage(text, players)` (ScNetwork.cpp 269-286), which the server allows only, with a text error for clients (288-291).

## 2. Key functions

- `NetworkBase::ServerHandleGameAction`: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/network/NetworkBase.cpp` 3034-3092. The server gate: host-only commands, rank permission, creation, cooldown, storing the cooldown.
- `NetworkBase::ServerHandleChat`: same file, 2968-2996. The chat gate.
- `SetPlayerGroup`: same file, 3614-3671. Target and ceiling checks, then the rank write and save.
- `ModifyGroups` (`setPermissions` branch): same file, 3713-3759. Rights edits, with the toggle ceiling.
- `NetworkBase::ServerSendChat` (recipient list): same file, 1532-1552.
- `NetworkBase::DecayCooldown`: same file, 219-232.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One rank = one bitmask; test one bit with a mask | 64 bits (8 bytes, NetworkGroup.h 25); 24 permissions in use (NetworkAction.h 21-48) |
| New member gets the lowest rank that can still chat | Default rank id 1, Spectator (theirs, NetworkBase.cpp 1097, 1115) |
| Preset ranks as masks: all bits, one bit, all bits minus a list | Admin all; User all minus seven (1090, 1104-1111) |
| Command refused unless the rank holds its permission | None (rule) |
| Per-player, per-command cooldown in wall-clock ms, host exempt | RideDemolish 1000 (theirs, RideDemolishAction.cpp 48); SmallSceneryPlace 20 (theirs, SmallSceneryPlaceAction.cpp 61); the unit is ms because `Platform::GetTicks()` is ms (485) |
| Rank change refused if the target is the host | None (rule, 3630) |
| Rank change refused if it promotes to top rank for a non-top actor | None (rule, 3636) |
| Recipient-list send | Empty list means everyone (1537) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order in the command gate (rank permission, then cooldown with the host exempt, then the cooldown is stored only for an accepted command). It takes the cooldown length as an argument where the donor asks the action for it, and decays cooldowns once per server tick by a tick count, where the donor subtracts wall-clock milliseconds. It omits the chat gate, the scoped send, the user-store save, the custom-command bypass, the rights-edit path and the client copy of rights. `canSetRank` adds two ceiling rules the donor does not have (an actor may not touch a higher rank, nor promote anyone above their own rank). The donor also allows promotion to Admin when the actor has no rank (the check needs a non-null actor group, 3636); the sketch refuses that case.

```ts
__SKETCH__
```

## 5. Lands in

- TARGET `origins/server/guild-ranks.ts` (new): server rank table and the gate for chat, commands and rank changes. Parity-checklist row 5 (controls and input; the server-side intake sub-line): the command gate is intake. No row among 1-23 covers guild ranks or chat, so the rank model has no row of its own. The Frankendom repo was not opened in this pass, so "today" is not read.
- Reuse tag: rewrite-from-idea (GPL version 3; clean-room only)
- Brief rule served: one engine (the gate is server code, not a client check); server-verified (the gate and rank change are server-side; the client copy is display only, see 6)

## 6. Gaps and risks

- Demotion of a higher rank: `SetPlayerGroup` checks the target is not the host (3630) and that a promotion to Admin comes from Admin (3636). It does not check the target's current rank. So an actor whose rank holds `setPlayerGroup` can move an Admin to any other rank. Frankendom needs the target-rank ceiling (the sketch adds it).
- Rights edits: a toggle is limited to rights the actor holds (3726), but the non-toggle branch can never change anything as read. `mygroup` is set only inside the toggle branch (3723-3725), and the non-toggle branch runs only `if (mygroup != nullptr)` (3740), so it is always false there. Treat the "copy my rights" and "clear all" paths as dead code, and do not port them as written.
- Loading ranks from the file uses toggle (XOR), not set: `group.toggleActionPermission(action_id);` (NetworkGroup.cpp 45) and `ar[byte] ^= ...` (108). A permission name listed twice switches its bit off. Frankendom loads with set-bit.
- The custom command bypasses the rank gate (3053). Clients must never send it in Frankendom.
- Cooldowns are wall-clock ms (485-486, 226) and decay per connection in the server tick (558). Frankendom's server tick is fixed-step, so the cooldown must count ticks, as the sketch does. This is the server tick sub-line of row 5 (fixed step, input intake, per-tick budget).
- The donor's client keeps a copy of the rank table for display (`CanPerformCommand`, 3875-3882, marked `// TODO` on 3881). Frankendom: the client copy never decides; the server decides and the refusal is the only source of truth.
- Chat for a whole room is broadcast (2995, 1540); only scripts get recipient lists (1544-1550). A party or guild chat line needs the scoped send from the start, with the server building the list from membership, not from the client.
- Persistence: each rank change writes the whole user store (3649-3652). Frankendom's one ledger must journal the change with the action, not write a side file.
- Not read: `ModifyGroups` add, remove and rename (3673-3712, 3760-3800), the user store load and save bodies (NetworkUser.cpp 29-220 apart from the file name), the cooldown-decay call site in full (540-558), the client UI for ranks, and the chat command handler table around `NetworkBase.cpp` 125-150 beyond the two handler lines.
