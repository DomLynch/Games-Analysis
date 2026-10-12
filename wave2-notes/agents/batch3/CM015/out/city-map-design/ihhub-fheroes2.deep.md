# ihhub-fheroes2 (city-map-design, cell 20)

Donor: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/castle/castle.cpp` | Licence: GNU GPL version 2 (LICENSE file: "Version 2, June 1991"; the castle source headers read "either version 2 of the License, or (at your option) any later version") | C++ | symbol `Castle::CheckBuyBuilding`

Checked: The hint file `src/fheroes2/castle/castle_town.cpp` (772 lines) holds the buy dialogs and the construction dialog; I listed its function names only and did not read them, so it is the wrong file for the mechanism. The real mechanism is `Castle::CheckBuyBuilding` (castle.cpp 1137-1234), `Castle::BuyBuilding` (1260-1322), `Castle::GetAllBuildingStatus` (1236-1257), the once-per-period flag (529, 833-835, 1320, 2393-2400), the `AllowBuyBuilding` wrapper (castle.h 316-319) and the prerequisite table `fheroes2::getBuildingRequirement` (castle_building_info.cpp 1097-1349). Read in full: `CheckBuyBuilding`, `GetAllBuildingStatus`, `BuyBuilding` (1260-1326) and the wrapper. `getBuildingRequirement` was read only at 1090-1135 and 1336-1350, and the middle (1136-1335) was checked by grep only, so the per-race table is partly read. Callers: `AllCastles::NewDay` (2393-2400) is the only new-day driver seen; the caller of `AllCastles::NewDay` was not read. Not read: where `_disabledBuildings` is set (scenario loading), the body of `PaymentConditions::BuyBuilding`, the side effects inside the BuyBuilding switch beyond the lines quoted. Confidence: high on the ladder order, the prerequisite AND rule and the once-per-period gate; medium on how often the new-day call runs. Scope: town build-out, not a camera; camera_scope not applicable.

Best transferable idea: a hub's services are unlocked one at a time by a fixed order (already built, disabled, once per period, core first, all prerequisites built, then affordable), and buying re-checks the same ladder, pays, records the service and closes the period for that hub.
Decision (proposed): adapt - take the ladder and the once-per-period gate as the build-out rule for zone hubs, with the prerequisites as explicit data per service; drop the race branches and the bit-shift trick.
Acceptance: a server test: a fresh hub with no core can only buy the core; after the core, a second service with a prerequisite is refused until the prerequisite is built; a second purchase in the same period is refused with a 'not today' status; after the period rolls over the purchase succeeds once and the hub's status line reads the right next step.

## 1. Mechanism

- A town holds two bitmasks: constructed buildings (`_constructedBuildings`) and scenario-disabled ones (`_disabledBuildings`). A service (building) is buyable only if a fixed ladder of checks passes, in this order (`CheckBuyBuilding`, castle.cpp 1137-1234):
  1. Already constructed: return ALREADY_BUILT (1139-1140).
  2. Disabled by the scenario: return BUILD_DISABLE (1143-1144).
  3. Race and map special cases: shipyard needs sea access, shrine only for one race and not in one map version, tavern not for one race (1146-1166; the donor marks this block with a TODO to move it to a once-per-game calculation, 1147).
  4. Magic guild levels are chained: level n needs level n-1 built. The donor finds the previous level by shifting the bit right (`build >> 1`, 1169) and checks it is constructed (1171).
  5. Once per period: if the town's ALLOW_TO_BUILD_TODAY flag is off, return NOT_TODAY (1176-1177).
  6. Core first: if the town is not a castle, only the core may be bought; anything else returns NEED_CASTLE (1186-1187). A castle cannot buy the tent (1180-1184 in the donor, the tent rule).
  7. Race upgrade branches for the dwelling upgrades, returning UNKNOWN_UPGRADE when the race does not have that upgrade (1191-1215, not expanded).
  8. Prerequisites: the requirement mask for this race and building is looked up (1221). Every bit set in the mask must already be constructed (1223-1226, loop over the 32 bits, return REQUIRES_BUILD on the first missing bit).
  9. Payment: if the kingdom cannot pay the buy cost for this race and building, return LACK_RESOURCES (1229-1230).
  10. Otherwise ALLOW_BUILD (1233).
- Buying (`BuyBuilding`, 1260-1322): re-run the same check through `AllowBuyBuilding` (1262), pay (`OddFundsResource`, 1266), set the constructed bit (1268), run the per-building side effects (castle sprite and fog for the core, guest hero training for mage guilds, captain, dwellings get their first monster count), then close the period by `ResetModes(ALLOW_TO_BUILD_TODAY)` (1320).
- Period: the flag is also set at line 529 (inside a function I did not identify) and on each new day (`Castle::ActionNewDay`, 833-835), which `AllCastles::NewDay` calls for every castle (2393-2400, caller of that not read).
- Summary (`GetAllBuildingStatus`, 1236-1257): if the period is closed, NOT_TODAY (1238-1239); if not a castle, NEED_CASTLE (1240-1241). Otherwise it walks the unbuilt bits three times in priority order: first any ALLOW_BUILD, then any LACK_RESOURCES, then any REQUIRES_BUILD, and returns UNKNOWN_COND if none match (1243-1257).
- Prerequisite table (`getBuildingRequirement`, castle_building_info.cpp 1097-1349): a switch on the building, then on the race inside some cases, OR-ing the prerequisite bits into one mask (for example, a dwelling tier needs the tier below and sometimes the tavern for one race, 1115-1120, 1349 returns the mask).

## 2. Key functions

- `Castle::CheckBuyBuilding`: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/castle/castle.cpp` 1137-1234. The whole ladder, in order.
- `Castle::BuyBuilding`: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/castle/castle.cpp` 1260-1322. Re-check, pay, record, close period.
- `Castle::GetAllBuildingStatus`: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/castle/castle.cpp` 1236-1257. The one-line status for the UI, by priority.
- `Castle::AllowBuyBuilding`: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/castle/castle.h` 316-319. Wrapper: true only for ALLOW_BUILD.
- `getBuildingRequirement`: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/castle/castle_building_info.cpp` 1097-1349. Prerequisite mask per race and building.
- New period: `Castle::ActionNewDay` 833-835 and `AllCastles::NewDay` 2393-2400.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Fixed ladder: built, disabled, once per period, core first, prerequisites, payment | Ladder order is the donor's (1137-1233). No numbers. |
| Prerequisites as a mask, every bit required | Mask per race and building (castle_building_info.cpp 1097-1349, theirs). Example: a dwelling tier needs the tier below, and for one race the tavern (1119-1120, theirs) |
| One build per period | One flag per town, reset on each new day (833-835, theirs); closed by the buy (1320, theirs) |
| Magic guild chain | Level n needs level n-1 by a one-bit shift (1169, theirs). Fragile: depends on bit order |
| Status for the UI by priority | ALLOW, then LACK, then REQUIRES (1243-1257, theirs) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for what matters to hub build-out: already built, disabled, once per period, core first, every prerequisite built, payment, then allow. Buying re-checks the same ladder, pays, records the service and closes the period. It replaces the race branches, the upgrade cases and the magic-guild shift trick with an explicit `requires` list per service. It omits the shipyard sea-access and shrine race checks, the tent rule, the per-building side effects of BuyBuilding (fog, hero and captain training, dwelling counts), the UNKNOWN_UPGRADE cases, and the donor's bit-mask storage (it uses sets). The summary keeps the donor priority (allow, lack, requires).

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type Status =
  | 'already_built'
  | 'disabled'
  | 'not_today'
  | 'needs_hub'
  | 'requires'
  | 'lack_resources'
  | 'allow'
  | 'unknown';

