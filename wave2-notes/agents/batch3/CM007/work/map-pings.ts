// Clean-room sketch of the map-ping rules in TurningWheel-Barony (BSD 2-Clause), written from the
// described behaviour. Tick-based: 50 ticks per second, as in the donor. No donor code is copied.

const TPS = 50;
const DEFAULT_LIFE = Math.trunc(2.5 * TPS); // 125 ticks
const DEATH_LIFE = Math.trunc(9.5 * TPS); // 475 ticks
const FADE_TICKS = Math.trunc(0.5 * TPS); // 25 ticks, fade over the last half second
const BLINK_TICKS = TPS; // first second: hidden on 5 of every 10 ticks
const MAX_OLDER_KEPT = 3; // keep 3 older default pings; the new one makes 4 live
const LOCKOUT = 2 * TPS; // 100 ticks
const EXPIRY_CAP = Math.trunc(TPS / 4); // 12 ticks (donor integer division)

type PingKind = 'default' | 'death';

interface Ping {
  id: number;
  owner: number;
  x: number;
  y: number;
  start: number;
  kind: PingKind;
}

class PingBoard {
  private pings: Ping[] = []; // newest first
  private readonly lockout: number[];
  private nextId = 1;

  constructor(playerCount: number) {
    this.lockout = new Array<number>(playerCount).fill(0);
  }

  // Mirrors minimapPingAdd: the fifth default ping from one owner prunes the oldest and starts a lockout.
  add(now: number, owner: number, x: number, y: number): Ping {
    let seen = 0;
    this.pings = this.pings.filter((p) => {
      if (p.owner !== owner || p.kind !== 'default') return true;
      seen++;
      if (seen > MAX_OLDER_KEPT) {
        this.lockout[owner] = LOCKOUT;
        return false;
      }
      return true;
    });
    const p: Ping = { id: this.nextId++, owner, x, y, start: now, kind: 'default' };
    this.pings.unshift(p);
    return p;
  }

  // Client gate: the ping key is ignored while locked out.
  canPing(owner: number): boolean {
    return this.lockout[owner] <= 0;
  }

  // Count the lockout down by one per call (the donor's call rate was not read).
  tick(): void {
    for (let i = 0; i < this.lockout.length; i++) {
      if (this.lockout[i] > 0) this.lockout[i]--;
    }
  }

  // Expire by lifetime; an expiring default ping caps its owner's lockout at EXPIRY_CAP.
  expire(now: number): void {
    this.pings = this.pings.filter((p) => {
      const life = p.kind === 'default' ? DEFAULT_LIFE : DEATH_LIFE;
      if (now - p.start <= life) return true;
      if (p.kind === 'default' && this.lockout[p.owner] > EXPIRY_CAP) {
        this.lockout[p.owner] = EXPIRY_CAP;
      }
      return false;
    });
  }

  list(): readonly Ping[] {
    return this.pings;
  }
}

// Blink: a default ping in its first second is hidden on ticks where age % 10 >= 5.
function visible(now: number, p: Ping): boolean {
  const age = now - p.start;
  return !(age < BLINK_TICKS && age % 10 >= 5);
}

// Alpha: 1 until 2.0 s of age, then linear to 0 at 2.5 s.
function alpha(now: number, p: Ping): number {
  const age = now - p.start;
  const fadeStart = DEFAULT_LIFE - FADE_TICKS;
  if (age <= fadeStart) return 1;
  return Math.max(0, 1 - (age - fadeStart) / FADE_TICKS);
}

// Map tile to minimap pixel: the longer side fills the rect, the shorter side is centred.
function mapToRect(
  mx: number,
  my: number,
  mapW: number,
  mapH: number,
  rw: number,
  rh: number,
): [number, number] {
  const side = Math.max(mapW, mapH);
  const xmin = Math.trunc((mapW - side) / 2);
  const ymin = Math.trunc((mapH - side) / 2);
  return [(mx - xmin) * (rw / side), (my - ymin) * (rh / side)];
}

export { PingBoard, visible, alpha, mapToRect };
