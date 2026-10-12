# ModernUO (spectator-coach-wagers-replays, cell 1)

Donor: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Items/Games/Mahjong/MahjongPlayers.cs` | Licence: GPL-3.0 (LICENSE line 3: GNU GENERAL PUBLIC LICENSE, Version 3) | C# | symbols `MahjongPlayers.UpdateSpectators`, `MahjongPlayers.Join`, `MahjongPlayers.CheckPlayers`, `MahjongPackets` tile visibility

Checked: Read in full: `Join`, `AddSpectator`, `UpdateSpectators`, `GetNextSeat`, both loops of `CheckPlayers`, `OpenSeat`, and the hidden-value check in `MahjongPackets.cs` (two sites). Callers: `CheckPlayers` has three callers (`MahjongPackets.cs:68`, `MahjongGame.cs:172`, `MahjongGame.cs:184`); `Join` has one (`MahjongGame.cs:185`); so the sweep statements below hold for all three. Not read: `InRange` body (range <= 5 is assumed), `UpdateDealer` body, `GetPlayerIndex` body, `Deserialize` past its first lines, the seat count the game passes in (caller not read), and the duel spectator moongate beyond its gate checks. The spectator-moongate section is a duel mechanism, read in `DuelContext.cs` (gate and combat check only). Confidence: high on the seat and queue logic; medium on the mapping to fights, since this is a table game. Wagers: no spectator wager code found (grep for wager/bet/gamble). Coach: no coach code found (grep, no hits). Replay: only `Engines/Pathing/PathfindRecorder.cs` (a dev benchmark recorder, not read in full) matched.

## 1. Mechanism

- A table has a fixed number of seats (`_players`, sized from the constructor argument, `MahjongPlayers.cs` 30-31). Overflow walkers go to a FIFO queue of spectators (`_spectators`, `MahjongPlayers.cs` 25, no cap, no serialized attribute).
- Join (`Join`, 388): a mobile already seated gets its old seat back (`GetPlayerIndex`, then `AddPlayer` with the join message). Otherwise it takes `GetNextSeat()` (302). Otherwise it becomes a spectator (`AddSpectator`, 375; queued only if not already queued; then it is sent the join, players, general and tiles packets). Join is called from double-click (`MahjongGame.cs` 184-185).
- Seat search (`GetNextSeat`, 302-304): the first empty seat from the dealer's index, wrapping round to the start.
- Promotion (`UpdateSpectators`, 323): if the queue is not empty and a seat is free, the queue head (`_spectators[0]`, 334) is removed (336) and seated with `AddPlayer(..., sendJoinGame: false)`. It then calls itself until no seat is free or the queue is empty. Called after sweeps that removed someone (258) and by `OpenSeat` (486).
- Who frees a seat: a seated mobile that is deleted gets its slot nulled (202). A seated mobile that loses its NetState, leaves the map, leaves range or loses access is only marked not in game (`_inGame[i] = false`, 213 and 223) and keeps its slot. The dealer's `OpenSeat` nulls the slot (480) and then promotes (486). So a walk-away fighter holds the seat until the dealer opens it or the mobile is deleted.
- The sweep (`CheckPlayers`, 185): it is not a timer. It runs only when a Mahjong packet arrives for this game (`MahjongPackets.cs` 68), when the context menu opens (`MahjongGame.cs` 172), or on double-click join (184). Seat loop first (191-~233). Then the spectator loop (236-~256): a spectator whose mobile is deleted or has no NetState is dropped silently; one who is out of range (`InRange(..., 5)`, 245), on another map, or not accessible is dropped and sent a relieve packet. Then if anything was removed, promotion runs (258).
- Hidden information: each hand area is either public, or visible to its player. When the dealer's spectator-vision flag is on (`_spectatorVision`, 75), spectators also get the hidden values (`MahjongPackets.cs` 384-385 and 435-436, tile values; the other branch sends zero). The toggle re-sends tiles to spectators (`MahjongGame.cs` 77-84, the `OnSpectatorVisionChanged` handler).
- Duel spectator entry (`DuelContext.cs`): a spectator moongate asks for confirmation (2761), and its `UseGate` refuses anyone whose `CheckCombat` is true (2787 on). `CheckCombat` (1275) returns true if the mobile has a player-vs-player combat record within `CombatDelay` = 30 s (30, 1279).

## 2. Key functions

- `UpdateSpectators`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Items/Games/Mahjong/MahjongPlayers.cs` 323-~345. FIFO promotion into the first open seat, recursive.
- `GetNextSeat`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Items/Games/Mahjong/MahjongPlayers.cs` 302-~316. Dealer-first, wrap-around search.
- `Join` and `AddSpectator`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Items/Games/Mahjong/MahjongPlayers.cs` 375-~406. Seat, else queue.
- `CheckPlayers`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Items/Games/Mahjong/MahjongPlayers.cs` 185-~260. Lazy two-loop sweep, then promotion.
- `OpenSeat`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Items/Games/Mahjong/MahjongPlayers.cs` 467-~490. Dealer frees a seat and promotes.
- Hidden-value rule: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Items/Games/Mahjong/MahjongPackets.cs` 384-385 (single tile) and 435-436 (tile list).
- Duel spectator gate: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/ConPVP/DuelContext.cs` 1275-~1290 (`CheckCombat`), 2747-~2800 (`ArenaMoongate`), 30 (`CombatDelay`).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| FIFO queue fills the first open slot, searching from a rotating index (dealer) and wrapping | Seat count = constructor argument (30-31); caller value not read |
| Range gate: drop a watcher who walks away | 5 (passed to `InRange`, 245 for spectators, 221 for seated players); `InRange` body not read |
| Queue has no cap | `List<Mobile>`, no limit (25, 379) |
| Per-viewer value filter with one owner-visible rule and one host toggle | Flag default false (75, a bool field); toggle GM-gated (73) |
| Combat-heat gate for entering the stands | 30 s (DuelContext.cs 30), counts only player-vs-player records (1279) |
| Arena spectator count | Region player count minus duelists, floor 0 (Arena.cs 427) |

