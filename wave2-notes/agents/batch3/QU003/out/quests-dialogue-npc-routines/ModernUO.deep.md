# ModernUO (quests-dialogue-npc-routines, cell 2)

Donor: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/ML Quests/MLQuestEntry.cs` (with `MLQuest.cs`, `MLQuestSystem.cs`, `Objectives/`) | Licence: GNU GENERAL PUBLIC LICENSE Version 3 (LICENSE lines 1-3, copyright 2019-2020 ModernUO Development Team) | C# | symbols `MLQuestInstance.IsCompleted`, `MLQuestInstance.Slice`, `MLQuestInstance.ContinueReportBack`, `MLQuestInstance.ClaimRewards`, `MLQuestSystem.OnDoubleClick`, `MLQuestSystem.FindQuest`, `MLQuest.CanOffer`

Checked: Read end to end: `ML Quests/MLQuest.cs` 1-240 (fields, CanOffer chain walk, OnAccept, restart delay), `MLQuestEntry.cs` 10-234 and 278-500 (instance flags, constructor, IsCompleted, CheckComplete, Slice, ContinueReportBack, ClaimRewards, Cancel, Remove, death), `MLQuestSystem.cs` 17, 311-411 (FindQuest, OnDoubleClick), 511-597 (HandleKill, HandleDelivery), 616-625, 663-696 (RandomStarterQuest), `MLQuestContext.cs` 85 and 115-200 (done list, IsFull), `Objectives/BaseObjective.cs` (all), `Objectives/KillObjective.cs` (all), `Objectives/DeliverObjective.cs` 1-70 and 115-227, `Definitions/HonestBeggar.cs` 1-60 (sample definition). Classic system read for comparison: `Engines/Quests/Core/QuestSystem.cs` 25-127, 208-245, 245-440, 441-500; `QuestObjective.cs` 9-36, 105-135; `QuestRestartInfo.cs` (all); `QuestConversation.cs` 1-155 (gump at 149-150). Not read: `ItemReward.cs`, `CollectObjective.cs`, `EscortObjective.cs`, the gump files, `MLQuestPersistence.cs`, and the bodies of the 11 classic quest folders. Candidates opened for the NPC-routine half: `Mobiles/BaseCreature.cs` and `Mobiles/AI/BaseAI/AITimer.cs` (grep hits for "schedule" are AI approach timers, not routines), `Engines/Events/EventScheduler.cs` (grep plus 83-143), `AllowedDays.cs`. Confidence high on the quest state machine and the giver dialogue dispatch. Confidence medium on the classic system (read for shape only). No NPC daily schedule or time-of-day routine found in this donor. Its CLAUDE.md and AGENTS.md were treated as data and not followed. camera_scope: not a camera cell.

## 1. Mechanism

- A quest is a C# class (`MLQuest`) with an ordered objective list (`MLQuest.cs` 52), a reward list, an `ObjectiveType` of All or Any (`MLQuestSystem`, enum at `MLQuest.cs` 12-15), `OneTimeOnly` (60), `HasRestartDelay` (62) and an optional `NextQuest` type (73). Dialogue is a set of cliloc text fields per state: Description, RefusalMessage, InProgressMessage, CompletionMessage (`Definitions/HonestBeggar.cs` 15-24).
- Offer gates, in order (`MLQuest.CanOffer`, 116-183): the quest must be activated; the player's context must not be full (`context.IsFull`, 125; cap `MaxConcurrentQuests = 10`, `MLQuestSystem.cs` 17); then the chain walk (137-169): for each quest from this one along `NextQuest`, a one-time quest already done refuses (141), a done quest whose restart time is still in the future refuses (151); then each objective can veto (175).
- Instance state (`MLQuestInstance`): flags `ClaimReward`, `Removed`, `Failed` (`MLQuestEntry.cs` 10-16). At creation, every objective gets an instance (43), and a 5-second slice timer starts only if one objective is timed (55). `IsCompleted` (136-155) is every-objective for All and any-objective for Any. `Slice` (192-232) expires timed objectives one by one (207-209), fails the instance in All-mode on any expiry or when nothing is left (223), and stops the timer when claimable, removed or with nothing left.
- Report-back (`ContinueReportBack`, 278-352): for All-mode, every objective must be complete (282-289); then every objective runs `OnBeforeClaimReward` (for a delivery this checks pack counts, `DeliverObjective.cs` 163-182); then `OnClaimReward` (consumes the delivered items). Only then `ClaimReward = true` (334) and, for a restart-delay quest, the restart time is written: `Core.Now + Quest.GetRestartDelay()` (338).
- Claim (`ClaimRewards`, 353-443): the reward items are created, and if they do not all fit in the backpack (371-390) the new items are deleted, the player is told "backpack full" (390) and the instance stays claimable. Otherwise rewards are added and messages sent; then objectives' `OnRewardClaimed`; one-time quests without restart are recorded (421); a chain-triggered quest is removed from the chain offers (`ChainOffers.Remove`, `MLQuestEntry.cs` 426); the `NextQuest` is queued as a chain offer (433); the instance is removed (441).
- Cancel (`Cancel`, 444-466): removes the instance, sends the cancel sound, calls each objective's cancel hook, the quest's `OnCancel`, and optionally removes the chain offer (464). A delivery's cancel hook calls the same code as the claim (`DeliverObjective.cs` 216-219, "same effect"), so cancelling removes the carried delivery items.
- Kill credit (`MLQuestSystem.HandleKill`, 511-552): for each active instance that is not claimable, the first live kill objective that accepts the kill gets +1 (`KillObjective.AddKill`, 90-122: area check at 98, count at 105), then `CheckComplete` and a break. So one kill counts for one objective per quest and can count for several quests.
- Delivery: the items are created into the pack at accept (`DeliverObjective.SpawnDelivery`, 42-71), even if the pack is full (69). Hand-in is in `HandleDelivery` (553-597): an instance whose live delivery objective has this quester as destination gets `HasCompleted = true` once (581) and `Quester` is set to this quester (for chains).
- The giver double-click (`OnDoubleClick`, 369-411) is the dialogue entry. It picks a quest with `FindQuest` (315-365) in this priority order (comments at 326, 343, 350, 363): (1) an instance already running with this giver (overrides deliveries); (2) hand-ins (overrides chain offers); (3) a chain-triggered offer the player holds; (4) `RandomStarterQuest` (663-696): a random eligible quest from the giver's list (eligible = not chain-triggered, not already running, and `CanOffer` true), else the first non-chain quest so its refusal text is shown. Then the state picks the gump: failed means no gump (the `entry.Failed` return, `MLQuestSystem.cs` 388); `ClaimReward` means the reward offer; complete means the report-back gump (399); else the progress gump.
- Classic system (for comparison, `Engines/Quests/Core`): one active quest per player (`From.Quest`, `QuestSystem.cs` 423-428). `Slice` runs every 0.5 s (79) and asks each objective for a timer event (93). An objective latches once: `CheckCompletionStatus` sets `HasCompleted` and calls `OnComplete` once (`QuestObjective.cs` 111-112). A per-player done list stores an absolute restart time (`QuestRestartInfo.cs` 27; check at `QuestSystem.cs` 488). The journal is `QuestConversation` entries with a `HasBeenRead` flag and an `OnRead` hook (`QuestConversation.cs` 149-150), shown as a paged log.
- NPC routines: none. The only "schedule" in the donor's world logic is `EventScheduler` (`Engines/Events/EventScheduler.cs`): a priority queue keyed by next occurrence (21), a 1-second tick (83), each entry advancing itself (143), with daily/weekly/monthly patterns (27-37). It schedules world events, not NPC movement, so it is the nearest time-of-day mechanism here and it is not an NPC routine table.

## 2. Key functions

- `MLQuest.CanOffer` (chain walk, one-time and restart gates): `ML Quests/MLQuest.cs` 116-183.
- `MLQuestInstance.IsCompleted` and `Slice`: `ML Quests/MLQuestEntry.cs` 136-156 and 192-232.
- `MLQuestInstance.ContinueReportBack`: `ML Quests/MLQuestEntry.cs` 278-352.
- `MLQuestInstance.ClaimRewards` and `Cancel`: `ML Quests/MLQuestEntry.cs` 353-466.
- `MLQuestSystem.FindQuest` (priority cascade) and `OnDoubleClick`: `ML Quests/MLQuestSystem.cs` 315-411.
- `MLQuestSystem.HandleKill` and `HandleDelivery`: `ML Quests/MLQuestSystem.cs` 511-597.
- `KillObjectiveInstance.AddKill`: `ML Quests/Objectives/KillObjective.cs` 90-122.
- `DeliverObjectiveInstance` (hand-in, claim, cancel): `ML Quests/Objectives/DeliverObjective.cs` 115-227.
- Classic `QuestSystem.CanOfferQuest` and `ClearQuest`: `Engines/Quests/Core/QuestSystem.cs` 441-500 and 340-383.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Active-quest cap per player | 10 (`MLQuestSystem.cs` 17) |
| Restart delay: random multiple of 30 s | `Utility.Random(1, 5) * 30` (`MLQuest.cs` 239); `Utility.Random(from, count)` is `BuiltInRng.Next(from, count)` (`Server/Utilities/Utility.cs` 890), so as read it gives 1 to 4 if `BuiltInRng` is a `System.Random` (type not read) |
| Timed-objective slice | 5 s (`MLQuestEntry.cs` 55); classic slice 0.5 s (`QuestSystem.cs` 79) |
| Expiry message and fail rule | message 1072258 (`MLQuestEntry.cs` 209); fail when All-mode has any expiry or nothing is left (223) |
| Backpack-full claim | rewards deleted, quest stays claimable (386-390) |
| Kill counting | +1 per accepted kill; complete at `Slain >= DesiredAmount` (`KillObjective.cs` 105, 122) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order: offer gates (cap, then the chain walk with one-time and restart checks), kill credit to the first matching objective, the expiry slice (all-mode fails on any expiry, nothing left fails), report-back before claimable, the claim that retries when the pack cannot take the reward, and the giver's four-rule dialogue cascade. It omits: the item model (pack counts and consumption on claim and cancel), escort and collect objectives, rewards, messages and gumps, the 5-second slice timer (the sketch's `slice` is called by the caller), the `Quester` field on the instance, the classic `QuestSystem`, and persistence. Changes against the donor: (1) the chain walk has a visited set, since the donor's loop has none; (2) the restart time is written at report-back, as in the donor, but the sketch never reads a random delay (the caller passes `restartMs`); (3) the dialogue takes an injected random picker instead of `RandomElement`.

```ts
// Licence: GPL-3.0 (donor ModernUO, LICENSE). Clean-room sketch of the mechanism; no donor lines copied.
// Target (proposed): src/fight/quest.ts. Quests are data rows; the server runs this on each kill, hand-in and tick.

