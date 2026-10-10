# xoreos-xoreos (parties-guilds-chat, cell 3)

Donor: `/mnt/frankendom-donors/xoreos-xoreos/src/engines/kotorbase/partycontroller.cpp` (with `partycontroller.h`, `partyconfig.h`, `gui/partyselection.cpp`, `module.cpp`, `gui/menubase.cpp`) | Licence: GPL-3.0-or-later (`partycontroller.cpp` header: "either version 3 of the License, or (at your option) any later version"; COPYING is the GPL v3 text) | C++ | symbols `PartyController::setPartyLeaderByIndex`, `PartyController::leftShiftPartyMembers`, `PartyController::handleEvent`, `PartySelectionGUI::callbackActive`

Checked: Read in full: `partycontroller.h` (98 lines), `partycontroller.cpp` (185), `partyconfig.h` (51). Read in part: `gui/partyselection.cpp` 50-118 (selection toggle) and 146-160 (count label); `module.cpp` 279-304 (`loadParty`), 618-632 (input order), 835-841 (forwarders); `gui/menubase.cpp` 50-70 (portrait change); `round.cpp` 84-88 (`raiseHeartbeat`); `cameracontroller.cpp` 60-70 (camera target). Callers read: `setPartyLeader` from the script function (`script/functions_party.cpp` 95-97), `setPartyLeaderByIndex` from the portrait button (`gui/menubase.cpp` 57) and the Tab key (`partycontroller.cpp` 157); `raiseHeartbeatEvent` from `round.cpp` 86 (the caller of `raiseHeartbeat` was not read). Not read: `partyleader.cpp` (the controlled character's movement), the NWScript add and remove party functions, the GUI layer that decides whether a widget can be clicked. Confidence: high on the controller and selection logic as written; nothing was run. camera_scope: not a camera cell (the camera is mentioned only as a gap).

## 1. Mechanism

The party is an ordered list of `(npc id, creature)` pairs. Index 0 is the controlled leader. Leadership changes are rotations of that list, so the order of companions is also the order that becomes leader next.

- Load (`module.cpp` 279-304): with no saved party, only the player character (id -1) is added (282-283). Otherwise the list is rebuilt: id -1 is the player character again, and each companion is created from its template (293, 300). One special case skips a template by name (`module.cpp` 295-297; the comment there says Trask exists only on the Endar Spire).
- Add (`partycontroller.cpp` 75-89): a new member is placed on the current leader's position (76-81), appended to the back of the list (83), and, unless its id is -1, added to the current area and shown (85-88).
- Change leader by index (108-125): index 0 is a no-op (109). Otherwise the old front entry is remembered (112), the list is rotated left once per step (113-115), and the new front becomes the leader (116). The old leader is made usable again and plays its default animation (118-119). The new leader is made unusable and loses its queued actions (121-122). Listeners are told (124).
- Rotation helper (174-181): the front entry moves to the back and each other entry moves forward one place.
- Change leader by NPC id (91-106): search from index 1 (95), ignore an unknown id (102-103), otherwise call the index version (105).
- Input (151-166): a Tab key release (156) changes the leader by one (157). A Tab press is consumed without action (159). In `module.cpp` the party controller is checked before the leader controller and the camera (626-632; the loop around them was not read).
- Heartbeat (168-172): every member, leader included, runs its `k_ai_master` script, once per call. `round.cpp` 84-88 sets a script variable and raises it.
- Selection (`gui/partyselection.cpp`): up to 10 candidate slots (`partyconfig.h` 35). Up to two forced NPCs (`partyconfig.h` 37-38) are marked selected at load and count toward the cap (55-57). Accepting the active slot toggles it (99-109): a forced slot cannot change (100-101); a new selection is added only while fewer than two are chosen (102-105); deselection decrements the count (107-109). The label shows how many can still be chosen (152). The accept button reads "Add" or "Remove" (165-166).
- Portrait buttons (`gui/menubase.cpp` 56-57) change the leader to index 1 or 2.

## 2. Key functions

- `PartyController::setPartyLeaderByIndex`: `/mnt/frankendom-donors/xoreos-xoreos/src/engines/kotorbase/partycontroller.cpp` 108-125. The leader change, with the usable and actions flags and the notification.
- `PartyController::leftShiftPartyMembers`: `/mnt/frankendom-donors/xoreos-xoreos/src/engines/kotorbase/partycontroller.cpp` 174-181. The rotation.
- `PartyController::handleEvent`: `/mnt/frankendom-donors/xoreos-xoreos/src/engines/kotorbase/partycontroller.cpp` 151-166. The Tab cycle.
- `PartyController::addPartyMember`: `/mnt/frankendom-donors/xoreos-xoreos/src/engines/kotorbase/partycontroller.cpp` 75-89. Spawn on the leader, append at the back.
- `PartySelectionGUI::callbackActive` (accept): `/mnt/frankendom-donors/xoreos-xoreos/src/engines/kotorbase/gui/partyselection.cpp` 99-114. The forced-slot and cap rule.
- `Module::loadParty`: `/mnt/frankendom-donors/xoreos-xoreos/src/engines/kotorbase/module.cpp` 279-304. Rebuilds the roster from saved ids and templates.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Leader is the front of an ordered roster; a change rotates the roster and moves the old leader to the back | None; the rule is in the rotation |
| Cycle key moves the leader by one | Step 1 (`partycontroller.cpp` 157) |
| Forced members count toward the companion cap, and cannot be removed | Cap of two companions (`gui/partyselection.cpp` 103) |
| Candidate slots are fixed data | Ten slots (`partyconfig.h` 35); forced ids -1 for none (37-38) |
| Player character is an ordinary roster entry with a reserved id | Id -1 (`module.cpp` 283) |
| New member spawns on the leader | None |
| Every member gets a heartbeat | Script variable 2001 (`round.cpp` 85), a script counter, not a tunable |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: a new member spawns on the leader and joins the back, a leader change rotates the roster once per step and then fixes the old and new leader's flags, and the selection checks forced slots before the cap. It adds guards the donor lacks: an empty roster is ignored, an out-of-range or empty selection slot is ignored (the donor reads `slotSelected[_activeSlot]` with no check, so -1 would index out of range). It omits the NWScript entry points, the GUI (checkbox state, portrait textures, labels), the area and creature spawn (only the position copy is kept), the animation call (`playDefaultAnimation`), and the script variable for the heartbeat. Positions are plain vectors; the donor uses creature objects.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Id = number;
interface Vec3 { x: number; y: number; z: number }
interface Member { id: Id; pos: Vec3; controllable: boolean; actions: string[] }

// Roster: index 0 is the controlled leader; companions follow in list order.
class Roster {
  private list: Member[] = [];
  constructor(private onLeaderChanged: () => void) {}

  get leader(): Member | undefined { return this.list[0]; }

  // A new member appears on the leader's position and joins the back of the list.
  add(id: Id): void {
    const lead = this.list[0];
    const pos = lead ? { ...lead.pos } : { x: 0, y: 0, z: 0 };
    this.list.push({ id, pos, controllable: true, actions: [] });
  }

  // Rotate the roster left by `index` steps; the old leader ends up at the back.
  setLeaderByIndex(index: number): void {
    if (index === 0 || this.list.length === 0) return; // empty guard added: donor has none
    const prev = this.list[0];
    for (let i = 0; i < index; i++) this.list.push(this.list.shift()!);
    const next = this.list[0];
    prev.controllable = true;
    next.controllable = false;
    next.actions = [];
    this.onLeaderChanged();
  }

  // A named companion becomes leader; ids not in the roster are ignored.
  setLeaderById(id: Id): void {
    const i = this.list.findIndex((m, k) => k >= 1 && m.id === id);
    if (i === -1) return;
    this.setLeaderByIndex(i);
  }

  // Tab: cycle to the next member on key release, not on press.
  onCycleKey(released: boolean): void {
    if (released && this.list.length > 0) this.setLeaderByIndex(1);
  }

  // Every member gets a heartbeat tick, leader included.
  heartbeat(tick: (m: Member) => void): void {
    for (const m of this.list) tick(m);
  }
}

const SLOT_CAP = 2; // donor: at most two companions are chosen; forced slots count toward it

class PartySelection {
  private selected: boolean[];
  private count = 0;

  constructor(private slots: (string | null)[], private forced: number[] = []) {
    this.selected = slots.map(() => false);
    for (const f of forced) {
      if (!this.selected[f]) { this.selected[f] = true; this.count++; }
    }
  }

  // Accept on the active slot. Forced slots never change. A bad index or an empty slot is ignored (added guards).
  toggle(active: number): void {
    if (active < 0 || active >= this.slots.length) return;
    if (this.slots[active] === null || this.forced.includes(active)) return;
    if (!this.selected[active]) {
      if (this.count < SLOT_CAP) { this.selected[active] = true; this.count++; }
    } else {
      this.selected[active] = false;
      this.count--;
    }
  }

  remaining(): number { return SLOT_CAP - this.count; }
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 xoreos-party.ts` on the VPS, exit 0.

## 5. Lands in

- TARGET `origins/party/roster.ts` (proposed new module; the path is not checked against the Frankendom repo). It holds the ordered roster, the leader rotation and the companion-selection cap. The leader change is server state (who the party is); the Tab key is client input that asks for it.
- Parity-checklist row 5 (controls and input). This is the closest row, and it is a partial fit: the Tab cycle and the portrait click are input, but the roster and the cap are not covered by any row (no row covers party membership).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: the roster is one ledger on the server, and the client only asks for a leader change (server-verified state).

Best transferable idea: keep the party as one ordered roster whose front is the leader, so a leader change is a single rotation with one notification point, and count forced members toward the companion cap.
Decision (proposed): adapt — keep the rotation-based leader change, the single change notification and the forced-slots-count-toward-the-cap rule; do not copy the per-creature usable and animation flags, which belong in Frankendom's client input layer.
Acceptance: A player with a leader and two companions presses Tab; on key release the next companion becomes the controlled character, the previous one is free to act, and the new one stops taking its own orders. A party picker with two forced slots shows zero remaining and refuses a third choice; the server test asserts the roster is unchanged.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism.
- No guard on the accept path: `PartySelectionGUI::callbackActive` (`gui/partyselection.cpp` 99-114) indexes `slotSelected[_activeSlot]` (102, 104, 108) with no check for -1. The accept button is not disabled when no slot is active (only its label is set, 165-166). Whether the GUI layer can click it with no active slot was not read. Frankendom must guard the index on the server.
- `PartyController::getPartyLeader` (`partycontroller.cpp` 44-46) and `setPartyLeaderByIndex` (108-112) read `_party[0]` with no empty check. The Tab caller guards it (`!_party.empty()` at 156); the portrait-button path was not checked for an empty party. Frankendom should return a typed error, not rely on callers.
- The roster order is the leader order: the next leader after Tab is always the second entry, so the companion order is a player-visible setting. Frankendom should decide whether order is data or an action.
- The cap of two companions plus the player character is a design rule of this game. Frankendom's MAX_ATTACKERS = 3 is a different concept (attackers in a fight), so do not let the two numbers merge. Keep the companion cap as a data field.
- Content in code: `loadParty` skips one template by name (`module.cpp` 295-297). Frankendom's zones-as-data rule means that belongs in zone data.
- Camera (client only, not this cell): the camera target is the leader's position plus the creature's camera height (`cameracontroller.cpp` 65 and 69), read in `updateTarget` (63-70); the per-frame caller was not read. The camera follows the leader, not the party's centre.
- Not read: `partyleader.cpp`, the NWScript add and remove party functions, the rest of the selection GUI, and any party member joining or leaving mid-game (only the load path was read).
