# ioquake-ioq3 (inventory-bank-equipment, cell 9)

Donor: `/mnt/frankendom-donors/ioquake-ioq3/code/game/g_items.c` | Licence: GPL-2.0-or-later (g_items.c header lines 9-10: "either version 2 of the License, or (at your option) any later version."; COPYING.txt line 2: "Version 2, June 1991") | C | symbol `Touch_Item`, `Pickup_Weapon`, `Pickup_Health`, `Pickup_Powerup`, `RespawnItem`, `BG_CanItemBeGrabbed` (bg_misc.c)

Checked: Read in full: g_items.c 46-118 (Pickup_Powerup), 150-313 (Pickup_Holdable, Add_Ammo, Pickup_Ammo, Pickup_Weapon, Pickup_Health), 314-341 (Pickup_Armor, base-game branch), RespawnItem (read in full, from its header to its closing brace), 420-565 (Touch_Item); bg_misc.c 1039-1175 (BG_CanItemBeGrabbed, all cases); code/game/inv.h 1-166 (the hint file: bot-AI inventory indices and model/weapon indices, not a pickup list); g_main.c 145-146 (respawn cvars, read by grep); bg_misc.c item list (names and quantity lines read by awk; the quantity lines are tab-separated, so their values are cited by line, not quoted). Not read: g_items.c 119-149 (mission-pack persistent powerup code), bg_misc.c item-list bodies beyond quantity, ai_dmq3.c (only line 1750, by grep). Confidence: high for the pickup order, the caps, the refuse-when-full rule and the respawn timing. RespawnItem was read but only skimmed for its team-choice branch; its exact line numbers are not cited. The MISSIONPACK branches are the mission-pack variant (cmake/missionpack.cmake); this note describes the #else (base game) branches.

Best transferable idea: one grab predicate, shared by client prediction and server, decides whether a pickup is taken; a full slot or a full stat refuses the pickup and the item stays on the ground, and each class has its own respawn time in seconds with optional jitter.
Decision (proposed): adapt — adopt the shared grab predicate and refuse-when-full (a full slot leaves the item on the ground); adapt the respawn-by-class table as zone data with float jitter and an explicit never-respawn flag; do not copy the team-mode full-ammo special case.
Acceptance: a player at 100/100 HP walking onto a 25-HP pack gets nothing and the pack stays on the ground; a 5-HP pack at 100 HP takes the player to 105 and then hides for the class respawn time (35 s in the donor); a dropped pack never returns; a server test asserts that the client prediction and the server give the same answer to canGrab for the same state.

## 1. Mechanism

- Order of operations when a player touches a world item (`Touch_Item`, 426-559):
  (a) a dead player cannot pick up (432-433); (b) the shared grab predicate runs (436-438). The comment says the same rules run on client and server (435). If it refuses, the function returns and nothing changes.
  (c) the class-specific pickup function runs (445-477) and returns a respawn time in seconds (the header comment at line 29 says so). The pickup applies its effect before it returns.
  (d) if the return value is 0, the function returns at once (479-481). This is a defect (see section 6).
  (e) the pickup sound and events fire (483-508); targets fire (511).
  (f) wait == -1 hides the item for good and unlinks it after the event (514-520).
  (g) a non-zero `wait` on the entity replaces the class respawn time (523-525). A non-zero `random` adds a uniform jitter of plus or minus `random` seconds, floored at 1 s (528-533).
  (h) a dropped item is freed after the event and never comes back (536-538).
  (i) otherwise the item is hidden but kept in the world (543-545), so respawnable items can sit on movers. A respawn time <= 0 cancels the think (551-553). A positive time schedules `RespawnItem` at `level.time + respawn * 1000` (555-557).
