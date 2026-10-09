# OpenDAoC-OpenDAoC-Core (loot-drops, cell 8)

Donor: /mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameutils/LootGeneratorAurulite.cs | Licence: GPL (file header: GPL v2 or later; repo licence file not read) | C# | symbol LootGeneratorAurulite.GenerateLoot

CLEAN-ROOM sketch only.

## 1. Mechanism

- `GenerateLoot(mob, killer)` (lines 43-126) calls the base generator first (`base.GenerateLoot`, line 45; LootGeneratorBase.cs 54-58 returns an empty list), so this generator's own table is only the add-on. It also fetches the aurulite item template by key before the try block (line 48).
- Owner resolution (53-57): the killer as a player; if the killer is an NPC whose brain is a controlled brain, the player owner of that pet. If there is still no player, the list is returned unchanged.
- Con gate (59-62): `killedcon = player.GetConLevel(mob) + 3`; if `killedcon <= 0` return unchanged. (`GetConLevel` itself was not read.)
- Level and band (64-104): `lvl = mob.Level + 1`, floored at 1; `maxcount` starts at 1. All of this is C# integer division. Below 10: `maxcount = lvl/2 + 1` and the pack size is NOT set (template default). 10-19: pack 5, `(lvl-10)/2 + 1`. 20-29: pack 10, 30-39: pack 20, 40-49: pack 30, same shape. 50 and up: pack 40, `maxcount = round(lvl/10)`; because `lvl/10` is already integer division, `Math.Round` changes nothing, so this is effectively floor(lvl/10). The pack size is written onto the fetched template object (`aurulite.PackSize`), not onto the drop.
- Named mobs (106-110): if the name is not all lowercase, `maxcount = round(maxcount * LOOTGENERATOR_AURULITE_NAMED_COUNT)`.
- Roll (112-116): if `maxcount > 0` and `Util.Chance(BASE_CHANCE + max(10, killedcon))` (integer percent; `Util.Chance(int)` is `chance > Random.Next(100)`, Util.cs 48-51), it calls `loot.AddFixed(aurulite, ceil(maxcount * AMOUNT_RATIO))`. `AddFixed` (LootList.cs 57-61) appends that many copies of the same template to the always-drop list. Server property defaults (ServerProperties.cs 1895-1913): base chance 10, amount ratio 0.5, named count 1.5.
- Any exception in the try returns the list as built so far (118-123).
- Where it runs: this generator is attached to an instance region by `LootMgr.RegisterLootGenerator(new LootGeneratorAurulite(), null, null, null, previousInstance.ID)` (AdventureWingJumpPoint.cs 145), so it is not a global generator. `LootMgr.GetLoot` (LootMgr.cs 408-433) calls each registered generator in its own try/catch, merging results with `AddAll`. `DropLoot` (AbstractServerRules.cs 1209) is called from the kill-reward path at line 1075, only when `killedNpc.CanDropLoot`. Server-side, once per kill.

## 2. Key functions

| Name | Path | Lines | What it does |
|---|---|---|---|
| LootGeneratorAurulite.GenerateLoot | /mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameutils/LootGeneratorAurulite.cs | 43-126 | Adds the currency drop: owner, con gate, band-based count, named bonus, chance roll |
| LootMgr.GetLoot | /mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameutils/LootMgr.cs | 408-433 | Calls each generator in try/catch and merges lists |
| LootList.AddFixed | /mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameutils/LootList.cs | 57-61 | Appends N copies of a template to the fixed list |

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Extra currency drop gated by a relative-difficulty value (con) | Con offset +3 (theirs); floor of 10 on the chance term (theirs) |
| Tiered count by level band, growing by one per two levels inside a band | Band width 10 levels (theirs); step 2 (theirs); pack sizes 5, 10, 20, 30, 40 for bands from 10 up (theirs; below 10 not set); top band floor(lvl/10) (theirs) |
| Named-enemy multiplier on the count | Named multiplier 1.5 default from server properties (config, theirs) |
| Rolled chance = base + difficulty term, fixed amount = ceil(count * ratio) | Base chance 10 and amount ratio 0.5 defaults from server properties (config, theirs) |
| Mob level plus one as the level input | Level offset +1 (theirs) |

## 4. TypeScript sketch

Licence: GPL (donor). CLEAN-ROOM sketch: written from the mechanism above, not translated from the donor.

