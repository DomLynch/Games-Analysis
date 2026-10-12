# ModernUO (reputation-factions-crime-justice, cell 1)

Donor: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Regions/GuardedRegion.cs` (with `Engines/Player Murder System/PlayerMurderSystem.cs`, `MurderContext.cs`, `Mobiles/Guards/BaseGuard.cs`, `Server/Mobiles/Mobile.cs`, `Misc/Titles.cs`) | Licence: GNU GPL version 3 (`/mnt/frankendom-donors/ModernUO/LICENSE` line 4: "Version 3, 29 June 2007"; copyright ModernUO Development Team) | C# | symbol `GuardedRegion.CheckGuardCandidate`, `BaseGuard.Spawn`, `PlayerMurderSystem.ReportMurder`

Checked: read in full: `MurderContext.cs` (133 lines), `PlayerMurderSystem.cs` (428 lines), `BountyReportMurdererGump.cs`, `GuardedRegion.cs` lines 1-20, 35, 40-80, 145-367, `BaseGuard.cs` lines 11-336, `ReportMurdererGump.cs` lines 22-50. Read in part: `Notoriety.cs` 1-30 and 383-522, `Mobile.cs` (1676-1699, 1813, 2015-2060, 3794-3875, 4528-4538, 8380-8410, 9069-9072), `Titles.cs` (10-14, 116-131, 200-214), `Corpse.cs` 420-436, `PlayerMobile.cs` 335-348. Callers: `OnPlayerMurder` has one caller (`ReportMurder`, PlayerMurderSystem.cs 299); `CheckGuardCandidate` has callers in OnEnter, OnAggressed, OnGotBeneficialAction, OnCriminalAction and CallGuards (all read); `BaseGuard.Spawn` callers read: GuardedRegion.cs 282 and 326, GuardAvengeTimer (BaseGuard.cs 219); other callers not searched. Not read: the rest of `ReportMurdererGump.cs` after line 50 (what the `toGive` set is used for), `Titles.AwardKarma` body, `BountyBoard.cs`, `BountyMessage.cs`, `Killed` path, where `MakeGuard` places a new guard (its constructor was not read). Searched for a jail system with `grep -rli jail`: no jail mechanic found in the matches read (LightCycle.cs, PreventInaccess.cs and Solen items were not read; they look unrelated). Confidence: high on the murder ledger, decay and guard dispatch; medium on the exact guard placement. camera_scope: not applicable (not a camera topic).

Best transferable idea: a guard call is a short window that opens on the first offence and is re-armed by each new offence (without calling guards again), and guards already on the target are reused before any new guard is spawned, up to a per-target count from zone data.
Decision (proposed): adapt - keep the 2-minute hostile window and the reuse-first guard dispatch as zone data; reject the victim-filed murder report because kills must be server-verified under our rulings, so the murder count comes from the server, not a gump.
Acceptance: a player who attacks an innocent in an open zone is flagged for 2 minutes; a guard arrives within 15 seconds when a witness NPC is within 8 tiles; a second offence inside the window does not add a second guard; a server test asserts that guards on one target never exceed `guardCap` from zone data and that an idle guard is re-focused before a new one spawns.

## 1. Mechanism

Three linked pieces: a hostile flag, a murder ledger, and a guard dispatch. The order below follows the code.

- Hostile flag (criminal). A harmful action is criminal when the attacker's notoriety towards the target is Innocent (Mobile.cs 8381). `DoHarmful` computes `isCriminal` first (8401), then `OnHarmfulAction` calls `CriminalAction(false)` when it is true (8386-8391), which sets `Criminal = true` (4535). `Criminal` is a timed flag: each set cancels the old timer and starts a new one with `ExpireCriminalDelay` (1696), which is 2 minutes (1813). When it fires, `Criminal` is set false (9069-9072). Notoriety then checks Murderer before Criminal (Notoriety.cs 443-452).
- Murder ledger. A murder is not counted when the blow lands. It is counted only when a victim's report is accepted: `ReportMurder` (PlayerMurderSystem.cs 279-317) first refuses a repeat of the same reporter and killer within 10 minutes (286, 47), then calls `OnPlayerMurder` (299). Eligibility to be reported: the aggressor is a player, `CanReportMurder` is true and it has not been reported yet (ReportMurdererGump.cs 33). `CanReportMurder` is set from the criminal flag of the hit (Mobile.cs 3825, 3871) and cleared when the victim returns to full hits (Mobile.cs 2038-2041). `OnPlayerMurder` adds 1 to `ShortTermMurders` and 1 to lifetime `Kills` (263-264), counts a ping-pong at five kills when that rule is on (266-268; `PingPongEnabled` is T2A and not LBR, line 36), resets both decay clocks (272; `ResetKillTime`, MurderContext.cs 71-84), and sets karma to `Kills x -2000` on AOS or `Kills x -1000` otherwise (301).
- Decay of the ledger. Both counts decay on the player's played time, not the wall clock: `GameTime` is stored time plus the current session length (PlayerMobile.cs 337-347), and offline time does not advance it. `DecayKills` (MurderContext.cs 86-101) takes one step per elapsed period: when `ShortTermMurders > 0` and the short clock has run out, it drops one murder and moves the clock on by one 8-hour period (90-93); when `Kills > 0` and the long clock has run out, it drops one kill and moves on by one 40-hour period (96-99). A `MurdererTimer` runs `DecayKills` every 5 minutes for online contexts (PlayerMurderSystem.cs 389, 405-407), and disconnect runs one step (125). `Murderer` is `Kills >= 5` (Mobile.cs 1677).
- Bounty. When a victim reports a killer who has at least four kills (BountyReportMurdererGump.cs 37), the victim may attach a bounty up to the victim's bank balance (35, 61). The gold is withdrawn from the victim and added to the killer's record (62-64). A bounty is active only if the killer is a murderer, the bounty is above zero and the last murder is within 14 days (PlayerMurderSystem.cs 214, 48); the board lists active bounties sorted by amount, largest first (240). A carved head from a player corpse carries the bounty target when bounties are enabled (Corpse.cs 430-432). A guard accepts that head within 24 hours of carving (BaseGuard.cs 152), clears the bounty (174), deposits it to the claimant's bank (175) and awards 20 karma (176).
- Guard dispatch. A candidate is any living, non-invulnerable, non-staff mobile that is a murderer where reds are not always candidates, or that has the criminal flag (GuardedRegion.cs 335-345). `AllowReds` is `Core.AOS` (35), so on AOS a murderer is a candidate only through the criminal flag, and pre-AOS murderers are candidates always (335). Candidate events are: entering the region as a murderer (174), aggression with criminal intent (199-207), helping a criminal or murderer (218-223) and the criminal action itself (226-233). The first event for a mobile starts a 15-second window (352, 245) and tells the player that guards can now be called on them (249). The same event also looks for a witness: the nearest non-player human NPC within 8 tiles in the region (261-276). The witness test is the nearest non-player human within 8 tiles (for a creature, `IsHumanInTown()`; for others a human body in this region), 261-276. If there is one, it speaks a line (280), `BaseGuard.Spawn` sends one guard for the candidate (282), and the window is closed (283-284). Later events while the window is open restart the 15-second timer and do not spawn (292-296). A player saying the guards keyword calls every candidate within 14 tiles of the speaker (193-195, 303-332).
- `BaseGuard.Spawn` (BaseGuard.cs 23-48). Guards within 15 tiles of the target are counted (30). An idle guard (no focus) is re-focused on the target and uses up one of the requested guards (32-36). A guard already on the target uses up one unless only additional guards are wanted (38-40). The remainder is spawned, one at a time (44-46). Nothing else caps the count in this file.
- Guard behaviour once focused. The attack timer starts after 0.25 s and repeats every 0.1 s (272). Each tick it clears the guard's own criminal flag and kill count and refills stamina (288-290). If the target is dead, not alive or not a valid harmful target, the focus is dropped (294-299). With `GuardsInstantKill` (config default true, line 16) the guard teleports to the target and deals damage equal to the target's full hits (310-320). Otherwise it calls `NonLethalAttack` (333).
- Guard leaving. An idle guard's timer starts after 2.0 s and repeats every 2.5 s (227). It picks a random direction every fourth tick, or when a move fails (238-241). On the tick where the stage counter passes 16 (243), the guard is deleted if it has no spawner (254-256), or teleported back to its spawner otherwise (258-260). Derived from these values: that tick is number 17, at 2.0 + 16 x 2.5 = 42.0 s after the idle timer starts.
- Avenge timer. `GuardAvengeTimer` fires three extra single-guard spawns, starting at 2.5 s and one second apart (212-219). Its callers were not read.

Ordering: the hostile flag is set during the harmful action, before the hit resolves. The murder count is changed only later, by a victim's accepted report after death. The guard window starts from the same criminal event but spawns only if a witness is found, or when the guards keyword is spoken.

## 2. Key functions

- `GuardedRegion.CheckGuardCandidate`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Regions/GuardedRegion.cs` 236-297. Starts or re-arms the 15-second window; finds a witness within 8 tiles; spawns one guard through `BaseGuard.Spawn` and closes the window.
- `GuardedRegion.IsGuardCandidate`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Regions/GuardedRegion.cs` 335-345. The candidate predicate: murderer (when reds are not always candidates) or criminal, not staff, not invulnerable.
- `BaseGuard.Spawn`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/Guards/BaseGuard.cs` 23-48. Reuse of idle guards, count of guards already on the target within 15 tiles, spawn of the remainder.
- `GuardAttackTimer.OnTick`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/Guards/BaseGuard.cs` 280-335. Focus validity, instant kill or non-lethal attack.
- `GuardIdleTimer.OnTick`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/Guards/BaseGuard.cs` 230-265. Idle wander and despawn or return to spawner.
- `PlayerMurderSystem.ReportMurder` and `OnPlayerMurder`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Player Murder System/PlayerMurderSystem.cs` 260-317. Murder ledger entry, dedupe, karma set.
- `MurderContext.DecayKills`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Player Murder System/MurderContext.cs` 86-101. One decay step per elapsed period.
- `Mobile.Criminal` and `Mobile.CriminalAction`: `/mnt/frankendom-donors/ModernUO/Projects/Server/Mobiles/Mobile.cs` 1680-1699 and 4528-4538. The two-minute hostile flag.

