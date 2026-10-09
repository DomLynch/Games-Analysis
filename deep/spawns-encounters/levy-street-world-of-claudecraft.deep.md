# levy-street-world-of-claudecraft (spawns-encounters, cell 4)

Donor: /mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/respawn_policy.ts | Licence: MIT | TypeScript | symbol resolveRespawnSeconds / respawnMob (opened: respawn_policy.ts 1-215, damage.ts handleDeath respawn block 1649-1680, locomotion.ts updateMob dead branch 209-305, lifecycle.ts respawnMob 51-176 and despawnSummonedAdds 182-193)

## 1. Mechanism

- Death sets the countdown. In `combat/damage.ts` `handleDeath` (1409-1914), the mob gets `aiState = 'dead'`, `corpseTimer = CORPSE_DURATION` (60, line 167) and `respawnTimer = resolveRespawnSeconds(template, spawnPos, cfg.respawnSeconds, roll)` (1649-1666). Run-scoped mobs get Infinity and never return in place. Explicit fixed schedules (template `respawnSeconds`) win outright and also cap the corpse timer (1669-1671). A world boss never auto-respawns in place (its scheduler does; the comment is at 1672-1679, the code after it was not read).
- Otherwise (`resolveRespawnSeconds`, respawn_policy.ts 185-200) the base for a non-self-scheduled template is the zone containing the mob's spawn point (not where it died): the zone's `trashRespawnSeconds` if set, else 60 s, or 25 s when the point is in no zone (77-81, 92-99); a config override `cfg.respawnSeconds` replaces that. A self-scheduled template (authored `respawnMult`, a `respawnWindow`, or `rare`, 152-158) uses `cfg.respawnSeconds ?? 25` (the legacy base). The result is base times a multiplier: the authored `respawnMult`, else 4 for a rare, else 1 (199). A window draws its multiplier uniformly in [minMult, maxMult) from the sim RNG (`ctx.rng.range`, passed in by the death site only for windowed templates), and a null roll takes the window floor (198).
- Each sim tick, `updateMob` (mob/locomotion.ts 209-305) runs the dead branch (215-303). It first runs boss-death handlers; an owned mob that is not a demon or undead returns at once (228-233). It then decrements `corpseTimer` and `respawnTimer` by DT, counts down the loot free-for-all timer and a corpse fuse. A dead owned demon or undead unravels when its corpse decays (247-279). Dungeon mobs (spawn x above `DUNGEON_X_THRESHOLD`) never respawn here. A summoned add that is not an instance mob is dropped once its corpse decays (289-292).
- Respawn fires only when `respawnTimer <= 0` AND (corpse decayed OR corpse not lootable). So a lootable corpse holds the entity until its loot window closes; the same entity id is reused.
- `respawnMob` (mob/lifecycle.ts 51-176) resets the entity in place (an owned mob is instead despawned as a pet, 52-55): loot, tap and harvest state wiped, ownership cleared, hostile again, position to spawn point (grounded), hp to max, auras and threat cleared, aggro, leash and chase stalls cleared, flee state cleared, boss damager roster cleared, summoned adds despawned, per-life timers and brood state re-seeded or cleared from the template, idle wander timer re-seeded, boss encounters reset, and player targets pointing at it cleared.
- Output: a live hostile mob at its home position. No new entity id is minted.

## 2. Key functions

| Name | Path | Lines | What it does |
|---|---|---|---|
| handleDeath (respawn arming block 1649-1671) | /mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/combat/damage.ts | 1409-1914 | Sets respawnTimer from resolveRespawnSeconds, or Infinity for run-scoped mobs |
| resolveRespawnSeconds | /mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/respawn_policy.ts | 185-200 | Precedence: fixed seconds, then base times multiplier or window roll |
| baseRespawnSecondsAt / trashRespawnSecondsForZone | /mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/respawn_policy.ts | 77-81 and 92-99 | Picks the zone's trash delay, with off-map fallback |
| updateMob (dead branch 215-303) | /mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/mob/locomotion.ts | 209-305 (function continues past 305) | Counts down corpse and respawn timers; defers respawn while a corpse is lootable |
| respawnMob | /mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/mob/lifecycle.ts | 51-176 | Resets an entity in place to a fresh live life |
| despawnSummonedAdds | /mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/mob/lifecycle.ts | 182-193 | Drops a boss's adds on the boss's own respawn |

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Death arms a per-entity respawn timer; the timer ticks in the sim step | DT per tick (theirs; value not read) |
| Respawn deferred until the loot window closes, same entity id reused | Corpse window, CORPSE_DURATION 60 s (theirs, damage.ts 167) |
| Zone-based base delay, with per-zone override and off-map fallback | Trash 60 s (respawn_policy.ts 58), off-map 25 s (66), legacy base 25 s (131) (theirs) |
| Multiplier per template; random window drawn uniformly | Rare default multiplier 4 (line 199, theirs); example multiplier values 144, 432, 864 are one, three and six hours at the 25 s base (comment 137-139, theirs) |
| Explicit fixed schedule overrides everything | Training dummy example (theirs) |

