# angband-angband (vfx-blood-finishers, cell 13)

Donor: `/mnt/frankendom-donors/angband-angband/src/game-world.c` | Licence: GNU GPL v2 (option a) or the "Angband licence" (option b), user's choice, as read in the game-world.c header lines 10-13 | C | symbol `process_world`

Checked: Read on the VPS. Read in full: the bleed block in `process_world` (game-world.c 522-539), its call to `decrease_timeouts` (651), the CUT case of `decrease_timeouts` (280-313), the blow loop's cut block (mon-attack.c 571-692, including the hit gate at 589-590), `monster_critical` (497-522), `player_timed_grade_eq` (player-timed.c 734-745) and `player_inc_timed` (1050-1067). Read in part: `player_regen_hp` (player-util.c 436; only the cut line at 470), the over-exertion site (player-util.c 855-857), the spell cut lines (project-player.c 346 and 478), the grade table (player_timed.txt 255-266). Not read: `player_inc_check` (what the `fail:4:ROCK` data line does), `take_hit` and the death path, the blow-method table (which methods set `cut:1`), the potion cures, and the rest of the decay loop after line 340. Confidence: high for the order of operations and the numbers in game-world.c and mon-attack.c; medium for "every source of a wound". camera_scope: not applicable (not a camera topic). Visual check: a grep of `src` for splatter, gore, particle or decal (outside tests and borg) returns zero hits, so this donor has no blood, decal or particle code to copy. Only the wound state is real.

## 1. Mechanism

Wounds are one timed status, `TMD_CUT` (desc "wounds"). Its value is a pool of points. The named grade (Graze up to Mortal Wound) is read from the pool (grade table: Graze to 10, Light Cut to 25, Bad Cut to 50, Nasty Cut to 100, Severe Cut to 200, Deep Gash to 1000, Mortal Wound to 10000; player_timed.txt 257-263; lookup at player-timed.c 738). Three things happen to the pool.

- Adding points (monster blow, order of steps as the code runs). (a) The damage is rolled at 619, the blow's effect handler is looked up at 627 and run after it, and the handler's result is read back into `damage`. (b) If the player is dead, no cut (654-657). (c) If the blow would both cut and stun, one 50% roll (662) cancels the cut; otherwise the stun is cancelled. (d) Tier: `monster_critical` is called with the post-handler damage (673). It returns 0 unless the damage is at least 95% of the blow's largest possible roll (503, using `MAXIMISE` at 500). Below 20 damage, a 0-99 roll must be below the damage or the tier is 0 (506). Tier base is 1 (damage up to 11), 2 (over 11), 3 (over 18), 4 (over 25), 5 (over 33), 6 (over 45) (516-521 read; the 517-518 bands are read in the grep output). A perfect roll (damage equal to the maximum) adds 1 tier (509), and at 20 damage or more each extra tier has a 2% chance (512-513). (e) Amount by tier (678-684): tier 1 is 1 to 5 points; tier 2 is 6 to 10; tier 3 is 21 to 40; tier 4 is 51 to 100; tier 5 is 101 to 200; tier 6 is 300; tier 7 and up is 500. (f) Points are added with `player_inc_timed` (689-690).
- Other sources of points (all add the same pool). Shard projection adds `randint1(dam)` (project-player.c 346). Ice projection adds `damroll(5, 8)` when the target does not resist shard (478). Over-exertion with the PY_EXERT_CUT flag adds `randint1(amount)` at a chance, with the message "Wounds appear on your body!" (player-util.c 855-857). The bloodlust side effect passes PY_EXERT_CUT (game-world.c 546).
- Bleeding (every 10 game turns). `process_world` is called when `turn % 10` is zero (game-world.c 1075-1076). While CUT is set, in this order: (a) damage is 0 for Rock-trait players (524-525), 3 for Mortal Wound or Deep Gash (527-529), 2 for Severe Cut (530-531), and 1 for every other grade (532-533). The damage goes through `player_apply_damage_reduction` (537) and the death cause is "a fatal wound" (538). (b) Later in the same call, `decrease_timeouts` runs (651). In its CUT case, the decrement is `adjust = 1 + adj_con_fix[CON]` (282, 306), except that a Mortal Wound decrements by 0 (303-304) and a Rock-trait player decrements by 0 (310-311).
- Regeneration. While CUT is set the regen percent is 0 (player-util.c 470), so a wounded player does not heal naturally. Other timed effects decrement by 1 by default (285).

Over-exertion from bloodlust is a separate mechanic and is noted in section 6.

## 2. Key functions

