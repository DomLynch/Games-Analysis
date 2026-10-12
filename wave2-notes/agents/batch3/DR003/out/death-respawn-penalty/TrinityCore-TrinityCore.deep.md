# TrinityCore-TrinityCore (death-respawn-penalty, cell 1)

Donor: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/` (Entities/Player/Player.cpp, Entities/Unit/Unit.cpp, Entities/Corpse/Corpse.cpp, Handlers/MiscHandler.cpp, Handlers/NPCHandler.cpp, World/World.cpp) | Licence: GNU GPL Version 2, June 1991 (`/mnt/frankendom-donors/TrinityCore-TrinityCore/COPYING`), "GPL-2.0" as read | C++ | symbol `Player::UpdateCorpseReclaimDelay` / `HandleReclaimCorpse`

Checked: Read in full: Player::KillPlayer (4355-4385), Player::BuildPlayerRepop (4212-4267), Player::ResurrectPlayer (4269-4353), Player::CreateCorpse start (4396-4412), Player::GetCorpseReclaimDelay / UpdateCorpseReclaimDelay / CalculateCorpseReclaimDelay (26507-26587), Player::DurabilityLossAll / DurabilityLoss (4466-4508), Player::Update release timer (1044-1058), RepopAtGraveyard start (4687-4730), WorldSession::HandleReclaimCorpse (MiscHandler.cpp 405-434), SendSpiritResurrect (NPCHandler.cpp 290-293), Unit::Kill (11311-11330 and 11470-11530 only; the middle, 11330-11470, not read), Unit::SendDurabilityLoss (11239-11244), Unit::GetTotalAuraMultiplier (5028-5032 start only), Corpse::IsExpired (228-238), World.cpp config defaults (640, 819, 1014, 1044). Other candidates opened and rejected for this topic: Battleground.cpp (ResurrectPlayer(1.0) calls only), SpellEffects.cpp 3850-3858 (self-resurrect spell, restore 0). Confidence: high on the reclaim-wait window, the reclaim gate and the durability numbers; medium on the full Unit::Kill path (middle not read); not read: ResetGhostTime body, CONFIG_DURABILITY_LOSS_IN_PVP default, the race sickness spell duration, SPELL_AURA_MOD_DURABILITY_LOSS sign convention. Necromancy on corpses: not searched. Item loss on death: none in the functions read (only durability).

Best transferable idea: a repeat-death window that lengthens the corpse-reclaim wait (30, 60, 120 s) and a reclaim gate that is checked on the server against both time and distance.
Decision (proposed): adapt — keep the rolling repeat-death tier and the server-side reclaim gate (both fit "server-verified" and "one ledger"), but store the wait at release and fix the four defects listed in section 6; reject the 6-minute auto-release and the GPL code shape.
Acceptance: with the donor's default switches (ladder on for PvP deaths, off for PvE deaths), a player killed by another player sees a 30 s reclaim timer on the ghost screen; a second player-caused death within 5 min shows 60 s; a death by a creature shows no wait; a server test asserts that a reclaim is rejected before ghost time plus the stored wait, and rejected from more than 39 units away.

## 1. Mechanism

Order of events on a player death, as the code runs:

- (a) Killing blow. `Unit::Kill` (Unit.cpp 11311) sets the victim to JUST_DIED (11480). For a player victim it records whether a player caused the death: `plrVictim->SetPvPDeath(player != nullptr);` (11503). This flag is the only "PvP tier" in the donor: it picks the corpse type, the reclaim wait switch, and the durability branch in (b).
- (b) Durability. Still in Unit::Kill (11498-11515): durability is lost only if no player killed the victim, or if `CONFIG_DURABILITY_LOSS_IN_PVP` is set; battlegrounds are exempt for the PvE case. The rate is `DurabilityLoss.OnDeath` = 10.0 divided by 100 = 0.10 (World.cpp 1014, 1044). It is applied to equipped items only (`DurabilityLossAll(baseLoss, false)`, Player.cpp 4466-4470). Each item loses `uint32(maxDur * percent / auraMultiplier)` points, minimum 1 (4500-4505).
- (c) Death timer. `KillPlayer` (4355) sets the state to CORPSE, sets the release timer to 6 minutes (4372), calls `UpdateCorpseReclaimDelay()` (4374), and sends the current wait to the client (4376-4379). No corpse exists yet.
- (d) Repeat-death window. `UpdateCorpseReclaimDelay` (26524-26546) keeps one timestamp per player, `m_deathExpireTime`. If the window is still open it computes `count = (expire - now) / 5 min + 1`; while count < 3 it sets the window to `now + (count+1) * 5 min`, otherwise to `now + 15 min`. If the window is closed it sets `now + 5 min`. Each death inside the window stretches it.
- (e) Release to ghost. `BuildPlayerRepop` (4212-4267) creates the corpse (4238). Its type is `CORPSE_RESURRECTABLE_PVP` if the PvP flag is set, otherwise `CORPSE_RESURRECTABLE_PVE` (4401), then the flag is cleared (4402). The body becomes DEAD with health 1 (4247-4248). The wait is sent again (4257-4260) and the ghost time is reset (4263).
- (f) Release can come from the player or from the timer. `Player::Update` (1046-1052) calls `BuildPlayerRepop` and `RepopAtGraveyard` when the 6-minute timer runs out, except in instances and when `SPELL_AURA_PREVENT_RESURRECTION` is present. `RepopAtGraveyard` (4687) teleports to the nearest graveyard (4708-4718). In no-ghost areas, and in non-raid dungeons and raids, the player is revived and bones are spawned (4696-4699).
- (g0) Two switches decide whether the ladder applies at all: `Death.CorpseReclaimDelay.PvP` and `.PvE`. Code defaults in World.cpp 640-641 are both true, but the shipped `worldserver.conf.dist` (2693-2694) sets PvP = 1 and PvE = 0. So at the shipped config only player-caused deaths use the 30/60/120 ladder; a creature death has no wait. When a switch is off, `UpdateCorpseReclaimDelay` does nothing (26527-26529), and `GetCorpseReclaimDelay` returns 30 s (tier 0) for a PvP death and 0 for a PvE death (26509-26515). The PvP flag is set at kill time and cleared when the corpse is made (4402), so a creature death followed by a player death flips the rule death by death.
- (g) Wait tier, read at the moment it is used. `GetCorpseReclaimDelay` (26507-26522): `count = (expire - 1 - now) / 5 min`, or 0 once the window is closed; the wait is `corpseReclaimDelay[count]` = 30, 60 or 120 seconds (26520-26521, 161). The tier is not stored; it is recomputed each time.
- (h) Reclaim gate, on the server. `HandleReclaimCorpse` (MiscHandler.cpp 405-434), in order: reject if alive (407), in arena (411), not a ghost (415), or no corpse (419); reject if `now < ghostTime + GetCorpseReclaimDelay(...)` (423-424); reject if the corpse is not within `CORPSE_RECLAIM_RADIUS` = 39 (Corpse.h 38; 426-427; the third argument `true` of `IsWithinDistInMap` was not read, so 2D or 3D is unconfirmed). Then `ResurrectPlayer(0.5)` (1.0 in a battleground, 430) with no resurrection sickness (default `applySickness = false`, Player.h 2325), then `SpawnCorpseBones()` (433).
- (i) Spirit healer, the other way back. `SendSpiritResurrect` (NPCHandler.cpp 290-293): `ResurrectPlayer(0.5, true)` (sickness applied) and `DurabilityLossAll(0.25, true)`, which takes 25 percent from equipped items and bags. The rest of this function (296 onward) was not read.
- (j) Resurrection sickness. Only when `applySickness` is set (4327). From `startLevel = 11` (`Death.SicknessLevel`, World.cpp 819; 4334): levels 11 to 19 get `(level - 11 + 1)` minutes (4343-4345), so level 11 gets 1 minute and level 19 gets 9; level 20 and up keep the spell's own duration (not read). The donor comment (4330-4333) states the same tiers.
- (k) Expiry. Bones expire 60 minutes after the ghost time; a resurrectable corpse expires after 3 days (Corpse.cpp 234-237). A corpse whose character no longer exists is always expired (231-232).

## 2. Key functions

- `Player::UpdateCorpseReclaimDelay`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Player/Player.cpp` 26524-26546. Repeat-death window.
- `Player::GetCorpseReclaimDelay`: same file 26507-26522. Wait tier from remaining window; PvE switch off returns 0 (26514-26515).
- `Player::CalculateCorpseReclaimDelay(load)`: same file 26548-26587. Live path and relog path (load = true) differ; see section 6.
- `WorldSession::HandleReclaimCorpse`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Handlers/MiscHandler.cpp` 405-434. The server reclaim gate.
- `Player::KillPlayer` 4355-4385 and `Player::BuildPlayerRepop` 4212-4267: same directory tree, `Entities/Player/Player.cpp`.
- `Player::ResurrectPlayer` 4269-4353: restore percent (4300-4304), sickness (4327-4352).
- `Unit::Kill` 11311-11530 (partly read): PvP flag and durability decision (11498-11515).
- `Player::DurabilityLoss` 4490-4508 and `DurabilityLossAll` 4466-4488: per-item durability.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Repeat-death window: each death inside an open window extends it by one more step, capped at 3 steps (26537-26545) | step 5 min (`DEATH_EXPIRE_STEP`, Player.cpp 153); cap 3 (154) |
| Reclaim wait tier = remaining window / step, 0 when closed (26520) | waits 30, 60, 120 s (Player.cpp 161). Tier 0 when a single death starts a fresh window. A second death within the window gives tier 1 (60 s); a third gives tier 2 (120 s) |
| Ghost reclaim gate: now >= ghost time + wait (MiscHandler.cpp 423) | wait as above |
| Reclaim gate on distance (426) | 39 units (Corpse.h 38) |
| Restore on reclaim: health = max * fraction (430, 4302) | 0.5 (1.0 in battleground) |
| Spirit healer: restore 0.5 with sickness (NPCHandler 292) and 25 percent durability on all inventory (293) | 0.25 |
| Death durability: equipped items, max durability times 0.10, minimum 1 point (Unit.cpp 11508-11512; Player.cpp 4502-4505) | 0.10 (World.cpp 1014, 1044) |
| Sickness minutes = level - 11 + 1 for levels 11-19 (4343-4345) | start level 11 (World.cpp 819) |
| Release timer: auto release after 6 min (4372; 1048-1052) | 6 min |
| Corpse lifetime: bones 60 min, resurrectable 3 days (Corpse.cpp 235, 237) | 60 min; 3 days |

## 4. TypeScript sketch

simplified: adds the donor's two per-death-type switches (`ladderPvp`, `ladderPve`; off means window untouched, wait 30 s for PvP and 0 for PvE). Keeps the donor's window update (`onDeath`), the tier read (`tierAt`) and the wait table, and the distance and time gate of the reclaim. Omits the relog path (`CalculateCorpseReclaimDelay(load = true)`), the alive, ghost and arena checks, the bones spawn, durability, sickness and the client message, and the battleground exception. Two deliberate changes, not donor behaviour: the wait is stored on the corpse at release (`release`), and distance is passed in rather than read from the map.

```ts
// Licence: GPL-2.0 (donor). Clean-room sketch of the mechanism, not a translation of the donor lines.
// A rolling death window sets how long a released ghost must wait before reclaiming its corpse.
export interface DeathTiers {
  stepMs: number;    // window step, donor 5 minutes
  waitsS: number[];  // reclaim wait per tier in seconds, donor [30, 60, 120]
  ladderPvp: boolean; // donor default on
  ladderPve: boolean; // donor default off (worldserver.conf.dist)
}

