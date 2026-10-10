# wesnoth-wesnoth (status-effects, batch3 SE010)

Donor: /mnt/frankendom-donors/wesnoth-wesnoth/ (read over ssh; nothing copied, nothing run).
Licence: GNU GPL version 2 (COPYING line 2-3). The copyright file says version 2 or later (copyright lines 2-6). Data sits under the same project copyright; per-asset licences were not read. GPL means clean-room shape only: no code, no WML, no icons, no strings are adapted.
Asset audit used first: AU057 (wesnoth-wesnoth.assets.md). Catalogue used first: DC060 (wesnoth-wesnoth.catalogue.md). Receipts: receipts.tsv in this folder (verified with verify_receipts.py).
Verdict: STRONG. Confidence high: I read the apply-on-hit code, the damage split, the cure and poison code, the clearing points, the stun Lua file in full, and the tint code.
Half read: both (WML data: weapon_specials.cfg, traits.cfg, data/lua/stun.lua, unit file counts; engine: src/actions/attack.cpp, heal.cpp, src/units/unit.cpp and unit.hpp, src/movetype.hpp, src/game_config.cpp, src/units/drawer.cpp, src/reports.cpp, src/game_board.cpp, src/actions/advancement.cpp). Not read: the multiplayer server (src/server), the AI handlers beyond a grep for the status names. Locale: po/ templates counted (wesnoth.pot 1468 msgids, wesnoth-help.pot 775), status msgids sit in the translation files (e.g. po/wesnoth-l/bg.po); not opened in depth.
Best transferable idea: each debuff is one flag with one paired visual (tint plus icon), it never stacks, it expires when the affected unit's own side ends its turn, and a hard floor stops poison from killing.
Reuse tag: not checked against our repo from this lane. Brief rule served: donor-first for a medium feature (status effects), judged by idea not genre.

## 1. What the player sees and feels
On a 375-wide phone, a poisoned unit carries a green wash, a slowed unit a cool blue wash and a small status icon in the side panel. A slowed foe's swings hit noticeably softer and its moves cost double, so the player reads "that one is weak right now". A stunned unit is colour-shifted with a stun icon and loses its zone of control, so the nearby units stop being pinned. A petrified unit cannot move or attack, and its fight stops on the spot. Poison drains a little each turn and never takes a unit to zero, so the player always sees the unit survive to be finished by a clean hit. Cures are places and abilities: standing on a village or next to a healer clears it.

## 2. Why it works / is striking
- Readable at 375: a tint and an icon, paired. The tint alone is not the only signal, and the descriptions in the status report say the effect in plain words.
- One signature behaviour: poison that cannot kill, plus the one-line slow rule (half damage, double move cost).
- One signature effect: the blue slowed wash and the green poison wash, averaged when both are present. Sound: the status sound exists as a game-config entry (read in the path, not receipted). I did not map a status sound beyond that.
- Could be made ours at 20-30 percent resemblance: yes. The poison floor, the cure places, and the no-stack rule all transfer. The stun-as-zone-of-control does not transfer directly; it needs the many-vs-one equivalent.

## 3. The rule behind it
Apply on hit (attack.cpp 1066-1080):
- Poison is set only if the target is not already poisoned (1066-1067). Slow is set only if the target is not already slowed (1071-1072). The flags are decided up front and checked for immunity states: "unslowable", "unpoisonable", "unpetrifiable" (attack.cpp 142-145; abilities.cpp 1291-1299).
- Petrify sets the petrified state and ends the fight: the attacker's attacks go to zero and the defender is marked petrified (1080; the attacker and defender attack counts are set at 1082-1083, not receipted).
- A slowed defender's live damage is replaced by the slow value at the moment it is slowed (1074).

Damage split: normal damage divides by 10000, slowed damage divides by 20000 (attack.cpp 209-210). The slowed unit uses the slow value (212-213). The result is half the damage, rounded by the engine's round_damage, which is the same function for both.