- `process_world`: `/mnt/frankendom-donors/angband-angband/src/game-world.c` 457-. The bleed block is 522-539; the decay call is 651. Called from the run loop at 1075-1076 when `turn % 10` is zero.
- `decrease_timeouts`: `/mnt/frankendom-donors/angband-angband/src/game-world.c` 280-. The CUT case is 300-313 (Mortal Wound decay 0 at 303-304; Rock 0 at 310-311). Default decrement 1 at 285.
- `monster_critical`: `/mnt/frankendom-donors/angband-angband/src/mon-attack.c` 497-522. The tier from the 95% test, the small-hit roll, the perfect roll and the 2% super-charge.
- Blow cut block: `/mnt/frankendom-donors/angband-angband/src/mon-attack.c` 571-692. Hit gate 589-590; cut flag 612; stun/cut exclusion 659-668; tier and amount 671-692.
- `player_regen_hp`: `/mnt/frankendom-donors/angband-angband/src/player-util.c` 436-; the cut line is 470.
- `player_timed_grade_eq` and `player_inc_timed`: `/mnt/frankendom-donors/angband-angband/src/player-timed.c` 734-745 and 1050-1067.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Wound is a pool of points; the grade is read from the pool | Thresholds 10, 25, 50, 100, 200, 1000, 10000 (player_timed.txt 257-263) |
| Bleed per step set by severity grade | 1, 1, 1, 1, 2, 3, 3 for Graze to Mortal Wound (game-world.c 527-533; the value lines are under 15 characters, so the receipts are the branch lines 527 and 530) |
| Bleed step cadence | Every 10 game turns (game-world.c 1075) |
| Decay per step = 1 + CON fix; Mortal Wound does not decay | `adj_con_fix` is 0 for CON 3-13, 1 for 14-17, 2 for 18/00-18/49 (player-calcs.c 686-; rest of table not read) |
| Critical needs 95% of the blow's maximum | 19 of 20 (mon-attack.c 503) |
| Small hits need a roll | Damage under 20; roll 0-99 must be below damage (506) |
| Tier bands on damage | Over 11, 18, 25, 33, 45 (516-521) |
| Perfect roll and super-charge | +1 tier on a perfect roll (509); 2% per extra tier at 20+ (513) |
| Tier amounts | 1d5; 1d5+5; 1d20+20; 1d50+50; 1d100+100; 300; 500 (678-684) |
| Stun and cut from one blow | 50% cancels the cut (662) |
| Spell-sourced wounds | Shard randint1(dam) (project-player.c 346); ice 5d8 (478) |
| Regen while wounded | 0 (player-util.c 470) |
| Death text for bleed | "a fatal wound" (game-world.c 538) |

## 4. TypeScript sketch

simplified: The sketch keeps the donor order for one landed blow (cut flag, then tier, then points) and for one world step (bleed first, then decay), as `process_world` does. It omits: `player_apply_damage_reduction`; the death path and its text; the stun-or-cut 50% exclusion (the sketch takes one cut flag, so a blow that would also stun is not modelled); the spell and over-exertion sources; the grade messages; the effect-handler damage (the sketch takes the final damage as input); and the real regen formula (the sketch returns 0 or the base percent only). It clamps the grade lookup at Mortal Wound, where the donor walks past its last grade. Random numbers are injected. The Rock exemption is kept where the donor has it (bleed and decay only, not at the point of adding points).

```ts
// Licence: GPL-2 or the Angband licence, at the user's choice (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

// Grade upper bounds, in wound points (donor data: player_timed.txt 257-263).
const GRADE_MAX = [10, 25, 50, 100, 200, 1000, 10000];
// Bleed per world step by grade: Graze..Nasty 1, Severe 2, Deep Gash and Mortal Wound 3 (game-world.c 527-533).
const GRADE_TICK_DAMAGE = [1, 1, 1, 1, 2, 3, 3];
const MORTAL = GRADE_MAX.length - 1;

function gradeOf(points: number): number {
  let g = 0;
  while (g < MORTAL && points > GRADE_MAX[g]) g++; // simplified: clamped at Mortal Wound
  return g;
}

interface Fighter {
  hp: number;
  wound: number;      // wound points (donor TMD_CUT value)
  conAdjust: number;  // decay per step = 1 + CON fix value
  rock: boolean;      // immune to bleed and decay (donor PF_ROCK branch)
}

// Critical tier of one landed blow. maxRoll = the blow's largest possible damage.
function critTier(maxRoll: number, damage: number, rand100: () => number): number {
  if (damage < Math.floor((maxRoll * 19) / 20)) return 0;   // must reach 95% of max
  if (damage < 20 && rand100() >= damage) return 0;         // small hits rarely count
  let extra = damage === maxRoll ? 1 : 0;                   // perfect roll
  if (damage >= 20) while (rand100() < 2) extra++;          // 2% per extra tier
  if (damage > 45) return 6 + extra;
  if (damage > 33) return 5 + extra;
  if (damage > 25) return 4 + extra;
  if (damage > 18) return 3 + extra;
  if (damage > 11) return 2 + extra;
  return 1 + extra;
}

// Wound points added for a tier. rand(n) returns 1..n. Creature data in Frankendom.
function tierPoints(tier: number, rand: (n: number) => number): number {
  switch (tier) {
    case 0: return 0;
    case 1: return rand(5);
    case 2: return rand(5) + 5;
    case 3: return rand(20) + 20;
    case 4: return rand(50) + 50;
    case 5: return rand(100) + 100;
    case 6: return 300;
    default: return 500;
  }
}

// Called once per landed blow of a blow method that carries a cut flag.
function onBlowLanded(
  f: Fighter, cutFlag: boolean, maxRoll: number, damage: number,
  rand100: () => number, rand: (n: number) => number,
): void {
  if (!cutFlag) return;
  f.wound += tierPoints(critTier(maxRoll, damage, rand100), rand);
}

// One world step (donor: every 10 game turns). Bleed first, then decay, as in process_world.
function woundStep(f: Fighter): number {
  if (f.wound <= 0) return 0;
  const g = gradeOf(f.wound);
  const dmg = f.rock ? 0 : GRADE_TICK_DAMAGE[g];
  f.hp -= dmg;
  if (!f.rock && g !== MORTAL) f.wound = Math.max(0, f.wound - f.conAdjust);
  return dmg;
}

// Natural regeneration is switched off while any wound is open.
function regenPercent(f: Fighter, basePercent: number): number {
  return f.wound > 0 ? 0 : basePercent;
}
```