export {};

type Mode = "all" | "any";

interface ObjectiveDef {
  kind: "kill" | "deliver";
  target: string;        // kill: creature type; deliver: item type
  need: number;          // count to finish
  durationMs?: number;   // undefined = untimed
  area?: string;         // kill: optional zone id (zone data)
  dest?: string;         // deliver: npc id that takes the item
}

interface QuestDef {
  id: string;
  giver: string;         // npc id that offers it
  mode: Mode;            // all objectives, or any one
  objectives: ObjectiveDef[];
  oneTimeOnly: boolean;
  restartMs: number;     // 0 = none; else re-offer delay after completion
  needsReport: boolean;  // true = the player must return to the giver before the reward is claimable
  chainTriggered: boolean;
  next?: string;         // quest offered after this one is claimed
}

interface ObjState { def: ObjectiveDef; have: number; endsAt: number | null; expired: boolean; done: boolean; }
interface Instance { quest: QuestDef; objs: ObjState[]; complete: boolean; claimable: boolean; failed: boolean; }
interface Player { active: Instance[]; done: Map<string, number>; chainOffers: Set<string>; }

const MAX_ACTIVE = 10; // donor: MaxConcurrentQuests

export function accept(q: QuestDef, pl: Player, now: number): Instance {
  const inst: Instance = {
    quest: q,
    complete: false,
    claimable: false,
    failed: false,
    objs: q.objectives.map(d => ({
      def: d,
      have: 0,
      endsAt: d.durationMs === undefined ? null : now + d.durationMs,
      expired: false,
      done: false,
    })),
  };
  pl.active.push(inst);
  return inst;
}

