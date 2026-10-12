# STJr-SRB2 (input-touch-controls, cell 1)

Donor: `/mnt/frankendom-donors/STJr-SRB2/src/g_game.c` | Licence: GPL-2.0 (`LICENSE` file: "GNU GENERAL PUBLIC LICENSE Version 2, June 1991"; g_game.c line 8: "terms of the GNU General Public License, version 2.") | C | symbol `G_HandleAxisDeadZone`

Checked: Read in full: `G_BasicDeadZoneCalculation` (g_game.c 1021-1039) and `G_HandleAxisDeadZone` (1042-1081). Read the move-stick path in `G_BuildTiccmd` (1101 onward) from the look/turn stick (1215) through the move stick (1295-1321) to the ticcmd write (1595). Callers checked by grep: `G_HandleAxisDeadZone` is called only at 1215 and 1295, both inside `G_BuildTiccmd`; `G_BuildTiccmd` is called from `Local_Maketic` (netcode/tic_command.c 420-429), once for player 1 and once for split player 2. Not read: how the raw axis values are produced (the SDL joystick event code in `src/sdl/i_video.c`, 864-1019), the digital-button deadzone at 932-933 and 1007-1008 (grep only), the aim/look and turn code after 1230, and the Android joystick stubs beyond the two lines cited. Confidence: high on the arithmetic (worked numbers below, integer math followed by hand); medium that the squared scale is a defect and not a chosen response curve, because the function comment says "normalised" and the code multiplies. Camera scope: not a camera topic (n/a).

Best transferable idea: Map a phone stick through a radial deadzone that keeps the stick direction and rescales the length to 0..1, then convert it to a capped per-tic move, with the donor's squared scale removed.
Decision (proposed): adapt — the radial deadzone and per-tic cap are the input math a phone virtual stick needs; the donor's length multiply is a defect (half throw gives about a quarter of the intended move), so keep the shape, fix the scale, and expose any soft curve as a client setting.
Acceptance: A phone stick held at half throw moves at about 43% of full speed (side 21 of 50), where the donor's code would give about 10% (side 5); a stick inside 12.5% of throw does nothing; a server test asserts that any client move is clamped to 50 units per tic before the engine applies it.

## 1. Mechanism

- Sampling: once per local tic, `Local_Maketic(realtics)` polls the OS and events, then calls `G_BuildTiccmd` to turn inputs into one ticcmd (netcode/tic_command.c 420-429; player 1 at 429, player 2 only when split or a bot is in, 430-431).
- Move stick: `G_BuildTiccmd` takes the strafe axis as x and the move axis as y (1291-1294) and sends them through `G_HandleAxisDeadZone` (1295). The look stick takes the same path (1213-1215).
- Inside `G_HandleAxisDeadZone` for analog sticks (`gamepadStyle` false; 1054 onward):
  1. length squared `m2 = x*x + y*y` (1057), length `m = floor(sqrt(m2))` (1061-1062).
  2. "normalised" axes `nx = x*m / 1023` and `ny = y*m / 1023` (1065-1066).
  3. deadzone-adjusted length `dm = G_BasicDeadZoneCalculation(m, deadzone)` (1069).
  4. axes become `x = nx*dm / 1023`, `y = ny*dm / 1023` (1072-1073), then each is clamped to plus or minus 1023 (1076-1079).
- The deadzone function (1021-1039): `jdz = 1023 * deadzone` (1023). If `m` is at or below `jdz`, the output is 0 (1038). Otherwise it caps `m` at 1023 (1031), subtracts `jdz` (1033), and returns `(m - jdz) * 1023 / (1023 - jdz)` (1035). One special case (1027-1028): when deadzone is 100% and the magnitude is 100%, it returns 1023.
- Ticcmd mapping, analog: `side += (x * sidemove[1]) >> 10` (1307) and `forward -= (y * forwardmove[1]) >> 10` (1321), with `sidemove[1] = 50` and `forwardmove[1] = 50` (1094-1095). So full throw is about 49 or 50 units per tic.
- Ticcmd mapping, gamepad or digital style: the axis is read as -1, 0 or 1 and adds the full `sidemove[speed]` or `forwardmove[speed]` (1297-1303, 1311-1318); `speed` is the constant 1 (1109), so the digital move is 50.
- Write-out: `cmd->forwardmove = (SINT8)(cmd->forwardmove + forward);` (1595), and `cmd->sidemove` the same way (1596). The write adds to whatever is already in the cmd, and some side adjustments run just before it (around 1592, not read). Several sources add into the same `side` before the cast: in forced-strafe mode (2D levels, sliding, NiGHTS; 1250-1262) the turn keys add up to 50 and the look stick's x axis adds up to 49 (`>> 10`), and the move stick (1307) adds up to 49 more, so `side` can reach about 148, which wraps in the SINT8 cast (1596). The donor has no clamp before the cast.

