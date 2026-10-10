# ModernUO (quests-dialogue, cell 12)

Donor: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/ML Quests/MLQuestEntry.cs` (with `MLQuest.cs`, `MLQuestSystem.cs`, `MLQuestContext.cs`, `Objectives/BaseObjective.cs`, `Objectives/KillObjective.cs`, `Rewards/ItemReward.cs`; kill hook in `Projects/UOContent/Mobiles/BaseCreature.cs`) | Licence: GNU GENERAL PUBLIC LICENSE, Version 3, 29 June 2007 (LICENSE file; header "Copyright 2019-2020 ModernUO Development Team") | C# | symbols `MLQuestInstance.ContinueReportBack`, `MLQuestInstance.ClaimRewards`, `MLQuestInstance.CheckComplete`, `MLQuestSystem.HandleKill`

Checked: The hint file (`Projects/UOContent.Tests/Tests/Engines/ML Quests/Packets.cs`) is a race-changer packet class (`RaceChanger`), not the mechanism. The real implementation is the ML Quests engine (`UOContent/Engines/ML Quests/`). Depth is full for the quest state machine: I read the instance lifecycle end to end (MLQuestEntry.cs 1-234 and 278-500; MLQuest.cs 31-80, 113-239; MLQuestContext.cs 1-307 in full; MLQuestSystem.cs 511-551 and 14-20; BaseObjective.cs 1-186 in full; KillObjective.cs 1-146 in full; BaseCreature.cs 3344-3457 and 3548-3650; Utility.cs 890). Partly read: ItemReward.cs 1-60 (item creation only); BaseReward.cs in full. Candidates opened: MLQuestEntry.cs, MLQuest.cs, MLQuestContext.cs, MLQuestSystem.cs, BaseObjective.cs, KillObjective.cs, BaseReward.cs, ItemReward.cs, BaseCreature.cs, Utility.cs, the hint file. Not read: `Definitions/*.cs` (the quests themselves), the Collect, Deliver and Escort objective bodies (so the `OnBeforeClaimReward` veto that they may return is not known), the report-back and reward gumps (MLQuestEntry.cs 234-277), persistence (MLQuestPersistence.cs), and the classic `Engines/Quests/Core` system (QuestSystem.cs, QuestConversation.cs). Dialogue: ML quests carry per-quest text fields (`RefusalMessage`, `CompletionNotice`) and send fixed gumps for offer, progress and report-back (MLQuest.cs 213-216; MLQuestEntry.cs 234-277 call sites only). No branching dialogue tree was read; that part of the topic is not covered by this note.

## 1. Mechanism

- Accept. `MLQuest.OnAccept` checks `CanOffer` and then creates the instance (MLQuest.cs 189-201). The instance builds one objective state per quest objective definition (MLQuestEntry.cs 36-49), records `Accepted = Core.Now` (33), and registers itself on the quest and on the player's context (101-109). If any objective is timed, its end time is now plus its duration (BaseObjective.cs 33-36), and a repeating 5 second timer starts (MLQuestEntry.cs 53-56).
- Offer gate. `CanOffer` refuses when the player holds 10 quests (MLQuestSystem.cs 17; MLQuestContext.cs 85), when a one-time quest is done (MLQuest.cs 139-149), or when a restart cooldown has not passed (151-160). It then asks every objective's `CanOffer` (173-179).
- Kill progress. A creature death walks the damage-based looting-rights list (BaseCreature.cs 3550-3563). For each credited player (3630), and only when `MLQuestSystem.Enabled` is set (3632), it calls `MLQuestSystem.HandleKill` (3634). `HandleKill` walks the player's instances from the newest, skips instances already waiting to claim (MLQuestSystem.cs 524-531), and for each non-expired kill objective calls `AddKill` (537-543). The first counted kill in an instance triggers `CheckComplete` and leaves that instance's objective loop (545-547). So one kill can count for several quests but only once per quest.
- `AddKill` (KillObjective.cs 90-120). An accepted type matches by `IsAssignableFrom`, so subtypes count (96). If the quest has an area, a killer outside it is not counted (98). `Slain` goes up by one (105). Completion is `Slain >= DesiredAmount` (122).
- Completion. `IsCompleted` (MLQuestEntry.cs 136-156) requires all objectives when the type is All, and any one when it is Any. The default is All (MLQuest.cs 35). `CheckComplete` (158-185) plays a sound, calls `OnQuestCompleted` on each objective, sends the completion notice, and only runs the claim gate at once when there is no completion text and no collection (180-183). Otherwise the claim waits for the quester.
- Claim gate, `ContinueReportBack` (278-351). For All: first every objective must be complete (285-291); then every objective's `OnBeforeClaimReward` is asked, and any false returns with nothing changed (293-299); only then `OnClaimReward` runs on all (301-304). For Any: only the first complete objective is claimed (314-326). Then `ClaimReward = true` (334). If the quest has a restart delay, the cooldown is written now as `Core.Now + GetRestartDelay()` (336-339). `OnAfterClaimReward` runs last (342-345).
- Expiry, `Slice` (192-232). Every 5 seconds: a timed objective past its end time is marked expired and gets `OnExpire` (205-215). The quest fails when the type is All and any objective expired, or when no objective is left (223-226). The timer stops once the claim flag or removal is set, or when nothing is left (194-198, 228-231). `Fail()` sets the `Failed` flag (187-190); what reads that flag was not read.
- Reward claim, `ClaimRewards` (353-442). Each reward builds its items (360-365). Each item is placed in the backpack in turn (373-380). If any placement fails, every created item is deleted, the full-pack message is sent, and the method returns with the claim flag still set, so the quest stays claimable (382-392). On success: the reward messages (394-407), each objective's `OnRewardClaimed` (410-413), the quest's `OnRewardClaimed` (415), the done record for quests without a restart delay (419-422), removal from chain offers and an offer for the next quest (424-439), then `Remove()` (441).
- Death. `OnPlayerDeath` passes the event to each objective and to the quest (489-497); `MLQuestContext.HandleDeath` calls it for each instance (MLQuestContext.cs 183-189). What the quest hooks do was not read.
- Restart delay. The default is `TimeSpan.FromSeconds(Utility.Random(1, 5) * 30)` (MLQuest.cs 239). `Utility.Random(from, count)` returns `BuiltInRng.Next(from, count)` (Utility.cs 890), so the count is exclusive: 1 to 4, giving 30, 60, 90 or 120 seconds. Quests can override `GetRestartDelay`.

## 2. Key functions

- `MLQuestInstance` constructor: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/ML Quests/MLQuestEntry.cs` 25-57. Objective states, accept time, timer start.
- `MLQuestInstance.CheckComplete`: same file, 158-185. Completion effects and the auto-claim branch.
- `MLQuestInstance.ContinueReportBack`: same file, 278-351. The two-phase claim gate with vetoes, the cooldown write, and the claim flag.
- `MLQuestInstance.Slice`: same file, 192-232. The 5 second expiry and the fail rule.
- `MLQuestInstance.ClaimRewards`: same file, 353-442. All-or-nothing reward placement, then done record, chain, removal.
- `MLQuestSystem.HandleKill`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/ML Quests/MLQuestSystem.cs` 511-551. Kill credit to each instance and objective.
- `KillObjectiveInstance.AddKill`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/ML Quests/Objectives/KillObjective.cs` 90-122. Type, area, count.
- `MLQuest.CanOffer`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/ML Quests/MLQuest.cs` 116-182. Offer gate and cooldown.
- Kill hook and looting rights: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/BaseCreature.cs` 3344-3457 (`GetLootingRights`) and 3548-3650 (the death loop that calls `HandleKill`).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Quest instance holds one state per objective; ALL needs every objective, ANY needs one | Default ALL (MLQuest.cs 35) |
| Concurrent quest limit | 10 (MLQuestSystem.cs 17) |
| Expiry check period | 5 s wall clock timer (MLQuestEntry.cs 55) |
| Timed objective end | now + Duration (BaseObjective.cs 35) |
| Kill count | `Slain >= DesiredAmount` (KillObjective.cs 122); increments by 1 per counted kill (105) |
| Restart cooldown | `Utility.Random(1, 5) * 30` seconds, i.e. 30 to 120 (MLQuest.cs 239; Utility.cs 890) |
| Kill credit threshold for the death loop (not this cell's topic) | top credited damage divided by 16 for monsters with 3000 or more max hits, 8 for 1000 or more, 4 for 200 or more, 2 otherwise (BaseCreature.cs 3436-3444); first damager gets x1.25 first (3428) |

## 4. TypeScript sketch

simplified: the sketch keeps the ALL-mode completion, the veto pass before any effect, the cooldown written at the claim gate, the all-or-nothing reward write, the once-per-quest kill credit, and the expiry rule. It omits the ANY mode (the donor claims only the first complete objective), the gumps, chain offers, cancellation, death, and the area check's position source (the sketch takes x and y as arguments). It replaces the donor's wall-clock `Core.Now` with a tick argument, as Frankendom's server tick requires. The donor's `AddKill` returns false for an out-of-area kill, which stops only that objective; the sketch does the same by continuing to the next objective.

```ts
// Licence: GPL-3.0 (ModernUO). Clean-room sketch of the shape only; not a translation of the donor.
interface Objective {
  needed: number;
  slain: number;
  endTick: number | null; // timed objectives only
  expired: boolean;
  accepts: (type: string) => boolean;
  inArea: (x: number, y: number) => boolean;
}

interface QuestDef {
  id: string;
  restartTicks: number;
  placeRewards: (playerId: string) => boolean; // all-or-nothing: place every reward or none
}

interface Instance {
  def: QuestDef;
  playerId: string;
  objectives: Objective[];
  claimable: boolean;
  failed: boolean;
  removed: boolean;
  nextAvailableTick: number; // restart cooldown, set at the claim gate
}

const done = (o: Objective): boolean => o.slain >= o.needed;

// One kill counts at most once per quest instance; a failed area check falls through to the next objective.
function creditKill(inst: Instance, type: string, x: number, y: number): boolean {
  for (const o of inst.objectives) {
    if (o.expired || !o.accepts(type)) continue;
    if (!o.inArea(x, y)) continue;
    o.slain += 1;
    return true;
  }
  return false;
}

// Phase 1 checks every veto with no effect. Phase 2 runs only after all vetoes passed.
function advanceToClaimable(inst: Instance, nowTick: number, vetoes: Array<() => boolean>): boolean {
  if (inst.removed || inst.claimable || inst.failed) return false;
  if (!inst.objectives.every(done)) return false;
  for (const veto of vetoes) {
    if (!veto()) return false;
  }
  inst.claimable = true;
  inst.nextAvailableTick = nowTick + inst.def.restartTicks;
  return true;
}

// The reward write either places everything or changes nothing; the stage only moves after it succeeds.
function collectReward(inst: Instance): 'ok' | 'reward-refused' | 'not-claimable' {
  if (!inst.claimable || inst.removed) return 'not-claimable';
  if (!inst.def.placeRewards(inst.playerId)) return 'reward-refused';
  inst.removed = true;
  return 'ok';
}

// Expiry check. The donor runs this every 5 s of wall time; here it runs on the server tick.
function slice(inst: Instance, nowTick: number): void {
  if (inst.claimable || inst.removed) return;
  let anyFail = false;
  let anyLeft = false;
  for (const o of inst.objectives) {
    if (o.expired) continue;
    if (o.endTick !== null && o.endTick <= nowTick) {
      o.expired = true;
      anyFail = true;
    } else {
      anyLeft = true;
    }
  }
  if (anyFail || !anyLeft) inst.failed = true;
}

const inst: Instance = {
  def: { id: 'north-gate-wolves', restartTicks: 300, placeRewards: () => true },
  playerId: 'p1',
  objectives: [
    { needed: 2, slain: 0, endTick: null, expired: false, accepts: t => t === 'wolf', inArea: (x, y) => x < 100 && y < 100 }
  ],
  claimable: false,
  failed: false,
  removed: false,
  nextAvailableTick: 0
};
creditKill(inst, 'wolf', 10, 10);
creditKill(inst, 'wolf', 10, 10);
const claimed = advanceToClaimable(inst, 1000, []);
const paid = collectReward(inst);
slice(inst, 1001);
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/qd004tc/quest_claim_gate.ts`).

## 5. Lands in

- TARGET `origins/server/quest-instance.ts` (new): the server quest instance (objective states, claim gate, expiry, reward write). Not in `src/fight/`: quest state is not a fight step.
- Parity row: 18 (loot roll and XP award). The reward claim is the award path (one ledger write, all-or-nothing). The kill credit that feeds the objective comes from the death event; row 18 is the closest row for that too. The donor has no quest-dialogue row.
- today: not checked (the Frankendom repo was not read in this pass).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room, shape only)
- Brief rule served: one ledger (the reward is one write that commits with the stage or not at all); server-verified (kills counted from the server death path); zones as data (objective areas, counts and durations are data fields); rules 7-9 n/a

## 6. Gaps and risks

- Wall clock. The donor times objectives with `Core.Now` (MLQuestEntry.cs 33; BaseObjective.cs 35; 207) and checks them every 5 seconds (55). A timed quest can fail up to 5 seconds late. Frankendom must use the server tick.
- Rewards are items. `ItemReward` builds an item and places it in the backpack (ItemReward.cs 49-55; MLQuestEntry.cs 360-392). The donor has no currency or XP ledger. Frankendom pays through the one ledger, so the reward write and the stage change must commit together. The donor's delete-on-failure path (386) is the item version of that rule.
- Cooldown timing. The cooldown is written at the claim gate (MLQuestEntry.cs 336-339), before the reward is collected. A player who never collects still waits. Frankendom must choose; the donor's answer is "cooldown starts at claim".
- Veto ownership. The donor asks every objective to veto (295), but the objectives that veto (Collect, Deliver, Escort) were not read. Frankendom's check-then-effect rule needs its own list of vetoes.
- Kill credit uses the death position check only through `Area.Contains(mob)` at the time of `AddKill` (KillObjective.cs 98); the donor does not check the kill against an event tick. Frankendom must check the killer's zone at the server kill tick.
- Kill credit reaches a player only through the looting-rights list: a damage share at or above the monster-HP threshold (BaseCreature.cs 3438-3450). Quest credit therefore depends on the loot rule, not on a separate quest rule. That rule belongs to the loot and XP cell, not this one; read it there. The 1.25 first-damager bonus (3428) matters for MAX_ATTACKERS = 3 many-on-one fights.
- Timed failure. `Fail()` sets a flag (MLQuestEntry.cs 187-190) and what reads it was not read. Frankendom must define what a failed instance does (remove, or keep a visible failed state).
- No dialogue tree in this engine. Text is fixed per quest (RefusalMessage, CompletionNotice) and sent in gumps. Branching talk for Frankendom must come from another source.
- Not read: `Definitions/*.cs`, the Collect, Deliver and Escort objective bodies, the report and reward gumps (MLQuestEntry.cs 234-277), MLQuestPersistence.cs, and the classic `Engines/Quests/Core` system (QuestSystem.cs 742 lines; QuestConversation.cs 155 lines).

Best transferable idea: a quest is an instance with per-objective state, and the claim is two-phase: every objective can veto before any effect runs, and the reward write either fully places or changes nothing.
Decision (proposed): adapt — Frankendom needs the quest as a server instance with a check-then-effect claim and once-per-quest kill credit, but its rewards go through the one ledger and its timers run on the server tick, not on wall clock; keep the veto pass, the cooldown written at claim, and the all-or-nothing write.
Acceptance: A quest "clear 2 wolves in the north gate" counts only wolves killed inside the gate; a third wolf outside the gate is not counted; with 2 counted kills the completion notice shows; a test forces the ledger write to fail and the quest stays claimable with no stage change; a second accept inside the cooldown is refused.
