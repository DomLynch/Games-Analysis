# kcopelandmgmt-Shadowbane (pvp-ranking-seasons-matchmaking, cell 3)

Donor: `/mnt/frankendom-donors/kcopelandmgmt-Shadowbane/src/engine/objects/Shrine.java` (favour math, rank, take, decay), with the daily tick in `/mnt/frankendom-donors/kcopelandmgmt-Shadowbane/src/engine/workthreads/HourlyJobThread.java` 36-74 and 186-260, the boon request in `/mnt/frankendom-donors/kcopelandmgmt-Shadowbane/src/engine/net/client/handlers/MerchantMsgHandler.java` 160-211, the leaderboard in `/mnt/frankendom-donors/kcopelandmgmt-Shadowbane/src/engine/net/client/msg/LeaderboardMessage.java`, and the cash-out in `/mnt/frankendom-donors/kcopelandmgmt-Shadowbane/src/engine/gameManager/BuildingManager.java` 178-222 | Licence: MIT (repo `LICENSE` line 9: "MIT License"; code may be adapted, keep the copyright notice) | Java | symbols `Shrine.decay`, `Shrine.takeFavor`, `HourlyJobThread.decayShrines`, `MerchantMsgHandler.requestBoon`

Checked: Opened `Shrine.java` 1-120 and 150-353 (lines 121-149, the middle of the promotion-class switch, not read; the gate's shape is clear from the cases read), `HourlyJobThread.java` 1-100, 186-289 (run, decayShrines, hourly tail), `MerchantMsgHandler.java` 140-211, `LeaderboardMessage.java` 1-104, `BuildingManager.java` 170-251, `ManageCityAssetMsgHandler.java` 140-185, `dbShrineHandler.java` 100-120, `dbBoonHandler.java` 25-50, `Boon.java` 21-59, `Enum.java` 1492-1571 (ShrineType), `WorldServer.java` 200-240, `MBServerStatics.java` 381, and the LICENSE. Callers, from grep and reads: `Shrine.decay` has one caller (HourlyJobThread 69); `takeFavor` one caller (MerchantMsgHandler 184); `addFavor` one caller seen by grep (ObjectActionMsgHandler 377, not read in full); `lootBuilding` two callers (ManageCityAssetMsgHandler 157, 179). Not read: `PowersManager.applyPower` with a trains value of 0 or below (so I cannot say whether a rank-4+ boon does anything), the meaning of building rank -1 (the state that allows looting), `claim()`, `ChatManager`, and the boon contents (the table `static_item_boons` is not in the donor box; only its SELECT is). Confidence: high on the favour, decay, boon and cash-out order (read directly); medium on how the boon power behaves at zero length. camera_scope: not applicable.

Best transferable idea: Score each zone point by a favour total, decay only the current leaders each day so the lead has to be defended, and pay the boon length by rank (40, 30, 20, 10, then nothing) with the favour spent per use.

Decision (proposed): adapt - keep the favour meter, the leader-only daily decay, the rank-scaled boon length and the cash-out; move the favour onto zone rows (zones as data, one engine), pay cash-out through the loot path, and fix the four defects in section 6 (spend order, positivity guard, memory-only cash-out, decay log). Reject the item-currency wording (the donor pays "elan" items; Frankendom pays XP and loot only).
Acceptance: A server test: after a daily tick, a shrine with 100 favour in the top two of its type drops to 90, a shrine outside the top two keeps its total, and a cash-out writes 0 to the stored row before any loot item is created; a second take at 0 favour is refused by the server, not by the client.

## 1. Mechanism

- Score: each shrine holds an integer favour total (`Shrine.favors`). A player places a boon item on it (`addFavor`, synchronized, Shrine.java 249-292): the item's boon amount for that shrine type is multiplied by the number of items in the stack (278), the ownership check is done first (262), the total is written with a compare-and-set on the old value (`updateFavors`, dbShrineHandler.java 106-120: `UPDATE ... WHERE UID = ? AND shrine_favors = ?`), then the item is deleted.
- Rank: shrines of one type are sorted by favour, highest first (Shrine.java 312, Enum.java 1549-1553); `getRank` is the index in that sorted list (Shrine.java 316). The leaderboard request (MerchantMsgHandler.java 426, LeaderboardMessage.java 58-62) sends each type in rank order with each shrine's favour total and the owning guild. It is a snapshot on request, not a push.
- Daily tick: `WorldServer` starts the hourly job at the top of each hour (WorldServer.java 229, 232). `HourlyJobThread.run` calls `decayShrines` only when the hour equals `MINE_LATE_WINDOW`, which is 0 (HourlyJobThread.java 259-260; MBServerStatics.java 381). In `decayShrines` (36-74): first every shrine's building is re-claimed for its city's owner if they differ (46-52); then the shrines whose rank is 0 or 1 are collected (56-60), and each is decayed once (66-73).
- Decay: `new = (int)(f - f * 0.10f)`, floored at 0 (Shrine.java 229-247). Because of the truncation, the amount lost is the ceiling of 10 percent of f: 10 becomes 9, 11 becomes 9. The new value is written with a compare-and-set, then the in-memory field is set (243).
- Take (boon request): `requestBoon` (MerchantMsgHandler.java 160-211), in order: the building must be a shrine whose rank is not -1 (161-162); the favour must not be 0 (169); the player must not already have the shrine's token (176); `canTakeFavor` must pass (181; Shrine.java 44-202: if the shrine type is a race shrine, the grantee's race ID must match one of its race cases; otherwise the grantee's promotion class ID must match a class shrine case); `takeFavor` spends one favour (184, Shrine.java 294-308); the power is looked up (187) and a missing power prints an error (189-192).
- Boon length: `rank = shrine.getRank()` (194). If the city's TOL rank is 8 and rank is not 0, rank becomes 1 (196-198). `trains = 40 - rank * 10`, floored at 0 (199-201). The power is applied with `trains` (204).
- Cash-out: `lootBuilding` for a shrine (BuildingManager.java 193-222): the amount is the favour total (198); amount 0 is refused (200-208); the room check and the payout item (elan, id 1705032, count = amount) are made (210-219); then `setFavors(0)` (221). The caller checks the building rank is -1 and the favour is above 0 (ManageCityAssetMsgHandler.java 141-155).
- Numbers worked by hand from the code: a shrine at rank index 0 gives 40 trains, index 1 gives 30, index 2 gives 20, index 3 gives 10, index 4 and beyond give 0. A top-two shrine with 100 favour goes to 90 after one tick; with 11 it goes to 9.

## 2. Key functions

- `Shrine.addFavor`: `/mnt/frankendom-donors/kcopelandmgmt-Shadowbane/src/engine/objects/Shrine.java` 249-292. Deposit: boon amount times item count, CAS write, item deleted.
- `Shrine.decay`: Shrine.java 229-247. Daily 10 percent loss, rounded up.
- `Shrine.takeFavor`: Shrine.java 294-308. One favour out, CAS write. No positivity check (defect 1).
- `Shrine.canTakeFavor`: Shrine.java 44-202. Race or class gate: the shrine type decides which switch runs (`isRace()`, line 46), and the switch matches the grantee's race ID or promotion class ID to that shrine type.
- `HourlyJobThread.decayShrines`: HourlyJobThread.java 36-74. Re-claim, then decay the rank 0 and rank 1 shrines.
- `MerchantMsgHandler.requestBoon`: MerchantMsgHandler.java 160-211. The take, the rank floor for R8, the trains formula.
- `BuildingManager.lootBuilding`: BuildingManager.java 178-251. The cash-out, memory-only zeroing (defect 3).
- `LeaderboardMessage._serialize`: LeaderboardMessage.java 54-95. Snapshot of every shrine in rank order.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Score meter per zone point, filled by a deposit of a token item | Boon amount per item (static_item_boons, not in the donor box) |
| Leader-only decay once a day, the top two of each type | 10 percent per day; top 2 (theirs, HourlyJobThread.java 58, 64, Shrine.java 234) |
| Decay rounds the loss up | (int) of f minus f times 0.10f (theirs, Shrine.java 234) |
| Rank-scaled buff length | 40 - 10 x rank index, floored at 0 (theirs, MerchantMsgHandler.java 199-201) |
| Floor for the strongest city tier | R8 towns: any non-first shrine treated as index 1 (theirs, MerchantMsgHandler.java 196-198) |
| Daily window | Hour 0 (theirs, MBServerStatics.java 381; HourlyJobThread.java 259) |
| Cash-out converts the score to a reward and resets it | Reward item per favour (theirs, BuildingManager.java 210-221) |

## 4. TypeScript sketch

simplified: keeps the daily 10 percent decay of the top two (ranks taken before any decay), the rank-scaled boon length (40, 30, 20, 10, then 0) with the R8 floor, one favour per boon, and the cash-out that zeroes the total before paying. It reorders the donor's boon request: the donor spends the favour (184) before it looks up the power (187-192); the sketch checks the power first and spends last. It also adds the positivity check inside the take. It omits the race and class gate (the donor's switch is a lookup table; the sketch takes it as a boolean), the token check, the database compare-and-set (the sketch takes a `casWrite` callback for cash-out only), the claim of the building to the city owner, the chat messages and the leaderboard snapshot.

