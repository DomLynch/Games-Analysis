# opentibiabr-otclient (progression, cell 10)

Donor: `/mnt/frankendom-donors/opentibiabr-otclient/modules/game_skills/skills.lua` and `modules/game_analyser/classes/XPAanalyser.lua` | Licence: MIT (LICENSE: "OTClient is made available under the MIT License", Copyright 2010-2020 OTClient) | Lua (client UI scripts) with C++ glue | symbols `expForLevel`, `getTotalExpRateMultiplier`, `XPAnalyser`

Checked: I read `XPAanalyser.lua` end to end (619 lines), the XP parts of `skills.lua` (expForLevel 564-570, checkExpSpeed 992-1017, rate stack 1278-1289 and 1603-1621, tooltip 1066-1093), `analyser.lua` onExperienceChange/onLevelChange (403-422, 546-553), the Controller 1 s tick (56-81), `LocalPlayer::setExperience/setLevel/getLevelPercent` and the status-packet parse that fills experience and the rate slots (protocolgameparse.cpp 2600-2663). This is the CLIENT readout of progression: the server that awards XP and decides the level is not in this donor (not read, not present). Confidence: high on what the client does, nothing claimed about the server.

## 1. Mechanism

- The server is authoritative. It pushes total experience, level and level percent (and the rate slots) in one status packet; the client keeps them in `LocalPlayer` and fires `onExperienceChange` / `onLevelChange` only when a value actually differs from the stored one (localplayer.cpp 355-377).
- Level curve: `expForLevel(level) = floor(50*level^3/3 - 100*level^2 + 850*level/3 - 200)` (skills.lua 565). "XP to next level" is `expForLevel(level+1) - currentExp` (569). The same curve is copy-pasted into XPAanalyser.lua 78-84; the analyser's live UI actually calls the skills-module copy (272).
- XP rate stack: the server sends five slots (BASE, VOUCHER, LOW_LEVEL, XP_BOOST, STAMINA_MULTIPLIER; const.lua 510-515). The total is `(BASE + sum of every other slot except the stamina one) * STAMINA / 100`, returned as a percent/100 decimal (skills.lua 1603-1616). Bonuses ADD to each other; only the stamina multiplier multiplies the whole sum. Missing slots default to BASE 100 and STAMINA 100.
- Session gain: on each experience change the analyser takes the previous stored total, sets the session baseline only once (when `startExp == 0`), and counts a gain only if the previous total is > 0 and the new total is higher (analyser.lua 403-422). The first push therefore never counts as a gain, and a level-down or reset never counts as a negative gain.
- Raw (pre-bonus) XP: `rawGain += floor(delta / totalMultiplier)` using the multiplier at the moment of the gain; if the multiplier is 0 the delta is used unchanged (XPAanalyser.lua 44-55, 400-406).
- XP per hour: `floor(xpGain * 3600 / secondsSinceLaunch)`, zero when gain is zero or elapsed seconds is zero (356-380). ETA to level: `(expForLevel(level+1) - exp) / xpHour` split into hours and minutes (272-280); shows "-" when xpHour is 0.
- Target gauge: the player sets a target XP/hour; the arrow position is `current*71/target`, clamped to a max margin of 142 px (292-301). Half-way (neutral) when both are 0.
- Second, separate estimator in the skills window: every 30 s `checkExpSpeed` pushes `(totalExp, seconds)` into a list, drops the oldest beyond 30 entries, and sets `expSpeed = (newest - oldest exp) / (elapsed)` (skills.lua 992-1017), i.e. a rolling window of at most about 14.5 minutes. The tooltip uses it for "next level in X hours Y minutes" (1076-1083).
- Tick/loop: not a fixed-step simulation. Event driven (redraw on every server XP push) plus a `cycleEvent` every 1000 ms that recomputes per-hour numbers and graph point (Controller.lua 56-81, call at 72); the window sampler runs on a separate 30 000 ms `cycleEvent` (skills.lua 824). Both are wall-clock timers, nothing accumulates frame time. The 30 s sampler also calls `onExperienceChange`/`onLevelChange` itself (1017-1018, not traced in full).
- Callers: I checked who uses `expForLevel` (skills tooltip 1069, analyser 272 and its local `expToAdvance` 424) and who feeds the analyser (only `onExperienceChange`, analyser.lua 403). I did not check the other analysers (hunting, loot) beyond seeing they receive the same gain (418-419).

