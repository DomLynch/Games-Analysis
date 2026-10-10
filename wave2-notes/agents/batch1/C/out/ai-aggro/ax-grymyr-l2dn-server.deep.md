# ax-grymyr-l2dn-server (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/ax-grymyr-l2dn-server/L2Dn/L2Dn.GameServer.Model/Model/Actor/Attackable.cs` | Licence: MIT (repo `LICENSE.txt`: "Copyright (c) 2024-2025 Grymyr, L2Dn Server Project"; adaptation permitted, copy notice kept if code is copied; the sketch below is written from the mechanism, not copied) | C# | symbol `Attackable.getMostHated`

Checked: Read in full: `AggroInfo.cs` 1-82. `Attackable.cs` 765-870 and 880-986 (lines 871-879 not read). `AttackableAI.cs` 257-290, 398-440, 581 (header), 636-668, 1329-1380, 1392-1420, 1441-1444. Not read: the active-think range scan (AttackableAI.cs 290-397), the leash and home return (440-580), the walk-home branch of the attack think (668 onward), minion assist internals, the think scheduler, any hate networking, `Attackable.cs` 1066 onward. Confidence: high on the hate formula, the counters and the target order; medium on the think cadence (the only source is a comment at AttackableAI.cs 269, "Update every 1s", and the scheduler was not read).

Best transferable idea: give each mob a per-attacker hate table with capped counters, add a hate value per hit that scales with damage over (level + 7), pick the highest hate as the target, and hold a passive counter so a respawned or de-aggroed mob waits before it attacks.

## 1. Mechanism

- Each mob holds an aggro list: one row per attacker (`Attackable.cs` 39). A row (`AggroInfo`) holds `_hate` and `_damage`, both capped at 10^15 (`AggroInfo.cs` 7, 40, 55).
- Hit path, `addDamage` (`Attackable.cs` 776-816), order as the code runs:
  (a) skip if the mob is dead (784).
  (b) a walking mob stops its walk (789-792).
  (c) the AI is notified with `EVT_ATTACKED` first (794), before hate is computed.
  (d) hate per hit = `damage * 100 / (level + 7)` (797). For plain hits (no skill) the attacker's `HATE_ATTACK` stat multiplies it (798-801). The result is cast to int (803).
  (e) `addDamageHate` (824-870): fake players do not aggro each other unless configured (833-835). A non-targetable NPC summon owned by a player credits the owner (840-844). The row is created if missing (847) and gets the damage added (848). Hate is added unless the target player has a triggered trap (854-858). A zero-hate call sets an idle mob to ACTIVE (860-868).
- Most-hated, `getMostHated` (958-985): an empty or dead mob returns null (960). Each row runs `checkHate` (`AggroInfo.cs` 28-36), which zeroes hate for an attacker that is dead, not spawned, or outside the owner's surrounding region. The highest hate wins, and strict `>` keeps the first maximum in list order (977-981).
- Think, active (`AttackableAI.cs` 257-290, 398-430):
  (i) if the region or its neighbours are inactive, do nothing (261-263).
  (ii) the global counter steps 1 toward 0 per call (270-280).
  (iii) scanning and attacking happen only when the counter is >= 0 (284).
  (iv) pick `getMostHated()` (409).
  (v) attack only if hate + counter > 0 (417-427). Either way the think returns after a non-null pick (429).
- Think, attack (`AttackableAI.cs` 581, 641-668): re-pick the most hated each call (641). None: go ACTIVE and return (642-645). Dead target: `stopHating` and return (654-658). Attack timeout passed: go ACTIVE and set walking (661-668; where it walks to was not read).
- Attack start, `onEvtAttacked` (1329-1380): sets the attack timeout to 1200 ticks plus now (34, 1334; the code comment says 2 minutes, tick length not read). Clears the counter if it is negative (1337-1340). Adds the attacker with 0 damage and 1 hate (1343). Sets the intention to attack (1351-1357).
- Aggression event, `onEvtAggression` (1392-1420): adds hate by value (1403), then sets attack intention (1406-1415).
- Passive windows: the counter starts at -10 after spawn (54). A reduce-hate call that leaves no hated creature sets it to -25 (896, 907, 927); the 907 and 927 paths also clear the list. A think with no target (so the hated block did not return) rolls 1 in 500 to forget all attackers, but only at full HP and MP with a non-empty attacker-by list (434-438).

