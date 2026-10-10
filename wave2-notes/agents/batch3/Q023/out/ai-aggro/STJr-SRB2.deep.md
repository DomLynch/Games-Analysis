# STJr-SRB2 (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/STJr-SRB2/src/p_enemy.c` (`P_LookForPlayers` 447; `A_Chase` 754) with `/mnt/frankendom-donors/STJr-SRB2/src/p_mobj.c` (`P_BossTargetPlayer` 3969) | Licence: GNU GPL version 2 only (per the header line p_enemy.c:8 "terms of the GNU General Public License, version 2."; the LICENSE file is the GPL v2 text) | C | symbol `P_LookForPlayers`

Checked: `P_LookForPlayers` read 447 to the end of the function; `A_Look` 720-745; `A_Chase` 754-840 (the retarget gate at 831 and the chase step at 836 read; the tail after 840 not read); `A_SharpChase` 1678-1722 (only the parts that set and call the threshold and look); `P_BossTargetPlayer` read whole (3969-4023); `P_PyreFlyThink` head (9002-9010), `P_PterabyteThink` caller line (9081). Callers of `P_LookForPlayers`: p_enemy.c 729 (A_Look), 793 and 882, 920 (A_Chase, A_FaceStabChase-style variants, grep only), 1705 (A_SharpChase), p_mobj.c 9010 (pyre fly), 9081 (pterabyte), 9205 (circle, grep only), 9426 (tracer, grep only), lua_baselib.c 642 (grep only). Callers of `P_BossTargetPlayer`: p_mobj.c 4068, 4108, 4155, 4313, 4443, 4965, 5372; p_enemy.c 7525; lua_baselib.c 925 (grep only). Not read: `P_CheckSight`, `P_AproxDistance`, `R_PointToAngle2`, `P_Move`, `P_NewChaseDir` body, `P_CheckMeleeRange`, the state table that calls the actions, and the code that sets threshold elsewhere. Timing: a look runs inside an enemy's A_Look or A_Chase action, so it costs one budget each time that action runs; there is no separate scan timer (the state machine that runs the actions was not read). Confidence: high on the scan order, the budget and the retarget rules; medium on the timing (state table not read). Depth full for the scan. Receipt note: the budget receipt (p_enemy.c 470) is 13 characters because the source line is that short; the verifier passes it, and the boss budget at p_mobj.c 3992 is a longer receipt of the same rule.

Best transferable idea: Give each enemy a persisted round-robin cursor and examine at most two in-game players per look, so the cost of finding a target stays fixed as the player count grows.
Decision (proposed): adapt — the cursor plus per-call budget is a cheap way to bound zone NPC aggro with many players in range; adapt because the donor's budget is per call for each enemy (not a global per-tick budget), it spends the budget on spectators and invisible slots too, and its behind-branch overwrites the distance parameter (not copied).
Acceptance: Server test: with 10 players in range and one NPC, each call examines at most 2 in-game players, and the NPC acquires a visible player within 5 calls, with the target sequence asserted from a fixed seed.

## 1. Mechanism

