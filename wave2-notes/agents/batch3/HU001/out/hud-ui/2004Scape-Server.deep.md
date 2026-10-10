# 2004Scape-Server (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/2004Scape-Server/src/engine/entity/PathingEntity.ts` with `Npc.ts` and `Player.ts` (`applyDamage`), feed in `World.ts` | Licence: MIT (`LICENSE` line 1 "MIT License", line 3 "Copyright (c) 2023-2025 Lost City"; code may be adapted, the notice must be kept) | TypeScript | symbol `applyDamage`

Checked: Read in full: `Npc.applyDamage` 470-483; `Player.applyDamage` 1852-1866; `PathingEntity.resetPathingEntity` 575-605 (the reset lines that matter); `World.cycle` 369-445 (phase order); `World.processCleanup` 1148-1175 (the reset calls, read in part). Read in part: `World.processInfo` (the two `damageTaken` and `baseLevels` fields at 1041-1044 and 1083-1086, read only where they are written into the update). Call sites: `applyDamage` is called from `PlayerOps.ts` 726 and `NpcOps.ts` 262 only (grep of `src`). Confidence: high on what the server does with a hit and on the one-slot overwrite; medium on the feed as a whole, because the HUD itself is not in this donor: the client code that draws the splat and the bar, the `hitmarks.dat` cache file, and the info encoders under `network/game/server/codec` were not read. Depth is therefore thin: this is the server half of the HUD feed only. camera_scope: n/a.

Best transferable idea: Clamp each hit to the health left, apply it to one health number, and send the displayed splat with current and base health in the same per-tick update, so the client never has to guess the damage.
Decision (proposed): adapt - the clamp and the single health number are the rule we want (one ledger, kill shows only the health that was left), but the donor keeps one splat slot per tick, which loses earlier hits when several land in one tick; with MAX_ATTACKERS = 3 that will happen, so the fix is a short per-tick list of splats (sketch caps at 3), with health still applied for every hit.
Acceptance: Three enemies hit the hero on the same tick for 4, 6 and 5 with 20 HP: the hero ends at 5 HP, the frame shows three splats (4, 6, 5), and a server test asserts the HP delta equals the sum of the applied damage and the splat list equals the three applied amounts, each clipped to the health left.

## 1. Mechanism

- One hit (`Npc.applyDamage` 470-483; `Player.applyDamage` 1852-1866, the same shape): store the raw damage as the splat (471, 1853) and the hit type. Read live health `current` from `levels[HITPOINTS]` (474, 1856). If `current - damage <= 0`, set health to 0 (476) and set the splat to `current`, the health that was left (477, 1859). Otherwise health becomes `current - damage` (479). Then set the DAMAGE bit in the entity's mask word (482, 1864).
- Result: the splat is the damage actually applied (never more than the health left), and the health number is the single ledger. A second hit in the same tick reads the reduced health, so both hits reduce HP; but the splat slot is overwritten, so only the second hit's splat is sent (worked example below).
- Phase order inside one tick (`World.cycle`, 369-445): NPC processing (396) and player processing (407) run first, and they run the scripts and queues that call `applyDamage` (`PlayerOps.ts` 726, `NpcOps.ts` 262). Then processing of logouts, logins, zones, and `processInfo` (426) builds the update that carries the splat, the health and the base health. Then client output. Then cleanup (`processCleanup` 1148), which calls `resetEntity(false)` for each player (1158) and NPC. That reaches `resetPathingEntity` (575), which clears the mask word (588) and sets the splat slot back to -1 (601). So each tick starts with an empty splat slot; the damage applies in the tick it was dealt, and the info update that carries it goes out in that same tick.
- The info update carries three values for the HUD: the splat `damageTaken` and its type (1041-1042 player, 1083-1084 NPC), current health (`levels`, 1043 player, 1085 NPC), and base health (`baseLevels`, 1044 player, 1086 NPC). The health bar is the ratio of those two numbers as far as the donor shows; how the client draws it was not read.
- Tick: fixed server tick, one `cycle()` per tick (369). Hits are not time-based: a hit lands in the tick its script runs.

Worked example (by hand from the code, not run): health 20, hit 5 then hit 6 in the same tick. First hit: current 20, 20-5 > 0, health 15, splat 5. Second hit: current 15, 15-6 > 0, health 9, splat 6 (overwrites the 5). Result sent: health 9, one splat of 6. The first 5 never reaches the client.

## 2. Key functions

- `Npc.applyDamage` 470-483 and `Player.applyDamage` 1852-1866: the whole hit rule (clamp, splat, mask bit).
- `PathingEntity.resetPathingEntity` 575-605: clears the mask word (588) and the splat slot (601) at the end of the tick.
- `World.cycle` 369-445: the phase order that puts scripts before the info update and cleanup after it.
- `World.processCleanup` 1148-1175: calls `resetEntity(false)` for players (1158) and NPCs (1172).
- `World.processInfo` (fields 1041-1044 and 1083-1086): where the splat and the health numbers are written into the update.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Health never goes below 0; the hit is clipped to what is left | Floor 0 (theirs, Npc.ts 476; Player.ts 1858 for the player case) |
| Kill shows the health that was left, not the raw damage | Splat = `current` on a kill (theirs, Npc.ts 477; Player.ts 1859) |
| Otherwise the splat is the raw damage | Splat = `damage` (theirs, Npc.ts 471; Player.ts 1853) |
| Mask bit marks the entity as changed this tick | `DAMAGE` bit (theirs, Npc.ts 482; Player.ts 1864) |
| Per-tick reset | Mask word cleared (theirs, PathingEntity.ts 588); splat slot set to -1 (theirs, PathingEntity.ts 601) |
| Tick length | Not read in this step (the tick loop is in `World.cycle`; its timing constants were not read) |

