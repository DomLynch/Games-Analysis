# hedgewars-hw (spawns-encounters, cell 4)

Donor: `/mnt/frankendom-donors/hedgewars-hw/hedgewars/uGearsUtils.pas` (drop roll `SpawnBoxOfSmth`, 1584-1666; with `uGears.pas` turn-end steps, `uGearsHedgehog.pas` pickup, `uGearsHandlersMess.pas` add-ammo step, `uRandom.pas`, `uConsts.pas`, `uVariables.pas` defaults) | Licence: GNU GPL version 2 ("version 2 of the License", header of `uGearsUtils.pas` line 7; `/mnt/frankendom-donors/hedgewars-hw/COPYING` "Version 2, June 1991"; the header does not say "or later") | Pascal | symbol `SpawnBoxOfSmth`

Checked: The hinted file `share/hedgewars/Data/Missions/Campaign/A_Space_Adventure/desert01.lua` is a scripted mission: it places fixed supply crates (`SpawnSupplyCrate`, line 149) and does not hold the drop rule, so I did not use it as the source. The drop rule is in the engine. Read in full: `uGearsUtils.pas` 1584-1666 (`SpawnBoxOfSmth`), 1711-1762 (`GetAmmo`, `GetUtility`); `uGears.pas` 64-84 (step list and delays), 135-141 (`DoDelay`), 440-530 (turn-end step machine, including `stSpawn` at 492-506); `uGearsHedgehog.pas` 788-840 (`PickUp`), 1344-1362 (pickup check); `uGearsHandlersMess.pas` 6879-6902 (add-ammo step); `uRandom.pas` 93-97; `uConsts.pas` 366-395; defaults at `uVariables.pas` 2974-2984 (grep and read of those lines); `uScript.pas` 3837 (scheme/script override, grep). Not read: the loop that starts the turn-end machine and re-enters `stInit`; `GetNext` (the RNG core, so "1 in N" assumes `GetRandom` is uniform); `FindPlace`; `AddPickup`; the crate-stir branch at `uGears.pas` 274 and 323; the mission scripts' `CaseFreq = 0` lines (grep only; too short to receipt). Confidence: high on the roll, cap and class split (read in code, receipts verified); medium on the cadence (once per turn-end pass, from the step order; the entry loop was not read). Note the zero-weight fall-through below is from reading the code, not from running it.

## 1. Mechanism

- A drop director runs during the turn-end step list. The step order is `stHealth`, then `stSpawn`, then `stDelay4`, then `stNTurn` (`uGears.pas` 69). In `stSpawn`, if the game is not in a multi-shot sequence, it calls `SpawnBoxOfSmth` once, then sets `delay := delayFinal` (100) and advances (494-502). In a multi-shot sequence it skips the drop (`inc(step, 2)`). `DoDelay` counts `delay` down by one per call and returns true at zero (137-141).
- `SpawnBoxOfSmth` order: (a) no drop if placing hogs or kings, if `cCaseFactor = 0`, if the live count of `gtCase` is at `cMaxCaseDrops`, or if `GetRandom(cCaseFactor) <> 0` (1589-1593). So a drop is a 1-in-`cCaseFactor` roll, with a cap on live boxes.
- (b) Class split. Weights come from the ammo table: each non-utility ammo adds its `Probability` to `aTot`, each utility adds to `uTot` (1598-1602). Start with `t = 0`, `a = aTot`, `h = 1` (1604-1606).
  - If `aTot + uTot <> 0` and the game is not invulnerable (`gfInvulnerable` clear): `h = cHealthCaseProb * 100` (out of 10000), `t = GetRandom(10000)`, `a = (10000 - h) * aTot div (aTot + uTot)` (1609-1613). So the health share is `cHealthCaseProb` percent, and ammo and utility split the rest by weight.
  - If invulnerable: `h = 0`, `t = GetRandom(aTot + uTot)`, and `a` stays `aTot` (1617-1619). So there is never a health box, and ammo vs utility is a weighted roll.
  - Then `t < h` gives a health box with `Health = cHealthCaseAmount` (1622-1626); `t < a + h` gives an ammo box (1632-1643); otherwise a utility box (1645-1656). A branch with zero weight gives no box.
  - Zero-weight case: if both weights are zero, the guard at 1608 skips the weighting, so `t = 0` and `h = 1` take the health branch. So a game with no weights at all still drops health boxes. This follows from reading the code and was not run.
