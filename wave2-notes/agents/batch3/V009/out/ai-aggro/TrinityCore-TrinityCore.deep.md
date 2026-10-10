# TrinityCore-TrinityCore (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Combat/ThreatManager.cpp` (with `ThreatManager.h`) | Licence: GPL-2.0-or-later (ThreatManager.cpp header: "either version 2 of the License, or (at your option) any later version"; the repo COPYING is GPL v2) | C++ | symbol `ThreatManager::ReselectVictim`

Checked: `ThreatManager::ReselectVictim` is at ThreatManager.cpp 596-649 and read in full, with its caller `UpdateVictim` (581-594). The threat-list comparator `CompareReferencesLT` (668-675), `AddThreat` (382-476, read in full), `CalculateModifiedThreat` (677-731), `ShouldBeOffline` and `ShouldBeSuppressed` (99-121), `TauntUpdate` (504-526), `ForwardThreatForAssistingMe` (733-759) and `GetThreat` (284-290) were read. Callers of `UpdateVictim` checked: `ThreatManager::Update` (229), `GetCurrentVictim` (245), `AddThreat` (472), `ClearThreat(ref)` (545). The AI side was read as far as the victim hand-off: `CreatureAI::UpdateVictim` (CreatureAI.cpp 244-258), `Creature::SelectVictim` (Creature.cpp 1240-1245). Not read: the body of `ThreatReference::HeapNotifyIncreased` and `Decreased`, `EvaluateSuppressed` (only its call sites seen), `SendThreatListToClients`, the `ProcessAIUpdates` callback target `JustStartedThreateningMe`, the spell threat table `SpellThreatEntry` (values), and the body of `CalculatePct` (taken as base x pct / 100, not read). The map loop that calls `Creature::Update(diff)` was not read; the `diff` unit is assumed to be milliseconds (not read). camera_scope: not applicable. Confidence: high on the victim hysteresis and its order of checks; medium on the heap-top assumption, because the heap's ordering is taken from `CompareThreatLessThan` (ThreatManager.h 324), not from the heap class. Cell hint was TrinityCore root; the real mechanism is in `Combat/ThreatManager.cpp`.

## 1. Mechanism

- A creature keeps a threat list: one reference per player or unit that has threatened it. Each reference holds a base threat amount (floored at 0), a temporary modifier, an online state (offline, suppressed, online), and a taunt state. The creature's current victim is the top of that list, but the switch from one victim to another is damped by hysteresis, so the target does not flip-flop.
- Driver. `Creature::Update(diff)` (Creature.cpp 750) calls `GetThreatManager().Update(diff)` (765). `ThreatManager::Update` keeps a timer (220). Each call: if the timer has expired it runs `UpdateVictim` (when the list is not empty, 228-229) and resets the timer to the full interval `THREAT_UPDATE_INTERVAL = 1000` (231; ThreatManager.h 86). Otherwise it subtracts `tdiff` (233-234). The reset is to the full interval, so time past the expiry is dropped rather than carried over.
- Event triggers besides the timer: when `AddThreat` creates a new reference it runs `UpdateVictim` if the creature has no current victim (471-472), and otherwise calls `ProcessAIUpdates()` (475), which fires the `JustStartedThreateningMe` callbacks at once. Adding threat to an existing reference does not re-run selection (it returns at 460). `GetCurrentVictim`, the function `Creature::SelectVictim` calls (Creature.cpp 1245), re-runs `UpdateVictim` only when there is no current victim or the current one should be offline (244-245). `ClearThreat(ref)` re-runs it when there is no current victim (544-545).
- Adding threat, `AddThreat(target, amount, spell, ignoreModifiers, ignoreRedirects)` (382-476), in order:
  (a) A spell with `SPELL_ATTR1_NO_THREAT` adds nothing (387-388). A spell with `SPELL_ATTR2_NO_INITIAL_THREAT` adds nothing while the creature is not engaged (389-390). A creature that cannot have a threat list only sets combat with the target and its redirect targets and creates no reference (`CanHaveThreatList` shortcut, 393-405).
  (b) Modifiers: unless `ignoreModifiers`, `CalculateModifiedThreat` scales the amount (409-410). Its steps, in order (677-731): the spell's threat `pctMod` (682-684), the `Hate` spell mod from the threatening unit's owner (686-687), then the threatening unit's school modifier (691-696) or, for mixed-school spells, a cached `SPELL_AURA_MOD_THREAT` multiplier (718-726).
  (c) Redirects: if the threatening unit has redirect entries and the amount is positive, each redirect target gets `CalculatePct(origAmount, pct)` by a recursive `AddThreat` with modifiers and redirects ignored, and that amount is subtracted from the original (413-436).
  (d) Combat gate: `SetInCombatWith(target)` puts the creature in combat with the target (threat implies combat); it fails, and no threat is added, only for invalid targets such as GMs or dead units (440-441).
  (e) Existing reference: if it is suppressed and `ShouldBeSuppressed` is now false, it goes back online (449-456). The threat is added only if the reference is online (457-458). New reference: created, registered on both sides, `UpdateOffline` run, and threat added only if available (464-470).
