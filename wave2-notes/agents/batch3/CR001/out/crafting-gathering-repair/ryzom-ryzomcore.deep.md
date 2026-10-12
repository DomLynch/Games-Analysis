# ryzom-ryzomcore (crafting-gathering-repair, cell 2)

Donor: `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/server/src/entities_game_service/phrase_manager/combat_phrase.cpp` (with `player_manager/character_inventory_manipulation.cpp`, `game_item_manager/game_item.cpp`, `game_item_manager/player_inventory.cpp`, `egs_variables.cpp`, `sabrina/faber_action.cpp`) | Licence: AGPL-3.0 (`/mnt/frankendom-donors/ryzom-ryzomcore/COPYING` and `LICENSE`, both read: "GNU AFFERO GENERAL PUBLIC LICENSE Version 3, 19 November 2007") | C++ | symbols `CCombatPhrase::launchAttack`, `CCharacter::wearItem`, `CGameItem::removeHp`, `CGameItem::computeItemWornState`

Checked: cell 2 of 3 in cells-CR001.tsv (list column 4). camera_scope: not a camera cell. Read in full: `launchAttack` (combat_phrase.cpp 2316-2421), `wearRightHandItem`/`wearLeftHandItem`/`wearArmor`/`wearShield`/`wearJewels`/`wearItem` (character_inventory_manipulation.cpp 3236-3412), `removeHp`/`addHp` (game_item.cpp 1845-1956), `computeItemWornState` (1099-1133), the wear constants (egs_variables.cpp 186-216 and 442), the inventory change handler (player_inventory.cpp 979-1010) and `CInventoryBase::onItemChanged` (556-562). `getWearPerAction` (game_item.cpp 3703-3780): armour, shield, jewel and tool cases read (3763-3776); the weapon case list (3709-3762) skimmed only. Craft durability: `faber_action.cpp` 109-141 (success factor) and 333-410 (durability formula) read; the success table data (`_SuccessXpTable`) is not in the donor (loader seen at `egs_static_success_table.cpp` 182-191 only). Harvest: `sabrina/harvest_phrase.cpp` 321-401 (corpse harvest result) read; the validate and execute paths not read. Salvage: grep found no salvage, dismantle or disassemble code (NONE). Repair: grep found only the behaviour enum mapping at `phrase_utilities_functions.cpp` 1741 and a comment at `static_sabrina_bricks.h` 265; no repair implementation (NONE). An older wear path in `progression/progression_pve.cpp` 768-871 is inside a block comment (not live). Confidence high for armour wear (every line of the live path read); medium for craft durability (formula read, success table not). Note: the first grep pass of this donor showed blank bodies; those were an awk tab-split artifact of my own, re-read and confirmed.

Best transferable idea: each swing costs every worn piece a small, fixed amount of durability, scaled by the weapon's speed so a fast weapon wears less per swing, and tracked with a fractional carry so the ledger stays in whole points.
Decision (proposed): adapt — per-swing wear scaled by weapon speed is a clean cost for fast duels, but wear must be a server-written step in the duel (one ledger) and Frankendom should choose whether a miss wears gear (the donor wears on misses too).
Acceptance: a server test runs 100 swings with a 20-tick weapon and asserts the chest piece is 1 hp lower; 100 swings with a 10-tick weapon leave it unchanged, and about 200 swings lower it by 1; a worned piece (hp 1) is skipped and unequipped.

## 1. Mechanism

Wear is charged per swing, not per hit taken. Order in `launchAttack` (combat_phrase.cpp 2324-2355), for a player attacker only (2325):
- Wear comes first: the weapon's latency in ticks divided by a reference latency gives `wearFactor` (2331-2335; the donor comment reads "a weapon twice as fast will wear twice as slow"). The factor is used for the weapon in that hand (3242, 3273) and also for armour, shield and jewels (2347-2349).
- Armour: six equipment slots (head, chest, arms, hands, legs, feet; character_inventory_manipulation.cpp 3301-3309), each `wearItem` call (3311-3314). Jewels: ten slots (3358-3370). Shield: left hand (3320-3349).
- Each piece: skipped if already in state Worned (3394-3400). Otherwise `removeHp(getWearPerAction() * wearFactor)` (3396-3397). Armour's per-action rate is `ArmorWearPerAction`, default 0.01 (game_item.cpp 3774; egs_variables.cpp 209): 1.0 means one hp per action.
- The swing's success roll runs after the wear (2355). So a miss also wears the gear (the donor does not skip wear on a miss).
- `removeHp` (game_item.cpp 1851-1919): `whole = floor(|lost|)`; `remains += lost - whole`; if remains reaches 1, it drops by 1 and one more whole point is taken (1856-1862). Hit points never go below 1 from wear: `_HP = 1` (1867-1869). The inventory is notified with the itc_hp flag (1889, 1916).
- Worn state: `computeItemWornState` (1099-1133) maps hp to five tiers using WornState1..4 = 0.25, 0.10, 0.05, 0.01 of max durability (egs_variables.cpp 213-216): Unspoiled above 25%, WornState1 above 10%, WornState2 above 5%, WornState3 above 1%, WornState4 above 1 hp, and Worned at 1 hp or less. The thresholds are `uint32(fraction * maxHp)`, so they truncate. The tier is refreshed by the itc_hp handler (player_inventory.cpp 998-1005), which removeHp triggers, not by removeHp itself (its own call is commented out at 1897-1898).
- A worned piece is unequipped (3403-3411 for armour and jewels; 3247-3257 for weapons whose family is destroyed when worned; 3329-3349 for the shield). The destroy line is commented out in every case, so the piece is unequipped and kept, not destroyed.

