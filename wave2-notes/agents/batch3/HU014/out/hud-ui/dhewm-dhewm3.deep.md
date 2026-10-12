# dhewm-dhewm3 (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/dhewm-dhewm3/neo/d3xp/Player.cpp` | Licence: GPL-3.0-or-later (Player.cpp header: "version 3 of the License, or any later version"; COPYING.txt is GPL v3; README.md line 225 states the Doom 3 GPL code is also subject to id's additional terms; clean-room only) | C++ | symbol `idPlayer::UpdateFocus`

Checked: read in full `idPlayer::UpdateFocus` (Player.cpp 5330-5598: allowFocus gate, expiry clear, eye-origin ray, NPC/vehicle branch, GUI branch, NPC name branch), `ClearFocus` (5314-5320), `UpdateHudStats` (3071-3122, read to the armour pulse), `DrawHUD` (3207-3224, read to the Redraw call), `GiveHealthPool` (3572-3585), `UpdatePowerUps` health pool and nightmare take (3948-4028), `ShowTip` and `HideTip` (9912-9930), Player.h 60-70 constants, UsercmdGen.h 40-41, Weapon.cpp 1345-1356 (partial). Callers checked: `UpdateFocus` is called at Player.cpp 7451 (inside `Think`, defined 7323) and 9370 (inside `ClientPredictionThink`, 9302); `UpdatePowerUps` at 7492 and 9396. Caller lists were read for d3xp only. Not read: the base-game copy `neo/game/Player.cpp`; the HUD `.gui` files and the `.lang` string file (not in the box: `base/` holds only three cfg files); the attack-button sampling path; the main loop that calls `Think`. Confidence: high on the focus hold and the health pool (both read end to end, numbers confirmed by receipts); high on the nightmare cvar defaults (read on the cvar lines). `camera_scope` not applicable (topic is hud-ui).

Best transferable idea: a lock-on target that is held for a fixed grace time after its last hit (refreshed on every hit, dropped only when the timer runs out), so a brief look-away does not lose it.

Decision (proposed): adapt — keep the grace-timer hold as a client-side lock-on forgiveness for the target frame; change the donor's first-match pick to nearest-in-range and restrict the attack-held gate to non-combat prompts. Why: the hold is pure client input and HUD, consistent with the rulings that the HUD and camera are client-only, and the server still verifies every hit; the donor's first-match rule is a defect in a many-on-one fight.
Acceptance: when the aim slides off an enemy for under 0.3 s during a fight, the target frame stays on that enemy and the next attack goes to it; after 0.3 s with no hit the frame drops; a server test asserts the hit is still checked against the target's position at the time of the hit.

## 1. Mechanism