- Victim selection, `ReselectVictim` (596-649). Steps: refresh the offline state of every reference (601-602); a fixated target wins if available (605-606). Let `old` be the current victim (dropped to null if it is offline, 608-610) and `highest` the top of the threat heap (612). Then, in order:
  1. If `highest` is not available, there is no victim (614-615). If there is no `old`, or `highest` is `old`, the victim is `highest` (617-618).
  2. If `highest` does not beat `old` by more than 110% (620-621), keep `old`.
  3. If `highest` beats `old` by more than 130% (623-624), switch to `highest` whatever its range.
  4. Otherwise (between 110% and 130%): if `highest` is in melee range of the creature (626-627), switch; a ranged `highest` does not switch.
  5. Otherwise walk down the heap (630-645): for each `next`, if `next` is `old`, return it (635-636); if `next` does not beat `old` by 110%, keep `old` (638-639); if `next` is in melee range, switch to it (641-642); else continue.
  6. The walk always finds `old`, or returns earlier (647 is an abort for a desynced list).
- Order comparator, `CompareReferencesLT(a, b, w)` (668-675): online state first (a lower state loses: ONLINE > SUPPRESSED > OFFLINE), then taunt state (TAUNT > NONE > DETAUNT), then `a.threat x w < b.threat`. With `w = 1.1` the test is "b beats a by more than 10%".
- Offline and suppressed states. `ShouldBeOffline` (99-108): the creature cannot see the victim, the victim is not an acceptable target or cannot be attacked, or faction flags forbid fighting either way. `ShouldBeSuppressed` (110-121): a taunting victim is never suppressed (112-113); a victim immune to the creature's melee school is suppressed (114-115), as is a confused victim (116-117) or one under a breakable stun (118-119). Suppressed refs regain online state only when they cause threat again (449-456, comment: "retail behavior").
- Taunt. `TauntUpdate` (504-518) walks the taunt auras in order and gives each caster still on the list a taunt state from its position and the size of that map (511-518). I did not work through that arithmetic, so I do not claim which caster ends at the top state. Then `EvaluateSuppressed` runs (not read). Taunt beats threat in the comparator, not by a number.
- Assist. `ForwardThreatForAssistingMe` (733-759): threat from an assisting unit is split evenly across the creatures that threaten the assistant's targets (752); creatures that are under control get 0 (750-751, and the later call with 0.0f).

## 2. Key functions

