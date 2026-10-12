# TurningWheel-Barony (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/TurningWheel-Barony/src/ui/GameUI.cpp` | Licence: BSD 2-Clause (LICENSE.txt: "This open source release of Barony is licensed under the BSD 2-Clause License", Copyright (c) 2013-2020, Turning Wheel LLC; keep the notice if code is copied) | C++ | symbol `Player::HUD_t::updateHPBar`

Checked: Symbol `Player::HUD_t::updateHPBar` starts at GameUI.cpp 33482. Read 33505-33650: the width, the foreground, the ghost bar and the widths; the death check (33647-33650). Not read: 33482-33504 (layout offsets only). Constants read: GameUI.cpp 108-112 (defaults). Clock: main.cpp 211 (`ticks`), game.cpp 264-274 (`getFPSScale`), game.cpp 5309-5314 (the logic loop; how `numframes` is computed was not read). Candidates opened: GameUI.cpp (HUD bars, enemy bar header, minimap header by grep), init.cpp (string table parser), lang/en.txt (counts and awk passes, not every entry read), LICENSE.txt. Not read: the caller rate of updateHPBar (called at GameUI.cpp 12741), the enemy bar (createEnemyBar 4283; EnemyHPDamageBarHandler from 31729: names only by grep), the minimap (12343, 12683-12685, 13068-13070: names only by grep). Confidence: high on the width and bar logic; moderate on the hold timing, because the logic tick rate and the caller rate were not read. camera_scope: n/a.

## 1. Mechanism

- One update per call for the local player: it takes the current HP and the max HP from the stats, and moves three things: the foreground bar, a lagging "ghost" bar behind it, and a damage flash. Inputs: HP, MAXHP, the logic tick count, and the reference-frame scale (`fpsScale`, from `getFPSScale(144.0)`). Output: pixel widths for the three layers.
- Order of steps, as the code runs:
  (a) Width from max HP (33537-33546). If MAXHP is below 160 (`hpmpbarMaxWidthAmount`), the multiplier is 0.30 (30 percent) plus 0.025 for each full 5 HP of MAXHP above 20; otherwise it is 1.0. The steps are integer division (33545). The progress width is multiplied by the multiplier (33548-33549), and the background and endcap move by the difference (33550-33551).
  (b) Previous and new HP (33554-33558). Losing HP (33559-33568): the foreground snaps to the new HP, the hold timer restarts (33562), and a damage flash starts.
  (c) Max value is set to MAXHP (33575).
  (d) Gaining HP (33577-33595): the foreground moves toward HP by `fpsScale * (gap / 20)` per update (33589), and snaps to HP when within 1 HP (33592-33595).
  (e) Losing HP again, in the same update (33609-33612): the foreground is set to HP.
  (f) Ghost bar (33614-33632): if the ghost is below HP (healed), it jumps to the foreground and the hold timer restarts (33616-33617). If the ghost is above HP (hurt), it waits until more than 30 logic ticks have passed since the hold timer was last set (33621); then it falls by `fpsScale * max(0.01, gap) / 20` per update (33623-33625), never below HP (33626). Otherwise the hold timer restarts (33631).
  (g) Widths (33641-33646): each layer is `max(1, int(progressWidth * value / MAXHP))`.
  (h) Death (33647-33650): when the ghost's width has reached one pixel and HP is 0 or less, the ghost is disabled and faded.
- Clock: `ticks` increases once per game-logic call inside the loop that runs `numframes` times (game.cpp 5309-5314; defined at main.cpp 211). The fall and the gain use `fpsScale`, which is 144 divided by the global `fps` (game.cpp 274; `fps` itself was not read), or 144 divided by the fps limit when the fixed-scale cvar is on (270). So the hold runs on logic ticks and the fall runs on reference frames.

## 2. Key functions

- `Player::HUD_t::updateHPBar`: `/mnt/frankendom-donors/TurningWheel-Barony/src/ui/GameUI.cpp` 33482-33650 (mechanism: 33505-33650). Width, snap, gain, ghost, widths, death.
- Width block (inside it): `/mnt/frankendom-donors/TurningWheel-Barony/src/ui/GameUI.cpp` 33534-33552.
- Ghost block (inside it): `/mnt/frankendom-donors/TurningWheel-Barony/src/ui/GameUI.cpp` 33614-33632.
- Clock: `/mnt/frankendom-donors/TurningWheel-Barony/src/game.cpp` 5309-5314 and 264-274.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant |
|---|---|
| Bar length grows with max HP in steps, full at a threshold | Base 30 percent (`hpmpbarBasePercentSize = 30`, GameUI.cpp 111); 2.5 percent per step (112); step size 5 HP (109); no steps at or below 20 HP (110); full at 160 HP (108) |
| Step count is integer division of (MAXHP - 20) by 5 | Integer division (33545) |
| Foreground snaps down on damage | No constant (the snap, 33559-33568 and 33609-33612) |
| Foreground eases up on heal, snaps within 1 HP | Gap divided by 20 per update (33589); snap at 1.0 (33592) |
| Ghost holds after the last change | 30 logic ticks (33621; literal in the code, not a named constant) |
| Ghost drains | Gap divided by 20 per update, scaled by `fpsScale` (33625); minimum gap 0.01 (33623) |
| Reference frame rate | 144 (33588, 33624 via `getFPSScale(144.0)`) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: the stepped width multiplier, then the loss snap, the gain ease with the 1 HP snap, the ghost catch-up on heal, and the ghost hold and drain. It makes the clock explicit (logic tick count and a reference-frame scale passed in), uses plain numbers where the donor uses real_t, and computes the layer widths in a separate pure function. It omits the damage flash and its timing, the damage text, the pixel layout (the 74 px progress offset and the endcaps), the compact-mode constants, the death check that hides the ghost at one pixel, and the 0.01 floor is kept as the donor has it. It also does not reproduce the donor's duplicate read of the foreground in the loss path (33609-33612), which is the same snap as 33559-33568.

