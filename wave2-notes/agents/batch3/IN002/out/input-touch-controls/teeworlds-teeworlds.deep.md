# teeworlds-teeworlds (input-touch-controls, cell 3)

Donor: `/mnt/frankendom-donors/teeworlds-teeworlds/src/game/client/components/controls.cpp` (client input, aim, send policy) and `src/game/server/entities/character.cpp` (server press counting, fire on arrival, reload) | Licence: zlib-style permissive grant (`license.txt` line 1 "Copyright (C) 2007-2024 Magnus Auvinen"; line 3 "This software is provided 'as-is', without any express or implied") | C++ | symbols `CControls::SnapInput`, `ConKeyInputCounter`, `CControls::ClampMousePos`, `CControls::OnCursorMove`, `CCharacter::OnDirectInput`, `CountInput`, `CCharacter::FireWeapon`

Checked: read `controls.cpp` 1-66 (reset, counters, registration), 108-200 (`SnapInput`), 199-268 (aim render, cursor move, clamp, max distance). Read `character.cpp` 14-40 (`CountInput`), 248-300 (`FireWeapon` head and no-ammo), 409-450 (`HandleWeapons`), 480-540 (predicted and direct input, reset, tick). Grepped `datasrc/network.py` (mask 0x3f, line 30) and `protocol.h` (tick 50, line 81). Camera scope: not applicable (input cell); the dynamic-camera distance term is read only because it bounds the aim. Confidence: high on the client press counter, the send policy, the aim clamp, the server count and fire-on-arrival (read end to end). Not read: the chat and menu freeze beyond line 137, `CCharacter` movement core, the client reckoning (`character.cpp` 600-625), the weapon data table (`Firedelay` values, not read), the engine joystick layer (`engine/client/input.cpp`), and the server tick loop. No touch input, virtual stick, tap-to-move, lock-on or gesture code was found in this donor (grep for touch and joystick hits only menus, the engine input layer and keynames).

Best transferable idea: a fire button is a counter of state flips rather than a boolean, so presses that land between two network sends are all counted on the server, and a shot is due whenever a new press is pending and the gun is ready.

Decision (proposed): adapt. Keep the press counter and the server-side count between states, and fix the donor's one gap: a press during the reload window is dropped, because the donor copies the new state into the previous-state slot even when no shot was taken. Keep the aim offset clamp as the virtual-stick model for the thumb aim on a phone. Put it all in `src/fight/intake.ts` so the engine owns the count and the server verifies every shot.

Acceptance: a server test asserts that two taps, the second landing during a 300 ms reload, produce two shots (the second when the reload ends), and that a tap at a ready gun produces exactly one shot; on a 375-wide phone the aim thumb offset stays inside the clamp circle.

## 1. Mechanism

Two halves: the client turns input into a small state packet, and the server turns packets into shots.

