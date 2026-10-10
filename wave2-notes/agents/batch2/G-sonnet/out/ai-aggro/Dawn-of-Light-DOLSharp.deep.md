# Dawn-of-Light-DOLSharp (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/ai/brain/StandardMobBrain.cs` | Licence: GPL-2.0-or-later (file header lines 2-7: "either version 2 of the License, or (at your option) any later version"; repo LICENSE is GPL v2, June 1991). Clean-room only: shape, not a translation. | C# | symbol `StandardMobBrain.AddToAggroList` / `CalculateNextAttackTarget`

Checked: Read in full `StandardMobBrain.cs` 46-310 (constants, `Think`, `CheckPlayerAggro`, `CheckNPCAggro`, `ThinkInterval`), 395-760 (`AddToAggroList`, `CalculateNextAttackTarget`, `CalculateAggroLevelToTarget`, `AttackMostWanted`), 763-1061 (`Notify` events, `OnAttackedByEnemy`, `BringFriends`), plus `ABrain.cs` 92-165 (the think timer), `GameNPC.IsOutOfTetherRange` (868-884), the BAF server properties (1888-1895) and `PROTECT_DISTANCE`. Not read: spell checking (1078+), `GetPlayersInRadius` cost, the pet/guard/dragon brains, line of sight response flow beyond the guard at 457-470, `WalkToSpawn` internals. Confidence: high that this is a complete, real hate-list brain.

## 1. Mechanism

