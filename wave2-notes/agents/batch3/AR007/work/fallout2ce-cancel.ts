// Licence: Sustainable Use License 1.0 (donor, restricted). Clean-room: written from the described cancel and priority rules, not translated.
export type Step =
  | { kind: "clip"; owner: string; clip: string }
  | { kind: "effect"; forced: boolean; run: () => void };

export interface Chain {
  steps: Step[];
  started: number;        // steps started so far
  prioritised: boolean;   // reg-cut leaves this chain alone
  insignificant: boolean; // yields to a new step for the same owner
  noStand: boolean;       // do not return the owner to stand when cut
  ended: boolean;
  owners: Set<string>;    // owners with a clip step in this chain
}

export const MAX_CHAINS = 32;
export const NON_RESERVED_CAP = 20;

function endChain(c: Chain): void {
  c.ended = true;
  c.started = c.steps.length;
}

// Cut a chain: forced effects that have not started still run; unforced ones are dropped.
export function cutChain(c: Chain): void {
  if (c.ended) return;
  for (let i = c.started; i < c.steps.length; i++) {
    const s = c.steps[i];
    if (s.kind === "effect" && s.forced) s.run();
  }
  endChain(c);
}

// A new step for `owner` is refused while a significant live chain holds that owner.
// An insignificant holder is ended instead, and the new step is allowed.
export function registerOwnerStep(owner: string, live: Chain[]): boolean {
  for (const c of live) {
    if (c.ended || !c.owners.has(owner)) continue;
    if (!c.insignificant) return false;
    cutChain(c); // same end path as a cut: forced effects still run
  }
  return true;
}

// reg_anim_clear: cut the first live chain that holds `owner`. A prioritised chain is never cut.
export function clearOwner(owner: string, live: Chain[]): "cut" | "prioritised" | "none" {
  for (const c of live) {
    if (c.ended || !c.owners.has(owner)) continue;
    if (c.prioritised) return "prioritised";
    cutChain(c);
    return "cut";
  }
  return "none";
}

// Slot budget: 32 chains in total; a non-reserved request also needs fewer than 20 live non-reserved chains.
export function mayStartChain(liveCount: number, liveNonReserved: number, reserved: boolean): boolean {
  if (liveCount >= MAX_CHAINS) return false;
  return reserved || liveNonReserved < NON_RESERVED_CAP;
}

export {};
