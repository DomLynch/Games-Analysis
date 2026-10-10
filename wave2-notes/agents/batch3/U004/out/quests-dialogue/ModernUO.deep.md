# ModernUO (quests-dialogue, cell 12)

Donor: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Quests/Core/QuestSystem.cs` (with `QuestObjective.cs`, `QuestRestartInfo.cs`, `QuestConversation.cs` in the same folder; kill credit in `Mobiles/BaseCreature.cs`) | Licence: GPL-3.0, "GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007" (`/mnt/frankendom-donors/ModernUO/LICENSE`) | C# | symbol `QuestSystem.ClearQuest`

Checked: Classic quest core read end to end: `QuestSystem.cs` 1-130 (fields, timer, `Slice`, `OnKill`), 335-505 (`Complete`, `ClearQuest`, `Accept`, `CanOfferQuest`), `QuestObjective.cs` 1-137 (progress, completion latch, poll and kill predicates), `QuestRestartInfo.cs` (all), `QuestConversation.cs` 1-155 (all). Kill credit read at `BaseCreature.cs` 3548-3652. Offer caller read: `Witch Apprentice/Mobiles/Grizelda.cs` 57-68. Callers of `OnKill`: one (`BaseCreature.cs` 3646). Callers of `CanOfferQuest`: about 14 call sites, grep only; one read (Grizelda). `RestartDelay` overrides: grep list, two opened (WitchApprenticeQuest.cs 73, DarkTidesQuest.cs 62). Not read: the MLQuest engine (`Engines/ML Quests/`, MLQuestSystem.cs 865 lines, MLQuestEntry.cs 566 lines), `Core/QuestSerializer.cs`, the per-quest objective classes, the `MLQuestSystem.HandleKill` body. `GetLootingRights` (BaseCreature.cs 3344-3452) was read in the checker pass. Confidence high on the restart gate, the latch, the poll and the kill-credit order. camera_scope: not a camera cell.

Best transferable idea: Keep a per-player "done" list with a restart time per quest type (zero, a fixed cooldown, or never), write it at the end of a quest, and drop an expired entry the next time the offer is checked, so cooldowns need no timer.
Decision (proposed): adapt — the restart gate is cheap and fits zone-as-data quest pacing, but the donor's kill credit and dialogue state are not server-verified, so Frankendom keeps the checks and the state on the server and writes the restart store into the one ledger.
Acceptance: a server test where a 5-minute quest completed at T is refused at T+4:59 and offered at T+5:01, a cancelled never-quest is not offered again, and a creature with three attackers credits the quest to exactly one of them.

## 1. Mechanism

- Lifecycle. `Accept` (QuestSystem.cs 421-431) does nothing if the player already has a quest (423). Otherwise it sets `From.Quest` (428) and starts a half-second timer (431). `StartTimer` (71-80) guards against a second timer (73-76) and runs `Slice` every 0.5 s (79).
- End of a quest. `ClearQuest(bool completed)` (345) stops the timer (347), returns at once if `From.Quest` is not this quest (349-352; so a quest that is not the player's current one writes no cooldown), clears `From.Quest` (354), and then decides whether to record a cooldown (358): recorded when the quest was completed and `RestartDelay > 0`, or when it was cancelled and `RestartDelay` is `MaxValue` ("never"). If the player already has an entry for this quest type, it is reset (372); otherwise one is added with the delay (380). `QuestRestartInfo.Reset` (QuestRestartInfo.cs 23-32) stores `Core.Now + delay`, or `DateTime.MaxValue` for "never".
- Offer gate. `CanOfferQuest(check, type, out inRestartPeriod)` (QuestSystem.cs 441-) first refuses if an offer gump is open (`HasGump<QuestOfferGump>`, 450), then applies the class gates (for example Dark Tides needs profession 4, line 455; gates 455-474). It walks `DoneQuests`: if the entry exists and `Core.Now < RestartTime`, it refuses and reports `inRestartPeriod` (488-490). If the entry has expired it is removed (494) and the offer is allowed. An NPC uses the flag to say a "recently finished" line instead of the offer (Grizelda.cs 57-68).
- Objectives. `QuestObjective` holds progress. Its setter (QuestObjective.cs 22-30) calls `CheckCompletionStatus` (107-114), which fires `OnComplete` once: `HasCompleted` latches it (109-112). `Complete()` sets progress to `MaxProgress` (82-85). `Completed` means progress has reached `MaxProgress` (34).
- Poll. `Slice` (QuestSystem.cs 87-98) runs every 0.5 s, walks the objectives in reverse, and calls `CheckProgress` on each one whose `GetTimerEvent()` returns true (`!Completed`, QuestObjective.cs 120).
- Kill credit. The creature death code walks the looting-rights list (`BaseCreature.cs` 3550). For each player: the MLQuest kill hook runs for every player (3632-3635), then the classic quest gets the kill only once, to the first player with a quest (`givenQuestKill`, 3637 and 3647). The list is `GetLootingRights` (3344), sorted by damage, highest first (sort at 3433; `DamageStore.CompareTo`), and the loop skips every player without `m_HasRight` (3563; right = damage at least a share of the top damage: 1/2, 1/4, 1/8 or 1/16 by the creature's hit points). So the credit goes to the top-damage rights-holder who has a quest. That player's `QuestSystem.OnKill` (QuestSystem.cs 100-111) calls `OnKill` on each uncompleted objective (`GetKillEvent`, QuestObjective.cs 130).
- Dialogue. `QuestConversation` (QuestConversation.cs 7-57) carries a `HasBeenRead` flag, `Logged` (12, default true) and `OnRead`. The logged list is shown in `QuestConversationsGump` (59-154). Reading it sets `HasBeenRead` and calls `OnRead` once (149-150, in `OnResponse`, called when the client answers the gump). The dialogue lines themselves are per quest and are not read beyond the class list.

## 2. Key functions

- `QuestSystem.ClearQuest`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Quests/Core/QuestSystem.cs` 345-383. Ends the quest and writes or resets the cooldown.
- `QuestSystem.CanOfferQuest`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Quests/Core/QuestSystem.cs` 441-500. Offer-gump check, class gates, restart check with lazy removal.
- `QuestSystem.Slice` and `OnKill`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Quests/Core/QuestSystem.cs` 87-111. Half-second poll and kill fan-out to objectives.
- `QuestObjective` latch: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Quests/Core/QuestObjective.cs` 22-30 and 107-114.
- Kill credit: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/BaseCreature.cs` 3550-3647.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Completion records a cooldown only if the delay is non-zero | Zero delay for most classic quests (grep: Collector, Summoning, Ambitious Queen, Solen Matriarch, Study of the Solen Hive) |
| Fixed cooldown after completion | Witch Apprentice 5 minutes (WitchApprenticeQuest.cs 73) |
| Permanent lock (never-quest) | `TimeSpan.MaxValue` (Dark Tides, DarkTidesQuest.cs 62) |
| Cancel records only the permanent lock | `!completed && restartDelay == TimeSpan.MaxValue` (QuestSystem.cs 358) |
| Expired cooldown removed when checked, no timer | `doneQuests.RemoveAt(i)` (QuestSystem.cs 494) |
| Quest poll interval | 0.5 s (QuestSystem.cs 79) |
| One completion callback per objective | Latch on `HasCompleted` (QuestObjective.cs 109-112) |
| One classic quest kill per creature | `givenQuestKill` (BaseCreature.cs 3637, 3647) |

