// Licence: copyleft (as read: ThreatManager.cpp header GPL v2 "or (at your option) any later version"; repo LICENSE GPL v2). clean-room sketch written from the described mechanism, not a translation of the donor lines.
export type Online = 0 | 1 | 2;   // 0 offline, 1 suppressed, 2 online (donor OnlineState)
export type Taunt = 0 | 1 | 2;    // 0 detaunt, 1 none, 2 taunt (donor TauntState)

export interface Ref {
  id: string;
  base: number;      // accumulated threat from added amounts
  temp: number;      // temporary integer modifier
  online: Online;
  taunt: Taunt;
}

export const threatOf = (r: Ref): number => Math.max(r.base + r.temp, 0);

// True when a ranks below b. Online state first, then taunt, then threat with a's threat weighted by w.
export function ranksBelow(a: Ref, b: Ref, w: number): boolean {
  if (a.online !== b.online) return a.online < b.online;
  if (a.taunt !== b.taunt) return a.taunt < b.taunt;
  return threatOf(a) * w < threatOf(b);
}

// One threat event. mods is the combined spell and school multiplier (the donor applies several).
// state(id) gives the current online state of the attacker as the owner sees it.
export function addThreat(refs: Map<string, Ref>, id: string, amount: number, mods: number, state: (id: string) => Online): void {
  const a = amount * mods;
  let r = refs.get(id);
  if (!r) {
    r = { id, base: 0, temp: 0, online: state(id), taunt: 1 };
    refs.set(id, r);
  } else if (r.online === 1 && state(id) === 2) {
    r.online = 2; // suppression lifted: the donor only goes back online when threat is caused by the attacker
  }
  if (r.online === 2) r.base = Math.max(r.base + a, 0);
}

// Victim choice. A fixated target wins while available. A suppressed or offline old victim is dropped
// for any online highest. Otherwise the old victim keeps the role unless the highest is above 110%,
// and above 130% it wins at any range. Below 130%, a melee-range highest wins, else the first melee
// unit above 110% in sorted order wins.
export function reselectVictim(refs: Ref[], current: Ref | undefined, fixate: Ref | undefined, isMelee: (r: Ref) => boolean): Ref | undefined {
  if (fixate && fixate.online > 0) return fixate;
  const sorted = [...refs].sort((x, y) => (ranksBelow(x, y, 1) ? 1 : ranksBelow(y, x, 1) ? -1 : 0));
  if (sorted.length === 0) return undefined;
  const highest = sorted[0];
  if (highest.online === 0) return undefined;
  const old = current && current.online > 0 ? current : undefined;
  if (!old || highest === old) return highest;
  if (!ranksBelow(old, highest, 1.1)) return old;
  if (ranksBelow(old, highest, 1.3)) return highest;
  if (isMelee(highest)) return highest;
  for (const next of sorted) {
    if (next === old) return next;
    if (!ranksBelow(old, next, 1.1)) return old;
    if (isMelee(next)) return next;
  }
  return undefined; // donor asserts here (manager desync)
}

// Re-selection runs on a 1000 ms timer, starting full (donor THREAT_UPDATE_INTERVAL and _updateTimer).
export class VictimTimer {
  private t = 1000;
  tick(dtMs: number, reselect: () => void): void {
    if (this.t <= dtMs) { reselect(); this.t = 1000; } else this.t -= dtMs;
  }
}

export {};
