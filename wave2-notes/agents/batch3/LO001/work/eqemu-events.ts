// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type EventKind = "hot_zone" | "rule_change" | "broadcast";

interface ScheduledEvent {
  id: number;
  kind: EventKind;
  data: string;
  // Window in whole minutes since the epoch. null = open (no start or no end).
  // Fix for donor defect: no 0-means-now sentinel, so minute 0 is a valid value.
  startMin: number | null;
  endMin: number | null;
}

function inWindow(e: ScheduledEvent, nowMin: number): boolean {
  const started = e.startMin === null || nowMin >= e.startMin;
  const notEnded = e.endMin === null || nowMin < e.endMin;
  return started && notEnded;
}

class EventScheduler {
  private active = new Set<number>();
  private lastMin = -1;

  constructor(
    private events: ScheduledEvent[],
    private onStart: (e: ScheduledEvent) => void,
    private onEnd: (e: ScheduledEvent) => void,
  ) {}

  // Called every loop pass; real work happens once per minute change.
  tick(nowMin: number): void {
    if (nowMin === this.lastMin) return;
    this.lastMin = nowMin;

    // End pass: collect expired ids first, then remove (fix for donor in-loop erase).
    const ended: number[] = [];
    for (const id of this.active) {
      const e = this.events.find((x) => x.id === id);
      if (e && !inWindow(e, nowMin)) {
        ended.push(id);
        this.onEnd(e);
      }
    }
    for (const id of ended) this.active.delete(id);

    // Start pass: a window fires once when it opens (fix for donor per-minute broadcast repeat).
    for (const e of this.events) {
      if (this.active.has(e.id)) continue;
      if (inWindow(e, nowMin)) {
        this.active.add(e.id);
        this.onStart(e);
      }
    }
  }
}

export {};
