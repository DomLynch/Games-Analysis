# DCurrent-openbor (economy-trade, cell 2)

Donor: `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` | Licence: BSD 3-clause style (repo `LICENSE`: "Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met", three conditions, copyright Roel van Mastbergen & Senile Team and OpenBOR Team; permissive, code may be adapted) | C | symbol `check_energy` (with `check_special`, `do_attack`, `update_health`, `checkdamageeffects`, `common_attack_proc`)

Checked: There is no shop, price, currency, barter, trade, purchase or vendor code in this donor. I searched `engine/source` for those words and the only hits were animation cost fields and comments; the `credits` level property is exposed to scripts (`engine/source/openborscript/level.c` 133-136; not read beyond the bindings). The closest real mechanism is a resource ledger: MP and HP act as spendable pools with per-move costs, a payment fallback order, a block cost, a temporary cost ceiling (seal), and regeneration. I read `openbor.c` 44074-44144 (`check_energy`) in full, 44347-44432 (`check_special`) in full, 31794-31814 (own and projectile hit cost), 31842-31913 (block types and chip damage), 40726-40740 (deferred cost), 33134-33159 (`do_energy_charge`), 33162-33290 (`update_health`: guard and MP regen), 37116-37126 (seal applied), 32960-32962 (seal expiry), 34010-34040 (the call site in `update_ents`, which starts at 33927; `update_health` is called at 34036), and the constants in `openbor.h` 80, 1285-1320, 1931. Not read: who sets `nocost` (used at 31793 and 40726 path), the callers of `check_special`, the clock that advances `_time`, the attack's seal duration (`_sealtime`), the knockdown path behind the `takedamage` call (31914), and the main loop head above `update_ents`. The tick unit is the donor's own: `game_speed` is documented as "logical clock hz" (`openbor.h` 1931) with default 200 (`openbor.h` 80); I did not verify that `_time` advances at that rate. Confidence high on the gate, the payment order and the regen order (each read end to end); medium on whether this counts as economy at all, since there is no trade. The donor has a known inconsistency in the projectile charge branch (see section 6), which I read but did not run.

Best transferable idea: a special is paid from one pool by the same check that gates it, and the payment is refused unless the pool stays above zero for the HP path, so a special can never be the thing that kills the caster.

Decision (proposed): adapt — keep one gate-then-pay check with the no-kill floor, a temporary cost ceiling (seal) and the MP regen step, on one stamina or MP pool per special; reject the MP-to-HP fallback, which moves cost into a second ledger against the one-ledger ruling, and reject the donor's deferred payment at animation end, which re-checks the pool after the hit.

Acceptance: a server test refuses a special costing 6 when stamina is 5, accepts it at stamina 6 and leaves 0 (the >= rule); with a seal of 4 active for 2 s, a 6-cost special is refused inside the 2 s and a 3-cost special is accepted; a second test refuses any charge that would take the attacker's HP to 0 or below.

## 1. Mechanism

