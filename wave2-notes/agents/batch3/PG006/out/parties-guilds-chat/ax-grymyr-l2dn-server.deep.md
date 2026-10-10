# ax-grymyr-l2dn-server (parties-guilds-chat, cell 2)

Donor: `/mnt/frankendom-donors/ax-grymyr-l2dn-server/L2Dn/L2Dn.GameServer.Model/Model/Party.cs` (with `Model/Actor/Attackable.cs`, `L2Dn.GameServer.StaticData/Configuration/Config.Character.cs`, `L2Dn.GameServer/Config/Character.ini`, `Rates.ini`) | Licence: MIT (LICENSE.txt: "MIT License", Copyright (c) 2024-2025 Grymyr, L2Dn Server Project) | C# | symbol `Party.distributeXpAndSp`

Checked: Read in full: `Party.cs` 780-1011 (XP distribution, cutoff, valid members, bonus). `Attackable.cs` 520-590 (solo reward branch), 590-720 (party reward branch and the call at 703), 1428-1461 (pool, level gate, over-hit). Config: `Config.Character.cs` 455-461, `Character.ini` 853-880, `Rates.ini` 17, `Config.Rates.cs` 89. Callers: `distributeXpAndSp` has one call site (`Attackable.cs` 703); I read that caller only. Not read: the monster's `getExpReward` value, `ALT_PARTY_RANGE` value, the servitor penalty beyond 507-513, command-channel level logic (named at 617-620, 642-647), and the `Killed` path. Candidates also opened: `Party.cs` 36 (read) and the outline of the loot functions at 105-196 (names only, not read; loot is not the subject of this note), `ClanPrivilege.cs` (listed by grep, not read). Confidence: high on order and numbers (all receipted). Medium on the "applied twice" claim in section 6: read, not run. Camera: not applicable.

## 1. Mechanism

A kill by a party is split in two stages: first a pool is made from the monster's XP, then the pool is split among the members who fought.

- **Stage A, build the group (`Attackable.cs` 607-653).** For each member of the attacker's party (or command channel), skip the dead (624). If the member has damage on the monster and is within `ALT_PARTY_RANGE` (635), add that damage to `partyDmg`, add the member to `rewardedMembers`, and keep the highest level seen as `partyLvl` (640).
- **Stage B, the pool (`Attackable.cs` 672-687).** `partyMul = partyDmg / totalDamage` only when the party did not kill alone (672-674). The pool comes from `calculateExpAndSp(partyLvl, partyDmg, totalDamage)` (678). That function first gates the whole pool: if `partyLvl - monster level > 14`, the pool is 0 (1431-1437); otherwise the pool is the monster's XP reward times `partyDmg / totalDamage` (1442). Then the champion multiplier (681-685), then `exp *= partyMul` (687). Section 6 explains why the share appears twice.
- **Over-hit (692-698).** If the over-hit attacker is in this party, `exp += exp x min(25%, over-hit damage x 100 / max HP) / 100` (1447-1461).
- **Stage C, split (`Party.cs` 780-859).** `validMembers` comes from `getValidMembers`. Under the `highfive` method every rewarded member is valid (972-974). The pool is scaled by the party bonus for the valid count: `xpReward = exp x getExpBonus(count)` (783). Count 1 gives x1; count 2 or more gives `BONUS_EXP_SP[count - 1] x RatePartyXp` (1000-1003, 986-997; table at 36). The level-squared sum runs over the valid members (788). Each member's share is `xpReward x level^2 / sum(level^2)` (813-814), then scaled by the EXPSP rate stat (817).
- **Stage D, cut (`Party.cs` 861-896).** Class multiplier and premium rate first (863-871). Under `highfive`, `levelDiff = topLvl - member level` (878). The first gap rule that contains `levelDiff` sets the XP to `addExp x percent / 100` and credits the member (879-885). If no rule matches, nothing is credited (see section 6). Under the other methods the full amount is credited (893).
- **Side effects (`Party.cs` 819-851).** Only when the cut XP is above 0: clan hunting points, vitality, PC cafe points, magic lamp, hunt pass and the achievement box. These are separate ledgers in one function.

Tick and loop: this is a kill event, not a per-frame loop. It runs once when the monster dies (the call at `Attackable.cs` 703).

## 2. Key functions

