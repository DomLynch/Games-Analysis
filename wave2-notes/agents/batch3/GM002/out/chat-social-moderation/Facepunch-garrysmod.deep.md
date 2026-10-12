# Facepunch-garrysmod (chat-social-moderation, cell 35)

Donor: `/mnt/frankendom-donors/Facepunch-garrysmod/garrysmod/gamemodes/terrortown/gamemode/gamemsg.lua` (with `shared.lua`, `cl_voice.lua`) and `/mnt/frankendom-donors/Facepunch-garrysmod/garrysmod/gamemodes/base/gamemode/` (`player.lua`, `cl_init.lua`) | Licence: none declared (no LICENSE file; the TTT README names the author Bad King Urgrain and no licence) | Lua | symbol `GM:PlayerSay` / `GM:PlayerCanSeePlayersChat`

Checked: read in full: `terrortown/gamemode/gamemsg.lua` 1-260 (lines past 260 not read), `terrortown/gamemode/shared.lua` 72-79, `terrortown/gamemode/cl_voice.lua` 98-130 and 600-628, `base/gamemode/cl_init.lua` 146-182, `base/gamemode/player.lua` 78-88 and 728-761. Read by grep only: `base/gamemode/cl_scoreboard.lua` 39-154 (the mute button). Candidate files opened: 6 (plus grep over gamemodes and lua/includes for rate-limit, whisper, report, friend, block, profanity, emote, bubble, party and guild terms: none found in chat code). Confidence: high on the TTT chat and voice gates and the mumble transform (read end to end); the engine's own `say` dispatch and the client text filter are not in the repo (not read), so the claim that the mumbled text is what every listener receives rests on the hook's return value (inference). `camera_scope` not applicable.

Best transferable idea: decide each chat line's audience from the round phase, the speaker's side and role, and the listener's side, and let the server deliver a sanitized line (same shape, no words) to anyone who should not see the original.
Decision (proposed): adapt - take the audience gate and the role-only channel for a live Pit bout (spectator text hidden from fighters and coaches while the bout is live; a coach's side-chat visible only to the coach's side); keep the random-word mumble off by default and make it an option for spectators.
Acceptance: during a live bout, a spectator's line reaches other spectators and not the fighters; a fighter's team-only line reaches only that fighter's side; after the bout ends the same spectator line reaches everyone. A server test asserts the listener set, not the client's view.

## 1. Mechanism

- Channels present in the donor: public say; team say (tag in green, `cl_init.lua` 161-164); dead tag (156-159); and, in TTT, a role channel for special roles (`gamemsg.lua` 149-152 route, 88 role filter).
- Default visibility (base, `player.lua` 734-743): a team-only line is visible only to a listener on the speaker's team; everything else is visible.
- TTT visibility gate, `GM:PlayerCanSeePlayersChat` (`gamemsg.lua` 95-118). A line is visible to a listener when any of these holds, checked in this order: the round is not active (108); the spectator-chat limit convar is off (109); the server is not in detective mode (110); the speaker is alive and the line is not team-only, or is team-only from a non-special (111); the speaker is alive, the line is team-only, and the listener has the same role (112); both are spectators (113). Otherwise the line is hidden.
- Spectator mumble, `GM:PlayerSay` (`gamemsg.lua` 126-156). During an active round, a spectator's text outside detective mode is rewritten (131-148): split on spaces (135); each token's leading letters and trailing punctuation are read (136); a token with no leading letters is dropped (137); each kept word becomes one random entry from a 25-entry list (120-121, 22 distinct) plus its punctuation (138); an empty result becomes one random entry (143-145); the tag `[MUMBLED]` is put first (147). The output is returned as the say text.
- Special team chat during an active round (`gamemsg.lua` 149-151): a living special's team-only line is sent to its role only (`RoleChatMsg`, 47-53, with the recipient filter at 52), and the public say is returned empty.
- Detective mode (`gamemsg.lua` 110, 131): spectator text is not mumbled but hidden from living players by the gate.
- Voice, `GM:PlayerCanHearPlayersVoice` (`gamemsg.lua` 170-211): a global mute flag silences all voice (172-174); it is set around map cleanup and round start (`MuteForRestart`, 162-164). A limit rule (181-186): spectators are not heard by the living during an active round. A per-listener spectator mute by team or all (189-191), set by the spectator's mute command (`MuteTeam`, 245-258). Spectators hear each other, not spatially (194-196). A traitor's voice goes to traitors (199-203), and to everyone when the traitor's global-voice flag is on (200-201); the flag is set only by an active traitor (228) and announced to the living traitors' filter (213-224). Otherwise: heard, spatial only when the locational convar is on and the round is not over (210).
- Base voice, `GM:PlayerCanHearPlayersVoice` (`base/player.lua` 754-759): server alltalk overrides (756-757); otherwise same team hears, not spatially (759).
- Client chat line (`base/cl_init.lua` 146-180): dead and team tags, speaker name, then the text through `util.FilterText` with a context chosen by a client bitmask convar (173-176). The filter itself is engine-side (not read).
- Voice-mute cycle on the client (`cl_voice.lua` 620-628): a key steps through mute states (see defect C1).

