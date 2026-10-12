# tmewett-BrogueCE (vfx-blood-finishers, cell 2)

Donor: `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/Combat.c` (inflictDamage, 1521-1613) with `Architect.c` (spawnMapDF, 3283-3335) | Licence: GNU Affero General Public License v3, as read in `LICENSE.txt` ("GNU AFFERO GENERAL PUBLIC LICENSE", Version 3, 19 November 2007). Clean-room only | C | symbol `inflictDamage` / `spawnMapDF`

Checked: The list's hint file (`Globals.c`) is the data half, not the mechanism: the blood rows are in the `dungeonFeatureCatalog` table (Globals.c 603, 635-644). The mechanism is in `Combat.c` and `Architect.c`. Read in full: `Combat.c` 1293-1353 (combat text buffer), 1355-1365 (flashMonster), 1515-1613 (inflictLethalDamage and inflictDamage), 1060-1122 (sneak attack block inside attack()). Read in part: `Combat.c` 1642-1681 (killCreature, death feature only; the rest of killCreature not read). `Architect.c` 3283-3335 (spawnMapDF, whole), 3364-3460 (spawnDungeonFeature, read to 3460). `IO.c` 1998-2043 (flashForeground), 2381-2388 (pauseAnimation), 2976-3006 (displayMonsterFlashes), 2057-2080 (colorFlash, head only). `Rogue.h` 1885-1900 (dungeonFeature struct). Not read: `attack()` head (1017-1059), `attackHit` (Combat.c 136), `rand_percent` (Math.c 62; which RNG stream it uses), `pauseBrogue`, the rest of `colorFlash`, the rest of `killCreature`. I did not enumerate every caller of `inflictDamage`; the `flashColor` argument was not traced. Confidence: high on the blood formula and the spread loop; high on the in-place re-roll defect (read directly, not run); low on whether any GAS blood type exists (not checked). Camera: not applicable.

