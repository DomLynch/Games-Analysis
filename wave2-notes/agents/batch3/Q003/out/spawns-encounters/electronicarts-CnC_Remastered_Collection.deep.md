# electronicarts-CnC_Remastered_Collection (spawns-encounters, cell 4)

Donor: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/TEAMTYPE.CPP` | Licence: GPL v3 (or any later version, per the file header), with Electronic Arts' additional terms under GPL section 7 (repo LICENSE.md) | C++ | symbol `TeamTypeClass::Suggested_New_Team`

Checked: Read in full: TEAMTYPE.CPP 876-882 and 929-972 (Create_One_Of, Suggested_New_Team). HOUSE.CPP 1001-1033 and 1104 (the two house pulses; the capture-the-flag block inside the idle pulse, about 1034-1103, was not read in full). TEAM.CPP 146-200 (constructor and destructor counting), 280-361 (team strength and start; the recruit and mission code after 420 was not read). LOGIC.CPP 160-200 and 255-300 (driver order). CONQUER.CPP 1575-1577 and 1663-1666 (Logic.AI call and Frame++; the span between them was read only in part). FTIMER.H 43-80. Read in part: TEAMTYPE.CPP 1-20 (header), REAL.H 750-766 and FUNCTION.H 780-796 (Random_Pick), LICENSE.md 1-8 and the closing terms. Grep only, not read: REINF.CPP (Do_Reinforcements), TRIGGER.CPP (team creation at 499, 687, 878), the IRandom body (RAND.CPP), the #if that encloses HOUSE.CPP 940-943, the recruit and build-to-fill code in HOUSE.CPP. Confidence: high on the idle pulse, the alert batch, the cap, the selection order, and the start and delete rules (all read in the code). Medium on the full group lifecycle, because the refill path was not read. Depth: thin.

Best transferable idea: a spawn director that adds at most one group per timer pulse, counts live groups per type against a cap, and lets a second, alert-only group type spawn in batches only after the zone is alerted.
Decision (proposed): adapt - the one-per-pulse timer, the per-type live cap and the alert gate map onto row 23 zone population, but the donor's unit-mix scoring, its RNG batch and its keep-empty-unstarted-teams rule do not fit our one ledger, so take the shape only.
Acceptance: A server test with a group def of cap 3 and a 90-tick pulse asserts that the live count never exceeds 3 over 10 simulated minutes, that after 3 kills exactly one group respawns per pulse, and that an alert-only def spawns only after the zone is alerted; in play, a calm zone brings in at most one new pack every 6 s (90 ticks at 15 per second, if the server runs at that rate).

## 1. Mechanism

- Who calls it: the spawn path here is a house-level director. A house does not place single units through it. It creates `TeamClass` objects from `TeamTypeClass` templates, and each template carries a cap (`MaxAllowed`) and an autocreate flag (`IsAutocreate`) (TEAMTYPE.CPP:876-882, TEAMTYPE.H fields; the defaults are TEAMTYPE.CPP:129 and 133).
- Order inside one logic pass: `LogicClass::AI` runs every live team's `AI()` first (LOGIC.CPP:182-184), then the objects (LOGIC.CPP:195), factories (LOGIC.CPP:262), and finally the house `AI()` calls (LOGIC.CPP:275-310; the single-player branch at 293-296 was read). So a team's strength is recalculated before the house decides on new teams in the same pass.
- House pulse, step 1, alert batch (HOUSE.CPP:1001-1024): only if the house is alerted and the alert timer has expired. It asks for up to `maxteams = Random_Pick(2, (BuildLevel-1)/3+1)` teams (HOUSE.CPP:1006). For each, it asks the selector with `alerted = true` (1008), raises `ScenarioInit` around the create call (1010-1012), and calls `Create_One_Of` (1011). Then it re-arms the alert timer to `TICKS_PER_MINUTE * Random_Pick(4, 10)` on hard, `Random_Pick(16, 40)` on easy, and `Random_Pick(5, 20)` otherwise (1015-1022). The alert timer is not re-armed while the house is not alerted, so an expired timer stays expired (the timer reads zero, FTIMER.H:75-80).
- House pulse, step 2, idle pulse (HOUSE.CPP:1030-1033 and 1104): when the team timer expires, ask the selector with `alerted = false` (1031). Autocreate types are then excluded entirely, because their cap becomes 0 (TEAMTYPE.CPP:939). Create at most one team (1033). Re-arm the timer to `TEAM_DELAY` (1104), which is `TICKS_PER_MINUTE/10` (HOUSE.H:696) = 90 ticks.
- Selection (TEAMTYPE.CPP:929-972): a type is eligible if it belongs to the house and `TeamClass::Number[index]` is below `(alerted || !IsAutocreate) ? MaxAllowed : 0` (939). Its value is `RecruitPriority` if the house has any unit or infantry type the team needs (964), otherwise `RecruitPriority/2` (966). The highest value wins. The first eligible type wins a tie, because a later one needs a strictly higher value (969).
- Cap at creation (TEAMTYPE.CPP:876-882): `Create_One_Of` returns a new team only if `ScenarioInit` is set or the live count is below `MaxAllowed` (878). In the alert batch the cap check is therefore skipped at creation, but selection (939) already applied it, and the batch re-selects for each team.
- Live count: `TeamClass::Number` is a static array per team type (TEAM.CPP:60). The constructor increments it (TEAM.CPP:194) and the destructor decrements it (TEAM.CPP:157). A live team counts toward the cap in any state.
- Team strength (TEAM.CPP:303-361): when `IsAltered` is set (303), `desired` is the sum of the class's `DesiredNum` (306). With members (`Total` non-zero): full strength when `Total == desired`. Human-side teams are never under strength (the human branch). AI reinforcable teams are under strength when `Total <= desired / 3` (325-326). AI non-reinforcable teams are under strength only until `IsHasBeen` is set (335). With no members (340-353): under strength, and the team is deleted if the house is human or `IsHasBeen` is set (350). Otherwise it stays, and it keeps counting toward the cap (other deletion paths not read). Reforming is flagged when the under-strength flag flips (361).
- Start: when a team is not moving and at full strength (or forced), it starts moving and sets `IsHasBeen = true` (417-419). From then on, becoming empty deletes it (350).
- Clock: the timers are frame timers. `Set` stores the current `Frame` and the delay (FTIMER.H:58-59). `Time()` is the delay minus the frames since the start, floored at 0, and `Expired()` is `Time() == 0` (FTIMER.H:75-77). `Frame` is incremented once at the end of the frame logic (CONQUER.CPP:1663-1666). The `TICKS_PER_SECOND` define is 15 (DEFINES.H:2146), so one idle pulse is 6 s if the frame logic really runs at 15 per second. That rate was not checked: whether the frame step is fixed or variable was not read.
- Tick count: all of this is synchronous and per logic pass. There is no batching across passes beyond the timers.

## 2. Key functions

- `TeamTypeClass::Create_One_Of`: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/TEAMTYPE.CPP` 876-882 (cap check at 878).
- `TeamTypeClass::Suggested_New_Team`: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/TEAMTYPE.CPP` 929-972 (eligibility at 939, value at 964-969). Its only caller is the house wrapper `HouseClass::Suggested_New_Team` (HOUSE.CPP 2251-2254), which is called from the two pulses at HOUSE.CPP 1008 and 1031.
- `HouseClass::AI`, alert pulse and idle pulse: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/HOUSE.CPP` 1001-1033 and 1104.
- `TeamClass::AI`, strength and delete block: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/TEAM.CPP` 303-361, with start at 417-419. Constructor and destructor counting at TEAM.CPP:194 and 157 (`Number` static at TEAM.CPP:60).
- `LogicClass::AI`, the driver: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/LOGIC.CPP` 160-200 (team loop at 183) and 255-300. Frame counter at `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/CONQUER.CPP` 1663-1666.
- Countdown timer: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/FTIMER.H` 43-80.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One group per idle pulse, timer re-armed after each pulse | `TEAM_DELAY = TICKS_PER_MINUTE/10` = 90 ticks (HOUSE.H:696). At `TICKS_PER_SECOND` = 15 (DEFINES.H:2146) that is 6 s, if the step really runs at 15 per second (not checked) |
| Cap counted over live groups of the type; cap 0 by default | `MaxAllowed` (TEAMTYPE.CPP:878, 939); default 0 (TEAMTYPE.CPP:133) |
| Autocreate types only while alerted; excluded on the idle pulse | `IsAutocreate` default false (TEAMTYPE.CPP:129); idle pulse passes `alerted = false` (HOUSE.CPP:1031) |
| Priority pick, halved when the house has none of the needed types | `RecruitPriority` and `RecruitPriority/2` (TEAMTYPE.CPP:964-966). The mix masks were not read beyond the test |
| Alert batch of 2 up to a level-scaled maximum | `Random_Pick(2, (BuildLevel-1)/3+1)` (HOUSE.CPP:1006). The `IRandom` range rule when min is above max was not read |
| Alert interval by difficulty (in minutes, converted to ticks) | hard 4-10, easy 16-40, otherwise 5-20 (HOUSE.CPP:1016-1021), with `TICKS_PER_MINUTE` = 15 x 60 = 900 ticks (DEFINES.H:2147). So hard is 3600-9000 ticks |
| Under strength at one third of desired, for reinforcable groups | `Total <= desired / 3` (TEAM.CPP:326) |
| Delete an empty group only if it has started or is human-side | `IsHasBeen` set at full strength (TEAM.CPP:417-419); delete at TEAM.CPP:350 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (alert batch first, then one idle pulse), the alert timer that stays expired until an alerted batch runs, the cap check at selection with the autocreate rule (alerted flag true for the batch, false for the idle pulse), the priority pick with first-wins ties, and one group per idle pulse. It omits the unit-mix scoring (`RecruitPriority` halving against house masks), the `ScenarioInit` bypass at creation (the sketch checks the cap once, in selection, which is the effective behaviour), team membership and recruitment, the under-strength and destroy-when-empty rules, the human-side branch, and the capture-the-flag branch. It clamps the alert batch maximum to at least 2, which the donor does not do; the donor's behaviour when min is above max was not read.

```ts
// Licence: GPL-3.0 (+ EA Section 7 terms) in the donor. Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

