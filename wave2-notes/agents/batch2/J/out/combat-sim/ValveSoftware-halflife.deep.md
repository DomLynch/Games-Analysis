# ValveSoftware-halflife (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/ValveSoftware-halflife/dlls/combat.cpp` | Licence: Half-Life 1 SDK LICENSE (Valve): free use and modification only to build a modified Valve game on the HL1 engine, distribution only for free (read in /mnt/frankendom-donors/ValveSoftware-halflife/LICENSE) | C++ | symbol `CBaseMonster::TakeDamage`

Checked: The hint file (`cl_dll/health.cpp`) is the HUD, not combat; the real pipeline is in `dlls/combat.cpp`, `dlls/player.cpp` and `dlls/weapons.cpp`. Read in full: `CBaseMonster::TakeDamage` 838-968, `DeadTakeDamage` 974-1017, `DamageForce` 1020-1030, `RadiusDamage` 1038-1110, monster `TraceAttack` 1326-1361, `FireBullets` 1372-1494, `CBasePlayer::TakeDamage` armour part 445-509 and `TraceAttack` 398-433, `AddMultiDamage`/`ApplyMultiDamage` (weapons.cpp 109-140), skill defaults (game.cpp 411-445, only the first lines of the table). Callers of `TakeDamage` that I opened: `ApplyMultiDamage`, `RadiusDamage`, `CheckTraceHullAttack` (1154), gauss self-shock (gauss.cpp 295) and the `CZombie` override (zombie.cpp 137-152). Many other monsters override `TakeDamage` and call the base (listed by grep, not read), so "all callers go through the base" is true by grep only. Confidence: high on the numbers, medium on the full set of overrides. Not read: `Killed`, `GetSkillCvar`, the skill.cfg values for skills 2 and 3.

## 1. Mechanism

- A hit is built in layers. (a) Raw damage comes from the weapon (`FireBullets`, a melee hull trace, or a blast). (b) On a trace hit the target's `TraceAttack` multiplies it by a per-hit-group factor (head 2, chest/stomach/arm/leg 1 by default), then adds it to a global accumulator, `AddMultiDamage`. (c) One call to `ApplyMultiDamage` after the volley delivers the summed damage to the target as a single `TakeDamage`. (d) For players, `CBasePlayer::TakeDamage` splits the hit between armour and health, truncates to an integer, then calls the shared monster step. (e) `CBaseMonster::TakeDamage` pushes the target, subtracts health, then either calls `Killed` or sets pain conditions.
- Accumulator: `AddMultiDamage` keeps one current target. If the new hit is on a different target, it first delivers the old sum, then starts a new sum (weapons.cpp 132-139). So a shotgun volley hitting one target many times causes one health step, one pain reaction, one damage message. `FireBullets` clears it before the pellet loop (1383) and flushes after (1493). A code comment in the donor admits that the flush on target switch passes the wrong attacker (weapons.cpp 134).
- Armour (players only): `passthrough = damage x 0.2`; `cost = (damage - passthrough) x 0.5` armour points. If `cost` exceeds the armour left, the armour takes only what it has: `absorbed = armour / 0.5` damage points, passthrough becomes `damage - absorbed`, armour goes to 0. Otherwise armour drops by `cost` and the player takes `passthrough`. So armour soaks 80% of a hit at a price of 0.4 armour points per damage point. Multiplayer blasts double the bonus factor (1.0), which doubles the armour cost. Fall and drown damage skip armour entirely. The cast to int happens after armour (509): a fractional hit never leaves 0.5 health.
- Knockback: `DamageForce = damage x (32x32x72 / box volume) x 5`, capped at 1000. Small bodies fly further. Applied as `velocity += -dir x force` for walking targets, where `dir` points from the target to a point 10 units below the inflictor's centre, so the body tends to go up (870). It is applied after the godmode early return, so a god-moded player is not pushed.
- Death and reaction: `health <= 0` -> `Killed` (gib mode from the damage type bits). Otherwise, if the target is a monster and the attacker is a monster or a client, the monster remembers the attacker's position (or a point 64 units back along the attack direction), turns toward it, and sets a light-damage condition for any damage over 0 and a heavy-damage condition at 20 or more.
- Corpses: `DeadTakeDamage` ignores normal damage. For gib-type damage, a hit that is at least the remaining corpse health sets health to -50 and gibs; smaller hits chip away 10% of their damage from the corpse health.
- Blast: damage drops linearly from full at the centre to zero at the radius (`falloff = damage / radius`, measured to the trace end point). A victim must be visible from the blast centre by a trace; blasts do not cross the water surface. Monster-fired blasts use `radius = damage x 2.5`.
- Tick: none. Every step is synchronous inside the event that causes the hit (weapon fire, blast, melee). Not a per-frame loop.

