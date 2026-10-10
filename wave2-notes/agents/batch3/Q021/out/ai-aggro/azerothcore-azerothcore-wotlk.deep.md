# azerothcore-azerothcore-wotlk (ai-aggro, cell 3)

Donor: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Combat/ThreatManager.cpp` | Licence: as read: `ThreatManager.cpp` header "GNU General Public License ... either version 2 of the License, or (at your option) any later version"; repo `LICENSE` is GNU GPL v2 (June 1991). Copyleft, clean-room only | C++ | symbol `ThreatManager::ReselectVictim` / `ThreatManager::UpdateVictim` (with `AddThreat`, `ThreatReference::ShouldBeOffline`, `ShouldBeSuppressed`, `CompareReferencesLT`)

Checked: Read in full: `src/server/game/Combat/ThreatManager.cpp` 40-155 (reference state, online and taunt state), 189-215 (who can have a threat list), 230-250, 392-500 (`AddThreat`), 506-525 (`MatchUnitThreatToHighestThreat`), 526-552 (`TauntUpdate`), 569-616 (clear and fixate), 617-762 (`UpdateVictim`, `ReselectVictim`, `CompareReferencesLT`, `CalculateModifiedThreat`); `ThreatManager.h` 83-94, 199-200, 265-331 (enums, `GetThreat`, comparator); `Entities/Creature/Creature.cpp` 788-798 and 2532-2545 (update call and `CallForHelp`); `AI/CoreAI/UnitAI.cpp` 541-553 (`NonTankTargetSelector`); `Entities/Unit/Unit.cpp` 790-805 (`IsWithinMeleeRange`). Not read: `ThreatManager.cpp` 256-391 (query helpers, `EvaluateSuppressed`), 687-698 partly, 764-805 (`ForwardThreatForAssistingMe`), 807-1000 (temp and school modifiers, client packets, redirect bookkeeping); the spell side that calls `AddThreat` (`Spell::HandleThreatSpells`); the creature AI's chase and leash code; the default `dist` argument of `IsWithinMeleeRange` (Unit.h). Callers checked by grep: `GetThreatMgr().Update` only at `Creature.cpp:795`; `GetCurrentVictim` at `Creature.cpp:2538` and `UnitAI.cpp:549`. Confidence high on the victim-selection order and thresholds; medium on the exact modifier path (only the first of the chain was read end to end). Camera: not applicable.

Best transferable idea: Keep the current victim until a challenger's threat is more than 110% of its threat; a challenger above 130% takes over at any range, and below 130% only a melee-range challenger takes over, so ranged attackers cannot pull a tank off target with a small lead.

Decision (proposed): adapt — the 110/130 switch with a melee rule and the online-then-taunt-then-threat order fit Frankendom's many-on-one ruling (the hate table lives in the engine, MAX_ATTACKERS = 3), but the donor's 1-second re-selection and its raw threat values need changing to the fight tick, a seeded tie-break, and a 3-slot cap.

Acceptance: In a 3-on-1 server test, the attacker holding the most threat keeps the target through a lead of up to 110%, a challenger at 115% that is in melee range takes over, and a ranged challenger at 120% does not take over until it reaches 130%; the same seed reproduces the same switch sequence.

## 1. Mechanism

- Driver: `Creature::Update` calls `GetThreatMgr().Update(diff)` each update (Creature.cpp:795). `Update` runs `UpdateVictim` once per `THREAT_UPDATE_INTERVAL` = 1000 ms and only while the list is non-empty (ThreatManager.cpp:235-246; ThreatManager.h:94). The constructor sets `_updateTimer` to the interval (ThreatManager.cpp:216; seen in a grep, the rest of the constructor not read).
- Threat list: a reference per attacker holds `_baseAmount` (grows with each added amount, floored at 0; ThreatManager.cpp:51-61), a temp modifier, an online state (OFFLINE 0, SUPPRESSED 1, ONLINE 2; ThreatManager.h:270) and a taunt state (DETAUNT 0, NONE 1, TAUNT 2; ThreatManager.h:269). `GetThreat()` is base plus temp, floored at 0 (ThreatManager.h:274).
- Adding threat, `AddThreat` (ThreatManager.cpp:392-497). Stops if the spell has the no-threat attribute (397-398), or if the owner is not engaged and the spell suppresses procs (399-400). A rider's threat goes to its vehicle (404). Creatures that cannot hold a threat list just get combat (412-424). Then the amount is modified (428). Redirects send a percent to other listed units (430-456). Then the attacker must be in combat with the owner (459). An existing reference that is suppressed returns to online once the suppressing cause is gone (470-475); an online reference gains the amount (477-478). A new reference is created, its online state is resolved (`UpdateOffline`, 488), and the amount is added only if online (489-490). If there is no current victim, `UpdateVictim` runs (493-494); otherwise only AI notifications are processed (496).
- Modifiers, `CalculateModifiedThreat` (708-762): the spell's threat-table percent modifier (715), the victim's spell-mod owner applies its threat spell mod (717-718), then one school modifier of the victim (727 and the others), or a multi-school aura multiplier when the mask is mixed (749-757).
- Online state, `UpdateOffline` and `ShouldBeOffline` (75-93, 112-121): offline if the owner cannot see or detect the attacker (114), if the attacker is not acceptable or cannot be attacked (116), or if either side's faction flags forbid fighting (118-119). `ShouldBeSuppressed` (123-134): never for a taunting victim (125); suppressed when immune to the owner's melee school (127), confused (129), or stunned by a breakable aura (131).
- Victim choice, `UpdateVictim` and `ReselectVictim` (617-685). Every reference's online state is refreshed (637-638). A fixated target that is available wins (641-642). A current victim that is offline is dropped (645-646). If the top of the sorted list is offline, there is no victim (651-652). If there is no old victim or the top is already the old victim, the top wins (654-655). Otherwise the comparison `CompareReferencesLT(old, top, 1.1)` (657) decides: if the top does not break 110% of the old victim, the old victim stays. If the top breaks 130% (660), it wins regardless of range. If it is in melee range (663), it wins. Otherwise the list is walked from the top: the first unit that does not break 110% ends the walk with the old victim (674-675); the first melee-range unit above 110% wins (677-678).
- The comparison itself, `CompareReferencesLT(a, b, w)` (699-706): online state first (701-702), then taunt state (703-704), then `a.threat * w < b.threat` (705). The sorted list uses weight 1.0 (ThreatManager.h:326-328). So a suppressed or offline old victim is dropped for any online challenger, whatever the threat, because online state is compared first.
- Taunt: `TauntUpdate` (526-552) gives each taunt aura's caster a state in the order the auras apply (530-534), so the most recent taunt wins; a detaunt aura cast by the owner on the victim forces DETAUNT (139-140); then suppressed states are re-evaluated (546) and the victim is re-selected at once (550), resetting the timer (551).
- Timing: `AddThreat` does not re-select while a victim exists (493-496), so a challenger overtakes on the next 1000 ms tick, or at once after a taunt or when there is no victim. `GetCurrentVictim` re-selects if there is no victim or the current one is offline (248-254).
- Assist and match helpers: `MatchUnitThreatToHighestThreat` adds the difference to a target so it matches the highest (506-523). Not read in depth beyond this.
- Non-tank selection: `NonTankTargetSelector` excludes the current victim (UnitAI.cpp:549-550).

## 2. Key functions

- `ThreatManager::AddThreat`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Combat/ThreatManager.cpp` 392-497.
- `ThreatManager::UpdateVictim` and `ReselectVictim`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Combat/ThreatManager.cpp` 617-685. The victim rule with 110%, 130% and melee.
- `ThreatManager::CompareReferencesLT`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Combat/ThreatManager.cpp` 699-706.
- `ThreatReference::UpdateOffline`, `ShouldBeOffline`, `ShouldBeSuppressed`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Combat/ThreatManager.cpp` 75-134.
- `ThreatManager::CalculateModifiedThreat`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Combat/ThreatManager.cpp` 708-762.
- `ThreatManager::TauntUpdate`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Combat/ThreatManager.cpp` 526-552.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Keep the victim unless a challenger breaks a lead threshold (hysteresis) | 110% to challenge (theirs, ThreatManager.cpp:657, 674) |
| Strong challenger takes over at any range | 130% (theirs, ThreatManager.cpp:660) |
| Melee-range challenger takes over below the strong threshold | `IsWithinMeleeRange` with melee range plus leeway (theirs, Unit.cpp:800-802; default `dist` not read) |
| Sort by state, then taunt, then threat | Online 2 / suppressed 1 / offline 0; taunt 2 / none 1 / detaunt 0 (theirs, ThreatManager.h:269-270) |
| Threat timer for victim re-selection | 1000 ms (theirs, ThreatManager.h:94) |
| Threat value floor | 0 (theirs, ThreatManager.cpp:55; ThreatManager.h:274) |
| Spell and school threat multipliers | Spell table percent (theirs, ThreatManager.cpp:715); school modifiers (theirs, ThreatManager.cpp:727, 755) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for victim choice: fixate, then the sorted list with the online-then-taunt-then-threat comparison, then the 110%, 130%, melee and walk rules, and the 1000 ms timer. It omits the redirects, the vehicle rule, the combat check, the spell-table and spell-mod multipliers (the caller passes one combined `mods`), the detaunt and multiple-taunt ordering (taunt is a plain 0-2 value here), the suppression re-check from the donor's `EvaluateSuppressed`, the assist and match helpers, and the client packets. The donor's `ReselectVictim` recomputes the offline state for every reference first; the sketch expects the caller to set `online` beforehand. The donor's assert on a missing victim becomes `undefined`.

```ts
// Licence: copyleft (as read: ThreatManager.cpp header GPL v2 "or (at your option) any later version"; repo LICENSE GPL v2). clean-room sketch written from the described mechanism, not a translation of the donor lines.
export type Online = 0 | 1 | 2;   // 0 offline, 1 suppressed, 2 online (donor OnlineState)
export type Taunt = 0 | 1 | 2;    // 0 detaunt, 1 none, 2 taunt (donor TauntState)

