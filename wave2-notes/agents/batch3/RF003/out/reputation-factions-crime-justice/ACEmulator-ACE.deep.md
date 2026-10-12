# ACEmulator-ACE (reputation-factions-crime-justice, cell 1)

Donor: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Player_Combat.cs` (with Player_Death.cs, PKModifier.cs, Player_Tick.cs, Player.cs, Portal.cs, and Managers/PropertyManager.cs) | Licence: AGPL-3.0 (repo LICENSE file: "GNU AFFERO GENERAL PUBLIC LICENSE Version 3, 19 November 2007") | C# | symbol `PKModifier`, `PK_DeathTick`, `SetMinimumTimeSincePK`, `UpdatePKTimers`, `CheckPKStatusVsTarget`

Checked: read in full: `PKModifier.cs` (196 lines). Read by range: `Player_Death.cs` 95-120, 227-238, 623-672, 951-1020; `Player_Combat.cs` 38-41, 117-125, 571, 707-730, 992-1029, 1160-1215; `Player.cs` 205-208, 503-520, 1089-1160; `Player_Tick.cs` 110-122; `WorldObject_Tick.cs` 45-60; `Portal.cs` 159; `Player_Location.cs` 60-70, 470-495; `Creature_Death.cs` 160-180, 555-590; `Player_Networking.cs` 50-70; `PropertyManager.cs` 627, 659-660 (defaults only). Not read: the body of `DamageTarget` after line 125, the spell-path callers of `CheckPKStatusVsTarget`, how often a player's heartbeat actually fires (the comment says about 5 s), whether offline time advances the respite, and the PK arena teleport body. Confidence: high on the flag state machine, the combat tag, the kill counters and the respite; medium on the offline-respite behaviour (not read). Licence AGPL-3.0: clean-room, shape only.

Best transferable idea: a PvP hit tags both fighters for a short window that blocks escape, a flagged kill stamps the killer's murder count, and the victim is unflagged for a respite that counts down on the server tick.
Decision (proposed): adapt — keep the combat tag, the murder stamp and the respite for our open PvP flag; drop the PKLite tier and the switch-object cooldown (they do not fit one open flag), and make the respite a server-time end stamp instead of a tick counter.
Acceptance: two flagged fighters who hit each other both show a red "tagged" mark for 20 s, and Recall is refused with "in combat" during that window; a server test asserts that after a flagged kill the killer's murder count is +1 and the victim is unflagged with a respite end stamp 300 s ahead, and that an unflagged player's attack on a flagged player is refused.

## 1. Mechanism

- Three flags sit on the player: `PlayerKillerStatus` NPK, PK and PKLite (`ACE.Entity/Enum/PlayerKillerStatus.cs`, read by grep only). A separate `PkLevel` (NPK or PK) is the level the player chose by using a switch object; it is stored as `PkLevelModifier` (`WorldObject_Properties.cs` 2690-2699). The flag follows the level except during respite and for PKLite.
- Attack gate: `DamageTarget` (`Player_Combat.cs` 117) calls `CheckPKStatusVsTarget` at line 125. For a player target, an NPK cannot harm a player (line 1184), an NPK target cannot be harmed by a PK (line 1187), and any harmful action between different flags is refused (refusal at 1196, return at 1202; the check also blocks harmful actions across a house boundary via `CheckHouseRestrictions`, 1190). A harmful spell or attack on a creature with a non-NPK flag must match the creature's flag (line 1209).
- Combat tag: a successful PvP hit calls `UpdatePKTimers(attacker, this)` (line 571, from the damage path) which sets both fighters' `LastPkAttackTimestamp` to now (lines 1008-1016), unless either side is `Free` (line 1012). `PKTimerActive` is true while the flag is PK or PKLite and less than `pk_timer` (20 s) has passed (line 1019). Recall-type actions and the PK arena teleport check this flag (`Player_Location.cs` 67, 490; `Portal.cs` 159).
- Delayed logoff: `PKLogoutActive` is true for PK-type players inside a 2-minute window (`PKLogoffTimer`, line 992; check at line 1021). Logging off then sets `IsFrozen` and a logoff time `pk_timer` seconds ahead (`Player.cs` 503-515). The comment on line 990 says 20 seconds, but the window is 2 minutes.
- Murder counts: when a player whose flag is PK (the victim) dies to a different player, the killer's `PkTimestamp` is set to now and `PlayerKillsPk` goes up by one (`Player_Death.cs` 104-107; `IsPKDeath`, `Player_Combat.cs` 712-715, tests the victim's flag and that the killer is a different player; the killer's flag is not tested). A PKLite death adds one to `PlayerKillsPkl` (line 119). Both counters start at 0 (`Player.cs` 205-208).
- Respite: after the death animation plus one second (`Player_Death.cs` 227), the death chain calls `SetMinimumTimeSincePK()` (line 236) for a PK or PKLite death (line 235). That sets the respite counter to 0 (line 961) and the flag to NPK (line 962). An NPK player with no respite already does nothing (line 956).
- Respite tick: `Player.Heartbeat` calls `PK_DeathTick()` (`Player_Tick.cs` 122). Each call adds `CachedHeartbeatInterval` (line 987). The respite ends when the counter reaches `pk_respite_timer` (line 989). A player at NPK level with no world-wide PK setting clears the respite at once (lines 981-983). Otherwise the flag is restored: PK if `pk_server` is set, PKLite if `pkl_server` is set, else the player's own level (lines 1000-1014).
- Switch (`PKModifier.cs`): a world object the player uses. Refused if the player's level is above PK or a world-wide PK setting is on (line 61), if the flag is PKLite (line 69), if the player is in respite (line 90), or if the player is an advocate (line 85). Switching NPK to PK, or PK to NPK, is allowed (line 146). Going PK to NPK is refused if less than the switch's own `MinimumTimeSincePk` has passed since the player's last PK kill (line 114); the player gets "harsh dissonance" (line 136). A successful use adds the switch's `PkLevelModifier` (+1 or -1, line 166), sets the flag to match the level (lines 168-172) after the use animation.
- Order for one PK death: kill (top damager is a different player and the victim's flag is PK) → killer's murder stamp and count (106-107) → corpse after the death animation (231) → respite starts (236, 961-962) → heartbeat adds time (987) → when the counter reaches the respite length, the flag is restored (1008).

## 2. Key functions

- `HandlePKDeathBroadcast`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Player_Death.cs` 95-120. Credits the top damager with the PK or PKLite kill and broadcasts it.
- `DamageTarget` (gate call): `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Player_Combat.cs` 117-125.
- `UpdatePKTimer` and `UpdatePKTimers`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Player_Combat.cs` 994-1017.
- `PKTimerActive`, `PKLogoutActive`, `IsPKType`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Player_Combat.cs` 1019-1027.
- `CheckPKStatusVsTarget`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Player_Combat.cs` 1160-1215.
- `SetMinimumTimeSincePK`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Player_Death.cs` 951-974.
- `PK_DeathTick`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Player_Death.cs` 976-1020.
- `PKModifier` (switch): `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/PKModifier.cs` 50-196 (`CheckUseRequirements` 50, `ActOnUse` 103, `MinimumTimeSincePk` 190-193).
- Death item count: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Player_Death.cs` 629-672 (`GetNumItemsDropped`).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants (default value, where it lives) |
|---|---|
| Combat tag: both fighters get a timestamp on each PvP hit; escape is blocked while now minus the tag is under the window | 20 s window, `pk_timer` (PropertyManager.cs 627; read at Player_Combat.cs 1019) |
| Respite after a flagged death: counter counts up by the heartbeat length until it reaches the respite length, then the flag is restored | 300 s, `pk_respite_timer` (PropertyManager.cs 660; compared at Player_Death.cs 989) |
| Heartbeat length that the respite counter adds each call | 5.0 s default when unset (WorldObject_Tick.cs 47-48); player comment says about 5 s (Player_Tick.cs 110) |
| Delayed logoff window for a PK-type player | 2 minutes, hard-coded (`PKLogoffTimer`, Player_Combat.cs 992) |
| Delayed logoff freeze length | 20 s, `pk_timer` (Player.cs 515) |
| Murder count: +1 per PK kill, separate +1 per PKLite kill | counter increments at Player_Death.cs 107 and 119; no constant |
| Switch cooldown: PK to NPK refused for the switch's own minimum time after the last PK kill | value is per switch object (`MinimumTimeSincePk` on PKModifier, read at PKModifier.cs 114); no default in code (not read in the data) |
| Death item count (for reference, not in the sketch): level 10 and below 0; 11-20 uses `ThreadSafeRandom.Next(0, 1)` (inclusive upper bound, so 0 or 1 items); 21+ is `level / 20` plus `Next(0, 2)` | cap 14 (`MaxItemsDropped`, Player_Death.cs 623); Miser reduction skipped for a PK death (line 667) |

