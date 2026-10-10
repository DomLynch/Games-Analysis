# Anuken-Mindustry (progression, cell 3)

Donor: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/ui/dialogs/ResearchDialog.java` | Licence: GNU GPL version 3 (`LICENSE`: "GNU GENERAL PUBLIC LICENSE, Version 3, 29 June 2007"; no "any later version" clause found in `core/src` (grep count 0), so treat as GPL-3.0 only; clean-room, shape only) | Java | symbol `ResearchDialog.spend`

Checked: The list hint (`content/ErekirTechTree.java`) is a content list of tech nodes. Its only mechanism lines are the per-item cost multipliers (56-66), so the real mechanism is elsewhere. I grepped `research`, `requirements`, `unlock` and `researchCostMultiplier` across `core/src` and read: `ResearchDialog.selectable` (403-406), `canSpend` (551-565), `spend` (567-606), `unlock` (608-625), the progress label (682-700), the node click that calls `spend` (484-485); `TechTree.java` node constructor (100-139), `reset` and `save` (176-200), the sector objective (46-47); `Block.researchRequirements` (1284-1295, with the field at 385); `UnitType.researchRequirements` (1403-1418, with the field at 112); `Control.checkAutoUnlocks` (348-358); `Objectives.Research.complete` (11-26); `ErekirTechTree.java` 55-70. Not read: `UI.roundAmount` (used at UnitType 1415; body not located), `Mathf.round(value, precision)` (Block 1289; body not read), `unlockedHost()` (body not read), `checkNodes` and the rest of ResearchDialog's layout, the consumers of `ResearchEvent` (GameService and EventType, only located), and the item cost table. Camera scope: not applicable (progression). Confidence: high on the spend and unlock path (all read end to end); medium on the cost formula, because the rounding helper was not read.

## 1. Mechanism

- Tree shape. A `TechNode` has a parent, the content it unlocks, a requirement list (`ItemStack[]`), an objective list and children (TechTree 78-100). A node's content dependencies become `Research` objectives (130-133), and a sector node inserts a sector-complete objective at position 0 (47). `selectable` is true when the content is unlocked on the host, or when every objective is complete (403-406). An objective is complete when its content is unlocked on the host (Objectives.java 21-23).
- Costs. For a block, each requirement's cost is `round(60 x m + amount^1.11 x 20 x m x itemMult, 10)` where `m` is the block's research multiplier (default 1, Block 385) and `itemMult` is the per-item multiplier (default 1) (Block 1284-1295). For a unit, the cost is the build requirements times the unit's research multiplier (default 50, UnitType 112), rounded by `UI.roundAmount` (UnitType 1410-1415). Each tree node copies the requirements and scales each amount by the tree's per-item map when it is built (TechTree 118-123). Maps are inherited down the tree (109). The Erekir root sets a map with 0.9 for every item and overrides for oxide (0.5), surgeAlloy (0.7), carbide (0.3) and phaseFabric (0.2) (ErekirTechTree 56-66).
- Partial payment (the core mechanism). `spend(node)` (567-606) walks the requirements in order. For each one, `used = max(min(amount still needed, items the core holds), 0)` (580). It removes `used` from the core (581), adds it to the node's finished amount (582), and marks the node incomplete if any requirement is still short (590). The node unlocks only when every requirement is met (595-596). A partly paid node keeps its progress, so the player can pay the rest on a later visit.
- Unlock. `unlock(node)` unlocks the node's content (609), then every ancestor's content (612-614). The code comment says the parent unlock is for multiplayer (611), but the loop runs in every mode. A `ResearchEvent` is fired (624).
- Gate on the UI action. A click on a locked node calls `spend` only if `canSpend` is true (484-485). `canSpend` (551-565) requires the node to be selectable (552 via the `selectable` check), and then returns true if some requirement is short and the core holds that item (557-559). It falls back to "still locked" (564). The button is disabled when `canSpend` is false (767).
- Progress meter. The label is `min(floor(used / sum x 100), 99)`, where `sum` and `used` weight each amount by the item's cost value (690-695). The meter cannot show 100 before the node unlocks.
- Persistence. `save` writes each requirement's finished amount to `Core.settings` under `req-<content>-<item>` (194-200). `reset` zeroes the finished amounts (178-183). The settings are the local client's settings, not shared state.
- Auto-unlock. `Control.checkAutoUnlocks` (350-358) unlocks nodes that have no requirements, an unlocked parent, and no incomplete objectives (354-355).
- Timing: event-driven. Nothing runs per tick.

## 2. Key functions

- `ResearchDialog.spend`: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/ui/dialogs/ResearchDialog.java` 567-606. The partial-payment loop, then unlock.
- `ResearchDialog.canSpend`: the same file, 551-565. The gate.
- `ResearchDialog.unlock`: the same file, 608-625. Content and ancestors unlock; event fired.
- `ResearchDialog.selectable`: the same file, 403-406.
- Progress label: the same file, 682-700 (weights at 690-691, cap at 695).
- `TechTree.TechNode` constructor and dependencies: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/content/TechTree.java` 104-139.
- `TechTree.TechNode.save` and `reset`: the same file, 178-200.
- `Block.researchRequirements`: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/world/Block.java` 1284-1295.
- `UnitType.researchRequirements`: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/type/UnitType.java` 1405-1420.
- `Control.checkAutoUnlocks`: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/core/Control.java` 350-358.
- Erekir multiplier map: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/content/ErekirTechTree.java` 55-66.

Callers: `spend` is called from the node click (484-485) and from the research button action (767). `canSpend` is called from 484, 509 and 767. Other callers of `unlock` (`checkAutoUnlocks` calls `content.unlock()` directly) were not all located.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Pay toward a cost from whatever stock is on hand, remembering what is paid | None (control flow, ResearchDialog 580-582) |
| Unlock only when every requirement is paid | None (control flow, 590-596) |
| Cost formula for a block: base + power of the amount, times a multiplier, rounded | Base 60, scale 20, exponent 1.11, rounding step 10 (Block 1289). `m` default 1 (Block 385) |
| Unit cost from build requirements | Multiplier 50 (UnitType 112, 1415) |
| Per-tree, per-item cost multiplier inherited by subtrees | Erekir default 0.9; oxide 0.5; surgeAlloy 0.7; carbide 0.3; phaseFabric 0.2 (ErekirTechTree 57-63) |
| Progress meter weighted by item worth, capped before completion | Cap 99 (ResearchDialog 695) |
| Ancestors unlock with the node | None (control flow, 612-614) |
| Dependencies as objectives | None (TechTree 130-133) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for spending: for each requirement, take the smaller of what is still needed and what is held; then unlock only if every requirement is met; then unlock the ancestors. It also keeps the selectable test, the `canSpend` fallback to "still locked" and the progress cap. It omits: the cost formula (rounding helper not read), the tree-level multiplier map and its inheritance, dependency objectives built from content, the sector objective, the client-side guard, the research event, the settings persistence (Frankendom keeps progress in the server ledger instead), the auto-unlock pass, and the zero-requirement case of the progress label (the sketch returns 0).

```ts
// Licence: GPL-3.0 (donor). Clean-room sketch of the mechanism, not a translation of the donor lines.
// Costs, weights and the 99% display cap are inputs here, not the donor's numbers.
// clean-room
interface Need {
  item: string;
  amount: number;   // total needed
  done: number;     // progress already paid in
}

