# OpenDAoC-OpenDAoC-Core (gods-legends-favour, cell 2)

Donor: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/keeps/Relics/GameRelic.cs` (with `keeps/Managers/RelicMgr.cs` and `keeps/Relics/GameRelicPad.cs`) | Licence: GPL-3.0 (LICENSE line 1 "GNU GENERAL PUBLIC LICENSE", version 3; no licence header in GameRelic.cs) | C# | symbol `GameRelic.PlayerLoosesRelic`, `RelicMgr.GetRelicBonusModifier`

Checked: Read `GameRelic.cs` 1-20 (header), 51-144 (Interact, RelicPadTakesOver), 216-411 (Update, PlayerLoosesRelic, ReturnRelicTick, StartPlayerTimer, CarrierTimerTick, SetHandlers, PlayerAbsence, IsPlayerCarryingRelic). Read `RelicMgr.cs` 129-134, 194-252 (bonus and shrine pickup rule). Read `GameRelicPad.cs` 132-187 (MountRelic) and 216-231 (GetEnemiesOnPad). Read the constants in `ServerProperties.cs` 900-901, 1301-1302, 1331-1332. Callers of the bonus: 5 sites (spell damage, heal, melee, arrows, and the display in GamePlayerUtils.cs:340-341). Candidate files opened: `relics/Relic.cs` and `relics/RelicMgr.cs` (both 32-line stubs, not the mechanism), `GameRelicPad.cs`, `RelicMgr.cs`, `GameRelic.cs`. Not read: GameRelic.cs 145-215 (examine text, DB load and save), 413-481 (templates); GameRelicPad.cs 13-131, 188-215, 237-313; `GameLiving.BenefitsFromRelics`; when the stealth event fires. Confidence: high for the carry, loss and return loop and for the bonus formula, which are read end to end; medium on the drop position, which is read from the call order and not run. camera_scope: not a camera cell.

Best transferable idea: A unique world item has one carrier at a time, a carry-check tick, and a return clock that sends it home; a realm bonus counts captured enemy copies only while your own original is held.
Decision (proposed): adapt - take the one-carrier loop (loss on death, quit, linkdeath or dropped item; ground return clock; enemy-pad pickup gated by enemies present and by owning your own original) as a server-owned relic row for relic items; take the bonus as a data-driven multiplier in the engine damage step. Adapt, not adopt: the donor's stealth loss fires on any stealth change and the drop position is stale by up to one 4 s tick; both are fixed in the sketch.
Acceptance: A server test: a relic carrier who dies drops the relic at the death tile (not a tile from up to 4 s earlier), and the relic returns to its pad after the return time and never onto a pad already holding 3 relics. A player whose realm has no own original mounted gets multiplier 1.0 even with two captured enemy relics; with the own original mounted the multiplier is 1.2.

## 1. Mechanism

- Two relic kinds, Strength and Magic (`eRelicType`, GameRelic.cs:11). Each realm's relic has an original realm. A relic is in one of three states: mounted on a pad (`realm` = the pad's realm), carried (`CurrentCarrier` set, the item is in the carrier's backpack, `Realm = 0`), or on the ground (not mounted, return clock running).
- Pickup, `Interact` (GameRelic.cs:51-131), in order: refuse if the player already carries a relic (TempProperties), is dead, or is stealthed (69-71); refuse own-realm relics on own pad (76); a relic on an enemy pad must pass `RelicMgr.CanPickupRelicFromShrine` (82); for ordinary players the pad needs at least `RELIC_PLAYERS_REQUIRED_ON_PAD` enemy players within 500 units (91-94; `GetEnemiesOnPad`, GameRelicPad.cs:216-218). Then add to the backpack, set `CurrentCarrier` (105), take it off the pad (111), set `Realm = 0` (119), attach the loss handlers, start the carrier timer and stop any return timer.
- Shrine rule, `CanPickupRelicFromShrine` (RelicMgr.cs:222-252): the realm's own original is always allowed (228-229). Any other relic needs the picking realm to have its own original of the same kind mounted on a pad (240-245).
- Carrying, `CarrierTimerTick` (GameRelic.cs:334-368): every 4000 ms (`RELIC_EFFECT_INTERVAL`, line 23) it refreshes the relic position from the carrier, then checks the item is still in the carrier's backpack. If not, the relic goes back to its previous pad (353-357; the frontier block at 336-349 is commented out in the donor). Otherwise it sends a cosmetic effect to nearby players and re-arms.
- Loss, `PlayerAbsence` (GameRelic.cs:389-407), attached to Quit, Dying, Linkdeath, StealthStateChanged and ItemDropped (374-375). Dropping the item calls `PlayerLoosesRelic(false)` after removing the ground copy (397-401). Every other event calls `PlayerLoosesRelic(true)` (405). The handler does not read the new stealth state, so any stealth change is a loss.
- `PlayerLoosesRelic` (GameRelic.cs:228-274): remove the item from inventory, drop the handlers, stop the carrier timer, clear the carrier property, then clear `CurrentCarrier` (258). If the relic is not mounted, it starts the ground clock `_timeRelicOnGround` (263), starts a 4000 ms return timer, calls `Update()` (269) and adds itself to the world (271).
- Drop position, a defect read from call order: `Update()` returns at once when `CurrentCarrier` is null (218), and `CurrentCarrier` is cleared at 258 before `Update()` at 269. So the relic lands at the position the last carrier tick wrote, up to 4 s old, not at the death or drop position.
- Return, `ReturnRelicTick` (GameRelic.cs:275-300): every 4000 ms, while less than `ReturnRelicInterval` (`RELIC_RETURN_TIME` times 1000, line 39; default 20 * 60 seconds) has passed since the drop, it sends a cosmetic ping to players in range. Once the clock runs out it calls `RelicPadTakesOver(_returnRelicPad, true)` (293) and stops. If there is no return pad it logs an error and the relic stays out.
- Mounting, `GameRelicPad.MountRelic` (GameRelicPad.cs:132-187): refuses at 3 relics on the pad (134). On a real capture (not a return) it announces the capture, credits `CapturedRelics` to same-realm players within `VISIBILITY_DISTANCE * 5` of the carrier (165-168), and sets `relic.Realm` to the pad's realm (182).
- Bonus, `RelicMgr.GetRelicBonusModifier` (RelicMgr.cs:194-220): returns 1.0 if the living does not benefit from relics (198). It walks the relics; for each mounted relic of the living's realm and kind (209), its own original sets `owningSelf` and adds nothing, and each captured enemy relic adds `RELIC_OWNING_BONUS * 0.01` (214). It returns the modifier only if `owningSelf` is true, else 1.0 (219). With two captured enemy relics and own original mounted: 1.0 + 0.10 + 0.10 = 1.2.
- Callers checked (5): spell damage (`SpellHandler.cs:2947`, Magic), heal (`HealSpellHandler.cs:115`, Magic), melee (`ECS-Components/AttackComponent.cs:986`, Strength), arrows (`spells/Archery/Arrow.cs:242`, Magic), and the display (`gameutils/GamePlayerUtils.cs:340-341`). No cap on the modifier was found in the function read.
- Decay: `GetDaysSinceCapture` (RelicMgr.cs:129) exists, but no call site was found in the grep, so it is not used.

## 2. Key functions

- `GameRelic.Interact`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/keeps/Relics/GameRelic.cs` 51-131.
- `GameRelic.PlayerLoosesRelic`: GameRelic.cs 228-274 (loss, drop, ground clock).
- `GameRelic.ReturnRelicTick`: GameRelic.cs 275-300 (return to pad).
- `GameRelic.CarrierTimerTick`: GameRelic.cs 334-368 (4 s carry check).
- `GameRelic.PlayerAbsence`: GameRelic.cs 389-407 (loss events).
- `RelicMgr.GetRelicBonusModifier`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/keeps/Managers/RelicMgr.cs` 194-220.
- `RelicMgr.CanPickupRelicFromShrine`: RelicMgr.cs 222-252.
- `GameRelicPad.MountRelic`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/keeps/Relics/GameRelicPad.cs` 132-187.
- `GameRelicPad.GetEnemiesOnPad`: GameRelicPad.cs 216-231.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One carrier; carry check every tick; loss on death, quit, linkdeath, drop | Carry check 4000 ms (GameRelic.cs:23) |
| Ground return clock, then send home | 20 * 60 s default (`Relic_Return_Time`, ServerProperties.cs:1301-1302), ms conversion at GameRelic.cs:39 |
| Owning bonus per captured enemy relic, gated by own original | 10 percent per relic (`relic_owning_bonus`, ServerProperties.cs:900-901), used as x 0.01 (RelicMgr.cs:214) |
| Pickup from an enemy pad needs enemies present | 16 enemies (`relic_players_required_on_pad`, ServerProperties.cs:1331-1332), counted in radius 500 (GameRelicPad.cs:218) |
| Pad capacity | 3 relics (GameRelicPad.cs:134) |
| Pad area | radius 250 (GameRelicPad.cs:17) |
| Capture credit | `VISIBILITY_DISTANCE * 5` (GameRelicPad.cs:165) |

