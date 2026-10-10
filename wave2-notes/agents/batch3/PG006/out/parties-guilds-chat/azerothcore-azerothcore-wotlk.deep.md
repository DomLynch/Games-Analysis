# azerothcore-azerothcore-wotlk (parties-guilds-chat, cell 3)

Donor: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Guilds/Guild.cpp` (with `Guilds/Guild.h`, `Guilds/GuildMgr.cpp`, `World/World.cpp`, `Handlers/GuildHandler.cpp`) | Licence: GPL-2.0 (LICENSE is GPL version 2, June 1991; file headers read "either version 2 of the License") | C++ | symbol `Guild::HandleMemberWithdrawMoney`

Checked: The hint file (`e2e/suites/guild/charter_bank/guild_e2e_test.go`, 81 lines) is a test that asserts the charter turn-in; it holds no mechanism and was read only for its header and first assertions. The mechanism is the guild bank daily cap. Read in full for the gold path: `Guild.cpp` 1742-1800 (withdraw), 2586-2642 (rank rights and remaining money), 3005-3011 (reset), 650-681 (member counters); `GuildMgr.cpp` 407-414 (global reset); `World.cpp` 1207-1210, 1948-1956 (reset trigger and next time); `GuildHandler.cpp` 320-330 (entry point). Read in part for items: `Guild.cpp` 836-870 (item-removal counter and withdraw check) and 2615-2653 (slots); `Guild.h` 40-56, 74-96, 185-194, 265-293. Not read: the day/hour function behind `GetNextTimeWithDayAndHour`, the item move path at 2741-2770, the rank data loader, and the log tables. Candidates: `Guild.cpp` (charter path not read), `GuildMgr.cpp`, `World.cpp`, `GuildHandler.cpp`. Confidence: high on the gold path (order and numbers receipted); medium on the item-slot path (read in part). Camera: not applicable.

## 1. Mechanism

A guild bank has a daily cap per rank for gold, and a daily cap per tab for items. Each member has one counter per cap. The counters reset for every guild at the same daily time.

- **Entry (`GuildHandler.cpp` 325-327).** The request must name a guild bank object the player can interact with (the check at 325), then `HandleMemberWithdrawMoney` runs.
- **Order of checks inside `HandleMemberWithdrawMoney` (`Guild.cpp` 1742-1786).**
  1. Clamp the amount to the maximum money value (1745).
  2. The bank must hold at least that much (1747).
  3. The member must be in the guild (1752-1754).
  4. The member's remaining money today must cover the amount (1756). Remaining money is zero unless the rank has the repair or gold right (2635); otherwise it is the rank's daily money minus the member's used amount (2637). The guild master's remaining money is unlimited (2632-2633).
  5. A repair draw needs the repair right (1759).
  6. The bank is debited first, inside a transaction (1765-1767). If the player is credited (1772) the gold is saved (1778). If the credit fails, the bank is credited back (1774) and the call returns false.
  7. The member's counter for money is increased by the amount (1782). Repairs also increase it, though the player receives nothing (1770-1779 skip the credit for a repair).
  8. The event is logged (1785) and the transaction commits (1786).
- **Items (`Guild.cpp` 866, 2644-2653).** When an item leaves a tab, `_UpdateMemberWithdrawSlots` adds 1 to that tab's counter, only if the counter is below the rank's slot cap for the tab. The call (866) runs after the split-or-remove branch, and only when the move does not stay in the same tab; a split stack therefore counts as one slot.
- **Reset (`Guild.cpp` 665-668, 3005-3011; `GuildMgr.cpp` 407-413; `World.cpp` 1207-1210, 1948-1956).** The world update calls `ResetGuildCap` when the current game time passes `_nextGuildReset` (1207). That sets the next reset with `GetNextTimeWithDayAndHour(-1, 6)` (1952), then calls `GuildMgr::ResetTimes` (1955). That zeroes every member's counters for every guild (`Guild::ResetTimes`, `Member::ResetValues`) and truncates the `guild_member_withdraw` table (413).
- **Rights.** Rank rights are a bit set (`Guild.h` 74-96; the gold right is `GR_RIGHT_WITHDRAW_GOLD`, 92). Bank tab rights are bits too (185-190). A tab's slot count is zero unless the view-tab right is set (2620).

Tick: not a loop. The check runs when a member asks. The reset is a daily event driven from the world update.

## 2. Key functions

- `Guild::HandleMemberWithdrawMoney`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Guilds/Guild.cpp` 1742-1800.
- `Guild::_GetMemberRemainingMoney`: same file, 2629-2642. Rank rights and the daily cap.
- `Guild::_GetMemberRemainingSlots`: same file, 2615-2627. Per-tab item cap.
- `Guild::Member::UpdateBankWithdrawValue`: same file, 650-663. One counter write, inside the caller's transaction.
- `Guild::Member::ResetValues` and `Guild::ResetTimes`: same file, 665-669 and 3005-3011.
- `GuildMgr::ResetTimes`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Guilds/GuildMgr.cpp` 407-414.
- `World::ResetGuildCap` and the update check: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/World/World.cpp` 1207-1210, 1948-1956.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Per-rank daily gold cap, per member | Value held per rank (`RankInfo`, `Guild.h` 512-519; the loader that sets it was not read); unlimited for the guild master (sentinel at `Guild.h` 48, used at 519). |
| One counter per member per day | One counter per tab and one for money, with the money slot at `GUILD_BANK_MAX_TABS` = 6 (`Guild.h` 40-46; `Guild.cpp` 1782). |
| Daily reset time | 06:00, via `GetNextTimeWithDayAndHour(-1, 6)` (`World.cpp` 1952). The function itself was not read. |
| Daily reset of counters | Zero all counters for all members of all guilds, then truncate the withdraw table (`GuildMgr.cpp` 411-413). |
| Gold right gate | `GR_RIGHT_WITHDRAW_GOLD` (`Guild.h` 92) or `GR_RIGHT_WITHDRAW_REPAIR` (`Guild.cpp` 2635). |
| Item slot cap per tab | Per rank, per tab (`_GetRankBankTabSlotsPerDay`, `Guild.cpp` 2622), counted per removal (866). |
| Money input clamp | `MAX_MONEY_AMOUNT` (`Guild.cpp` 1745). |