- Entry gate, `check_special` (`openbor.c` 44347-44351). It runs only if the level allows specials (44350), the special animation is valid, and either `check_energy(HP)` or `check_energy(MP)` is true (44351). Only then does it set the attack state: the combo is reset and the animation is set (memset at 44356, `ent_set_anim` at 44373, both read), and then the payment runs (44387-44428).
- The check, `check_energy(which, ani)` (44074-44144). Order of tests: (a) copy the animation's cost, disable mask and cost type (44081-44083); (b) a bind override for specials returns false for AI or for players (44089-44101; the AI override is at 44092); (c) the disable mask (44115-44120): -1 disables for all, -2 for AI, -3 for players and NPCs, -4 for players and enemies, or the entity type matches. The trailing comment on the -4 line says "all AI", but the test is `TYPE_PLAYER | TYPE_ENEMY` (44119). (d) Seal (44122): allowed if the seal is 0, or if the seal is at least the cost. (e) MP path (44124): the cost type is not HP-only and MP is at least the cost. (f) HP path (44125): the cost type is not MP-only and HP is strictly greater than the cost. The strict test means an HP-paid special never takes the caster to 0 HP.
- Payment, inside `check_special` (44387-44428). For a player with the health cheat off: if `nocost` is not set, MP is charged when `check_energy(MP)` passes, otherwise HP is charged (44388-44397 for the MP-or-HP case, read). With the health cheat on, only MP is charged, and only when affordable (44402-44411). For an NPC or enemy: the same MP-or-HP charge, with no cheat branch (44416-44425). The HP branch does not re-check HP; the gate at 44351 has already guaranteed one of the two.
- Hit cost, `do_attack` (`openbor.c` 31443-31943), block at 31790-31814. If the attack's animation has a cost above 0 (31790) and the attacker is the top owner, the cost is deferred: `tocost` is set (31793-31794) and paid when the animation ends (section below). If the attacker is a projectile (not the top owner), `nocost` is set and no cost is already pending, the top owner pays: the MP branch is taken when the cost type is not MP-then-HP and the owner has MP above 0 (31798), subtracting the cost and clamping MP at 0 (31800). Otherwise HP is subtracted (31806), and HP is set to 1 if it falls to 0 or below (31808-31809). Then `tocost` is set on the projectile so the cost is not charged again (31814).
- Deferred cost, `common_attack_proc` (`openbor.c` 40726-40740). When an animation with `tocost` set finishes, it charges MP if `check_energy(MP, animnum)` passes (40730), otherwise HP (40736). There is no HP floor on this line, and HP is not re-checked; `tocost` is then reset (40739).
- Block, inside `do_attack`. The block type comes from the defending object (31842 resolves GLOBAL to MP-first or HP using `global_config.block_type`). The cases: HP and GLOBAL do nothing (case at 31849; the comment is at 31852). MP-only (31857-31865): MP -= force, force = 0, MP clamped at 0. MP-first (31868-31883): MP -= force; if MP goes negative, the leftover becomes force and MP is set to 0, otherwise force = 0. Both (31886-31895): MP -= force and MP is clamped at 0, but force stays the full value.
- Chip damage, after the block cases (31906-31913). If the remaining force is below HP, HP -= force (31909). Otherwise, if `nochipdeath` is set, HP is set to 1 (31911-31912). Otherwise `takedamage` runs (not read).
- Guard meter, separate from MP. When a block is active and not ignoring guard points, `guardpoints -= attack->guardcost` (30716-30719, read). `guardcost` defaults to 0 (`openbor.c` 238).
- Regeneration, `update_health` (`openbor.c` 33162-33290, end not checked). Called once per live entity from `update_ents` (34036), after `check_attack` (34031, read). Guard: if the model has guard points and `_time >= guardtime`, guard points grow by `guardrate`, or by `guardrate / 2` while blocking (33183-33187), capped at the model maximum, and `guardtime = _time + game_speed` (33197). MP: only when `magic_type == 0` and not charging (33207), and `_time >= magictime` (33209). Then by `mpstable`: default (else branch) adds `mprate` (33266-33268); type 1 adds while below the stable value; type 2 subtracts `mpdroprate` while above it; type 3 does both; type 4 gains to the maximum, then drains to the stable value, using `modeldata.mpswitch` (33250, which is stored on the shared model, see section 6). Then `magictime = _time + game_speed` (33271): one step per game_speed ticks, which is one second if the clock runs at game_speed hz. The player energy cheat sets MP to max (33279-33281). MP is capped at max (33284-33286).
- Charge, `do_energy_charge` (33134-33159). While charging, once per `ENERGY_CHARGE_RATE` (0.25, 33136) of game_speed, MP += `chargerate` (33151) and the next tick is set to `_time + game_speed * 0.25` (33154).
- Seal, a debuff from a hit. `checkdamageeffects` (37002): if the attack carries a seal, the target's `seal` is set to the seal value and `sealtime = _time + _sealtime` (37124-37125). Expiry, in the update (32960-32962): when `_time >= sealtime`, `seal = 0`. While sealed, the gate at 44122 refuses any special whose cost is above the seal value, so the seal is a ceiling on spending, not a ban.

## 2. Key functions

