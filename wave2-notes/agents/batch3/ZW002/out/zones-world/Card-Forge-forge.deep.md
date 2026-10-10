# Card-Forge-forge (zones-world, cell 2)

Donor: `/mnt/frankendom-donors/Card-Forge-forge/forge-game/src/main/java/forge/game/GameAction.java` (with `zone/Zone.java`, `zone/ZoneType.java`, `Game.java`) | Licence: GPL-3.0 (repo `LICENSE`: "GNU GENERAL PUBLIC LICENSE / Version 3, 29 June 2007") | Java | symbols `GameAction.moveTo` (756-808) and `GameAction.changeZone` (92-640), `GameAction.ceaseToExist` (969-1011)

Checked: Read end to end: `GameAction.java` 89-640 (changeZone), 756-852 (moveTo entry), 964-1012 (ceaseToExist), 2892-2924 (getLastState); `Zone.java` 86-130 and 160-180 (add, remove); `Game.java` 193-199, 214-262, 277-286 (last-state snapshot and LKI store); `ZoneType.java` 15-18 and 40-60 (enum values and constructor, read by excerpt; 14-41 also seen by excerpt). Grep only (callers, not read): `copyLastState` callers (`MagicStack` 620 and 670, `PhaseHandler` 1099, `Combat` 930 and 938, `Player` 1645, `GameState` 690, `GameSimulator` 206); `updateLastStateForCard` callers (`GameAction` 1633, several cost and effect files); `ZoneType.isHidden()` body (91). Not read: `ReplacementHandler.run`, `CardCopyService.getLKICopy`, `ChangeZoneEffect.java`, the callers of `ceaseToExist` (who calls it for tokens was not traced), the body of `Zone.add` after line 130, and the `Game.getChangeZoneLKIInfo` consumers. The hint file was INFERRED; I opened the real code in `GameAction.java` (the move path), `Zone.java`, `Game.java` and `ZoneType.java`. Confidence: high on the order of operations in changeZone (read in full); medium on whether this is a STRONG transferable mechanism, because the donor is a Magic: The Gathering rules engine and most branches are rule text (see section 6). camera_scope: n/a (not a camera cell).

## 1. Mechanism

- One entry point. The move path I read goes through `moveTo(zoneTo, c, ...)` (756-759), which dispatches on destination (774-781; a default branch calls `moveTo` for other zones), then to `changeZone` (808). `ceaseToExist` (969) is the path that removes a card without adding it anywhere. Other zone writes exist (for example `Zone.setCards` and `removeAllCards`, Zone.java 169-180) and were not traced.
- Order inside `changeZone` (92-640), as the code runs:
  1. Guards that return early. A copied spell, or an immutable card moving to exile, is only removed from its origin and returned (100-107). A card with no origin and not a token is added and returns, the dev path (110-116). A token that has left the battlefield cannot move again (123-127; the comment cites rule 111.8), but the guard has extra exemptions: it applies only when the card is not a spell, its origin is not the stack, and the cause test on permanent-spell, cast-face-down and cast-from-play causes passes (123-126). Instants and sorceries cannot enter the battlefield (131-133). Attractions and contraptions moving anywhere other than the battlefield, exile or the command zone go to the junkyard instead (140-146).
  2. Last-known information (LKI). The last-state battlefield and graveyard are looked up (135-136). When the card leaves the battlefield, its LKI is the snapshot entry for that card if one exists (185-187), else, when the origin is the graveyard, the matching entry in the last-state graveyard (190-195), else a fresh copy of the card now (197-198). When leaving the battlefield for a zone other than the stack or flashback, the LKI is registered with the game (203-205).
  3. Build the destination object (207-272). A new copy of the card is made. If the destination is the stack, cast information is carried over (211-246). If the destination is not the stack, the copy is reset to its original face (247-251, the code at 249). Counters are copied only when `countersRemain` allows (254-256).
  4. Aura attach check (281-303): an aura with no legal object goes back where it was.
  5. Replacement pass (318-369). The move's parameters carry the LKI, origin, destination and cause (319-331). `ReplacementType.Moved` runs (338). If the result is not NotReplaced or Updated, the move stops. A prevented move returns (347-357), and a card still on the stack goes to the graveyard unless that was the target (358-360). Any other replaced result returns the card (368).
  6. Remove from the origin (434-450). Combat saves the LKI and removes the card from combat when it leaves the battlefield (435-440). `zoneFrom.remove(c)` runs at 450.
  7. Add to the destination (535; the merged-permanent branch at 518-521 is the other add). `Zone.add` records entered-from bookkeeping when the zone differs and a latest state is given (Zone.java 121-127).
  8. Leave-battlefield bookkeeping (539-549): the LKI is recorded as left this turn, the card is unattached, leave-play commands run (543), and a tapped card is untapped (545-548).
  9. Static abilities are rechecked and enter-the-battlefield counters are placed (561-576).
  10. For battlefield entries, the copy's LKI is saved to the zone (579-580).
  11. The change-zone event is fired (596). Then the `ChangesZone` trigger runs with `CardLKI`, origin and destination (601-612). If the controller changed, `ChangesController` runs with the LKI (615-622).
