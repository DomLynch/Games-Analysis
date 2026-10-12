// Licence: Apache-2.0 (donor). Sketch written from the described mechanism; the shape is re-expressed, not copied.
type Id = string;

interface Entity {
  id: Id;
  ownerId: Id | null;
  ownedIds: Id[]; // child ids held in fields marked as owned references
  persistent: boolean;
  alwaysRelevant: boolean;
  active: boolean;
}

class OwnerGraph {
  private ents = new Map<Id, Entity>();

  add(e: Entity): void {
    this.ents.set(e.id, e);
  }

  // Authority only: every owned child that is not yet owned by this entity is adopted.
  adopt(ownerId: Id): void {
    const owner = this.ents.get(ownerId);
    if (!owner) return;
    for (const childId of owner.ownedIds) {
      const child = this.ents.get(childId);
      if (child && child.ownerId !== ownerId) child.ownerId = ownerId;
    }
  }

  // Owner's owned-field is removed: each child goes to settle() instead of being destroyed (one-ledger rule).
  removeOwner(ownerId: Id, settle: (childId: Id) => void): void {
    const owner = this.ents.get(ownerId);
    if (!owner) return;
    for (const childId of owner.ownedIds) settle(childId);
    owner.ownedIds = [];
  }

  // Save order: relevant, persistent children first (recursively), then the owner.
  saveOrder(ownerId: Id, out: Id[]): void {
    const owner = this.ents.get(ownerId);
    if (!owner) return;
    for (const childId of owner.ownedIds) {
      const child = this.ents.get(childId);
      if (child && !child.alwaysRelevant && child.persistent) this.saveOrder(childId, out);
    }
    out.push(ownerId);
  }

  // Deactivation: non-persistent children are destroyed, persistent ones are deactivated recursively.
  deactivate(ownerId: Id, destroy: (childId: Id) => void): void {
    const owner = this.ents.get(ownerId);
    if (!owner || !owner.active) return;
    for (const childId of owner.ownedIds) {
      const child = this.ents.get(childId);
      if (!child || child.alwaysRelevant) continue;
      if (!child.persistent) destroy(childId);
      else this.deactivate(childId, destroy);
    }
  }
}

export {};
