# ax-grymyr-l2dn-server (progression, cell 10)

Donor: `/mnt/frankendom-donors/ax-grymyr-l2dn-server/L2Dn/L2Dn.GameServer.Model/Model/Actor/Attackable.cs` | Licence: MIT (`/mnt/frankendom-donors/ax-grymyr-l2dn-server/LICENSE.txt`: "MIT License", Copyright (c) 2024-2025 Grymyr, L2Dn Server Project) | C# | symbol `Attackable.calculateRewards` (with `calculateExpAndSp`, `PlayerStat.addExpAndSp`, `PlayableStat.addExp`, `Party.distributeXpAndSp`)

Checked: Read on the VPS: `Attackable.calculateRewards` 293-580 and 600-716 (solo and party branches; 581-599 not read), `calculateExpAndSp` 1428-1445, `calculateOverhitExp` 1447-1461, `PlayerStat.addExpAndSp` 73-168, `PlayableStat.addExp` 25-94, `Party.distributeXpAndSp` 780-822 and 835-858 (822-834 not read), `Party.calculateExpSpPartyCutoff` 861-896, `Party.getValidMembers` 913-945 (its "auto" branch only started), `Party.getBaseExpSpBonus` 986-998 (the BONUS_EXP_SP table not read). Call site `Creature.cs` 1624-1628 read. Hinted file `Scripts.cs` opened: it is the script registration list (1014 lines of `using` and registration), not the reward code. Licence MIT: adaptation is allowed, but this sketch is still written from the mechanism. Confidence: high on the order of operations; medium on the party double-factor point (section 6), which I read from the code and did not run.

## 1. Mechanism

- Trigger: on the monster's death path, `Creature.cs` 1624-1628 picks the main damage dealer (or the killer) and calls `calculateRewards` on the monster. The enclosing function name was not read. It runs once per death, not per tick.
- Eligibility: walk the aggro list. Skip entries with no player behind them, and skip any attacker whose damage is 1 or less (324). Skip an attacker out of `ALT_PARTY_RANGE` of the monster (327-330). Sum `totalDamage` over the rest (332) and track the top dealer (336-342).
- Party split: for each attacker in a party, the party's damage sums only in-range rewarded members (622-640). `partyLvl` becomes the top level among them (640-650, 657-666). `partyMul = partyDmg / totalDamage` when the party did not do all the damage (674).
- XP formula, shared by solo and party: if the reference level (attacker level for solo, `partyLvl` for party) is more than 14 above the monster level, the reward is 0 (1431-1432). Otherwise XP = `getExpReward() * damage / totalDamage`, clamped at 0 (1442). SP is the same with `getSpReward()` (1443).
- Solo path (522-575): servitor penalty (509-516) multiplies XP (537). If the attacker holds the over-hit strike, `calculateOverhitExp` adds a bonus (545, 1447-1461): the over-hit damage as a percent of max HP, capped at 25 (1450-1455), applied to XP as a fraction. Then the EXPSP_RATE stat and a per-class multiplier apply (551-555), then premium multipliers (558-562), then `attacker.addExpAndSp(exp, sp, useVitalityRate())` (564).
- Party path (677-708): `exp *= partyMul` (687) and the over-hit bonus (692-698). If `partyDmg > 0`, the pool goes to `attackerParty.distributeXpAndSp` (703).
- Party distribution (`Party.cs` 780-858): members are filtered to "valid" ones (`getValidMembers`, 913). With the default method "level", a member is valid when `topLvl - member.getLevel() <= PARTY_XP_CUTOFF_LEVEL` (922). The pool is split by level squared among valid members: `sqLevel / sqLevelSum * penalty` (813-814). Each share goes through `calculateExpSpPartyCutoff` (819), which either adds the XP unchanged (method "level") or scales it by a gap table (method "highfive", 875-889).
- Level from XP (`PlayableStat.addExp`): the exp add is capped at one below the max-level threshold (37, 43-46). The loop finds the first level `tmp` whose threshold exceeds the exp and sets the level to `tmp - 1` (58-66). The level change is applied as a delta (68-71).
- Player wrapper (`PlayerStat.addExpAndSp`, 73-168): the access level must allow XP (78-80). Bonus multipliers apply (110-116; fishing rods have a special 1.5 case at 96-106). If a pet is out and in range, it takes `OwnerExpTaken / 100` of the owner's share (120-135). Then `addExp` (145) runs and a system message is chosen (147-167).

