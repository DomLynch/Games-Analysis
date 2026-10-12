# veloren-veloren (death-respawn-penalty, cell 2)

Donor: `/mnt/frankendom-donors/veloren-veloren/common/systems/src/stats.rs` (entry point), with `common/src/comp/health.rs`, `common/src/interaction.rs`, `common/src/states/interact.rs`, `server/src/events/entity_manipulation.rs`, `common/src/comp/inventory/mod.rs` and `loadout.rs`, `server/src/events/player.rs` | Licence: GNU GPL version 3 (`LICENSE`, line 2 "Version 3, 29 June 2007"; copyleft, clean-room only) | Rust | symbol `death_protection` / `consume_death_protection` / `can_help_downed`

Checked: Read in full: `common/systems/src/stats.rs` death check (71-78), `common/src/comp/health.rs` revive/consume/refresh (208-230), `common/src/interaction.rs` `can_help_downed` (66-71), the HelpDowned durations and movement factor in `common/src/states/interact.rs` (242-251), the `DestroyEvent` handler at 578-600 and 680-700, the exp and loot block (1138-1260), the should-delete and durability block (1228-1356), and `RespawnEvent` (1511-1550). Lines 600-680 of the handler were not read. Read in part: `common/src/comp/inventory/loadout.rs` and `inventory/mod.rs` durability (491-530, 1200-1220), the exp awards (1084-1200), `lottery.rs` `distribute_many` (84-200; the give/clamp arithmetic was read but not checked case by case). Not read: the `Crawl` character state file body and any timeout or regeneration while crawling; the interact-state stage check that decides when `HelpDownedEvent` fires (only the emit site, 156, was read); the `areas_container` kind (what a protected area is); `handle_exp_gain` (473-). Confidence: high on the downed/help/respawn path (read end to end); medium on the durability limiter (read, not traced through a live test). Not run: any game or test.

Best transferable idea: a lethal hit on a humanoid first drops the hero to Downed at 1 HP while a single protection flag is armed, and an ally within 5 units can revive the hero in a timed interaction, so a many-on-one fight has a recoverable middle state before real death.

Decision (proposed): adapt — keep the Downed-at-1-HP state and the timed ally revive for zone and group fights (not for duels), and cap the number of downs per fight, which the donor does not do.
Acceptance: In a 3-on-1 zone fight (MAX_ATTACKERS = 3), the hero at 0 HP goes to Downed at 1 HP and crawls; an ally within 5 units completes a 5 s help (0.5 + 4.0 + 0.5 s) at 10 percent move speed and the hero stands at 1 HP; a second lethal hit after the help goes to Downed again, and a third (after the cap) goes to dead; a server test asserts the cap and the 5-unit range.

## 1. Mechanism

- Order of steps on a lethal hit. The health system runs `should_die()` (current health is 0) and `!is_dead` (`stats.rs` 71). If `health.death_protection` is armed, it emits `DownedEvent` (74-75); otherwise it emits `DestroyEvent` (77-78). So the protection flag is checked before any death work.
- Downed (`DownedEvent` handler, `entity_manipulation.rs`, from the `impl ServerEvent for DownedEvent` block near line 396): it calls `consume_death_protection()` (which disarms the flag and, if current health is below 1, sets it to 1.0; `health.rs` 214-218), sets the character state to `Crawl`, and removes buffs that are not tagged `PersistOnDowned`. The hero is alive, not dead; `is_dead` is never set on this path.
- Protection is armed on creation and on revive only for bodies that can have it. `has_death_protection` is true for `Body::Humanoid` only (`body/mod.rs` 973). The constructor copies it into both `can_have_death_protection` and `death_protection` (`health.rs` 137, 151-152; read by grep, not in full).
- Help (`interaction.rs` 66-71): a helper can help when the target's protection has been consumed (`has_consumed_death_protection`: can have it and the flag is off) and the squared distance is at most `MAX_INTERACT_RANGE` squared (5.0, `consts.rs` 7). The interaction is a state with a movement factor of 0.1 for the helper (`states/interact.rs` 242) and durations (0.5 s, 4.0 s, 0.5 s) (249-251; the tuple field names were not read, the order is taken as windup, action, recovery). Inside the block that checks the required item, the interact state emits `HelpDownedEvent` with the target and the helper's uid (156-158; the stage that reaches this block was not read).
- `HelpDownedEvent` (`entity_manipulation.rs` from line 361): it calls `refresh_death_protection()` (which arms the flag again when the body can have it; `health.rs` 223-226). If the target is in `Crawl`, its state becomes `Idle` (the target stands up). Health is not changed here, so the hero stands at the 1 HP left by the downing.
- Death when protection is spent: when health reaches 0 again with the flag off, `stats.rs` emits `DestroyEvent` (77-78).
- Destroy path (`impl ServerEvent for DestroyEvent`, 578): `is_dead` is set; player entities are never deleted on this path (`should_delete &= if data.clients.contains(ev.entity)`, 1228, which sets it false for clients). NPC entities take the loot branch (1253-1257): experience goes to attackers within `MAX_EXP_DIST` (1145, 150.0), group members split by `contributor_exp / sqrt(members)` (1198), and self or player-versus-player kills award nothing (1160). Loot is distributed to receivers by weight (`lottery.rs` `distribute_many`, 84-153). Player corpses have no loot. That is the PvP death tier: a player killed by a player gives no exp and no loot, while the durability step below still applies.
- Durability on death (1338-1356): unless the hero is inside one of the server's `areas` (`resists_durability`, 1339-1350; kind not read), `inventory.damage_items` runs. In `common/src/comp/inventory/mod.rs` 1200-1220: every loadout item with durability takes one step (`loadout.rs` 491-500; `mod.rs` 1206), then recently-unequipped entries are culled (1207), then each inventory item whose definition is in the recently-unequipped map with count above 0 takes one step and the count goes down by one (1209-1220; `mod.rs` 1220). The map is filled when an item is swapped out (`loadout.rs` 113 and 127: a count of 1 is added per unequip, and equipping decrements it), and entries expire after `UNEQUIP_TRACKING_DURATION` = 60 s (17, 529). Effect: taking gear off just before a death does not avoid its durability loss.
- Respawn (`RespawnEvent`, 1511-1550): hardcore characters cannot respawn (1541). For others, health is revived to maximum (1548; `health.rs` 208-211 also re-arms protection), the hero moves to the waypoint or the spawn point (1543-1550). Hardcore characters that are dead are deleted instead of persisted (`server/src/events/player.rs` 336-342).