// Roll an inclusive integer in [lo, hi]. The caller supplies the RNG.
type Roll = (lo: number, hi: number) => number;

interface GroupDef {
  id: string;
  cap: number;        // max live groups of this kind (zone data)
  priority: number;   // higher wins when several are eligible (zone data)
  alertOnly: boolean; // true: only spawns while the zone is alerted
}

interface Director {
  alerted: boolean;
  live: Map<string, number>; // live groups per def id
  pulseLeft: number;         // ticks until the next idle pulse
  alertLeft: number;         // ticks until the next alert batch
  batchMax: number;          // largest alert batch (zone or engine data)
}

const PULSE_TICKS = 90;      // donor TEAM_DELAY = TICKS_PER_MINUTE/10 at 15 ticks per second

// alerted is the selection flag: the alert batch passes true, the idle pulse passes false (as in the donor).
function eligible(d: Director, g: GroupDef, alerted: boolean): boolean {
  const cap = alerted || !g.alertOnly ? g.cap : 0;
  return (d.live.get(g.id) ?? 0) < cap;
}

// Highest priority among eligible defs. The first eligible def wins a tie.
function pickGroup(d: Director, defs: GroupDef[], alerted: boolean): GroupDef | undefined {
  let best: GroupDef | undefined;
  for (const g of defs) {
    if (!eligible(d, g, alerted)) continue;
    if (!best || best.priority < g.priority) best = g;
  }
  return best;
}

