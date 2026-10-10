# l1j-en-classic (progression, cell 10)

Donor: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/utils/CalcExp.java` (with `.../server/model/L1HateList.java`, `.../server/model/Instance/L1MonsterInstance.java`, `.../server/model/Instance/L1NpcInstance.java`, `.../server/datatables/ExpTable.java`, `.../server/model/Instance/L1PcInstance.java`, `.../server/Config.java`) | Licence: GPL-2.0-or-later (`/mnt/frankendom-donors/l1j-en-classic/COPYING` is GPL version 2, June 1991; the per-file header says "either version 2, or (at your option) any later version", read in `ExpTable.java` lines 4-5) | Java | symbol `CalcExp.calcExp`

Checked: `CalcExp.calcExp` is defined at 175 and closes at 481 (read in full except the commented-out helpers at 58-160, which are not live code; the other-member hate loop at 415-450 was read last). Helpers `getRoyalBonus` 483-492, `getPartyLevel` 494-502, `getPartyBonus` 504-511 and `AddExp` 513-561 read in full. `L1HateList` read in full (173 lines). `L1NpcInstance.setHate` 355-368 read. `L1MonsterInstance.receiveDamage` 282-293, death path 425-443 and `distributeExpDropKarma` 510-527 read. `ExpTable` read in full. `L1PcInstance.addExp` 1005-1010 and `onChangeExp` 2189-2195 read. Config rate defaults 806-816 and 1107 read. Callers by grep: `calcExp` is called from `L1MonsterInstance` 527 and 554, `L1GuardianInstance` 303, `L1ScarecrowInstance` 29; `distributeExpDropKarma` is called once live, at 443. Not read: `L1Party` (membership semantics), what `knownsObject` returns for the player itself (this decides whether the killer counts itself in the party bonus), `AddExpPet` beyond line 580, the `levelUp(gap)` body, the death XP loss at `L1PcInstance` 1229-1247 (grep only), and the callers of `onChangeExp`. Camera scope: not a camera cell. Confidence: high on the split arithmetic and its order (read end to end); medium on party-membership edge cases (`knownsObject` not read).

Best transferable idea: Split one kill's XP by damage share among the attackers still alive when the target dies, with a party-of-the-killer pass that pools party hate, scales the pooled XP by a small per-member bonus, and weights each known member's cut by level squared.
Decision (proposed): adapt - Frankendom's many-on-one fights (MAX_ATTACKERS = 3) need one server-side split of each kill's XP over a bounded hate list; we take the hate-as-damage share, the dead-attacker pruning before the total, and the level-squared party weight, and reject the pet and summon steal, the lawful and karma side effects, and the party XP leak.
Acceptance: In a three-attacker kill (A 60 damage, B 30, C 10 but C is dead before the kill), a server test asserts that A is awarded 2/3 and B 1/3 of the kill XP, C is awarded nothing, and the awards sum to the kill XP with at most one point lost per recipient.

## 1. Mechanism

- Two phases. Phase A runs on every hit and builds a hate table per monster. Phase B runs once on the death and splits the kill XP over that table.
- Phase A, hit (`L1MonsterInstance.receiveDamage`, 282-293). If the monster is alive and `damage >= 0`, `setHate(attacker, damage)` is called (292). If the attacker is an effect instance, its user is credited instead (289-290). `setHate` (`L1NpcInstance` 355-368) ignores the monster's own id, and on the first hit that has non-zero hate it adds `getMaxHp() / 10` once (357-361; the first-attack flag is set at 360). It then adds the hate to the table (363), also to a drop table (364), and retargets to the highest-hate character (365-366).
- Phase B, death (`L1MonsterInstance` 425-443). The monster is set dead, then `distributeExpDropKarma(_lastAttacker)` runs (443). That function takes the last attacker's player `pc` (510-521; a pet or summon resolves to its master) and reads the table as two lists (524-525), with `exp = getExp()` from the monster template (526), then calls `CalcExp.calcExp(pc, getId(), targetList, hateList, exp)` (527).
- `calcExp` (`CalcExp.java` 175):
  1. If the two lists differ in length, return (199-201).
  2. Walk the lists from the end. Drop any acquisitor that is null or dead (211-218), and add the live hate into `totalHateExp`; PCs also add to `totalHateLawful` (212-214). If `totalHateExp` is 0, return (222-224).
  3. Solo killer (457-480): each acquisitor gets `exp * hate / totalHateExp` (462, integer arithmetic). A player goes through `AddExp` (466). A pet or summon sends part of its share to its master (470-476).
  4. Party killer (237-456): for every hitter that is the killer or a player in the killer's party, add its hate to `partyHate` (252-257). A hitter outside the party is paid its own share at once (260, 265). `party_exp = exp * partyHate / totalHateExp` (298). Then `party_exp = (int)(party_exp * (1 + PartyExp * (partyBonus + royalBonus)))` (307), where `partyBonus = 0.04 * known party members` (510) and `royalBonus = 0.059` if a crowned member is known or is the killer (489, 54).
  5. Weighting: `partyLevel` is the sum of level squared over party members the killer knows or is (494-502). The killer's weight is `level^2 / partyLevel` (311) and its cut is `member_exp = (int)(party_exp * weight)` (313). Each other known member, found by `knownsObject` (381), gets the same treatment with its own weight (383-387). If a member has no hate in this kill it gets its whole cut (373-376 for the killer, 451-454 for the others). If it has hate, its cut is split by its own hate (341-372 for the killer, 415-450 for other members; without pets this is the whole cut). Party members who are not known get nothing, although their hate was already in `partyHate` (255 pools it, 381 pays only known members).
  6. `AddExp` (517-561), for every payout: a dead player gets nothing (519-521). The amount is `(int)(exp * penalty * xpRate * food * diPenalty)` (558), where `penalty` is 1 below level 50 and `1 / Config.LVnn_EXP` from level 50 (`ExpTable` 83-89); `xpRate` is `RATE_XP52` below level 52, else `RATE_XP` (556); `food` is the highest cooking tier present, 1.01 / 1.02 / 1.03 (539-547); `diPenalty` is 0.5 on map 303 (551-552). `pc.addExp` (560) adds to a single running total and clamps at `MAX_EXP` (`L1PcInstance` 1005-1009).
- Level derivation (`L1PcInstance.onChangeExp`, 2189-2195): the level is found by scanning the cumulative table (`ExpTable.getLevelByExp`, 61-69). A positive gap calls `levelUp(gap)` (body not read). Levels are therefore never set directly by the kill.

## 2. Key functions

- `CalcExp.calcExp`: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/utils/CalcExp.java` 175-481. The split, solo and party.
- `CalcExp.AddExp` (4-argument form): `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/utils/CalcExp.java` 517-561. Per-payout multipliers.
- `L1HateList`: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/L1HateList.java` 45-51 (add), 76-86 (max hate), 166-172 (two list snapshots). Hate table as a map from character to hate.
- `L1NpcInstance.setHate`: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/Instance/L1NpcInstance.java` 355-368. Hate from hits, first-hit bonus.
- `L1MonsterInstance.receiveDamage` and `distributeExpDropKarma`: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/Instance/L1MonsterInstance.java` 282-293 and 510-527; death call at 443.
- `ExpTable`: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/datatables/ExpTable.java` 39-69 and 83-89. Cumulative table, next-level need, level by exp, penalty rate.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Hate is the damage dealt; one-time head start for the first hit | Head start = `maxHp / 10` (theirs, `L1NpcInstance.java` 359) |
| Kill XP split by hate share over attackers still alive, integer division | None (the division; dead hitters removed first, `CalcExp.java` 211-218) |
| Party hate pooled, then scaled by a per-member bonus | `0.04` per known member (theirs, `CalcExp.java` 55, 510); `0.059` for a crowned member (theirs, 54, 489); PartyExp rate default `1.0` (theirs, `Config.java` 812-813) |
| Member weight is level squared over the party's level-squared sum | None (the weight; theirs at 311 and 499) |
| Steal from a pet or summon to its master: `1 - rate` | Pet and summon steal rate defaults `1.0` (theirs, `Config.java` 808-810) |
| Per-payout multipliers: penalty, rate, food, map | Penalty `1.0` below level 50 (theirs, `ExpTable.java` 84-85); table `1 / LVnn_EXP` (theirs, 88; LV50 default `1`, `Config.java` 1107; the rest not read); `RATE_XP` and `RATE_XP52` default `1.0` (theirs, `Config.java` 814-816), switch at level 52 (theirs, `CalcExp.java` 556); food `1.01` / `1.02` / `1.03` (theirs, 539-547); map 303 `0.5` (theirs, 552) |
| Cumulative XP table, level by scan | 99-entry table starting `0, 125, 300` (theirs, `ExpTable.java` 95-111); `MAX_LEVEL = 99` (30); `MAX_EXP = 0x6ecf16da` (31); `CalcExp.java` 49 defines a second `MAX_EXP = ExpTable.getExpByLevel(100) - 1`, which indexes one past the 99-entry array |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: non-party hitters are paid by hate share first; party hate is pooled; the pooled XP is scaled by the party bonus; the result is weighted by level squared over known members. It omits pets and summons (their hate, steal rates and pet XP), the lawful and karma updates, the home-town contribution side effect, the `AddExp` multipliers (penalty, rate, food, map), the royal bonus lookup (passed in as a number), the dead-attacker pruning (the caller must pass live hitters only), and the case where a member hit (the donor splits that cut by the member's own hate; without pets this equals the whole cut). It reproduces the donor's party XP leak on purpose, so the shape is visible: unknown party members' hate is pooled, but their share is not paid. Section 6 says Frankendom must not copy that.

```ts
// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation.
// clean-room
export interface Hitter { id: string; hate: number; }      // hate = damage dealt; dead hitters removed by the caller
export interface Member { id: string; level: number; }     // killer's known party members (killer included)
export interface Award { id: string; exp: number; }

const MEMBER_BONUS = 0.04;   // donor: MemberPartyBonus, per known party member
export const PARTY_RATE = 1.0; // donor: Config PartyExp, default 1.0

// Splits one kill's XP. `members` is null when the killer is solo.
// `partyIds` are all party members (known or not): their hate is pooled, but only known members are paid.
export function splitKill(
  hitters: Hitter[],
  exp: number,
  partyIds: Set<string> | null,
  members: Member[] | null,
  knownOtherMembers: number,
  royalBonus: number,
): Award[] {
  const total = hitters.reduce((s, h) => s + h.hate, 0);
  if (total <= 0) return [];
  const out: Award[] = [];
  if (partyIds === null || members === null) {
    for (const h of hitters) out.push({ id: h.id, exp: Math.floor(exp * h.hate / total) });
    return out;
  }
  let partyHate = 0;
  for (const h of hitters) {
    if (partyIds.has(h.id)) partyHate += h.hate;
    else out.push({ id: h.id, exp: Math.floor(exp * h.hate / total) });
  }
  let partyExp = Math.floor(exp * partyHate / total);
  partyExp = Math.floor(partyExp * (1 + PARTY_RATE * (MEMBER_BONUS * knownOtherMembers + royalBonus)));
  const levelSq = members.reduce((s, m) => s + m.level * m.level, 0);
  if (levelSq <= 0) return out;
  for (const m of members) {
    const dist = (m.level * m.level) / levelSq;
    out.push({ id: m.id, exp: Math.floor(partyExp * dist) });
  }
  return out;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/xp-share.ts` (new module): splits one verified kill's XP over the engine's hate list (at most MAX_ATTACKERS = 3 entries counted), with the snapshot taken once. Parity-checklist row 18 (loot roll and XP award).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only; the sketch is written from the mechanism and was not translated line by line)
