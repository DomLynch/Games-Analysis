// Quest hand-in as one ledger transaction (shape of pmbstyle QuestStep.apply + Database.applyQuestStep).
type Stack = { id: number; selfId: number; amount: number };
type QuestRow = { state: string; variables: Record<string, string> };
type Ledger = { stacks: Stack[]; quests: Map<number, QuestRow>; exp: number; nextId: number };
type Hand = {
  questId: number;
  expected: QuestRow;            // the state the client last saw; the commit refuses if it moved
  next: QuestRow;                // proposed state; revision is bumped here
  takes: [number, number][];     // [selfId, amount]
  gives: [number, number][];     // [selfId, amount]
  exp: number;                   // already rate-multiplied before the commit
  expCap: number;                // data: highest total exp the level allows
};
type Outcome = { ok: true; grantedExp: number } | { ok: false; reason: string };

const cloneRow = (r: QuestRow): QuestRow => ({ state: r.state, variables: { ...r.variables } });
// fix: compare state and the revision counter only (the donor compares the whole variables JSON,
// which breaks on key order or any extra key).
const revisionOf = (r: QuestRow): string => r.variables['revision'] ?? '0';
const sameRow = (a: QuestRow, b: QuestRow): boolean =>
  a.state === b.state && revisionOf(a) === revisionOf(b);

// simplified: treats every item as stackable (the donor reads the item template), drops the
// equipped filter, the SQL, the beginner-shot and PK receipts, the level-up call and the expMul
// multiplier (the caller pre-multiplies). Keeps: compare-and-swap first, takes before gives,
// quest row in the same commit, exp clamp with the granted amount reported, swap only on success.
export function applyHand(ledger: Ledger, hand: Hand): Outcome {
  const work: Ledger = {
    stacks: ledger.stacks.map(s => ({ ...s })),
    quests: new Map([...ledger.quests].map(([k, v]) => [k, cloneRow(v)] as [number, QuestRow])),
    exp: ledger.exp,
    nextId: ledger.nextId,
  };
  const current = work.quests.get(hand.questId) ?? { state: 'created', variables: {} };
  if (!sameRow(current, hand.expected)) return { ok: false, reason: 'Quest step changed' };

  for (const [selfId, amount] of hand.takes) {
    if (amount < 1) continue; // a zero count is a no-op
    const held = work.stacks.filter(s => s.selfId === selfId).sort((a, b) => a.id - b.id);
    if (held.reduce((n, s) => n + s.amount, 0) < amount) return { ok: false, reason: 'Required quest items missing' };
    let left = amount;
    for (const s of held) {
      const used = Math.min(left, s.amount);
      if (!used) break;
      left -= used;
      s.amount -= used;
    }
    work.stacks = work.stacks.filter(s => s.amount > 0);
  }

  for (const [selfId, amount] of hand.gives) {
    const stack = work.stacks.find(s => s.selfId === selfId);
    if (stack) stack.amount += amount;
    else work.stacks.push({ id: work.nextId++, selfId, amount });
  }

  const revision = String(Number(current.variables['revision'] ?? '0') + 1);
  work.quests.set(hand.questId, { state: hand.next.state, variables: { ...hand.next.variables, revision } });

  const total = Math.max(0, Math.min(work.exp + Math.max(0, hand.exp), hand.expCap));
  const granted = total - Math.min(work.exp, total);
  work.exp = total;

  // commit: the in-memory ledger is replaced only after every write above succeeded
  Object.assign(ledger, work);
  return { ok: true, grantedExp: granted };
}
export {};