## 4. TypeScript sketch

simplified: the sketch models the flag as NPK, PK and PKLITE, with a combat tag, a PK kill stamp, a respite counter and the switch rule. It reorders nothing from the donor's order of checks, but it applies the flag change at once where the donor waits for the death animation (+1 s) and the switch's use animation. It omits: the `Free` status (the sketch uses NPK as the non-combat flag), the housing boundary check, the advocate checks, spell-path rules, the corpse and item loss, the PKLite entry motion, the "allow_pkl_bump" collision step, the world-wide `pk_server` and `pkl_server` override beyond one `serverLevel` argument, the PK arena teleport, and all messages. The respite is still a tick counter here, to match the donor; the fix is in section 6.

```ts
// Licence: AGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Flag = 'NPK' | 'PK' | 'PKLITE';

interface Duelist {
  id: string;
  flag: Flag;                    // current hostile flag
  chosenLevel: 'NPK' | 'PK';     // level set by a switch object; PKLITE is separate and cannot switch
  lastPvpHitAt: number;          // seconds: combat tag (refreshed by both sides of a PvP hit)
  respiteS: number | null;       // seconds of NPK respite counted so far; null = no respite
  murders: number;               // PK kills
  pklKills: number;              // PKLite kills
  lastMurderAt: number | null;   // seconds: last PK kill (switch cooldown reads this)
}

const COMBAT_TAG_S = 20;         // donor pk_timer: escape is blocked this long after a PvP hit
const RESPITE_S = 300;           // donor pk_respite_timer: NPK respite after a PK or PKLite death

// Harmful action only between equal, non-NPK flags.
function canHarm(attacker: Duelist, target: Duelist): boolean {
  return attacker.flag === target.flag && attacker.flag !== 'NPK';
}

// A PvP hit tags both sides. NPK is never tagged (donor uses a 'Free' status here).
function tagPvpHit(a: Duelist, b: Duelist, now: number): void {
  if (a.id === b.id) return;
  if (a.flag === 'NPK' || b.flag === 'NPK') return;
  a.lastPvpHitAt = now;
  b.lastPvpHitAt = now;
}

// Recall / portal are refused while the combat tag runs.
function escapeBlocked(p: Duelist, now: number): boolean {
  const flagged = p.flag === 'PK' || p.flag === 'PKLITE';
  return flagged && now - p.lastPvpHitAt < COMBAT_TAG_S;
}

// Killing a flagged player: PK kill counts a murder and stamps the killer; PKLite kill counts a lite kill.
// The victim drops to NPK and starts respite.
function onPlayerDeath(victim: Duelist, killer: Duelist | null, now: number): void {
  if (!killer || killer.id === victim.id) return;
  if (victim.flag === 'PK') {
    killer.murders += 1;
    killer.lastMurderAt = now;
  } else if (victim.flag === 'PKLITE') {
    killer.pklKills += 1;
  } else {
    return;
  }
  victim.flag = 'NPK';
  victim.respiteS = 0;
}

// Per heartbeat: respite counts up by the heartbeat length, then the flag is restored.
// serverLevel models a world-wide PK or PKLite setting (null = off).
function heartbeat(p: Duelist, heartbeatS: number, serverLevel: 'PK' | 'PKLITE' | null): void {
  if (p.respiteS === null) return;
  if (p.chosenLevel === 'NPK' && serverLevel === null) {
    p.respiteS = null;             // a plain NPK player with no world PK setting leaves respite at once
    return;
  }
  p.respiteS += heartbeatS;
  if (p.respiteS < RESPITE_S) return;
  p.respiteS = null;
  p.flag = serverLevel ?? p.chosenLevel;
}

// Switch use. NPK -> PK is always allowed when not in respite; PK -> NPK is refused for
// switchMinS seconds after the player's last PK kill (the switch object's own value).
type SwitchResult = 'ok' | 'in-respite' | 'pklite' | 'no-change' | 'dissonance';

function trySwitch(p: Duelist, to: 'NPK' | 'PK', switchMinS: number, now: number): SwitchResult {
  if (p.flag === 'PKLITE') return 'pklite';
  if (p.respiteS !== null) return 'in-respite';
  if (p.chosenLevel === to) return 'no-change';
  if (to === 'NPK' && p.lastMurderAt !== null && now - p.lastMurderAt < switchMinS) return 'dissonance';
  p.chosenLevel = to;
  p.flag = to;
  return 'ok';
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (file /tmp/rf003-ace-hostile.ts) exited 0.

## 5. Lands in

- TARGET `src/fight/hostile-flag.ts` (new module): the open PvP flag, the combat tag, the murder stamp and the respite. The engine owns the state; the client only shows it. Kill attribution uses the server-verified top damager, as the donor does.
- Parity-checklist row 17 (death/respawn): the respite and the flag restore are a death-and-respawn rule. The hint was row 21, but row 21 is the catalogue fields list, which is where the data fields go, not the rule.
- today: no hostile-flag module found in this session's reading (not checked in Frankendom's repo).
- Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
- Brief rule served: 1 (one engine: flag, tag and respite live in the engine, kills server-verified); rules 7-9 n/a

## 6. Gaps and risks

- AGPL-3.0: clean-room only. The sketch is written from the mechanism. Do not port the donor's class names or messages.
- Defect 1, comment and constant disagree: the comment at `Player_Combat.cs` 990 says the frozen logoff lasts 20 seconds, but the window that triggers it is `PKLogoffTimer`, two minutes (992). The delayed logoff freeze is `pk_timer` (20 s, Player.cs 515). fix: one named data field `logoff_window_s` = 120 with a comment that matches it, and a test that asserts both numbers.
- Defect 2, respite counted in heartbeat steps: `MinimumTimeSincePk += CachedHeartbeatInterval` (line 987) can end up to one heartbeat (about 5 s) late, and it only advances when the player's heartbeat runs; whether offline time counts is (not read). fix: store `respiteEndsAt = now + respite_s` on the server and check it on each tick; no counter.
- Defect 3 withdrawn: `ThreadSafeRandom.Next(int, int)` is inclusive (`ACE.Common/ThreadSafeRandom.cs` 28-31, `random.Next(min, max + 1)`), so `Next(0, 1)` gives 0 or 1 and levels 11-20 do drop up to one item, as the donor comment says. No defect here; this does not affect the flag mechanism.
- The switch cooldown reads the switch object's own value, not a player stat. For us, a flag switch is not in the open-PvP design, so the cooldown is not adopted.
- PKLite tier: Frankendom has one open PvP flag. Keeping PKLite would add a third state with its own kill counter for no current ruling; reject unless Lead asks for it.
- Frankendom's rule that kills are server-verified: the donor credits the kill from the damage history's top damager (Player_Death.cs 95-106) and does not verify it in a separate check. We must verify the kill in the engine.
- Item loss on a PK death (`GetNumItemsDropped`, Player_Death.cs 629-672) conflicts with take-one loot. Not adopted in this note; belongs to the death-respawn topic (DR).
- Not read: the rest of the `DamageTarget` error path (after line 125), the spell path (`Player_Magic.cs` 1094 and 1129, read by grep only), the PK arena teleport body, and whether an offline player's respite advances.

Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
Brief rule served: 1 (one engine: flag, tag and respite live in the engine, kills server-verified); rules 7-9 n/a

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Murder wording: the bullet and order line said the killer's flag is PK; real IsPKDeath (Player_Combat.cs 712-715) tests the victim's flag and a different killer player. The sketch onPlayerDeath already used victim.flag. Confirmed.
- Defect 3 was false: ThreadSafeRandom.Next(min,max) is inclusive (ThreadSafeRandom.cs 28-31), so levels 11-20 drop 0 or 1 items. Confirmed; defect withdrawn.
- Different-flag refusal is at 1196 with the return at 1202, not 1196-1199. Confirmed.
- Missed: CheckPKStatusVsTarget also blocks harmful actions across house boundaries (CheckHouseRestrictions, 1190); now in the attack-gate bullet.
Fixed 2026-10-12: murder wording, order line, Defect 3 withdrawn, line cite, house-boundary line. Sketch code unchanged (it was already right).
