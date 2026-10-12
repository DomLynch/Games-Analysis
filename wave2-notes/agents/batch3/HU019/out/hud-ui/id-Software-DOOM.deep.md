# id-Software-DOOM (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/id-Software-DOOM/linuxdoom-1.10/st_stuff.c` | Licence: st_stuff.c header says "This source is available for distribution and/or modification only under the terms of the DOOM Source Code License as published by id Software. All rights reserved."; the tree's LICENSE.TXT is GPL v2 text. The two statements conflict, so this is treated as restricted: clean-room, shape only | C | symbol `ST_updateFaceWidget`

Checked: Read in full: st_stuff.c 72-130 (constants) and 729-922 (ST_calcPainOffset and ST_updateFaceWidget), 988-996 (ST_Ticker). Read in part: p_inter.c 835-880 (immunity gate, attacker, damage flash); p_user.c 182-229 (P_DeathThink) and 350-358 (living-player flash decay); m_random.c 52-70; d_main.c 374-392 and d_net.c 736-748 (the tic loop); doomdef.h 122. Not read: the face drawing (the multi-icon widget and the status-bar drawer) and the armour split inside P_DamageMobj. Callers: ST_Ticker has one call site (g_game.c 731, found by grep); G_Ticker is called from d_main.c 383 and d_net.c 745 (grep). Confidence: high on the face ladder and its constants (whole function read); medium on the caller list (grep only). camera_scope: not applicable (hud cell). Seen, not read: am_map.c (automap, the minimap/world-map candidate, 1349 lines), p_map.c P_AimLineAttack (vertical auto-aim, the lock-on candidate), dstrings.h, d_englsh.h, d_french.h (string tables, see section 6).

## 1. Mechanism

- The status-bar face is a portrait chosen from 42 frames (defines at st_stuff.c 97-115: 5 pain levels x 8 frames, plus a god face and a dead face). Each pain level has 3 straight-ahead looks, 2 turn frames, an ouch frame, an evil grin and a rampage frame.
- Pain level: `((100 - hp) * 5) / 101`, with hp clamped to 100 first (st_stuff.c 735 and 739). Integer division. Bands by hp: 80-100 = level 0, 60-79 = 1, 40-59 = 2, 20-39 = 3, 0-19 = 4 (worked by hand at the edges 80/79, 60/59, 40/39, 20/19, 0).
- The face is chosen once per game tic. ST_Ticker runs ST_updateWidgets, which calls ST_updateFaceWidget (st_stuff.c 988-994, 962). The ladder is checked top to bottom. Each branch runs only if the current priority is below its gate, so a higher-priority face is not overwritten:
  1. Dead (gate priority < 10): hp 0 sets the dead face with a timer of 1 and priority 9. It is re-set every tic while the player is dead (767-768).
  2. Evil grin (gate < 9): a bonus pickup that changed the owned-weapon set sets the grin face, priority 8, timer 70 (2 s) (790-791).
  3. Attacked (gate < 8): needs a damage flash, a source, and a source that is not the player (800-802). Priority 7. The donor shows the ouch face when `plyr->health - st_oldhealth > ST_MUCHPAIN` (807). As written, that is a gain of more than 20 hp, not a loss; the intended test is a loss (see section 6, defect 1). Otherwise the face is chosen by bearing to the source: under 45 degrees (ANG45) is head-on and shows the rampage face; to the right shows turn-right; to the left shows turn-left. Timer 35 (809, 833-849).
  4. Self-hurt (gate < 7): a damage flash with no outside source (for example a fall). Same sign test at 860. Else priority 6 with the rampage face, timer 35 (855-872).
  5. Rapid fire (gate < 6): while fire is held, the first held tic sets a countdown to 70 (883). Each later held tic decrements it (884). At zero the rampage face shows, priority 5, and the countdown is reset to 1, so it keeps re-firing each tic while fire is held. Releasing fire resets the countdown to -1 (877-895).
  6. God or invulnerable (gate < 5): god face, priority 4, timer 1 (897-906).
  7. Idle (timer at 0, line 913): one of three look frames, chosen as `pain level + (cosmetic random % 3)`, priority reset to 0, timer 17 (`TICRATE/2`) (915-918).
  Then the timer drops by one each tic (920).
