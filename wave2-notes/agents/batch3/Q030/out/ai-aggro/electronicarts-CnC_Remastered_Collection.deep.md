# electronicarts-CnC_Remastered_Collection (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/TECHNO.CPP` | Licence: GPL-3.0-or-later with EA section 7 additional terms (TECHNO.CPP header lines 1-12; LICENSE.md line 601: no trademark or publicity rights, indemnity, no misrepresentation) | C++ | symbol `TechnoClass::Greatest_Threat`

Checked: Read in full: `TechnoClass::Evaluate_Object` (TECHNO.CPP 1333-1505), `TechnoClass::Greatest_Threat` (1584-1807), `TechnoClass::Threat_Range` (3701-3710), `TechnoClass::Target_Something_Nearby` (4179-4205), `TechnoClass::Value` (3659-3678), `FootClass::Greatest_Threat` (FOOT.CPP 1886-1903), `FootClass::Mission_Hunt` (661-674), `FootClass::Mission_Timed_Hunt` (646-745), `Target_Legal` (TARGET.CPP 399-408). Compiled-in branches checked in DEFINES.H: `ADVANCED` is commented out (line 44), so the `#else` scoring is the live one; `USE_RA_AI` is defined (line 58). This is the Tiberian Dawn build only; the REDALERT folder was not read. Callers of `Greatest_Threat`: grep lists TEAM.CPP 539-564, REINF.CPP 396, AIRCRAFT.CPP 638, BUILDING.CPP 3925 and TECHNO.CPP 4198; only 4198 (via `Target_Something_Nearby`) was read, so the claims about who calls it are from grep, not reading. Not read: `Risk()`, `Distance()`, `Random_Pick`, `Approach_Target`, `Random_Animate`, the code that sets `House->Enemy`, and whatever consumes the delay that `Mission_Hunt` and `Mission_Timed_Hunt` return. Confidence high on the full-map scoring path (read end to end). Medium on the ring-scan result, which I read from the code and a grep of `bestval`, not from a run. camera_scope: not applicable (ai-aggro cell).

## 1. Mechanism

