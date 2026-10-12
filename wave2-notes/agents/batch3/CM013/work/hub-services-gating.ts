// Licence: GPL-3.0 (donor, endless-sky LICENSE). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const SERVICE = {
  Trading: 1 << 0,
  JobBoard: 1 << 1,
  Bank: 1 << 2,
  HireCrew: 1 << 3,
  Missions: 1 << 4,
} as const;
type Service = keyof typeof SERVICE;

// A player condition: true when the player's flags satisfy it.
type Cond = (player: { has: (flag: string) => boolean }) => boolean;

interface Hub {
  // Bit mask loaded from data; each data load ORs bits in (donor: services |= ...).
  services: number;
  // Whole-hub access; when false, no service is usable for this player.
  access?: Cond;
  // Per-service condition; a service with no entry is open to anyone who can access the hub.
  perService: Partial<Record<Service, Cond>>;
}

// One check for "can this player use this service here".
// Order: the service must be offered (bit), then the hub must be accessible, then the service's own condition.
// player === null is the view for other players and maps: it reports the flag only.
function hasService(hub: Hub, s: Service, player: { has: (flag: string) => boolean } | null): boolean {
  if (!(hub.services & SERVICE[s])) return false;
  if (player === null) return true;
  if (hub.access && !hub.access(player)) return false;
  const cond = hub.perService[s];
  return cond === undefined || cond(player);
}

// The menu the hub panel shows: only services that pass the same check, so a locked service is absent, not greyed.
function serviceMenu(hub: Hub, player: { has: (flag: string) => boolean }): Service[] {
  const all: Service[] = ["Trading", "JobBoard", "Bank", "HireCrew", "Missions"];
  return all.filter((s) => hasService(hub, s, player));
}

// A data event adds facilities one at a time (donor: "add port", then "add shipyard", "add outfitter").
function addServices(hub: Hub, bits: number): void {
  hub.services |= bits;
}

export {};