- `ThreatManager::ReselectVictim`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Combat/ThreatManager.cpp` 596-649. The victim hysteresis: 110% keep, 130% switch, melee override, walk-down.
- `ThreatManager::UpdateVictim`: same file 581-594. Calls `ReselectVictim`, sends the list on a change, runs AI updates.
- `ThreatManager::Update`: same file 215-235. The 1000 ms timer and its reset.
- `ThreatManager::AddThreat`: same file 382-476. Modifiers, redirects, combat gate, reference create or update, first-victim trigger.
- `ThreatManager::CalculateModifiedThreat`: same file 677-731.
- `ThreatManager::CompareReferencesLT`: same file 668-675. The precedence order and the weighted comparison.
- `ThreatReference::ShouldBeOffline` and `ThreatReference::ShouldBeSuppressed`: same file 99-121.
- `Creature::SelectVictim`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Creature/Creature.cpp` 1240-1245 (threat-list branch read, the non-list branch read in part).
- `CreatureAI::UpdateVictim`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/AI/CreatureAI.cpp` 244-258 (engaged and alive checks, then `SelectVictim` and `AttackStart`).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Keep the current target unless a challenger has more than 110% of its threat | 1.1 (theirs, ThreatManager.cpp 620 and 638) |
| Switch at once when a challenger has more than 130% | 1.3 (theirs, 623) |
| In the 110-130% band, only a melee-range challenger switches | Melee test from the creature (626, 641); the range value itself is not read |
| Re-check the threat list on a fixed interval, plus on events | 1000 (theirs, ThreatManager.h 86; unit is the `tdiff` unit, assumed ms) |
| Timer reset drops the overshoot | Reset to full interval (231) |
| Threat never goes negative | `max(x, 0)` (ThreatManager.cpp 42; ThreatManager.h 272) |
| Redirect share of threat | `CalculatePct(origAmount, pct)` (431); pct comes from the redirect entry |
| Spell threat multiplier per spell | `SpellThreatEntry.pctMod` (682-684; table values not read) |
| Assist threat split evenly | `baseAmount / count` (752) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order for the victim choice: an offline current victim is replaced by the top, the 110% keep rule, the 130% switch, the melee override, then a walk down the sorted list that keeps the current victim when the next challenger does not clear 110%. It takes the list already sorted and already free of offline refs (the donor refreshes offline state for each reference, then returns null when the top is offline; the sketch filters instead). It omits the fixate target, the taunt aura bookkeeping (the taunt state is an input), the redirects, the threat modifiers, the 1000 ms timer and the update triggers, the suppression rules (the state is an input), the assist split, and the client update.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type Online = "offline" | "suppressed" | "online";

export interface Ref {
  id: string;
  threat: number;      // base plus temporary modifiers, floored at 0
  online: Online;
  taunted: 0 | 1 | 2;  // 0 detaunted, 1 none, 2 taunting
  inMelee: boolean;    // attacker is in melee range of the creature
}

const ONLINE_RANK: Record<Online, number> = { offline: 0, suppressed: 1, online: 2 };
export const SWITCH_LOW = 1.1;   // a challenger must beat the current victim by this factor to be considered
export const SWITCH_HIGH = 1.3;  // beating the current victim by this factor switches at once, at any range

// True when b beats a by more than the weight w. Online state first, then taunt, then threat.
export function beats(a: Ref, b: Ref, w: number): boolean {
  if (a.online !== b.online) return ONLINE_RANK[a.online] < ONLINE_RANK[b.online];
  if (a.taunted !== b.taunted) return a.taunted < b.taunted;
  return a.threat * w < b.threat;
}

// Hysteresis: keep the current victim unless a challenger clears the bands.
// sorted is the threat list, highest first, in the same order as beats(..., 1).
export function reselectVictim(current: Ref | null, sorted: Ref[]): Ref | null {
  const alive = sorted.filter((r) => r.online !== "offline");
  if (alive.length === 0) return null;
  const highest = alive[0];
  if (current === null || current.online === "offline") return highest;
  if (highest === current) return current;
  if (!beats(current, highest, SWITCH_LOW)) return current;
  if (beats(current, highest, SWITCH_HIGH)) return highest;
  if (highest.inMelee) return highest;
  for (const next of alive.slice(1)) {
    if (next === current) return next;
    if (!beats(current, next, SWITCH_LOW)) return current;
    if (next.inMelee) return next;
  }
  return current;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/ai.ts` (the AI brain: target choice for each creature). Parity-checklist row 2 (AI brain); the fight loop's aggro and leash (row 4) reads its output.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one combat core, two clients); rule 3 (many-on-one target choice lives in the engine, MAX_ATTACKERS = 3)

