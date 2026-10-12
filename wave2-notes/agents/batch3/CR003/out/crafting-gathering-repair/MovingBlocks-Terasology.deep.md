# MovingBlocks-Terasology (crafting-gathering-repair, cell 30)

Donor: `/mnt/frankendom-donors/MovingBlocks-Terasology/engine/src/main/java/org/terasology/engine/world/block/entity/BlockEntitySystem.java` (drop roll; with `logic/health/EntityDestructionAuthoritySystem.java` for the break pipeline and `world/block/entity/damage/BlockDamageModifierComponent.java` for the per-source fields) | Licence: Apache License 2.0 (`LICENSE`, "Version 2.0, January 2004"; source headers "SPDX-License-Identifier: Apache-2.0") | Java | symbol `BlockEntitySystem.commonDefaultDropsHandling`

Checked: Scope: this donor has crafting, armour wear, repair, salvage and recipes NOT in this box. `modules/` holds only the gradle files (`ls`), so the crafting, inventory and combat-damage modules are absent. Greps over `engine/`, `subsystems/` and `facades/` for durability, repair, armour, wear, recipe and harvest found only save-file repair, camera target repair, and one `harvest` comment on a block flag (Block.java 391). So this note covers the gathering half only: a node (block) is broken and drops items. Opened in full or in the read range: `EntityDestructionAuthoritySystem.java` (onDestroy, 19-25), `BlockEntitySystem.java` (60-185: fields, doDestroy, drop handlers, commonDefaultDropsHandling, shouldDropToWorld, isDirectPickup, giveItem, commonDestroyed, processDropping; lines 1-59 are imports and the fields block only), `BlockDamageModifierComponent.java` (whole file), `Block.java` (hardness 48, isDirectPickup 393, isDestructible 425-426), `BlockFamilyDefinitionFormat.java` 185, `BlockBuilder.java` 161, 182, 193 (grep lines), `docs/Block-Definitions.md` 36, 122-134, 160, `LICENSE` lines 1-3. Not read: the system that applies hardness and `materialDamageMultiplier` to a break (not in this box), `EngineDamageTypes.java`, the `BeforeDestroyEvent` class (only its use at 21-23), the `GiveItemEvent` and `OnBlockToItem` handlers (inventory module, not in box), and `random.nextVector3f` (direction and magnitude semantics). Confidence: high on the break pipeline order and drop roll (read end to end); medium on what the drop numbers mean in play, because hardness and the material multiplier have no consumer in this box.

Best transferable idea: Run a node break as three steps in a fixed order: a before-break veto that can keep the node, then a drop roll with a per-source annihilation chance computed before the node is removed, then a direct grant to the breaker's bag when the node allows it, else a world drop with a kick.

Decision (proposed): adapt — the veto, drop roll and direct-pickup-first order fit a server-verified gathering node as zone data, with one ledger write per grant; the world-drop kick is client presentation only, and the damage side (hardness, tool multipliers) is not in this box, so it is not adopted here.
Acceptance: A server test: over 10,000 seeded breaks of a node with annihilation chance 0.25, about 75 percent produce an item, a vetoed break leaves the node and grants nothing, and a direct-pickup node writes one ledger grant per item while a full bag falls back to a world drop; the player sees the item in the bag or on the ground with a short kick.

## 1. Mechanism

- Break pipeline (engine, authority side). A `DestroyEvent` reaches `EntityDestructionAuthoritySystem.onDestroy` (19). Order: (a) `recordDestroyed` (20; 29-50): when the destroyed entity has a `BlockComponent`, count it in the instigator's `GamePlayStatsComponent.blockDestroyedMap` keyed by the block display name (the name is only the map key, not a condition), creating the stats component if absent; a separate branch counts `CharacterComponent` kills in `creatureKilled`; (b) create and send `BeforeDestroyEvent` (21-22); if a handler consumed it (23), nothing else happens and the entity stays; (c) otherwise send `DoDestroyEvent` (24) and destroy the entity (25).
- Do-destroy for a block (BlockEntitySystem 78-80). For a plain block component: `commonDestroyed` runs first (79), then the block is set to air (80). `commonDestroyed` sends `CreateBlockDropsEvent` (154) before the dust and sound effects (175), so the drop roll happens while the block is still in the world.
- Drop roll (commonDefaultDropsHandling 115-131). Default chance is 1. If the damage source (a prefab) carries a `BlockDamageModifierComponent`, chance = 1 - `blockAnnihilationChance` (117-120). Roll `random.nextFloat() < chance` (123). On success: build an item from the block's family (124), send `OnBlockToItem` (125), then decide where it goes (127).
- Missed: `ActAsBlockComponent` break path (BlockEntitySystem 70-73, 92-113) is a second `doDestroy`/drops handler with region drops and no `setBlock`. The default drop handlers run at `PRIORITY_TRIVIAL` (83-91) while `doDestroy` is `PRIORITY_LOW` (68-77), so other modules can pre-empt or replace the default drop by handling `CreateBlockDropsEvent` at a higher priority. Keep a data hook for that in Frankendom node rows.
- Direct pickup first (shouldDropToWorld 138-140, isDirectPickup 149-150, giveItem 143-147). Direct pickup is true if the block has `directPickup` or the source component does (150). Only when direct pickup is true, the engine sends `GiveItemEvent` to the item with the instigator (144); if it is handled, no world drop. Otherwise `processDropping` (180-182): `DropItemEvent` at the block position and an `ImpulseEvent` with a random vector of size `impulsePower` (from the component, 130; 0 if there is no component).

## 2. Key functions

