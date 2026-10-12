# DFHack-dfhack (city-map-design, cell 3)

Donor: `/mnt/frankendom-donors/DFHack-dfhack/plugins/buildingplan/buildingplan_cycle.cpp` (with `buildingplan.cpp`, `buildingplan.h`, `library/modules/Job.cpp`) | Licence: Zlib (`LICENSE.rst` line 7: "DFHack is distributed under the Zlib license"; line 11: "all use the ZLib license") | C++ | symbol `buildingplan_cycle`

Checked: Hint `plugins/export-world-map.cpp` was opened (`export_sites` 189-262) and is a CSV and WKT data export of sites and regions, not a layout mechanism. Searched the donor for town, road, city, minimap, landmark and signage words; DFHack is a fortress-mode tool with no town layout, roads, landmarks, signage or minimap code. Candidates opened (more than three): `export-world-map.cpp` (189-262), `blueprint.cpp` (680-725 and 1040-1062: building footprint encoding), `design.cpp` (headers and function list), `zone.cpp` (function list: unit assignment to pens and cages), `map-render.cpp` (1-40), `embark-assistant/matcher.cpp` (header and function list), `buildingplan.cpp` (73, 199-215, 290-355, 458-500, 1150-1215), `buildingplan_cycle.cpp` (191-445 read in full; 1-190 header and helper names only), `library/modules/Job.cpp` (599-631, `attachJobItem`). The note uses the material-gated construction queue because it is the only part that places a planned building one at a time. Not read: `buildingplan_cycle.cpp` 20-190 (walkability groups, item screens, the filter matcher body), `getBucket` past line 390, the finalize path past line 226, the persistence and reload path beyond 290-330, `blueprint.cpp` beyond the two ranges. Topic fit: medium. The STRONG verdict covers only the "services placed one at a time" part of the topic; the town-layout, road, landmark, signage and minimap parts have no code in this donor. Confidence: high on the cycle order, the distance metric and the finalize rule; high that the failed-attach branch makes no progress; medium on whether it is ever reached (only `attachJobItem` returns false, and only for an item already in a job, which the candidate list excludes). Camera scope: not applicable.

Best transferable idea: A planned building registers one task per unit of each required input, and each cycle attaches the nearest matching item to the first task in its FIFO, finalizing the building only when every input is delivered.
Decision (proposed): adapt - the wait-for-inputs queue (nearest-first, FIFO per filter, a priority move) suits a hub that is placed only after its inputs reach the one ledger, but the cycle becomes a server-tick budget and the failed-attach branch must make progress.
Acceptance: A town hub appears in the zone only after its last required item leaves the one ledger; the server attaches the nearest item first, and a server test with a forced attach failure shows the queue drains without repeating the same item.

## 1. Mechanism

- Registration (`registerPlannedBuilding`, buildingplan.cpp 458-500). A planned building is a suspended job. If all its job items are already attached, it is finalized at once (`isJobReady`, buildingplan_cycle.cpp 191-199). Otherwise, for each job item and each vector it can draw from, it pushes one task (building id, reversed job-item index) per unit of required quantity into `tasks[vector][bucket]` (buildingplan.cpp 490-492). The bucket key comes from the item filter (`getBucket`, buildingplan.cpp 378). Buckets are FIFO deques (buildingplan.h 15).
- Cycle timer (buildingplan.cpp 351). The cycle runs when requested or after `CYCLE_TICKS` = 599 frames (73; the comment says twice per game day). `do_cycle` calls `buildingplan_cycle` (343).
- Source order (buildingplan_cycle.cpp 400-441). Item vectors are scanned in turn, except BOULDER, WOOD, BAR and IN_PLAY, which are scanned last in that order (387-396). Each vector is handled by `doVector`.
- Candidates (`doVector`, 269-330). Items in the vector that pass the screen are collected (284-285). For each bucket, the first task triggers one candidate list: items not already in a job (315) that match the job item's filter (316). The bucket is skipped if that list is empty (329-330).
- Attach loop (300-372). While the front task's building still needs that item (`popInvalidTasks`, 248-263; stale tasks are popped at 259), the nearest candidate is chosen (335; `distance` 265-266 is max(|dx|, |dy|) + |dz|; ties keep the earlier candidate). The item is attached as a hauled input (340). The task is popped (355), the job item's quantity is decremented (359), the candidate is nulled (362) and the candidate count drops (363).
- Finalize (365-366). When every job item's quantity is zero, `finalizeBuilding` sorts the attached items by job-item index, takes the material from the first item, marks the structure rough if any attached item is a boulder (215-223), and unsuspends the job if allowed. The planned record is removed.
- Priority (`makeTopPriority`, buildingplan.cpp 1182-1212). For each requirement and vector, the building's first task in its bucket is moved to the front (1206).
- Empty buckets and vectors are erased after each pass (cycle 410-441).

