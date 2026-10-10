# beyond-all-reason-Beyond-All-Reason (anticheat-validation, cell 3)

Donor: `/mnt/frankendom-donors/beyond-all-reason-Beyond-All-Reason/luarules/gadgets/game_disable_assist_ally.lua` | Licence: gadget header "GNU GPL, v2 or later" (line 9); repo LICENSE.md line 2 "BAR game code is released under the GPL v2 licence"; clean-room only | Lua (Recoil/Spring synced gadget) | symbol `gadget:GameFrame` (sampled guard `AllowUnitBuildStep`)

Checked: read `game_disable_assist_ally.lua` (197 lines) in full. Also read the gadget dispatch `gadgetHandler:AllowUnitBuildStep` (gadgets.lua 1910-1922) and the `UpdateCallIn` header (1067-1080). Comment at unit_builder_priority.lua 14-18 read. Candidates opened: game_disable_assist_ally.lua, game_prevent_excessive_share.lua (read in full, 63 lines; a second candidate, see section 6), game_tax_resource_sharing.lua (grep only, `AllowUnitBuildStep` at 276, not read), api_permissions.lua (grep only), dbg_synctest.lua (not read). Not read: the engine side of the callins (what the engine does with a refusal beyond the handler's loop), the values of `Game.spawnWarpInFrame` and `Game.gameSpeed` (engine-supplied), whether the engine keeps `math.random` identical on every client, the `gadgetHandler:UpdateCallIn` body beyond its first lines. Confidence: high on what the gadget does and in what order (read in full); medium on the seed-1 edge case (reasoned from the code, not run); medium on the callin semantics (handler read, engine not). camera_scope: n/a.

Best transferable idea: Run a cheap per-command filter on every intake, and a costly whole-world invariant check only on sampled frames, while queueing any entity whose state changed by a path that skipped the filter for an end-of-tick sweep that removes disallowed pending actions by tag.
Decision (proposed): adapt - take the filter-plus-sweep shape and the sampled invariant for expensive whole-world checks only; do not sample the per-command filter, and do not use an unseeded random source on the server.
Acceptance: A server test: a pending attack queued before a locked state is removed at end of tick and logged to the fight record; a planted illegal command is refused on its first intake (never sampled); a sampled invariant seeded from the server tick flags a planted inconsistent fighter state within one sample period.

## 1. Mechanism

- Filter at issue time. `gadget:AllowCommand` (134-140) runs for each order. For units that can spend resources when assisted (`canBuildStep`), it returns `isBuilderAllowedCommand(...)` (138). The donor returns false to refuse the order (the engine's handling of that return was not read). The rules (78-91): a guard on an allied unit is allowed only when the target is complete and cannot be assisted (80); repair on an allied unit only when complete, with area repair always allowed (81-85); the roam move state is refused (86-87); everything else is allowed.
- Queue for paths that skip the filter. Units created with an allied builder (125-126) and units given to a new non-gaia team (155-158) are added to `checkUnitCommandList`. A build step by another team on an unfinished unit is refused and the builder is queued (179-181; the queue key is the builder, line 180).
- Sweep. `gadget:GameFramePost` (170-175) drains the queue each frame. For each live unit (165), `validateCommands` (93-108) walks the unit's commands, collects every disallowed tag (99-102) and removes them in one order (105-107, `CMD.REMOVE`). The gadget sends no message to the player (whole file read).
- Sampled guard. `AllowUnitBuildStep` (178-184) refuses a build step where the builder and unit teams differ, the step is positive and the unit is being built (179), and queues the builder (180). The engine calls it only while the callin is registered. `gadget:GameFrame` (188-196) registers it on frames where `frame % seed == 0` (189-191). On the first frame after that which is not a multiple of the seed, it unregisters the callin and draws a new seed from 1 to 119 (192-195). The first seed is drawn from `Game.spawnWarpInFrame + 1` to `Game.spawnWarpInFrame + Game.gameSpeed - 1` (186).
- Dispatch. `gadgetHandler:AllowUnitBuildStep` (gadgets.lua 1910) loops over the gadgets that registered for it and returns false at the first refusal (1913-1916). A refused step records no marks and no totals (1920).

Order of operations per frame: the synchronous filter runs when an order is issued; the sampled build-step refusal runs during the frame's build steps (only on armed frames); the sweep runs in `GameFramePost`, after the frame, and removes what the filter would have refused.

## 2. Key functions

- `isBuilderAllowedCommand`: `/mnt/frankendom-donors/beyond-all-reason-Beyond-All-Reason/luarules/gadgets/game_disable_assist_ally.lua` 78-91. The per-command allow list used by both the filter and the sweep.
- `validateCommands`: same file, 93-108. Collects disallowed tags and removes them.
- `gadget:AllowCommand`: same file, 134-140. The synchronous filter.
- `AllowUnitBuildStep` (local): same file, 178-184. The sampled refusal.
- `gadget:GameFrame`: same file, 188-196. The sampler: arm on multiples of the seed, otherwise disarm and re-draw.
- `gadgetHandler:AllowUnitBuildStep`: `/mnt/frankendom-donors/beyond-all-reason-Beyond-All-Reason/luarules/gadgets.lua` 1910-1922. Dispatch; first refusal wins.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| A cheap filter on every issued order | No number: a rule per command kind (78-91) |
| Sampled check on armed frames only, the sample is the frame index modulo a seed | Seed drawn once from `spawnWarpInFrame + 1` .. `spawnWarpInFrame + gameSpeed - 1` (186); re-drawn from 1 to 119 after each armed frame (195); the donor's own comment calls the build-step callin "damn expensive" (unit_builder_priority.lua 16) |
| Deferred sweep at end of frame, removing by tag | No number (105-107) |
| Refusal leaves no trace in the step totals | No number (gadgets.lua 1920) |

Edge case, from the code (not run): when a draw is 1, `frame % seed == 0` is true on every frame. The re-draw branch needs a frame where `frame % seed` is not zero, so it never runs. The guard then stays armed for the rest of the game. This is a cost issue, not a correctness issue in this gadget, but the donor's own comment says the callin is expensive (unit_builder_priority.lua 16).

## 4. TypeScript sketch

simplified: the sketch keeps the donor's allow rules per command kind, the synchronous filter at issue time, the sweep by tag, the armed-on-multiples sampler with a 1 to 119 re-draw after each armed frame, and the refusal of a cross-team build step while armed. It keeps the seed-1 behaviour as in the donor (the sampler stays armed when a draw is 1); it does not add a fix. It omits: the UnitCreated and UnitGiven queue paths (the sweep takes the same queue), the evaluation against the new team at sweep time (the donor evaluates the team; the sketch stores target flags on each command), the AllowUnitCreation blueprint rule, the engine removal call, the no-trace accounting in the dispatch, and the question of whether the engine's random source is identical on every client (the draw is a parameter here). It is clean-room, written from the described order, not a line-by-line translation.

```ts
// Licence: donor is GNU GPL v2 or later (gadget header). clean-room sketch of the pattern, not a translation of the donor lines.
type Team = number;
type Kind = 'guard' | 'repair' | 'movestate' | 'other';

interface Cmd {
  tag: number;
  kind: Kind;
  noTarget?: boolean;        // no target unit given
  areaRepair?: boolean;      // repair over an area, not a unit
  targetAllied?: boolean;    // target belongs to an allied team
  targetComplete?: boolean;  // target is finished building
  targetBuildStep?: boolean; // target spends resources when assisted
  moveRoam?: boolean;        // move state set to roam
}

interface Unit { id: number; team: Team; dead: boolean; canBuildStep: boolean; commands: Cmd[]; }

interface Sampler { seed: number; armed: boolean; }

// Same rules as the donor's builder allow-list, per command kind.
function allowedForBuilder(c: Cmd): boolean {
  if (c.kind === 'guard') return !c.targetAllied || (!!c.targetComplete && !c.targetBuildStep);
  if (c.kind === 'repair') return !!c.areaRepair || !!c.noTarget || !c.targetAllied || !!c.targetComplete;
  if (c.kind === 'movestate') return !c.moveRoam;
  return true;
}

// Synchronous filter at issue time. Units that cannot spend resources are never checked.
function allowCommand(u: Unit, c: Cmd): boolean {
  return u.canBuildStep ? allowedForBuilder(c) : true;
}

// Deferred sweep: each queued unit has every disallowed command removed, by tag, before the next frame's orders.
function sweep(queue: Set<number>, units: Map<number, Unit>): number[] {
  const removeTags: number[] = [];
  for (const id of Array.from(queue)) {
    queue.delete(id);
    const u = units.get(id);
    if (!u || u.dead) continue;
    for (const c of u.commands) if (!allowedForBuilder(c)) removeTags.push(c.tag);
  }
  return removeTags;
}

// Sampling: armed only on frames that are multiples of the seed. On the first unarmed frame after an armed one,
// the sampler disarms and draws a new seed from 1..119 (draw is the synced random source in the donor).
function sampleFrame(s: Sampler, frame: number, draw: (lo: number, hi: number) => number): boolean {
  if (frame % s.seed === 0) {
    s.armed = true;
    return true;
  }
  if (s.armed) {
    s.armed = false;
    s.seed = draw(1, 119);
  }
  return false;
}

// Build-step hook. It only runs while the sampler is armed (the donor registers the callin only then).
// A cross-team step on an unfinished unit is refused and the builder is queued for the sweep.
function allowBuildStep(
  s: Sampler, part: number, builderId: number, builderTeam: Team, unitTeam: Team, beingBuilt: boolean, queue: Set<number>
): boolean {
  if (!s.armed) return true;
  if (part > 0 && builderTeam !== unitTeam && beingBuilt) {
    queue.add(builderId);
    return false;
  }
  return true;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/invariants.ts` (proposed new module): the end-of-tick sweep that removes disallowed pending actions by tag and logs each removal, and a sampled whole-world invariant check run from the duel step. Parity-checklist row 1 (duel step / sim). The per-command filter is not here; it belongs at intake (row 5) and must run on every intake.
- today: (not read) - I did not open the Frankendom tree for this note.
- Reuse tag: rewrite-from-idea (GPL v2 or later; clean-room only)
- Brief rule served: ruling "server-verified kills" (the server decides which pending actions survive) and ruling "one engine" (the sweep and sampler sit in the one fight step, not in a client)

## 6. Gaps and risks

- Synced model, not server authority. This gadget runs as synced code on every client (the `IsSyncedCode` guard, lines 15-17), and its refusal changes a result. Every client must therefore draw the same seed (lines 186 and 195). Whether the engine guarantees that for `math.random` was not read. Frankendom has a server and does not need that, but its server path must not use an unseeded random source; any draw must come from the tick number so that a fight record can replay it (row 19).
- Sampling is a cost choice, not a guarantee. An illegal order that lands on an unsampled frame is not refused by the build-step guard; only the issue-time filter refuses orders, and it is not sampled. Do not sample the per-command filter in Frankendom.
- Silent removal. The sweep removes commands with no message to the player and no log entry (the whole file was read). Frankendom should log each removal to the fight record with the tag and the reason, and tell the player what was cancelled (our suggestion, not a donor fact).
- Seed-1 cost edge case (section 3). A draw of 1 leaves the sampler armed for the rest of the game. Frankendom's version must re-draw on the armed frame, not on an unarmed one, or cap the armed run.
- Rules are for builder allies, not for fighters. The allow rules are about assist, guard, repair and move state. The fight analogues (for example, a pending attack after a stagger) are different rules, so only the shape transfers.
- Second candidate, not written as a note: `game_prevent_excessive_share.lua` (read in full). `AllowResourceTransfer` (28-55) clamps a transfer to the receiver's headroom, sends the clamped amount with `Spring.ShareTeamResource` and refuses the rest; `AllowUnitTransfer` (57-63) refuses a unit transfer at the unit cap unless it is a capture or cheats are on. It fits row 18 (a loot or inventory cap that sends the remainder back) and is a candidate for a later cell.
- Licence GPL v2 or later. The sketch copies no donor lines; it is written from the described order.
