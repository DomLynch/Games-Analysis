# FPtje-DarkRP (chat-social-moderation, cell 35)

Donor: `/mnt/frankendom-donors/FPtje-DarkRP/gamemode/modules/chat/sv_chat.lua` | Licence: MIT (repo `LICENSE.txt`: "The MIT License (MIT)", Copyright (c) 2014 Falco Peijnenburg; the `fadmin` subfolder has no licence file of its own) | Lua (GMod gamemode) | symbol `RP_PlayerChat`, `DarkRP.talkToRange`, `DarkRP.findPlayer`, FAdmin `MuteChat`

Checked: camera_scope not applicable. Read in full: `chat/sv_chat.lua` (183 lines), `chat/sv_chatcommands.lua` (241), `chat/sh_chatcommands.lua` (142), `chat/cl_chatlisteners.lua` (207), `fadmin/.../chatmute/sv_init.lua` (75). Read in part: `base/sv_util.lua` 40-104 (talkToRange, talkToPerson), `base/sh_util.lua` 60-135 (findPlayer), `config/config.lua` 310-340, `chat/cl_chat.lua` 1-30 (message receive start only; the rest of the rendering path is (not read)), `chat/sv_interface.lua` and `chat/cl_interface.lua` (doc stubs only). Confidence high on the order of operations and the numbers for the server path. Not read: engine-side or addon chat limits, `chatsounds.lua`, FAdmin `cl_init.lua`. Confidence medium on whether the donor is run with any extra chat addon.

Best transferable idea: one chat gate per channel group (cooldown keyed by group, not by the typed alias), with one recipients function shared by delivery and the "who can hear me" preview, and a target name that must match exactly one player.
Decision (proposed): adapt. Why: the range-plus-veto delivery and the typed-preview are a good shape for a phone-first MMO, but the donor's per-command cooldown key is bypassable and it has no real moderation layer outside the FAdmin mute, so we build the moderation rows ourselves through the one writer.
Acceptance: a server test sends "/", then "a", then "ooc" within 1.5 s and asserts exactly one OOC line is posted; a test with two players named "Bob" asserts `/pm bob` posts nothing and returns an "ambiguous" notice; a test with a crouched listener at the 250-unit edge asserts the preview list equals the delivered list.

## 1. Mechanism

- Entry. The server hooks `PlayerSay` by overriding `hook.Call` (`sv_chat.lua` 130-153). The original hooks run first (line 138). The text then goes through `RP_PlayerChat` (line 140). Dead players are dropped when `deadtalk` is off (line 142). Each line is written to the DarkRP log (line 55, `DarkRP.log`), and to the dedicated-server log (lines 144-146).
- Command branch. Only when the text starts with the prefix `/` and the first word names a declared command does the cooldown run (`sv_chat.lua` 69-73). The check is at line 74: refuse if the same key was used less than `delay` seconds ago. A refused try does not reset the timer. An accepted try sets the timestamp (line 78) before the callback runs. The key is `tblCmd.command`, which is the declared name of the command, not the typed word. The console path (`darkrp <cmd>`, lines 158-182) uses the same rule keyed by the raw argument (lines 171-178).
- Plain say (no prefix) has no cooldown at all. The only branch outside the command branch is group chat for team chat (line 85). So plain say is not rate-limited in this gamemode (engine-side limits not read).
- Delays. Every chat command in `sh_chatcommands.lua` has `delay = 1.5`: pm (74), w (80), y (86), me (92), `/` (98), a (104), ooc (110), broadcast (116), channel (123), radio (129), g (135), credits (141). The extra trailing argument in `sv_chatcommands.lua` (lines 34, 46, 58, 83, 111-113, 141, 177, 213, 241; values 1.5, 0, 50 and `true`) is dropped, because `defineChatCommand(cmd, callback)` takes two parameters (`sv_chat.lua` 9). The live delay comes only from `declareChatCommand`.
- Delivery by range. Whisper (`sv_chatcommands.lua` 36-46) calls `talkToRange` with `whisperDistance` (line 42). Yell uses `yellDistance` (line 54). `/me` uses `meDistance` (line 78). Local say uses `talkDistance` (`sv_chat.lua` 113). `alltalk` sends to every player instead (`sv_chat.lua` 107-111, and `/me` in `sv_chatcommands.lua` 71-76).
- `talkToRange` (`base/sv_util.lua` 52-79). It loops over `player.GetHumans()`. A listener is included when the squared distance from the speaker's eye point to the listener's eye point is at most size squared (line 61, `<=`). The speaker is always included. Each listener must also pass the veto hook `PlayerCanSeePlayersChat` (defined nowhere in the donor, only called). One network message is sent to the filtered list.
- `talkToPerson` (`sv_util.lua` 81-103) sends to one receiver. It skips invalid receivers and bots (line 83), then calls the same veto hook (line 86) unless the receiver is the sender.
- Who-hears-me preview (client, `cl_chatlisteners.lua`). While the chat box is open, a Think hook (`chatGetRecipients`, lines 77-95) asks each player whether the chosen prefix's `hearFunc` accepts them. A `nil` return hides the preview. The default talk receiver uses the feet position, squared, with strict `<` against `talkDistance` squared (lines 142-143). The preview says "No-one can hear you" (zero receivers), "Everyone can hear you" (receivers equal players minus one, line 57), or lists the names. Hidden players are dropped by the `chatHideRecipient` hook (line 82), which changes the preview only.
- Name targeting for `/pm`. `sv_chatcommands.lua` line 19 calls `DarkRP.findPlayer`. The lookup (`sh_util.lua` 71-130) tries UserID and SteamID64 first when the input is a number, then SteamID for strings starting with `steam_`, then the first nick that contains the text (lines 109-115), then SteamName. The loops return the first hit in `player.GetAll()` order, so two players whose nicks both contain the text resolve to whichever comes first. The client preview for `/pm` (lines 162-169) accepts every player whose nick or Steam name contains the text, or whose SteamID equals it, so it can show several names while the server sends to one.
- Moderation. The gamemode has no text filter, no ignore list, and no report path. The one chat mute is FAdmin's chatmute (`fadmin/fadmin/playeractions/chatmute/sv_init.lua`). `MuteChat` (lines 1-29) reads the admin's seconds argument (line 10). For each target it sets a flag through `FAdmin_SetGlobal` (line 15; how FAdmin syncs that flag was not read). For a non-zero time it starts a `timer.Simple` that clears the flag when it fires (lines 19-22). `UnMuteChat` (31-49) clears the flag. A `PlayerSay` hook returns `""` while the flag is set (lines 73-75). Because the hook returns a non-nil value, `hook.Call` returns `""` and `text2` becomes empty (`sv_chat.lua` 138), so a muted player's commands also stop (as read; not run).

