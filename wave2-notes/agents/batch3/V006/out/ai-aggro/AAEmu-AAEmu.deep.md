# AAEmu-AAEmu (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/Units/Unit.cs` (`AddUnitAggro` 1581, `ClearAggroOfUnit` 1665) with `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/NPChar/Aggro.cs` (whole file), `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/AI/v2/Behaviors/BaseCombatBehavior.cs` (`UpdateTarget` 283, `ShouldReturn` 244) | Licence: LGPL-3.0 (per `README.md` 33-46; the repo also carries `LICENSE.GPL` and `LICENSE.MIT`; no per-file header; the licence of this file was not established) | C# | symbol `Unit.AddUnitAggro` with `BaseCombatBehavior.UpdateTarget`

Checked: Read in full: `Aggro.cs` (58 lines), `AggroExtensions.cs`, `AIManager.cs`, `AttackBehavior.cs` (Tick), `DefaultAiCharacter.cs` (1-30), `AggroEffect.cs` (Apply). Read in part: `Unit.cs` 1581-1720 (add, clear, heal hook), `Npc.cs` 1020-1147 (death, empty-table return, `OnDamageReceived`), `BaseCombatBehavior.cs` 244-345 (`ShouldReturn`, `UpdateTarget`; the GeoData branch at 306-320 was read but not traced), `NpcAi.cs` 144-208 (tick and the transition helpers), `Behavior.cs` 205-213 and 347-394 (`OnEnemySeen`, `UpdateAggroHelp`). Not read: `CharacterTagging`, the quest hooks (`DoOnAggroEvents`), the `NpcGroup` aggro rules, other AI behaviours (archer, flytrap, big monster), and the `TickManager` subscribe implementation (the `true` argument at `AIManager.cs` 23 is not traced). Confidence: high on the table, the add order, the target pick and the leash rule as written; medium on the aggro-link helpers (read, not traced to the end). camera_scope: not a camera topic.

Best transferable idea: Keep one hate table per NPC where a damage row adds the attacker-scaled, NPC-scaled damage and a healer's row gets 60 percent of heal threat, then re-pick the target every 100 ms as the highest-total row that is visible and alive, dropping the rows that fail on the way.
Decision (proposed): adapt - take the hate table, the 60 percent heal share and the every-tick pick into `src/fight/aggro.ts` owned by the engine, but cap the active attackers at MAX_ATTACKERS = 3 (the donor has one target and no cap) and add a stable tie-break, since the donor's tie order is undefined.
Acceptance: a server test with five attackers on one boss keeps three active slots (the top three by total, visible and alive); a heal of 100 by a row adds 60 to that healer's row; a tie is broken by the earlier first hit; an empty table after a leash past 50 units returns the boss, and a boss beyond 200 units from its idle spot does not return.

## 1. Mechanism

**Storage (`Aggro.cs`).** Each NPC has `AggroTable`, a concurrent dictionary from attacker object id to an `Aggro` row (`Unit.cs` 272). A row keeps two counters, damage and heal, and `TotalAggro` is their sum (`Aggro.cs` 35-44). Heal aggro is stored at 60 percent: `_healAggro += (int)(amount * 0.6f)` (`Aggro.cs` 53). The damage counter is added as given (51). There is no decay and no caller of `RemoveAggro` (57; the only definition is in the repo).

**Adding (`Unit.AddUnitAggro`, 1581).** The existing-row branch sets `isNewAggro = true` (1616-1620), the inverse of its name; the return value was not traced. A dead attacker's row is also cleared by the abuser-died event handler (Unit.cs near 1708). Order of steps:
1. Tags (1595): if the NPC or the attacker has the NoFight or Returning buff tag, the attacker's row is cleared and the call returns false.
2. Tagging (1610-1611): damage also feeds the tagging list (not read).
3. Scale (1613-1614): `amount = trunc(amount x attacker.AggroMul / 100)`, then `amount = trunc(amount x this.IncomingAggroMul / 100)`. Both multipliers are percents with a default of 100 (`Unit.cs` 209, 217).
4. Row (1618-1627): the row is created if needed; a new row subscribes to the attacker's heal events. A first contact also sends a first-hit packet and may start a quest (not detailed here).
5. Player bookkeeping (1651): a character is marked as listed for this NPC only if the total is above 0 and the NPC is alive.