```ts
// Licence: BSD-2-Clause (donor LICENSE.txt, Copyright (c) 2013-2020, Turning Wheel LLC). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface HpBarConfig {
  baseFraction: number;   // width at low max HP (0.30)
  stepFraction: number;   // width added per interval (0.025)
  stepHp: number;         // interval size in max HP (5)
  startHp: number;        // no steps at or below this max HP (20)
  fullAtHp: number;       // full width at and above this max HP (160)
  holdTicks: number;      // ghost waits this many logic ticks after the last change (30)
  fallDivisor: number;    // ghost and gain close 1/20 of the gap per reference frame (20)
  snapHp: number;         // gain snaps to the value within this many HP (1)
}

interface HpBarState {
  shown: number;          // foreground value
  ghost: number;          // lagging value
  lastHitTick: number;    // logic tick of the last change to the hold timer
  lastSetpoint: number;   // HP on the previous update
}

// Width multiplier from max HP: stepped, saturating at fullAtHp.
function widthMultiplier(maxHp: number, c: HpBarConfig): number {
  if (maxHp >= c.fullAtHp) return 1;
  const steps = Math.floor(Math.max(0, maxHp - c.startHp) / c.stepHp);
  return c.baseFraction + c.stepFraction * steps;
}

// One UI update. fpsScale is the reference-frame scale (donor: getFPSScale(144)); tick is the logic tick count.
function stepHpBar(s: HpBarState, hp: number, tick: number, fpsScale: number, c: HpBarConfig): void {
  if (hp < s.lastSetpoint) {                       // losing HP: foreground snaps down, hold restarts
    s.shown = hp;
    s.lastHitTick = tick;
  }
  if (s.shown < hp) {                              // gaining HP: ease up, snap when close
    s.shown = Math.min(hp, s.shown + fpsScale * ((hp - s.shown) / c.fallDivisor));
    if (hp - s.shown <= c.snapHp) s.shown = hp;
  } else if (s.shown > hp) {
    s.shown = hp;
  }

  if (s.ghost < hp) {                              // healed: ghost catches up at once
    s.ghost = s.shown;
    s.lastHitTick = tick;
  } else if (s.ghost > hp) {                       // hurt: ghost holds, then drains
    if (tick - s.lastHitTick > c.holdTicks) {
      const gap = Math.max(0.01, s.ghost - hp);
      s.ghost = Math.max(hp, s.ghost - fpsScale * (gap / c.fallDivisor));
    }
  } else {
    s.lastHitTick = tick;
  }
  s.lastSetpoint = hp;
}

// Pixel width of a bar layer: progress width scaled by the multiplier, then by value over max HP.
function layerPixels(value: number, maxHp: number, progressW: number, mult: number): number {
  return Math.max(1, Math.floor(progressW * mult * (value / maxHp)));
}
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (file /tmp/hu009tc3/hp-bar.ts): exit 0.

## 5. Lands in

- TARGET `src/fight/hud-health.ts` (new client view model: pure functions from HP and max HP to bar state; it writes nothing to the fight). Parity-checklist row 14 (HUD).
- today: not read in the Frankendom repo; this note does not check what exists there.
- Reuse tag: rewrite-from-idea (BSD-2-Clause; code may be adapted with notice kept; this sketch is clean-room)
- Brief rule served: client-only HUD (the HUD reads server HP and never writes to it); one ledger (the ghost is display state only)

## 6. Gaps and risks

- BSD 2-Clause: permissive. The sketch is written from the mechanism, not copied.
- Donor defects, each with its fix (the idea is kept):
  1. Mixed clocks. The hold counts logic ticks (33621), but the fall is scaled by a reference-frame factor (33624-33625). So the hold length in seconds depends on the logic tick rate, and the fall depends on the frame rate. fix: one clock for both (logic ticks, or milliseconds).
  2. The fall never finishes. Each update removes 1/20 of the remaining gap (33625), so the ghost approaches the foreground and never reaches it. The death check relies on the ghost's width reaching one pixel (33647). fix: a time-boxed fall with a minimum step, so it reaches HP at a set time, and an explicit hide on death.
  3. The 30-tick hold is a literal in the function (33621), not a named constant or data field. fix: data field, per the table below.
- Rulings: server-verified kills and one ledger. The ghost and the flash are display state. The HP they show comes from the stats the server sets; nothing here writes back. Frankendom should keep the hold and fall in the view model and never read them in the fight.
- Readability at 375 wide: the donor makes the bar shorter for low max HP (30 percent at 20 HP, full at 160 HP), so the bar length itself grows with progression. Whether Frankendom wants that is a design call, not settled here.
- The donor's enemy bar (createEnemyBar 4283, EnemyHPDamageBarHandler from 31729) is the target frame. It has a damage-lag ghost of its own (names grepped only). Not read, so it is not part of this note.
- The minimap is present (GameUI.cpp 12343, 12683-12685, 13068-13070, a shared frame and a shareminimap cvar): names only by grep, not read.
- String table (hud-ui topic): `lang/en.txt`, 7274 lines, read through the parser and by counts. Grammar, from init.cpp 973-1040: a record is a numeric id, one space, text, and a closing pound sign (the file header says so, en.txt line 2). A record ends at the first pound sign anywhere, so the text cannot contain one; line breaks inside a record are kept as text (992-1006). Comment lines start with a pound sign and blank lines are skipped at the start of a record (1013-1017). The id is read with atoi (1022); zero or negative ids are rejected with a warning (1022-1031). Duplicate ids warn, and the last one wins (1034-1038). The stored text is `std::string` (811), copied after the id and one separator (1038).
  Counts (awk and grep on lang/en.txt, using the parser's rule that a record runs to the next pound sign): 5728 records; 533 records span more than one line; 1526 numbered lines mention DEPRECATED (893 are exactly `DEPRECATED#`; the rest are placeholders such as `DEPRECATED_SPELL_NAME#`); 844 records contain a percent sign; 68 numbered lines have two spaces after the id, so their text starts with a space; no zero-padded ids; no duplicate ids in the file; no backslash in any record. One line starts with a digit inside a record (en.txt 5829, "9 more trials..."); the parser reads it as text, which is correct, and it is not a missing entry.
  Defects in the string table: (a) The record buffer is a fixed 1024-byte stack array (976) and the read loop has no bound on its index (982-989). A record with no pound sign for more than 1023 bytes would overflow it. The longest record in the shipped file is about 302 bytes, so this is latent, not live. fix: bound the index and fail the record. (b) The text starts one byte after the id, so an id written with two spaces keeps a leading space (68 cases); a zero-padded id would shift the text, but there are none. fix: skip all separators after the id. (c) A duplicate id inside one file writes only a log line, and the last one wins (1034-1038). fix: reject duplicates in the data check, not at runtime.
  Language selection: `/lang/%s.txt` (845); the base `en` file loads first when a mod overrides it, and entries are cleared only when the base is forced (reloadLanguage 1059-1067; 966-969). Fonts come from `lang/%s.ttf` with a fallback to `en.ttf` (889-903).
