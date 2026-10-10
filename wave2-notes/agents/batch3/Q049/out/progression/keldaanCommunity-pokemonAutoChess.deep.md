# keldaanCommunity-pokemonAutoChess (progression, cell 10)

Donor: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/models/colyseus-models/experience-manager.ts` | Licence: GPL-3.0 (repo `LICENSE`, "GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007") | TypeScript | symbol `ExperienceManager.addExperience` (with `canLevelUpWithXP`, the table in `config/game/experience.ts`, and the `KnowledgeThiefStrategy` XP-to-stack call at `core/abilities/abilities.ts` 619-634)

Checked: The hint was INFERRED; the real implementation is `experience-manager.ts` 1-53 (read in full) with its table `config/game/experience.ts` 1-20 (read in full). Sources of XP, all read: buy-level command `game-commands.ts` 1086-1098; per-round income loop 1418-1454 (XP at 1451, alive non-bot players only, 1420); Knowledge Thief XP and stack feed `abilities.ts` 619-634; the player wrapper `player.ts` 283-292; the stack target `core/pokemon-entity.ts` 1815-1840; the stack evolution check `core/evolution-logic/stack-evolution-handler.ts` line 10 (grep line only). Account XP: `game-room.ts` 995 (grep and read 985-1005) and `user-metadata.ts` 240-262. Five other ability strategies and `evolution-manager.ts` `tryEvolve` were NOT read; `gift-shop.ts` 253 (caller of `addExperience`) was NOT read. The arithmetic was run: a Node harness on the VPS (`/tmp/q049/xp-check.js`) copies the donor's `addExperience` and `canLevelUpWithXP` logic line for line (not the donor file itself, which imports Colyseus schema classes), and the sketch was compiled and run on the same VPS (`/tmp/q049/pac-run.js`). Both outputs are quoted below. Confidence: high on the arithmetic and the return value (run); medium on the reachability of the stack bug in play (read the call, did not play a game). Camera scope: not a camera cell.

Best transferable idea: A level-up loop should return the XP that counted toward progress, and anything fed by XP (a unit's stacks, a reward) must use that return value, not the amount requested; the donor's max-level branch breaks this and inflates the return value.
Decision (proposed): adapt — take the carry loop and the "return what counted" contract; the buy-XP-for-gold command and the round trickle are economy choices to decide separately, and the account-level award is meta progression, not a fight rule.
Acceptance: A server test: a team at level 8 holding 70 XP that receives a 5-point award reports 2 counted and stores 0 (the donor reports 72 and leaves 70 stored); an award of 80 at level 8 with 0 stored reports 72 and reaches level 9; a level-9 team reports 0 for any award.

## 1. Mechanism

- State: `level` starts at 2 (`experience-manager.ts` 17), `experience` at 0 (18), `expNeeded = ExpTable[2]` (19), and `maxLevel = 9` (20). The table (`config/game/experience.ts` 9-20) gives the XP to move from level n to n+1: 2 at level 2, 6 at 3, 10 at 4, 22 at 5, 34 at 6, 52 at 7, 72 at 8, 72 at 9 (level 9 is the cap, so the 9 entry is never used by the loop).
- `addExperience(quantity)` (27-40), in order:
  (a) `expToAdd = quantity` (28).
  (b) While `canLevelUpWithXP(expToAdd)` (42-47: stored XP plus this gain is at least the table cost, and the level is below the cap), subtract the table cost from `expToAdd` (30), step the level (31), refresh `expNeeded` with `?? 255` (32). The loop subtracts from the gain only; the stored XP is consumed implicitly because the check adds it. After the loop, `expToAdd` is the amount left over, possibly negative.
  (c) If the level is still below the cap (34), add `expToAdd` (possibly negative) to the stored XP and set `expToAdd = 0` (35-36). Below the cap the stored XP is therefore always the correct carry.
  (d) Return `quantity - expToAdd` (39): "return xp actually gained".
- At the cap (level 9) step (c) is skipped. `expToAdd` keeps its value, which is the overflow when the loop ended on a positive remainder, or a negative number when the last level-up used stored XP. The return is then `quantity - expToAdd`, which for a negative `expToAdd` is larger than `quantity`.
- XP sources, all into the same manager through `player.addExperience` (`player.ts` 283-292, which passes the result on and completes a mission order item at level 9 (286-290)):
  1. Buy-level command (`game-commands.ts` 1087-1096): if money covers `getLevelUpCost` (fixed 4, `experience-manager.ts` 50-53) and the level can rise, pay it and grant 4 XP (1091-1093).
  2. Income function (1418-1451): for each alive non-bot player it grants 2 XP (1420, 1451) alongside the gold income. The function is the round income step by its contents; its caller was not read, so the 'once per round' cadence is not verified.
  3. Knowledge Thief (`abilities.ts` 629-632): the owner gains `[1, 1, 1, 2, 3][stars - 1]` XP (630), and the thief pokemon's stack counter gets the XP that was actually gained (`addStack(xpActuallyGained)`, 631-632).
  4. Account XP (not team level): `ExpPlace[rank - 1]` at game end, ranks 1-8 give 700, 400, 350, 300, 250, 200, 200, 200 (`config/game/experience.ts` 2; `game-room.ts` 995). `giveUserExp` (`user-metadata.ts` 251-256) takes one level step per award against `ExpThreshold` 1000 and carries the rest (255). One step is enough there because an award is at most 700, below the threshold.
- Stack feed (`pokemon-entity.ts` 1823-1831): `addStack(amount)` returns early for a pokemon with no player (1824), adds `amount` to the board stacks (1825), and calls evolution only when `this.stacks === this.stacksRequired` (1828-1831). Equality, not `>=`. The donor's `stack-evolution-handler.ts` line 10 uses `>=` for the handler itself, but `addStack` decides whether to call it.
- Tick: no tick. Calls are synchronous, from the buy command, the round income loop, and the thief's ability process.

## 2. Key functions

- `ExperienceManager.addExperience`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/models/colyseus-models/experience-manager.ts` 27-40. The carry loop and the return value.
- `ExperienceManager.canLevelUpWithXP`: same file, 42-47. Stored plus gain against the cost, below the cap.
- The table and cap: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/config/game/experience.ts` 2-20.
- Thief XP feed: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/core/abilities/abilities.ts` 619-634 (`KnowledgeThiefStrategy.process`; the base `super.process` call and the earlier strategy body were not read).
- Stack feed: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/core/pokemon-entity.ts` 1823-1840.
- Buy-level and round income: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/rooms/commands/game-commands.ts` 1087-1096 and 1418-1452.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Carry loop: pay the cost of each level cleared, store the rest | Cost table 2, 6, 10, 22, 34, 52, 72, 72 (theirs, config/game/experience.ts 11-19) |
| Cap at the top level | MAX_LEVEL 9 (theirs, config/game/experience.ts 6; experience-manager.ts 20) |
| Return the XP that counted | `quantity - expToAdd` (theirs, experience-manager.ts 39) |
| Thief XP by unit tier | `[1, 1, 1, 2, 3]` by stars (theirs, abilities.ts 630), fallback 3 |
| Buy-level price and grant | Cost 4 (theirs, experience-manager.ts 51) and grant 4 (theirs, game-commands.ts 1093) |
| Round trickle | 2 XP per round for alive humans (theirs, game-commands.ts 1451) |
| Account rank award | 700 to 200 by rank (theirs, config/game/experience.ts 2); threshold 1000 (4) |
| Stack evolution gate | Equality (theirs, pokemon-entity.ts 1831); handler `>=` (theirs, stack-evolution-handler.ts 10) |