- Brief rule served: one engine (the split is engine logic, not client code); server-verified kills (the award list is computed where the kill is verified); MAX_ATTACKERS = 3 (the hate list used for the split is bounded).

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. Constants and the shape are cited; no code is carried over.
- Party XP leak: the donor pools a party member's hate into `partyHate` (255) but pays only members the killer knows (381), so XP for unknown party members is dropped. Frankendom needs a ruling: pay every party member in the fight or none, and test it. Do not copy the leak.
- Anchor rule: the party context is taken from the last attacker (510-521, 527), not from the attacker with the most damage, except when the last attacker is an effect instance: then `L1MonsterInstance` 532-554 scans the hate list for the highest-hate attacker and uses that one as the anchor. Frankendom must choose one rule and test it.
- Race in the donor: `toTargetArrayList` and `toHateArrayList` are two separate synchronized calls (524-525). A hit between them can give lists of different length, and `calcExp` then returns without paying (199-201). Frankendom must build both from one snapshot.
- Death ordering: the monster is set dead (425) before the split (443), and the split drops dead acquisitors (211). Frankendom's server should define whether the killing blow's own attacker is always included, and should not rely on a dead flag to choose who is paid.
- Hate is raw damage, with a one-time head start of max HP / 10 for the first hit (359). That favours the first attacker. Frankendom should make the head start a named data field if it keeps it, and test it against the fight's many-on-one balance.
- Hate list is unbounded in the donor. Frankendom's MAX_ATTACKERS = 3 means only the three highest-hate entries should feed the split; this is a rule to add, not something the donor shows.
- Integer truncation happens at four points (260, 298, 307, 313). Frankendom should round once at the end and assert that the awards sum to at most the kill XP.
- The map-303 halving (551-552) is a zone rule written as a map id check in code. Frankendom should carry it as zone data.
- Not read: `L1Party` membership, the value `knownsObject` gives for the killer itself (this affects whether the killer counts itself in the party bonus), the `levelUp` body, and `AddExpPet` beyond 580.


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** ExpTable cumulative table has 99 entries (parsed lines 95-111 of ExpTable.java), not 100 as stated in section 3; note then says MAX_LEVEL=99 which fits 99, but CalcExp.java 49 defines its own MAX_EXP = ExpTable.getExpByLevel(100) - 1 (index 99, out of range for a 99-entry array) - a second MAX_EXP that the note never mentions. Config RATE_XP52 spans 816-817 (cite 814-816 is fine). Wording 'calcExp closes at 481' etc all verified; royal 54 / member 55 ok. Pet/summon steal defaults 808-810 ok. Gaps section says party anchor is always the last attacker (510-521, 527) - not true for effect-instance kills: L1MonsterInstance 532-554 picks the max-hate attacker as anchor.

**Missed:** calcExp early return at 203-206 (npc null / L1PetInstance / L1SummonInstance victim) and the NPE-prone cast at 185 before the null test; hometown contribution grant 226-230 (npc level/10) only listed as omitted; onChangeExp also calls levelDown(gap) for gap<0 (2196-2197); L1HateList is a HashMap so list order is arbitrary (matters for 'walk from the end').
