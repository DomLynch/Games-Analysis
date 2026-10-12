# ioquake-ioq3 (quests-dialogue, cell 1)

Donor: `/mnt/frankendom-donors/ioquake-ioq3/code/botlib/be_ai_chat.c` (with `code/game/ai_dmq3.c`, `code/game/ai_chat.c`, `code/game/ai_main.c`, `code/game/ai_dmnet.c` as callers) | Licence: GPL-2.0-or-later (file header: "either version 2 of the License, or (at your option) any later version"; repo COPYING.txt is GPL v2) | C | symbol `BotReplyChat`, `BotChooseInitialChatMessage`, `BotCheckConsoleMessages`

Checked: Read in full or in the cited ranges: `botlib/be_ai_chat.c` BotReplyChat 2634-2781, BotChooseInitialChatMessage 2428-2480, BotInitialChat 2513-2587, BotExpandChatMessage 2279-2405, BotConstructChatMessage 2400-2419, RandomString 1068-1087, StringContainsWord 508-546, StringsMatch 1377-1444, BotQueueConsoleMessage 326-361, reply-rule key parser and validator 1846-1960 and 1739-1834; `botlib/be_ai_chat.h` 34 and 66; `game/ai_dmq3.c` BotCheckConsoleMessages 4611-4706 and its caller 5217-5261; `game/ai_main.c` 214-238; `game/ai_chat.c` 347-380 (BotValidChatPosition), 387-392 (BotChat_EnterGame, first check only), 943-949 (BotChatTime). Candidates for the quests topic: `botlib/l_script.c` (the list hint; a generic script lexer, not dialogue), `game/ai_vcmd.c` (team voice orders set a timed team goal, 172-224), and a repo-wide grep of `code/` for quest, objective, reward found no quest state, objective ledger or reward ledger in game logic. Not read: BotMatchMessage (`game/ai_cmd.c` 1787), the weighted-synonym body (`be_ai_chat.c` 797-830, only 801-813 seen), the per-frame caller of BotDeathmatchAI, and the other BotAI_BotInitialChat call sites in `game/` (about 280 lines mention it; one call read: `game/ai_dmnet.c` 571). Confidence: moderate. This is a flat list of rules with priorities and cooldowns, not a dialogue tree; this donor has no quest state, objectives or rewards, so the topic's quest half is NONE here.

Best transferable idea: a bark or reply picker where the highest-priority rule whose conditions hold is chosen, then a random line that is not on its own 20-second cooldown is used.
Decision (proposed): adapt - keep the priority rules and per-line cooldown for enemy barks; drop the typed-text matching; the donor's defects are fixed in the sketch (the reply pick ignoring cooldown, AND/NOT-only rules never firing, off-by-one variable bound). Reason: Frankendom's fights need varied short call-outs from several enemies without spam, and the decision stays in the engine so the fight record can show it.
Acceptance: In a 1 vs 3 fight a low-health enemy calls out a line; a server test asserts that the same line is not chosen again within 20 s, that a higher-priority rule beats a lower one, that a rule made only of NOT keys can fire, and that the duel step keeps running while a bark is shown.

## 1. Mechanism

Two dialogue paths share one store of lines. Both use the same 20-second cooldown per line.

(a) Initial chat, by event type. Game code calls `BotAI_BotInitialChat(bs, "kill_start", buf, NULL)` (`game/ai_dmnet.c` 571 is the one call read; about 280 lines in `game/` mention the function) with a type name and up to eight variables (`game/ai_main.c` 214-237). `BotInitialChat` (`be_ai_chat.c` 2513) asks `BotChooseInitialChatMessage` (2428) for a line of that type. That function counts the lines not on cooldown (2444). If there is at least one, it draws a random index over them (2464), walks the list and skips cooldown lines (2467), and sets the chosen line's time to now + 20 (2470). If every line of the type is on cooldown, it returns the line with the smallest time and does not re-arm it (2454-2461). `BotInitialChat` then joins the variables into one string, remembering each slice's offset (2535-2583), and expands the line (`BotConstructChatMessage` 2400). Expansion handles escape codes: `^v N^` inserts variable N, `^r name^` inserts a uniform random entry from a named list (`RandomString` 1068-1087), and the whole line is re-expanded for up to ten passes (2407). Weighted synonyms are applied last (2390).

(b) Reply, to a heard chat line. `BotReplyChat` (2634) tests every reply rule in list order. A rule is a bracketed key list, a priority (`replychat->priority = token.floatvalue;` 1959) and a set of lines. Key kinds: plain (any one matching is enough), `&` (must be present), `!` (must be absent), name, gender, bot names, string (whole word, case-insensitive, `StringContainsWord` 508), and match template with variable slots (`StringsMatch` 1377). The rule is "found" if a plain key matched and no `&` or `!` key failed (2653-2685). Among found rules the highest priority wins; a tie keeps the rule reached first (2691). The list is in reverse file order, because the loader prepends each rule (1878-1879), so on a tie the rule nearest the end of the file wins. The winning rule's line is picked with a random draw (2699-2703, see defect 1), its captured variables are appended with offsets (2716-2765), the line's time is set to now + 20 (2777), and the line is expanded as in (a).

