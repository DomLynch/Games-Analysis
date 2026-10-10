# id-Software-Quake-2 (ai-aggro, cell 3)

Donor: `/mnt/frankendom-donors/id-Software-Quake-2/game/g_ai.c` | Licence: GPL version 2 or any later version (as read: g_ai.c header lines 6-7, "either version 2 of the License, or (at your option) any later version"; readme.txt line 6 "The code is all licensed under the terms of the GPL (gnu public license)"; the data files are separately copyrighted per readme.txt line 19) | C | symbols `FindTarget`, `ai_checkattack`, `M_CheckAttack`, `ai_run`, `FoundTarget`, `HuntTarget`

Checked: Read in full: `AI_SetSightClient` (g_ai.c 50-80), `ai_stand` (106-153), `range` (264-278), `visible` (287-302), `infront` (312-326), `HuntTarget` (331-345), `FoundTarget` (347-387), `FindTarget` (407-583), `FacingIdeal` (594-602), `M_CheckAttack` (607-693), `ai_checkattack` (771-904), `ai_run` (914-1060, the pursuit branch; the corrective-trace tail after 1060 was not read). Also read: g_local.h defines for FRAMETIME (73), MELEE_DISTANCE (80) and RANGE_* (117-120) (these lines are tab-separated, so they are cited by number only); g_monster.c `AttackFinished` (135-138) and `monster_think` scheduling (419-421, 666-667); g_main.c line 362; readme.txt lines 1-20. Not read: `p_trail.c` (PlayerTrail_PickFirst and PickNext, used by the pursuit), `M_MoveToGoal` (m_move.c 515), the corrective-trace tail of `ai_run` (1060-1117), the per-monster `checkattack` functions, `G_PickTarget`, the setters of `level.sight_entity`, `level.sound_entity` and the client's `show_hostile`, and the engine calls `gi.inPHS` and `gi.AreasConnected` (their meaning is taken from their names). Confidence: high on acquisition order, the attack decision and the memory timers; medium on the near-range `show_hostile` rule, because the client-side setter was not read. camera_scope: not applicable (ai-aggro cell). Candidate files opened: g_ai.c, g_local.h, g_monster.c, g_main.c, readme.txt (5 files).

## 1. Mechanism

- The monster think is rescheduled at FRAMETIME (`nextthink = level.time + FRAMETIME`, g_monster.c:667; FRAMETIME is 0.1 at g_local.h:73). It does not poll every player every frame. `AI_SetSightClient` picks one client per game frame, cycling through the clients (g_ai.c:50-80, called from g_main.c:362). That client is the default sight source, used only when no recent sight or sound entity exists (457-459).
- Order of work in `FindTarget` (g_ai.c 407-583):
  1. A monster on a combat point, or a good guy, does not look for targets (413-427).
  2. Which source to use (437-460): a recent sight entity unless spawnflag 1 is set (437; if that entity's enemy is already this monster's enemy, the function returns false, 440-443), then a recent sound source (445), then a second sound source if the monster has no enemy (450), then the one sight client (457-459).
  3. Sight (489-520): the client must not have FL_NOTARGET (471), must be within the range bands (491-494: RANGE_FAR is never seen), must not be dark (light_level 5 or less, 499), must be visible by a trace from eye height to eye height (502). Then, by band: near needs the client's show window still open or the client in front (509); mid needs the client in front (514-519). `infront` is a dot product above 0.3 (323).
  4. Sound (539-572): a heard sound must be within 1000 units (556), in the potentially hearable set (550), and in a connected area (562-564). It sets AI_SOUND_TARGET and the enemy (570-571).
  5. Either way, a found target goes to `FoundTarget` (577), which stores the last sighting (359), opens a one-second show window for other monsters (357), and either runs to a combat point or calls `HuntTarget` (364).
- `HuntTarget` (331-345) sets the goal to the enemy, runs (or stands, if stand-ground), and for non-stand-ground units sets the first attack time one second ahead (344).
- Engagement, `ai_checkattack` (771-904), called from `ai_run` (950) and from the stand-ground branch of `ai_stand` (125):
  1. If the enemy is dead (807-831), it falls back to the old enemy and hunts it (837-842), or goes back to walking (845-859).
  2. While the enemy is visible, `search_time` is set to now + 5 (869) and the last sighting is stored (870). The show window is also refreshed (863).
  3. Range band and facing are computed for the enemy (880-881). Then the attack state wins over the decision: a set missile or melee attack state runs its movement (888-897).
  4. Without a visible enemy the attack decision is skipped (900-901). Otherwise the monster's `checkattack` runs (903), which is `M_CheckAttack` for these monsters.
