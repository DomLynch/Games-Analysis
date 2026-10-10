# LostCityRS-Engine-TS (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/Npc.ts` | Licence: MIT (root `LICENSE`, "Copyright (c) 2023-2026 Lost City"; code may be adapted with the notice) | TypeScript | symbol `applyDamage`

Checked: `applyDamage` read in full at `Npc.ts` 489-508 and at `Player.ts` 1939-1958 (the two bodies are the same logic). Also read: the DAMAGE and NPC_DAMAGE opcodes (`PlayerOps.ts` 819-830, `NpcOps.ts` 278-283), the amount validator (`ScriptValidators.ts` 37-46), `HitType.ts`, the reset path (`PathingEntity.ts` 593-624, `Npc.ts` 327), and the tick order and splat send (`World.ts` 355-415, 1020-1076, 1139-1165). Not read: where the damage amount and type are computed. The donor has no `.rs2` or other combat script files (a repo-wide find returned 0), and a grep of `src/` for crit, knockback, accuracy and max hit, and of `data/` for damage, found no roll. So accuracy, max hit, crit and knockback are NOT in this donor, and this note covers only the apply step. Also not read: which script phase calls the DAMAGE opcode, the client rendering of splats, and what the scripts do at 0 HP (no death handler is in `applyDamage`). Confidence: high on the clamp and the slot rule (every line read); the sketch was typechecked, not run.

## 1. Mechanism

- Entry: a script calls the DAMAGE opcode (player) or NPC_DAMAGE opcode (NPC). Each pops an amount and a type, checks the type against `HitType` (BLOCK, DAMAGE, POISON), and checks the amount with the NumberNotNull validator, which rejects only -1 (`PlayerOps.ts` 820-822; `NpcOps.ts` 278-282; `ScriptValidators.ts` 39). Then it calls `applyDamage(amount, type)`.
- Order of steps inside `applyDamage` (`Npc.ts` 489-507):
  (a) read current health (490);
  (b) if `current - damage <= 0`: health is set to 0 and the shown damage becomes `current`, so the splat shows the HP actually removed, not the overkill (491-493); otherwise health is set to `current - damage` (495);
  (c) the splat slot is chosen by parity of `hitmarkSlot`: odd goes to the second slot (`hitmark2Damage`, mask DAMAGE2), even goes to the first slot (`hitmarkDamage`, mask DAMAGE) (498-505);
  (d) `hitmarkSlot` is incremented once for every hit, whatever the outcome (507).
- Per tick (`World.ts`): NPC processing (367), then player processing (378), then `processInfo` (397) which writes both splat slots into the info block (1072-1075, players 1027-1030), then client output, then `processCleanup` (415). `processCleanup` calls `resetEntity(false)` (1149 for players, 1163 for NPCs). That path calls `resetPathingEntity` (`PathingEntity.ts` 593), which clears the splat fields and sets `hitmarkSlot = 0` (623).
- Consequence: within one tick, hit 1 goes to slot 1, hit 2 to slot 2, hit 3 overwrites slot 1, hit 4 overwrites slot 2, and so on. Every hit removes its HP. The display shows only the last two hits of the tick, with no summing.

## 2. Key functions

- `applyDamage` (NPC): `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/Npc.ts` 489-507. Clamp, slot by parity, count.
- `applyDamage` (player): `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/Player.ts` 1939-1957. Same logic, copied.
- NPC_DAMAGE opcode: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/script/handlers/NpcOps.ts` 278-282. Pops type and amount, calls `applyDamage` on the active NPC.
- DAMAGE opcode: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/script/handlers/PlayerOps.ts` 819-830. Looks up the player by uid, calls `applyDamage`.
- Per-tick reset: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/PathingEntity.ts` 593-624 (`resetPathingEntity`, clears `hitmarkSlot`), called from `World.ts` 1139-1165 (`processCleanup`).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Clamp health at 0; report the HP actually removed | Threshold 0 (theirs, `Npc.ts` 491 `current - damage <= 0`) |
| Two splat slots chosen by hit parity, counter incremented per hit | Two slots: `% 2` (theirs, `Npc.ts` 498). The protocol has exactly two damage fields per entity (`World.ts` 1072-1075). |
| Splats cleared at tick end | Reset in cleanup, after client output (theirs, `World.ts` 415) |
| Health storage | `Uint16Array(6)` for NPC levels (theirs, `Npc.ts` 50): values wrap at 65536. |
| Hit type | Enum of 3 (theirs, `HitType.ts` 1-5; validator `ScriptValidators.ts` 118) |
| Amount | Passed in by script; no formula in this donor. |
| Negative amounts | Only -1 is rejected (theirs, `ScriptValidators.ts` 39). Any other negative passes and heals (`current - damage` is larger than `current`). Not a formula: a missing guard. |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (reject bad input, clamp, write the splat slot by parity, count the hit, clear at tick end). It omits the network packing and the mask bits (DAMAGE and DAMAGE2), the Uint16 storage, the separate player and NPC copies, the script layer and its validators, and the damage roll (none in the donor). One deliberate change: the sketch THROWS on negative damage, which the donor does not do (the donor heals). The clear happens in `endTick` after the send, as in the donor's order (World 397 then 415).

```ts
// Licence: MIT (donor, Lost City). Sketch written from the described mechanism, not a copy of the donor lines.
// clean-room
export const enum HitType { BLOCK, DAMAGE, POISON }