**Damage source.** `DamageEffect.Apply` calls `OnDamageReceived(caster, value)` on an NPC target (`DamageEffect.cs` 441-444, from the combat note). `Npc.OnDamageReceived` (1120) calls `AddUnitAggro(Damage, attacker, amount)` (1134) with the final damage value, then `Ai.OnAggroTargetChanged()` (1135). So the threat of a hit is the damage it did after armour.

**Heal source.** When an abuser is healed (`Unit.cs` 1627 subscribes; 1705 handles), `AddUnitAggro(Heal, healer, healAmount)` runs for the healer. So a healer of anyone already on the table gets 60 percent of the heal as aggro on this NPC.

**Seeding.** `OnEnemySeen` adds one point of damage aggro to the target, then goes to combat (`Behavior.cs` 211-212).

**Target pick (`BaseCombatBehavior.UpdateTarget`, 283).** Called by the attack behaviour on every AI tick (`AttackBehavior.cs` 34). Order:
1. If the NPC's current skill controller is running (fear, lift, pull, dash, leap), return `CurrentTarget != null` without changing the target, so the target is not changed mid-move (295-296). `ShouldReturn` has its own guard that returns false while a skill controller runs (251-252).
2. Sort the rows by `TotalAggro`, highest first (299-300).
3. Walk the sorted list. The first row whose unit is visible and not dead becomes `CurrentAggroTarget` and the target, the aggro-link helpers are called for it, and the method returns true (323-333). In the non-GeoData branch, a visible live unit that cannot be found in the world by its object id is skipped with `continue` (326-328) and is not cleared. A row whose unit is not visible or is dead is cleared from the table (336) as the walk passes it; rows below the chosen one are kept. The GeoData branch (306-320) picks the same way but was not traced.
4. If nothing matches, clear the current target if it is not a unit, or if it is dead (340-346), and return false. The attack behaviour then calls `OnNoAggroTarget` (`AttackBehavior.cs` 36).
- There is no hysteresis: the pick is recomputed each tick, so the target changes as soon as another row's total is higher. Ties are left to the order of the concurrent dictionary (not defined).

**Tick driver.** `AIManager.Initialize` subscribes its `Tick` to `TickManager.OnTick` with a 100 ms interval (`AIManager.cs` 23). Each tick it calls `npcai.Tick(delta)` for every registered NPC AI (45) under one lock. `NpcAi.Tick` (144) only runs its behaviour when the NPC has persistent AI (path or follow or queued commands) or the region has player activity (148). It then checks the table: an empty table calls `OnNoAggroTarget` and returns (153-160); otherwise rows that have NoFight or Returning, or that cannot be attacked, are removed (165-175).

**Leash (`ShouldReturn`, 244).** Defaults: return distance 50, absolute return distance 200 (254-255); template values override them. If there is no current target, return (266-267). Otherwise `res = targetDist > 50 or idleDist > 50`, and `res` is kept only if `idleDist <= 200` (272-274). So beyond 200 from the idle spot the method returns false (the comment on the teleport is not followed in this method; the teleport path was not read).
- Separately, when the table empties and the NPC is more than 4 from its idle spot, `Npc.CheckIfEmptyAggroToReturn` sends it to return (`Npc.cs` 1086-1088) and clears `IsInBattle`.

**Transitions.** The default AI maps `OnAggroTargetChanged` to Attack (`DefaultAiCharacter.cs` 14) and `OnNoAggroTarget` from Attack to ReturnState (29).

**Aggro-link helpers (`Behavior.UpdateAggroHelp`, 347).** Called after a new target is picked. It looks for NPCs around the attacked NPC within `200 x AttackStartRangeScale` (350). A candidate must accept aggro links and not be in battle (357) and be within its `AggroLinkHelpDist` (358). An aggressive candidate with no special rule joins at once (360-361). Other candidates need a sight check and a matching special rule (faction, friendly, neutral or everyone; 366-378). A joining helper receives `AddUnitAggro(Damage, abuser, 1)` (391), a one-point seed, then `OnAggroTargetChanged` (392).

