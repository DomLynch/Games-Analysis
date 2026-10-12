# otland-forgottenserver (quests-dialogue, cell 12)

Donor: /mnt/frankendom-donors/otland-forgottenserver | Licence: GPL version 2 (LICENSE file: "Version 2, June 1991"; no per-file licence header read in the NPC lib) | Lua (data/npc/lib/npcsystem) | symbol KeywordHandler:processMessage / NpcHandler:onCreatureSay / NpcHandler:say

Checked: opened data/npc/lib/npcsystem/npchandler.lua 1-120 (header and defaults), 139-215, 316-358, 397-424, 487-516, 567-636 (whole onCreatureSay, onThink, say and reset paths); keywordhandler.lua 1-231 (whole file); modules.lua 35-100 and 194-240 (StdModule.say, promotePlayer, FocusModule); LICENSE lines 1-2. Callers: NpcHandler:say is called from many places; I read only the callers inside the lib (unGreet, greet, promotePlayer, StdModule.say). Grep across data/npc: talkDelay has no writer outside npchandler.lua (checked); the topic table is used by 5 files (npchandler.lua and four scripts, scripts not read). Not read: data/npc/scripts/promotion.lua and the other script files. Confidence high on the dialogue-tree search order and the focus/idle path; high on the defects listed (each is a line I read). camera_scope: not a camera cell. Depth: full for the dialogue mechanism.