Game side. `BotCheckConsoleMessages` (`game/ai_dmq3.c` 4611) runs once per bot AI think, called from `BotDeathmatchAI` (5217, call at 5261). It drains a FIFO console queue (4621). If fewer than ten messages are queued, a chat message is held until it is at least 1 + random() seconds old (4623-4625). A bot's own lines are dropped (4660), and team-chat lines are dropped for the reply path (4652). The bot replies only if its AI node is not `AINode_Stand`, `BotValidChatPosition` passes (`ai_chat.c` 347: no quad, haste, invisibility or similar powerup; not in lava, slime or water; a downward trace hits the world), teamplay is off, and `random() < 1.5 / (NumBots()+1)` and `random() < CHARACTERISTIC_CHAT_REPLY` (4685-4686). A successful reply removes the message, sets `bs->stand_time = FloatTime() + BotChatTime(bs)` (4695) and stops the loop. `BotChatTime` returns 2.0 (`ai_chat.c` 948); its cpm formula is commented out. The reply path does not check the per-bot 25-second gap `TIME_BETWEENCHATTING` (ai_chat.c 60), which the enter-game chat uses (392).

## 2. Key functions

- `BotReplyChat`: `/mnt/frankendom-donors/ioquake-ioq3/code/botlib/be_ai_chat.c` 2634-2781. Rule scan, priority pick, line pick, variable append, cooldown, expansion.
- `BotChooseInitialChatMessage`: `/mnt/frankendom-donors/ioquake-ioq3/code/botlib/be_ai_chat.c` 2428-2480. Ready-line count, random draw over ready lines, cooldown, all-cooldown fallback.
- `BotInitialChat`: `/mnt/frankendom-donors/ioquake-ioq3/code/botlib/be_ai_chat.c` 2513-2587. Variable join with offsets, then expansion.
- `BotConstructChatMessage` and `BotExpandChatMessage`: `/mnt/frankendom-donors/ioquake-ioq3/code/botlib/be_ai_chat.c` 2279-2419. Escape codes, ten-pass limit.
- `BotCheckConsoleMessages`: `/mnt/frankendom-donors/ioquake-ioq3/code/game/ai_dmq3.c` 4611-4706. Queue drain, reading delay, reply gate, stand time.
- `BotValidChatPosition`: `/mnt/frankendom-donors/ioquake-ioq3/code/game/ai_chat.c` 347-380. Position gate for chat.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Per-line cooldown after a line is used | 20 s (theirs, `be_ai_chat.c` 71 `#define CHATMESSAGE_RECENTTIME`, the value follows a tab on that line); a new line starts ready because the loader sets its time to minus two cooldowns (theirs, 1980 and 2139) |
| Highest-priority matching rule wins, first on a tie | Priority is a float per rule in the file (theirs, 1959); ties follow list order, which is reverse file order (1878) |
| Pick uniformly among lines that are ready | Uniform draw (theirs, 2464 initial; 2699 reply) |
| Rule fires on a plain key, but a failed `&` or `!` key blocks it | Structure of the key flags (theirs, 2666-2685) |
| Variables captured by a template | 8 slots (theirs, `be_ai_chat.h` 34) |
| Expansion repeats until stable | Ten passes (theirs, 2407) |
| Chance to answer a heard line falls as the crowd grows | 1.5 / (bots + 1), times the bot's characteristic (theirs, 4686, 4685) |
| A chat line is handled only after a short reading delay, unless the queue is long | 1 + random() s; queue threshold 10 (theirs, 4625, 4623) |
| The speaker holds its stand node after a reply | 2.0 s (theirs, `ai_chat.c` 948) |
| Gap between chats for one bot | 25 s (theirs, `ai_chat.c` 60); used by the enter-game chat (392), not by the reply path |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's priority rule, the tie rule (earlier in the array wins; the donor's list order is the reverse of the file order) and the 20-second per-line cooldown. It omits the donor's text side (whole-word string keys, match templates that capture variables, the `^v N^` and `^r name^` expansion, weighted synonyms), the game-side reading delay, the reply-chance gate, the position check and the 2-second stand. It changes the donor on purpose in three places: a rule with no ready line is skipped, so the rule below it can speak (the donor re-uses a line on cooldown); a rule made only of `&` and `!` keys can fire (the donor never fires these); and the all-cooldown fallback of the initial path is not in the sketch.