Best transferable idea: keep the current target until a challenger has more than 110% of its threat, switch at once above 130%, and in between switch only to an attacker in melee range, so a many-on-one fight does not flip targets on every hit.
Decision (proposed): adopt - the 110/130 hysteresis and the melee override are exactly the many-on-one target rule our rulings put in the engine; with MAX_ATTACKERS = 3 the list stays tiny, so the simple walk in the sketch is enough and no heap is needed.
Acceptance: a server test with one creature and three attackers: the creature keeps its current target while the new attacker's threat is below 110% of it; a challenger above 130% takes the target on the next engine tick; a ranged challenger between 110% and 130% does not take it, and a melee challenger in the same band does.

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism; no donor line is copied.
- The donor re-checks the list on a 1000 ms timer and also on events. Frankendom's server runs a fixed step; the target choice must be re-evaluated on each engine tick or on each hate change, not on a wall-clock timer, or the same fight can differ between clients and the server.
- The donor's melee test is measured from the creature. Frankendom's melee range is part of the fight engine (not read here); the sketch's `inMelee` flag must come from that one range check, not a second one.
- Online-state precedence is in the donor's comparator: a suppressed or offline attacker loses to any online attacker, whatever its threat. Frankendom must decide whether a stunned or guard-broken attacker can still be a target. The sketch keeps the precedence so the two cannot drift; the decision belongs to the duel rules.
- Taunt, fixate and redirect are real parts of the donor, but none is in our rulings. They are out of scope for this note; the sketch takes taunt as an input and omits the others.
- Threat sources (what adds hate in Frankendom: damage, guard, proximity, or spells) are not defined by this donor's shape. The donor's modifiers are per spell and per school; Frankendom has no school model. Do not port the modifier maths.
- The donor's `UpdateVictim` runs `ProcessAIUpdates` after every switch. The AI notification is not in the sketch; Frankendom needs one event when the target changes so the creature can react.
- Not read: `HeapNotifyIncreased` and `HeapNotifyDecreased` bodies, `EvaluateSuppressed` body, `SendThreatListToClients`, the map loop that calls `Creature::Update`.


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** (1) AddThreat step (d) 'creature must be in combat with the target, or no threat is added' misstates 440-441: SetInCombatWith CREATES combat and only fails for invalid targets (GM, dead) - threat implies combat. (2) 'otherwise only queues AI notifications (474-475)': code calls ProcessAIUpdates(), which fires JustStartedThreateningMe callbacks immediately. (3) 'read AddThreat in full' but the CanHaveThreatList shortcut (393-405, set combat + redirect targets, no refs) is not described. All other lines verified: ReselectVictim 596-649 incl. 1.1/1.3 and walk-down, CompareReferencesLT 668-675, enum values (ONLINE 2/SUPP 1/OFF 0; DETAUNT 0/NONE 1/TAUNT 2), Update timer 215-235 with THREAT_UPDATE_INTERVAL=1000 (.h 86), ShouldBeOffline/Suppressed 99-121, TauntUpdate 504-518, assist 733-759, Creature.cpp 750/765/1240-1245, CreatureAI 244-258, GPL v2-or-later. Sketch order matches donor.

**Missed:** ReselectVictim line 598 returns null on an empty list; UpdateVictim sends client update only on change (587-591). Minor.