## 2. Key functions

- `expForLevel`, `expToAdvance`: `/mnt/frankendom-donors/opentibiabr-otclient/modules/game_skills/skills.lua` 564-570. The level curve and the remaining-XP helper.
- `getTotalExpRateMultiplier`: same file 1603-1617 (display twin `updateExperienceRate` 1278-1289). Base plus additive bonuses, then stamina multiplier.
- `onExperienceRateChange`: same file 1338-1341. Stores each rate slot by type as the server sends it.
- `checkExpSpeed`: same file 992-1017. Rolling 30-sample window XP speed.
- `onExperienceChange` (analyser): `/mnt/frankendom-donors/opentibiabr-otclient/modules/game_analyser/analyser.lua` 403-422. Delta-based gain, first-push guard.
- `XPAnalyser:updateCalculations`, `addRawXPGain`, `addXpGain`, `calculateRawXP`, `updateExpensiveUI`: `/mnt/frankendom-donors/opentibiabr-otclient/modules/game_analyser/classes/XPAanalyser.lua` 356-380, 400-412, 44-55, 259-305. Session per-hour, raw XP, ETA, gauge.
- `LocalPlayer::setLevel`, `getLevelPercent`: `/mnt/frankendom-donors/opentibiabr-otclient/src/client/localplayer.cpp` 366-383. Change-only callback and centipercent normalisation (divide by 100 when the U16 feature is on).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Level curve is a closed-form cubic of the level, remaining XP is a subtraction | 50/3, -100, 850/3, -200 (theirs, skills.lua 565): Tibia's curve, e.g. level 8 needs 4200 |
| Additive bonus slots on a base, then one multiplicative global multiplier | Base 100, stamina 100 defaults (theirs, skills.lua 1279-1288); slot names voucher / low-level / boost (theirs, const.lua 510-515) |
| Gain = positive delta of server total; ignore first push; one baseline per session | Baseline guard `startExp == 0` (theirs, XPAanalyser.lua 189) |
| Raw XP recovered by dividing by the current multiplier | Floor rounding (theirs, XPAanalyser.lua 51) |
| Per-hour = gain * 3600 / elapsed seconds | 3600 (unit conversion) |
| Rolling-window speed: fixed-length sample list, (newest-oldest)/dt | 30 samples, 30 s interval (theirs, skills.lua 1006 and 824) |
| Gauge needle = rate / target clamped | Scale 71 and max margin 142 px (theirs, XPAanalyser.lua 298 and 76): pure UI numbers |

## 4. TypeScript sketch

simplified: only the maths and state of the session tracker are kept. It omits all UI (gauge, graph, tooltips), the target setting, the persisted per-character JSON config, the separate rate-slot storage (a plain `XpRates` object is passed in), the hunting analyser, the 1 s timer wiring (the caller supplies `nowMs`), and the donor's re-triggering of `onExperienceChange` from the 30 s sampler. The sketch is an original re-expression (MIT donor, but nothing is a line copy). The donor leaves the `startMs` baseline set at the first XP push; the sketch does the same. It does NOT award XP: that is server work not present in the donor.