## 4. TypeScript sketch

simplified: the sketch keeps the carry loop, the level cap, and the return contract, and it corrects the donor's max-level branch: a gain that reaches the cap returns only the part of the overflow that came from this call, and the stored XP is cleared at the cap (the donor leaves the old stored value). It is a deliberate change, not a copy: in the donor, a gain that crosses into the cap while XP is stored returns the level cost (72), and the sketch returns the gain minus the overflow from this call (verified by a run, see section 6). It omits the buy-level command, the round trickle, the Knowledge Thief ability body, the account rank award, the stack evolution call, and the mission-order hook.

```ts
// Licence: GPL-3.0 (donor LICENSE). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
// Cost to clear each level (index = level). Donor: ExpTable, read as data.
const COST_FROM: number[] = [0, 0, 2, 6, 10, 22, 34, 52, 72, 72];
const MAX_LEVEL = 9;

interface TeamLevel {
  level: number;
  xp: number;   // XP stored toward the next level (always 0 at the cap)
}

// Adds XP and returns the part that counted toward progress. Callers that feed other
// systems (for example a unit's evolution stack) must use this return value, not the request.
function addXp(t: TeamLevel, quantity: number): number {
  let pool = t.xp + quantity;
  let level = t.level;
  while (level < MAX_LEVEL && pool >= COST_FROM[level]) {
    pool -= COST_FROM[level];
    level += 1;
  }
  t.level = level;
  if (level >= MAX_LEVEL) {
    // Overflow beyond the cap is discarded. Only the part of it that came from this call is taken off the return value.
    const overflowFromThisCall = Math.min(quantity, pool);
    t.xp = 0;
    return quantity - overflowFromThisCall;
  }
  t.xp = pool;
  return quantity;
}

// Stack gain for a unit that earns stacks from the XP its ability produced.
// The gain is the returned XP, so an overflowing call cannot inflate the stack.
function thiefStackGain(t: TeamLevel, stars: number): number {
  const xpGain = [1, 1, 1, 2, 3][stars - 1] ?? 3;
  return addXp(t, xpGain);
}
```