## 2. Key functions

- `buildingplan_cycle`: `/mnt/frankendom-donors/DFHack-dfhack/plugins/buildingplan/buildingplan_cycle.cpp` 400-441. Scan order, bucket loop, empty cleanup.
- `doVector`: `/mnt/frankendom-donors/DFHack-dfhack/plugins/buildingplan/buildingplan_cycle.cpp` 269-380. Candidate list per bucket, nearest-first attach, pop, finalize.
- `popInvalidTasks` and `distance`: `/mnt/frankendom-donors/DFHack-dfhack/plugins/buildingplan/buildingplan_cycle.cpp` 248-267. Stale-task discard and the distance metric.
- `isJobReady` and `finalizeBuilding`: `/mnt/frankendom-donors/DFHack-dfhack/plugins/buildingplan/buildingplan_cycle.cpp` 191-246. Finalize rule and material from the first item.
- `registerPlannedBuilding`: `/mnt/frankendom-donors/DFHack-dfhack/plugins/buildingplan/buildingplan.cpp` 458-500. One task per unit per vector and bucket.
- `makeTopPriority`: `/mnt/frankendom-donors/DFHack-dfhack/plugins/buildingplan/buildingplan.cpp` 1182-1212. Front-of-queue move.
- `Job::attachJobItem`: `/mnt/frankendom-donors/DFHack-dfhack/library/modules/Job.cpp` 599-631. Fails only if the item is already in a job (612-613).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor numbers (where it lives) |
|---|---|
| Cycle period for the queue | 599 frames (buildingplan.cpp 73), run on request or after the period (351). |
| Tasks per requirement | One per unit of required quantity, per vector and bucket (buildingplan.cpp 491-492). |
| Nearest-match distance | max(|dx|, |dy|) + |dz| (buildingplan_cycle.cpp 266); a vertical level counts as one step. |
| Bucket order | FIFO per bucket (buildingplan.h 15); priority move puts one task per requirement at the front (buildingplan.cpp 1206). |
| Last-scan item sources | BOULDER, WOOD, BAR, IN_PLAY, in that order (buildingplan_cycle.cpp 393-396). |
| Finalize threshold | Sum of remaining quantities is 0 (193). |
| Match counter | Each attach reduces the number of candidates by one (363). |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (register one task per unit per source and bucket; each cycle walks sources, then buckets; per bucket, nearest candidate first with FIFO pops; finalize at zero; priority move). It omits the source list being fixed in the donor (the sketch takes an ordered list from the caller; the donor scans BOULDER, WOOD, BAR, IN_PLAY last), the item screen (`itemPassesScreen`), the filter matcher (`matchesFilters`; the sketch takes precomputed keys), the walkability update, the heat-safety and burrow checks, the material and rough flag at finalize, unsuspend, persistence and reload, and the 599-frame timer (the caller runs the cycle). It changes one thing on purpose: a failed attach drops that candidate and the loop continues; the donor's failure branch repeats the same item with no progress (see section 6).

