# STJr-SRB2 (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/STJr-SRB2/src/p_user.c` | Licence: GPL version 2 (file header line 8: "terms of the GNU General Public License, version 2."; no "or later" in the header; the LICENSE file is the GPL-2.0 text) | C | symbol `P_LookForEnemies`

Checked: Symbol `P_LookForEnemies` is at p_user.c 9370-9453 (read in full, including its header comment at 9362-9369). Constants read: doomdef.h 470, tables.h 42 and 55, p_local.h 44. Callers: grep shows p_user.c 4831, 5187 and 5308, and lua_baselib.c 1675. Read in context: 4822-4840 (the gunslinger caller, with its reticle code). Seen by grep only (surrounding conditions not read): 5187 and 5308. Not read: the definitions of R_PointToDist2, R_PointToAngle2, P_ReturnThrustX and P_CheckSight (p_sight.c 380); P_HomingAttack (p_user.c 9455, which the header says must change in step); the enclosing function of the gunslinger call, so how often the search runs per tic is not known. Confidence: high on the order of tests and the numbers; moderate on the call rate. camera_scope: n/a (the lock code does not move the camera; see section 6).

## 1. Mechanism

- One call searches the level's map objects (thinkers) for the best target for a lock-on, from the seeker's position and facing. Inputs: the player, a flag `nonenemies` (whether monitors and springs count), and a flag `bullet` (aimed shot or homing). Output: the nearest valid candidate, or NULL.
- Mode first (9375-9376): reach = 512 units (RING_DIST) for homing, twice that for bullet, both scaled by the player's scale. Cone span = 30 degrees for bullet, 90 degrees for homing.
- Order of tests for each map object, as the code runs (9380-9449):
  (a) skip removing thinkers (9382), no-clip objects (9387) and dead objects, health <= 0 (9390);
  (b) validity (9393-9394): an object is kept when its enemy, boss, monitor-and-shootable or spring flags match, flipped by MF2_INVERTAIMABLE. In code the `!` and `==` make it skip when validity equals the invert flag;
  (c) skip the seeker itself (9396) and MF2_FRET objects (9399);
  (d) when `nonenemies` is false, springs are skipped in both modes, and monitors are skipped only in homing mode (9402);
  (e) detonators skipped for homing (9405);
  (f) distance block (9408-9430): centre-to-centre height difference `zdist` (9409) and horizontal distance `dist` (9410). Bullet: skip if the elevation angle of (dist, zdist) lies outside the span, so the vertical half-cone is also 30 degrees (9411-9415). Homing, upright seeker: skip if the object's base is more than MAXSTEPMOVE (24 units) above the seeker's base (9416-9424; the flipped-gravity branch is the mirror image). Then `dist` becomes 3D (9427) and must not exceed maxdist (9428-9429);
  (g) in 2D levels, skip if out of the plane (9432-9434); skip other players (9436-9437);
  (h) closest-so-far gate (9439-9440): skip if a closest exists and this distance is larger. Equal distances pass, so a later object replaces an earlier one at a tie;
  (i) horizontal cone (9442-9443): the angle from a point one radius ahead of the seeker to the object, minus the facing, must lie within the span (the unsigned test `(x + span) > span*2` accepts only the range from -span to +span);
  (j) line of sight, last (9445-9446);
  (k) keep it as the closest (9448-9449).
- Result: the nearest object that passes all tests, by 3D distance. The cheap distance and cone tests run first; the sight test runs only for objects that are already nearer than the best so far.
- Caller context, gunslinger (4825-4831): the search runs only when the player has no vertical momentum, is on the ground, is not in weapon delay and can stand, and its speed is at most 10 units scaled (`player->speed > FixedMul(10<<FRACBITS, scale)` skips the search). If a target is found, the reticle is spawned only for the local player: a MT_LOCKON map object at the target's position, with its target set to the lock and `drawonlyforplayer` set to the player (4834-4839).

## 2. Key functions

