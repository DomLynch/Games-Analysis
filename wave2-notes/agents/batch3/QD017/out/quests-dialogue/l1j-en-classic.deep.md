# l1j-en-classic (quests-dialogue, cell 12)

Donor: /mnt/frankendom-donors/l1j-en-classic/ | Licence: GPL-2.0 (COPYING is GPL Version 2, June 1991; source headers say "either version 2, or (at your option) any later version") | Java | symbol L1Quest.get_step / L1Quest.set_step, L1NpcXmlAction.acceptsRequest, L1NpcListedAction.execute, NpcActionTable.get, L1NpcMakeItemAction.makeItems

Checked: opened L1Quest.java (all 155 lines), L1NpcXmlAction.java (all 164), L1NpcListedAction.java (all), L1NpcMakeItemAction.java (all 204), NpcActionTable.java (lines 42-125), C_NPCTalk.java (all), C_NPCAction.java (lines 200-222), L1QuestInstance.java (all 205), L1NpcSetQuestAction.java (all), L1PcInstance.java (lines 866-880, constructor), Quest.xml (lines 1-60 read in full; element counts over all 1230 lines). The list's hint file (S_NPCTalkReturn.java) is the packet wrapper only, not the quest logic. Callers: set_step has 92 matching lines in C_NPCAction.java, plus L1MerchantInstance (2), L1FollowerInstance (4), L1NpcSetQuestAction (1); I read only C_NPCAction line 1323 and L1NpcSetQuestAction. get_step has many callers (L1MerchantInstance 404 matching lines, C_ItemUSe 27, C_NPCAction 33, L1QuestInstance 11, L1TeleporterInstance 9, DropTable 1); I read only the L1QuestInstance and L1NpcXmlAction call sites, so the claims about "all callers" are grep counts, not reads. Confidence: high on the quest-step store, the gate and the MakeItem turn-in order; medium on how far the data covers the quest graph (the Java-side branches are counted, not read). camera_scope: not applicable.

## 1. Mechanism

Quest state is one integer per (character, quest id) in the table character_quests. 0 means not started (an unknown id returns 0). 255 is the END sentinel. Any other value is a step. The first get_step call for a character runs one SELECT that loads every quest row into a map. set_step writes the row (INSERT if the id is not in the map, otherwise UPDATE) and then puts the new value in the map.

Dialogue and turn-ins are XML data in data/xml/NpcActions/Quest.xml. Each top-level Action or MakeItem has a gate with five parts: an NpcId list, a level range (default 1 to 99), a QuestId with a QuestStep (an exact step, or -1 meaning "any started quest"), a Class letter list, and a link name. NpcActionTable.get returns the FIRST top-level action whose gate accepts. The users/ directory is loaded before the base directory, so a user file wins over a base file with the same gate.

Turn-in (MakeItem): if the item is amount-inputable and more than one set is affordable, the server asks how many. makeItems then counts materials (stackables by the last stack seen, see defect 3), and on a shortage sends message 337 and runs the Fail list. It checks the 180-slot cap and a weight limit (messages 263 and 82) and runs the Fail list if either fails. Otherwise it consumes materials, stores the Item rewards through the same inventory, and runs the Succeed list. A listed action runs every child whose gate accepts, in document order; each child's gate is read at its own turn, so a child sees the writes of the children before it. The last non-empty html result wins, and if there is none the dialog closes.

Rewards are items only. The quest table's element counts are: Item 115, Material 148, MakeItem 97, Action 50, SetQuest 131, ShowHtml 140, Succeed 96, Fail 21, Teleport 8. There is no XP, gold or flag element in the quest data. Consumes and grants go through the one inventory object (pc.getInventory().consumeItem and storeItem).

Hardcoded parts: L1QuestInstance.onTalkAction picks dialogue by NPC id and step value in Java (line 113 reads QUEST_LIZARD == 1), and C_NPCAction calls set_step or set_end in code (92 matching lines). So the data covers part of the quest graph and code covers the rest.

## 2. Key functions

- L1Quest.get_step (L1Quest.java:76): lazy load at line 77 (`if (_quest == null) {`), one SELECT at line 86, map fill at line 90, lookup at line 100, returns 0 when absent.
- L1Quest.set_step (L1Quest.java:108): INSERT or UPDATE at line 114 (`if (_quest.get(quest_id) == null) {`), then the in-memory put at line 137 after the try/catch/finally.
- L1Quest.set_end (line 147) calls set_step with QUEST_END.
- L1NpcXmlAction.acceptsRequest (line 137): NpcId, then level, then quest (line 145), then class, then action name. acceptsQuest (line 127) reads `return 0 < pc.getQuest().get_step(_questId);` at line 132 when no step is given, and an exact match at line 134 otherwise.
- L1NpcListedAction.execute (line 41): for each child, re-check acceptsRequest (line 42), run it (line 45), keep the non-null html.
- NpcActionTable.get (line 105): first top-level action whose acceptsRequest is true (line 107). Load order: users/ (line 81 and 83), base (line 85).
- C_NPCTalk (line 46): talk path, first match on the talk list, else obj.onTalkAction(pc) (line 54). C_NPCAction (line 213): link-click path, first match on the link name.
- L1NpcMakeItemAction.makeItems (line 79): stackable count assignment at line 92, shortage at line 100, slot cap at line 131, consume at line 142, store at line 147. executeWithAmount: branch on makeItems at line 190, Succeed at line 192, Fail at line 197.