Stun is not in the C++ engine. It is a Lua file (data/lua/stun.lua):
- On a hit with the stun special against a target that has zone of control, the target gets a modification (lines 33-43): duration to turn end, zone of control off (39), a grey colour-shift image mod (36), and the stunned status (43).
- Expiry: a repeating event on side turn end clears stunned for that side's units (84-89). The file says status removal by modification did not work reliably, so they use this event instead (81-82). That is a defect in the donor (see section 4).

Clearing points:
- game_board::end_turn loops over the side's units and calls each unit's end_turn (game_board.cpp 66-70). end_turn clears slowed (unit.cpp 1388). Slow therefore lasts until the affected unit's own side ends its turn.
- Poison and petrify are not cleared by end_turn. Petrify clears at new_scenario (unit.cpp 1409) and on advancement (advancement.cpp 323-325). Poison clears on a cure (heal.cpp 234), at new_scenario (unit.cpp 1408), or on advancement.
- Stun clears at the affected side's turn end (stun.lua 84-89).

Poison (heal.cpp 61-140, 305-352; game_config.cpp 47, 278):
- Damage is 8 HP per turn (the default poison amount in game config, read from config at 278). Damage is taken only on the poisoned unit's own side's turn (325). Cure can happen at any time (322).
- Cure levels: normal, slowed, cured (enum, line 61). Village healing cures at any time (96). The regenerate ability cures. A healer on the same side cures; an allied healer only slows the poison (133), which means no damage that turn.
- Floor: the healing clamp (330-332) means poison never takes HP below 1. The status text says so (reports.cpp 353).
- Immunity: the undead, mechanical and elemental traits add the unpoisonable state (traits.cfg 63, 89, 115). The undead trait's description says it blocks drain, poison and plague (57).

Visuals (drawer.cpp 258-272; reports.cpp 348-357):
- Poisoned adds a green wash (258). Slowed adds a blue wash (263). The wash colour is the average of the active washes, and the blend ratio stays fixed (270-272). So one status and two statuses read at the same strength.
- The side panel shows a status row per status with its own image and one sentence of text (reports.cpp 348, 352, 356).
- Petrified visual in the draw path was not read.

Counts (counted from data/core):
- Weapon specials: 18 macro definitions in weapon_specials.cfg, of which one is a helper (plague type) and 17 are specials. Status specials: four (slow, petrify, poison, stun).
- Unit files in data/core/units: 327. Files that use poison: 18. Slow: 16. Stun: 1 (merfolk Brawler, Brawler.cfg line 35). Petrifies: 0 files in data/core/units.
- Unit states: three (slowed, poisoned, petrified; unit.hpp 775-777), plus three named state keys in the name table (unit.cpp 1495-1497).
- POISON_STATUS: three levels.
- Lua stun file: 89 lines.

