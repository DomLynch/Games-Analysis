// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type Status =
  | 'already_built'
  | 'disabled'
  | 'not_today'
  | 'needs_hub'
  | 'requires'
  | 'lack_resources'
  | 'allow'
  | 'unknown';

export interface Hub {
  built: Set<string>;            // constructed service ids (donor: _constructedBuildings bitmask)
  disabled: Set<string>;         // scenario-disabled ids (donor: _disabledBuildings)
  isHub: boolean;                // donor isCastle(): other towns may only build the core first
  buildAllowedToday: boolean;    // donor ALLOW_TO_BUILD_TODAY flag, one build per period
}

export interface ServiceDef {
  id: string;
  requires: string[];            // all must be built (donor getBuildingRequirement bits, AND-ed)
  cost: number;
}

export const CORE_ID = 'core';   // donor BUILD_CASTLE

// Donor order: built, disabled, once-per-period, core-first, prerequisites, payment, allow.
export function checkBuild(hub: Hub, def: ServiceDef, canPay: (cost: number) => boolean): Status {
  if (hub.built.has(def.id)) return 'already_built';
  if (hub.disabled.has(def.id)) return 'disabled';
  if (!hub.buildAllowedToday) return 'not_today';
  if (!hub.isHub && def.id !== CORE_ID) return 'needs_hub';
  for (const r of def.requires) {
    if (!hub.built.has(r)) return 'requires';
  }
  if (!canPay(def.cost)) return 'lack_resources';
  return 'allow';
}

// Buy: re-check first, pay, record, then close the period for this hub.
export function buyService(
  hub: Hub,
  def: ServiceDef,
  canPay: (cost: number) => boolean,
  pay: (cost: number) => void,
): boolean {
  if (checkBuild(hub, def, canPay) !== 'allow') return false;
  pay(def.cost);
  hub.built.add(def.id);
  hub.buildAllowedToday = false;
  return true;
}

// New period: every hub may build once again.
export function newPeriod(hubs: Hub[]): void {
  for (const h of hubs) h.buildAllowedToday = true;
}

// One line for the UI: the best status across unbuilt services, by priority allow, then lack, then requires.
export function summary(hub: Hub, defs: ServiceDef[], canPay: (cost: number) => boolean): Status {
  if (!hub.buildAllowedToday) return 'not_today';
  if (!hub.isHub) return 'needs_hub';
  const rest = defs.filter(d => !hub.built.has(d.id));
  for (const want of ['allow', 'lack_resources', 'requires'] as const) {
    if (rest.some(d => checkBuild(hub, d, canPay) === want)) return want;
  }
  return 'unknown';
}