## 3. Numbers vs mechanism

- END sentinel 255: L1Quest.java:64.
- Level gate defaults: minimum 1 (L1NpcXmlAction.java:67), maximum 99 (line 68).
- Slot cap 180 entries: L1NpcMakeItemAction.java:131. The message codes 337 (material shortage), 263 (slots) and 82 (weight) are as read in makeItems; their line numbers are not receipted.
- Quest ids: 28 named quest constants (L1Quest.java lines 36 to 63) plus END at line 64, 29 constants in all. The step value is the only per-character number.
- Per-quest numbers (MakeItem Material and Item amounts, the QuestStep values) live in Quest.xml, for example line 4 (`<MakeItem Name="request cloak of red"`), line 9 (`Step="1" QuestId="Level15" QuestStep="0"`) and line 11 (`Step="End" QuestId="Level15" QuestStep="2"`).

simplified: Sketch of the shape only (GPL-2.0 donor, clean-room). It keeps the step log with a load before use, the five-part gate, the listed action with a snapshot, and the MakeItem turn-in order (materials, slots, consume, grant, Succeed or Fail). It omits the weight check, the stack merging, the shortage messages, the amount prompt, the Teleport and ShowHtml element types, and the quest id name table. It reorders one thing on purpose: all gates in a listed action read one snapshot taken before the call, where the donor reads live state per child. Typecheck: tsc --noEmit --strict --target es2020 on the VPS, exit 0.

```ts
// Sketch: per-player quest step log + data-gated NPC listed actions + material turn-in.
// Clean-room shape only (donor is GPL-2.0); no line-by-line translation.
type Html = string;

export const QUEST_END = 255;

export interface QuestStore {
  loadSteps(charId: number): Promise<Map<number, number>>;
  writeStep(charId: number, questId: number, step: number): Promise<boolean>;
}

export type Snap = (questId: number) => number;

export class QuestLog {
  private steps: Map<number, number> | null = null;

  constructor(private readonly charId: number, private readonly store: QuestStore) {}

  // Fix for the donor null map: the login path calls load() once, before any gate or write.
  async load(): Promise<void> {
    if (this.steps === null) {
      this.steps = await this.store.loadSteps(this.charId);
    }
  }

  get(questId: number): number {
    if (this.steps === null) throw new Error("quest log not loaded");
    return this.steps.get(questId) ?? 0;
  }

  snapshot(): Snap {
    const copy = new Map(this.steps ?? []);
    return (questId: number) => copy.get(questId) ?? 0;
  }

  // Fix for the donor in-memory write: memory changes only after the row write succeeds.
  async set(questId: number, step: number): Promise<boolean> {
    if (this.steps === null) throw new Error("quest log not loaded");
    const ok = await this.store.writeStep(this.charId, questId, step);
    if (ok) this.steps.set(questId, step);
    return ok;
  }
}

export interface Gate {
  npcIds?: number[];
  levelMin?: number;
  levelMax?: number;
  classes?: string[];
  quest?: { id: number; step: number | "started" };
}

export interface Player {
  level: number;
  cls: string;
  quests: QuestLog;
  slotsFree: number;
  inventory: Map<number, number>; // itemId -> total count (stacks summed)
}

export function gateOpen(g: Gate, p: Player, npcId: number, snap: Snap): boolean {
  if (g.npcIds && !g.npcIds.includes(npcId)) return false;
  if (g.levelMin !== undefined && p.level < g.levelMin) return false;
  if (g.levelMax !== undefined && p.level > g.levelMax) return false;
  if (g.classes && !g.classes.includes(p.cls)) return false;
  if (g.quest) {
    const s = snap(g.quest.id);
    if (g.quest.step === "started") {
      if (!(s > 0)) return false;
    } else if (s !== g.quest.step) {
      return false;
    }
  }
  return true;
}

export interface ActionChild {
  gate: Gate;
  set?: { questId: number; to: number };
  html?: Html;
}

// Listed actions: every open child runs, in order; the last non-empty html wins.
// simplified: all gates read ONE snapshot taken before the call; the donor reads live state per child.
export async function runListed(children: ActionChild[], p: Player, npcId: number): Promise<Html | null> {
  const snap = p.quests.snapshot();
  let out: Html | null = null;
  for (const c of children) {
    if (!gateOpen(c.gate, p, npcId, snap)) continue;
    if (c.set) {
      const ok = await p.quests.set(c.set.questId, c.set.to);
      if (!ok) continue;
    }
    if (c.html !== undefined) out = c.html;
  }
  return out;
}

export interface Turnin {
  gate: Gate;
  materials: { itemId: number; amount: number }[];
  rewards: { itemId: number; amount: number }[];
  succeed: ActionChild[];
  fail: ActionChild[];
}

// Material check, slot check, consume, grant, then Succeed or Fail. One inventory map is the ledger.
// simplified: one slot per reward line (no stack merging); no weight check; no shortfall messages.
export async function turnIn(t: Turnin, p: Player, npcId: number): Promise<Html | null> {
  if (!gateOpen(t.gate, p, npcId, p.quests.snapshot())) return null;

  const haveMaterials = t.materials.every((m) => (p.inventory.get(m.itemId) ?? 0) >= m.amount);
  const slotsNeeded = t.rewards.length;
  if (!haveMaterials || p.slotsFree < slotsNeeded) {
    return (await runListed(t.fail, p, npcId)) ?? "close";
  }

  for (const m of t.materials) {
    p.inventory.set(m.itemId, (p.inventory.get(m.itemId) ?? 0) - m.amount);
  }
  for (const r of t.rewards) {
    p.inventory.set(r.itemId, (p.inventory.get(r.itemId) ?? 0) + r.amount);
  }
  p.slotsFree -= slotsNeeded;

  return (await runListed(t.succeed, p, npcId)) ?? "close";
}

export {};
```