- `check_energy`: `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` 44074-44144. The one gate for MP and HP, the seal ceiling and the disable mask.
- `check_special`: `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` 44347-44432. Gate, state change, then payment (44387-44428).
- `do_attack` (hit cost, block, chip): `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` 31443-31943. The projectile and own-attack cost at 31790-31814, block cases 31842-31895, chip 31906-31913.
- `common_attack_proc` (deferred cost): `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` 40719-40740, the `tocost` block at 40726-40740.
- `update_health` (regeneration): `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` 33162-33290.
- `do_energy_charge`: `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` 33134-33159.
- `checkdamageeffects` (seal applied): `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` 37002, seal set at 37124-37125; expiry at 32960-32962.
- `update_ents` (the per-entity loop that calls `update_health`): `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` 33927-34048.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One gate decides the paying pool; the pool is charged with no second look | None (the shape, 44351 and 44387-44428) |
| The HP path must stay strictly above the cost, so a special cannot kill | Strict `>` (theirs, 44125) |
| The MP path is `>=` the cost | `>=` (theirs, 44124) |
| Seal = cost ceiling for a fixed time | Seal value and duration come from the attack (not read beyond 37124-37125) |
| Regen = one step per second, timer reset to now plus one second | Default `mprate` 2, or 1 when `magic_type` is 1 (theirs, 15652-15656); `game_speed` default 200 (theirs, openbor.h 80) |
| Charge tick every quarter second | `ENERGY_CHARGE_RATE` 0.25 (theirs, 33136); `chargerate` default 2 (theirs, 15658) |
| Guard regen half rate while blocking | `guardrate` default 2 (theirs, 15658), half while blocking (33183) |
| Block drains MP first, leftover reaches HP | Four block modes, enum at openbor.h 1285-1288 (theirs) |
| Chip damage cannot kill when chip death is off | HP floor 1 (theirs, 31911-31912) |
| Deferred payment at the end of the animation | None (the shape at 40726-40740) |

## 4. TypeScript sketch

simplified: the sketch follows the donor order for the gate and the payment (seal ceiling, then the MP-or-HP choice that is also the charge, HP strictly above cost), the MP regen step (one step per second; the donor adds at most one step per update and resets the timer to now plus one second, the sketch advances the timer by one second instead, so it does not drift), and the four block modes with chip death. It omits: the projectile owner charge (31794-31814), the deferred own-attack charge (40726-40740), the health and energy cheats, the guard meter, the stable types 1-4 (only the default add step is kept), the charge tick, the knockdown and KO path (`takedamage` is not modelled, HP is set to 0), and the attack's seal duration (the sketch takes an expiry time). It keeps the MP-or-HP fallback because that is the donor shape; the decision above drops it for Frankendom.

```ts
// Licence: BSD 3-clause style (donor LICENSE: "Redistribution and use in source and binary forms, with or without modification, are permitted"). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const GAME_SPEED = 200; // logical ticks per second (donor default)

interface Caster {
  mp: number;
  mpMax: number;
  hp: number;
  seal: number;       // 0 = no seal; otherwise the most a special may cost while sealed
  sealUntil: number;  // logical tick when the seal expires
}

type CostMode = "mpThenHp" | "mpOnly" | "hpOnly";
interface Cost { amount: number; mode: CostMode; }

// Which pool pays, or null when the special is refused.
// A seal refuses any cost above its ceiling. MP needs mp >= cost; HP needs hp > cost,
// so a special paid from HP can never take the caster to 0.
function payerFor(c: Caster, cost: Cost, now: number): "mp" | "hp" | null {
  const sealed = c.seal !== 0 && now < c.sealUntil;
  if (sealed && c.seal < cost.amount) return null;
  if (cost.mode !== "hpOnly" && c.mp >= cost.amount) return "mp";
  if (cost.mode !== "mpOnly" && c.hp > cost.amount) return "hp";
  return null;
}

// Gate and pay in one step: the same check decides the pool that is charged.
function paySpecial(c: Caster, cost: Cost, now: number): "mp" | "hp" | null {
  const pool = payerFor(c, cost, now);
  if (pool === "mp") c.mp -= cost.amount;
  else if (pool === "hp") c.hp -= cost.amount;
  return pool;
}

// MP recovery: one step per logical second; the timer advances by one second (no catch-up burst).
interface Regen { rate: number; cap: number; nextTick: number; }
function regenMp(c: Caster, r: Regen, now: number): void {
  if (now < r.nextTick) return;
  c.mp = Math.min(c.mpMax, c.mp + r.rate, r.cap);
  r.nextTick = Math.max(r.nextTick + GAME_SPEED, now);
}

type BlockMode = "hp" | "mpFirst" | "mpOnly" | "both";
// Blocked hit: the block mode decides how much of the force reaches HP; chip death can be disabled.
function applyBlockedHit(c: Caster, force: number, mode: BlockMode, noChipDeath: boolean): number {
  let rest = force;
  if (mode === "mpOnly") {
    c.mp = Math.max(0, c.mp - rest);
    rest = 0;
  } else if (mode === "mpFirst") {
    c.mp -= rest;
    if (c.mp < 0) { rest = -c.mp; c.mp = 0; } else { rest = 0; }
  } else if (mode === "both") {
    c.mp = Math.max(0, c.mp - rest); // MP is drained and the full force still reaches HP
  }
  if (rest < c.hp) c.hp -= rest;
  else if (noChipDeath) c.hp = 1;
  else c.hp = 0; // the donor calls its KO handler here (not modelled)
  return rest;
}
export {};
```