- Who calls: a unit with no legal target asks `Greatest_Threat(method)` for one. `Target_Something_Nearby` (TECHNO.CPP 4179-4205) is the entry point used by the hunt missions: it keeps the current target while `Target_Legal` says it is still active, and re-picks only when it is not (4197-4198). For the plain hunt call (`THREAT_NORMAL`), the range check at 4188 is skipped, so a hunting unit has no leash here and keeps its target until the target goes inactive.
- Foot units (FOOT.CPP 1886-1902) add `THREAT_GROUND` (vehicles, buildings, infantry) and add `THREAT_AIR` when their primary or secondary weapon is anti-aircraft.
- Full-map scan (taken when neither `THREAT_RANGE` nor `THREAT_AREA` is set, the hunt case): (a) every aircraft is evaluated first; (b) then every ground-layer techno object (1733-1784; aircraft loop 1744-1754, ground loop from 1768). Both use `Evaluate_Object` with range -1, which means no distance cut-off.
- `Evaluate_Object` filters first (in limbo, allied, outside the mask, cloaked, not a legal target, and others; 1333-1447). Then it scores in this order (1448-1501): (1) score = worth + kills, where worth is `Value()` = `Risk() + Reward + attached contents` (1448-1449, 3659-3678) and kills is the unit's own kill counter; (2) if the object's owner is the house's declared enemy, score = (score + 500) x 3 (1457-1459); (3) if score is nonzero, score = score x 32000 / (floor(dist / 256) + 1) (1486-1490); (4) if the object has worth, score = max(score, 2) (1500-1501). The `dist` value is divided by `ICON_LEPTON_W` (256), so it is read as leptons; `Distance()` itself was not read.
- Pick (full-map): highest score wins. Equal best scores are collected up to 128 (1604), and one is chosen with `Random_Pick` (1800-1801). No candidate: `TARGET_NONE`.
- Pick (area or range scan, the ring path, 1614-1732): the ring scan starts at the fire coordinate's cell and widens ring by ring; each cell is passed to `Evaluate_Cell` (1534), which takes the first non-allied techno object in it and scores it with the `range` from `Threat_Range`. The comparison is `bestval < value` (1675, 1684, 1703, 1712), but in the ring branch `bestval` is only raised in the aircraft loop (1638-1640), and the ring loops never raise it. So the ring path keeps the LAST candidate scanned that beats the aircraft best, not the highest score. After it finishes ring radius `crange/4` or `crange/2` (1724, 1727) it returns the best candidate so far, if there is one. I read this as a defect in the donor (not run).
- Range for the ring scan: `Threat_Range` returns 2 x max weapon range, bounded to 0..0x0A00 (3706-3708); control 0 means "check In_Range", control -1 means no range limit.
- Tick: `Mission_Hunt` (FOOT.CPP 661-674) runs one step: if `Target_Something_Nearby(THREAT_NORMAL)` finds nothing it calls `Random_Animate()`; otherwise `Approach_Target()` (infantry type E7 captures instead). It returns `TICKS_PER_SECOND+5` = 20 ticks (673; `TICKS_PER_SECOND` is 15, DEFINES.H 2146). So the unit re-checks about every 1.33 s. The caller that uses this delay was not read.
- Snap-out into hunt: `Mission_Timed_Hunt` (FOOT.CPP 693-738) is the AI for computer houses in multiplayer. It switches to `MISSION_HUNT` when (a) blitz is on and `BlitzTime == 0` (705), or (b) `House->CurUnits < ((House->MaxUnit * 4) / 5)` (706), i.e. the house has lost more than one fifth of its units (the comment at 702-703 says "1/4"; the code says 4/5), or (c) a roll `IRandom(0,rndmax) == 1` (722) with rndmax 5000 when MP bases are on (717) and 1000 otherwise (719). Otherwise it calls `Mission_Guard_Area`. It returns `TICKS_PER_SECOND+Random_Pick(0, 4)` (736), i.e. 15 to 19 ticks.

## 2. Key functions

