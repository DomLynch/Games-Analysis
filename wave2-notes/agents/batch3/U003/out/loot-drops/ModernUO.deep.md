# ModernUO (loot-drops, cell 8)

Donor: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Misc/LootPack.cs` (with `Mobiles/BaseCreature.cs` for the call sites and looting rights) | Licence: GPL-3.0 (`/mnt/frankendom-donors/ModernUO/LICENSE`: "GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007"; copyright line reads 2019-2020 ModernUO Development Team) | C# | symbol `LootPack.Generate`

Checked: Read in full: `LootPack.cs` 60-158 (luck, CheckLuck, Generate), 520-660 (LootPackEntry, Construct), 689-825 (Mutate), 827-906 (GetBonusProperties), 1101-1111 (dice roll); `BaseCreature.cs` 122-135 (DamageStore), 807-866 (constructor calls GenerateLoot(true) at 864), 3220-3290 (OnBeforeDeath), 3342-3454 (GetLootingRights), 5320-5357 (GenerateLoot(bool)); `Corpse.cs` 296-318 (looting rights used only for the aggressor list). Also opened `Server/Utilities/Utility.cs` 855-895 and `Server/Random/BuiltInRng.cs` 28-40 for the RNG ranges, and the AOS pack tables `LootPack.cs` 337-414. Not read: `BaseRunicTool.ApplyAttributesTo` (the actual property assignment, called at 725), `Loot.cs` item pickers, the `Mobile.DamageEntries` getter that prunes expired entries (`Server/Mobiles/Mobile.cs` 974; the BaseCreature comment at 3342-3343 says it prunes), and the corpse looting logic after line 318. Caller check: I read the spawn call (864), the death call (3287) and the AddLoot path (5371-5381); I did not read the `BaseCreature.cs` 3550 caller of GetLootingRights or the other 20+ `GenerateLoot()` overrides. Confidence: high on roll order and the looting-rights rule; medium on how the corpse uses the rights. Camera: not applicable.

Best transferable idea: a per-entry chance roll plus one weighted pick per drop, with damage-share looting rights that a player must clear against the top attacker, is a small, server-side loot step that a many-on-one kill can reuse directly.
Decision (proposed): adapt - the shape (per-entry chance table, one luck-style re-roll, damage-share rights against the top hitter) fits Frankendom's server-verified kill and MAX_ATTACKERS = 3, but the luck stat and the 2007 first-hitter 1.25x rule are UO-specific and become zone data fields or are dropped.
Acceptance: a server test kills one boss with three attackers (MAX_ATTACKERS = 3) under a seeded RNG, asserts the same drop list twice, asserts the first hitter's damage is weighted 1.25x for the rights check, and asserts a third attacker below top/8 at HitsMax >= 1000 gets no drop roll.

## 1. Mechanism

- Three trigger points. (a) At construction, `GenerateLoot(true)` runs (`BaseCreature.cs` 864): entries flagged spawn-time (gold) go into the backpack then. (b) At death, `OnBeforeDeath` (3220) calls `GenerateLoot(false)` once (guard `_hasGeneratedLoot`, 3285-3287). Just before, the killer's luck is worked out from the looting rights (5324-5326). (c) Inside `GenerateLoot(bool)` (5320) any paragon adds an extra pack by fame band (5333-5350, bands 1250 / 2500 / 5000 / 10000, see the `if (Fame < 1250)` receipt).
- Pack roll, `LootPack.Generate` (118-158). Entries are walked in order. Each entry rolls `Utility.Random(10000)` against its chance (131). If an entry misses and AOS is on, the pack spends its single luck re-roll on that first miss (135-139): it passes if `CheckLuck(luckChance)` (116) passes, then the entry rolls again. Each hit calls `entry.Construct` (148). A non-stackable item, or a stackable one that does not fit `TryDropItem`, is dropped into the container (152-154).
- Construct, `LootPackEntry.Construct` (625-654). If the entry's spawn-time flag does not match the current pass it returns null (627). Otherwise it sums the table weights, rolls once in `[0, total)` (639) and walks the table cumulatively (641-650). The picked item class is built and then passed to `Mutate` (647).
- Mutate (689-825). A weapon has a 1-in-100 chance to become a fire horn (696). For AOS items (weapon, armour, jewellery, hat): bonus = `GetBonusProperties()` (a weighted pick over 0..MaxProps), plus one luck bump if the bonus is below MaxProps (710-711), then `props = 1 + bonus` capped at MaxProps (715-721), then `BaseRunicTool.ApplyAttributesTo` with the intensity range (725; not read). Pre-AOS (751-785): accuracy, damage and durability levels each gated by a percent chance (80/60/40 and so on), with a 1-5 level from `GetRandomOldBonus` (656-687).
- Stackables: `Amount = Quantity.Roll()` (815). A result of zero or below deletes the item and returns null (816-820).
- Death-time order (what the code actually does): the chance rolls run for every entry, including spawn-time entries, so a spawn-time entry at death still uses up the pack's one luck re-roll; then `Construct` returns null because the spawn flag does not match (627-628). So a spawn-time gold entry is not created again at death, even though its chance roll runs.
- Looting rights, `BaseCreature.GetLootingRights` (3344-3454). The walk goes newest damage entry first (3342-3349). For each entry, damage done by pets or summons is credited to the controlling player when that master is a player (3360, 3386), and the remaining damage is credited to the damager if it is a player with damage above zero (3391-3396). Totals are kept per player in a `DamageStore` list (`BaseCreature.cs` 122-135).
- Then: the `firstDamager` (the player credited last in the newest-first walk, which is the oldest credit) gets its total multiplied by 1.25 (3423-3428; the comment cites a community rule, "Five on Friday"). The list is sorted by damage, highest first (3433). The top total is the threshold base (3436). `minDamage` is the top total divided by 16 if HitsMax is 3000 or more, by 8 at 1000 or more, by 4 at 200 or more, and by 2 below that (3438-3443). A player has the right if their total is at least `minDamage` (3450).
- Consumers. `GetLuckChanceForKiller` (92-113) picks the highest-damage player who has a right and returns their luck chance; `GenerateLoot(bool)` stores it as `m_KillersLuck` (5326) before the death pass. `Corpse.cs` 303-310 adds every right-holder to the corpse's aggressor list (what that list gates is not read).
- Luck to chance, `GetLuckChance` (64-90). Zero when AOS is off (66-67). For a player killer whose honour context targets this victim, luck gains the perfection bonus (73-77). Negative luck gives zero (79-81). Luck is capped at 1200 outside SE (84-85). The chance is `luck^(1/1.8) x 100` (89), on the same 0-9999 scale as the rolls.
- Tick: none. The whole drop happens inside the death call, once per creature. It is a synchronous step, not a per-frame loop.

## 2. Key functions

- `LootPack.GetLuckChance`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Misc/LootPack.cs` 64-90 (AOS guard 66-67, honour bonus 74-77, cap 84-85, formula 89).
- `LootPack.GetLuckChanceForKiller`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Misc/LootPack.cs` 92-113.
- `LootPack.Generate`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Misc/LootPack.cs` 118-158 (per-entry roll 131, single luck re-roll 135-139, construct and drop 148-156).
- `LootPackEntry.Construct`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Misc/LootPack.cs` 625-654 (spawn-time gate 627, weighted pick 639-651).
- `LootPack.Mutate`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Misc/LootPack.cs` 689-825 (fire horn 696, AOS props 710-721, pre-AOS levels 751-785, stackable amount 815-820).
- `LootPack.GetBonusProperties`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Misc/LootPack.cs` 827-906 (weights per MaxProps 835-870, bucket walk 877-905).
- `BaseCreature.GetLootingRights`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/BaseCreature.cs` 3344-3454 (walk 3349, credit 3360-3396, 1.25 rule 3428, threshold 3436-3443, right 3450).
- `BaseCreature.OnBeforeDeath` (death call): `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/BaseCreature.cs` 3220 and the call at 3287.
- `BaseCreature.GenerateLoot(bool)`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/BaseCreature.cs` 5320-5357 (killer luck 5324-5326, paragon packs 5333-5350).
- `Utility.Random(from, count)` and `BuiltInRng.Next(minValue, count)`: `/mnt/frankendom-donors/ModernUO/Projects/Server/Utilities/Utility.cs` 890 and `/mnt/frankendom-donors/ModernUO/Projects/Server/Random/BuiltInRng.cs` 34. Note: `Random(from, count)` returns `from` plus a count of values, so `Random(1, Sides)` is 1 to Sides inclusive (checked, not assumed).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Per-entry chance roll against a 0-9999 scale, chance stored as percent x 100 | Scale 10000 (`LootPack.cs` 131 and 586); AOS pack entries use values such as 100.00 (always), 5.00 (`LootPack.cs` 357) and 0.02 (AosPoor, not receipted) |
| One luck re-roll per pack, spent on the first miss | Single re-roll (135); luck from the killer's rights (`BaseCreature.cs` 5326) |
| Luck to chance curve | Exponent 1/1.8, times 100, luck cap 1200 outside SE (84-89). Example (my arithmetic, not run): luck 100 gives about 13%, luck 1200 about 51% |
| Weighted table pick | Weights are per item class in each pack table; sum then one roll (639) |
| Bonus-property count as a weighted pick, then +1 luck bump, capped at MaxProps | Weights per MaxProps: 1 gives 3/1 (lines 835-836); 2 gives 6/3/1 (841-843); 3 gives 10/6/3/1 (848-851); 4 gives 16/12/6/5/1 (856-860); 5 gives 30/25/20/15/9/1 (865-870). Lines are under 15 characters, so these are read, not individually receipted |
| Quantity dice, `XdY+Z` | Gold: AosPoor `1d10+10` (`LootPack.cs` 339), AosAverage `5d10+50` (356); dice roll 1-to-sides (1107) |
| Damage-share rights against the top hitter | Threshold divisors 16 / 8 / 4 / 2 by HitsMax 3000 / 1000 / 200 / below (3440-3443); first hitter x1.25 (3428) |
| Death call once, guarded | Guard flag (`_hasGeneratedLoot`, 3285) |
| Spawn-time gold pre-roll | Entry flag `atSpawnTime` (`LootPack.cs` 627, 356) |

Two numbers that look like tuning but are not: for MaxProps 1 the bonus weights do nothing, because `props` is capped at MaxProps and 1 + any bonus is still 1 (715-721). The first-hitter 1.25x multiplies the damage total used for the rights threshold, not the damage itself.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order that matters for one ledger: each entry rolls its chance first (including spawn-time entries at death), one luck re-roll is spent on the first miss, the spawn-time gate is applied after the roll, then a weighted pick and dice amount; the rights step takes the first hitter x1.25, the top total divides into a threshold, and HasRight is set. It omits: the AOS-off switch (the luck re-roll is always on), the SE luck uncap and honour bonus, the fire-horn 1% case, the pre-AOS level path, the non-stackable TryDropItem fallback, the Mondain/Stygian/Tokuno pool selection, `ApplyAttributesTo` (not read), and the MaxProps 0 case (not checked). The rights input is ordered oldest first; the donor walks newest first and takes the last credit, so the first hitter is taken from the oldest entry here (simplified). It does not model damage expiry.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type Rng = (n: number) => number; // integer in [0, n)

export interface Drop { item: string; amount: number; }
export interface Dice { count: number; sides: number; bonus: number; }
export interface TableRow { item: string; weight: number; }

export interface PackEntry {
  chance: number;            // 0..10000 (percent x 100); the roll is 0..9999, so 10000 always hits
  spawnTime: boolean;        // true = this entry belongs to the spawn-time pass only
  table: TableRow[];         // one weighted pick per hit
  dice?: Dice;               // stackable amount, if any
}

// Luck to percent-of-hundredths: luck^(1/1.8) x 100, uncapped luck clamped at 1200 (SE uncap omitted).
export function luckToChance(luck: number): number {
  if (luck < 0) return 0;
  return Math.floor(Math.pow(Math.min(luck, 1200), 1 / 1.8) * 100);
}

function rollDice(d: Dice, rng: Rng): number {
  let v = d.bonus;
  for (let i = 0; i < d.count; i++) v += 1 + rng(d.sides); // 1..sides per die
  return v;
}

function pick(table: TableRow[], rng: Rng): TableRow | null {
  const total = table.reduce((s, r) => s + r.weight, 0);
  if (total <= 0) return null;
  let r = rng(total);
  for (const row of table) {
    if (r < row.weight) return row;
    r -= row.weight;
  }
  return null;
}

// One pack roll. The chance roll runs for every entry, including spawn-time entries at death (as in the donor).
// A single luck re-roll is spent on the first missed entry, then the flag is cleared.
export function rollPack(entries: PackEntry[], luckChance: number, spawning: boolean, rng: Rng): Drop[] {
  const out: Drop[] = [];
  let rerollLeft = true;
  for (const e of entries) {
    let hit = e.chance > rng(10000);
    if (!hit && rerollLeft) {
      rerollLeft = false;
      if (luckChance > rng(10000)) hit = e.chance > rng(10000);
    }
    if (!hit || e.spawnTime !== spawning) continue;
    const row = pick(e.table, rng);
    if (row === null) continue;
    const amount = e.dice ? rollDice(e.dice, rng) : 1;
    if (amount <= 0) continue;
    out.push({ item: row.item, amount });
  }
  return out;
}

// Bonus properties: weights[k] = weight of k bonus properties, checked highest first (donor order).
export function bonusPick(weights: number[], rng: Rng): number {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = rng(total);
  for (let k = weights.length - 1; k >= 0; k--) {
    if (r < weights[k]) return k;
    r -= weights[k];
  }
  return 0;
}

// Props on an item = 1 + bonus, where bonus may get one luck bump, capped at maxProps.
export function propsFor(maxProps: number, bonusWeights: number[], luckChance: number, rng: Rng): number {
  let bonus = bonusPick(bonusWeights, rng);
  if (bonus < maxProps && luckChance > rng(10000)) bonus++;
  return Math.min(1 + bonus, maxProps);
}

// Looting rights from damage. hits is ordered OLDEST first (donor walks newest first; simplified).
export interface Hit { attacker: string; isPlayer: boolean; damage: number; }

export function lootRights(hits: Hit[], hitsMax: number): Map<string, boolean> {
  const dmg = new Map<string, number>();
  for (const h of hits) {
    if (h.isPlayer) dmg.set(h.attacker, (dmg.get(h.attacker) ?? 0) + h.damage);
  }
  const firstHitter = hits.find((h) => h.isPlayer)?.attacker;
  if (firstHitter !== undefined) {
    dmg.set(firstHitter, Math.floor((dmg.get(firstHitter) ?? 0) * 1.25));
  }
  const ranked = [...dmg.entries()].sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0) return new Map();
  const top = ranked[0][1];
  const divisor = hitsMax >= 3000 ? 16 : hitsMax >= 1000 ? 8 : hitsMax >= 200 ? 4 : 2;
  const min = Math.floor(top / divisor);
  return new Map(ranked.map(([who, d]): [string, boolean] => [who, d >= min]));
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/ModernUO-loot-drops.ts`, exit 0 (no output).