- `Party.distributeXpAndSp`: `/mnt/frankendom-donors/ax-grymyr-l2dn-server/L2Dn/L2Dn.GameServer.Model/Model/Party.cs` 780-859. Pool bonus, level-squared split, per-member cut, side effects.
- `Party.calculateExpSpPartyCutoff`: same file, 861-896. Class and premium multipliers, then the highfive gap rule.
- `Party.getValidMembers`: same file, 913-984. Five methods: level, percentage, auto, highfive, none.
- `Party.getBaseExpSpBonus` and `getExpBonus`: same file, 986-1010.
- `Attackable` party branch: `/mnt/frankendom-donors/ax-grymyr-l2dn-server/L2Dn/L2Dn.GameServer.Model/Model/Actor/Attackable.cs` 607-709.
- `Attackable.calculateExpAndSp` (pool and level gate): same file, 1428-1445.
- `Attackable.calculateOverhitExp`: same file, 1447-1461.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Pool scaled by party size, then split by level squared | Bonus 1.0 (solo), 1.6 (2), 1.65 (3), 1.7, 1.8, 1.9, 2.0, 2.1, 2.2 (9 or more) (`Party.cs` 36, 988-997). Times `RatePartyXp` = 1 (`Rates.ini` 17; `Config.Rates.cs` 89), applied only for 2 or more members (1003). |
| Level-squared share | `level x level` over the sum over valid members (788, 813-814). |
| Whole-kill level gate | Pool is 0 when top level minus monster level is more than 14 (`Attackable.cs` 1431). |
| Highfive gap rule (per member, after the split) | Levels 0-9: 100%; 10-14: 30%; 15-99: 0% (`Character.ini` 872 and 880; code defaults at `Config.Character.cs` 459). |
| Level cutoff method (not shipped as default) | 15 in the shipped ini (`Character.ini` 864); code default 20 (`Config.Character.cs` 457). |
| Over-hit bonus cap | 25% of the pool (`Attackable.cs` 1455, 1453). |
| Party damage share | `partyDmg / totalDamage` (`Attackable.cs` 674, 678). |
| Shipped method | `highfive` (`Character.ini` 856); the code default when the key is missing is `level` (`Config.Character.cs` 455). |

## 4. TypeScript sketch

simplified: keeps the donor's order for the part Frankendom would reuse: party bonus on the pool (by count, with the rate applied for 2 or more), then the level-squared split over the in-range living members, then the highfive gap percent per member, with its three gap rules. The caller passes a pool already scaled once by the damage share. It omits the whole-kill level gate (1431), the damage-share factor (674-687), the champion and over-hit multipliers, the servitor penalty, class and premium multipliers, the EXPSP rate stat, the level and percentage cutoff methods, the command channel, the instance rate override, and the side effects (clan, vitality, PC cafe, magic lamp, hunt pass, achievement). One difference is deliberate: a gap rule that matches nothing gives 0 here, while the donor returns the full amount to its caller and credits nothing (see section 6).

```ts
// Licence: MIT (donor LICENSE). Written from the described shape, not a line-by-line port.
export interface PartyMember {
  id: string;
  level: number;
  inRange: boolean; // within reward range of the kill
  alive: boolean;
}

// Party XP bonus on the pool, indexed by members minus one, capped at the last entry.
const PARTY_BONUS = [1.0, 1.6, 1.65, 1.7, 1.8, 1.9, 2.0, 2.1, 2.2];

// Level-gap rules: first match wins. Levels are the top member's level minus this member's level.
export const GAP_RULES: ReadonlyArray<{ min: number; max: number; pct: number }> = [
  { min: 0, max: 9, pct: 1.0 },
  { min: 10, max: 14, pct: 0.3 },
  { min: 15, max: 99, pct: 0 },
];

// poolBase is the monster XP already scaled by this party's damage share (applied once, by the caller).
// rateParty is the party XP rate from zone or engine data.
export function splitPartyXp(poolBase: number, members: PartyMember[], rateParty: number): Map<string, number> {
  const eligible = members.filter(m => m.inRange && m.alive);
  const out = new Map<string, number>();
  const n = eligible.length;
  if (n === 0) return out;

  const bonus = n < 2 ? PARTY_BONUS[0] : PARTY_BONUS[Math.min(n - 1, PARTY_BONUS.length - 1)] * rateParty;
  const pool = poolBase * bonus;

  const topLevel = Math.max(...eligible.map(m => m.level));
  const sqSum = eligible.reduce((s, m) => s + m.level * m.level, 0);

  for (const m of eligible) {
    const share = (pool * (m.level * m.level)) / sqSum;
    const diff = topLevel - m.level;
    const rule = GAP_RULES.find(g => diff >= g.min && diff <= g.max);
    out.set(m.id, rule ? share * rule.pct : 0); // no rule matched: 0 here (donor differs, see gaps)
  }
  return out;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/reward.ts` (new): the kill-reward split for a party, run on the server after the kill is verified. The pool is one input; the split is a pure function.