```ts
// Licence: MIT (donor LICENSE). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Shrine {
  favors: number;          // favour score for this shrine
}

const DECAY_PERCENT = 10;            // leaders lose 10% a day
const TRAINS_BY_RANK = [40, 30, 20, 10]; // boon length by rank index; ranks 4+ get 0

// Ranks a shrine within its type, highest favour first (donor: sorted by favour, descending).
function ranked(shrines: Shrine[]): Shrine[] {
  return [...shrines].sort((a, b) => b.favors - a.favors);
}

// Daily tick: the top two shrines of each type lose 10%. Ranks are taken before any decay (donor order).
function dailyDecay(shrines: Shrine[]): void {
  const top2 = ranked(shrines).slice(0, 2);
  for (const s of top2) {
    // Donor: (int)(f - f * 0.1), so the loss rounds up (ceil of 10% of f).
    const next = Math.trunc(s.favors - (s.favors * DECAY_PERCENT) / 100);
    s.favors = Math.max(0, next);
  }
}

// Boon request. Donor order: take the favour, then look up the power (a missing power leaves the favour spent).
// Fixed order: check favour > 0 under the lock, resolve the power, then spend.
function requestBoon(
  shrines: Shrine[],
  target: Shrine,
  hasBoonToken: boolean,
  classOrRaceMatch: boolean,
  powerExists: boolean,
  r8City: boolean,
): { granted: boolean; trains: number } {
  if (target.favors <= 0) return { granted: false, trains: 0 };
  if (hasBoonToken) return { granted: false, trains: 0 };
  if (!classOrRaceMatch) return { granted: false, trains: 0 };
  if (!powerExists) return { granted: false, trains: 0 };

  let rank = ranked(shrines).indexOf(target);
  // R8 towns: any non-first shrine is treated as index 1 (donor MerchantMsgHandler.java 196-198).
  if (r8City && rank !== 0) rank = 1;
  const trains = Math.max(0, TRAINS_BY_RANK[rank] ?? 0);

  target.favors -= 1; // spend one favour
  return { granted: true, trains };
}

// Cash-out: the favour total is paid out as items and reset. Persist the zero before paying (donor sets memory only).
function cashOut(
  target: Shrine,
  hasRoom: boolean,
  casWrite: (oldValue: number, newValue: number) => boolean,
): number {
  const amount = target.favors;
  if (amount <= 0) return 0;
  if (!hasRoom) return 0;
  if (!casWrite(amount, 0)) return 0;
  target.favors = 0;
  return amount; // one payout item per favour (donor: elan item count = favours)
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` run on the VPS (/tmp/PV001-shadowbane-shrine-favour.ts): exit 0.

