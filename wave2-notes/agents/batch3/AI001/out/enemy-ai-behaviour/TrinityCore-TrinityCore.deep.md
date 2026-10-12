# TrinityCore-TrinityCore (enemy-ai-behaviour, cell 3)

Donor: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Combat/ThreatManager.cpp` (plus `ThreatManager.h`, `src/server/game/Entities/Creature/Creature.cpp`, `CreatureData.h`, `src/server/game/AI/CreatureAI.cpp`) | Licence: GPL-2.0-or-later (per-file header, `ThreatManager.h` lines 4-7: "either version 2 of the License, or (at your option) any later version"; the box's `COPYING` is GPL version 2, June 1991) | C++ | symbol `ThreatManager::ReselectVictim`, `ThreatManager::AddThreat`, `ThreatManager::CompareReferencesLT`

Checked: Read in full: `ThreatManager.h` (1-326, including the developer documentation block at 34-71). Read in ranges: `ThreatManager.cpp` 36-141 (ThreatReference add, scale, offline, suppressed, taunt state), 215-249 (timer, GetCurrentVictim), 382-476 (AddThreat), 504-526 (TauntUpdate), 540-547 and 559-572 (ClearThreat, fixate), 581-680 (victim selection and comparator), 677-731 (spell and school modifiers), 733-760 (assist threat), 801-806, 923-940 (redirect). Read in ranges: `Creature.cpp` 914-926 and 1283-1302 (evade triggers), `CreatureAI.cpp` 244-262, `CreatureData.h` lines 120 and 424, `COPYING` line 2. Grepped only: all callers of `UpdateVictim`/`ReselectVictim` across `src/server/game` (for cadence), and `Combat/` for decay (none found). Candidate files opened: 6 or more. Not read: `Unit::SelectVictim` (the AI-side selector; it is what `CreatureAI.cpp` 257 calls), the order of `GetAuraEffectsByType` (it decides which taunter is "recent"), `SpellMgr` threat entries (`SpellThreatEntry`), the boost Fibonacci heap class (ThreatManager.cpp 34), the client packet code (`SendThreatListToClients`), the leash-distance rule (only its flag was located). Confidence: high on the ordering keys, the 110%/130% rules, the melee exception and the 1 s cadence (read from code). High on the taunt defect's arithmetic (worked from lines 512 and 518, and checked with a small calculation on the VPS; not run against the donor). Medium on the evade result (the caller of `GetCurrentVictim` was not read). camera_scope: not applicable.

Best transferable idea: keep one threat table per creature and pick its target by three keys in order (can it be attacked now, is it taunting, how much threat), switching only when a challenger is clearly above the current one: above 110% for a melee source, above 130% from any range.
Decision (proposed): adapt - take the three-key ordering and the two-ratio hysteresis; fix the taunt rank (per source, not per effect), the up-to-1 s switch lag (re-select when a change crosses the ratio) and the per-entry visibility checks on every re-selection.
Acceptance: in a one-boss test with three attackers (MAX_ATTACKERS = 3), a ranged healer at 115% of the tank's threat does not take aggro; at 135% it does, on the same server tick as the threat lands; a melee damage dealer at 115% does take aggro; and a second taunt from another source takes aggro while the first taunt stays on the list (no source is left at NONE or DETAUNT by a stacked taunt).

## 1. Mechanism

- Data. Each creature with a threat list owns a `ThreatManager` (header 81-261). Each threatening unit has one `ThreatReference` (header 264-322) held in the creature's list and in the source's "threatened by me" list. A reference carries: `_baseAmount` (threat), `_tempModifier` (aura modifiers), `_online` (2 = ONLINE, 1 = SUPPRESSED, 0 = OFFLINE, header 268) and `_taunted` (2 = TAUNT, 1 = NONE, 0 = DETAUNT, header 267). Threat value is `max(base + temp, 0)` (header 272).
- Accrual, `ThreatManager::AddThreat` (382-476). Order: (a) spells with the no-threat attributes return at once (384-391); (b) threat is multiplied by the spell's percentage modifier (683-684), the player's hate spell mods (686-687) and the victim's per-school modifier (691-729); (c) positive threat is partly redirected to other units by percent (411-437); (d) the source is put in combat with the creature (440); (e) an existing entry that is SUPPRESSED becomes ONLINE again if it is no longer suppressed (449-455), and an ONLINE entry gets the threat (457-458); (f) a new entry is created, put in both lists, its online state is set (467), and it gets the threat only if it is online (468-469). If there was no victim, the victim is re-selected at once (471-472). `ThreatReference::AddThreat` floors the base at zero (42).
- Online state, `UpdateOffline` (62-80). Offline if the creature cannot see the victim (`ShouldBeOffline`, 101), the target is not acceptable or cannot be attacked (103), or the faction flags forbid a fight (105-106). Otherwise suppressed if the victim is immune to the creature's melee school (114), confused (116) or stunned by a damage-breakable aura (118), except that a taunting victim is never suppressed (112).
- Taunt state, `TauntUpdate` (504-525). For each entry the taunt state comes from the taunt aura of that source (512-518); other entries get the default (520); then suppressed states are re-evaluated (524). A detaunt aura from the creature forces DETAUNT (`UpdateTauntState`, 123-140).
- Fixate, `FixateTarget` (559-571). A fixated entry is returned first whenever it is available (605-606).
- Victim selection, `UpdateVictim` (581-594) and `ReselectVictim` (596-649). In order: fixate (604-606); an offline old victim is dropped (608-610); the heap top is the highest (612); if the highest is offline, nobody is the victim (613-615); with no old victim, or the highest is the old victim, the highest wins (617-618); if the highest is not above 110% of the old victim, the old victim stays (620-621); above 130%, the highest wins whatever its range (623-624); a highest that is in melee range of the creature wins (626-627); otherwise walk down the heap (630-645): reaching the old victim returns it (635-636), a next entry not above 110% keeps the old victim (638-639), and the first next entry in melee range above 110% wins (641-642).
- Comparator, `CompareReferencesLT` (668-675). Lower-ranked first: online state (670-671), then taunt state (672-673), then threat times a weight (674). The weight is 1.1 or 1.3 in re-selection, 1.0 in the heap order.
- Cadence. `ThreatManager::Update` (215-234) re-selects every `THREAT_UPDATE_INTERVAL` = 1000 ms (header 86; cpp 220-231) when the list is not empty (228-229). Re-selection also runs when the current victim is missing or offline in `GetCurrentVictim` (244-245), on the first threat with no victim (471-472), and in `ClearThreat` when there is no victim (544-545). The existing-entry branch of `AddThreat` returns without re-selecting (457-459). So a new highest threat changes the target at the next timer tick, not at once.
- Assist threat, `ForwardThreatForAssistingMe` (733-759). A helper's threat is split evenly across every creature that threatens the helped unit (744-755); creatures under control get `AddThreat(assistant, 0.0f, ...)` (757-758), which keeps them in combat without threat.
- Redirect. A share of positive threat can be redirected to other units; the total redirect percent is capped at 100 (923-940; the cap is at 930).
- Decay. None found: a grep of `Combat/` for decay returned no threat-decay code.

## 2. Key functions

- `ThreatReference::AddThreat`, `ScaleThreat`, `UpdateOffline`, `ShouldBeOffline`, `ShouldBeSuppressed`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Combat/ThreatManager.cpp` 38-122.
- `ThreatManager::Update` (timer): same file, 215-240.
- `ThreatManager::AddThreat`: same file, 382-476.
- `ThreatManager::TauntUpdate`: same file, 504-525.
- `ThreatManager::UpdateVictim` and `ReselectVictim` (selection and hysteresis): same file, 581-649.
- `ThreatManager::CompareReferencesLT`: same file, 668-675.
- `ThreatManager::ForwardThreatForAssistingMe`: same file, 733-759.
- Evade triggers: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Creature/Creature.cpp` 914-926 (no path for `CREATURE_NOPATH_EVADE_TIME`), 1283-1302 (no hostiles).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants and rules |
|---|---|
| Switch the victim only when a challenger is clearly above it | 110%: `CompareReferencesLT(..., 1.1f)` (ThreatManager.cpp 620, 638). |
| Override regardless of range | 130%: `CompareReferencesLT(..., 1.3f)` (623). |
| Between 110% and 130%, only a melee source switches | Rule, no number: `IsWithinMeleeRange` (626, 641). |
| Re-selection cadence | 1000 ms (ThreatManager.h 86; cpp 220-231). |
| Threat floor | 0 (cpp 42; header 272). |
| Online ranks | ONLINE 2, SUPPRESSED 1, OFFLINE 0 (header 268). |
| Taunt ranks | TAUNT 2, NONE 1, DETAUNT 0 (header 267). |
| Assist split | 1/N across the N non-controlled threatened creatures (cpp 752). |
| Redirect cap | 100 percent in total (cpp 930). |
| No-path evade | `5 * IN_MILLISECONDS` (CreatureData.h 424; the macro value was not read). |
| Spell and school threat multipliers | Per spell and per aura (SpellMgr and aura data not read). |

## 4. TypeScript sketch

simplified: The sketch keeps the donor's three-key ordering (online, then taunt, then threat), the 110% and 130% switch rules, the melee exception, the fixate preference, the 1000 ms timer and the rule that threat from a suppressed or offline source is dropped. It replaces the heap with a linear scan and a sort, it does not model spell or school multipliers, redirects, assist splits, client packets, AI callbacks or combat references, and it takes taunt as a 0..2 input rather than computing the rank from auras (the donor's rank formula is defect 1 in section 6). The sketch's switch happens on the timer, as the donor's does; the change proposed in section 6 (defect 2) is not in the sketch. The example is checked on the VPS: it prints `[1,1,2]`, as expected: the first source keeps aggro at 115 and loses it at 135.

```ts
// Licence: GPL-2.0-or-later (donor TrinityCore). Clean-room sketch from the described mechanism; no donor lines copied.
export type Online = 0 | 1 | 2; // 0 offline, 1 suppressed, 2 online
export type Taunt = 0 | 1 | 2; // 0 detaunt, 1 none, 2 taunt (higher ranks first)

