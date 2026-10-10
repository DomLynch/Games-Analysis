# diasurgical-DevilutionX (vfx-blood-finishers, cell 13)

Donor: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/monster.cpp` and `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/player.cpp` (hint file `Source/...missile_sprites.tsv` is a sprite table, not the mechanism) | Licence: Sustainable Use License 1.0 (repo root `LICENSE.md`): internal business or non-commercial use only, not an open-source licence. Restricted: clean-room, shape only | C++ | symbol `IsHardHit` / `PlrHitMonst`

Checked: Read in full: `PlrHitMonst` (player.cpp 528-700), `StartPlrHit` (player.cpp 2641-2679), `IsHardHit` (monster.cpp 986-997), `MonsterAttackMonster` (1110-1142), `MonsterAttackPlayer` (1174-1259), `StartMonsterGotHit` (661-672), `MonsterGotHit` (1470-1479), `M_GetKnockback` (3950-3961), `M_StartHit` (3963-3994), `MonsterDeath(Monster&, Direction, bool)` (3996-4031), `StartMonsterDeath` (4033-4038), `MonsterDeath(Monster&)` (1498-1527), `AddCorpse` (dead.cpp 93-96), `MaxCorpses` (dead.h 17). Not read: `NewMonsterAnim` body (only its callers at monster.cpp 655-658 and 665), `IsRelativeMoveOK`, `PosOkPlayer` body, `SpawnLoot`, `DiabloDeath`, `AddPlrMonstExper`, `DoGotHit` (player.cpp 1031), player.cpp 2680 onward, and the network knockback command beyond msg.cpp 1910-1911. Blood, gore, sparks, screen shake, hitstop: searched across `Source/` with grep; no blood splat, wound, decal, spark, shake or hitstop code exists. The only hits are the spell "BloodStar", a blood-fountain theme, blood gib minisets (levels/drlg_l2.cpp 1353, 1367), a comment "// 214: blood splater" (objects.cpp 1062) and "Unused blood spatter" (dead.cpp 68). So this note covers hit impact (flinch, knockback) and the death/corpse finish, not blood. Confidence: high on the flinch and knockback order; medium on the death detail (NewMonsterAnim not read). Camera: not applicable.

Best transferable idea: Gate the flinch on the size of the hit, not on every hit: a hit flinches only when its whole-point damage reaches the target's level plus a margin (or the target is on a fixed always-hard list), and a killing blow skips the flinch entirely.

Decision (proposed): adapt - take the gate and the stagger as a state change (the monster stops, plays the got-hit clip, then returns to stand), which fits "engage is a state change". Do not take the donor's client-applied damage path (player.cpp 629-643) or its unlimited re-stagger; both conflict with server-verified kills and MAX_ATTACKERS = 3.

Acceptance: In the Pit, a 9-point hit on a level-3 gladiator (threshold 6) moves it into the got-hit state for the clip length and holds its position, while a 4-point hit plays only the hit sound and the gladiator keeps its move; a server test asserts both outcomes on the monster state, and a Frankendom rule (not in donor) caps re-staggers inside a cooldown so three attackers cannot lock one gladiator in the got-hit clip.

## 1. Mechanism

- Two directions use the same rules. Player hits monster: `PlrHitMonst` (player.cpp 528). Monster hits player: `MonsterAttackPlayer` (monster.cpp 1174). Monster hits monster: `MonsterAttackMonster` (monster.cpp 1110). Only the first two matter for Frankendom's gladiator fights.
- Player hits monster, in order:
  1. Start: hit chance `hper` is 0, then it is lowered by adjacent-splash level penalties when `adjacentDamage` is set (player.cpp 535-540), then the roll `hit = GenerateRnd(100)` (542). Petrified forces `hit = 0` (543-545). `hper` gets the melee piercing bonus minus the monster's armour pierce, clamped to 5..95 (547-548). A miss returns when `hit >= hper` (553-558).
  2. Damage: a random value in the weapon's min..max, plus a percent bonus and a flat bonus (567-569). Class strike: `GenerateRnd(100) < level` doubles it (574-577). Then a monster-class multiplier table (588-608). Then `dam <<= 6` (618), so damage is in 1/64 units from here on (the line is too short to receipt). Splash from an adjacent hit is a quarter (626-627).
  3. Applied only by the local player's client: the block `if (&player == MyPlayer)` (629) contains `ApplyMonsterDamage` (642) and closes at 643.
  4. Result, in this order (693-697): if the monster has no life left (`hitPoints >> 6 <= 0`, monster.h 489), it dies via `M_StartKill` and nothing else runs. Otherwise, if the attacker has the knockback item, `M_GetKnockback` pushes the monster one tile (695-696). Then `M_StartHit` (697).
- `M_StartHit` (player overload, monster.cpp 3981-3994) tags the monster, turns it to face the player if the hit is hard, then calls the plain `M_StartHit` (3963-3979). The plain one plays the hit sound unconditionally (3965). For a hard hit (3967) it runs class effects (blink teleport, scavenger goal reset, 3968-3974). If the monster is not petrified (3975), it calls `StartMonsterGotHit` (3976).
- Hard hit rule (`IsHardHit`, monster.cpp 986-997): the always-hard classes (sneak, stalker, unseen, illweaver) are always hard. Otherwise a hit is hard when `(dam >> 6) >= level + 3` (995), with level taken at the current difficulty.
- Got-hit state (`StartMonsterGotHit`, 661-672): unless the monster is a golem (663), it plays the got-hit animation and sets `HitRecovery` mode (665-666). It also moves the monster back to its old tile (668-671). `MonsterGotHit` (1470-1479) runs each tick in that mode and returns to stand (`M_StartStand`) when the clip's last frame ends (1472-1475).
- Knockback (`M_GetKnockback`, 3950-3961): the push direction is from the attacker's start tile to the monster. The step is taken only if `IsRelativeMoveOK` allows it (3953-3955). The old tile moves one step (3958), then `StartMonsterGotHit` runs (3959). So a knocked monster always enters the got-hit state, even on a non-hard hit. The same function is also called from `OnKnockback` (msg.cpp 1910, read at that line only) and from a missile (missiles.cpp 334, not read).
- Monster hits player (`MonsterAttackPlayer`): nothing happens beyond walking distance 2 (1178-1179). The roll is `hper`. The attacker's `hit` is raised by `2 * (monster level - player level) + 30 - AC` (1191-1193) and floored at `GetMinHit()` (1194-1195), which is 15 to 30 by dungeon level (1162-1170). The attack misses when `hper >= hit` (1202-1203). A block roll can replace the hit with a block (1197-1212). Damage is random `minDam..maxDam` shifted by 6 (1218), plus the player's get-hit bonus, floored at 64, which is one point (1219). `ApplyPlrDamage` runs only in the `MyPlayer` block (1220-1225). Then `StartPlrHit(player, dam, false)` (1245). A monster with `MFLAG_KNOCKBACK` pushes the player one tile in its facing direction if the tile is free (1246-1258), and the player is forced into the got-hit state with `StartPlrHit(player, 0, true)` (1248).
- Player flinch (`StartPlrHit`, player.cpp 2641-2679): a barbarian flinches only when `dam >> 6` reaches its level plus level/4 (2652-2654). Other classes flinch at their level (2655-2657). A forced hit always flinches. The hit animation skips frames by item tier: fastest 3, faster 2, fast 1 (2662-2667). The player enters `PM_GOTHIT` (2674).
- Death (`MonsterDeath(Monster&, Direction, bool)`, 3996-4031): it awards experience (3998-3999), sets hit points to 0 (4002), spawns loot (4006), plays the death sound (4011) and sets the death animation facing the killer (4016-4017). It clears the monster's tile and quest-kill bookkeeping (4023-4027). Per tick, `MonsterDeath(Monster&)` (1498-1527) waits for the death animation's last frame (1516), then records a corpse on the tile (1518) and frees the monster (1522-1523). The Diablo branch (1501-1515) slides the view toward the boss and calls `PrepDoEnding` after 140 ticks (1514-1515).
- Corpse record: `AddCorpse` (dead.cpp 93-96) packs a 5-bit corpse id and a 3-bit direction into one byte on the tile. The corpse pool is capped at 31 (dead.h 17).

## 2. Key functions

- `PlrHitMonst`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/player.cpp` 528-700 (miss roll 542-558, damage 567-627, local-only apply 629-643, result 692-697).
- `StartPlrHit`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/player.cpp` 2641-2679.
- `IsHardHit`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/monster.cpp` 986-997.
- `MonsterAttackPlayer`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/monster.cpp` 1174-1259 (miss 1202-1203; damage 1218-1219; knockback 1246-1258).
- `MonsterAttackMonster`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/monster.cpp` 1110-1142.
- `StartMonsterGotHit`, `MonsterGotHit`, `M_GetKnockback`, `M_StartHit` (both overloads): `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/monster.cpp` 661-672, 1470-1479, 3950-3961, 3963-3994.
- Death: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/monster.cpp` 3996-4038 and 1498-1527; corpse record `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/dead.cpp` 93-96.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Flinch when a hit's whole-point damage reaches the target level plus a margin | Margin 3 (monster.cpp 995) |
| Always-hard list (never a size check) | sneak, stalker, unseen, illweaver (monster.cpp 989-992) |
| Player flinch threshold = level; barbarian = level + level/4 | (player.cpp 2652, 2655) |
| Recovery shortens the hit clip by item tier | 3 / 2 / 1 frames (player.cpp 2663-2667; 2663 receipted, the other two read) |
| Killing blow skips the flinch and knockback | Hit points at or below zero (monster.h 489; player.cpp 692-697) |
| Hit chance clamp | 5 to 95 (player.cpp 548) |
| Minimum incoming hit | 64 fixed-point = 1 point (monster.cpp 1219) |
| Minimum monster-to-player hit by dungeon level | 15 / 20 / 25 / 30 (monster.cpp 1162-1170) |
| Knockback distance | 1 tile (monster.cpp 3958; player.cpp 1250) |
| Corpse pool cap | 31 (dead.h 17) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for a player hit on a monster (damage first, a killing blow ends it, then knockback if the attacker has it, then the sound and the stagger for a hard hit) and for the player flinch (level threshold, barbarian bonus, forced hits, item tiers). It omits the miss and block rolls, the class multipliers, the splash quarter, the local-player-only apply, the facing turn (`GetMonsterDirection`), the class-specific hard-hit effects (blink, scavenger), the golem exception, the tile passability check (a callback stands in for `IsRelativeMoveOK`), the 8-way direction (the sketch uses the sign of each axis), the death animation and the corpse record. The clip-end update is a separate call, as in the donor's per-tick handler.

```ts
// Licence: Sustainable Use License 1.0 (donor): restricted. clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