**Aggro skill.** `AggroEffect.Apply` (caster must be a Character, target an NPC) rolls a random value in `[min, max)` built from a level term, a charged-buff term and a fixed term (45-67), sends an aggro packet, then `AddUnitAggro(Damage, character, value)` (69). This is the taunt-like path; it bypasses the damage value.

## 2. Key functions

- `Unit.AddUnitAggro`: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/Units/Unit.cs` 1581 onward (read to the player bookkeeping at 1651; the end of the method was not read).
- `Unit.ClearAggroOfUnit`: same file, 1665 onward.
- `Aggro` row: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/NPChar/Aggro.cs` 1-58 (whole file).
- `BaseCombatBehavior.UpdateTarget` and `ShouldReturn`: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/AI/v2/Behaviors/BaseCombatBehavior.cs` 244-346.
- Tick chain: `AIManager.cs` 23-45; `NpcAi.cs` 144-178; `AttackBehavior.cs` 29-37.
- Aggro-link helper: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/AI/v2/Framework/Behavior.cs` 347-394.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One hate row per attacker, damage and heal kept apart, total is the sum | Heal share 0.6 (`Aggro.cs` 53) |
| Threat scaled by the attacker's percent and the NPC's incoming percent | Percent multipliers, default 100 (`Unit.cs` 209, 217) |
| Target = highest total that is visible and alive, re-chosen each tick | AI tick 100 ms (`AIManager.cs` 23); no hysteresis |
| Remove rows that fail the test while walking | None (rule) |
| Leash: return if far from target or idle spot | 50 return distance, 200 absolute (`BaseCombatBehavior.cs` 254-255) |
| Empty table: return if more than 4 from idle spot | 4 (`Npc.cs` 1087) |
| Helpers join with a one-point seed | Seed 1 (`Behavior.cs` 391); helper radius 200 scaled by `AttackStartRangeScale` (350) |
| Attack-skill gate | 150 ms interval (`AttackBehavior.cs` 49) |

## 4. TypeScript sketch

