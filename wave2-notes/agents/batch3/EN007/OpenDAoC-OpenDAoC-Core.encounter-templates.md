# OpenDAoC-OpenDAoC-Core (encounter-templates, cell 2)

Donor: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/` (VPS, read-only) | Licence: GPL-3.0 per `LICENSE` and `README.md` line 41; root `gpl.txt` is GPL-2.0 text and the source header says "version 2 or any later version", so the repo does not settle which applies. Clean-room, shape only. No asset licence; game data origin not stated | C# | Verdict: STRONG (ambush, patrol, lair, camp bonus and the aggro budget are real and read in code; escort is NONE). Decision: adapt (idea), with the defects in section 6 fixed in the sketch.

Best transferable idea: scan aggro candidates with a per-tick check budget and a rotating start, so a crowd costs the same each tick, and wake a pack by sharing one aggro table filtered by a package id.

Checked: Read the code for ambush (`scripts/mobs/StealtherMob.cs`, `scripts/mobs/AlbionMobs/UrchinAmbusher.cs`, `ai/brain/Special/UrchinAmbusherBrain.cs`, `ai/brain/Animist/ForestheartAmbusherBrain.cs`), patrol (`keeps/Gameobjects/Guards/Patrol.cs` in full, the offset in `GameKeepGuard.cs` 618-626), lair (`scripts/namedmobs/Galladoria/UaimhLairmaster.cs` in full), camp and XP (`serverrules/NpcKillRewardProcessor.cs` 256-275, `serverrules/AbstractServerRules.cs` 1040-1060, `gameobjects/GameNPC.cs` 3948), the aggro budget (`ai/brain/StandardMob/StandardMobBrain.cs` 61-100, 213, 275-300, `gameutils/AggroCandidateLoop.cs` in full), sentinel pull (`scripts/mobs/MidgardMobs/ScoutArgyle.cs` in full). For escort I opened three candidates that touch follow logic (`gameobjects/GamePlayer.cs` 12196-12214, `realmabilities/effects/rr5/MinionRescueEffect.cs` 96-118, `spells/Masterlevel/Sojourner.cs` 205-215); `grep -rn -i escort` over `GameServer` returned zero hits. Confidence high on patrol, aggro budget and lair order of operations. Medium on the camp-bonus defect (intent not stated in code). 51 receipts verified against the VPS files (`OpenDAoC-OpenDAoC-Core.encounter-templates.receipts.tsv`).

## 1. Mechanism

Encounter shapes in the donor, as code:

- **Ambush (stealth until touched).** `StealtherMob` sets the stealth flag in its constructor (`StealtherMob.cs` 7). `UrchinAmbusher` is one; its brain clears stealth as soon as it is attacked (`UrchinAmbusherBrain.cs` 12-15). The aggro scan skips any player who is stealthed or mounted (`StandardMobBrain.cs` 99), so stealth also keeps the player out of ordinary mob aggro. The reveal is on the first hit the mob takes, not on proximity. The read files show no re-stealth. The forestheart ambusher is a pet with a 2000-unit aggro range (`ForestheartAmbusherBrain.cs` 10), so it is an aggressive pet rather than a hidden one.
- **Patrol (a guard group on one shared path).** `Patrol` (`Patrol.cs`) loads one path by patrol id through `PositionMgr` (83); the position data is the keep's database rows (the loader was not read). A base patrol has one guard; a full keep adds one (89); a keep above level four adds one more (91, 161). Guard types come from an array whose first three entries are fighter, archer and healer (59); a patrol never exceeds three, so the healer is the third slot. Each guard is placed at the keep's spawn point, then each next guard is offset 250 to 350 units along x and y (189). All walk the shared path at speed 250 (227). A formation offset by index (`GetMovementOffset`, 232) is applied as a walk target shift of plus or minus 50 in a 3-by-2 grid (`GameKeepGuard.cs` 618-626).
- **Lair (a leashed boss with a size pulse and one flee per life).** `UaimhLairmaster` sets roaming range to zero (`UaimhLairmaster.cs` 37), so it never leaves its spawn. Its respawn interval comes from a server property in minutes (40). It grows to its maximum size while it is in combat with a target (180, 184, 219) and shrinks to its minimum out of combat (225). A flee flag starts true (12); when health falls to 60 percent while the flag is set, the boss returns to its spawn point and clears the flag (141-145). The flag is set again on death (156), so each life gets one return. The return ignores its speed argument and uses max speed (101).
- **Camp (XP camp bonus and a sentinel that pulls).** A camp bonus stored on the NPC starts at one (`GameNPC.cs` 3948). At the kill, the reward processor checks how long the NPC has been alive since its spawn tick (265). If it is over thirty minutes, the full camp bonus applies and the stored value is set to 0.98 (268). Otherwise the bonus is the full value times the stored value (271). After the award, the stored value drops by 0.02 (`AbstractServerRules.cs` 1056-1057). So a freshly spawned NPC pays less the more often it is killed, and a long-lived one resets. The sentinel `ScoutArgyle` has aggro range 500 (31). When it has a target and `PullFriends("ScoutArgyleBaf", 1000)` returns more than zero, it shouts once (35-36).
- **Aggro budget (a per-tick scan with a rotating start).** The aggro scan runs only when the aggro list is empty, the mob is not casting, and no LOS check is pending (`StandardMobBrain.cs` 81). It checks at most five players and three NPCs per tick (61-62). `AggroCandidateLoop` walks the candidates from a stored index (43), stops when the check budget is spent (37), and stores where it stopped on dispose (52). So the same candidates are not checked every tick. Think interval is `max(500, 1500 - (AggroLevel / 10 * 100))` (213): a higher aggro level thinks more often, down to half a second.
- **Pull friends (the group wakes together).** `PullFriends` (284) shares the caller's aggro table with every nearby idle NPC that passes a filter (293). It returns how many were newly added (300). The sentinel's shout therefore fires only when a pull actually adds someone.

Escort: no quest escort exists in the read code. Follow logic exists for controlled pets (`GamePlayer.cs` 12210), rescue spirits (`MinionRescueEffect.cs` 111) and a summoner spell (`Sojourner.cs` 213). None is a quest that walks a player's NPC to a destination, pays on arrival, and abandons on distance.

## 2. Key functions

- Ambush: `.../scripts/mobs/StealtherMob.cs` 1-10; `.../scripts/mobs/AlbionMobs/UrchinAmbusher.cs` 5-16; `.../ai/brain/Special/UrchinAmbusherBrain.cs` 5-18; `.../ai/brain/Animist/ForestheartAmbusherBrain.cs` 5-18 (whole file).
- Patrol: `.../keeps/Gameobjects/Guards/Patrol.cs` 14-248 (whole file: InitialiseGuards 78-110, CreatePatrolGuard 112-133, ChangePatrolLevel 153-210, StartPatrol 217-229, GetMovementOffset 232-246). Offset applied at `.../keeps/Gameobjects/Guards/GameKeepGuard.cs` 618-626.
- Lair: `.../scripts/namedmobs/Galladoria/UaimhLairmaster.cs` 9-230 (whole file: AddToWorld 28-49, Tether 99-102, Health check 139-150, Death 154-158, Brain 163-228).
- Camp bonus: `.../serverrules/NpcKillRewardProcessor.cs` 82 (call), 256-275 (CalculateCampBonus); `.../serverrules/AbstractServerRules.cs` 1040-1060 (drop per kill); `.../gameobjects/GameNPC.cs` 3948.
- Aggro budget: `.../ai/brain/StandardMob/StandardMobBrain.cs` 61-62 (constants), 76-100 (scan gate, player and NPC scans), 213 (think interval), 275-301 (PullFriends); `.../gameutils/AggroCandidateLoop.cs` 7-55 (whole file).
- Sentinel: `.../scripts/mobs/MidgardMobs/ScoutArgyle.cs` 24-40 (whole file).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor numbers (theirs, not copied into the sketch) |
|---|---|
| Per-tick check budget for line-of-sight | 5 player checks, 3 NPC checks per tick (`StandardMobBrain.cs` 61-62) |
| Think interval scaled by aggro level | 1500 ms minus 100 ms per 10 aggro, floor 500 ms (213) |
| Aggro scan gate | scan only with an empty aggro list, no casting, no pending check (81) |
| Sentinel aggro range and pull radius | 500 (`ScoutArgyle.cs` 31); pull 1000 (35) |
| Boss leash | roaming range 0 (`UaimhLairmaster.cs` 37) |
| One flee-and-return per life | threshold 60 percent (141) |
| Boss respawn | server property in minutes (40) |
| Guard patrol spacing and speed | 250 to 350 units apart (`Patrol.cs` 189); speed 250 (14) |
| Guard count from keep size | base 1; plus 1 for a full keep (89); plus 1 above level four (91) |
| Camp bonus step | 0.02 per kill (`AbstractServerRules.cs` 1057); reset after 1800000 ms (265) |
| Stealth reveal | on first attack (`UrchinAmbusherBrain.cs` 15) |
| Zone rows in the server seed | 473 zone rows (`Zones.xml`, ZoneID tags) |

Walk density: the box has no mob spawn rows. The seed holds zone, region and start-point rows (`scripts/dbupdater/insert`: `Zones.xml`, `Regions.xml`, `StartupLocation.xml`). Mob spawns live in the companion database (OpenDAoC-Database v1.65, named in `README.md`), which is not in the box. So the "walk density" axis is not measurable here: not in the half read.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order (start from the stored index, visit candidates, stop when the check budget is spent, store the stop point). It counts every candidate visited as one check, where the donor counts only candidates that send a line-of-sight check. It omits the filters (stealthed, mounted, shade), the pending-check guard, the NPC pass, and the aggro table. The budget value is a donor tuning value used only as an example input.

```ts
// Licence: GPL-3.0 (donor LICENSE; gpl.txt says v2). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface ScanState {
  index: number; // where the next tick starts; persists between ticks
}