## 3. Numbers vs mechanism

| Reusable rule (formula) | Donor value (range) | Where in donor |
|---|---|---|
| Hostile flag: set on each criminal act; expires `T` after the last set | T = 120 s | Mobile.cs 1813, 1696; set 4535 |
| Murder ledger: `ShortTermMurders += 1` and `Kills += 1` per accepted report | +1 each | PlayerMurderSystem.cs 263-264 |
| Report dedupe: same (reporter, killer) pair blocked for `D` | D = 10 min | PlayerMurderSystem.cs 47, 286 |
| Murderer status: lifetime `Kills >= K` | K = 5 | Mobile.cs 1677 |
| Short-term decay: one step per period `P` of played time after the last murder; a step adds `P` to the clock | P = 8 h; clearing N murders with no new one takes about 8N h (derived) | MurderContext.cs 77, 90-93; PlayerMurderSystem.cs 44 |
| Lifetime decay: one kill per period `Q` of played time | Q = 40 h; Murderer lapses about 40 h after the last reset (derived) | MurderContext.cs 82, 96-99; PlayerMurderSystem.cs 45 |
| Decay tick: every 5 min for online contexts; one step per call | 5 min | PlayerMurderSystem.cs 389, 405-407 |
| Bounty: attach only when the killer has at least `B` kills; capped at the victim's bank | B = 4; cap = balance | BountyReportMurdererGump.cs 37, 61 |
| Bounty expiry: active while last murder is within `E` days | E = 14 d | PlayerMurderSystem.cs 48, 214 |
| Head claim window | 24 h | BaseGuard.cs 152 |
| Head claim reward: bounty to bank, plus karma | bounty; +20 karma | BaseGuard.cs 174-176 |
| Karma on reported murder: `Kills x (-2000 AOS, -1000 else)` | -1000 or -2000 per kill | PlayerMurderSystem.cs 301 |
| Karma clamp | -15000 to +15000 | Titles.cs 13-14, 202 |
| Kill award fame: `victimFame / 100` (integer), plus 30% on Felucca under LBR | +1 per 100 victim fame; bonus `x / 10 * 3` (see defect 1) | Titles.cs 121, 126-127 |
| Kill award karma: `-victimKarma / 100` (integer) | 1 per 100 karma of the victim, sign reversed | Titles.cs 122 |
| Guard candidate window: first event starts it; later events restart it | W = 15 s | GuardedRegion.cs 245, 352, 292-296 (restart not receipted; read) |
| Witness search radius for a fake call | 8 tiles, nearest non-player human NPC | GuardedRegion.cs 261-282 |
| Guards keyword sweep radius | 14 tiles around speaker | GuardedRegion.cs 195, 303 |
| Guard count radius around target | 15 tiles | BaseGuard.cs 30 |
| Guard attack timer start and repeat | 0.25 s, then 0.1 s | BaseGuard.cs 272 |
| Guard instant kill (config) | default on; damage = target hits max | BaseGuard.cs 16, 310-320 |
| Idle guard leaves on tick 17 | start 2.0 s, step 2.5 s; 17th tick at 42.0 s (derived) | BaseGuard.cs 227, 243 |
| Guard count cap | none in this file (only the count of guards already around the target) | BaseGuard.cs 30-47 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: a new candidate that has a witness spawns one guard through the shared spawn rule; a later offence only restarts the window; the spawn rule reuses idle guards near the target first, counts guards already on the target and spawns the rest; idle guards leave after a fixed time. It omits: the witness NPC's speech and the "guards can now be called" message; the guards keyword sweep; the AOS reds rule; the guard attack timer, the instant kill and the guards clearing their own criminal flag. A guard with a post goes back to that post and stays there (the donor teleports a spawner-owned idle guard back to its spawner and stops its idle timer, so it stays); a guard without a post leaves. The post is passed in by the caller; how the donor sets the spawner was not read. It uses Chebyshev distance because the donor's range query was not read. It adds `guardCap`, which the donor does not have; the donor's only limit is the count already around the target. Spawn placement is copied from the target position because the donor's placement was not read.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Guard call-in: a criminal act opens a candidate window (re-armed by each new act); a witness or a call
// spawns guards for that target, reusing idle guards near it before spawning new ones; idle guards leave.

