# beyond-all-reason-Beyond-All-Reason (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/beyond-all-reason-Beyond-All-Reason/luarules/gadgets/ai_zombies.lua` | Licence: GNU GPL v2 or later (file header `license = "GNU GPL, v2 or later"`; repo `LICENSE.md` line 2 says the game code is GPL v2) | Lua (Recoil/Spring synced gadget) | symbol `updateAggro`

Checked: whole file read, lines 1-1283. Also read `luarules/gadgets/game_team_power_watcher.lua` 55-136 and 641-652 (where the `GG.PowerLib` total used by the gate comes from). Callers checked: `updateAggro` is called only from `gadget:GameFrame` (1239); `assignZombieAggroEvenly` only from `updateAggro` (1130); `getNearestCombatTarget` only from `updateOrders` (899); `issueCombatMove` only from `updateOrders` (929). Not read: `Game.gameSpeed` (engine constant, so every "seconds" value below is `N x gameSpeed` frames), the engine semantics of `spGetUnitNearestEnemy`, the callers of `GG.ZombieAI.AggroTeamID` / `AggroAllyID` (the scripted aggro path), and the `defPower` table in the power watcher. Confidence: high on the director and order flow (all read); medium on any number of seconds, since it depends on `gameSpeed`. Camera: not applicable (AI cell).

## 1. Mechanism

Two loops decide what a zombie does. A slow director (`updateAggro`) decides whether the whole horde hunts players. A per-unit order loop picks a combat target or a movement objective.

- Director, run every frame but acting only on frames where `gameFrame % AGGRO_CHECK_INTERVAL == 1`, and not before `AGGRO_MIN_START_FRAME` (1123-1124; constants 35, 37).
- Gate: total mobile zombie power > total power of player teams x 0.1 (1127-1128). Zombie power is the unit def's `power` field, added once when the zombie is first watched (989, 1006). Player-team power is every team except neutral, scavenger and raptor (game_team_power_watcher.lua 112, 124-134); AI teams count as player teams (58-59).
- Gate fails: all aggro is dropped at once (`zombieAggros = {}` and expiry set to 0, 1133-1134). The horde goes back to wandering.
- Gate passes: `assignZombieAggroEvenly` (503-566), then the expiry is refreshed to now + 60 x gameSpeed frames (1131; set at 256). The steps:
  - Per ally team, sum player-team power (507-511). An ally team is eligible if its power is > 0 and it has a living unit (516).
  - Walk all mobile zombies. A zombie whose assignment is still valid keeps it and adds its power to that team's load (527-532). Valid means: the target is alive, still on that ally team, and the zombie is more than 200 units from the point where the target stood when chosen (`isAggroObjectiveValid` 490-501, using the stored objective x/z set at 447-451).
  - Every other mobile zombie is pending. If no ally team is eligible, the function returns here and the pending zombies stay unassigned (552-554).
  - Pending zombies are sorted strongest first, ties by unit ID (556, 473-478). Each goes to the eligible ally team with the lowest assigned power, ties to the lower ally team ID (560, 456-471). It picks a random living unit of that team as its target (430) and records the assignment (561-562). Its power is added to that team's load (563).
