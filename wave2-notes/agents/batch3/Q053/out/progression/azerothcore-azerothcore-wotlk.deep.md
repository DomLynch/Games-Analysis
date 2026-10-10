# azerothcore-azerothcore-wotlk (progression, cell 10)

Donor: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Entities/Player/KillRewarder.cpp` | Licence: GPL-2.0-or-later (LICENSE file is GNU GPL version 2; KillRewarder.cpp header: "either version 2 of the License, or (at your option) any later version") | C++ | symbol `KillRewarder::Reward`

Checked: Read in full: `KillRewarder::Reward` (KillRewarder.cpp 289-314), `_InitGroupData` (84-123), `_InitXP` (125-140), `_RewardXP` (149-190), `_RewardPlayer` (210-241), `_RewardGroup` (243-280); `Acore::XP::BaseGain` and `Gain` (Formulas.cpp 27-136); `GetGrayLevel`, `GetZeroDifference`, `xp_in_group_rate` (Formulas.h 46-151); `Player::GiveXP` (Player.cpp 2401-2473); `GetXPRestBonus` (Player.cpp 9109-9120); `Creature::LowerPlayerDamageReq` and `ResetPlayerDamageReq` (Creature.cpp 3931-3950); the attacker-level feed (Unit.cpp 1207-1232); rested-pool accrual (PlayerUpdates.cpp 245-261). Callers: `RewardPlayerAndGroupAtKill` (Player.cpp 13049-13052) is the only caller of `KillRewarder`; it is called from `Unit::Kill` (Unit.cpp 13694, inside the function starting 13584) and from Battleground.cpp 1898 (battleground path, not read). Callers of `LowerPlayerDamageReq`: Unit.cpp 1230 (read), Spell.cpp 2724 (not read). Not read: `GetContentLevelsForMapAndZone` (zone-to-tier lookup), `GetTotalAuraMultiplier`, the `ResetPlayerDamageReq` call sites (Creature.cpp 1539, 1792, 2014; CreatureAI.cpp 409), `IsAtGroupRewardDistance` distance cut-off (Player.cpp 13084-13100 read only in part), the rested "bubble" condition above PlayerUpdates.cpp 245, the offline rest accrual (PlayerStorage.cpp 5531, not read), KillRewarder.h. Confidence: high on the kill-share path (every branch read, numbers checked by hand); medium on rested accrual (partial read). Not a camera cell (camera_scope not applicable).

Best transferable idea: a kill's XP is split from one computed base among living participants, scaled by a party-size rate and their level share, with a halving rule when the top member is grey to the victim, and a halving guard when a higher-level attacker helped.
Decision (proposed): adapt — the level-weighted split of one base, the full/half rule and the halving for a higher-level damage dealer are checkable server rules that fit many-on-one kills, but Frankendom must split among its at-most-3 attackers (not the whole party) and write XP through one ledger.
Acceptance: a server test where three attackers (levels 10, 10, 12) kill one creature asserts that each living attacker gets the same base times the group rate times its level share (half when the top member is not grey to the victim), a dead attacker gets 0, and a kill with a higher-level damage dealer halves each share.

## 1. Mechanism

- Trigger. A creature dies to a player. `Unit::Kill` (Unit.cpp 13694) calls `RewardPlayerAndGroupAtKill`, which builds one `KillRewarder` and calls `Reward()` (Player.cpp 13051). It runs once per kill, synchronously. There is no per-tick loop.
- Step 1, group census (KillRewarder.cpp 84-123). For the killer's party, each member who is the killer or is within reward distance is counted. For living members only: `_count` goes up, `_aliveSumLevel` adds the level, `_maxLevel` tracks the highest level, and `_maxNotGrayMember` tracks the highest-level member for whom the victim is not grey (108-112). Every in-reach member, dead or alive, adds to `_sumLevel` (115), but `_sumLevel` is not used by the XP split. `_isFullXP` is true only when the top living level is the not-grey basis member (119). A solo killer sets `_count = 1` (122).
- Step 2, base XP (KillRewarder.cpp 125-140; Formulas.cpp 73-136). `_InitXP` skips PvP victims and killers in a vehicle (132). Otherwise `Acore::XP::Gain` gives the base (133). `Gain` returns 0 for totems, pets, critters and no-XP creatures (78-79). `BaseGain` (27-71) uses a content-tier base by zone (45, 235 or 580; tier lookup not read). If the victim is at or above the player's level, the gain is `((pl*5 + base) * (20 + min(diff, 4)) / 10 + 1) / 2` (49-55). If the victim is below the player's level but above the grey level, it is `(pl*5 + base) * (ZD + mob - pl) / ZD` (60-63). Otherwise it is 0. `Gain` then multiplies by 2 for elites (89-90), by the creature template's `ModExperience` (93), and by the world kill rate (122). `_InitXP` then multiplies by `ModHealth` when it is between 0 and 0.75, for non-battleground creature kills (138-139).
- Step 3, group rate (Formulas.h 119-151; KillRewarder.cpp 259-261). Raid groups get 1.0 (a FIXME says the size modifiers are not applied, 125). Otherwise the rate is 1.0 for 0-2 living members, 1.166 for 3, 1.3 for 4, and 1.4 for 5 or more.
- Step 4, per-recipient share (KillRewarder.cpp 149-190 and 226). In a group, each member's rate is `groupRate * level / aliveSumLevel` (226). The XP is zero for a dead member, or for a member whose level is above the not-grey basis level (157-158, 163). Otherwise it is `floor(base * rate)` when `_isFullXP` is true, or `floor(base * rate / 2) + 1` when it is not (159-161). A solo killer gets the base directly, with no rate (`uint32 xp(_xp)`, 151).
  Observed consequence (arithmetic from the formulas, not measured): the denominator `aliveSumLevel` includes living members who are then zeroed for being above the not-grey level, so a group pays out less than `groupRate * base` in total.
- Step 5, power-level guard (KillRewarder.cpp 169-176). The victim records the highest player level that has damaged it (Creature.cpp 3941-3942), fed from Unit.cpp 1217-1230 and cleared by `ResetPlayerDamageReq` (Creature.cpp 3949). If that level is above the reference level (the group's top living level, or the player's own level solo) and the victim is grey to it, the share becomes `xp / 2 + 1` (174-175). The donor comment says this closes a power-levelling exploit.
- Step 6, auras. The share is multiplied by the total XP-percent aura multiplier (181). Not read.
- Step 7, award (Player.cpp 2401-2473). `GiveXP` drops xp below 1; dead players unless in battleground or LFG (2406); creatures with no loot recipient (2412); and anyone at the level cap (2435). It also returns for players flagged no-XP-gain or no-play-time (2409), applies a +5% favoured-zone bonus (2418-2425, Hellfire zones with the faction favour aura), lowers the cap for trial accounts (2430-2433) and halves the gain for partial-play-time players (2438-2439); the sketch omits these. The rested pool is spent on top of the share: `bonus_xp = GetXPRestBonus(xp)` (2448), which takes up to `xp` from the pool (9113-9116). Recruit-a-friend instead adds twice the gain (2446). Then `newXP = curXP + xp + bonus_xp` (2459). The loop runs while `newXP >= nextLvlXP` and below max level: subtract, level up (2461-2466). The remainder is written to `PLAYER_XP` (2472).
- Pets get the share, half in a group and all solo (KillRewarder.cpp 186-188).
- Rested pool accrual (PlayerUpdates.cpp 243-259). Only while `PLAYER_FLAGS_RESTING` is set (243: resting in an inn or city) and `now > lastTick` and `_restTime > 0` (245), after at least 10 s since `_restTime` (249), the pool grows by `elapsed * (nextLevelXP / 72000) * (0.125 * RATE_REST_INGAME)` (253-259). Merely being logged in does not accrue it.

## 2. Key functions

- `KillRewarder::Reward`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Entities/Player/KillRewarder.cpp` 289-314. Chooses group or solo, then the instance-encounter credit (309-313).
- `KillRewarder::_InitGroupData`: same file, 84-123. The group census.
- `KillRewarder::_InitXP` and `_RewardXP`: same file, 125-140 and 149-190. Base XP, the ModHealth scale, the per-member share, the power-level guard, the aura multiplier, and the hand-off to `GiveXP`.
- `KillRewarder::_RewardGroup`: same file, 243-280. Sets the group rate and loops over in-reach members.
- `Acore::XP::BaseGain` and `Acore::XP::Gain`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Miscellaneous/Formulas.cpp` 27-71 and 73-136.
- `Player::GiveXP`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Entities/Player/Player.cpp` 2401-2473, with `GetXPRestBonus` at 9109-9120.

