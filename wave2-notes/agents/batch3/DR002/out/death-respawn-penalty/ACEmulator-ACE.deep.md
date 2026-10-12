# ACEmulator-ACE (death-respawn-penalty, cell 3)

Donor: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Player_Death.cs` (with `Entity/DeathItem.cs`, `WorldObjects/Corpse.cs`, `WorldObjects/Creature_Death.cs`, `WorldObjects/Player_Combat.cs`, `Managers/PropertyManager.cs`, `ACE.Common/ThreadSafeRandom.cs`) | Licence: GNU Affero General Public License version 3 (`LICENSE`, line 2 "Version 3, 19 November 2007"; network copyleft, clean-room only) | C# | symbol `CalculateDeathItems` / `Die` / `GetNumItemsDropped`

Checked: Read in full: `Player_Death.cs` `Die` (150-246), `CalculateDeathItems` (347-604, including the donor's rule comment), `GetNumItemsDropped` and `GetNumCoinsDropped` (623-689), the PK timer and PK death tick (945-1021), loot permission (734-818). `DeathItem.cs` (15-212: categories, ranking, halving, variance, stack value). `Corpse.cs` decay (27, 95-118). `Creature_Death.cs` corpse creation calls (428-470 and 526-556, read in part). `ThreadSafeRandom.cs` ranges (20, 30). Read in part: `OnDeath` (34-94), `InflictVitaePenalty` (125-143), the lifestone protection timer (896-933), `EnchantmentManager.UpdateVitae` (413-433). Not read: `Die` callers and `CreateCorpse` after line 556, `HandleDestroyBonded`, `GetSlipperyItems`, `LifestoneProtectionDispel`, `CalculateDeathItems_Olthoi`, and the `saveCorpse` gate. Confidence: high on the item count, ranking and PK tier rules (read end to end); medium on how the lifestone protection starts (not read). Not run: no game or test.

Best transferable idea: a death takes a level-banded, capped number of the highest-value items after a value ranking that halves repeats within a category and adds up to 10 percent noise, so the cost of dying scales with level and with what the player carries, and a PK-tier rule makes the same death cost more or nothing.

Decision (proposed): adapt — keep the level-banded count, the ranking and the PK tiers as a death-loss budget in zone and duel data, and copy the corpse loot permission (consent, one hour) for corpse runs; fix the donor's unimplemented PK caveat so a PK death counts as over level 35.
Acceptance: At level 45 an NPK death drops 2, 3 or 4 items (10,000 seeded deaths, each count within 2 points of a third); a second item of the same category ranks below the first; a PKLite death drops nothing; a PK death at level 15 can drop wielded gear and 0 to 2 items (the fix); a corpse owner grants another player one-hour loot permission, which is pruned after it expires.

## 1. Mechanism

- Tiers by killer. The killer decides the tier. `IsPKDeath` is true when the victim has the PK flag and the killer is another player (`Player_Combat.cs` 714). `IsPKLiteDeath` is the same for PKLite (`Player_Combat.cs` 725-726, read in grep). Tiers, as the code runs in `Die` (150-246):
  - NPK death (killer is a monster, or the victim is not PK): vitae penalty applies (208-209), enchantments: bad ones purged unless the augmentation keeps spells (211-220), items by the rule in step 2.
  - PKLite death: no vitae (207-209), and in `CalculateDeathItems` the function returns an empty list at once (481). Corpse is made with no items. After death the player is set to NPK for a respite (236, `SetMinimumTimeSincePK`).
  - PK death: vitae applies, all enchantments purged (211-214), items by the rule in step 2 with the donor's own PK exception (see section 6 for why the code does not match its comment).
- Step 1, death chain: `Die` sets the victim's health to 0, counts the death, sends messages, then waits for the death animation length plus 1 s (227) before `CreateCorpse` (231) and the portal teleport. `SetMinimumTimeSincePK` runs at the end for PK and PKLite deaths (236).
- Step 2, count (`GetNumItemsDropped`, 629-670): level 10 or below: 0 (652-653). Level 11-20: `Next(0,1)` which is inclusive, so 0 or 1 (655-656). Level 21 and up: `level / 20` plus an inclusive roll of 0 to 2 (659), capped at 14 (`MaxItemsDropped`, 623; cap at 661). For NPK deaths, the Clutch augment subtracts 5 per augment level (669), not applied to PK deaths. Coins: half, above level 5 (682).
- Step 3, eligibility (`CalculateDeathItems`, 484-508): pyreals excluded from the ranking; wielded items excluded unless level >= 35 (489, 499); bonded items excluded (`PropertyInt.Bonded` check, read between lines 499 and 508, not receipted); then `new DeathItems(inventory)` (508). Slippery items always drop outside the count (561).
- Step 4, ranking (`DeathItem.cs` 72-82, 104-135): value per unit (stack value divided by stack size, `DeathItem.cs` 161); sort by value, then group by category (72), halve every item after the first of its category, not cumulatively (75, 135), add a variance of -10 to +10 percent (79, 104, 117-119), re-sort by the adjusted value (82). Categories are the 15 item classes in the enum (15). Containers and lifestones are not in the list (`GetCategory` returns None, and the `DeathItems` constructor drops every None entry; read, not receipted).
- Step 5, drop: the first `count` items in the ranked list are removed from the inventory (521). A stack gives one unit (a split stack drops one unit). Each dropped item goes to the corpse (`dropItems`), and the corpse is saved only when items dropped (`Creature_Death.cs` 553, 542: `if (dropped.Count > 0)`; what the save gate does was not read).
- Step 6, corpse decay (`Corpse.cs`): an empty corpse decays after 15 s (`EmptyDecayTime`, 27, 107). A corpse with items decays after `max(3600, level * 300)` seconds (110): at least one hour, 5 minutes per level. Decay is set after the items are chosen (`Creature_Death.cs` 549, 551).
- Step 7, loot permission (`Player_Death.cs` 734-818): the owner can give another online player permission to loot the corpse for `PermitTime` = one hour (734, 768). The other player must have the consent option on (`AcceptCorpseLootingPermissions`, read in the add handler). Permissions are pruned at lookup (809, `HasLootPermission` 812-817).
- Step 8, PK respite (`Player_Death.cs` 951-1021): after a PK or PKLite death the victim is NPK with a timer at 0 (951-973). Each heartbeat adds `CachedHeartbeatInterval` (987). When the timer reaches `pk_respite_timer` (989; property default 300 s, `PropertyManager.cs` 660), the player is put back to the server's PK or PKLite level (`pk_server` or `pkl_server` settings, read in the rest of `PK_DeathTick`, not receipted). Note: the code sets the NPK state at death and only changes back on the timer.
- Step 9, lifestone protection (`Player_Death.cs` 919-933): a timer of one minute (919) that adds the heartbeat interval each tick (926) and clears the flag when it reaches the limit (928-932). The start point (set on respawn) and the dispel path were not read.

## 2. Key functions

- Death chain: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Player_Death.cs` 150-246 (`Die`).
- Items: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Player_Death.cs` 347-604 (`CalculateDeathItems`) and 629-670 (`GetNumItemsDropped`).
- Ranking: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Entity/DeathItem.cs` 38-135 (`DeathItems` constructor, `GetValueWithVariance`, `HalfValues`).
- Corpse decay: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Corpse.cs` 103-118 (`RecalculateDecayTime`).
- PK respite: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Player_Death.cs` 951-1021.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Count bands by level: none, then 0-1, then level/20 plus 0-2, capped | Level 10 (theirs, Player_Death.cs 652); level 20 band (655); divisor 20 (659); roll 0-2 (659); cap 14 (623) |
| Only the richest item in a category keeps its value; others halve, once | Halving factor 2 (theirs, DeathItem.cs 135) |
| Noise on the ranking | Variance 0.10 (theirs, DeathItem.cs 104; roll 117) |
| Coins: half above a level threshold | Level 5 (theirs, Player_Death.cs 682) |
| Wielded items drop only from a level | Level 35 (theirs, 489) |
| Augment reduces count per level | 5 per augment level, NPK only (theirs, 669) |
| Corpse lives for the longer of an hour and level x 5 minutes; empty corpses decay in 15 s | 3600 s, 300 s per level, 15 s (theirs, Corpse.cs 27, 110) |
| Loot permission for another player | One hour (theirs, Player_Death.cs 734) |
| PK respite | pk_respite_timer 300 s (theirs, PropertyManager.cs 660) |
| Lifestone protection | one minute (theirs, Player_Death.cs 919) |