- State per mob: a table `m_aggroTable` (target -> long hate). The mob "has aggro" while the table is non-empty (388-389).
- Think loop (89-224): the brain timer calls `Think` then re-arms itself with `ThinkInterval` (ABrain.cs 162-164). For a standard mob `ThinkInterval = max(1500, 10000 - AggroLevel*100)` ms (309), so a timid mob (level 0) thinks every 10 s and a fully aggressive one every 1.5 s. Order inside `Think`: (1) if out of tether range and not in combat, walk to spawn and stop (106-110); (2) defensive spells; (3) leash: if `MaxDistance` is set and the mob is farther from spawn than it (negative values mean a percent of aggro range), walk to spawn and stop (120-129); (4) idle behaviours (random walk, return to spawn, path); (5) if not "returning home": when not attacking and aggro level above 0, scan for new targets (players, then NPCs) (202-206); (6) if the table is non-empty, `AttackMostWanted` and return (208-213); otherwise stop attacking and clear target (216-219).
- Scan seeds hate: every eligible in-range target not already in the table is added with hate 1 if `CalculateAggroLevelToTarget` is above 0 (252-258, 296-299). Scanning is skipped entirely while the table is non-empty (240, 267) and while the mob is already attacking (202).
- Hate in: `AddToAggroList` (446-566). Order: confused mob ignores (448); dead mob ignores (451); optional line-of-sight check (457-470); `BringFriends` (472, see below); if the target is a player and amount > 0, every group member is added at hate 1 if missing (481-497); then every "protect" effect on that player soaks hate: skipped if the protector is stunned, mezzed, sitting, inactive, dead, not in combat, or farther than 1000 (507-515); soak = ability level x 10% of the hate (521), subtracted from the amount and credited to the protector (525, 533). The comment at 516-519 says "P I: prevents 10%", "guessed percentages, should never be higher than or equal to 50%". Finally the target's entry is created or increased; an entry can be lowered by a negative amount but never below 1 (549-550, 562).
- Hate sources (`Notify`, 763-857): a damage event adds `damage + crit` (776); if the damager is a pet, the owner gets 25% and the pet 75% (783-784); a heal on someone already in the table adds hate equal to the heal to the healer, if that healer is a player or non-peaceful NPC (825-830); a melee swing that MISSES still adds 1 hate and starts an attack (880-885); when a target dies, the mob re-picks (852); on its own death it clears the table (800).
- Target pick: `CalculateNextAttackTarget` (646-708). For each entry: drop it (and remove as attacker) if dead, inactive, stealthed, farther than 6000, or no longer attackable (659-667, 695-699). For the rest, if the raw hate is above the current best score and the distance is within 3600 (512 for pets), score = hate x min(500/distance, 1) (685) and the highest score wins. So hate counts in full inside 500 units and falls off as 500/d beyond. Note: the first gate compares raw hate against the best SCALED score (676), a donor quirk. If no valid target remains, the whole table is cleared (702-705).
- Bring a friend (929-1061): on the first hate from a player (or a player's pet), once per fight (946), the number of nearby players in the puller's group raises the add chance: `percent = initial + (attackers-1) * additional` (1018); each full 100 percent guarantees one add and the remainder is a dice roll (1021-1025). Friends are found in a 250 radius, doubling each pass up to 2000 (898, 907, 1033, 1058); each friend gets the victim at hate 1 and attacks at once, and cannot bring friends itself (1043-1052). Server property defaults: initial 0, additional 50 (ServerProperties.cs 1888-1895).
- Reset: tether and leash send the mob home and the brain's `Stop` clears the table (72-82). The code comment says mobs forget all aggro when respawned and returned home (99-101).
- Tick: timer-driven per mob (1.5 to 10 s), event-driven for hate adds.

## 2. Key functions

- `StandardMobBrain.Think`: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/ai/brain/StandardMobBrain.cs` 89-224. Tether, leash, scan, attack-most-wanted.
- `StandardMobBrain.AddToAggroList`: same file 446-566. Group pull-in, protect soak, floor at 1.
- `StandardMobBrain.CalculateNextAttackTarget`: same file 646-708. Prune plus distance-scaled max.
- `StandardMobBrain.Notify` (hate sources): same file 763-857.
- `StandardMobBrain.BringFriends`: same file 929-1061. Adds scaled by attacker count.
- `ABrain.BrainTimerCallback`: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/ai/ABrain.cs` 153-165. Think then re-arm.
- `GameNPC.IsOutOfTetherRange`: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/gameobjects/GameNPC.cs` 868-884.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Per-mob hate table, floor of 1, clear when no valid target | Entry floor 1 (mechanism) |
| Hate from damage plus crit, from heals, 1 from a miss | Heal hate = heal amount; miss = 1 (theirs, 829, 882) |
| Pet damage split owner/pet | 25% / 75% (theirs, 783-784) |
| Protect: a guardian soaks a share of hate | 10% per level, level 1-3, range 1000 (theirs, 521, ProtectAbilityHandler.cs 41) |
| Pick = hate scaled by distance falloff, prune invalid | Falloff knee 500, max pick 3600, list 6000, pets 512 (theirs, 46-48, 685) |
| Think cadence tied to aggressiveness | max(1500, 10000 - level*100) ms (theirs, 309) |
| Tether / leash reset when far from spawn | Per-template tether range, MaxDistance (data) |
| Add chance grows with attacker count; guaranteed adds per 100 percent | initial 0, extra 50 per attacker, radius 250 doubling to 2000, once per fight (theirs, 898, 907, 1018, ServerProperties.cs 1888-1895) |

## 4. TypeScript sketch

simplified: the hate table, group pull-in, protect soak, pet split, distance-scaled pick with pruning, think interval and tether test. It omits line of sight, the confused/dead guards, the protect target match and the stunned/mezzed/sitting detail (folded into one `active` flag), faction and "grey con" level checks, bring-a-friend, heal and miss hate sources (only the damage and pet path), the NPC-versus-NPC scan, and all spell logic. It keeps the donor quirk that the raw hate must beat the best scaled score before the scaled score is computed.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Combatant {
  id: string;
  alive: boolean;
  x: number; y: number;
  groupIds: string[];            // party members, including itself (empty if solo)
  ownerId?: string;              // set for pets
}

interface Protector {
  id: string;
  level: number;                 // 1..3, each level soaks 10% of incoming hate
  active: boolean;               // alive, awake, in combat, within range of the protected
}

const MAX_PICK_DISTANCE = 3600;  // donor units
const MAX_LIST_DISTANCE = 6000;
const FALLOFF_DISTANCE = 500;

class HateList {
  private table = new Map<string, number>();

  get has(): boolean { return this.table.size > 0; }
  get(id: string): number { return this.table.get(id) ?? 0; }
  clear(): void { this.table.clear(); }

  // amount may be negative; a stored entry never drops below 1.
  add(who: Combatant, amount: number, protectors: Protector[] = []): void {
    if (amount > 0) {
      for (const g of who.groupIds) if (!this.table.has(g)) this.table.set(g, 1);
      for (const p of protectors) {
        if (amount <= 0) break;
        if (!p.active) continue;
        const soaked = Math.trunc(p.level * 0.1 * amount);
        if (soaked > 0) {
          amount -= soaked;
          this.table.set(p.id, (this.table.get(p.id) ?? 0) + soaked);
        }
      }
    }
    const cur = this.table.get(who.id);
    if (cur !== undefined) this.table.set(who.id, Math.max(1, cur + amount));
    else this.table.set(who.id, amount > 0 ? amount : 1);
  }

  // Damage event: 25% of a pet's hit goes to its owner.
  onDamaged(source: Combatant, damage: number, crit: number, owner?: Combatant): void {
    let hate = damage + crit;
    if (source.ownerId && owner) {
      this.add(owner, Math.max(1, Math.trunc(hate * 0.25)));
      hate = Math.max(1, Math.trunc(hate * 0.75));
    }
    this.add(source, hate);
  }

  // Highest hate, scaled down beyond FALLOFF_DISTANCE; prunes invalid entries on the way.
  pick(self: { x: number; y: number }, lookup: (id: string) => Combatant | undefined,
       canAttack: (c: Combatant) => boolean): string | null {
    let best: string | null = null;
    let bestScore = 0;
    for (const [id, amount] of [...this.table]) {
      const c = lookup(id);
      const d = c ? Math.hypot(c.x - self.x, c.y - self.y) : Infinity;
      if (!c || !c.alive || d > MAX_LIST_DISTANCE || !canAttack(c)) { this.table.delete(id); continue; }
      if (amount > bestScore && d <= MAX_PICK_DISTANCE) {
        const score = amount * Math.min(FALLOFF_DISTANCE / d, 1);
        if (score > bestScore) { best = id; bestScore = score; }
      }
    }
    if (best === null) this.table.clear();
    return best;
  }
}

// Think cadence: more aggressive mobs think more often, floor 1.5 s.
function thinkIntervalMs(aggroLevel: number): number {
  return Math.max(1500, 10000 - aggroLevel * 100);
}

// Tether: out of tether range and not in combat -> drop everything and walk home.
function shouldReset(distFromSpawn: number, tetherRange: number, inCombat: boolean): boolean {
  return tetherRange > 0 && distFromSpawn > tetherRange && !inCombat;
}
```

## 5. Lands in

- TARGET `src/fight/hate.ts` (new: the engine hate list and target pick, called from the fight loop). Parity-checklist row 4 (fight loop: aggro, chase, leash); the pick feeds row 2 (AI brain).
- Many-on-one ruling: the pick must also honour MAX_ATTACKERS = 3. The donor has no slot limit; add "skip a candidate whose attacker slots are full" inside the pick loop, so the 4th mob picks a circling or waiting state instead.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: many-on-one logic (hate list, target selection) lives in the engine; leash/tether numbers as zone/creature data

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. Write from this note, not from the donor.
- No attacker cap: the donor lets any number of mobs hit the top of the table. Frankendom's MAX_ATTACKERS = 3 must be added, and that changes the pick from "highest hate" to "highest hate that has a free slot".
- Thread safety and locking in the donor (`lock` on the table) are an MMO server concern; a single engine tick does not need them.
- A per-mob think timer of 1.5 to 10 s is far too slow for fast duels. Keep the table logic, but run the pick on the engine tick (or on hate change) rather than on a timer; the cost is small because the table is tiny.
- "Group members enter the table at hate 1" and bring-a-friend are MMO pulling rules. Use them only for zone mobs, not for the Pit duel.
- Hate arithmetic uses long integers and `(int)` truncation; keep integer math in the engine for deterministic replay (row 19).
- Server-verified kills and one ledger: hate only chooses a target; damage still goes through the single engine step. Never let a hate event change health.
- The raw-hate pre-gate quirk (676) makes the pick slightly order-dependent; do not copy it blindly.
- Not read: how line of sight and `WalkToSpawn` really behave, faction aggro levels, other brains.
