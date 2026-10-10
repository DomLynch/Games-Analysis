// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface ZoneCfg {
  createGraceS: number;   // empty-from-creation grace before the instance may close (zone data)
  emptyGraceS: number;    // grace after the last player leaves while enemies are still alive (zone data)
}

interface Instance {
  id: number;                    // server-unique instance id (the donor's region id)
  skinId: number;                // the look clients request, shared with the open world
  ownerKey: string | null;       // group leader or solo player who owns it
  players: Set<string>;          // ledger of player ids inside (a Set, not a bare counter)
  aliveEnemies: number;          // maintained by the caller each tick
  destroyWhenEmpty: boolean;
  closeDueAt: number | null;     // ms timestamp of the armed grace timer, or null
  zoneMap: Map<number, number>;  // skin zone id -> this instance's own zone id
}

export class InstanceRegistry {
  private nextId = 1000;        // donor starts the instance id search at 1000
  private nextZone = 0;         // donor scans for a free zone id; this sketch just counts up
  private byId = new Map<number, Instance>();

  create(skinId: number, ownerKey: string, skinZoneIds: number[], cfg: ZoneCfg, now: number): Instance {
    let id = this.nextId;
    while (this.byId.has(id)) id++;
    this.nextId = id + 1;
    const zoneMap = new Map<number, number>();
    for (const skinZone of skinZoneIds) zoneMap.set(skinZone, this.nextZone++);
    const inst: Instance = {
      id, skinId, ownerKey, players: new Set<string>(), aliveEnemies: 0,
      destroyWhenEmpty: true, closeDueAt: now + cfg.createGraceS * 1000, zoneMap,
    };
    this.byId.set(id, inst);
    return inst;
  }

  // Party entry: rejoin the owner's instance if it is the same skin; refuse if the owner's other instance is occupied; else replace the empty one.
  enterParty(skinId: number, leaderKey: string, skinZoneIds: number[], cfg: ZoneCfg, now: number): Instance | "busy" {
    const mine = [...this.byId.values()].find(i => i.ownerKey === leaderKey);
    if (mine && mine.skinId === skinId) return mine;
    if (mine) {
      if (mine.players.size > 0) return "busy";
      this.remove(mine);
    }
    return this.create(skinId, leaderKey, skinZoneIds, cfg, now);
  }

  enter(inst: Instance, playerId: string): void {
    inst.players.add(playerId);
    inst.closeDueAt = null;                       // a player inside cancels the grace timer
  }

  leave(inst: Instance, playerId: string, now: number, cfg: ZoneCfg): void {
    if (!inst.players.delete(playerId)) return;   // leave for a player who never entered is ignored
    if (inst.players.size > 0 || !inst.destroyWhenEmpty) return;
    if (inst.aliveEnemies === 0) { this.remove(inst); return; }
    inst.closeDueAt = now + cfg.emptyGraceS * 1000; // enemies still alive: re-arm the grace timer
  }

  // Call once per fixed server tick.
  tick(now: number): void {
    for (const inst of [...this.byId.values()]) {
      if (inst.closeDueAt !== null && now >= inst.closeDueAt && inst.players.size === 0) this.remove(inst);
    }
  }

  // Clients always ask for the skin zone; the server maps it to the instance's zone.
  resolveZone(inst: Instance, skinZoneId: number): number | undefined {
    return inst.zoneMap.get(skinZoneId);
  }

  private remove(inst: Instance): void {
    this.byId.delete(inst.id);
    inst.zoneMap.clear();
    inst.players.clear();
    inst.closeDueAt = null;
  }
}

export {};
