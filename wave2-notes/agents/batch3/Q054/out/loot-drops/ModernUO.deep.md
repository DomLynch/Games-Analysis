# ModernUO (loot-drops, cell 8)

Donor: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Misc/LootPack.cs` (with `Projects/UOContent/Mobiles/BaseCreature.cs`) | Licence: GNU GPL v3 (repo `LICENSE`, line 4: "Version 3, 29 June 2007"; the source files carry no header of their own) | C# | symbol `LootPack.Generate`, `LootPackEntry.Construct`, `BaseCreature.GetLootingRights`, `LootPack.GetLuckChanceForKiller`

Checked: Read in full: `LootPack.cs` 64-158 (luck and `Generate`), 527-650 (`LootPackEntry` constructors and `Construct`), 690-720 (the AOS part of `Mutate`), 827-905 (`GetBonusProperties`), 909-935 (`LootPackItem` constructor, not used further); `BaseCreature.cs` 122-140 (`DamageStore`), 3344-3455 (`GetLootingRights`), 5318-5385 (the parts of `GenerateLoot` and `AddLoot` that set and pass the luck). Set aside: `Projects/UOContent/Items/Armor/Artifacts/InquisitorsResolution.cs` (the list hint: an item definition; its `ArtifactRarity => 10` is a display stat, and the grep hits in BaseArmor.cs are display code, not a drop roll), `Projects/UOContent/Mobiles/Monsters/AOS/DemonKnight.cs` 116-127 (a separate artifact pick by rarity tier; grep hits only, not read as a block). Not read: `BaseRunicTool.ApplyAttributesTo` (what luck and property count do to the item), the non-AOS branch of `Mutate`, `LootPackItem.Construct`, `LootPackDice`, the honour context (`SentHonorContext`), the `Core.SE` setting, the expiry rule behind `Mobile.DamageEntries`, and the paragon and Mondain artifact paths. Confidence: high on the rights walk, the pack roll and the property-count roll (all read); medium on the first-hit bump (read, the code's own name `firstDamager` is inferred to be the earliest credited damager from the walk order, not run).

Best transferable idea: Decide loot rights from the server's damage ledger (a share of the top damage, scaled by the monster's max HP), then roll each drop with one luck rescue per drop table.
Decision (proposed): adapt - take the rights rule (damage share, minimum scaled by monster HP) as the loot-ownership rule for the 3-attacker fight; drop the historical first-hit bump unless playtests want it, and keep the luck rescue as a named zone field.
Acceptance: A server test with a 3000-HP monster and hits A 60, B 30, C 3 (A first): A's 60 becomes 75 after the bump, the minimum is 4 (75 / 16, truncated), so A and B have rights and C does not, and the killer's luck is A's.

## 1. Mechanism

- Rights are computed at death, from the damage ledger. `GetLootingRights` walks the damage entries newest first (BaseCreature.cs 3349). For each entry it credits any responsible sub-entry whose owner is a player and takes that from the entry's damage (3353-3386, skipping non-player owners at 3360). What is left goes to the entry's own damager if it is a player and the damage is above zero (3391-3396). Each player keeps one record; each credit sets `firstDamager` to that record, so after the walk it is the last record touched, which from a newest-first walk is the earliest credited damage (inferred from the code, not run).
- The bump: `firstDamager` gets its damage multiplied by 1.25 and truncated (3423-3428; the comment names "Five on Friday"). The list is sorted by damage, highest first (3431-3433). `topDamage` is the top record after the bump (3436). The minimum is `topDamage / divisor`, where the divisor is 16 for monsters at 3000 max HP or more, 8 at 1000 or more, 4 at 200 or more, and 2 below that (3438-3443). A record has rights when its damage is at least the minimum (3450).
- Killer luck: `GetLuckChanceForKiller` takes the rights record with the highest damage among those with rights (LootPack.cs 92-113) and gives it to `GetLuckChance`. That returns 0 for negative luck, caps luck at 1200 outside SE (84-86), and returns `(int)(luck^(1/1.8) x 100)` (89). At luck 1200 that is 5136 of 10000 (about 51%, computed by hand, not run).
- Death: `OnBeforeDeath` calls `GenerateLoot(false)` (BaseCreature.cs 3287), which sets the luck (5326) and runs the loot. At the end of every `GenerateLoot` the luck is reset to 0 (5356). Spawn-time loot therefore gets luck 0 (inferred from those lines; no other writes were read).
- Pack roll, `LootPack.Generate` (LootPack.cs 118-158): entries in order. Each entry rolls `Random(10000)` against its chance (131). Chance is stored as `(int)(100 x percent)` (586), so 60.00 percent is 6000. On the first miss in the pack, if the pack is AOS and the rescue has not been used, the flag is cleared (135) and the luck check runs (137); a pass gives a second roll on the same entry (139). The rescue is therefore tried once per pack, on the first missing entry.
- Pick, `LootPackEntry.Construct` (625-650): `Construct` returns null when the entry's spawn phase does not match (627), then picks an item type by weight from `Random(total)` (639-647) and sends it to `Mutate` with the luck.
- Mutate, AOS path (700-720), for weapons, armour, jewels and hats: a 1 in 100 roll replaces a weapon with a fire horn (696-699). Otherwise the bonus count comes from `GetBonusProperties` (706). Then one luck roll may add one bonus if the count is below max (710). The property count is `1 + bonus`, capped at max (715-720). The attributes are applied by `BaseRunicTool.ApplyAttributesTo` (not read).
- `GetBonusProperties` (827-905): the weights depend on max props. For max 1 the weights are 3 and 1; for max 5 they are 30, 25, 20, 15, 9 and 1 (for 0 bonus up to 5). The roll is checked from 5 down (870-905). The total is 100 at max 5.

## 2. Key functions

- `BaseCreature.GetLootingRights(in ValueLinkList<DamageEntry>, int)`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/BaseCreature.cs` 3344-3455. Walk (3349-3420), first-hit bump and sort (3423-3433), minimum and rights (3436-3450).
- `LootPack.GetLuckChanceForKiller` and `GetLuckChance`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Misc/LootPack.cs` 64-114.
- `LootPack.Generate`: `LootPack.cs` 118-158. Entry roll, the single luck rescue, then `Construct`.
- `LootPackEntry.Construct`: `LootPack.cs` 625-650. Phase check (627), weighted item pick (639-647).
- `LootPackEntry.Mutate` (AOS branch): `LootPack.cs` 690-720. Fire horn (696-699), bonus and luck (706-720).
- `LootPackEntry.GetBonusProperties`: `LootPack.cs` 827-905.
- `BaseCreature.GenerateLoot(bool)` and `AddLoot`: `BaseCreature.cs` 5320-5330, 5356, 5371-5382 (the call with the luck at 5381).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Rights as a share of top damage: minimum = top / divisor, divisor set by the monster's max HP | Divisor 16 at 3000 HP or more, 8 at 1000, 4 at 200, 2 below (3440-3443) |
| First-hit bump | x1.25, truncated (3428); cites "Five on Friday" (3423) |
| Killer luck as a percent chance | Luck to the power 1/1.8, times 100, out of 10000 (89); luck capped at 1200 outside SE (84-86) |
| Entry chance in tenths of a percent | Entry chance is `(int)(100 x percent)` out of 10000 (586); the roll is `Random(10000)` (131) |
| One luck rescue per pack | First miss only (135-139) |
| Weighted item pick | Weights stored per item (LootPackItem; weights as written in the pack tables, for example 211 / 53 / 303 / 39 / 158 in AosMagicItemsRichType1 at 161-166, not receipted) |
| Bonus property weights by max props | Max 1: 3, 1. Max 3: 10, 6, 3, 1 (848-853). Max 5: 30, 25, 20, 15, 9, 1 (865-870). Sum 100 at max 5 |
| Property count | 1 + bonus, capped at max (715-720); one luck roll may add one (710) |
| Rich pack tiers | MlRich: spawn-time gold 100 percent (171), magic entries at 100, 80 and 60 percent with max props 3, 3 and 5 (172-174) |

## 4. TypeScript sketch

simplified: the sketch keeps the rights walk (newest first, player credits, the earliest credited record bumped x1.25, the HP-scaled minimum), the killer-luck curve, the pack roll with its single rescue and the spawn-phase check after the roll, the weighted item pick, and the bonus-property roll with the luck bump and cap. It omits: the responsible sub-entries (pets and summons are not resolved to owners; the sketch takes player-owned hits as given), the expiry of damage entries, the honour-context bonus to luck, the `Core.SE` setting (the sketch always caps, as a non-SE build does), the non-AOS branch, the fire-horn swap, the item construction and `ApplyAttributesTo`, and the `Summoned` guard in `AddLoot`. It reorders nothing else, but the donor's `Utility.Random` calls are replaced by an injected `rand(n)`, so tests must not assume the donor's random sequence. A max-props of 0 has no weight table in the sketch and returns 0; the donor's behaviour there was not read (see section 6).

```ts
// Licence: GNU GPL v3 (donor LICENSE). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Hit { playerId: string | null; damage: number; } // oldest first; null = not a player-owned hit
export interface Right { playerId: string; damage: number; hasRight: boolean; }