function spawn(d: Director, g: GroupDef): void {
  d.live.set(g.id, (d.live.get(g.id) ?? 0) + 1);
}

function despawn(d: Director, id: string): void {
  const n = d.live.get(id) ?? 0;
  if (n > 0) d.live.set(id, n - 1);
}

// One logic tick. The alert batch runs first, then the idle pulse.
function step(d: Director, defs: GroupDef[], roll: Roll, alertRange: [number, number]): void {
  // An expired alert timer stays expired until a batch runs, as in the donor.
  if (d.alertLeft <= 0) {
    if (d.alerted) {
      const batch = roll(2, Math.max(2, d.batchMax)); // clamp: donor min>max case not read
      for (let i = 0; i < batch; i++) {
        const g = pickGroup(d, defs, true);
        if (g) spawn(d, g);
      }
      d.alertLeft = roll(alertRange[0], alertRange[1]);
    }
  } else {
    d.alertLeft -= 1;
  }

  if (d.pulseLeft <= 0) {
    const g = pickGroup(d, defs, false);
    if (g) spawn(d, g); // at most one group per idle pulse
    d.pulseLeft = PULSE_TICKS;
  } else {
    d.pulseLeft -= 1;
  }
}

export {};
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population: the director for spawn caps, respawn and despawn). Parity-checklist row 23: spawn caps and respawn come from the idle pulse and the per-type cap; the despawn grace timer is NOT in this donor (see section 6).
- Numbers as zone data fields: group cap, respawn interval (pulse), alert interval range, alert batch maximum. Engine constants: the one-group-per-pulse rule, the difficulty table, and the tick rate.
- today: not checked in this pass.
- Reuse tag: rewrite-from-idea (GPL v3 with EA additional terms; clean-room, shape only)
- Brief rule served: zones as data (row 23 caps and respawn as zone fields); one ledger (the live count lives in the server ledger, not in a static counter)

