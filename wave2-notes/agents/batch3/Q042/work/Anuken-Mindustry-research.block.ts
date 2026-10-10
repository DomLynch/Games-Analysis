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