## 2. Key functions

- `RP_PlayerChat`: `/mnt/frankendom-donors/FPtje-DarkRP/gamemode/modules/chat/sv_chat.lua` 54-95 (prefix test 69, cooldown 73-78, group branch 85, odd `or` line 91).
- `hook.Call` override for `PlayerSay`: `sv_chat.lua` 130-153 (original hooks 138, deadtalk 142, DoSay 148, RP_ActualDoSay 149).
- `RP_ActualDoSay`: `sv_chat.lua` 97-116 (alltalk 107, talkToRange 113).
- `DarkRP.talkToRange`: `/mnt/frankendom-donors/FPtje-DarkRP/gamemode/modules/base/sv_util.lua` 52-79 (distance test 61, veto hook 61).
- `DarkRP.talkToPerson`: `sv_util.lua` 81-103 (bot skip 83, veto hook 86).
- `DarkRP.findPlayer`: `/mnt/frankendom-donors/FPtje-DarkRP/gamemode/modules/base/sh_util.lua` 71-130 (partial nick loop 109-115).
- Preview: `/mnt/frankendom-donors/FPtje-DarkRP/gamemode/modules/chat/cl_chatlisteners.lua` 77-95 (`chatGetRecipients`), 137-181 (default receivers, talk 139-144, pm 162-169).
- Whisper/yell/me/ooc/group/radio: `/mnt/frankendom-donors/FPtje-DarkRP/gamemode/modules/chat/sv_chatcommands.lua` 36-213.
- FAdmin mute: `/mnt/frankendom-donors/FPtje-DarkRP/gamemode/modules/fadmin/fadmin/playeractions/chatmute/sv_init.lua` 1-29 (`MuteChat`), 31-49 (`UnMuteChat`), 73-75 (`PlayerSay` hook).
- Config: `/mnt/frankendom-donors/FPtje-DarkRP/gamemode/config/config.lua` 314-319 (units comment and the four chat distances).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Per-command cooldown; a refused try does not reset the timer | `delay = 1.5` s on every chat command (`sh_chatcommands.lua` 74, 80, 86, 92, 98, 104, 110, 116, 123, 129, 135, 141). Plain say: none. |
| Listen radius, squared distance, inclusive | talkDistance 250, whisperDistance 90, yellDistance 550, meDistance 250 (all source units, `config.lua` 316-319; units stated at line 314). |
| Credits spam wait (one per player) | 60 s flag (`sv_chatcommands.lua` 227). |
| Veto per listener | Hook with no default: the filter passes unless the hook returns `false` (`sv_util.lua` 61, 86). |
| Preview of recipients | Strict `<` on feet position against talkDistance squared (`cl_chatlisteners.lua` 142-143). |
| Mute with a timer | Admin seconds, 0 = until unmuted (`sv_init.lua` 10, 17, 19-22). |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order (cooldown refuses without restarting, then delivery through one recipients function, with the veto as a listener mute). It changes four things on purpose: the cooldown is keyed by channel group instead of typed command (the donor's "/", "a", "ooc" bypass), plain say gets a 0.5 s group cooldown (the donor has none), the preview and delivery call the same `recipients` function with the eye point on both sides (the donor's preview uses feet and strict `<`), and a partial name must match exactly one player (the donor takes the first hit). The mute is a stored expiry with no timer (the donor's timer can clear a later mute). It omits the prefix parsing, the network send, the log lines, the group-chat membership callbacks, the radio channels, the credits flag, and the `hook.Call` override.

```ts
// Licence of donor: MIT (FPtje-DarkRP, LICENSE.txt). Clean-room sketch of the mechanism, not a line-by-line port.
export {};

type Channel = "say" | "ooc" | "whisper" | "yell" | "me" | "pm" | "radio" | "group";
type Group = "local" | "global" | "private" | "radio" | "group";

interface Player {
  id: number;
  name: string;
  x: number; y: number; z: number; // feet position, world units
  eyeZ: number;                    // eye height above the feet
  muteUntil: number;               // Infinity = until unmuted; 0 or past = not muted
  ignores: Set<number>;            // listener-side ignore list (player ids)
}

// Data: cooldown per GROUP, not per typed command. Fixes the donor's "/", "a", "ooc" bypass.
const GROUP_COOLDOWN_S: Record<Group, number> = {
  local: 0.5, global: 1.5, private: 1.5, radio: 1.5, group: 1.5,
};

// Data: listen range per channel in world units; 0 = not range-limited.
const CHANNEL: Record<Channel, { group: Group; range: number }> = {
  say:     { group: "local",   range: 250 },
  whisper: { group: "local",   range: 90 },
  yell:    { group: "local",   range: 550 },
  me:      { group: "local",   range: 250 },
  ooc:     { group: "global",  range: 0 },
  pm:      { group: "private", range: 0 },
  radio:   { group: "radio",   range: 0 },
  group:   { group: "group",   range: 0 },
};

// Cooldown gate. A refused attempt does not restart the timer (as in the donor).
export class ChatGate {
  private last = new Map<string, number>();

  allow(p: Player, channel: Channel, now: number): boolean {
    const group = CHANNEL[channel].group;
    const key = String(p.id) + ":" + group;
    const prev = this.last.get(key);
    if (prev !== undefined && now - prev < GROUP_COOLDOWN_S[group]) return false;
    this.last.set(key, now);
    return true;
  }
}

// One function decides who hears a message. The client preview calls this same function.
export function recipients(speaker: Player, channel: Channel, all: Player[], now: number): Player[] {
  if (speaker.muteUntil > now) return [];
  const range = CHANNEL[channel].range;
  const r2 = range * range;
  const sx = speaker.x;
  const sy = speaker.y;
  const sz = speaker.z + speaker.eyeZ; // eye point on both sides
  return all.filter((p) => {
    if (p.id === speaker.id) return true;
    if (p.ignores.has(speaker.id)) return false;
    if (range === 0) return true;
    const dx = p.x - sx;
    const dy = p.y - sy;
    const dz = (p.z + p.eyeZ) - sz;
    return dx * dx + dy * dy + dz * dz <= r2;
  });
}

export type Target =
  | { ok: true; player: Player }
  | { ok: false; reason: "empty" | "none" | "ambiguous"; count: number };

// Exact id or name first; a partial name must match exactly one player, otherwise refuse.
export function resolveTarget(query: string, all: Player[]): Target {
  const q = query.trim().toLowerCase();
  if (q === "") return { ok: false, reason: "empty", count: 0 };
  const exact = all.filter((p) => String(p.id) === q || p.name.toLowerCase() === q);
  const hits = exact.length > 0 ? exact : all.filter((p) => p.name.toLowerCase().includes(q));
  if (hits.length === 0) return { ok: false, reason: "none", count: 0 };
  if (hits.length > 1) return { ok: false, reason: "ambiguous", count: hits.length };
  return { ok: true, player: hits[0] };
}

// Mute with a stored expiry (no timer to clear). Checks every target before writing any.
export function muteAll(targets: Player[], seconds: number, now: number, canMute: (p: Player) => boolean): boolean {
  if (!targets.every(canMute)) return false;
  const until = seconds === 0 ? Infinity : now + seconds;
  for (const p of targets) p.muteUntil = Math.max(p.muteUntil, until); // never shorten an existing mute
  return true;
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (`/tmp/gm004-chat-sketch.ts`): exit 0.

## 5. Lands in

- TARGET `origins/server/chat.ts` (new): the one chat gate, the one `recipients` function used by delivery and by the client preview (`src/hud` preview reads the same function), the target resolver, and mute as a stored row. Chat messages go through the writer, never direct to the database (Strategy CT ruling).
- Parity row 14 (HUD): the chat box and the "who can hear me" preview. The server cooldown is intake and sits under row 5 (controls/input), noted here, not a second row.
- Reuse tag: adapt (MIT: code may be adapted; this sketch is written from the mechanism, and the donor's code is not copied).
- Brief rule served: one engine, client is preview only (the preview is HUD); the Strategy CT rule "chat as presence messages through the writer"; name targeting must be unambiguous (no hidden first-match).

## 6. Gaps and risks

- Defect, cooldown bypass. "/", "a" and "ooc" are three declared commands with three cooldown keys (`sh_chatcommands.lua` 95-111, `sv_chat.lua` 74, 78). One player can post three OOC lines inside one 1.5 s window. Fix: key the cooldown by channel group (the sketch does this).
- Defect, plain say is unthrottled in this gamemode (`sv_chat.lua` 69-88). Fix: a short group cooldown on local say (0.5 s in the sketch, a data value, not donor-tested).
- Defect, `/pm` target is first-match (`sh_util.lua` 109-115), and the preview lists every match (`cl_chatlisteners.lua` 166). The server and the preview disagree. Fix: refuse an ambiguous name and show the same single target in the preview.
- Defect, preview and delivery use different distance rules: delivery uses eye points with `<=` (`sv_util.lua` 61), the preview uses feet with strict `<` (`cl_chatlisteners.lua` 142). Crouch or a stance change moves the eye point, so the preview can disagree with delivery at the edge. Fix: one `recipients` function on both sides (sketch).
- Defect, FAdmin mute timer (`sv_init.lua` 19-22). The timer clears the flag whenever it fires, even if a later permanent mute set it; a re-mute while muted ignores its new duration (line 14); the privilege check runs per target after earlier targets are already muted (line 13), so a refusal part-way leaves some muted and returns false without a notice. Fix: store `muteUntil` as a row and check every target before writing (sketch `muteAll`).
- Defect, operator precedence (`sv_chat.lua` 91). In Lua, `..` binds tighter than `or`, so the expression is `callback or ("" .. " ")`, and the intended trailing space is never added when `callback` is non-empty. Fix: parenthesise, or remove the line. Effect on visible text not checked.
- Gap, moderation is mostly absent in this donor: no text filter, no ignore list, no report path. The veto hook `PlayerCanSeePlayersChat` is called (`sv_util.lua` 61, 86) but defined nowhere in the donor, so any mute/ignore needs an implementation. Frankendom's rulings (chat through the writer, name filter as a write-time blocklist, report row with a reason) have to be built, not ported.
- Gap, a muted player's commands also stop (`sv_chat.lua` 138), which may or may not be wanted. Decide it in the rules, not by accident.
- Ruling conflict to watch: the donor keeps cooldown state in `ply.DrpCommandDelays` (in memory, lost on reconnect). Frankendom's rule for server-verified state means the cooldown belongs to the server session, which is fine, but a reconnect reset must not be a way around the rate limit.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)

Verdict: CLEAN
- Nit (confirmed): the `/pm` preview also matches SteamName and exact SteamID (`cl_chatlisteners.lua` 162-168), not nick only.
- Missed (confirmed): `GM:canChatCommand` (`sv_chat.lua` 118-125) refuses every chat command until the player's DarkRP data has loaded (`DarkRPUnInitialized`), with two notices. Keep as a "no commands before profile load" gate.
- Missed (confirmed): `/pm` to yourself silently returns `""` (`sv_chatcommands.lua` 20), no notice.
- Missed (confirmed): a dead player's command callback still runs (`RP_PlayerChat`, line 140) before the deadtalk drop (line 142), so deadtalk off blocks the text but not the command side effect.

Fixed 2026-10-12: preview wording for `/pm` matches (nick, Steam name, SteamID).
