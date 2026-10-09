# levy-street-world-of-claudecraft (loot-drops, cell 8)

Donor: /mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/world_boss.ts | Licence: MIT (LICENSE in the donor root, Levy Street 2026) | TypeScript | symbol rollWorldBossLoot / worldBossLootContributors / scaleWorldBossHp

## 1. Mechanism

- A world boss def (`WorldBossDef`, 41-53) carries a spawn point, an interval and an `hpScale {base, perPlayer, max}`. The cadence is `WORLD_BOSS_INTERVAL_SECONDS = 1 * 3600` (line 31); the scheduler that spawns it lives on `Sim` (header comment, lines 9-12; not read).
- HP scaling: `scaleWorldBossHp` (166-186) returns at once if `boss.maxHp >= max` (170). Otherwise participants = the length of `worldBossContributors` (the hate-table-only roster, 113-129; line 171), `target = min(max, base + perPlayer * max(0, participants - 1))` (172-175), and only if `target > maxHp` it sets `maxHp = target` and adds the same delta to current HP, capped at the new max (176-185). So the pool only grows within a spawn, and the extra health is real. It draws no rng (comment 164-165).
- Death sequence (caller `combat/damage.ts`, read at 1672-1700 and 1896-1903): the roster is snapshotted at 1679 via `worldBossLootContributors(ctx, e)` BEFORE `clearThreat` (1700); the corpse timer is set to `WORLD_BOSS_CORPSE_SECONDS` (1687; value 900, world_boss.ts line 39), in-place respawn is disabled (1688) and summoned adds are despawned (1689). Later (1898-1899) `ctx.rollWorldBossLoot(e, worldBossContribs)` runs, outside the credited-player block, so personal loot is independent of tap and party credit.
- The loot roster, `worldBossLootContributors` (140-157): the permanent damager ids `mob.bossDamagers` (added to on every hit by a player or a pet's owner, damage.ts 1162-1169, never pruned; only recorded when the target's template is a world boss or a rare), then everyone still on `mob.threat` with pets mapped to their owner, deduped through one `seen` set, kept only if a live player meta exists and is not `leaving`, sorted by entity id (156).
- `rollWorldBossLoot` (197-246) returns if the template is missing (199). For each contributor in order it skips anyone for whom `isWorldBossLootEligible` is false (94-97: no `worldboss:<id>` entry in `meta.raidLockouts`, or it has expired) using `ctx.lockoutNowMs()` (210). It then walks `template.loot` in array order: an entry with a `rollGroup` is handled once per group (219-220), taking ONE draw `ctx.rng.next()` for the whole group and walking cumulative chances; a win is kept only if the entry has an `itemId` and no gear has been won yet by this contributor (`gearWon`, 216, 227-230), otherwise it is discarded but the draw was still taken (212-215). An ungrouped entry takes one `ctx.rng.chance(entry.chance)` draw (`next() < p`, rng.ts 46-48 on the donor) and, if it wins and has an itemId, adds a slot (236-238). Every slot is `count: 1` with `personalFor: [entityId]`.
- After all contributors: the boss's existing `mob.loot.items` come first, then `rollEnemyLootQuality(ctx.rng, mob, items)` (not read) is applied to the personal slots (241); copper is whatever `mob.loot.copper` already was (201, no copper roll here). The corpse is set `lootable` only if there is copper or any item (242-245).
- Lockout: `markWorldBossLooted` (104-106) sets `raidLockouts[worldboss:<id>] = untilMs` if `untilMs > 0`. It is called from `lootCorpse` (interaction.ts line 217) when a personal slot was taken (`tookPersonal` set at 196, tested at 213), with `ctx.raidResetMs(ctx.lockoutNowMs())` as the end, so the lockout is consumed by looting, not by the roll, and ends on the same boundary as dungeon raids. `raidResetMs` itself was not read.
- Output: a shared corpse with per-player slots; the lockout entry in each player's `meta.raidLockouts`.

## 2. Key functions

| Name | Path | Lines | What it does |
|---|---|---|---|
| rollWorldBossLoot | /mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/world_boss.ts | 197-246 | Per-contributor personal roll over the loot table; roll-group and gear cap; quality roll |
| worldBossContributors | /mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/world_boss.ts | 113-129 | Hate-table-only roster (what the HP scaler counts) |
| handleDeath snapshot and call | /mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/combat/damage.ts | 1672-1700, 1896-1903 | Roster snapshot before clearThreat, corpse window, then the personal roll |
| lootCorpse lockout write | /mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/interaction.ts | 213-217 | Calls markWorldBossLooted when a personal slot is taken (read as an excerpt only) |
| worldBossLootContributors | /mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/world_boss.ts | 140-157 | Loot roster: permanent damagers plus hate table, owner-resolved, sorted |
| isWorldBossLootEligible | /mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/world_boss.ts | 94-97 | True when no unexpired lockout exists for this boss |
| markWorldBossLooted | /mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/world_boss.ts | 104-106 | Writes the lockout at the moment a personal slot is taken |
| scaleWorldBossHp | /mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/world_boss.ts | 166-186 | Participant-scaled HP pool, grows only |

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Personal loot: one independent roll per contributor, slots tagged to that player | Per-entry chance values in the mob's loot table (theirs, data); count 1 per slot (theirs, lines 228, 238) |
| Roll groups: one roll per group, at most one gear win per contributor | Gear cap of one per contributor (theirs) |
| Lockout consumed on take, not on roll, reset at a shared boundary | Boundary = raid reset (theirs) |
| HP pool scales with participants, grows only, delta added to current HP | Base 40,000; per-player 5,000; cap 1,000,000 (theirs, line 66) |
| Spawn cadence and corpse window | 3600 s cadence (theirs, line 31); 900 s corpse window (theirs, line 39) |

