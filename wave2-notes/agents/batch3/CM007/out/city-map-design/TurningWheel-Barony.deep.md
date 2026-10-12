# TurningWheel-Barony (city-map-design, cell 3)

Donor: `/mnt/frankendom-donors/TurningWheel-Barony/src/interface/drawminimap.cpp` (with `src/ui/GameUI.cpp`, `src/interface/interface.hpp`, `src/input.cpp`) | Licence: BSD 2-Clause (`LICENSE.txt` line 3: "licensed under the BSD 2-Clause License", Copyright (c) 2013-2020 Turning Wheel LLC) | C++ | symbol `minimapPingAdd`

Checked: Read: `drawminimap.cpp` 1-100 (globals, zoom), 140-160 (points of interest), 893-905 and 954-1000 (ping lifetime and prune; the draw loop body 906-953 was seen only in grep output), 1000-1075 (callout queue and fade), 1070-1106 (marker transform), 1286-1340 (`minimapPingAdd`, spam prune, lockout). `GameUI.cpp` 13600-13612 and 13650-13700 (the ping key gate and countdown). `interface.hpp` 1564-1600 (`MinimapPing`). `input.cpp` line 5 (`TICKS_PER_SECOND` 50). `LICENSE.txt` head. Not read: the body of drawMinimap between 100 and 140 and 160 and 400, the icon drawing (grep only: 431-483, 504-568), `sendMinimapPing` (not located), the send path in `net.cpp` 1476 and 6157 (grep only), how often the GameUI handler runs (per frame or per tick), and where callouts are created (`interface.cpp` 29579, grep only). Callers of `minimapPingAdd`: `net.cpp` 1476 and 6157, `monster_sentrybot.cpp` 1210 (grep). I read only the network path's grep line, not its body. Confidence: high on ping lifetime, blink, fade, and the spam prune and lockout (read end to end). Medium on whether the server enforces the lockout (it is not checked in `minimapPingAdd`, but the send path was not read). Camera: not applicable.

Best transferable idea: A player's map pings are capped at four live (the fifth prunes the oldest and starts a 2-second lockout), and the lockout is shortened to a quarter second when one of the player's own pings expires.
Decision (proposed): adapt - take the cap, the lockout and the shorter-lockout-on-expiry rule, but move the check to the server so it is server-verified, and state the lockout in ticks.
Acceptance: The fifth ping on the minimap removes the oldest of the player's pings, and a lockout bar shows for 2 seconds; while locked, a server test rejects a new ping from that player and returns the remaining ticks; when one of the player's own pings expires, the lockout drops to at most 250 ms.

## 1. Mechanism

- Pings are stored per local player as a vector of `MinimapPing` (drawminimap.cpp 36). A ping has `tickStart`, `player`, `x`, `y`, a `radiusPing` flag and a `pingType` of default or death marker (interface.hpp 1564-1578). `x` and `y` are `Uint8`.
- Receive path, `minimapPingAdd(srcPlayer, destPlayer, newPing)` (1286): it returns early for an out-of-range player index or for a destination that is not a local player. Then it walks the destination's existing pings from the front (newest, since new pings are inserted at the front, line 1336). For each default ping by the same sender, it counts (1309). The fourth one counted (count > 3, line 1311) is erased. If that erased ping belongs to the sender, the sender's lockout is set to `TICKS_PER_SECOND * 2` = 100 ticks (1316). Radius pings and death markers are not counted. The new ping is inserted at the front (1336). Result: with the fifth ping, four default pings stay alive (the three newest older ones plus the new one).
- Lifetime and draw (`drawMinimap`, ping block 893-968): a default ping lives `TICKS_PER_SECOND * 2.5` = 125 ticks (897); a death marker lives 9.5 s = 475 ticks (898). A ping is pruned when its age is greater than its lifetime (954-968). In the first second of age (50 ticks) it is drawn only when `age % 10 < 5` (907), so it blinks on and off. It fades from full alpha at age 2.0 s to zero at 2.5 s (comment at 922; the alpha formula, `1 - (age - (125 - 25)) / 25`, is on lines 923-924, which were only seen in grep output).
- Lockout relief: when a default ping of the viewing player is pruned by lifetime, the lockout is capped at `TICKS_PER_SECOND / 4` (962-964). Integer division makes this 12 ticks (0.24 s).
- Client gate (`GameUI.cpp` 13658-13694): the ping key is read only when `minimapPingGimpTimer[player] <= 0` (or the `minimap_gimp_enabled` setting is off). Otherwise the handler decrements the timer by one each call (13694). The handler's call rate was not read, so the lockout is counted in handler calls, not verified as ticks.
- Callouts (1000-1064): every callout from `CalloutMenu[i].callouts` goes into a `std::priority_queue` ordered by `creationTick` (1004, 1006). The queue pops newest first, so newest is drawn first and older callouts are drawn over it. A callout's alpha is 255 until `lifePercent` reaches 0.8 (1059), then falls linearly to zero at 1.0. A self callout divides `ticks` by `TICKS_PER_SECOND * 4 / 5` = 40 instead of its lifetime (1056), so its alpha reaches zero at `ticks` = 40 (whether `ticks` counts up or down was not read). A callout on a player (entity uid matches a player) draws no circle; it sets that player's `blinkPlayers` flag, which blinks the marker during the first half second (1038-1043). The consumer of `blinkPlayers` was not read.
- Minimap layout (1071-1076): `mapGCD = max(width, height)`; `xmin = (width - mapGCD) / 2`; each tile maps to `(x - xmin) * rect.w / mapGCD`. The larger side fills the square minimap and the shorter side is centred. Markers scale by `getMinimapZoom() / 100` (96: object zoom plus 50 percent).
- Points of interest (143-160): entities flagged as sprites with a zero show-on-map duration are skipped; the rest are kept when their sprite is 161, a sprite from 254 to 257, or the portal behaviour (154). The ids are hard-coded.