- Tokens that leave play. `ceaseToExist` (969-1011) removes the card from its origin (977), sets its zone to none (978), and runs leave-play commands if it left the battlefield (979-981). With `skipTrig` false, it takes the LKI from the game's last-state battlefield (986-992; else a copy now, 993), registers the LKI (995), and, if the card was in play and not phased out (997), removes it from combat (998-1000) and runs `ChangesZone` with the LKI and origin (1006-1009). Nothing re-adds it, so the token is gone.
- Snapshots. `Game.copyLastState()` (220-228) rebuilds the last-state battlefield and graveyard as LKI copies of every player's cards. It is called at checkpoints (callers grepped: `MagicStack`, `PhaseHandler`, `Combat`, `Player`, `GameState`). `updateLastStateForCard(c)` (247-261) removes one card from the snapshot and adds a fresh LKI copy, called after an effect changes it (callers grepped: the counter effects and `GameAction` 1633).
- Tick. There is no per-frame loop in this path. Each move is synchronous and runs to completion before the next, and triggers run inside the same call.

## 2. Key functions

- `GameAction.moveTo(Zone zoneTo, Card c, SpellAbility cause, Map params)`: `/mnt/frankendom-donors/Card-Forge-forge/forge-game/src/main/java/forge/game/GameAction.java` 756-759 (entry), 797-808 (the private overload that calls changeZone).
- `GameAction.changeZone(...)`: same file, 92-640. The whole pipeline in section 1.
- `GameAction.ceaseToExist(Card c, boolean skipTrig)`: same file, 969-1011.
- `GameAction.getLastState(...)`: same file, 2892-2924. Lookup order: the params, then the cause, then the game's snapshot (a fresh copy instead when `refreshIfEmpty` is set).
- `Zone.add(...)` and `Zone.remove(...)`: `/mnt/frankendom-donors/Card-Forge-forge/forge-game/src/main/java/forge/game/zone/Zone.java` 97-130 (entered-from bookkeeping), 162-167 (remove and event).
- `Game.copyLastState()` and `Game.updateLastStateForCard(c)`: `/mnt/frankendom-donors/Card-Forge-forge/forge-game/src/main/java/forge/game/Game.java` 220-228 and 247-261.

## 3. Numbers vs mechanism

This donor has no tuning numbers on the move path. Its constants are zone properties and rule flags:

| Reusable algorithm | Donor constants |
|---|---|
| One transfer function for every move | `moveTo` to `changeZone` (756, 808) |
| Capture the state at the moment of leaving, before removal | LKI for leaving the battlefield: snapshot entry, else a copy (185-187, 198) |
| Replacement pass before the move; prevent or redirect | `ReplacementType.Moved` (338); prevented branch (347-360) |
| Remove, then add, then event, then triggers | Order at 450, 535, 596, 612 |
| Token cannot move after it leaves play | Rule 111.8 guard (123-127) |
| Leaving play resets the object to its original face | Original state (249) |
| Zone hidden-information flag (per zone) | `holdsHiddenInfo` set per enum value: Hand true (ZoneType.java 15), Library true, Battlefield false (18); field at 43, constructor 47-54 |
| Snapshot cadence | Checkpoints call `copyLastState` (MagicStack 620, Combat 930, and others) |