- (c) The box's preset item is set to the lowest enum value (`i := Low(TAmmoType)`, 1639-1641), which is `amNothing` (`uTypes.pas` 165). So the box does not carry the item. The box is placed with `FindPlace` (1662) and a taunt is played (`PlayBoxSpawnTaunt`, 1663).
- Pickup. A hedgehog finds a box with `CheckGearNear(HHGear, gtCase, 36, 36)` (`uGearsHedgehog.pas` 1351; the argument meaning was not read) and calls `PickUp` (1353). `PickUp` sets the box's message to destroy (795). For an ammo or utility box with `AmmoType = amNothing`, it takes the unresolved branch (808-814): it sets random positions and active flags on `gtGenericFaller` objects with `Tag = 1` (817-830; their role was not read), then adds a `gtAddAmmo` gear with timer `GetRandom(125) + 25` (831).
- That gear's step (`doStepAddAmmo`, `uGearsHandlersMess.pas` 6879-6902) counts its timer down. When the timer reaches zero it rolls the item: `GetUtility` for a utility box, `GetAmmo` otherwise (6896-6898). Then it calls `AddPickup` and deletes itself (6899-6900). `GetAmmo` and `GetUtility` walk the weights: draw `t` below the total, then subtract each matching item's `Probability` until `t` is negative (1711-1735, 1737-1762). `GetUtility` also skips the switch utility when a team has one hedgehog (1744-1745, 1756-1757).
- Weights. The scheme gives each ammo a letter; `Ammoz[a].Probability := probabilityLevels[...]` (`uAmmos.pas` 100) maps it through the levels 0, 20, 30, 60, 100, 200, 400, 600, 800 (`uConsts.pas` 377). A letter of 0 gives weight 0 and removes the item from the pool.
- Overrides. `cCaseFactor`, `cHealthCaseProb`, `cHealthCaseAmount` and `cMaxCaseDrops` come from the scheme/script (`uScript.pas` 3837-3840), so a mission can turn the director off (`CaseFreq = 0` in several mission scripts, grep only).
- Defaults (`uVariables.pas`): `cCaseFactor = 5` (2983), `cHealthCaseProb = 35` (2974), `cHealthCaseAmount = 25` (2975), `cMaxCaseDrops = 5` (2984).
- Tick and loop. This is turn-based, not a real-time tick. The director runs once per pass through the turn-end step list. The `stirFallers` check (`uGears.pas` 274, every 8192 ticks, not read further) is a separate crate-fall effect.

## 2. Key functions

- `SpawnBoxOfSmth`: `/mnt/frankendom-donors/hedgewars-hw/hedgewars/uGearsUtils.pas` 1584-1666. Gates 1588-1593; class split 1598-1657; placement 1659-1665.
- `GetAmmo`, `GetUtility`: same file, 1711-1762 (weighted pick; the utility pick skips the switch utility when a team has one hedgehog).
- Turn-end drop step: `/mnt/frankendom-donors/hedgewars-hw/hedgewars/uGears.pas` 492-506 (`stSpawn`), with the step order at 69 and delays at 73-79.
- `DoDelay`: same file, 135-141.
- Pickup: `/mnt/frankendom-donors/hedgewars-hw/hedgewars/uGearsHedgehog.pas` 788-840 (`PickUp`), 1344-1362 (`CheckGearNear` for gtCase).
- Item roll at pickup resolution: `/mnt/frankendom-donors/hedgewars-hw/hedgewars/uGearsHandlersMess.pas` 6879-6902.
- RNG helper: `/mnt/frankendom-donors/hedgewars-hw/hedgewars/uRandom.pas` 93-97 (`GetRandom(m) = GetNext mod m`).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Drop roll 1 in N per round, only when the zone is not blocked | `cCaseFactor = 5` (1 in 5 per turn-end pass, 20%); `0` disables (`uVariables.pas` 2983) |
| Cap on live drops | `cMaxCaseDrops = 5` (`uVariables.pas` 2984) |
| Class split: fixed health share, the rest split by item weight | `cHealthCaseProb = 35` percent (`uVariables.pas` 2974); health removed when invulnerable (1609) |
| Health drop amount | `cHealthCaseAmount = 25` (`uVariables.pas` 2975) |
| Item chosen at collection time from a weighted pool | Weights from scheme letters through levels 0-800 (`uConsts.pas` 377) |
| Delay between the collection and the roll | `GetRandom(125) + 25` (`uGearsHedgehog.pas` 831); the unit is the engine's timer step (not converted) |
| Gap after a drop before the next step | `delayFinal = 100` (`uGears.pas` 79); `DoDelay` unit (not converted) |
| Zero-weight fall-through to health | Mechanism (1604-1608, 1622); constant `h = 1` at 1606 |

## 4. TypeScript sketch

simplified: keeps the 1-in-N roll, the live cap, the health share with the invulnerable exception, the weighted ammo-or-utility split, the zero-weight fall-through to a health box, and the weighted item pick at collection. It omits the switch-utility rule (the hedgehog-count condition in `GetUtility`), placement (`FindPlace`), the taunts, the faller re-scatter at collection, the collection timer (the sketch returns the box and item but not the delay), the turn-end step machine that calls it, and the poison and explosion effects of boxes. It reorders nothing, but it returns the box class and the item separately because the donor does the item roll later, at collection.

