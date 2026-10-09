# otland-forgottenserver (quests-dialogue, cell 12)

Donor: /mnt/frankendom-donors/otland-forgottenserver/data/npc/lib/npcsystem/npchandler.lua | Licence: GPL-2 | Lua (NPC scripts; the matrix says C++, the file is Lua) | symbol NpcHandler:greet / NpcHandler:onCreatureSay (input line 337 verified: `NpcHandler:greet`; `onCreatureSay` at 397)

## 1. Mechanism
- A Lua NPC dialogue framework. Each engine event (creature appears, creature says something, greet, farewell, trade, think) enters a handler. A handler first runs an optional override callback. If that returns true, it runs the module chain: each module can answer the event, and a module returning false stops the chain.
- Speech path (onCreatureSay, 397-421): first the override callback, then the module chain (399-401); only if both pass does it check range (402-404; out of range stops). If a keyword handler is attached, the text goes to it when the speaker is not focused, or is focused and the message type is a private NPC message (407). If the keyword handler matches, the talk-start time is recorded (415); if it matches nothing, the default-message callback runs and the time is recorded only if that callback exists and returns true (410-413). So an unmatched line with no default callback does not refresh the idle timer.
- Focus: `focuses` is a list, not a single slot, so an NPC can hold several focused players at once (`addFocus` appends and sets topic 0, 139-151; `isFocused` 154-161). `updateFocus` (165-173) points the engine's creature focus (where the NPC looks) at the first focused player only. `releaseFocus` (176-220) cancels pending delayed speech, removes the player from the list, clears the per-player event, talk-start and topic state, runs the release callbacks, and closes any shop window.
- Greet (337-356): the override callback, then the module chain, then the greeting message with the player's name substituted and spoken; if either gate refuses it returns without focusing; then `addFocus`. Farewell (`unGreet` 316-334) runs the same gates, resets the keyword state, says the farewell and releases focus. Appear, disappear, end-trade, close-channel, buy, sell and trade-request events (359-484) all use the same callback-then-modules gate.
- onThink (487-513; the engine-side glue that calls it was not read): after the override callback, delayed messages are sent when their time has come (talk-delay mode think, 490-497); then, if the module chain passes, each focused player is handled in list order: out of range means `onWalkAway` (says a goodbye line chosen by sex, resets the keyword state, releases focus; 532-564); idle for more than `idleTime` seconds (measured with `os.time()`, 504) means `unGreet`; otherwise `updateFocus`.
- `isInRange` (567-574) is true only for a player creature whose distance to the NPC is at most `talkRadius`. Inputs: engine events and chat lines. Outputs: NPC speech, focus changes, module side effects. Intended to run on the engine's think cycle and on each event (the calling glue was not read).

## 2. Key functions
- NpcHandler:processModuleCallback (otland) | /mnt/frankendom-donors/otland-forgottenserver/data/npc/lib/npcsystem/npchandler.lua | 247-288 | runs the module chain for one event id; any false stops it.
- NpcHandler:greet (otland) | /mnt/frankendom-donors/otland-forgottenserver/data/npc/lib/npcsystem/npchandler.lua | 337-356 | callback, module chain, greeting with name token, then focus.
- NpcHandler:onCreatureSay (otland) | /mnt/frankendom-donors/otland-forgottenserver/data/npc/lib/npcsystem/npchandler.lua | 397-421 | range and focus gate, keyword dispatch, default fallback, idle timestamp.
- NpcHandler:onThink (otland) | /mnt/frankendom-donors/otland-forgottenserver/data/npc/lib/npcsystem/npchandler.lua | 487-513 | walk-away release, idle un-greet, focus refresh.
- NpcHandler:addFocus / updateFocus / releaseFocus (otland) | /mnt/frankendom-donors/otland-forgottenserver/data/npc/lib/npcsystem/npchandler.lua | 139-151 / 165-173 / 176-220 | the focus list, the facing target, and the full release.
- NpcHandler:unGreet / onWalkAway (otland) | /mnt/frankendom-donors/otland-forgottenserver/data/npc/lib/npcsystem/npchandler.lua | 316-334 / 532-564 | farewell and walk-away release paths.
- NpcHandler:isInRange (otland) | /mnt/frankendom-donors/otland-forgottenserver/data/npc/lib/npcsystem/npchandler.lua | 567-574 | distance check against the talk radius.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Event chain with an override first and a stop-on-false module list | Event id names and module callback names (theirs) |
| A focus list per NPC with an idle timeout and a range release | idleTime 120 seconds and talkRadius 3 (theirs, npchandler.lua lines 67-68, overridable per NPC at npcsystem.lua 64 and 68) |
| Keyword dispatch, then a default line when nothing matched | Default message id MESSAGE_ (theirs, constants at lines 13-35); callback ids (lines 38-55) |
| Idle sweep on the think cycle: release when out of range or idle too long | Think-cycle timing (theirs, engine) |

