# id-Software-Quake (loot-drops, cell 3)

Donor: `/mnt/frankendom-donors/id-Software-Quake/qw-qc/items.qc` (drop and pickup) with `/mnt/frankendom-donors/id-Software-Quake/qw-qc/player.qc` (death path) | Licence: GPL-2.0-or-later (per items.qc header: "either version 2 of the License, or (at your option) any later version"; repo gnu.txt is GPL version 2) | QuakeC | symbols `PlayerDie`, `DropBackpack`, `BackpackTouch`, `DropQuad`, `DropRing`

Checked: `PlayerDie` read at player.qc 572-613 (to the `DropBackpack();` call; the gib and death-animation code after it was not read). `DropQuad` (items.qc 99-120), `DropRing` (159-179), `DropBackpack` (1636-1683, read in full), `BackpackTouch` (1473-1615, read; the deathmatch-4 bonus branch read; `Deathmatch_Weapon` not read), `bound_other_ammo` (498-508). Callers: `DropQuad`, `DropRing` and `DropBackpack` are each called only from `PlayerDie` (grep over qw-qc). The grep for drop, backpack and quad found no monster drop tables or rolls. Confidence: high on the death order, the drop timers and the ammo caps; medium on what happens to the victim's ammo after the backpack is made, because the respawn code was not read. camera_scope: not applicable (loot topic).