```ts
// Clean-room sketch from the described mechanism (donor is GPL-2.0 only; no lines translated).
export interface Item { name: string; weight: number; utility: boolean; }

export interface DropRules {
  everyNth: number;        // donor: cCaseFactor (1 in N per round; 0 = off)
  maxLive: number;         // donor: cMaxCaseDrops
  healthPercent: number;   // donor: cHealthCaseProb (percent)
  healthAmount: number;    // donor: cHealthCaseAmount
  items: Item[];           // weights from the scheme's probability levels
}

export type Box = { kind: "health"; amount: number } | { kind: "ammo" } | { kind: "utility" };

// Rand returns 0..n-1 (donor GetRandom(m) = GetNext mod m).
// Donor SpawnBoxOfSmth: gates, then a 1-in-N roll, then the class split.
export function rollBox(
  rules: DropRules, liveBoxes: number, invulnerable: boolean,
  blocked: boolean, rand: (n: number) => number,
): Box | null {
  if (blocked || rules.everyNth === 0 || liveBoxes >= rules.maxLive) return null;
  if (rand(rules.everyNth) !== 0) return null;

  let ammoW = 0, utilW = 0;
  for (const it of rules.items) { if (it.utility) utilW += it.weight; else ammoW += it.weight; }
  const total = ammoW + utilW;

  // Donor starts with t = 0 and h = 1, so when every weight is zero the health branch is taken.
  let t = 0, h = 1, a = ammoW;
  if (total !== 0) {
    if (!invulnerable) {
      h = rules.healthPercent * 100;                        // out of 10000
      t = rand(10000);
      a = Math.floor((10000 - h) * ammoW / total);          // ammo gets its share of the rest
    } else {
      h = 0;                                                // no health box when invulnerable
      t = rand(total);
    }
  }

  if (t < h) return { kind: "health", amount: rules.healthAmount };
  if (t < a + h) return ammoW > 0 ? { kind: "ammo" } : null;
  return utilW > 0 ? { kind: "utility" } : null;
}

// Donor GetAmmo / GetUtility: weighted item pick, run when the box is collected.
export function rollItem(items: Item[], utility: boolean, rand: (n: number) => number): Item | null {
  const pool = items.filter((i) => i.utility === utility);
  const total = pool.reduce((s, i) => s + i.weight, 0);
  if (total <= 0) return null;
  let t = rand(total);
  for (const it of pool) {
    if (t < it.weight) return it;
    t -= it.weight;
  }
  return null;
}
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population: the drop director is a spawn source, run once per round by the server). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer). Numbers are zone data fields (cap, one-in-N frequency, health share and amount, item weights).
- Related, not the target: the collection-time item roll is loot, row 18 (loot roll and XP award). Keep it in the loot path, server-verified, not in the spawn module.
- Reuse tag: rewrite-from-idea (GPL-2.0 only; clean-room only)
- Brief rule served: zone population (row 23): one director, zones as data; the cap and cadence are engine rules, the numbers are zone fields.
- Best transferable idea: a two-level drop roll (a 1-in-N gate with a live cap, then a fixed share for the health class and a weighted split of the rest, with the item rolled only at collection).
- Decision (proposed): adapt — keep the 1-in-N gate with a live cap and the fixed health share with its invulnerable exception, and roll the item when it is collected; change the cadence from a turn-end pass to a server round boundary (for example the end of a duel or a wave), and make the zero-weight case an explicit error rather than a health drop.
- Acceptance: a server test on a zone with a 1-in-5 drop roll and a live cap of 5: over a fixed seed, no sixth live box appears; a box is health 35% of the time when the zone is not invulnerable and never health when it is; the item is chosen only when the box is collected, and a zone with no item weights rejects the drop (no silent health box).

## 6. Gaps and risks

- GPL-2.0 only: clean-room only. The sketch is written from the mechanism, and the receipts are for locating the rules, not for copying.
- One engine: the donor's director is spread over the turn-end state list, the pickup code and the add-ammo step. Frankendom must keep the whole drop rule in `origins/server/world-spawns.ts`, with the item roll in the loot path.
- Server-verified: the donor rolls on the client-visible turn machine. Frankendom's roll must run on the server at the round boundary, and the client only shows the box.
- One ledger: a drop that is collected must write one ledger entry (item and amount) in the same place as other loot. The donor's `AddPickup` path is not read, so the ledger write is unknown.
- Turn-based cadence: the donor's "once per turn-end pass" has no meaning in a real-time fighting game. The per-round roll must name its round boundary in zone data.
- Zero-weight fall-through: a zone with no weights gives a health box in the donor. Do not copy that: fail closed.
- MAX_ATTACKERS = 3 is a duel rule and does not apply to drop caps. The live cap here is a zone cap (`cMaxCaseDrops`), a different number.
- Not read: the turn-end loop entry point, the RNG core (`GetNext`), `FindPlace`, `AddPickup`, the crate-stir branch (`uGears.pas` 274, 323), and the mission scripts' `CaseFreq = 0` lines (grep only).