## 4. TypeScript sketch
simplified: the sketch is a reduced model with a focus set. It omits the override callback (each event first runs an optional callback that can stop the event, then the module chain), the greet message and `unGreet` farewell, the keyword reset, the delayed-speech queues, the shop state, the facing target (`updateFocus`), and the private-message-type test (it passes a boolean). It does keep: module chain with stop-on-false, range check after the chain, keyword dispatch only for an unfocused speaker or a private message from a focused one, the default line refreshing the idle timer only when it returns true, and the think sweep (range release, then idle release, seconds not milliseconds).

```ts
// Licence: GPL-2 (otland-forgottenserver). CLEAN-ROOM: written from the mechanism, no donor lines.
type Module = { onSay?: (who: string, text: string) => boolean | void };
interface NpcState { focuses: string[]; talkStart: Map<string, number>; idleSec: number; radius: number; }

function runModules(modules: Module[], who: string, text: string): boolean {
  for (const m of modules) {
    if (m.onSay && m.onSay(who, text) === false) return false;   // false stops the chain
  }
  return true;
}

function onSay(
  npc: NpcState, who: string, dist: number, text: string, isPrivate: boolean, modules: Module[],
  keywords: (who: string, t: string) => boolean, defaultLine: (who: string, t: string) => boolean, nowSec: number,
): void {
  if (!runModules(modules, who, text)) return;
  if (dist > npc.radius) return;                                  // range is checked after the chain
  const focused = npc.focuses.includes(who);
  if (focused && !isPrivate) return;                              // a focused player must speak privately
  if (keywords(who, text)) npc.talkStart.set(who, nowSec);
  else if (defaultLine(who, text)) npc.talkStart.set(who, nowSec); // default refreshes only if it says yes
}

function onThink(npc: NpcState, dist: (p: string) => number, nowSec: number, release: (p: string) => void): void {
  for (const p of [...npc.focuses]) {
    if (dist(p) > npc.radius) release(p);                        // walked away
    else {
      const t = npc.talkStart.get(p);
      if (t !== undefined && nowSec - t > npc.idleSec) release(p); // idle, ungreet
    }
  }
}
```

## 5. Lands in
- Frankendom target: `origins/talk/talk.ts` and `origins/server/talk-pick.ts` already take a pick-a-line model (no chat parsing, no keyword matching), so this donor is an alternative input model rather than a replacement. The reusable part is the walk-away and idle release of a conversation, which would be a server rule on the talk state. Both files exist on the VPS snapshot /root/work-k7 (not main); only `origins/talk/README.md` and headers were read.
- Parity-checklist row: none of rows 1 to 22. Feature-map section: Origins O2 talk (`origins/talk/README.md`, `docs/specs/origins/gothic-dialogue.md`); post-K item 3 (server tick) is the clock any idle or range sweep would use.
- Reuse tag: rewrite-from-idea (GPL-2; the focus-plus-idle pattern maps, the code does not)
- Brief rule served: (category default, not per-cell) zone-schema rule; rules 7-9 n/a

## 6. Gaps and risks
- Dialogue is text-in, text-out through chat, with keyword matching. Frankendom's talk is a server-checked line pick (`origins/talk/talk.ts` offers a choice list), so the chat keyword path should not be copied.
- Range and idle timing run on the engine's think cycle with `os.time()` in whole seconds (504). Frankendom would use server time from the tick (post-K item 3), never a client clock.
- Several players can be focused on one NPC (list at 144), with per-player state keyed by creature id. Frankendom's per-character talk state already fits that; the facing target only follows the first.
- The module chain is code with side effects (shop, quests) that runs before the range check (401-404). Frankendom conditions and effects are data with a fixed verb set, evaluated by the server.
- NPC range is a distance in tiles to the player (`talkRadius` 3). Frankendom zones are data, so an NPC's talk radius belongs in its NPC content, not code.
- Pit is a client only and has no NPC talk.
- The file is GPL-2, so only the mechanism is described here.
- Not read: the keyword handler (`keywordHandler:processMessage`), the shop and quest modules, `say` and the delayed-speech code (584-640), and `npcsystem.lua` beyond lines 40-70 (grep only).