## 5. Lands in

- TARGET `src/fight/wounds.ts` (new engine module). The wound pool is fighter state next to HP, written only by the server tick, so kills stay server-verified and there is one ledger. The client reads the grade and draws a tint and a drip decal; it never writes the pool. Parity-checklist row 8 (blood/wounds/decals).
- Reuse tag: rewrite-from-idea (GPL-2 or Angband licence; clean-room only)
- Brief rule served: 1 (one engine: wound state lives in src/fight, clients only draw it)

## 6. Gaps and risks

- Clean-room only. The sketch is written from the mechanism, and no donor lines are copied.
- Units. The donor's step is 10 game turns, not seconds. Frankendom must express the step as a server tick count held as data. A wall-clock timer would break the fixed-step rule.
- Scale and cure. The pool runs to 10000 and a Mortal Wound never decays. Without a cure rule or a cap, a mortal wound lasts the whole fight and beyond. The donor's cure path (potions, not read) is the answer to check before any Pit or zone use.
- Regen block. Any open wound stops all regeneration. With MAX_ATTACKERS = 3, a fighter cut in one round could not heal before the next. Make the regen block a data flag, not a constant.
- Stacking. The donor applies one blow at a time to one player. Several wounded enemies bleeding at once, or three attackers landing cuts in one round, is not tested in the donor.
- Death record. The donor's death cause string is "a fatal wound" (game-world.c 538). Frankendom's fight record (row 19) should store the cause the same way. Only the string was read.
- Rock trait. The immunity is a race or class trait in the donor. Frankendom has no race trait; if reused it must be a gear or class flag from data.
- Visual. No blood, decal or particle code exists in this donor (grep: zero hits). Every visual part in Frankendom is new work; only the state is copied.
- Not written as a note: the bloodlust mechanic was also read. A kill adds 10 to bloodlust (mon-util.c 1114-1115). Damage gets +bloodlust/2 and blows get +bloodlust/20 (player-calcs.c 2208-2209). Bloodlust decrements by the default 1 per step (game-world.c 285-287). Over-exertion side effects grow as the value falls under 10 (game-world.c 544-549). This is a candidate for a separate finisher-rage note.

Best transferable idea: A landed hit that reaches 95% of its maximum roll adds a graded, decaying wound pool that blocks regeneration, and the grade (not the raw number) decides what the player sees.

Decision (proposed): adapt. Take the graded pool, the severity-by-grade bleed and the regen block as an engine status on the fighter, with every number as data. Do not take the donor's scale (up to 10000 points) or its non-decaying Mortal Wound as they are. Why: a visible, graded wound that stops regen rewards a clean finisher without adding a new combat number, and it fits one ledger; but the donor's numbers would end a three-minute duel unless we cap the pool and add a cure rule.

Acceptance: A server test: a 20-damage blow on a 20-maximum blow (a perfect roll) with a cut flag adds a tier-4 wound of 51 to 100 points plus any super-charge tiers; a 10-damage blow on the same blow adds nothing; a wounded fighter loses 1 HP per step at Graze grade and gets no natural regen while the pool is above zero. On the hero at 375 px wide, the tint changes when the grade changes from Graze to Severe Cut.

Reuse tag: rewrite-from-idea (GPL-2 or Angband licence; clean-room only)
Brief rule served: 1 (one engine: wound state lives in src/fight, clients only draw it)
