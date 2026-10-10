# ValveSoftware-halflife (spawns-encounters, cell 4)

Donor: `/mnt/frankendom-donors/ValveSoftware-halflife/dlls/monstermaker.cpp` | Licence: Valve LLC (file header: use, distribution and modification restricted to non-commercial enhancements of Valve products; all other use prohibited; also touches Id Technology), with the Half Life 1 SDK LICENSE at repo root (free use and distribution only, commercial use by written contact) | C++ | symbol `CMonsterMaker::MakeMonster`

Checked: Read in full: `/mnt/frankendom-donors/ValveSoftware-halflife/dlls/monstermaker.cpp` 1-292 (whole file: header and licence 1-14, class 26-79, Spawn and KeyValue 81-149, MakeMonster 161-235, cyclic and toggle use 241-266, MakerThink 271-276, DeathNotice 281-290). `/mnt/frankendom-donors/ValveSoftware-halflife/dlls/combat.cpp` 591-625 (CBaseMonster::Killed and the owner notice at 611-616). `/mnt/frankendom-donors/ValveSoftware-halflife/dlls/util.cpp` 404-424 (UTIL_EntitiesInBox, the start of the loop only; the bounds test after 424 was not read). `/mnt/frankendom-donors/ValveSoftware-halflife/dlls/subs.cpp` 145-147 (the `delay` key). `/mnt/frankendom-donors/ValveSoftware-halflife/dlls/roach.cpp` 177-180 (second DeathNotice caller, read by grep and this range). The list hint `cl_dll/hl/hl_baseentity.cpp` is the wrong file: it is client-side stubs (CGrenade::Spawn and CBasePlayerItem::Respawn are empty, 97 and 322-323), searched by grep only. Engine think dispatch: `engine/` searched by one grep; no `nextthink` dispatch found in the engine sources read; not read. Other candidate, grep only: `/mnt/frankendom-donors/ValveSoftware-halflife/dlls/multiplay_gamerules.cpp` item and weapon respawn times (45-46, 856-976). Confidence: high on the maker's order of steps and its numbers (read in full). Medium on the callers: only the two DeathNotice callers were found (combat.cpp, roach.cpp), and the engine's think scheduling and fixed or variable step were not read. Depth: full.

Best transferable idea: a spawner that re-arms its timer before every attempt, so a refused attempt (at the live cap, or with a player or monster in the spot) waits a full interval, and that counts its live children down through a death notice.
Decision (proposed): adapt - the fixed-interval attempt, the live cap and the death-notice decrement map onto row 23 population directly; the ground trace, the owner pointer and the SDK licence mean we take the shape only, with the spot check written as a server-side occupancy test in our own spawn code.
Acceptance: A server test with a 10-second interval, live cap 3 and budget 6 asserts that no more than 3 children are live at once, that an attempt into a spot holding a player is skipped and retried only after the next 10 seconds, and that the maker stops after 6 spawns.

## 1. Mechanism

- The entity is a `monstermaker`, which creates monsters of the class named by its `monstertype` key (monstermaker.cpp:94-96, not quoted). It has three numbers set from the map: `monstercount` (total spawns left, m_cNumMonsters, line 86), `m_imaxlivechildren` (live cap, line 91) and `delay` (the interval, parsed by the base delay class at subs.cpp:145-147).
- Spawn (monstermaker.cpp:104-149): live count is reset to 0 (108). The fade flag is set from the budget: off when the budget is exactly 1, otherwise on (139-146). With no targetname, the first attempt is set to `now + m_flDelay` and the maker starts thinking at once (134-136). With a targetname, it waits for a use signal unless the start-on flag is set (121-130). A cyclic maker makes exactly one child per use (241-244).
- Attempt rate (MakerThink, 271-276): the timer is re-armed first, to `gpGlobals->time + m_flDelay` (273), and then `MakeMonster()` runs (275). The rate is fixed by the interval. A failed attempt does not retry sooner.
- MakeMonster, in this order (161-235):
  1. Live cap: if `m_iMaxLiveChildren > 0` and `m_cLiveChildren >= m_iMaxLiveChildren`, return (166-168).
  2. Ground height: once, if `m_flGround` is 0, trace 2048 units straight down from the maker and store the hit z (171-178).
  3. Spot check: a box from origin minus 34 to origin plus 34 in x and y, from the ground z up to the maker's z (180-183). `UTIL_EntitiesInBox` looks for up to 2 entities with the client or monster flag inside it (185-186). If any, return with no retry (187-191; the comment says "don't build a stack of monsters!").
  4. Create the entity from the class name (193). If that fails, log and return (195-199).
  5. If the maker has a target, fire it (202-206).
  6. Copy origin and angles, set the fall-to-ground flag, and set the monster-clip flag if spawn flag 8 is set (208-215). Spawn it (217). Set the child's owner to the maker (218).
  7. Pass the maker's netname to the child as its targetname, if set (220-224).
  8. Count it: live count up (226), budget down (227). If the budget is now exactly 0, stop thinking and stop using (229-234).
- Death: the child's death path (`CBaseMonster::Killed`, combat.cpp:591) calls the owner's `DeathNotice` (611-616). `DeathNotice` lowers the live count (284). If the fade flag is off, it also clears the child's owner link (286-289). What the fade flag does to the child visually was not read.
- Position: the child is created at the maker's origin and angles (209-210). No random offset appears in the code read.
- Loop: time is `gpGlobals->time` in seconds. The think function runs when the engine's scheduler reaches `nextthink`. That scheduler was not read. Whether the server step is fixed or variable was not read.

## 2. Key functions