- Callers of updateHPBar were not read, so the update rate is not known.

Reuse tag: rewrite-from-idea (BSD-2-Clause; code may be adapted with notice kept; this sketch is clean-room)
Brief rule served: client-only HUD (the HUD reads server HP and never writes to it).

Best transferable idea: a health bar whose length grows with max HP in steps, with a lagging ghost that holds for a short beat after each hit and then drains, so the size of the last hit reads at a glance.
Decision (proposed): adapt - take the stepped width and the hold-then-drain ghost, with one clock and a fall that finishes; reject nothing in the mechanism. Why: a 375-wide fight HUD needs the last hit and the growth of max HP to read at a glance, and this is a view model that never touches the fight, so it fits row 14.
Acceptance: a character at 20 max HP shows a 30 percent bar and one at 160 max HP shows a full bar; a 10 HP hit leaves the ghost in place for a fixed number of logic ticks and then drains to the new HP in the same time at 60 and at 144 fps; a heal lifts the ghost to the foreground at once; at death the ghost is hidden by an explicit rule, not by reaching one pixel.

Data fields (JSON): width base, step, step size, start, full-at, hold, fall divisor, snap; all engine constants (HUD view model, not zone data).

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN.
- Verified: GameUI.cpp 108-112 constants, width block, loss snap, gain ease, 30-tick ghost hold, drain, death check, getFPSScale, ticks++ loop, init.cpp parser, en.txt line count, DEPRECATED count, BSD-2 licence. No error found.
- Missed: if the previous max HP was larger than the current MAXHP the ghost is snapped to the setpoint (GameUI.cpp ~33570, 'resetting game'); the death fade uses opacity -= 0.5*fpsScale and slides hpFadedBase left. The sketch omits the max-HP-shrink reset.
