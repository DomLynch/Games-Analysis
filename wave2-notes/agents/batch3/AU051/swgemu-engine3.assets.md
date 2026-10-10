# swgemu-engine3 (asset audit, cell AU051)

Donor: `/mnt/frankendom-donors/swgemu-engine3/` (VPS only, read-only).
Half read: **engine half** (`MMOEngine/src/engine`, build and config files, licence files). Matching game-side half for this engine is `swgemu-Core3` (its data pack is audited separately in `swgemu-Core3.assets.md`).

## 1. Licences (as the files say)
- `README.md` licence section: "GNU Affero General Public License" version 3 (line 17). `COPYING` is AGPL v3 text (line 1).
- Source headers (sample `MMOEngine/src/engine/core/TaskManagerImpl.h`): "Copyright (C) 2007-2019 SWGEmu" (line 2) and "See file COPYING for copying conditions." (line 3). 496 headers carry the SWGEmu line.
- Third-party code is under `MMOEngine/external/` (ptmalloc3, db-5.0.32, zlib, hoard, pthreads-w32, multimmap, dlmalloc). Their licence texts were **not read**. `external/ptmalloc3/README` is the only licence-like file found in external/.
- Code licence: AGPL v3. Asset licence: not applicable (no assets in this donor).

## 2. Asset inventory
- **No art, models, audio, fonts, maps, or game text.** File types across the whole tree: 538 `.h`, 166 `.cpp`, 8 `.idl`, 8 `.cmd`, 8 `.c`, 6 `.hpp`, plus small build and config files.
- `lib/` (22 MB, binary libraries for unix and win32): not read.
- `external/` (2.4 MB, third-party source): not read beyond names.
- `conf/` (`engine3.pc`, empty; `filter`, 160 bytes): not read.
- `doc/Doxyfile`: not read.
- `build/win32/UpgradeLog.XML`: not read (build tool log).

## 3. Rights-holder status (repo files only)
- SWGEmu project, engine for Core3. README says it "enables Core3's implementation of SWGEmu". No statement about game data (there is none here).
- Status: fan project, code only.

## 4. Best class
**D** for non-code content (none usable). Code is AGPL v3: clean-room use only for ideas, as the Frankendom rules say for GPL/AGPL code.

## 5. Inspiration (engine ideas, own words)
- **Timed task queue**: a priority queue of tasks keyed by a due time, with `add(task, time)` (`MMOEngine/src/engine/core/TimedTaskQueue.h` lines 20 and 36). Idea: a timer wheel for respawn, despawn and grace timers (Frankendom row 23). Recreate in our own code.
- **Named task queues with worker counts**: the task manager can create named queues with their own thread counts and a flag that blocks during a save event (`TaskManagerImpl.h` line 62). Idea: separate queues for world simulation and I/O so a slow write never stalls the fight tick.
- **Scheduler plus workers split**: separate scheduler threads feed worker threads (`TaskManagerImpl.h` lines 27 to 30). Idea: scheduler decides when, workers do the work. Recreate only if we need the split.

## 6. Inspiration briefs
None. The engine half has no creatures, items, zones or effects to brief. Ideas are in section 5.

## 7. Cross-link to our cell topics
- spawns / encounters (row 23 respawn and despawn timers): timed queue ideas in section 5.
- server tick (row 18 sub-line): scheduler and worker split in section 5.
- camera, zones, hud-ui, vfx, animation, sound, loot: nothing here.

## Not read
- `lib/` binaries, `external/` third-party code and their licence texts, `doc/Doxyfile`, `conf/filter`, `build/win32/UpgradeLog.XML`.
- Most of `MMOEngine/src` (567 files in `src/`): counted, the two task headers only.
- `TaskScheduler`, `TaskWorkerThread`, `TaskQueue` bodies: not read.