## 4. TypeScript sketch

Sketch file: /private/tmp/p2/wave2-haiku/batch3/QD017/work/l1j-en-classic-quest-turnin.ts (same content as the block above). Typecheck on the VPS (/tmp/l1j-en-classic-quest-turnin.ts): exit 0.

## 5. Lands in

Target file (proposed; not checked against the Frankendom repo): origins/quests/quest-log.ts for the step log and the gate, with the turn-in in origins/quests/turnin.ts. Parity row 18 (loot roll and XP award): quest rewards here are item grants only, so this lands on the reward side of row 18. The state write is server-side only; the client sends the link name and the item choice.

## 6. Gaps and risks

Defects, each with the fix used in the sketch:

1. Null map on a fresh session. L1PcInstance.java:878 builds an empty L1Quest, and nothing loads it at login (C_LoginToServer has no quest call). set_step reads _quest directly (L1Quest.java:114), and get_step is the only loader. A SetQuest reached through an ungated Action (Quest.xml:28-29) on a session where no gate ran first would dereference null. Reachability is by reading only; not reproduced; the handling of that exception above C_NPCAction is not read. Fix: QuestLog.load() at login, before any gate or write.
2. Memory written after a failed SQL write. The map put at L1Quest.java:137 is after the try/catch, so an SQLException is logged and the new step is still kept in memory, while the row was not written. The next restart reverts it. Fix: update memory only when the write succeeds (QuestLog.set).
3. Stackable count by assignment. L1NpcMakeItemAction.java:92 is `count = x.getCount();`, so with two stacks only the last one counts. Whether the inventory can hold two stacks of one material was not read, so this is latent. Fix: sum the stacks.
4. Quest logic in Java. L1QuestInstance.java:113 and 92 set_step matches in C_NPCAction hardcode NPC ids and steps. The data form (Quest.xml, 131 SetQuest uses) is the one that fits "zones as data". Fix: new quest steps go in data; the code only runs the gates.
5. Order-dependent chains. Each listed child reads live state (L1NpcListedAction.java:42), so an earlier child's SetQuest can gate a later sibling. Quest.xml:9 and :11 are in one Succeed list and are safe only because their step values differ. Fix: snapshot the gates at the start of a listed action (the sketch does this), and mark any chain that depends on order.
6. Turn-in is not atomic. Materials are consumed (L1NpcMakeItemAction.java:142) before storeItem (line 147). What happens if storeItem fails after the consume was not read. Fix: check slots before consume (the donor does) and make the consume and grant one server transaction.

Frankendom gaps against the rulings: there is no quest step log and no data-driven NPC action tree in Frankendom's current rulings (not checked against the repo). The one-ledger ruling fits this donor's shape (consume and grant through one inventory object). The donor has no XP, gold or flag in quest data, so quest XP would need its own rule. Server-verified: the donor's turn-in runs on the server, which matches the ruling.

Licence note: GPL-2.0 copyleft. Clean-room: the sketch is written from the described shape, not translated from the Java.

Reuse tag: adapt (the data-gated NPC action tree and the per-character step log, with defects 1 to 5 fixed in the sketch).

Brief rule served: 12 quests-dialogue (STRONG, full depth); addendum rule "keep the idea, fix the defect" (decision adapt); parity row 18 for the reward side.

Best transferable idea: a quest is a per-character integer step with an END value, and every NPC line is a data row gated on npc, level, class, and step, with a Succeed or Fail branch for item turn-ins.

Decision (proposed): adapt — keep the data-gated action tree and the step log; the donor's login-load, write-after-commit, and Java-branch defects are fixed in the sketch, so the data form is what Frankendom would build.
Acceptance: a server test: a player at step 1 turns in the item, the materials are consumed, the reward is granted and the step moves to END in one server transaction; a forced DB write failure leaves the in-memory step unchanged; a fresh login's first SetQuest runs without a prior gate call.