## 5. Lands in

- TARGET `src/fight/xp-award.ts` (the same engine award module as the other two progression cells): the one function that adds XP to a player and returns the amount that counted. Parity-checklist row 18 (loot roll and XP award).
- today: (not read; Frankendom's current XP code is outside this pass).
- Reuse tag: rewrite-from-idea (GPL-3.0 copyleft; clean-room only, shape not code)
- Brief rule served: one ledger (one XP write; anything fed by XP takes the returned amount); server-verified awards; zones as data for the cost table; row 18.

## 6. Gaps and risks

- GPL-3.0 copyleft: clean-room only. The sketch is from the mechanism.
- Verified by run (VPS Node harness, the donor arithmetic copied line for line): a team at level 8 with 70 stored XP and a 5-point gain returns 72, not 5, and stores 70 (state end `{"level":9,"experience":70}`); the sketch returns 2 and stores 0. The same arithmetic by hand (not run) gives 72 in the donor for a 1-point gain at level 8 with 71 stored, against 1 in the sketch (run). The stored-plus-gain crossing into the cap is the only path where the donor's return is inflated. Where the gain alone reaches the cap with nothing stored (80 at level 8, run), the donor and the sketch both return 72.
- Consequence, read but not played: the Knowledge Thief feeds `addStack(xpActuallyGained)` (`abilities.ts` 632). If the donor return is 72 at the cap, the thief's stack counter jumps by 72. `addStack` evolves only on exact equality (`pokemon-entity.ts` 1831), so a jump over `stacksRequired` skips evolution, and a stacks value that never equals the requirement again never evolves. Species `stacksRequired` values seen: 5, 10, 20, 30 (`models/colyseus-models/pokemon.ts` grep). Frankendom must use `>=` at the award and test a multi-point gain across the threshold.
- The equality check at `pokemon-entity.ts` 1831 has the same overshoot problem for any gain above 1 that crosses the requirement, even without the cap bug. Do not copy `===` for stack gates.
- Account XP (`giveUserExp`) takes one level step per call (`user-metadata.ts` 252-255). That is safe only because the award is at most 700 against a 1000 threshold; a larger award would need a loop. This is meta progression, not a fight rule.
- Buy-level (4 gold for 4 XP) and the round trickle (2 XP per round) are economy choices of this game. Frankendom's one-ledger ruling needs an owner decision before either is used.
- Not read: `gift-shop.ts` 253 (another caller of `addExperience`), `evolution-manager.ts` `tryEvolve`, the other ability strategies, the round loop that calls the income function. The claim that only these XP sources exist is therefore limited to the callers found by grep (`addExperience(` in `app`).
