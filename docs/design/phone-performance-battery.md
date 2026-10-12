# Phone performance and battery: design brief
Date 2026-10-12. Status: **parked until before launch. Implementation is NOT started.** Repo read-only, commit 8d6ae33a9 (gap-check commit). Every number below is **proposed, needs a device test** unless it is quoted from the repo.

## 1. Goal
Fights stay smooth on a mid phone (a steady 60, or a steady 30 when the phone says so) and the phone stays cool and lasts longer. The player never sees the game get worse in a way that hides an attack. We lower the pretty things first and never touch what tells you an attack is coming. The fight itself (hits, timers, the attacker cap; `MAX_ATTACKERS` is a Lead queue item, PR #2129 per `docs/state/lead.md:123`, not in `src/` at this commit) never reads quality, so a slow phone cannot change who wins.

## 2. What we have today
| Piece | Where | What it does |
|---|---|---|
| Frame loop | `src/main.ts:1807` `frame()`, rAF at `2079-2081` | Raw rAF, no cap. dt clamped to 0.1 s (`1813-1818`). Fixed-step accumulator and interpolation (`637-640`). |
| Quality drop | `src/main.ts:2056` | Every 2 s, median frame over 22 ms: pixel ratio goes to 1 once (`src/scene.ts:755`). One way. No recovery. Off under `?dpr=`. |
| Phone tier | `src/quality.ts:59` `phoneTier()`, `pixelCap` `:56` | One yes/no. Phone: ratio cap 1.25, shadow map 512 (`src/scene.ts:152`), fighter textures 1K (`quality.ts:66`), rain 500 drops (`src/arena.ts:33`). Desktop ratio cap 1.5. |
| Paused when hidden | `src/main.ts:975` | Hidden tab does no work. A visible but unfocused window runs full speed. |
| First-frame upload | `src/first-frame.ts:20-30`, used `src/scene.ts:381-390` | Textures go up in slices behind the versus card, one draw, hard time cap, then the card lifts. |
| Low Power Mode | `src/quality.ts:113` `rafCadence` | Detects a 30 Hz phone. Only reports it. Does not adapt. |
| Beacon and readout | `src/perf-beacon.ts`, `?perf=1` (`main.ts:2059-2077`) | Per-fight frame times and device info. Measures only. |
| Existing limits | `GAME_SPEC.md:157, 176, 244` | Gate: median 55 fps or better, p95 25 ms or better, 5 minutes, iPhone 12 and Pixel 6. Shell under 5 MB, fight art 10-20 MB, 12 MB gzip per fight. |

## 3. Device tiers (all proposed, needs a device test)
Today there are two tiers (phone, full). We add a third and make the tier a table, not a yes/no.

| | Low | Mid | High |
|---|---|---|---|
| Who | 3+ years old, 3-4 GB, or Low Power Mode | iPhone 12 / Pixel 6 class (the spec minimum) | Recent flagship, tablets |
| Frame cap, playing | 30 | 60 | 60 (120 only if a test proves it stays cool) |
| Pixel-ratio cap | 1.0 | 1.25 (today) | 1.5 |
| Particles | 150 | 400 | 800 |
| Lights / shadows | 1 key light, no shadow | 1 key light, 512 shadow (today) | 1 key + rim, 1024 shadow |
| Post effects | none | grade only | grade + flash |
| Fight-ready load | under 6 s | under 4 s | under 3 s |
| Memory (GPU, fight) | 150 MB | 250 MB | 400 MB |

The memory row is checked against the iPhone black-fighter note at the top of `src/quality.ts` (skins ~110 MB, arena ~11 MB, framebuffer extra). Load time starts at tap and ends at the first playable frame (the beacon already stamps it). Tier is picked once at load from cores, memory (`perf-beacon.ts` already reads both) and the measured cadence, with `?gfx=` still overriding.

## 4. Battery rules (all proposed, needs a device test)
- **Unfocused cap:** visible but not focused, a low frame rate (number set by the device test; the Luanti figure is copyleft and not used). Hidden stays paused as today. The server step never follows the client cap (CP002 luanti, CP003 STK).
- **Idle cap:** no input and no fight running (menus, kill screen, pit gear sheet): 30 fps. Back to full on the first touch.
- **Low Power Mode:** if `rafCadence` says 30, pick the low frame cap on purpose instead of missing frames.
- **Thermal step-down:** the web cannot read heat. We use a proxy: a frame time that rises over 3 minutes at the same load. Step down one rung, same ladder as below.
- **Ladder timings** (CP001 levy-street, MIT, shape only): drop a rung after about 1 s of slow frames, with a cooldown of about 1 s between drops. Recover one rung only after about 6 s of clear headroom, then wait before the next. Slower recovery on weaker tiers. Never raise during a telegraph (the donor note found a "hold recovery" flag for exactly this). Telegraph, hit flash and parry spark are marked "never shed".
- **Rung order** (shed first to last): ambient particles and rain, shadow size, post effects, pixel ratio. Telegraph last, never.
- **Clock:** keep the 0.1 s dt clamp and drop a long stall instead of replaying it (CP003 OpenRA, STK ideas; our loop already does this).
- RP-derived (unchecked): admit background work only when a frame has headroom (RP013 levy-street); pause ambient motion while the player drags or pinches (RP009 isometric-city); one slow shared clock for ambient motion, paused when hidden (RP014 athena-crisis).

## 5. Build order (from the gap-check)
1. **Quality ladder + governor** (CP001 levy-street, REUSE shape). New pure file `src/quality-governor.ts`; hooks next to `src/main.ts:2056`; replaces the one-way drop; tier table in `src/quality.ts`; `scene.ts` gets level setters. Telegraph code (`src/boss-telegraph.ts`) stays out.
2. **Frame pacer** (CP002 Mindustry + Luanti, merged). New `src/frame-pacer.ts`; gate at the top of `frame()` in `src/main.ts`. Two rates (focused, unfocused) plus the idle and Low Power cases.
3. **Fight clock test** (CP003 OpenRA + STK, merged, optional). Pull the accumulator out of `main.ts:637-640, 1835` into `src/fight-clock.ts` so a fake-clock test can pin "stall of 300 ms, no fast-forward".
4. **Phone-readable receipts.** Add tier, rung and cap to `src/perf-beacon.ts` and the `?perf=1` readout so each device test has numbers.
5. **First-frame budget per tier** (CP003 0ad, REUSE). Extend `src/first-frame.ts` budget and slice values by tier. No new file.
6. **Weather and flash obey the ladder** (WL gap-check). `src/arena.ts:380` particle count reads the tier; the future `src/storm-flash.ts` never fires in a telegraph and is first to shed.
7. **Deferred:** zone streaming with hold counts (CP001 wowser + roBrowser), `src/zone-stream.ts`, only when the client draws zones. Pool leak count (CP002 Cubyz): SKIP, an `alive()==0` test is enough.

## 6. What we are NOT doing
- No auto-quality that touches hit boxes, timers, attacker count or telegraphs.
- No frame-rate probe or external benchmark pass (the donor one answers a different question).
- No heat sensor claim: the web has none; the thermal rule is a guess until measured.
- No 120 fps by default. No native app. No battery API reliance (not on iOS).
- No donor code copied. GPL, LGPL, restricted donors give shape only, no numbers. RP notes were not checked.
- Not now: implementation. **Parked until before launch.**

## 7. On-device checks (375 wide; real iPhone rows stay on the Mac per the standing rule)
1. Fixed 3-attacker fight at 375 wide, 5 minutes, per tier: median and p95 frame time, dropped-frame count (`?perf=1`). Gate stays median 55+ and p95 25 or less on the mid tier.
2. Low Power Mode on: the pacer picks 30 on purpose, fight still reads.
3. Telegraph still stills before and after a forced drop (visual PR stills rule).
4. Battery: 10 minutes of fights on iPhone 12, battery % and a hand-feel heat note, capped vs uncapped.
5. Unfocus and refocus: the low unfocused rate applies, back to full in under 1 s, no sim jump.
6. Cold load to first playable frame, on a throttled phone profile, against the tier budget.
7. Memory: no black fighters after 20 rematches (the 2026-09-18 defect).
Chromium and the non-Safari runs go to CI/VPS per standing rules.

## 8. Open questions for Dom
1. Cap at 30 on Low Power Mode, or try for 60 anyway? **Recommend 30 on purpose.**
2. Tell the player when quality drops? **Recommend no message; show it only in `?perf=1`.**
3. Allow 120 fps on high-end phones? **Recommend no for launch.**
4. Which phone is the "low" test device? **Recommend an older Android around 3 GB, plus iPhone 12 for mid.**
5. Idle menus at 30 fps to save battery? **Recommend yes.**

## 9. Sources
Gap-check `docs/gap-check/CP.md` (WL.md, SM.md, IN.md read: only the weather particle cap and flash-guard rows apply; SM and IN need nothing here). Donor notes CP001-CP003 (checked and fixed 2026-10-12) and RP002-RP018 under `/private/tmp/p2/wave2-haiku/batch3/` (unchecked; RP001 does not exist; RP012 has hedgewars and jynew idea lines, none used here). Repo files above.

Checked 2026-10-12 (Sonnet checker): 4 errors fixed
