# ClassicUO (anticheat-validation, cell 6)

Donor: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/Network/PacketHandlers.cs` (fast-walk keys, inbound snaps), `.../Client/Game/Managers/WalkerManager.cs` (token pool, sequence checks), `.../Client/Game/GameObjects/PlayerMobile.cs` (pre-send gate), `.../Client/Game/GameObjects/Mobile.cs` (inbound step queue and step validation), `.../Client/Game/Pathfinder.cs` (CanWalk), `.../Client/Network/OutgoingPackets.cs` (0x02 walk request), `.../Client/Game/Constants.cs` | Licence: BSD 2-Clause License, "Copyright (c) 2025, andreakarasho" (LICENSE.md; file headers `SPDX-License-Identifier: BSD-2-Clause`) | C# | symbol `WalkerManager` (token pool) with `PlayerMobile.Walk`

Checked: Read in full: `WalkerManager.cs` (all 199 lines), `PlayerMobile.Walk` (523-690), the ext-command fast-walk cases (4125-4150), `DenyWalk` and `ConfirmWalk` handlers (1178-1216), `UpdatePlayer` deny call (6436-6450), `UpdateGameObject` mobile branch (6300-6360 read; the function starts at 6172, found by grep), `Mobile.EnqueueStep` (271-329), `Pathfinder.CanWalk` (588-635), `Pathfinder` direction offsets (34-37). Read in part: `Pathfinder.CalculateNewZ` (370-430; the height and passability rules inside it, `CalculateMinMaxZ` and `CreateItemList`, were not read), `Mobile.ProcessSteps` bad-step block (745-770). Not in the donor: any server code. The tree is the client only (ClassicUO.Client, Renderer, Assets, IO, Utility, Bootstrap), and the server's token check was not found anywhere; so the enforcement half of this mechanism is absent and only the client half is read. Confidence: high for the token spend, the pre-send gate and the snap rules; medium that the STRONG verdict holds, because the server half is not in the donor. camera_scope: not a camera note.

## 1. Mechanism

- Token pool (server gives tokens). The client's `ExtendedCommand` handler (`PacketHandlers.cs` 4125-4150) has a case labelled "fast walk prevention" (4137). Sub-command 1 reads six 32-bit keys and stores them with `SetValue`, which keeps only indices 0 to 4 (`WalkerManager.cs` 46-52, pool size 5). Sub-command 2 adds one key with `AddValue` into the first empty slot (54-65); if all five slots are full the key is dropped without a message. The pool is `FastWalkStack` (42-83).
- Token spend (client sends one per move). `PlayerMobile.Walk` calls `Send_WalkRequest(direction, sequence, run, FastWalkStack.GetValue())` (`PlayerMobile.cs` 668). `GetValue` returns the first non-zero key, zeroes that slot, and returns 0 when the pool is empty (`WalkerManager.cs` 67-82). The key follows the direction and sequence bytes as a 4-byte big-endian value (`OutgoingPackets.cs` 3791); fixed-length packets are zero-padded to the table length (3799). The client never checks a key against anything; if the server rejects a move, the server's deny (0x21) is the only signal.
- Pre-send gate, in order (`PlayerMobile.cs` 523-528): refuse if `WalkingFailed`; refuse if `LastStepRequestTime > Time.Ticks` (the time gate set by the previous send); refuse if `StepsCount >= 5`; refuse if paralysed on client version CV_60142 or later (the enum name is the donor's). Then run is cleared when `SpeedMode >= CantRun`, when `Stamina <= 1` and not dead, or when hidden with the always-run-unless-hidden profile (532-535).
- Pathfinder check before send (`PlayerMobile.cs` 572, 598, which calls `Pathfinder.CanWalk` in both branches). `CanWalk` (`Pathfinder.cs` 588-635) computes the target tile and calls `CalculateNewZ` (595). For a diagonal (odd direction, 597), both orthogonal neighbours are also tested; if the straight diagonal or either side test fails, it tries the two neighbours (`_dirOffset` +1 and -1, lines 34-37, 614-623), so a diagonal slides along a wall. A passed check overwrites the target, direction and Z (626-632).
- Inbound step validation for the player's own steps (`Mobile.ProcessSteps`, read from the `removeStep` test at 745 to the bad-step check at 766). The check runs only when the mobile is standing on a tile (`Offset` zero). A step is bad if its tile is more than one away in either axis (757). The zero-distance term in that test is unreachable, because the branch runs only when the tile differs from the current one. It is also bad if the next tile from the current one, computed by `Pathfinder.GetNewXY`, is not the step tile (766). A bad step is removed without an offset (the `removeStep` path).
- Inbound moves for other mobiles (`PacketHandlers.cs` 6332-6350, `UpdateGameObject`). If the mobile is unknown to the client, or its position is 0xFFFF, it is set to the server tile and its steps are cleared (6332-6339). Then `EnqueueStep` (`Mobile.cs` 271): if five steps are already queued it returns false (273-275), and the caller sets the mobile to the server tile and clears its steps (6342-6349), so an overflow is a snap, not a dropped step. If the server end position equals the requested one, nothing is queued and it returns true (280-283). Otherwise it appends a turn at the end of the queue when the move's direction differs from the queued facing, the move step, and a turn to the final facing when `moveDir` differs from `direction` (295-326).
- Server deny for the player (`UpdatePlayer`, 0x20, `PacketHandlers.cs` 6418): it clears `WalkingFailed`, sets graphic, direction and flags, then calls `DenyWalk(0xFF, -1, -1, -1)` (6440-6446), which clears steps and resets the walker without moving the tile (x = -1). The 0x21 deny (1178-1193) is the one that moves the player to the server tile.
- Confirm and bad step (summary, cell 5 has the full order). An unknown sequence is a bad step; a bad step sends one resync and sets `WalkingFailed` (`WalkerManager.cs` 144-185), which stops every move until `Reset`.

## 2. Key functions

- `ExtendedCommand` fast-walk cases: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/Network/PacketHandlers.cs` 4125-4150 (sub-commands 1 and 2).
- `WalkerManager.FastWalkStack`: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/Game/Managers/WalkerManager.cs` 42-83 (`SetValue` 46-52, `AddValue` 54-65, `GetValue` 67-82).
- `PlayerMobile.Walk`: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/Game/GameObjects/PlayerMobile.cs` 523-690 (gate 525-528; token spend 668).
- `Pathfinder.CanWalk`: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/Game/Pathfinder.cs` 588-635.
- `Mobile.EnqueueStep`: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/Game/GameObjects/Mobile.cs` 271-329.
- Mobile step validation: `Mobile.cs` 745-770 (inside `ProcessSteps`).
- Inbound mobile snap: `/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/Network/PacketHandlers.cs` 6172 (`UpdateGameObject` start; mobile branch 6332-6350).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Server-issued one-time tokens in a small pool; spend one per action | Pool size 5 (theirs, `Constants.cs` 39, `MAX_FAST_WALK_STACK_SIZE`); 32-bit token (`PacketHandlers.cs` 4140, `ReadUInt32BE`) |
| Bounded queue of unconfirmed actions | 5 (theirs, `Constants.cs` 16, `MAX_STEP_COUNT`; `PlayerMobile.cs` 525; `Mobile.cs` 273) |
| Time gate per action | Walk 400 ms, run 200 ms (theirs, `MovementSpeed.cs` 12 and 11; the gate is set at `PlayerMobile.cs` 686) |
| Refuse run when the resource is spent | `Stamina <= 1` (theirs, `PlayerMobile.cs` 532) |
| Overflow of an inbound queue = snap to server state | Same cap of 5 (`Mobile.cs` 273) |
| Step validity: adjacent, nonzero, reaches the tile from the current one | Adjacency limit 1 tile (theirs, `Mobile.cs` 757) |

