# TrinityCore-TrinityCore (parties-guilds-chat, cell 18)

Donor: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Player/KillRewarder.cpp` 89-248 (`_InitGroupData`, `_RewardXP`, `_RewardGroup`; rate at 205-210), with `Trinity::XP::xp_in_group_rate` at `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Miscellaneous/Formulas.h` 221-254 and `Player::GiveXP` at `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Player/Player.cpp` 2110-2150 | Licence: GPL-2.0-or-later (KillRewarder.cpp header: "either version 2 of the License, or (at your option) any later version"; the root `COPYING` is GPL version 2 text) | C++ | symbol `KillRewarder::_InitGroupData` (party XP split)

Checked: Read in full: `KillRewarder::_InitGroupData` (89-120), `_InitXP` (122-131), `_RewardXP` (140-168), `_RewardPlayer` rate lines (190-216), `_RewardGroup` (220-248), the solo branch of `Reward()` (279), `xp_in_group_rate` (Formulas.h 221-254), and the parts of `Player::GiveXP` that touch XP (2110-2150). Not read: the base XP formula `Trinity::XP::Gain` (Formulas.h 181), `Trinity::XP::GetGrayLevel` (Formulas.h 70), `WorldObject::IsAtGroupRewardDistance` (definition), the pet XP call, and the honour path. Group.cpp was only listed by function name (1-1862); its invite, leader and ready-check bodies were NOT read. Files opened: KillRewarder.cpp, Formulas.h, Player.cpp (2110-2150), Group.cpp (function index), COPYING. Confidence: high on the split arithmetic (every step is a read line, and the group-bonus table values are read); medium-high on the gray rule (the comparison is read; the gray threshold function is not). camera_scope: not applicable.

## 1. Mechanism

- One kill, one pool. The base XP `B` is computed once by `_InitXP` (130) from a single player (the highest-level counted member who does not find the victim grey, 227). For a group, that pool is multiplied by a group bonus `G` that depends only on how many members count (238), and the pool is then split by level weight among the counted members.
- Who counts (`_InitGroupData`, 89-120): the killer always counts (97); any other member counts only if they are within reward distance and alive (97). For each counted member: `_count` +1 (101), `_sumLevel` += level (103), `_maxLevel` tracks the highest counted level (105-106), and `_maxNotGrayMember` is the highest-level counted member for whom the victim is not grey (109-111, with the grey threshold from `GetGrayLevel`, not read). If there is no group, `_count` is 1 (119).
- Full or half: `_isFullXP` is true only when the highest-level counted member (`_maxLevel`) is the same level as `_maxNotGrayMember` (116). That is, the code tests only the top member. The comment at 49 says "for all group members victim is not gray"; the code does not test that.
- Group bonus, `Trinity::XP::xp_in_group_rate(count, isRaid)` (Formulas.h 221-254): raid groups get a fixed 0.99 (229). Otherwise 1.0 for counts 0-2 (233-238), 1.166 for 3 (240-241), 1.3 for 4 (243-244), 1.4 for 5 or more (246-248). The rate is set once per kill in `_RewardGroup` (238), using `_count`.
- Member share (`_RewardPlayer`, 205-210): for a group member, `rate = _groupRate * level / _sumLevel` (206). A solo player gets rate 1.0 (207). `_RewardXP` (210) is only called when `_xp` is non-zero (208).
- Per-member XP (`_RewardXP`, 140-168): if the player is in a group, XP is zero unless the player is alive and their level is not above the top non-grey member's level (148). Then `xp = _isFullXP ? uint32(xp * rate) : uint32(xp * rate / 2) + 1` (150-152). Otherwise zero (154). Solo players skip this gate and keep `_xp` (the code checks `player->GetGroup()` first). Aura XP multipliers apply (159). Then `GiveXP(xp, _victim, _groupRate)` (163).
- `Player::GiveXP` (2110): it returns early for a creature with no loot recipient (2121). It adds the rest bonus on a kill (2139) and sets `newXP = GetXP() + xp + bonus_xp` (2150). The group rate it receives is only put into the client packet (2146). It does not multiply XP again. So the group bonus is applied once, in the split.
- Reward loop (`_RewardGroup`, 220-248): every group member within reward distance (246) is passed to `_RewardPlayer` (247). The loop is skipped if `_maxLevel` is zero (222). A solo killer goes through `_RewardPlayer(killer, false)` (279).
- Arithmetic: the shares of the counted members add up to at most `B * G`. The shares are reduced by the level gate (148), the grey halving (152), floor rounding (150-152) and aura multipliers (159). Equal-level members split the pool evenly: two equal members get `B * 1.0` in total (each half), three get `B * 1.166`.

## 2. Key functions

- `KillRewarder::_InitGroupData`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Player/KillRewarder.cpp` 89-120. Counts, level sum, top member, full-XP flag.
- `KillRewarder::_RewardXP`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Player/KillRewarder.cpp` 140-168. Level gate, alive gate, full or half XP, aura multipliers, `GiveXP`.
- `KillRewarder::_RewardPlayer` (rate lines): `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Player/KillRewarder.cpp` 190-216. Per-member rate `_groupRate * level / _sumLevel`.
- `KillRewarder::_RewardGroup`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Player/KillRewarder.cpp` 220-248. Base XP from the top non-grey member (227), raid flag and group rate (237-238), reward distance loop (246-247).
- `Trinity::XP::xp_in_group_rate`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Miscellaneous/Formulas.h` 221-254. The bonus table.
- `Player::GiveXP`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Player/Player.cpp` 2110-2150. Receives the group rate for display only.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One pool per kill: base XP times a bonus that depends on how many members share it | Bonus table by count: 1.0 for 0-2, 1.166 for 3, 1.3 for 4, 1.4 for 5+ (theirs, Formulas.h 238, 241, 244, 248) |
| Raid groups use a flat bonus | 0.99 (theirs, Formulas.h 229; the donor's FIXME at 227 says a raid-size decrease still has to be applied) |
| Split by level weight over counted members | `level / _sumLevel` (theirs, KillRewarder.cpp 206); no constant |
| Dead members are left out of the count and get zero | Alive check at 97 and 148 (rule, no number) |
| Members above the top non-grey level get zero | Level comparison at 148 (rule, no number) |
| Half share when the top member sees the victim as grey | `uint32(xp * rate / 2) + 1` (theirs, KillRewarder.cpp 152) |
| The killer counts even when dead | `killer == member ||` (theirs, KillRewarder.cpp 97) |
| Group bonus is display only in the XP call | `packet.GroupBonus = group_rate;` (theirs, Player.cpp 2146) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: solo shortcut, counted members (killer plus alive in-range), count and level sum, top non-grey member and the full-XP flag, group bonus by count, then a per-member share with the level gate and the half/full rule. It takes the base XP as an input (the donor computes it with `Trinity::XP::Gain`, not read) and takes the grey test as a callback (the donor's threshold function was not read). It omits: the raid bonus (0.99), aura XP multipliers, the rest bonus and recruit bonus in `GiveXP`, the pet share, the reputation split, the dungeon exception, the battleground case, the "victim has a loot recipient" check, and the reward-distance function (the sketch takes `inRange` as a flag). It tests the top member only, as the donor does, so it does not implement the comment's "all members" rule. Integer rounding follows `uint32` truncation by floor.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Member = {
  id: string;
  level: number;
  alive: boolean;
  inRange: boolean;     // inside the reward distance of the kill
};

type Share = { id: string; xp: number };

// Group bonus by counted members: 1-2 members 1.0, 3 members 1.166, 4 members 1.3, 5 or more 1.4.
function groupBonus(count: number): number {
  if (count <= 2) return 1.0;
  if (count === 3) return 1.166;
  if (count === 4) return 1.3;
  return 1.4;
}

// base: XP of the kill, computed once by the caller. isGrey: per-member test (the victim is grey for that member).
function splitXp(
  base: number,
  members: Member[],
  killerId: string,
  isGrey: (m: Member) => boolean,
): Share[] {
  // A player without a group gets the base XP as it is.
  if (members.length === 1) return [{ id: members[0].id, xp: base }];

  // Counted members: the killer, and every alive member in range.
  const counted = members.filter(m => m.id === killerId || (m.inRange && m.alive));
  const count = counted.length;
  const sumLevel = counted.reduce((s, m) => s + m.level, 0);
  const maxLevel = Math.max(...counted.map(m => m.level));

  // Highest-level counted member for whom the victim is not grey.
  const notGrey = counted.filter(m => !isGrey(m));
  const top = notGrey.length > 0 ? notGrey.reduce((a, b) => (b.level > a.level ? b : a)) : null;
  const fullXp = top !== null && top.level === maxLevel;   // code tests only the top member
  const bonus = groupBonus(count);

  return members.filter(m => m.inRange).map(m => {
    // Dead members and members above the top non-grey level get nothing.
    if (top === null || !m.alive || m.level > top.level) return { id: m.id, xp: 0 };
    const share = bonus * m.level / sumLevel;
    const xp = fullXp ? Math.floor(base * share) : Math.floor((base * share) / 2) + 1;
    return { id: m.id, xp };
  });
}
```

## 5. Lands in

- TARGET `src/fight/xp-share.ts` (new module, proposed; the Frankendom tree was not read): the engine's XP award for a server-verified kill, called once per kill from the kill step. It writes one ledger entry per attacker, so the split is one computation in the engine, not one per client.
- Parity-checklist row 18 (loot roll and XP award): this is the XP award half of row 18.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: one ledger (the split is computed once on the server); MAX_ATTACKERS = 3 (the group bonus table is used only up to three counted members, so the 1.3 and 1.4 rows are unused unless the cap changes); zones as data (the bonus table and grey-style cutoffs are data fields, see JSON).

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not from the lines.
- Who counts differs. The donor counts party members within reward distance (`IsAtGroupRewardDistance`, not read) who are alive. Frankendom counts attackers in the fight, capped at MAX_ATTACKERS = 3. The donor's distance rule must not be ported as it is; Frankendom needs a test for "who is in the split".
- The killer always counts even if dead (KillRewarder.cpp 97), so a dead killer still pulls level weight from the others while getting zero. Frankendom should decide whether a dead killer counts. The sketch follows the donor here.
- The donor's comment (49) says full XP needs all members not grey; the code tests the top member only (116), so a lower-level member who finds the victim grey still gets full share. Do not copy the comment's rule; pick one rule and test it.
- The raid row (0.99, Formulas.h 229) and the 1.3 and 1.4 rows only matter above three members. With MAX_ATTACKERS = 3 only the 1.0 and 1.166 rows are reachable.
- The level gate (148) is a WoW level-cap rule. Frankendom needs it only if zones carry levels; if so, the cutoff is zone data.
- Rested XP and recruit bonus are added in `GiveXP` (2139-2150). They are not in the Frankendom rulings I was given, so the sketch leaves them out.
- Base XP `Trinity::XP::Gain` (Formulas.h 181) and the grey threshold `GetGrayLevel` (Formulas.h 70) were not read. Frankendom's base XP per kill is its own value and does not come from this file.
- Not read: the pet XP call (`GivePetXP`, a half share in groups per the comment at 4.2.4), reputation split (KillRewarder.cpp 214), `IsAtGroupRewardDistance`, the honour path, and the guild and chat code. Guild and chat were not examined for this note; Group.cpp was only listed by function name (invite, leader succession, ready check and loot bodies not read).

Best transferable idea: Split one party kill's XP as a pool: base XP times a bonus that rises with the number of counted members (1.0 for one or two, 1.166 for three), shared by level weight among alive attackers, with dead or over-levelled members at zero.

Decision (proposed): adapt — the pool, the count-based bonus and the level-weighted split are the shape Frankendom's row 18 needs for up to three attackers on one ledger; drop the raid row, the reward-distance rule (replace with "attacker in the fight"), the rested and recruit bonuses, and the level cutoff unless zones carry levels.

Acceptance: Two alive level-10 attackers kill a target with base XP B: each ledger entry gets about 0.5B, so the total is 1.0B (the same as one attacker); with three alive attackers each gets about 0.389B and the total is 1.166B; a third attacker who dies before the kill is left out of the split (a server test asserts the shares sum to base times the bonus for the counted attackers and the dead one gets 0).
