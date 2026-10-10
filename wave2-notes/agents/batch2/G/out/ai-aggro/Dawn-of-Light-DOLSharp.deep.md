# Dawn-of-Light-DOLSharp (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/ai/brain/StandardMobBrain.cs` | Licence: GPL-2.0-or-later (file header lines 4-7: "either version 2 ... or (at your option) any later version"; the repo `LICENSE` is the GPL v2 text) | C# | symbol `StandardMobBrain.CalculateNextAttackTarget`

Checked: in this file, `Think` (89-224), `CheckNPCAggro` (238-260), `CheckPlayerAggro` (265-301), `AddToAggroList` (446-566), `CalculateNextAttackTarget` (646-708), `CalculateAggroLevelToTarget` (715-755), the threat events in `Notify` (763-857), `OnAttackedByEnemy` (874-887), the protect block (499-538) and the constants (46-48) were read in full. Confidence high on order of operations and numbers. Not read: `Body.IsOutOfTetherRange`, `Body.MaxDistance`, `WalkToSpawn`, `BringFriends`, the `ProtectEffect` class, `ServerRules.IsAllowedToAttack`, the caller of `Think` and the scheduler that reads `ThinkInterval`, and the configured value of `ALWAYS_CHECK_LOS` (declared at `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/serverproperty/ServerProperties.cs` 654, config not read).

## 1. Mechanism

- Each mob keeps a threat table, `m_aggroTable`, mapping a living to a `long` threat value (357). A mob attacks the highest-scoring entry, not the closest one.
- Order of one think tick (`Think`, 89): (a) tether: if out of tether range and not in combat, walk to spawn and stop this tick (106-110). (b) Leash: when `MaxDistance` is set and the mob is not returning home, a spawn distance beyond the allowed radius sends it home and stops this tick (119-129); the allowed radius is `MaxDistance` if positive, else `-MaxDistance * AggroRange / 100` (123). (c) Roaming, pathing and facing the spawn (131-177) are not aggro. (d) If not attacking and `AggroLevel > 0`, run `CheckPlayerAggro` then `CheckNPCAggro` (202-206). Each scan returns at once when the table already has entries (240, 267). (e) If the table has entries, `AttackMostWanted` picks a target and starts the attack unless an offensive spell takes the turn (208-211, 626-638). (f) Otherwise stop attacking and clear the target (214-219).
- New-target scan: a player or NPC in `AggroRange` that is allowed to attack and has a non-zero aggro level (296, 252) is added with threat 1 (298, 257). For players, a mob with no faction aggro and no own aggro leaves the scan early (286-287).
- Threat gain from events (`Notify`, 763-857): damage adds `DamageAmount + CriticalAmount` (776-787). A pet's damage is split: the owner gets `max(1, 25%)` and the pet keeps `max(1, 75%)` (783-784). A heal adds threat only if the healer is already on the table and is a player or a non-peaceful NPC (825-829). A missed attack adds 1 and starts the attack (880-885, 874-887). A dying mob clears its table (797-800). When a pet this mob has on its table is killed, the pet's threat moves to the pet's owner (841-847).
- Protect (514-538): a living protector within `PROTECT_DISTANCE`, in combat, alive and not stunned, mezzed or sitting, takes `abilityLevel × 10%` of the threat added to the protected player (520-535).
- Group fill (485-497): when a grouped player gains threat, every group member not yet on the table is added with threat 1.
- Table update (541-565): an existing entry adds the amount and is floored at 1 (546-550), so no entry can be removed by a negative change. A new entry takes the amount if positive, else 1 (556-562).
- Target pick (646-708): for each entry, drop it if dead, inactive, stealthed, beyond `MAX_AGGRO_LIST_DISTANCE`, or no longer allowed to attack (659-667), with removal done after the loop (695-699). Skip necromancer shades without removing them (670-671). An entry scores only if it is in the same region and within `MAX_AGGRO_DISTANCE` (675-683): `score = threat × min(500 / distance, 1)` (685). The best score above 0 wins (686-690). If nobody qualifies, the whole table is cleared (702-705).
- Worked from line 685: threat 300 at 1000 units scores 150; threat 100 at 250 units scores 100. The farther, higher-threat entry wins.
- Line of sight (446-469): when `ALWAYS_CHECK_LOS` is set and the subject is a player or a pet's owner, the server asks that player's client (`SendCheckLOS`, 467), and adds threat only if the reply has bit `0x100` (422-425, 468). In this donor, line of sight is answered by the client.
- Think interval (307-309): `max(1500, 10000 - AggroLevel × 100)`. A mob with aggro 100 thinks every 1.5 s, a passive one every 10 s (comment 304-305).