- **Fire as a counter (client).** `+fire` is registered with `ConKeyInputCounter` (`controls.cpp:88`). Each call adds one to the counter when the state flips (`:55-56`) and masks it to the wire width (`:57`). A press and a release both move the counter, so presses that land between sends are all still in the counter.
- **Reset simulates a release.** When chat or a menu is active, `OnReset` clears direction and jump, and if fire is held it adds one so the held state appears released (`:26-28`).
- **Send policy.** `SnapInput` builds the packet each call (`:110`). Aim is the integer mouse offset (`:142`); a zero aim becomes (1, 0) on the client (`:144-146`). Direction is -1, 0 or 1, with left and right together giving 0 (`:152-155`). It sends if direction, jump, the fire counter, hook or a weapon request changed (`:175-181`), or when the timer `time_freq()/25` has passed (`:184`). The comment above it says "send at at least 10hz" (`:183`), but the code is 40 ms, i.e. 25 Hz. The packet is copied to `m_LastData` on every call (`:189`).
- **Aim as a clamped offset (virtual stick).** The cursor is an offset from the character, not a screen point. `OnCursorMove` adds the relative motion times mouse sensitivity (`:232`, `:239`). In absolute joystick mode the stick position times the max distance is the offset (`:218`, `:224`). `ClampMousePos` rescales any offset longer than the max onto the max circle (`:252-254`). The world aim point is character position plus offset (`:205`).
- **Max distance.** Dynamic camera: `min(200 / followFactor + deadzone, maxDynamic)` (`:262`, `:264`). Static: a config value (`:267`). The config defaults were not read.
- **Server count.** `CountInput(prev, cur)` walks the counter one state at a time from prev to cur and counts odd states as presses and even states as releases (`character.cpp:21-31`, mask at `:24`, step at `:30`).
- **Fire on arrival.** `OnDirectInput` shifts the previous state (`:497`), stores the new one, and once more than two inputs have arrived (`m_NumInputs > 2`, `:504`) calls `HandleWeaponSwitch` then `FireWeapon` at once (`:505-507`). It copies the new state into previous again after that (`:510`). So a shot is decided when the packet arrives, not at the next tick.
- **Shot due.** `FireWeapon` returns while the reload timer runs (`:249-250`). Otherwise a shot is due if `CountInput` finds a press (`:263`), or for full-auto weapons if fire is held and there is ammo (`:266`). With no ammo the reload is set to 125 ms worth of ticks (`:276`) and the comment says "125ms is a magical limit of how fast a human can click" (`:275`).
- **Reload.** After a shot the reload is the weapon's fire delay in ticks (`:406`). `HandleWeapons` counts it down one per tick (`:415-417`) and skips firing while it runs.
- **Tick.** The character tick copies the predicted input into the movement core (`:527`) and then runs weapons (`:537`). The server tick is 50 per second (`protocol.h:81`).
- **Predicted input.** `OnPredictedInput` copies the packet into `m_Input`, counts it (`:483-488`), and maps a zero aim to straight up (`:491-492`). It does not fire.

## 2. Key functions

- `CControls::SnapInput`: `/mnt/frankendom-donors/teeworlds-teeworlds/src/game/client/components/controls.cpp` 110-190.
- `ConKeyInputCounter`: same file 52-58. `CControls::OnReset`: same file 21-34.
- `CControls::OnCursorMove`: same file 212-242. `CControls::ClampMousePos`: same file 243-257. `CControls::GetMaxMouseDistance`: same file 258-268.
- `CountInput`: `/mnt/frankendom-donors/teeworlds-teeworlds/src/game/server/entities/character.cpp` 21-31.
- `CCharacter::FireWeapon`: same file 248-407 (fire decision 249-270, no-ammo 273-277, reload 405-406).
- `CCharacter::HandleWeapons`: same file 409-449.
- `CCharacter::OnPredictedInput`: same file 480-493. `CCharacter::OnDirectInput`: same file 495-511. `CCharacter::ResetInput`: same file 513-522. `CCharacter::Tick`: same file 525-538.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Fire counter: +1 on each state flip, masked to the wire width | Mask 0x3f, six bits (`datasrc/network.py:30`) |
| Server count: presses are odd states passed between two counter values | Same mask (`character.cpp:24`) |
| Send on change, else at least once per interval | Interval `time_freq()/25` = 40 ms (`controls.cpp:184`); comment says 10 Hz (`:183`) |
| Aim offset clamped to a max circle (virtual stick) | Dynamic max = min(200 / followFactor + deadzone, maxDynamic) (`controls.cpp:262-264`); static max from config (`:267`) |
| Absolute stick mapped to max distance | Same max (`controls.cpp:224`) |
| Reload gate in ticks from weapon fire delay | Fire delay in ms x tick speed / 1000 (`character.cpp:406`); tick speed 50 (`protocol.h:81`) |
| No-ammo retry | 125 ms (`character.cpp:276`) |
| Fire on arrival only once the stream has started | Threshold: more than two inputs seen (`character.cpp:504`) |