## 3. Numbers vs mechanism

| Reusable rule | Donor constant |
|---|---|
| Base XP grows with the player's level and is capped at a four-level gap | Tier base 45 / 235 / 580 by zone (theirs, Formulas.cpp 35, 38, 41); cap 4 (52-53) |
| Grey test: a victim at or below the grey level pays nothing | Grey breakpoints: level <=5 gives 0; <=39 gives `pl-5-pl/10`; <=59 gives `pl-1-pl/5`; else `pl-9` (Formulas.h 50-57) |
| Below-level ramp uses a zero-difference denominator per level band | GetZeroDifference table, 5 below level 8 up to 17 at 60 and above (Formulas.h 86-109; table values not all quoted) |
| Elite bonus | x2 (Formulas.cpp 89-90) |
| Low-health NPC scale | Multiply by ModHealth only when it is between 0 and 0.75 (KillRewarder.cpp 138-139) |
| Group rate by living count | 1.0 for 0-2; 1.166 at 3; 1.3 at 4; 1.4 at 5+; raid 1.0 (Formulas.h 130-146, 126) |
| Full vs half split | Full if the top living member is the not-grey basis; otherwise `/2 + 1` (KillRewarder.cpp 159-161) |
| Power-level guard | `xp / 2 + 1` when a higher-level attacker is above the reference and the victim is grey to it (174-175) |
| Pet share | 100% solo, 50% in a group (188) |
| Rest pool spend | Up to the XP gained, from the pool (Player.cpp 9113-9116) |
| Rest accrual | `nextLevelXP / 72000` per second times `0.125 * rate`, after at least 10 s, and only while flagged resting (PlayerUpdates.cpp 243-259) |
| Worked by hand from the formula (not measured): player level 10, victim level 10, tier 45 | `((10*5+45) * 20 / 10 + 1) / 2` = 95 base XP |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: group census, base XP from the basis member (the highest living member the victim is not grey to, or the killer solo), the elite and ModHealth scales, the group rate, the per-recipient share with the full/half and zero rules, the power-level guard, then an award step with the rested pool and the level-up loop. It omits: the damage-requirement scale inside `Gain` (Formulas.cpp 126-129), the aura multiplier, battleground rates, the PvP and vehicle exclusions, the zone-to-tier lookup (the tier is an input), the zero-difference table (a function input), honour, reputation and kill credit, pets, script hooks, the favoured-zone bonus, recruit-a-friend, the trial and partial-play caps, the reward-distance test (the caller passes `inReach`), and the rest accrual. The dead-killer gate lives in `GiveXP` in the donor and is not in the share here. `grayLevel()` repeats the donor breakpoints as a rule; Frankendom should replace it with its own tuned table.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type Member = { id: string; level: number; alive: boolean; inReach: boolean };