- `TechnoClass::Evaluate_Object`: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/TECHNO.CPP` 1333-1505. Filters, then score: worth + kills, enemy bonus, distance falloff, floor.
- `TechnoClass::Greatest_Threat`: same file, 1584-1807. Full-map branch (1733-1784; aircraft loop 1744-1754, ground loop from 1768) and random tie-break (1790-1806); ring branch (1614-1732) with the bestval defect.
- `TechnoClass::Threat_Range`: same file, 3701-3710. Range = 2 x max(Weapon_Range) bounded to 0..0x0A00.
- `TechnoClass::Target_Something_Nearby`: same file, 4179-4205. Keep the target while legal; re-pick through `Greatest_Threat` otherwise.
- `TechnoClass::Value`: same file, 3659-3678. Worth = `Risk()` + `Techno_Type_Class()->Reward` + value of attached cargo (cargo counted only from BuildLevel > 8 or non-normal game, 3667).
- `FootClass::Greatest_Threat`: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/FOOT.CPP` 1886-1903. Adds `THREAT_GROUND` and `THREAT_AIR` for anti-aircraft weapons.
- `FootClass::Mission_Hunt`: FOOT.CPP 661-674. The periodic hunt step (20-tick delay).
- `FootClass::Mission_Timed_Hunt`: FOOT.CPP 693-738. Snap-out into hunt (blitz, unit-loss threshold, random roll).
- `Target_Legal`: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/TARGET.CPP` 399-408. Legal means no target, or an object whose `IsActive` is set.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Score = worth + kills (the more it is worth and the more it has killed, the bigger the threat) | Value = Risk + Reward + cargo (theirs, TECHNO.CPP 3677); Kills counter (theirs, 1449) |
| A declared enemy gets a flat boost before the multiplier | +500 then x3 (theirs, 1458-1459; receipt on line 1457 because 1458-1459 are under 15 characters) |
| Threat falls off with distance: score x K / (cells + 1) | K = 32000; cells = floor(dist / 256) (theirs, 1490 and 1486; ICON_LEPTON_W 256, DISPLAY.H 44) |
| Objects with worth never score below a small floor | Floor 2 (theirs, 1501) |
| Ties are broken at random, from a capped list | 128 ties (theirs, 1604); `Random_Pick` (theirs, 1800) |
| Keep the current target while it is active; re-pick only when it is not | Legal = `IsActive` (theirs, TARGET.CPP 405) |
| Re-check the target on a fixed beat | 20 ticks = TICKS_PER_SECOND + 5 (theirs, 673; 15 ticks per second, DEFINES.H 2146) |
| Snap-out into hunt when a computer house has lost units | Threshold 4/5 of max units (theirs, 706); random roll 1 in rndmax + 1 (theirs, 717-722; the 1 in N reading is inferred from IRandom's inclusive range) |
| Scan range from weapon range | 2 x max weapon range, cap 0x0A00 = 2560 leptons = 10 cells (theirs, 3706-3708; cell size from ICON_LEPTON_W) |

## 4. TypeScript sketch

simplified: the sketch keeps the full-map scoring order (worth + kills, enemy bonus, distance falloff, floor), the capped random tie-break, and the keep-while-active rule. It omits every filter in `Evaluate_Object` (allied, cloaked, mask, visibility, the SAM and Delphi cases, transport cargo), the aircraft pass, the ring scan and `Threat_Range`, the RANGE/AREA flags, the Tiberium-only filter, and the hunt timers (`Mission_Hunt` and `Mission_Timed_Hunt`). It also drops the donor's `Risk()` and `Reward` inputs by taking `worth` as a number. The donor's `value` is an integer, so `Math.trunc` is used to match C division for these non-negative values.

```ts
// Licence: GPL-3.0-or-later with EA section 7 additional terms (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Candidate {
  id: number;
  active: boolean;       // donor: Target_Legal -> IsActive
  worth: number;         // donor: TechnoClass::Value (risk + reward + attached contents)
  kills: number;         // donor: CrewClass Kills added to the score
  ownerIsEnemy: boolean; // donor: House->Enemy == object's house (RA AI block)
  distCells: number;     // whole cells from the attacker (donor divides by 256 leptons)
}

export interface AiConfig {
  scale: number;          // 32000 in donor (falloff numerator)
  enemyBonus: number;     // 500 in donor
  enemyMul: number;       // 3 in donor
  worthFloor: number;     // 2 in donor (minimum for objects with worth)
  maxTies: number;        // 128 in donor
  retargetTicks: number;  // TICKS_PER_SECOND + 5 = 20 in donor (15 ticks per second)
}

export const DONOR_AI: AiConfig = {
  scale: 32000, enemyBonus: 500, enemyMul: 3, worthFloor: 2, maxTies: 128, retargetTicks: 20,
};

// Score one candidate the way the full-map scan does: worth plus kills, enemy bonus, then distance falloff.
export function scoreCandidate(c: Candidate, cfg: AiConfig): number {
  let v = c.worth + c.kills;
  if (c.ownerIsEnemy) v = (v + cfg.enemyBonus) * cfg.enemyMul;
  if (v !== 0) v = Math.trunc((v * cfg.scale) / (c.distCells + 1));
  if (c.worth > 0) v = Math.max(v, cfg.worthFloor);
  return v;
}