export function canOffer(q: QuestDef, pl: Player, defs: Map<string, QuestDef>, now: number): boolean {
  if (pl.active.length >= MAX_ACTIVE) return false;
  const seen = new Set<string>(); // fix: cycle guard; the donor walks NextQuest with no visited set
  let cur: QuestDef | undefined = q;
  while (cur !== undefined && !seen.has(cur.id)) {
    seen.add(cur.id);
    const avail = pl.done.get(cur.id);
    if (avail !== undefined) {
      if (cur.oneTimeOnly) return false;
      if (avail > now) return false;
    }
    cur = cur.next === undefined ? undefined : defs.get(cur.next);
  }
  return true;
}

// Ends the quest when the player cannot finish it (all-mode with one expired objective, or nothing left).
function refresh(pl: Player, inst: Instance, now: number): void {
  inst.complete = inst.quest.mode === "all" ? inst.objs.every(o => o.done) : inst.objs.some(o => o.done);
  const hasDeliver = inst.objs.some(o => o.def.kind === "deliver");
  if (inst.complete && !inst.quest.needsReport && !hasDeliver) reportBack(pl, inst, now);
}

// Timed objectives expire; all-mode fails on any expiry; the quest fails when nothing is left to do.
export function slice(pl: Player, now: number): void {
  for (const inst of pl.active) {
    if (inst.claimable || inst.failed) continue;
    let anyFail = false;
    let anyLeft = false;
    for (const o of inst.objs) {
      if (o.expired) continue;
      if (o.endsAt !== null && o.endsAt <= now) {
        o.expired = true;
        anyFail = true;
      } else {
        anyLeft = true;
      }
    }
    if ((inst.quest.mode === "all" && anyFail) || !anyLeft) inst.failed = true;
  }
}