## 4. TypeScript sketch

simplified: keeps the gold path in the donor's order: bank has enough, daily cap has room, debit the bank, credit the player (roll back the bank if refused), then count the withdrawal against the member's day, with one reset for all members. It omits the repair path (which counts against the same cap and is not credited to the player), the item-slot counter and tab rights, the guild-master sentinel handling beyond a flag, the money clamp, the banker range check, the transaction and the event log, and the global truncation of the withdraw table. It does not reorder the donor's checks.

```ts
// Licence: GPL-2.0 (donor). Clean-room: shape only, written from the described mechanism.
export interface Rank {
  isLeader: boolean;      // guild master: unlimited
  canWithdrawGold: boolean;
  goldPerDay: number;     // daily cap for this rank
}

export interface MemberCounter {
  usedGoldToday: number;  // reset once a day for every member
}

export interface Bank {
  gold: number;
}

// Remaining gold this member may still take today.
export function remainingGold(rank: Rank, m: MemberCounter): number {
  if (rank.isLeader) return Infinity;
  if (!rank.canWithdrawGold) return 0;
  const left = rank.goldPerDay - m.usedGoldToday;
  return left > 0 ? left : 0;
}

// Order: bank has enough, daily cap has room, debit bank, credit player (roll back if refused),
// then count the withdrawal against the member's day. One call, one ledger.
export function withdrawGold(
  bank: Bank,
  rank: Rank,
  m: MemberCounter,
  amount: number,
  credit: (n: number) => boolean,
): boolean {
  if (amount <= 0) return false;
  if (bank.gold < amount) return false;
  if (remainingGold(rank, m) < amount) return false;
  bank.gold -= amount;
  if (!credit(amount)) {
    bank.gold += amount; // roll back the bank side
    return false;
  }
  m.usedGoldToday += amount;
  return true;
}

// Daily reset: zero every member's counter (the world calls this when the day boundary passes).
export function dailyReset(members: MemberCounter[]): void {
  for (const m of members) m.usedGoldToday = 0;
}

export {};
```

## 5. Lands in

- TARGET `origins/server/guild-bank.ts` (new, only if Frankendom has a guild chest). The daily cap is a server-side check; the client only shows the remaining amount.
- Parity row: none fits. A guild chest with daily caps is not in parity rows 1-23. The nearest row is 18 (loot roll and XP award) and it does not cover a bank.
- Reuse tag: rewrite-from-idea (GPL-2.0: clean-room, shape only).
- Brief rule served: one ledger (the bank and the member's counter move in one call and one transaction) and server-verified state (the cap is checked on the server, not in the client).
- Best transferable idea: a per-rank daily cap on how much a member may take out of a shared chest, with one counter per member, a check before the debit, a rollback if the player credit fails, and one global reset time.
- Decision (proposed): adapt. Keep the gold cap, the counter, the order of checks and the single daily reset; drop the item-slot counter, which counts removals rather than items, and drop the repair path. Why: a daily cap on shared gold is a useful anti-dump rule for a guild chest, but only if Frankendom builds one; if it does not, this is rejected.
- Acceptance: a server test with a rank cap of 500 gold: a withdraw of 300 succeeds; a second withdraw of 300 is refused with the bank unchanged; a withdraw of 200 succeeds; after the daily reset the full 500 is available again; and a withdraw whose player credit fails leaves the bank and the counter unchanged.

## 6. Gaps and risks

- **Counts removals, not items, for items.** `_UpdateMemberWithdrawSlots` adds 1 per removal call (`Guild.cpp` 866, 2651), so a split stack counts as one slot, and the check is `remaining != 0` (`HasWithdrawRights`, 836-847). Frankendom should count units if it ever caps items.
- **Repair spends the same daily cap.** `UpdateBankWithdrawValue` runs for repairs (1782), but the player is not credited (1770-1779). A repair therefore uses the member's gold cap and the bank's money, and the player gets nothing. This may be intended; it is not stated in the code.
- **Reset is global and time-based.** One next-reset time is shared by all guilds (`World.cpp` 1952), and the reset is driven by the world update (1207). Every member's cap refreshes at the same instant, so a burst of withdrawals right after the reset is possible (inference from the code; not tested). Frankendom should pick a reset per server or zone as data and say so in the design.
- **Time function not read.** The 06:00 reset depends on `GetNextTimeWithDayAndHour`, which was not read; its time zone and DST behaviour are unknown.
- **Guild master is special-cased in four places** (`Guild.cpp` 677, 2618, 2632, 2649). Frankendom should express the unlimited case as a rank flag, once.
- **Single-writer assumption.** The check at 1756 and the write at 1782 are separate steps in one call on the world thread. The donor does not guard them against a second request arriving on another thread; the world loop is single-threaded here, but this was not verified across handlers.
- **Licence.** GPL-2.0: clean-room only; the sketch is written from the mechanism.
- **Not in Frankendom's rulings.** The donor is a chest with tabs and item rights. Frankendom has no guild model yet; the cap is only worth copying if a guild chest is built.