## 2. Key functions

- `Attackable.addDamage`: `/mnt/frankendom-donors/ax-grymyr-l2dn-server/L2Dn/L2Dn.GameServer.Model/Model/Actor/Attackable.cs` 776-816. Notify, hate per hit, handoff.
- `Attackable.addDamageHate`: Attackable.cs 824-870 (lines 871-879 not read). Owner credit, row, damage, hate, trap gate.
- `Attackable.reduceHate`: Attackable.cs 889-935. Lowers hate, passive reset to -25.
- `Attackable.getMostHated`: Attackable.cs 958-985. Zeroes dead or out-of-region rows, strict max.
- `Attackable.getHating`: Attackable.cs 1057-1066 (first lines only).
- `AggroInfo`: `/mnt/frankendom-donors/ax-grymyr-l2dn-server/L2Dn/L2Dn.GameServer.Model/Model/AggroInfo.cs` 5-56. Capped hate and damage counters, `checkHate`.
- `AttackableAI.thinkActive`: `/mnt/frankendom-donors/ax-grymyr-l2dn-server/L2Dn/L2Dn.GameServer.Model/AI/AttackableAI.cs` 257-290, 398-430. Counter step and target pick.
- `AttackableAI.thinkAttack`: AttackableAI.cs 581, 636-668. Re-pick, dead-target drop, timeout.
- `AttackableAI.onEvtAttacked`: AttackableAI.cs 1329-1380. Timeout, first hate, intention.
- `AttackableAI.onEvtAggression`: AttackableAI.cs 1392-1420. Hate by value.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Hate per hit = damage x 100 / (level + 7), cast to int | 100 and 7 (`Attackable.cs` 797, theirs) |
| Attack-stat multiplier on plain hits only | `HATE_ATTACK` stat, default 1 (800, theirs) |
| Hate and damage counters capped | 10^15 cap (`AggroInfo.cs` 7, theirs) |
| Most-hated by strict max; dead or out-of-region rows zeroed | none |
| Passive window after respawn, one step toward 0 per active think | -10 (`AttackableAI.cs` 54) |
| Passive window when reduce-hate leaves no target | -25 (`Attackable.cs` 896, 907, 927) |
| Attack timeout | 1200 ticks (`AttackableAI.cs` 34), set at 1334; tick length not read |
| Forget-attackers chance | 1 in 500 (434), full HP and MP only |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for a hit (damage counter first, then hate per hit, then the capped add), the most-hated scan (dead or out-of-region rows zeroed, strict max), the active think (counter step, then hate plus counter test) and the attack think (re-pick, drop a dead target, timeout). It omits: the walker stop, the AI event notify, the summon-to-owner credit, the fake-player gate, the triggered-trap gate, the minion assist, the leash and home return, the scan range and region-neighbour gate of the active think, the core-AI-disabled branch, the reduce-hate path and its -25 reset, the forget-attackers roll, and the intention changes. The attack timeout is a field the sketch reads but does not set.