- `P_LookForEnemies`: `/mnt/frankendom-donors/STJr-SRB2/src/p_user.c` 9370-9453. The whole search: mode setup, thinker scan, validity, distance, cone, sight, closest.
- Gunslinger caller: `/mnt/frankendom-donors/STJr-SRB2/src/p_user.c` 4825-4840. Speed and grounded gate, the search, and the local reticle.
- Other callers (grep only): p_user.c 5187 (homing shield, bullet false, nonenemies false) and 5308 (homing thok, nonenemies true, bullet false), and lua_baselib.c 1675 (the same search exposed to scripts).
- What each caller allows, from the flag tests above (derived from the code, not run): bullet (4831) takes enemies, bosses and monitors, and skips springs; homing shield (5187) takes enemies and bosses, and skips monitors and springs; homing thok (5308) takes every valid object, including springs and monitors.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant |
|---|---|
| Reach by mode | 512 units (`RING_DIST 512*FRACUNIT`, doomdef.h 470), doubled for bullet (9375), times the player's scale |
| Horizontal cone | Bullet: 30 degrees, `ANG30` = 0x15555555 (tables.h 42), a twelfth of a full turn. Homing: 90 degrees, `ANGLE_90` = 0x40000000 (tables.h 55), a quarter turn. Total cone is twice the span (9443) |
| Vertical cone | Bullet only, same span as the horizontal cone (9413) |
| Homing height limit | MAXSTEPMOVE = 24 units (`#define MAXSTEPMOVE (24*FRACUNIT)`, p_local.h 44), above the seeker's base (9423) |
| Gunslinger speed gate | 10 units, scaled (4827) |
| Ties | Equal distance: the later object in the list wins (9439) |
| Selection | Nearest by 3D distance, after the cheap gates (no score beyond distance) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order of cheap gates, the nearest-wins rule with the same equal-distance behaviour, the cone origin one radius ahead of the seeker, and the bullet elevation test. It replaces the flag word and the MF2_INVERTAIMABLE flip with an allowed-kinds set per ability, uses radians for angles, and moves the player skip to the top of the loop. It omits the MF2_FRET, no-clip, detonator and flipped-gravity branches and the 2D plane check. It uses Math.hypot for the donor's R_PointToDist2 and R_PointToAngle2 (their definitions were not read), and takes line of sight as a callback standing in for P_CheckSight (not read).

