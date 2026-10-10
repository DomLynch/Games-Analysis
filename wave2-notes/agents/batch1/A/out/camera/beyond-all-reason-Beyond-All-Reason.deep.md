# beyond-all-reason-Beyond-All-Reason (camera, cell 14)

Donor: `/mnt/frankendom-donors/beyond-all-reason-Beyond-All-Reason/luarules/gadgets/data_camera_broadcast.lua` | Licence: GNU LGPL v2.1 or later (file header, line 9; the repo `LICENSE.md` line 2 says the game code is GPL v2 with per-file licences) | Lua (Recoil engine gadget, synced and unsynced halves) | symbol `gadget:Update`

Checked: whole file read (lines 1-418). Read in full: `gadget:Update` (395-417), `RefreshBroadcastPeriod` (291-311), `CameraStateChanged` (362-393), `PackCameraValues` and `CameraStateToPacket` (174-218), `CustomPackF14` (106-144), the receivers (36-46, 340-357) and the decoder (220-267). Not read: the engine calls it makes (`Spring.GetCameraState`, `SendLuaRulesMsg`, `SendToUnsynced`) and the LuaUI consumer `Script.LuaUI.CameraBroadcastEvent`, so what another client does with a received view (smoothing, lag) is (not read). Confidence high on the send-side rule, medium on the receive side.

## 1. Mechanism

The gadget copies one player's camera to other clients (allies and spectators) so they see the same view. It is a sender plus a filtered receiver.

Send side, each frame in `gadget:Update` (395-417), in this order:
(a) add the frame time `dt` to a send timer (397).
(b) choose the period: spectators always use the slow period (398). Players use the period set by `RefreshBroadcastPeriod`, which counts non-spectator humans (296-297) and scales linearly from 0.1 s at 8 or fewer to 0.35 s at 32 or more (301-309).
(c) if the timer is short of the period, stop (399-400). Otherwise subtract one period and keep the remainder (402). At most one send per frame, even if several periods have passed.
(d) read the camera state (404) and compare it field by field, in a fixed key order, each number first packed to 14 bits (362-393). If no field differs, stop (405-407). A change of camera type always counts as a change (364-374).
(e) pack the whole state, not only the field that changed (174-200; the loop at 178 covers every field), prefix it with the session token (217), and send it with `SendLuaRulesMsg` (416).

Number format: each value is a 14-bit float with 1 sign bit, 7 exponent bits (bias 64) and 6 mantissa bits (105, 143). The bits are packed across byte boundaries (183-198).

Receive side: the synced half passes on only messages that start with the session token (36-46) and sends them to unsynced (44). The unsynced half decodes them (220-267), drops them if the length is wrong (229-231), and forwards them to LuaUI (356) after a viewer filter (350-355). A spectator with full view sees every sender. Everyone else is dropped if the sender is a spectator or is on another ally team (352).

## 2. Key functions

- `gadget:Update`: `/mnt/frankendom-donors/beyond-all-reason-Beyond-All-Reason/luarules/gadgets/data_camera_broadcast.lua` 395-417. Timer, change test, send.
- `RefreshBroadcastPeriod`: same file, 291-311. Send rate from the human player count.
- `CameraStateChanged`: same file, 362-393. Change-only test at packed precision.
- `PackCameraValues` and `CameraStateToPacket`: same file, 174-200 and 203-218. Whole-view packet.
- `CustomPackF14`: same file, 106-144. The 14-bit float codec.
- `handleCameraBroadcastEvent`: same file, 340-357. Viewer filter.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Send rate falls as the room grows: fast and fixed for small rooms, slow and fixed for large, linear between | 0.1 s and 0.35 s (theirs, 15-16); thresholds 8 and 32 players (theirs, 19-20). At 8 players that is up to 10 sends a second per player; at 32, about 2.9 |
| Spectators always get the slow rate | 0.35 s (theirs, 18 and 398) |
| Timer keeps the remainder after each send | none (subtract one period, 402) |
| Send only when a number changes, compared at quantised precision | 14 bits: 1 sign, 7 exponent (bias 64), 6 mantissa (theirs, 65-66, 105, 143) |
| Whole view in one packet | none |

## 4. TypeScript sketch