## 2. Key functions

- `G_BasicDeadZoneCalculation`: `/mnt/frankendom-donors/STJr-SRB2/src/g_game.c` 1021-1039. Radial deadzone on a length. Its output is 0 to 1023.
- `G_HandleAxisDeadZone`: `/mnt/frankendom-donors/STJr-SRB2/src/g_game.c` 1042-1081. Turns an (x, y) stick into a radially deadzoned (x, y). Analog path only (1054-1080); the gamepad path does nothing here.
- `G_BuildTiccmd`, move stick and ticcmd write: `/mnt/frankendom-donors/STJr-SRB2/src/g_game.c` 1295-1321 and 1595-1596.
- `Local_Maketic`, the per-tic caller: `/mnt/frankendom-donors/STJr-SRB2/src/netcode/tic_command.c` 420-429.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Radial deadzone: a circle of radius dz maps to 0; the rest of the stick range maps to 0..1 | dz = 0.125 for analog sticks (`joy_deadzone`, g_game.c 412); 0.25 for the digital threshold (`joy_digdeadzone`, 413). Fixed-point in the cvar; the value is in 0..1 |
| Per-tic move at full throw | 50 for both side and forward (g_game.c 1094-1095) |
| Axis full range | 1023 (`JOYAXISRANGE`, `src/i_joy.h` 28). The analog move uses `>> 10` (divide by 1024), which the code comments say is "supposed to be" 1023 (1262, 1306) |
| Deadzone edge maps to zero, full throw maps to full | Yes in the donor (1035) |
| Direction kept, length rescaled | Intended by the comment at 1064 ("normalised"), but the code multiplies the axis by the length (1065-1066) instead of dividing (see defect below) |

Worked numbers, computed by hand from the code (integer arithmetic as written):

| Raw stick (x, y) | Length m | Dz length dm | Donor output x | Unit direction x dm (intended) | Donor side (x*50>>10) | Intended side |
|---|---|---|---|---|---|---|
| (511, 0), half throw | 511 | 438 | 109 | 438 | 5 | 21 |
| (1023, 0), full throw | 1023 | 1023 | 1023 | 1023 | 49 | 49 |
| (127, 0), at the deadzone edge | 127 | 0 | 0 | 0 | 0 | 0 |
| (724, 724), diagonal full | 1023 | 1023 | 724 | 724 | 35 | 35 |

Defect (kept the idea, fix below): the donor's output is the intended unit-direction value times (m / 1023)^2 (derived from lines 1065-1072: the length is multiplied in once, then the deadzone length is applied, then the result is divided by 1023 twice, so the length ratio enters squared). At half throw it is about one quarter of the intended value (109 vs 438). At the edge and at full throw the two agree. The function comment says the step is a normalisation, which is a divide by the length. We cannot tell from the code whether the soft low end was chosen. Fix: divide, `x_unit = x * 1023 / m` (guard m = 0), and expose any soft curve as a data field rather than an accident of the arithmetic.

## 4. TypeScript sketch

simplified: float math in -1..1 instead of integers in -1023..1023; no `floor(sqrt)` truncation and no `>> 10`; no clamp (the rescale already caps the length at 1); the gamepad and digital path, the look stick, turn-to-angle, the digital-button deadzone and the SINT8 cast are omitted. The defect is fixed: the sketch divides by the length to get the unit direction, so the donor's squared scale does not appear. The sketch is a function of data (`deadzone`, `maxSide`, `maxForward`), not constants.

```ts
// Licence: GPL-2.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
// Raw stick axes are in -1..1. y > 0 means push forward (the donor's sign is the opposite).

export interface StickConfig {
  deadzone: number;   // radial deadzone, 0..1 (donor default 0.125 for analog; client setting)
  maxSide: number;    // ticcmd sidemove at full deflection (donor: 50)
  maxForward: number; // ticcmd forwardmove at full deflection (donor: 50)
}

export interface Vec2 { x: number; y: number; }

// One radial deadzone pass: the output keeps the stick direction and rescales the length
// so that the edge of the deadzone maps to 0 and full throw maps to 1.
export function radialStick(raw: Vec2, deadzone: number): Vec2 {
  const mag = Math.hypot(raw.x, raw.y);
  if (mag === 0) return { x: 0, y: 0 };
  const dirX = raw.x / mag;
  const dirY = raw.y / mag;
  const len = Math.min(mag, 1);
  const span = 1 - deadzone;
  if (span <= 0) return len >= 1 ? { x: dirX, y: dirY } : { x: 0, y: 0 };
  if (len <= deadzone) return { x: 0, y: 0 };
  const scaled = Math.min((len - deadzone) / span, 1);
  return { x: dirX * scaled, y: dirY * scaled };
}

// One local tic: stick axes become integer ticcmd move values.
export function stickToTicMove(raw: Vec2, cfg: StickConfig): { side: number; forward: number } {
  const s = radialStick(raw, cfg.deadzone);
  return {
    side: Math.trunc(s.x * cfg.maxSide),
    forward: Math.trunc(s.y * cfg.maxForward),
  };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 srb2-radial-stick.ts` on the VPS exits 0.