- Per-class rules inside the pickup functions:
  - Health (`Pickup_Health`, 280-313): the cap is the max health, except quantity 5 and quantity 100 (small and mega packs) which may go to twice the max (289-293). After adding, the value is clamped to that cap (303-305). Respawn is RESPAWN_MEGAHEALTH for quantity 100 (308-309) and RESPAWN_HEALTH otherwise.
  - Armour (`Pickup_Armor`, base branch 331-341): add the quantity, clamp to twice the max health (335-337). Respawn RESPAWN_ARMOR.
  - Ammo (`Add_Ammo` 209-215, `Pickup_Ammo` 218-230): add, clamp at 200 (212). Respawn RESPAWN_AMMO.
  - Weapon (`Pickup_Weapon` 240-273): if the pickup is not a dropped item and the game is not team mode, and the player already has less ammo than the pickup quantity, the amount added is `quantity - owned` (so the total reaches the quantity); otherwise one shot is added (248-256). Dropped items and team games give the full quantity (248). Grappling hook ammo is set to -1 (unlimited) (265). Respawn: the team cvar in team games (269), else the normal cvar (272).
  - Holdable (`Pickup_Holdable` 195-204): writes the single holdable slot (197). The grab predicate refuses it when the slot is full (BG_CanItemBeGrabbed case IT_HOLDABLE, bg_misc.c 1168-1172). Respawn RESPAWN_HOLDABLE.
  - Powerup (`Pickup_Powerup` 49-116): if the timer is zero it is started at the current time rounded down to a whole second (54-58); then quantity times 1000 ms is added (67). Nearby players who are facing the pickup and have line of sight get a "denied" flag toggled (69-114). Respawn RESPAWN_POWERUP.
- The grab predicate (`BG_CanItemBeGrabbed`, bg_misc.c 1039): weapons and powerups are always taken (1053, 1106). Ammo is refused at 200 (1056-1057). Armour is refused at twice max health (1079). Health is refused at max, or at twice max for quantity 5 and 100 (1093-1100). A holdable is refused when the slot is full (1170-1171).
- Respawn itself (`RespawnItem`): for a team chain, one member is picked at random (rand() % count). Then the item is made visible again, a respawn sound plays (powerups and kamikaze get a global sound), an EV_ITEM_RESPAWN event is added, and the think is cleared.
- Tick: no own loop. Pickups run inside Touch (called on contact). Respawn runs from the entity's think at its scheduled time. The clock is `level.time` in ms.

## 2. Key functions

- `Touch_Item`: `/mnt/frankendom-donors/ioquake-ioq3/code/game/g_items.c` 426-559. Contact, grab check, pickup, hide, respawn schedule.
- `BG_CanItemBeGrabbed`: `/mnt/frankendom-donors/ioquake-ioq3/code/game/bg_misc.c` 1039-1175. The shared refuse rules.
- `Pickup_Weapon`: `/mnt/frankendom-donors/ioquake-ioq3/code/game/g_items.c` 240-273. Top-up rule and respawn cvars.
- `Pickup_Health` and `Pickup_Armor`: `/mnt/frankendom-donors/ioquake-ioq3/code/game/g_items.c` 280-313 and 331-341. Overcharge and clamps.
- `Pickup_Powerup`: `/mnt/frankendom-donors/ioquake-ioq3/code/game/g_items.c` 49-116. Timer stacking in ms.
- `RespawnItem`: `/mnt/frankendom-donors/ioquake-ioq3/code/game/g_items.c` (defined before `Touch_Item` in the same file; read in full, not line-cited). Team choice and unhide.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| A shared predicate decides take or refuse, client and server alike | None (rule) |
| Refuse when full; the item stays | Ammo 200 (g_items.c 212, bg_misc.c 1056); armour 2x max (335, 1079); health max or 2x for quantities 5 and 100 (289, 1093, 1100); one holdable slot (1170) |
| Per-class respawn time, in seconds, scheduled in ms | Armour RESPAWN_ARMOR 25 (g_items.c line 39); health RESPAWN_HEALTH 35 (line 40); ammo RESPAWN_AMMO 40 (line 41); holdable RESPAWN_HOLDABLE 60 (line 42); mega RESPAWN_MEGAHEALTH 35 (line 43); powerup RESPAWN_POWERUP 120 (line 44). The values sit on tab-separated lines and are not quoted |
| Weapon respawn: default 5 s, team 30 s | cvars g_weaponrespawn "5" (g_main.c 145) and g_weaponTeamRespawn "30" (g_main.c 146) |
| Jitter: add a uniform value of plus or minus a field, floored at 1 s | Field `random` (per entity, map data); floor 1 (g_items.c 528-530) |
| Weapon top-up to the pickup quantity | Pickup quantity per weapon (tab-separated lines in bg_misc.c; e.g. grappling hook 0, bg item list line 337 classname) |
| Powerup timers add time; a new timer starts on a whole second | Quantity seconds per powerup (g_items.c 67) |