## 4. TypeScript sketch

simplified: the client half only. The sketch keeps the token pool (set, add-into-first-empty, take-first-nonzero, 0 when empty), the pre-send gate (failed, time gate, queue cap, paralysis), the adjacency-and-reach step check, and the inbound overflow-snap rule. It omits the server check (not in the donor), the Pathfinder height and diagonal-slide rules, the version gate, the stamina run rule, the turn-step expansion in `EnqueueStep`, the 0xFFFF and unknown-mobile snap, the deny packet fields, and the resync packet body. The pool keeps the donor's silent drop of a sixth key. The step check takes `getNewXY` as a parameter, so the sketch does not depend on the donor's table.

```ts
// Licence: BSD-2-Clause (donor). Shape only, written from the described mechanism; not a translation.
const TOKEN_SLOTS = 5;     // donor Constants.MAX_FAST_WALK_STACK_SIZE
const MAX_QUEUED = 5;      // donor Constants.MAX_STEP_COUNT (own moves and incoming steps)

// Server-issued one-time tokens. The server sets a batch, adds single tokens, and the client spends one per move.
class TokenPool {
  private slots: number[] = new Array<number>(TOKEN_SLOTS).fill(0);

  set(index: number, value: number): void {          // donor ext cmd 1: reads 6 values, keeps 5
    if (index >= 0 && index < TOKEN_SLOTS) this.slots[index] = value;
  }

  add(value: number): void {                         // donor ext cmd 2: first empty slot, else dropped
    const i = this.slots.indexOf(0);
    if (i >= 0) this.slots[i] = value;
  }

  // Spend the first non-zero token; 0 is sent when the pool is empty (the server decides what that means).
  take(): number {
    for (let i = 0; i < TOKEN_SLOTS; i++) {
      const v = this.slots[i];
      if (v !== 0) { this.slots[i] = 0; return v; }
    }
    return 0;
  }
}

interface MoveState { failed: boolean; nextAllowedAt: number; queued: number; paralysed: boolean; }

// Client-side pre-send gate for the player's own move (donor PlayerMobile.Walk, first checks).
function mayWalk(s: MoveState, now: number): boolean {
  return !s.failed && s.nextAllowedAt <= now && s.queued < MAX_QUEUED && !s.paralysed;
}

// Adjacency check on a step the client is about to animate (donor Mobile.ProcessSteps badStep).
// Pathfinder.GetNewXY is passed in so this stays pure.
function stepIsConsistent(
  fromX: number, fromY: number, stepX: number, stepY: number, stepDir: number,
  getNewXY: (dir: number, x: number, y: number) => [number, number]
): boolean {
  const ax = Math.abs(fromX - stepX);
  const ay = Math.abs(fromY - stepY);
  if (ax > 1 || ay > 1 || ax + ay === 0) return false;
  const [nx, ny] = getNewXY(stepDir & 7, fromX, fromY);
  return nx === stepX && ny === stepY;
}

// Incoming steps for another mobile: a full queue snaps the mobile to the server tile and clears its steps (donor EnqueueStep caller).
function acceptIncomingStep(queueLength: number): "queued" | "snap" {
  return queueLength >= MAX_QUEUED ? "snap" : "queued";
}
export {};
```

