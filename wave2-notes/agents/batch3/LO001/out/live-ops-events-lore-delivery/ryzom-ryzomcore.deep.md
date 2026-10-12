# ryzom-ryzomcore (live-ops-events-lore-delivery, cell 3)

Donor: `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/server/src/entities_game_service/player_manager/character_encyclopedia.cpp` (with `.h`, `egs_sheets/egs_static_encyclo.h`, `egs_sheets/egs_static_encyclo.cpp`, and the mission hooks in `mission_manager/mission_base_behaviour.cpp`, `mission_manager/mission_action.cpp`) | Licence: GNU AGPL v3 or later (file header: "published by the Free Software Foundation, either version 3 of the"; repo `COPYING` is AGPL v3) | C++ | symbols `CCharacterEncyclopedia::updateTask`, `unlockThema`, `checkIfThemaCompleted`, `CStaticEncyclo::init`

Checked: Read in full: `character_encyclopedia.h` (192 lines), `character_encyclopedia.cpp` (405), `egs_static_encyclo.h` (171), `egs_static_encyclo.cpp` lines 35-110 and 128-200 (readGeorges and init; 111-127 not read). Read `mission_base_behaviour.cpp` 1333-1352 and `mission_action.cpp` 4210-4226 (the two mission hooks). Callers, by grep: `updateTask` is called from `mission_base_behaviour.cpp:1348`, `character_version_adapter.cpp:765`, and `admin.cpp:7823` and `7830`; `unlockThema` from `mission_action.cpp:4222` only. Not read: `egs_static_encyclo.cpp` 200-342 (`isMissionPresent`, `getRiteInfos`), `STRING_MANAGER::sendStringToClient`, the reward grant path (no code grants `RewardSheet` or `RewardBrick` that I found in the files read), the client `encyclopedia_manager.cpp`. Data half: the georges sheet files (the actual albums, themas, and texts) are not in the donor box; `find` under `ryzom/` for encyclo files returns only code, a client UI xml and a message header. So the number of entries and the text are (not read); the grammar of the sheet is read. Confidence: high on state rules and completion (read in full). Checked the other two sources of the same topic: `game_event_manager` (faction event, admin-started, see section 6) and the EQEmu/OpenDAoC scheduler notes. Nameplates and kill cards: not searched. camera_scope: n/a.

## 1. Mechanism

A codex (encyclopedia) per character. Its content is static, from sheets: albums contain themas; a thema is one entry with a rite and up to seven tasks. The rite and each task are game missions. The character's progress is a small state per thema, shown to the client as text and icons.

- States: each thema and each slot is 0 (not displayed), 1 (displayed, not done), or 2 (displayed and done) (`character_encyclopedia.h` 86-89). Album state and thema state use the same three values.
- Slots: slot 0 is the rite; slots 1 to 7 are tasks (`character_encyclopedia.h` 99-109, `RiteState` plus `Task0State`..`Task6State`, 2 bits each, 16 bits in `RiteTaskStatePacked`). Slot n maps to the sheet's `Tasks[n-1]` (`character_encyclopedia.cpp` 383).
- Unlock (`unlockThema`, cpp 120-157): when a mission or action says so, the album and thema go from 0 to 1, and every slot from 0 to 1 (142-147). Done slots are not changed. One message is sent (155).
- Task completion (`updateTask`, cpp 70-116): refused if the album is complete (79), the thema is complete (84), or the slot already has the new state (89). Otherwise: write the slot (94); album and thema to 1 (97-98); the rite to 1 if still hidden (101-102); then `checkIfThemaCompleted` (104) and `checkIfAlbumCompleted` (105). A success message is sent only for new state 2 (113-114).
- Thema completion (`checkIfThemaCompleted`, cpp 256-290): done when the rite is 2 and every one of the sheet's tasks is 2 (267-277). Then the thema state is 2 (282) and a message is sent (285).
- Album completion (`checkIfAlbumCompleted`, cpp 294-311): done when every thema in the album is state 2 (300-302). Then the album state is 2 (307). The album then shows its reward brick (`CEncyMsgAlbum` path, cpp 237-238 and 330-331).
- Mission hook (`updateEncyclopedia`, `mission_base_behaviour.cpp` 1333-1352): on a successful mission, if the template has album, thema and task set (1340), `updateTask(album, thema, task, 2)` runs for every player in the mission (1344-1348).
- Action hook: a mission action can unlock a whole thema (`mission_action.cpp` 4214-4222).
- Client view (cpp 215-252 and 343-405): `sendEncycloToClient` sends an INIT impulse with all albums that are not state 0 (228), and only themas not state 0 (244). (Its callers were not read, so when it runs is not known.) Each thema shows its name, state, and the names and NPC givers of the slots that are not state 0 (351, 377-402). Reward text and reward sheet are shown only for state 2 (361-368).

## 2. Key functions

