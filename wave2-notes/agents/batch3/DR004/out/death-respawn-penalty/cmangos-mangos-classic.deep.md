# cmangos-mangos-classic (death-respawn-penalty, cell 3)

Donor: `/mnt/frankendom-donors/cmangos-mangos-classic/src/game/Entities/Player.cpp` (`getCorpseReclaimDelayHelper` 1361-1374, `GetCorpseReclaimDelay` 18990-18997, `UpdateCorpseReclaimDelay` 18999-19019, `SendCorpseReclaimDelay` 19021-, `KillPlayer` 4418-4432, `BuildPlayerRepop` 4266-4307, `ResurrectPlayer` 4309-4365, `DurabilityLossAll` / `DurabilityLoss` 4514-4562, death timer 1570-1580); also `src/game/Entities/Unit.cpp` 1149-1158, `src/game/Entities/NPCHandler.cpp` 418-420, `src/game/Entities/MiscHandler.cpp` 603-657, `src/game/Spells/SpellEffects.cpp` 4796-4850 and 4936-4960 and 5461-5480, `src/game/World/World.cpp` 694-699, `src/game/Entities/Corpse.cpp` 270-276, `ChangeLog.md` | Licence: GPL-2.0 (`LICENSE`: "GNU GENERAL PUBLIC LICENSE, Version 2, June 1991"; Player.cpp header: "version 2 ... or (at your option) any later version"; clean-room, shape only) | C++ | symbol `Player::GetCorpseReclaimDelay` / `Player::getCorpseReclaimDelayHelper`

Checked: The same window and table design appears in cell 1's donor; the code is nearly identical, but I did not verify any lineage between the two repos (no README or history read), so I re-read the functions here rather than copying cell 1. Read in full: `getCorpseReclaimDelayHelper`, `GetCorpseReclaimDelay`, `UpdateCorpseReclaimDelay`, `KillPlayer`, `BuildPlayerRepop`, `DurabilityLoss`, `HandleReclaimCorpseOpcode` (603-632), `HandleResurrectResponseOpcode` (636-657), `EffectResurrect` (4796-4850, body read to the request queue), `EffectSpiritHeal` gate (5461-5480). Read in part: `ResurrectPlayer` (4309-4365), `SendCorpseReclaimDelay` (19021-19046), `RepopAtGraveyard` (4705-4716), the victim branch in `Unit.cpp` (1140-1160). Not read: the body of `ResurrectUsingRequestDataInit` past 18917, `AddResurrectRequest` (what the client does with it), the spell ids 22012 and SPELL_ID_PASSIVE_RESURRECTION_SICKNESS (their DBC meaning not read), the callers of `Unit::DealDamage` above 1140, and the sickness aura duration. Confidence: high on the window and the boundary behaviour (I re-ran the donor's integer math in node on the VPS, no file written; the output is in section 1). Medium on what the spell 22012 path means in game.

## 1. Mechanism

Same shape as cell 1, with two differences that matter for Frankendom: the reclaim check happens only on the ghost's own reclaim, and the boundary rule is different.

- Death (player killed, PvE by default; config `Death.CorpseReclaimDelay.PvE` is true, World.cpp 697; PvP is `Death.CorpseReclaimDelay.PvP`, 696):
  1. Victim branch (Unit.cpp 1149-1158): `SetPvPDeath(responsiblePlayer != nullptr)` stores whether this death was PvP (the flag is set either way; skipped only for `INSTAKILL`, 1147-1149). That flag picks the PvP or PvE config in `UpdateCorpseReclaimDelay` and at reclaim. Durability: `DurabilityLossAll(0.10f, false)` runs when there is no responsible player, the victim is not in a battleground, and the spell does not carry `SPELL_ATTR_EX3_NO_DURABILITY_LOSS` (1153-1158). The 10% is hardcoded; there is no config key for it.
  2. `KillPlayer` (4418-4432): body is a corpse state; release timer 6 minutes (4429); `UpdateCorpseReclaimDelay()` (4431) moves the shared window.
