# gemrb-gemrb (parties-guilds-chat, cell 1)

Donor: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Game.cpp` | Licence: GPL-2.0-or-later (SPDX header Game.cpp line 3; repo `LICENSES/GPL-2.0-or-later.txt`) | C++ (Game.cpp, Actor.cpp), Python (GUIScripts) | symbol `Game::JoinParty`, `Game::LeaveParty`, `Game::ConsolidateParty`, `Game::PartyOverflow`

Checked: The hint file `GUIScripts/iwd2/SPParty.py` (1-124, read in full) is the single-player premade party picker: it lists names from party.ini and calls `CreatePlayer` (line 123). It does not implement membership. The mechanism is in `core/Game.cpp`: `FindPlayer` 161-169, `ReversePCs` 153-159, `SwapPCs` 989-1001, `ConsolidateParty` 304-333, `LeaveParty` 335-389, `InitActorPos` 393-431, `JoinParty` 433-508, `PartyOverflow` 1517-1531, `UpdateScripts` overflow call 1636-1670, `SetPartySize` 1684-1691. Also `Actor::SetPersistent` (Actor.cpp 5749-5757), `Game.h` 42-46, `Interface.cpp` 858-868. Confidence: high for join, leave, consolidate and overflow (read end to end). Not read: `PartyReform.py` (what the reform screen does), `ApplyKit`, `RefreshEffects`, `PartyMemberDied` beyond its first 30 lines.

Best transferable idea: keep the party as one ordered roster with 1-based slots: a join takes the next slot, a leave shifts higher slots down, and the server refuses joins over the cap instead of allowing an overflow state.
Decision (proposed): adapt — the roster and slot-shift rule are simple and testable for server-owned social state; reject the donor's over-cap-then-reform flow, since Frankendom refuses over-cap joins on the server.
Acceptance: a server test with cap 3 and three members returns full for a fourth join and leaves the roster unchanged; after the member in slot 2 leaves, the other two show slots 1 and 2 in the next state sync.

## 1. Mechanism

- The party is an ordered vector, `Game::PCs`. Each member `Actor` also carries `InParty`, a 1-based slot number (`ieByte`). Two indices exist and must not be confused: the vector position (returned by `Game::InParty(actor)`) and the slot number (`actor->InParty`). The rest of the engine looks members up by slot number (`FindPlayer`, `FindPC`).
- Join (`JoinParty`, 433-508). If the actor is already in `PCs`, return its vector index and stop (442-445). With the `JP_JOIN` flag: stats, kit and join date are set, and the protagonist's portrait is swapped if it matches (448-474). With `JP_OVERRIDE`, an NPC with the same script name is removed first (476-489). The actor leaves the `NPCs` store (491-495) and is appended to `PCs` (497). If the actor has no slot yet, its slot becomes `size + 1`, where `size` was taken before the append (446, 498-499). Return `size`, the new vector index (507). Join does not check the cap.
- Start position (`InitActorPos`, 393-431). With `JP_INITPOS`, the slot minus one (`ip`, 395) selects the column of the `startpos` table for X and Y (419). The table contents were not read.
- Leave (`LeaveParty`, 335-389). The actor is deselected, its vector index is found (341-342), and it is erased from `PCs` (346-347). Then every remaining member whose slot is above the leaver's slot drops by one (358-361). The order matters: the comparison at 359 still uses the leaver's own slot. Only after that does `actor->SetPersistent(0)` run (364), which sets `InParty` to 0 (Actor.cpp 5757). The actor moves to the `NPCs` store (365). If the feature flag is set, critical items go to `PCs[0]` (379-386).
- Swap (`SwapPCs`, 989-999). Two members exchange their slot numbers. The vector is not reordered.
- Reverse (`ReversePCs`, 153-156). Every slot becomes `size - slot + 1`.
- Consolidate (`ConsolidateParty`, 304-333). Runs on the game-start path, before the game control starts (Interface.cpp 864-867; the enclosing function was not read). It scans `i` from 1. If no member holds slot `i`, every slot above `i` drops by one (307-315). `i` is not advanced, so the same `i` is checked again. Afterwards each member refreshes its effects and restores its modal spell (319-331).
- Overflow (`PartyOverflow`, 1517-1531). Returns true only when the cap is non-zero (1527), `PCs.size() > partysize` (1530), and no dialogue, container or frozen-script flag is set (1524-1526). `UpdateScripts` calls it on each pass (1666). On overflow it clears the cap to 0 (1667), opens the `PartyReform` window (1668) and returns. So a join over the cap succeeds, and the game then forces a reform screen on the next update.
- Cap (`SetPartySize`, 1684-1691). A value of 0 means no size control (1686). Negative values are ignored (1687). Each game's enter-game script sets it once to `MAX_PARTY_SIZE` (iwd2 `Game.py` 13). That constant is `GemRB.GetVar("MaxPartySize")` (`GameCheck.py` 13). The value was not read.
- Tick: none. These are synchronous calls from join, leave, load and the update step (`UpdateScripts`). No accumulator, no per-frame member loop beyond the overflow check.

## 2. Key functions

- `Game::JoinParty`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Game.cpp` 433-508. Appends a member, assigns the slot, returns the index. No cap check.
- `Game::LeaveParty`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Game.cpp` 335-389. Erase, shift higher slots down, zero the leaver's slot, move the leaver to the store.
- `Game::ConsolidateParty`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Game.cpp` 304-333. Gap-closing scan on load, then per-member effect refresh.
- `Game::PartyOverflow` and its caller: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Game.cpp` 1517-1531 and 1666-1670. One-shot over-cap check that opens the reform window.
- `Game::SetPartySize`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Game.cpp` 1684-1691. Cap setter; 0 disables the check.
- `Actor::SetPersistent`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Scriptable/Actor.cpp` 5749-5757. Writes the slot; a negative argument demotes the actor and zeroes the slot.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Roster is an ordered list; a new member takes slot count + 1 (`size + 1`, theirs 499) | Slots start at 1 (theirs 395: slot minus one indexes the table) |
| Leaving shifts every higher slot down by one, after reading the leaver's slot and before zeroing it (theirs 359, 364) | None |
| Gap-closing renumber on load (theirs 307-315) | Runs on game start (theirs Interface.cpp 864-867) |
| Cap check on size (theirs 1530) | Cap = `MAX_PARTY_SIZE` (engine variable `MaxPartySize`, value not read, GameCheck.py 13); 0 = no cap (theirs 1686) |
| Over-cap detection after the fact, one-shot (theirs 1666-1667) | Clear cap to 0 after firing so the reform window opens once; suppressed during dialogue, containers and frozen scripts (theirs 1524-1526) |
| Start position by slot column (theirs 395, 419) | Table values not read |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's ordering for join (append at count + 1) and leave (remove, then shift higher slots down). It changes three things on purpose. (1) Over-cap joins are refused at join time, where the donor lets them succeed and then forces a reform window. (2) Load-time repair is a sort and renumber, not the donor's gap scan with restart. (3) It has no vector-position lookup and no swap or reverse. It omits stats, kit, portraits, triggers, the NPC store, the JP_OVERRIDE replacement, the selection handling, critical-item return, start positions, and the modal-spell restore on load.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Member { id: string; slot: number; } // slot is 1-based, as the donor's InParty

type JoinResult = { ok: true; slot: number } | { ok: false; reason: "already-in" | "full" };

class PartyRoster {
  private members: Member[] = []; // kept in slot order

  constructor(private readonly cap: number) {} // cap 0 = no limit

  // Join appends at the next free slot. Over-cap joins are refused here, not flagged afterwards.
  join(id: string): JoinResult {
    if (this.members.some(m => m.id === id)) return { ok: false, reason: "already-in" };
    if (this.cap > 0 && this.members.length >= this.cap) return { ok: false, reason: "full" };
    const slot = this.members.length + 1;
    this.members.push({ id, slot });
    return { ok: true, slot };
  }

  // Leave removes the member, then moves every higher slot down by one so no gap is left.
  leave(id: string): boolean {
    const idx = this.members.findIndex(m => m.id === id);
    if (idx < 0) return false;
    const gone = this.members[idx];
    this.members.splice(idx, 1);
    for (const m of this.members) if (m.slot > gone.slot) m.slot -= 1;
    return true;
  }

  // On load, stored slots may have gaps: sort by slot and renumber 1..n.
  consolidate(): void {
    this.members.sort((a, b) => a.slot - b.slot);
    this.members.forEach((m, i) => { m.slot = i + 1; });
  }

  slotOf(id: string): number | undefined {
    return this.members.find(m => m.id === id)?.slot;
  }

  size(): number { return this.members.length; }
}
```

