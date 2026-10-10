# PixelGuys-Cubyz (combat-sim, cell 2)

Donor: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/sync.zig` (`addHealth` 249-256; server and client branches of the `addHealth` case 847-870) with `/mnt/frankendom-donors/PixelGuys-Cubyz/src/game.zig` 818-821 (fall damage) and `/mnt/frankendom-donors/PixelGuys-Cubyz/src/callbacks/block/touch/hurt.zig` (block contact damage) | Licence: GNU GPL-3.0 (`LICENSE` line 2: "Version 3, 29 June 2007") | Zig | symbol `addHealth`

Checked: Read the health path end to end: `addHealth` (249-256), the client predicted apply and the server apply inside the `addHealth` base-operation case (847-870), the command entry (183-204, 228-236), the server-side `AddHealth` command (1699-1747, with `run` at 1704-1729), the `Context.execute` forward (909-910), the `ignoreSource` rule (489-492), the client sync apply (455-461), the client kill (203-208), the fall damage block inside `update` (621, 818-821), the block contact hurt (all of `hurt.zig`) and `baseGravity` (physics.zig 14). Callers of `addHealth`: fall damage (game.zig 821), block hurt (hurt.zig 29), and the `/kill` command (server/command/kill.zig 20, which passes minus `floatMax`). Callers of the server command entry: read only the call at sync.zig 235 and server.zig 507 (the network loop body at server.zig was not read). Not read: the client handler that calls `undo` when the server reports a failure, `server.zig` 500-540 beyond the call, `kill.zig` beyond line 20, and `healthbar.zig` beyond lines 48-52. A grep over `src` for knockback, critical hits and armour found no combat code: only "critical section" comments in the mutex files and an inventory TODO about armour slots (inventory.zig 47). This is a search result, not a read. Confidence high on the ledger order; medium on whether the client undo path matches the server failure path (not read). Verdict STRONG because the order of operations and the numbers are read.

Best transferable idea: one entry point for every health change that clamps to [0, max], turns zero or below into one kill event with a full refill, and rolls back a predicted local change when the server refuses it.
Decision (proposed): adapt - keep the one ledger with clamp, kill-at-zero refill and rollback, but the server must compute the damage itself; in this donor the client sends its own damage and the server checks only that the target is the sender (sync.zig 1744), so the trust model is the opposite of our server-verified kills.
Acceptance: a server test sends a forged damage change from a client and asserts that the victim's health is unchanged; a server-computed landing with a 30-unit vertical change deals 4 health (donor formula, see section 3); a kill sync respawns the player once at full health at the spawn point.

## 1. Mechanism

- One entry point. `addHealth(health, cause, side, entity)` (sync.zig 249-256) sends the change as a command when called on the client (252) and runs it directly on the server (254). Every health change goes through it: fall damage (game.zig 821), block contact hurt (hurt.zig 29), and the `/kill` command (kill.zig 20, with a change of minus the largest float, which clamps to zero).
- Client path first (predicted). The client runs the command locally, remembers the old value (868) and clamps the new one to [0, max] (869). The same command is serialised and sent to the server (sync.zig 74-88 for the client entry). The client also keeps the command so it can undo it (`undo`, 685 restores the remembered value).
- Server path (authoritative). A command received from the network is deserialised (1738-1746) and run on the server (sync.zig 228-236, `executeCommand` at 183). `AddHealth.run` (1704) finds the target among the connected users (1707-1715), returns with an error if none is found (1717), skips creative targets (1719), and forwards to the base operation (1724, `Context.execute` at 909-910). In the base operation, server side (848-870):
  1. remember the previous value (849);
  2. clamp to [0, max] (851);
  3. if the result is zero or below (853): refill to max (854), send the cause message to the chat (855), and queue one `kill` sync operation carrying the spawn point (857);
  4. otherwise queue one `health` sync operation carrying the delta (862-865).
- Who gets the sync: `ignoreSource` (489-492) lists `health` as ignored, so the sender is skipped for the delta (it already applied it locally). `kill` is not ignored, so the sender gets the kill and respawns (executeCommand loop, sync.zig 204).
- Client respawn on a kill sync: `Player.super.health` is set to max and the player is moved to the spawn point (`Player.kill`, game.zig 203-208; the sync apply is at sync.zig 459-460).
- Fall damage (client, per landing). Inside the client `update(deltaTime)` (game.zig 621), a vertical collision sets `didCollide` (physics step). The change in vertical speed is the absolute value of (|prevVz| - |vz|) (818). Damage = round(max(change^2 / (2 x baseGravity) - 7, 0)) / 2 (819), with baseGravity = 30.0 (physics.zig 14). Sent only if above 0.01 (820-821), as a client change with cause `fall`.
- Block contact hurt (client, per frame). A block's `onTouch` callback runs for each touched block (physics.zig 345). The hurt callback (hurt.zig 28-29) takes `dps x deltaTime` and sends it as a client change with the block's cause. Its `run` asserts the entity is the local player and says "TODO: Implement on the server side" (27). `dps` and `damageType` come from the block data (hurt.zig 11-21).
- Tick: no tick loop for health was found. The server applies each command when it arrives: the network loop calls `executeUserCommand` (server.zig 507, loop body not read; sync.zig 228). The client applies fall damage on each collision inside the frame update, and block hurt on each frame with the frame's delta time, so the per-frame hurt scales with frame time.

## 2. Key functions

- `addHealth`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/sync.zig` 249-256. Single entry, side decides path.
- Base operation, `addHealth` case: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/sync.zig` 847-870. Server branch 848-867, client branch 868-869. Clamp, kill-or-delta.
- `AddHealth` command: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/sync.zig` 1699-1747. Fields target, health, cause (1700-1702), `run` 1704-1729, deserialise 1738-1746 (target must equal the sender, 1744).
- Fall damage: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/game.zig` 818-821, inside `update` (621).
- Block contact hurt: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/callbacks/block/touch/hurt.zig` 26-31.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One ledger: remember, clamp to [0, max], zero or below means kill and full refill, otherwise one delta | Floor 0 and refill to max (theirs, sync.zig 851-854) |
| Predict locally, send the same command, roll back to the remembered value on refusal | Undo restores `previous` (theirs, 685) |
| Kill is one event; the sender is skipped for deltas but not for kills | `ignoreSource` table (theirs, 491-492) |
| Landing damage from a speed change: fall height c^2 / (2g), minus a safe band, rounded, scaled | Safe band 7 (theirs, game.zig 819); scale 1/2 (theirs, 819); gravity 30.0 (theirs, physics.zig 14); send threshold 0.01 (theirs, game.zig 820) |
| Per-frame damage = rate x delta time | dps comes from block data (theirs, hurt.zig 28, 11) |
| Default health: 8 max, 8 now | Base entity defaults (theirs, Entity.zig 14-15); the healthbar counts half-heart units as ceil(2 x health) (theirs, healthbar.zig 49) and hearts as ceil(max) (theirs, 52) |