- `EntityDestructionAuthoritySystem.onDestroy`: `/mnt/frankendom-donors/MovingBlocks-Terasology/engine/src/main/java/org/terasology/engine/logic/health/EntityDestructionAuthoritySystem.java` 19-25. Veto, then destroy.
- `BlockEntitySystem.doDestroy` (block path): `/mnt/frankendom-donors/MovingBlocks-Terasology/engine/src/main/java/org/terasology/engine/world/block/entity/BlockEntitySystem.java` 78-80. Drops first, then air.
- `BlockEntitySystem.commonDefaultDropsHandling`: same file, 115-131. Annihilation roll, item build, direct-or-world.
- `BlockEntitySystem.shouldDropToWorld` and `giveItem`: same file, 138-147.
- `BlockDamageModifierComponent`: `/mnt/frankendom-donors/MovingBlocks-Terasology/engine/src/main/java/org/terasology/engine/world/block/entity/damage/BlockDamageModifierComponent.java` 11-16 (fields).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Drop chance = 1 minus an annihilation share | `blockAnnihilationChance` float per damage source, no default in this box (BlockDamageModifierComponent 13; chance line 120) |
| Direct pickup first, world drop fallback | `directPickup` per block (docs 160, default false) and per source (component 15) |
| World-drop kick | `impulsePower` float per source (component 16); 0 when no component (130) |
| Block durability (not consumed in this box) | `hardness` default 3; 0 means indestructible (Block.java 48, 425-426; docs 36) |
| Debris dust on break | `debrisOnDestroy` default true (docs 132), skipped when the source sets `skipPerBlockEffects` |
| Seeded or not | `random = new FastRandom()` with no seed in `initialise` (65); a replay will not reproduce drops unless the server seeds it |

## 4. TypeScript sketch

simplified: the sketch keeps the three steps in the donor order (veto, drop roll computed before removal, direct-or-world). It folds the damage-source component's `directPickup` and `impulsePower` into the node row, omits the dust and sound effects, the `OnBlockToItem` event, the region drop (`dropBlocksInRegion`), the stats record, hardness and the material damage multiplier (not in this box), and the random impulse direction. It uses a caller-supplied RNG; the donor's FastRandom is unseeded.

```ts
// Shape of the node-break pipeline (veto, destroy, drop roll, pickup). Written fresh; donor is Apache-2.0.
interface NodeRow {
  id: string;
  annihilationChance: number; // share of breaks that drop nothing (per damage source, data field)
  directPickup: boolean;      // try the breaker's inventory before the world
  impulsePower: number;       // magnitude of the world-drop kick (data field)
}

interface BreakContext {
  breaker: string;
  canTakeItem: (breaker: string, item: string) => boolean; // ledger write, may refuse (full bag)
  vetoed: boolean;            // a before-destroy handler can cancel the break
}

type Drop = { item: string; to: 'inventory' | 'world'; impulse: number };

// Returns null when vetoed (node stays). Otherwise the drops produced by the break.
// rng must be a seeded server RNG so replay reproduces the same drops.
function breakNode(node: NodeRow, ctx: BreakContext, rng: () => number): Drop[] | null {
  if (ctx.vetoed) return null;                       // 1. before-destroy veto
  const drops: Drop[] = [];
  const dropChance = 1 - node.annihilationChance;    // 2. drop roll, computed before the node is removed
  if (rng() < dropChance) {
    const item = node.id;
    const direct = node.directPickup && ctx.canTakeItem(ctx.breaker, item);
    drops.push(direct
      ? { item, to: 'inventory', impulse: 0 }        // 3a. straight into the breaker's inventory
      : { item, to: 'world', impulse: node.impulsePower }); // 3b. world pickup with a kick
  }
  return drops;                                      // 4. caller removes the node after this returns
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS with the block plus `export {};` (`/tmp/cr003-terasology-node-drops.ts`): exit 0.

## 5. Lands in

- TARGET `src/fight/gather-drops.ts` (new module): gathering-node break in the engine, veto then drop roll then grant, server-side. Parity-checklist row 18 (loot roll and XP award).
- Reuse tag: adapt-from-idea (Apache-2.0: code may be adapted; this sketch is still written fresh)
- Brief rule served: zones as data (node rows carry the numbers); one ledger (grant is one ledger write); server-verified (the roll and grant run on the server)

## 6. Gaps and risks

- The damage side is absent: hardness and `materialDamageMultiplier` have no consumer in this box, so how long a node takes to break is not known from this donor. Frankendom needs its own break-time rule.
- Unseeded RNG: `FastRandom` with no seed (BlockEntitySystem 65). Frankendom must seed per server and per fight so fight record and replay (row 19) reproduce drops.
- Direct pickup depends on the inventory handler (`GiveItemEvent`), which is not in this box. The full-bag fallback is therefore unverified.
- Drop-to-world kicks are client presentation; in Frankendom the world pickup is a server-created entity the client shows, and the kick is cosmetic only.
- Node respawn: the donor's break removes the block (set to air, 80) and says nothing about respawn. Respawn and the zone population rule are row 23 territory and are not covered here.
- Not checked: whether `random.nextVector3f` with a zero impulse returns a zero vector (the sketch assumes the kick is zero when impulsePower is zero).
- Defects: none found in the lines read. The one behaviour to keep in mind is that a world drop happens whenever the direct grant is not handled, including a grant the bag refused, so the fallback is a design choice, not a bug.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Break stats were described as recorded 'if the block has a display name'; real code (EntityDestructionAuthoritySystem 29-50) keys on BlockComponent, display name is the map key, creates stats if absent, and has a CharacterComponent branch.
- Missed: ActAsBlockComponent break path (70-73, 92-113); CreateBlockDropsEvent handlers at PRIORITY_TRIVIAL can be pre-empted by other modules.

Fixed 2026-10-12: recordDestroyed description corrected; ActAsBlock and drop-priority line added. Sketch unchanged, no typecheck needed.