```ts
// Licence: MIT (donor, Grymyr L2Dn). Clean-room sketch written from the described mechanism, not a line-for-line translation.
// clean-room
interface Mob {
  level: number;
  globalAggro: number;        // starts at -10 after respawn; moves 1 step toward 0 per active think
  attackTimeoutAt: number;    // tick after which an attack is abandoned (set when the attack starts)
}

interface Entry { id: string; damage: number; hate: number; alive: boolean; inRegion: boolean }

const HATE_CAP = 1e15;

class HateTable {
  private rows = new Map<string, Entry>();

  constructor(private mob: Mob) {}

  // One hit. Plain hits (no skill) are scaled by the attacker's attack stat.
  onDamage(id: string, damage: number, attackStat: number, usedSkill: boolean): void {
    const row = this.row(id);
    row.damage = Math.min(row.damage + damage, HATE_CAP);
    let hateValue = (damage * 100) / (this.mob.level + 7);
    if (!usedSkill) hateValue *= attackStat;
    this.addHate(id, Math.trunc(hateValue));
  }

  // Aggression event: adds hate by value, no damage.
  onAggression(id: string, value: number): void {
    this.addHate(id, value);
  }

  hating(id: string): number {
    return this.rows.get(id)?.hate ?? 0;
  }

  stopHate(id: string): void {
    const row = this.rows.get(id);
    if (row) row.hate = 0;
  }

  // Dead or out-of-region rows lose their hate. Strict > keeps the first maximum in list order.
  mostHated(): string | null {
    if (this.rows.size === 0) return null;
    let best: string | null = null;
    let max = 0;
    for (const row of this.rows.values()) {
      if (!row.alive || !row.inRegion) row.hate = 0;
      if (row.hate > max) { best = row.id; max = row.hate; }
    }
    return best;
  }

  private addHate(id: string, value: number): void {
    const row = this.row(id);
    row.hate = Math.min(row.hate + value, HATE_CAP);
  }

  private row(id: string): Entry {
    let r = this.rows.get(id);
    if (!r) {
      r = { id, damage: 0, hate: 0, alive: true, inRegion: true };
      this.rows.set(id, r);
    }
    return r;
  }
}

type Action = { kind: "none" } | { kind: "active" } | { kind: "attack"; target: string };

// Active think: step the passive counter, then attack the most hated if hate plus counter is positive.
function thinkActive(mob: Mob, table: HateTable): Action {
  if (mob.globalAggro < 0) mob.globalAggro++;
  else if (mob.globalAggro > 0) mob.globalAggro--;
  if (mob.globalAggro < 0) return { kind: "none" };     // still in the passive window

  const hated = table.mostHated();
  if (hated === null) return { kind: "none" };
  if (table.hating(hated) + mob.globalAggro > 0) return { kind: "attack", target: hated };
  return { kind: "none" };
}

// Attack think: re-pick the most hated each tick, drop a dead target, abandon on timeout.
function thinkAttack(mob: Mob, table: HateTable, targetAlive: (id: string) => boolean, now: number): Action {
  const target = table.mostHated();
  if (target === null) return { kind: "active" };
  if (!targetAlive(target)) {
    table.stopHate(target);
    return { kind: "none" };
  }
  if (mob.attackTimeoutAt < now) return { kind: "active" };
  return { kind: "attack", target };
}
```

## 5. Lands in

- TARGET `src/fight/aggro.ts` (new module: one hate table per creature, target selection). Parity-checklist row 4 (fight loop: aggro, chase, leash). Today: no existing aggro module was checked.
- Hate per hit needs a `level` value; take it from the creature catalogue (row 21, catalogue fields), not from the client.
- Reuse tag: rewrite-from-idea (MIT; adaptation permitted, sketch written from the mechanism)
- Brief rule served: 1 (one engine: the hate list and target choice live in the engine, not the client); rules 7-9 n/a

## 6. Gaps and risks

- MAX_ATTACKERS = 3: the donor has no attacker cap in the code read. The hate table as written would hold every attacker in range. The cap must be enforced where the attacker set is decided, in the engine, before the hate table is consulted.
- Server-verified kills and one ledger: hate is computed in the same process as the hit. Frankendom keeps the hate table on the server and the client only renders the target. Hate must not be recomputed by the client.
- Read-side mutation: `getMostHated` zeroes hate through `checkHate` (`AggroInfo.cs` 30-32). A read changes state in the donor. Frankendom keeps the zeroing in the tick, so a read stays pure.
- Time: the counters and the attack timeout are per call or per tick. Frankendom ticks them on the server tick (row 18 or post-K item 3), never on a client timer.
- Determinism and replay: the 1-in-500 forget roll uses `Rnd`. For the fight record (row 19), the roll must come from a seeded stream that is recorded.
- Level: the formula divides by `level + 7`. Frankendom must define level for every catalogue creature, or the hate scale is undefined.
- Summons: the owner credit (`Attackable.cs` 840-844) is needed only if Frankendom has summoned or pet creatures. Not checked.
- The 10^15 cap is an int64 overflow guard for the donor. Frankendom should use a small, explicit cap, or none; do not copy the number.
- Not read: the active-think range scan and its neighbour gate (AttackableAI.cs 290-397), leash and home return (440-580), the attack-think branch after 668, `Attackable.cs` 871-879 and 1066 onward, the think scheduler, and any network sync of hate.
