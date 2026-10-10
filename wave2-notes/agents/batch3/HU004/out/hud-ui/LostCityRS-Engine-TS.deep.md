# LostCityRS-Engine-TS (hud-ui, cell 2)

Donor: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/Player.ts` | Licence: MIT License, Copyright (c) 2023-2026 Lost City (read from LICENSE; MIT, code may be adapted) | TypeScript | symbol `openMainModal`

Checked: Read in full: `openMainModal` (1995-2019), `openChatModal` (2033-2055), `openSideModal` (2057-2079), `openMainSideModal` (2087-2105), `setTab` (2119-2122), `isComponentVisible` (2124-2126), the hint functions (2247-2266), and `closeModal` from line 772 to 814 (the head, 760-771, not read). `NetworkPlayer.ts` `encodeOut` (155-189) read; `decodeIn` lines 55-119 not read. `World.ts` 606-626 and 1112-1126 read. Callers of `isComponentVisible`: two read (`InvButtonHandler.ts` 23-26, `OpPlayerTHandler.ts` 27-30), eight more only grepped. `IfOpenMain.ts` is a 9-line message class with no logic. The IF_CLOSE trigger scripts live in the Content repo, which is not in this donor (not read). Confidence high on the open, close and sync logic; medium on the impact of the stale-field defect in section 1, because the other gates in the op handlers were not read.

Best transferable idea: keep one exclusive panel slot per kind, send only the slots that changed once per tick, and refuse any click on a panel that the engine does not record as open.
Decision (proposed): adapt — Frankendom's HUD is client-only, so rendering stays in the client; only the open-panel record and the click gate move into the engine, keyed per slot so the donor's stale-field defect cannot happen.
Acceptance: A server test opens main panel X, then side panel Y; a click on a component of X is rejected (`isVisible(X)` false), and the flush in that tick sends `close main` and `open side`, so the client shows only Y.

## 1. Mechanism

- The player has three exclusive panel slots: main (centre), chat, and side (sidebar). A bit set (`modalState`) and an id per slot (`modalMain`, `modalChat`, `modalSide`) record them. Tutorial and overlay are separate fields (`modalTutorial`, `overlay`).
- Opening a panel evicts the conflicting slots first. `openMainModal` (1995) closes chat and side; `openChatModal` (2033) closes main and side; `openSideModal` (2057) closes main and chat; `openMainSideModal` (2087) closes chat only, so main and side can be open together. Each eviction writes `IfClose` and clears a bit. None of these four paths runs the IF_CLOSE script trigger (contrast `closeModal`, 781-800).
- Defect (as read): each eviction clears the wrong field of the evicted slot, and that field keeps its old id. The lines are `openChatModal` 2037 and 2043, `openSideModal` 2061 and 2067. Lines 2047 (`modalChat = com`) and 2071 (`modalSide = com`) overwrite the wrong resets, but nothing clears the evicted slot's own id. So after a main panel is replaced by a side panel, `modalMain` still holds the old id, and `isComponentVisible` still returns true for it (2125).
- Sync, once per tick: `World` calls `encodeOut` (1123) after the updates. `encodeOut` (155-189) compares `modalMain`, `modalChat` and `modalSide` with copies of the last values sent (160-169). It writes `IfClose` when the close flag is set, then one open message chosen from the bits: `IfOpenMainSide` when main and side are both set (172-173), otherwise `IfOpenMain`, `IfOpenChat` or `IfOpenSide` (174-179). The overlay is sent separately when it changes (185-188). The client therefore receives changes only.
- Input gate: a client click names a component. The handler calls `player.isComponentVisible(com)`. It returns true when the component's root layer equals `modalMain`, `modalChat`, `modalSide`, one of the sidebar tab ids, or `modalTutorial` (2124-2126). When the check fails, the packet is dropped: `InvButtonHandler` returns false (23-26); `OpPlayerTHandler` writes `UnsetMapFlag` and returns false (27-30).
- Order within a tick, as read: `processInputTracking` (615), then `decodeIn` (617, one client packet per call as read at 125-152), then the handlers, then the updates (1112-1120), then `encodeOut` (1123). A panel opened by a script in this tick reaches the client at the flush at the end of the tick, and becomes clickable when the gate reads it (inference from the call order, not traced in full).
- Sidebar tabs: a fixed array of 14 slots (350). `setTab` (2119-2122) writes one `IfSetTab` for one slot. On reconnect the server calls `closeModal` and then re-sends all 14 slots (562-566).
- Hint arrows: one arrow per player, sent by overwrite. An NPC hint is type 1 (2252-2254), a player hint is type 10 (2260-2262), and `stopHint` sends type -1 (2264-2266). No list is kept.

## 2. Key functions

- `openMainModal`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/Player.ts` 1995-2019. Evicts chat and side, sets the main bit and `modalMain`, sets `refreshModal`, drops suspended dialog scripts.
- `openChatModal`: same file, 2033-2055. Evicts main and side (defect as above at 2037, 2043).
- `openSideModal`: same file, 2057-2079. Evicts main and chat (defect at 2061, 2067).
- `openMainSideModal`: same file, 2087-2105. Evicts chat only.
- `encodeOut`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/NetworkPlayer.ts` 155-189. Change check at 160; message choice at 171-183; overlay at 185-188.
- `isComponentVisible`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/Player.ts` 2124-2126. Reads the stale ids directly, so the defect reaches the gate.
- Click gate, one caller: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/network/game/client/handler/InvButtonHandler.ts` 23-26.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Exclusive slots: opening one kind evicts conflicting kinds | Eviction table in the open functions (main: chat+side; chat: main+side; side: main+chat; main+side may co-open). Engine rule, not data. |
| Send only changed slots, once per tick | Flush point: after the updates (World 1123). Count of compares: 3 slots plus the close flag. |
| Server click gate against the open-state record | Rejection path differs per handler (silent return vs `UnsetMapFlag`). |
| Fixed sidebar tab array, re-sent on reconnect | 14 slots (Player.ts 350). |
| Hint arrow as one overwritten target marker | Hint types: 1 NPC, 10 player, -1 clear (2253, 2261, 2265). |

## 4. TypeScript sketch

simplified: the sketch keeps the exclusion table, the once-per-tick change flush and the click gate, and it fixes the defect by clearing each evicted slot by its own key. It omits the main+side co-open pairing (`openMainSideModal`), the IF_CLOSE trigger and listener clearing, the suspended-script reset, the tutorial and overlay fields, the 14 sidebar tab slots, the reconnect re-sync, the packet encoding, and the per-handler rejection behaviour.

```ts
type Slot = 'main' | 'chat' | 'side';
const SLOTS: Slot[] = ['main', 'chat', 'side'];