## 2. Key functions

- The death switch: `/mnt/frankendom-donors/veloren-veloren/common/systems/src/stats.rs` 71-78.
- Protection state: `/mnt/frankendom-donors/veloren-veloren/common/src/comp/health.rs` 208-230 (revive, consume, refresh, has_consumed).
- Help gate: `/mnt/frankendom-donors/veloren-veloren/common/src/interaction.rs` 66-71. Help timing: `/mnt/frankendom-donors/veloren-veloren/common/src/states/interact.rs` 156-158 and 242-251.
- Destroy handler (loot, exp, durability): `/mnt/frankendom-donors/veloren-veloren/server/src/events/entity_manipulation.rs` 578-1395 (read 578-700, 1138-1260, 1253-1260 and 1295-1360 in part).
- Durability: `/mnt/frankendom-donors/veloren-veloren/common/src/comp/inventory/mod.rs` 1200-1220 and `loadout.rs` 17, 113-127, 491-530.
- Respawn: `/mnt/frankendom-donors/veloren-veloren/server/src/events/entity_manipulation.rs` 1511-1550.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Lethal hit with a protection flag armed becomes a downed state at 1 HP, flag spent | Hp floor 1.0 on downing (theirs, health.rs 218) |
| Only a downed target (flag spent, body allowed) can be helped, within range | Range 5.0 squared (theirs, consts.rs 7; interaction.rs 71) |
| Helper is slowed while helping | Helper movement factor 0.1 (theirs, interact.rs 242) |
| Help takes a windup, a hold and a recovery | 0.5 s, 4.0 s, 0.5 s (theirs, interact.rs 249-251) |
| Help re-arms the flag (no cap in the donor) | none (the refresh at health.rs 225 has no counter) |
| Death protection applies to one body class | Humanoid only (theirs, body/mod.rs 973) |
| Durability step on death for equipped gear, plus recently-unequipped bag items | Window 60 s (theirs, loadout.rs 17); one step per item (mod.rs 1220) |
| Experience to attackers in range, split by square root of group size | Range 150.0 (theirs, entity_manipulation.rs 1145); sqrt split (1198) |

## 4. TypeScript sketch