export interface Ref {
  id: number; // the threatening unit
  base: number; // threat value, never below zero
  online: Online;
  taunt: Taunt;
  inMelee: boolean; // is this source in melee range of the owner (set by the engine)
}

export const SWITCH_RATIO = 1.1; // a new highest must be above 110% of the victim to replace it
export const OVERRIDE_RATIO = 1.3; // above 130% it replaces the victim regardless of range
export const UPDATE_INTERVAL_MS = 1000; // victim re-selection cadence on the timer

export class ThreatTable {
  private refs = new Map<number, Ref>();
  private current: Ref | null = null;
  private fixate: number | null = null;
  private timer = UPDATE_INTERVAL_MS;

  // nowState: 2 if the source can be attacked now, 1 if suppressed (immune or breakable CC), 0 if offline (not visible, not valid)
  add(id: number, amount: number, nowState: Online): void {
    const existing = this.refs.get(id);
    if (existing !== undefined) {
      // a suppressed entry comes back online only when the source is no longer suppressed
      if (existing.online === 1 && nowState === 2) existing.online = 2;
      if (existing.online === 2) existing.base = Math.max(existing.base + amount, 0);
      return;
    }
    const r: Ref = { id, base: 0, online: nowState, taunt: 1, inMelee: false };
    this.refs.set(id, r);
    if (r.online === 2) r.base = Math.max(amount, 0); // threat from a suppressed or offline source is dropped
  }

