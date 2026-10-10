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
