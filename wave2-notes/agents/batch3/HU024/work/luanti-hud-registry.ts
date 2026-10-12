// clean-room: written from the described mechanism (show gate, event-routed refresh,
// scaled statbar, linger timer). Donor licence LGPL-2.1-or-later; no line is translated.

interface Player {
  name: string;
  flags: { healthbar: boolean; breathbar: boolean };
  immortal: boolean;
  hp: number;
  hpMax: number;
  breath: number;
  breathMax: number;
}

interface Hud {
  add(player: string, elem: string, number: number): number;
  change(id: number, number: number): void;
  remove(id: number): void;
}

interface Timer { cancel(): void; }
type After = (seconds: number, fn: () => void) => Timer;

interface ElemDef {
  nominal: number;                          // units shown when full (data)
  current(p: Player): number;
  max(p: Player): number;
  show(p: Player, present: boolean): boolean; // show gate, runs before any add or change
  idle?(p: Player): boolean;                // true when the element is no longer needed
  lingerS?: number;                         // seconds an idle element stays before removal
}

const HP_MAX_DEFAULT = 20;                  // engine constant (donor: PLAYER_MAX_HP_DEFAULT)
const BREATH_MAX_DEFAULT = 10;              // engine constant (donor: PLAYER_MAX_BREATH_DEFAULT)
const BREATH_LINGER_S = 1;                  // data field (donor: core.after(1, ...))

// Scale to the HUD: never above nominal, never divides by zero.
function scaled(def: ElemDef, p: Player): number {
  const cur = def.current(p);
  const maxDisplay = Math.max(def.max(p), cur);
  if (maxDisplay <= 0) return 0;            // fix: donor computes 0 / 0 when max and current are both 0
  return Math.ceil((cur / maxDisplay) * def.nominal);
}

class HudRegistry {
  private defs = new Map<string, ElemDef>();
  private routes = new Map<string, string[]>();
  private ids = new Map<string, Map<string, number>>();
  private linger = new Map<string, Timer>();

  constructor(private hud: Hud, private after: After) {}

  register(name: string, events: string[], def: ElemDef): void {
    this.defs.set(name, def);
    for (const e of events) {
      this.routes.set(e, [...(this.routes.get(e) ?? []), name]);
    }
  }

  // "hud_changed" refreshes everything; any other event refreshes only its routed elements.
  onEvent(p: Player, event: string): void {
    const names = event === "hud_changed" ? [...this.defs.keys()] : (this.routes.get(event) ?? []);
    for (const n of names) this.update(p, n);
  }

  // fix: donor leaves a pending linger job running after leave; cancel it here.
  onLeave(name: string): void {
    this.ids.delete(name);
    this.cancelRemoval(name);
  }

  private playerIds(name: string): Map<string, number> {
    let m = this.ids.get(name);
    if (!m) { m = new Map(); this.ids.set(name, m); }
    return m;
  }

  private update(p: Player, name: string): void {
    const def = this.defs.get(name);
    if (!def) return;
    const ids = this.playerIds(p.name);
    const id = ids.get(name);

    if (!def.show(p, id !== undefined)) {   // 1. show gate first
      if (id !== undefined) { this.hud.remove(id); ids.delete(name); }
      return;
    }
    if (id === undefined) {                 // 2. first sighting: add and stop
      ids.set(name, this.hud.add(p.name, name, scaled(def, p)));
      return;
    }
    this.hud.change(id, scaled(def, p));    // 3. existing element: change, then linger logic
    if (def.idle && def.lingerS !== undefined) {
      if (def.idle(p)) this.scheduleRemoval(p.name, name, def.lingerS);
      else this.cancelRemoval(p.name);
    }
  }

  private scheduleRemoval(player: string, name: string, seconds: number): void {
    if (this.linger.has(player)) return;    // one pending job per player
    this.linger.set(player, this.after(seconds, () => {
      this.linger.delete(player);
      const ids = this.ids.get(player);
      const id = ids?.get(name);
      if (ids && id !== undefined) { this.hud.remove(id); ids.delete(name); }
    }));
  }

  private cancelRemoval(player: string): void {
    const job = this.linger.get(player);
    if (job) { job.cancel(); this.linger.delete(player); }
  }
}

const health: ElemDef = {
  nominal: HP_MAX_DEFAULT,
  current: (p) => p.hp,
  max: (p) => p.hpMax,
  show: (p) => p.flags.healthbar && !p.immortal,
};

const breath: ElemDef = {
  nominal: BREATH_MAX_DEFAULT * 2,          // half-bubble units, as in the donor
  current: (p) => p.breath,
  max: (p) => p.breathMax,
  show: (p, present) => {
    const flagged = p.flags.breathbar && !p.immortal;
    if (present) return flagged;            // an existing bar is not removed early
    return flagged && p.breath < p.breathMax; // do not add a full bar
  },
  idle: (p) => p.breath >= p.breathMax,
  lingerS: BREATH_LINGER_S,
};

export { HudRegistry, health, breath };
export {};