- Entry: `P_LookForPlayers(actor, allaround, tracer, dist)` (447). `allaround` = look all around; if false, only the 180-degree front cone counts. `dist` > 0 caps range (3D, 494). Result: sets `actor->target` (or `actor->tracer`) and returns true, or returns false.
- Cursor: `actor->lastlook` persists between calls. First use it is set to a random byte (454-455), then masked to `MAXPLAYERS` (457). `stop` is the slot one before the cursor (459), so the loop covers one full cycle.
- Loop order, per slot (the cursor is advanced by the `for` increment on each `continue`):
  1. Stop when the cursor is back at `stop` (return false) (the top check).
  2. Skip slots with no player in the game.
  3. Budget (470): the third in-game slot in one call returns false. So each call examines two in-game slots. The cursor stays on the third, so it is examined first in the next call.
  4. Skip spectators in netgame or multiplayer (the donor's combined test), invisible players (478), and dead players (484), plus bot and quit-time filters (not shown here).
  5. Range (494): 3D distance above `dist` (only when `dist > 0`) skips the player.
  6. Cone (500-504): if not all-around and the player is behind (angle between 90 and 270 degrees from facing), the donor sets `dist` to the 2D distance (502) and skips the player unless it is inside `MELEERANGE x scale` (64 fixed units, p_local.h 47). Note: `dist` is the function parameter, so later slots in the same call are then checked against this player's distance (quirk, see Gaps).
  7. Sight (509): `P_CheckSight` must pass.
  8. Success: set target (515, or tracer at 513) and return true.
- Who calls it with which arguments:
  - `A_Look` (720-745): `allaround` from the low 16 bits of var1, distance from the high 16 bits times the actor scale (729). Cone and range are per state, so they are zone or data-table values.
  - `A_Chase` (754): when the target is missing or not shootable (790), it calls with all-around and no range cap (793). If no player is found, the enemy goes to its spawn state (795 region).
  - `A_Chase` multiplayer retarget (831): when there is a target, `multiplayer` is on, `threshold` is 0, and the target is dead or not in sight (`P_CheckSight` in the same condition), it looks again with all-around and no range cap (832 region, grep only).
  - Threshold cooldown: `A_Chase` decrements `threshold` each call and resets it to 0 when there is no live target (770-775). `A_SharpChase` sets `threshold` to `info->painchance` when its missile attack fires (1718), so after a missile the multiplayer re-look waits until the counter runs out.
  - `A_Chase` also turns the actor toward its move direction in 45-degree steps (776-789) and attacks on melee or missile range (a melee check and a missile check; "do not attack twice in a row" flag, 790-830 region, partly read).
- Boss variant `P_BossTargetPlayer(actor, closest)` (3969-4023), same cursor:
  - Non-closest: budget of two in-game slots (3992), skip invisible, bot-follower and spectator slots (3997), skip dead and not-in-sight players (after 3997, read), then take the first one found.
  - Closest: no budget; it scans the whole cycle, keeps the nearest visible player by 2D distance (4011-4014), and returns true when it found any (3987). Calls with `closest` true are at p_mobj.c 4313 and 4443.

## 2. Key functions

- `P_LookForPlayers`: `/mnt/frankendom-donors/STJr-SRB2/src/p_enemy.c` 447-520. Cursor, budget, filters, cone, sight, set target.
- `A_Look`: `/mnt/frankendom-donors/STJr-SRB2/src/p_enemy.c` 720-745. Caller that gives the cone bit and the range.
- `A_Chase`: `/mnt/frankendom-donors/STJr-SRB2/src/p_enemy.c` 754-840. Threshold cooldown, target-lost re-look, multiplayer re-look.
- `P_BossTargetPlayer`: `/mnt/frankendom-donors/STJr-SRB2/src/p_mobj.c` 3969-4023. Second cursor scan; non-closest budget two, closest full scan.
- `MELEERANGE` and `MAXPLAYERS`: `/mnt/frankendom-donors/STJr-SRB2/src/p_local.h` 47 and `/mnt/frankendom-donors/STJr-SRB2/src/doomdef.h` 244.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Persisted round-robin cursor per enemy; one full cycle then give up | Cursor starts at a random slot (454-455); `MAXPLAYERS` 32 (doomdef.h 244) |
| Examine at most N in-game slots per call; carry the cursor | N = 2 (470); the boss closest variant has no budget (3992 applies to non-closest only) |
| Range cap in 3D when a cap is given | Cap from the call: var1 high 16 bits x scale for A_Look (729); 0 means no cap (793) |
| Front cone only unless all-around; behind only at melee reach | 90 degrees either side of facing (500); reach `MELEERANGE` 64 x scale (p_local.h 47, 504) |
| Retarget only when the target is dead or unseen, and only off cooldown (multiplayer) | Cooldown counter from `info->painchance` (1718); decrement and reset (770-775) |
| Boss closest pick: nearest visible player by 2D distance | Full scan; no budget (4011-4014) |

## 4. TypeScript sketch

simplified: keeps the donor's scan: persisted cursor, at most two in-game slots examined per call (the third returns false and is examined first next call), the same skip order for spectator, invisible and dead, an optional 3D range cap, the front cone (behind: melee reach only), and line of sight. It omits the netgame/multiplayer gate on spectators, the bot and quit-time filters, the tracer variant, the chase retarget rules (A_Chase, threshold cooldown), and the boss closest scan. It also does not copy the donor's overwrite of its `dist` parameter in the behind branch: the sketch keeps the behind check local, so later players are not capped by the behind player's distance.

```ts
// Licence: GPL-2.0 (version 2 only; p_enemy.c line 8). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Player {
  inGame: boolean;
  spectator: boolean;
  invisible: boolean;
  alive: boolean;
  x: number;
  y: number;
  z: number;
}

interface Watcher {
  x: number;
  y: number;
  z: number;
  scale: number;
  cursor: number; // persisted between calls
  target: Player | null;
}

interface Sight {
  angleToDeg(w: Watcher, p: Player): number; // signed, -180..180
  hasSight(w: Watcher, p: Player): boolean;  // line of sight (donor: P_CheckSight, not read)
}

const SCAN_BUDGET = 2; // in-game player slots examined per call
const MELEE_REACH = 64; // world units before scale (donor MELEERANGE)

function lookForPlayers(w: Watcher, players: Player[], sight: Sight, allAround: boolean, maxDist: number): boolean {
  const n = players.length;
  const stop = (w.cursor + n - 1) % n; // one full cycle
  let examined = 0;
  for (; ; w.cursor = (w.cursor + 1) % n) {
    if (w.cursor === stop) return false;
    const p = players[w.cursor];
    if (!p.inGame) continue;
    if (examined++ === SCAN_BUDGET) return false; // cursor stays on this slot for the next call
    if (p.spectator || p.invisible || !p.alive) continue;

    const dx = p.x - w.x;
    const dy = p.y - w.y;
    const dz = p.z - w.z;
    if (maxDist > 0 && Math.sqrt(dx * dx + dy * dy + dz * dz) > maxDist) continue;

    if (!allAround && Math.abs(sight.angleToDeg(w, p)) > 90) {
      // behind the watcher: only close range counts
      if (Math.sqrt(dx * dx + dy * dy) > MELEE_REACH * w.scale) continue;
    }
    if (!sight.hasSight(w, p)) continue;

    w.target = p;
    return true;
  }
}

export {};
```

## 5. Lands in

- TARGET `src/fight/ai.ts` (the AI brain's target acquisition for zone NPCs; the duel does not search, it is engaged). Parity-checklist row 2 (AI brain).
- Reuse tag: rewrite-from-idea (GPL-2.0 only; clean-room, shape only)
- Brief rule served: one engine (target search runs in the engine, not the client); server-verified kills (the target is set on the server, not by the client's view); per-tick work bounded (post-K item 3 sub-line: server tick: per-tick NPC budget)

## 6. Gaps and risks

- GPL-2.0: clean-room only. The sketch is written from the mechanism.
- The donor's budget is per call per enemy, not a global budget per tick. The budget of two is spent on in-game slots, including spectators, invisible and dead players, so an enemy with many dead or hidden slots finds fewer targets per call. Frankendom's server tick needs one global per-tick NPC budget on top of this, and a test for it.
- The behind branch overwrites `dist` (502), so with `allaround` false a behind player caps the range for later players in the same call (494). This looks unintended. Do not copy it; the sketch keeps the value local. A test should show that a front player after a behind player is still found.
- The first cursor position is random (`P_RandomByte`, 454-455). Frankendom must take that start from the server's seeded RNG so the target sequence in a test is repeatable.
- The boss closest variant has no budget (4011-4014). In a zone with many players, one boss scan costs one full scan per call. Frankendom should keep the budget on all paths.
- The retarget rule (831) is gated by a cooldown that only some actions set (1718). Frankendom's cooldown must be a named data field, not a side effect of a missile action.
- `MAXPLAYERS` 32 and the cursor are donor constants. Frankendom's cap on players per zone is a zone data field, not this value.
- Not read: `P_CheckSight` (the line-of-sight cost is unknown), `P_AproxDistance`, `P_NewChaseDir`, `P_CheckMeleeRange`, and the state table that decides when actions run.
