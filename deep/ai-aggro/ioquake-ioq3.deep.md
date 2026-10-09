# ioquake-ioq3 (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/ioquake-ioq3/code/game/ai_dmnet.c` | Licence: GPL-2 | C | symbol `AINode_Battle_Fight / AINode_Battle_Chase / AINode_Battle_Retreat` | input line 1992 verified: `AINode_Battle_Fight` at 1992, `AINode_Battle_Chase` at 2163, `AINode_Battle_Retreat` at 2302. The retreat and chase predicates are in `/mnt/frankendom-donors/ioquake-ioq3/code/game/ai_dmq3.c` (`BotAggression` 2194-2235, `BotFeelingBad` 2242-2256, `BotWantsToRetreat` 2263-2312, `BotWantsToChase` 2319-2366), all opened in full this pass; the fight node closes at 2145, the chase node at 2285, the retreat node at 2474.

## 1. Mechanism

- A Quake 3 deathmatch bot runs one of several node states (fight, chase, retreat, seek long-term goal). Each node is a function that runs once per bot AI frame, checks its exit conditions in a fixed order, and either acts (move, aim, attack) or switches to another node. Inputs: the current enemy index, enemy visibility, the bot's health and inventory, time stamps (last enemy sight, chase start, death time), and the bot's aggression value (0 to 100). Output: a movement result, a view angle, a weapon choice, and an attack command.
- Fight (1992-2145): observer, intermission and dead leave first (1998-2012). Then look for a better enemy (2014). No enemy: seek. Enemy dead: wait 1 second (`enemydeath_time`), then leave to seek, or to a short stand if a kill chat line fires. An invisible enemy that is not shooting makes the bot lose track 20 % of frames (2050-2055). Record the enemy's last reachable position (2069-2073). Chat reactions to damage taken or a hit made can enter a stand node (2077-2091). Enemy out of sight: chase if the chase predicate allows, else seek. Otherwise use items, pick a weapon, do attack movement, aim, attack. Then, unless the bot is fight-suicidal, retreat if the retreat predicate says so (2138-2143).
- Chase (2163-2285): no enemy: seek. Visible enemy switches back to fight; a better enemy (searched with no current enemy) switches to fight; no last-seen area: seek. The chase goal is the enemy's last-seen point. Chase ends after a fixed 10 seconds from the moment the chase started (`ai_dmnet.c` 2154, 2224); there is no progress check. Reaching the last-seen point (touching the goal, 2222, or being in the last-seen area, 2278) sets the chase timer to zero, which ends the chase on the next check at once. Every 1 second it checks for a goal item within 150 units and detours for it (a short "nearby goal" node; the pick-up window is `0.1 * range + 1` = 16 s at range 150, although the code comment says 5 s). After moving, if the retreat predicate now says so (the bot may have been hurt during the chase), it switches to retreat (2280-2283).
- Retreat (2302-2474): no enemy or enemy dead: seek. Better enemy: choose it. If the chase predicate turns true (the bot became aggressive enough), empty the goal stack and chase. If the enemy is visible, record its time and position. If the enemy has not been visible for 4 seconds: seek. If it is currently not visible (but less than 4 s) and another enemy exists: fight that one. Otherwise follow the long-term goal away from the enemy; no way out switches to a suicidal last-stand fight. Every second it checks for a nearby goal item within 150 units (50 when carrying a flag in capture-the-flag, 80 for cubes). While retreating it still chooses a weapon, aims at the enemy if its attack skill is above 0.3, and attacks if it can (2444-2471).
- Retreat and chase predicates (`/mnt/frankendom-donors/ioquake-ioq3/code/game/ai_dmq3.c`): retreat is the default when `BotAggression` is below 50; chase when it is above 50; at exactly 50 neither fires. Game modes with flags, cubes or the obelisk override both, and a bot fetching a flag always retreats and never chases. `BotAggression` is not a stored per-bot number: each call computes it from the bot's inventory: quad damage gives 70; an enemy more than 200 units higher gives 0; health under 60 gives 0 (under 80 with armour under 40 also 0); then the best weapon with enough ammo gives 100 (BFG), 95 (railgun), 90 (lightning, rockets), 85 (plasma), 80 (grenades), 50 (shotgun); otherwise 0.
- Tick: one node call per bot AI frame. Not per game frame.

## 2. Key functions