- `CCharacterEncyclopedia::updateTask`: `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/server/src/entities_game_service/player_manager/character_encyclopedia.cpp` 70-116.
- `CCharacterEncyclopedia::unlockThema`: same file, 120-157.
- `CCharacterEncyclopedia::checkIfThemaCompleted`: same file, 256-290 (rite plus tasks, 267-277).
- `CCharacterEncyclopedia::checkIfAlbumCompleted`: same file, 294-311.
- `CCharacterEncyclopedia::sendEncycloToClient` and `makeThemaMessage`: same file, 215-252 and 343-405.
- `CStaticEncyclo::init`: `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/server/src/entities_game_service/egs_sheets/egs_static_encyclo.cpp` 128-200 (accelerator table by album and thema number).
- Mission hook: `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/server/src/entities_game_service/mission_manager/mission_base_behaviour.cpp` 1333-1352.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants and rules |
|---|---|
| Entry = thema with a rite and up to 7 task slots | Slots 0 to 7 (8 slots), tasks 1 to 7 (`character_encyclopedia.h` 99-109; warn at more than 7, `egs_static_encyclo.cpp` 196-197) |
| Three-state visibility per slot | 0 / 1 / 2 (`character_encyclopedia.h` 86-89) |
| Two bits per slot, packed | 2 bits x 8 slots = 16 bits (`character_encyclopedia.h` 99-109) |
| Unlock reveals, never hides | 0 to 1 only (`character_encyclopedia.cpp` 145-146) |
| Rite gates completion | Slot 0 must be 2 (267, 274) |
| Thema completes when all sheet tasks are 2 | 277 |
| Album completes when all themas are 2 | 300-302 |
| Mission completion sets a slot | `updateTask(..., 2)` (1348) |
| Reward shown only at completion | state 2 only (361-368; album brick 237-238) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's state model (hidden, shown, done in 2-bit slots), the unlock that reveals, the refusals in updateTask, and the rite-gated thema completion. It changes three things: it keys themas by stable string ids (the donor keys them by array position, see section 6), it refuses a slot number above the sheet's task count (the donor does not check it), and it throws at load when a thema has more than seven tasks (the donor only warns). It omits: the album roll-up and reward brick (the completion rule is described in section 1 but not coded), the reward text and sheet, the NPC giver and task-name lookups, the client message builders and string caches, the GM admin path, and the donor's `nlassert` checks (replaced by returns).

```ts
// Licence: GNU AGPL v3 (repo COPYING; file headers say version 3 or later). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type State = 0 | 1 | 2; // 0 hidden, 1 shown and not done, 2 shown and done
type Slot = number; // 0 = rite, 1..7 = tasks

// Two bits per slot, slots 0..7 packed into one 16-bit value.
class PackedSlots {
  private bits = 0;

  get(slot: Slot): State {
    return ((this.bits >> (slot * 2)) & 3) as State;
  }

  set(slot: Slot, s: State): void {
    this.bits = (this.bits & ~(3 << (slot * 2))) | (s << (slot * 2));
  }
}

interface ThemaSheet {
  id: string; // stable id (donor keys by array position; this is a fix)
  taskIds: string[]; // 0..7 task mission ids; the rite is slot 0 and not listed here
}

interface ThemaProgress {
  state: State;
  slots: PackedSlots;
}

class Codex {
  private progress = new Map<string, ThemaProgress>();

  constructor(private sheets: Map<string, ThemaSheet>) {
    // Donor only warns when a thema has more than 7 tasks; here it is refused at load.
    for (const s of sheets.values()) {
      if (s.taskIds.length > 7) throw new Error(`thema ${s.id} has more than 7 tasks`);
    }
  }

  private get(themaId: string): ThemaProgress {
    let p = this.progress.get(themaId);
    if (!p) {
      p = { state: 0, slots: new PackedSlots() };
      this.progress.set(themaId, p);
    }
    return p;
  }

  // Unlock: reveal the rite and every task of the thema (hidden to shown only; done stays done).
  unlockThema(themaId: string): void {
    const sheet = this.sheets.get(themaId);
    if (!sheet) return;
    const p = this.get(themaId);
    if (p.state === 0) p.state = 1;
    for (let slot = 0; slot <= sheet.taskIds.length; slot++) {
      if (p.slots.get(slot) === 0) p.slots.set(slot, 1);
    }
  }

  // A mission finished: set one slot. Returns false when refused.
  updateSlot(themaId: string, slot: Slot, next: State): boolean {
    const sheet = this.sheets.get(themaId);
    if (!sheet || slot > sheet.taskIds.length) return false; // donor does not check the slot against the sheet
    const p = this.get(themaId);
    if (p.state === 2 || p.slots.get(slot) === next) return false;
    p.slots.set(slot, next);
    if (p.state === 0) p.state = 1;
    if (p.slots.get(0) === 0) p.slots.set(0, 1); // the rite becomes visible once anything moves
    if (this.isThemaDone(themaId)) p.state = 2;
    return true;
  }

  // Donor rule: the rite (slot 0) and every sheet task must be state 2.
  private isThemaDone(themaId: string): boolean {
    const sheet = this.sheets.get(themaId);
    if (!sheet) return false;
    const p = this.get(themaId);
    for (let slot = 0; slot <= sheet.taskIds.length; slot++) {
      if (p.slots.get(slot) !== 2) return false;
    }
    return true;
  }
}

export {};
```

