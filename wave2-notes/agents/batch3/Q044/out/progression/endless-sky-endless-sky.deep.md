# endless-sky-endless-sky (progression, cell 10)

Donor: `/mnt/frankendom-donors/endless-sky-endless-sky/source/Politics.cpp` | Licence: GPL-3.0 (license.txt: "GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007") | C++ | symbol `Politics::Offend`

Checked: The hint was INFERRED, and no XP or level code exists in this donor; the progression-like mechanism is the player's standing (reputation) with each government, which gates landing and services. Read `Politics.cpp` 111-150 (`Offend`, in full), 185-217 (`CanLand`, `CanUseServices`), 417-434 (`AddReputation`, `SetReputation`, `ResetDaily`) in full. Read `Government.cpp` 109-119 (`PenaltyHelper`), 131-139 (default penalties), 590-602 (`AttitudeToward`), 616-640 (`PenaltyFor`). Read the callers `AI.cpp` 674-683 and `BoardingPanel.cpp` 480 (one line); `PlayerInfo.cpp` 380-395 and 3805-3816 (saved standing batch). Grep only, not read in context: `Planet.cpp` 873 and 878 (provoke and atrocity callers), `GameData.cpp` 338 (`ResetDaily` call). Not read: where `ReputationMin` and `ReputationMax` are set (`Government.cpp` 196-198, 301-303, defaults only glimpsed), `Planet::RequiredReputation` data, bribe paths (`Planet.cpp` 774, `HailPanel.cpp`). Confidence: high on the offense formula, its order, and the two gates; medium on topic fit (standing is a progression track that gates access, not XP or levels). Camera: n/a.
Best transferable idea: An offense against one faction moves the player's standing with every faction by count times how much that faction likes the victim times a penalty, ignoring tiny attitudes, so standing spreads across factions and zones can tune the spread as data.
Decision (proposed): adapt - keep the attitude-weighted spread with its 5 percent cut-off, the per-faction min and max clamp, the one-charge-per-event-per-ship rule, and the standing gate for zone entry; store standing in the one character ledger; drop the daily provocation flag (duels have no day cycle) and the atrocity wipe until design signs it off.
Acceptance: A server test: a kill of faction A with count 3, attitude 0.5 toward B, penalty 1.0 lowers the player's standing with B by 1.5 and leaves C (attitude 0.02) unchanged; a second kill of the same fighter charges nothing; zone B opens at standing 0 and closes at -2.

## 1. Mechanism

- Trigger: an event (destroy, board, capture, disable, assist, provoke, atrocity) is reported with the victim's government and `count = crew value` of the target (`AI.cpp` 682; capture in `BoardingPanel.cpp` 480). The AI charges each event bit only once per ship: `newActions = event - (event & bitmap)` (`AI.cpp` 677, bitmap kept per target at 676 and 678); PROVOKE is always re-added (680-681).
- `Politics::Offend(gov, events, count)` (`Politics.cpp` 111): returns at once if the victim is the player (116-117). Then it loops over every government `other`, including the victim itself:
  - `weight = other.AttitudeToward(victim)` (122). Toward itself it is 1.0 (`Government.cpp` 595); with no entry it is the default (598), and a NaN entry falls back too (601).
  - `penalty = other.PenaltyFor(events, victim)` (123). `PenaltyHelper` sums the penalties of every set event bit and keeps the highest special flag (`Government.cpp` 109-119).
  - PROVOKE special (127-136): if `weight > 0`, the other government is marked provoked and loses any bribe.
  - Standing change (137-148): only if `count != 0` and `|weight| >= 0.05` (137). `reputationChange = count * weight * penalty` (143). If the penalty is ATROCITY and `weight > 0`, standing with `other` is first set to `min(0, standing)` (144-145). Then `AddReputation(other, -reputationChange)` (147).
- `AddReputation` adds to the stored value and calls `SetReputation` (`Politics.cpp` 417-420), which clamps to the government's max then min (424-428). Unknown standing reads as 0 (`Politics::Reputation`, not quoted).
- Gates: `CanLand(const Planet*)` (ends at 192) returns true for an uninhabited planet, for a planet with clearance (`HasClearance`, 198-201, bribed or dominated), and returns false if the government is provoked (`provoked.contains`); otherwise standing must be at least `RequiredReputation` (191). `CanUseServices` (205-217) checks dominated and bribed planets first, then uses the same standing test (216).
- `ResetDaily` (434) clears provoked, bribed, bribed planets and fined sets. It is called from `GameData.cpp` 338 (grep).

## 2. Key functions