```ts
// Licence: GPL-2.0 (donor header: "terms of the GNU General Public License, version 2"). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Kind = "enemy" | "boss" | "monitor" | "spring" | "player";

interface Body { x: number; y: number; z: number; height: number; }
interface Candidate extends Body { id: number; alive: boolean; kind: Kind; }
interface Seeker extends Body { facing: number; radius: number; }  // facing in radians

interface LockOpts {
  bullet: boolean;               // true: aimed shot (long reach, narrow cone); false: homing
  rangeUnits: number;            // data: reach (donor: 512 units, doubled for bullet)
  coneHalfRad: number;           // data: horizontal half-cone (donor: 30 deg bullet, 90 deg homing)
  maxElevationRad: number;       // data: vertical half-cone, bullet only
  stepUnits: number;             // data: homing only, highest a target may sit above the seeker's z
  allowKinds: Set<Kind>;         // data per ability (donor: the three call sites differ here)
  sight: (from: Body, to: Candidate) => boolean;
}

function wrapRad(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

// Nearest valid target in the seeker's cone. Cheap tests first, sight last.
function lockOn(me: Seeker, all: Candidate[], o: LockOpts): Candidate | null {
  let best: Candidate | null = null;
  let bestDist = 0;
  for (const c of all) {
    if (!c.alive || c.kind === "player" || !o.allowKinds.has(c.kind)) continue;

    const h = Math.hypot(me.x - c.x, me.y - c.y);                 // horizontal distance
    const dz = (me.z + me.height / 2) - (c.z + c.height / 2);     // centre-to-centre height
    if (o.bullet) {
      if (Math.abs(Math.atan2(dz, h)) > o.maxElevationRad) continue;
    } else if (c.z > me.z + o.stepUnits) {
      continue;                                                  // too far above the seeker
    }
    const d = Math.hypot(h, dz);                                   // 3D distance
    if (d > o.rangeUnits) continue;
    if (best && d > bestDist) continue;                            // equal distance passes, so a later candidate wins a tie

    const ox = me.x + Math.cos(me.facing) * me.radius;             // cone origin: one radius ahead of the seeker
    const oy = me.y + Math.sin(me.facing) * me.radius;
    const off = wrapRad(Math.atan2(c.y - oy, c.x - ox) - me.facing);
    if (Math.abs(off) > o.coneHalfRad) continue;

    if (!o.sight(me, c)) continue;
    best = c;
    bestDist = d;
  }
  return best;
}
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (file /tmp/hu009tc2/lock-on.ts): exit 0.

## 5. Lands in

- TARGET `src/fight/lock-on.ts` (new engine module: the target choice for an aimed or homing lock). Parity-checklist row 4 (fight loop: aggro, chase, leash), because picking the target is the engine's job under the many-on-one ruling. The reticle that shows the lock is the HUD (row 14) and is not part of this note.
- today: not read in the Frankendom repo; this note does not check what exists there.
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
- Brief rule served: 1 (one engine: the target choice is made in the engine and the client only draws the reticle)

## 6. Gaps and risks

- GPL-2.0 (no "or later"): clean-room only. The sketch is written from the described mechanism.
- Donor defects, each with its fix (the idea is kept):
  1. Ties go to whichever object the thinker list reaches last, because equal distance passes the gate (9439). fix: break ties on a stable id, so two clients or the server pick the same target.
  2. Two reference heights are used: the bullet test uses centre-to-centre height (9409), and the homing step test uses the base (9423). fix: use one reference (centre) for both, or name the reference in the data.
  3. The validity test is a flag XOR with MF2_INVERTAIMABLE (9393-9394), easy to misread. fix: an explicit allowed-kinds set per ability, as in the sketch. This is clarity, not a change of behaviour.
  4. The search walks every map object on every call (9380-9450). It is gated (4825-4827) but the call rate is not read. fix: query only the zone's live enemies through a spatial bucket; the list would then be bounded by the zone population cap (parity row 23), which is a Frankendom rule and not a donor rule.
- The donor has no stickiness: each call re-picks from nothing, so two targets at near-equal distance can swap from one call to the next. This is a gap, not a bug in the donor. fix (Frankendom design): keep the current lock while it stays inside a wider cone and range, and drop it only when it leaves that wider zone.
- Rulings: server-verified kills. The donor does the pick where the ability runs; its networking was not read. Frankendom: the client may propose a lock id, and the server re-runs the range, cone and sight tests before any damage is applied. One ledger: the locked target id goes into the fight record. MAX_ATTACKERS = 3: a lock picks one target and does not count attackers; the attacker list is the engine's separate list.
- Camera: none of the lines read (9370-9453 and 4822-4840) move the camera. The reticle is the only visible lock feedback in this code. The world-camera question (framing a lock in a crowd) is not answered by this donor.
- Second candidate, not written as a note (one note per cell): the emerald hunt radar in st_stuff.c 2545-2612 (read in full) and the item finder 2614-2698 (read in full). The radar tracks up to three hunt objects: the first three emerald objects in the list (p_user.c 9522-9540). A slot is cleared when its emerald is picked up (p_inter.c 742-747). The slots are rebuilt only by P_FindEmerald, which is called at level load (g_game.c 1888) and at g_game.c 2793, inside G_PlayerReborn (the context of that call was not fully read). Each is drawn as an icon in one of six distance bands (under 128, 512, 1024, 2048, 3072 units, icon 5 down to 0). The beep uses the smallest positive interval among the hunts (5, 10, 20, 30, 35 tics by band; none beyond 3072), so the nearest one sets the rate. It is a proximity pinger for targets the player cannot see, and fits a HUD target strip. The sound is gated on not paused and a new render tick (2610).
- String table (hud-ui topic): `M_GetText` is gettext when GETTEXT is defined (doomdef.h 545-546) and an identity macro otherwise (549). Translations are in `src/locale/`. `en.po` has 821 entries (822 `msgid` lines less the header); all 821 have an empty `msgstr`, so the English text is shown as the source string (GNU gettext behaviour for empty msgstr; the gettext library was not read). `srb2.pot` has 856 entries. Grammar, read from the file: standard PO, one `msgid` and one `msgstr` per entry; multi-line strings use quoted continuation lines (335 quoted lines in total, the header's included); `#:` source references (842 lines); `#, c-format` on 361 entries; `#, fuzzy` on the header only; no `msgid_plural` and no `msgctxt`, so no plural rules and no context keys. 606 `msgid` lines contain `\n` and 338 contain `%`. Source strings also carry colour control bytes (st_stuff.c 1769); en.po has no escaped `\x8` forms (grep count 0), and how those bytes are handled was not read.
- Callers 5187, 5308 and the Lua binding were seen by grep and not read in context; the claims about what each allows come from the flag tests in the function, not from running it.
- P_HomingAttack (p_user.c 9455) is not read, so the homing hit is not described here.

Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
Brief rule served: 1 (one engine: target choice in the engine). Rules 7-9 n/a.

Best transferable idea: a lock-on search that gates by cheap range and cone tests first, picks the nearest valid target, and checks line of sight last, with reach and cone set per attack mode as data.
Decision (proposed): adapt — take the cone, nearest-wins and sight-last order with reach and cone as ability data, and fix the donor's tie rule, reference height and full-list scan; add the stickiness the donor lacks. Reject the flag-word validity and the vertical-flip branches, which do not fit our rulings. Why: this is the target choice for many-on-one fights and fits row 4 once the server re-checks it.
Acceptance: a server test with two enemies at equal distance locks the lower id every time; a target outside the cone or behind a wall is never locked; a lock stays on a target that drifts slightly out of the narrow cone; a homing lock cannot pick a target more than the step height above the seeker; the server rejects a lock id that fails its range, cone or sight test.
