// Parked script loader: the mission id picks a script; no script means no-op, not an error.
interface MissionScript { onFrame(frame: number): void; onEntityDead(entityId: number): void; }
type ScriptFactory = () => MissionScript;

function loadMissionScript(missionId: string | undefined, registry: Map<string, ScriptFactory>): MissionScript | null {
  if (missionId === undefined) return null;
  const make = registry.get(missionId);
  return make ? make() : null;
}

// Defend objective: each tracked entity carries its role; only a must-survive death fails the mission.
type Role = "must-survive";
interface Wave {
  atFrame: number;           // one-shot frame (fired once, >= so a skipped frame still fires)
  every: number | null;      // repeat period in frames, or null for one-shot
  maxFires: number;          // cap on total fires; donor has no cap (added here)
  units: string[];
}
interface MissionState {
  frame: number;
  roles: Map<number, Role>;  // keyed map from entity id to role (donor mixes these into the group list)
  fired: Map<number, number>; // wave index -> times fired
  failed: boolean;
}

function onEntityDead(m: MissionState, entityId: number): void {
  if (m.roles.get(entityId) === "must-survive") {
    m.roles.delete(entityId);
    m.failed = true;
  }
}

function tickWaves(m: MissionState, waves: Wave[], spawn: (units: string[]) => void): void {
  waves.forEach((w, idx) => {
    const count = m.fired.get(idx) ?? 0;
    if (w.every === null) {
      if (count === 0 && m.frame >= w.atFrame) {
        m.fired.set(idx, 1);
        spawn(w.units);
      }
      return;
    }
    if (m.frame > 0 && m.frame % w.every === 0 && count < w.maxFires) {
      m.fired.set(idx, count + 1);
      spawn(w.units);
    }
  });
  m.frame += 1;
}
export {};