- Attack decision, `M_CheckAttack` (607-693), in order:
  1. A clear shot is needed: a trace from eye to eye must hit the enemy (621-625).
  2. Melee band (629-639): melee at once (or missile state if the monster has no melee function). There is no cooldown on this path (the cooldown check is at 645, after it). On easy skill, 3 in 4 melee chances are skipped (632).
  3. Missile path: needs the attack timer to be passed (645) and an enemy not far (648). The chance depends on the band: 0.4 if stand-ground (651-653); 0.1 near (659-661); 0.02 mid (663-665). Easy halves the chance (672-673); hard doubles it at skill 2 or more (674-675).
  4. The roll (677). A success sets the attack timer to now + 2 x random (680).
- Pursuit when the enemy is not visible, in `ai_run` (914-1060):
  1. A sound target within 64 units stands ground for a while (937-941). Otherwise it moves toward the sound and checks `FindTarget` again (944-947).
  2. When the enemy is seen, the unit moves toward it and refreshes the last sighting (959-967).
  3. Losing sight sets LOST_SIGHT and PURSUIT_LAST_SEEN (991-995) and heads for the last sighting. Reaching it sets PURSUE_NEXT (1040-1042). The next step extends search time by 5 s (1006) and moves to the next trail marker (1016-1035, via p_trail.c, not read).
  4. A search that has run past its time by more than 20 s stops (977-983).

## 2. Key functions

- `FindTarget`: `/mnt/frankendom-donors/id-Software-Quake-2/game/g_ai.c` 407-583. Read in full. The sight, sound and source-selection rules in section 1.
- `range`: g_ai.c 264-278. Read in full. Bands: melee below MELEE_DISTANCE (80, g_local.h:80), near below 500, mid below 1000, far beyond.
- `visible`: g_ai.c 287-302. One trace, eye height to eye height, through MASK_OPAQUE.
- `infront`: g_ai.c 312-326. Dot product of the facing with the direction to the other entity, above 0.3.
- `FoundTarget` and `HuntTarget`: g_ai.c 347-387 and 331-345.
- `M_CheckAttack`: g_ai.c 607-693. Read in full. The attack decision and its chances.
- `ai_checkattack`: g_ai.c 771-904. Read in full. Dead-enemy fallback, memory refresh, and the attack-state dispatch.
- `ai_run`: g_ai.c 914-1060. Read through the pursuit branch.
- `AI_SetSightClient`: g_ai.c 50-80. One client per frame.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Distance bands decide what can be seen and how | Melee below 80 (g_local.h:80); near below 500 (g_ai.c:273); mid below 1000 (g_ai.c:275); far is never seen (g_ai.c:493) |
| Being in front is a dot-product test | Dot above 0.3 (g_ai.c:323) |
| Near targets need a recent show window or the front; mid targets need the front | Show window of 1 s (g_ai.c:357, 797); near rule (509); mid rule (514-519) |
| Dark targets are invisible | Light level 5 or less (g_ai.c:499) |
| Sound is heard within a radius and an area link | 1000 units (g_ai.c:556); potentially hearable set (550); areas connected (562-564) |
| Stand-ground temporary hold near a sound | 64 units (g_ai.c:937) |
| First attack waits a moment after the hunt starts | 1 s (g_ai.c:344) |
| Missile chance by band and posture | Stand-ground 0.4 (g_ai.c:653); near 0.1 (659); mid 0.02 (663); band chance for melee 0.2 is dead code (655, see section 6) |
| Skill scales the chance | Easy x0.5 (672-673); hard x2 at skill 2 or more (674-675) |
| Cooldown after a missile | 2 x random seconds (680) |
| Melee gate on easy skill | 3 in 4 skipped (632) |
| Search memory: refresh on sight, give up after a timeout | Refresh to now + 5 (869, 1006); give up after 20 s (977) |
| Monster think rate | FRAMETIME 0.1 s (g_local.h:73; g_monster.c:667) |

## 4. TypeScript sketch

