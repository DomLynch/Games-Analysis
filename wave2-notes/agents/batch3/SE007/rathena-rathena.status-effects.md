# rathena-rathena (status-effects, feel note)

Donor: `/mnt/frankendom-donors/rathena-rathena` (VPS, read only). Licence: GNU GPL v3 (LICENSE line 1; README.md line 81; db/re/status.yml header, lines 1-17, rAthena Development Team). Code is C++ server; the data is YAML. Shape only, clean-room: no donor numbers, names or stat blocks are carried over. Not legal advice.

Checked: Read in full the resistance function `status_get_sc_def` (status.cpp 9620-9972), the start path `status_change_start` (10152-10240) and `status_change_start_post_delay` (10310-10750, the existing-status branch at 10749-10763), the apply and end code (13190-13216, 14116), the per-tick timers (14237-14260), the state restriction (5510-5640, Fear at 5623), the damage removal rule (1560-1590), knockback `skill_blown` (skill.cpp 2219-2271), and the status.yml entries for Freeze, Stun, Sleep, Bleeding and Fear. 48 receipts in rathena-rathena.receipts.tsv verified by verify_receipts.py. Confidence high on the resistance pipeline, the fail list and the apply/refresh path. Verdict: STRONG.

Best transferable idea: one status slot per type per target, with a data-chosen refresh or block rule, is what stops three attackers from stacking the same bleed on one target.

## 1. What the player sees and feels

- A timed status shows as one icon on the target, and each status can name its own icon in the data (Bleeding names a blood icon). On a 375 wide screen the player reads a single chip, not a stack of them.
- Stun locks the target in place and stops its attacks and casts. The lock holds through hits, so the player learns that a stunned foe is a free window.
- Freeze also locks, but it shatters on the first hit. The player feels one decisive blow land, and a second blow means nothing more is held.
- Bleed is a slow chip rather than a burst: a damage tick every few seconds, each tick a random amount inside a band. It also stops the target from regenerating while it runs.
- Fear makes the target stop walking and lowers its hit and raises its flee. Fear also clears Blind when it lands, so the target is not both blinded and feared.
- Stone is two beats. First a warning stage runs for its delay. Then the Stone status starts and drains the target toward a quarter of its health (status.cpp 14238). The warning is the telegraph; the drain is the payoff. Whether Stone also locks movement is in its status.yml entry (line 49), which I did not read.

## 2. Why it works and is striking

- Readable at 375 wide: a small set of statuses, each with a distinct lock shape. A lock that breaks on damage (Freeze) reads different from one that holds (Stun), and the difference is data, not code.
- One signature behaviour: the fail list. Freeze fails while Stun, Stone, Sleep or Burning is active, so hard locks cannot chain. Stun fails while Stun is active, so a stun cannot be re-stacked on a stunned foe. Bleed does not fail on itself; it refreshes.
- Signature sound and effect: not in the box. The client half is not in the donor tree and db/ has no audio. The effect cues are not read.
- Could be made ours at 20 to 30 percent resemblance: yes. The resistance-then-duration ladder and the fail list are ordinary designs; the ordering and the refresh-or-block choice are what we keep.

## 3. The rule behind it

Order of operations, as the code runs in `status_change_start`:

1. Gates first: dead targets (except a few statuses), map-disabled statuses, and boss or MVP immunity flags (status.cpp 10193, 10197).
2. End-and-return list: if a status listed in the definition is active, end it and return success without applying the new status (the cleanse-instead rule).
3. Fail list: if any listed status is active on the target, refuse. The check runs before any roll (status.cpp 10222).
4. Resistance (`status_get_sc_def`, called at 10229). Each status picks one resist stat (Bleed and Stun use VIT; Fear uses INT plus level plus LUK; Freeze uses MDEF; Curse uses LUK). The formula, in order:
   - percent resist from that stat applied to chance (status.cpp 9930);
   - a fixed resist term subtracted from chance after the percent (9931);
   - a chance floor from the status definition (9948);
   - an item resist table reduces chance once more, after the fixed term (9933-9937, the loop body not receipted);
   - the roll itself, skipped when chance is already 100 percent (9950).
   - A status-resist status adds to the percent term (9901). PC and mob resist caps are separate config values, both defaulting to 100 (battle.cpp 8606-8607).
   - Before all of this, a target with the Golden Thief Bug card or Wand of Hermod effect blocks magic-type skills (status.cpp 9637, inside the resist function).
   - Duration then takes two cuts: a percent cut from the same stat (9957) and a fixed term subtracted last (9969). The fixed term can be negative: Fear's is negative, so Fear adds a fixed amount of time (9806). A floor from the status definition stops the result going to zero (9971).
   - Monsters get a different branch: poison duration is halved and the poison resist term is its own shape (9673-9674). We do not copy that; we keep one formula with a boss flag.
