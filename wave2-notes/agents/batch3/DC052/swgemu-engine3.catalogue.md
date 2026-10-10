# swgemu-engine3 (design catalogue, cell DC052)

Donor: `/mnt/frankendom-donors/swgemu-engine3/` (VPS only, read-only).
Half read: **engine half** (`MMOEngine/src/engine/core`: task queues, task manager, scheduler, worker). Paired donor: `swgemu-Core3` (the data pack this engine runs; see its own catalogue).

**This donor has no game content.** It holds no creatures, classes, weapons, gear, zones, art, audio or game text. The sections for those topics are therefore empty by fact, not by omission. The only useful material is engine ideas, listed in section 5 and in the originals.

Dom's rule: recreate as a clearly distinct original, never a copy. Engine code is AGPL v3 per its README and COPYING, so the ideas below are shape only, written in our own code.

## Licence (as the files say)
- `README.md` licence section: GNU AGPL v3 (line 17). `COPYING` is AGPL v3 text (line 1).
- Source headers carry "Copyright (C) 2007-2019 SWGEmu" (audit AU051: 496 headers).
- Third-party code under `MMOEngine/external/` (ptmalloc3, db, zlib, hoard, pthreads-w32, multimmap, dlmalloc): licence texts not read.
- Class: **D** for non-code content (none); code is AGPL v3, shape only.

## Counts
- Content: creatures 0, classes 0, weapons 0, gear sets 0, zones 0.
- Engine core folder (`MMOEngine/src/engine/core`): **21** headers and **15** source files (counted with find).
- Whole-tree header count (538 `.h`, 166 `.cpp`) is from the audit (AU051), not recounted here.

## 1. Creatures / beasts
None. The engine has no creature data.

## 2. Classes, races, factions
None.

## 3. Weapons
None.

## 4. Armour and gear
None.

## 5. Engine ideas that serve our cell topics (own words)
- **Timed task queue** (`TimedTaskQueue.h` lines 35 and 36; `TimedTaskQueue.cpp` lines 35 to 42). A priority queue keyed by execution time. Adding a task with a delay first removes it if it is already queued (`TimedTaskQueue.cpp` line 38), so one task cannot be queued twice. It then sets the execution time from the delay (line 42). If the new task is at the top of the queue and a thread is waiting, the waiting thread is woken (line 97). Idea for us: one timer wheel for respawn, despawn grace and boss timers (zone population, row 23). The unit of the delay is not traced in this read.
- **Named task queues with worker counts and a save-event block** (`TaskManagerImpl.h` line 62). A custom queue is created with its own thread count, and by default it blocks during a save event (`blockDuringSaveEvent = true`). Idea for us: a separate queue for world simulation and for I/O, so a slow write never stalls the fight tick (server tick sub-line of row 18).
- **Separate scheduler and worker sets** (`TaskManagerImpl.h` lines 27, 28, 30). The header declares a vector of workers, a vector of schedulers and a separate vector of I/O schedulers. Correction to the audit: the header alone does not show that schedulers feed workers. That hand-off lives in `TaskManagerImpl.cpp` and `TaskScheduler.cpp` and was not traced in full.
- **Scheduler poll interval** (`TaskScheduler.cpp` lines 84 and 133): the scheduler loop sleeps one millisecond per pass. Idea for us: the fight tick could wait on a timed wake-up instead of a poll loop (cost not measured).

## 6. Inspiration briefs
No creature, zone or item briefs: the donor has no content. Engine ideas are in section 5.

## 7. Cross-link to our cell topics
- Spawns and encounters (row 23, respawn and despawn timers): the timed queue in section 5.
- Server tick (row 18 sub-line, "fixed step, input intake, per-tick NPC budget"): the separate save-blocking queue and the scheduler split in section 5.
- Camera, zones, HUD, VFX, animation, sound, loot: nothing in this donor.

## Not read
- `lib/` binaries (22 MB), `external/` third-party code and its licence texts, `doc/Doxyfile`, `conf/filter`, `build/win32/UpgradeLog.XML`.
- `TaskScheduler.cpp` beyond lines 72 to 84 and 133; `TaskWorkerThread.cpp`; `TaskQueue.cpp`; `TaskManagerImpl.cpp` beyond the lines listed.
- The delay unit in `TimedTaskQueue::add` (likely milliseconds, given `getMiliTime` in the same file; not traced).
- Most of `MMOEngine/src` outside `engine/core`.