interface ResearchNode {
  needs: Need[];
  objectivesDone: boolean;     // every prerequisite objective complete
  unlocked: boolean;
  parent?: ResearchNode;
}

// Pay toward each unmet need from the ledger, taking the smaller of what is still needed and what is held.
// The node completes only when every need is met; then the node and its ancestors unlock.
function spend(node: ResearchNode, ledger: Map<string, number>, onUnlock: (n: ResearchNode) => void): void {
  let complete = true;
  for (const n of node.needs) {
    const held = ledger.get(n.item) ?? 0;
    const used = Math.max(Math.min(n.amount - n.done, held), 0);
    ledger.set(n.item, held - used);
    n.done += used;
    if (n.done < n.amount) complete = false;
  }
  if (complete) {
    node.unlocked = true;
    for (let p = node.parent; p !== undefined; p = p.parent) p.unlocked = true;
    onUnlock(node);
  }
}

// Visible once unlocked, or once every prerequisite objective is complete.
function selectable(node: ResearchNode): boolean {
  return node.unlocked || node.objectivesDone;
}

// Spending is offered while something is still unpaid and the ledger holds that item,
// and also while the node is still locked (as the donor does).
function canSpend(node: ResearchNode, ledger: Map<string, number>): boolean {
  if (!selectable(node)) return false;
  if (node.needs.length === 0) return true;
  if (node.needs.some(n => n.done < n.amount && (ledger.get(n.item) ?? 0) > 0)) return true;
  return !node.unlocked;
}