## 4. TypeScript sketch

simplified: keeps the grab predicate (shared client and server), the refuse-when-full rule, the caps and overcharge, the weapon top-up, the single holdable slot, the respawn delay with jitter and the never-respawn flag, and the powerup timer stacking. Fixes are in the sketch: 0 is a real delay (the caller always consumes the item before it schedules a respawn), the never-respawn case is an explicit flag and not a 0 or -1 sentinel, and the jitter keeps its fraction (no int truncation). It omits the `ent->count` overrides, grappling-hook unlimited ammo (-1), the Kamikaze flag, the powerup "denied" loop, the team-mode rules beyond one flag, the mission-pack branches, the team-chain choice in RespawnItem, and the sounds and events. The caller must run the consume and hide step before calling `respawnDelayS`.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type Kind = "weapon" | "ammo" | "armor" | "health" | "holdable" | "powerup";

export interface PickupDef {
  kind: Kind;
  tag: string;            // weapon or ammo id, holdable id, or powerup id
  quantity: number;       // units given (weapon: ammo given on a first grab)
  overcharge: boolean;    // health pickups of 5 and 100 may go past max, up to 2x
  respawnS: number;       // seconds; per-class value (armor 25, health 35, ammo 40, holdable 60, powerup 120 in the donor)
  waitOverrideS?: number; // per-entity override, used when set
  jitterS: number;        // +/- seconds, float, applied before the clamp
  neverRespawn: boolean;  // explicit flag (donor used a 0 or -1 value; see the note)
  dropped: boolean;       // dropped items never respawn
}

export interface Player {
  hp: number;
  maxHp: number;
  armor: number;
  ammo: Record<string, number>;   // missing key = 0
  holdable: string | null;
  powerups: Record<string, number>; // absolute time in ms, as the donor stores it
}

const AMMO_CAP = 200;

// The same predicate runs on the client (prediction) and the server, so a refused pickup stays on the ground.
export function canGrab(def: PickupDef, p: Player): boolean {
  switch (def.kind) {
    case "weapon":
    case "powerup":
      return true;
    case "ammo":
      return (p.ammo[def.tag] ?? 0) < AMMO_CAP;
    case "armor":
      return p.armor < p.maxHp * 2;
    case "health":
      return def.overcharge ? p.hp < p.maxHp * 2 : p.hp < p.maxHp;
    case "holdable":
      return p.holdable === null; // one holdable at a time: a second one is refused, not swapped
  }
}

