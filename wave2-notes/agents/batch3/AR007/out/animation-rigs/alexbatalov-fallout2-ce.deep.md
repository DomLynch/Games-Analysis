# alexbatalov-fallout2-ce (animation-rigs, cell 3)

Donor: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/animation.cc` | Licence: Sustainable Use License 1.0 (`LICENSE.md` starts "# Sustainable Use License"; use limited to internal business or non-commercial or personal use; restricted, not an open-source licence) | C | symbols `reg_anim_clear`, `_anim_set_end`, `_check_registry`, `animationIsBusy`

Checked: read in full on the VPS: `_anim_free_slot` (394-420), `_register_priority` (423-436), `reg_anim_clear` (439-471), `reg_anim_end` (474-499), `_check_registry` (544-576), `animationIsBusy` (581-610), `animationRegisterCallback` and `...CallbackForced` (1036-1056, 1085-1105), `_anim_set_continue` (1539-1560), `_anim_set_end` (1563-1664), `_anim_animate` (2705-2737), `_object_animate` (2740-2810), `animationComputeTicksPerFrame` (3287-3309), `animationRegisterAnimate` (847-872), and the struct and flag definitions (40-260). Read in part: `animationRunSequence` (1352-1450 and 1500-1536; the case bodies 1450-1500 not read). Read in part: `_object_straight_move` (2650-2702), `animateMoveObjectToTileStraight` (2421-2460), `critterKill` (818-870), `_dude_standup` (3182-3196). Callers, checked by grep only: `reg_anim_clear` from map.cc 381, combat.cc 2625 and 2792, inventory.cc 600, interpreter_extra.cc (several); `_register_priority` from actions.cc 518, 608, 700, 1663 (bodies not read). Not read: the bodies of the path-move steps, `actions.cc`, `_dude_stand`, the combat-animation balance calls. The order in which steps with a non-zero `delay` run was not resolved (section 6). Confidence: high on the cut, priority and forced-effect rules (all of them read in full); low on the timeline order.

Best transferable idea: when an action chain is cut, its not-yet-started effects still run if they are marked forced and are dropped otherwise, and a prioritised chain cannot be cut at all, so an effect the rules already decided (a hit) lands even when the animation that carries it is cancelled.
Decision (proposed): adapt — take the rules (forced effect = ledger effect, unforced = cosmetic, prioritised = not cuttable); the licence is restricted, so this is clean-room shape only, and Frankendom's server decides which effects are forced.
Acceptance: a server test: a hit-reaction chain with a forced hit effect at step 2 still applies the hit when a new order cuts the chain at step 1; an unforced dust effect after the cut does not run; a prioritised chain refuses the cut and plays to its end.

## 1. Mechanism

- A chain is an ordered list of up to 55 steps (`ANIMATION_DESCRIPTION_LIST_CAPACITY` 55, line 41), built between `reg_anim_begin` and `reg_anim_end`. Step kinds include animate, move, rotate, hide, callback, flag set/unset, sound and ping (lines 46-75). Chain flags: PRIORITIZED (0x01, line 81), INSIGNIFICANT (0x40, line 104), NO_STAND (0x80, line 108).
- Slots: 32 chains (line 40). A request that is not reserved is refused when no slot is free, or when 20 or more non-reserved chains are live or being built (`_anim_free_slot` 394-420, line 415). A reserved request skips the 20 limit.
- Registering a step for an owner (`_check_registry` 544-576): if another live chain has a non-callback step for the same owner, the registration fails (566) unless that chain is INSIGNIFICANT, in which case it is ended (569) and the new step goes ahead.
- `reg_anim_clear(owner)` (439-471): walks the live chains and takes the first one with a non-callback step for the owner. If that chain is PRIORITIZED it returns -2 and cuts nothing (461-463). Otherwise it cuts that one chain and returns (465-467). Only one chain is cut per call.
- A cut is `_anim_set_end` (1563-1664):
  (a) every frame animator of the chain is stopped (1578-1583; a stopped animator is skipped in `_object_animate` by 2750-2752);
  (b) hide steps that already ran, or are forced, destroy their object (1585-1593);
  (c) for the owner's first step, its first frame animator is stopped (1626-1631), and the critter is set to stand unless the chain is NO_STAND or the critter is prone (1633-1635);
  (d) steps not yet started (index at or after the next step, 1640): a callback flagged FORCED runs (1641-1642); any other callback is dropped, and a sound callback has its sound deleted (1644-1645);
  (e) the chain is marked ended (1651-1652) and the combat-animation balance is closed if the chain started it (1653-1655).
- Forced callbacks are registered by `animationRegisterCallbackForced` (1085-1105; the flag is set at 1095). Ordinary callbacks have no flag (1046).
- Frame timing: each frame animator advances only when `getTicksBetween(now, last)` is at least `ticksPerFrame` (2757). It then sets `last` to now (2761), so a late frame pushes the next one back and does not catch up. `ticksPerFrame` is `1000 / fps` (3308). fps is the art's frame rate (3294); if the art cannot be locked, fps is 10 (3296-3297). While in combat, a walk animation adds the combat-speed setting to fps for NPCs, and for the player only when the speed-up option is on (3300-3303).
- An animate step completes when the last frame is reached, unless it is FOREVER (2801), and then the chain moves on (2810).

## 2. Key functions

- `_anim_set_end` (the cut): `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/animation.cc` 1563-1664. The whole cut path, including forced callbacks at 1640-1645.
- `reg_anim_clear` (the cut request with priority): `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/animation.cc` 439-471.
- `_check_registry` (the owner check on registration): `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/animation.cc` 544-576.
- `_anim_free_slot` (the slot budget): `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/animation.cc` 394-420.
- `_object_animate` (the frame gate and completion): `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/animation.cc` 2740-2810.
- `animationComputeTicksPerFrame`: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/animation.cc` 3287-3309.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Cut an action chain: run the forced effects that have not started, drop the rest, end it | FORCED flag value 0x01 (theirs, animation.cc 44) |
| A prioritised action cannot be cut by a new order | PRIORITIZED 0x01 (theirs, line 81); `reg_anim_clear` returns -2 for it (461-463) |
| A cheap action yields to a new order for the same unit | INSIGNIFICANT 0x40 (theirs, line 104; the registry check 565-569) |
| Slot budget with a reserve for important requests | 32 chains (theirs, line 40); 20 non-reserved (theirs, line 415); reserved requests skip the 20 |
| Step budget per chain | 55 steps (theirs, line 41) |
| Frame cadence from the asset's own frame rate | ticksPerFrame = 1000 / fps (theirs, line 3308); fallback fps 10 (theirs, line 3297; the line is too short to receipt, so the value is from the line as read) |
| Frame cadence speed-up for one movement type in a mode | combat speed added to walk fps (theirs, lines 3301-3303) |
| Frame animators (per active clip) budget | 24 (theirs, animation.cc 42) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's rules: forced effects run when a chain is cut and unforced ones are dropped; a prioritised chain refuses a cut; a new step for an owner ends an insignificant holder (through the same cut path) and is refused by a significant one; and the two slot limits. It omits every step kind except clip and effect, the owner's stand-up, the frame-animator stop, hides, the sound deletion, the combat-animation balance, the timeline delays (not resolved, section 6), and the reserved flag on the slot pool (the donor's free-slot search is more involved, 394-420). It treats only clip steps as holding an owner (the donor counts every non-callback step). It uses string owner ids. Written from the rules above; it is not a translation of the donor's code.
```ts
// Licence: Sustainable Use License 1.0 (donor, restricted). Clean-room: written from the described cancel and priority rules, not translated.
export type Step =
  | { kind: "clip"; owner: string; clip: string }
  | { kind: "effect"; forced: boolean; run: () => void };

export interface Chain {
  steps: Step[];
  started: number;        // steps started so far
  prioritised: boolean;   // reg-cut leaves this chain alone
  insignificant: boolean; // yields to a new step for the same owner
  noStand: boolean;       // do not return the owner to stand when cut
  ended: boolean;
  owners: Set<string>;    // owners with a clip step in this chain
}

export const MAX_CHAINS = 32;
export const NON_RESERVED_CAP = 20;

function endChain(c: Chain): void {
  c.ended = true;
  c.started = c.steps.length;
}

// Cut a chain: forced effects that have not started still run; unforced ones are dropped.
export function cutChain(c: Chain): void {
  if (c.ended) return;
  for (let i = c.started; i < c.steps.length; i++) {
    const s = c.steps[i];
    if (s.kind === "effect" && s.forced) s.run();
  }
  endChain(c);
}

// A new step for `owner` is refused while a significant live chain holds that owner.
// An insignificant holder is ended instead, and the new step is allowed.
export function registerOwnerStep(owner: string, live: Chain[]): boolean {
  for (const c of live) {
    if (c.ended || !c.owners.has(owner)) continue;
    if (!c.insignificant) return false;
    cutChain(c); // same end path as a cut: forced effects still run
  }
  return true;
}

// reg_anim_clear: cut the first live chain that holds `owner`. A prioritised chain is never cut.
export function clearOwner(owner: string, live: Chain[]): "cut" | "prioritised" | "none" {
  for (const c of live) {
    if (c.ended || !c.owners.has(owner)) continue;
    if (c.prioritised) return "prioritised";
    cutChain(c);
    return "cut";
  }
  return "none";
}

// Slot budget: 32 chains in total; a non-reserved request also needs fewer than 20 live non-reserved chains.
export function mayStartChain(liveCount: number, liveNonReserved: number, reserved: boolean): boolean {
  if (liveCount >= MAX_CHAINS) return false;
  return reserved || liveNonReserved < NON_RESERVED_CAP;
}

export {};
```

Typecheck: the block (with `export {};`) was run on the VPS with `npx -p typescript tsc --noEmit --strict --target es2020` and exited 0.

## 5. Lands in

- TARGET `src/fight/chain.ts` (new): the per-character action chain that the client plays and the engine cuts. Parity-checklist row 6 (hero actor/animation). This is the closest row; the forced hit effect would be consumed by the hit-impact row 10, which this note does not claim.
- Reuse tag: rewrite-from-idea (restricted licence: clean-room, shape only; no lines copied).
- Brief rule served: one engine (the cut and priority rules are engine rules); server-verified kills (forced effects are the server's ledger effects); client-only presentation (unforced effects are cosmetic and the chain itself plays on the client).

## 6. Gaps and risks

- Licence: the Sustainable Use License 1.0 limits use to internal business or non-commercial or personal use, and limits distribution to free non-commercial use (`LICENSE.md` line 15). This note records only the shape of the rules. Any use needs a licence ruling from Strategy first.
- Forced timing: the donor runs a forced effect at the moment of the cut, not at its scheduled step. A cut can therefore land a hit early. Frankendom must choose: apply the server's hit at the cut, or at its own tick. The donor makes that choice implicitly.
- Forced is a client flag in the donor. Frankendom must make the server's ledger effects the forced set, so a client cut can never drop a decided hit, and test it.
- Priority is set only for some actions (actions.cc 518, 608, 700, 1663; bodies not read). Frankendom needs an explicit list of which hero moves cannot be cut.
- `reg_anim_clear` cuts one chain per call (465-467), and the combat callers ignore its return value (combat.cc 2625). A port must return the result and loop explicitly.
- Timeline delays: a step with `delay` < 0 stops the timeline at that step (1369-1372), and the donor's own combat calls pass -1 on a second step (combat.cc 2628 and 2795; the first step's delay is forced to 0 at reg_anim_end, line 485). I found no code in animation.cc that resets such a delay. The order in which steps with delays run was not resolved, so the timeline semantics are not rated here and must not be copied without a test.
- Frame timing: the timestamp reset (2757-2761) lets a slow frame push later frames back. Frankendom's clip timing should follow the server tick, not this gate.
- Stand-up on cut (1633-1635) is a presentation rule and stays client-only.
- Not read: the path-move step bodies, `actions.cc`, `_dude_stand`, the combat-animation balance calls, and the case bodies 1450-1500.