Craft durability (`faber_action.cpp` 333-410, 468): a crafted piece's max durability is `max(1, floor(sumMpDurability * successFactor * plan.DurabilityFactor + MBODurability * successFactor))` (392). successFactor comes from a roll against a level-gap table: `deltaLvl = (skill + credit - 2 * cost) / 10` (93), chance from the table (94), and a factor of -1 (fumble), 0 (failure), between 0 and 1 (partial), 1 (success) or above 1 (critical) (`phrase_utilities_functions.cpp` 330-350). The table values are not in the donor.

## 2. Key functions

- `CCombatPhrase::launchAttack`: `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/server/src/entities_game_service/phrase_manager/combat_phrase.cpp` 2316-2421. Wear, then the success roll, then damage.
- `CCharacter::wearItem` (armour and jewels): `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/server/src/entities_game_service/player_manager/character_inventory_manipulation.cpp` 3381-3412.
- `CGameItem::removeHp`: `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/server/src/entities_game_service/game_item_manager/game_item.cpp` 1851-1919.
- `CGameItem::computeItemWornState`: same file, 1099-1133.
- Tier refresh: `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/server/src/entities_game_service/game_item_manager/player_inventory.cpp` 998-1005.
- Craft durability: `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/server/src/sabrina/faber_action.cpp` 333-410.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Wear per action = family rate x (weapon latency / reference latency) | Reference latency 20 ticks (egs_variables.cpp 186); armour rate 0.01 hp per action (209) |
| Fractional carry: whole points now, remainder kept | Carry threshold 1.0 (game_item.cpp 1858) |
| Wear floors hp at 1; no destruction by wear | Floor value 1 (1867-1869) |
| Five tiers from fraction of max hp, truncated | 0.25, 0.10, 0.05, 0.01 (egs_variables.cpp 213-216) |
| Craft durability = material durability x success factor x plan factor | Min 1 (faber_action.cpp 392); plan factor and MBO values from sheets (not read) |

Worked numbers from the code (armour rate 0.01, reference 20): a 20-tick weapon costs armour 0.01 hp per swing, so 100 swings remove 1 hp. A 40-tick weapon costs 0.02 per swing (50 swings per hp). A 10-tick weapon costs 0.005 (200 swings per hp). With max durability 100, tiers are: above 25 Unspoiled; 11 to 25 WornState1; 6 to 10 WornState2; 2 to 5 WornState3; 1 or less Worned. WornState4 is not reachable at max 100, because 1% of 100 is 1 and the code tests hp above 1 first (1119-1125; inferred from the branch order, max durability per piece not read).

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for one piece on one swing (skip if worned, then the scaled removal through the fractional carry, then the floor at 1). It omits the unequip-on-worned call, the per-family rate table (the caller passes the rate), the weapon-hand path (3242), the messages, and the inventory refresh (the sketch recomputes the tier from hp on each call). It fixes one defect: the donor's `removeHp` returns `hp - _HP` after setting `_HP = 1` (game_item.cpp 1891), so the sketch returns the points actually removed. The sketch also computes the tier on demand rather than storing it.

