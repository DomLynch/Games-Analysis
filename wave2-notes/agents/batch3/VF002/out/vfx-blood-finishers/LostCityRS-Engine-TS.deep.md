# LostCityRS-Engine-TS (vfx-blood-finishers, cell 13)

Donor: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/Npc.ts` (the hit splat is `applyDamage`, 489-508; the same code is in `src/engine/entity/Player.ts` 1939-1958) | Licence: MIT (LICENSE line 1: "MIT License", Lost City 2023-2026) | TypeScript | symbol `applyDamage`

Checked: `Npc.ts` 489-508 read (applyDamage, verified); `spotanim` 482-487 read. `Player.ts` 1932-1958 read. `PathingEntity.ts` 575-630 read (reset block 593-630). `World.ts` cycle call order confirmed from the call lines 367, 378, 397, 408, 415 (grep); `processInfo` hit values read at 1006-1027 and 1066-1072; `processCleanup` 1139-1175 read in part. `rsbuf/index.ts` 103-106 and 234-237 read; `renderer.ts` 64-69 read; `messages.ts` 98-110 read by grep only. Callers: `NpcOps.ts` 278-282 and `PlayerOps.ts` 819-830 read. Topic fit, stated plainly: the donor has no blood, gore, decal or finisher code. The nearest thing is the damage splat (the number that pops over a hit target). Confidence: high on the slot logic, the clamp and the reset order. Medium-high on the display side, because the client that draws the splat is not in the donor (not read).

Best transferable idea: keep a per-target hit record for one tick that clamps each hit to the hit points actually removed and is cleared at the end of the tick, but store every hit rather than two display slots.
Decision (proposed): adapt - take the clamp (the record never shows more than was removed), the per-tick reset, and the rule that the type travels with the value; reject the two-slot overwrite, because with MAX_ATTACKERS = 3 a third hit in the same tick silently replaces the first hit's splat. Why: our one-ledger rule means every hit must be recorded, and the display can then show as many or as few as it likes.
Acceptance: with three attackers landing hits in the same server tick on one defender, the client shows three damage values (or one per attacker), each equal to the hit points removed; a server test asserts the defender's hit points fall by the sum of the clamped damage, the tick's hit record holds three entries, and the record is empty on the next tick.

## 1. Mechanism

- Hits reach the engine only through script ops. The only callers of `applyDamage` found by grep of `src` are the two script ops: `NPC_DAMAGE` (`NpcOps.ts` 278-282) and `DAMAGE` (`PlayerOps.ts` 819-830). Each pops an amount and a hit type, the type through a validator (`NpcOps.ts` 280), and calls `applyDamage` on the target. The amount is checked only for null (`NpcOps.ts` 279).
- `applyDamage` (`Npc.ts` 489-508; `Player.ts` 1939-1958 is the same code, written out twice):
  - (a) Clamp: `current` is the target's hit points. If `current - damage <= 0`, hit points become 0 and `damage` is replaced by `current` (491-493). Otherwise hit points become `current - damage` (495). So the stored splat is the hit points actually removed, and an overkill shows only what was left.
  - (b) Slot: if `hitmarkSlot % 2 === 1`, the value goes to the second slot (`hitmark2Damage`, `hitmark2Type`, mask DAMAGE2) (498-501). Otherwise it goes to the first slot (`hitmarkDamage`, `hitmarkType`, mask DAMAGE) (502-505).
  - (c) Counter: `hitmarkSlot++` (507). The counter is per entity per tick.
- Per-tick order (`World.cycle`, 340 onward): `processNpcs` (367) and `processPlayers` (378) run the entity turns; the damage ops can run in any script phase before `processInfo` (script phases not traced in full). `processInfo` (397) encodes the entity's splat values into the client messages; `processClientsOut` (408); `processCleanup` (415). `processCleanup` calls `resetEntity(false)` for every player (loop at 1147-1149) and every NPC (loop at 1161-1164). For an NPC, `resetEntity(false)` reaches `resetPathingEntity` through `Npc.ts` 327; for a player, through `Player.ts` 474. `resetPathingEntity` (`PathingEntity.ts` 593) clears the masks, sets both splat values to -1 and the counter to 0 (619-623).
- Wire path: `processInfo` passes the player's splat values to `rsbuf.computePlayer` (World.ts 1006-1027). `rsbuf/index.ts` copies them into `damageTaken`, `damageType`, `damageTaken2`, `damageType2` (103-106; the NPC copy is at 234-237). `renderer.ts` 64-69 writes a `PlayerInfoDamage` message for the DAMAGE mask (64-65) and for DAMAGE2 (67-68), carrying the damage, the type, and current and base hit points, so the client can draw the number and the bar. The NPC renderer path was not read.

## 2. Key functions

- `Npc.applyDamage`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/Npc.ts` 489-508. Clamp, slot choice, counter.
- `Player.applyDamage`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/Player.ts` 1939-1958. Same three steps.
- `PathingEntity.resetPathingEntity`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/PathingEntity.ts` 593-630. The splat reset is 619-623.
- `World.cycle` call order: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/World.ts` 340-420 (call lines 367, 378, 397, 408, 415). Splat values sent in `processInfo` at 1027 and 1072.
- Script entry points: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/script/handlers/NpcOps.ts` 278-282; `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/script/handlers/PlayerOps.ts` 819-830.
- Wire copy and encode: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/network/rsbuf/index.ts` 103-106 and 234-237; `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/network/rsbuf/renderer.ts` 64-69; `PlayerInfoDamage` in `src/network/rsbuf/messages.ts` 98-110 (grep only).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Stored damage is clamped to the hit points actually left, and hit points floor at 0 | None (the rule, Npc.ts 491-496) |
| Two display slots chosen by the parity of a per-tick counter | 2 slots (theirs, Npc.ts 498; Player.ts 1948) |
| Per-tick record cleared at the end of the tick, after the info pass | Reset values -1 and counter 0 (theirs, PathingEntity.ts 619-623) |
| Every hit reduces hit points even when the display can show only some of them | None (the rule, Npc.ts 491-507) |
| The hit type travels with the value | Type checked by `HitTypeValid` (theirs, NpcOps.ts 280) |

## 4. TypeScript sketch

simplified: keeps the donor's clamp, the parity slot choice (so a third hit overwrites the first hit's splat, as the donor does), the counter, and the end-of-tick reset. It omits the mask bits, the type validator, the info encoder and client draw, and the duplicate Player copy (one copy is kept). It is faithful on purpose, so the overwrite is visible.

```ts
// Licence: MIT (donor, LICENSE line 1). Adapted in shape; written from the mechanism.
export interface HitSplat {
  damage: number;
  type: number;
}

