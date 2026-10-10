// Licence: GPL-3.0 (donor OpenRA). Clean-room sketch of the shape only, written from the described mechanism, not a translation.
export type ObjectiveState = "incomplete" | "completed" | "failed";

export interface Objective {
  id: number;
  required: boolean;
  state: ObjectiveState;
}

export class Objectives {
  private list: Objective[] = [];

  add(required: boolean): number {
    const id = this.list.length;
    this.list.push({ id, required, state: "incomplete" });
    return id;
  }

  // One-way and idempotent: a repeat call from a per-tick poll is a no-op.
  // Returns "won" only when this completion makes every required objective completed.
  complete(id: number): "won" | "none" {
    const o = this.list[id];
    if (o === undefined || o.state !== "incomplete") return "none";
    o.state = "completed";
    const allRequiredDone = this.list.filter(x => x.required).every(x => x.state === "completed");
    return o.required && allRequiredDone ? "won" : "none";
  }

  // A failed required objective loses. The donor also lets a completed objective be marked failed; this sketch does not.
  fail(id: number): "lost" | "none" {
    const o = this.list[id];
    if (o === undefined || o.state !== "incomplete") return "none";
    o.state = "failed";
    return o.required ? "lost" : "none";
  }
}

// A world event that must act once (donor: HouseDamaged latch in soviet01.lua, set after the first hit).
export class Latch {
  private fired = false;

  fire(effect: () => void): boolean {
    if (this.fired) return false;
    this.fired = true;
    effect();
    return true;
  }
}

// Fires once when every watched id has left the world; a watched id that comes back re-arms the watch.
export class GroupWatch {
  private watched: Set<number>;
  private live: Set<number>;

  constructor(ids: number[], private onEmpty: () => void) {
    this.watched = new Set(ids);
    this.live = new Set(ids);
  }

  removed(id: number): void {
    if (!this.live.delete(id)) return;
    if (this.live.size === 0) this.onEmpty();
  }

  readded(id: number): void {
    if (this.watched.has(id)) this.live.add(id);
  }
}

// Poll-style completion: call each tick; the idempotent complete() makes repeats harmless.
export function pollCompletion(obj: Objectives, id: number, enemyRequiredAlive: number[]): "won" | "none" {
  if (enemyRequiredAlive.some(n => n > 0)) return "none";
  return obj.complete(id);
}

export {};