- What reaches the face: P_DamageMobj returns early for damage under 1000 when god mode or invulnerability is on (p_inter.c 846-852). Otherwise it stores the attacker and adds the damage to `damagecount`, capped at 100 (874-877). The flash decays one per tic in P_PlayerThink (p_user.c 356). In P_DeathThink the dead player's view turns toward the killer by a fixed step per tic, and the flash only decays while the view faces the killer (p_user.c 196-216). That second behaviour is for the corpse view, not the living HUD.
- Tick: ST_Ticker runs once per game tic, inside G_Ticker. TryRunTics (d_main.c 389) runs as many game tics as the clock owes. Durations are counted in game tics at TICRATE 35 (doomdef.h 122).

## 2. Key functions

- `ST_updateFaceWidget`: `/mnt/frankendom-donors/id-Software-DOOM/linuxdoom-1.10/st_stuff.c` 752-922. The whole priority ladder and the timers.
- `ST_calcPainOffset`: `/mnt/frankendom-donors/id-Software-DOOM/linuxdoom-1.10/st_stuff.c` 729-742. Maps hp to the pain level, cached while hp is unchanged.
- `ST_Ticker`: `/mnt/frankendom-donors/id-Software-DOOM/linuxdoom-1.10/st_stuff.c` 988-996. Draws the cosmetic random, runs the widgets, then saves old hp.
- Damage path: `/mnt/frankendom-donors/id-Software-DOOM/linuxdoom-1.10/p_inter.c` 846-877 (gate, attacker, flash).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Health maps to a small set of pain bands by integer arithmetic | 5 bands from `(100 - hp) * 5 / 101` (st_stuff.c 739) |
| Priority ladder: a face replaces only a lower-priority one, and it holds until its timer ends | Priorities 9, 8, 7, 6, 5, 4, 0 (st_stuff.c 761-913) |
| Timed reaction: hit face held for a fixed time | 35 ticks, `1*TICRATE` (st_stuff.c 122) |
| Big-loss reaction threshold | 20 hp in one tick (st_stuff.c 126) |
| Evil grin after a pickup | 70 ticks, `2*TICRATE` (st_stuff.c 120) |
| Look-around idle face | 17 ticks, `TICRATE/2` (st_stuff.c 121) |
| Hold-to-rampage countdown | 70 ticks, `2*TICRATE` (st_stuff.c 124, 883) |
| Head-on cone for the rampage face | 45 degrees, `ANG45` (st_stuff.c 836; the constant is in tables.h 68, value 0x20000000, read by grep, not receipted: the line has tabs) |
| Damage flash cap | 100 (p_inter.c 877) |
| Idle look variety | 3 frames, `st_randomnumber % 3` (st_stuff.c 915) |

## 4. TypeScript sketch

