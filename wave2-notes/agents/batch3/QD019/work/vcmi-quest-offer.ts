// Seer-hut quest queue: requirement tree, deadline, one-shot or repeatable, two-phase completion.
// Clean-room shape only (vcmi is GPL): names and structure are our own.
type Hero = { level: number; xp: number; primary: number[]; artifacts: Set<string>; day: number };

type Req =
  | { kind: 'leaf'; test: (h: Hero) => boolean }
  | { kind: 'tree'; allOf?: Req[]; anyOf?: Req[]; noneOf?: Req[] };

// noneOf must all fail, allOf must all pass, anyOf is open when empty, else one must pass.
function allowed(r: Req, h: Hero): boolean {
  if (r.kind === 'leaf') return r.test(h);
  if (r.noneOf?.some(x => allowed(x, h))) return false;
  if (r.allOf?.some(x => !allowed(x, h))) return false;
  if (!r.anyOf || r.anyOf.length === 0) return true;
  return r.anyOf.some(x => allowed(x, h));
}

type Quest = {
  id: string;
  lastDay: number | null;       // inclusive deadline; null = no limit
  repeatable: boolean;
  done: boolean;
  difficultyOk: boolean;
  req: Req;
  cost: { resources: number; take: string[] };   // taken on accept
  reward: { xp: number };
  seenBy: Set<string>;
};
type Hut = { quests: Quest[]; index: number; advancePending: boolean };

const available = (q: Quest, day: number): boolean =>
  (q.lastDay === null || day <= q.lastDay) && q.difficultyOk && (q.repeatable || !q.done);

// Walk the list circularly from the active index; if nothing is offerable the index stays put.
function advance(hut: Hut, day: number): void {
  const n = hut.quests.length;
  for (let step = 1; step <= n; step++) {
    const idx = (hut.index + step) % n;
    if (available(hut.quests[idx], day)) { hut.index = idx; break; }
  }
  hut.advancePending = false;
}

// Visit: skip a finished or expired quest first, then say what is needed or offer completion.
function visit(hut: Hut, hero: Hero, playerId: string, day: number): 'empty' | 'show-requirements' | 'offer-completion' {
  if (hut.quests.length === 0) return 'empty';
  if (hut.advancePending || !available(hut.quests[hut.index], day)) advance(hut, day);
  const q = hut.quests[hut.index];
  q.seenBy.add(playerId);
  return allowed(q.req, hero) ? 'offer-completion' : 'show-requirements';
}

// Accept: re-check the requirements, then take the cost and mark done in the same step; the grant
// (XP) and the next quest come later. fix: the donor takes the cost without re-checking requirements.
function accept(hut: Hut, hero: Hero, answer: number, optionCount: number): boolean {
  if (answer < 0 || answer > optionCount) return false; // range-check the answer
  const q = hut.quests[hut.index];
  if (!allowed(q.req, hero)) return false;              // requirements can still be stale; check again
  for (const a of q.cost.take) hero.artifacts.delete(a);
  if (!q.repeatable) q.done = true;
  hut.advancePending = true;
  return true;
}

// Called once the grant (XP, level-up, garrison prompt) has fully ended; only then offer the next quest.
function grantFinished(hut: Hut, day: number): void {
  if (!hut.advancePending) return;
  if (!hut.quests.some((q, i) => i !== hut.index && available(q, day))) return; // no re-offer of a repeatable-only hut
  advance(hut, day);
}

export {};