## 4. TypeScript sketch

simplified: the sketch models the count bands, the ranking (value per unit, category halving, variance, re-sort) and the drop as the first `count` items. It follows the donor order (eligibility, count, ranking, drop). It FIXES the donor's unimplemented PK caveat: a PK death skips the low-level bands and may drop wielded gear, as the donor's own comment says (the donor code does not do this). It omits slippery items, bonded-destroy handling, loot permissions, the corpse object and decay, the PK respite timer, the lifestone protection, the vitae and enchantment purge, and stack splitting (the sketch returns ids only). The Clutch augment is a parameter, not an item.

```ts
// Licence: GNU AGPL version 3 (donor, copyleft). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Possession {
  id: string;
  value: number;        // face value of the whole stack
  stackSize: number;
  category: number;     // index into a fixed category order; -1 = not eligible (donor: None)
  wielded: boolean;
  bonded: boolean;
}

const MAX_ITEMS = 14;

// Inclusive integer roll between lo and hi (ACE ThreadSafeRandom.Next semantics).
function randInt(lo: number, hi: number, rand: () => number): number {
  return lo + Math.floor(rand() * (hi - lo + 1));
}

// How many items a death takes. NPK: none up to level 10, then 0-1 up to level 20.
// From level 21 (and for every PK death): level/20 plus 0-2, capped at MAX_ITEMS.
// The Clutch augment (clutch) removes 5 per level, but not for PK deaths.
function itemCount(level: number, isPkDeath: boolean, clutch: number, rand: () => number): number {
  if (!isPkDeath) {
    if (level <= 10) return 0;
    if (level <= 20) return randInt(0, 1, rand);
  }
  const n = Math.min(Math.floor(level / 20) + randInt(0, 2, rand), MAX_ITEMS);
  return isPkDeath ? n : Math.max(0, n - clutch * 5);
}

// Coins: half, above level 5 (integer division).
function coinsDropped(level: number, coins: number): number {
  return level > 5 ? Math.trunc(coins / 2) : 0;
}

// Rank the possessions: sort by value, halve every item after the first of its category
// (not cumulative), add a random -10% .. +10% variance, then re-sort by the adjusted value.
function rankForDeath(items: Possession[], rand: () => number): { id: string; adjusted: number }[] {
  const eligible = items.filter((p) => p.category >= 0 && !p.bonded);
  const rows = eligible.map((p) => ({
    id: p.id,
    category: p.category,
    adjusted: Math.trunc(p.value / Math.max(1, p.stackSize)), // per-unit value of a stack
  }));
  rows.sort((a, b) => b.adjusted - a.adjusted);
  rows.sort((a, b) => a.category - b.category); // stable: keeps value order inside a category
  let prev = -1;
  for (const r of rows) {
    if (r.category !== prev) prev = r.category;
    else r.adjusted = Math.trunc(r.adjusted / 2);
  }
  for (const r of rows) {
    const variance = -0.1 + rand() * 0.2; // half-open [-0.1, 0.1)
    r.adjusted = Math.trunc(r.adjusted + r.adjusted * variance);
  }
  rows.sort((a, b) => b.adjusted - a.adjusted);
  return rows.map((r) => ({ id: r.id, adjusted: r.adjusted }));
}

// Which items drop: count first, then the top of the ranking. Wielded items drop from level 35,
// and for every PK death (the donor's own comment says PK deaths count as over level 35).
// simplified: fixes the donor's unimplemented PK caveat. A PK death skips the low-level bands and may drop wielded items,
// as the donor comment says; the donor code does not do this (its wielded test is level >= 35 only, and its count skips the caveat).
// The sketch omits slippery items, loot permissions, the PK respite timer, corpse decay, rare-item rules, and stack splitting
// (it returns ids only). The ranking is the donor's order: category halving, then variance.
function pickDeathItems(
  level: number,
  isPkDeath: boolean,
  clutch: number,
  items: Possession[],
  rand: () => number,
): string[] {
  const canDropWielded = level >= 35 || isPkDeath;
  const eligible = items.filter((p) => canDropWielded || !p.wielded);
  const n = itemCount(level, isPkDeath, clutch, rand);
  return rankForDeath(eligible, rand).slice(0, n).map((r) => r.id);
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/dr002-ace-death-items.ts`, copy in `work/ace-death-items.ts`).