- `AINode_Battle_Fight`: `/mnt/frankendom-donors/ioquake-ioq3/code/game/ai_dmnet.c` 1992-2145. Enemy death delay, hit reactions, visibility gate, attack movement, aim, attack, retreat check.
- `AINode_Battle_Chase`: `/mnt/frankendom-donors/ioquake-ioq3/code/game/ai_dmnet.c` 2163-2285. Visibility return, chase timeout, nearby-goal check every second, movement toward the last-seen point.
- `AINode_Battle_Retreat`: `/mnt/frankendom-donors/ioquake-ioq3/code/game/ai_dmnet.c` 2302-2474. Chase switch, 4-second lost-enemy rule, long-term goal away from the enemy.
- `BotWantsToRetreat`: `/mnt/frankendom-donors/ioquake-ioq3/code/game/ai_dmq3.c` 2263-2312. Game-mode overrides, then aggression below 50.
- `BotWantsToChase`: `/mnt/frankendom-donors/ioquake-ioq3/code/game/ai_dmq3.c` 2319-2366. Game-mode overrides, then aggression above 50.
- `BotAggression`: `/mnt/frankendom-donors/ioquake-ioq3/code/game/ai_dmq3.c` 2194-2235. Aggression 0 to 100 from quad, enemy height, health, armour and the best weapon with ammo.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Node FSM: one function per state, exits checked first, transitions by name | Node names (theirs, Quake 3 bots) |
| Enemy death delay before leaving the fight | 1.0 s (theirs) |
| Chase timeout: a fixed timer from chase start; reaching the last-seen point ends the chase at once | 10 s (theirs) |
| Lost-enemy timeout: give up after no sight | 4 s (theirs) |
| Periodic detour check for a nearby goal | Every 1 s; range 150 units (theirs) |
| Aggression split: retreat below 50, chase above 50, computed from health, armour and the best weapon with ammo | Threshold 50 on a 0-100 scale; the weapon ladder 100 / 95 / 90 / 85 / 80 / 50 and health cut-offs 60 / 80 (theirs, ai_dmq3.c 2194-2235) |
| Retreat when hurt or under-equipped, decided per frame | Predicate inputs: health, armour, weapon and ammo (theirs) |

## 4. TypeScript sketch

simplified: observer, intermission, respawn and stand nodes; the invisible-enemy 20 % lose-track roll; the 10 s chase and the nearby-goal detour are kept but the 1 s detour check, the better-enemy search, the long-term goal, the suicidal last stand and all movement, aim and attack actions are omitted; the retreat check inside the chase node is kept; game-mode overrides and the flag-fetch rule are omitted; aggression is passed in (the donor computes it from inventory).
```ts
// Licence: GPL-2 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Node = 'fight' | 'chase' | 'retreat' | 'seek';

interface Bot {
  node: Node;
  enemyVisible: boolean;
  enemyDeadSince: number | null; // seconds; the fight node waits one second after the enemy dies
  aggression: number;            // 0 to 100, computed by the caller from health, armour, weapon and ammo
  chaseStart: number;            // 0 means the chase is over
  reachedLastSeen: boolean;      // bot is at the enemy's last-seen point or in its area
  enemyVisibleTime: number;      // last time the enemy was visible
  now: number;
}

// One AI frame: check exits in order, then act in the current node.
function step(b: Bot): Node {
  switch (b.node) {
    case 'fight':
      if (b.enemyDeadSince !== null && b.now - b.enemyDeadSince > 1) return 'seek';
      if (!b.enemyVisible) return b.aggression > 50 ? 'chase' : 'seek';
      return b.aggression < 50 ? 'retreat' : 'fight';
    case 'chase':
      if (b.enemyVisible) return 'fight';
      if (b.reachedLastSeen || b.chaseStart === 0) return 'seek';   // reached the last-seen point: chase over at once
      if (b.now - b.chaseStart > 10) return 'seek';                 // fixed timer from chase start, no progress check
      return b.aggression < 50 ? 'retreat' : 'chase';
    case 'retreat':
      if (b.aggression > 50) return 'chase';
      if (b.now - b.enemyVisibleTime > 4) return 'seek';            // lost enemy
      return 'retreat';
    default:
      return 'seek';
  }
}
```

## 5. Lands in

- TARGET `src/fight/ai.ts` (today: `src/ai.ts`, moving), checklist row 2 (AI brain + per-rank profiles): the brain already has `approach` / `circle` / `retreat` / `guard` modes; this donor adds a fixed exit-order per state, a lost-enemy timeout and a fixed chase timer. For the creature fight loop (chase, give up, return), TARGET `src/fight/world.ts` (exists: `SIGHT_M`, `GIVE_UP_UNSEEN_S`, return-home), checklist row 4. Check both before adding any timer.
- Reuse tag: adapt
- Brief rule served: 5 (many-on-one: hate list and target selection in the engine); rules 7-9 n/a

## 6. Gaps and risks

- GPL-2: clean-room only. The sketch is written from the mechanism; the state names and thresholds are described, not copied.
- No hidden numbers: the donor's aggression is recomputed each frame from readable state (health, armour, best weapon with ammo). Frankendom may use the same idea only if the inputs are readable by the player (health, rank, gear), with the thresholds as catalogue fields (row 21), not constants.
- MAX_ATTACKERS = 3: nothing in the donor limits how many bots chase the same enemy; Frankendom's cap of three engaged on one player and a fourth at the ring is a separate rule in `src/fight/world.ts`.
- Server-verified kills: the donor's timers (1 s, 4 s, 10 s) run in float seconds on the bot frame and the invisible-enemy roll uses `random()`. Frankendom must run timers in 60 Hz ticks on the server and any roll on the seeded stream.
- Zones as data: chase uses a navigation mesh (AAS areas, reachability queries per frame); Frankendom zones are metres in a free plane, so the last-seen point is a position, and the chase give-up values belong in zone or catalogue data.
- Game-mode predicates (flags, cubes, obelisks) are Quake 3 match rules with no Frankendom counterpart; they are not part of the mechanism.
