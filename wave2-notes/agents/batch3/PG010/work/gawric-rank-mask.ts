// Licence: Apache-2.0 (donor). Clean-room sketch of the rank-mask shape (one bit per privilege, edit by rank, leader holds all). Not a translation of the donor's C#.
export {};

// One bit per clan privilege. Each value is a single power of two (donor: ClanPrivileges.cs).
const PRIV = {
  JOIN_CLAN: 2,
  GIVE_TITLE: 4,
  VIEW_WAREHOUSE: 8,
  MANAGE_RANKS: 16,
  PLEDGE_WAR: 32,
  DISMISS: 64,
  EDIT_CREST: 128,
  MASTER_RIGHTS: 256,
  MANAGE_LEVELS: 512,
} as const;
const ALL_CLAN = 1022; // 2 + 4 + ... + 512

// Donor rule (ByteUtils.CombineFlags): every input must be one set bit, then OR them together.
function combine(flags: number[]): number {
  let mask = 0;
  for (const f of flags) {
    if (f <= 0 || (f & (f - 1)) !== 0) throw new Error(`not a single privilege bit: ${f}`);
    mask |= f;
  }
  return mask;
}

// Donor rule (ByteUtils.SplitMask): peel the lowest set bit until none are left.
function split(mask: number): number[] {
  const out: number[] = [];
  for (let m = mask; m !== 0; m &= m - 1) out.push(m & -m);
  return out;
}

// Apply step: the checked boxes become one mask for the rank. Zero entries (headers) are dropped.
function maskFromChecks(checked: number[]): number {
  return combine(checked.filter((f) => f !== 0));
}

// Display and check helper. The donor's leader override is display-only; here it is a rule.
function effectiveMask(rankMask: number, isLeader: boolean): number {
  return isLeader ? ALL_CLAN : rankMask;
}

// Frankendom rule (not in the donor): only a holder of MANAGE_RANKS may edit a rank,
// and an edit may never grant a bit the editor does not hold.
function applyRankEdit(editorMask: number, editorIsLeader: boolean, checked: number[]): number {
  const editor = effectiveMask(editorMask, editorIsLeader);
  if ((editor & PRIV.MANAGE_RANKS) === 0) throw new Error("refused: no MANAGE_RANKS");
  const next = maskFromChecks(checked);
  if ((next & ~editor) !== 0) throw new Error("refused: grants a bit the editor does not hold");
  return next;
}

const officer = PRIV.MANAGE_RANKS | PRIV.JOIN_CLAN;
const next = applyRankEdit(officer, false, [PRIV.JOIN_CLAN, PRIV.GIVE_TITLE].filter((b) => (officer & b) !== 0));
console.log(next, split(next));
