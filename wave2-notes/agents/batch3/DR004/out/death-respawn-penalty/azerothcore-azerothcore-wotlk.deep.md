# azerothcore-azerothcore-wotlk (death-respawn-penalty, cell 1)

Donor: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Entities/Player/PlayerUpdates.cpp` (+ `Player.cpp`, `Unit.cpp`, `NPCHandler.cpp`, `MiscHandler.cpp`, `Corpse.cpp`, `WorldConfig.cpp`) | Licence: GPL-2.0 (`LICENSE` file: "GNU GENERAL PUBLIC LICENSE Version 2, June 1991"; clean-room, shape only) | C++ | symbol `Player::UpdateCorpseReclaimDelay` / `Player::GetCorpseReclaimDelay` / `Player::KillPlayer`

Checked: Read in full: `UpdateCorpseReclaimDelay` (PlayerUpdates.cpp 1956-1980), `GetCorpseReclaimDelay` (Player.cpp 13251-13266), `KillPlayer` (4646-4669), `BuildPlayerRepop` (4516-4562), `ResurrectPlayer` (4564-4641), `DurabilityLoss` (4838-4855), `Corpse::IsExpired` / `ResetGhostTime` (Corpse.cpp 193-208), the auto-release block (PlayerUpdates.cpp 360-376), the config defaults (WorldConfig.cpp 137-150, 411-421). Read in part: `CalculateCorpseReclaimDelay` (13268-13306, load branch only partly), `DurabilityLossAll` (4812-4836), the victim branch of the death handler (Unit.cpp 13770-13800), `SendSpiritResurrect` (NPCHandler.cpp 258-275), `HandleReclaimCorpseOpcode` (MiscHandler.cpp 633-655). Not read: who calls `KillPlayer` (`Unit::Kill` path), `Killed`, `DurabilityPointsLoss`, the sickness aura 15007 duration in the spell DBC, `RepopAtGraveyard` past line 5050, the SQL column layout of `m_deathExpireTime` beyond the field read. Confidence: high on the reclaim window (every line opened; I re-ran the donor's integer math in node on the VPS, no file written, and got 30, 60, 120, 120 for deaths at 0, 120, 240, 360 s, and 30 for a death at 2000 s). Medium on the durability path (the `durabilityLoss` argument of the victim branch is not traced to its caller). camera_scope: not applicable.

## 1. Mechanism

Death is three separate things on the server: a release (the body becomes a ghost and a corpse appears), a rolling reclaim window (how long the ghost must wait before it may recover its corpse), and a set of percent-of-max durability hits. Time is an absolute timestamp, not a countdown, except for the release timer.

- Death (one PvE death outside an instance, in order as the code reads):
  1. Victim branch of the death handler (Unit.cpp 13782): `plrVictim->SetPvPDeath(player != nullptr);` records whether a player killed the victim, which picks the corpse type.
  2. Durability (Unit.cpp 13785-13788): `DurabilityLossAll(10%, false)` runs when either (a) there is no player killer, the victim is not in a battleground, and the `durabilityLoss` argument is set (its caller is not read), or (b) a player killed the victim and `CONFIG_DURABILITY_LOSS_IN_PVP` is on (default false, WorldConfig.cpp 150). A third path: a fall death in `Player::EnvironmentalDamage` (Player.cpp 855-863) also calls `DurabilityLossAll(RATE_DURABILITY_LOSS_ON_DEATH/100, false)`, so durability is not only a Unit.cpp path. `false` means equipped slots only.
  3. `KillPlayer` (Player.cpp 4646-4669): body is a corpse state, the release timer is set to 6 minutes (4662), then `UpdateCorpseReclaimDelay()` (4664) moves the shared window, then the client is sent the current delay (4666-4668). No corpse exists yet.
  4. Release (player's own action, or the timer): `BuildPlayerRepop` (4516) creates the corpse, sets body HP to 1 as a ghost (4546), and resets the corpse's ghost time to now (4558) so the reclaim wait starts at release.
- The rolling window (the core rule, PlayerUpdates.cpp 1956-1980). One timestamp per character, `m_deathExpireTime`. On each death, before the delay is read:
  - if `now < expire`: `count = floor((expire - now) / 300) + 1`. If `count < 3`, `expire = now + (count + 1) * 300`; otherwise `expire = now + 3 * 300`.
  - else (window closed): `expire = now + 300`.
- The reclaim delay for the current window (Player.cpp 13264-13265): `idx = (now < expire - 1) ? floor((expire - 1 - now) / 300) : 0`; delay = `{30, 60, 120}[idx]` seconds.
  - Lone death: 30 s. Second death inside the window: 60 s. Third: 120 s. Fourth and later inside the window: stay at 120 s, and the window keeps extending to 15 min from the last death.
  - Window closes 5 to 15 min after the last death, depending on how many stacked. After it closes, the next death is 30 s again.
- Reclaim gate (MiscHandler.cpp 654): a reclaim is refused while `ghostTime + GetCorpseReclaimDelay(pvp) > now`. The delay is read at reclaim time, not stored at release.
- Auto-release (PlayerUpdates.cpp 365-372): outside instances and with no prevent-resurrection aura, the release timer counts down by the update diff (`m_deathTimer -= p_time`, 375). At zero it calls `BuildPlayerRepop()` then `RepopAtGraveyard()`. So a player who does nothing is released after 6 minutes.
- Corpse life: a normal corpse expires 3 days after its ghost time (Corpse.cpp 202); bones (`CORPSE_BONES`) after 60 minutes (200).
- Penalties, all percent-of-max durability, no item is destroyed, no XP loss found in this code (a grep for XP loss on death in `src/server/game` returned no penalty code):
  - Death: 10% of max durability on each equipped item (WorldConfig.cpp 139, applied at Unit.cpp 13788 and, for fall deaths, Player.cpp 861).
  - Config branches of `GetCorpseReclaimDelay` (Player.cpp 13255-13259): with the PvP config off it returns table[0] = 30 s; with the PvE config off it returns 0. The login path `CalculateCorpseReclaimDelay(load)` recomputes the remaining delay from the corpse ghost time (-1 if already passed).
  - Spirit healer revive: HP, mana and energy set to 50% of max (NPCHandler.cpp 262 calls `ResurrectPlayer(0.5f, true)`; rage set to 0 at Player.cpp 4596), then `DurabilityLossAll` at 25% with `inventory = true`, which also hits backpack items and bags (NPCHandler.cpp 264; WorldConfig.cpp 141).
  - Each item loss = `floor(maxDurability * percent)`, at least 1 point (Player.cpp 4848-4850).
- Resurrection sickness: `ResurrectPlayer(..., applySickness)` casts aura 15007 when level >= 11 (Player.cpp 4626-4631). For levels 11-19 the aura duration is set to `(level - 10)` minutes (4634-4636). The comment says level 20 and up get ten minutes (4625); the aura's own duration is not read.
- Battleground leave clears the window: `m_deathExpireTime = now` (Player.cpp 11532-11533).
- Tick: no per-frame ticking of the window; it is a timestamp. The release timer is the only countdown and it is driven by the player update loop (PlayerUpdates.cpp 365-375).

Order summary: window moves at death; the delay is sent to the client at death (KillPlayer 4666) and read again at reclaim (MiscHandler 654), never at release; release is manual or after 6 min; durability hits are at death (equipped only) and at spirit revive (equipped plus bags).

## 2. Key functions

- `Player::UpdateCorpseReclaimDelay`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Entities/Player/PlayerUpdates.cpp` 1956-1980. The window update. Config early return at 1960-1962.
- `Player::GetCorpseReclaimDelay`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Entities/Player/Player.cpp` 13251-13266. Table lookup from the remaining window.
- `Player::CalculateCorpseReclaimDelay`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Entities/Player/Player.cpp` 13268-13306. Non-load branch is `GetCorpseReclaimDelay`; load branch (login with a stored corpse) recomputes from the corpse's ghost time (partly read).
- `Player::KillPlayer`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Entities/Player/Player.cpp` 4646-4669.
- `Player::BuildPlayerRepop`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Entities/Player/Player.cpp` 4516-4562. Returns early (logs an error) if a corpse already exists on the map (4534); the auto-release caller still runs `RepopAtGraveyard` (PlayerUpdates.cpp 371-372).
- `Player::ResurrectPlayer`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Entities/Player/Player.cpp` 4564-4641. Restores HP and power by fraction, sickness aura by level.
- `Player::DurabilityLoss`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Entities/Player/Player.cpp` 4838-4855. Percent of max, floored, at least 1.
- `WorldSession::HandleReclaimCorpseOpcode`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Handlers/MiscHandler.cpp` 633-655. Server-side reclaim gate; refuses in arena and when not a ghost.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Rolling death window: one timestamp, extended one step per death, capped at N steps | 5-minute step (`#define DEATH_EXPIRE_STEP (5*MINUTE)`, Player.h 76); cap 3 (`#define MAX_DEATH_COUNT 3`, Player.h 77) |
| Delay table indexed by the window tier | `{ 30, 60, 120 }` seconds (Player.cpp 151) |
| Ghost waits: release time plus delay must pass before reclaim | Delay read at reclaim time (MiscHandler.cpp 654) |
| Auto-release after an idle countdown | 6 minutes outside instances (Player.cpp 4662) |
| Durability hit as a fraction of max, floored, at least 1 | 10% per death (WorldConfig.cpp 139); 25% on spirit revive (WorldConfig.cpp 141); minimum 1 point (Player.cpp 4850) |
| Revive at a fraction of HP | 50% (NPCHandler.cpp 262) |
| Sickness scales with level above a threshold | threshold level 11 (WorldConfig.cpp 417); duration `(level - 10)` min for 11-19 (Player.cpp 4636) |
| Corpse decay by age | 3 days (Corpse.cpp 202), bones 60 min (200) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: the window moves at death, then the delay is read from the window, then the reclaim gate compares against the delay read now (as the donor does). It omits: the PvP/PvE config early returns (PlayerUpdates.cpp 1960-1962), the login load branch (`CalculateCorpseReclaimDelay(true)`), the 6-minute release timer, resurrection sickness, the spirit-revive durability hit, the battleground window reset, and the donor's integer-second clock (the sketch takes seconds as numbers). It adds one clamp on the table index that the donor does not have; the donor cannot exceed index 2 because after any death `expire <= now + 3 * 300`, so the clamp never changes a result. `durabilityLossOnDeath` is the donor's `DurabilityLoss` body, not a translation of its lines.