- Aggro expiry: the getter returns nothing once `gameFrame >= aggroExpirationTimestamp` (259-264). On the automatic path the timestamp is refreshed every passing check (30 x gameSpeed frames), so it does not lapse while the gate holds. The scripted path (`aggroAllZombiesToAllyTeam`, 1074-1094) sets an expiry of 60 x gameSpeed frames once, and marks the zombies with the ally team (1080).
- Per-unit orders: each watched zombie is visited once per `ZOMBIE_ORDER_CHECK_INTERVAL` = 3 x gameSpeed frames, in a bucket chosen by `unitID % interval` (33, 998, 1139-1151). The bucket for this frame runs `updateOrders`.
- Combat first (888-929). A kept combat target is re-validated each visit (888-892). It is replaced only when none is valid and the unit has a weapon or can capture (896-906). Target validity means: alive, not allied to Gaia, has a position, and the weapon range for that target's type (air, underwater, ground) is above zero (343-363, 318-336). The range is NOT compared with the distance to the target at pick time.
- Target pick (365-399): first the engine's nearest enemy within 1000 (366, 43). If that one is not valid, scan every enemy in a 1000 cylinder and keep the closest valid one (376, 385-395). The pick then sets `rememberEnemyDirection` (904, 568-593), which projects the bearing to the map edge and stores it as a later move goal.
- Engage (744-829): the move point is at weapon range x 0.5 from the target, on the line from target to unit (759-761). A second point is queued with shift, rotated plus or minus 45 degrees around the target (784-813). The rotation side is random at first and flips if the first point is off map or not traversable (786, 788-812). If both sides fail, it queues a point at half the radial offset with no rotation (814-825). If the primary point is off map or not traversable, the combat target is dropped and the unit falls back to an objective move (762-781).
- A new engage move is issued only if the command changed, the target changed, or the target has moved 100 units or more since the last engage move (916-930).
- No combat target (932-950): resurrect wrecks if the unit can (935), else an objective move (938-949). The objective is the aggro target if one is still valid (`ensureMovementObjective` 595-646), else the remembered enemy edge, else a random point on the map edge inset 50 units (641-643, 418-419).
- Objective move (673-742): aim at the objective with a random offset within 22.5 degrees for an aggro objective (678; 58) or 90 degrees otherwise (57). Step at most 1600 units (682, 44). Add up to +/-50 units of jitter (689-690). Reject a point inside a no-go disc (691) or one that fails the traversability test (693). Try up to 10 times; the last try uses a random heading (680-685). If no point passes, orders are cleared (737). Otherwise the next hop is queued with shift (723-733).
- Stuck check (1154-1206): each unit is checked once per 12 x gameSpeed frames (34, 1155). If it has moved less than 50 units since its last sample (39, 1177), and is not resurrecting, and is not standing at a remembered enemy goal (1168-1176), it drops orders, its combat target and its aggro objective (1180-1190). It also gets a no-go disc of radius 600 at its position, unless it is already inside one (41, 1191-1196). At most 10 discs are kept; the oldest is removed first (53, 1192-1194). Then it reroutes (1197-1198). The sample always advances (1200-1201).
- Frame order (1234-1244): end-game pacify check, then `updateAggro`, then, if orders are enabled, the order bucket and the stuck bucket.

Tick: fixed step. `gadget:GameFrame(frame)` runs once per simulation frame. Every interval is an integer count of frames (`% interval`, bucket indices). There is no accumulator and no variable step in this file.

## 2. Key functions

- `updateAggro`: `/mnt/frankendom-donors/beyond-all-reason-Beyond-All-Reason/luarules/gadgets/ai_zombies.lua` 1123-1136. The director gate: cadence, power comparison, pass or drop.
- `assignZombieAggroEvenly`: same file, 503-566. Keeps valid assignments, sorts pending zombies by power, assigns each to the least-loaded eligible ally team.
- `getLeastAssignedAlly` and `compareZombiePower`: same file, 456-478.
- `getNearestCombatTarget`: same file, 365-399. Engine nearest-enemy query first, cylinder scan as the fallback.
- `issueCombatMove`: same file, 744-829. Engage point at half range, orbit point at 45 degrees, off-map and traversability fallbacks.
- `updateStuckZombies`: same file, 1154-1206. The 50-unit stuck test, the no-go discs, the reroute.
- `gadget:GameFrame`: same file, 1234-1244. The order of the per-frame steps.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Re-check a wandering group against a power ratio on a fixed cadence, drop everything when it fails | Ratio 0.1 (theirs, 54, 1128); check every 30 x gameSpeed frames (35); first check after 15 x 60 x gameSpeed frames (37) |
| Assignment hold-time after a passing check | 60 x gameSpeed frames (36, 256); refreshed on each passing check (1131) |
| Give the strongest pending members first to the least-loaded eligible team | Sort by power descending, ties by ID (556, 477); least-loaded, ties to lower team ID (461, 463-465) |
| Keep a current assignment while the target is alive, on the same team, and more than 200 units away | Reached distance 200 (45, 487) |
| Pick the nearest valid enemy within a radius; fall back to a scan | Radius 1000 (43); the engine query, then a cylinder scan (366, 376) |
| Stand off at a fraction of the weapon range, with a sideways second point | Engage at 0.5 x weapon range (55, 759); orbit 45 degrees (59); side random (786) |
| Re-issue movement only when the target has moved enough | Refresh distance 100 units (47, 923) |
| Stuck detection: small movement over a fixed window drops the goal and adds a no-go disc | Window 12 x gameSpeed frames (34); 50 units (39); disc radius 600 (41); max 10 discs (53) |
| Spread per-unit work over frames by ID | Order check every 3 x gameSpeed frames (33); unit bucket = ID mod interval (998) |
| Zombie weight in the gate | Unit def `power` field (989); value not read |

