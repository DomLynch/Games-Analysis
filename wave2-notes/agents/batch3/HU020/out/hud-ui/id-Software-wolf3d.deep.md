# id-Software-wolf3d (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/id-Software-wolf3d/WOLFSRC/WL_AGENT.C` | Licence: restricted - ID Software Limited Use Software License Agreement (quoted in `/mnt/frankendom-donors/id-Software-wolf3d/README.rst` lines 89-160, read in part: it grants limited use on one computer and reserves copyright; it grants no right to adapt the source) | C (Borland C, DOS) | symbol `DrawFace`

Checked: Symbols `DrawFace` (WL_AGENT.C 270-291, read in full), `UpdateFace` (307-322, read in full), `LatchNumber` (337-361, read in full), `TakeDamage` (body 388-411, read in full), `HealSelf` (read in full), `GivePoints` / `GiveWeapon` / `GiveAmmo` / `GiveKey` (WL_AGENT.C 494-640, read in part: lines 494, 523-530, 628 are receipted). Also `StartDamageFlash` (WL_PLAY.C 1157-1160), `UpdatePaletteShifts` (WL_PLAY.C 1166-1200, read to the red shift; the white shift and the palette write were not read), `CalcTics` (WL_DRAW.C 1231-1266, read in full), `US_RndT` (ID_US_A.ASM 70-96, read in full), `TickBase` (ID_SD.H 17), `MAXTICS` (ID_HEADS.H 108). Callers: `UpdateFace` is called at WL_AGENT.C 1297 and 1401 (the enclosing functions were not read); `DrawFace` is called from `UpdateFace` (321), `TakeDamage` (410), `HealSelf` (442), and WL_GAME.C 890 / 1222 and WL_MENU.C 1398 (not read); `CalcTics` is called at WL_GAME.C 1166 / 1188 and WL_PLAY.C 483 (not read). I checked the callers of the functions I rely on, but I did not read the loops that call them, so the update cadence of the portrait is not confirmed beyond "UpdateFace runs at least once per frame that reaches those calls" (not read). The hint file is the right file for the portrait and the status counters. Camera scope: not applicable (HUD). Minimap, automap, touch, lock-on: none in this donor (grep for minimap, automap, radar, touch, lock across WOLFSRC/*.C and *.H; the only "lock" hits are the memory manager's MM_SetLock). Confidence: high on the portrait bands, the idle timer and the damage tint (read in full); medium on the wording of the per-frame cadence (see above).

Best transferable idea: A health portrait that steps through 7 health bands with 3 idle frames each, swaps idle frames on a random timer, and shows the killer's portrait at zero health, so the HUD tells the player who got them.
Decision (proposed): adapt - keep the bands, the idle swap and the killer portrait as a client module driven by the engine snapshot; change the donor's timer to engine ticks; fix the folded random draw and the godmode tint (see section 6); the random table itself is a replay idea for row 19, not a HUD idea.
Acceptance: At 375 wide the hero card shows 7 health bands; at 0 health it shows the portrait of the killer's kind (needle-class or other); at rest the idle frame changes within 3.7 s (256 ticks at 70 Hz, the donor worst case) and never while a held special is active; a server test asserts that the killing blow's attacker id is stored and that godmode neither reduces health nor starts the red tint.

## 1. Mechanism

- Health portrait. `DrawFace` (WL_AGENT.C 270-291) draws one of the face pictures in the status bar. While health is above zero it picks a band from health and adds an idle frame: `FACE1APIC+3*((100-gamestate.health)/16)+gamestate.faceframe` (279). Band = `(100-health)/16` with integer division, so health 100-85 is band 0, 84-69 is band 1, 68-53 band 2, 52-37 band 3, 36-21 band 4, 20-5 band 5, and 4-1 band 6. Each band has three idle frames (`faceframe` 0-2). At zero health it draws the dead face: the mutant portrait if the last attacker is needle-class (284-285), else FACE8APIC (288).
- Idle timer. `UpdateFace` (307-322) returns while the gatling sound plays (310). Otherwise it adds the tics elapsed to `facecount` (313). When `facecount` exceeds a fresh draw from the 0-255 random table (314), it sets `faceframe = draw>>6` (316, so 0-3), folds 3 into 1 (317), clears `facecount` and redraws (321). So the idle frame changes at random intervals of at most 256 tics (about 3.7 s at 70 Hz), and the frame is weighted: 1 is drawn twice as often as 0 or 2 (the fold).
- Hit order (`TakeDamage`, body 388-411). It sets `LastAttacker` before anything else (388); returns if the victory flag is set; quarters the damage on baby difficulty (392-393); subtracts the damage unless in godmode (395-396); at zero or below clamps health to zero, sets the state to died and records the killer (397-402); starts the damage tint (405); then redraws the health number and the face (409-410). The red tint is started even in godmode (405 is after the godmode test; see section 6).
- Damage tint. `StartDamageFlash` adds the damage to `damagecount` (WL_PLAY.C 1159). Each frame `UpdatePaletteShifts` takes the red step `damagecount/10 + 1` capped at 6 (1190-1192), then drains `damagecount` by the tics elapsed, clamped at zero (1194-1196). So the tint steps up by one per 10 points of recent damage, and it fades by one point per tic.
- Frame time. `CalcTics` (WL_DRAW.C 1231-1266) sets `tics` to the clock difference since the last frame (1249), so the step is variable. It caps a frame at MAXTICS = 10 tics (1262-1265) and drops the excess time from the clock, so a long stall does not cause a catch-up burst. The clock runs at 70 Hz (ID_SD.H 17: "70Hz per tick - used as a base for timer 0").
- Counters. `LatchNumber` (337-361) right-justifies a number in a fixed field: it pads with blank pictures first, then draws the digits; if the number is too wide it draws only its last `width` digits (353). `GivePoints` (523) adds the score and, in a loop from 526, while the score passes `nextextra` it adds `EXTRAPOINTS` (528) and gives an extra life through `GiveExtraMan` (lives are capped at 9, 494). Ammo is capped at 99 (628). Keys are two bits drawn as two icons (`DrawKeys` from 558).

## 2. Key functions

- `DrawFace`: `/mnt/frankendom-donors/id-Software-wolf3d/WOLFSRC/WL_AGENT.C` 270-291. Health band and idle frame; the dead face by killer kind. Receipts: 270, 279, 284, 288.
- `UpdateFace`: `/mnt/frankendom-donors/id-Software-wolf3d/WOLFSRC/WL_AGENT.C` 307-322. Idle timer and the random frame. Receipts: 310, 313, 314, 316, 317.
- `TakeDamage`: `/mnt/frankendom-donors/id-Software-wolf3d/WOLFSRC/WL_AGENT.C` 378-411. Attacker recorded, difficulty scale, health loss, death, tint, redraw. Receipts: 388, 392, 393, 395, 396, 405.
- `StartDamageFlash` and the red step: `/mnt/frankendom-donors/id-Software-wolf3d/WOLFSRC/WL_PLAY.C` 1157-1196. Receipts: 1157, 1159, 1190, 1191, 1194.
- `CalcTics`: `/mnt/frankendom-donors/id-Software-wolf3d/WOLFSRC/WL_DRAW.C` 1231-1266. Variable step with a cap. Receipts: 1249, 1262, 1264.
- `LatchNumber`: `/mnt/frankendom-donors/id-Software-wolf3d/WOLFSRC/WL_AGENT.C` 337-361. Right-justified number field and overflow. Receipt: 353.
- `US_RndT`: `/mnt/frankendom-donors/id-Software-wolf3d/WOLFSRC/ID_US_A.ASM` 70-96. Returns the next entry of a fixed 256-byte table, cursor wrapping at 256 (the table begins at line 19). Receipts: 19, 81.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Health to portrait band: integer division of the lost health by a band width, 3 frames per band | Band width 16 and full health 100 (279): 7 bands. Band 6 is health 1-4 |
| Idle frame changes after a random wait that grows with elapsed ticks | Draw 0-255 (ID_US_A.ASM 19, 81); change when `facecount` exceeds the draw (314); frame = draw>>6, 3 folded to 1 (316-317) |
| Feedback meter that rises with each hit and drains per tick | Red step = 1 + damage/10, capped at 6 (NUMREDSHIFTS 6, WL_PLAY.C 1054; 1190-1191); drain 1 per tic (1194) |
| Variable step with a per-frame cap and dropped excess | Clock 70 Hz (ID_SD.H 17); cap MAXTICS 10 (ID_HEADS.H 108; WL_DRAW.C 1262-1265) |
| Difficulty scales incoming damage by a shift | Baby: damage >> 2, a quarter (392-393) |
| Extra life at score thresholds, with a loop that catches up | EXTRAPOINTS 40000 (WL_DEF.H 72, read by grep; WL_AGENT.C 526-528); lives capped at 9 (494) |
| Fixed-width number field, right-justified | Field widths: health 3 (WL_AGENT.C 372-374), score 6 (510-512), ammo 2 (603-605), lives 1 (478-480), ammo cap 99 (628) |

## 4. TypeScript sketch

simplified: the sketch keeps the order of the donor's portrait code (band, then frame; dead face by killer; idle timer gated by the hold; hit order: attacker recorded before the godmode test; tint read before the drain). It omits the victory-flag return, the playstate and death handling, the SPEAR-only "Bj ouch" face, the gatling hold's sound lookup (the caller passes `holdIdle`), the palette write and the white shift, the FACE picture indices (the sketch returns band and frame, not picture numbers), the status-bar drawing, and the score, lives, keys and ammo counters. Fixes in the sketch: the idle frame is drawn modulo 3 (uniform apart from 256 mod 3), and the tint in godmode is not part of the sketch's `addDamage` path (the caller must skip it). Table length is assumed to be 256.

```ts
// Licence: restricted (ID Software Limited Use Software License Agreement, README.rst line 89). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const TICK_HZ = 70;   // one tic = 1/70 s
const MAX_TICS = 10;  // a frame never advances more than this many tics; the excess time is dropped

// Health portrait: 7 health bands, 3 idle frames per band, and a dead face that depends on the killer.
type KillerKind = 'needle' | 'other';
type Portrait =
  | { kind: 'alive'; band: number; frame: number }
  | { kind: 'dead'; killer: KillerKind };

interface PortraitState { health: number; frame: number; sinceChange: number; killer: KillerKind; }

// Band from health: (100 - health) / 16 with integer division. Health 1..100 gives band 0..6 (0 = 85..100, 6 = 1..4).
function healthBand(health: number): number {
  return Math.floor((100 - health) / 16);
}

function portraitFor(s: PortraitState): Portrait {
  if (s.health <= 0) return { kind: 'dead', killer: s.killer };
  return { kind: 'alive', band: healthBand(s.health), frame: s.frame };
}

// Fixed 256-entry tape: the donor draws its random values from a table, so the sequence repeats and a replay can match it.
function tapeReader(table: readonly number[]): () => number {
  let i = 0;
  return () => {
    const v = table[i];
    i = (i + 1) & 255;
    return v;
  };
}

// Once per frame. The idle frame changes when the tics since the last change exceed a fresh draw.
// Fix: the donor folds a draw of 3 into frame 1, so frame 1 is twice as likely; here the draw is taken modulo 3.
function idleTick(s: PortraitState, tics: number, tape: () => number, holdIdle: boolean): boolean {
  if (holdIdle) return false; // donor: no idle change while the gatling sound plays
  s.sinceChange += tics;
  if (s.sinceChange <= tape()) return false;
  s.frame = tape() % 3;
  s.sinceChange = 0;
  return true;
}

// A hit. The attacker is recorded before the godmode check (donor order); baby difficulty quarters the damage.
function takeHit(s: PortraitState, points: number, attacker: KillerKind, godmode: boolean, baby: boolean): void {
  s.killer = attacker;
  const dmg = baby ? points >> 2 : points;
  if (!godmode) s.health -= dmg;
  if (s.health < 0) s.health = 0;
}

// Damage tint: the meter rises by each hit and drains by the tics elapsed. The red step is 1 + count/10, capped at 6.
interface TintState { damageCount: number; }
const MAX_RED_STEP = 6;

function addDamage(t: TintState, points: number): void {
  t.damageCount += points;
}

// Read the step first, then drain (donor order), so the frame that takes the hit shows its full step.
function tintStep(t: TintState, tics: number): number {
  const step = t.damageCount > 0 ? Math.min(MAX_RED_STEP, Math.floor(t.damageCount / 10) + 1) : 0;
  t.damageCount = Math.max(0, t.damageCount - tics);
  return step;
}
```

## 5. Lands in

- TARGET `src/fight/hud-portrait.ts` (new client module: the portrait, the idle timer and the tint, all client-only, fed by the engine snapshot and the server-verified hit event). Parity-checklist row 14 (HUD).
- Reuse tag: rewrite-from-idea (restricted licence; clean-room only)
- Brief rule served: 8 (sections 5 and 6 against the rulings: client-only HUD, one ledger, server-verified hits)

## 6. Gaps and risks

- Attacker before the godmode test. The donor records the killer on every hit, including hits that do no damage (388 before 395). That is right for a killer portrait. Frankendom must take the attacker from the server-verified hit, not from a local guess, and it must reach zero health through the same ledger.
- Tint in godmode (defect, keep the idea): `StartDamageFlash (points)` at 405 runs after the godmode test, so an invulnerable player still sees the red flash. Fix: skip the tint when the hit does no health damage (the sketch's `addDamage` must not be called in that case). Same rule as the Quake 2 armour plate (row 14 note there).
- Folded random draw (defect): 3 becomes 1 (317), so frame 1 is twice as likely. Fix: draw modulo 3 (the sketch does; 256 mod 3 leaves a tiny bias, which is acceptable for a flicker).
- Overflow in the number field (defect, keep the idea): `LatchNumber` draws only the low digits when the value is too wide (353). In the six-wide score field, 1000000 shows as 000000. Fix: clamp to all 9s and show the overflow as full, the same fix as in the Quake 2 note.
- The idle timer relies on UpdateFace being called every frame; the callers (WL_AGENT.C 1297, 1401) were not read. Frankendom must drive the idle timer from its own tick and test the interval.
- The random table is a fixed, repeating 256-entry tape (ID_US_A.ASM 19). That is good for replay determinism. It belongs to fight record / replay (row 19), not to this HUD note. Do not use it for gameplay randomness without thinking about it.
- Frame time: CalcTics caps a frame at 10 tics and drops the excess (WL_DRAW.C 1262-1265). That is the right idea for a browser: a backgrounded tab must not replay ten seconds of portrait and tint decay at once. Keep it as the rule for the client timer (row 14), not as a server step (row 18 covers the server tick).
- The SPEAR-only "Bj ouch" face (`#ifdef SPEAR`, WL_AGENT.C near 405-412) and the needle-only dead face (`#ifndef SPEAR`, 284) differ by build. Frankendom should pick one set of portraits and test each state.
- Coverage fold-ins (hud-ui), from this donor. Minimap and automap: none. Touch UX: none (DOS keyboard, mouse and joystick: ID_IN.C, not read beyond the grep). Input buffer and lock-on forgiveness: none; no lock-on, no aim assist was found by grep. Accessibility: not searched. Localisation: see below. Death and respawn: the death face (FACE8APIC, 288) and the needle portrait (284) are the death presentation; the respawn or restart presentation was not read. Readability at 375: the status bar is 40 of 200 screen lines (`STATUSLINES` 40, WL_DEF.H 129; `(200-STATUSLINES)` at WL_AGENT.C 255), so the HUD takes one fifth of the screen height at 200 lines.
- Localisation and string tables. `WL_DEF.H` line 13 includes `SPANISH.H` unconditionally, and `SPANVER.H` defines `SPANISH`. So the built string table is the Spanish one: 79 `#define` entries (SPANISH.H; `FOREIGN.H` has the same 79 names, checked by comparing the name lists). 75 of the names start with `STR_`; the first lines of the file also define QUITSUR, CURGAME, GAMESVD and ENDGAMESTR. `FOREIGN.H` holds the same names in English (QUITSUR begins "Are you sure you want"), and no file in the tree includes it (checked by grep for include lines). Grammar: each entry is a C macro; a dialogue is several string literals joined by a backslash line-continuation, with `\n` for the line breaks, hard-wrapped by hand. The build includes SPANISH.H unconditionally (WL_DEF.H 13), so switching language means editing that include. `#ifdef SPANISH` blocks in WL_INTER.C, WL_MAIN.C and WL_MENU.C select other code paths; what those blocks change was not read. There is no locale file, no plural rule and no variable substitution in these tables.

Reuse tag: rewrite-from-idea (restricted licence; clean-room only)
Brief rule served: 8 (sections 5 and 6 against the rulings)