export interface Pos {
  x: number;
  y: number;
}

export interface Guard {
  id: number;
  focus: number | null; // target id this guard answers, or null when idle
  pos: Pos;
  idleMs: number;       // time spent idle, used for despawn
  post: Pos | null;     // spawner post; null when the guard has none
  parked: boolean;      // true once a post guard has returned to its post
}

export interface Candidate {
  targetId: number;
  expiresAt: number;    // ms timestamp; re-armed on every new offence
}

export interface GuardConfig {
  candidateWindowMs: number; // zone data: donor 15000
  guardRadius: number;       // zone data: donor 15 tiles to count guards on a target
  idleDespawnMs: number;     // engine constant: derived 42000 from donor idle timer
  guardCap: number;          // zone data: not in donor, added by us as a cap
}

function chebyshev(a: Pos, b: Pos): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

export class GuardDispatch {
  private candidates = new Map<number, Candidate>();
  private guards: Guard[] = [];
  private nextId = 1;

  constructor(private cfg: GuardConfig) {}

  // A criminal act or a murderer seen in a guarded zone. Returns guards spawned now.
  // simplified: the donor picks the nearest human NPC within 8 tiles as the witness; here the caller passes witnessNearby.
  markCandidate(targetId: number, pos: Pos, now: number, witnessNearby: boolean): number {
    const existing = this.candidates.get(targetId);
    if (existing) {
      // donor restarts the 15 s timer; it does not call guards a second time from this path
      existing.expiresAt = now + this.cfg.candidateWindowMs;
      return 0;
    }
    this.candidates.set(targetId, { targetId, expiresAt: now + this.cfg.candidateWindowMs });
    if (!witnessNearby) return 0;
    this.candidates.delete(targetId);
    return this.callGuards(targetId, pos, 1, false);
  }