5. Pre-delay stage (type specific): Stone-Wait runs for the delay as its warning, and the petrify time is stored as the remainder (status.cpp 10250-10252). When that warning timer expires, the Stone status starts by itself (14116).
6. Apply. If the status already exists, its timer is deleted and restarted, and the values are overwritten (13203-13209). That is refresh. Some statuses instead keep the higher value and reject a weaker reapply (10763).
7. Ticks: damage-over-time statuses run on their own intervals from a per-status table (status.cpp 9571-9594). Poison stops ticking once the target is at a quarter of max health (14250). Stone drains to a quarter (14238). Bleed deals a random damage in a band (14257), and for non-players it can never kill: damage is capped at health minus one (14258-14259).
8. RemoveOnDamaged: any damage removes the statuses flagged that way (status.cpp 1573). Freeze and Sleep carry the flag (status.yml 117 for Freeze). Stun does not.
9. Knockback (`skill_blown`, skill.cpp 2219): first an immunity reason check, where a boss attack sets a flag that is passed into that check (2238); then a status that cancels on any knockback is ended (2259 onward), and a root status stops the move (2267); then the move is handed to the unit-blown routine (2271).

Data fields (designer-tunable; donor values are null because the donor is GPL and the source game is not named):

simplified: the sketch omits the item-resist table, the boss and MVP gates, the end-and-return list, the damage-over-time ticks and the stone-wait stage. Its order of percent resist, fixed resist, floor, roll, percent duration cut, fixed duration term and duration floor follows the donor. No donor numbers are used.

```ts
type Stat = "vit" | "agi" | "int" | "mdef" | "luk";

interface StatusDef {
  id: string;
  resistStat: Stat;               // which stat resists this status
  resistPctPerPoint: number;      // percent of chance removed per stat point
  resistFixedBonusPct: number;    // percent points removed from chance after the percent term
  chanceFloorPct: number;         // minimum chance after resist
  durationCutPctPerPoint: number; // percent of duration removed per stat point
  durationFixedMs: number;        // ms removed last; negative adds time
  durationFloorMs: number;        // minimum duration in ms
  failList: string[];             // ids that block this status while active (a self id blocks re-application)
  reapply: "refresh" | "keep_higher";
}

interface Active { val1: number; expiresAt: number; }

interface Target {
  stats: Record<Stat, number>;
  active: Map<string, Active>;
}

// Returns the applied duration in ms, or 0 when the status does not land.
export function resolveStatus(
  t: Target,
  def: StatusDef,
  chancePct: number,
  durationMs: number,
  roll: () => number // 0..100
): number {
  if (def.failList.some((id) => t.active.has(id))) return 0;

  const s = t.stats[def.resistStat];
  let chance = chancePct * (1 - (s * def.resistPctPerPoint) / 100);
  chance -= def.resistFixedBonusPct;
  chance = Math.max(chance, def.chanceFloorPct);
  if (chance <= 0 || roll() >= chance) return 0;

  let d = durationMs * (1 - (s * def.durationCutPctPerPoint) / 100);
  d -= def.durationFixedMs;
  return Math.max(d, def.durationFloorMs);
}

// Applies or refreshes a status at time now. Returns false when a keep_higher status is stronger.
export function applyStatus(
  t: Target,
  def: StatusDef,
  val1: number,
  durationMs: number,
  now: number
): boolean {
  const cur = t.active.get(def.id);
  if (cur !== undefined && def.reapply === "keep_higher" && cur.val1 > val1) return false;
  t.active.set(def.id, { val1, expiresAt: now + durationMs });
  return true;
}

export {};
```