simplified: keeps the donor order (dead, grin, hit, self-hurt, rapid fire, god, idle look) and its timers and gates. It changes four things: (1) the OUCH test uses `prevHealth - health` (the donor's sign is wrong, lines 807 and 860); (2) OUCH uses its own 35-tick constant (the donor defines ST_OUCHCOUNT and does not use it); (3) the attacker and flash are inputs (`hitBearing`, `flashTicks`), so the donor's `attacker` and `damagecount` fields are not modelled; (4) the pain band is computed at selection time as in the donor, but health is also clamped at zero. It omits the drawing, the armour split, the weapon-ownership diff (replaced by a boolean), the donor's per-tic cosmetic random (passed in as `rnd`), and the donor's `st_oldhealth` bookkeeping (the caller supplies `prevHealth`).

```ts
// Licence: DOOM Source Code License (per the st_stuff.c header). Restricted: clean-room sketch from the described mechanism, not a translation.
// clean-room
export interface FaceInput {
  health: number;            // this tick, hp
  prevHealth: number;        // health at the previous tick
  dead: boolean;
  immune: boolean;           // god mode or invulnerability (engine decides)
  hitBearing: number | null; // degrees, 0 = straight ahead, + = right; set only for a hit that got past immunity
  flashTicks: number;        // damage flash still running
  firing: boolean;           // trigger held
  gainedWeapon: boolean;     // pickup this tick
  rnd: number;               // cosmetic random 0..255, separate stream from gameplay RNG
}

export interface FaceState {
  priority: number;          // 0..9, a face only replaces a face of lower priority
  timer: number;             // ticks left on the current face
  rapidTicks: number;        // -1 = not firing
  face: string;              // frame name
}

export const MUCH_PAIN = 20;     // hp lost in one tick that counts as a big hit
export const TURN_TICKS = 35;    // 1 s at 35 ticks/s
export const OUCH_TICKS = 35;    // fixed: donor defines ST_OUCHCOUNT but uses ST_TURNCOUNT
export const GRIN_TICKS = 70;
export const LOOK_TICKS = 17;    // 35 / 2, integer division
export const RAMPAGE_DELAY = 70; // about 2 s of holding fire

export function painBand(health: number): number {
  const h = Math.min(Math.max(health, 0), 100);
  return Math.floor(((100 - h) * 5) / 101); // 0..4
}

export function stepFace(s: FaceState, i: FaceInput): FaceState {
  let { priority, timer, rapidTicks: rapid, face } = s;
  const band = painBand(i.health);
  const bigLoss = i.prevHealth - i.health > MUCH_PAIN; // fixed sign (donor reads health - old)

  if (priority < 10 && i.dead) { priority = 9; face = 'dead'; timer = 1; }
  if (priority < 9 && i.gainedWeapon) { priority = 8; timer = GRIN_TICKS; face = `grin${band}`; }
  if (priority < 8 && i.flashTicks > 0 && i.hitBearing !== null) {
    priority = 7;
    if (bigLoss) { timer = OUCH_TICKS; face = `ouch${band}`; }
    else {
      timer = TURN_TICKS;
      const b = Math.abs(i.hitBearing);
      face = b < 45 ? `rampage${band}` : i.hitBearing > 0 ? `turnR${band}` : `turnL${band}`;
    }
  }
  if (priority < 7 && i.flashTicks > 0 && i.hitBearing === null) {
    if (bigLoss) { priority = 7; timer = OUCH_TICKS; face = `ouch${band}`; }
    else { priority = 6; timer = TURN_TICKS; face = `rampage${band}`; }
  }
  if (priority < 6) {
    if (i.firing) {
      if (rapid === -1) rapid = RAMPAGE_DELAY;
      else if (--rapid === 0) { priority = 5; face = `rampage${band}`; timer = 1; rapid = 1; }
    } else {
      rapid = -1;
    }
  }
  if (priority < 5 && i.immune) { priority = 4; face = 'god'; timer = 1; }
  if (timer === 0) { priority = 0; face = `look${band}${i.rnd % 3}`; timer = LOOK_TICKS; }
  timer -= 1;
  return { priority, timer, rapidTicks: rapid, face };
}

export {};
```

## 5. Lands in

- TARGET `src/fight/hud-frame.ts` (new pure function, client-only: the HUD reads engine events; the engine never imports it). Parity-checklist row 14 (HUD).
- Reuse tag: rewrite-from-idea (DOOM Source Code License per header; clean-room only)
- Brief rule served: 1 (one engine; the HUD is a client that reads engine events and never writes state)

## 6. Gaps and risks

- Defect 1, sign inverted: st_stuff.c 807 and 860 test `plyr->health - st_oldhealth > ST_MUCHPAIN`. Damage lowers health, so the test is false for a hit and true only for a gain of more than 20 hp while the flash is still running (for example a pickup just after a hit). A big hit never shows the ouch face from damage. fix: `prevHealth - health > MUCH_PAIN` (done in the sketch).
- Defect 2, unused timer: ST_OUCHCOUNT (st_stuff.c 123) is defined and never used; the ouch face uses ST_TURNCOUNT (809, 863). Both are 35 here, so no visible effect today. fix: use OUCH_TICKS for the ouch face, or delete the define (done in the sketch).
- Defect 3, dead constant: ST_FACEPROBABILITY (st_stuff.c 80, value 96) is defined and not referenced in this tree (grep of the source and header files). The look-around now uses a timer, not this chance. fix: delete it, or implement a chance if Dom wants random glances back.
- Gap, many-on-one: the donor keeps one attacker, the last source (p_inter.c 874). Frankendom's MAX_ATTACKERS = 3 means three sources can be active. The bearing needs a rule (most recent hit, or the largest hitter), chosen once and tested.
- Gap, scope: this is one player's portrait. The donor has no enemy or target frame; those are not covered by this note.
- Gap, time units: the donor counts in game tics at 35 per second. Frankendom's server tick rate was not read in this pass. Keep the timers in ms on the client and in server ticks on the server, and do not copy the donor's tick counts into the engine.
- Gap, RNG: the donor uses a separate cosmetic stream (M_Random, m_random.c 65) for the look frames and keeps the gameplay stream apart (P_Random, m_random.c 59). Frankendom should keep the portrait's random on the client, so the server's RNG and any replay record (fight record, parity row 19) are not touched by the HUD.
- Order of operations: the donor runs the attacked branch before the self-hurt branch, and god mode after rapid fire. The sketch keeps that order. Frankendom should keep one order and test it with recorded snapshot sequences.
- Risk, function statics: `priority` and `lastattackdown` are statics in ST_updateFaceWidget and are not reset in the reviewed code. I traced that the dead branch sets the timer to 1 and the idle branch clears priority on the next tic, so the state recovers within a tic. ST_Start and the level-load path were not read in full.
- Fold-in, string table: d_englsh.h has 286 `#define` entries (grep count); d_french.h has 200 (not compared key by key). Keys are grouped by prefix: HUSTR_ (level names), PD_ (locked-door messages), GOT* (pickup lines), and Q*PROMPT with `%s` slots plus a concatenated PRESSYN suffix. Lines are plain text. No plural or gender forms were seen in the lines sampled (grep of `%s`, `%i`, `%d`). Frankendom's use: one keyed table per locale with `%s`-style slots only.
- Fold-in, minimap and lock-on: am_map.c (automap) and p_map.c P_AimLineAttack were seen but not read in this pass. Both are candidates for a later cell.
- Also seen, death presentation: the dead face is held (priority 9 is re-set each tic while hp is 0). The donor shows no flash on death in this file. That is a "hold the loss" choice Frankendom could copy in the portrait, not a rule for the engine.

Best transferable idea: One pure function per tic turns engine events (hit with bearing, big loss, fire held, immune, dead) into one portrait frame by a priority ladder with timers, so the HUD never reads combat state directly.

Decision (proposed): adapt - keep the priority ladder and its timers as a pure client function fed by engine events, drop the 42 sprite frames (use one generic frame set), and fix the sign so a big hit shows the OUCH face. Rejected part: the donor's 42-frame sheet, which costs art for no gain in a browser HUD.
Acceptance: At 375 wide in a duel, a 25 hp hit in one tick shows the OUCH frame for 1 s; a 10 hp hit from the left shows the turn-left frame; holding fire for about 2 s shows the rampage frame; a dead hero holds the dead frame until respawn. A unit test feeds recorded snapshot sequences to `stepFace` and asserts the frame names.

Reuse tag: rewrite-from-idea (DOOM Source Code License per st_stuff.c header; clean-room only)

Brief rule served: 1 (one engine; the HUD is a client reading engine events); fold-ins: string table, death presentation, many-on-one gap.