## 2. Key functions

- `StandardMobBrain.Think`: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/ai/brain/StandardMobBrain.cs` 89-224. Tick order: tether, leash, roam, scan, pick, drop.
- `CheckNPCAggro`: same file, 238-260. Scans NPCs in `AggroRange`, threat 1 each.
- `CheckPlayerAggro`: same file, 265-301. Scans players in `AggroRange`, threat 1 each, with the faction and no-aggro early exit.
- `AddToAggroList` (3 arg): same file, 446-566. Gates (confused, dead, LOS), group fill, protect transfer, then the add.
- `CalculateNextAttackTarget`: same file, 646-708. The score and the table clear.
- `CalculateAggroLevelToTarget`: same file, 715-755. The per-target gate and aggro level, capped at 100 (754).
- `Notify` (threat events): same file, 763-857. Damage, heal, dying, enemy killed.
- `OnAttackedByEnemy`: same file, 874-887. Missed attack adds 1.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Threat table keyed by living; damage adds damage plus crit | Threat added is `DamageAmount + CriticalAmount` (776) |
| Score = threat × min(500 / distance, 1): full score close, falls off with distance | Factor 500 (685) |
| Range cut-offs: table prune, target range, pet range | 6000 (47, 662); 3600 (46, 683); pet 512 (48, 681) |
| Pet damage split between owner and pet | 25% and 75%, each floored at 1 (783-784) |
| Threat floored at 1, never removed by a negative change | Floor 1 (550, 562) |
| Protect transfer | 10% per ability level (521) |
| Aggro level caps the threat-to-target gate | 100 (754) |
| Think interval shrinks as aggro rises | Floor 1500, base 10000, step 100 per point (309) |

## 4. TypeScript sketch

simplified: omits the line-of-sight check and its client round trip (422-469), `BringFriends`, the faction and grey-con gates in the scans (252, 286-287, 734), the protect transfer (499-538), the group fill (485-497), the first-aggro sentence and the `PlayersSeen` bookkeeping (183-199), the roaming and pathing branches (131-177), the `StopAttack` teardown (reduced to "idle"), and the `IsAllowedToAttack` check (assumes every entity is attackable). It merges the player and NPC scans into one loop, which the donor runs as two. It drops the donor's raw pre-filter `amount > maxAggro` (676), which gives the same result because the score never exceeds the raw threat. It reads the zone, alive and active flags as plain fields. It assumes Euclidean distance (`GetDistanceTo` not read).

```ts
// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Ent {
  id: string;
  zone: string;
  x: number;
  y: number;
  alive: boolean;
  active: boolean;
  stealthed: boolean;
  immune: boolean;   // donor: necromancer shade is skipped, not removed
}

const MAX_TARGET_DIST = 3600;  // donor constant MAX_AGGRO_DISTANCE
const MAX_TABLE_DIST = 6000;   // donor constant MAX_AGGRO_LIST_DISTANCE
const FULL_SCORE_DIST = 500;   // donor distance factor 500.0

type Table = Map<string, number>;

const dist = (a: Ent, b: Ent): number => Math.hypot(a.x - b.x, a.y - b.y);

// Add threat. A new entry starts at the amount (or 1 if not positive). An existing entry never drops below 1.
function addThreat(table: Table, id: string, amount: number): void {
  const cur = table.get(id);
  if (cur === undefined) {
    table.set(id, amount > 0 ? amount : 1);
    return;
  }
  table.set(id, Math.max(1, cur + amount));
}

// Damage threat is damage plus crit. A pet hands 25% to its owner and keeps 75%.
function onDamage(table: Table, source: string, damage: number, crit: number, ownerOf?: string): void {
  let aggro = damage + crit;
  if (ownerOf !== undefined) {
    addThreat(table, ownerOf, Math.max(1, Math.trunc(aggro * 0.25)));
    aggro = Math.max(1, Math.trunc(aggro * 0.75));
  }
  addThreat(table, source, aggro);
}