## 4. TypeScript sketch

simplified: the sketch keeps the order (LKI first, replacement pass, remove, copy-and-add, event, triggers last), the token rule that a token outside the arena cannot move, the LKI choice (checkpoint snapshot when leaving the arena, else a copy now), the reset of buffs on leaving the arena as a stand-in for the donor's face reset, and the ceaseToExist path with its trigger only for arena entities. It omits: the graveyard branch of the LKI lookup (190-195), the token guard's extra exemptions (123-126), the stack, junkyard, aura, merged-permanent, commander, face-down, counters, stickers, perpetual, and "entered this turn" bookkeeping; the combat removal and leave-play commands; the controller-change trigger; the static-ability refresh; the event bus (events are a plain array); and the copy of the whole snapshot at checkpoints (the sketch keeps one snapshot per entity). Replacements here return a plain verdict, not the donor's full ReplacementResult set.

```ts
// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type ZoneName = "arena" | "downed" | "bank" | "bag" | "out" | "none";

export interface Entity {
  id: number;
  zone: ZoneName;      // "none" = ceased to exist
  isToken: boolean;
  hp: number;
  buffs: number;
}

export interface Snapshot { id: number; zone: ZoneName; hp: number; buffs: number; }

export interface Move {
  entity: Entity;      // the object now in the destination zone
  from: ZoneName;
  to: ZoneName;
  lki: Snapshot;       // state the entity had when it left; leave and death triggers read this
  cause: string;
}

// "keep": let the move go on. "prevent": nothing moves. "handled": a replacement moved the entity itself.
export type Replacement = (m: Move) => "keep" | "prevent" | "handled";

export interface World {
  zones: Record<ZoneName, Set<number>>;
  entities: Map<number, Entity>;
  lastState: Map<number, Snapshot>; // refreshed at checkpoints; read when an entity leaves the arena
  replacements: Replacement[];
  events: Move[];
  onChangesZone: (m: Move) => void; // leave/death triggers run after the move, given the LKI
}

const snap = (e: Entity): Snapshot => ({ id: e.id, zone: e.zone, hp: e.hp, buffs: e.buffs });

// the one transfer path: LKI first, replacements, remove, add, event, triggers last
export function moveEntity(w: World, id: number, to: ZoneName, cause: string): Entity | undefined {
  const e = w.entities.get(id);
  if (!e) return undefined;
  const from = e.zone;

  // a token that has left the arena cannot move again (donor rule 111.8, simplified)
  if (e.isToken && from !== "arena" && from !== "none") return e;

  // last-known information: the checkpoint snapshot when leaving the arena, otherwise a copy now
  let lki: Snapshot = snap(e);
  if (from === "arena") {
    const saved = w.lastState.get(id);
    if (saved !== undefined) lki = saved;
  }

  const m: Move = { entity: e, from, to, lki, cause };
  for (const r of w.replacements) {
    if (r(m) !== "keep") return e;
  }

  // remove from the origin zone
  w.zones[from].delete(id);

  // the entity that enters the new zone is a copy; leaving the arena resets buffs
  const copy: Entity = { ...e, zone: to, buffs: to === "arena" ? e.buffs : 0 };
  w.entities.set(id, copy);
  w.zones[to].add(id);

  const done: Move = { entity: copy, from, to, lki, cause };
  w.events.push(done);   // event after the move
  w.onChangesZone(done); // triggers last, with the LKI
  return copy;
}

// tokens that leave the arena are removed; a leave trigger still sees the LKI
export function ceaseToExist(w: World, id: number, cause: string): void {
  const e = w.entities.get(id);
  if (!e) return;
  const origin = e.zone;
  w.zones[origin].delete(id);
  e.zone = "none";
  if (origin === "arena") {
    const lki = w.lastState.get(id) ?? snap(e);
    w.onChangesZone({ entity: e, from: origin, to: "none", lki, cause });
  }
  w.entities.delete(id);
}
```