export interface HitRecord {
  hp: number;
  slotCount: number;      // hits applied this tick
  slot1: HitSplat | null; // first splat value
  slot2: HitSplat | null; // second splat value
}

export function newHitRecord(hp: number): HitRecord {
  return { hp, slotCount: 0, slot1: null, slot2: null };
}

// One hit. The splat keeps only the hit points that were actually removed.
export function applyHit(r: HitRecord, damage: number, type: number): number {
  let dealt = damage;
  if (r.hp - damage <= 0) {
    dealt = r.hp;
    r.hp = 0;
  } else {
    r.hp -= damage;
  }
  const splat: HitSplat = { damage: dealt, type };
  if (r.slotCount % 2 === 1) {
    r.slot2 = splat;   // odd count: second slot
  } else {
    r.slot1 = splat;   // even count: first slot (a third hit overwrites the first hit's splat)
  }
  r.slotCount += 1;
  return dealt;
}

// End of tick: clear the record, as the donor does in its per-tick reset.
export function resetHitRecord(r: HitRecord): void {
  r.slotCount = 0;
  r.slot1 = null;
  r.slot2 = null;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/hit-splats.ts` (new; the per-tick hit record that the engine writes and the client draws). Server-side: every hit is recorded in the engine ledger. Client-side: the display reads the record and shows at most what it chooses. Parity-checklist row 10 (hit impact/hitstop).
- today: not read (no Frankendom source was opened in this task).
- Reuse tag: adapt-allowed (MIT: keep the copyright and permission notice; the record shape and the clamp are the reusable part, not the donor's two-slot storage)
- Brief rule served: 1 (one engine: the hit record is written by the engine, and the client only reads it); rule about one ledger (every hit recorded); rules 7-9 n/a

## 6. Gaps and risks

- Third hit overwrites the first. `slotCount % 2 === 0` writes slot 1 (Npc.ts 498-506), so with MAX_ATTACKERS = 3 three hits in one tick show two numbers, and the first hit's number is lost. Hit points still fall by all three. Frankendom must keep a list of hit records per defender per tick, or one aggregate per attacker, never a two-slot store.
- Damage is not bounded. `applyDamage` has no lower or upper bound on `damage` (Npc.ts 491-496), and the op only checks for null (NpcOps.ts 279). A negative amount would raise hit points, and nothing caps them at the base. Frankendom's server-verified kills require the server to compute and range-check every hit before it reaches the ledger; the donor does not.
- Overkill is hidden. The clamp (491-493) replaces the stored damage with the hit points left, so the record does not show the intended amount. Fine for the splat, wrong for any log or XP share that needs the intended hit. Frankendom should store both the intended and the applied amount.
- Duplicated code. Npc.ts 489-508 and Player.ts 1939-1958 are the same rule written twice. Frankendom has one engine, so one function should serve both.
- The record lives for one tick. The reset runs at the end of the tick (415; 619-623), so the client has to keep its own display timer. The donor does not show how long the client keeps a splat (client not in donor, not read).
- No blood, gore, decal or finisher code exists here. A separate one-slot graphic effect exists: `spotanim` sets an id, a height and a delay on the entity and sets a mask bit (Npc.ts 482-487; Player.ts 1932-1937). It was read in part and is not written up.
- Not read: the client that draws splats and the health bar (not in the donor); the NPC side of the renderer; the content scripts that call `NPC_DAMAGE` and `DAMAGE` (not in the engine tree read here); `messages.ts` beyond the `PlayerInfoDamage` constructor.
- Licence: MIT. Adaptation is allowed. Keep the copyright line ("Copyright (c) 2023-2026 Lost City") if any code is copied, though this note only takes the shape.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
- All claims verified (applyDamage in Npc/Player, resetPathingEntity splat reset, World.cycle call lines, callers, rsbuf, MIT LICENSE; third-hit overwrite correct).
- Missed: none.