Typecheck: the block plus `export {}` compiles with `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `origins/server/party-roster.ts` (new; the server owns the party roster, so join and leave are checked on the server). Not checked against the repo (not read).
- Parity row: none. No row 1-23 covers party membership. The closest is row 18 (loot roll and XP award), since a party is the unit that would share loot and XP, but this donor code does not compute loot or XP and the callers of `GetTotalPartyLevel` (650-662) were not read. So row 18 is not claimed.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: one character / one ledger (one ordered roster with one slot per member); rules on fight camera, MAX_ATTACKERS and the Pit do not apply to party membership.

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism.
- The donor lets a join succeed over the cap and then forces a reform screen. Frankendom must refuse the join on the server; an over-cap roster state must not exist.
- The donor's cap is a game-wide engine variable, not a per-zone value. Frankendom has no party cap ruling yet. MAX_ATTACKERS = 3 limits attackers in a fight and is not a party size. Lead needs to set the party cap as a product decision.
- Nothing here says whether a party can enter a duel or a many-on-one fight. This is a question for Lead. The sketch does not invent it.
- Leave returns critical items to slot 1 (`PCs[0]`, 379-386) by moving them through `MoveItemCore`. Frankendom's one ledger must move an item, never copy it. The donor's move is consistent with that, but the code path was read only at the call (not read further).
- The slot also indexes start positions (395-419, table values not read). A sound channel is indexed by slot too (Actor.cpp 3646, grep only, not read). Any Frankendom use of slot-based placement needs its own data.
- `PartyMemberDied` (1339-1372) is party banter, a random living member reacts to a death. It is not membership and was read only in part.
- `PartyReform.py` (what the reform screen does) was not read. The overflow handling above is what the engine does before that window opens.
- Callers of `JoinParty` and `LeaveParty` were found by grep (GameData.cpp 103, IniSpawn.cpp 587 and 832, GAMImporter.cpp 177, FXOpcodes.cpp 2327, 4334, 4959, 6040, Actor.cpp 894, Map.cpp 1778, GameScript Actions.cpp 3097-3148, GUIScript.cpp 10436-10452) but not opened. The statements above about what they do are not claimed.