const FP = 64; // fixed point: 64 units per whole damage point (donor convention)

type Tile = [number, number];
type MonsterMode = "stand" | "hitRecovery" | "petrified" | "death";

interface Monster {
  level: number;
  hp: number;               // fixed point
  mode: MonsterMode;
  tile: Tile;               // where the monster is drawn
  old: Tile;                // last settled tile
  alwaysHardHit: boolean;   // donor: a fixed class list always counts as a hard hit
  hasKnockback: boolean;    // donor: monster flag, pushes the player one tile
}

interface MonsterHitResult { sound: boolean; flinch: boolean; knockedBack: boolean; dead: boolean; }

// Hard hit: whole points of damage at or above level + 3, or an always-hard class.
function isHardHit(m: Monster, dmgFixed: number): boolean {
  if (m.alwaysHardHit) return true;
  return Math.floor(dmgFixed / FP) >= m.level + 3;
}

// The stagger: the monster stops where it was and plays the got-hit clip until it ends.
function startGotHit(m: Monster): void {
  m.mode = "hitRecovery";
  m.tile = m.old;
}

// Knockback: one step directly away from the attacker's start tile, only if the step is free.
function knockback(m: Monster, attackerTile: Tile, free: (t: Tile) => boolean): boolean {
  const step: Tile = [Math.sign(m.tile[0] - attackerTile[0]), Math.sign(m.tile[1] - attackerTile[1])];
  const target: Tile = [m.old[0] + step[0], m.old[1] + step[1]];
  if (!free(target)) return false;
  m.old = target;
  startGotHit(m);
  return true;
}