export interface Hub {
  built: Set<string>;            // constructed service ids (donor: _constructedBuildings bitmask)
  disabled: Set<string>;         // scenario-disabled ids (donor: _disabledBuildings)
  isHub: boolean;                // donor isCastle(): other towns may only build the core first
  buildAllowedToday: boolean;    // donor ALLOW_TO_BUILD_TODAY flag, one build per period
}

export interface ServiceDef {
  id: string;
  requires: string[];            // all must be built (donor getBuildingRequirement bits, AND-ed)
  cost: number;
}

export const CORE_ID = 'core';   // donor BUILD_CASTLE

// Donor order: built, disabled, once-per-period, core-first, prerequisites, payment, allow.
export function checkBuild(hub: Hub, def: ServiceDef, canPay: (cost: number) => boolean): Status {
  if (hub.built.has(def.id)) return 'already_built';
  if (hub.disabled.has(def.id)) return 'disabled';
  if (!hub.buildAllowedToday) return 'not_today';
  if (!hub.isHub && def.id !== CORE_ID) return 'needs_hub';
  for (const r of def.requires) {
    if (!hub.built.has(r)) return 'requires';
  }
  if (!canPay(def.cost)) return 'lack_resources';
  return 'allow';
}

// Buy: re-check first, pay, record, then close the period for this hub.
export function buyService(
  hub: Hub,
  def: ServiceDef,
  canPay: (cost: number) => boolean,
  pay: (cost: number) => void,
): boolean {
  if (checkBuild(hub, def, canPay) !== 'allow') return false;
  pay(def.cost);
  hub.built.add(def.id);
  hub.buildAllowedToday = false;
  return true;
}