Typecheck: copied to `/tmp/LO001-ryzom-codex.ts` on the VPS; `npx -p typescript tsc --noEmit --strict --target es2020` exit 0.

## 5. Lands in

- TARGET `origins/server/codex.ts` (new file, proposed): the lore codex as a runtime catalogue. Each legend is one thema (album = legend family); the entries come from the catalogue data, the progress is per character on the server.
- Parity-checklist row 20 (catalogue as runtime source). Legends are the catalogue. The thema reward (the backstory text and a title or brick) is what row 21 (catalogue fields) describes.
- Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
- Brief rule served: 20 catalogue as runtime source; one ledger (progress is server state, set by mission success); legends-rule: each thema's text is myth (a game backstory), never scripture, and is not reproduced here.

## 6. Gaps and risks

- AGPL-3.0: clean-room only. The sketch is written from the mechanism.
- Defect (overflow, warning only): `egs_static_encyclo.cpp` 196-197 warns when a thema has more than 7 tasks; `checkIfThemaCompleted` then reads `bTasksFinished[i]` for `i` up to the task count (268, 275-277), but the array holds 7 entries. Eight tasks read past the array, and the packed slots (rite plus 7) cannot hold the eighth task. Fix: refuse at load (the sketch does this).
- Risk (assert on input): `updateTask` and `unlockThema` use `nlassert` on the album and thema indexes and the task index (cpp 72-76, 122-125). A bad index from a mission template or a GM command goes to an assert rather than a failed call; what the NeL assert does at runtime was not checked. Fix: return an error for that call.
- Defect (repeat message): `unlockThema` sends the unlock message even when nothing changed, because it has no check on the thema's state (cpp 120-156, message at 155).
- Design risk (position keys): the per-character codex is a vector indexed by album and thema position (`character_encyclopedia.cpp` 58; `character_encyclopedia.h` 189), and the loader places each thema at `ThemaNumber - 1` (`egs_static_encyclo.cpp` 180). Renumbering a thema in the sheets moves a player's progress to another entry, and a shorter sheet truncates the state on `init` (58). Fix: stable string ids (the sketch does this).
- Design note (rite is a mission): the rite is slot 0, a mission named in the sheet (`Rite`, cpp 381), so completing a legend means finishing the rite mission and each task mission. The donor does not say what a rite is for in play; the mission content is not read.
- Frankendom gap (one ledger, server-verified): GM commands can set slots without a mission (`admin.cpp` 7809-7830). Frankendom must log such a change in the same ledger, with the GM id.
- Frankendom gap (strings): the client gets name ids from `sendStringToClient`, which the header says makes a new id on each call (`character_encyclopedia.h` 114-115), so the code caches them per character (`character_encyclopedia.cpp` 231-233, 355-357). Frankendom: send text keys and let the client translate.
- Secondary, not written up as a note: the faction game event (`game_event_manager.cpp`, `character_game_event.cpp`). One event runs at a time; its start is the game cycle (cpp 93), and stopping sets the stamp to 0 (95). Online characters reset at start and at stop (129-139). On load, a character is reset only when their stamp is older than the running event (214). After a stop the running stamp is 0, so no stamp is older than it: a character who was offline at the stop keeps their event missions. Two more defects in that file: `CCharacterGameEvent::reset` tests `it->first` in the history loop, where `it` is already at the end of the mission map (`character_game_event.cpp` 96-99), and the clan-2 channel removal checks the faction-1 GM id before removing the faction-2 GM id (`game_event_manager.cpp` 281-282). Its event missions are the last 1024 alias ids (297), a partition by ID range. The event is started by an admin command (`admin.cpp` 7272) and stopped by another (7290); there is no schedule in that path.
- Not found: nameplates and kill cards were not searched. The donor's honorific title is the album's reward brick (`egs_static_encyclo.h` 63), and how it is worn was not read.

Best transferable idea: a codex where each entry is a theme with a rite and up to seven task slots, packed as 2-bit states, revealed by a mission or action, completed by mission success, and rewarded per theme and per album.
Decision (proposed): adapt — keep the album, thema and slot model with hidden, shown and done states, mission-driven updates, rite-gated completion and completion-only rewards, with stable string ids, refused out-of-range slots and errors instead of asserts; reject the position-keyed storage and the unchecked task count.
Acceptance: a server test with one album of two themas, where finishing a thema's rite and tasks makes it done and shows its reward text once, the album shows its reward brick when both themas are done, an eight-task sheet fails to load, and renumbering a thema leaves progress on the same legend.

Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
Brief rule served: 20 (catalogue as runtime source); one ledger; legends-rule (myth, not scripture; text not reproduced).