## 4. TypeScript sketch

simplified: the sketch keeps the FIFO promotion, the dealer-first seat search, the join rule (rejoin keeps the seat, else seat, else queue), and the per-viewer value rule. It changes three things on purpose. It runs one sweep per server tick instead of on packets (donor is lazy). It frees the seat of an out-of-range seated player, where the donor only sets `_inGame` false and keeps the seat (the donor's fighter-holds-seat behaviour is the thing to avoid for a Pit). It drops the dealer rotation (`UpdateDealer`), the relieve and join packets, the deleted-mobile path, the ResetGame and the duel moongate.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Seat { occupant: string | null; }

interface Table {
  seats: Seat[];
  dealer: number;                 // seat index of the dealer
  spectators: string[];           // FIFO queue, first in first out
  spectatorVision: boolean;       // dealer toggle: spectators may see hidden hands
}

const RANGE_TILES = 5;            // donor passes 5 to InRange (InRange body not read; <= 5 assumed)

// First empty seat, starting at the dealer and wrapping round.
function nextSeat(t: Table): number {
  const n = t.seats.length;
  for (let k = 0; k < n; k++) {
    const i = (t.dealer + k) % n;
    if (t.seats[i].occupant === null) return i;
  }
  return -1;
}

// Promote queued spectators into open seats, FIFO, until one side runs out.
function promoteSpectators(t: Table): void {
  for (;;) {
    const seat = nextSeat(t);
    if (seat < 0 || t.spectators.length === 0) return;
    t.seats[seat].occupant = t.spectators.shift()!;
  }
}

// Join: a seated id keeps its seat; otherwise take the next open seat; otherwise queue (no duplicates).
function join(t: Table, id: string): "seat" | "queued" {
  if (t.seats.some(s => s.occupant === id)) return "seat";
  const seat = nextSeat(t);
  if (seat >= 0) { t.seats[seat].occupant = id; return "seat"; }
  if (!t.spectators.includes(id)) t.spectators.push(id);
  return "queued";
}

// Sweep: drop anyone out of range (queue and seats), free their seat, then promote.
// Donor runs this lazily on packets and context menus; here it is meant to run once per server tick.
function sweep(t: Table, distTiles: (id: string) => number): string[] {
  const dropped: string[] = [];
  t.spectators = t.spectators.filter(id => {
    if (distTiles(id) <= RANGE_TILES) return true;
    dropped.push(id);
    return false;
  });
  for (const s of t.seats) {
    if (s.occupant !== null && distTiles(s.occupant) > RANGE_TILES) {
      dropped.push(s.occupant);
      s.occupant = null;
    }
  }
  promoteSpectators(t);
  return dropped;
}

// Per-viewer view of one hidden hand value. Public hands, the owner, and (if the dealer allows it) spectators see it.
function visibleValue(t: Table, handSeat: number | null, isPublic: boolean, value: number, viewer: string): number {
  if (handSeat === null || isPublic) return value;
  if (t.seats[handSeat].occupant === viewer) return value;
  if (t.spectatorVision && t.spectators.includes(viewer)) return value;
  return 0;
}
```

## 5. Lands in

- TARGET `src/fight/spectate.ts` (new): the fight-spectator queue (FIFO promotion into a freed Pit slot), the per-viewer hidden-value rule for the record and the wager window, and the range sweep. Parity-checklist row 19 (fight record / replay: the spectator view is a view of the record).
- Server tick sub-line: the sweep is driven by the server tick: fixed step, input intake, per-tick NPC budget (post-K item 3; server tick has no row of its own).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 1 (one engine: queue, seat and visibility rules in src/fight, the Pit only renders); server-verified (the sweep and the value filter run on the server, not the client)

Best transferable idea: a FIFO spectator queue that fills the first freed seat, with a per-viewer hidden-value filter that only the host can switch on.
Decision (proposed): adapt — keep the queue and the per-viewer filter; sweep per server tick and free a fighter's slot when they leave, which the donor does not do.
Acceptance: a server test asserts that when a Pit fighter slot frees, the first queued spectator (FIFO) takes it within one server tick, and that a spectator receives a hidden value only when the host's spectator-vision flag is on.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism, not translated.
- Lazy sweep: the donor only sweeps when a packet, a context menu or a double-click arrives (`MahjongPackets.cs` 68, `MahjongGame.cs` 172 and 184), so a departed spectator can hold a queue slot until someone touches the table. Fix: run `sweep` every server tick.
- Walk-away holds the seat: a seated mobile that leaves range keeps its slot (213, 223), and promotion skips it. For a Pit this means a bout stays one fighter short until the host opens the slot (`OpenSeat`, 467). Fix: free the slot on leave (sketch does this).
- Queue not persisted: `_spectators` has no serialized attribute (25). A restart empties the queue. Frankendom: persist the queue with the server state, or accept a reset and say so.
- Vision toggle authority mismatch: the flag is a GameMaster command property (73), but the message says "The dealer has enabled/disabled Spectator Vision." (`MahjongGame.cs` 84). Frankendom: the toggle belongs to the Pit host, not a GM.
- Wagers and hidden information: with vision on, spectators see hidden values. Any spectator wager on a Pit bout must settle on public information only, or the vision flag must be off in the wager window. This is a design rule to write down before any wager exists.
- Duel stands gate (`DuelContext.cs` 30, 1279): a useful reusable rule (no entry for 30 s after a player-vs-player hit), but only counts player records, not NPC hits. Frankendom: count hits from any attacker if the stands must be safe from fresh fights.
- Coach and replay: not found in this donor beyond the caveats in Checked. `GamblingStone.cs` (88 lines) is a solo jackpot item, not a spectator wager (grep only, not read in full).


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
Errors: All checked claims hold: seats array sized by ctor arg (MahjongPlayers.cs 30-35), _spectators List with no serialization attribute (25), GetNextSeat dealer-first wrap (302-321), UpdateSpectators FIFO head and recursion (323-346), CheckPlayers two loops (191-256) with deleted -> slot nulled (202), no NetState/out-of-range -> only _inGame=false (213, 223) with InRange(...,5) (221, 245), spectator drop with relieve packet, promotion at 258, OpenSeat 467-490, Join 388-408 and AddSpectator 375, callers MahjongPackets.cs:68, MahjongGame.cs:172 and 184-185, spectator vision hidden-value rule at MahjongPackets.cs 384-385 and 435-436, vision flag GM-gated at MahjongGame.cs 73-75 with 'dealer' message, DuelContext CombatDelay 30 s (30), CheckCombat 1275-1291 player-only, spectator moongate gate refusal, Arena.cs 427 spectator count. GPL-3 licence line right. Honest not-read list.
Missed: LeaveGame (MahjongPlayers.cs 410-424): a seated player who leaves only gets _inGame=false and keeps the seat; a spectator is removed from the queue. This is the explicit leave path (voluntary) behind the 'walk-away holds the seat' finding and is not cited.
