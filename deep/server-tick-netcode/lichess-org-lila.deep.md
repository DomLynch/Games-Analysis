# lichess-org-lila (server-tick-netcode, cell 5)

Donor: `/mnt/frankendom-donors/lichess-org-lila/modules/round/src/main/RoundSocket.scala` | Licence: AGPL-3.0 | Scala | symbol `RoundSocket (round actors per game)`

Checked: (verified: `makeRoundActor` at 86-101, `roundHandler` at 103-165, `finishRound` at 167-168, `object RoundSocket` at 292; lines 30-175, 226-240 and 292-330 read; the actor body `RoundAsyncActor` was not read beyond two grep hits).

## 1. Mechanism

- One socket gateway routes every inbound message by game id to that game's round actor (`rounds.tell(gameId, msg)`, 103-165). Moves, "do" verbs (moretime, rematch, takeback, draw, resign, abort, blindfold), flags, byes and hold alerts go to the actor; chat goes to the messenger service; berserk and self-report go to the bus. An unknown "do" verb or room message is logged and dropped (124, 145-146). Moves and verbs are ignored once `stopping` is set (104, 106). That the actor itself holds the game state is the donor's design (not read here).
- Outbound messages go through a sticky sender keyed by game id (`sendForGameId`), so messages for one game keep their order on the socket.
- Actors live in `AsyncActorConcMap` (80-84, initial capacity 65,536), created on demand by `makeRoundActor` (86-101): it schedules a termination timer (95), and when the game record loads it starts an expiry check and sends the actor its gone-weights (96-100). `PlayerOnlines` reports from the presence feed cancel a game's termination when someone is online and schedule it when no one is (137-143). `WsBoot` (a remote socket restart) schedules termination for every actor until players reconnect (160-165). `finishRound` stops an actor (167-168). Termination delay is 1 minute (236).
- Periodic tick (230-231): after a 25 s initial delay, every `tickInterval` (5 s) every actor gets a `Tick` message. This is the donor's server tick; what an actor does on it was not read.
- Disconnect allowance: `povDisconnectTimeout` (299-317) takes 30 s and multiplies by game pace (classical x10, rapid x4, blitz x2, else x1), divides by 2 when the side is 4 or more material behind (not for Antichess, Crazyhouse or Horde, which divide by 1), and divides by 2 when the player is not signed in. Games with no clock get 30 days.
- Inputs: socket messages and presence reports. Outputs: game events to the sockets of that game.
- Tick: per inbound message, plus the 5 s `Tick` to every actor. Presence reports and the socket ping (`P.In.Ping` answered with a pong, 152) are separate.

## 2. Key functions

- `makeRoundActor`: `/mnt/frankendom-donors/lichess-org-lila/modules/round/src/main/RoundSocket.scala` lines 86-101. Creates the per-game actor, schedules termination, loads the game's expiry and gone-weights.
- `roundHandler`: `/mnt/frankendom-donors/lichess-org-lila/modules/round/src/main/RoundSocket.scala` lines 103-165. Routes each inbound message type to the actor, the chat service or the bus; handles presence and socket restart.
- `finishRound`: `/mnt/frankendom-donors/lichess-org-lila/modules/round/src/main/RoundSocket.scala` lines 167-168. Stops the actor for a finished game.
- Periodic tick scheduler: same file lines 230-231 (5 s `Tick` to all actors, 25 s initial delay).
- `RoundSocket.povDisconnectTimeout`: `/mnt/frankendom-donors/lichess-org-lila/modules/round/src/main/RoundSocket.scala` lines 299-317. Disconnect window: base scaled by pace, situation and sign-in state.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Route by instance id to one actor; create on demand | game id type (theirs) |
| Sticky per-instance sender keeps order | sender parallelism 16 (theirs, line 170) |
| Presence-driven termination: online cancels, offline schedules | termination delay 1 minute (theirs, line 236) |
| Disconnect window = base x pace factor / situation / sign-in | base 30 s (theirs, 297); pace x10, x4, x2, x1 (theirs, 305-308); halved when 4+ material behind or not signed in (theirs, 313, 316); 30 days when no clock (301) |
| Periodic tick to every instance | `tickSeconds` 5 s (theirs, 294), first tick after 25 s (230); `ragequitTimeout` 10 s (theirs, 296; used in RoundAsyncActor.scala 60 and 66, not read) |

## 4. TypeScript sketch

simplified: omits the actor mailbox and message dispatch, the per-game ordered sender, the periodic 5 s tick sent to every instance, the shutdown flag, the 30-day no-clock case and the variant exception to the material rule. Termination is checked by a sweep here; the donor uses a scheduled cancel-able timer per game.

```ts
// Licence: AGPL-3.0 (donor). CLEAN-ROOM sketch: written from the mechanism description, not a translation of donor lines.
interface Instance { id: string; state: unknown; termAt: number | null; }
const instances = new Map<string, Instance>();
const TERMINATE_AFTER = 300_000; // placeholder ms; the donor uses 1 minute

// Route by instance id; create the instance on first use.
function route(id: string): Instance {
  return instances.get(id) ?? (instances.set(id, { id, state: {}, termAt: null }), instances.get(id)!);
}

// Presence: anyone online cancels termination; nobody online schedules it.
function presence(id: string, onlineCount: number, now: number): void {
  const inst = instances.get(id);
  if (!inst) return;
  if (onlineCount > 0) inst.termAt = null;
  else if (inst.termAt === null) inst.termAt = now + TERMINATE_AFTER;
}

// Disconnect window: a base scaled by pace, halved when the side is far behind, halved for guests.
function disconnectWindow(base: number, paceFactor: number, sideFarBehind: boolean, signedIn: boolean): number {
  let w = base * paceFactor;
  if (sideFarBehind) w /= 2;
  if (!signedIn) w /= 2;
  return w;
}

// Per tick: stop every instance whose termination time has passed.
function sweep(now: number): string[] {
  const stopped: string[] = [];
  for (const [id, inst] of instances) {
    if (inst.termAt !== null && now >= inst.termAt) {
      instances.delete(id);
      stopped.push(id);
    }
  }
  return stopped;
}
```

## 5. Lands in

- TARGET `src/fight/instance-supervisor.ts` (new), supervising one engine instance per fight or zone copy under `src/fight/`. Parity-checklist row 18 (post-K item 3: the server tick and rewards run per instance) and row 4 (fight loop lifecycle: aggro, chase, leash).
- today: `src/net/lobby.ts` mints a room on the relay (`?duel=new`) and joins one (`?duel=<token>`); there is no instance supervisor or termination timer. (read in worktree `frankendom-combat-p3`, commit 6adcab27e). The fight loop is duplicated in Zone 1 and the origins (checklist row 4).
- Reuse tag: rewrite-from-idea
- Brief rule served: 10 (zone copies with soft cap and seeding); rules 7-9 n/a

## 6. Gaps and risks

- Chess is turn-based. The donor's pace and disconnect rules are for clocks; Frankendom's fight timing is real time. The window formula transfers, its values do not.
- An actor per game is a per-instance runtime. Frankendom's ruling is one engine with zones as data; an instance per fight or zone copy is compatible only if every instance runs the same engine code with zone data.
- Presence-driven termination depends on a presence feed from the socket gateway. Frankendom's server-verified kills mean a fight instance must not be terminated mid-fight before its result is written to the one ledger.
- The donor's message switch is a string API from the client. The engine should take intents from the client facade (Pit as client), not a client verb string.