## 2. Key functions

- `Attackable.calculateRewards`: `/mnt/frankendom-donors/ax-grymyr-l2dn-server/L2Dn/L2Dn.GameServer.Model/Model/Actor/Attackable.cs` 293-716. The whole award pipeline: eligibility, totals, party pool, solo and party XP, over-hit, drops (not covered).
- `Attackable.calculateExpAndSp`: same file, 1428-1445. The level-gap cutoff (1431) and the damage share (1442-1443).
- `Attackable.calculateOverhitExp`: same file, 1447-1461. The over-hit bonus as a capped percent.
- `Party.distributeXpAndSp`: `/mnt/frankendom-donors/ax-grymyr-l2dn-server/L2Dn/L2Dn.GameServer.Model/Model/Party.cs` 780-858. Level-squared split (813-814) and per-member cutoff (819).
- `Party.getValidMembers`: same file, 913-945. The "level" and "percentage" methods (and "auto", read only as the start).
- `PlayerStat.addExpAndSp`: `/mnt/frankendom-donors/ax-grymyr-l2dn-server/L2Dn/L2Dn.GameServer.Model/Model/Actor/Stats/PlayerStat.cs` 73-168. Bonus, pet split, and the final addExp call.
- `PlayableStat.addExp`: `/mnt/frankendom-donors/ax-grymyr-l2dn-server/L2Dn/L2Dn.GameServer.Model/Model/Actor/Stats/PlayableStat.cs` 25-94. Exp cap and the level loop.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Damage share of a fixed reward, zero below a damage floor of 1 and outside range | Floor `damage > 1` (theirs, Attackable.cs 324); range `ALT_PARTY_RANGE` (theirs, Attackable.cs 327, value not read) |
| Zero reward when the attacker is more than N levels above the monster | N = 14 (theirs, Attackable.cs 1431) |
| Over-hit bonus as a percent of XP, percent = over-hit damage / max HP x 100, capped | Cap 25 (theirs, Attackable.cs 1453-1455); bonus = percent x XP (1460) |
| Party pool = reward x party damage / total, split by level squared among members inside a level window | Window `PARTY_XP_CUTOFF_LEVEL` default 20 (theirs, Config.Character.cs 457); method default "level" (theirs, Config.Character.cs 455) |
| Level from total XP by walking thresholds; exp capped one below the max threshold | Thresholds come from the XP table (`ExperienceData.getExpForLevel`, not read) |
| Servitor or pet takes a fixed share of the owner's reward | Pet ratio `OwnerExpTaken / 100` (value from pet level data, not read); servitor penalty multiplier (theirs, Attackable.cs 513) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for a solo kill (floor and range, level-gap zero, damage share, servitor penalty, then over-hit), and for a party (pool from party damage, then level-squared split among members inside the window, then the level walk). It omits: the aggro map and summoner damage roll-up, the top-dealer tracking, drops and item rolls, clan hunting points, raid points, champion and premium multipliers, EXPSP_RATE and class multipliers, vitality, the pet ratio, the "highfive" gap table, the party size bonus table, the fishing bonus, the donor's system messages, and the "not dead" check. It applies the party share once; the donor appears to apply it twice (see section 6), and this sketch does not copy that.

