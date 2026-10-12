# endless-sky-endless-sky (city-map-design, cell 20)

Donor: `/mnt/frankendom-donors/endless-sky-endless-sky/source/Port.cpp` (primary; also Port.h, SpaceportPanel.cpp, Planet.cpp, PlanetPanel.cpp, MiniMap.cpp) and `data/map planets.txt`, `data/wanderer/wanderers start.txt` | Licence: GPL-3.0 (repo `license.txt`: "GNU GENERAL PUBLIC LICENSE / Version 3, 29 June 2007"; source headers say "version 3 of the License, or (at your option) any later version") | C++ with data text | symbol `Port::HasService`

Checked: Candidate files opened (8): source/SpaceportPanel.cpp (read 1-184 in full), source/Port.h (30-115), source/Port.cpp (50-100, 118-210, 248-332), source/Planet.cpp (58-130, 176-186, 370-396), source/PlanetPanel.cpp (208-226, 286-300), source/MiniMap.cpp (43-175), data/map planets.txt (1268-1278, 3303-3310), data/wanderer/wanderers start.txt (468-478). Counts from grep on data/ (not read line by line): 21 `services` lines; 0 `to service` / `to access` lines (the per-service condition is in the code but no shipped data uses it). Confidence: high on the service gate (read end to end, callers grepped); medium on "facilities placed one at a time" as a reading of the event data (the donor has no placement step; services are added by events). NOT read: `ConditionSet` internals, `Port::Load` lines 30-50 and 210-240, `PlayerInfo.cpp` and `MapPanel.cpp` callers beyond the grep line, shop panels (shipyard/outfitter), the news picker in depth. Camera scope: n/a.