The sketch typechecks: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/ZW002-cardforge-zone-transfer.ts`, with `export {}` appended).

## 5. Lands in

- TARGET `src/fight/transfer.ts` (new module: the one path that moves a fighter, a summon or a loot item between zones; the engine owns it, the arena and bank are data). Parity-checklist row 17 (death/respawn): the LKI snapshot is what a death trigger reads. Loot and XP on death remain row 18.
- today: no single transfer path read in this donor pass; Frankendom's own death and zone code was not read here.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: one ledger (every move goes through one function); server-verified kills (the death trigger reads a server-held snapshot)
- Best transferable idea: route every move between zones through one function that captures the leaving entity's state first, runs a replacement pass, then removes, adds, fires the event and runs triggers last with the captured state.
- Decision (proposed): adapt — take the single move path with the LKI captured before removal and the replacement pass before the move, and the rule that a summon leaving the arena is removed; reject the Magic-specific branches (auras, stack copies, commanders, merged permanents, junkyard, face-down) and the whole-zone snapshot copy at each checkpoint (too costly for a browser MMO; capture only the entity that moves).
- Acceptance: a server test where a fighter killed in the arena moves to `out` once, and its death trigger (loot roll, XP) reads hp and buffs as they were at the moment of death, not the post-move copy; a summon that leaves the arena is removed and its id appears in no zone afterwards.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism; donor names are not carried over.
- Most of this donor is Magic rule text. Lines 100-146 and 281-303 and the merged-permanent block (398-432) encode Magic-specific rules; they do not transfer. Only the shape (guard, LKI, replacement, move, event, trigger) is in scope.
- Whole-zone snapshots. `Game.copyLastState` (220-228) copies every player's battlefield and graveyard at each checkpoint. A browser MMO should capture only the entity that moves; the sketch does that. The cost of the donor approach is not measured here.
- Replacement pass. The donor's `ReplacementHandler.run` (338) was not read, so its ordering among multiple replacements is unknown. The sketch takes a plain list in array order.
- Frankendom's MAX_ATTACKERS = 3 and engage-as-state-change are not addressed by this path. The move path does not decide who may attack; the fight engine must still gate that.
- The `ChangesZone` trigger in the donor fires after the move, so a death trigger sees the new zone. Frankendom must pass the LKI, not a live read, to any death or loot code that runs after a move; the sketch does this.
- Tokens: the donor's token rule (111.8) is a Magic rule. In Frankendom, a summon that leaves the arena should be removed, not kept in a no-move state; the sketch removes it via ceaseToExist.
- Who calls `ceaseToExist` for tokens was not traced, so the claim that tokens are removed through it in play is partly inferred from the function body.
- Snapshotting is wider than the checkpoint callers listed in section 1: `Game.copyLastStateBattlefield()` and `copyLastStateGraveyard()` (Game.java 239-244) are also called by cost parts (CostPartWithList 130-131), Dig, DigUntil, Discover, Seek, Token, Counter and Attach effects, SpellAbilityEffect 865-866 and GameAction 2910 and 2917, so the donor snapshots on most effect paths, not only at checkpoints.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: one ledger (single move path); server-verified kills (death trigger reads the captured state)

## Checker findings

- Verdict: MINOR
- Corrected: LKI lookup now states the last-state graveyard branch (190-195) before the fresh LKI copy; the simplified-omissions list names it; token guard (123-127) now states its extra exemptions (not a spell, origin not the stack, cause test) instead of a flat rule; the sketch's flat rule is stated as a simplification
- Missed (also added to section 6): copyLastStateBattlefield/copyLastStateGraveyard callers (cost parts, Dig, DigUntil, Discover, Seek, Token, Counter, Attach effects, GameAction 2910/2917) make snapshotting wider than the checkpoint list
