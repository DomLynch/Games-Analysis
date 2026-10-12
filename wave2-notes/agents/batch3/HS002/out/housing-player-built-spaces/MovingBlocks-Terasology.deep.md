# MovingBlocks-Terasology (housing-player-built-spaces, cell 3)

Donor: `/mnt/frankendom-donors/MovingBlocks-Terasology/engine/src/main/java/org/terasology/engine/entitySystem/entity/internal/OwnershipHelper.java` with the owned-reference metadata, `network/internal/NetworkSystemImpl.java` 601-675, `persistence/internal/EntityStorer.java` 44-60 and `persistence/internal/AbstractStorageManager.java` 185-200 | Licence: Apache-2.0 (root `LICENSE`, "Version 2.0, January 2004"; source headers "SPDX-License-Identifier: Apache-2.0") | Java | symbols `OwnershipHelper.listOwnedEntities`, `NetworkSystemImpl.onEntityComponentRemoved`, `AbstractStorageManager.deactivateOrDestroyEntityRecursive`

Checked: this is an entity-containment mechanism, not a housing system. Searched the box with grep for plot, claim, protection, house, homestead, home and ownership terms: the only hits are entity ownership (`Owns`, `OwnershipHelper`, network owner) and no plot, claim, size limit, decay or house permission exists in the engine. The `modules/` folder holds build files only (module content is not in the box), so gameplay modules that might hold a housing or claim feature could not be read. Read in full: `OwnershipHelper.java` (74 lines), `Owns.java` (23), `engine-tests/.../stubs/OwnerComponent.java` (17), `ComponentFieldMetadata.java` 36-50, `ComponentMetadata.java` 58-70, `NetworkSystemImpl.java` 601-675 (the three owner hooks), `EntityStorer.java` 44-60, `AbstractStorageManager.java` 185-200. Not read: the entity `destroy` path (whether destroying an owner removes its components and so runs the removal hook), `EntityRef.setOwner` body, the load path that rebuilds owned children, and what `mode.isAuthority()` returns. Confidence: high on the three cascade rules; depth is thin because only the containment part transfers.

## 1. Mechanism

- Declaration: a component field annotated `@Owns` whose type is `EntityRef`, or a collection or map of `EntityRef`, is an owned reference (`ComponentFieldMetadata` 36; `Owns.java` 22). A component with any such field is a reference owner (`ComponentMetadata` 64-65).
- Owned set = immediate children only. `listOwnedEntities(EntityRef)` (`OwnershipHelper` 30) reads each owned field of each reference-owner component, keeps the refs that still exist, and does not recurse. The javadoc above it says so.
- The four rules below (adopt, cascade, save, deactivate) are not one ordered sequence; adopt and cascade are authority-only network hooks, save and deactivate are storage steps:
  - Component added or changed: for each owned child whose owner is not this entity, `setOwner(entity)` is called (`NetworkSystemImpl` 610 and 664-674; the check is at 669, the set at 670). So the child is adopted by the parent.
  - Component removed: every owned child is destroyed (`NetworkSystemImpl` 614-625; `forEach(EntityRef::destroy)` at 624). This is the cascade.
  - Save (`EntityStorer` 48-60): runs only when the entity is active (`isActive`, 49); before the owner is serialised, each owned child that is persistent and not always-relevant is stored first, recursively.
  - Deactivate (`AbstractStorageManager` 191-204): only if the owner is active. Each owned child that is not always-relevant is destroyed if not persistent, and deactivated recursively if persistent. The donor's own TODO at 196 asks whether destroy is recursive. After the children, the owner itself is deactivated for storage (`deactivateForStorage`, ~203).
  - The `Owns` javadoc states the contract: an owned entity is persisted and restored along with its owner.
- Tick: none. Every rule is event-driven.

## 2. Key functions

- `OwnershipHelper.listOwnedEntities(EntityRef)`: `/mnt/frankendom-donors/MovingBlocks-Terasology/engine/src/main/java/org/terasology/engine/entitySystem/entity/internal/OwnershipHelper.java` 30-41; the field filter is at 51.
- `NetworkSystemImpl.onEntityComponentRemoved`: `/mnt/frankendom-donors/MovingBlocks-Terasology/engine/src/main/java/org/terasology/engine/network/internal/NetworkSystemImpl.java` 614-625 (cascade).
- `NetworkSystemImpl.updatedOwnedEntities`: same file 664-674 (adopt).
- `EntityStorer` save block: `/mnt/frankendom-donors/MovingBlocks-Terasology/engine/src/main/java/org/terasology/engine/persistence/internal/EntityStorer.java` 51-53.
- `AbstractStorageManager.deactivateOrDestroyEntityRecursive`: `/mnt/frankendom-donors/MovingBlocks-Terasology/engine/src/main/java/org/terasology/engine/persistence/internal/AbstractStorageManager.java` 191-200.

## 3. Numbers vs mechanism (table)

