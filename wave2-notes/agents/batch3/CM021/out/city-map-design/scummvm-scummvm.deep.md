# scummvm-scummvm (city-map-design, cell 20)

Donor: `/mnt/frankendom-donors/scummvm-scummvm/engines/hdb/menu.cpp` (warp hub and secret-star gate), with `ai-player.cpp` (unlock on count), `ai-inventory.cpp` (count), `ai.h` and `menu.h` (constants) | Licence: GPL-3.0-or-later (file headers read: "either version 3 of the License, or (at your option) any later version"; `/mnt/frankendom-donors/scummvm-scummvm/COPYING` is GPL v3) | C++ (ScummVM engine for Hyperspace Delivery Boy!) | symbol `aiMonkeystoneUse` (ai-player.cpp 1612), `Menu::readConfig`, `Menu::writeConfig`

Checked: Read `aiMonkeystoneUse` at ai-player.cpp 1612-1632 (the 21 branch was read only to its first line, 1632). Read `Menu::readConfig` at menu.cpp 325-340 (partial). Read `Menu::writeConfig` at menu.cpp 361-372 (the three set calls and the cheat flag). Read the star draw block at menu.cpp 560-580, the click handling at menu.cpp 1335-1395, the warp input at menu.cpp 1540-1585 and the warp draw at menu.cpp 800-840 and 1766-1775. Read the constants at ai.h 20-40 and menu.h 36-40. Read `aiMonkeystoneAction` at ai-player.cpp 1595-1607 (the pickup path, and the only caller of the unlock check that runs right after a pickup). Read the count paths: `AI::addToInventory` at ai-inventory.cpp 30 (only the monkeystone case, 44-58), and the decrements at ai-inventory.cpp 128-140 and 204-213. Read the count load from the save at ai-init.cpp 1705. Read `hdb.cpp` 312-330 (the level load that sets the Lua global `secretstars`). This is a hub whose destinations appear one at a time as a collected count passes thresholds. It is not a town layout. Confidence: high on the unlock, persistence and gate mechanism (all read end to end); moderate on fit to city-map-design, because the donor has no town layout, roads, signage or minimap (grep for minimap, town, city, landmark, shop, street in engines/hdb returned no hits). camera_scope: not applicable (no camera).
Not read: the rest of `AI::addToInventory` (only the monkeystone case, 44-58); whether the player's use key can call `aiMonkeystoneUse` after a pickup (the entity's `aiUse` is set at ai-player.cpp 1591; the dispatch was not read); `Menu::writeConfig` after line 372 (when the config is flushed); the Lua level scripts that read `secretstars`; the rest of menu.cpp outside the lines above. The callers of `aiMonkeystoneUse` were checked by grep: ai-player.cpp 1591 (set as `aiUse`), 1605 (called from `aiMonkeystoneAction`) and the Lua table at ai-init.cpp 736.

## 1. Mechanism

- A collected count drives the hub. A pickup in `aiMonkeystoneAction` (ai-player.cpp 1595-1607) fires when the player is within 16 px of the item on the same level. It runs the item's Lua use function if one is set, adds the item to inventory (1604; the count goes up at ai-inventory.cpp 53), then calls `aiMonkeystoneUse(nullptr, 0, 0)` (1605). That function (ai-player.cpp 1612) reads the count, shows a "You have N Monkeystones" message, and checks the count against three fixed thresholds (1619-1632): 7 unlocks the red secret star, 14 the green, 21 the blue. Each test is an exact equality (`if (val == 7) {`, 1620; `== 14`, 1626; `== 21`, 1632), so each branch runs only when this function is called with that exact count.
- Unlock order when the red threshold fires (ai-player.cpp 1620-1625): show "Red Star is Ready!" (1621), set the red flag (1622), write the config (1623), turn on the bonus-star display (1624). The green and blue branches repeat the same steps with their own flags.
- The count is per save: it is loaded from the save file (ai-init.cpp 1705) and lowered by removals (ai-inventory.cpp 137, 211). The unlock flag is in the client config, which is not per save (see the persistence bullet). So the count and the unlock live in different stores.
- Persistence: the flag is a config value. At start, `readConfig` loads it (menu.cpp 332). If the key is missing, it writes the locked value and marks the config for flush (menu.cpp 334). `writeConfig` stores the current flags (menu.cpp 361-365). The locked state is the fake constant `STARS_MONKEYSTONE_7_FAKE` (ai.h 26); the unlocked state is the magic constant `STARS_MONKEYSTONE_7` (ai.h 25). Any value other than the magic one counts as locked.
- Draw gate: the star layer is drawn only if at least one flag is set (menu.cpp 567-568). The red star is drawn only if its own flag is set (menu.cpp 573-574). So a locked star is not drawn at all; it does not appear greyed.
- Click gate: the click test uses the same flag (menu.cpp 1343), then a hit box at the star's position (`kStarRedX = 70`, `kStarRedY = 20`, menu.h 38-39; test at menu.cpp 1347). A click on a set red star saves an autosave unless the player is already on MAP30, plays the secret-star sound, sets the play state and starts MAP30 (menu.cpp 1350-1356).
- Warp grid: the warp screen is a fixed grid of 30 destinations, three columns of ten. A click picks the column by x (`if (x > _warpX + 160)` at menu.cpp 1559 gives column 20; `> _warpX + 80` gives 10; else 0) and the row by y (`map += (y - _warpY) / 16;`, menu.cpp 1567). The grid is a menu, not a map: no positions, no routes, no district.

