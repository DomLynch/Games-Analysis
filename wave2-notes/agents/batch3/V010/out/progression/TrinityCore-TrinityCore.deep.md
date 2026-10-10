# TrinityCore-TrinityCore (progression, cell 10)

Donor: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Player/KillRewarder.cpp` (with `Miscellaneous/Formulas.h`, `Entities/Player/Player.cpp` GiveXP, `Entities/Player/RestMgr.cpp`) | Licence: GPL-2.0-or-later (KillRewarder.cpp header: "either version 2 of the License, or (at your option) any later version"; repo COPYING is GPL v2) | C++ | symbol `KillRewarder::Reward`

Checked: Read in full: `KillRewarder.cpp` 1-298 (the whole file: `_InitGroupData`, `_InitXP`, `_RewardXP`, `_RewardPlayer`, `_RewardGroup`, `Reward`); `Formulas.h` `Trinity::XP` namespace 68-251 (`GetGrayLevel`, `GetZeroDifference`, `BaseGain`, `Gain`, `xp_in_group_rate`); `Player::GiveXP` (Player.cpp 2110-2163); `RestMgr.cpp` 1-169 (whole file); `Player::Update` rest call (Player.cpp 982, read in context); offline rest accrual (Player.cpp 18815-18828). Callers: `KillRewarder` is constructed in two places, `Unit.cpp` 11448 (creature kill, read) and `Battleground.cpp` 1477 (battleground, not read beyond the constructor line from grep). Tap list build read (Unit.cpp 11331-11336). Not read: the DB2 XP table rows (`sXpGameTable`, `GtXpEntry.PerKill` and `Divisor` values), `ZeroDifference` table body beyond the first and last branches (read in full at Formulas.h 110-137), `Player::GetXPForNextLevel` source (value comes from the client data field), the `GetsRecruitAFriendBonus` condition, the level-up `GiveLevel` body. Confidence: high on the kill-to-XP path and the rest bank (read end to end); medium on the exact zero-difference values (read, not receipted) and on how the tap list is filled (the recording code was not read). camera_scope: not applicable.

## 1. Mechanism

- A creature death builds `tappers` from the creature's tap list (Unit.cpp 11331-11336), then calls `KillRewarder(tappers, victim, false).Reward()` (11448).
- `Reward` (KillRewarder.cpp 253-281) runs once per killer. A killer in a group processes the whole group once (`processedGroups`, 255-265). A solo killer goes through `_InitXP(killer, killer)` and `_RewardPlayer` (273-279).
- Group data (`_InitGroupData`, 89-120): for each group member that is the killer or is alive and within reward distance (97): count them (101), add their level to `_sumLevel` (103), track the top level, and keep `_maxNotGrayMember`, the highest-level member for whom the victim is not gray (109-111). `_isFullXP` is true only if the top level equals that member's level (116).
- Base XP (`_InitXP`, 122-131): XP is given in PvE and not to a killer on a vehicle (129). For a group the base is computed as if the killer were `_maxNotGrayMember` (227). The base is `Trinity::XP::Gain` (130).
- `Gain` (Formulas.h 181-215): `BaseGain(playerLevel, mobLevel)` first. If the mob is at or above the player: PerKill x (1 + 0.05 x min(diff, 4)) (153-156). If below: zero if the mob is at or below the gray level (167), otherwise PerKill_mob x (1 - (pl - mob) / ZD) x (Divisor_mob / Divisor_pl) (164). Then, for creatures: older-expansion creatures give one tenth (196); elite x2.0 in the world, x2.75 in a dungeon (202-204); `ModExperience` (207); `Rate.XP.Kill` (210); final `uint32(gain * xpMod)` (214).
- Group rate (`xp_in_group_rate`, 221-251): raid gives a flat 0.99 (228-229); otherwise a count table: 0-2 members 1.0, 3 members 1.166, 4 members 1.3, 5 or more 1.4 (240-248). The rate is applied once to the group total (`_groupRate`, 238).
- XP is given only in PvE or in battlegrounds (`_RewardPlayer`, 203). Per-member share (`_RewardPlayer`, 205-207): in a group, `rate = _groupRate x member.level / _sumLevel`; solo, `rate = 1.0`.
- `_RewardXP` (140-168): in a group, a member gets XP only if alive and `_maxNotGrayMember.level >= member.level` (148-149). Then XP = `uint32(xp x rate)` when `_isFullXP`, else `uint32(xp x rate / 2) + 1` (150-152). Otherwise 0 (154). Aura multipliers follow (159-160). `GiveXP(xp, victim, _groupRate)` (163). A pet gets half the XP in a group (166).
- `Player::GiveXP` (Player.cpp 2110-2163): returns for XP below 1 and for a dead player outside battlegrounds (2115); returns for a creature with no loot recipient (2121). Rested XP applies only when there is a victim (2139); a recruit-a-friend bonus of 2 x XP takes its place (2137). New XP total = XP + gain + bonus (2150). While the total reaches the next level and the hero is below max, the threshold is subtracted and the level rises (2152-2157). `group_rate` is passed only for the packet display (2146), not multiplied in again.
- Rested bank (`RestMgr`): `GetRestBonusFor` takes `min(bank, xp)` as the bonus (122-124), and the same amount is removed from the bank (126-130; an aura modifier can raise the removal, 128). The bank is capped at 0.75 of the next level's XP (58). It accrues in `RestMgr::Update`, called from `Player::Update` each update while resting (982, 136). Each call passes a 3% roll (138), needs at least 10 s since the last accrual (141), and adds elapsed x NextLevelXP / 72000 x 0.125 x `Rate.Rest.InGame` (145-146, 165). Offline accrual at login uses 0.031 in the wilderness and 0.125 in a tavern or city, times the rates (Player.cpp 18820-18827).

## 2. Key functions

- `KillRewarder::Reward`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Player/KillRewarder.cpp` 253-281 (per-killer loop, group once).
- `KillRewarder::_InitGroupData`: same file, 89-120 (count, sum, top level, highest non-gray member, full-XP flag).
- `KillRewarder::_RewardXP` and `_RewardPlayer`: same file, 140-168 and 190-218 (share by level, half-XP cut, zero for an above-level or dead member, pet share).
- `Trinity::XP::BaseGain` and `Gain`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Miscellaneous/Formulas.h` 143-175 and 181-215.
- `Trinity::XP::xp_in_group_rate`: same file, 221-251.
- `Player::GiveXP`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Player/Player.cpp` 2110-2163.
- `RestMgr::GetRestBonusFor`, `RestMgr::Update`, `RestMgr::SetRestBonus`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Player/RestMgr.cpp` 119-134, 136-149, 32-83.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One base XP per kill, taken from the highest-level attacker the mob is not gray to | Gray-level formula by player level (Formulas.h 70-86: below 7 is 0; below 35 is `(pl - 7) - (count - 1)` where count is the multiples of 5 from 15; at 35 and above `pl - 10`) |
| Group multiplier on the total, from the count of attackers in reach | Count table 1.0 / 1.0 / 1.0 / 1.166 / 1.3 / 1.4 for 0-2 / 3 / 4 / 5+ members (theirs, Formulas.h 240-248; receipts not possible, see gaps); raid flat 0.99 (theirs, 228-229) |
| Share by level: member's level over the sum of living members' levels | None (formula) |
| Half share (+1) unless the top member is the one who sets the base | Half, `xp x rate / 2 + 1` (theirs, KillRewarder.cpp 152) |
| Level-above bonus, capped | +5% per level, capped at 4 levels (theirs, Formulas.h 153-156) |
| Creature-type modifiers | Elite x2.0 world / x2.75 dungeon (theirs, Formulas.h 202-204); older-expansion one tenth (196) |
| Rested bank cap and consumption | Cap 0.75 of next-level XP (theirs, RestMgr.cpp 58); consumed 1:1 up to the kill's XP (123-130) |
| Rest accrual rate | 0.125 in game, times `Rate.Rest.InGame` (theirs, RestMgr.cpp 145; config default 1, worldserver.conf.dist 2515); 3% gate per update (138) |
| Level-up carry | Subtract the threshold and repeat (Player.cpp 2152-2157) |
| Kill XP rate | `Rate.XP.Kill` default 1 (theirs, worldserver.conf.dist 2478) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for a group kill: alive reach members, highest non-gray member sets the base (computed once), full-or-half share by level, zero for dead or above-level members, then the rested bank spent on kill XP and the level-up carry. It takes the XP table rows, the zero-difference value and the rest bubble as parameters (the donor reads them from DB2 and config). It omits: aura multipliers, elite and creature multipliers, the older-expansion tenth, the `MinCreatureScaledXPRatio` floor (default 0, not applied), the battleground path, recruit-a-friend, the pet share, reputation and kill credit, the tap list and the victim-level-for-target call (the sketch uses the mob level for every member), the `GiveXP` early returns, and the `_restTime` reset (the caller passes the elapsed time). The donor's uint32 truncation is kept as `Math.floor`.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Row = { perKill: number; divisor: number };        // XP table row per level (values not read)
interface Member { id: string; level: number; alive: boolean; inReach: boolean; }
interface RestState { bonus: number; }                  // rested XP bank (points)

const RAID_GROUP_RATE = 0.99;

// Gray level: a mob at or below this level gives the player no XP.
function grayLevel(pl: number): number {
  if (pl < 7) return 0;
  if (pl < 35) {
    let count = 0;
    for (let i = 15; i <= pl; i++) if (i % 5 === 0) count++;
    return (pl - 7) - (count - 1);
  }
  return pl - 10;
}

// Base XP for one kill. A mob at or above the player's level gets +5% per level, capped at 4 levels.
// A lower mob scales down over the zero-difference span zd (table, passed in).
function baseGain(pl: number, mob: number, row: (lvl: number) => Row, zd: number): number {
  if (mob >= pl) {
    const diff = Math.min(mob - pl, 4);
    return Math.round(row(pl).perKill * (1 + 0.05 * diff));
  }
  if (mob <= grayLevel(pl)) return 0;
  const p = row(pl), m = row(mob);
  return Math.round(m.perKill * ((1 - (pl - mob) / zd) * (m.divisor / p.divisor)));
}

// Group multiplier on the one base XP, by alive members in reach. Raid uses a flat 0.99.
function groupRate(count: number, isRaid: boolean): number {
  if (isRaid) return RAID_GROUP_RATE;
  const table = [1.0, 1.0, 1.0, 1.166, 1.3, 1.4];   // index = min(count, 5)
  return table[Math.min(count, 5)];
}

// One kill split across a group. Base XP comes from the highest-level member the mob is not gray to.
// Each reachable member gets a share by level. Full XP only if that member is the group's top level;
// otherwise half. A member above the gray-cut level, or dead, gets 0.
function groupAwards(mob: number, members: Member[], row: (l: number) => Row, zd: number, isRaid: boolean): Map<string, number> {
  const share = members.filter(m => m.inReach && m.alive);
  const sumLevel = share.reduce((s, m) => s + m.level, 0);
  let maxLevel = 0;
  let maxNotGray: Member | null = null;
  for (const m of share) {
    maxLevel = Math.max(maxLevel, m.level);
    if (mob > grayLevel(m.level) && (maxNotGray === null || maxNotGray.level < m.level)) maxNotGray = m;
  }
  const out = new Map<string, number>();
  if (maxNotGray === null) return out;                  // every member is gray to the mob: no XP
  const base = baseGain(maxNotGray.level, mob, row, zd);
  const full = maxLevel === maxNotGray.level;
  const rate = groupRate(share.length, isRaid);
  for (const m of members) {
    if (!m.inReach) continue;
    let xp = 0;
    if (m.alive && maxNotGray.level >= m.level) {
      const s = rate * m.level / sumLevel;
      xp = full ? Math.floor(base * s) : Math.floor(base * s / 2) + 1;
    }
    out.set(m.id, xp);
  }
  return out;
}

// Rested XP is spent 1:1 on kill XP, up to the kill's own XP. The aura consumption modifier is not modelled.
function spendRested(xp: number, st: RestState): number {
  const bonus = Math.min(st.bonus, xp);
  st.bonus -= bonus;
  return Math.floor(bonus);
}

// Rest accrual: each update, a 3% roll gates the accrual. Elapsed time since the last accrual (at least 10 s)
// adds elapsed * nextLevelXp / 72000 * bubble. The bank is capped at 0.75 of nextLevelXp.
function restTick(st: RestState, nextLevelXp: number, elapsedS: number, bubble: number, gateRoll: boolean): void {
  if (!gateRoll || elapsedS < 10) return;
  const cap = nextLevelXp * 1.5 / 2;
  st.bonus = Math.min(cap, st.bonus + elapsedS * (nextLevelXp / 72000) * bubble);
}

// Level-up carry: XP above the threshold rolls into the next level. Nothing is kept at max level.
function giveXp(hero: { level: number; xp: number; maxLevel: number }, gain: number, rested: number, nextLevelXp: (lvl: number) => number): void {
  if (hero.level >= hero.maxLevel) return;
  let newXp = hero.xp + gain + rested;
  let next = nextLevelXp(hero.level);
  while (newXp >= next && hero.level < hero.maxLevel) {
    newXp -= next;
    hero.level += 1;
    next = nextLevelXp(hero.level);
  }
  hero.xp = newXp;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/xp.ts` (new module, engine XP award: one base per server-verified kill, split across the attackers in reach). Parity-checklist row 18 (loot roll and XP award). The server sub-line is not needed here; the award runs at the kill event on the server, so it sits in the post-K item 3 server tick sub-line "server tick: fixed step, input intake, per-tick NPC budget" only for the rest accrual timer.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: one ledger (one XP write per kill, computed once); server-verified kills (XP only on a kill the server credits); zones as data (kill XP rate and the group table are zone data)

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not translated.
- Rested XP: the accrual is gated by a random 3% roll per update (RestMgr.cpp 138), so two servers would bank different amounts. Frankendom's one-ledger rule needs a deterministic clock (elapsed time only). Reject the random gate; adapt the bank only if product wants a retention mechanic.
- The base is taken from the highest-level non-gray attacker, not from each attacker. In a many-on-one fight (MAX_ATTACKERS = 3) that base is the single number to record once; per-attacker XP must not recompute it.
- Dead or downed attackers get 0 and are removed from the count and the level sum (KillRewarder.cpp 97, 148). Frankendom must decide whether a downed attacker still shares (the donor says no); the duel step should not hand XP to a player the engine has already ended.
- The group rate table is hardcoded in `Formulas.h`, not data. Frankendom should carry the table and the raid-equivalent rate as zone data with these values as defaults.
- A kill can carry several levels in one award (Player.cpp 2152-2157). The progression event must handle multi-level grants in one ledger entry.
- The XP table (`PerKill`, `Divisor`) and the next-level XP values come from DB2 (not read). Frankendom needs its own curve; this sketch only shows the shape.
- The tap list (Unit.cpp 11334) decides who can receive XP; how the list is recorded was not read. Frankendom's equivalent is the server's attacker list (hate list), not yet defined.
- The gray-level and zero-difference tables are engine rules (Formulas.h 70-137), not data. Keep them as engine constants unless a zone needs a different curve.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: one ledger, server-verified kills, zones as data (rule 1 one engine, two clients)

Best transferable idea: Split one base XP per kill across the attackers in reach by level share, multiplied by a count table, with a half share for members below the top level and zero for dead or above-cut members.
Decision (proposed): adapt — the one-base split is simple, server-computable and fits many-on-one kills up to MAX_ATTACKERS = 3, so take the shape with the group table as zone data; reject the random rested-XP gate (not deterministic) and keep any rest bank only as a deterministic elapsed-time rule.
Acceptance: a server test: three living attackers at levels 10, 12 and 12 kill a level-11 mob; the two level-12 attackers share the same award, the total is the base times 1.166 within rounding, a dead attacker gets 0, and a level-up carry grants every level passed in one event without exceeding max level.