```ts
// Licence: Zlib (donor, DFHack). Clean-room sketch of the described mechanism, not a translation of the donor lines.
export {};

interface Pt { x: number; y: number; z: number; }

interface Item {
  id: number;
  pos: Pt;
  keys: string[];   // filter buckets this item can satisfy
  inJob: boolean;   // already attached to a building
}

interface Requirement {
  key: string;        // filter bucket, like the donor's getBucket
  qty: number;        // units still needed
  sources: string[];  // item sources that may supply this requirement
}

interface Building {
  id: number;
  pos: Pt;
  reqs: Requirement[];
  done: boolean;
}

interface Task { bld: number; req: number; }

interface World {
  buildings: Map<number, Building>;
  sources: Array<{ name: string; items: Item[] }>;     // scan order; the caller puts the last-scan sources at the end
  queues: Map<string, Map<string, Task[]>>;            // queues[source][bucket] is a FIFO
}

// Chebyshev distance in the plane plus vertical steps (donor distance()).
function dist(a: Pt, b: Pt): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) + Math.abs(a.z - b.z);
}

// Planning: one task per unit of each requirement, per source and bucket (donor registerPlannedBuilding).
export function register(w: World, b: Building): void {
  b.reqs.forEach((req, ri) => {
    for (const src of req.sources) {
      let buckets = w.queues.get(src);
      if (!buckets) { buckets = new Map<string, Task[]>(); w.queues.set(src, buckets); }
      let q = buckets.get(req.key);
      if (!q) { q = []; buckets.set(req.key, q); }
      for (let u = 0; u < req.qty; u++) q.push({ bld: b.id, req: ri });
    }
  });
  w.buildings.set(b.id, b);
}

// Priority: move this building's first task per requirement and source to the front of its bucket.
export function prioritize(w: World, b: Building): void {
  b.reqs.forEach((req, ri) => {
    for (const src of req.sources) {
      const q = w.queues.get(src)?.get(req.key);
      if (!q) continue;
      const i = q.findIndex((t) => t.bld === b.id && t.req === ri);
      if (i >= 0) {
        const [t] = q.splice(i, 1);
        q.unshift(t);
      }
    }
  });
}

// One cycle (donor buildingplan_cycle). The caller runs it on a timer; the donor uses 599 frames.
export function cycle(
  w: World,
  attach: (item: Item, b: Building, req: number) => boolean,
  finalize: (b: Building) => void,
): void {
  for (const src of w.sources) {
    const buckets = w.queues.get(src.name);
    if (!buckets) continue;
    for (const [bucket, queue] of buckets) {
      // Candidates are computed once per bucket per cycle, as the donor does on the first task.
      const candidates = src.items.filter((it) => !it.inJob && it.keys.includes(bucket));
      while (queue.length > 0 && candidates.length > 0) {
        const task = queue[0];
        const b = w.buildings.get(task.bld);
        if (!b || b.done || b.reqs[task.req].qty <= 0) { queue.shift(); continue; } // drop stale tasks
        // Nearest candidate first; on a tie the earlier candidate wins (strict less-than).
        let best = 0;
        for (let i = 1; i < candidates.length; i++) {
          if (dist(b.pos, candidates[i].pos) < dist(b.pos, candidates[best].pos)) best = i;
        }
        const item = candidates[best];
        candidates.splice(best, 1);            // never offer the same item twice in this bucket
        if (!attach(item, b, task.req)) continue; // fix: a failed attach drops the candidate; the donor retries the same item
        item.inJob = true;
        queue.shift();
        b.reqs[task.req].qty -= 1;
        if (b.reqs.every((r) => r.qty === 0)) {
          b.done = true;
          finalize(b);
          w.buildings.delete(b.id);
        }
      }
      if (queue.length === 0) buckets.delete(bucket);
    }
  }
}
```

## 5. Lands in

- TARGET `origins/world/hub-build-queue.ts` (proposed new module, not in the repo yet): a planned town hub (inn, smithy and so on) registers its input needs and is placed when the last input leaves the one ledger. The cycle runs on the server tick, not a wall-clock or frame timer on the client.
- Parity-checklist row 20 (catalogue as runtime source): the requirement keys come from the hub catalogue entry, and the buckets are built from catalogue filters. The donor's cycle is not a spawn cap, so row 23 does not fit.
- Reuse tag: rewrite-from-idea (Zlib: code may be adapted; this note is clean-room, shape only)
- Brief rule served: one ledger (inputs leave the ledger once, when attached); zones as data (the requirement list is catalogue data); keep the idea, fix the defect (2026-10-10 rule).

## 6. Gaps and risks

- The idea is about fortress construction, not a town layout. It covers only the "services placed one at a time" part of this cell's topic. Roads, landmarks, signage and minimap are not in this donor.
- Latent defect: the failed-attach branch (buildingplan_cycle.cpp 365-372) logs `failed to attach job item` but does not pop the task (355 is the only pop), does not null the candidate (362 is the only null) and does not decrement the count, so the `while` at 300 would repeat the same attach. `Job::attachJobItem` fails only if the item is already in a job (`library/modules/Job.cpp` 612-613), and the candidate list excludes such items (315) and nulls each attached one (362), so this branch is not reached by the code paths read. It is still a branch that makes no progress. Fix: drop the candidate and continue (sketch `cycle`).
- Frankendom has one ledger: the donor moves items into jobs by flag (`in_job`) and the sketch sets `inJob` the same way. The ledger must debit the input at attach, not at finalize, or a hub can finish on items already spent.
- The 599-frame timer is a frame count. Frankendom must use the server tick count (fixed step), and the cycle must have a per-tick budget so a long queue cannot starve the tick (post-K item 3, server tick sub-line: fixed step, input intake, per-tick NPC budget).
- Nearest-first by plane distance plus a vertical step is the donor's rule. A duel or hub with no height uses plane distance only; a zone with levels keeps the vertical step.
- Matching rules (`matchesFilters`, 139-190) were only partly read: material, heat safety and the special flags. A hub's inputs are simpler; the sketch keys are precomputed.
- The donor's priority move (`makeTopPriority`) moves one task per requirement and source to the front. Frankendom needs an explicit rule for who gets priority when two hubs want the same input; the donor's rule is "whoever was made top priority last".
- Not read: `getBucket` past 390, `itemPassesScreen` and `isAccessible` (113-122 and 76-85), the walkability update (52-75), persistence (290-330 partly).

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
CLEAN.