## 2. Key functions

- `aiMonkeystoneUse`: `/mnt/frankendom-donors/scummvm-scummvm/engines/hdb/ai-player.cpp` 1612-1632. Count message, then the three exact-equality unlocks, each with a message, a flag set, a config write and a star animation.
- Count increment: `/mnt/frankendom-donors/scummvm-scummvm/engines/hdb/ai-inventory.cpp` 52-54 (`_numMonkeystones++;` then the entity is removed).
- Config load and default: `Menu::readConfig`, `/mnt/frankendom-donors/scummvm-scummvm/engines/hdb/menu.cpp` 325-340 (loads each flag or writes the locked default).
- Config store: `Menu::writeConfig`, `/mnt/frankendom-donors/scummvm-scummvm/engines/hdb/menu.cpp` 361-372.
- Hub draw gate: `/mnt/frankendom-donors/scummvm-scummvm/engines/hdb/menu.cpp` 566-575 (any-flag gate, then per-star gate).
- Hub click gate and warp: `/mnt/frankendom-donors/scummvm-scummvm/engines/hdb/menu.cpp` 1343-1366 (flag gate, hit box, autosave, `MAP30`).
- Warp grid hit test: `/mnt/frankendom-donors/scummvm-scummvm/engines/hdb/menu.cpp` 1544-1567 (column by x, row by y in 16 px steps).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| A destination is revealed when a collected count reaches its threshold | Thresholds 7, 14 and 21 (theirs, ai-player.cpp 1620, 1626, 1632) |
| Each unlock fires once, on the pickup that reaches the threshold | Donor uses exact equality (theirs, 1620). The count can drop (ai-inventory.cpp 137, 211) and climb back to 7, and the red branch runs again (announce, flag, config write). Fix: `>=` plus a latch (see sketch). |
| Unlock is a persisted flag, checked by the same test for draw and click | Magic values: unlocked `0xfe257d` and locked `0x11887e` for the red star (theirs, ai.h 25-26); the other two stars use their own pairs (ai.h 27-30) |
| Destinations are a fixed list in the hub, drawn only when unlocked | Star hit-box origin (70, 20) (theirs, menu.h 38-39) |
| Grid hit test by column and 16 px row pitch | Column edges at +80 and +160 px, 16 px row pitch (theirs, menu.cpp 1559, 1567) |

## 4. TypeScript sketch

simplified: the sketch uses `>=` with a latch (the donor uses `==` on the count and a magic config value). It omits the warp grid hit test, the star sprites and their animation, the autosave, the MAP30 start, the sounds and the messages, and the config file. The ledger is passed in as server state, not read from client config. The last four lines are a small check, not part of the mechanism.