Arithmetic from the formula (not a donor value): a vertical change of 30 gives 30^2 / 60 = 15; 15 - 7 = 8; round 8 and halve gives 4 health. Below a change of about 20.49 (sqrt of 420) the damage is zero.

## 4. TypeScript sketch

simplified: keeps the server ledger order (remember the previous value, clamp, then kill with refill or one delta), the rollback to the remembered value, and the fall formula with its safe band and send threshold. It omits the creative skip, the target-equals-sender check, the cause message, the echo rules of `ignoreSource`, the client prediction path and its command queue, the block contact hurt rule, and the spawn lookup (spawn is a stored field here). It takes gravity as an argument rather than the engine constant.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation.
type Cause = 'heal' | 'kill' | 'fall' | 'heat' | 'spiky';

interface Vitals { health: number; maxHealth: number; spawn: { x: number; y: number; z: number }; }

type LedgerEvent =
  | { kind: 'health'; target: number; delta: number; cause: Cause }
  | { kind: 'kill'; target: number; spawn: Vitals['spawn']; cause: Cause };

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

// One ledger entry for every health change. Order: remember the previous value, clamp to [0, max],
// then either refill to max and emit one kill, or emit one health change carrying the delta.
function applyHealth(target: number, v: Vitals, delta: number, cause: Cause, out: LedgerEvent[]): number {
  const previous = v.health;
  v.health = clamp(v.health + delta, 0, v.maxHealth);
  if (v.health <= 0) {
    v.health = v.maxHealth;
    out.push({ kind: 'kill', target, spawn: v.spawn, cause });
  } else {
    out.push({ kind: 'health', target, delta, cause });
  }
  return previous;
}