Worked check from the sketch: `stickToTicMove({x: 0.5, y: 0}, {deadzone: 0.125, maxSide: 50, maxForward: 50})` gives side 21 (0.4286 x 50), and `{x: 0.125, y: 0}` gives 0.

## 5. Lands in

- TARGET `src/fight/input.ts` (new module: the phone stick and the per-tic move; client builds the intent, the engine validates it). Parity-checklist row 5 (controls/input); the per-tic intake sub-line sits under row 18 / post-K item 3 ("server tick: fixed step, input intake, per-tick NPC budget").
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
- Brief rule served: addendum rule 2 (judge the idea, not the genre); Strategy rule 2026-10-10 (keep the idea, fix the defect); one engine: the client builds an intent per tic and the engine owns the result.

## 6. Gaps and risks

- GPL-2.0: clean-room only. The sketch is written from the mechanism.
- The donor has no touch stick. The Android build's joystick functions are empty stubs (`src/android/i_system.c` 146 and 246), so the phone virtual stick is our work. This donor gives only the analog radial math and the per-tic cap.
- The defect (above): the donor's length scale is squared. Fix in the sketch: divide by the length. Do not inherit the soft low end silently; if the team wants one, make it an explicit client setting (a curve exponent, default 1) and test the feel on a phone.
- Server-verified: no check on the move appears in the code read here, and the receive side of the ticcmd was not read. Frankendom must validate the move on the server: clamp each tic to `maxSide` and `maxForward` (50 here) and reject larger values. The donor's SINT8 cast (1595-1596) is only a byte limit, not a game rule, and it wraps instead of clamping when several sources stack (see section 1), so the server clamp is needed for correct clients too: the sketch sums all sources and clamps once.
- Client-only camera and HUD: the stick's look half (1213-1215) is a camera control and stays client-side per the rulings, except that in forced-strafe mode its x axis is also added to `side` (1258-1262), so it is a second move contribution there.
- Landscape vs portrait, the phone layout and the touch hit areas are not in this donor (not read).
- Lock-on, gesture specials and input buffering: not in this cell. Lock-on target search is in `P_LookForFocusTarget` (`src/p_user.c` 9251), not read here.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: Verified OK: G_BasicDeadZoneCalculation 1021-1039 and G_HandleAxisDeadZone 1042-1081 as described; the squared-length defect is real (output = dir*dm*(m/1023)^2); worked table numbers reproduce (511->109 -> side 5; diagonal 724 -> 35; full throw 1023*50>>10 = 49); sidemove/forwardmove 50 at g_game.c 1094-1095; speed=1 at 1109; cv_deadzone 0.125 and digdeadzone 0.25 at 412-413; JOYAXISRANGE 1023 i_joy.h:28; GPL-2 LICENSE and g_game.c header; Local_Maketic 420-429; P_LookForFocusTarget p_user.c:9251; Android stubs empty. ERRORS: (1) 'Each stick source adds at most 50 per tic, so the sum stays well inside a signed byte' is not safe: keyboard/button (+50), analog move stick (+49) and the look stick's strafe-as-turn path (g_game.c 1258-1262 adds lookjoystickvector.xaxis*sidemove[1]>>10 to `side`) all add into the same `side` before the (SINT8) cast at 1595-1596, so 50+49+49 = 148 wraps in the donor. This is exactly why a server clamp is needed and the note understates it. (2) JOYAXISRANGE comment cite '1262, 1306' ok. Acceptance (half throw = side 21, deadzone 12.5% = 0, clamp 50) is consistent with the sketch (0.4286*50 trunc 21); no fail-own-test problem found.
Missed: Look stick strafe path (g_game.c 1258-1262) also feeds `side` - a second analog contribution that the note calls camera-only. Digital/gamepad-style path uses threshold cv_digitaldeadzone (not read, admitted).

Fixed 2026-10-12 (Sonnet fixer, g_game.c 1205-1262 and 1585-1600 read over ssh): corrected the claim that the sum stays inside a signed byte (it can reach about 148 and wraps at the cast); noted that the look stick also feeds `side` in forced-strafe mode; strengthened the server-clamp reason. Acceptance and sketch unchanged (they were consistent).