## 5. Lands in

- TARGET `src/fight/loot.ts` (new module; the kill-to-drop step, called once from the engine's server-side death handler). Parity-checklist row 18 (loot roll and XP award). The per-entry roll and the rights rule are the parts that transfer; the luck stat does not.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only, shape only).
- Brief rule served: one ledger and server-verified kills (the roll and the rights are computed on the server from the damage record, never from the client); MAX_ATTACKERS = 3 bounds the rights list.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism; no donor line is copied.
- No luck stat in Frankendom. The luck curve (84-89) is a UO player stat. Either drop it, or keep the re-roll slot as a zone data field `magic_find_chance` with default 0. Do not port the honour bonus.
- Order matters. The donor rolls the chance for spawn-time entries at death and lets them use up the single luck re-roll, then discards them in Construct. Frankendom must choose one order and test it. The sketch copies the donor order; a designer may prefer to skip spawn-time entries before the roll.
- Rights list is a damage-share over all damagers. Frankendom caps attackers at 3 (MAX_ATTACKERS = 3), so the list is short by design, but the damage record must come from the engine's ledger, not from client hit reports.
- The 1.25x first-hitter bonus is a 2007 UO rule cited in the donor comment. It is a design choice for Frankendom, not a fact about combat: make it a data field with default 1.0 unless Dom asks for it.
- Packs are C# constant tables. Frankendom's rule is zones as data, so the pack tables become zone data (per zone, per enemy), and only the roll shape stays in the engine.
- Not transferable as written: the Mondain, Stygian and Tokuno pool selection (`IsInTokuno`, `IsMondain`, `IsStygian`, `LootPack.cs` 605-623; the pools themselves in `Loot.cs` were not read), the pre-AOS level path (751-785), and anything in `BaseRunicTool.ApplyAttributesTo` (not read). The spawn-time pre-roll (`atSpawnTime`) is worth keeping as an idea, but it needs its own test because it changes what a creature carries before any player is near it.


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: CLEAN.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** All checked claims hold: Generate 118-158 (roll 131, single luck re-roll 133-141 gated by Core.AOS, Construct 148), Construct 625-654 (spawn gate 627, weighted pick 639-651), Mutate fire horn 696, props 710-721, stackable 813-822, GetBonusProperties weights and walk 827-906, dice 1101-1111, luck curve 84-89 (100->~12.9 pct, 1200->~51 pct), GetLootingRights 3344-3454 (firstDamager x1.25 at 3428, divisors 16/8/4/2, sort, HasRight 3450), DamageStore 122-135, GenerateLoot 5320-5357, spawn call 864, death call 3287, Corpse 303-310, Utility.Random(from,count) semantics. Sketch order matches donor.

**Missed:** Death-time GenerateLoot is guarded by !Summoned && !NoKillAwards && !_hasGeneratedLoot (3283), note names only the flag; AddLoot returns for Summoned (5373). GetLootingRights also credits pet/summon damage to the master and skips entries with damage <= 0 (3396); sketch lootRights has no master credit. The luck curve is a different path when UOR/SE flags differ (not important).