// Order follows the donor: damage first; a killing blow ends here; otherwise knockback (if the
// attacker has it), then the hit sound and, for a hard hit, the stagger. A petrified monster never staggers.
function monsterHitByPlayer(m: Monster, dmgFixed: number, attackerTile: Tile, attackerHasKnockback: boolean, free: (t: Tile) => boolean): MonsterHitResult {
  m.hp -= dmgFixed;
  if (m.hp <= 0) return { sound: false, flinch: false, knockedBack: false, dead: true };

  let knockedBack = false;
  if (attackerHasKnockback && m.mode !== "petrified") {
    knockedBack = knockback(m, attackerTile, free);
  }

  const hard = isHardHit(m, dmgFixed);
  let flinch = false;
  if (hard && m.mode !== "petrified") {
    startGotHit(m);
    flinch = true;
  }
  return { sound: true, flinch, knockedBack, dead: false };
}

// The stagger ends when the got-hit clip reaches its last frame; the monster returns to stand.
function updateStagger(m: Monster, clipOnLastFrame: boolean): void {
  if (m.mode === "hitRecovery" && clipOnLastFrame) m.mode = "stand";
}

interface PlayerHitState { level: number; barbarian: boolean; recoveryTier: 0 | 1 | 2 | 3; }

// Player flinch: the threshold is the level (barbarian: level + level/4). A forced hit always flinches.
function playerFlinch(p: PlayerHitState, dmgFixed: number, forced: boolean): { flinch: boolean; skipFrames: number } {
  const threshold = p.barbarian ? p.level + Math.floor(p.level / 4) : p.level;
  const flinch = forced || Math.floor(dmgFixed / FP) >= threshold;
  const skipFrames = [0, 1, 2, 3][p.recoveryTier];   // item tiers: none, fast, faster, fastest
  return { flinch, skipFrames: flinch ? skipFrames : 0 };
}