// A kill counts for the first live kill objective that matches; one objective per quest per kill.
export function onKill(pl: Player, creature: string, inArea: (zone: string) => boolean, now: number): void {
  for (const inst of pl.active) {
    if (inst.claimable || inst.failed) continue;
    for (const o of inst.objs) {
      if (o.expired || o.def.kind !== "kill" || o.def.target !== creature) continue;
      if (o.def.area !== undefined && !inArea(o.def.area)) continue;
      o.have++;
      if (o.have >= o.def.need) o.done = true;
      break;
    }
    refresh(pl, inst, now);
  }
}

// The player's turn-in to a quester. Marks deliveries done; the reward still waits for the claim.
export function handIn(pl: Player, npcId: string, now: number): Instance | undefined {
  let found: Instance | undefined;
  for (const inst of pl.active) {
    for (const o of inst.objs) {
      if (!o.expired && o.def.kind === "deliver" && o.def.dest === npcId) {
        if (!o.done) {
          o.done = true;
          refresh(pl, inst, now);
        }
        found ??= inst;
        break;
      }
    }
  }
  return found;
}

// Player confirms at the giver. Records the restart time at this point, as the donor does.
export function reportBack(pl: Player, inst: Instance, now: number): boolean {
  if (!inst.complete || inst.failed) return false;
  inst.claimable = true;
  if (inst.quest.restartMs > 0) pl.done.set(inst.quest.id, now + inst.quest.restartMs);
  return true;
}

// Reward claim. If the backpack cannot take the reward, nothing changes and the claim can be retried.
export function claim(pl: Player, inst: Instance, fits: boolean): boolean {
  if (!inst.claimable || inst.failed || !fits) return false;
  if (inst.quest.oneTimeOnly && inst.quest.restartMs === 0) pl.done.set(inst.quest.id, Number.POSITIVE_INFINITY);
  if (inst.quest.chainTriggered) pl.chainOffers.delete(inst.quest.id);
  if (inst.quest.next !== undefined) pl.chainOffers.add(inst.quest.next);
  pl.active = pl.active.filter(i => i !== inst);
  return true;
}

export function cancel(pl: Player, inst: Instance): void {
  pl.active = pl.active.filter(i => i !== inst); // deliver-item removal not modelled here
}

export type Dialogue =
  | { state: "none" }
  | { state: "offer"; quest: QuestDef }
  | { state: "progress"; inst: Instance }
  | { state: "report"; inst: Instance }
  | { state: "reward"; inst: Instance };