## 4. TypeScript sketch

simplified: The sketch keeps the donor's bonus formula, shrine pickup rule, carrier loss, and ground return clock. It fixes three things: the drop lands at the position the caller passes (the death tile), a stealth change drops the relic only when the carrier becomes stealthed, and the return check is exact rather than polled every 4000 ms. It omits: the database save and load, the pad area and the Interact message texts, the news and Discord broadcasts, the carrier backpack check, the `BenefitsFromRelics` gate (the sketch treats it as true), the staff exemption from the enemy-count gate (the sketch applies the gate to all), and the capture credit.

```ts
// Licence: GPL-3.0 (donor, LICENSE). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Realm = "A" | "B" | "C" | "none";
type RelicKind = "strength" | "magic";

interface Relic {
  id: number;
  kind: RelicKind;
  originalRealm: Realm;
  realm: Realm;                 // realm of the pad it sits on; "none" while carried or on the ground
  mountedOn: number | null;     // pad id, null when carried or on the ground
  carrierId: number | null;
  x: number;
  y: number;
  droppedAtMs: number | null;   // set when it lands on the ground: the return clock starts here
  returnPadId: number;          // the pad it goes back to
}

interface Pad { id: number; realm: Realm; relicIds: number[]; }

const RETURN_MS = 1200000;      // donor: Relic_Return_Time = 20 * 60 seconds (GameRelic.cs ReturnRelicInterval)
const OWNING_BONUS = 0.10;      // donor: relic_owning_bonus = 10 percent per captured enemy relic
const PICKUP_ENEMIES = 16;      // donor: relic_players_required_on_pad = 16
const PAD_MAX = 3;              // donor: MountRelic refuses at 3 relics on a pad

// Bonus: 1.0 unless your own original relic of this kind is mounted; then +10% per captured enemy relic.
function relicBonus(realm: Realm, kind: RelicKind, relics: Relic[]): number {
  let modifier = 1.0;
  let owningSelf = false;
  for (const r of relics) {
    if (r.realm !== realm || r.kind !== kind || r.mountedOn === null) continue;
    if (r.realm === r.originalRealm) owningSelf = true;
    else modifier += OWNING_BONUS;
  }
  return owningSelf ? modifier : 1.0;
}

// Pickup: a relic on an enemy pad needs enough enemies on the pad, and your realm must already hold
// its own original of the same kind on a pad. Your own original is always allowed (donor shrine rule).
function canPickup(realm: Realm, relic: Relic, relics: Relic[], enemiesNearPad: number): boolean {
  if (relic.carrierId !== null) return false;
  if (relic.mountedOn !== null && relic.realm === realm) return false;   // owned by your realm
  if (relic.mountedOn !== null && enemiesNearPad < PICKUP_ENEMIES) return false;
  if (relic.originalRealm === realm) return true;
  return relics.some(r => r.realm === realm && r.originalRealm === realm && r.kind === relic.kind && r.mountedOn !== null);
}

// Carrier loses the relic (death, quit, linkdeath, dropped item). It lands where the caller says the carrier stood.
function onCarrierLost(relic: Relic, x: number, y: number, nowMs: number): void {
  relic.carrierId = null;
  relic.realm = "none";
  relic.x = x;
  relic.y = y;
  relic.droppedAtMs = nowMs;
}

// Fix to the donor's stealth handler: drop the relic only when the carrier becomes stealthed.
function onStealthChanged(relic: Relic, nowStealthed: boolean, x: number, y: number, nowMs: number): void {
  if (relic.carrierId === null || !nowStealthed) return;
  onCarrierLost(relic, x, y, nowMs);
}

// Return check: a ground relic goes back to its pad when the clock runs out.
function returnTick(relic: Relic, nowMs: number, pads: Map<number, Pad>): void {
  if (relic.mountedOn !== null || relic.carrierId !== null || relic.droppedAtMs === null) return;
  if (nowMs - relic.droppedAtMs < RETURN_MS) return;
  const pad = pads.get(relic.returnPadId);
  if (!pad || pad.relicIds.length >= PAD_MAX) return;   // stays on the ground; the donor logs an error here
  pad.relicIds.push(relic.id);
  relic.mountedOn = pad.id;
  relic.realm = pad.realm;
  relic.droppedAtMs = null;
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, with `export {}` appended, exit 0.

## 5. Lands in

- TARGET `src/fight/relics.ts` (new module: one relic row per unique item, one carrier at a time, the realm bonus as a damage and heal multiplier read by the engine). Parity-checklist row 13 (specials).
- today: none in Frankendom.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: one engine (the bonus is applied in the engine's damage and heal step, not in the client); kills and carry state server-verified; rule numbers in the focus brief n/a

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism, not the donor lines.
- Defect: any stealth change drops a carried relic (GameRelic.cs:375, 389). Fix: drop only on entering stealth (sketch `onStealthChanged`). The event's firing rules were not read.
- Defect: the drop position is up to 4 s stale (GameRelic.cs:218, 258, 269). Fix: refresh the position from the death or drop event before clearing the carrier.
- Mismatch: the enemy-count gate counts players within radius 500 (GameRelicPad.cs:218), but the pad area is radius 250 (GameRelicPad.cs:17). Fix: one radius, held as a zone data field.
- Possible crash, not run: `CarrierTimerTick` passes `_returnRelicPad` to `RelicPadTakesOver` with no null check (GameRelic.cs:355; the call at 344 is inside the commented-out block). `ReturnRelicTick` does check (293 path). A relic that was never mounted and has no return pad would reach `MountRelic` with null. Fix: null check and a fixed home pad per relic.
- The bonus has no cap in the function read (RelicMgr.cs:194-220), so enemy captures stack linearly. Frankendom should cap it as a data field if the stacking is wanted.
- The realm pad geography (keeps) does not map to Frankendom zones. Frankendom would hold pads as zone rows (zone data), not as keep objects.
- Persistence (`SaveIntoDatabase`, GameRelic.cs:194-215, not read) is not in this sketch. Frankendom's one ledger would hold the relic's owner and state.
- The return timer is polled every 4000 ms (GameRelic.cs:23), so a return can be up to 4 s late. The sketch checks exact times.

## GL table (gods-legends-favour, focus rows 1-14)

| # | Name | Effect | Formula | Number ranges | Gain/loss events | Decay | file:line |
|---|---|---|---|---|---|---|---|
| 1 | Favour as a resource | None in the read code. "Devotion" appears only as an effect name (SelflessDevotionEffect.cs:95); "piety" appears in 105 files (not read) | - | - | - | - | none read |
| 2 | Blessings and curses as timed rows | Not the relic. Relic has a cosmetic ping only. "Valhalla's Blessing" is a realm ability effect name (ValhallasBlessingEffect.cs:67, not read). "curse" appears in 7 files (warlock spell names, ClassWarlock.cs:47-54, not read) | - | - | - | - | ValhallasBlessingEffect.cs:67 (name only) |
| 3 | Patron choice and switching | None: "deity" appears in 0 files | - | - | - | - | none found |
| 4 | Domains as tags | Relic kind is the tag: Strength drives melee, Magic drives spell damage, heal and arrows | Multiplier = bonus per kind | Strength / Magic | Kind decided by the relic item | - | GameRelic.cs:11; callers at SpellHandler.cs:2947, HealSpellHandler.cs:115, AttackComponent.cs:986, Arrow.cs:242 |
| 5 | Boons at thresholds | None found. "boon" appears in 3 files, names only (not read) | - | - | - | - | none found |
| 6 | Legend signature powers | Not read. Realm abilities exist (realmabilities/ folder, not read) | - | - | - | - | none read |
| 7 | Shapeshifting | Not read ("shapeshift": 2 files) | - | - | - | - | none read |
| 8 | Avatars or summons | Not read ("avatar" not searched) | - | - | - | - | none read |
| 9 | Fate, luck, oaths | None: "oath" appears in 0 files | - | - | - | - | none found |
| 10 | Underworld and death rules | Carried relic lost on death, which drops it on the ground with a return clock. Resurrection sickness is a spell (RvRSicknessSpellHandler.cs, 34 lines, not read) | Return clock 20 * 60 s | 1200 s default | Loss on Dying (GameRelic.cs:374, 405) | Ground clock, not decay | GameRelic.cs:228-300 |
| 11 | Mounts as rewards | None found in read code | - | - | - | - | none found |
| 12 | Relics as unique items | Full mechanism (one carrier; loss on death, quit, linkdeath, drop, stealth; ground return to home pad; pad max 3) | Return 1200 s; pad max 3; pickup enemies 16 in radius 500 | as stated | Pickup (Interact), loss (PlayerAbsence), capture (MountRelic) | `GetDaysSinceCapture` defined, no call site found | GameRelic.cs:51-407; GameRelicPad.cs:132-187 |
| 13 | Temples and shrines | Relic pads act as the shrine: a pad with an area of radius 250; pickup rule per realm | Area 250 | 250 | Capture by carrying a relic onto the pad | - | GameRelicPad.cs:17; RelicMgr.cs:222-252 |
| 14 | Pantheon factions and realm pride | Realm bonus: +10% per captured enemy relic only while own original is mounted; capture credits same-realm players | Multiplier 1 + 0.10 x captured enemy relics, only if own original mounted | 10 percent default | Gain: capture (MountRelic, CapturedRelics++ at 168). Loss: relic taken from pad | - | RelicMgr.cs:194-220; ServerProperties.cs:900-901; GameRelicPad.cs:165-168 |

Grep counts above are file counts from one `grep -rliw` pass over GameServer, CoreBase, CoreServer and sharedModules on the VPS; they are pointers, not reads.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: one engine (the bonus is applied in the engine's damage and heal step, not in the client); kills and carry state server-verified; rule numbers in the focus brief n/a


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
Errors: All claims verified: eRelicType 11-16; RELIC_EFFECT_INTERVAL 4000 at 23; ReturnRelicInterval = RELIC_RETURN_TIME*1000 at 39; Interact order (carrying/dead/stealth refusals 56-72, own realm 76, CanPickupRelicFromShrine 82, enemies>=16 for players 89-96, backpack add, CurrentCarrier 105, pad removal 111, Realm=0 119); GetEnemiesOnPad radius 500 at 218 vs PAD_AREA_RADIUS 250 at 17; MountRelic refuses at 3 (134), capture credit VISIBILITY_DISTANCE*5 at 165-168, Realm set 182; CarrierTimerTick 334-367 with frontier block commented out; SetHandlers 373-377 events; PlayerAbsence 389-406; PlayerLoosesRelic 228-273 and the stale drop position defect is real (CurrentCarrier nulled at 258, Update returns at 218 before the call at 269); ReturnRelicTick 275-300; GetRelicBonusModifier 194-220 and 209/214/219 exactly as described; CanPickupRelicFromShrine 222-250; 5 call sites match (SpellHandler 2947, HealSpellHandler 115, AttackComponent 986, Arrow 242, GamePlayerUtils 340-341); defaults 10 / 20*60 / 16; GetDaysSinceCapture 129 unused; GPL v3 ok.
Missed: Minor: when the return pad is full, RelicPadTakesOver fails (MountRelic returns false) and ReturnRelicTick still stops and nulls its timer (lines ~303-305), so the relic stays on the ground forever with no retry; the sketch retries each tick instead and the note only says it 'stays on the ground; donor logs an error'. PlayerAbsence sets Realm=0 (391) on every event including drops of unrelated items. Not important.