## 4. TypeScript sketch

simplified: the sketch keeps the restart gate (completion records a delay, a cancel records only a never-quest, an expired entry is removed when checked), the one-shot completion latch, the half-second poll that skips finished objectives in reverse order, and the first-with-quest kill credit (in damage order, rights-holders only). It omits the profession and class gates, the open-offer-gump check, the conversation gumps and read flags, the per-objective kill fan-out (the donor's `OnKill` calls every uncompleted objective; the sketch has no kill fan-out), the damage sort and the `m_HasRight` threshold (the caller passes the list already sorted and each participant's `hasRight` flag), the MLQuest engine (not read), serialization, and the quest type table.

```ts
// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
const NEVER = Infinity;          // a restart delay of "never" (the donor uses TimeSpan.MaxValue)
const SLICE_MS = 500;            // the quest timer fires every half second

// Objective progress with a one-shot completion latch.
class Objective {
  private progress = 0;
  private completed = false;     // latch: completion fires once
  constructor(private readonly max: number, private readonly onDone: () => void) {}
  get isDone(): boolean { return this.progress >= this.max; }
  set current(p: number) {       // setting progress checks the latch
    this.progress = p;
    if (this.isDone && !this.completed) { this.completed = true; this.onDone(); }
  }
  get current(): number { return this.progress; }
  get hasLatched(): boolean { return this.completed; }
}

interface RestartEntry { quest: string; resetAt: number; } // ms timestamp; Infinity = never

// Record a finished quest. Nothing is written unless it is the player's current quest (donor returns early);
// completion records only when the delay is non-zero; a cancel records only for a "never" quest.
function recordEnd(done: RestartEntry[], quest: string, isCurrent: boolean, completed: boolean, delayMs: number, now: number): void {
  if (!isCurrent) return;
  const recordable = (completed && delayMs > 0) || (!completed && delayMs === NEVER);
  if (!recordable) return;
  const found = done.find(e => e.quest === quest);
  if (found) found.resetAt = now + delayMs;
  else done.push({ quest, resetAt: now + delayMs });
}

// Offer check. An expired entry is removed when checked; a live one blocks and reports the restart period.
function canOffer(done: RestartEntry[], quest: string, now: number): { ok: boolean; inRestart: boolean } {
  const i = done.findIndex(e => e.quest === quest);
  if (i < 0) return { ok: true, inRestart: false };
  if (now < done[i].resetAt) return { ok: false, inRestart: true };
  done.splice(i, 1);
  return { ok: true, inRestart: false };
}

interface Participant { name: string; hasRight: boolean; quest?: { onKill(): void }; }

// The classic quest kill goes to the first participant, in looting-rights order (damage, highest first),
// who has a looting right and has the quest.
function creditQuestKill(lootingOrder: Participant[]): void {
  for (const p of lootingOrder) {
    if (!p.hasRight) continue;
    if (p.quest) { p.quest.onKill(); return; }
  }
}

// Poll pass, run on the half-second timer: only objectives not yet done are checked.
function slice(objectives: Objective[], check: (o: Objective) => void): void {
  for (let i = objectives.length - 1; i >= 0; --i) {
    const o = objectives[i];
    if (!o.isDone) check(o);
  }
}

export {};
```