export interface KillInput {
  killerId: string;
  inGroup: boolean;
  members: Member[];              // party members, the killer included
  victimLevel: number;
  victimElite: boolean;
  victimModExperience: number;    // creature template multiplier (data)
  victimModHealth: number;        // creature template health ratio; applied only when 0 <= x <= 0.75
  highestAttackerLevel: number;   // highest player level that damaged the victim (server-tracked)
  baseTier: number;               // content-tier base: 45, 235 or 580 (zone data)
  isRaid: boolean;
  killRate: number;               // world XP rate (engine constant)
  zeroDifference: (playerLevel: number) => number; // table lookup (engine constant)
}

export function grayLevel(pl: number): number {
  if (pl <= 5) return 0;
  if (pl <= 39) return pl - 5 - Math.floor(pl / 10);
  if (pl <= 59) return pl - 1 - Math.floor(pl / 5);
  return pl - 9;
}

export function groupRate(count: number, isRaid: boolean): number {
  if (isRaid) return 1.0;
  if (count <= 2) return 1.0;
  if (count === 3) return 1.166;
  if (count === 4) return 1.3;
  return 1.4;
}

// Base XP from the gap between player level and victim level.
export function baseGain(pl: number, mob: number, tier: number, zd: (pl: number) => number): number {
  if (mob >= pl) {
    const diff = Math.min(mob - pl, 4);
    return Math.floor((Math.floor((pl * 5 + tier) * (20 + diff) / 10) + 1) / 2);
  }
  if (mob > grayLevel(pl)) {
    const z = zd(pl);
    return Math.floor((pl * 5 + tier) * (z + mob - pl) / z);
  }
  return 0;
}