```ts
// Licence: MIT (donor OTClient). Sketch is an original re-expression of the mechanism.
interface XpRates {
  basePct: number;               // 100 = normal
  addendPcts: number[];          // voucher, low-level bonus, boost... added to the base
  staminaPct: number;            // 100 = no change; scales the whole sum
}

// Total multiplier as a decimal: (base + addends) * stamina / 100, then / 100.
function totalMultiplier(r: XpRates): number {
  const sum = r.addendPcts.reduce((a, b) => a + b, r.basePct);
  return (sum * r.staminaPct) / 100 / 100;
}

// Cubic level curve; in Frankendom this would be a catalogue row, not a constant.
function expForLevel(level: number): number {
  return Math.floor((50 * level ** 3) / 3 - 100 * level ** 2 + (850 * level) / 3 - 200);
}

class XpSession {
  private startMs = 0;
  private lastTotal = 0;
  gain = 0;
  rawGain = 0;
  private window: { xp: number; t: number }[] = [];

  // Called when the authoritative total XP changes (server push).
  onTotal(total: number, nowMs: number, r: XpRates): void {
    const prev = this.lastTotal;
    if (this.startMs === 0) this.startMs = nowMs;
    if (prev > 0 && total > prev) {
      const delta = total - prev;
      this.gain += delta;
      const m = totalMultiplier(r);
      this.rawGain += m > 0 ? Math.floor(delta / m) : delta;
    }
    this.lastTotal = total;
  }

  perHour(nowMs: number): number {
    const secs = Math.floor((nowMs - this.startMs) / 1000);
    return secs > 0 && this.gain > 0 ? Math.floor((this.gain * 3600) / secs) : 0;
  }

  hoursToLevel(level: number, total: number, nowMs: number): number | null {
    const rate = this.perHour(nowMs);
    return rate > 0 ? (expForLevel(level + 1) - total) / rate : null;
  }

  // Called every 30 s; keeps the last 30 samples and returns the window speed in xp/s.
  sample(total: number, nowSec: number): number {
    this.window.push({ xp: total, t: nowSec });
    if (this.window.length > 30) this.window.shift();
    if (this.window.length < 2) return 0;
    const first = this.window[0];
    const dt = nowSec - first.t;
    return dt > 0 ? (total - first.xp) / dt : 0;
  }
}
```

## 5. Lands in

- TARGET `src/fight/progression.ts` (new, engine-side): `expForLevel` as a catalogue-driven curve, `totalMultiplier` as the XP award's modifier stack, and `XpSession` as the readout used by the HUD (client-only). Parity-checklist row 18 (loot roll and XP award); the session tracker's output feeds row 14 (HUD) only.
- today: nothing equivalent confirmed (not searched in Frankendom).
- Reuse tag: adapt-with-attribution (MIT; copy of the curve formula is not needed, the sketch is original)
- Brief rule served: one ledger (XP is a ledger total, the client derives rates from it); rules 7-9 n/a

## 6. Gaps and risks

- Server-verified: the donor client only watches totals. The award itself, the cap and what happens on death are on a server we do not have. Frankendom must write the award in the engine and have the client derive rates from the pushed total exactly as this donor does, never compute XP client-side.
- One ledger: gain = positive delta of the single total. This only works because there is one XP total per character; it matches the one-character / one-ledger ruling. A level-down or reset is silently ignored by the delta guard, so a ledger correction would not show up in the session numbers.
- Per-hour is tuned for hours-long grinding sessions (seconds-based, wall clock). Frankendom fights last seconds; the 30 s sample / 30 entries window and the "hours to level" display would need re-tuning (per-fight and per-zone-visit rates, not per hour).
- Stamina and low-level bonus are server rules shown on the client; as zones-as-data fields they would be catalogue values (low-level bonus per zone, boost per event), not constants in code.
- The cubic curve is copied from Tibia and also duplicated in two Lua files here; Frankendom should keep ONE curve, as data in the catalogue (row 20/21), not copy this.
- Not read: how the server computes the rate slots or awards XP; the hunting/loot analysers' own maths beyond receiving the same gain; the graph panel.
