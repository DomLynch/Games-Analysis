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