// Splits one kill's XP across the recipients. Returns recipient id -> XP (only non-zero entries).
export function shareKillXp(input: KillInput): Map<string, number> {
  const out = new Map<string, number>();
  const reach = input.inGroup
    ? input.members.filter(m => m.inReach || m.id === input.killerId)
    : input.members.filter(m => m.id === input.killerId);

  // Pass 1: group figures. Only living members count toward the rate and the basis level.
  let count = 0;
  let aliveSum = 0;
  let maxLevel = 0;
  let maxNotGray: Member | undefined;
  let maxNotGrayLevel = 0;
  if (input.inGroup) {
    for (const m of reach) {
      if (!m.alive) continue;
      count++;
      aliveSum += m.level;
      if (m.level > maxLevel) maxLevel = m.level;
      if (input.victimLevel > grayLevel(m.level) && (maxNotGray === undefined || m.level > maxNotGrayLevel)) {
        maxNotGray = m;
        maxNotGrayLevel = m.level;
      }
    }
  }
  const isFull = maxNotGray !== undefined && maxLevel === maxNotGrayLevel;

  // Pass 2: base XP. Group basis is the highest living member for whom the victim is not grey.
  let basisLevel: number;
  if (input.inGroup) {
    if (maxNotGray === undefined) return out; // nobody can take XP from a grey kill
    basisLevel = maxNotGrayLevel;
  } else {
    basisLevel = reach[0].level;
  }
  let base = baseGain(basisLevel, input.victimLevel, input.baseTier, input.zeroDifference);
  if (base > 0) {
    if (input.victimElite) base *= 2;
    base = Math.floor(base * input.victimModExperience * input.killRate);
    if (input.victimModHealth >= 0 && input.victimModHealth <= 0.75) base = Math.floor(base * input.victimModHealth);
  }
  if (base < 1) return out;

  // Pass 3: each recipient's share.
  const rate0 = input.inGroup ? groupRate(count, input.isRaid) : 1;
  for (const m of reach) {
    let xp = base;
    if (input.inGroup) {
      const eligible = m.alive && maxNotGray !== undefined && m.level <= maxNotGrayLevel;
      if (!eligible) continue;
      const rate = rate0 * m.level / aliveSum;
      xp = isFull ? Math.floor(base * rate) : Math.floor(base * rate / 2) + 1;
    }
    // Power-level guard: a kill that a higher-level attacker helped with is halved for the taggers.
    const referenceLevel = input.inGroup ? maxLevel : m.level;
    if (xp > 0 && input.highestAttackerLevel > referenceLevel && input.victimLevel <= grayLevel(input.highestAttackerLevel)) {
      xp = Math.floor(xp / 2) + 1;
    }
    if (xp > 0) out.set(m.id, xp);
  }
  return out;
}

// Adds XP with level-ups that carry the overflow; optional rested pool spent first.
export interface Progress { level: number; xp: number; restBonus: number; }