  setTaunt(id: number, t: Taunt): void {
    const r = this.refs.get(id);
    if (r !== undefined) r.taunt = t;
  }

  setFixate(id: number | null): void {
    this.fixate = id !== null && this.refs.has(id) ? id : null;
  }

  // true if a ranks lower than b: online state first, then taunt, then threat times aWeight
  private lower(a: Ref, b: Ref, aWeight: number): boolean {
    if (a.online !== b.online) return a.online < b.online;
    if (a.taunt !== b.taunt) return a.taunt < b.taunt;
    return a.base * aWeight < b.base;
  }

  private reselect(): Ref | null {
    const live = [...this.refs.values()];
    if (live.length === 0) return null;

    if (this.fixate !== null) {
      const f = this.refs.get(this.fixate);
      if (f !== undefined && f.online > 0) return f;
    }

    let highest = live[0];
    for (const r of live) if (this.lower(highest, r, 1)) highest = r;
    if (highest.online === 0) return null; // everyone offline: the caller evades

    const old = this.current !== null && this.current.online > 0 ? this.current : null;
    if (old === null || highest === old) return highest;
    if (!this.lower(old, highest, SWITCH_RATIO)) return old; // not above 110%: keep the victim
    if (this.lower(old, highest, OVERRIDE_RATIO)) return highest; // above 130%: switch regardless of range
    if (highest.inMelee) return highest; // between 110% and 130%: only a melee source switches

    // highest is ranged and below 130%: look down the list for a melee source above 110%
    const rest = live.filter((r) => r !== highest && r.online > 0).sort((a, b) => (this.lower(a, b, 1) ? 1 : -1));
    for (const next of rest) {
      if (next === old) return old;
      if (!this.lower(old, next, SWITCH_RATIO)) return old;
      if (next.inMelee) return next;
    }
    return old; // donor: hard abort here (desync); the sketch keeps the victim
  }