// Who may loot. Walk newest first, credit player hits, bump the earliest credited player x1.25,
// then a player has rights when damage >= topDamage / divisor (divisor set by the monster's max HP).
export function lootingRights(hits: Hit[], hitsMax: number): Right[] {
  const rights: Right[] = [];
  let first: Right | null = null;
  for (let i = hits.length - 1; i >= 0; i--) {
    const h = hits[i];
    if (h.playerId === null || h.damage <= 0) continue;
    let r = rights.find((x) => x.playerId === h.playerId);
    if (!r) {
      r = { playerId: h.playerId, damage: 0, hasRight: false };
      rights.push(r);
    }
    r.damage += h.damage;
    first = r; // the last record touched in the newest-first walk
  }
  if (rights.length === 0) return rights;
  if (first !== null) first.damage = Math.trunc(first.damage * 1.25);
  rights.sort((a, b) => b.damage - a.damage);
  const top = rights[0].damage;
  const divisor = hitsMax >= 3000 ? 16 : hitsMax >= 1000 ? 8 : hitsMax >= 200 ? 4 : 2;
  const minDamage = Math.trunc(top / divisor);
  for (const r of rights) r.hasRight = r.damage >= minDamage;
  return rights;
}

// Killer luck in tenths of a percent (out of 10000). Donor: luck to the 1/1.8 power, times 100.
export function luckChance10k(luck: number, capOutsideSE: boolean): number {
  if (luck < 0) return 0;
  const l = capOutsideSE && luck > 1200 ? 1200 : luck;
  return Math.trunc(Math.pow(l, 1 / 1.8) * 100);
}