- Focus is one slot. `ClearFocus` (5314) empties the NPC talk target, the GUI entity and UI, the vehicle and the talk cursor. Every new focus calls `ClearFocus` before it is set, so only one kind of focus is live at a time.
- Each `UpdateFocus` call (order as the code runs):
  (a) `allowFocus` (5355-5356): false in multiplayer, or when attack is held and no NPC is already focused. This is read before the expiry clear (5366), so it sees the old NPC focus.
  (b) Old focus values are saved (5361-5364). If `focusTime <= gameLocal.time`, `ClearFocus` runs (5366-5367). The focus therefore survives until its hold has run out.
  (c) A ray from the eye, 80 units forward (5375-5376), is bounded and used to collect clip models (5396). The comment at 5398 says there is "no pretense at sorting here", so the first match in list order wins.
  (d) Per entity: hidden entities are skipped (5404); NPCs and vehicles are only tested when `allowFocus` is true. A talkable NPC hit (trace fraction below 1 and matching entity number, 5427-5428) clears the old focus, sets `focusCharacter`, sets `talkCursor = 1`, and sets `focusTime = gameLocal.time + FOCUS_TIME` (5431), then breaks the loop. Vehicles follow the same pattern with the same 300 ms (5440-5443).
  (e) Interactive GUIs (5454-5459): entities marked `inv_item` are skipped; the rest are traced against their GUI surface. On a hit, the GUI slot (gui[0], gui[1] or gui[2] by the hit's GUI id) becomes the focus. On a new activation, the inventory and health, stamina and armour strings are pushed into the panel (5483-5526). A mouse-move event is sent to the hit point (5541), and `focusTime = gameLocal.time + FOCUS_GUI_TIME` (5544) is set, then the loop breaks. This branch sits outside the `allowFocus` block, so GUI focus is not gated by the attack button.
  (f) After the loop: if a GUI is focused, the old panel is deactivated and the new one activated with sounds (5549-5567). If the NPC focus changed, the HUD gets the NPC name and a `showNPC` or `hideNPC` event (5572-5589).
- Miss behaviour: when a frame's trace hits nothing, nothing is cleared. The old focus stays until its hold expires. That is the forgiveness.
- Clock: the hold uses the game clock in milliseconds. The usercmd rate is 60 Hz (UsercmdGen.h 40); how often `Think` is called was not read.
- HUD (the panel side): `DrawHUD` (3209) returns early when there is no weapon, a camera or influence is active, a private camera view is on, or `g_showHud` is off. Otherwise it runs `UpdateHudStats` (3213), which pushes health, stamina percent, armour and heart rate as state values (3085-3088) and fires one-shot events: `healthPulse` and `healthTake` (3099-3108) are sim-set flags that the HUD consumes and clears.
- Health pool: `GiveHealthPool` (3572-3585) adds heal to a pool, capped at maxHealth minus current health, and makes the next pulse due now. `UpdatePowerUps` (3948) pays the pool out: when the pulse is due and the player is alive (3999), it moves at most 5 points into health (4001-4003), sets the next pulse 333 ms later (4009), and sets `healthPulse` (4010).
- Nightmare pressure (skill 3): when the timer is due and health is above the floor (4013), health drops by `g_healthTakeAmt` (4019), is clamped at `g_healthTakeLimit` (4020-4021), the next take is due after `g_healthTakeTime` seconds (4026), and `healthTake` is set (4027). In the d3xp build the take is skipped while the invulnerability powerup is active (4016-4017).

## 2. Key functions

- `idPlayer::UpdateFocus`: `/mnt/frankendom-donors/dhewm-dhewm3/neo/d3xp/Player.cpp` 5330-5598. The whole focus pass: gate, hold expiry, ray, NPC/vehicle hit, GUI hit, NPC name for the HUD.
- `idPlayer::ClearFocus`: Player.cpp 5314-5320. Empties every focus slot and the talk cursor.
- `idPlayer::UpdateHudStats`: Player.cpp 3071-3122. State push plus one-shot pulse events.
- `idPlayer::DrawHUD`: Player.cpp 3207-3224. Gate, stat push, weapon icon, redraw.
- `idPlayer::GiveHealthPool`: Player.cpp 3572-3585. Adds to the heal pool.
- `idPlayer::UpdatePowerUps` (pool and nightmare blocks only): Player.cpp 3948-4028.
- `idPlayer::ShowTip` / `HideTip`: Player.cpp 9912-9930. One tip window; `ShowTip` returns early if one is already up (9913, read, not receipted); auto-hide after 5 s by a posted event (9920).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Hold a target for a fixed time after its last hit; a hit refreshes the hold; a miss keeps the target until expiry | NPC and vehicle hold 300 ms (Player.h 65; set at Player.cpp 5417, 5431, 5443). GUI hold 500 ms (Player.h 66; set at 5544). |
| Aim ray of fixed reach from the eye | 80 units (5376) |
| Heal pool paid out in fixed pulses | 5 points per pulse (4001); 333 ms between pulses (Player.cpp 70) |
| Pressure drain on a timer with a floor | 5 points every 5 s, floor 25 (cvar defaults on `SysCvar.cpp` 153-155 and use at Player.cpp 4019-4026) |
| Low-ammo state flag | clip at or below the weapon's `lowAmmo` (Weapon.cpp 1353) |
| Sim-to-HUD one-shot flag | `healthPulse`, `healthTake` set in the sim and cleared when the HUD reads them (3099-3108) |

Defects (keep the idea, fix the defect):
- No sort: the first clip model in list order wins (5398). Fix: pick the nearest candidate within reach. The sketch does this.
- Attack-held gate blocks any new NPC focus while attack is held (5355-5356). Fix: keep the gate for non-combat prompts only; for combat lock-on, never gate on attack. This is a design conflict for a fighting game, not a bug in a single-player game.

## 4. TypeScript sketch

simplified: keeps the donor order (expire the hold, search, refresh the hold on a hit, clear only on expiry) and the attack gate on new NPC focus. It fixes the first-match rule by picking the nearest candidate in reach. It omits: the ray itself (hits come in already filtered to the ray), the GUI mouse forwarding, inventory enumeration, talk cursor, vehicle focus, the multiplayer name trace, the `inv_item` exclusion, the activation sounds, and the HUD events. The attack gate is applied to NPC candidates only, as in the donor, and never to GUI candidates.

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

type Kind = "npc" | "gui";
interface Candidate { id: number; kind: Kind; distance: number; }
interface Focus { target: Candidate | null; holdUntil: number; }

const NPC_HOLD_MS = 300;        // data: hold after the last hit on a talkable NPC
const GUI_HOLD_MS = 500;        // data: hold after the last hit on an interactive panel
const AIM_RANGE_UNITS = 80;     // data: aim reach from the eye

// fix (the donor has no sort): the nearest candidate in range wins, not the first in list order.
function pickNearest(hits: Candidate[]): Candidate | null {
  let best: Candidate | null = null;
  for (const h of hits) {
    if (h.distance > AIM_RANGE_UNITS) continue;
    if (best === null || h.distance < best.distance) best = h;
  }
  return best;
}

// hits: everything the aim ray touched this tick. Donor order: expire the hold, search, refresh the hold on a hit.
function updateFocus(prev: Focus, now: number, hits: Candidate[], attackHeld: boolean): Focus {
  const hadNpc = prev.target !== null && prev.target.kind === "npc"; // donor reads the NPC focus before the expiry clear
  const f: Focus = prev.holdUntil > now ? prev : { target: null, holdUntil: 0 };
  const eligible = hits.filter(h => !(h.kind === "npc" && attackHeld && !hadNpc));
  const hit = pickNearest(eligible);
  if (hit === null) return f; // miss: keep the old target until its hold runs out
  const hold = hit.kind === "npc" ? NPC_HOLD_MS : GUI_HOLD_MS;
  return { target: hit, holdUntil: now + hold };
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/HU014-dhewm-lockon.ts`, exit 0.

## 5. Lands in

- TARGET `src/fight/target-lock.ts` (new, client-side lock-on hold and nearest-in-reach pick). The engine supplies the candidates and validates the chosen target; the hold is a client view only.
- Parity-checklist row 14 (HUD: target frame and panels).
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later with id additional terms; clean-room only)
- Brief rule served: rule 1 (one engine; the HUD and input are client-only); hud-ui fold-ins: lock-on forgiveness, target frame, pulse feedback

## 6. Gaps and risks

- Licence: GPL-3.0-or-later with id's additional terms (README.md 225), plus a second "Licensing: GPL v2" line at README.md 458 for a component not identified here. Clean-room only; the sketch is written from the mechanism.
- First person: the donor aims from the eye (5375) at a fixed 80 units. A third-person over-the-shoulder camera has to take the aim ray from the camera's aim point, offset from the head, or the lock will pick the wrong thing. This is client-only and bears on the owner's camera complaint.
- The attack gate (5355-5356) would stop new lock acquisition during a fight if copied as is. Use it only for non-combat prompts.
- Multiplayer disables NPC focus entirely (5355). Frankendom has not decided its multiplayer HUD rule.
- The hold is a client fact. The server must still check every hit against the target's position at the time of the hit, and one ledger keeps the kill; a held target is not a server fact.
- The hold can keep a frame on a target that has left reach for up to 300 ms. Acceptance tests the frame, never the kill.
- Frankendom's MAX_ATTACKERS = 3 has no counterpart here: the donor focuses one thing at a time. In a many-on-one fight the HUD target frame should show the engine's hate-table pick, not the aim. Not in this donor.
- Minimap and world map: none in the code read. The map, if any, would be a `.gui` file, and no `.gui` files are in the box (not read).
- Touch UX: no touch input path found in the game code. A grep for "touch" in `neo/` returned only FileSystem, DeclManager and the bundled imgui library (not read). Verdict on touch: not in this donor.
- Input buffer: the donor samples the usercmd at 60 Hz (UsercmdGen.h 40); no separate input buffer for lock-on was read (not read).
- Accessibility: `g_showHud` (3209) is a single switch for the whole HUD. No per-element options were read.
- String tables and localisation: the loader reads `strings/englishNNN.lang`, where NNN comes from the product language extension (Common.cpp 2107), and a `FilterLangList` helper (1648) filters the strings folder. The `.lang` file is not in the box, so I could not count entries or describe the grammar. Gameplay code looks up ids such as `#str_02036` through `common->GetLanguageDict()` (Player.cpp 5577). Not read beyond the loader.
- Where seen: death and respawn presentation, boss intro and idle animation vocabulary were not read in this donor (not read).

Reuse tag: rewrite-from-idea (GPL-3.0-or-later with id additional terms; clean-room only)
Brief rule served: rule 1 (one engine; the HUD and input are client-only); hud-ui fold-ins: lock-on forgiveness, target frame, pulse feedback