simplified: the sketch keeps the sight rule, the hearing radius, the melee and missile decision with its chances and skill scaling, the search memory with its 5 s refresh and 20 s give-up, and the dead-enemy fallback. Time is in seconds. It uses 2D facing for the front test (the donor normalises the full 3D vector). It leaves out the engine trace and area checks (they are inputs: `visible`, `sameArea`), the FL_NOTARGET and sight-entity source selection, the combat point and the `G_PickTarget` path, the per-monster `checkattack` variants, the pursuit trail and the corrective trace, and the sound-target stand-ground hold. It also treats a melee-capable monster as always having a melee function (the donor falls back to the missile state when it has none). The donor's melee path has no cooldown; the sketch keeps that.

```ts
// Licence: GNU GPL version 2 or later (donor game/g_ai.c header). Clean-room sketch written from the described mechanism; not a translation of the donor lines.
// clean-room
type Band = 'melee' | 'near' | 'mid' | 'far';
type Pt = { x: number; y: number; z: number };
type Action = 'melee' | 'missile' | null;

interface Foe { pos: Pt; alive: boolean; lightLevel: number; hidden: boolean; showHostileUntil: number; }
interface Mon {
  pos: Pt; yaw: number; standGround: boolean; skill: number;
  enemy: Foe | null; oldEnemy: Foe | null;
  attackReadyAt: number; searchUntil: number; lastSighting: Pt | null;
}

const MELEE_DISTANCE = 80, NEAR_DISTANCE = 500, MID_DISTANCE = 1000; // donor range bands, in game units
const HEAR_RANGE = 1000;                 // donor: a heard sound must be within 1000 units
const IN_FRONT_DOT = 0.3;                // donor infront(): dot above 0.3
const LIGHT_MIN = 5;                     // donor: light_level <= 5 is never seen
const SEARCH_EXTEND_S = 5;               // donor: search time is set to now + 5 on sight
const SEARCH_GIVE_UP_S = 20;             // donor: give up when time > search time + 20

const dist = (a: Pt, b: Pt): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

function band(d: number): Band {
  if (d < MELEE_DISTANCE) return 'melee';
  if (d < NEAR_DISTANCE) return 'near';
  if (d < MID_DISTANCE) return 'mid';
  return 'far';
}

// Simplified to 2D: the donor normalises the full vector and dots it with the facing.
function inFront(m: Mon, f: Foe): boolean {
  const dx = f.pos.x - m.pos.x, dy = f.pos.y - m.pos.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return false;
  return (dx * Math.cos(m.yaw) + dy * Math.sin(m.yaw)) / len > IN_FRONT_DOT;
}

// Sight rule from the donor's FindTarget: far is never seen; dark is never seen; must be visible;
// near needs a live show window or the foe in front; mid needs the foe in front.
function seesFoe(m: Mon, f: Foe, now: number, visible: boolean): boolean {
  if (!f.alive || f.hidden) return false;
  const b = band(dist(m.pos, f.pos));
  if (b === 'far' || f.lightLevel <= LIGHT_MIN || !visible) return false;
  if (b === 'near' && f.showHostileUntil < now && !inFront(m, f)) return false;
  if (b === 'mid' && !inFront(m, f)) return false;
  return true;
}

// Hearing: a sound counts only inside the hearing range and when the sound is in the same area.
function hearsSound(m: Mon, src: Pt, sameArea: boolean): boolean {
  return sameArea && dist(m.pos, src) <= HEAR_RANGE;
}

// Donor M_CheckAttack. Melee band: melee at once, no cooldown, skill-gated. Otherwise a missile needs the
// cooldown and a roll: 0.4 when standing ground, 0.1 near, 0.02 mid. Easy halves it, hard doubles it.
function checkAttack(m: Mon, b: Band, clearShot: boolean, now: number, roll: () => number): Action {
  if (!clearShot) return null;
  if (b === 'melee') {
    if (m.skill === 0 && roll() < 0.75) return null;
    return 'melee';
  }
  if (now < m.attackReadyAt || b === 'far') return null;
  let chance = m.standGround ? 0.4 : b === 'near' ? 0.1 : 0.02;
  if (m.skill === 0) chance *= 0.5;
  else if (m.skill >= 2) chance *= 2;
  if (roll() < chance) {
    m.attackReadyAt = now + 2 * roll();
    return 'missile';
  }
  return null;
}

// Memory: a visible enemy refreshes the search time and the last sighting. After the search time passes by
// more than 20 s the unit stops searching. (Donor ai_run, 977-983; ai_checkattack, 869-870.)
function tickMemory(m: Mon, visible: boolean, now: number): 'pursue' | 'search' | 'idle' {
  if (visible && m.enemy) {
    m.searchUntil = now + SEARCH_EXTEND_S;
    m.lastSighting = { ...m.enemy.pos };
    return 'pursue';
  }
  if (m.searchUntil !== 0 && now > m.searchUntil + SEARCH_GIVE_UP_S) {
    m.searchUntil = 0;
    return 'idle';
  }
  return 'search';
}

// Dead enemy: fall back to the old enemy (and hunt it), otherwise go back to walking.
function dropDeadEnemy(m: Mon, now: number): 'hunt-old' | 'walk' | null {
  if (m.enemy && m.enemy.alive) return null;
  m.enemy = null;
  if (m.oldEnemy && m.oldEnemy.alive) {
    m.enemy = m.oldEnemy;
    m.oldEnemy = null;
    if (!m.standGround) m.attackReadyAt = now + 1; // donor HuntTarget: first attack waits one second
    return 'hunt-old';
  }
  return 'walk';
}
```

