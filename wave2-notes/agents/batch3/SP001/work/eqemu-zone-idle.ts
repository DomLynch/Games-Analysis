// Licence: GPL-3.0 (donor LICENSE). clean-room: written from the described rule, not a translation of the donor lines.
// clean-room
export interface ZoneIdleRule {
  idleWhenEmpty: boolean;  // zone data, donor default true
  graceSeconds: number;    // zone data, donor default 60; 0 = zone goes idle at once
  questOverride: boolean;  // zone-wide exception: keep everything running
}

export interface MobRecord {
  kind: "npc" | "client";
  pathWhileIdle: boolean;  // per spawn point exception (NPCs only)
}

export class ZonePresence {
  private prevClients = 0;
  private graceEndsAt: number | null = null;

  constructor(private readonly rule: ZoneIdleRule) {}

  // Call once per zone tick, before the mob pass. Returns true when the zone runs this tick.
  update(clients: number, nowMs: number): boolean {
    if (!this.rule.idleWhenEmpty) return true;
    if (clients > 0) {
      this.graceEndsAt = null;                                     // someone is here: cancel grace
    } else {
      if (this.prevClients > 0 && this.rule.graceSeconds > 0) {
        this.graceEndsAt = nowMs + this.rule.graceSeconds * 1000;  // last player just left: start grace
      }
      if (this.graceEndsAt !== null && nowMs >= this.graceEndsAt) {
        this.graceEndsAt = null;                                   // grace over: zone goes idle
      }
    }
    this.prevClients = clients;
    return clients > 0 || this.rule.questOverride || this.graceEndsAt !== null;
  }
}

// Per mob: NPCs run only while the zone runs or when they are marked path-while-idle.
export function mobProcesses(zoneRunning: boolean, m: MobRecord): boolean {
  return m.kind === "client" || zoneRunning || m.pathWhileIdle;
}
