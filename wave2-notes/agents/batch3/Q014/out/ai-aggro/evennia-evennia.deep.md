# evennia-evennia (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/npcs.py` (`EvAdventureMob`, 252-356) with `ai.py` (whole file) | Licence: BSD-3-Clause (`LICENSE.txt`: "BSD 3-Clause License"; code may be adapted) | Python | symbol `EvAdventureMob.ai_combat` / `AIHandler.run`

Checked: `ai.py` read in full (1-128). `npcs.py` read at 1-30, 60-130 and 252-356 (the mob's AI states). `combat_base.py` read at 278-300 (where the combat handler is stored). `test_ai.py` read at 1-40 (the hint file; rest seen by grep only). `evennia/objects/objects.py` line 251 read (what `ndb` is). Not read: the combat resolution side (`combat_base.py` `queue_action` at 460, `combat_twitch.py` `queue_action` at 173 and the timed attack at 326-338), and any caller of `ai.run()` (none found in the donor besides the docstring and the test). Confidence: high on the state machine and the probability roll; high that the in-combat branch as written cannot run (typo, below); medium on the intended combat behaviour, since it sits on combat code I did not read. Cell = category_no 2. camera_scope: n/a. Depth: thin.

## 1. Mechanism

- State machine. `AIHandler.run` (ai.py 108-113) reads the state name and calls `ai_<state>` on the mob inside a try block. An exception is logged with `log_trace` and swallowed (111-113). States in `EvAdventureMob`: `idle` (271-276, does nothing), `roam` (320-332), `combat` (278-318), `flee` (334-349).
- Aggro is room presence only. `get_targets` returns every object in the mob's room with `is_pc` set (ai.py 63-68). In `roam`, if any player is present, the mob switches to `combat` and attacks a random one (325-327). There is no distance, no threat, no memory of who hit it, and no chase: mobs move only through room exits.
- Combat roll (npcs.py 259-265, 283-292). The table is `hold 0.0, attack 0.85, stunt 0.05, item 0.0, flee 0.05`. `random_probability` (ai.py 84-106) divides each weight by the total (0.95 here), sorts high to low, draws `random.random()` and walks the cumulative sum. After normalising: attack about 0.895, stunt about 0.053, flee about 0.053. `hold` and `item` have weight 0 and are never drawn. The in-combat branch (283) then maps the action: `stunt` queues a stunt for a random ally; `item` uses a random valid item on a random ally; `flee` sets state `flee` (311-312). The attack body (291-292) queues `{"key": "attack", "target": random enemy}`.
- Out of combat (314-318): with no players, set `roam` (315); otherwise attack a random player with the `attack` command (317-318).
- Flee (334-349): read `past_room` from ai_state (341). Take the room's traversable exits, excluding `past_room` (342). If any, record the current room as `past_room` (344) and take a random exit (345). If none (a dead end), return to `roam` (349). So a fleeing mob does not walk straight back the way it came, but it does not head away from the players either.
- Tick cadence: not in the donor. The docstring says "tick the ai whenever needed" (ai.py 29-30); the only caller is the test (test_ai.py 43-47). The rate and the step size are unknown from this code.

## 2. Key functions

- `AIHandler.run` and `random_probability`: `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/ai.py` 84-113.
- `AIHandler.get_targets` and `get_traversable_exits`: `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/ai.py` 63-82.
- `EvAdventureMob.ai_combat`: `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/npcs.py` 278-318 (the combat table is at 259-265).
- `EvAdventureMob.ai_roam` and `ai_flee`: `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/npcs.py` 320-349.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Weighted action roll: normalise, sort, cumulative walk | Table `{hold 0, attack 0.85, stunt 0.05, item 0, flee 0.05}` (theirs, npcs.py 259-265) |
| Room-presence aggro: a player in the room flips idle/roam to combat | None (rule: `get_targets` returns players in the room, ai.py 68) |
| Flee to a random exit that is not the room you came from; dead end returns to roam | Excludes one room (theirs, npcs.py 342) |
| Uniform random target choice | None (`random.choice`, npcs.py 317, 327) |

## 4. TypeScript sketch

simplified: the sketch is the intended behaviour, not a copy of the donor's in-combat branch. It differs from the donor in three places: (1) the table key `attack` is mapped to the attack step (the donor's `case "combat"` at npcs.py 291 never matches the `attack` key, so the 85% weight does nothing there); (2) `inCombat` is a plain flag (the donor reads `self.nbd.combathandler`, see Gaps); (3) the stunt and item steps, the combat handler's enemy list, and the timed attack are left out. The `flee` roll in combat sets state only, as in the donor (npcs.py 311-312). Random choices take an injected `rng` so a server test can seed them.

