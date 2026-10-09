# OpenGothic (quests-dialogue, cell 12)

Donor: /mnt/frankendom-donors/OpenGothic/common/game/gamescript.cpp | Licence: MIT | C++ | symbol GameScript::updateDialog / GameScript::exec / saveQuests (input line 932 verified: `updateDialog`; `exec` at 956; `saveQuests` at 536)

## 1. Mechanism
- Dialogue is a list of Info entries from the game's script data. Each Info has a text line, a script function it runs, and a list of choices. An Info can also be the NPC's "information" line, which marks it as known.
- updateDialog(dlg, player, npc) (932-954): returns an empty list if the choice has no Info handle (933). Binds the script globals self (the NPC) and other (the player) for the call (938-939). Walks the Info's sub-choices in order, builds one DlgChoice per choice (title, script function id, the same Info handle, not a trade line, sort index = position), and returns them through `sort` (3409-3413: ordered by sort number, then script function id, "to reproduce behavior of original game"). It evaluates no condition itself.
- The conditions are in the caller `dialogChoices` (871-930, read now): it collects the NPC's Infos, then for the important tier first and the rest after, skips an Info the listener already knows unless it is permanent (890-892), skips important permanent Infos named in the `except` list (894-903), calls the Info's condition script function through the VM and skips it when it returns 0 (905-913), and builds a DlgChoice from the Info's description, information function, trade flag and number (915-921). The first non-empty tier is returned sorted.
- exec(choice, player, npc) (956-976): binds the same globals, and stops the player's animation when player and npc are different (962-963). If the chosen script function is the Info's own information function (966), it records the Info as known for the PLAYER (the donor passes the player's handle into `setNpcInfoKnown`, whose parameter is named npc, 967 and 3415-3418). Otherwise it erases every sub-choice of the Info whose function equals the chosen one (969-973), so a one-shot sub-choice disappears. Then it calls the choice's script function by index (975).
- Save: saveQuests (536-543) writes the quest state (`quests.save`), the count and each known (first, second) pair as two 32-bit ids, and then `gilAttitudes`. loadQuests (545-556) reads them back in the same order. `doesNpcKnowInfo` (3420-3423) looks the pair up; the first id is the symbol index of the instance passed in (the player, as above), the second is the Info's instance index.
- Inputs: the chosen DlgChoice, the player and NPC handles. Outputs: a new choice list, one script call, and a changed known-set. What the quest object itself holds (`quests.save`) is not read.
- Tick: event-driven, once per menu selection.

## 2. Key functions
- GameScript::updateDialog (OpenGothic) | /mnt/frankendom-donors/OpenGothic/common/game/gamescript.cpp | 932-954 | builds the sorted choice list from an Info, binding self and other first.
- GameScript::exec (OpenGothic) | /mnt/frankendom-donors/OpenGothic/common/game/gamescript.cpp | 956-976 | marks info known or removes a one-shot choice, then calls the script function.
- GameScript::dialogChoices (OpenGothic) | /mnt/frankendom-donors/OpenGothic/common/game/gamescript.cpp | 871-930 | top-level menu: condition and told-state filtering, important tier first, then sort.
- GameScript::sort / setNpcInfoKnown / doesNpcKnowInfo (OpenGothic) | /mnt/frankendom-donors/OpenGothic/common/game/gamescript.cpp | 3409-3413 / 3415-3418 / 3420-3423 | ordering by sort number then function id; the told-set insert and lookup.
- GameScript::saveQuests (OpenGothic) | /mnt/frankendom-donors/OpenGothic/common/game/gamescript.cpp | 536-543 | writes quest state, known-info pairs and attitudes.
- GameScript::loadQuests (OpenGothic) | /mnt/frankendom-donors/OpenGothic/common/game/gamescript.cpp | 545-556 | reads them back in the same order.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Dialogue node = text + script hook + choice list, built per selection | Info and choice structure from the Gothic data format (theirs) |
| One-shot choice: remove after use, so the line cannot repeat | Removal rule by function id (theirs, lines 969-973) |
| Known-set keyed on (player, Info) pair for "already heard" state | Pair keyed on two uint32 ids (theirs, lines 3416 and 540) |
| Bind self and other as script globals for the duration of the call | Global names self and other (theirs, Daedalus convention, lines 938-939) |

## 4. TypeScript sketch
simplified: the sketch covers `updateDialog` and `exec` only. It omits the null-handle guard, the self/other script bindings, the player animation stop, the `dialogChoices` filtering (told state, permanent and important rules, the condition call), the `isTrade` flag, the `loadQuests` half and the quest and attitude save. Its sort is by position only; the donor breaks ties by script function id.

```ts
// Licence: MIT (OpenGothic). Logic lifted from common/game/gamescript.cpp
// (updateDialog, exec) and rewritten in TS with local types.
interface Choice { title: string; fn: number; sort: number; }
interface Info { id: number; information: number; choices: Choice[]; }
interface DlgChoice { title: string; fn: number; sort: number; info: Info; }

const known = new Set<string>();           // "playerId:infoId"
const knownKey = (player: number, info: number) => `${player}:${info}`;

function updateDialog(info: Info): DlgChoice[] {
  const out: DlgChoice[] = info.choices.map((c, i) => ({ title: c.title, fn: c.fn, sort: i, info }));
  return out.sort((a, b) => a.sort - b.sort);
}

function exec(choice: DlgChoice, player: number, callScript: (fn: number) => void): void {
  const info = choice.info;
  if (info.information === choice.fn) {
    known.add(knownKey(player, info.id));   // the information line marks the info as known for this player
  } else {
    info.choices = info.choices.filter((c) => c.fn !== choice.fn); // one-shot
  }
  callScript(choice.fn);
}

function saveState(): { known: string[] } {
  return { known: [...known] };
}
```

## 5. Lands in
- Frankendom target: `origins/talk/talk.ts` (`choices` and `pick`: flat per-NPC pool, condition filter, ascending order, once-lines) and `origins/server/talk-pick.ts` (the server-side pick). Both exist on the VPS snapshot /root/work-k7 (not main) and `origins/talk/README.md` there already cites this donor's rules through `docs/specs/origins/gothic-dialogue.md`; I read the README and file headers only. This donor note is a cross-check of that module, not new work.
- Parity-checklist row: none of rows 1 to 22 (row 18 applies only to quest rewards paid on a stage, which live in `origins/quests/journal.ts`). Feature-map section: Origins O2 quests and talk (`origins/talk/README.md`, `docs/specs/origins/gothic-dialogue.md`).
- Reuse tag: adapt (MIT, so the logic can be lifted; the Gothic script VM is not reusable)
- Brief rule served: (category default, not per-cell) zone-schema rule; rules 7-9 n/a

## 6. Gaps and risks
- The donor runs the Info's condition through its script VM in `dialogChoices` (905-913), at menu-build time, on the client's process. Frankendom already evaluates conditions as data on the server (talk module and `talk-pick.ts`, per the README); do not move the check client-side.
- `exec` mutates the Info in place (969-973), so one-shot state lives in the shared data objects and is erased for everyone using that object. Frankendom keeps the once-line in per-character talk state (server-side), not in the content.
- The told-set is keyed by the listener passed in (the player instance) and the Info; in single-player there is one player. Frankendom keys it per character instance and persists it through the server ledger.
- `exec` erases every sub-choice with the same function id, not just the picked one (970-971).
- The script VM is Daedalus-specific. The mechanism is portable; the VM is not.
- Pit is a client only and has no dialogue. Dialogue content is data (zones as data); nothing here touches the fight engine, kill authority or MAX_ATTACKERS.
- Not read: `quests.save` (the quest object), `Serialize`, the `Info_AddChoice` externals (3360-3378) and the dialogue menu UI.