  // Donor BaseGuard.Spawn: reuse idle guards near the target first, count guards already on it, spawn the rest.
  // simplified: the donor's range query is not read; Chebyshev distance is used here. Spawn placement is not read.
  callGuards(targetId: number, pos: Pos, amount: number, onlyAdditional: boolean, post: Pos | null = null): number {
    let want = amount;
    for (const g of this.guards) {
      if (chebyshev(g.pos, pos) > this.cfg.guardRadius) continue;
      if (g.focus === null) {
        g.focus = targetId;
        g.idleMs = 0;
        want--;
      } else if (g.focus === targetId && !onlyAdditional) {
        want--;
      }
    }

    const onTarget = this.guards.filter((g) => g.focus === targetId).length;
    const room = Math.max(0, this.cfg.guardCap - onTarget);
    const spawn = Math.min(Math.max(want, 0), room);
    for (let i = 0; i < spawn; i++) {
      this.guards.push({ id: this.nextId++, focus: targetId, pos: { ...pos }, idleMs: 0, post, parked: false });
    }
    return spawn;
  }

  // Advance time. Expired candidate windows close; idle guards accumulate idle time and leave when it reaches the limit.
  tick(now: number, dtMs: number): void {
    for (const [id, c] of this.candidates) {
      if (now >= c.expiresAt) this.candidates.delete(id);
    }
    this.guards = this.guards.filter((g) => {
      if (g.focus !== null || g.parked) return true;
      g.idleMs += dtMs;
      if (g.idleMs < this.cfg.idleDespawnMs) return true;
      if (g.post === null) return false; // no post: the guard leaves
      g.pos = { ...g.post };             // post guard: returns to its post and stays there
      g.parked = true;
      return true;
    });
  }