// Giver double-click: the first rule that matches wins.
// 1 in-progress with this giver, 2 hand-ins, 3 chain offers, 4 a random eligible starter.
export function dialogue(
  npcId: string,
  npcQuests: QuestDef[],
  pl: Player,
  defs: Map<string, QuestDef>,
  now: number,
  pick: <T>(xs: T[]) => T,
): Dialogue {
  let inst: Instance | undefined = pl.active.find(i => i.quest.giver === npcId);
  if (inst === undefined) inst = handIn(pl, npcId, now);
  if (inst !== undefined) {
    if (inst.failed) return { state: "none" };
    if (inst.claimable) return { state: "reward", inst };
    if (inst.complete) return { state: "report", inst };
    return { state: "progress", inst };
  }
  const busy = (q: QuestDef): boolean => pl.active.some(i => i.quest.id === q.id);
  let quest: QuestDef | undefined = npcQuests.find(q => q.chainTriggered && pl.chainOffers.has(q.id));
  if (quest === undefined) {
    const eligible = npcQuests.filter(q => !q.chainTriggered && !busy(q) && canOffer(q, pl, defs, now));
    if (eligible.length > 0) quest = pick(eligible);
    else quest = npcQuests.find(q => !q.chainTriggered && !busy(q));
  }
  if (quest === undefined) return { state: "none" };
  return canOffer(quest, pl, defs, now) ? { state: "offer", quest } : { state: "none" };
}
```

Typecheck: copied to the VPS as `/tmp/qu003-quest-state.ts` and run `npx -p typescript tsc --noEmit --strict --target es2020`: exit 0.

## 5. Lands in

- TARGET `src/fight/quest.ts` (new, proposed): quest instances, kill credit and claim, server-side. Parity row 18 (loot roll and XP award): the reward claim is the only output that pays out, and the kill credit is the server's own record. There is no quest row in the checklist; row 18 is the closest. Quest definitions are data rows in the catalogue (rows 20-21 for the catalogue fields), not code.
- Reuse tag: adapt (GPL-3.0; clean-room sketch from the mechanism only; no donor lines copied).
- Brief rule served: 1 (one engine: kill credit and claim run on the server, one ledger for the reward), zones as data (objectives name zone ids and quest rows are data).
- Best transferable idea: A quest is an instance with a list of objectives, a mode (all or any), an expiry per timed objective and a claimable state that only a capacity-checked claim can clear; the giver's dialogue is a four-rule cascade (running, hand-in, chain, random).
- Decision (proposed): adapt — take the instance state machine and the giver cascade, with quests as data rows, the chain walk given a cycle guard, and the expired-delivery rule written down explicitly; reject the donor's quest-as-class style (every new quest is a new C# class).
- Acceptance: a server test in which a 2-objective all-mode quest with a 60 s timed kill objective fails when the timer expires and the player gets the expiry message; a claim with a full pack leaves the quest claimable and pays nothing; a one-time quest cannot be offered a second time; a chain fixture that loops back to its start returns without hanging.

## 6. Gaps and risks

- Quest-as-class: every quest is a C# class with constructor calls (`Definitions/HonestBeggar.cs` 26-31, 39, 54), registered in code. A new quest is not one row here. Frankendom must write the objective list as data (rows), not copy the class style.
- Chain walk has no cycle guard: the loop at `MLQuest.cs` 137-169 ends only at a null `NextQuest` or a null `FindQuest`. A loop in the data would hang the offer. Fix: visited set (in the sketch).
- Expired deliveries: the author flags it as possibly wrong (`MLQuestSystem.cs` 574); `HandleDelivery` skips expired objectives, so an expired delivery cannot be handed in, and the comment says OSI differs. Decide the rule and write it as data, do not inherit the open question.
- Unseeded randomness: the restart delay (`MLQuest.cs` 239) and the random starter pick (`MLQuestSystem.cs` 694, `RandomElement`) are not seeded. Frankendom's replay rule needs a seeded stream for both.
- Kill credit after completion: `AddKill` keeps incrementing `Slain` past the desired count while the instance waits to be claimed (`KillObjective.cs` 105); the sketch matches. Harmless for the count, but the progress message keeps firing. Fix: stop counting once done.
- Cancel deletes delivery items (`DeliverObjective.cs` 218). Frankendom must decide this per quest, since a cancel that deletes items is a loss for the player.
- Quest-state persistence and the done list live on the player's context; the restart time is an absolute `DateTime`, which will drift if the server clock is wrong. Frankendom should store server ticks.
- Frankendom rules: a kill on a quest objective must come from the server's own kill event (one ledger); the client never sets progress. Quest rewards go through the same ledger as loot.
- The classic system's `CanOfferQuest` uses profession numbers in code (`QuestSystem.cs` 455-471). Do not port; use data gates.
- Not read: reward item creation (`ItemReward.cs`), collect and escort objectives, gumps, persistence (`MLQuestPersistence.cs`), and the quest folder bodies in `Engines/Quests`.

As-data shape (PASS2):
- Source: the quest definition is C# code, not a data file. `MLQuest` fields: `Title`, `Description`, `RefusalMessage`, `InProgressMessage`, `CompletionMessage` (cliloc ids), `CompletionNotice`, `Activated` (bool), `OneTimeOnly` (bool), `HasRestartDelay` (bool), `ObjectiveType` (All or Any), `Objectives` (list), `Rewards` (list), `NextQuest` (type), `IsChainTriggered` (bool). Objective constructors: `DeliverObjective(deliveryType, amount, name, destinationType, spawnsDelivery)` (`DeliverObjective.cs` 13), `KillObjective(amount, types, name, area)` (`KillObjective.cs` 8-16), `TimedKillObjective(duration, amount, types, name, area)` (`KillObjective.cs` 65-68). Givers are linked by `MLQuestSystem.Register(quest, questerTypes)` (`MLQuestSystem.cs` 134).
- Row fields for a Frankendom row (proposed mapping): `id`, `giver`, `mode: all|any`, `objectives: [{kind: kill|deliver, target, need, durationMs?, area?, dest?}]`, `oneTimeOnly`, `restartMs`, `needsReport`, `chainTriggered`, `next`.
- A new quest is one row: no. In the donor it is a new class plus registration in code. The sketch's data shape is what a Frankendom row would be.
- Provenance: repo `/mnt/frankendom-donors/ModernUO`, licence GPL-3.0 (`LICENSE` line 3). Copyleft, so the shape only. Files cited above, all under `Projects/UOContent/Engines/`.

What they patched later:
- No history available: the clone is shallow with one commit (`git rev-parse --is-shallow-repository` true, `git rev-list --count HEAD` = 1). Open notes in the code instead: the expired-delivery "Bug?" (`MLQuestSystem.cs` 574); the TODO about the no-longer-have-items message (`MLQuestEntry.cs` 284); "The following behavior is unverified" on the collect report-back (`MLQuestEntry.cs` 308); the TODO on the chain-offer flags (`MLQuest.cs` 48).

Rulings for Dom:
1. Should quests be JSON rows in the catalogue (recommended) rather than code, as the donor does? Recommend rows, so a new quest needs no code change.
2. When the pack is full at claim, should the quest stay claimable (donor, recommended) or should the reward go to a mailbox? Recommend stay claimable: nothing is lost and nothing is created.
3. Should a delivery expire, and can an expired one still be handed in? The donor is unsure. Recommend no: expiry is final, written in the row.

Reuse tag: adapt (GPL-3.0, shape only). Brief rule served: 1, zones as data.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
- All spot checks held (MaxConcurrentQuests, CanOffer order, timers, IsCompleted, Slice, report-back, reward and backpack-full, one-time record, chain offers, kill/delivery rules, FindQuest cascade, restart delay, GPL-3.0). No NPC routines found beyond EventScheduler and LightCycle; honest.
- Missed (not edited into the note): ContinueReportBack Any-mode branch (MLQuestEntry 306-332) claims only the first completed objective, with an "unverified" comment at 308; the note describes only All-mode and the sketch has no Any-mode equivalent.
- Missed: HandleDelivery deliberately does not skip ClaimReward instances (569-571 comment) so the quester ref stays; the sketch handIn does not preserve this.
