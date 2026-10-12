# Gap check: CP (client performance, memory, loading)
Date 2026-10-12. Frankendom repo commit read: 8d6ae33a9 (read-only). 9 donor notes (CP001-CP003).

## Summary for Dom
- 9 notes: 3 REUSE, 4 ADD (3 distinct new things, two notes merge into one), 2 SKIP.
- Top addition 1: a frame-rate cap with a lower cap when the tab is not focused (Mindustry + Luanti notes, merged). Nothing like it exists today.
- Top addition 2: a proper quality ladder (drop fast, recover slowly, never touch telegraphs) to replace the single "one-off drop to pixel ratio 1" in main.ts.
- Top addition 3: chunk/zone streaming with reference counts. Only worth building once the client draws zones; today the client has no zone streaming at all.
- Every proposed path under `origins/client/` or `src/fight/` does not exist. Client code lives flat in `src/`. Licences: five donors are copyleft (GPL/LGPL), so no donor numbers are used below.

## Table
| Donor note | Idea (8 words) | We have today | Gap | Call | Lands in |
|---|---|---|---|---|---|
| CP001 MrAntares-roBrowserLegacy | Timed sweep frees unused assets, with holds | No asset cache. Textures/geometry are disposed by hand when a look changes (`src/characters.ts:660-671`) and at rematch/pagehide (`src/main.ts:1007`, `1557`) | A fight uses a small fixed art set, so there is nothing idle to sweep. Only matters once zones stream | SKIP (fold the "hold count" into the zone-streaming row) | none |
| CP001 levy-street-world-of-claudecraft | Quality ladder, fast drop, slow recover | Phone tier fixed at load (`src/quality.ts:25`, `56`); one-way drop to pixel ratio 1 when median frame > 22 ms (`src/main.ts:2056`, `src/scene.ts:755`); frame stats already measured (`src/main.ts:2037-2052`) | No ladder, no recovery, no cooldown, no per-effect levels, nothing that protects telegraphs | ADD | New pure module `src/quality-governor.ts` (does not exist; proposed `src/fight/quality_governor.ts` has no `src/fight/`); hook beside `main.ts:2056`; keep `src/boss-telegraph.ts` out of it |
| CP001 wowserhq-wowser | Stream props by chunk window, refcounted | Pit loads as a lazy chunk (`src/pit-coordinator.ts:8-10`); zone data is server/pure only (`origins/region1/load.ts`, `origins/world/resolve.ts`, no client import) | No client zone rendering or streaming yet, so no window to stream | ADD, deferred until the client draws zones | New `src/zone-stream.ts` (proposed `origins/client/zone_streaming.ts`: dir missing) |
| CP002 Anuken-Mindustry | Fixed-period frame cap, sliced loading | Sliced loading already exists (`src/first-frame.ts`, used `src/scene.ts:381-390`). No cap: every frame is a raw rAF (`src/main.ts:2079-2081`). Low Power Mode 30 Hz is only detected, not set (`src/quality.ts:113`) | Player/device fps cap and overrun clamp | ADD (merged with Luanti row) | New `src/frame-pacer.ts` (proposed `origins/client/frame-pacer.ts`: dir missing); gate at the top of `frame()` in `src/main.ts` ~1800 |
| CP002 luanti-org-luanti | Two-rate cap, lower when unfocused | `paused()` skips work when `document.hidden` (`src/main.ts:975`, `1779`), but a visible-unfocused window runs full rate. Wall-clock dt with 0.1 s clamp (`src/main.ts:1819`) | Foreground/background cap values | ADD (same module as Mindustry) | `src/frame-pacer.ts` |
| CP002 PixelGuys-Cubyz | Free-list pool counting in-use for leak | Fixed preallocated pools already: sparks (`src/clash-sparks.ts`), witchfire (`src/witchfire.ts:15`, `alive()` at 137), armfeel (`src/armfeel-fx.ts:2`), scorch slots (`src/scorch.ts:8`). Damage numbers are DOM in `src/hud.ts:35` | Only a teardown in-use count test is missing; no per-hit allocation problem is known | SKIP (optional later: add an `alive()==0` assertion to existing fx tests) | none |
| CP003 0ad-0ad | Zone load as sliced, resumable task queue | `src/first-frame.ts` already does budgeted, sliced texture upload and a single draw behind the versus card, with a hard time cap (`src/scene.ts:381-390`) | Multi-task queue and progress bar only matter for zone loads that do not exist yet | REUSE `src/first-frame.ts`; extend it if zones need more task types | `src/first-frame.ts` |
| CP003 OpenRA-OpenRA | One clock; drop stalls instead of replaying | Fixed-step accumulator in `src/main.ts:637-640`, `1835`, `1927`; stall bounded by a 0.1 s dt clamp (`1819`) and backward-jump resync (`1817-1818`); render interpolation by `alpha` (`1990`) | Already stricter than the donor's 250 ms drop. The accumulator is inline, not a separate module | REUSE (optional: pull into a pure file so it can be fake-clock tested) | `src/main.ts` frame(); if extracted, `src/fight-clock.ts` (proposed `src/fight/tick.ts`: dir missing) |
| CP003 supertuxkart-stk-code | Accumulator capped in ticks per frame | Same accumulator. Cap is implied: 0.1 s clamp at 60 Hz = at most about 6 steps per frame; hit-stop handled in `1832` | No explicit tick-count cap or test; server step count is separate and untouched | REUSE (merge with OpenRA row; one extraction covers both) | same as OpenRA row (proposed `src/fight/frame-pacing.ts`: dir missing) |

## Merges
- Mindustry and Luanti propose the same frame-pacer: build once.
- OpenRA and STK propose the same fight clock, and it already exists in `main.ts`: one optional extraction, one test.
- roBrowser's hold count and 0ad's task queue both belong to the deferred zone-streaming work with Wowser.
