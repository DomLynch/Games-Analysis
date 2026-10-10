// Licence: MIT (donor). Clean-room sketch of the pattern, written from the donor's described order, not a translation.
type Value = number | string | boolean;

// The one store. On Frankendom the server implements it; the dialogue writes nowhere else.
export interface Ledger {
  get(key: string): Value | undefined;
  set(key: string, value: Value): void;
}

export type Step =
  | { op: "line"; id: string }
  | { op: "addOption"; id: string; enabled: boolean; to: number }
  | { op: "showOptions" }
  | { op: "command"; text: string }
  | { op: "set"; key: string; value: number }
  | { op: "jump"; to: number }
  | { op: "stop" };

export type Status = "running" | "waitingOption" | "waitingContinue" | "stopped";

export interface PendingOption { id: string; to: number; enabled: boolean; }

export interface Candidate { id: string; complexity: number; failing: number; to: number; }

export interface Client {
  line(id: string): void;
  command(text: string): void;
  options(list: PendingOption[]): void;
}

// The parked script: it holds its place (pc, pending options) until the client calls choose() or continue().
export class ParkedDialogue {
  status: Status = "stopped";
  private pc = 0;
  private pending: PendingOption[] = [];

  constructor(
    private readonly nodeName: string,
    private readonly steps: Step[],
    private readonly ledger: Ledger,
    private readonly client: Client,
  ) {}

  run(): void {
    if (this.status === "waitingOption") throw new Error("still waiting on a choice");
    this.status = "running";
    while (this.status === "running") {
      const s = this.steps[this.pc];
      this.pc += 1;
      if (s === undefined) { this.finish(); return; }
      switch (s.op) {
        case "line":
          this.client.line(s.id);
          this.status = "waitingContinue";
          return;
        case "command":
          this.client.command(s.text);
          this.status = "waitingContinue";
          return;
        case "addOption":
          this.pending.push({ id: s.id, to: s.to, enabled: s.enabled });
          break;
        case "showOptions":
          if (this.pending.length === 0) { this.status = "stopped"; return; }
          this.status = "waitingOption";
          this.client.options(this.pending.slice());
          return;
        case "set":
          this.ledger.set(s.key, s.value);
          break;
        case "jump":
          this.pc = s.to;
          break;
        case "stop":
          this.finish();
          return;
      }
    }
  }

  choose(index: number): void {
    if (this.status !== "waitingOption") throw new Error("not waiting on a choice");
    const opt = this.pending[index];
    if (opt === undefined || !opt.enabled) throw new Error("no such enabled option");
    this.pending = [];
    this.pc = opt.to;
    this.status = "waitingContinue";
  }

  continue(): void {
    if (this.status === "waitingContinue") this.run();
  }

  private finish(): void {
    const key = `$Yarn.Internal.Visiting.${this.nodeName}`;
    const seen = this.ledger.get(key);
    this.ledger.set(key, (typeof seen === "number" ? seen : 0) + 1);
    this.status = "stopped";
  }
}

const viewKey = (id: string): string => `$Yarn.Internal.Content.ViewCount.${id}`;

function viewsOf(ledger: Ledger, id: string): number {
  const v = ledger.get(viewKey(id));
  return typeof v === "number" ? v : 0;
}

// Drop failing candidates, keep the least-viewed group, then the highest complexity inside it, then pick one at random.
// Committing a pick adds one to its view count.
export function pickCandidate(cands: Candidate[], ledger: Ledger, rand: () => number = Math.random): Candidate | undefined {
  const live = cands.filter(c => c.failing === 0);
  if (live.length === 0) return undefined;
  const fewest = Math.min(...live.map(c => viewsOf(ledger, c.id)));
  const least = live.filter(c => viewsOf(ledger, c.id) === fewest);
  const top = Math.max(...least.map(c => c.complexity));
  const best = least.filter(c => c.complexity === top);
  const pick = best[Math.floor(rand() * best.length)];
  ledger.set(viewKey(pick.id), viewsOf(ledger, pick.id) + 1);
  return pick;
}

export {};
