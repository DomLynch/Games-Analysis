# daggerfall-unity (parties-guilds-chat, cell 3)

Donor: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Guilds/Guild.cs` | Licence: MIT (Guild.cs line 4 "MIT License (http://www.opensource.org/licenses/mit-license.php)"; repo LICENSE line 3 "Copyright (c) 2009-2023 Daggerfall Workshop") | C# | symbol `Guild.UpdateRank`

Checked: Guild.cs read in full (384 lines). Callers: `UpdateRank` is called only from `UserInterfaceWindows/DaggerfallGuildServicePopupWindow.cs` 164 (grep of Assets/Scripts; NonMemberGuild overrides it). `CalculateNewRank` is called from Guild.cs 82 and overridden by ThievesGuild.cs 121 and DarkBrotherhood.cs 126. `IsEligibleToJoin` is called from the popup at 511. Read also: GuildManager.cs 25-60, 100-140, 350-368 (registry, membership dictionaries, load); FightersGuild.cs 84-106; MagesGuild.cs 111-150; ThievesGuild.cs 121-170; DarkBrotherhood.cs 126-160; popup 158-170, 311-320, 505-515; callers of the benefit hooks: Questing/Item.cs 416-419, Formulas/FormulaHelper.cs 1916-1919. Not read: NonMemberGuild.cs, Temple.cs, KnightlyOrder.cs, the token text functions, and the quest chain beyond the Thieves Guild initiation branch. This note is about ranks and service permissions only; there is no party, chat, or friend-list code in this file. Confidence: high on the rank ladder, the review gate, and the constants (receipted). Not camera.

Best transferable idea: a guild rank ladder where each rank needs the one below it, a reputation bar plus skill counts at two levels, re-checked on a 28-day clock that resets only when the rank changes; rank then gates services and scales rewards.
Decision (proposed): adapt - take the cumulative ladder, the 28-day clock with reset-on-change, and the rank-gated service table as data; reject the review running in the client when a guild window opens, which is how the donor does it.
Acceptance: a server test sets reputation 40 with guild skills 31 and 9, runs the server's review, and asserts rank 2; opening the guild screen on the client does not change rank.

## 1. Mechanism

- A membership record holds `rank` (-1 = not a member) and `lastRankChange` (a day number). `Join()` sets rank 0 and the clock to today (Guild.cs 309-312). `IsMember()` is `rank >= 0` (155).
- The review is lazy. `UpdateRank` runs when the guild window is pushed (popup 164), not on a timer. It does nothing until 28 days have passed since `lastRankChange` (Guild.cs 79: `CalculateDaySinceZero(now) >= lastRankChange + 28`).
- Once that gate is open, `CalculateNewRank` runs (82, 100-116). It returns -1 if reputation is below 0 (104-105). Otherwise it loops rank index r = 0..9 (108). For each r it counts the guild's skills at or above the high bar (`rankReqSkillHigh[r]`, 125) or the low bar (`rankReqSkillLow[r]`, 127). The loop stops at the first r that fails `rep < rankReqReputation[r] || high < 1 || low + high < 2` (111-112). It returns the last index that passed (115), or -1 if rank 0 fails.
- Bars are cumulative in practice: the loop stops at the first failing rank, so a higher rank can never be reached with a lower one missed.
- `UpdateRank` then compares (83-95): higher than current is a promotion (85); below 0 is an expulsion, which also calls `RemoveMembership` (87-89); lower but at least 0 is a demotion (90). Only when the rank changes is `lastRankChange` set to today (94). If the rank is unchanged the clock is not reset, so after the 28-day mark each visit re-checks until something changes.
- Subclass policy: Thieves Guild (121-131) and Dark Brotherhood (126-136) map a -1 result to 0, so they never expel.
- Service permissions are per-guild switches. `CanAccessService(service)` returns `IsMember()` for training and repair, and fixed or rank thresholds for the rest. Example, Thieves Guild (146-162): sell magic items needs rank 2 (155), Spymaster needs rank 4 (157). The popup checks the gate before a service (`if (!guild.CanAccessService(service))`, popup 314).
- Rank scales rewards and prices (fixed point). `FightersGuild.AlterReward` is `(((10 + rank) << 8) / 10 * reward) >> 8` (98): +10% per rank. `ReducedRepairCost` is `(((10 - rank) << 8) / 10 * price) >> 8` (103): -10% per rank. The reward hook is applied to a random reward amount in the questing item code, after region and faction scaling (Item.cs 416-419; the surrounding item code was not read); the repair hook is applied to the repair cost (FormulaHelper.cs 1919).
- The tick: none. The clock is the in-game day count (`DaggerfallUnity.Instance.WorldTime.Now`, 79 and 94), evaluated when the window opens.

## 2. Key functions

- `Guild.UpdateRank`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Guilds/Guild.cs` 74-98. The review: day gate, compute, promote/expel/demote, clock reset on change.
- `Guild.CalculateNewRank`: same file 100-116. The cumulative ladder and the expulsion return.
- `Guild.CalculateNumHighLowSkills`: same file 118-130. Counts guild skills at the high and low bars for one rank.
- `Guild.Join`: same file 309-313. Rank 0 and the clock set to now.
- `Guild.CanAccessService`: same file 265-288 (base permission table; subclasses override).
- `ThievesGuild.CanAccessService`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Guilds/ThievesGuild.cs` 146-162; `ThievesGuild.AllowGuildExpulsion`: same file 127-131.
- `FightersGuild.AlterReward` and `ReducedRepairCost`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Guilds/FightersGuild.cs` 96-104.
- `GuildManager` membership: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Guilds/GuildManager.cs` 105-126 (one membership per guild group; separate vampire dictionary at 107 and 111).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Cumulative ladder: stop at the first failing rank; rank = last rank that passed | Reputation bars 0, 10, 20 ... 90 (`rankReqReputation`, Guild.cs 37) |
| Skill test per rank: at least one skill at the high bar, and at least two skills at the low bar or better | High bars 22, 23, 31, 39, 47, 55, 63, 71, 79, 87 (Guild.cs 38); low bars 4, 5, 9, 13, 17, 21, 25, 29, 33, 37 (Guild.cs 39); test at 111 |
| Review gate on a day clock; clock resets only on a rank change | 28 days (Guild.cs 79, 94) |
| Per-rank perk as fixed-point scale | Reward +10% per rank (FightersGuild.cs 98); repair price -10% per rank (103); 8-bit shift |
| Service gate as a plain rank threshold | Sell magic items rank 2 and Spymaster rank 4 (ThievesGuild.cs 155, 157); library rank 2 and magic items rank 3 (MagesGuild.cs 131, 149); potions rank 1 (DarkBrotherhood.cs 160); hall access rank 6 (FightersGuild.cs 93) |
| Expulsion policy per guild: expel, or clamp to 0 | Clamp in Thieves Guild (ThievesGuild.cs 130) and Dark Brotherhood (DarkBrotherhood.cs 135) |

Worked numbers (hand arithmetic from the code above, not run): rank 3 reward multiplier is 332/256 = 1.296875 (the division truncates 3328/10 to 332); rank 3 repair multiplier is 179/256 = 0.69921875 (1792/10 truncates to 179).

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order: review gate, compute the rank from the cumulative ladder, apply the clamp, then promote, demote, or expel, with the clock reset only on change. It omits the token text (promotion, demotion, expulsion), the `RemoveMembership` call (the caller acts on "expel"), the vampire membership split, the NonMemberGuild and Temple overrides, the debug log, and the per-guild service switches (only one example table is shown). The perk functions keep the donor's integer order (divide, multiply, then shift); TypeScript's 32-bit shifts match C# int for these ranges. Typechecked with `tsc --strict` (no run).

```ts
// Licence: MIT (donor, Daggerfall Workshop 2009-2023). Shape adapted and rewritten from the mechanism; not a line translation.
export interface GuildRules {
  reputationNeeded: number[];  // donor rankReqReputation: 0, 10 ... 90
  highNeeded: number[];        // donor rankReqSkillHigh: skill level for a "high" skill, per rank
  lowNeeded: number[];         // donor rankReqSkillLow: skill level for a "low" skill, per rank
  reviewDays: number;          // donor 28
  neverExpel: boolean;         // donor: Thieves Guild and Dark Brotherhood clamp -1 to 0
}