export interface Ref {
  id: string;
  base: number;      // accumulated threat from added amounts
  temp: number;      // temporary integer modifier
  online: Online;
  taunt: Taunt;
}

export const threatOf = (r: Ref): number => Math.max(r.base + r.temp, 0);

// True when a ranks below b. Online state first, then taunt, then threat with a's threat weighted by w.
export function ranksBelow(a: Ref, b: Ref, w: number): boolean {
  if (a.online !== b.online) return a.online < b.online;
  if (a.taunt !== b.taunt) return a.taunt < b.taunt;
  return threatOf(a) * w < threatOf(b);
}

// One threat event. mods is the combined spell and school multiplier (the donor applies several).
// state(id) gives the current online state of the attacker as the owner sees it.
export function addThreat(refs: Map<string, Ref>, id: string, amount: number, mods: number, state: (id: string) => Online): void {
  const a = amount * mods;
  let r = refs.get(id);
  if (!r) {
    r = { id, base: 0, temp: 0, online: state(id), taunt: 1 };
    refs.set(id, r);
  } else if (r.online === 1 && state(id) === 2) {
    r.online = 2; // suppression lifted: the donor only goes back online when threat is caused by the attacker
  }
  if (r.online === 2) r.base = Math.max(r.base + a, 0);
}

