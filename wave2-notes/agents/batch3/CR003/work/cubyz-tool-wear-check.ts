// clean-room: shape of the mechanism only (donor is GPL-3.0). Numbers are data fields, not copied.
interface Tool {
  durability: number;      // u32-like, never below 0
  damage: number;          // break strength before the block's resistance
  tags: Set<string>;       // tags this tool is effective on
}

interface Block {
  resistance: number;      // subtracted from the tool's damage
  tags: Set<string>;
}

interface UseOp {
  tool: Tool;
  previous: number;        // stored before the change, for rollback
  cost: number;
}

// A break needs damage above the block's resistance. Only an effective tool pays wear.
// Returns the wear cost (0 or 1), or null when the block cannot be broken.
function breakCost(tool: Tool | null, block: Block, handDamage: number): number | null {
  const effective = tool !== null && [...block.tags].some(t => tool.tags.has(t));
  const raw = effective ? (tool as Tool).damage : handDamage;
  if (raw - block.resistance <= 0) return null;
  return effective ? 1 : 0;
}

// Server-side ledger write. Saturating: durability never goes below zero.
function applyWear(tool: Tool, cost: number): { op: UseOp; destroyed: boolean } {
  const previous = tool.durability;
  tool.durability = Math.max(0, tool.durability - cost);
  return { op: { tool, previous, cost }, destroyed: tool.durability === 0 };
}

// Undo one write when a later step of the same command is refused.
function rollbackWear(op: UseOp): void {
  op.tool.durability = op.previous;
}
export {};