simplified: keeps the rate rule (0.1 s to 0.35 s scaled by active player count, spectators fixed at 0.35 s), the timer that keeps the remainder, and the change-only send that packs the whole view. It replaces the 14-bit float codec with a caller-supplied `quantise` function. It omits the session token and packet header, the forced send on camera-type change, the viewer filter (spectator, full view, ally team), the decode length check and the header-only stop packet. The donor stops comparing at the first changed field and then updates the later ones; the sketch compares all fields and updates all of them, which leaves the stored state the same.

```ts
// Licence: GNU LGPL v2.1 or later (donor file header). clean-room sketch from the described mechanism, not a translation of the donor lines.
// clean-room
const MIN_PERIOD = 0.1;    // seconds between sends with few players
const MAX_PERIOD = 0.35;   // seconds between sends with many players; spectators always use this
const SCALE_START = 8;     // active players at which the rate starts to slow
const SCALE_END = 32;      // active players at which the rate is at its slowest

type View = Record<string, number>;

function periodFor(activePlayers: number, isSpectator: boolean): number {
  if (isSpectator) return MAX_PERIOD;
  if (activePlayers <= SCALE_START) return MIN_PERIOD;
  if (activePlayers >= SCALE_END) return MAX_PERIOD;
  const t = (activePlayers - SCALE_START) / (SCALE_END - SCALE_START);
  return MIN_PERIOD + (MAX_PERIOD - MIN_PERIOD) * t;
}

class CameraFeed {
  private acc = 0;
  private last: View = {};

  constructor(private keys: string[], private quantise: (n: number) => number) {}

  // Call once per frame. Returns the whole quantised view when a send is due and something changed.
  tick(dt: number, activePlayers: number, isSpectator: boolean, view: View): View | null {
    this.acc += dt;
    const period = periodFor(activePlayers, isSpectator);
    if (this.acc < period) return null;
    this.acc -= period; // keep the remainder, as the donor does
    let changed = false;
    for (const k of this.keys) {
      const q = this.quantise(view[k]);
      if (q !== this.last[k]) changed = true;
      this.last[k] = q;
    }
    return changed ? { ...this.last } : null; // the whole view goes, not only the field that changed
  }
}
```

## 5. Lands in

- TARGET `src/fight/spectate.ts` (new module: a spectator feed that rides on the fight record). Parity-checklist row 19 (fight record/replay). Today there is no such module. Camera sampling itself stays client-side under row 11 (fight camera).
- Reuse tag: rewrite-from-idea (LGPL-2.1-or-later; clean-room, the shape transfers and the code does not)
- Best transferable idea: a spectator or replay feed that sends a view only on change, at a rate that falls as the room fills, with the timer carrying its remainder.
- Brief rule served: 1 (one engine, two clients: a spectator is a second client of the same fight record, never a second simulation)

## 6. Gaps and risks

- Ruling conflict: the rulings say the camera is client-only. This feed sends client camera state through the server to other clients. It is acceptable only as a spectator or replay feed. It must never feed a hit, a kill, aggro or a stance; the server keeps the fight state and the camera is a view.
- The viewer filter runs in the receiver (350-352). The synced gate checks only the two-character token (26, 41). A modified client can read every view. Frankendom must filter on the server before any view leaves it.
- The session token is `string.randomString(2)` (26). It rejects stray messages and is not a security control. Do not treat it as one.
- Traffic: up to 10 packets a second per player at the fast rate (0.1 s). MAX_ATTACKERS = 3 bounds the fight, not this feed, so Frankendom needs an explicit per-player cap on the spectate channel.
- No heartbeat: a packet goes only when a value changes (405-407). A still camera sends nothing more, so a lost last packet leaves the viewer on a stale view until the camera moves. The header-only packet (322, 342) means stop, not keepalive. If spectators matter, add a periodic keyframe.
- The 14-bit codec probably exists to save bytes (inference; the file gives no reason). The header date is 16 January 2009. A spectate feed can probably send plain numbers; measure before adding a codec.
- The forced send on camera-type change (364-374) is not needed if Frankendom has one fight camera, so the sketch drops it.
- Licence: LGPL v2.1 or later per the file header. Clean-room only; the sketch is written from the described mechanism.
