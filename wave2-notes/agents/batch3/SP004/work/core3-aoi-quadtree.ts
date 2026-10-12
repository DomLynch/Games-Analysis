// Licence: AGPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Entity {
  readonly id: number;
  x: number;
  y: number;
  prevX: number;             // position before the last move
  prevY: number;
  readonly interest: Set<Entity>; // entities this one currently sees
}

const MIN_SPLIT = 8; // a node whose sides are both 8 units or less is not split further

function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

class QNode {
  items: Entity[] = [];
  kids: QNode[] | null = null;

  constructor(readonly x0: number, readonly y0: number, readonly x1: number, readonly y1: number) {}

  // Conservative box-versus-square test: never rejects a node that holds an entity in range; corners may pass.
  mayHit(x: number, y: number, r: number): boolean {
    const inX = this.x0 <= x && x < this.x1;
    const inY = this.y0 <= y && y < this.y1;
    if (inX && inY) return true;
    const nearX = Math.abs(this.x0 - x) <= r || Math.abs(this.x1 - x) <= r;
    const nearY = Math.abs(this.y0 - y) <= r || Math.abs(this.y1 - y) <= r;
    return (inX || nearX) && (inY || nearY);
  }
}

export class AoiIndex {
  private readonly root: QNode;

  constructor(x0: number, y0: number, x1: number, y1: number, private readonly range: number) {
    this.root = new QNode(x0, y0, x1, y1);
  }

  insert(e: Entity): void {
    this.place(this.root, e);
  }

  // Radius query: whole nodes are culled before their entities are tested.
  query(x: number, y: number, radius: number): Entity[] {
    const out: Entity[] = [];
    this.collect(this.root, x, y, radius, out);
    return out;
  }

  // Call after an entity moved: x/y are the new position, prevX/prevY the old one.
  // Leave when it is out of range now but was in range before; enter when it is in range now.
  updateInterest(mover: Entity): void {
    const r2 = this.range * this.range;

    for (const other of [...mover.interest]) {
      const nowOut = dist2(mover.x, mover.y, other.x, other.y) > r2;
      const wasIn = dist2(mover.prevX, mover.prevY, other.x, other.y) <= r2;
      if (nowOut && wasIn) {
        mover.interest.delete(other);
        other.interest.delete(mover);
      }
    }

    for (const other of this.query(mover.x, mover.y, this.range)) {
      if (other === mover) continue;
      mover.interest.add(other);
      other.interest.add(mover);
    }
  }

  private place(n: QNode, e: Entity): void {
    if (n.kids) {
      this.place(this.childFor(n, e.x, e.y), e);
      return;
    }
    // Split only when the leaf already holds an entity and is larger than the minimum in either side.
    if (n.items.length > 0 && (n.x1 - n.x0 > MIN_SPLIT || n.y1 - n.y0 > MIN_SPLIT)) {
      this.split(n);
      this.place(this.childFor(n, e.x, e.y), e);
      return;
    }
    n.items.push(e);
  }

  private split(n: QNode): void {
    const mx = (n.x0 + n.x1) / 2;
    const my = (n.y0 + n.y1) / 2;
    n.kids = [
      new QNode(n.x0, n.y0, mx, my),
      new QNode(mx, n.y0, n.x1, my),
      new QNode(n.x0, my, mx, n.y1),
      new QNode(mx, my, n.x1, n.y1),
    ];
    const old = n.items;
    n.items = [];
    for (const e of old) this.place(n, e);
  }

  private childFor(n: QNode, x: number, y: number): QNode {
    const mx = (n.x0 + n.x1) / 2;
    const my = (n.y0 + n.y1) / 2;
    const idx = (x >= mx ? 1 : 0) + (y >= my ? 2 : 0);
    return n.kids![idx];
  }

  private collect(n: QNode, x: number, y: number, r: number, out: Entity[]): void {
    const r2 = r * r;
    for (const e of n.items) {
      if (dist2(e.x, e.y, x, y) <= r2) out.push(e);
    }
    if (n.kids) {
      for (const k of n.kids) {
        if (k.mayHit(x, y, r)) this.collect(k, x, y, r, out);
      }
    }
  }
}

export {};
