# NodeL2-NodeL2 (progression, cell 10)

Donor: /mnt/frankendom-donors/NodeL2-NodeL2/src/GameServer/Actor/Generics/ExperienceReward.js | Licence: Apache-2.0 | JavaScript (server) | symbol experienceReward / levelUp
Symbol check: experienceReward opens at 6 and closes at 29; it is the only function in the file. levelUp is in /mnt/frankendom-donors/NodeL2-NodeL2/src/GameServer/Actor/Generics/LevelUp.js, function at 6-36, opened and read in this pass.

## 1. Mechanism
- Runs once per reward (a kill, for example). Inputs: session, actor, raw exp, raw sp.
- Scales both by the server's expRate option (theirs), adds them to the actor's totals with setExpSp, and sends the earned-XP console text.
- Scans the DataCache experience table (index i is the threshold for level i + 1; the shipped table starts 0, 68, 363, 1168 in data/Templates/Experience/experience.json). The loop runs i from 0 to maxLevel - 1 and takes the first band with table[i] <= total < table[i + 1]. If that band's level (i + 1) is above the actor's current level, it calls levelUp(session, actor, i + 1) and breaks. The target level is whatever band the new total lands in, so one call can raise the level by several levels; a single reward is not limited to +1 level.
- levelUp (LevelUp.js 6-36) sets the level directly to nextLevel (line 8), recalculates stats (9), refills vitals (10), stops the replenish timer and sets the HP/MP regeneration values from DataCache.revitalize at the new level (21-23), asks the skillset to award skills for classId and the new level only (26-28, SkillSet body not read), broadcasts social action 15 and the level-up text (31-32), and writes hp, maxHp, mp, maxMp to the database (35).
- Back in experienceReward: sends a userInfo update to the client and writes id, level, exp and sp to the database.
- Outputs: actor totals, at most one levelUp call per reward (but possibly several levels gained), client packets, two database writes (vitals inside levelUp, experience in the reward). Event-driven.

## 2. Key functions
- experienceReward | /mnt/frankendom-donors/NodeL2-NodeL2/src/GameServer/Actor/Generics/ExperienceReward.js | 6-29 | the whole reward path: scale, add, band check, one level-up call, client update, database write.
- ConsoleText.transmit (earned-XP message) | /mnt/frankendom-donors/NodeL2-NodeL2/src/GameServer/Actor/Generics/ExperienceReward.js | 13-13 | sends the earned exp and sp text to the client.
- band check and levelUp call | /mnt/frankendom-donors/NodeL2-NodeL2/src/GameServer/Actor/Generics/ExperienceReward.js | 15-22 | scans the table; calls levelUp with the band's level (line 18).
- levelUp | /mnt/frankendom-donors/NodeL2-NodeL2/src/GameServer/Actor/Generics/LevelUp.js | 6-36 | sets level to the target, recalculates stats, refills vitals, awards skills, plays the effect, writes vitals.
- Database.updateCharacterExperience | /mnt/frankendom-donors/NodeL2-NodeL2/src/GameServer/Actor/Generics/ExperienceReward.js | 28-28 | writes exp, sp and level after each reward.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Rate-scaled XP and SP added to totals | expRate (theirs, read at ExperienceReward.js 9 from options.default.General; the config/default.ini value of 1.0 at line 25 was read but is too short to receipt) |
| Band check on a cumulative table; the level lands in whatever band the total reaches | maxLevel (theirs, loop bound at ExperienceReward.js 15; the config/default.ini value of 75 at line 24 was read but is too short to receipt) |
| Persist after each reward | DataCache.experience table values (theirs, data/Templates/Experience/experience.json) |

## 4. TypeScript sketch
simplified: the donor's levelUp body (stat recalculation, vitals refill, regeneration values, skill award, broadcast effect, vitals write) is reduced to a callback; the client packet and database writes are omitted.
```ts
// Licence: Apache-2.0 (NodeL2-NodeL2). Lift permitted; re-expression of ExperienceReward.js 6-29 and LevelUp.js 6-36.
interface Actor { exp: number; sp: number; level: number; }

// table[i] is the exp needed for level i + 1 (theirs: DataCache.experience).
function levelInBand(table: number[], total: number, maxLevel: number): number | null {
  for (let i = 0; i < maxLevel; i++) {
    if (total >= table[i] && total < table[i + 1]) return i + 1;
  }
  return null;
}

export function experienceReward(
  actor: Actor, table: number[], exp: number, sp: number, expRate: number, maxLevel: number,
  onLevelUp: (actor: Actor, from: number, to: number) => void,
): { levelUpTo: number | null } {
  const total = actor.exp + exp * expRate;   // theirs: server rate
  actor.exp = total;
  actor.sp = actor.sp + sp * expRate;
  const reached = levelInBand(table, total, maxLevel);
  if (reached !== null && reached > actor.level) {
    const from = actor.level;
    actor.level = reached;       // may be several levels above `from`
    onLevelUp(actor, from, reached); // donor: levelUp(session, actor, reached)
    return { levelUpTo: reached };
  }
  return { levelUpTo: null };
}
```

## 5. Lands in
- Frankendom file(s): TARGET src/fight/xp-award.ts (new module, server-side; the reward and level-band step). Today the Pit has its own career code and Zone 1 uses hunt.ts and mob-rewards (checklist row 18 "Lives in today"); post-K item 3 unifies them on the server tick.
- Parity-checklist row: 18 loot roll and XP award.
- Reuse tag: rewrite-from-idea (the logic is short; levelUp is now read, its body is NodeL2-specific).
- Brief rule served: (category default, not per-cell) one-character, one-ledger rule; rules 7-9 n/a

## 6. Gaps and risks
- One levelUp call per reward, but the level can jump several levels, because the target is the band the total lands in. Per-level steps (skills, stat gains) must run for every skipped level in Frankendom; the donor's awardSkills takes only the landed level (SkillSet not read).
- The donor mutates the rate-scaled values in place (exp *= rate) before the totals. A caller holding the raw number sees the change.
- The file uses globals `path` and `invoke` that are not defined in it.
- Frankendom ruling "one ledger": the donor writes exp and vitals in two separate database calls (levelUp line 35, reward line 28). Frankendom must write XP, level and vitals as one ledger entry.
- Frankendom ruling "server-verified kills": the donor trusts the caller's exp and sp. Frankendom's award must be computed on the server from a verified kill, never from a client number.
- Apache-2.0: lift is permitted, but the donor's structure should not be taken as a model for server-verified kills.