export interface PackItem { type: string; weight: number; }
export interface PackEntry { chance10k: number; atSpawnTime: boolean; items: PackItem[]; }

// One pack. The luck rescue is tried once per pack, on the first entry that misses.
// Donor order: the entry roll and the rescue run before the spawn/death phase check.
export function generatePack(
  entries: PackEntry[],
  spawning: boolean,
  luck10k: number,
  aos: boolean,
  rand: (n: number) => number,
): string[] {
  const out: string[] = [];
  let rescueLeft = aos;
  for (const e of entries) {
    let add = e.chance10k > rand(10000);
    if (!add && rescueLeft) {
      rescueLeft = false;
      if (luck10k > rand(10000)) add = e.chance10k > rand(10000);
    }
    if (!add) continue;
    if (e.atSpawnTime !== spawning) continue;
    const total = e.items.reduce((s, i) => s + i.weight, 0);
    let r = rand(total);
    for (const i of e.items) {
      if (r < i.weight) {
        out.push(i.type);
        break;
      }
      r -= i.weight;
    }
  }
  return out;
}

// Bonus properties by max props. Index k = weight of k bonus properties; checked from the top down.
const BONUS: Record<number, number[]> = {
  1: [3, 1],
  2: [6, 3, 1],
  3: [10, 6, 3, 1],
  4: [16, 12, 6, 5, 1],
  5: [30, 25, 20, 15, 9, 1],
};

export function bonusProperties(maxProps: number, rand: (n: number) => number): number {
  const w = BONUS[maxProps];
  if (w === undefined) return 0; // donor has no case for 0 or above 5; not read further
  const total = w.reduce((s, x) => s + x, 0);
  let r = rand(total);
  for (let k = w.length - 1; k >= 1; k--) {
    if (r < w[k]) return k;
    r -= w[k];
  }
  return 0;
}

// Property count for one AOS item: bonus roll, one luck roll may add one, count is 1 + bonus capped at max.
export function propertyCount(maxProps: number, luck10k: number, rand: (n: number) => number): number {
  let bonus = bonusProperties(maxProps, rand);
  if (bonus < maxProps && luck10k > rand(10000)) bonus++;
  return Math.min(1 + bonus, maxProps);
}
```

## 5. Lands in

- TARGET `src/fight/loot.ts` (new, server-side): the rights rule and the pack roll, both reading the server damage ledger and the zone's table fields. Parity-checklist row 18 (loot roll and XP award).
- The rights rule is the loot-ownership answer for many-on-one fights (MAX_ATTACKERS = 3). It belongs with kill credit, which is server-verified.
- Reuse tag: rewrite-from-idea (GPL v3; clean-room only)
- Brief rule served: server-verified kills and one ledger (rights are computed from the server damage ledger, not from the client); zones as data (divisor, minimum, luck rescue, pack chances and property weights are zone fields).

## 6. Gaps and risks

- GPL v3: clean-room only. The sketch is written from the mechanism, not translated.
- The first-hit bump is a historical rule, and the donor cites a web article for it. It gives a 25 percent edge to whoever hit first; in a 3-attacker fight that may matter more than we want. Decide by playtest, default off.
- `firstDamager` is inferred to be the earliest credited damager (walk order, not run). Frankendom must name the rule in the data, not rely on walk order.
- Quirk to avoid: `Generate` rolls each entry and may spend the one luck rescue before `Construct` checks the spawn phase (131-139 before 627). A spawn-phase entry with a chance under 100 that misses in the death pass therefore uses the rescue, and so can starve a death-phase entry. The sketch keeps the donor order and says so; Frankendom should check the phase first.
- Spawn-time loot gets luck 0 by the reset at 5356 (inferred, see section 1).
- Max props 0 has no weight table in the donor's switch; the donor would call `Utility.Random(0)` (lines 827-877, not followed further). Frankendom should reject 0 at data load.
- The luck cap at 1200 applies only outside SE (84-86). Frankendom needs one cap, set as zone data.
- The rights are computed from damage entries that expire (the `Mobile.DamageEntries` getter prunes them; the expiry rule was not read). Frankendom's ledger needs an explicit window.
- A 1 in 100 weapon swap to a fire horn (696-699) is a donor joke item. Do not copy silently.
- Not read: `ApplyAttributesTo` (what the property count does to stats), `LootPackItem.Construct`, honour context, the non-AOS branch.