## 4. TypeScript sketch

Licence: MIT. The logic may be lifted from the path above; this sketch restates the structure in its own names.

simplified: the config override `cfg.respawnSeconds`, the run-scoped Infinity, the corpse-timer cap for a fixed schedule, the owned / summoned / instance-mob branches of the dead tick, boss handling, and the entity reset itself are omitted; `zoneBase` stands for the zone lookup; `TRASH_SECONDS` is unused here because the caller supplies `zoneBase`; the window is stored as `min`/`max` multipliers.

```ts
// Licence: MIT (levy-street-world-of-claudecraft, src/sim/respawn_policy.ts
// resolveRespawnSeconds; src/sim/mob/locomotion.ts updateMob dead branch;
// src/sim/mob/lifecycle.ts respawnMob)
interface RespawnTemplate {
  fixedSeconds?: number;
  multiplier?: number;
  window?: { min: number; max: number };
  rare?: boolean;
}
const BASE_SECONDS = 25;          // theirs: legacy base for self-scheduled templates
const TRASH_SECONDS = 60;         // theirs: zone trash delay
const RARE_DEFAULT_MULT = 4;      // theirs
function resolveRespawn(
  t: RespawnTemplate | undefined,
  zoneBase: number,
  roll: ((min: number, max: number) => number) | null,
): number {
  if (t?.fixedSeconds !== undefined) return t.fixedSeconds;
  const selfScheduled = t?.multiplier !== undefined || t?.window !== undefined || t?.rare === true;
  const base = selfScheduled ? BASE_SECONDS : zoneBase;
  if (t?.window) {
    const m = roll ? roll(t.window.min, t.window.max) : t.window.min;
    return base * m;
  }
  return base * (t?.multiplier ?? (t?.rare ? RARE_DEFAULT_MULT : 1));
}
interface MobState {
  dead: boolean;
  respawnTimer: number;
  corpseTimer: number;
  lootable: boolean;
  runScoped: boolean;
}
// Per sim tick while dead.
function tickDeadMob(m: MobState, dt: number, respawn: () => void): void {
  m.corpseTimer -= dt;
  m.respawnTimer -= dt;
  if (m.respawnTimer <= 0 && (m.corpseTimer <= 0 || !m.lootable)) respawn();
}
```

## 5. Lands in

- TARGET origins/server/world-spawns.ts (the server owns each spawn's alive / respawn clock) with origins/mobs/row.ts (`respawnSeconds`, checked against `RESPAWN_RANGE`) and the zone Params default (`spawns.respawnSeconds` in origins/region1/world.ts, 300 in the Frontier). Frankendom already has the donor's zone default plus per-row override; what is genuinely new is only the random window (uniform draw from the seeded stream instead of a fixed number) and the multiplier-of-base form for rares. Not src/fight/ai.ts: the timer is not the brain, and the hero's respawn is row 17.
- Parity-checklist row: 4 (a respawned creature re-enters at home with fresh state); row 18 for the loot-window coupling (see gaps).
Reuse tag: adapt
Brief rule served: 4 (zones are data on one runtime); rules 7-9 n/a

## 6. Gaps and risks

- Server-verified kills: the donor's timer is advanced by the sim tick and the window draw uses the sim RNG, which is deterministic. Frankendom's clock is the server's (origins/server/world-spawns.ts), and any window draw must come from the seeded stream the server replays; the client only displays.
- One ledger: the donor defers respawn while a corpse is lootable (same entity id reused, loot wiped on reset). Frankendom's loot and CP are paid once in the server's kill transaction and the per-account respawn window is in origins/server/mob-rewards.ts, so there is no lootable corpse to wait for; do not copy the deferral.
- Zones as data: the donor's 60 / 25 / 25 s and rare multiplier 4 are constants in code (with a per-zone override field). In Frankendom they must be zone Params and row fields (`spawns.respawnSeconds`, `respawnSeconds`), not literals (no hidden numbers).
- MAX_ATTACKERS = 3: a respawn resets threat and aggro for one creature; a camp coming back together must still hold at most 3 engaged on one player (src/fight/world.ts).
- The reset clears many donor-specific fields (boss adds, brood eggs, charge and cast timers). Frankendom must reset only its own fields; a verbatim copy would carry dead state.
- The sim-pure rule of this donor (no Date.now or Math.random in src/sim) matches the seeded-replay need.