```ts
// Licence: AGPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Worn {
  hp: number;      // whole hit points (never below 1 from wear)
  maxHp: number;   // maximum durability of the piece
  remains: number; // fractional hit points carried to the next wear call
}

export type WornTier = "Unspoiled" | "WornState1" | "WornState2" | "WornState3" | "WornState4" | "Worned";

// Donor CVariables WornState1..4: share of max hp at which the tier drops.
export const WORN_FRACTIONS = { t1: 0.25, t2: 0.10, t3: 0.05, t4: 0.01 };

// Tier from current hp. Thresholds are the fraction times max, truncated (as the donor does).
export function tierOf(p: Worn): WornTier {
  if (p.hp <= 1) return "Worned";
  if (p.hp > Math.trunc(WORN_FRACTIONS.t1 * p.maxHp)) return "Unspoiled";
  if (p.hp > Math.trunc(WORN_FRACTIONS.t2 * p.maxHp)) return "WornState1";
  if (p.hp > Math.trunc(WORN_FRACTIONS.t3 * p.maxHp)) return "WornState2";
  if (p.hp > Math.trunc(WORN_FRACTIONS.t4 * p.maxHp)) return "WornState3";
  return "WornState4";
}

// Fractional carry: whole points leave now, the fraction is kept for the next call.
// Wear floors hit points at 1; it never destroys a piece on its own.
export function removeHp(p: Worn, lost: number): number {
  let whole = Math.floor(Math.abs(lost));
  p.remains += Math.abs(lost) - whole;
  if (p.remains >= 1) {
    p.remains -= 1;
    whole += 1;
  }
  if (whole === 0) return 0;
  const before = p.hp;
  p.hp = Math.max(1, p.hp - whole);
  return before - p.hp; // points actually removed (the donor returns a different number here)
}

// One piece on one swing. Pieces already Worned are skipped (the caller then unequips them).
// perAction is the family rate (donor default 0.01 for armour); weaponLatency / refLatency scales it.
export function wearOnSwing(p: Worn, perAction: number, weaponLatency: number, refLatency: number): number {
  if (tierOf(p) === "Worned") return 0;
  return removeHp(p, perAction * (weaponLatency / refLatency));
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/ryzom-gear-wear.ts`: exit 0.

## 5. Lands in

- TARGET `src/fight/gear-wear.ts` (new, engine): per-swing wear on the attacker's worn pieces in the duel step, scaled by weapon speed, with the fractional carry and the five tiers. The client only shows the tier.
- Parity-checklist row 18 (loot roll and XP award), the nearest row; durability has no row of its own (same gap as the ModernUO note).
- Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
- Brief rule served: 1 (one engine, server-written state); rules 7-9 n/a

## 6. Gaps and risks

- AGPL-3.0: clean-room only. The sketch is written from the mechanism.
- Ryzom wears gear on the attacker's swings, not on hits taken. Frankendom's gear story (the victim's armour) may want the opposite; the choice must be made, not copied.
- Misses wear gear (wear is charged before the success roll, 2347-2355). A design question, not proven a defect.
- Defect (game_item.cpp 1891): `removeHp` returns `hp - _HP` after `_HP = 1`, which is not the points removed. No live caller reads the return value (the four live callers at character_inventory_manipulation.cpp 3243, 3274, 3332, 3397 ignore it). Fix: return the points removed (sketch does this).
- Defect (game_item.cpp 1119-1125): with max durability 100 or less, WornState4 is unreachable, and the thresholds truncate (`uint32(fraction * maxHp)`), so 25% of max 10 is 2, not 2.5. Fix: compare in floating point, or drop the unreachable tier.
- Question: a worned armour piece is unequipped and kept (the destroy call is commented out at 3405-3410). Frankendom must decide between keeping it at 1 hp (current donor) and destroying it.
- Repair and salvage are NONE in this donor (see Checked). Gathering: a creature corpse is the resource and its raw-material quantities are removed on harvest (`harvest_phrase.cpp` 395-398). That is node-like but tied to creature spawns; not sketched. Zone rows (pool, respawn, cap) are not in the read code.
- Outside this cell, noted in passing: `combat_phrase.cpp` 2405 tests `playerChar != NULL ||` and then dereferences `playerChar` in the same expression; it should be `&&`. Not verified at runtime.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
Errors: No false claims found. Verified: launchAttack wear block 2324-2355 (wear before success roll, wearFactor=latency/20); removeHp fractional carry and floor at 1 (game_item.cpp 1851-1919, return hp-_HP defect at 1891); computeItemWornState 1099-1133 and WornState 0.25/0.10/0.05/0.01 (egs_variables 213-216); ArmorWearPerAction 0.01; 6 armour and 10 jewel slots; destroy lines commented out and unequipCharacter used; faber_action 93 and 392; harvest 395-398; combat_phrase 2405 playerChar != NULL || bug. Minor line drift only (MAX/const lines).
Missed: removeHp returns 0 at once for an Unbreakable shield (game_item.cpp 1853-1854), not mentioned. BUILD-TEST FLAG: Acceptance says a worn piece at hp 1 is 'skipped and unequipped' but the sketch (wearOnSwing) only skips; unequip is outside the module, so that clause cannot be asserted against the sketch. The 100-swing and 200-swing assertions pass only through double rounding (0.01 summed 100 times = 1.0000000000000007; 199 swings = 0.995 so 200 passes) - correct but fragile; a build using integer or fixed-point carry would still pass at exactly 100/200.