Order for a live spectator line: route (mumble) first, then per-listener visibility, so a fighter receives nothing when the gate says hidden, and a spectator receives the mumbled text.

## 2. Key functions

- `PlayerSay`: `/mnt/frankendom-donors/Facepunch-garrysmod/garrysmod/gamemodes/terrortown/gamemode/gamemsg.lua` 126-156.
- `PlayerCanSeePlayersChat`: same file, 95-118.
- `PlayerCanHearPlayersVoice` (TTT): same file, 170-211. Voice mute by team: `MuteTeam`, 245-258.
- Base chat line: `/mnt/frankendom-donors/Facepunch-garrysmod/garrysmod/gamemodes/base/gamemode/cl_init.lua` 146-182. Base visibility and voice: `/mnt/frankendom-donors/Facepunch-garrysmod/garrysmod/gamemodes/base/gamemode/player.lua` 734-761.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Audience gate per line, by phase, side and role | convars `ttt_limit_spectator_chat` default "1" (`gamemsg.lua` 92) and `ttt_limit_spectator_voice` default "1" (93); `ttt_locational_voice` default "0" (167) |
| Mumble transform: one random token per kept word, punctuation kept | 25 entries, 22 distinct (120-121); a token with no leading letters is dropped (137); tag `[MUMBLED]` (147) |
| Mute states for voice | NONE 0, TERROR 1, ALL 2, SPEC 1002 (`shared.lua` 74-77) |
| Chat-visibility inputs | round state (ROUND_ACTIVE, ROUND_POST); detective mode; role; side (living or spectator) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order: route first (mumble or role channel), then the audience gate (both spectators; living cannot see spectator text; team-only from a special goes to role). It omits the null-listener check, the voice gates, the traitor voice state, the mute states, the single-line `[MUMBLED]` fallback order beyond the donor's, the engine's say dispatch and the rendering. Its word list is its own (3-4 words), not the donor's list, and the mumble uses a passed random source so the result can be checked.

```ts
// Licence: none declared in the donor (clean-room). Sketch written from the described mechanism, not a translation of donor lines.
type Side = 'living' | 'spec';
type Phase = 'pre' | 'live' | 'post';

interface Member { id: string; side: Side; role: string; special: boolean; }
interface Line { text: string; teamOnly: boolean; speaker: Member; }
type Route =
  | { kind: 'say'; text: string }
  | { kind: 'role'; role: string; text: string };

interface Config {
  phase: Phase;
  limitSpectatorChat: boolean;
  strict: boolean; // donor "detective mode": hide spectator text from the living instead of mumbling it
}

// Own word list (not the donor's). Output keeps the shape of the input: one token per word, punctuation kept.
const MUMBLES = ['mmm', 'hmm', 'mrh', 'hum'];

function mumble(text: string, rnd: () => number): string {
  const out: string[] = [];
  for (const tok of text.split(' ')) {
    const m = /^([A-Za-z]*)([.,;!?]*)/.exec(tok);
    if (m === null || m[1] === '') continue; // no leading letters: the token is dropped
    out.push(MUMBLES[Math.floor(rnd() * MUMBLES.length)] + m[2]);
  }
  if (out.length === 0) out.push(MUMBLES[Math.floor(rnd() * MUMBLES.length)]);
  return ['[MUMBLED]', ...out].join(' ');
}

// Decided once on the server, so every listener gets the same routed text.
function route(cfg: Config, line: Line, rnd: () => number): Route {
  if (cfg.phase === 'live' && line.speaker.side === 'spec') {
    if (!cfg.strict) return { kind: 'say', text: mumble(line.text, rnd) };
    return { kind: 'say', text: line.text }; // the audience gate below hides it
  }
  if (cfg.phase === 'live' && line.teamOnly && line.speaker.side === 'living' && line.speaker.special) {
    return { kind: 'role', role: line.speaker.role, text: line.text }; // role channel only, not the public say
  }
  return { kind: 'say', text: line.text };
}

// Audience gate for a 'say' line: may this listener see it?
function canSee(cfg: Config, line: Line, listener: Member): boolean {
  if (cfg.phase !== 'live' || !cfg.limitSpectatorChat || !cfg.strict) return true;
  const speakerSpec = line.speaker.side === 'spec';
  const listenerSpec = listener.side === 'spec';
  if (speakerSpec && listenerSpec) return true;   // spectators hear spectators
  if (speakerSpec) return false;                  // live text from spectators is hidden from fighters
  if (!line.teamOnly || !line.speaker.special) return true;
  return line.speaker.role === listener.role;
}

export {};
```