export interface Member {
  rank: number;                // -1 = not a member
  lastRankChange: number;      // day number
}

// Highest rank whose bar is met. Bars are cumulative: the loop stops at the first rank that fails.
export function computeRank(rep: number, guildSkills: number[], rules: GuildRules): number {
  if (rep < 0) return -1;      // expelled by reputation
  let rank = -1;
  for (let i = 0; i < rules.reputationNeeded.length; i++) {
    let high = 0;
    let low = 0;
    for (const s of guildSkills) {
      if (s >= rules.highNeeded[i]) high++;
      else if (s >= rules.lowNeeded[i]) low++;
    }
    if (rep < rules.reputationNeeded[i] || high < 1 || low + high < 2) break;
    rank = i;
  }
  return rank;
}

export type RankEvent = "none" | "promote" | "demote" | "expel";

// The review only runs after reviewDays since the last rank change. A change resets the clock; no change does not.
export function reviewRank(
  m: Member, rep: number, guildSkills: number[], today: number, rules: GuildRules,
): RankEvent {
  if (today < m.lastRankChange + rules.reviewDays) return "none";
  let next = computeRank(rep, guildSkills, rules);
  if (next < 0 && rules.neverExpel) next = 0;
  if (next === m.rank) return "none";
  const event: RankEvent = next > m.rank ? "promote" : next < 0 ? "expel" : "demote";
  m.rank = next;
  m.lastRankChange = today;
  return event;
}

