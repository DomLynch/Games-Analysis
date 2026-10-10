# pmbstyle-L2Solo (anticheat-validation, cell 6)

Donor: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Actor/Attack.js` (with `Actor/Generics/AttackRequest.js`, `Actor/Generics/AttackExec.js`, `Automation.js`, `Actor/AttackRange.js`, `Network/Request/Attack.js`, `Network/Request/ValidatePosition.js`) | Licence: Apache-2.0 (LICENSE file is the Apache 2.0 text, version 2.0 January 2004; no NOTICE file at the root; package.json says "SEE LICENSE IN LICENSE") | JavaScript (Node.js) | symbols `Attack.meleeHit`, `Automation.scheduleAction`, `Automation.refreshPlayerAttackApproach`, `AttackRange.isWithinRange`, `AttackExec` (attackExec)

Checked: Read in full: `Network/Request/Attack.js` (all 27 lines), `Generics/AttackRequest.js` (all 58 lines), `Generics/AttackExec.js` (all 49 lines), `Actor/AttackRange.js` (all 116 lines), `Automation.js` scheduleAction (256-330) and refreshPlayerAttackApproach (405-423), `Attack.js` meleeHit (101-215, 216-278 for impact and cycle timers), `Network/Request/ValidatePosition.js` (all 61 lines), `Generics/UpdatePosition.js` (all 42 lines), `Network/Request/MoveToLocation.js` (all 41 lines). Partly read: `Automation.js` arrival (330-352; the rest of `arrive` not read). Not read: `blockedPvpDefense`, `checkParticipants`, `RaidCurse.normalAttackBlocked`, `Formulas.calcMeleeAtkTime`, `Formulas.calcHitChance`, `Automation.ticksToMove`, `actionStopCoords`, `resolveMeleeTargets`, `prepareMeleeHit`, `hit()`, `ArenaCombatRules.canInteract`, `Automation.needsGeodataApproach`, `Select.js` beyond the attack branch. Candidate files opened (more than three, as the brief asks for PARTIAL or NONE; this cell is STRONG): AttackRequest.js, AttackExec.js, Attack.js, Automation.js, AttackRange.js, Request/Attack.js, Request/ValidatePosition.js, UpdatePosition.js, MoveToLocation.js, PlayerMoveDestination.js (25 lines, a Z correction for the destination only). The hint file `src/GameServer/Crafting/ManufactureShop.js` was not opened; the attack path is in the files above, not in a crafting shop. camera_scope: not applicable. Confidence: high on the three range checks and the earlier-only deadline (read end to end); high on the `ctrl: true` data path (read from parser to AttackExec, not run); medium on the arrival and impact gates that were not read (PvP defence and participant checks are named but not read). Licence and file reads were checked with the receipts.

Best transferable idea: Decide a hit on the server at three moments (when the approach is scheduled, when the swing starts, and at impact after the draw time), and let a client position report only finish an approach early or shorten its deadline, never extend it; the range checks guard the target's movement, not the actor's own reported position.

Decision (proposed): adapt - take the three-point range re-check and the earlier-only approach deadline for the duel's strike step; do not take the attack parser's hard-coded `ctrl: true` or the trusted position report, which the duel must not have.

Acceptance: A server test swings from a 40-range melee, lets the target walk out of range during the draw, and expects no damage at impact and the next swing to re-schedule the approach; a second position report during an approach cannot push the arrival later than the first.

## 1. Mechanism

- Entry: the C4 attack packet is parsed into `id`, the client's source X/Y/Z (read but not used for the range decision), and `ctrl: true` (`Network/Request/Attack.js` 3-21). `consume` passes it to `actor.select(data)` (24), which calls `Generics.attackRequest` for a second click on a target (`Select.js` 185, 204, 231).
- Request gates (`AttackRequest.js` 12-52): a dead actor is ignored (16-18); an actor whose effects block attacks gets an action-failed reply (20-23); a blocked actor queues the attack (27-30). Otherwise the server clears stored actions (32). If the actor cannot move, it attacks at once from its authoritative position (36-39). If it can move, it stops automation (50) and then calls `attackExec` (51). The client's position is not trusted for the decision here.
- Target and range (`AttackExec.js` 9-45): the server range comes from `fetchNormalAttackRange`, which prefers `data.range` when positive, then the item's own range, then bow (700 plus an effect add), pole (66), or 40 for any other weapon kind (`AttackRange.js` 42-64). The server looks up the target by id: NPC first (12), then a user (22). It schedules the action with `scheduleAction(..., attackRange, ..., { collisionAware: true })` (13, 23).
- Schedule (`Automation.js` 256-330): the collision-aware range is the radius plus both collision radii (275-277; `AttackRange.js` 81-85). If already in range, the callback runs now (279-283). Otherwise the stop radius is `range - min(10, range/4)` (286-288), so the player stops inside range. If the actor cannot move, the callback runs only if the distance is within the stop radius, else the action is rejected (289-296). Otherwise the server sends a move-to-pawn packet and computes the travel time with the run speed (311-318). For a player's own weapon attack, an approach record holds a deadline `dueAt = now + ticks` (325-326). Arrival sets the player's position to the stop coordinates but keeps the player's latest accepted height (340-345).
- Position reports during an approach (`refreshPlayerAttackApproach`, 405-423): a report from the player ends the approach at once if the actor is now in range (409-413). Otherwise it recomputes the travel time and moves the deadline earlier only (417-420). The donor says so in its comment: "Duplicated or older reports must not extend the original deadline" (418). `UpdatePosition.js` 25 calls this from the update path that every accepted report goes through.
- Swing start (`Attack.js` 101-127): the melee range is re-checked (117). Out of range, the approach is rescheduled and no hit happens (122-126). In range, a bow consumes an arrow (128), then the soulshot is loaded if auto-shot is on (131-148). The attack speed sets the timing: draw `calcMeleeAtkTime(atk) * 0.644`, cycle `calcMeleeAtkTime(atk)` (150-156). Each target gets a hit roll from `Formulas.calcHitChance(..., Math.random, ...)` at swing start (164-167). Extra polearm targets get damage times 0.85 and then divided by 1.15 for each further target (163, 169-171). The attack packet goes to both clients at swing start (185-191), so the animation shows before the damage.
- Impact (timer at `drawMs`, 194-242): the gates run again (blocked PvP, participants, raid curse: 201-212). Each victim is checked again: a dead target is skipped (219), and a melee victim out of range is skipped (222). A landed hit calls `hit()` and then the absorb and critical hooks (225-233). A miss sends the missed-hit text for the primary target (235-236).
- Cycle timer at `cycleMs` (244-278): the same gates run again, and a melee swing repeats `meleeHit` on the same creature (251-268).
- Tick: no fixed frame loop. Each swing is a pair of one-shot timers (`queueTimer`) set from the attack speed. The position reports drive the approach, not a tick.

## 2. Key functions

- `attackRequest`: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Actor/Generics/AttackRequest.js` 12-52.
- `attackExec`: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Actor/Generics/AttackExec.js` 9-46.
- `fetchNormalAttackRange`, `effectiveRange`, `isWithinRange`: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Actor/AttackRange.js` 42-64, 81-89.
- `scheduleAction`: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Automation.js` 256-330.
- `refreshPlayerAttackApproach`: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Automation.js` 405-423.
- `meleeHit`: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Actor/Attack.js` 101-127 (gate, range, timing, roll), impact timer 194-242, cycle timer 244-278.
- `validatePosition`: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Network/Request/ValidatePosition.js` 9-37 (the report path; see section 6).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Server weapon range by kind | Melee 40 (AttackRange.js 6), polearm 66 (7), bow 700 (5) plus an effect add (56) |
| Effective range includes both collision radii | Radii from `fetchRadius` / model, values not read |
| Stop inside range by a margin | `min(10, range / 4)` (Automation.js 287): 40 range stops at a 30 stop radius (margin 10), 66 stops at 56 (margin 10) |
| Draw point inside one swing cycle | 0.644 of `calcMeleeAtkTime` (Attack.js 155); cycle is the full `calcMeleeAtkTime` (156); the formula was not read |
| Secondary polearm targets | 0.85 for the first extra target, then /1.15 for each further target (Attack.js 163, 171) |
| Approach deadline | `now + ticks`, lowered only (Automation.js 326, 419-420); `ticksToMove` not read |
| Reports during approach | Ends at once in range (Automation.js 409) |