- Rolling window (`UpdateCorpseReclaimDelay`, 18999-19019): one timestamp per character, `m_deathExpireTime`. If `now < expire`, `count = (expire - now) / 300 + 1`; if `count < 3`, `expire = now + (count + 1) * 300`, else `expire = now + 3 * 300`. Otherwise `expire = now + 300` (19011-19018).
- Delay read (`getCorpseReclaimDelayHelper`, 1361-1374; `GetCorpseReclaimDelay` 18990-18997): `now` is clamped to `expire` first (18993), then `count = uint32(expire - time) / 300`, capped at 2, and the delay is `{30, 60, 120}[count]` (table at line 139).
- Ghost: at release, `BuildPlayerRepop` converts the body to a ghost with HP 1 (4292-4293), sends the reclaim delay (4301), and resets the corpse's ghost time to now (4304). It also fails quests on release (4306).
- Reclaim gate: `HandleReclaimCorpseOpcode` refuses while `ghostTime + GetCorpseReclaimDelay(pvp) > now` (623). On success the ghost gets back to 50% HP, or 100% in a battleground (630), and bones are spawned.
- Other-player revive: a healer's Resurrect spell (SPELL_EFFECT_RESURRECT, handled by `EffectResurrect`, 4796) queues a resurrect request on the target (4848). Acceptance (`HandleResurrectResponseOpcode`, 636-657) checks only that the player is dead and the request came from that guid (654) and then calls `ResurrectUsingRequestDataInit`. The reclaim delay is not read on this path. The donor's gate is therefore for self-reclaim only.
- Spirit-heal spell effect: `EffectSpiritHeal` (SpellEffects 5461-5480) calls `ResurrectPlayer(1.0f)` (100% HP, no sickness) then `SpawnCorpseBones()`: no reclaim gate, no durability. A third ungated revive path (spell 22012 additionally needs aura 2584).
- Window off switch: `UpdateCorpseReclaimDelay` returns early, without moving the window, when the PvP or PvE config for this death type is off (18999-19006); the corpse type picks the config again at reclaim.
- Self-revive spell: `EffectSelfResurrect` (4936) calls `ResurrectPlayer(0.0f)` and sets health and mana from the spell values (4959). No reclaim gate.
- Spirit-healer revive (NPCHandler.cpp 418-420): `ResurrectPlayer(0.5f, true)`, then `DurabilityLossAll(0.25f, true)`, which also hits backpack items and bags.
- Sickness: `ResurrectPlayer(..., applySickness)` casts the sickness spell at level >= `Death.SicknessLevel` (default 11, World.cpp 694; read at 4351-4356). Duration is `(level - startLevel + 1)` minutes while `level < startLevel + 9`, full duration above (4353-4361); `(level - 10)` minutes only holds at the default start level 11. Same as cell 1.
- Auto-release: outside instances, the death timer counts down (1571-1580) and calls `BuildPlayerRepop` then `RepopAtGraveyard` at zero.
- Corpse life: `Corpse::IsExpired` (270-276): bones after 60 minutes, normal corpse after 3 days, both measured from the ghost time.

### The boundary (checked with node on the VPS; no file written)

The donor's helper computes `count = (expire - now) / 300` with no `-1`. Cell 1's donor (azerothcore, Player.cpp 13264) subtracts one second and says in a comment (13263) that this is deliberate. The effect here: a read in the same whole second as the window start gets the next tier up.

| read | cmangos donor math | cell 1 math (with -1) |
|---|---|---|
| lone death at 0 s, read at 0 s | 60 | 30 |
| lone death at 0 s, read at 5 s | 30 | 30 |
| death #2 at 120 s, read at 120 s | 120 | 60 |
| death #2 at 120 s, read at 125 s | 60 | 60 |

So the donor shows a longer countdown only when the release happens in the same whole second as the death (or as a window boundary). The reclaim gate re-reads the delay at reclaim time, so the server allows the reclaim at the 30 s point; the countdown the client was given at release (60 s in that second) is the only value out of step.

## 2. Key functions

