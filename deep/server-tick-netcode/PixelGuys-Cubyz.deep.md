# PixelGuys-Cubyz (server-tick-netcode, cell 5)

Donor: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/network/protocols.zig` | Licence: GPL-3 | Zig | symbol `protocols.onReceive` / `handShake`

Checked: (verified: `onReceive` at 48-62, `handShake` struct at 89, `playerPosition` struct 416-442, `entityPosition` struct 444-533). Also read: `init` (29-46), `User.receiveData` (server.zig 542-552), the `HandShakeState` enum (network.zig 1478-1487).

## 1. Mechanism

- Every packet starts with a one-byte protocol id. `onReceive` (48-62) rejects any packet from a connection whose handshake is not complete, unless it is the handshake packet. It then looks up the handler in a table built at startup from each protocol's `clientReceive` or `serverReceive`, runs it on a reader over the payload, and counts the bytes.
- The handshake is a monotonic enum (`HandShakeState`: start 0, userData 1, signatureRequest 2, signatureResponse 3, reload 4, assets 5, serverData 6, complete 255). A message is acted on only if its stage is higher than the connection's current one; a stale or repeated stage is ignored (97, 146, comments 139-141 and 220-222). Typical order: client sends userData (name, version, public keys); server checks the name (valid UTF-8, under 500 bytes and 50 visible characters) and version, replies signatureRequest (non-singleplayer) or skips straight to the asset step (singleplayer); client sends signatureResponse; server verifies, packs and sends the assets, sets `assets`, and calls `main.server.connect`; the client unpacks the assets, and on serverData (sent by `sendServerPlayerData`, 229-245) sets `complete` and blocks on a condition until asset loading finishes (125-136). `reload` is a separate path for re-verifying after a restart (192-201).
- Player to server (`playerPosition.send`, 423-441): at most one send per 50 ms (`time -% lastPositionSent < 50`, wrap-safe 16-bit, 424), on the lossy channel. The gate variable `lastPositionSent` is one module-level variable shared across connections (422). It carries absolute position and velocity (three f64 each), camera rotation (three f32) and the 16-bit timestamp. The server's `serverReceive` (419-421) calls `User.receiveData` (server.zig 542-552), which stores the rotation and feeds position, velocity and time to an interpolation object. No bounds or speed check appears in that function.
- Server to client (`entityPosition.send`, 496-532): entity and item-drop records are written relative to the receiver's position. Velocity is written at one of three precisions by magnitude (squared length compared against 1e-6 squared and 1000 squared, 503-512): none, half float, or full float. Item-drop records follow the same scheme (517-530). A 16-bit millisecond timestamp and the receiver's absolute position lead the packet (500-501); it goes on the lossy channel (531). The client-side `clientReceive` (454-495) adds the receiver position back to each offset.
- Inputs: packets and the entity list. Outputs: handshake state, position packets and entity bundles.
- Tick: the send call. The position send is throttled; the entity bundle goes out per call. The server's own update rate is `updatesPerSec` = 20 (server.zig 572), outside these functions.

## 2. Key functions

- `protocols.onReceive`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/network/protocols.zig` lines 48-62. Handshake gate, table dispatch, byte counter.
- `protocols.handShake.clientReceive`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/network/protocols.zig` lines 95-142. Client side of the monotonic handshake: signature response, asset unpack, serverData and the asset wait.
- `protocols.handShake.serverReceive`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/network/protocols.zig` lines 144-223. Server side: reads user data (name and version checks), requests and verifies signatures, sends the assets.
- `protocols.playerPosition.send`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/network/protocols.zig` lines 423-441. 50 ms throttle, lossy channel, absolute position and velocity. Server intake: `serverReceive` 419-421, then `User.receiveData` in `/mnt/frankendom-donors/PixelGuys-Cubyz/src/server/server.zig` 542-552.
- `protocols.entityPosition.send`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/network/protocols.zig` lines 496-532. Per-entity relative position and velocity precision tier.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Handshake gate: only the handshake id is accepted until complete | protocol ids (theirs) |
| Monotonic stage advance, stale stages ignored | handshake stage enum (theirs) |
| Throttled position send with a wrap-safe timestamp gap | 50 ms minimum gap (theirs, 424) |
| Relative-to-receiver position encoding | float precision choice (theirs) |
| Velocity precision by magnitude | 1e-6 and 1000 thresholds (theirs, 504 and 506, applied to squared length) |
| Unreliable channel for frequent state, reliable for rare | channel choice per call (theirs) |

## 4. TypeScript sketch

simplified: the handshake is collapsed to five numbered stages (the donor has eight named ones plus signature and asset steps); item-drop records, rotation, the u16 timestamp on entity packets and the shared (not per-connection) `lastPositionSent` are omitted.

```ts
// Licence: GPL-3 (donor). CLEAN-ROOM sketch: written from the mechanism description, not a translation of donor lines.
type Stage = 0 | 1 | 2 | 3 | 4; // handshake stages; only ever advance

interface Conn { stage: Stage; lastPosSent: number; }

// Gate: before the handshake is complete, only the handshake protocol is accepted.
function accept(c: Conn, protocol: number, handshakeId: number): boolean {
  return c.stage === 4 || protocol === handshakeId;
}

// Monotonic advance: a repeated or older stage is refused, never rolled back.
function advance(c: Conn, next: Stage): boolean {
  if (next <= c.stage) return false;
  c.stage = next;
  return true;
}

// Client to server: at most one position per interval, on the unreliable channel.
function maybeSendPosition(c: Conn, now16: number, minGap: number): boolean {
  const gap = (now16 - c.lastPosSent) & 0xffff; // wrap-safe 16-bit difference
  if (gap < minGap) return false;
  c.lastPosSent = now16;
  return true;
}

// Velocity precision tier by magnitude: none, half, or full.
type Tier = "none" | "half" | "full";
function velocityTier(speed: number): Tier {
  if (speed < 1e-6) return "none";
  if (speed > 1000) return "full";
  return "half";
}

// Server to client: position is relative to the receiver; velocity is dropped when the tier is none.
function encodeEntity(id: number, pos: number[], me: number[], vel: number[]) {
  const tier = velocityTier(Math.hypot(...vel));
  const rel = pos.map((p, i) => p - me[i]);
  return { id, tier, rel, vel: tier === "none" ? null : vel };
}
```

## 5. Lands in

- TARGET `src/fight/wire.ts` (new), the wire layer under the fight engine: throttled client intent send and relative-position, tiered-precision state send. Parity-checklist row 18 (post-K item 3 server tick) and row 5 (client input send).
- today: the wire format exists in `src/net/pvp.ts` (`WirePacket`: frame, ack, hash, base64url intents packed with `record.ts`), sent over `src/net/transport.ts`. Nothing throttles position, since there is no free movement; no relevance-tiered state send exists. (read in worktree `frankendom-combat-p3`, commit 6adcab27e).
- Reuse tag: rewrite-from-idea
- Brief rule served: (category default, not per-cell) 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- The client sends its own position and the server's `receiveData` stores it without a bounds check (see above). Movement is client-authoritative here, which conflicts with server-verified kills; the Mindustry note in this batch shows the bounded-step check this donor lacks. Whether another part of the server clamps it was not read.
- The encoding and throttle are voxel-world transport. Nothing here covers hit, damage, kill or inventory.
- The handshake and asset wait are launch-time concerns; a fight client may not need the asset stage.
- Relative positions are float32 offsets; precision near far zones is not discussed in these functions.
