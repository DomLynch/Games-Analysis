// Keyword dialogue tree with a per-player cursor. A message is tried against
// the cursor's children, then the cursor's parent's children, then the root's
// children. A child whose handler returns false is skipped and the cursor is
// restored, so the search continues with the next sibling.
export {};

export interface Ctx {
  playerId: string;
  message: string;
}

export interface DNode {
  keywords: string[]; // all must appear in the lower-cased message
  handle?: (ctx: Ctx) => boolean; // false = not handled here, try the next node
  reset?: boolean; // data: return the cursor to the root after a handled reply
  children: DNode[];
  parent?: DNode;
}

export function child(parent: DNode, n: DNode): DNode {
  parent.children.push(n);
  n.parent = parent;
  return n;
}

// Idle timeout: a player who has not been handled for idleSec is released.
export function idleExpired(lastHandledSec: number, nowSec: number, idleSec: number): boolean {
  return nowSec - lastHandledSec > idleSec;
}

export class Dialogue {
  private cursor = new Map<string, DNode>();

  constructor(private readonly root: DNode) {}

  reset(playerId: string): void {
    this.cursor.delete(playerId);
  }

  private cursorOf(playerId: string): DNode {
    return this.cursor.get(playerId) ?? this.root;
  }

  private tryChildren(parent: DNode, ctx: Ctx, lower: string): boolean {
    for (const c of parent.children) {
      if (!c.keywords.every((k) => lower.includes(k))) continue;
      const old = this.cursor.get(ctx.playerId);
      this.cursor.set(ctx.playerId, c);
      c.parent = parent;
      if (!c.handle || c.handle(ctx)) {
        if (c.reset) this.reset(ctx.playerId);
        return true;
      }
      if (old) this.cursor.set(ctx.playerId, old);
      else this.cursor.delete(ctx.playerId);
    }
    return false;
  }

  process(ctx: Ctx): boolean {
    const cur = this.cursorOf(ctx.playerId);
    const lower = ctx.message.toLowerCase();
    if (this.tryChildren(cur, ctx, lower)) return true;
    if (cur.parent && this.tryChildren(cur.parent, ctx, lower)) return true;
    if (cur !== this.root && this.tryChildren(this.root, ctx, lower)) return true;
    return false;
  }
}

// Example: "promot" opens a question, "yes" answers it and resets the cursor.
const root: DNode = { keywords: [], children: [] };
const promote = child(root, { keywords: ["promot"], children: [], handle: () => true });
child(promote, { keywords: ["yes"], children: [], handle: () => true, reset: true });
const d = new Dialogue(root);
const opened = d.process({ playerId: "p1", message: "I want to promot" });
const answered = d.process({ playerId: "p1", message: "Yes" });
const expired = idleExpired(0, 121, 120);
