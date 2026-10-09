# id-Software-Quake (server-tick-netcode, cell 5)

Donor: `/mnt/frankendom-donors/id-Software-Quake/WinQuake/net_main.c` | Licence: GPL-2.0 (gnu.txt) | C (QuakeC scripts) | symbol `NET_Connect` / `NET_SendMessage`

Checked: (verified: `NET_Connect` at 368-441, `NET_SendMessage` at 625-653, `NET_GetMessage` 540-603). Note: the two symbols are a driver dispatch layer. The reliability logic sits one layer down in `net_dgrm.c` (`Datagram_SendMessage` 161-205, `SendMessageNext` 208-238, `ReSendMessage` 241-271, `Datagram_GetMessage` 315-463), all read in full.

## 1. Mechanism

- `net_main.c` is a dispatch layer. `NET_Connect` (368-441) resolves the host (`local` forces driver 0; otherwise the host cache is searched, and a LAN search runs if needed), then tries each initialised network driver in turn and returns the first socket (422-430). `NET_SendMessage` (625-653) and `NET_GetMessage` (540-603) forward to the driver's send and get functions through a function table, add counters and optional VCR recording. `NET_GetMessage` closes the socket if it got nothing for longer than `net_messagetimeout` (560-564; default 300 s, line 66) and refreshes `lastMessageTime` on any delivery (572).
- The datagram driver (`net_dgrm.c`) makes a reliable stream over UDP with sequence numbers and stop-and-wait. `Datagram_SendMessage` (161-205) copies the message into the socket, sends the first chunk (up to `MAX_DATAGRAM`) as one packet with a sequence number and the EOM flag only if it is the last chunk, and clears `canSend`. Later chunks go out from `SendMessageNext` (208-238) when the ACK for the previous chunk sets `sendNext`. `ReSendMessage` (241-271) re-sends the current chunk with the previous sequence number; `Datagram_GetMessage` calls it when `canSend` is false and over 1.0 s has passed since the last send (324-326).
- `Datagram_GetMessage` (315-463) checks the source address (forged packets are dropped), drops short packets, and handles three packet kinds: unreliable (delivered if newer, with a drop count), ACK (matching the outstanding sequence advances the ack counter and, after the last chunk, sets `canSend`), and data (always ACKed by sequence; accepted only if it is the next expected sequence, otherwise counted as a duplicate). Non-final chunks are appended to a receive buffer; only the EOM chunk delivers the whole message (442-455). The ACK branch ignores stale and duplicate ACKs, then drops one chunk from the send buffer and either sets `sendNext` or sets `canSend` (395-425). Control packets are skipped (364).
- Inputs: outbound messages and incoming datagrams. Outputs: delivered messages, ACKs, timeout disconnects.
- Tick: the network poll and each send call. There is no simulation here.

## 2. Key functions

- `NET_Connect`: `/mnt/frankendom-donors/id-Software-Quake/WinQuake/net_main.c` lines 368-441. Driver search, host cache, returns a socket.
- `NET_SendMessage`: `/mnt/frankendom-donors/id-Software-Quake/WinQuake/net_main.c` lines 625-653. Driver dispatch for a reliable send, with a VCR record hook.
- `Datagram_SendMessage`: `/mnt/frankendom-donors/id-Software-Quake/WinQuake/net_dgrm.c` lines 161-205. One sequenced packet per call, with chunking; sets canSend false.
- `Datagram_GetMessage`: `/mnt/frankendom-donors/id-Software-Quake/WinQuake/net_dgrm.c` lines 315-463. Address check, packet kinds, ACK handling, duplicate rejection.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Stop-and-wait reliable send: one message outstanding, next send waits for ACK | `MAX_DATAGRAM` chunk size (theirs; defined in a header, value not read here) |
| Sequence numbers: ACK every data packet, deliver only the next expected | `NET_HEADERSIZE` = 2 unsigned ints (theirs, net.h 32) |
| Unreliable packets: deliver if newer, count the gap | `NETFLAG_*` flag bits (theirs) |
| Silence timeout closes the link | `net_messagetimeout` = 300 s (theirs, net_main.c 66) |
| Resend of an unacked chunk | 1.0 s (theirs, net_dgrm.c 325) |
| Driver table: transport swapped behind one API | driver order and default port 26000 (theirs, net_main.c 34) |