Defect, found by reading (not run):
- One splat slot per tick. Two or more hits in one tick overwrite each other on the splat, so the client sees only the last amount while the health falls by all of them. The worked example above shows it. Fix: keep a short per-tick list of splats and send them all. The sketch caps the list at 3 (Frankendom's MAX_ATTACKERS) and still applies every hit to health.
- Kill then a later hit in the same tick: after the killing blow, `current` is 0, so the later hit takes the kill branch (475) and sets the splat to 0 (477). That overwrites the killing blow's splat, so the client can show a 0 for the kill. Worked example (by hand): health 5, hit 8 (splat 5, health 0), then hit 3 (splat 0). Fix: keep every hit as its own list entry, as the sketch does, so the 5 survives next to the 0 (sketch result: splats [5, 0]). Whether a 0 is shown at all is a display choice, not made here.

## 4. TypeScript sketch

simplified: keeps the donor's rule: each hit reads live health, clips to what is left, applies it to one health number, and the splat is the amount actually removed; and the per-tick reset. It replaces the single splat slot with a list capped at three (the fix), and groups the outgoing fields into one object. It omits the entity classes, the mask bits and the info encoders, the hit type semantics (passed through, not read), the NPC/player split, the respawn branch of `resetEntity`, the script call sites, and the tick loop order (the note states the order; the sketch does not run it).

```ts
// Licence: MIT (donor, Lost City 2023-2025). Code may be adapted; the copyright notice must be kept if code is copied. This sketch is written from the mechanism.
// clean-room
export const MAX_SPLATS_PER_TICK = 3; // Frankendom MAX_ATTACKERS; a fix to the donor's single slot

export interface Splat {
  amount: number; // damage shown: only the health that was actually left
  type: number;   // hit type, passed through to the client
}

export class HitState {
  hp: number;
  readonly baseHp: number;
  splats: Splat[] = []; // fix: a short per-tick list, not one slot

  constructor(hp: number, baseHp: number) {
    this.hp = hp;
    this.baseHp = baseHp;
  }

  // Each hit reads the live hp, so several hits in one tick stack.
  applyDamage(amount: number, type: number): void {
    const before = this.hp;
    const shown = Math.min(amount, before);  // matches the donor: on a kill the splat is the health that was left
    this.hp = before - shown;                // never below 0
    if (this.splats.length < MAX_SPLATS_PER_TICK) {
      this.splats.push({ amount: shown, type });
    }
  }

  // Sent in the same per-tick update as the splats: current and base hp for the bar.
  infoForClient(): { hp: number; baseHp: number; splats: Splat[] } {
    return { hp: this.hp, baseHp: this.baseHp, splats: this.splats.slice() };
  }

  // Cleared at the end of every tick, after the info update has been built.
  endTick(): void {
    this.splats.length = 0;
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0. The worked example gives health 9 with splats [5, 6] in the sketch (by hand), and health 9 with the single splat 6 in the donor.

## 5. Lands in

- TARGET `src/fight/hud.ts` (proposed; Frankendom's current HUD file was not read). The splat list and the health pair are read by the client; the engine owns the numbers.
- Parity-checklist row 14 (HUD).
- Reuse tag: adapt-from-donor (MIT; code may be adapted; keep the notice; the sketch is written from the mechanism)
- Brief rule served: 14 (HUD reads the engine's numbers); one ledger (health lives in one number, clipped at zero).

## 6. Gaps and risks

- MIT: adaptation is allowed. If code is copied, keep the copyright and permission notice from `LICENSE`.
- The HUD half is not in this donor. What the client does with the splat list and the health pair (how it stacks, how long it lasts, where it lands on the frame) was not read; it must be designed for Frankendom, not inherited.
- The one-slot defect matters for us: with up to three attackers, same-tick hits are normal. Fix as in the sketch.
- Kill rule: the donor's splat on a kill is the health left, so overkill is not shown. That is a good rule to keep; check it against the engine's server-verified kill.
- Hit type (`damageType`) is passed through unread; its meaning (colour, icon) is in the client, not read.
- The health pair is sent as current and base values; the client's ratio and rounding were not read.
- Lock-on and input buffer (fold-in, checked by reading, not separate notes): the player keeps several queues: a normal `queue`, a `weakQueue`, and an engine queue. A weak request is added at 820 and cleared on closing a modal (735-736) and on cleanup (441). A strong request closes modals before the queues run (850-858, `processQueues`). The donor also keeps a LinkList timing quirk and calls it 'authentic' (865). This is an action buffer that a new modal flushes; it is not a lock-on. No lock-on or target-lock code was found in what I read.
- Hud, touch and minimap: not in this donor (the donor is the server; client UI is absent). Accessibility and touch: not found by grep, not searched further.
- String table: no localisation catalogue. `data/src/pack/interface.pack` has 7386 lines, each `id=name` with a snake_case name and an optional colon suffix (for example a `:c` form; the meaning of the suffix was not read). It maps interface component ids to names. It is English-only; the visible text is in the scripts (not counted). Counting: `grep -c` over the pack file (7386 lines with `=`, 0 without).

Reuse tag: adapt-from-donor (MIT; code may be adapted; keep the notice)
Brief rule served: 14 (HUD reads the engine's numbers); one ledger (health in one number, clipped at zero)