simplified: the sketch keeps the add order (attacker percent, then the NPC's incoming percent, then the 60 percent heal share), the total ranking, the walk that drops invisible or dead rows as it passes them, and the leash rule as the code writes it (including the false return beyond 200). It omits: the aggro-link helpers (the one-point seed), the NoFight and Returning buff tags, the tagging list, quest hooks, the first-hit packet, the GeoData path branch, the skill-controller guards (`UpdateTarget` keeps the old target while one runs; `ShouldReturn` returns false), the check that a visible live foe is still found in the world (the donor skips such a row without clearing it; the sketch has no such state), the 100 ms tick and the NpcAi pruning of rows that cannot be attacked, and the empty-table return. It does not reorder anything the donor does.

```ts
// Licence: LGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Foe {
  id: number;
  visible: boolean;   // the NPC can see this foe
  dead: boolean;
  aggroMul: number;   // attacker-side percent, 100 = normal
}

interface Row { foe: Foe; damage: number; heal: number; }

class HateTable {
  private rows = new Map<number, Row>();

  constructor(private readonly incomingMul: number /* this NPC's percent, 100 = normal */) {}

  // Damage adds the scaled amount; heal adds 60 percent of it, truncated.
  add(kind: "damage" | "heal", foe: Foe, amount: number): void {
    let a = Math.trunc(amount * (foe.aggroMul / 100));
    a = Math.trunc(a * (this.incomingMul / 100));
    const row = this.rows.get(foe.id) ?? { foe, damage: 0, heal: 0 };
    if (kind === "damage") row.damage += a;
    else row.heal += Math.trunc(a * 0.6);
    this.rows.set(foe.id, row);
  }

  total(id: number): number {
    const r = this.rows.get(id);
    return r ? r.damage + r.heal : 0;
  }

  // Re-chosen every AI tick: the highest total that is visible and alive.
  // Entries that fail the test are dropped as the walk passes them.
  pickTarget(): Foe | null {
    const order = [...this.rows.values()].sort((x, y) => (y.damage + y.heal) - (x.damage + x.heal));
    for (const row of order) {
      if (row.foe.visible && !row.foe.dead) return row.foe;
      this.rows.delete(row.foe.id);
    }
    return null;
  }

  get size(): number { return this.rows.size; }
}

// Leash: return when the target is more than 50 away or the NPC is more than 50 from its idle spot,
// but only while the idle spot is within 200 (the donor returns false beyond that).
function shouldReturn(targetDist: number | null, idleDist: number): boolean {
  const RETURN = 50;
  const ABSOLUTE = 200;
  if (targetDist === null) return true;
  const res = targetDist > RETURN || idleDist > RETURN;
  return res ? idleDist <= ABSOLUTE : false;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (file `/tmp/hate_table_tc.ts`), exit 0.

## 5. Lands in

- TARGET `src/fight/aggro.ts` (new): the hate table and the target pick, owned by the engine; the brain in `src/fight/ai.ts` (not opened in this pass) calls it. Parity-checklist row 2 (AI brain).
- today: (not read) the Frankendom brain file.
- Reuse tag: rewrite-from-idea (LGPL-3.0; clean-room only)
- Brief rule served: one engine (the hate list and target choice are engine logic, not a client view), many-on-one logic in the engine (MAX_ATTACKERS = 3 is applied here, not in the client), zones as data (return distances and the helper radius are zone data)

## 6. Gaps and risks

- LGPL-3.0 per README, with a GPL file and an MIT file also present; this file's licence is not established. Clean-room only.
- The donor has one target per NPC and no attacker cap. Frankendom's MAX_ATTACKERS = 3 must be an engine rule on top: the three highest visible live rows get attack slots; the rest wait. This is the main adaptation.
- No hysteresis: the target changes the moment another row's total is higher, which in a fast duel means target flicker. Frankendom should pick a switch margin or a sticky target; the donor gives no evidence either way.
- Ties are undefined (dictionary order). Frankendom needs a stable tie-break, for example the earlier first hit.
- No decay and no caller of `RemoveAggro`: a row stays until it is cleared by the walk, a death, or a leash. Frankendom should decide on decay as a ruling, not by default.
- Threat is the damage value after armour (the combat note, `DamageEffect.cs` 444). A healer's share is 60 percent. Frankendom has no healing ruling; keep the heal row out until one exists.
- The helper seed of one point means a helper picks the abuser only as a weak entry; whether that is enough to pull a helper depends on other rows. Not tested here.
- The leash comment says a teleport happens beyond 200, but `ShouldReturn` returns false there. The teleport path was not read; do not copy the comment as a rule.
- The aggro skill (`AggroEffect`) adds a random value with no check on the target's rows, so a taunt can raise threat above the damage rule. Frankendom should route taunts through the same table with a named source.
- Not read: `CharacterTagging`, quest hooks on first aggro, the NpcGroup aggro rules, and the TickManager implementation.


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** 1) Note says every row failing the visible/alive test is cleared during the walk; non-GeoData branch BaseCombatBehavior.cs 326-328 does `continue` (skip, NOT cleared) when the unit is not found in the world. GeoData branch (306-320) is untraced, so the claim is only half-checked. 2) Note says skill-controller guard at 295-296 just 'stops'; it returns CurrentTarget != null (keeps the old target). 3) ShouldReturn has its own skill-controller guard (251-252) returning false, not mentioned. 4) Unit.cs AddUnitAggro: existing-row branch returns isNewAggro=true (1616-1620), inverted naming, not noted. All other cited lines/constants verified: Aggro.cs 35-57 (0.6f at 53), Unit.cs 1581/1595/1610/1613-14/1651/1665/1705, 272, 209/217, AIManager 23/45, AttackBehavior 34/36/49, NpcAi 148-175, Npc.cs 1087, Behavior.cs 211/350/357-361/391, ShouldReturn 254-274, AggroEffect 69, README LGPL.

**Missed:** OnAbuserDied (Unit.cs ~1708) clears the dead attacker's row via event subscription; AttackBehavior runs UpdateTarget first and ShouldReturn second in the same condition (34); not in note.