## 4. TypeScript sketch

simplified: omits the 1.0 s resend of an unacknowledged chunk, the receiver-side chunk reassembly (only the EOM chunk delivers), the unreliable channel, the forged-address check, control packets and short-packet drops. The silence timeout here is a plain parameter; the donor applies it only when a poll returned nothing.

```ts
// Licence: GPL-2.0 (gnu.txt) (donor). CLEAN-ROOM sketch: written from the mechanism description, not a translation of donor lines.
interface Link {
  sendSeq: number;     // next sequence to use
  ackSeq: number;      // sequence the peer must ack next
  expectSeq: number;   // next sequence we will deliver
  canSend: boolean;    // false while a message is outstanding
  lastHeard: number;
  pending: Uint8Array; // bytes of the outstanding message not yet acknowledged
}

// Send one reliable message as chunks: one packet per call, the first chunk now, the rest after each ACK.
// Only one message may be outstanding; the caller waits otherwise.
function sendReliable(l: Link, data: Uint8Array, chunk: number): { seq: number; bytes: Uint8Array; last: boolean } | null {
  if (!l.canSend) return null;
  l.canSend = false;
  l.pending = data;
  return { seq: l.sendSeq++, bytes: data.subarray(0, chunk), last: data.length <= chunk };
}

// ACK for the outstanding sequence: a stale or repeated ACK is ignored. An ACK drops the chunk just sent;
// if bytes remain, send the next chunk; only the ACK of the last chunk frees the link (canSend = true).
function onAck(l: Link, seq: number, chunk: number): { seq: number; bytes: Uint8Array; last: boolean } | null | false {
  if (seq !== l.sendSeq - 1) return false; // stale
  if (seq !== l.ackSeq) return false;      // duplicate
  l.ackSeq++;
  l.pending = l.pending.subarray(Math.min(chunk, l.pending.length));
  if (l.pending.length > 0) {
    return { seq: l.sendSeq++, bytes: l.pending.subarray(0, chunk), last: l.pending.length <= chunk };
  }
  l.canSend = true;
  return null;
}

// Data packet: always ACK what arrived; deliver only the next expected sequence.
function onData(l: Link, seq: number, now: number): { ack: number; deliver: boolean } {
  l.lastHeard = now;
  const deliver = seq === l.expectSeq;
  if (deliver) l.expectSeq++;
  return { ack: seq, deliver };
}

// Silence longer than the timeout closes the link.
function timedOut(l: Link, now: number, timeout: number): boolean {
  return now - l.lastHeard > timeout;
}
```

## 5. Lands in

- TARGET `src/fight/transport.ts` (new), the reliable transport under the fight engine. Parity-checklist row 18 (post-K item 3: server tick). Frankendom's path is HTTP and Supabase, so this is only relevant if a socket path is added.
- today: `src/net/transport.ts` already does unordered direct WebRTC (every packet repeats the unacked intents, so no stop-and-wait) with the relay as fallback. A stop-and-wait reliable stream is not needed there. (read in worktree `frankendom-combat-p3`, commit 6adcab27e).
- Reuse tag: rewrite-from-idea
- Brief rule served: (category default, not per-cell) 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- Stop-and-wait gives one message in flight per link. That caps throughput; the donor does not batch. A fight tick that sends many entity updates needs a different shape.
- No client prediction, interpolation or state diff in these functions. The game-level state is out of scope for this cell.
- Retransmit is a fixed 1.0 s timer with one chunk in flight, with no backoff. Loss of any packet stalls that link for a second.
- The security of this driver (an address match only, no authentication in the functions read) is not enough for server-verified kills on its own.