// Walk the candidates from a rotating start. Each candidate visited costs one check.
// Stop when the check budget is spent, and resume from the stop point next tick.
function scanWithBudget<T>(
  candidates: readonly T[],
  checkBudget: number,
  state: ScanState,
  isValidTarget: (t: T) => boolean,
): T[] {
  const hits: T[] = [];
  if (candidates.length === 0) return hits;

  let processed = 0;
  let spent = 0;
  while (processed < candidates.length && spent < checkBudget) {
    const t = candidates[(state.index + processed) % candidates.length];
    processed++;
    spent++;
    if (isValidTarget(t)) hits.push(t);
  }

  state.index = (state.index + processed) % candidates.length;
  return hits;
}

// Example budget: 5 player checks per tick, as the donor's constant (values are donor tuning, not copied).
export function playerAggroTick<P>(
  players: readonly P[],
  state: ScanState,
  canSeeTarget: (p: P) => boolean,
): P[] {
  return scanWithBudget(players, 5, state, canSeeTarget);
}
```

Typecheck: the block above (saved as a module) passed `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (exit 0).

## 5. Lands in

- TARGET `src/fight/aggro.ts` (new, the aggro and target-selection step): the per-tick budget with a rotating start, and the stealth gate on aggro. Parity-checklist row 4 (fight loop: aggro, chase, leash). The server tick budget also sits under row 18 / post-K item 3 ("server tick: fixed step, input intake, per-tick NPC budget"); this file is where that budget is applied.
- Spawn, respawn and camp decay for the same encounters belong in `origins/server/world-spawns.ts` under row 23 (zone population), not in a fight file.
- Reuse tag: rewrite-from-idea (GPL-3.0 or GPL-2.0; clean-room only).
- Brief rule served: 1 (one engine: the budget and the aggro gate are server-side; the client only shows the reveal and the shout); 2 (zones as data: zone rows are data, so an encounter is a data row).