Best transferable idea: A hub offers a service only when three checks pass in order (the data bit is set, the player can access the hub, the service's own condition holds), and its menu lists only the services that pass, so a locked service is absent rather than greyed out.
Decision (proposed): adapt - take the bit mask plus per-service condition and access gate for town services (bank, trade, job board, hire crew, missions); the condition reads the one progression ledger on the server and the menu is generated from the same check; drop the donor's client-only view of the flag except for maps.
Acceptance: In a town hub the Bank button and its key are absent until the bank condition holds; a server test asserts a bank action is refused for a player without the condition even when the client sends it; a data event adds a shipyard to the hub and it appears in the menu on the next open.

## 1. Mechanism

- A hub (the donor's "port") is a bit mask of services plus three condition sets. Order of checks for one service, as `Port::HasService` runs them (Port.cpp 314-324):
  (a) The service bit must be set in the hub's mask (316). Not set: the service is not offered here, full stop.
  (b) If the caller is a player (isPlayer true; the default), the hub's access condition must pass (321). Failing access, no service is usable.
  (c) The service's own condition, if one exists for that service, must pass (323-324). A service with no entry is open to anyone who can access the hub.
  (d) If the caller is not a player (isPlayer false), only (a) runs. The planet's auto-attribute step calls it this way (Planet.cpp 378-393) and writes tags such as `service: bank` into the planet's attributes (AUTO_ATTRIBUTES list, 364-376), so mission and location filters can match a service without a player.
- Data loading (Port::Load): `services` tokens OR bits into the mask (82-92). `to service <names>` stores one condition set per named service (150-178). `to access` stores the hub access condition (119). `to bribe` and `to recharge` are parallel gates (not part of this note).
- Facilities are added by events: the donor's wanderer event adds a port with all services, then a shipyard, then an outfitter, to one planet (wanderers start.txt 470-476). Planet::Load gives `add`/`remove` semantics: a first `port` or `spaceport` entry overwrites (Planet.cpp 69, 96), later `add` entries append (74). The event's `add port` reaches Port::Load (177).
- UI: the planet panel sets UI conditions per service (`has bank`, `has job board`, `can hire crew`, `has trade`; PlanetPanel.cpp 216-222), and the keyboard shortcut for each service requires the access check and the service check (`b` for bank, 297). A service that fails is not offered in the panel, rather than shown and refused.
- Missions: the spaceport offers missions only when the service passes (SpaceportPanel.cpp 76). The location filter for mission matching also requires the missions service (LocationFilter.cpp 512, grep only).

## 2. Key functions

- `Port::HasService(int type, bool isPlayer)`: `/mnt/frankendom-donors/endless-sky-endless-sky/source/Port.cpp` 314-325. The whole gate: bit (316), access (321), service condition (323-324).
- `Port::Load` (services and to-service blocks): `/mnt/frankendom-donors/endless-sky-endless-sky/source/Port.cpp` 78-92 (services bits) and 149-178 (to service).
- `Port::CanAccess`: Port.cpp 255-257. `Port::HasServices`: Port.cpp 299-309 (any service passes; used for "is this planet inhabited").
- `Planet::Load`: `/mnt/frankendom-donors/endless-sky-endless-sky/source/Planet.cpp` 58-130 (add/remove and overwrite rule), 176-177 (port hand-off).
- Planet auto-attributes (non-player service flags written as planet tags): Planet.cpp 364-396 (AUTO_ATTRIBUTES list, then `HasService(..., false)` per tag). The step that loads the default spaceport (Planet.cpp 355-360; the condition above line 355 was not read) gives a planet with no port block all services, or missions only when tagged "uninhabited" (Port.cpp 197, 207).
- `PlanetPanel` UI conditions and keys: `/mnt/frankendom-donors/endless-sky-endless-sky/source/PlanetPanel.cpp` 208-226, 286-300.
- `MiniMap::Step` (HUD fold-in, see section 6): `/mnt/frankendom-donors/endless-sky-endless-sky/source/MiniMap.cpp` 55-125 and draw alpha at 161-163.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Offer = bit set, then access, then per-service condition | Service bits 1<<0 Trading, 1<<1 JobBoard, 1<<2 Bank, 1<<3 HireCrew, 1<<4 OffersMissions (theirs: Port.h 52-56; `All` is the OR of the five) |
| Default port carries every service | `services = ServicesType::All;` (theirs: Port.cpp 197) |
| Uninhabited outpost carries one service | `services = ServicesType::OffersMissions;` (theirs: Port.cpp 207) |
| Services are data tokens, OR-accumulated | `services |= ServicesType::All;` (theirs: Port.cpp 82); 21 `services` lines in data/ (grep count, not read) |
| Per-service condition | Keyword `to service` (theirs: Port.cpp 150); 0 uses in data/ (grep count) |
| HUD linger after an event ends | 300 frames (theirs: MiniMap.cpp 77); comment says 5 seconds (76), which assumes 60 frames per second (not checked in code) |
| HUD fade over the last frames | 30 frames (theirs: MiniMap.cpp 108, 110, 163) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's three-step gate in the same order (bit, then access, then the service condition), the non-player view that reports the flag only, the menu that lists only passing services, and the add-only event step. It omits: the `to bribe` and `to recharge` gates, the overwrite-once rule of Port::Load (the first `to service` line clears earlier ones), the `remove` keyword, the shipyard and outfitter lists, the news and mission offer, and the donor's ConditionSet language (the sketch takes a plain function). The donor's mask values are kept as bits.

```ts
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
```

## 5. Lands in

- TARGET `origins/zones/hub-services.ts` (proposed new module, does not exist yet): the one check `hasService` used by the town hub menu and by every server action that spends a hub service (bank, trade, hire, missions). Parity-checklist row 21 (catalogue fields: the service bit and the per-service condition are catalogue fields of the hub entry). Row 20 (catalogue as runtime source) also applies, because the services are read from data at runtime; the one row cited is 21.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: addendum rules 2, 3 and 5; Frankendom ruling "server-verified" (the server runs the check, the client only shows the menu)

## 6. Gaps and risks

- Licence: GPL-3.0. Clean-room only. The sketch is written from the three-step order, not from the donor lines.
- The donor's gate is client-side logic in the same process as the game. Frankendom must run `hasService` on the server for every spend, reading the one ledger. The menu is a view of the same function.
- The per-service condition exists in the code but no shipped data uses it (grep count 0 for `to service`). The donor's own design is therefore unproven in its data; the Frankendom version must have data for it or it is dead code.
- Overwrite rule: the first `to service` line clears earlier conditions (Port.cpp 150-158, the overwrite flag). A later data file that adds one service condition removes the others. Fix: make the overwrite explicit in the data grammar, or use add-only with a named key per service.
- Not a placement system. The donor has no spatial hub, no road or building grammar, no landmark or signage; those parts of the topic are NONE in this donor. The "one at a time" fact is only the event order (add port, then shipyard, then outfitter).
- HUD fold-in (minimap, read 55-125): the minimap is a jump-route map, not a town map. It lingers 300 frames after a jump ends and fades over the last 30 (MiniMap.cpp 77, 107-114). Two defects: (1) it counts frames, so the 5 second comment is only true at 60 fps; fix: count seconds with delta time. (2) When the fade reaches 0 while the linger still runs, the fade-in branch raises it to 1 again (110), so the value flips between 0 and 1 for the rest of the linger (about 1/30 alpha, nearly invisible); fix: clamp the fade at 0 in both branches. Keep the idea (linger after the trigger ends, so a cancelled jump still shows its target): adapt for a Frankendom minimap of a zone's exits.
- Values: the bit values and the default service sets are engine constants; the per-hub service set and per-service conditions are zone data. Shipped data uses only `services` (21 lines) and the wanderer event; the hub numbers for Frankendom must be designed, not copied.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: addendum rules 2, 3 and 5; ruling: server-verified spend (the menu and the server check share one function)