export interface DeathWindow {
  expireAt: number;  // ms epoch, per character
}

// Tier read from the window at time now. Donor: (expire - 1 - now) / step, 0 when the window is closed.
export function tierAt(w: DeathWindow, now: number, t: DeathTiers): number {
  if (now >= w.expireAt - 1) return 0;
  const tier = Math.floor((w.expireAt - 1 - now) / t.stepMs);
  return Math.min(tier, t.waitsS.length - 1);
}

// Called on each death. A death inside an open window stretches it by one more step, up to the cap.
export function onDeath(w: DeathWindow, now: number, t: DeathTiers, pvp: boolean): void {
  if (pvp ? !t.ladderPvp : !t.ladderPve) return;
  const max = t.waitsS.length;
  if (now < w.expireAt) {
    const count = Math.floor((w.expireAt - now) / t.stepMs) + 1;
    w.expireAt = count < max ? now + (count + 1) * t.stepMs : now + max * t.stepMs;
  } else {
    w.expireAt = now + t.stepMs;
  }
}

export interface Corpse {
  ghostAtMs: number;  // release time
  waitMs: number;     // stored wait, see release()
  pvp: boolean;
}

// Fix: the wait is fixed on the corpse at release. The donor re-reads the tier at reclaim time instead.
export function release(w: DeathWindow, now: number, pvp: boolean, t: DeathTiers): Corpse {
  const ladder = pvp ? t.ladderPvp : t.ladderPve;
  const waitS = ladder ? t.waitsS[tierAt(w, now, t)] : pvp ? t.waitsS[0] : 0;
  return { ghostAtMs: now, waitMs: waitS * 1000, pvp };
}