// Progress is weighted by each item's worth and capped at 99 until the node unlocks.
function progressPercent(node: ResearchNode, worth: Map<string, number>): number {
  let sum = 0;
  let used = 0;
  for (const n of node.needs) {
    const w = worth.get(n.item) ?? 1;
    sum += w * n.amount;
    used += w * n.done;
  }
  if (sum === 0) return 0;
  return Math.min(Math.floor((used / sum) * 100), 99);
}
```

Typecheck: the block plus `export {}` passes `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (exit 0, file `/tmp/Anuken-Mindustry-research.ts`).

## 5. Lands in

- TARGET `origins/progression/research.ts` (proposed path; the Frankendom file tree was not read). Parity-checklist row 20 (catalogue as runtime source): the tree, its costs and its objectives are catalogue data read at runtime. Row 21 (catalogue fields) would hold the cost fields.
- The ledger that pays the cost is the one ledger (server state), and the unlock is server-verified. The client only shows the meter and the button.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room, shape only)
- Brief rule served: addendum anti-strictness rules 1-6 (real code opened, no genre downgrade, honest licence); Frankendom rulings "one ledger", "zones as data" (per-tree multipliers as data)

## 6. Gaps and risks

- Progress is saved in `Core.settings`, which is local to the client (194-200). In Frankendom, progress must live in the server ledger. Do not port the settings persistence.
- The multiplayer comment (611) says the parent unlock is a multiplayer rule, but the code unlocks ancestors in every mode. Frankendom should decide whether an unlock always unlocks its ancestors, and test that choice.
- `canSpend` returns true while the node is still locked (564), even when the ledger holds nothing (the button can be enabled with nothing to pay). Frankendom should disable the action when nothing can be paid, and not copy the fallback.
- Partial payment lets whatever is on hand pay the next requirement in list order (580). A player with a large stock of one item can spend it before the rest is covered. Frankendom needs an explicit payment order if fairness matters.
- The cost formula grows with amount^1.11, so large builds become expensive quickly. This is a design choice, and Frankendom should set its own exponent as data, not copy 1.11.
- The progress meter's weights are the item's own worth (`item.cost`), so cheap items count for less progress. The weight is not in the donor's tree data (690-691).
- The objective check (`Research.complete`, Objectives.java 21-23) depends on the host's unlock state, so a multiplayer client may disagree; the code comment at 404 admits a desync for sectors. Frankendom's server must be the only source.
- Not read: `UI.roundAmount`, `Mathf.round` with precision, `unlockedHost()`, the layout code (`checkNodes`, `rebuildTree`), the consumers of `ResearchEvent`, and the full item cost table.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room, shape only)
Brief rule served: addendum rules 1-6; Frankendom rulings "one ledger", "server-verified" unlocks, "zones as data"; parity row 20

Best transferable idea: Let the player pay for an unlock in instalments from whatever the ledger holds, keep the partial progress, and unlock only when the whole cost is paid, with the parent unlocking along with it.
Decision (proposed): adapt - the instalment payment, the all-or-nothing unlock and the objective gate are a good progression shape; Frankendom must keep the progress on the server ledger (not client settings), decide the ancestor-unlock rule explicitly, and disable spending when nothing can be paid.
Acceptance: a server test: an unlock needing 40 of an item with 25 held moves 25 from the ledger, shows 62 percent and stays locked; the next grant of 15 completes it, unlocks its parent, and leaves the ledger at zero for that item; a spend with an empty ledger changes nothing and is refused.



## Checker findings (Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code.

**Errors / corrections:** Block cost formula is shown as round(60m + amount^1.11*20*m*itemMult, 10) but the real code wraps the result in UI.roundAmount (Block.java:1291); note lists UI.roundAmount only for units. canSpend has a client guard (`|| net.client()` ResearchDialog ~552) and spend returns on a client; the mechanism text omits it (the sketch omission list does mention a client-side guard). All other claims hold (spend loop 580-596, unlock ancestors, 99 cap, 0.9/0.5/0.7/0.3/0.2 map, checkAutoUnlocks, save/reset keys).

**Missed:** Block.researchRequirements returns empty when researchCostMultiplier<=0 and honours a researchCost override (Block.java:1285-1286); UnitType filters zero-amount stacks so they auto-unlock.