## 2. Key functions

- `CBaseMonster::TakeDamage`: `/mnt/frankendom-donors/ValveSoftware-halflife/dlls/combat.cpp` 838-968. The one place health goes down (its header says so). Push, health, death, pain conditions.
- `CBaseMonster::DamageForce`: `/mnt/frankendom-donors/ValveSoftware-halflife/dlls/combat.cpp` 1020-1030. Size-scaled, capped push.
- `RadiusDamage`: `/mnt/frankendom-donors/ValveSoftware-halflife/dlls/combat.cpp` 1038-1110. Sphere query, line-of-sight test, linear falloff.
- `CBaseMonster::TraceAttack`: `/mnt/frankendom-donors/ValveSoftware-halflife/dlls/combat.cpp` 1326-1361. Hit-group multiplier then accumulate.
- `CBasePlayer::TakeDamage` (armour block): `/mnt/frankendom-donors/ValveSoftware-halflife/dlls/player.cpp` 445-509.
- `AddMultiDamage` / `ApplyMultiDamage`: `/mnt/frankendom-donors/ValveSoftware-halflife/dlls/weapons.cpp` 109-140. Per-target volley accumulator.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Hit-group multiplier applied before accumulation | head 2, others 1 (theirs, game.cpp 411 and 415; skills 2 and 3 repeat the same defaults in the lines I read) |
| Per-target volley accumulator, one health step per volley | None |
| Armour: fixed share bypasses, rest costs armour at a bonus rate, partial-armour branch | Ratio 0.2 and bonus 0.5 (theirs, player.cpp 442-443); blast bonus x2 (464) |
| Knockback inversely scaled by body volume, capped | Reference box 32x32x72, factor 5, cap 1000 (theirs, combat.cpp 1022-1024) |
| Linear blast falloff with line-of-sight | Radius = 2.5 x damage for monster blasts (theirs, combat.cpp 1115) |
| Light/heavy pain tier from the size of one delivered hit | Heavy at 20 (theirs, combat.cpp 960) |
| Corpse chip-damage to gib | 10% per hit, health set to -50 on gib (theirs, combat.cpp 1008, 1013) |

## 4. TypeScript sketch

simplified: omits the dead-target path, god-mode and team-play gates, pain/enemy-memory conditions, per-skill-level tables, gib modes, water checks for blasts, the real line-of-sight trace (passed in as a boolean), and the volley's attacker (the donor passes the wrong one on a target switch). Armour is applied in the same function as health for brevity; in the donor armour sits in the player subclass before the shared step. The int truncation is applied to every defender, not only players.