## 5. Lands in

- TARGET `src/fight/zone-favour.ts` (new module: the per-zone favour meter, its daily tick, and the boon and cash-out rules, all server-side). Parity-checklist row 18 (loot roll and XP award), because the cash-out is a reward path. The boon length is a fight buff and belongs with row 13 (specials) if Frankendom wants it as a power; I used 18 for the reward.
- today: Frankendom's current zone or control-point code was not read (not read); this section is the target only.
- Reuse tag: rewrite-from-idea (MIT; code may be adapted with the copyright notice; this sketch is clean-room)
- Brief rule served: addendum "keep the idea, fix the defect" (Dom 2026-10-10): the idea is kept, the defects are fixed in the sketch; rulings "zones as data" (favour rates and decay are zone-row fields) and "server-verified" (the take, the cash-out and the decay run in the engine).

## 6. Gaps and risks

- DEFECT 1, no positivity guard on take (Shrine.java 294-302). The handler checks `getFavors() == 0` outside the lock (MerchantMsgHandler.java 169), then `takeFavor` is synchronized but subtracts without checking the result is at least 0 (300). Two players who both pass the handler check at 1 favour give -1. The compare-and-set (old value) does not stop it, because the old value is the current one. Fix: check `favors > 0` inside `takeFavor` under the lock (sketch `requestBoon`).
- DEFECT 2, favour spent before the power exists (MerchantMsgHandler.java 184-192). `takeFavor` runs before `PowersManager.getPowerByToken`; if the power is missing, the favour is gone and the player gets an error. Fix: resolve the power first, spend second (sketch order).
- DEFECT 3, cash-out does not persist (BuildingManager.java 221; Shrine.java 323-327). `lootBuilding` sets the favour to 0 in memory only, and `Shrine.updateDatabase()` is an empty stub. After a restart the old total is loaded again, so the same favour can be cashed out twice. Also, a later `takeFavor` or `addFavor` compares against the in-memory 0 while the row still holds the old total, so its compare-and-set fails and the shrine stops taking deposits until a restart (reasoned from the code; not run). Fix: a compare-and-set write of 0 before the payout (sketch `cashOut`).
- DEFECT 4, decay log (Shrine.java 245). The log prints `getFavors() * .10f` after the field is already the new total, so it prints 10 percent of what remains, not the amount lost. Fix: log the lost amount.
- RISK 5, decay is not synchronized (Shrine.java 229), unlike `addFavor` and `takeFavor`. The compare-and-set in the database stops a lost write, but the in-memory field has no volatile or lock, so another thread may read a stale total. Fix: make decay synchronized like the others.
- RISK 6, rounding up on decay (Shrine.java 234). A shrine with 1 favour drops to 0 in one tick, and a shrine with 9 drops by 1 (11 percent). Probably intended, not stated. Keep the percent and the rounding as data.
- RISK 7, rank 4 and beyond get 0 trains (MerchantMsgHandler.java 199-201). The donor still takes a favour for that boon, and whether `applyPower` with 0 trains does anything was not read. Frankendom must decide whether a fifth-place zone pays a boon at all, and must not charge for a boon that does nothing.
- Ruling: one ledger. The donor pays the favour out as an item (elan). Frankendom pays XP and loot only; the cash-out becomes a loot roll, not a currency.
- Ruling: server-verified. The donor checks ownership of a deposited item (Shrine.java 262) and the race or class gate on the server (MerchantMsgHandler.java 181). Frankendom keeps both checks on the server.
- The boon amounts come from a database table, `static_item_boons` (read by dbBoonHandler.java 34). The table is not in the donor box, so its values are not known here. In Frankendom they become zone or item data.
- Scope note: this is a guild or city control mechanic, not a player ladder. There is no elo, no matchmaking, no ping and no smurf control in this donor; the race and class gate is the only anti-misuse rule and it is about who may take a boon, not who may rank.
- Not read: `PowersManager.applyPower` behaviour at 0 trains; the meaning of building rank -1; `claim()`; the full race and class switch was read for shape only.
- Licence: MIT. Code may be adapted (the notice must stay with copies of the code). This sketch is clean-room from the mechanism, so it is not a copy.

Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
- No errors found.
- Missed (minor): Shrine.decay() early-returns when favors==0 (Shrine.java:231); no effect on the claims.