```ts
// Donor licence: GPL-2.0-or-later (ioquake3 botlib/be_ai_chat.c header). Clean-room: written from the described mechanism, not translated from the donor.
type Cond<C> = (ctx: C) => boolean;

interface Line {
  text: string;
  readyAt: number; // seconds; the line is on cooldown while readyAt > now
}

interface Rule<C> {
  priority: number; // higher wins; on a tie the earlier rule in the array wins
  any: Cond<C>[];   // plain keys: at least one must hold, when there are any
  all: Cond<C>[];   // AND keys: every one must hold
  none: Cond<C>[];  // NOT keys: none may hold
  lines: Line[];
}

interface Ctx {
  now: number;
}

const LINE_COOLDOWN_S = 20;

function fires<C extends Ctx>(r: Rule<C>, ctx: C): boolean {
  if (r.any.length + r.all.length + r.none.length === 0) return false;
  if (!r.all.every((c) => c(ctx))) return false;
  if (r.none.some((c) => c(ctx))) return false;
  if (r.any.length === 0) return true; // only AND/NOT keys: fixed here, the donor never fires these
  return r.any.some((c) => c(ctx));
}

// rng returns a value in [0, 1).
export function pickBark<C extends Ctx>(
  rules: Rule<C>[],
  ctx: C,
  rng: () => number,
): { rule: number; text: string } | null {
  let best = -1;
  let bestPriority = -Infinity;
  for (let i = 0; i < rules.length; i++) {
    const r = rules[i];
    if (!fires(r, ctx)) continue;
    if (!r.lines.some((l) => l.readyAt <= ctx.now)) continue; // fixed: fall through to a lower rule
    if (r.priority > bestPriority) {
      best = i;
      bestPriority = r.priority;
    }
  }
  if (best < 0) return null;
  const ready = rules[best].lines.filter((l) => l.readyAt <= ctx.now);
  const line = ready[Math.floor(rng() * ready.length)];
  line.readyAt = ctx.now + LINE_COOLDOWN_S;
  return { rule: best, text: line.text };
}

export {};
```

Typecheck: `tsc 5.6.3 --noEmit --strict --target es2020` on the VPS, exit 0 (run in `/tmp/QD016-bark-ioquake.ts`).

## 5. Lands in

- TARGET `src/fight/bark.ts` (new): the engine chooses the enemy line by rule priority and per-line cooldown; the client only shows the text and plays the sound. Parity-checklist row 2 (AI brain). Row 18 (loot and XP) does not fit: this donor has no rewards.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one engine decides; the client shows the line)

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism.
- No quest state, objective ledger or reward ledger exists in this donor. The quest half of the topic is NONE here; only dialogue lines are covered.
- Defect 1 (reply pick ignores cooldown): the walk at 2699-2703 counts every line in the index, but the cooldown test comes after the break, so a line still on cooldown can be chosen. Fix: filter to ready lines before the draw, as the initial path does (2444-2467). Done in the sketch.
- Defect 2 (rules made only of `&` and `!` keys never fire): found is set only by a plain key (2683-2685); the validator only warns (1833). Fix: a rule with no plain key fires when its `&` and `!` keys hold. Done in the sketch.
- Defect 3 (variable bound is off by one): `if (num > MAX_MATCHVARIABLES)` (2308) allows index 8 into an 8-slot array (`be_ai_chat.h` 66); the chat-line loader writes integer variable tokens without a range check (`be_ai_chat.c` 907), so `^v8^` is accepted at load. Fix: use `>=`. Not in the sketch, which has no variables.
- Defect 4 (all-cooldown fallback): the initial path returns a line and does not re-arm it (2454-2461), so the same line can come back while the window lasts. Fix: skip the type and use a generic line, or allow a repeat with a logged warning. Not in the sketch.
- Frankendom conflict: the donor holds the speaker standing for 2.0 s (4695). In a duel that would stall the duel step (checklist row 1). Fix: a bark is a display event; it never changes duel state, and the duel step keeps running.
- The donor's chance formula 1.5 / (bots + 1) fits a room of bots. For at most three attackers (MAX_ATTACKERS = 3) the bark rate should be a per-fight data field, not a function of count.
- The cooldown here is per line, global to the rule set. A three-enemy fight can repeat a line across enemies. Frankendom must decide whether the cooldown is per enemy or per fight.
- The donor's random draws are not seeded. The fight record (row 19) needs the rule index and line index logged for replay; the donor logs nothing.
- Zones as data: rule priorities and lines live in zone data; the 20 s cooldown is an engine default that a zone may override. The donor's typed-text matching has no place in a fight and is rejected.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: 1 (one engine decides the line; the client shows it)

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
- All claims verified against be_ai_chat.c (BotChooseInitialChatMessage, BotReplyChat, cooldowns, loader, off-by-one at 2308, BotCheckConsoleMessages, GPL v2).
- Missed (minor): bestpriority starts at -1 (2647), so a rule with priority below 0 can never win.