// Target pick: drop invalid entries, score each live entry in range, keep the best.
// Score = threat * min(FULL_SCORE_DIST / distance, 1). Clear the table when nobody qualifies.
function pickTarget(table: Table, mob: Ent, world: Map<string, Ent>): Ent | null {
  const removable: string[] = [];
  let best: Ent | null = null;
  let bestScore = 0;
  for (const [id, amount] of table) {
    const e = world.get(id);
    const d = e === undefined ? Infinity : dist(mob, e);
    if (e === undefined || !e.alive || !e.active || e.stealthed || d > MAX_TABLE_DIST) {
      removable.push(id);
      continue;
    }
    if (e.immune || e.zone !== mob.zone || d > MAX_TARGET_DIST) {
      continue;
    }
    const score = amount * Math.min(FULL_SCORE_DIST / d, 1);
    if (score > bestScore) {
      best = e;
      bestScore = score;
    }
  }
  for (const id of removable) {
    table.delete(id);
  }
  if (best === null) {
    table.clear();
  }
  return best;
}

// Think interval: more threat, faster thinking, never faster than 1.5 s. Unit read as ms from the 1500 floor.
function thinkDelayMs(aggroLevel: number): number {
  return Math.max(1500, 10000 - aggroLevel * 100);
}

interface MobState {
  table: Table;
  attacking: boolean;
  aggroLevel: number;    // 0..100
  aggroRange: number;
  outOfTether: boolean;
  inCombat: boolean;
}

// One think tick, in donor order: leash, then new-target scan (only when not attacking and the table is empty), then pick.
function think(mob: Ent, s: MobState, world: Map<string, Ent>): { next: "walkHome" | "attack" | "idle"; target: Ent | null; thinkMs: number } {
  const thinkMs = thinkDelayMs(s.aggroLevel);
  if (s.outOfTether && !s.inCombat) {
    return { next: "walkHome", target: null, thinkMs };
  }
  if (!s.attacking && s.aggroLevel > 0 && s.table.size === 0) {
    for (const e of world.values()) {
      if (e.id === mob.id || !e.alive || !e.active || e.zone !== mob.zone) continue;
      if (dist(mob, e) <= s.aggroRange) {
        addThreat(s.table, e.id, 1);
      }
    }
  }
  if (s.table.size === 0) {
    return { next: "idle", target: null, thinkMs };
  }
  const target = pickTarget(s.table, mob, world);
  return { next: target === null ? "idle" : "attack", target, thinkMs };
}
```

## 5. Lands in

- TARGET `src/fight/aggro.ts` (new module, engine side): the threat table, the add rules, the scored pick, and the think interval. Parity-checklist row 4 (fight loop: aggro, chase, leash).
- today: none (new module).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later: clean-room only)
- Brief rule served: many-on-one hate list and target selection live in the engine (ruling); kills and threat come from server-verified hits only; the table is per mob on the server.
- Best transferable idea: keep a per-mob threat table keyed by entity, add damage plus crit on each verified hit, and pick the target by threat scaled down past 500 units, clearing the table when nobody qualifies.

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not copied.
- MAX_ATTACKERS = 3 is not in this donor. The grep for `MaxAttackers`, `MAX_ATTACKERS` and attacker limits in the mob brain found no cap. The table here holds any number of entries. Frankendom must keep the table unbounded and cap the engaged set at 3 in the engine, and it must say which entry loses its slot when a fourth enters range.
- Line of sight is answered by the client in the donor (422-425, 457-468). Frankendom must compute line of sight on the server, because kills are server-verified and the client must not decide who is in a fight. This path is not copied.
- The threat adds come from the server's `TakeDamage` event (771-787). In Frankendom, threat must come only from a server-verified hit, never from a client claim (one ledger).
- The pet split (783-784) only applies where a pet exists. The rulings I was given name no pets; I did not check the Frankendom code for pets, so the split is cut unless a pet is added later.
- The think interval is a timer in ms per mob (309). Frankendom's server tick is fixed step with a per-tick NPC budget (post-K item 3, server tick sub-line). The interval must become a tick count, so a tick budget decides which mobs think.
- The leash radius (119-129) depends on `MaxDistance` and `IsOutOfTetherRange`, not read. Any leash number in Frankendom is zone data.
- The protect transfer (499-538) belongs to guard and parry (checklist row 3), not to this module. Cut from row 4.
- The group fill (485-497) has no counterpart in a one-on-one duel. Frankendom's many-on-one is the hate list in the engine, not group membership. Cut.
- The donor's scan returns early when the table has any entries (240, 267). A Frankendom scan must follow the same rule or a fight will pull new mobs in mid-fight; the rule should be tested.