## 2. Key functions

- `minimapPingAdd`: `/mnt/frankendom-donors/TurningWheel-Barony/src/interface/drawminimap.cpp` 1286-1336. Cap four live, lockout 100 ticks on prune, insert newest first.
- Ping draw and prune: same file 893-968. Lifetime 125 and 475 ticks, blink, fade, lockout relief.
- Ping key gate: `/mnt/frankendom-donors/TurningWheel-Barony/src/ui/GameUI.cpp` 13658-13694. Ignored while locked out; countdown otherwise.
- `MinimapPing`: `/mnt/frankendom-donors/TurningWheel-Barony/src/interface/interface.hpp` 1564-1578. Fields and the `Uint8` coordinates.
- Callout queue: `/mnt/frankendom-donors/TurningWheel-Barony/src/interface/drawminimap.cpp` 1000-1064.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants (50 ticks per second) |
|---|---|
| Live cap per sender: keep the newest 3 older, the new one makes 4 | `numPlayerPings > 3` (1311); 4 live |
| Spam lockout on prune | 100 ticks = 2 s (1316) |
| Default ping lifetime | 125 ticks = 2.5 s (897) |
| Death marker lifetime | 475 ticks = 9.5 s (898) |
| Blink in the first second | 50 ticks; hidden when `age % 10 >= 5` (907) |
| Fade window | 2.0 s to 2.5 s (922) |
| Lockout cap on expiry | `TICKS_PER_SECOND / 4` = 12 ticks, 0.24 s (962-964) |
| Callout fade start | 0.8 of life (1059); self callout life 0.8 s (1056) |
| Callout blink window | 0.5 s (1038) |
| Minimap zoom | object zoom + 50 percent (96) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: add prunes the older pings of the same owner and starts the lockout, then inserts the new ping; expiry caps the lockout. It changes three things. (1) The lockout is applied to the owner on the server, not only to the viewing player's local timer. (2) The lockout is counted in ticks per call of `tick()`, so the call rate must be the server tick. (3) The expiry cap is kept at 12 ticks, the donor's integer value, with the note that it is 0.24 s. It omits radius pings (always visible in the donor), death-marker fade, the sound, the callout queue, the minimap transform's draw calls and the POI scan.

```ts
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
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/cm007-tsc/map-pings.ts, exported names added) exited 0.

## 5. Lands in

- TARGET `origins/server/map-pings.ts` (new): the server-side ping store, the four-live cap, the 2-second lockout and the expiry cap, enforced where a ping is accepted. The minimap draw (blink, fade, marker) is client HUD in the same lane as the minimap.
- Parity-checklist row 14 (HUD: minimap and its pings). The hint row 23 (zone population) does not fit a ping, so row 23 is not used here.
- Reuse tag: adapt-idea (BSD 2-Clause: code may be adapted; this sketch is clean-room).
- Brief rule served: server-verified (the cap and lockout are checked on the server, not only in the local key gate); one ledger (one ping store for all clients, not per-client state).

## 6. Gaps and risks

- The lockout is a local UI gate only. The key handler checks it (`GameUI.cpp` 13658), and `minimapPingAdd` (1286) does not. The send path (`net.cpp` 1476, 6157) was not read, so a modified client can send more pings. Frankendom rule: the server refuses the fifth ping during lockout and returns the remaining ticks.
- Coordinates are `Uint8` (`interface.hpp` 1578 constructor, fields 1569-1570 not receipted because they are short lines). A ping can carry only 0 to 255 per axis. Fix: `Uint16`, or clamp to the zone size from zone data.
- Integer division: `TICKS_PER_SECOND / 4` is 12 ticks (0.24 s), not 0.25 s (964). Fix: keep the cap in milliseconds (250) and convert.
- The lockout counts down once per handler call (13694). If the handler runs per render frame, the lockout depends on frame rate. Fix: count it on the server tick. The handler's frequency was not read.
- Radius pings (sentry and ally, `monster_sentrybot.cpp` 1210) are exempt from the cap (`!newPing.radiusPing`). Death markers are exempt too. If Frankendom adds a radius or marker ping, give it its own budget, not the default cap.
- Callouts draw newest first, so older callouts paint over newer ones (drawing order from the queue at 1004-1006). Intent not read. Check the order before copying.
- Points of interest use hard-coded sprite ids (154: 161 and 254 to 257) and a portal behaviour. Frankendom: zone data should tag points of interest, not sprite numbers.
- Not applicable: MAX_ATTACKERS = 3, the fight camera, and the Pit. A ping does not change a fight; keep it out of the duel step.
- Not read: the body of `drawMinimap` outside the blocks listed, `sendMinimapPing`, the net send path, the handler frequency, and where callouts are created.