## 6. Gaps and risks

- Zones as data: the donor's numbers are constants or per team type (`MaxAllowed`, `RecruitPriority`, `IsAutocreate` at TEAMTYPE.CPP:133, 129). The difficulty-based alert intervals (HOUSE.CPP:1015-1021) are a fixed engine table. We would make cap, pulse and alert range zone data and keep the difficulty table, if we keep it at all, an engine rule.
- Despawn and grace (row 23): the donor has no grace timer. An empty group that has started, or any human-side group, is deleted at once (TEAM.CPP:350). An empty AI group that has not started is not deleted in that branch (other deletion paths not read), so it keeps counting toward the cap. We would have to add the grace timer ourselves and decide what happens to a group that never started.
- One ledger: the donor's live count is a static array changed by constructors and destructors (TEAM.CPP:60, 157, 194). That couples the cap to object lifetime. Frankendom should count live groups in the server ledger and not let destruction order move the cap.
- Randomness: the house pulse uses `Random_Pick` (HOUSE.CPP:1006, 1016-1021), which maps to `IRandom` (REAL.H:759). The header also defines `Sim_Random_Pick` (REAL.H:762), which the code read here does not use. Frankendom needs one seeded server RNG for spawns. Whether the donor's split causes a sync problem was not tested.
- MAX_ATTACKERS = 3: this donor cap limits how many groups of one type exist (population). It is not a limit on simultaneous attackers in a fight. The director must not spawn groups that break MAX_ATTACKERS = 3 for one player; that rule belongs to the engine's hate and target logic, not to this director.
- Timing: the timers count logic frames (FTIMER.H:77), not wall-clock time. If the Frankendom server tick is not a fixed step, spawn intervals drift. The director must run inside the server's fixed step with a per-tick budget (server tick sub-line: fixed step, input intake, per-tick NPC budget).
- Not covered: the refill path (team members recruited to desired counts; TEAM.CPP after 420 and the build-to-fill code in HOUSE.CPP), the trigger path that creates teams (TRIGGER.CPP 499, 687, 878), and Do_Reinforcements (REINF.CPP). These were not read, so the "respawn" half that refills an existing group is not covered by this note.