```ts
// Licence: BSD-3-Clause (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type State = "idle" | "roam" | "combat" | "flee";
type Action = "hold" | "attack" | "stunt" | "item" | "flee";

// Donor table (npcs.py 259-265). Weights are normalised before the roll (ai.py 94-99).
const COMBAT_TABLE: Record<Action, number> = { hold: 0, attack: 0.85, stunt: 0.05, item: 0, flee: 0.05 };

// Cumulative walk over the table sorted high to low (ai.py 95-106), using a given roll r in [0, 1).
export function rollAction(table: Record<Action, number>, r: number): Action | undefined {
  const total = Object.values(table).reduce((a, b) => a + b, 0);
  const sorted = (Object.keys(table) as Action[])
    .map((k): [Action, number] => [k, table[k] / total])
    .sort((a, b) => b[1] - a[1]);
  let acc = 0;
  for (const [k, p] of sorted) {
    acc += p;
    if (r <= acc) return k;
  }
  return undefined;
}

interface Room { players: string[]; exits: string[]; }   // exits = destination room ids
interface Mob {
  state: State;
  room: string;
  pastRoom?: string;      // where it came from (donor: ai_state "past_room")
  inCombat: boolean;      // intended: a combat handler exists (donor: obj.ndb.combathandler)
}

export type Step =
  | { kind: "none" }
  | { kind: "attack"; target: string }
  | { kind: "move"; to: string };

const pick = <T>(xs: T[], rng: () => number): T => xs[Math.floor(rng() * xs.length)];

// One tick of the mob state machine. The donor's attack key is "attack" in the table; the sketch maps it
// to the attack step so the 85% weight does something (see simplified line).
export function tick(mob: Mob, world: Map<string, Room>, rng: () => number): Step {
  const here = world.get(mob.room);
  if (!here) return { kind: "none" };
  switch (mob.state) {
    case "idle":
      return { kind: "none" };
    case "roam":
      if (here.players.length > 0) {
        mob.state = "combat";
        return { kind: "attack", target: pick(here.players, rng) };
      }
      {
        const exits = here.exits;
        return exits.length ? { kind: "move", to: pick(exits, rng) } : { kind: "none" };
      }
    case "combat": {
      if (mob.inCombat) {
        const action = rollAction(COMBAT_TABLE, rng());
        if (action === "flee") mob.state = "flee";
        if (action === "attack") return { kind: "attack", target: pick(here.players, rng) };
        return { kind: "none" };
      }
      if (here.players.length === 0) { mob.state = "roam"; return { kind: "none" }; }
      return { kind: "attack", target: pick(here.players, rng) };
    }
    case "flee": {
      const exits = here.exits.filter(e => e !== mob.pastRoom);
      if (exits.length === 0) { mob.state = "roam"; return { kind: "none" }; }
      mob.pastRoom = mob.room;
      return { kind: "move", to: pick(exits, rng) };
    }
  }
}

export {};
```

## 5. Lands in

- TARGET `src/fight/ai.ts` (the engine's AI brain: the weighted per-tick action table and the idle/roam/combat/flee transitions). Parity-checklist row 2 (AI brain). Flee touches row 4 (fight loop, leash); the note cites row 2 only.
- Reuse tag: rewrite-from-idea (BSD-3-Clause: code may be adapted; this note is a clean-room re-expression of the described mechanism)
- Brief rule served: 1 (one engine: the action table and the state machine are server-side; the client only shows the result); rules 7-9 n/a

## 6. Gaps and risks

- The donor's in-combat branch cannot run as written. `npcs.py` 283 reads `self.nbd.combathandler`, but the handler is stored on `obj.ndb` (combat_base.py 283, 297), and no `nbd` is defined anywhere in the donor, and the evennia object modules I grepped (`typeclasses`, `objects/objects.py`, `objects/models.py`, `utils/idmapper/models.py`) define no `__getattr__` fallback (grep, not run). The read therefore raises `AttributeError`, which `AIHandler.run` catches and logs (ai.py 112-113). Treat this as a donor bug. (Reasoned from the source; not executed.)
- Even if the typo were fixed, the table key `attack` (npcs.py 261) matches no `case` (the case is `"combat"`, line 291). The attack roll, about 89.5%, would do nothing. The donor's own test (test_ai.py 36-37) uses the key `"combat"` and so does not catch this. Frankendom must assert that every table key has a handler.
- No threat, no hate list, no chase, uniform random targeting. Frankendom's engine owns targeting (cells 1 and 2 show the scoring and flag-chain options), so this module should supply the weights and the state changes only.
- The mob's tick is not in the donor. Frankendom's server must drive the state machine on the fixed step (server tick: fixed step, input intake, per-tick NPC budget), and the weights are per tick, so the attack rate depends on the tick rate.
- Combat resolution, the timed attack `dt` (combat_twitch.py 338) and the queue (combat_base.py 460) were not read; their timing is unverified here.
- Flee is a random walk to a non-previous exit with no goal. It does not move away from the players and does not stop at a safe room. The sketch keeps the donor rule; Frankendom needs a real retreat target.

Best transferable idea: drive NPC action choice from a weighted per-tick table (normalised, cumulative roll) that is data per archetype, with an idle/roam/combat/flee state machine on top.
Decision (proposed): adapt — keep the weighted table as archetype data and the room-presence state change; reject the uniform random target choice (the engine must score or pick targets, see cells 1 and 2) and the aimless flee walk (give flee a retreat target), and make a test that every table key has a handler.
Acceptance: a server test seeds the rng, runs 1000 ticks with one player in the room and the table {attack 0.85, stunt 0.05, flee 0.05}, and asserts about 850 attack steps (within 3%) and about 50 flee transitions; a second test fails if any table key has no handler.
