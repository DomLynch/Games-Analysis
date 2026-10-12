// clean-room sketch from the described mechanism (donor licence: restricted; shape only, no lines copied).
export {};

type Gate = -1 | 0 | 1 | 2; // -1 and 0 open; 1 closed; 2 needs a party member at the skill threshold

interface ZoneRow {
  id: number;
  name: string;
  exits: string;   // "trigger:zoneId,trigger:zoneId"
  enterGate: Gate; // table default for a new save
  isWorld: boolean;
}

interface SaveState {
  gateOverride: Map<number, Gate>; // per-save unlock; falls back to the table default
  flags: Record<string, number>;   // story and debug flags, default 0
}

interface Party {
  qinggong: number[];
}

const SKILL_THRESHOLD = 75; // donor literal; a data field in this sketch

class ZoneGraph {
  private readonly byId = new Map<number, ZoneRow>();
  private readonly exitsOf = new Map<number, Map<string, number>>();

  constructor(rows: ZoneRow[]) {
    // Exit lookup is built once at load. Each item is split on its first colon, so a trigger name only matches a whole item.
    for (const r of rows) {
      this.byId.set(r.id, r);
      const exits = new Map<string, number>();
      for (const item of r.exits.split(",")) {
        const colon = item.indexOf(":");
        if (colon <= 0) continue;
        const dest = Number(item.slice(colon + 1));
        if (Number.isInteger(dest)) exits.set(item.slice(0, colon), dest);
      }
      this.exitsOf.set(r.id, exits);
    }
  }

  // Trigger name to destination zone id, or null. The caller must check for null before using it.
  destination(fromId: number, trigger: string): number | null {
    return this.exitsOf.get(fromId)?.get(trigger) ?? null;
  }

  canEnter(zoneId: number, save: SaveState, party: Party): boolean {
    const zone = this.byId.get(zoneId);
    if (!zone) return false; // fail closed for an unknown zone
    if (zone.isWorld) return true;
    const gate = save.gateOverride.get(zoneId) ?? zone.enterGate;
    if (gate === -1 || gate === 0) return true;
    if (gate === 2) return party.qinggong.some((q) => q >= SKILL_THRESHOLD);
    return false;
  }

  // Signage: a label shows unless the name is banned, or the global ban is on and the name is not explicitly shown.
  labelVisible(zoneId: number, save: SaveState, banAllNames: boolean): boolean {
    const zone = this.byId.get(zoneId);
    if (!zone) return false;
    if (banAllNames && (save.flags[`ShowLocationName.${zone.name}`] ?? 0) === 0) return false;
    if ((save.flags[`BanLocationName.${zone.name}`] ?? 0) === 1) return false;
    return true;
  }
}