simplified: the pet-owner resolution is reduced to an `ownerIsPlayer` flag, `AddFixed` is a single drop with a count (the donor appends N copies), the pack size is returned by `bandPack` but ignored (the donor writes it onto the item template), the try/catch is omitted, and the donor's server-property defaults (10, 0.5, 1.5) are replaced by placeholder constants.
```ts
// clean-room sketch of a level-banded currency add-on, gated by relative difficulty.
// Licence line: GPL donor; this sketch is clean-room, written from mechanism only.
interface Kill { mobLevel: number; mobName: string; conLevel: number; ownerIsPlayer: boolean; }
interface Drop { itemId: string; count: number; }
const BASE_CHANCE_PCT = 10;      // config in donor (theirs); value not taken
const AMOUNT_RATIO = 1;          // config in donor (theirs)
const NAMED_MULT = 1.5;          // config in donor (theirs)
function bandPack(lvl: number): { pack: number; count: number } {
  if (lvl < 10) return { pack: 1, count: Math.floor(lvl / 2) + 1 };
  if (lvl < 20) return { pack: 5, count: Math.floor((lvl - 10) / 2) + 1 };
  if (lvl < 30) return { pack: 10, count: Math.floor((lvl - 20) / 2) + 1 };
  if (lvl < 40) return { pack: 20, count: Math.floor((lvl - 30) / 2) + 1 };
  if (lvl < 50) return { pack: 30, count: Math.floor((lvl - 40) / 2) + 1 };
  return { pack: 40, count: Math.floor(lvl / 10) }; // donor: integer lvl/10, so floor
}
function currencyAddOn(k: Kill, rnd: () => number): Drop | undefined {
  if (!k.ownerIsPlayer) return undefined;
  const relDiff = k.conLevel + 3;
  if (relDiff <= 0) return undefined;
  const lvl = Math.max(1, k.mobLevel + 1);
  let count = bandPack(lvl).count;
  const isNamed = k.mobName.toLowerCase() !== k.mobName;
  if (isNamed) count = Math.round(count * NAMED_MULT);
  const chance = BASE_CHANCE_PCT + Math.max(10, relDiff);
  if (count <= 0 || rnd() * 100 >= chance) return undefined;
  return { itemId: 'currency', count: Math.ceil(count * AMOUNT_RATIO) };
}
```

## 5. Lands in

- TARGET origins/encounters/encounters.ts (`rollTable` / `rollLoot`, the EQEmu loot port, already rolls a table's `currency` min-max as metal and gates entries by `levelMin`/`levelMax` from `foeLevel`). Pay-out is origins/server/mob-rewards.ts (bronze paid with the `metal` op in the kill's one transaction). The donor's genuinely new part is the level-banded currency amount (count grows with foe level); it would be a catalogue/table field on the loot table, not a new module. `src/loot.ts` is the Pit's table (today: src/loot.ts, moving to server rewards).
- Parity checklist row 18 (loot roll and XP award; post-K item 3).
- The con-style gate is a relative-level value; Frankendom would take it from the foe's level and the hero's level data, not from a live con function.

Reuse tag: rewrite-from-idea
Brief rule served: (category default, not per-cell) one-character, one-ledger rule; rules 7-9 n/a

## 6. Gaps and risks

- The donor writes `PackSize` onto the template object it fetched (lines 77, 83, 91, 97, 102). Whether that object is shared is decided by the database cache (not read), but the pattern ties the amount to a record. In Frankendom the amount is a number on the drop, in the one-ledger transaction, never a field of a catalogue row mutated at runtime (no hidden numbers).
- The chance and count depend on the player-vs-mob con value (`GetConLevel`, not read). Frankendom's foe level is catalogue data; the band table must be catalogue fields (min level, step, pack), not constants in code.
- The donor's randomness is `Util.Chance` on an unseeded generator (Util.cs 48-56). Server-verified kills need a seeded stream the server replays; `rollLoot` already takes a seed and a `seededSource`.
- A failure returns the partial list silently (118-123, and again in `LootMgr.GetLoot` 420-430 which logs). Frankendom rolls inside the one reward transaction and a failure must fail the transaction, not pay less.
- The roll is per kill and per killer (pet resolved to owner). With MAX_ATTACKERS = 3 at most three creatures engage one player, so up to three kills can be pending; each pays once through its own token consumption, never merged.
- The generator is only registered for an instance region (AdventureWingJumpPoint.cs 145): its gating is by zone. In Frankendom that is zones as data (a loot-table reference on the zone/camp row), not a code-side registration.