// New period: every hub may build once again.
export function newPeriod(hubs: Hub[]): void {
  for (const h of hubs) h.buildAllowedToday = true;
}

// One line for the UI: the best status across unbuilt services, by priority allow, then lack, then requires.
export function summary(hub: Hub, defs: ServiceDef[], canPay: (cost: number) => boolean): Status {
  if (!hub.buildAllowedToday) return 'not_today';
  if (!hub.isHub) return 'needs_hub';
  const rest = defs.filter(d => !hub.built.has(d.id));
  for (const want of ['allow', 'lack_resources', 'requires'] as const) {
    if (rest.some(d => checkBuild(hub, d, canPay) === want)) return want;
  }
  return 'unknown';
}
```

Typecheck: copied to the VPS as /tmp/cm015-fheroes2-hub-gate.ts and `npx -p typescript tsc --noEmit --strict --target es2020` exited 0 with no output. The file already contains exports, so no `export {}` was needed.

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone hub build-out: the server owns the built set and the once-per-period flag per hub; the client reads the summary line). Parity-checklist row 23 is the batch hint, but row 23 covers spawns, caps, respawn and coverage, not service build-out. No existing row fits hub build-out directly; Lead should decide whether this needs its own row. Until then, cite row 23 with that caveat.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: zones as data on one runtime (prerequisites and costs are zone data; the server owns the built set and the period); one ledger for purchases

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. No donor line is copied; the sketch is written from the ladder order.
- Defect (fragility, not a wrong number): the magic guild chain relies on the bit order (`build >> 1`, 1169). Adding a level in the wrong bit position silently breaks the chain. Fix (in the sketch): explicit `requires` per service, no bit arithmetic.
- Defect (cost): the race conditions run inside every check (the donor's own TODO at 1147). Fix: compute the per-zone requirement list once when the zone loads (zone data), not on each query.
- The once-per-period gate is a single flag per hub, reset by a day loop the caller of which was not read. Frankendom needs the period to come from server time, and the reset must be idempotent (a missed or doubled reset would either block or allow two buys a day). Test both cases.
- Purchase must be server-verified (one ledger): the buy re-checks the ladder on the server and does not trust the client's status line. The donor's BuyBuilding re-checks (1262), which is the right shape.
- The summary function returns UNKNOWN_COND when every service is built or disabled. Frankendom's client line needs a defined empty state, not a silent blank.
- Prerequisites as a set (AND) cover the donor's needs. An OR prerequisite (either of two services) is not in this donor; do not add it without a test.
- Side effects in BuyBuilding (fog, guest hero training, dwelling counts) are donor-specific. Frankendom should express them as data fields on the service (zone data), not as a switch in the purchase.
- MAX_ATTACKERS = 3 does not apply to hub services; keep hub build-out out of the fight loop.
- The donor's shipyard, shrine and tent rules are race or map-specific; Frankendom should express them as zone data rows, not as code.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: zones as data on one runtime; one ledger for purchases; prerequisites and costs as zone data


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
CLEAN