- `Player::getCorpseReclaimDelayHelper`: `/mnt/frankendom-donors/cmangos-mangos-classic/src/game/Entities/Player.cpp` 1361-1374.
- `Player::GetCorpseReclaimDelay`: `/mnt/frankendom-donors/cmangos-mangos-classic/src/game/Entities/Player.cpp` 18990-18997.
- `Player::UpdateCorpseReclaimDelay`: `/mnt/frankendom-donors/cmangos-mangos-classic/src/game/Entities/Player.cpp` 18999-19019.
- `Player::KillPlayer`: `/mnt/frankendom-donors/cmangos-mangos-classic/src/game/Entities/Player.cpp` 4418-4432.
- `Player::BuildPlayerRepop`: `/mnt/frankendom-donors/cmangos-mangos-classic/src/game/Entities/Player.cpp` 4266-4307.
- `Player::ResurrectPlayer`: `/mnt/frankendom-donors/cmangos-mangos-classic/src/game/Entities/Player.cpp` 4309-4365 (partly read).
- `WorldSession::HandleReclaimCorpseOpcode`: `/mnt/frankendom-donors/cmangos-mangos-classic/src/game/Entities/MiscHandler.cpp` 603-632.
- `WorldSession::HandleResurrectResponseOpcode`: `/mnt/frankendom-donors/cmangos-mangos-classic/src/game/Entities/MiscHandler.cpp` 636-657.
- `Spell::EffectResurrect`: `/mnt/frankendom-donors/cmangos-mangos-classic/src/game/Spells/SpellEffects.cpp` 4796-4850 (body read to the request queue).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Rolling window, one step per death, capped at N steps | Step 300 s and cap 3 (Player.cpp 136-137) |
| Delay table indexed by window tier | `{30, 60, 120}` s (Player.cpp 139) |
| Ghost waits: ghost time plus delay must pass before self-reclaim | Reclaim gate (MiscHandler.cpp 623) |
| Durability hit on death as a fraction of max | 10% hardcoded (Unit.cpp 1158); 25% on spirit revive (NPCHandler.cpp 420); per-spell opt-out (Unit.cpp 1155) |
| Revive at a fraction of HP | 50% spirit healer (NPCHandler.cpp 418); 50% reclaim (MiscHandler.cpp 630); 100% in battleground (630) |
| Sickness above a level | Level 11 default (World.cpp 694); `(level - startLevel + 1)` minutes below `startLevel + 9` (Player.cpp 4353-4361); equals `level - 10` at the default |
| Corpse decay | 60 min bones (Corpse.cpp 273); 3 days normal (274) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: the window moves at death; the delay is read with `now` clamped to the window end; the reclaim gate compares ghost time plus the delay read now. It differs in three deliberate places: (a) the delay subtracts one second before the division, as cell 1's donor does, which removes the same-second boundary above (fix); (b) `mayRevive` takes a `gateRequests` flag: the donor does not gate a healer's request (`false` reproduces the donor); the proposed Frankendom value is `true` (fix, pending Dom's ruling 1); (c) the durability percent is an argument (zone data) instead of the donor's hardcoded 0.10, and a per-spell opt-out is a boolean argument. It omits: the victim branch conditions (battleground, responsible player), the release timer, the sickness aura, the spirit-healer HP and durability values, the corpse decay, quest failure on release, and the battleground 100% revive.

```ts
// Licence: GPL-2.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const WINDOW_STEP_S = 300;   // one rolling window step (engine rule)
const MAX_WINDOW_STEPS = 3;  // window never extends past 3 steps (engine rule)

interface DeathWindow { expireAtS: number; } // server clock, seconds; 0 = no open window

// Call once per death, before the delay is read for that death.
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

// Delay tier. The donor clamps `now` to the window end first, so an expired window reads tier 0.
// Fix: the donor has no -1 on the remaining time, so a lone death read in the same whole second
// as its window start (remaining = 300) picks tier 1 (60 s). Subtract one second, as the azerothcore donor does.
function reclaimDelayS(w: DeathWindow, nowS: number, table: readonly number[]): number {
  const now = Math.min(nowS, w.expireAtS);
  const idx = Math.min(Math.floor((w.expireAtS - 1 - now) / WINDOW_STEP_S), table.length - 1);
  return table[Math.max(0, idx)];
}

// Who may revive a ghost, and when. The donor gates only the ghost's own reclaim.
// A healer's resurrect request (EffectResurrect -> AddResurrectRequest -> CMSG_RESURRECT_RESPONSE)
// is not gated in the donor. `gateRequests` = true is the proposed Frankendom fix; false matches the donor.
type ReviveSource = "self-reclaim" | "healer-request";
function mayRevive(src: ReviveSource, w: DeathWindow, ghostAtS: number, nowS: number, table: readonly number[], gateRequests: boolean): boolean {
  if (src === "self-reclaim" || gateRequests) {
    return ghostAtS + reclaimDelayS(w, nowS, table) <= nowS;
  }
  return true;
}

// Durability per death: percent of max, floored, at least 1 point. Items with a per-spell
// opt-out (the donor's SPELL_ATTR_EX3_NO_DURABILITY_LOSS) skip the hit. The percent is zone data (donor hardcodes 0.10).
function durabilityLossOnDeath(maxDurability: number, pct: number, spellOptOut: boolean): number {
  if (spellOptOut || maxDurability <= 0) return 0;
  return Math.max(1, Math.floor(maxDurability * pct));
}

// Smoke values from the donor's sequence (deaths at 0, 120, 240, 360 s, read at each death second).
const w: DeathWindow = { expireAtS: 0 };
const table = [30, 60, 120];
const seen: number[] = [];
for (const t of [0, 120, 240, 360]) {
  onDeath(w, t);
  seen.push(reclaimDelayS(w, t, table));
}
void seen;
void mayRevive;
void durabilityLossOnDeath;
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (copy at /tmp/cmangos-reclaim-revive.ts): exit 0. Note the smoke values in the file are the fixed version's (30, 60, 120, 120 at the death seconds); I did not execute the file, only typechecked it.

## 5. Lands in

- TARGET `src/fight/death.ts` (the same module as cell 1; this cell adds the revive-source rule and the boundary rule). Parity-checklist row 17 (death/respawn). The healer-request gate belongs to the same module, because the rule is about who can end a death, not about the UI.
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
- Brief rule served: 17 (death/respawn); server-verified (the reclaim gate and the revive decision are server-side in the donor; the client shows the countdown only); one ledger (the durability hit and the revive are one write).

Best transferable idea: a death window that adds one step per death and reads the delay tier at the moment of reclaim, with the one-second boundary fixed; and a rule that every route back from a ghost (own reclaim and another player's resurrect) passes the same gate.
Decision (proposed): adapt — keep the window and the table as in cell 1, add the one-second boundary fix, and gate healer resurrect requests on the same delay (the donor does not), with durability left out of v1.
Acceptance: a ghost in an open zone whose window is at tier 2 cannot accept a healer's resurrect before 120 s has passed, and a server test asserts that a lone death released in the same whole second shows 30 s, not 60 s.

## 6. Gaps and risks

- One ledger: the durability hit, the revive and any corpse state change must be one server write. The donor writes durability per item (`DurabilityPointsLoss`, not read) and the revive separately; Frankendom should not copy the split.
- Server-verified: the reclaim gate is server-side (MiscHandler 623). The healer path is also server-side (the request is queued by the spell effect, 4848); the gap is only that the reclaim delay is not read there.
- Zones as data: the donor's table and step are constants (Player.cpp 136-139); the config keys are `Death.CorpseReclaimDelay.PvP/PvE`, `Death.SicknessLevel` (World.cpp 694-697). The durability percent and spirit-healer percents are hardcoded, not config. Frankendom: put all of them in zone rows.
- Pit as client: the Pit should not start a window; the donor has no Pit concept.
- Many-on-one: the window counts deaths, not killers. Same as cell 1. The durability rule has a battleground exemption (Unit.cpp 1153) that a many-on-one Pit would need as its own rule.
- Revive by spell on a live target: `EffectSelfResurrect` (4936) is a self-cast. It is not gated by the window, so a class with self-revive bypasses the penalty; decide whether Frankendom has such a skill (row 13 specials).
- Defects, each with a fix:
  - Same-second boundary (table above): one tier too high on a read in the same whole second as the window start. fix: subtract one second before dividing (the sketch does this; cell 1's donor does too).
  - Healer resurrect bypasses the reclaim delay (EffectResurrect 4796-4848; HandleResurrectResponseOpcode 636-657). This is the donor's design as read, not a crash; it is a penalty bypass if the window is meant to slow every return. fix: gate the request on the same delay (Dom ruling 1).
  - `MANGOS_ASSERT(false)` on a second corpse (4277-4280): aborts the server on a state that the code treats as impossible. fix: log and return, as cell 1's donor does (BuildPlayerRepop logs and returns, AzerothCore Player.cpp 4534). Not reached in our reading; the assert is the donor's choice.
- Not read: `AddResurrectRequest` (client prompt), the 22012 spell's meaning, the sickness spell's duration in the DBC, `DurabilityPointsLoss`.

As-data shape:
- Not table-driven. Compile-time constants: the window step (300 s), the cap (3), the delay table `{30, 60, 120}` (Player.cpp 136-139).
- Config keys (World.cpp 694-699): `Death.SicknessLevel` (11), `Death.CorpseReclaimDelay.PvP` (true), `Death.CorpseReclaimDelay.PvE` (true), `Death.Bones.World` (true), `Death.Bones.Battleground` (true).
- Hardcoded per-death values: durability 0.10 (Unit.cpp 1158), spirit healer HP 0.5 and durability 0.25 (NPCHandler.cpp 418, 420), reclaim revive 0.5 / 1.0 in battleground (MiscHandler.cpp 630).
- Row fields (name: type) if this becomes a zone row: `zone_id: string`; `reclaim_delays_s: number[3]`; `durability_loss_death_pct: number`; `durability_loss_spirit_pct: number`; `spirit_hp_pct: number`; `revive_gated_for_requests: boolean`; `pvp_window: boolean`; `pve_window: boolean`. Engine constants (not in the row): step 300 s, cap 3, the boundary rule.
- A new X is one row: yes for a zone's delay table or revive gate flag; no for a new window rule (code). The donor needs code edits for every percent it hardcodes, so the row is the improvement, not a copy of the donor.

Provenance: repo `cmangos-mangos-classic`; files above; licence GPL-2.0 (LICENSE), so shape only.

What they patched later: no `.git` directory in the donor, so no commit history. `ChangeLog.md` line 168 (section "MaNGOS 0.11 (Jul 22 2008)"): "Support for corpse reclaim delay dependence from character death count in last period." That is when the window was added. `ChangeLog.md` line 408 (section "MaNGOS 0.7 (Jul 9, 2007)"): "Improved: durability cost calculation." No detail beyond the line. In-code: `// Not auto-free ghost from body in instances` (1570); `// confirmed to be on release` (4306) on quest failure; the `#define`s are unannotated.

Rulings for Dom:
1. Should a healer's or ally's resurrect be gated by the same reclaim delay as a self-reclaim? Recommendation: yes; otherwise the window only slows the lone player and a healer walks the ghost back at once.
2. Should PvE deaths in open zones start the window (the donor default is on)? Recommendation: yes in open zones, no in the Pit.
3. Do we want durability loss on death at all (donor: 10% of max per death, equipped slots only, none in battleground, opt-out per spell)? Recommendation: no in this slice; same as the ruling in cell 1.

Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
Brief rule served: 17 (death/respawn); server-verified kills and revives; one ledger; zones as data.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Licence: Player.cpp header says "or (at your option) any later version"; note said it was not established (fixed).
- SetPvPDeath wording: it stores the PvP flag (responsiblePlayer != nullptr) unless INSTAKILL, not "records a kill" (fixed).
- Sickness "(level-10) minutes" only at default Death.SicknessLevel 11; real formula level-startLevel+1 (fixed).
- Missed: EffectSpiritHeal revives at 100% with no sickness, delay or durability (third ungated path); UpdateCorpseReclaimDelay early-returns when the config for the death type is off (added).
Fixed 2026-10-12: licence line, SetPvPDeath wording, sickness formula (mechanism and constants table), added EffectSpiritHeal and window-off-switch lines. No sketch change.