Typecheck: the block above was run through `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS and printed TSC_OK (file /tmp/se007-rathena-status.ts on the VPS).

| field | unit | donor value |
|---|---|---|
| resistStat | enum (vit, agi, int, mdef, luk) | null |
| resistPctPerPoint | percent of chance per stat point | null |
| resistFixedBonusPct | percent points | null |
| chanceFloorPct | percent | null |
| durationCutPctPerPoint | percent of duration per stat point | null |
| durationFixedMs | ms (negative adds time) | null |
| durationFloorMs | ms | null |
| failList | status ids | null |
| reapply | enum (refresh, keep_higher) | null |
| tickIntervalMs (per DoT) | ms | null |
| dotStopAtHpPct | percent of max HP | null |
| warnDelayMs (stone-wait stage) | ms | null |
| bossImmune / mvpImmune | bool | null |

Donor counts (grep -c on db/re/status.yml, not in receipts): 1,018 status entries, 17 with RemoveOnDamaged, 67 with BossResist, 122 Fail blocks, 167 EndOnStart blocks, 6 EndReturn blocks.

## 4. For Frankendom

- Ruling mapping: the status ledger belongs in the engine (src/fight), one ledger per target. Expiry and damage-over-time ticks run inside the fixed server step, not as one client timer per status. The client only draws the icon and the lock shape. Parity row 1 (duel step/sim) is the row this lands on.
- Many-versus-one is where this matters most. With MAX_ATTACKERS = 3, three attackers can each apply Bleed. One slot per status type per target, with the refresh rule, means the count stays one. Keep that. Do not let each attacker own a separate bleed.
- Keep: the fail list (no chained hard locks), the choice between refresh and block set in data, the resist pipeline order, the stone-wait warning as a readable beat, and the difference between a lock that holds (Stun) and one that breaks on damage (Freeze).
- Change: the resist stat per status is ours to set, not the donor's stat mapping. One formula for players and monsters, with a boss flag; we do not keep the donor's split (monster poison halved, separate resist term). No Fear that ends Blind unless the design wants it.
- Boss rule: a boss flag that makes a status fail is a data field, so a boss can resist Stun and still feel Bleed. That is the boss-elite pattern in one line.

## 5. Five-minute look test (Dom on his phone)

Target file: src/fight/status.ts (new module, one ledger per target). Parity row 1 (duel step/sim).

Build on the existing duel stub three statuses: a Stun that holds through hits for a few seconds, a Freeze that breaks on the first hit, and a Bleed that ticks slowly and refreshes instead of stacking. Dom hits the stub three times quickly on a 375 wide phone.

Pass when: he sees one Bleed icon with one timer, the Freeze shatters on the first hit, the Stun holds through all three, and he can name which lock is which from the icon and the shape of the lock alone. Compare against a build where Bleed stacks per attacker; the difference should be visible in one glance.

## 6. Licence and IP

Code: GNU GPL v3 (LICENSE line 1). Data: db/re/status.yml carries a GPL v3 header (lines 1-17). The game whose content the data describes is not named in the files, so origin of values is unclear. Under the GPL rule we take shape only. Status names here are our own; the donor's status ids and numbers are not copied. Restore the trait kept (fail list, refresh or block, resist then duration ladder) and the trait changed (stat mapping, tick counts, names, icons).

## 7. Gaps

Read: server half (status.cpp, skill.cpp 2219-2271, battle.cpp config line 8606) and data half (db/re/status.yml entries for Freeze, Stun, Sleep, Bleeding, Fear; counts by grep).

Not read (inside the server half): the body of `status_change_end` (13430 onward), `status_change_timer_sub` (15234), the full sc_type enum (status.hpp 233-1450, counted nowhere), `status_calc_state` beyond the Fear case, the skills that apply each status (skill.cpp 1323 and 3839-3851 seen by grep only), `unit_blown` step rules, and the regen body under 5405-5411.

Not read (data): db/re/skill_db.yml durations, and the status.yml entries for Stone, Poison, Curse, Blind, Confusion, Silence and the others.

Not in the box: the client half (no client and no audio or art in db/). The client presentation of icons and locks is unverified; the look test above is our own design check.

Half read: server and data. No paired client in the box.

Reuse tag: shape only (GPL). Reuse the resist-then-duration ladder, the fail list, and the refresh-or-block choice. No donor numbers.

Brief rule served: status effects and durations as data, one ledger per target, no chained hard locks.