```ts
// Licence: Valve HL1 SDK (restrictive). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type HitGroup = 'generic' | 'head' | 'chest' | 'stomach' | 'arm' | 'leg';
type DamageKind = 'bullet' | 'blast' | 'fall' | 'drown' | 'club';

interface GroupMultipliers { head: number; chest: number; stomach: number; arm: number; leg: number; }

interface Defender {
  health: number;
  armour: number;
  sizeVolume: number; // width*depth*height of the hit box
  groups: GroupMultipliers;
  alive: boolean;
}

interface Hit { target: Defender; amount: number; kinds: Set<DamageKind>; }

interface Tuning {
  armourRatio: number;   // share of a hit that bypasses armour (0.2)
  armourBonus: number;   // health points saved per armour point (0.5 => armour point worth 2)
  blastArmourMult: number; // extra armour cost multiplier for blasts in multiplayer
  forceRefVolume: number; // volume at which force scale is 1
  forceCap: number;
  forceScale: number;
}

function groupMultiplier(g: HitGroup, m: GroupMultipliers): number {
  return g === 'generic' ? 1 : m[g];
}

// batch: one volley (e.g. shotgun pellets) sums per target and is delivered once.
class Volley {
  private cur: Hit | null = null;
  private done: Hit[] = [];
  add(target: Defender, rawDamage: number, group: HitGroup, kind: DamageKind): void {
    const dmg = rawDamage * groupMultiplier(group, target.groups);
    if (this.cur === null || this.cur.target !== target) {
      if (this.cur !== null) this.done.push(this.cur);
      this.cur = { target, amount: 0, kinds: new Set() };
    }
    this.cur.amount += dmg;
    this.cur.kinds.add(kind);
  }
  flush(): Hit[] {
    if (this.cur !== null) this.done.push(this.cur);
    this.cur = null;
    const out = this.done;
    this.done = [];
    return out;
  }
}

function knockback(damage: number, t: Tuning, v: Defender): number {
  const f = damage * (t.forceRefVolume / v.sizeVolume) * t.forceScale;
  return Math.min(f, t.forceCap);
}

interface HitOutcome { healthLoss: number; armourSpent: number; push: number; killed: boolean; heavy: boolean; }

function resolve(hit: Hit, t: Tuning, multiplayer: boolean): HitOutcome {
  const v = hit.target;
  if (!v.alive) return { healthLoss: 0, armourSpent: 0, push: 0, killed: false, heavy: false };
  let dmg = hit.amount;
  let armourSpent = 0;
  const skipsArmour = hit.kinds.has('fall') || hit.kinds.has('drown');
  if (v.armour > 0 && !skipsArmour) {
    let bonus = t.armourBonus;
    if (hit.kinds.has('blast') && multiplayer) bonus *= t.blastArmourMult;
    const passthrough = dmg * t.armourRatio;
    let cost = (dmg - passthrough) * bonus;
    if (cost > v.armour) {
      cost = v.armour;
      const absorbed = cost / bonus;
      dmg = dmg - absorbed;
      v.armour = 0;
    } else {
      v.armour -= cost;
      dmg = passthrough;
    }
    armourSpent = cost;
  }
  const take = Math.trunc(dmg); // players: integer before the shared health step
  const push = knockback(take, t, v);
  v.health -= take;
  const killed = v.health <= 0;
  if (killed) v.alive = false;
  return { healthLoss: take, armourSpent, push, killed, heavy: take >= 20 };
}

// blast: linear falloff to zero at radius, needs line of sight
function blastDamage(base: number, radius: number, distance: number, lineOfSight: boolean): number {
  if (!lineOfSight) return 0;
  const falloff = radius > 0 ? base / radius : 1;
  return Math.max(0, base - distance * falloff);
}
```

Typechecked on the VPS: `npx -p typescript tsc --noEmit --strict --target es2020` returned no errors (file with `export {}` appended).

## 5. Lands in

- TARGET `src/fight/damage.ts` (new module, engine damage step): hit-group multiplier, volley accumulator, armour split, capped size-scaled push. Parity-checklist row 1 (duel step / sim); the many-on-one volley accumulator also serves row 4. Today the flat combat helpers are in `src/combat.ts` (moving to `src/fight/combat.ts`).
- today: `src/combat.ts` (moving).
- Reuse tag: rewrite-from-idea (Valve HL1 SDK licence; clean-room only)
- Brief rule served: 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- Valve SDK licence: modification allowed only for an HL1-engine game, free distribution only. Frankendom is not that. Shape only, nothing copied.
- Hit groups need a hit-location notion. A duel with guard/parry stance (row 3) has no body-part geometry; the usable shape is "a multiplier chosen by where the strike landed" mapped to strike type or a called zone. Keep multipliers as catalogue fields (rows 20-21), not constants.
- The volley accumulator fits many-on-one: up to 3 attackers (MAX_ATTACKERS = 3) landing in the same server tick could be summed per defender into one health step and one hitstop/pain event, which keeps the one ledger tidy. It must be keyed by (defender, tick), and attacker attribution kept per hit; the donor loses the attacker on a target switch (its own comment says "wrong attacker"). Server-verified kills need the real attacker.
- Float to int truncation matters only because the donor mixes floats and a client that reads integers; in Frankendom pick one integer step and test it.
- Knockback as velocity does not exist in a state-machine duel; reuse only the "small body moves more, capped" idea as a stagger-distance or stagger-duration scale.
- Armour split is a data-driven pair (ratio, bonus). Express as per-gear fields, not constants.
- Blast falloff needs line-of-sight; Frankendom zone maps would need a cheap LOS test or skip it.
- Pain tiers (any hit light, 20+ heavy) are per-hit, not per-volley, because the check uses the delivered amount. After batching, a volley of weak pellets can become heavy; decide whether that is wanted.
- Not read: `Killed`, the gib path, skill tables for levels 2 and 3, the player path for non-hit-group damage sources beyond fall/drown.

Best transferable idea: sum every hit one target takes inside one volley and tick, apply one health step, one hitstop and one pain tier to the total, with the hit-location multiplier applied before summing.