## 4. TypeScript sketch

Licence: MIT.

simplified: copper, the existing `mob.loot.items`, the quality roll, the corpse-lootable flag, the per-player lockout map (the sketch carries a single `lockoutUntil` on the contributor, no boss-id key), the roster build (bossDamagers plus hate table, owner resolution, sort) and the `leaving` filter are omitted; the sketch's `rnd() < chance` assumes the donor's `chance(p)` semantics (`next() < p`, p in 0..1).
```ts
// Licence: MIT (levy-street-world-of-claudecraft, src/sim/world_boss.ts
// worldBossLootContributors, isWorldBossLootEligible, rollWorldBossLoot)
interface LootEntry { itemId?: string; chance: number; rollGroup?: string; }
interface Contributor { id: number; lockoutUntil: number | undefined; }
interface PersonalSlot { itemId: string; forPlayer: number; }
function eligible(c: Contributor, nowMs: number): boolean {
  return c.lockoutUntil === undefined || c.lockoutUntil <= nowMs;
}
function rollPersonalLoot(table: LootEntry[], contributors: Contributor[], nowMs: number, rnd: () => number): PersonalSlot[] {
  const out: PersonalSlot[] = [];
  for (const c of contributors) {
    if (!eligible(c, nowMs)) continue;
    const doneGroups = new Set<string>();
    let gearWon = false;
    for (const entry of table) {
      if (entry.rollGroup) {
        if (doneGroups.has(entry.rollGroup)) continue;
        doneGroups.add(entry.rollGroup);
        const group = table.filter((g) => g.rollGroup === entry.rollGroup);
        const r = rnd();
        let acc = 0;
        for (const g of group) {
          acc += g.chance;
          if (r < acc) {
            if (g.itemId && !gearWon) { out.push({ itemId: g.itemId, forPlayer: c.id }); gearWon = true; }
            break;
          }
        }
        continue;
      }
      if (rnd() < entry.chance && entry.itemId) out.push({ itemId: entry.itemId, forPlayer: c.id });
    }
  }
  return out;
}
function markLooted(c: Contributor, untilMs: number): void {
  if (untilMs > 0) c.lockoutUntil = untilMs;
}
```

## 5. Lands in

- TARGET origins/boss/boss.ts already emits one loot request per eligible contributor (`defeat`, with a unique mint key per character and defeat, "one loot request per eligible character"), and the server rolls the table after verifying (origins/server/mob-rewards.ts, origins/encounters/encounters.ts `rollLoot`). So the donor's personal-loot idea is already served; do not add a new roller. What is genuinely new: (1) the one-gear-per-contributor cap over roll groups, which would be a field on the loot table's roll (`rollTable` already has per-roll `dropLimit` and `minDrop`, so check whether `dropLimit = 1` on a group already does it before adding anything); (2) participant-scaled boss HP (`hpScale base / perPlayer / max`, grow-only, delta added to current HP), a catalogue field on the boss encounter (row 21) consumed by the fight loop (row 4); (3) lockout consumed by taking the loot rather than by the roll, which maps to the weekly boss roll cap that mob-rewards.ts passes as reached today.
- Parity checklist row 18 (loot roll and XP award; post-K item 3); row 4 and row 21 for the HP scaling field. Today src/loot.ts is the Pit's table and src/loot-claims.ts is the Pit's claim outbox (a local claim list), not a lockout record.
- Reuse tag: adapt (MIT donor, but the Frankendom module is already clean-room; take only the three items above)
- Brief rule served: one-character, one-ledger rule (server inventory is the authority); rules 7-9 n/a

## 6. Gaps and risks

- One ledger: the donor writes the lockout on the player's meta and the item through the corpse slot, in the loot call. In Frankendom the lockout and the item must commit in one transaction with the kill's CP and the token consumption (origins/server/mob-rewards.ts); a lockout written at take time but an item written elsewhere would split the ledger.
- Server-verified kills: the donor's draws come from one shared sim stream in a fixed order (contributors sorted by entity id, entries in array order; comment 14-20). Frankendom's server must replay the kill from its seed and keep the same fixed order; adding the HP scaler's contributors list must not draw from the stream (the donor's scaler draws nothing).
- Roster: the donor's roster is hate table plus never-pruned damagers, with no minimum share. Frankendom's origins/boss/boss.ts pays only contributors with at least MIN_CONTRIBUTION_PERMILLE of the boss health; that ruling wins, so the donor's "anyone who hit it" roster is not adopted.
- Zones as data: the HP scale, the cadence and the corpse window are constants in the donor (lines 31, 39, 66). In Frankendom they are boss/zone catalogue fields (no hidden numbers).
- MAX_ATTACKERS = 3 caps creatures engaged on one player; a world boss's participant count is players on the boss and is unrelated to that cap, but the scaler must not assume more than the server's verified contributor list.
- The lockout key is a raid-lockout record shared with dungeons in the donor (`worldboss:` prefix, lines 70-80); Frankendom has its own weekly roll cap, not raid lockouts.