- `Politics::Offend`: `/mnt/frankendom-donors/endless-sky-endless-sky/source/Politics.cpp` 111-150. Attitude-weighted spread across every government, 5 percent cut-off, atrocity wipe, and the change applied through `AddReputation`.
- `Politics::SetReputation`: same file, 424-429. The clamp to the government's min and max.
- `Politics::CanLand` (planet overload, ends at 192) and `CanUseServices` (205-217): same file. The standing gate, after clearance and provocation checks.
- `Government::PenaltyHelper` and `PenaltyFor`: `/mnt/frankendom-donors/endless-sky-endless-sky/source/Government.cpp` 109-119 and 616-640 (the penalty table, the per-victim custom table, and bit summing).
- Caller `AI.cpp` 674-683: the once-per-event-per-ship filter.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Offense spreads to every faction by count x attitude x penalty, ignoring attitudes under 5 percent | Cut-off 0.05 (`Politics.cpp` 137) |
| Attitude matrix with a default for missing entries and NaN fallback | `defaultAttitude` per government (`Government.cpp` 598, 601; where it is set not read); self attitude 1.0 (595) |
| Event penalties summed per event bit | Default table (`Government.cpp` 131-139): ASSIST -0.1 (131), DISABLE 0.5 (132), BOARD 0.3 (133), CAPTURE 1.0 (134), DESTROY 1.0 (135), PROVOKE 0 with special flag (138), ATROCITY 10 with special flag (139) |
| Count scales the charge; zero count means no standing change | Count is the target's crew value (`AI.cpp` 682); a drone has count 0, so it can still provoke but never moves standing (`Politics.cpp` 125-126 comment) |
| Atrocity wipes positive standing with sympathetic factions | `min(0, standing)` for `weight > 0` (`Politics.cpp` 144-145) |
| Standing clamped to a per-faction band | Band from the government data (`Politics.cpp` 426-427; the defaults at `Government.cpp` 196-198 and 301-303, not read in context) |
| Gate on access by standing | Required standing per planet (`Politics.cpp` 191, `RequiredReputation`) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (weight, then penalty, then the atrocity clamp, then the change, then the clamp). It reads the penalty table of each faction, not a per-victim custom table (`Government.cpp` 617-640). It omits: the PROVOKE special (provoked and bribe flags), which runs before the count check in the donor; the daily reset; the bribe and clearance branches of `CanLand`; the default-attitude rule for NaN (the default fallback is kept); and the planet data. The event bit values are the sketch's own; the donor's `ShipEvent` values were not read.

```ts
// Licence: GPL-3.0 (donor, Endless Sky license.txt). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const DESTROY = 1 << 0, BOARD = 1 << 1, ATROCITY = 1 << 2, PROVOKE = 1 << 3; // event bits (ATROCITY and PROVOKE are special)

interface Faction {
  id: string;
  min: number;                          // standing floor (zone data)
  max: number;                          // standing ceiling (zone data)
  attitude: Record<string, number>;     // -1..1 toward other factions; missing = default
  penalty: Record<number, number>;      // standing change per unit of count, per event bit
  special: Record<number, boolean>;     // event bits that carry the atrocity flag
}
type Sheet = Map<string, number>;       // the player's standing with each faction

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

// Offense against a victim faction. Every faction, the victim included, moves the player's standing by count x weight x penalty.
export function offend(factions: Faction[], sheet: Sheet, victim: string, events: number, count: number, defaultAttitude: number): void {
  for (const f of factions) {
    const weight = f.id === victim ? 1 : (f.attitude[victim] ?? defaultAttitude);
    if (count === 0 || Math.abs(weight) < 0.05) continue;   // weights under 5 percent never move standing
    let change = 0, atrocity = false;
    for (const bit of [DESTROY, BOARD, ATROCITY]) {
      if (events & bit) { change += f.penalty[bit] ?? 0; atrocity = atrocity || f.special[bit] === true; }
    }
    let rep = sheet.get(f.id) ?? 0;
    if (atrocity && weight > 0) rep = clamp(Math.min(0, rep), f.min, f.max); // allies: positive standing is wiped
    sheet.set(f.id, clamp(rep - count * weight * change, f.min, f.max));
  }
}

// The AI reports only event bits not yet charged for this ship. PROVOKE always repeats.
export function freshEvents(seen: { bits: number }, events: number): number {
  let fresh = events & ~seen.bits;
  seen.bits |= events;
  if (events & PROVOKE) fresh |= PROVOKE;
  return fresh;
}

// Landing and services need standing at or above the planet's value, unless it is provoked.
export function canLand(sheet: Sheet, faction: string, required: number, provoked: boolean): boolean {
  if (provoked) return false;
  return (sheet.get(faction) ?? 0) >= required;
}
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/q044-progression-standing-spillover.ts`: exit 0.

## 5. Lands in

- TARGET `src/fight/standing.ts` (new module, proposed): the standing spread and the zone-entry gate, updated only from server-verified kills. Parity-checklist row 18 (loot roll and XP award), as the standing analogue of the award; the zone population gate itself is row 23 and is not sketched here.
- Standing data (attitude matrix, penalties, min and max, required standing per zone) is zone data, not engine constants.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: zones as data; one ledger (standing lives in the character ledger); server-verified kills (the events come from the server, never the client)

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism, not copied.
- Standing is a second meter. Frankendom's one-ledger rule says it must live in the character ledger row, not a separate store.
- The donor's `count` is the target's crew value. Frankendom must define its own count (for example the defeated fighter's tier or hit count); a zero count must mean no change, as in the donor.
- The attitude matrix and penalty table are the design. A badly tuned matrix makes the spread absurd (a small ally bump, or a big one from a single kill). It needs a fixture test per zone.
- Provocation and bribes depend on a day cycle (`ResetDaily`). Duels have no day, so the daily flag is dropped; if the design wants a session flag, add it as its own row.
- The atrocity wipe (positive standing set to zero for allies) is a sharp rule. Do not adopt it without a designer's sign-off.
- The donor dedupes events per ship (`AI.cpp` 677). Frankendom should dedupe per fighter per fight, and the fight record (row 19) should hold the events, so replays match the ledger.
- The donor's standing is single-player with no server check. Frankendom must check each event on the server before it changes standing.
- Not read: the min and max defaults, the planet required-standing data, and the bribe paths. Mark any claim about them as not read.