  guardCount(): number {
    return this.guards.length;
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `origins/server/world-spawns.ts`: zone population. Guards are spawns with a focus, so the candidate window and the reuse-first dispatch sit with the zone spawner, not the fight engine. Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer). The lead's hint was row 21 (catalogue fields); the mechanism is a spawn dispatch, so row 23 is named here, and the numbers also land as catalogue fields under row 21.
- Data: `guardRadius`, `candidateWindowS`, `idleDespawnS` and `guardCap` are zone data; `criminalFlagS`, `murderThreshold` and the decay periods are catalogue or engine constants (see the JSON sidecar).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 23 (zone population) and the server-verified-kill rule for the murder ledger (gap below).

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the described mechanism, and no donor line is translated.
- Murder count: the donor counts a murder only when a victim files a report after death. Our rulings say kills are server-verified, so the count must come from the server's kill record, not a gump. Reject the report step; keep the decay.
- Decay clock: the donor uses played time (`GameTime`, PlayerMobile.cs 343), so offline time does not count. We need a played-time field per character on the server. Not checked in our code.
- Guards clear their own criminal flag each attack tick (BaseGuard.cs 288). Do not port this; a guard's flag has no meaning for us.
- Guard kills: the donor's instant kill sets target damage to full hits (BaseGuard.cs 320). Under the one-ledger rule a guard's kill must pass the same damage path and kill check as a player's, not a direct full-hits write.
- Despawn: the donor deletes a spawner-less guard and returns a spawned guard to its post (BaseGuard.cs 254-260). The sketch now does the same (return to post, then park); the donor's teleport is a single move, and the post guard's later behaviour is not read.
- No count cap: the donor's only limit is the count already around the target within 15 tiles. We add `guardCap` as zone data; it is a Frankendom addition, not donor behaviour.
- Karma, fame and the head claim are numbers to keep as catalogue constants: the karma clamp is +/-15000 (Titles.cs 13-14).
- Jail: no jail mechanic was found in this donor. The donor's guard response is attack or despawn, not detention.
- Client-only parts (not ported): the "guards can now be called on you" message and the criminal colour are HUD.

Defects (fix each; idea kept):
1. Integer division in the Felucca bonus: `totalFame += totalFame / 10 * 3;` (Titles.cs 126) and `totalKarma += totalKarma / 10 * 3;` (127) give zero bonus whenever the base is under 10. fix: `totalFame += totalFame * 3 / 10;` and the same for karma, so the multiply runs before the divide.
2. Guard count has no explicit cap in the donor. fix: add `guardCap` as zone data (done in the sketch).
3. Guard despawn would delete a post guard. fix: return it to its post and park it (done in the sketch, `tick`).

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: 23 (zone population: caps, despawn, witness-gated spawn); server-verified kills (gap 1).

## Checker findings (Sonnet 5.5 medium, 2026-10-12)

Verdict: CLEAN
- No errors found; all cited lines and numbers verified against the donor.
- Missed: the guard instant-kill path also sets `creature.NoKillAwards = true` (BaseGuard.cs 317) and deletes the corpse of a non-player target; directly relevant to the one-ledger / no-loot rule. Confirmed NoKillAwards at BaseGuard.cs 317.
- Missed: `IsGuardCandidate` also excludes blessed mobiles (GuardedRegion.cs 339, `m.Blessed`).