| Rule | Formula / value | Range or value seen | file:line |
|---|---|---|---|
| Owned set | immediate children of each `@Owns` field | depth 1 only | OwnershipHelper.java 30, 51 |
| Owned field types | EntityRef, or Collection / Map of EntityRef | three shapes | ComponentFieldMetadata.java 36-37 |
| Adopt on add or change | child.owner = owner, only if different | boolean check | NetworkSystemImpl.java 669-670 |
| Cascade on owner component removal | destroy every owned child | all children | NetworkSystemImpl.java 624 |
| Save | persistent, not always-relevant children saved first | recursive | EntityStorer.java 52-53 |
| Deactivate | non-persistent destroyed; persistent recursive | boolean split | AbstractStorageManager.java 195-199 |

No numeric constants. The rules are the order and the persistent / always-relevant flags.

## 4. TypeScript sketch

simplified: keeps the donor's three hooks (adopt on change, save children first recursively then the owner, deactivate with a persistent split and an active-owner gate). It replaces the donor's destroy on owner removal with a `settle` callback, because a silent destroy loses player items under the one-ledger rule. It also clears the owned list after settling, which the donor does not do. It omits the authority gate, the owner's own `deactivateForStorage` call (donor ~203), the active-only gate on save (donor `store` runs only when `isActive`), the replication, the always-relevant flag on the owner itself, and the donor's unknown behaviour of entity destroy (not read).
```ts
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
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/terasology-owned-cascade.ts) exits 0.

## 5. Lands in

- TARGET `origins/server/housing-ownership.ts` (new). A plot row owns its furniture and storage rows; the owner list is declared on the plot row (data), and the server adopts children on write and saves persistent children with their plot.
- Parity-checklist row 23 is the hint for this topic. It fits the save and despawn rules (what persists and what is removed with a plot), not population; Lead should confirm the row or add one.
- Reuse tag: rewrite-from-idea (Apache-2.0; code may be adapted, this sketch is still written from the mechanism)
- Brief rule served: one ledger (removal goes through settle, never a silent destroy); zones as data (owned rows are data); server-verified (adopt and cascade run on the authority only).

## 6. Gaps and risks

- Not a housing system. There is no plot, no size or placement limit, no decay or upkeep, no house permission (owner, friend, guild) and no instancing in the box. "Owner" here means containment only, not who may enter or build.
- Destroy on owner removal (NetworkSystemImpl 624) is silent item loss. Under the one-ledger rule each owned child must go to `settle()` (refund, mail or return to bank), never destroy. The sketch does this.
- Possible null in the cascade: `onEntityComponentRemoved` calls `listOwnedEntities(entity.getComponent(component))` after the component was removed (NetworkSystemImpl 624); if `getComponent` then returns null the call would fail. Not run. Fix in Frankendom: capture the owned ids before removal.
- Unclear: whether destroying an owner removes its components and so runs the removal hook (the entity destroy path was not read). If it does not, owned children would outlive a destroyed plot.
- The donor's own TODO (AbstractStorageManager 196) asks whether destroy is recursive. The deactivate path (197-199) recurses only through persistent children.
- Save order is children first (EntityStorer 52-53). The matching load path (which must recreate children before the owner) was not read.
- Authority gate: the cascade and adopt run only when `mode.isAuthority()` (NetworkSystemImpl 623, 666). That matches the server-verified rule, but the client-side mirror of ownership was not read.
- Gameplay modules are not in the box (`modules/` has build files only), so a housing or claim feature in a module could not be checked.

Best transferable idea: a declared owned-reference field (data, not code) that makes the server adopt the child, save it with its owner, and route child removal through one settle step.

Decision (proposed): adapt - take the declared owned-children list and the save-children-first order; replace the destroy with the ledger settle step, and keep the persistent / non-persistent split as the rule for what travels with a plot. Reject the silent destroy.
Acceptance: when a guild hall plot is demolished, a server test asserts that each furniture or storage row becomes a ledger return (refund or mail), none disappears silently, and a saved plot reloads with its persistent furniture rows.

Reuse tag: rewrite-from-idea (Apache-2.0; code may be adapted, this sketch is still written from the mechanism)
Brief rule served: one ledger; zones as data; server-verified cascade (authority only)


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: Cited lines and behaviour all hold (OwnershipHelper 30-41/51, NetworkSystemImpl 614-625 cascade with destroy at 624, adopt 664-674 with check 669/set 670, authority gate 623/666, EntityStorer 51-53, AbstractStorageManager 191-200 with TODO at 196, Apache-2.0, modules/ only build files). Sketch deviations not listed in its omissions: donor deactivateOrDestroyEntityRecursive finishes with getEntityManager().deactivateForStorage(entity) (line ~203) which the sketch's deactivate() lacks; donor store() only runs when entity.isActive() which sketch saveOrder lacks. Mechanism section says 'order of the three hooks' then lists four items (cosmetic).
Missed: Owns.java javadoc says owned entities are persisted and restored with owner (supports the save-with-owner idea); onEntityComponentRemoved calls listOwnedEntities(entity.getComponent(component)) after removal - possible null component, which the note flags only as unread.

Fixed 2026-10-12 (Sonnet fixer): verified on the donor. Added the missing deactivateForStorage step and the active-only save gate to the mechanism and to the sketch's omission list (code unchanged); fixed 'order of the three hooks' wording (four rules, not one sequence); noted the Owns javadoc contract and the possible null component in the cascade (flagged as unread-behaviour, not run).