Checked values from running this sketch on the VPS (`tsc --strict` clean, then run with node; these are sketch outputs following the donor rules, not donor runs): stamina/MP 5, HP 7, cost 6 gives an HP payment and leaves HP 1; MP 5, HP 6, cost 6 is refused; seal 4 until tick 100 refuses cost 6 at tick 50 and allows it at tick 150; regen from 0 with rate 2 at ticks 0, 100, 200, 400 gives MP 6 with the next tick at 600; MP-first with MP 3 and force 5 gives 2 to HP and MP 0; both-mode with MP 3 and force 5 gives 5 to HP and MP 0.

## 5. Lands in

- TARGET `src/fight/specials.ts` (proposed new module: the special gate, payment and seal ceiling). The Frankendom repo was not opened under the batch rules, so this path is a proposal; check it against the tree before use.
- Parity-checklist row 13 (specials). It is the closest row, not an economy row: the trade and shop topic has no row. The regen and block cost also touch row 3 (guard, parry, stamina), noted in section 6.
- Reuse tag: rewrite-from-idea (BSD 3-clause style; the code may be adapted, and this sketch is written from the mechanism).
- Brief rule served: one ledger, server-verified (the pool is charged in the same server step that checks it); zones as data for the costs and rates; rules 7-9 n/a.

## 6. Gaps and risks

- Topic fit: the donor has no shop, trade or price system. What transfers is a resource ledger (costs, fallbacks, ceilings, regeneration). Treat it as a sink and faucet model for stamina, not as an economy.
- One ledger: the donor moves cost from MP into HP (44351, 44387-44428, 31798-31806). Frankendom's one-ledger ruling forbids a second pool silently absorbing the cost. Adapt: one pool per special, refuse instead of falling through.
- Server-verified: every check here runs in the client that also plays the animation (the entity state lives in one process). Frankendom must run the gate and the payment on the server and let the client only show the result.
- Deferred payment: the cost of an own attack is paid at animation end (40726-40740), after the hit, and the MP re-check there can send the cost to HP with no HP check and no floor (40730-40736). The gate at 44351 may have passed at the start. Frankendom should reject the deferred form and charge at the gate.
- Projectile charge branch reads inverted (31798). The branch takes the MP path when the cost type is "not MP-then-HP" and MP is above 0, and takes the HP path for MP-then-HP. Against the enum order in `openbor.h` 1318-1320 (MP-then-HP = 0, MP-only = 1, HP-only = 2): MP-then-HP never draws MP on this path, MP-only falls back to HP when MP is 0, and HP-only draws MP while MP is above 0. I read this but did not run it, and the donor comments say the legacy logic is not fully understood (31787). Do not port this branch; if a projectile cost is wanted, write the pool rule from the data field.
- Shared state: the stable-type 4 switch is stored on `modeldata.mpswitch` (33250, set at load 15665), so every entity using that model shares one switch. Frankendom's per-entity state must not share it.
- Regen is not catch-up safe: it adds one step per update and resets the timer to now plus one second (33266-33271). The sketch uses a timer that advances by one second; test it against a pause.
- The guard meter and the MP pool are two pools in the donor (30719, 33173-33197). Frankendom's guard and stamina (row 3) need one rule for both, not two.
- Seal duration, the knockdown path behind the `takedamage` call (31914), and who sets `nocost` were not read. The unit of `_time` was not verified; the one-second reading assumes `_time` advances at game_speed hz.
- Licence is BSD 3-clause style: permissive, code may be adapted. The sketch is still written from the mechanism, not copied.