```ts
// Licence: GPL-2.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const WINDOW_STEP_S = 300;   // one rolling window step (engine rule)
const MAX_WINDOW_STEPS = 3;  // window never extends past 3 steps (engine rule)

interface DeathWindow {
  expireAtS: number;         // server clock, seconds; 0 = no open window
}

// Call once per death, BEFORE the reclaim delay is read for that death.
function onDeath(w: DeathWindow, nowS: number): void {
  if (nowS < w.expireAtS) {
    const stepsLeft = Math.floor((w.expireAtS - nowS) / WINDOW_STEP_S) + 1;
    w.expireAtS = stepsLeft < MAX_WINDOW_STEPS
      ? nowS + (stepsLeft + 1) * WINDOW_STEP_S
      : nowS + MAX_WINDOW_STEPS * WINDOW_STEP_S;
  } else {
    w.expireAtS = nowS + WINDOW_STEP_S;
  }
}

// Reclaim delay in seconds. `table` is zone data, e.g. [30, 60, 120].
function reclaimDelayS(w: DeathWindow, nowS: number, table: readonly number[]): number {
  const idx = nowS < w.expireAtS - 1
    ? Math.min(Math.floor((w.expireAtS - 1 - nowS) / WINDOW_STEP_S), table.length - 1)
    : 0;
  return table[idx];
}

// Reclaim is refused while (ghostAtS + delay > nowS). Delay is read at reclaim time, as the donor does.
function mayReclaim(w: DeathWindow, ghostAtS: number, nowS: number, table: readonly number[]): boolean {
  return ghostAtS + reclaimDelayS(w, nowS, table) <= nowS;
}

// Durability lost per death: percent of max, at least 1 point, floored like the donor's integer cast.
function durabilityLossOnDeath(maxDurability: number, pct: number): number {
  if (maxDurability <= 0) return 0;
  return Math.max(1, Math.floor(maxDurability * pct));
}

// Smoke values from the donor's own sequence (deaths at 0, 120, 240, 360 s): 30, 60, 120, 120.
const w: DeathWindow = { expireAtS: 0 };
const table = [30, 60, 120];
const seen: number[] = [];
for (const t of [0, 120, 240, 360]) {
  onDeath(w, t);
  seen.push(reclaimDelayS(w, t, table));
}
void seen;
void mayReclaim;
void durabilityLossOnDeath;
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (copy at /tmp/azerothcore-reclaim-window.ts): exit 0.

## 5. Lands in

- TARGET `src/fight/death.ts` (new module: death state, release timer, reclaim window; the table is zone data read from the zone row). Parity-checklist row 17 (death/respawn). The server-side reclaim gate belongs in the same module, not the client.
- Server tick: the release timer is driven by the server update loop; cite row 18 / post-K item 3 sub-line "server tick: fixed step, input intake, per-tick NPC budget" for where the countdown is ticked.
Best transferable idea: a per-character death window with one server timestamp that adds a step per death (capped at 3), and a delay table (30/60/120 s) read at reclaim time, so repeated deaths cost waiting time instead of items.
Decision (proposed): adapt — keep the rolling window and the delay table, move the table into zone data, and send the server reclaim timestamp to the client; no durability in this slice because Frankendom has no repair loop yet.
Acceptance: a player who dies once in an open zone sees a 30 s reclaim countdown on the release screen; a second death within 5 minutes shows 60 s; a server test asserts that a reclaim before `reclaimAt` is refused, and that a 4th death within 15 minutes still gives 120 s.

## 6. Gaps and risks

- One ledger: the donor writes durability per item (`DurabilityPointsLoss`, not read) separately from the death. Frankendom must put the death, the window update and any durability change in one ledger write, or none of them.
- Server-verified: the donor's reclaim gate is server-side (MiscHandler 654), good. The donor also sends the delay to the client (4666-4668). We send the absolute `reclaimAt`, and the client only draws the countdown.
- Zones as data: the donor hard-codes the table (151), the 5-minute step (Player.h 76), and the cap of 3 (Player.h 77). Frankendom: the table and the release timer become zone data; the step and the cap stay engine rules.
- Pit as client: deaths in the Pit should not open a corpse or a window; the donor has no arena-death concept beyond "no reclaim in arena" (MiscHandler 641-642). Needs an explicit Pit rule.
- Many-on-one: the window counts deaths, not killers. A 3-on-1 kill counts once for the victim, which is right. A farming loop (repeat die, release, respawn) is capped at 120 s per death, so it slows farming but does not block it.
- Take-one: compatible. Nothing is destroyed; the only loss is percent durability, so a take-one loot rule is not affected.
- Defects, each with a fix:
  - Delay is read at reclaim time (MiscHandler 654), not stored at release. It is safe because the window count only drops on 5-minute boundaries and the delay is at most 120 s, so the recomputed value never allows an earlier reclaim (hand-worked, not tested). fix: store `reclaimAt` at release and compare against it.
  - Integer-second clock with a `- 1` fudge (Player.cpp 13264; the comment at 13263 says the author meant ceil minus one). fix: use milliseconds on the server clock and `<` comparisons at the tier edges.
  - Table name is misspelled `copseReclaimDelay` (Player.cpp 151). Cosmetic only.
  - Durability is the same percent on every equipped item (no per-item tier). fix: if we keep it, make the percent a per-item field, or drop it.
- Not read: what `Killed` and `th_pain`-style hooks do after the death; whether the spell-based resurrect paths (other than the spirit healer and the corpse reclaim) respect the window. Any revive path that skips `HandleReclaimCorpseOpcode` would bypass the gate; not checked.

As-data shape:
- Not table-driven in this donor. The delay table and window step are compile-time constants; the percents and levels are `worldserver.conf` keys read into `WorldConfig` (WorldConfig.cpp 139-150, 411-421).
- Row fields (name: type) if we make it a row per zone: `zone_id: string`; `reclaim_delays_s: number[3]`; `release_timer_s: number`; `durability_loss_death_pct: number`; `durability_loss_spirit_pct: number`; `spirit_hp_pct: number`; `sickness_min_level: number`. Engine constants (not in the row): `window_step_s = 300`, `window_max_steps = 3`.
- A new X is one row: yes for a zone's delay table or penalty percents; no for a new window rule (needs code).

Provenance: repo `azerothcore-azerothcore-wotlk`; files above; licence GPL-2.0 (LICENSE file), so the contract is shape only.

What they patched later: no history available (the donor has no `.git` directory). In-code markers: `// Xinef: Player can loop corpses while in BG or in WG` (Player.cpp 4728) makes corpses lootable in battlegrounds; `// xinef: reset corpse reclaim time` (11532) clears the window on battleground leave; `// pussywizard: update only ghost flag instead of whole character table entry!` (4791) narrows the ghost-flag DB write to one column.

Rulings for Dom:
1. Should open-zone deaths start a rolling 30 / 60 / 120 s reclaim wait? Recommendation: yes in open zones, no in the Pit.
2. Do we want gear durability loss on death? Recommendation: no until the repair lane (row 9 CR) exists.
3. Should an idle ghost auto-release to the graveyard after 6 minutes outside instances? Recommendation: yes, as zone data, with no timer in instances.

Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
Brief rule served: 17 (death/respawn); one ledger; server-verified kills.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Order summary said the delay is read at release; code sends it at death (KillPlayer 4666) and reads it at reclaim; no read at release.
- Durability also applied on fall death at Player.cpp 861 (DurabilityLossAll 10%); note listed only the Unit.cpp path.
- Missed: GetCorpseReclaimDelay config branches (PvP off returns 30, PvE off returns 0); login path recomputes delay from ghost time.

Fixed 2026-10-12: order summary wording, added fall-death durability path and the config-branch/login-path line.