export function awardXp(
  p: Progress,
  gained: number,
  maxLevel: number,
  nextLevelXp: (level: number) => number,
  spendRest: boolean,
): Progress {
  if (gained < 1 || p.level >= maxLevel) return p;
  const spent = spendRest ? Math.min(Math.floor(p.restBonus), gained) : 0;
  let total = p.xp + gained + spent;
  let level = p.level;
  let next = nextLevelXp(level);
  while (total >= next && level < maxLevel) {
    total -= next;
    level += 1;
    next = nextLevelXp(level);
  }
  return { level, xp: total, restBonus: p.restBonus - spent };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/azerothcore-wotlk-kill-xp.ts) exits 0 with no output.

## 5. Lands in

- TARGET `src/fight/xp.ts` (new module: kill XP split and award, called once per server-verified kill, writing through the one ledger). Parity-checklist row 18 (loot roll and XP award). Post-K item 3 does not apply here (it is the server tick).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: one engine (the split is computed in src/fight, not the client); server-verified kills (the highest attacker level comes from the server's damage record); one ledger (one XP write path). Rules 7-9 n/a.

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the described mechanism. The grey breakpoints in `grayLevel()` repeat the donor's six rules; replace them with a Frankendom table before shipping.
- Attackers versus party (ruling gap). The donor splits among every living party member within reward distance, whether or not they hit the creature. Frankendom caps attackers at MAX_ATTACKERS = 3, so the caller must pass the attackers, not the party. The group rate table tops out at 5+, which has no meaning for a three-attacker cap. Frankendom needs a ruling on whether non-attacking party members get XP at all.
- One ledger. The donor writes `PLAYER_XP` and levels directly (Player.cpp 2459-2472), and the rested pool is a separate field. Frankendom must route all XP through one ledger write; the rested pool should be decided separately (see next point).
- Rested pool. The donor adds rested XP on top of the share (Player.cpp 2448, 2459) and accrues it only while the player is flagged resting (PlayerUpdates.cpp 243-259). That is a time-based bonus, not a fight reward. If Frankendom takes it at all, keep it out of the fight step.
- Donor quirk. Because the denominator includes living members who are zeroed, a group pays out less than `groupRate * base` (section 1, step 4). Frankendom should decide whether that is intended before copying the formula.
- Server-verified kills. The attacker-level record is written in the server's damage path (Unit.cpp 1217-1230), which fits the rule. But `ModHealth`, `ModExperience` and the elite flag come from creature templates, so they must be server data, not client-visible numbers.
- Pit as client. The donor's battleground branch has different rates and no reputation (Player.cpp 13049, KillRewarder.cpp 132). The Pit has no XP ruling yet; the sketch covers PvE only.
- Not read: the zone-to-tier lookup, the aura multiplier, the call sites that reset the attacker level, the code that sets or clears the resting flag, and the offline rest accrual. Any claim about those is cut.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: one engine, server-verified kills, one ledger (rules 7-9 n/a)


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** Rest accrual: note says 'While logged in ... outer condition not read' but PlayerUpdates.cpp 243-245 shows the real gate: PLAYER_FLAGS_RESTING set and now > lastTick and _restTime > 0 (so rested XP accrues only while resting in inn/city, not merely logged in). Everything else verified: BaseGain 49-55/60-63, tier 45/235/580, grey breakpoints, ZD table, group rate 1.0/1.166/1.3/1.4, 157-163, power-level guard 169-176, GiveXP 2403-2472, GetXPRestBonus 9113-9116, 72000 divisor and 0.125 bubble, callers 13051/13694/1898/2724, worked example 95 XP.

**Missed:** GiveXP also: favoured-zone +5% (2418-2425, hellfire zones), trial level cap 2430-2433, partial-play halving 2438-2439, PLAYER_FLAGS_NO_XP_GAIN 2409 (sketch lists some as omitted, mechanism step 7 does not). _RewardGroup pays honor/rep/kill credit to dead in-reach members too (264). Gain() scales XP by playerDamageReq (125-129) is listed as omitted in sketch only.