```ts
// Licence: MIT (donor, L2Dn/LICENSE.txt). Clean sketch written from the mechanism, not a translation of the donor lines.
export interface Attacker {
  id: string;
  level: number;
  damage: number;          // damage this attacker dealt to the monster
  inRange: boolean;        // inside the party range at the kill
  overhit: boolean;        // this attacker landed the over-hit strike
  servitorPenalty: number; // >= 1; reduces the owner's share when a servitor is out
}

export interface Monster { level: number; xpReward: number; maxHp: number; overhitDamage: number; }

const LEVEL_GAP_CUTOFF = 14;     // a monster more than 14 levels below the attacker gives nothing
const OVERHIT_CAP_PERCENT = 25;  // over-hit bonus is capped at 25% of the XP
const PARTY_CUTOFF_LEVEL = 20;   // party members more than 20 levels below the top level get no share

// Solo: damage share of the reward, zero beyond the level gap, then servitor penalty, then over-hit bonus.
export function soloXp(m: Monster, a: Attacker, totalDamage: number): number {
  if (a.damage <= 1 || !a.inRange) return 0;
  if (a.level - m.level > LEVEL_GAP_CUTOFF) return 0;
  let xp = Math.max(0, (m.xpReward * a.damage) / totalDamage);
  xp *= a.servitorPenalty;
  if (a.overhit) {
    const pct = Math.min(OVERHIT_CAP_PERCENT, (m.overhitDamage * 100) / m.maxHp);
    xp += (pct / 100) * xp;
  }
  return xp;
}

// Party: the party's damage share of the reward is the pool; the top member level sets the gap check.
export function partyPool(m: Monster, members: Attacker[], totalDamage: number): { pool: number; topLevel: number } {
  const counted = members.filter((x) => x.inRange && x.damage > 1);
  const partyDmg = counted.reduce((s, x) => s + x.damage, 0);
  const topLevel = counted.reduce((t, x) => Math.max(t, x.level), 0);
  if (partyDmg <= 0 || topLevel - m.level > LEVEL_GAP_CUTOFF) return { pool: 0, topLevel };
  return { pool: Math.max(0, (m.xpReward * partyDmg) / totalDamage), topLevel };
}

// Split the pool by level squared among members inside the cutoff (weights sum over those members only).
export function splitPool(pool: number, members: Attacker[], topLevel: number): Map<string, number> {
  const valid = members.filter((x) => topLevel - x.level <= PARTY_CUTOFF_LEVEL);
  const sqSum = valid.reduce((s, x) => s + x.level * x.level, 0);
  const out = new Map<string, number>();
  if (sqSum <= 0) return out;
  for (const x of valid) {
    out.set(x.id, pool * ((x.level * x.level) / sqSum) * x.servitorPenalty);
  }
  return out;
}

// Level from total XP. Exp is capped one below the max-level threshold, as the donor does.
export function levelFor(exp: number, expForLevel: (lvl: number) => number, maxLevel: number, minLevel = 1): number {
  const capped = Math.min(exp, expForLevel(maxLevel) - 1);
  let level = minLevel;
  for (let tmp = minLevel; tmp <= maxLevel; tmp++) {
    if (capped >= expForLevel(tmp)) continue;
    level = tmp - 1;
    break;
  }
  return level;
}
```

## 5. Lands in

- TARGET `src/fight/reward.ts` (new, engine reward step, runs at the monster's death event on the server). Parity-checklist row 18 (loot roll and XP award). The loot half of row 18 is not in this note.
- today: not checked. No Frankendom source was opened in this pass, so whether an XP-per-kill path exists is unverified.
- Reuse tag: rewrite-from-idea (MIT: adaptation allowed; this sketch is clean)
- Brief rule served: one ledger (XP award computed in the engine from the server's damage record, with no client award); parity row 18

Best transferable idea: give each kill's XP as a damage share of one server-side reward, zeroed beyond a level gap and capped for an over-hit bonus, so the award is computed from the same damage ledger the server already keeps.

## 6. Gaps and risks

- Party double factor (read from code, not run): `calculateExpAndSp(partyLvl, partyDmg, totalDamage)` already scales by `partyDmg / totalDamage` (Attackable.cs 1442), and then `exp *= partyMul` scales by the same ratio again (674, 687). As written, when the party did not do all the damage (partyDmg < totalDamage), the pool is scaled by the square of its damage share. Test whether this is intended before porting; the sketch applies it once.
- Constants to make data: the level gap 14, the over-hit cap 25, the party window 20, and the party method are server values in the donor. Frankendom's zones-as-data rule means these belong in zone or content data with defaults, not in the function.
- The brief and addendum rulings do not mention parties. Whether Frankendom groups players is not checked, so the party branch transfers only if it does. The solo branch and the level walk do not depend on it.
- The damage record is the donor's aggro list, which is per attacker. Frankendom's one ledger must hold the same per-attacker damage and the top-dealer rule, server-side, or the reward cannot be server-verified.
- MAX_ATTACKERS = 3 caps enemies attacking one hero, not the number of players who damaged one monster, so it does not bound the contributor list here. The contributor bound is not defined in the brief (not checked).
- Not read: the XP table (`ExperienceData.getExpForLevel`), `getExpReward` and `getSpReward` values, the BONUS_EXP_SP table, `useVitalityRate` and the vitality bonus, `Stat.EXPSP_RATE`, the pet ratio data, the "highfive" percent list, and the drops code. Each is a gap, not a claim.
- Over-hit: `_overhit` and `_overhitAttacker` are set elsewhere (not read); the note relies only on the award side.