simplified: the sketch models the death decision as one function `onLethal` (the donor splits it between `stats.rs` and the `DownedEvent` handler), the help as a check plus a completion that re-arms (the donor's hold timing and the stage check are not modelled; the event is assumed to fire after the 4.0 s action), respawn as a full revive, and the durability limiter as one function with a protected-area flag. It omits the Crawl state and its buffs, the exp awards, the loot distribution, the hardcore deletion, the waypoint choice, and the `CharacterState` changes. It adds one thing the donor does not have: nothing in the sketch caps the number of downs, so the cap from section 6 must be added by the caller.

```ts
// Licence: GNU GPL version 3 (donor, copyleft). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Vital { hp: number; max: number; armed: boolean; canBeArmed: boolean; }

type Outcome = "alive" | "downed" | "dead";

// A lethal hit: while protection is armed the hero is Downed at 1 HP, not dead.
// Once protection is spent (or never existed), the next lethal hit kills.
function onLethal(v: Vital): Outcome {
  if (v.hp > 0) return "alive";
  if (v.armed) {
    v.armed = false;
    v.hp = 1;
    return "downed";
  }
  return "dead";
}

const HELP_RANGE = 5.0;        // world units, squared-distance check
const HELP_WINDUP_S = 0.5;     // donor durations tuple, first field
const HELP_ACTION_S = 4.0;     // donor durations tuple, second field
const HELP_RECOVERY_S = 0.5;   // donor durations tuple, third field
const HELPER_MOVE_FACTOR = 0.1;

// Only a downed hero (protection spent, body can have it) can be helped, and only in range.
function canHelp(target: Vital, distance: number): boolean {
  return distance <= HELP_RANGE && target.canBeArmed && !target.armed;
}

// Assumes the help event fires after the action phase (the donor stage check was not read).
// The helped hero is re-armed at 1 HP; nothing caps how often this repeats.
function completeHelp(target: Vital): void {
  if (target.canBeArmed) target.armed = true;
}

// Respawn at a waypoint: full HP and protection re-armed for bodies that can have it.
function respawn(v: Vital): void {
  v.hp = v.max;
  v.armed = v.canBeArmed;
}

interface Item { id: string; durabilityLost: number; maxDurability: number; }
interface Tracked { t: number; count: number; }

const UNEQUIP_WINDOW_S = 60;

// On death (not a safe area): every equipped item takes one step; a bag item takes a step
// only while its definition is tracked as recently unequipped with count > 0.
function durabilityOnDeath(
  equipped: Item[],
  bag: Item[],
  recent: Map<string, Tracked>,
  now: number,
  protectedArea: boolean,
): void {
  if (protectedArea) return;
  for (const it of equipped) {
    if (it.durabilityLost < it.maxDurability) it.durabilityLost += 1;
  }
  for (const [id, e] of recent) {
    if (!(now - e.t < UNEQUIP_WINDOW_S && e.count > 0)) recent.delete(id);
  }
  for (const it of bag) {
    const e = recent.get(it.id);
    if (e && e.count > 0 && it.durabilityLost < it.maxDurability) {
      e.count -= 1;
      it.durabilityLost += 1;
    }
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/dr002-veloren-downed-revive.ts`, copy in `work/veloren-downed-revive.ts`).

## 5. Lands in

- TARGET `src/fight/death.ts` (new module; the engine's lethal-hit step and the downed state). Parity-checklist row 17 (death/respawn). The help timing belongs to the interact input of row 5 (controls/input) only for the button hold; the state itself is row 17.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: rule 1 (one engine: the downed state lives in the engine, not in the client), rule 3 (guard and stamina are separate and not touched), rule 8 (section 5 names a module and a row); 7-9 n/a

## 6. Gaps and risks

- No cap on downs. `refresh_death_protection` (health.rs 223-226) re-arms the flag every time help completes, and nothing counts downs. A hero can be downed, helped and downed again forever in one fight. Fix: keep a down count per fight (server-side, in the one ledger), allow N downs (suggested default 1 per fight in zones, 0 in the Pit), and send the third lethal hit to dead.
- Downed heroes stay at 1 HP in Crawl. Whether they regenerate or time out is not read. Frankendom needs a bleed-out rule with a number (a data field), not an open timer.
- Helping is a timed input. The 4.0 s action is long in a 3-on-1 fight, so the hold length should be a data field per zone, and the Pit should not use the help state at all (not decided here).
- Only humanoid bodies have protection in the donor, so non-humanoid enemies never down. Whether Frankendom wants that is a design choice; a per-body data flag would make it explicit.
- Durability on death applies in PvP too (the same code path, no PvP check, 1338-1356). Frankendom's open PvP flag must decide whether the death durability step applies to a flagged kill; this donor does not separate it.
- Player versus player: no experience and no loot (1160, 1253). Frankendom's PvP-flag death tiers need a decision on loot; this is a shape, not a rule.
- The durability limiter (mod.rs 1206-1220) is clever but depends on a 60 s memory of unequip events in a map keyed by item definition. It is server-side in the donor but the map is in the component, so it persists with the character only if the component is saved (not read).
- Hardcore deletes the character (player.rs 336-342). Frankendom has one character per ledger entry; a permadeath mode is a separate data flag, not a second death code path.
- GPL-3.0: this note describes the shape only. The sketch was written from the mechanism; no line of the donor is copied.