## 5. Lands in

- TARGET `origins/server/quest-state.ts` (proposed new module; the name is a proposal and was not checked against the Frankendom tree). Cooldowns, quest state and kill credit live on the server.
- Parity-checklist row 18 (loot roll and XP award): the quest kill credit runs in the same death step that awards loot and XP, and the server decides it.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: server-verified kills (kill credit decided on the server); one ledger (the restart store sits on the character with the rest of the state); zones as data (restart delays and objective counts per quest).

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism and no donor line was copied.
- Dialogue is client-reported: `HasBeenRead` is set when the client answers the gump (QuestConversation.cs 149). Any reward or step keyed to "read" must be decided by the server. The donor does not do that.
- Two quest engines: the classic core here and the MLQuest engine (not read). Frankendom should choose one before porting either.
- Cooldown time is absolute server time (`Core.Now`) stored on the character (`DoneQuests`, PlayerMobile.cs 649). Store it in UTC or server ticks, not a local clock.
- Kill credit order: the donor credits the first player in the looting-rights list who has the quest, and that list is damage-descending and filtered to rights-holders (`GetLootingRights`, 3344, 3433; `m_HasRight` filter 3563). Frankendom must define the rule explicitly; with MAX_ATTACKERS = 3, a "first" rule should be stated as a rule over those attackers, not as hit order.
- Poll lag: objectives are checked every 0.5 s (QuestSystem.cs 79), not on the event. Any location-based objective can lag up to half a second. Frankendom should use events where it can and use one server loop, not one timer per player.
- The donor's own comment flags the risk (QuestSystem.cs 78): timers may leak if a quest never stops. Frankendom should not start a timer per quest at all.
- Class gates are hard-coded profession numbers (QuestSystem.cs 455-472). Frankendom should make these gates data.
- Restart delays are per quest class in code (e.g. WitchApprenticeQuest.cs 73), not per zone. If Frankendom wants per-zone pacing, the field must be data.


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** Mostly verified (ClearQuest 345-383 record rule at 358, Accept 421-431, Slice 87-98 reverse walk, OnKill 100-111, QuestObjective latch 22-30/107-114/120/130, QuestRestartInfo.Reset, WitchApprentice 5 min line 73, DarkTides MaxValue line 62, Grizelda 57-68, QuestConversation HasBeenRead 149-150, kill credit givenQuestKill 3637/3647, MLQuest hook 3632-3635). Errors: (1) CanOfferQuest order stated as class gates first then offer-gump check (450); real order is HasGump<QuestOfferGump> (450) before the profession gates (455-474). (2) ClearQuest returns early if From.Quest != this (349-352) after StopTimer, so no cooldown is written for a non-current quest; note and sketch recordEnd omit this guard. (3) Note says looting-rights list order unread; the kill loop skips players without m_HasRight (3563) and the list is damage-sorted (3433), so classic quest credit goes to the top-damage rights-holder who has a quest; the note's 'first player in the list who has the quest' misses the HasRight filter.

**Missed:** HasRight filter at BaseCreature.cs 3563 and damage-descending order; QuestObjective also has HasBeenRead/OnRead (20,116) like conversations; conversation gump marks ALL unread logged conversations read on any response (143-151).