## 5. Lands in

- TARGET `src/fight/intent-gate.ts` (new module: the client's pre-send gate and the server-issued token pool for intents). Parity-checklist row 5 (controls/input).
Best transferable idea: bound the in-flight window, spend one server-issued token per intent, and treat a window overflow as a snap to the server's state rather than a silent drop.
Decision (proposed): adapt. Keep the bounded window and the overflow snap as client behaviour; reject the donor's reliance on client-held tokens as protection (a modified client can skip them), so every token and every cap is checked on the server, and the server's check is what Frankendom writes and tests.
Acceptance: a server test sends an intent with an unissued token and one with a spent token: both are refused; a sixth intent in one tick is refused and the server's tile is echoed so the client snaps once.
- Reuse tag: rewrite-from-idea (BSD-2-Clause, code may be adapted; written as a clean sketch)
- Brief rule served: 1 (one engine: the server checks intents; the client gate is a convenience); "server-verified kills": a kill is never accepted from a client-side token.

## 6. Gaps and risks

- Client-side tokens are not security. The donor's pool is a rate and burst limit that a modified client can bypass. Frankendom's server must do the check; the client pool can only smooth input.
- The donor reads six keys and keeps five, and drops a key added to a full pool without telling anyone. Frankendom must count dropped intents and report them.
- The inbound overflow is a visible snap (the mobile is moved to the server tile). That is a rule Frankendom must choose on purpose; the donor shows the cost (a teleport look under lag).
- The donor's gate covers movement only. There is no attack, spell or engage gate in this donor, so nothing here covers a fight intent directly.
- The pathfinder's walkability depends on height and object tables (`CalculateNewZ`, not read in full). Frankendom's zones-as-data need their own walkability data; this donor does not give a shape for it.
- The version gate (CV_60142) and the stamina floor of 1 are donor history and a numeric rule. Make them data fields (zone or character), not constants copied from the donor.
- The donor's silent `AddValue` drop and the 0xFFFF snap are protocol-era behaviours. Do not copy them without a test.