- Parity row 18 (loot roll and XP award). The party XP split is the XP award part of that row.
- Reuse tag: rewrite-from-idea (MIT: code may be adapted; the sketch was written from the shape).
- Brief rule served: one ledger (one credit per member, one function that writes it) and zones as data (the bonus rate and the gap table are zone data; see data fields in the JSON sidecar).
- Best transferable idea: scale one pool by party size, split it by level squared over the members who fought, then cut each member by a level-gap percent set as data, so no share is handed to another member.
- Decision (proposed): adapt. Take the pool-then-split order and the gap table as zone data. Drop the bonus entries above 3 (Frankendom's MAX_ATTACKERS = 3 means only 1.6 and 1.65 are reachable in a fight), the side-effect ledgers, and the double damage share. Why: the split is the mechanism we want, but our ledger must be one, and our kill is server-verified.
- Acceptance: a three-player test with levels 30, 25 and 15, a pool of 100 and the bonus of 1.65 (pool 165, worked from the rules above, not run) credits 84.86 and 58.93 and 0 to the level-15 player; 21.21 is not re-spread. The server test asserts those values and the single credit.

## 6. Gaps and risks

- **Damage share applied twice (not run).** `calculateExpAndSp` multiplies by `partyDmg / totalDamage` (`Attackable.cs` 678, pool formula at 1442), and then `exp *= partyMul` multiplies by the same ratio again (674, 687). For a party that did a fraction f of the damage (f below 1), the pool looks like R x f x f, while the solo branch gives R x f (528). This looks like a double count. It was read, not run; do not copy either version until a test settles it. Frankendom should apply the share once and test it.
- **Unmatched level gap.** Under `highfive`, `xp` starts as the full amount (`Party.cs` 873). If no gap rule matches, the player is not credited (879-885 only credit inside a match), but `xp` is still returned (895). The same function then treats the full amount as earned for clan points, vitality and the other side effects (`Party.cs` 819-820). With the shipped gaps (0-99) this needs a level difference below 0 or above 99; it is latent, not seen in play. Frankendom should return an explicit 0 and test it.
- **Whole-kill level gate versus solo.** The party gate uses the top member's level (`Attackable.cs` 1431 with `partyLvl`), so one high-level member can zero the whole party's pool. The solo branch uses the attacker's own level (528). The solo branch comment (525-527) says a 28-versus-24 kill (difference 4) gives "some xp"; the code gives full XP there, and it has no partial band at all, only the cut at more than 14 levels. The comment is stale. Frankendom should write the gate as zone data with its own comment.
- **Auto method threshold.** `sqLevel >= sqLevelSum / (members.Count * members.Count)` (`Party.cs` 965) divides by n squared, which is not the average, and the `i` set at 951-954 is used only as a guard. Not the default; do not port until the intent is known.
- **Config defaults disagree with the shipped file.** The code default method is `level` (`Config.Character.cs` 455); the shipped method is `highfive` (`Character.ini` 856); the level cutoff is 20 in code (457) and 15 in the shipped file (864). Frankendom should keep one default, in the zone data.
- **Multiple ledgers in one function.** The same function writes clan hunting points, vitality, PC cafe points, magic lamp, hunt pass and the achievement box (`Party.cs` 832, 834, 844). That is the opposite of one ledger. Frankendom should write one XP event and let the other systems read it.
- **No server check.** Nothing in this path verifies the kill or the damage table before the split. Frankendom must run the split after the server has recorded the kill and the damage.
- **Dead-member guard is redundant.** `Attackable.cs` 624 already skips dead members before the pool, and `Party.cs` 793 skips them again. Not a loss path in this code.
- **Party roles and chat are not in this donor's split.** Command channels appear only as a level and member source (617-620, 642-647). The guild and chat side of the cell is not covered by this note; ClanPrivilege.cs was not read.