- `CMonsterMaker::MakerThink`: `/mnt/frankendom-donors/ValveSoftware-halflife/dlls/monstermaker.cpp` 271-276 (re-arm, then one attempt).
- `CMonsterMaker::MakeMonster`: `/mnt/frankendom-donors/ValveSoftware-halflife/dlls/monstermaker.cpp` 161-235 (cap at 166, ground at 171-178, spot at 180-191, count and budget at 226-234).
- `CMonsterMaker::DeathNotice`: `/mnt/frankendom-donors/ValveSoftware-halflife/dlls/monstermaker.cpp` 281-290 (live count down at 284).
- `CBaseMonster::Killed` (the notice call): `/mnt/frankendom-donors/ValveSoftware-halflife/dlls/combat.cpp` 591 and 611-616.
- `UTIL_EntitiesInBox`: `/mnt/frankendom-donors/ValveSoftware-halflife/dlls/util.cpp` 404-424 (partial).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Fixed-interval attempt; the timer is re-armed before the attempt, so a refused attempt waits a full interval | `delay` key sets m_flDelay (subs.cpp:145-147); default not read |
| Live cap: no attempt while live children are at or above the cap; 0 means no cap | `m_imaxlivechildren` (monstermaker.cpp:91), tested at 166 |
| Total budget: one spawn per attempt, maker stops when the budget reaches exactly 0 | `monstercount` (line 86), decremented at 227, tested at 229 |
| Spot check: 68 by 68 box around the maker, from ground to maker z; refuse if any client or monster is inside | half-width 34 (180-181); list size 2 (186), with the count tested at 187 |
| Ground found once by a 2048-unit trace down | 2048 (176) |
| Fade flag set from the budget: off when the budget is 1 (it only controls clearing the owner link at death) | 1 (139-146) |
| Death notice lowers the live count | no number; one decrement (284) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order inside one attempt: re-arm the timer first, then the live cap, then the spot check, then spawn, count and budget. It omits the ground trace (the sketch takes the spot test as a callback), the target firing, the spawn-flag bits, the netname, the cyclic and toggle use paths, the fade flag, and the save and restore code. It keeps one donor quirk on purpose: a budget that starts at 0 is not guarded, so it goes negative and never disables (the donor test is `== 0` after the decrement); the default value of `monstercount` was not read.

```ts
// Licence: Valve HL1 SDK terms in the donor (monstermaker.cpp header: use restricted to non-commercial enhancements of Valve products). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

interface MakerState {
  budget: number;          // spawns left in total (zone data); 0 at start is not guarded in the donor
  liveMax: number;         // max children alive at once (zone data); 0 means no cap
  live: number;            // children alive, lowered by a death notice
  intervalS: number;       // seconds between attempts (zone data)
  nextAtS: number;         // time of the next attempt, in seconds
  disabled: boolean;
}

// One attempt, run when its timer is due. The timer is re-armed first,
// so a refused attempt waits a full interval before it tries again.
function attempt(m: MakerState, nowS: number, spotFree: () => boolean, spawn: () => void): void {
  if (m.disabled || nowS < m.nextAtS) return;
  m.nextAtS = nowS + m.intervalS;

  if (m.liveMax > 0 && m.live >= m.liveMax) return; // at the live cap
  if (!spotFree()) return;                          // a player or monster is in the spot

  spawn();
  m.live += 1;
  m.budget -= 1;
  if (m.budget === 0) m.disabled = true;            // budget spent: stop attempting
}

// Death notice from one spawned child. Called from that child's death path.
function childDied(m: MakerState): void {
  m.live -= 1;
}

export {};
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population: the spawn director for caps, respawn and despawn). Parity-checklist row 23: the fixed-interval attempt, the live cap and the death-notice decrement are the respawn and cap parts. The despawn-on-empty grace timer is NOT in this donor (see section 6).
- Numbers as zone data fields: attempt interval (`delay`), live cap (`m_imaxlivechildren`), total budget (`monstercount`). Engine constants: the spot-check box, the rule that a refused attempt waits a full interval, and the rule that the death notice comes from the verified kill.
- today: not checked in this pass.
- Reuse tag: rewrite-from-idea (Valve SDK terms, restricted; clean-room, shape only)
- Brief rule served: zones as data (row 23 caps, respawn interval and budget as zone fields); server-verified kills (the death notice comes from the verified kill, not from the client)

## 6. Gaps and risks

- No despawn: children are never removed for being unattended. They stay until killed. The fade flag only decides whether the owner link is cleared at death (286-289). Row 23 needs a despawn-on-empty grace timer, which this donor does not give us.
- One ledger: the live count is a field on the maker, lowered only by the death path. Only two callers of `DeathNotice` were found (combat.cpp:615, roach.cpp:180). Any other removal of a child that does not go through `Killed` would leave the count too high; other removal paths were not read. Frankendom should count live groups in the server ledger and take the count from verified kills.
- Budget of 0: the donor does not guard it. A maker that starts at 0 goes to -1 and never disables (229 tests exactly 0). Frankendom needs an explicit unlimited value and must not rely on 0.
- MAX_ATTACKERS = 3: this cap limits children of one maker (population). It does not limit attackers in a fight. The spot check stops spawns on top of a player, but it does not count attackers. Attacker limits belong to the engine's target logic.
- Server tick: attempts run on engine think times in seconds, not on a server tick. Frankendom's rule (fixed step, input intake, per-tick NPC budget) must decide when an attempt runs, and the spot check must read the same state as the tick.
- Licence: Valve terms restrict use. Clean-room only; the sketch is written from the described mechanism.
- Not read: the engine think scheduler and step rate; the bounds test of `UTIL_EntitiesInBox` after line 424; the default of `monstercount` and `delay`; the other respawn code in `multiplay_gamerules.cpp` (item respawn 30 and weapon respawn 20, lines 45-46, grep only), which is a separate candidate.