## 4. TypeScript sketch

simplified: the sketch keeps the counter, the server count, fire on arrival, the reload gate, the aim clamp, the zero-aim rule and the send policy. It changes one thing on purpose: `onInput` leaves the previous state alone when the gun is reloading, so a press during reload stays pending (the donor copies the state either way, `character.cpp:510`, and drops the press). It omits the chat and menu freeze, the full-auto branch, the weapon switch, the hook, the ammo regen, the predicted-input path and the client reckoning. The weapon fire delay is a parameter (its data table was not read). Tick speed is not a parameter in the sketch: the tick and delays are in ticks.

```ts
// Licence: zlib-style permissive (donor). Clean-room sketch of the mechanism, not a translation.
export const STATE_MASK = 0x3f; // six-bit wire counter, as the donor's INPUT_STATE_MASK

// Client: the fire counter goes up on every flip of the held state, so presses between two sends are not lost.
export function bumpFire(counter: number, held: boolean): number {
  let v = counter;
  if ((v & 1) !== (held ? 1 : 0)) v++;
  return v & STATE_MASK;
}

// Server: presses are the rising edges (odd states) passed between the last applied state and the new one.
export function countPresses(prev: number, cur: number): { presses: number; releases: number } {
  let i = prev & STATE_MASK;
  const end = cur & STATE_MASK;
  let presses = 0;
  let releases = 0;
  while (i !== end) {
    i = (i + 1) & STATE_MASK;
    if (i & 1) presses++;
    else releases++;
  }
  return { presses, releases };
}

export interface Gun { reload: number; fireDelayTicks: number }
export interface Intake { prev: number; cur: number }

// Packet arrival: fire on arrival if the gun is ready and at least one press is pending.
// Fix (defect in the donor): prev advances only when a shot was considered, so a press that lands while
// the gun is reloading stays pending and fires when the timer ends. The donor copies the state either way.
export function onInput(intake: Intake, newState: number, gun: Gun, fire: (ticks: number) => void): Intake {
  const next: Intake = { prev: intake.prev, cur: newState & STATE_MASK };
  if (gun.reload !== 0) return next; // keep prev: the press is still pending
  if (countPresses(next.prev, next.cur).presses > 0) {
    fire(gun.fireDelayTicks);
    gun.reload = gun.fireDelayTicks;
  }
  next.prev = next.cur;
  return next;
}

// Server tick: count the reload down, otherwise re-check any pending press.
export function onTick(intake: Intake, gun: Gun, fire: (ticks: number) => void): Intake {
  if (gun.reload > 0) {
    gun.reload--;
    return intake;
  }
  return onInput(intake, intake.cur, gun, fire);
}

// Aim: the cursor is an offset from the character, clamped to a max distance (a virtual stick).
// Dynamic camera: min(200 / followFactor + deadzone, maxDynamic). Static: maxStatic.
export function maxAimDistance(dynamic: boolean, followFactor: number, deadzone: number, maxDynamic: number, maxStatic: number): number {
  if (!dynamic) return maxStatic;
  return Math.min(200 / followFactor + deadzone, maxDynamic);
}

export function clampAim(offset: { x: number; y: number }, maxDist: number): { x: number; y: number } {
  const d = Math.hypot(offset.x, offset.y);
  if (d <= maxDist || d === 0) return offset;
  return { x: (offset.x / d) * maxDist, y: (offset.y / d) * maxDist };
}

// Zero aim is never sent as the centre: the client sends (1, 0), the server maps (0, 0) to (0, -1).
export function safeAim(aim: { x: number; y: number }): { x: number; y: number } {
  if (aim.x === 0 && aim.y === 0) return { x: 0, y: -1 };
  return aim;
}

// Send policy: send on any change, otherwise at least once per interval (donor: time_freq() / 25 = 40 ms).
export function shouldSend(changed: boolean, nowMs: number, lastSendMs: number, minIntervalMs = 40): boolean {
  return changed || nowMs - lastSendMs > minIntervalMs;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (`/tmp/IN002-Teeworlds-press-counter.ts`), exit 0.

## 5. Lands in

- TARGET `src/fight/intake.ts` (new, engine): the fire press counter, the server count, fire on arrival, and the reload gate. The client only sends the counter and the aim offset.
- Parity-checklist row 5 (controls/input, intake). The tick and reload are the server-tick sub-line: "server tick: fixed step, input intake, per-tick NPC budget" (row 18 / post-K item 3).
- Reuse tag: rewrite-from-idea (zlib-style permissive; code may be adapted, the sketch is clean-room)
- Brief rule served: rule 1 (one engine; fire is a state change the server verifies) and row 5 (input intake).

## 6. Gaps and risks

- Defect (fix in sketch): a press during the reload window is dropped. `FireWeapon` returns at `character.cpp:249-250` before counting, then `OnDirectInput` copies the state at `:510`. The reload-end check then sees no new press. Fix: `onInput` keeps `prev` while reloading.
- Defect (comment): `controls.cpp:183` says 10 Hz; the code at `:184` sends every 40 ms (25 Hz). Fix: one named constant with its real rate; we set 25 Hz in the data (send interval 40 ms).
- Counter wrap: the counter has 64 states, so more than 32 unseen flips between two applied states is ambiguous. In a short reload this cannot happen; a long pause (a dropped link) could. Fix: a sequence number or a timeout that resets `prev` to `cur`.
- Frankendom gap: the donor fires on the arrival of a packet, which is good for lag, but it trusts the client's aim offset and the client's counter. Our rule is that kills are server-verified; the server must recheck range, line of sight and the aim offset clamp (`clampAim`) on every shot.
- Frankendom gap: there is no lock-on, tap-to-move or virtual pad in this donor. The aim clamp is only the cursor model; the thumb controls for the phone need their own design.
- Gamepad: absolute joystick mode is in `OnCursorMove` (`controls.cpp:217-226`); the SDL joystick layer (`engine/client/input.cpp`) was not read.
- Landscape vs portrait: not found; desktop-only donor.
- Not read: chat and menu freeze beyond line 137, movement core, client reckoning (`character.cpp` 600-625), weapon data table (fire delays), server tick loop.

Reuse tag: rewrite-from-idea
Brief rule served: 1 (one engine; fire counted and verified on the server) and row 5 (input intake)


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
Errors: No false claims found. Verified: ConKeyInputCounter 52-58, OnReset fire release 26-28, send policy and the 10 Hz comment vs time_freq()/25 (controls.cpp 183-184), zero aim -> (1,0) and server (0,-1), ClampMousePos and GetMaxMouseDistance formula, absolute joystick, CountInput 21-31, OnDirectInput order incl m_NumInputs>2 and the copy at the end, FireWeapon reload gate/WillFire/125 ms, reload = Firedelay*TickSpeed/1000, mask 0x3f, tick 50, zlib licence. The reload-drop defect is real: HandleWeapons calls FireWeapon every tick but prev==latest after OnDirectInput copy, so a press during reload is lost for non-full-auto weapons. Acceptance is consistent with the sketch (note only: sketch fires one tick after reload hits 0, same as donor; the test should allow that tick). Not-read list is honest; no touch code exists in donor.
Missed: Full-auto weapons (grenade, shotgun, laser) fire while fire is held (character.cpp 255-266) so the press-drop defect affects only hammer and gun; the note mentions full-auto but not which weapons. Firedelays are in datasrc/content.py (125,125,500,500,800), which the note says not read; a 300 ms reload in the acceptance matches none, fine as a test parameter. Spectator branch of ClampMousePos (different clamp) not mentioned.