## 4. TypeScript sketch

simplified: the sketch keeps the director gate, the valid-assignment keep, the strongest-first least-loaded split with random target pick, the engage and orbit points, and the stuck check with capped no-go discs. It omits: the incremental power totals (it sums the list on each call); the "remembered enemy" goal and map-edge wander; the 22.5/90-degree aim variance; the 1600 step cap and the 10-attempt objective search; the next-hop queueing; the cylinder fallback (the caller passes the candidate list); the capture and resurrect branches; factory build orders; the pacify and game-end checks; the bucket scheduling; the map-bounds checks on the orbit point; and the engine's traversability test. The order of the director (gate, then keep, then split) matches the donor. The sketch has no timer: `now` and the cadence are supplied by the caller.

```ts
// Licence: GNU GPL v2 or later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Seconds = number;
interface Pt { x: number; z: number; }
interface Unit extends Pt { id: number; power: number; }
interface PlayerTeam { id: number; power: number; units: Unit[]; } // units: live units only
interface Aggro { team: number; targetId: number; target: Pt; }   // target: where the target stood when picked
interface Director { aggro: Map<number, Aggro>; expiresAt: Seconds; }
interface Tuning { checkEvery: Seconds; aggroLasts: Seconds; startAfter: Seconds; swarmRatio: number; reachedDistance: number; }

const ENGAGE_RATIO = 0.5;
const ORBIT_RAD = (45 * Math.PI) / 180;
const STUCK_DIST = 50;
const NOGO_RADIUS = 600;
const NOGO_MAX = 10;

function dist(a: Pt, b: Pt): number { return Math.hypot(a.x - b.x, a.z - b.z); }

// Director: called by the engine loop on each check (the donor runs it when gameFrame % interval == 1).
function runDirector(now: Seconds, tune: Tuning, horde: Unit[], players: PlayerTeam[], prev: Director, rng: () => number): Director {
  if (now < tune.startAfter) return prev;
  const hordePower = horde.reduce((s, u) => s + u.power, 0);
  const playerPower = players.reduce((s, t) => s + t.power, 0);
  if (!(hordePower > playerPower * tune.swarmRatio)) return { aggro: new Map(), expiresAt: 0 };

  const eligible = players.filter((t) => t.power > 0 && t.units.length > 0);
  const load = new Map<number, number>(eligible.map((t) => [t.id, 0]));
  const liveIds = new Map<number, Set<number>>(eligible.map((t) => [t.id, new Set(t.units.map((u) => u.id))]));
  const kept = new Map<number, Aggro>();
  const pending: Unit[] = [];

  for (const z of horde) {
    const a = prev.aggro.get(z.id);
    const valid = a !== undefined && liveIds.has(a.team) && liveIds.get(a.team)!.has(a.targetId) && dist(z, a.target) > tune.reachedDistance;
    if (valid && a) {
      kept.set(z.id, a);
      load.set(a.team, load.get(a.team)! + z.power);
    } else {
      pending.push(z);
    }
  }

  if (eligible.length > 0) {
    pending.sort((p, q) => (q.power - p.power) || (p.id - q.id)); // strongest first, ties by id
    for (const z of pending) {
      let best = eligible[0];
      for (const t of eligible) {
        const lt = load.get(t.id)!;
        const lb = load.get(best.id)!;
        if (lt < lb || (lt === lb && t.id < best.id)) best = t; // least-loaded team, ties to lower id
      }
      const pick = best.units[Math.floor(rng() * best.units.length)];
      kept.set(z.id, { team: best.id, targetId: pick.id, target: { x: pick.x, z: pick.z } });
      load.set(best.id, load.get(best.id)! + z.power);
    }
  }
  return { aggro: kept, expiresAt: now + tune.aggroLasts };
}

// Engage point: stand at half the weapon range from the target, on the zombie's side,
// plus a second point rotated 45 degrees around the target (side = +1 or -1).
function engagePoints(self: Pt, target: Pt, weaponRange: number, side: 1 | -1): { primary: Pt; secondary: Pt } | undefined {
  const dx = self.x - target.x;
  const dz = self.z - target.z;
  const d = Math.hypot(dx, dz);
  if (d === 0) return undefined; // no move order
  const k = (weaponRange * ENGAGE_RATIO) / d;
  const rx = dx * k;
  const rz = dz * k;
  const s = Math.sin(ORBIT_RAD) * side;
  const c = Math.cos(ORBIT_RAD);
  return {
    primary: { x: target.x + rx, z: target.z + rz },
    secondary: { x: target.x + rx * c - rz * s, z: target.z + rx * s + rz * c },
  };
}

// Stuck check: a unit that moved less than STUCK_DIST since its last sample gets a no-go disc
// at its spot (max NOGO_MAX, oldest dropped) and must reroute. The sample always advances.
interface Mover extends Pt { lastX: number; lastZ: number; noGo: Pt[]; }
function stuckCheck(m: Mover, exemptRememberedGoal: boolean): boolean {
  const moved2 = (m.x - m.lastX) ** 2 + (m.z - m.lastZ) ** 2;
  m.lastX = m.x;
  m.lastZ = m.z;
  if (exemptRememberedGoal || moved2 >= STUCK_DIST * STUCK_DIST) return false;
  const inside = m.noGo.some((g) => dist(g, m) < NOGO_RADIUS);
  if (!inside) {
    if (m.noGo.length >= NOGO_MAX) m.noGo.shift();
    m.noGo.push({ x: m.x, z: m.z });
  }
  return true;
}
```