export interface Splat { damage: number; type: HitType; }

export class HitTarget {
  hp: number;
  // two visible splat slots per tick; the slot is chosen by hit parity
  shown: [Splat | null, Splat | null] = [null, null];
  private hitCount = 0;

  constructor(maxHp: number) { this.hp = maxHp; }

  // Apply one hit. Health is clamped at 0; the splat shows the HP actually removed (no overkill).
  applyHit(damage: number, type: HitType): number {
    if (damage < 0) throw new Error("negative damage");
    const effective = this.hp - damage <= 0 ? this.hp : damage;
    this.hp = Math.max(0, this.hp - damage);
    this.shown[this.hitCount % 2] = { damage: effective, type };
    this.hitCount++;
    return effective;
  }

  // Called once at tick end, after the splats have been sent: the next tick starts clean.
  endTick(): void {
    this.shown = [null, null];
    this.hitCount = 0;
  }
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/lostcityrs-combat-sim.ts`).

## 5. Lands in

- TARGET `src/fight/damage.ts` (the one damage function, shared with the duel step): the health write, the clamp and the effective-damage value. Parity-checklist row 1 (duel step/sim). The splat display itself belongs to row 10 (hit impact/hitstop) and is not in this target.
- today: `src/combat.ts` (moving; not opened in this pass).
- Reuse tag: rewrite-from-idea (MIT: code may be adapted with the notice; this sketch is written from the mechanism)
- Brief rule served: one ledger (the donor keeps two copies of the health write, one per entity type); server-verified kills (health is server-side, the splat is a server-sent field); MAX_ATTACKERS = 3 (with three attackers in one tick, hit 1's number is overwritten by hit 3, see section 6).

## 6. Gaps and risks

- No damage roll in the donor. Accuracy, max hit, crit and knockback are not here, so this note cannot be used for the hit formula. Frankendom's duel step (row 1) needs its own roll.
- Many-vs-one display loss: with MAX_ATTACKERS = 3, three hits in one tick show only hits 2 and 3. Health is still removed by all three. Frankendom must choose one rule: sum the tick's hits into one splat, or show all three. The donor's rule is an accident of the two-slot protocol, not a design.
- Negative damage heals: `applyDamage` has no guard and the validator rejects only -1 (`ScriptValidators.ts` 39). Frankendom's one damage function must reject negative values (the sketch does).
- Overkill display: the shown number is clamped to remaining HP (1 HP left and a 50 hit shows 1). That is a display choice. The fight record (row 19) must decide whether it stores the clamped or the raw value.
- A hit on a 0-HP target still writes a 0 splat and increments the slot counter (because the lethal branch sets damage to current, which is 0). The counter is not a count of real damage.
- Health is `Uint16Array` for NPCs (`Npc.ts` 50). A heal past 65535 wraps. Frankendom health should be a plain number with an explicit max.
- Ordering vs death: `applyDamage` does not run any death handler. Whatever the scripts do at 0 HP was not read. Frankendom needs one death step (row 17) called once after the clamp.
- The donor duplicates the logic in `Npc.ts` and `Player.ts`. Frankendom has one ledger ruling, so one function must serve both.
- The splat is visible for one tick only (cleared in `processCleanup`). Hit-impact timing for the client (row 10) is separate.

Best transferable idea: clamp health at zero and report the effective damage (not the overkill), and keep only two per-tick damage display slots chosen by hit parity so later hits overwrite earlier numbers instead of growing a list.
