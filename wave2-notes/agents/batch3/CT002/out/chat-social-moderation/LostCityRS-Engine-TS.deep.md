# LostCityRS-Engine-TS (chat-social-moderation, cell 35)

Donor: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/server/friend/FriendServerRepository.ts` 331-354 (`isVisibleTo`), with callers at `FriendServerRepository.ts` 147 and `FriendServer.ts` 475; modes at `src/engine/entity/ChatModes.ts` 8-12; new-player default at `src/engine/entity/Player.ts` 305 | Licence: MIT (`/mnt/frankendom-donors/LostCityRS-Engine-TS/LICENSE` line 1: "MIT License", Copyright (c) 2023-2026 Lost City) | TypeScript | symbol `isVisibleTo`

Checked: Symbol `isVisibleTo` is defined at 331 and closes at 354 (verified, read in full). Read in full also: `FriendServerRepository.ts` 71-126 (register and unregister), 330-387 (gate and loaders), `ChatModes.ts`, `MessagePrivateHandler.ts`, `MessagePublicHandler.ts`, `ReportAbuseHandler.ts`, `WordPack.ts`, `WordEnc.ts` (pipeline only). Read in part: `FriendServer.ts` 118-128, 174-183, 256-292, 433-441, 462-500, 646-670; `World.ts` 396-416, 1135-1170, 1647-1660, 2004-2030. Not read: `WordEncBadWords.ts`, `WordEncFragments.ts`, `WordEncDomains.ts`, `WordEncTlds.ts` (the data-driven masks; entries not counted), `World.notifyPlayerReport` (`World.ts` 2339), the client (not read; no client code was opened in this pass). Callers: the friend-list build (147) and the world update (475) were read; the PM path was read through its four call sites (sender handler, friend server, world send, world receive) and the encoder. Nothing was run. Confidence: high on the gate and on the PM path not calling it; medium on whether the game client hides ignored PMs (client not read). Not a camera cell.

Best transferable idea: One visibility gate with a fixed precedence (staff, then ignore, then the owner's chat mode with unknown treated as off, then friends-only, then on) decides friend status and private-message reach, so a player's ignore and privacy settings work the same everywhere.
Decision (proposed): adapt - Frankendom's friends list and private chat should share this single gate (rulings: friends list and blocking; child-safety defaults); the donor's gate is right in shape, but its private-message path skips it and an invalid saved mode fails open to ON, which a child-safety default must not do.
Acceptance: A server test: a PM from a player the owner ignores is not delivered; a player whose chat mode is OFF shows offline in friend lists and receives no PM; a saved chat mode outside 0..2 resolves to OFF.

## 1. Mechanism

- Modes (`ChatModes.ts` 8-12): private chat is ON=0, FRIENDS=1, OFF=2. A new player starts ON (`Player.ts` 305). The saved value is packed into one byte with the public and trade modes (`Player.ts` 267) and unpacked from two bits (`PlayerLoading.ts` 152), so the field can hold 3, which is not a mode.
- Registration on world login: `FriendServer.ts` 118-128 validates the mode (outside 0..2 becomes ON, 120-122) and calls `register` (128). `register` (`FriendServerRepository.ts` 71-90) adds a staff id if the level is above 1 (82-83), stores the mode in memory (88), and loads the friend list (89). Unregister removes the mode, friends and staff entries (96-126). Ignore lists are read on demand (`getIgnores` at 164-170, which calls `loadIgnores` at 165); the ignore check in the gate (339) only works if the owner's ignore list is already loaded in memory, so a not-yet-loaded list lets the viewer through and sent to the player at login (`FriendServer.ts` 139, 433-441).
- Set-mode: `FriendServer.ts` 174-183 validates the same way (outside 0..2 becomes ON, 176-178), then `setChatMode` (318-322) stores it.
- Gate `isVisibleTo(viewer, other)` (331-354), in order:
  1. Viewer is staff: visible (335-336).
  2. The other player's ignore list contains the viewer: hidden (339-341).
  3. The other player's mode is read with a default of OFF (343). OFF: hidden (345-347).
  4. FRIENDS: visible only if the other player's friend list contains the viewer (349-350). The check is one-directional.
  5. Otherwise (ON): visible (353).
- Callers: the friend-list build skips a friend who is not visible (147). The friend-list world update sends the friend's world, or 0 if not visible (`FriendServer.ts` 462-476; the gate call is at 475).
- Private messages are not gated. The sender handler (`MessagePrivateHandler.ts` 9-35) refuses if `socialProtect` is set or the input is over 100 packed bytes (13), refuses while `muted_until` is in the future (17), and sets `socialProtect` on success (33). `World.sendPrivateMessage` (`World.ts` 1647-1660) posts to the friend thread. The friend server (`FriendServer.ts` 256-285) writes a `private_chat` row with the raw text (274-281) and forwards to the target's world socket (285; `sendPrivateMessage` at 480-497). The target world writes the message to the target player (`World.ts` 2024). None of these four steps calls `isVisibleTo`, checks the ignore list or reads the target's mode. The encoder (`MessagePrivateEncoder.ts` 20) filters the text on the way out.
- Per-tick social gate: each accepted social packet sets `socialProtect` (private, public, friend and ignore handlers). `resetEntity` clears it (`Player.ts` 482), and `resetEntity` is called for every player in `processCleanup` (`World.ts` 1149). `processCleanup` is the last step of the tick (`World.ts` 415, after `processInfo` and `processClientsOut`). Result: one social packet per player per tick. `reportAbuseProtect` is cleared in the same place (`Player.ts` 483): one report per tick, not one per session.
- Tick length was not read; the loop that drives the tick was not read in full.

## 2. Key functions

- `isVisibleTo`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/server/friend/FriendServerRepository.ts` 331-354.
- Friend-list build with the gate: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/server/friend/FriendServerRepository.ts` 133-150 (gate at 147).
- Friend-list world update: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/server/friend/FriendServer.ts` 462-476 (gate at 475).
- Private message path, no gate: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/server/friend/FriendServer.ts` 256-285 and 480-497; `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/World.ts` 1647-1660 and 2004-2030; `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/network/game/client/handler/MessagePrivateHandler.ts` 9-35.
- Per-tick social gate: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/Player.ts` 482-483; `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/World.ts` 1139-1170 and 415.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Precedence: staff, then ignore, then owner mode, then friends-only, then on | staff bypass (theirs, 335-336); ignore (339-341); mode enum ON 0, FRIENDS 1, OFF 2 (`ChatModePrivate`, `ChatModes.ts` 9-11, theirs; lines 2-4 are the public enum) |
| Unknown mode is hidden | default OFF (`FriendServerRepository.ts` 343, theirs) |
| Invalid saved mode | becomes ON, the open setting (`FriendServer.ts` 122 and 178, theirs). Defect, see section 6 |
| New-account default | ON (`Player.ts` 305, theirs) |
| Ignore list cap | 100 entries (`FriendServerRepository.ts` 270, theirs) |
| Friend list cap | 200 for members, 100 for non-members (229, theirs) |
| Social packets per tick | one per player (`Player.ts` 482; `World.ts` 415, 1149) |
| Private message input | over 100 packed bytes is refused (`MessagePrivateHandler.ts` 13, theirs) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor precedence (staff, then ignore, then the owner's mode with unknown as OFF, then friends-only, then on) and the three mode values. It changes two things: an invalid saved value becomes OFF (the donor makes it ON), and private-message delivery calls the same gate (the donor does not call it). It omits the friend-list cache, the world payload, the database loads, the staff set maintenance, the packed mode byte, and the caps (100 ignores, 200 and 100 friends).

```ts
// Licence: MIT (donor). Shape re-expressed from the described rule; adapted with the donor gaps fixed.
enum ChatMode {
  ON = 0,
  FRIENDS = 1,
  OFF = 2,
}

interface SocialView {
  isStaff(id: string): boolean;                      // donor: playerStaff set (staff level above 1 at register)
  ignores(owner: string, other: string): boolean;    // owner's ignore list contains other
  chatMode(owner: string): ChatMode | undefined;     // undefined = not known (not online or not loaded)
  friends(owner: string, other: string): boolean;    // owner's friend list contains other
}

// Donor precedence, kept: staff, then ignore, then the owner's mode (unknown = OFF), then friends-only, then on.
function canSee(v: SocialView, viewer: string, owner: string): boolean {
  if (v.isStaff(viewer)) return true;
  if (v.ignores(owner, viewer)) return false;
  const mode = v.chatMode(owner) ?? ChatMode.OFF;
  if (mode === ChatMode.OFF) return false;
  if (mode === ChatMode.FRIENDS) return v.friends(owner, viewer);
  return true;
}

// Fix 1: a saved value outside 0..2 becomes OFF. The donor falls back to ON (open) at login and at set-mode.
function parseChatMode(raw: number): ChatMode {
  return raw === 0 || raw === 1 || raw === 2 ? (raw as ChatMode) : ChatMode.OFF;
}

// Fix 2: private messages use the same gate. The donor's delivery path never calls it.
function canDeliverPm(v: SocialView, from: string, to: string): boolean {
  return canSee(v, from, to);
}

export {};
```

## 5. Lands in

- TARGET `origins/server/social-visibility.ts` (new): the one gate for friend status, friend lists and private-message delivery, on the server. Parity-checklist row 14 (HUD: friends list and chat panel) is where the list and the status show; the gate itself is server-side and belongs with the presence code in `origins/server`.
- today: Frankendom's friend or chat-mode code was not checked for this note.
- Reuse tag: adapt (MIT, code may be adapted; the sketch is re-expressed from the rule, with two defects fixed)
- Brief rule served: one engine and server-verified (one gate for all social reach; the client never decides who can see or message a player).

## 6. Gaps and risks

- Private messages skip the gate (`FriendServer.ts` 285; `World.ts` 2024): an owner's ignore list and OFF mode do not stop a PM on the server side. Whether the client hides ignored PMs was not checked (no client code read). Fix: call `canDeliverPm` before delivery (sketch).
- Fail-open defaults: an invalid saved mode becomes ON at login (`FriendServer.ts` 122) and at set-mode (178), and a new account starts ON (`Player.ts` 305). The gate itself fails closed for an unknown owner (343), so the two defaults disagree. For Frankendom's child-safety default: invalid becomes OFF, and new accounts (and any minor) start at FRIENDS or OFF. That is a product decision for Dom, not a code fix.
- Staff bypass (335-336): any staff level above 1 sees every player regardless of ignore or mode, and this code does not log the bypass. Frankendom should log staff reads of private status.
- FRIENDS is one-directional (350): the owner's friend list must contain the viewer; mutual friendship is not required. Acceptable if stated; do not describe it as mutual.
- Caps are account data: ignore 100 (270), friends 200 for members and 100 for non-members (229). They are engine constants, not zone data.
- Reports: one report per tick, because `reportAbuseProtect` is cleared with the social flag (`Player.ts` 483). That is not a per-session budget. Frankendom's report path needs its own budget and a reason row (ruling).
- A private message to the username `invalid_name` triggers the same automated two-day ban (`World.notifyPlayerBan`, `MessagePrivateHandler.ts` 22-25) as a bad report reason. A PM to a nonexistent account hits `executeTakeFirstOrThrow` on the target (`FriendServer.ts` 270-271) and throws in the friend thread (the sender line is logged nowhere); handle it as a not-found reply.
- Malformed report or mute reason: an out-of-range report reason is answered with an automated two-day ban (`ReportAbuseHandler.ts` 14-17, 172800000 ms). A client bug can therefore ban a player. Frankendom should hold malformed input for review instead of banning.
- Profanity filter: `WordEnc.filter` (`src/cache/wordenc/WordEnc.ts` 67-89) masks, in this order, TLDs, bad words, domains and fragments, restores a five-word whitelist (`WordEnc.ts` 33: cook, cook's, cooks, seeks, sheet), and fixes capitalisation. Public text is filtered on the way out (`MessagePublicHandler.ts` 35), and private text at encode time (`MessagePrivateEncoder.ts` 20). The raw text is kept for the log (`MessagePublicHandler.ts` 32) and written raw to the `private_chat` table (`FriendServer.ts` 281). Keep this split (raw for moderation, filtered for display), but decide the privacy rule for the raw private log before launch. The bad-word and fragment data were not read or counted.
- Frankendom rulings: the gate lives on the server; zones are not involved; the display-name filter is a write-time blocklist (ruling), which this donor does not do at write time.

Reuse tag: adapt (MIT)
Brief rule served: one engine, server-verified; the one gate for all social reach; row 14 for the display

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Numbers table cited ChatModes.ts 2-4 for the private enum; that is ChatModePublic, the private enum is 9-11.
- WordEnc.filter is at src/cache/wordenc/WordEnc.ts 67-89 and runs TLDs, bad words, domains, fragments (note had the order reversed and a bare path).
- Ignore check at 339 only works if the owner's ignore list is loaded; note did not tie on-demand loading to the gate.
- Missed: PM to 'invalid_name' triggers the 2-day automated ban (MessagePrivateHandler 22-25); PM to nonexistent account throws at FriendServer 270-271.

Fixed 2026-10-12: enum lines, WordEnc path and order, ignore-load caveat, added the two PM edge cases.