## 5. Lands in

- TARGET `src/fight/aggro.ts` (new module, proposed): the zone pack director (the power gate, the keep, the least-loaded split) and the per-attacker engage point. Parity-checklist row 4 (fight loop: aggro, chase, leash). Server tick sub-line for the director's cadence: post-K item 3, "server tick: fixed step, input intake, per-tick NPC budget", not row 4.
- today: (not read) in the Frankendom repo.
- Reuse tag: rewrite-from-idea (GPL v2 or later, clean-room only; the sketch is written from the described mechanism)
- Brief rule served: 1 (many-on-one target choice lives in the engine, one combat core); zones as data for the director's numbers.
- Best transferable idea: Re-check a wandering group against a power ratio on a fixed cadence; when it passes, hand the group to the least-loaded player, strongest members first, and keep each assignment only while its target is alive and out of reach.
- Decision (proposed): adapt — keep the gate and the least-loaded split as a zone director that decides which player a pack pressures, because zones are data and the engine owns target choice; drop the uncapped swarm, because MAX_ATTACKERS = 3 caps attackers per target and this donor has no cap.
- Acceptance: A server test with player power 100 and pack power 5 gives no aggro; with pack power 50 the pack is split across two players by power (strongest first, least-loaded player next), and no player has more than 3 attackers at once.

## 6. Gaps and risks

- GPL v2 or later: clean-room only. The sketch is written from the mechanism, not translated from the Lua.
- No attacker cap. The donor lets every zombie in the gate pile onto one target. Frankendom's MAX_ATTACKERS = 3 needs a separate slot rule in the engine. Do not copy the swarm.
- Targets are whole ally teams with many units. Frankendom has one character and one ledger per player, so the split must be per player or per party, and the server owns it. Kills stay server-verified.
- The power gate uses a unit-def `power` value summed over teams. Frankendom has no equivalent score in the rulings. A new zone-data field is needed, and it should be set per zone, not guessed.
- The donor uses engine pathing and traversability (`spTestMoveOrder`, 659-663). Frankendom has no pathing for a duel. Only the shape of the engage point and the 50-unit stuck test transfer.
- The cadence (30 s check, 60 s hold) is in game frames x gameSpeed, so the real time depends on the engine. Frankendom should state these as ticks on the server tick, not seconds.
- The orbit at 45 degrees is a positioning idea. It could feed a 3-slot ring, but it is not checked against MAX_ATTACKERS here.
- Not read: the scripted aggro callers (`GG.ZombieAI`), `defPower`, and the engine's nearest-enemy semantics. Do not claim how the scripted path is used.