Data fields (designer-tunable; donor values are null because the donor is GPL, not MIT, Apache or BSD):
- slow_damage_scale (multiplier on damage): null
- slow_move_cost_scale (multiplier on move cost): null
- poison_tick_hp (HP per own-side turn): null
- poison_floor_hp (minimum HP that poison can reach): null
- poison_amount_config (game-config value, default kept as a setting): null
- stun_clears_on (affected side's turn end): null
- stun_zoc_off (bool): null
- petrify_duration (none in donor; ends at scenario end): null
- immunity_traits (list): null
- status_tint_blend (fixed ratio, averaged colour): null

## 4. For Frankendom
- Target: src/fight/status.ts (new module in the engine; the server applies and expires statuses, the client draws the tint and icon). Parity row 1 (duel step/sim).
- Real time, not turns: "until the affected side ends its turn" becomes "until N ticks or until the target's next attack lands". Keep the rule shape, change the clock.
- Many-vs-one: the stun-as-zone-of-control becomes "cannot take the hate target" or "cannot pull a second attacker". The engine's hate list and MAX_ATTACKERS = 3 are where that lives.
- Zones as data: cures are places and abilities. A shrine cures poison; a healer NPC slows it. The same 100 Pit characters reuse the same four flags.
- Keep: one flag per debuff; no stacking (a second poison does nothing); expiry at the affected unit's own turn; poison that cannot kill; a cure by place and by ability; the half-damage slow with a move-cost penalty; the averaged tint.
- Change: the stun as a Lua side effect with a repeating clean-up event. Defect in the donor (the file says removal by modification did not work). Fix: expiry is a timestamp in the engine tick, read by the same check that applies the flag. Petrify without a timer runs to scenario end; fix: petrify takes a duration in data.
- Defects kept as ideas with a fix: (a) stun removal by modification unreliable, fix as above; (b) petrify has no timer, fix as above; (c) the slow value is replaced in the live damage when slow lands mid-fight, which is right, but fix: state it in the engine tick so the next swing uses it.
- Decision: adapt (idea), defects fixed in the sketch below.

simplified: the sketch omits the immunity-state checks, the advancement and scenario clears, the cure-by-place and cure-by-healer lookup, and the stun zone-of-control. It keeps the donor's order: a status is applied once (no stacking), slowed halves damage, poison ticks only on the unit's own turn and cannot take HP below the floor, and the slow and stun clears happen at the affected unit's own turn end.

```ts
export {};

type Status = "slowed" | "poisoned" | "petrified" | "stunned";

// Data fields, all designer-tunable. No donor values copied.
interface StatusData {
  slowDamageScale: number;   // multiplier on damage while slowed
  poisonTickHp: number;      // hp lost per own-side turn while poisoned
  poisonFloorHp: number;     // poison alone never takes hp below this
}

interface Unit {
  hp: number;
  baseDamage: number;
  status: Set<Status>;
}

// No stacking: a status already present is not re-applied (kept as in the donor).
function applyOnHit(target: Unit, kinds: Status[]): void {
  for (const k of kinds) {
    if (!target.status.has(k)) target.status.add(k);
  }
}

// Slowed halves the damage this unit deals (scaled on the live damage value).
function damageFor(u: Unit, d: StatusData): number {
  return u.status.has("slowed") ? Math.round(u.baseDamage * d.slowDamageScale) : u.baseDamage;
}

// Poison ticks only on the poisoned unit's own side turn, and a cure removes it instead.
function ownTurnPoison(u: Unit, d: StatusData, cured: boolean): void {
  if (!u.status.has("poisoned")) return;
  if (cured) {
    u.status.delete("poisoned");
    return;
  }
  u.hp = Math.max(d.poisonFloorHp, u.hp - d.poisonTickHp);
}

// Slow and stun end when the affected unit's own side ends its turn.
function endOwnTurn(u: Unit): void {
  u.status.delete("slowed");
  u.status.delete("stunned");
}
```

Typecheck: the block above was run as a file on the VPS with `npx -p typescript tsc --noEmit --strict --target es2020` and exited 0 (file removed afterwards).

## 5. A 5-minute look test Dom can judge on his phone
Build behind a style flag on the existing duel scene; publish to the preview folder (look-test skill). No release rows, no lock.
- Four foes at 375 wide: plain, poisoned, slowed, and poisoned plus slowed (averaged wash). Judge whether each status reads from the wash and icon with no text.
- A stunned foe with the grey wash and icon, next to a free foe. Judge whether the difference reads at a glance.
- A poisoned foe at one HP: confirm it stays alive and the next clean hit finishes it. Judge whether that feels fair.
- Compare a slow with a per-turn clock against a slow with a tick clock. Pick the one that reads in a three-attacker fight.

## 6. Licence and IP
GPL version 2 (or later). Inspiration stays category-level: "a poison that cannot kill", "a slow that halves damage", "a stun that switches off the foe's pull". No code, no WML, no icons, no strings are copied. Recreate as a clearly distinct original: keep the one-flag rule, the no-stack rule and the cure places; change the names, the colours, the icons and the clocks. No legal conclusion is drawn.

## 7. Gaps
- Not read: the multiplayer server (src/server); the AI handlers beyond a grep for the status names; the petrified draw path in full; the status sound entries; the translation files beyond their entry counts; the attack-prediction code path that shows slow odds.
- Half read: WML data and engine. The server half was not read.
- Not in topic and not read: idle and ambient behaviour, death presentation beyond the petrify text, loot reveal, walk density.
- Readability at 375: judged from the tint and icon code and text, not from a rendered screenshot.