  // timer-driven re-selection (donor: ThreatManager::Update)
  update(dtMs: number): void {
    if (this.timer <= dtMs) {
      this.current = this.reselect();
      this.timer = UPDATE_INTERVAL_MS;
    } else {
      this.timer -= dtMs;
    }
  }

  // current victim; re-selects only when there is none or it went offline (donor: GetCurrentVictim)
  victim(): Ref | null {
    if (this.current === null || this.current.online === 0) this.current = this.reselect();
    return this.current;
  }
}

// Example: 1 takes aggro at 100; 2 reaches 115 (not above 130%: 1 keeps it); then 2 reaches 135 (above 130%: switch).
export function example(): [number | null, number | null, number | null] {
  const t = new ThreatTable();
  t.add(1, 100, 2);
  t.update(UPDATE_INTERVAL_MS);
  const first = t.victim()?.id ?? null;
  t.add(2, 115, 2);
  t.update(UPDATE_INTERVAL_MS);
  const second = t.victim()?.id ?? null;
  t.add(2, 20, 2);
  t.update(UPDATE_INTERVAL_MS);
  const third = t.victim()?.id ?? null;
  return [first, second, third];
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (TypeScript 7.0.2): exit 0. Run: compiled to CommonJS on the VPS, `example()` prints `[1,1,2]`. The local quality hook could not check it on the Mac (no tsc there).

## 5. Lands in

- TARGET `src/fight/threat.ts` (new module: the per-creature aggro table and victim choice; the engine owns it, the client sees only the victim id).
- Parity-checklist row 4 (fight loop: aggro, chase, leash). The threat table is the aggro part of row 4.
- Reuse tag: clean-room (GPL-2.0-or-later): shape only, no lines copied; the sketch above is written from the mechanism.
- Brief rule served: 4 (fight loop: aggro and target choice, one engine for many-on-one); MAX_ATTACKERS = 3 applies to acting, not to ranking (see section 6).

## 6. Gaps and risks

- Defect 1, taunt rank counts effects against sources (ThreatManager.cpp 508, 510, 512, 518). The rank is `TAUNT + tauntStates.size() - rank`, where `size()` counts distinct sources but `rank` (`tauntPriority`) counts every taunt effect (512). Worked from the lines and checked with a small calculation on the VPS (not run against the donor): one source with two taunt effects gets NONE (2 + 1 - 2 = 1); with [A, A, B] the later source B gets NONE (2 + 2 - 3 = 1) while A gets TAUNT; one source with three effects gets DETAUNT (2 + 1 - 3 = 0). A fourth stacked effect would make the subtraction negative, which in unsigned arithmetic wraps to a huge value (worked by hand, not run). Which source counts as "recent" also depends on the order of `GetAuraEffectsByType`, which was not read. Fix: build the list of distinct sources in order of their last taunt effect, then rank each as TAUNT + (count - index); never subtract effect counts.
- Defect 2, switch lag of up to 1000 ms (cpp 220-231 against 457-459). A challenger whose threat crosses 110% or 130% waits for the next timer tick. Fix: on a threat change, re-run the comparison against the current victim only when the change crosses a ratio (one comparison); keep the timer for the rest.
- Defect 3, per-entry checks on every re-selection (cpp 601-602; `ShouldBeOffline` 99-108 and `ShouldBeSuppressed` 110-121). Every entry is re-checked for visibility, faction flags and auras at each re-selection, and `GetCurrentVictim` re-checks the victim on each call (244). On a small server this is a cost per creature per second for every entry. Fix: update the online and taunt states on the events that change them (aura applied or removed, visibility change) and cache per server tick.
- Defect 4, hard abort on desync (cpp 647). A state bug becomes a server crash. Fix: keep the invariant as a test; in production, log and keep the highest available entry.
- Rule (keep, not a defect): threat from a suppressed or offline source is dropped, not banked (cpp 457-468; comment at 449). Frankendom must choose: drop (donor) or bank until the state clears (ruling 3).
- Absences. No threat decay (grep). The leash distance rule was not located: only the flag `CREATURE_STATIC_FLAG_3_NO_AGGRO_ON_LEASH` (CreatureData.h 120) exists in the read ranges. Evade triggers are "no hostiles" (Creature.cpp 1300) and "no path for 5 s" (921-923); the caller of `GetCurrentVictim` that leads to evade on an all-offline list was not read.
- MAX_ATTACKERS = 3. The table ranks every source but the donor has no cap on how many may act. Frankendom must treat a slot as part of "can attack now": a source without a slot is not ONLINE for acting, though it can still hold threat. Otherwise the fourth source takes the victim and cannot attack.
- One ledger and server-verified kills. Threat is server state. Do not send the whole table to the client; send the victim id only (the donor sends the list to clients through `SendThreatListToClients`, not read).
- Zones as data. Per-school and per-spell threat multipliers are data in the donor (aura and SpellMgr tables, not read). Frankendom expresses each as a row field on the ability (multiplier, school), not as code.
- Pit as client. The Pit shows the victim; the table stays in the engine.

## 7. As-data shape (PASS2 item 1)

- Donor data: no table on disk. Rows exist in memory: one `ThreatReference` per (creature, source) pair with fields owner (creature), victim (unit), base threat (float, floor 0), temp modifier (float), online (0, 1 or 2), taunt (0, 1 or 2), and a fixate flag at the table level. The redirect registry rows are (spell id, victim, percent, capped at 100 in total). Spell threat multipliers come from the spell threat table (SpellThreatEntry, not read).
- A new threat source is one row: yes, as a row keyed by the source's id (why: a source needs no code beyond its threat amount and its online and taunt states). A new taunt effect is one aura row mapped to the taunt aura type: yes, if the taunt aura already exists (why: the rank is read from the aura list, but the rank formula is defect 1). A new online or taunt state is code, not a row (why: the comparator and the switch rules are code).

## 8. Provenance and history (PASS2 items 2 and 3)

- Provenance per claim: TrinityCore project, GPL-2.0-or-later per-file header (ThreatManager.h 4-7; COPYING line 2 "Version 2, June 1991"). Files and lines as in the receipts. The box has no `.git` directory: no commit history.
- Patch history: none in the box. The code comments record two behaviour choices as "retail behavior" (ThreatManager.cpp 449, 523) and one as a rule for the desync abort (647). The developer block at header 34-71 says to keep the documentation up to date when the system changes; it is the only design history.

## 9. Rulings for Dom (PASS2 item 4)

1. Should a boss re-pick its target when a threat change crosses 110% or 130% (immediate, one comparison), or on a fixed one-second timer as the donor does? Recommendation: on the crossing, with the timer as a fallback.
2. Should a taunt move aggro to the taunter for the taunt's duration, and should a second taunt take aggro from the first? Recommendation: yes for both, with the last taunter ranking highest, implemented by the per-source rank in section 6.
3. When a source is suppressed or offline (immune, stunned, out of sight), should its threat be dropped (donor) or banked until the state clears? Recommendation: dropped, to avoid a catch-up burst when a stun breaks.

## Reuse tag

clean-room (GPL-2.0-or-later). Shape only; no lines copied.

## Brief rule served

4 (fight loop: aggro and target choice in the engine; the client gets only the victim).

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
- Verdict: CLEAN. ReselectVictim order, enums, taunt defect arithmetic, redirect cap, evade timers and licence all verified.
- Minor miss: no-path evade is skipped in raid maps (!GetMap()->IsRaid(), Creature.cpp ~917).
- Minor miss: AddThreat for creatures that cannot have a threat list only sets combat state.
- Minor miss: owner detaunt aura forces DETAUNT only when state < TAUNT (UpdateTauntState); the note says "forces" without that condition.