## 5. Lands in

- TARGET `src/fight/death.ts` (new module; the engine's death step: tier, count, ranking, drop into a corpse). Parity-checklist row 17 (death/respawn). The corpse loot permission is a client-facing rule and sits with the row 17 death state, not with row 23 (zone population). Zone data for the count band and PK tier table goes in the zone file; the hint said row 23 for zone population, which covers respawn and despawn only.
- Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only; network copyleft, so do not copy any line)
- Brief rule served: rule 1 (one engine: the death step is in the engine, the corpse is a server object), rule 3 (guard/stamina untouched), rule 8 (section 5 names a module and a row); 7-9 n/a

## 6. Gaps and risks

- Defect (fix in the sketch): the donor comment (`Player_Death.cs` 363-364 and 643-644) says a PK death always loses items as if over level 35, but the code does not do it. `canDropWielded` is `level >= 35` (489) with no PK test, and the count bands for levels 11-20 (655-656) also apply to PK deaths. Fix: treat a PK death as over level 35 for the wielded test and the low-level bands (the sketch does this).
- Defect (not fixed, noted): `InflictVitaePenalty(int amount = 5)` (125) never reads `amount`. The penalty is the `vitae_penalty` server property inside `UpdateVitae` (`EnchantmentManager.cs` 428). Fix: remove the parameter or use it.
- Minor defect: halving uses integer division (`DeathItem.cs` 135), so a value of 1 becomes 0. It sorts last, so the harm is small. Fix: halve as a float before the variance, or keep the integer and document it.
- The donor comment's level formula (level/10 in the old rule) differs from the code (level/20, the post-patch rule at 659). The code follows the post-patch rule; the comments mention both. Frankendom should state the band table as data, not as a comment.
- Random source: `ThreadSafeRandom` is a thread-local `System.Random` (ACE.Common). Frankendom kills are server-verified, so the item roll must use a seeded server RNG recorded in the one ledger; the donor records nothing.
- Item loss into a corpse vs take-one: the donor drops N items to a corpse the owner or permitted players can loot (734-818). Frankendom's take-one rule means the killer can take one item, not that the whole ranked list moves. Use the ranking to choose which items become takeable, not as a wipe.
- PK tier: the donor's PK death purges all enchantments (211-214), which Frankendom has no analogue for; express as a named debuff list with a data field, not a purge.
- The Clutch augment has no Frankendom counterpart; drop it, or make the per-level reduction a gear perk with a data field.
- Not read: the lifestone protection start point and dispel path (`LifestoneProtectionDispel` near 937); whether a corpse with no items is persisted (`saveCorpse`, 542-561); `CalculateDeathItems_Olthoi` (1065-); the bonded-destroy path (`HandleDestroyBonded`, 1029).
- AGPL-3.0 network copyleft: this note describes the shape only. The sketch was written from the mechanism; no donor line is copied.
