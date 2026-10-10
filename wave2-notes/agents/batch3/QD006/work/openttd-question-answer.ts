// Licence: GPL-2.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type Choice = 'cancel' | 'ok' | 'no' | 'yes' | 'decline' | 'accept' | 'continue' | 'close';

export type QuestionKind = 'question' | 'information' | 'warning' | 'error';

export interface Pending {
  id: number;                 // script-chosen id, 0..65535
  kind: QuestionKind;
  addressee: string;          // one player (one character), not a company
  offered: Set<Choice>;       // 1 to 3 choices; 'question' needs at least 1
  open: boolean;
}

export type Outcome =
  | { kind: 'event'; id: number; player: string; choice: Choice }
  | { kind: 'rejected'; reason: 'unknown' | 'not-addressee' | 'not-offered' | 'already-answered' };

export class QuestionHub {
  private pending = new Map<number, Pending>();
  private queue: Outcome[] = []; // events for the parked quest script, drained once per tick

  ask(id: number, kind: QuestionKind, addressee: string, offered: Choice[]): boolean {
    if (!Number.isInteger(id) || id < 0 || id > 0xffff) return false;
    const min = kind === 'question' ? 1 : 0;
    if (offered.length < min || offered.length > 3) return false;
    if (this.pending.has(id) && this.pending.get(id)!.open) return false; // one open question per id
    this.pending.set(id, { id, kind, addressee, offered: new Set(offered), open: true });
    return true;
  }

  // A click from a player. Checked against the pending record, not trusted from the client.
  answer(id: number, player: string, choice: Choice): Outcome {
    const p = this.pending.get(id);
    if (!p) return { kind: 'rejected', reason: 'unknown' };
    if (!p.open) return { kind: 'rejected', reason: 'already-answered' };
    if (p.addressee !== player) return { kind: 'rejected', reason: 'not-addressee' };
    if (!p.offered.has(choice)) return { kind: 'rejected', reason: 'not-offered' };
    p.open = false;
    const ev: Outcome = { kind: 'event', id, player, choice };
    this.queue.push(ev);
    return ev;
  }

  // Close box or script close: resolves as 'cancel' and still sends one event (the donor sends none).
  close(id: number): Outcome {
    const p = this.pending.get(id);
    if (!p) return { kind: 'rejected', reason: 'unknown' };
    if (!p.open) return { kind: 'rejected', reason: 'already-answered' };
    p.open = false;
    const ev: Outcome = { kind: 'event', id, player: p.addressee, choice: 'cancel' };
    this.queue.push(ev);
    return ev;
  }

  drain(): Outcome[] {
    const out = this.queue;
    this.queue = [];
    return out;
  }
}

export {};