## 6. Gaps and risks

Defects (the idea stays; each is listed with its fix):

- **D1 Camp bonus reset is one step low (likely, intent not stated).** For an NPC older than thirty minutes, the processor sets the stored bonus to 0.98 (`NpcKillRewardProcessor.cs` 268) and the per-kill drop then takes it to 0.96 (`AbstractServerRules.cs` 1057). A fresh NPC after one kill is at 0.98. So after the same kill the reset NPC is one step lower than a fresh one. Fix: set the stored value to 1.0 in that branch, so the drop leaves 0.98 as a fresh NPC would. Not run.
- **D2 Patrol creation ignores existing guards (latent).** `InitialiseGuards` creates guards with index `i` from zero up to `guardsOnPatrol` whenever the count is below that number (`Patrol.cs` 95-97), without subtracting the guards already present. Correct when called once on an empty list; a second call with one guard present would create two more. Fix: create only the difference, from the existing count. Call sites not read.
- **D3 Boss return ignores its speed argument (minor).** `ReturnToSpawnPoint(short speed)` calls the base with `MaxSpeed` (`UaimhLairmaster.cs` 101). The caller's speed is dropped. The comment says the boss cannot be attacked on its way back, but no code enforcing that was read. Fix: pass the argument through, or document why max speed is intended.
- **D4 Hit points hard-coded (tuning trap, not a bug).** `MaxHealth` returns 100000 (55) while the respawn comes from a server property (40). Fix: make hit points a data field next to the respawn.

Design limits seen:

- The camp bonus step is per kill, not per time, so a camp that is killed slowly pays the same as one killed fast. This may be intended; not decided here.
- The sentinel's pull is by package id, so it only wakes NPCs that share the id. Good for packs, but a pack must share an id in data.
- The lair size swell only runs while a target object is set (`Body.TargetObject`, 182), so a boss that has aggro but no target does not swell.

Not read: the rest of `GameServer` (about 1,000 files); `StandardMobBrain.cs` lines 1-75 and 100-200 beyond the scan; the spawn and respawn path in `GameNPC.cs` (AddToWorld and the respawn timer, so the reset of `SpawnTick` on respawn is unverified); the other named bosses except as listed; `OlcasgeanAndPrimals.cs` and `Krackenschtein.cs` (the catalogue covers them, not re-read in this pass); `ai/brain` other than the files listed; locale text (not needed for the mechanism); the companion database (not in the box). Client half: none in the box. Paired donor in the box: none (OpenDAoC-Database not present).