## 5. Lands in

- TARGET `src/fight/ai.ts` (proposed; Frankendom's module layout was not read). The engine-side awareness rule (sight bands, the front test, hearing radius), the attack decision (chance by band and stance, skill scale, cooldown), and the search memory (refresh and give-up timers, counted in ticks). The client shows the state only. Parity-checklist row 4 (fight loop: aggro, chase, leash).
- Reuse tag: rewrite-from-idea (GPL version 2 or later; clean-room only; no lines copied)
- Brief rule served: 1 (one engine decides awareness, search and the attack roll; the client only renders the state). The roll is the engine's, not the camera's.

## 6. Gaps and risks

- GPL-2.0-or-later code. The sketch is written from the described rules and copies no donor line. Frankendom should not paste or port the donor code.
- Dead code in the donor. The missile ladder at g_ai.c:655-657 (chance 0.2 for RANGE_MELEE) can never run: the melee band returns earlier (629-639). Do not copy that number as a tuned value.
- The donor rolls with the global `rand()` and `random()`. Frankendom's server-verified kills need the same roll on the server and on replay, so the rolls need a seeded stream per fight. The sketch takes a `roll` function for this.
- Time units. The donor counts in seconds of game time (level.time) and in 0.1 s think steps. Frankendom's fixed-step loop must convert the 1 s, 5 s and 20 s timers and the 2 x random cooldown into ticks. The 0.1 s think is slower than a duel needs; duels should use the server tick (row 18 / post-K item 3, sub-line "server tick: fixed step, input intake, per-tick NPC budget").
- One sight client per frame. The donor's awareness budget is one player per frame, which saves CPU across many players. It is a useful idea for zone NPCs (many players, few fights), not for duels.
- No attacker cap. Each monster rolls for itself, so a pack can attack at once. Frankendom's MAX_ATTACKERS = 3 must be a separate engine gate after the roll says "attack".
- The near-range rule depends on the client's `show_hostile` window, whose setter was not read. Frankendom must define its own "already noticed" window as data.
- The `skill` cvar is global in the donor. Frankendom should keep the skill factor per zone or per encounter (zone data).
- Not read: `p_trail.c` (the trail the pursuit follows), `M_MoveToGoal`, the rest of `ai_run`, the per-monster `checkattack` variants, and the sight and sound setters.

Best transferable idea: A monster notices a target through distance bands (far never, near only if already noticed or in front, mid only in front), keeps a search memory that refreshes on sight and gives up after a fixed timeout, and rolls an attack chance that falls with distance and rises with difficulty.
Decision (proposed): adapt - take the bands, the front test, the search memory and the per-band chance table as engine data; replace the global rand with a seeded stream and the seconds with ticks; drop the one-sight-client-per-frame budget for duels; add MAX_ATTACKERS = 3 as a separate engine gate; do not copy the dead 0.2 melee-band chance.
Acceptance: A server test asserts that a foe 600 units away and out of the player's front is not noticed, that it is noticed at 300 units when the player is in front, and that after the player leaves sight the foe searches from the last sighting until 25 s after that sighting (5 s search time plus the 20 s give-up), then stops.

Reuse tag: rewrite-from-idea (GPL version 2 or later; clean-room only)
Brief rule served: 1 (one engine decides awareness, search and the attack roll; the client only renders the state)