// Server-side reclaim gate: the wait has passed and the ghost is within radius of the corpse.
export function canReclaim(c: Corpse, now: number, distUnits: number, radiusUnits: number): boolean {
  return now >= c.ghostAtMs + c.waitMs && distUnits <= radiusUnits;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/DR003-TrinityCore-death.ts): exit 0.

## 5. Lands in

- TARGET `src/fight/death.ts` (new module: death window, release, server reclaim gate). Parity-checklist row 17 (death/respawn). The spawn and respawn side of zones is row 23, not used here.
- Current Frankendom death code was not read in this pass; the file above is the proposed home.
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room, shape only)
- Brief rule served: rule 4 (server-verified reclaim gate) and rule 1 (one engine; the corpse and window live on the server, the ghost screen is a client)

## 6. Gaps and risks

- GPL-2.0: clean-room only. The sketch is written from the mechanism; no donor line is copied.
- Defect 1, durability message is wrong for the normal death. `Unit::Kill` sends `loss = uint32(baseLoss - baseLoss * mult)` (Unit.cpp 11509) with `mult` = `GetTotalAuraMultiplier` (returns 1.0 when there is no aura, 5031-5032). With no aura that is 0.1 - 0.1 = 0, so the packet (11514) reports 0 percent. The fall-death path sends `rate * 100` = 10 (Player.cpp 667). Fix: send the configured rate, computed by one function that also applies the loss.
- Defect 2, the relog path disagrees with the live path, for the PvE-switch-off case only. `CalculateCorpseReclaimDelay(load = true)` uses tier 0 (30 s) whenever the switch for that death type is off (count stays 0, 26555-26560), while the live `GetCorpseReclaimDelay` returns 0 for PvE with the switch off (26514-26515); with the PvP switch off both give 30 s. The relog path also uses a different formula: `count = (deathExpire - ghostTime) / step`, capped at 2, and returns no wait if the ghost time is after the window end (26550-26561), where the live path uses `(expire - 1 - now) / step`. Fix: one wait function for both paths.
- Defect 3, the wait is re-read at reclaim (MiscHandler.cpp 423), so it can fall while the ghost waits. This may be intended as decay. Fix: decide. The sketch stores the wait at release (fixed waits); keep the re-read only if designers want decay.
- Defect 4, aura direction. `DurabilityLoss` divides the percent by the aura multiplier (Player.cpp 4500); the message multiplies the remainder by it (Unit.cpp 11509). The sign convention of `SPELL_AURA_MOD_DURABILITY_LOSS` was not read. Fix: one formula, tested with one aura.
- The donor has no item loss on death; only equipment durability. Frankendom's take-one loot rule is separate and must be designed on its own; this donor does not supply it.
- Frankendom rulings: the reclaim gate and the window are server-side (fits server-verified kills); the ghost screen is client-only. Arena reclaim is refused (MiscHandler.cpp 411), the Pit should do the same. Repeat-death tiers are zone data (window step, waits) so a PvP zone and a safe zone can differ.
- Not verified: PvP durability default (`DurabilityLoss.InPVP`), the race sickness spell duration, the full `Unit::Kill` middle, `ResetGhostTime`.

Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
Brief rule served: rule 4 (server-verified reclaim) and rule 1 (one engine); parity row 17


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: Verified: DEATH_EXPIRE_STEP 5 min, MAX_DEATH_COUNT 3, waits 30/60/120 (Player.cpp 153-161), UpdateCorpseReclaimDelay/GetCorpseReclaimDelay/Calculate formulas, KillPlayer 6 min timer (4372), HandleReclaimCorpse order and radius 39 (MiscHandler 405-434, Corpse.h 38), durability 0.10 and min 1, loss message 0 vs fall path 10, sickness level formula, Corpse::IsExpired 60 min / 3 days. Gaps: (1) note never states that PvE death has NO reclaim wait at default config (worldserver.conf.dist 2693-2694: CorpseReclaimDelay.PvP=1, PvE=0; World.cpp 640-641 code defaults are both true), so only PvP deaths use the 30/60/120 ladder by default; the section 1(g) wait and the sketch ignore the pvp/pve switch. (2) Defect 2 is only true for PvE-switch-off (load path gives 30 s, live gives 0); with PvP switch off both give 30. Note's wording 'whenever the switch for that death type is off' overstates. (3) load path computes count from (deathExpire - ghostTime)/step, a different formula from live; not described. Acceptance (30 s, then 60 s on 2nd death within 5 min, reject <ghost+wait, reject >39) matches the sketch arithmetic and passes.
Missed: PvE vs PvP switch defaults (above); PLAYER_EXTRA_PVP_DEATH is set at Kill time and cleared at CreateCorpse (4402), so a death by creature then a death by player flips the wait rule per death.

Fixed 2026-10-12 (Sonnet fixer): added the PvP/PvE switch defaults (shipped conf: PvP on, PvE off) to section 1 and the sketch, and the acceptance now says the ladder is for player-caused deaths and a creature death has no wait; defect 2 narrowed to the PvE-switch-off case, with the relog path's different formula described; sketch retypechecked on the VPS. Also found: the PvP flag set at kill time and cleared at corpse creation (4402) flips the rule death by death. Not verified: nothing further.