Best transferable idea: a per-player cursor in a keyword tree, searched in three steps (cursor's children, parent's children, root's children), where a child that refuses returns the cursor to where it was, and a handled reply can reset the cursor to the root.
Decision (proposed): adapt — a quest or NPC dialogue for a fast MMO fits this shape (open question, answer, reset; one-time gates on a storage value), with the cursor and gates on the server. Keep the search order, cursor rollback and reset; change the defects listed below.
Acceptance: a server test asserts that "promot" opens the question, "yes" completes the promotion once and resets the cursor, a bare "yes" with no open question is not handled, a player beyond talkRadius 3 is released, and 121 s without a handled message releases focus.

## 1. Mechanism

Each NPC has a focus list of the players it is talking to (updateFocus faces the first one, 165-173), a cursor per player (`lastNode[cid]`), and a keyword tree (`KeywordNode`s with keyword lists, a callback and parameters).

Order of operations for one chat line (npchandler.lua:397-421):

1. Module callbacks and the optional `CALLBACK_CREATURE_SAY` run first.
2. If the player is out of `talkRadius` (3 tiles), the line is dropped (402-404).
3. The line goes to `keywordHandler:processMessage` only if the player is focused and speaks privately, or is not yet focused (406-407). This is how a greeting reaches the tree before focus exists.
4. The tree search (keywordhandler.lua:116-144): the cursor's children, then the cursor's parent's children, then the root's children (the root pass is skipped when the node just searched is already root: the cursor is root, or the cursor's parent is root; the test at line 136 is `node ~= root` after node was reassigned to the parent).
5. Within one parent (148-162): children are tried in `pairs` order. A child whose keywords match (every keyword is a Lua pattern found in the lower-cased line, 30-44; a custom matcher replaces this when keywords.callback is set, 31-33) gets the cursor (153). Its callback runs. If the callback returns false, the old cursor is restored (158) and the next child is tried. If it returns true, the match wins.
6. A handled line sets `talkStart[cid] = os.time()` (412, 415). Only handled lines restart the idle clock; unhandled chatter does not.

The reply: `NpcHandler:say` (609-635) cancels any pending delayed sequence (614-616). If `NPCHANDLER_TALKDELAY` is `TALKDELAY_NONE` or `shallDelay` is false it sends at once with `selfSay` (619-621); otherwise (the default, ONTHINK, and EVENT) it schedules the text with `addEvent` after `talkDelayTime * 1000` ms (625-634). A `reset` flag on the node (StdModule.say, modules.lua:53-54) moves the cursor back to root after the reply; a `moveup` parameter (55-56) instead moves the cursor up N levels via `keywordHandler:moveUp`. `promotePlayer` has a premium gate branch too (modules.lua:77, 91-93).

Release: `onThink` (487-513) walks the focus list. A focused player out of range is released through `onWalkAway` (502-503); one idle for more than `idleTime` (120 s) is released through `unGreet` (504-505). `unGreet` resets the cursor (328), says the farewell (330) and releases focus (331). Releasing clears the timers and the topic scratch value (190-209).

Quest state: there is no quest object in the lib. The gate and reward in the lib are one-time storage values: `StdModule.promotePlayer` (modules.lua:66-95) refuses if `PlayerStorageKeys.promotion` is 1 (79), refuses below a level (81), takes money in the condition (83), applies the vocation change (87), writes storage 1 (88) and resets the NPC after every branch (93).

## 2. Key functions

- `KeywordHandler:processMessage` (keywordhandler.lua:116-144): three-step search (root pass skipped when the node just searched is root).
- `KeywordHandler:processNodeMessage` (148-162): children, cursor move, callback, rollback.
- `KeywordNode:processMessage` (25-27): calls the node callback (or returns true when none).
- `KeywordNode:checkMessage` (30-44): keyword match.
- `KeywordHandler:reset` (109-113), `getLastNode` (170-172), `moveUp` (185-197), `addAliasKeyword` (72-84).
- `NpcHandler:onCreatureSay` (397-421), `onThink` (487-513), `say` (609-635), `resetNpc` (578-582), `isInRange` (567-574), `addFocus` (139-151), `releaseFocus` (176-215), `unGreet` (316-334), `greet` (337-356).
- `StdModule.say` (modules.lua:41-60), `StdModule.promotePlayer` (66-95), `FocusModule.onFarewell` (227-233).

## 3. Numbers vs mechanism

- `idleTime` = 120 seconds (npchandler.lua:67), compared with `os.time()` (504), so the granularity is one second.
- `talkRadius` = 3 (68, 573), in the units of getDistanceTo (tiles assumed; getDistanceTo not read).
- `talkDelayTime` = 1 second (69), converted to ms in `addEvent` (634).
- Multi-line replies: `doNPCTalkALot` spaces lines by `(aux - 1) * interval + 700` ms (600); the default interval is 4000 here, but `say` passes `delay or 6000` (611), so the 6000 default is the one used by `say`.
- Storage gate: value 1 means promoted (modules.lua:79, 88).

## 4. TypeScript sketch

simplified: omits the Lua pattern matching (plain substring instead, which is the fix below), the focus list and its face-the-player update, the module callbacks, `doNPCTalkALot`, the shop and travel modules, and the talk-delay queue (it is dead code in the donor; see defects). The search order (including skipping the root pass when the cursor's parent is root), the rollback and the reset flag match the donor. `moveup` is not modelled. Keyword children are ordered (an array), not `pairs`.

```ts
// Keyword dialogue tree with a per-player cursor. A message is tried against
// the cursor's children, then the cursor's parent's children, then the root's
// children. A child whose handler returns false is skipped and the cursor is
// restored, so the search continues with the next sibling.
export {};

export interface Ctx {
  playerId: string;
  message: string;
}

export interface DNode {
  keywords: string[]; // all must appear in the lower-cased message
  handle?: (ctx: Ctx) => boolean; // false = not handled here, try the next node
  reset?: boolean; // data: return the cursor to the root after a handled reply
  children: DNode[];
  parent?: DNode;
}

export function child(parent: DNode, n: DNode): DNode {
  parent.children.push(n);
  n.parent = parent;
  return n;
}

// Idle timeout: a player who has not been handled for idleSec is released.
export function idleExpired(lastHandledSec: number, nowSec: number, idleSec: number): boolean {
  return nowSec - lastHandledSec > idleSec;
}

export class Dialogue {
  private cursor = new Map<string, DNode>();

  constructor(private readonly root: DNode) {}

  reset(playerId: string): void {
    this.cursor.delete(playerId);
  }

  private cursorOf(playerId: string): DNode {
    return this.cursor.get(playerId) ?? this.root;
  }

  private tryChildren(parent: DNode, ctx: Ctx, lower: string): boolean {
    for (const c of parent.children) {
      if (!c.keywords.every((k) => lower.includes(k))) continue;
      const old = this.cursor.get(ctx.playerId);
      this.cursor.set(ctx.playerId, c);
      c.parent = parent;
      if (!c.handle || c.handle(ctx)) {
        if (c.reset) this.reset(ctx.playerId);
        return true;
      }
      if (old) this.cursor.set(ctx.playerId, old);
      else this.cursor.delete(ctx.playerId);
    }
    return false;
  }

  process(ctx: Ctx): boolean {
    const cur = this.cursorOf(ctx.playerId);
    const lower = ctx.message.toLowerCase();
    if (this.tryChildren(cur, ctx, lower)) return true;
    // Donor: `node` is reassigned to the parent before the root test, so the
    // root pass is skipped when the cursor or its parent is already the root.
    let last = cur;
    if (cur.parent) {
      last = cur.parent;
      if (this.tryChildren(last, ctx, lower)) return true;
    }
    if (last !== this.root && this.tryChildren(this.root, ctx, lower)) return true;
    return false;
  }
}

// Example: "promot" opens a question, "yes" answers it and resets the cursor.
const root: DNode = { keywords: [], children: [] };
const promote = child(root, { keywords: ["promot"], children: [], handle: () => true });
child(promote, { keywords: ["yes"], children: [], handle: () => true, reset: true });
const d = new Dialogue(root);
const opened = d.process({ playerId: "p1", message: "I want to promot" });
const answered = d.process({ playerId: "p1", message: "Yes" });
const expired = idleExpired(0, 121, 120);
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

Target: origins/quests/dialogue.ts (NPC dialogue tree runtime, server side; the dialogue trees are read as data from the zone catalogue).
Parity row: 20 (catalogue as runtime source: the dialogue trees are data read at runtime, not fixed code). The idle and range release sit in the server tick and the input intake (row 5 sub-line: intake), but the row to cite is 20.

## 6. Gaps and risks

- One engine and server-verified: this is server code, which fits. Frankendom must keep the cursor, the gates and any reward on the server. The client only renders the line.
- Zones as data: the donor builds the tree in Lua code per NPC. Frankendom needs the same tree as data in the zone catalogue (keywords, gate id, reply, reset flag).
- One ledger: `promotePlayer` changes the vocation and removes money through the player API (modules.lua:83, 87), not through a ledger entry. Frankendom must route any reward or cost through the one ledger.
- Pit as client: dialogue is not part of the Pit; the Pit only receives the result if it needs one.
- MAX_ATTACKERS = 3: not applicable.
- Defect 1 (onlyFocus always true): modules.lua:46 `not parameters.onlyFocus or parameters.onlyFocus` is true for nil and for false, so no node can answer unfocused players. fix: `local onlyFocus = parameters.onlyFocus ~= false`.
- Defect 2 (talk-delay queue is dead): npchandler.lua:490-497 reads `self.talkDelay` in the ONTHINK branch, but nothing writes it (the only other mentions are the init at 115 and the clear at 494), while `say` uses `addEvent` in every mode except TALKDELAY_NONE or shallDelay=false (619-634). The header calls ONTHINK the default (6, 10), which is not what runs: the ONTHINK queue is never filled. fix: delete the loop, or make `say` write the queue; pick one and state it.
- Defect 3 (pairs order): keywordhandler.lua:150 iterates children with `pairs`, and the first match wins. Lua does not guarantee `pairs` order. fix: `ipairs`.
- Defect 4 (Lua pattern keywords): keywordhandler.lua:37 calls `string.find(message, v)` without the plain flag, so a keyword with a magic character matches as a pattern (a keyword with "+" or "." does not match literally). fix: `string.find(message, v, 1, true)`.
- Defect 5 (alias reparenting): `addAliasKeyword` adds the same children to a new node (81), and `addChildKeywordNode` sets their parent to the alias (89). The "no" branch then goes to the alias, not to the original parent, until a match resets the parent (154). The two extra arguments passed at line 79 (`prevNode.condition, prevNode.action`) are fields that KeywordNode never defines. fix: keep the children's parent as the original node, and drop the two arguments.
- Defect 6 (interval default mismatch): the multi-line default is 4000 (600) but `say` passes 6000 (611). fix: one constant.
- Probable defect (not confirmed): `FocusModule.messageMatcher` checks word edges with `"[%w+]"` (modules.lua:239), a character class that includes a literal "+". fix: check intent; if the edge check is alphanumeric only, use `%w`.
- Design note (not a defect): the idle clock restarts only on handled lines (412-415), so chatter the tree does not understand lets the focus expire. Keep it, and say so in the spec.

Reuse tag: donor-only (GPL-2; clean-room, shape only, no line translation); no Frankendom search was done in this pass.
Brief rule served: judge the idea, not the genre (rule 2); receipts for every cited line (rule 10, 139 verified across the three cells); keep the idea and fix the defects (Dom's 2026-10-10 rule).

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR.
- Root pass skip: the note and sketch said skipped only when the cursor is root; donor line 136 tests the reassigned node, so it is also skipped when the cursor's parent is root. The sketch searched root children twice for a depth-1 cursor. Confirmed against keywordhandler.lua 116-144.
- Defect 2 over-claimed that `say` always uses addEvent; npchandler.lua 619-621 sends at once with selfSay for TALKDELAY_NONE or shallDelay false. The dead-talkDelay-loop claim itself holds.
- Missed: StdModule.say has a `moveup` option besides `reset` (modules.lua 55-56); promotePlayer has a premium gate branch (77, 91-93).

Fixed 2026-10-12: root-pass skip rule corrected in step 4, Key functions, sketch header and sketch code (also in work/tfs-dialogue-tree.ts); defect 2 and the reply paragraph now say addEvent is used except in NONE mode or shallDelay false; moveup and the premium gate added.