// Returns the amount actually added. fullWeaponAmmo is true for dropped weapons and team games.
export function applyPickup(def: PickupDef, p: Player, fullWeaponAmmo: boolean): number {
  switch (def.kind) {
    case "health": {
      p.hp = Math.min(p.hp + def.quantity, def.overcharge ? p.maxHp * 2 : p.maxHp);
      return def.quantity;
    }
    case "armor": {
      p.armor = Math.min(p.armor + def.quantity, p.maxHp * 2);
      return def.quantity;
    }
    case "ammo": {
      const before = p.ammo[def.tag] ?? 0;
      p.ammo[def.tag] = Math.min(AMMO_CAP, before + def.quantity);
      return p.ammo[def.tag] - before;
    }
    case "weapon": {
      // Already owned: top up to the pickup quantity if below it, otherwise one shot.
      const owned = p.ammo[def.tag] ?? 0;
      const gain = fullWeaponAmmo ? def.quantity : owned < def.quantity ? def.quantity - owned : 1;
      p.ammo[def.tag] = Math.min(AMMO_CAP, owned + gain);
      return p.ammo[def.tag] - owned;
    }
    case "holdable": {
      p.holdable = def.tag;
      return 1;
    }
    case "powerup":
      return 0; // timers are handled by grantPowerup
  }
}

// Seconds until the item is back. -1 means never. Dropped items and neverRespawn items do not come back.
// 0 is a valid delay: the caller has already consumed the item before scheduling.
export function respawnDelayS(def: PickupDef, rand: () => number): number {
  if (def.dropped || def.neverRespawn) return -1;
  let s = def.waitOverrideS !== undefined ? def.waitOverrideS : def.respawnS;
  if (def.jitterS > 0) {
    s = Math.max(1, s + rand() * def.jitterS); // rand() in [-1, 1); the fraction is kept
  }
  return s;
}

// Powerups add time to the stored value. A new timer starts on a whole second, so timers stay in step.
export function grantPowerup(p: Player, tag: string, nowMs: number, seconds: number): void {
  if (!p.powerups[tag]) {
    p.powerups[tag] = nowMs - (nowMs % 1000);
  }
  p.powerups[tag] += seconds * 1000;
}
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone item respawn: per-class seconds, jitter, never-respawn for dropped items).
- Parity-checklist row 23 (zone population: spawn caps, respawn, despawn with a grace timer). Respawn seconds are zone data fields; the scheduler is the engine's timer.
- Sub-finding for row 18 (loot roll and XP award), target `src/fight/loot.ts`: the grab predicate and the caps (refuse when full, client and server share one predicate). Not the primary row of this note.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one engine, one ledger: the predicate lives in one place); rule 8 (zone data for respawn); rules 7-9 n/a

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism.
- Defect 1, a 0 return skips the hide (g_items.c 479-481). `Pickup_Weapon` returns `g_weaponRespawn.integer` (272). With that cvar at 0, the effect (ammo, weapon bit) has already been applied, but `Touch_Item` returns before the item is hidden or scheduled. The item stays touchable, so each touch can grant again (checked by reading, not run). Fix: the never-respawn value must be an explicit flag (the donor's explicit never-respawn is `ent->wait == -1` at 514; line 551 treats any value <= 0 as never, so 0 from a pickup is ambiguous), and the item must always be consumed after its effect. The sketch does both.
- Defect 2, jitter is truncated to an int. `respawn` is declared `int` (g_items.c 427; the declaration line is tab-separated, so not quoted). `respawn += crandom() * ent->random` (529) adds a float and the result is stored in the int, so the fraction is cut. Jitter below one second is therefore lost on the positive side and biased down. This only matters for map entities that set `random` (528). Fix: keep the respawn as float seconds and clamp after the jitter. The sketch does this.
- The team weapon respawn is 30 s and the normal one is 5 s (g_main.c 145-146). These are cvars, not zone data. Frankendom should set them per zone (zone data).
- The predicate's client-and-server sharing (435-436) is the part most worth copying. The donor only does it for pickups.
- The powerup "denied" loop (69-114) runs a line-of-sight trace per nearby player on every powerup grab. It is cheap at 192 units but it is a per-pickup scan. Not copied.
- Mission-pack branches (persistent powerups, guard and scout caps) were not read and are not in this note.
- Frankendom has one ledger: a refused pickup must leave the item and the ledger unchanged. The donor's order (effect, then sound, then hide) would need to be checked against that rule before copying.