// Victim choice. A fixated target wins while available. A suppressed or offline old victim is dropped
// for any online highest. Otherwise the old victim keeps the role unless the highest is above 110%,
// and above 130% it wins at any range. Below 130%, a melee-range highest wins, else the first melee
// unit above 110% in sorted order wins.
export function reselectVictim(refs: Ref[], current: Ref | undefined, fixate: Ref | undefined, isMelee: (r: Ref) => boolean): Ref | undefined {
  if (fixate && fixate.online > 0) return fixate;
  const sorted = [...refs].sort((x, y) => (ranksBelow(x, y, 1) ? 1 : ranksBelow(y, x, 1) ? -1 : 0));
  if (sorted.length === 0) return undefined;
  const highest = sorted[0];
  if (highest.online === 0) return undefined;
  const old = current && current.online > 0 ? current : undefined;
  if (!old || highest === old) return highest;
  if (!ranksBelow(old, highest, 1.1)) return old;
  if (ranksBelow(old, highest, 1.3)) return highest;
  if (isMelee(highest)) return highest;
  for (const next of sorted) {
    if (next === old) return next;
    if (!ranksBelow(old, next, 1.1)) return old;
    if (isMelee(next)) return next;
  }
  return undefined; // donor asserts here (manager desync)
}

// Re-selection runs on a 1000 ms timer, starting full (donor THREAT_UPDATE_INTERVAL and _updateTimer).
export class VictimTimer {
  private t = 1000;
  tick(dtMs: number, reselect: () => void): void {
    if (this.t <= dtMs) { reselect(); this.t = 1000; } else this.t -= dtMs;
  }
}

export {};
```

## 5. Lands in

- TARGET `src/fight/threat.ts` (new module, engine hate table): the threat list, the 110/130 victim rule, and the timer. Parity-checklist row 2 (AI brain). The attack that follows the chosen victim sits in the fight loop (row 4).
- today: Frankendom's current target code was not opened in this pass; this is where it would go.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: rulings "many-on-one logic (hate list, target selection) lives in the engine" and MAX_ATTACKERS = 3 (addendum, Frankendom context); parity row 2 (AI brain)

## 6. Gaps and risks

- Copyleft: clean-room only. The sketch is written from the mechanism; the donor is a port of TrinityCore (ThreatManager.cpp header line 19).
- Suppressed or offline victims are dropped at once, not at 110%: the online-state comparison comes before threat (ThreatManager.cpp:701-702). A confused or stunned tank loses the role to any online attacker at the next re-selection. Frankendom must decide whether that is wanted; the donor's behaviour is retail-like, not a fairness rule.
- Re-selection is on a 1000 ms timer, not on each threat event (ThreatManager.cpp:493-496, 235-243). In a fast duel a challenger can lead for up to a second before taking the role. Frankendom's fight tick is far shorter, so the interval must be a data field, not copied.
- Threat values are raw and unbounded above, and scale with spell tables and aura multipliers that were only partly read (ThreatManager.cpp:708-762). Frankendom should keep threat in engine units with a single, tested modifier path.
- No seed: the donor has no RNG in this path (none found in the lines read), so a tie between equal threats is decided by the sorted-list order (fibonacci heap, not read in depth), not by a seed. Frankendom's replay and server verification need the tie rule stated and tested.
- Many-on-one: the donor has no slot cap, so every attacker in range can sit on the list. Frankendom's MAX_ATTACKERS = 3 rule must be added; this sketch does not enforce it.
- Taunt ordering uses the most recent taunt aura (ThreatManager.cpp:530-534); the sketch uses a plain 0-2 value and does not model it.
- Not read: the chase and leash code that moves the creature (the donor's movement, not this file), the spell side that calls `AddThreat`, and `EvaluateSuppressed`.