// Perks scale with rank in 8-bit fixed point, as the donor does (integer division, then >> 8).
export function rewardScaled(rank: number, reward: number): number {
  return (Math.trunc(((10 + rank) << 8) / 10) * reward) >> 8;   // +10% per rank
}

export function repairScaled(rank: number, price: number): number {
  return (Math.trunc(((10 - rank) << 8) / 10) * price) >> 8;    // -10% per rank
}

// Service gates are plain rank thresholds, as in the donor's CanAccessService switches.
export const serviceMinRank = { library: 2, buyMagicItems: 3, hallAnytime: 6 } as const;

export {};
```

## 5. Lands in

- TARGET `origins/progression/guildRank.ts` (new, server side). The ladder, the review, and the perk scales are progression data; the fight does not read them.
- Parity row: 18 (loot roll and XP award), the nearest row, because the donor scales a questing reward by rank (Item.cs 419). Plain statement: no row covers the rank ladder or guild service permissions, so this is a stretch; Lead should decide whether to add a row for guild rank and permissions.
- today: (not read) for Frankendom; this pass did not read Frankendom's progression or reward code.
- Reuse tag: adapt (MIT: code may be adapted; the sketch is rewritten from the mechanism and keeps only the shape)
- Brief rule served: 1 (one engine: the rank is computed in the engine, not in a window); server-verified (the review reads the server ledger; the client only shows the result); zones as data (bars, perk scales and service gates are data). Rules 7-9 n/a.

## 6. Gaps and risks

- The donor runs the review on the client, at window push (popup 164). A rank can change because the player opened a screen, and a player who never opens the guild is never reviewed. Frankendom's server-verified ruling means the review must run on the server, on a clock or at login, and the window may only read the result.
- Reputation and skills come from the client-side player entity (Guild.cs 124 `playerEntity.Skills.GetPermanentSkillValue`; 162 `FactionData.GetReputation`). The port must read them from the server ledger.
- Skill shortfall expels, it does not demote. When rank 0's bars fail, `computeRank` returns -1 (111-115), and `UpdateRank` treats -1 as an expulsion (87-89). Frankendom must choose: expel, clamp to 0 (the Thieves and Dark Brotherhood policy), or demote. The sketch makes this a rule flag (`neverExpel`).
- Clock units: the 28 days are in-game world days (79). Frankendom needs a server clock with a stated unit; the donor's day count is not a real-time clock.
- Membership is a dictionary per guild group with a separate vampire dictionary (GuildManager.cs 105-111). Frankendom's one-character one-ledger ruling means one membership list per character; drop the vampire split.
- Fixed-point rounding: rank 3 gives 1.296875, not 1.3, and 0.69921875, not 0.7 (hand arithmetic). Frankendom should use integer basis points with a stated rounding rule, and test the chosen values.
- The rank ladder has no party, chat, or friend-list code. It covers only rank, permission, and reward scaling; do not claim it covers social state sync.
- Not read: NonMemberGuild.cs, Temple.cs, KnightlyOrder.cs, the token text, and the quest code that calls `AddMembership` beyond the Thieves Guild initiation branch (GuildManager.cs 53-60). Their own rank rules may differ.