Best transferable idea: a hit sets its blood extent from the damage, capped at the target's HP before the hit, and the stain spreads one neighbour-step per generation with its chance falling by a fixed step, so a finishing blow on a weak target leaves a smaller pool.
Decision (proposed): adapt - we want the stain to say how hard the hit was, and this is a cheap data-driven rule that keeps decals bounded at 375 wide. Adapt means: pick one formula (the donor's comment and code disagree), seed the stain RNG for replay, put a cell budget on the spread, and never re-roll a cell. Reject the donor's blocking flash loop (it holds the game for about 0.3 s).
Acceptance: At 375 wide, a 40-damage hit on a 100-HP creature leaves a stain up to 3 steps out from the wound; a 5-damage hit spreads one step only (each of the four neighbours at 22%); a unit test with a fixed seed asserts the same stain cells on replay and never more than the budget (40 cells).

## 1. Mechanism

- Hit entry: `inflictDamage` (1521-1613). It is called from `inflictLethalDamage` (1516) and from the attack path (callers not enumerated). Order of steps as the code runs:
  (a) early return if damage is 0 or the defender is invulnerable (1526-1530).
  (b) shield: a shield status absorbs damage first (1532-1542).
  (c) bleeding, before health is reduced: if damage > 0 and the creature has a blood type, copy that catalog feature, set its start chance to `startProbability x (15 + min(damage, currentHP) x 3 / 2) / 100` (1547-1549). A gas-layer blood multiplies that chance by 100 (1550-1552). Spawn it on the defender's cell (1553).
  (d) a sleeping defender wakes (1556-1558).
  (e) health is reduced (1597).
  (f) a monster that flees near death switches to fleeing (1600-1605).
  (g) if a flash colour was passed and damage > 0, the defender is flashed with strength `50 + (100 - 50) x damage / maxHP` (1606-1608; `MIN_FLASH_STRENGTH` is 50, 1513).
- Blood spread: `spawnDungeonFeature` (Architect.c 3364) passes the feature's start chance and decrement to `spawnMapDF` for surface features (3397-3402). `spawnMapDF` (3283-3335): the origin is marked generation 1 (3293). Each generation, every cell marked with the previous generation tries its four neighbours and each succeeds with `rand_percent(startProb)` (3297-3311). After the generation the chance drops by the decrement (3318). The loop stops when nothing changed or the chance is 0 or below (3297). When the generation counter passes 100 it relabels the cells so that the count stays small (3319-3331). Afterwards the origin is cleared if the feature needs propagation terrain and it is not there (3332-3334).
- Blood table: `dungeonFeatureCatalog` rows for blood are start 100, decrement 25, surface (`RED_BLOOD`, Globals.c 640; the same row shape for green, purple, worm; acid splatter is 200, 644). The comment above them (635-638) says the base is `15 + (damage * 2/3)`.
- Worked numbers (my arithmetic from the code, not run): red blood, start 100. A 4-damage hit gives 21%, so one generation at most. A 5-damage hit gives 22%. A 10-damage hit gives 30%: two generations (30%, then 5%). A 40-damage hit gives 75%: three generations (75, 50, 25). The step count is `ceil(start / 25)`.
- Death: `killCreature` (1642). If the death is not administrative, the monster has the `MA_DF_ON_DEATH` ability flag, and it is not falling, its death feature spawns at its cell (1671-1673), then a message if the monster is visible (1675-1680). Example in the monster table: bloats have `DF_BLOAT_DEATH` (Globals.c 1037).
- Flash: `flashMonster` (1355-1365) queues a flash on the creature (flag, strength, colour). It only replaces a pending flash when the new strength is higher (1359-1362). `displayMonsterFlashes` (IO.c 2976-3005) collects the queued flashes for the turn (up to 100) and calls `flashForeground` with 20 frames (3005). `flashForeground` (2000-2043) steps j from 20 down to 0: blend percent = strength x j / frames (2026), then waits 16 ms per step (2032).
- Sneak attack (1066-1117): a sneak is an attack by the player on a wandering defender (1066). Sleeping (1067) and paralysed (1068) defenders also count. On these, a non-player defender is delayed by `max(movementSpeed, attackSpeed)` ticks (`ticksUntilTurn += ...`, 1104; comment 1103) and switches to tracking scent (1105-1107). Damage is x5 with a dagger (1113-1115) and x3 otherwise (1117).
- Combat text: `combatMessage` (1293-1320) appends each hit line to a buffer and flushes it early when near full (1311-1313). `displayCombatText` (1327-1353) sends each buffered line as a foldable message (1350).
- Tick: per hit, synchronous (inside the attack). No per-frame loop in this mechanism. The flash is a blocking animation; the spread is instant.

## 2. Key functions

- `inflictDamage`: `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/Combat.c` 1521-1613. Shield, blood, HP, flee, flash.
- `spawnMapDF`: `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/Architect.c` 3283-3335. One step per generation, chance falls by the decrement.
- `spawnDungeonFeature`: `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/Architect.c` 3364-3460 (spread call at 3397-3402).
- `flashMonster` and `displayMonsterFlashes` / `flashForeground`: `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/Combat.c` 1355-1365; `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/IO.c` 2976-3005 and 2000-2043.
- Sneak attack: `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/Combat.c` 1060-1122.
- Death feature: `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/Combat.c` 1642-1681.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Stain extent from the hit: base + per-damage, capped at HP before the hit | base 15 percent points; per-damage 3/2 in code, 2/3 in the comment (theirs, Combat.c 1549; Globals.c 637) |
| Stain spreads one neighbour-step per generation, chance falls each generation | start 100 and decrement 25 for red blood (theirs, Globals.c 640); acid start 200 (Globals.c 644) |
| Stain survives only while the chance is above 0 | none (the rule is the loop condition, Architect.c 3297) |
| Flash strength grows with damage fraction, floor at 50 | floor 50 (theirs, Combat.c 1513); formula 50 + 50 x damage / maxHP (1607) |
| Flash plays as a fade over frames | 20 frames (theirs, IO.c 3005); 16 ms per step (IO.c 2032) |
| Sneak multiplier for an unaware target | x3 general, x5 dagger (theirs, Combat.c 1115-1117); flat-footed turn (1104) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order (chance from damage and HP before the hit, then one generation per step with the chance falling by the decrement). It fixes three things and omits others. Fixes: two frontier buffers and a seen-set, so a cell is rolled once and never re-marked before it spreads (the donor re-rolls and re-marks in place, see section 6); a cell budget (`maxCells`); a seeded `rand` passed in. Omits: the donor's surface-feature fill, propagation-terrain check, the blocking check (abortIfBlocking), the `t > 100` relabel (a value-overflow guard in the donor), the shield, the flash, the sneak multiplier, the message, and the blood-type table (the caller passes `typeStart` and `decrement`). Uses the donor's formula as the code runs (3/2), not the comment's 2/3.

```ts
// Licence: AGPL-3.0 (donor LICENSE.txt). Clean-room sketch from the described mechanism, not a translation of the donor lines.
export {};

type Cell = { x: number; y: number };

// Start chance in percent. Donor: typeStart x (15 + 1.5 x min(damage, HP before the hit)) / 100.
// The donor's comment says 2/3 where the code uses 3/2; this sketch follows the code as it runs (see section 6).
function bloodStartPercent(damage: number, hpBeforeHit: number, typeStart: number): number {
  if (damage <= 0) return 0;
  const basis = Math.min(damage, hpBeforeHit);
  return Math.floor((typeStart * (15 + Math.floor((basis * 3) / 2))) / 100);
}

// Spreads one step per generation to the four neighbours. Each neighbour succeeds with the current chance;
// the chance drops by the decrement after each generation. Stops when the chance is 0 or below (donor),
// or at a cell budget (fix: the donor has no cap other than the chance running out).
function spreadBlood(
  origin: Cell,
  startPct: number,
  decrement: number,
  isOpen: (c: Cell) => boolean,
  rand: () => number,      // seeded RNG so a replay reproduces the stains (row 19)
  maxCells: number,
): Cell[] {
  const key = (c: Cell): string => `${c.x},${c.y}`;
  const seen = new Set<string>([key(origin)]);
  const out: Cell[] = [origin];
  const dirs: Cell[] = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
  let frontier: Cell[] = [origin];   // fix: two buffers, so a cell is never re-marked before it spreads
  let chance = startPct;

  while (frontier.length > 0 && chance > 0) {
    const next: Cell[] = [];
    for (const c of frontier) {
      for (const d of dirs) {
        if (out.length >= maxCells) return out;
        const n: Cell = { x: c.x + d.x, y: c.y + d.y };
        if (seen.has(key(n)) || !isOpen(n)) continue; // fix: a cell is rolled once, never re-rolled
        if (rand() * 100 < chance) {
          seen.add(key(n));
          out.push(n);
          next.push(n);
        }
      }
    }
    frontier = next;
    chance -= decrement;
  }
  return out;
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/vf018-brogue-blood-spread.ts`, exit 0.

## 5. Lands in

- TARGET `src/fight/blood.ts` (client presentation of a confirmed hit; the stain is drawn from the server's hit record and changes no HP).
- PARITY row 8 (blood/wounds/decals). The list hint said row 10 (hit impact/hitstop). The stain is the blood-decal mechanism, so row 8 fits; the flash and the sneak opener are row 10 and row 9 territory and are not written here.
- Reuse tag: rewrite-from-idea (AGPL-3.0: clean-room; shape only; no donor line copied)
- Brief rule served: kills are server-verified (the stain comes from the server's hit record, and the client draws only); one ledger (the stain never changes HP); rule 4 of the addendum (Best transferable idea on every cell).

## 6. Gaps and risks

- Defect 1, formula mismatch: the comment (Globals.c 637) says `15 + damage x 2/3`; the code (Combat.c 1549) uses `15 + damage x 3/2`. For a 40-damage hit against 100 HP that is about 42% against 75%. Which one was intended is not clear from the donor. Fix: pick one by design and test it. The sketch follows the code.
- Defect 2, in-place update during the scan (Architect.c 3300-3311), my reading, not run: the spread does not check whether a neighbour is already filled, so an earlier cell can be re-marked with the new generation. And because the scan writes into the same array, a frontier cell overwritten before its own turn is skipped, so the result depends on scan order. Fix: two buffers and a seen-set (the sketch).
- Defect 3, blocking flash (IO.c 2024-2036, pauseAnimation at 2032): 21 steps with a 16 ms wait each hold the game loop for about 0.3 s. Fix: a non-blocking tween on the render clock, one per creature per turn (the donor already batches flashes per turn, 1359-1362 and IO.c 2976-3005, which is worth keeping).
- Defect 4, GAS branch (Combat.c 1550-1552): multiplies a `short` by 100 (Rogue.h 1891 is `short`), so it can overflow if a gas blood type exists. I did not check whether one exists. Fix: widen to int and clamp.
- Defect 5, no cap: the donor relies on the chance running out, so the spread size is only bounded in probability. Fix: the cell budget (sketch `maxCells`, value 40 is our proposal, not the donor's).
- Replay: `rand_percent` (Math.c 62, not read) decides the stains; its RNG stream was not checked. Row 19 needs the stain RNG seeded apart from the fight RNG.
- Data dependency: the formula needs HP before the hit. The hit event must carry the pre-hit HP, or the finishing-blow stain comes out wrong (the donor caps at HP before the hit, 1549 and 1597).
- Sneak attack and flat-footed turn (Combat.c 1066-1117) are real and transferable to the finisher and duel rows, but this note does not write them. A separate note would be needed.
- Combat text buffer (Combat.c 1293-1353): one folded line per turn instead of one line per hit. Relevant to readability at 375 wide, not written here.
- Not read: the caller set of `inflictDamage`; `attack()` head and `attackHit`; the rest of `killCreature` after 1700; `colorFlash` body after 2080; `rand_percent` (Math.c 62).
- Licence: AGPL-3.0, clean-room only. The sketch is written from the mechanism.

Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room; shape only)
Brief rule served: kills are server-verified and the client presents the stain from the hit record; receipts-not-reports (each number above has a receipt in `receipts.tsv`)