// Incoming monster damage: rolled damage plus the player's get-hit bonus, never below one point.
function incomingDamage(rolledFixed: number, getHitPoints: number): number {
  return Math.max(rolledFixed + getHitPoints * FP, FP);
}

// Example use, so the file type-checks under --strict.
const goblin: Monster = { level: 3, hp: 20 * FP, mode: "stand", tile: [5, 5], old: [5, 5], alwaysHardHit: false, hasKnockback: false };
const r = monsterHitByPlayer(goblin, 6 * FP, [4, 5], true, () => true);
updateStagger(goblin, true);
const pf = playerFlinch({ level: 8, barbarian: true, recoveryTier: 2 }, 9 * FP, false);
const dmg = incomingDamage(4 * FP, 1);
void r; void pf; void dmg;
```

## 5. Lands in

- TARGET `src/fight/hit-impact.ts` (new; the hard-hit gate, the stagger state and the knockback step, all run in the engine so the server decides them). Parity-checklist row 10 (hit impact / hitstop). The donor has no hitstop, so the hitstop sub-line has nothing to port.
- today: not read in this pass (Frankendom repo not opened). The rulings say kills are server-verified and the fight loop is in `src/fight`, so the stagger state belongs there and the clip is client-only.
- Reuse tag: rewrite-from-idea (Sustainable Use License 1.0; clean-room only)
- Brief rule served: rule 1 (one engine: the hard-hit and knockback rules are state changes in the engine, not client effects); the got-hit clip is presentation only.

## 6. Gaps and risks

- Sustainable Use License 1.0 limits use to internal business or non-commercial use. Frankendom must not copy code, and the donor's rules should be re-stated from the mechanism only.
- Client authority: the donor applies the player's damage to a monster only inside `if (&player == MyPlayer)` (player.cpp 629-643), and a monster's damage to the player only inside the same local check (monster.cpp 1220-1225). This is the opposite of Frankendom's server-verified kills. Do not port the apply path.
- No stagger cooldown was found. Each hard hit restarts the got-hit clip (monster.cpp 665-666 and 3976). With MAX_ATTACKERS = 3, three attackers could keep one gladiator in the got-hit state. Frankendom needs a cap as data; the donor does not give one.
- Knockback moves the state tile (monster.cpp 668-671), so it is a state change, which fits the rulings. The player's knockback (monster.cpp 1250-1256) is also a state change but was not checked against the server path.
- The death detail is partly read. `NewMonsterAnim` (the death clip selection) and `SpawnLoot` were not read, so the death presentation is only partly known.
- The Diablo death sequence (monster.cpp 1501-1515) moves the view toward the boss, one tile per tick, for 140 ticks. It is a client camera effect and does not fit the frozen Pit camera; do not port it.
- The corpse pool is capped at 31 (dead.h 17) and the corpse record packs its direction into 3 bits (dead.cpp 95). A Frankendom pool needs its own cap as data.
- Confidence: the flinch, knockback and death-state order is read directly. The blood-and-gore subtopic is absent from this donor.
