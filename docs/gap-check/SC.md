# Gap check SC (spectators, coach, wagers, replays)

Date 2026-10-12. Frankendom repo commit read: 8d6ae33a9 (frankendom-lead-catalogue, read-only).

## Summary for Dom
- 7 donor notes checked (SC001 to SC003, plus the openfight verdict in SC002): 1 REUSE, 5 ADD rows (4 distinct additions after merging two), 1 SKIP.
- Replay is mostly built already: src/record.ts stores seed plus every per-tick input, src/replay.ts re-runs it (verifyRecord) and builds share links.
- Nothing exists today for spectators, a coach seat, a delayed live view, wagers or a title-screen fight (no hits in src/ or docs/ for them, besides the crowd art).
- Top 3 additions: (1) per-viewer views of the one fight record (role channel plus delayed read, SC003 Smogon and Lila merged); (2) spectator FIFO queue and hidden-value rule (SC001); (3) title-screen AI-vs-AI fight with no ledger write (SC003 knight-duel).
- Caution: GAME_SPEC.md line 185 says no economy/stakes and no real-money wagering is authorized, so anything wager-shaped (the delay's reason to exist) is parked until Dom authorizes it. Also: the proposed `src/fight/` folder does not exist in this checkout.

## Table

| Donor note | Idea (8 words) | We have today | Gap | Call | Lands in |
|---|---|---|---|---|---|
| SC001 ModernUO (GPL, clean-room) | FIFO spectator queue, host-gated hidden values | Nothing for spectators. Only the crowd art (src/assets/arena/crowd.ts). PvP is two peers plus rollback (src/net/pvp.ts, rollback.ts) with no third seat. | Queue, seat promotion on leave, per-viewer value filter, server sweep. | ADD (SC001) | `src/fight/spectate.ts` does not exist; no `src/fight/` at all. Nearest real: `src/net/lobby.ts` (rooms) plus `src/net/view.ts` (per-side view). |
| SC002 Ikemen GO (MIT) | Store seed plus confirmed inputs; replay re-runs sim | `src/record.ts` (createRecorder 151, FightRecord 124: seed, level, weapon, per-tick intents); `src/replay.ts` verifyRecord 22-45 steps it headless and checks outcome; PvP record in `src/net/pvp.ts` 88 (kits, intents per side); server replay rule in docs/duel-architecture.md section 1. | Only the refuse-across-a-gap rule: record has an intent for every tick, so a gap already fails verifyRecord. Nothing to build. | REUSE (record.ts + replay.ts) | Already built. `src/fight/replay.ts` is not needed. |
| SC002 Duelyst (CC0) | Cap dead gaps; replay speed as one divider | Replay plays through main.ts replay mode (match.ts mode, main.ts 444-449) at the fixed step. Records are dense per tick, so there are no stored gaps. No speed control or idle-skip found (not fully verified in main.ts). | A client-only playback multiplier and a skip-ahead over ticks with no action. | ADD (SC002, small) | Not `src/fight/replay.ts` (absent). Nearest real: `src/replay.ts` for the pure tick scan, playback loop in `src/main.ts`. |
| SC002 openfight (LGPL) | Per-frame input struct could be recorded | Already covered by Intent per tick in record.ts. Donor itself never records. | None. | SKIP (rejected in the verdict; Ikemen row covers it) | n/a |
| SC003 Smogon (MIT) | One record, private and shared views per viewer | `src/net/view.ts` viewAs swaps sides for the guest (presentation only). One ledger rule in docs/duel-architecture.md. No coach seat and no spectator role. | Role channels (spectator, coach, owner/debug) over one record, set by the server. | ADD (SC003-smogon; merged with Lila row below) | `src/fight/record.ts` does not exist. Nearest real: `src/record.ts` (record) with a view function beside `src/net/view.ts`. |
| SC003 Lila (AGPL, clean-room) | Delayed spectator read from the one record | Nothing. No live-spectate path, so no delay. | `viewAt(now - delay)` over the record, start state before first delayed time. Only needed once spectating exists; the wager reason is parked (GAME_SPEC 185). | ADD (SC003-lila; same module as Smogon row, build together) | Same as Smogon row: `src/record.ts` plus the view file. |
| SC003 knight-duel (GPL, clean-room) | Title screen runs AI-vs-AI fight, no ledger | No attract mode or title-screen fight found. Reusable parts exist: AI drives a side (`src/ai.ts`, 1000 bot-vs-bot fixtures per docs/duel-architecture.md), non-career modes already skip the ladder (`src/match.ts` practiceOnly 114, mode at 64). | Two-brain loop, auto reset in new arena, a ledger-unchanged test. | ADD (SC003-knight) | `src/fight/attract.ts` does not exist. Nearest real: `src/match.ts` (new mode) with `src/ai.ts`; arena pick in `src/ladder.ts`. |

## Merges and notes
- Smogon and Lila both target a new record module with per-viewer views: one job, one PR.
- Ikemen and Duelyst both target the same replay file in the notes: Ikemen is already built; Duelyst's part is a small playback add.
- Coach mode: SCOPE.md line 51 mentions "Coach mode" only as ladder counting; no coach seat or coach instructions exist in src/.
- Targets under `src/fight/` in all donor notes need renaming to real paths above before a build brief is written.