// Undo of a predicted change when the server refuses it: put back the remembered value.
function rollback(v: Vitals, previous: number): void {
  v.health = previous;
}

// Landing damage. A vertical speed change c gives a fall height c^2 / (2g). The first 7 units are free;
// the rest is rounded to whole units and halved. Zero means nothing is sent.
function fallDamage(prevVz: number, vz: number, g: number): number {
  const change = Math.abs(Math.abs(prevVz) - Math.abs(vz));
  const raw = Math.max((change * change) / (2 * g) - 7, 0);
  const damage = Math.round(raw) / 2;
  return damage > 0.01 ? damage : 0;
}
```

## 5. Lands in

- TARGET `src/fight/damage.ts` (parity row 1, duel step / sim). The one health-change function, server side only; the client shows the server's result and never writes health except for its own predicted, provisional value.
- The kill event's full refill and respawn at the spawn point (sync.zig 853-857; game.zig 203-208) belongs to the death/respawn checklist item, not to this target.
- Reuse tag: rewrite-from-idea (GPL-3.0 copyleft; clean-room only). The sketch is written from the described mechanism.
- Brief rule served: 1 (one combat core, two clients). Server-verified kills (ruling) is the rule this donor breaks; see section 6.

## 6. Gaps and risks

- Trust model, the main gap against our rulings. The client computes its own fall and block damage and sends the amount (game.zig 821; hurt.zig 29), and the server accepts it. The only server check is that the target is the sender (sync.zig 1744). A client that sends no damage takes none, and the donor says so itself for block hurt ("TODO: Implement on the server side", hurt.zig 27). Frankendom must compute landing and hazard damage on the server from server-side motion, and reject any client damage value.
- One ledger. The donor has one entry point, which matches the ruling, but the client also applies the change (sync.zig 868-869) and the server does not echo the delta to the sender (491). Our version must make the client's value provisional and reconcile to the server's value; the donor does not show a reconciliation step (the client undo path that runs on a failure message was not read).
- Kill and respawn belong to the death/respawn checklist item. A refill to max on zero, with a spawn point, is correct for a death event, but the donor refills before it sends the kill (854-857). Frankendom's kill must be one server event with one ledger entry.
- Clamp at zero on the client and refill on the server can disagree for a moment (client shows 0, server refills and sends a kill). The donor resolves it by the kill sync; we must test that the victim sees one death and one respawn.
- Zones as data: block hurt rate comes from the block's data (hurt.zig 11-21), which fits zone data. The fall safe band (7), the scale (1/2), gravity (30.0) and the send threshold are engine constants; the fall formula is a rule, not a zone value.
- Not in this donor, so no transfer: knockback, critical hits, armour, many-on-one target selection, hate tables, MAX_ATTACKERS. The grep above found none of them; the `/kill` command only shows the ledger's reach.
- GPL-3.0: clean-room only; the sketch is written from the mechanism and states the licence.



## Checker findings (Sonnet 5.5 medium, 2026-10-10)
**Verdict: CLEAN.** Independent check against the donor code.

**Errors / corrections:** None. Verified sync.zig addHealth 249-256, base op 847-870 (server clamp, <=0 refill+cause message+kill op with spawn; else health op), client branch 868-869, ignoreSource 489-494 (health ignored, kill not), AddHealth.run 1704-1729 (creative skip 1719, serverFailure 1717), deserialize target==sender check 1744, undo restoring previous (685), client sync apply 455-461, Player.kill game.zig 203-208, fall damage game.zig 818-821 and baseGravity 30, hurt.zig 26-31 (TODO server side at 27, dps*deltaTime), kill.zig 20 (-floatMax), Entity.zig 14-15 health 8, healthbar 49/52, GPL v3. Arithmetic 30 -> 4 is right.

**Missed:** None.