Worked from the numbers (not measured, and the collision radii and draw time are example values): a 40-range melee stops its approach at a 30 stop radius. If the draw time were 300 ms, impact would fire 300 ms after the swing starts, and a target that stepped out of 40 range in that time would take no damage (Attack.js 222), as far as the checks read here go.

## 4. TypeScript sketch

simplified: keeps the donor order: a position report ends the approach when in range or lowers its deadline; the swing starts only in range and rolls the hit on the server; impact checks death and range again before any damage. It omits: the PvP defence and participant gates, the raid-curse check, the soulshot and bow reload, the absorb and critical hooks, the polearm secondaries, the geodata approach test, and the donor's `ticksToMove` (travel time here is distance over run speed). The donor takes the reported position as given (`UpdatePosition.js` 14, `ValidatePosition.js` 35), and the sketch does the same on purpose so the gap is visible. The collision radii and stop margin are passed in as numbers, not read from the donor.

```ts
// Licence: Apache-2.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Vec = { x: number; y: number; z: number };
interface Fighter { pos: Vec; radius: number; hp: number; dead: boolean }

const STOP_MARGIN_MAX = 10;  // stop inside range by min(10, range / 4)
const DRAW_FRACTION = 0.644; // impact point inside one swing cycle (donor Attack.js 155)

function dist2d(a: Vec, b: Vec): number { return Math.hypot(a.x - b.x, a.y - b.y); }

// Effective range adds both collision radii.
function inRange(src: Fighter, dst: Fighter, range: number): boolean {
  return dist2d(src.pos, dst.pos) <= range + src.radius + dst.radius;
}

function stopRadius(range: number): number {
  return Math.max(0, range - Math.min(STOP_MARGIN_MAX, range / 4));
}

interface Approach { src: Fighter; dst: Fighter; range: number; dueAt: number }

// Position report during an approach. The donor takes the reported position as given (see gaps).
// The approach ends at once when in range; otherwise the deadline may only move earlier.
function onReport(a: Approach, reported: Vec, now: number, runSpeed: number): "arrived" | "waiting" {
  a.src.pos = reported;
  if (inRange(a.src, a.dst, a.range)) return "arrived";
  const travelMs = Math.max(0, dist2d(a.src.pos, a.dst.pos) - stopRadius(a.range)) / runSpeed * 1000;
  const dueAt = now + travelMs;
  if (dueAt < a.dueAt) a.dueAt = dueAt; // older or duplicate reports cannot extend the deadline
  return "waiting";
}

interface SwingPlan { hitLanded: boolean; impactAt: number; nextSwingAt: number }

// Swing start: range checked again, hit rolled on the server, impact scheduled at the draw point.
function startSwing(src: Fighter, dst: Fighter, range: number, now: number, cycleMs: number,
                    hitChance: number, rng: () => number): SwingPlan | null {
  if (src.dead || dst.dead || !inRange(src, dst, range)) return null;
  return {
    hitLanded: rng() < hitChance,
    impactAt: now + cycleMs * DRAW_FRACTION,
    nextSwingAt: now + cycleMs,
  };
}

// Impact: the target may have died or walked out of range during the draw. Damage is applied only then.
function impact(src: Fighter, dst: Fighter, range: number, plan: SwingPlan, damage: number): number {
  if (dst.dead || !inRange(src, dst, range)) return 0;
  if (!plan.hitLanded || damage <= 0) return 0;
  dst.hp -= damage;
  if (dst.hp <= 0) dst.dead = true;
  return damage;
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS with `export {}` appended (work/l2solo-strike.ts), exit 0.

## 5. Lands in

- TARGET `src/fight/strike.ts` (new, proposed; not checked against the Frankendom repo): the duel's swing start, impact and re-check. The duel's kill is decided here, on the server, at impact.
- Parity row 1 (duel step / sim). This is the closest fit. Row 10 (hit impact / hitstop) is the presentation side: the donor's impact timer is the simulation's hit point, and the animation shows at swing start (Attack.js 185-191), so the row-10 presentation can run ahead of the server's verdict. No row names the position-report rule; it is closest to row 5 (controls / input) and is covered in section 6.
- Reuse tag: rewrite-from-idea (Apache-2.0: adaptable under its terms; this note uses a clean-room sketch)
- Brief rule served: kills server-verified (the hit is rolled and checked on the server at impact); one engine (range and timing live in one module, not in the client)

## 6. Gaps and risks

- The attack parser hard-codes `ctrl: true` for every attack packet (`Network/Request/Attack.js` 19). `attackExec` then takes the forced-attack branch for any target: an NPC is attackable regardless of its flag (`AttackExec.js` 6), and a user is handled inside the PvP branch whatever its PvP flag or karma (24). The donor's other gates (PvP defence, participants) were not read, so the real effect is not known. For Frankendom: permissions come from server state about the target, never from a field the client sends.
- Position reports are trusted. `ValidatePosition.js` checks only the effect block (28-30) and a falling rule (33, 39-58), then calls `updatePosition(data)` (35), which writes the reported coordinates (`UpdatePosition.js` 14). No speed or distance check exists in these three files (read). A client can therefore report a position inside attack range and end an approach early (`Automation.js` 409). Every range check in the attack path (`Attack.js` 117 and 222, `Automation.js` 279 and 409) measures from the actor's stored position, which the report just set. So a false position passes all of them: the checks guard the target's movement, not the actor's position. Frankendom needs a speed bound on reported positions, or server-owned movement (the Luanti note in this folder has the pool-and-rewind shape; the TFS note has the server-paced walk clock).
- Click-to-move is server-paced: `MoveToLocation.js` sends the destination into `moveTo`, and the server runs the route (41), so that path does not depend on reports. Only free-move reports are unchecked.
- The attack range accepts `data.range` when it is positive (`AttackRange.js` 43-46). The C4 parser does not set it, so the client cannot set it through this packet (`Request/Attack.js` 3-21). Other callers were not checked. Frankendom should not have a range field the client can set.
- The arrival keeps the player's latest accepted height (`Automation.js` 340-345), so a stop at a different floor is not corrected; the donor's comment says it avoids a false fall.
- The hit roll and the damage are separate moments (165 and 227). A target that is already dead at impact is skipped (219). The roll itself is kept on the swing, not on the target. Frankendom's one ledger must record the verdict at impact.
- The donor's comment on the approach, "Players report position intermittently", means the arrival is an estimate. Frankendom's acceptance tests must cover a silent client.
- Apache-2.0: adaptation is allowed. The sketch is a clean-room shape, not a copy.