// Full-map pick: highest score wins; equal best scores are kept (capped) and one is chosen at random.
export function pickTarget(cands: Candidate[], cfg: AiConfig, rnd: () => number): number | null {
  let best = -1;
  let ties: Candidate[] = [];
  for (const c of cands) {
    if (!c.active) continue;
    const v = scoreCandidate(c, cfg);
    if (v > best) {
      best = v;
      ties = [c];
    } else if (v === best && ties.length < cfg.maxTies) {
      ties.push(c);
    }
  }
  if (ties.length === 0) return null;
  const chosen = ties.length === 1 ? ties[0] : ties[Math.floor(rnd() * ties.length)];
  return chosen.id;
}

// Hysteresis: keep the current target while it is still active; re-pick only when it is not.
export function keepOrRetarget(current: number | null, cands: Candidate[], cfg: AiConfig, rnd: () => number): number | null {
  if (current !== null) {
    const kept = cands.find((c) => c.id === current);
    if (kept && kept.active) return current;
  }
  return pickTarget(cands, cfg, rnd);
}
```

## 5. Lands in

- TARGET `src/fight/ai-target.ts` (new module, proposed name; not checked against the repo): the engine's target choice for many-on-one, called from the AI brain step. Parity-checklist row 2 (AI brain). The re-check beat (20 ticks at 15 per second) belongs to the same row as the server tick sub-line "server tick: fixed step, input intake, per-tick NPC budget" (row 18 / post-K item 3) if it is driven from the server loop.
- Best transferable idea: a single threat score (worth plus kills, a declared-enemy boost, divided by one plus whole cells away) with a capped random tie-break and keep-while-active hysteresis, all in the engine rather than in the client.
- Decision (proposed): adapt — the shape fits choosing among up to MAX_ATTACKERS = 3 attackers, with the score and the pick in the engine; do not port the donor's ring scan (its bestval comparison never raises the best value), and do not hard-code +500, x3 or 32000: make them data fields.
- Acceptance: in a 3-on-1 server test with a seeded RNG, the monster keeps its current target while that attacker is alive and active; a closer attacker with equal worth beats a farther one; an exact tie resolves the same way on every run with the same seed (asserted in a table-driven test).
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later with EA section 7 terms; clean-room only)
- Brief rule served: 1 (one engine: target choice is an engine function, not client code; MAX_ATTACKERS = 3); rules 7-9 n/a

## 6. Gaps and risks

- GPL-3.0-or-later with EA section 7 terms (no trademark use, indemnity, no misrepresentation of origin): clean-room only. The sketch is written from the mechanism.
- The donor's ring-scan branch does not pick the highest score: `bestval` is never raised there (1675-1712 against 1638-1640). Do not copy it. Frankendom needs one test that proves the chosen target is the highest score.
- Ties use the game's global RNG (`Random_Pick`, 1800). Frankendom must use the fight seed so that server and replay agree. Otherwise two clients can pick different targets.
- The kill counter is a score input (1449). Frankendom has one ledger and server-verified kills, so kills must come from the server record, never from client state.
- The +500 and x3 enemy boost and the 32000 scale are magic numbers in a 1995 engine. Frankendom should express the boost and the falloff as engine constants and any encounter-specific weight as zone data.
- The donor has no cap on how many attackers a monster considers. MAX_ATTACKERS = 3 must be enforced by the engine's attacker set, not by the score.
- The distance falloff is 1 / (cells + 1) with whole cells. At close range in a fast duel the difference between 1 and 2 cells is a large change in score. Frankendom needs its own unit for distance, and the falloff needs a test at the duel range.
- The donor's comment (1/4 units lost) does not match the code (4/5 threshold, a 1/5 loss, line 706). Do not copy the comment as the rule.
- Not read: `Risk()` and `Reward` (the worth inputs), `Distance()`, and the caller that uses the 20-tick and 15-19-tick delays. The score's meaning depends on the first two.

Reuse tag: rewrite-from-idea (GPL-3.0-or-later with EA section 7 terms; clean-room only)
Brief rule served: 1 (one engine: target choice is an engine function, not client code; MAX_ATTACKERS = 3); rules 7-9 n/a