```ts
// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface HubDestination {
  id: string;        // e.g. "secret-red"
  target: string;    // level or zone id to warp to
  unlockAt: number;  // collectible count that reveals this destination (zone data)
}

interface HubLedger {  // server-side state; the client never writes it
  collected: number;
  unlocked: Set<string>;
}

// Called once per server-verified pickup. Returns the destinations that unlock on THIS pickup, each exactly once.
function recordPickup(ledger: HubLedger, dests: HubDestination[]): HubDestination[] {
  ledger.collected += 1;
  const fresh: HubDestination[] = [];
  for (const d of dests) {
    if (ledger.collected >= d.unlockAt && !ledger.unlocked.has(d.id)) {
      ledger.unlocked.add(d.id);  // latch: the announce and the unlock happen once
      fresh.push(d);
    }
  }
  return fresh;
}

// The hub may draw and warp to a destination only if the server has latched it.
function canWarp(ledger: HubLedger, d: HubDestination): boolean {
  return ledger.unlocked.has(d.id);
}

const hubDests: HubDestination[] = [
  { id: "secret-red", target: "MAP30", unlockAt: 7 },
  { id: "secret-green", target: "MAP30", unlockAt: 14 },
  { id: "secret-blue", target: "MAP30", unlockAt: 21 },
];
const ledger: HubLedger = { collected: 0, unlocked: new Set<string>() };
for (let n = 0; n < 8; n++) recordPickup(ledger, hubDests);
// After 8 pickups only the red destination is latched, and it cannot re-announce.
const again = recordPickup(ledger, hubDests);
console.log(again.length, canWarp(ledger, hubDests[0]), canWarp(ledger, hubDests[1]));
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS with `export {};` appended, exit 0 (run on 2026-10-12).

## 5. Lands in

- TARGET `origins/zones/hub-unlocks.ts` (new module, proposed; no existing Frankendom file was read for this): the server-side ledger of hub destinations, their unlock thresholds (zone data) and the warp check. The hub map is a client; the unlock is server state.
- Parity-checklist row 14 (HUD): the hub map that shows the locked or unlocked destinations. The row 23 hint (zone population) does not fit: this is destination unlocking, not spawn caps or respawn.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: zones as data (thresholds are data fields); one ledger (the unlock is server state, not client config); rules 7-9 n/a

Best transferable idea: a hub's destinations are data rows that each name a collected-count threshold; the server latches each unlock once, and only a latched destination can be drawn or warped to.

Decision (proposed): adapt — keep the threshold-reveal idea, but store it in the server ledger with `>=` and a latch, and reject the magic-value config flag.
Acceptance: on the hub map at 375 wide, the pickup that reaches the threshold reveals the destination once with one message; a server test asserts that pickup 7 unlocks (not pickup 8 only), that a repeated pickup does not re-announce, and that the unlock survives a reload.

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the described mechanism.
- Equality test (`if (val == 7) {`, ai-player.cpp 1620): the branch runs only when this function is called with exactly 7. Two defects follow from it. (a) A count that drops and climbs back to 7 (removals at ai-inventory.cpp 137 and 211) runs the red branch again, so "Red Star is Ready!" and the config write repeat. (b) Any path that changes the count without calling this function (not read: whether one exists) never triggers the branch for the value it skips. Fix: `>=` with a latch (in the sketch).
- The unlock is global and the count is per save. The flag lives in the client config (menu.cpp 332, 365), so it survives across save slots, while the count is loaded from each save (ai-init.cpp 1705). A player can unlock the star on one save and see it on every save. Frankendom has one ledger per character, so the unlock must be per character in the server ledger, not per client config.
- Unlock state is a client config with magic constants (ai.h 25-30, menu.cpp 332-365). Anyone who edits the config gets the stars. Frankendom rules say kills and pickups are server-verified and there is one ledger, so the unlock must live in the server ledger. The constants are obfuscation, not protection.
- The hub is a menu: it has no positions, routes, districts, roads or buildings. Nothing here transfers a town layout, signage or a minimap. The donor has none (grep for minimap, town, city, landmark, shop, street found no hits in engines/hdb).
- The star is hidden when locked (menu.cpp 573), not greyed out. A discovery hub that wants players to see the next goal needs a locked state drawn on purpose; this donor does not show one.
- Out of scope, seen while reading: `AI::completeDelivery` (ai-inventory.cpp 301-309) shifts the board with `for (; i < _numDeliveries; i++)` (304) and `_deliveries[i] = _deliveries[i + 1];` (305). When the board is full (`kMaxDeliveries = 5`, ai.h 40), the last shift reads `_deliveries[5]`, one past the array. Not written up as a mechanism. Fix: loop to `i < _numDeliveries - 1`.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
CLEAN
