// Licence: Apache-2.0 (donor LICENSE). Re-expressed from the logic read in Combat/TargetManager.cs; not a line copy.
export type Cand = { id: number; dist: number; visible: boolean };

// Donor default _maximumTargetDistance = 15f (Inspector value not read). Units.
export const RANGE = 15;

export interface TabTarget {
  candidates: Cand[];      // nearest first; in range and visible
  index: number;           // cursor into candidates
  current: number | null;  // selected target id
  engaged: number | null;  // attack target id (second state)
}

// Rebuild the list, then keep the cursor valid.
export function refresh(st: TabTarget, all: Cand[]): void {
  st.candidates = all
    .filter(c => c.dist <= RANGE && c.visible)
    .sort((a, b) => a.dist - b.dist);
  if (st.index >= st.candidates.length) st.index = 0;
  if (st.current !== null) {
    const pos = st.candidates.findIndex(c => c.id === st.current);
    if (pos < 0 || pos !== st.index) st.index = 0;
  }
}

// Tab: step past the current target and wrap. Empty list = no-op.
export function nextTarget(st: TabTarget): number | null {
  if (st.candidates.length === 0) return null;
  let i = st.index >= st.candidates.length ? 0 : st.index;
  if (st.current !== null && st.candidates[i].id === st.current) i++;
  if (i >= st.candidates.length) i = 0;
  st.index = i;
  select(st, st.candidates[i].id);
  return st.current;
}

// Selecting a different target drops the attack state.
export function select(st: TabTarget, id: number): void {
  if (st.current !== id) st.engaged = null;
  st.current = id;
}

// Second press on the selected monster engages it. NPCs and dead targets never engage.
export function engage(st: TabTarget, isMonster: boolean, isDead: boolean): void {
  if (st.current !== null && isMonster && !isDead) st.engaged = st.current;
}
export {};