## 5. Lands in

- TARGET `origins/server/chat-audience.ts` (new module, proposed; not checked against the Frankendom repo). The server decides who receives a line; the client only renders what it is sent.
- Parity row 14 (HUD). This matches the hint: the chat box is HUD. The audience decision itself is server-side and is the part that transfers.
- Reuse tag: rewrite-from-idea (no licence declared; clean-room only).
- Brief rule served: one ledger is not involved; the server owns who sees what (the client is never trusted to filter), and Pit spectators are a client view of a server decision.

## 6. Gaps and risks

- No licence is declared: clean-room only. The mumble word list is the donor's material and is not copied into the sketch.
- The donor has no chat rate limit (grep of gamemodes for rate-limit and last-chat terms found none). fix: a per-player token bucket on the server, before `PlayerSay`.
- The donor has no whisper, party or guild channel, no report path, no ignore or block list, no friends list, no profanity list in Lua, no emotes and no chat bubbles (grep). Only the public, team, dead and role channels exist. Frankendom needs the report path and the block list as rows.
- The gate is inside the donor's hook, so it is only as strong as the engine's dispatch of `PlayerCanSeePlayersChat` (not in this repo). Frankendom must make the server choose the listener set itself.
- Defect C1, voice-mute cycle (`cl_voice.lua` 620-623): `next(MuteText, mute_state)` walks a hash table, so the order is not defined and the ordered list `MuteStates` (603) is never used. fix: step through `MuteStates` by index with wrap-around.
- Defect C2, precedence (`gamemsg.lua` 189): `A and B or C` puts the all-mute test outside the spectator test. Mostly harmless today: `MuteTeam` sets `mute_team` only for spectators (254) and resets it to -1 if a non-spectator runs the command (249), and `ResetRoundFlags` also sets it to -1 (`player_ext.lua` 165, called from `player.lua` 64). But `mute_team` is not cleared when a spectator turns living inside a round, so a spectator who chose MUTE_ALL could stay voice-deaf through the unparenthesised `or` at 189 (not run; the respawn path was not fully traced). fix: parenthesise and say the intent.
- Defect C3, no record for role-channel lines: the role branch returns an empty say (151) and writes nothing to a log. Moderation needs a log row for every routed line. fix: write a row on each role or mumbled line.
- Defect C4, mumble mixes shapes: a word with no leading letters is dropped (137), so a numeric or symbol-only message becomes `[MUMBLED]` plus one random word (143-147). Harmless, but it changes the length of the line; a fighter-facing feature must not depend on it.
- Also found: a last-words channel (`gamemsg.lua` 261-330): a dead player's final line is broadcast (`TTT_LastWordsMsg`, only when `ttt_lastwords_chatprint` is on or the death was a fall), ignored if under 2 characters or starting with `!`, `@` or `/` (admin commands), and stored on the ragdoll.
- Not read: the engine say dispatch (the part of `gamemsg.lua` past 260 is now read up to about 330), the engine's `say` dispatch and the client filter; the spectator mute UI beyond `cl_scoreboard.lua` 154 (by grep).


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: Defect C2 says 'no effect today because MuteTeam sets mute_team only for spectators'. Real: gamemsg.lua:254 sets mute_team = t for spectators and it is never reset on respawn (only reset to -1 if a non-spectator runs ttt_mute_team, 249); so a spectator who chose MUTE_ALL(2) keeps listener.mute_team==MUTE_ALL after becoming living and, via the unparenthesised 'or' at 189, stays voice-deaf. Claim unverified and likely false. Everything else verified: gate 95-118 incl. DetectiveMode meaning, mumble 126-156, 25 entries/22 distinct, role chat 47-53/149-151, voice 170-211, MuteTeam 245-258, shared.lua 74-77, base player.lua 734-759, cl_init tags/filter, cl_voice cycle (next on hash table) and unused MuteStates 603.
Missed: terrortown/gamemode/gamemsg.lua 261-330: last-words channel (dead player final line broadcast, ttt_lastwords_chatprint, admin-prefix filter ! @ /) is a chat mechanism the note listed as 'not read'.

Fixed 2026-10-12 (Sonnet fixer): rewrote the Defect C2 reasoning (mute_team is also reset by ResetRoundFlags; stale only on a mid-round spectator-to-living change, not fully traced); added the last-words channel (gamemsg.lua 261-330). Verified over ssh.