// Which slots a new open of `slot` evicts. Donor: main evicts chat and side; chat evicts main and side; side evicts main and chat.
const EVICTS: Record<Slot, Slot[]> = {
  main: ['chat', 'side'],
  chat: ['main', 'side'],
  side: ['main', 'chat'],
};

export type SyncMsg = { kind: 'open'; slot: Slot; panel: number } | { kind: 'close'; slot: Slot };

export class PanelStack {
  private open: Record<Slot, number> = { main: -1, chat: -1, side: -1 };
  private sent: Record<Slot, number> = { main: -1, chat: -1, side: -1 };

  // Opening a panel evicts the conflicting slots. Each cleared slot is cleared by its own key,
  // so the donor's cross-clear of the wrong field cannot happen here.
  openPanel(slot: Slot, panel: number): void {
    for (const other of EVICTS[slot]) {
      this.open[other] = -1;
    }
    this.open[slot] = panel;
  }

  closePanel(slot: Slot): void {
    this.open[slot] = -1;
  }

  // Server-verified input gate: a click on a panel's component is accepted only while that panel is open.
  isVisible(panel: number): boolean {
    return panel !== -1 && SLOTS.some(s => this.open[s] === panel);
  }

  // Once per tick, after game logic. Sends only slots that changed since the last flush.
  flush(): SyncMsg[] {
    const out: SyncMsg[] = [];
    for (const s of SLOTS) {
      if (this.open[s] !== this.sent[s]) {
        out.push(this.open[s] === -1 ? { kind: 'close', slot: s } : { kind: 'open', slot: s, panel: this.open[s] });
        this.sent[s] = this.open[s];
      }
    }
    return out;
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/hu004-lostcity-panel-stack.ts`: passed (no output, exit 0).

## 5. Lands in

- TARGET `src/fight/panels.ts` (new): the engine's record of which panel is open in each slot, the once-per-tick change flush, and `isVisible` for the input gate. Rendering stays in the client (ruling: HUD is client-only). Parity-checklist row 14 (HUD).
- today: (not read in this pass; the Frankendom HUD code was not opened).
- Reuse tag: adapt (MIT: code may be adapted; the sketch is written from the mechanism)
- Brief rule served: 1 (one engine: the panel record and the click gate live in the engine, rendering in the client); server-verified input (ruling). Rules 7-9 n/a.

## 6. Gaps and risks

- Stale-field defect (as read): the evicted slot keeps its id, so `isComponentVisible` still accepts clicks on a closed panel. The sketch avoids it by keying each clear. Test it: open main, open side, click a main component, expect rejection.
- Eviction does not run the IF_CLOSE trigger or clear listeners on the four open paths (2003-2008, 2034-2044, 2058-2068, 2087-2105), while `closeModal` does (781-800). Whether this is intended was not determined. Frankendom must choose: run the close hook on eviction too, or the panel's cleanup is lost.
- The click gate rejects in two ways: a silent return (`InvButtonHandler` 23-26) and `UnsetMapFlag` plus return (`OpPlayerTHandler` 27-30). Frankendom needs one behaviour.
- The rulings make the HUD client-only, so only the open-state record and the gate move into the engine. Row 5 (input intake) covers the gate; it is not a landing row here.
- A fast fight HUD has few panels, so the exclusion table may be too coarse. The donor's main+side co-open pairing is the case the sketch leaves out.
- Panel ids here are integers into the donor's content cache. Frankendom's panel ids should be named catalogue data, not numbers, per the zones-as-data ruling.
- The suspended-dialog reset (2014-2018 and the same block in the other open paths) is script-related and not mapped to any Frankendom system.

- A later `closeModal` runs the IF_CLOSE trigger again for the stale main id (781-789), because `modalMain` was never cleared on the eviction path. This follows from the code as read; the trigger scripts were not read.
Reuse tag: adapt (MIT; sketch written from the mechanism)
Brief rule served: 1 (one engine, client rendering); server-verified input (ruling)