Best transferable idea: On death, a buff drop keeps the time it had left and expires with it, and the victim's ammo goes into one timed backpack that is clamped to per-type caps on pickup.
Decision (proposed): adapt - take the timed drops and the remaining-time carry; do not copy the ammo (the donor's `DropBackpack` copies it), move it, so the ledger holds one count.
Acceptance: A player who dies with 20 s of ring left leaves a ring pickup that shows 20 s and removes itself at 0 s; a player who dies with ammo leaves one backpack holding that ammo and the held weapon, removed after 120 s; a server test asserts the victim's ammo is zero after death and that a pickup clamps shells at 100.

## 1. Mechanism

- Entry: `PlayerDie` runs once when the player dies (player.qc 572). It is the only caller of the three drop functions (grep).
- Order of steps in `PlayerDie` (as the code runs):
  (a) clear the invisibility bit from the item flags (player.qc 576);
  (b) if world info key `dq` is non-zero and the quad timer is running (`super_damage_finished > 0`), spawn a quad drop with the time left as its argument (578-582);
  (c) if world info key `dr` is non-zero and the ring timer is running, spawn a ring drop the same way (594-603);
  (d) clear the ring, invincibility, quad and radsuit timers (607-610);
  (e) `DropBackpack()` (613).
- `DropQuad(timeleft)` and `DropRing(timeleft)`: spawn an item at the death origin with a toss velocity of z 300 and random horizontal velocity of -100 plus random times 200 on x and on y (items.qc 104-108 for the quad; the ring is the same shape). The expiry is `time + timeleft`, set both as `cnt` (116) and as the think time (118 for the quad; the ring is at 176-178), and the think removes the entity (`SUB_Remove`). So the drop lives exactly as long as the buff had left.
- `DropBackpack` (1636): returns without spawning if the four ammo counts sum to zero (1640). Otherwise it spawns the backpack at the origin minus 24 on z (1644), sets `items` to the held weapon (1646), names it by that weapon, copies the four ammo counts from the victim (1666 and the lines after), gives it the same toss velocity (1671), sets `touch = BackpackTouch` (1680), and removes it 120 s later (1682).
- `BackpackTouch` (1473): on pickup, the toucher gets the ammo counts added (1549 and the lines after), the weapon bits OR-ed in (1558), and then `bound_other_ammo` clamps each count (1560). `bound_other_ammo` caps shells at 100, nails at 200, rockets at 100 and cells at 100 (500-507). If `WeaponCode(new) <= b_switch` the donor calls `Deathmatch_Weapon(old, new)` (1613; not read), with an in-water case that skips lightning (1615-1617); `b_switch` is 8 when the info key is 0 (1485-1486). `W_BestWeapon` is called on the toucher first (1543-1546) but its result is not used in that condition.
- Tick: none. Death is an event; expiry is a think timer on each drop (`nextthink`), not a fixed-step loop. Drop motion is the engine's MOVETYPE_TOSS.

## 2. Key functions

- `PlayerDie`: `/mnt/frankendom-donors/id-Software-Quake/qw-qc/player.qc` 572-613.
- `DropQuad` / `DropRing`: `/mnt/frankendom-donors/id-Software-Quake/qw-qc/items.qc` 99-120 and 159-179.
- `DropBackpack`: `/mnt/frankendom-donors/id-Software-Quake/qw-qc/items.qc` 1636-1683.
- `BackpackTouch`: `/mnt/frankendom-donors/id-Software-Quake/qw-qc/items.qc` 1473-1615 (pickup merge and switch).
- `bound_other_ammo`: `/mnt/frankendom-donors/id-Software-Quake/qw-qc/items.qc` 498-508 (per-type caps).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| A buff drop keeps the time it had left and expires with it | Expiry = death time + remaining time (theirs, items.qc 116-118; call sites player.qc 582, 603) |
| Death gives one timed container of the victim's ammo and held weapon | Backpack life 120 s (theirs, items.qc 1682); toss velocity z 300 (theirs, items.qc 1671) |
| Pickup adds the stock, then clamps each type to its cap | Caps: shells 100, nails 200, rockets 100, cells 100 (theirs, items.qc 501, 503, 505, 507) |
| Pickup switches weapon when the new one is at or below the threshold | Threshold default 8 when the info key is 0 (theirs, items.qc 1485-1486; the code is `WeaponCode`) |
| Drops only happen when a server setting allows it | World info keys `dq` (quad) and `dr` (ring) (theirs, player.qc 578, 594; the keys' meaning is in server config, not read) |

## 4. TypeScript sketch

simplified: the sketch moves the victim's ammo into the backpack (the donor copies it, items.qc 1666, and the death path read does not zero it); it returns the raw amounts for a message instead of printing the donor's text; it omits the deathmatch-4 health and invulnerability branch of `BackpackTouch`, the weapon switch on pickup (`Deathmatch_Weapon`), the invisibility and radsuit timers, the gib and death-animation path, the quad and ring pickup behaviour (`q_touch` and `r_touch` not read), and the server info key checks (the sketch takes them as booleans).

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Stock { shells: number; nails: number; rockets: number; cells: number; }

interface Player {
  stock: Stock;
  weapon: string | null;
  quadLeft: number;   // seconds of quad left
  ringLeft: number;   // seconds of ring left
}

type DropKind = "quad" | "ring" | "backpack";

interface Drop {
  id: number;
  kind: DropKind;
  expiresAt: number;        // server clock, seconds
  stock: Stock | null;      // backpack only
  weapon: string | null;    // backpack only: the weapon held at death
}

const BACKPACK_LIFETIME_S = 120;                                          // donor: nextthink = time + 120
const CAP: Stock = { shells: 100, nails: 200, rockets: 100, cells: 100 }; // donor: bound_other_ammo

let nextId = 1;

// Death: a buff drop keeps the time it had left; the ammo and the held weapon go into one backpack.
function onDeath(p: Player, now: number, quadDrops: boolean, ringDrops: boolean): Drop[] {
  const out: Drop[] = [];
  if (quadDrops && p.quadLeft > 0) {
    out.push({ id: nextId++, kind: "quad", expiresAt: now + p.quadLeft, stock: null, weapon: null });
  }
  if (ringDrops && p.ringLeft > 0) {
    out.push({ id: nextId++, kind: "ring", expiresAt: now + p.ringLeft, stock: null, weapon: null });
  }
  p.quadLeft = 0;
  p.ringLeft = 0;
  const total = p.stock.shells + p.stock.nails + p.stock.rockets + p.stock.cells;
  if (total > 0) {
    out.push({ id: nextId++, kind: "backpack", expiresAt: now + BACKPACK_LIFETIME_S, stock: { ...p.stock }, weapon: p.weapon });
    p.stock = { shells: 0, nails: 0, rockets: 0, cells: 0 }; // sketch moves the ammo; the donor copies it
  }
  return out;
}

// Pickup: add the backpack's ammo, then clamp each type to its cap (the donor adds, then clamps).
function pickUpBackpack(d: Drop, taker: Player): number[] {
  if (d.kind !== "backpack" || d.stock === null) return [];
  const s = d.stock;
  taker.stock = {
    shells: Math.min(CAP.shells, taker.stock.shells + s.shells),
    nails: Math.min(CAP.nails, taker.stock.nails + s.nails),
    rockets: Math.min(CAP.rockets, taker.stock.rockets + s.rockets),
    cells: Math.min(CAP.cells, taker.stock.cells + s.cells),
  };
  return [s.shells, s.nails, s.rockets, s.cells];
}

// Timer: drops past their expiry are removed.
function expire(drops: Drop[], now: number): Drop[] {
  return drops.filter((d) => d.expiresAt > now);
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS at /tmp/quake-death-drops.ts, exit 0.

## 5. Lands in

- TARGET `src/fight/loot.ts` (new module, called from the engine death step): the death drop record (timed quad, ring and ammo backpack), its expiry on the server tick, and the clamped pickup. Parity-checklist row 18 (loot roll and XP award). The kill is server-verified; row 17 (death/respawn) is the caller.
- today: none (Frankendom has no death-drop record yet).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: one ledger (the backpack moves the ammo; one count), server-verified kills (the drop is created on the server at death)

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not the lines.
- The backpack copies the ammo (items.qc 1666 and after) and nothing in the death path read (player.qc 572-613) zeroes the victim's counts. Whether respawn clears them was not read. If Frankendom copies instead of moves, the ledger holds two counts. Move, and test it.
- The backpack holds only the weapon held at death (`item.items = self.weapon`, items.qc 1646). What happens to the other weapons is not in the death path read. Frankendom must decide what a death drop contains, as data.
- The ring comment says "remove after 30 seconds" (items.qc 178), but the timer is the time left (176-178). The code is right and the comment is stale. Do not copy the comment.
- Pickup has no owner or claim window: any player who touches the backpack takes it, and the only window is the 120 s lifetime. Frankendom needs a killer or party claim rule, verified on the server; the donor has none.
- Expiry is a think timer per entity. Frankendom must run it on the server tick (row 18, sub-line "server tick: fixed step, input intake, per-tick NPC budget") so that a drop expires the same way on every client.
- The deathmatch-4 branch of `BackpackTouch` (health +10 per pickup; invulnerability and quad for 30 s when health passes 299, cells cleared; items.qc 1499-1530 read) is a mode rule. It is not adopted: it grants power by pickup, which is outside the one-engine rules.
- The caps (100, 200, 100, 100) are tuning values in code; they should be data (zones as data) if Frankendom keeps them.
- Not read: `Deathmatch_Weapon`, `q_touch`, `r_touch`, `SUB_Remove`, the respawn code, and the meaning of the `dq` and `dr` server keys.