Half read: server (GameServer, cited files). Data: zone seed row count only (`Zones.xml`, ZoneID tags, 473 rows). Client: not in the box.

### Feel notes (what the player sees and feels, on a 375-wide phone)

- **Ambush.** A creature with the stealth flag stays hidden until it takes a hit; the first hit reveals it. The donor makes no warning, so the feel is "I attacked something that was there" rather than a surprise attack on you.
- **Patrol.** Three guards walk a shared route in a loose line, each a few hundred units behind the last, at one pace. They read as a unit at a glance, one melee, one ranged, one healer.
- **Lair.** A large humanoid boss that stays on its spawn. It swells when a target engages it and shrinks back out of combat. At 60 percent health it breaks away to its spawn point once per life, then comes back.
- **Camp.** A sentinel shouts one line when its pull adds someone, and the group wakes together. A camp's XP shrinks the more often it is killed; a long-lived one pays full again.

Why it is striking, against the criteria: the boss silhouette and the size swell read at 375 wide; the signature behaviour is the one-per-life break-away and return; the signature effect is the sentinel's shout that wakes the pack; and it could be ours at 20 to 30 percent resemblance (a stealth reveal on first hit, a formation trio, a swelling boss).

### The rule behind it

Encounter = aggro gate + group wake + leash. Aggro is a per-tick scan with a check budget and a rotating start, so cost is flat as the crowd grows. The group wakes through a shared aggro table, filtered by a package id. The boss leashes to a zero roam range, and its one-per-life retreat is a flag set on death and cleared on use. Numbers as designer-tunable data fields:

| name | unit | donor_value_or_null |
|---|---|---|
| aggro_checks_players_per_tick | count | null |
| aggro_checks_npcs_per_tick | count | null |
| think_interval_floor_ms | ms | null |
| sentinel_aggro_range_units | units | null |
| sentinel_pull_radius_units | units | null |
| boss_roam_range_units | units | null |
| retreat_threshold_pct | % | null |
| respawn_interval_min | minutes | null |
| patrol_speed | units/s (donor unit) | null |
| patrol_spacing_min_units, patrol_spacing_max_units | units | null |
| camp_bonus_step_per_kill | fraction | null |
| camp_bonus_reset_age_s | s | null |

Donor values are null: the licence is GPL and the numbers are tuning.

### 5-minute look test (Dom, on the phone)

Build three things in one zone and look at them on a 375-wide screen:

1. A stealth reveal: one creature in a patch of grass that is not drawn until you hit it. Judge: is the reveal readable, and does the first hit feel like a reveal or a glitch.
2. A patrol trio on a shared route: a fighter, an archer and a healer spaced a few hundred units apart, walking in a line. Judge: do they read as one unit at 375 wide, and can you tell who is which.
3. A leashed boss that swells when it engages and breaks away at 60 percent once per life. Judge: is the swell readable, and does the break-away read as the boss retreating rather than a bug.

### Licence and IP

- Code: GPL-3.0 per LICENSE and README (gpl.txt is GPL-2.0; the source header allows v2 or later). The repo does not settle which applies. Clean-room, shape only.
- Content: named bosses, realm names and class names are the donor's and are not used. The creatures are categories ("a stealth creature", "a patrol trio", "a leashed boss"), not instances. Rights status of the game data is unknown from the files.
- Keep: the per-tick budget with a rotating start; the stealth gate on aggro; a patrol trio on a shared route with spacing and a formation; a leashed boss with a one-per-life retreat; a size swell in combat. Change: our names and palette; occupancy- and time-based camp rules that we decide, not the donor's per-kill step (D1); patrol creation from the existing count (D2); the boss retreat argument passed through (D3); hit points as data (D4).
- No legal conclusions.

### Frankendom mapping

- 700 zones as data: an encounter is a row (roster ids from the 100 Pit characters, leash radius, aggro radius, retreat threshold, respawn minutes). The zone seed in the donor is itself a data table (473 rows), which supports the shape.
- Many-vs-one: the rotating budget keeps the cost of a crowd of enemies flat, which matters for max attackers = 3 with many candidates around. Target choice stays in the engine (row 4).
- Server-verified: aggro, stealth reveal, camp bonus and retreat are server state; the client shows the reveal, the swell and the shout from those events.
- Keep: the budget with rotation, the stealth gate, the trio on a shared route, the one-per-life retreat. Change: our own tuning, the camp bonus rule (D1), patrol count from existing guards (D2).
