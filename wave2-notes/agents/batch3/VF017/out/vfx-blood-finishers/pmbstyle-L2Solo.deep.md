# pmbstyle-L2Solo (vfx-blood-finishers, cell 2)

Donor: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Bot/AI/BotEmergencyFinisher.js` | Licence: Apache-2.0 (LICENSE file is the Apache License, Version 2.0, January 2004; package.json says "SEE LICENSE IN LICENSE") | JavaScript (NodeJS) | symbol `evaluate`, `tryFinish`

Checked: The hint file `src/GameServer/Effects/EffectTicker.js` is buff, debuff and DoT/HoT timers (grep of lines 1-200; not read in full), so it is the wrong file for visuals. Read in full: `Bot/AI/BotEmergencyFinisher.js` (130 lines); callers `Bot/AI/States/HuntingState.js` (lines 35-37, 447-448, 620-680 around the two calls), `Bot/BotAI.js` (721-726); helpers `Formulas.js` 239-241 and `Bot/AI/BotCombatUtility.js` 39-47. Also opened for the VFX question: `Actor/Generics/Die.js`, `Network/Response/Die.js`, `Network/Response/Attack.js`, `Effects/EffectTicker.js` (grep). Confidence: high on the finisher rule (read end to end); medium that "finisher" here is the topic the lane wants, because the donor has no visual finisher at all. Not read: `Restrictions`, `AttackRange`, `Geodata.hasLineOfSight`, `Attack.prototype.calculatedSkillHitTime`, `Utility.evaluate`, `Attack.incomingWeaponVulnerabilityModifier`, the body of `Die.js` beyond line 54. Donor VFX check: grep for particle, shake, flash, splatter, gore, hitstop and vfx in src/tests finds no presentation code (only comments and unrelated words); the word "blood" appears only in item, quest and bot-name strings.

Best transferable idea: Commit to a finishing blow only when the predicted kill lands inside a short window and the attacker's HP after every swing the enemies can land in that window stays above a reserve; otherwise retreat.

Decision (proposed): adapt - take the commit gate (time window, fastest-first, incoming-damage budget with headroom, reserve), not the bot code. Frankendom's finisher trigger is a server check: the client asks, the engine answers with a predicted kill time and survival margin, and the finisher plays only when both pass. Why: it gives the finishers lane a server-side rule for when a finisher is allowed, which the client cannot fake.

Acceptance: A server test with the player at 30% HP and a monster at 20% HP that dies in two basic hits: the finisher is granted only if HP after the predicted exchange stays above 10% of max; with a second monster casting or inside the threat list, the finisher is refused and the player retreats. The player sees the finisher animation only when the server grants it.

## 1. Mechanism

- Trigger: the bot is a solo hunter and is either on unsafe ground or critically wounded (HP below 35% or MP below 20%, `HuntingState.js` 35-36, 447-448). Before retreating, `HuntingState` calls `BotEmergencyFinisher.tryFinish` (632, when the bot needs an emergency retreat or the ground is unsafe and the ground is still allowed; 674, for a critically wounded bot with a live encounter target). If the finisher is refused, the bot retreats: at 674 through the raid-safety retreat with distance 850 (line 37 and the call; the rest of that branch not read), at 632 through `retreatFromThreat` (452; body not read past its first lines).
- `evaluate` (29) returns a decision or null. It refuses early when the target is not attackable or is dead or protected, when the bot cannot use a basic action, when the bot is busy on a different target, or when there is no line of sight (no chase or pathfinding gamble). While the bot is casting, only the pending impact of that cast can justify staying (the cast must be the one aimed at this target and not yet landed).
- Candidate options, all in milliseconds:
  (a) Basic attack, if the target is in normal range and the bot has attack speed. Damage estimate is the ordinary non-crit hit (`BotCombatUtility.js` 47) times the physical modifier times 0.70 (line 53; margin constant at 12). Hits needed = ceil(hp / damage); allowed only if hits <= 2 (54-55). Finish time = (hits + 1) x swing time (56), where swing time = 2700 ms below attack speed 2, else 470000 / attack speed (`Formulas.js` 241). No HP cost.
  (b) Damage skill: only direct-damage skills, not area, aura or front-area; MP must cover it; in range; estimated damage x 0.70 must be at least the target's HP (76). Finish time = cast time + 1000 ms (80). HP cost = the skill's consumed HP.
- Window: keep only options with finish time <= 4000 ms (84).
- Incoming budget: the attacker set starts with the target (86), then adds NPCs within 2500 units (87) that hate the bot or that threatened it in the last 5 s (90). For each option, sorted fastest first (94): every attacker adds `damage x 1.5 x (1 + ceil(finish time / that attacker's swing time))` (105). Any attacker that is casting, has no damage estimate, or has no swing rate makes the total infinite (101).
- Accept: the first option where `HP - HP cost - incoming > reserve` (107-108), reserve = max(1, 10% of max HP). Otherwise null.
- Handoff: `tryFinish` sets the target, selects it, stands the bot up if seated, and calls `BotAI.executeCombat` with `emergencyFinisher` (115-127). `executeCombat` runs `evaluate` a second time (721-722) and only then swings or casts, with the control flag set.

## 2. Key functions

- `evaluate`: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Bot/AI/BotEmergencyFinisher.js` 29-113. Read end to end.
- `tryFinish`: same file, 115-128.
- Trigger logic: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Bot/AI/States/HuntingState.js` 35-37, 447-450, 632, 674.
- Re-check in combat: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Bot/BotAI.js` 721-726.
- Swing time: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Formulas.js` 239-241.
- Basic damage estimate: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Bot/AI/BotCombatUtility.js` 39-47.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Finish window: only commits that land inside it | 4000 ms (theirs, finisher file 11) |
| Predicted-damage margin: plan with 70% of the estimate | 0.70 (theirs, 12) |
| Basic attack allowed only when it kills in two hits or fewer | 2 hits (theirs, 55) |
| Basic finish time: (hits + 1) swings | Swing time 2700 ms below attack speed 2, else 470000 / attack speed (theirs, Formulas.js 241) |
| Skill finish time: cast time plus a pad | 1000 ms pad (theirs, 80); a donor constant to make into skill data |
| Incoming damage per attacker: hit once more than the swings in the window, with headroom | Headroom 1.5 (theirs, 105); threat radius 2500 units (theirs, 13); 5 s threat memory (theirs, 90) |
| Survival reserve | 10% of max HP, minimum 1 (theirs, 107) |
| Retreat trigger and fallback | HP 35%, MP 20%, retreat 850 units (theirs, HuntingState 35-37) |

Units: finish time ms; damage in HP points; reserve in HP points; radius in world units.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: time window, fastest option first, incoming budget with 1.5 headroom and swings in the window, reserve check, and the two option builders (basic and one-shot skill). It omits: every eligibility check (session, line of sight, raid safety, action restrictions, range, MP cost), the casting branch (a pending cast impact), the bot's current hit and cast state, the target selection, the seated-state change, and the `executeCombat` handoff. The threat list is passed in by the caller instead of being read from the world and the hate table; the donor's 5 s and hate filters are not reproduced. The 1000 ms skill pad is a named constant here (data in Frankendom).

```ts
// Licence: Apache-2.0 (donor LICENSE; package.json says "SEE LICENSE IN LICENSE"). Rewritten from the described rule, no lines copied.
// adapt: idea only
interface Me { hp: number; maxHp: number; speed: number; }
interface Foe { id: number; hp: number; dmgEst: number; swingMs: number; casting: boolean; }
interface Option { kind: "basic" | "skill"; finishMs: number; hpCost: number; estDamage: number; }

const MAX_FINISH_MS = 4000;     // donor BotEmergencyFinisher.js 11
const DAMAGE_MARGIN = 0.70;     // donor 12
const HEADROOM = 1.5;           // donor 105
const RESERVE_RATIO = 0.10;     // donor 107
const SKILL_PAD_MS = 1000;      // donor 80 (a fixed pad in the donor; here it is a data field)
const BASIC_MAX_HITS = 2;       // donor 55

// Swing time in ms from attack speed (donor Formulas.js 241)
function swingMs(speed: number): number {
  return speed < 2 ? 2700 : 470000 / speed;
}

function basicOption(hp: number, rawDmg: number, mySpeed: number): Option | null {
  const dmg = rawDmg * DAMAGE_MARGIN;
  const hits = dmg > 0 ? Math.ceil(hp / dmg) : Infinity;
  if (hits > BASIC_MAX_HITS) return null;
  return { kind: "basic", finishMs: (hits + 1) * swingMs(mySpeed), hpCost: 0, estDamage: dmg };
}

function skillOption(hp: number, rawDmg: number, castMs: number, hpCost: number): Option | null {
  const dmg = rawDmg * DAMAGE_MARGIN;
  if (dmg < hp) return null;               // one-shot only
  return { kind: "skill", finishMs: castMs + SKILL_PAD_MS, hpCost, estDamage: dmg };
}

// Engine-side choice. `threat` must be the engine's real attacker list (Frankendom MAX_ATTACKERS = 3).
function chooseFinisher(me: Me, target: Foe, options: Option[], threat: Foe[]): Option | null {
  const quick = options
    .filter(o => o.finishMs <= MAX_FINISH_MS)   // time window
    .sort((a, b) => a.finishMs - b.finishMs);   // fastest first
  if (quick.length === 0) return null;

  const attackers = new Map<number, Foe>([[target.id, target]]);
  for (const f of threat) attackers.set(f.id, f);

  const reserve = Math.max(1, me.maxHp * RESERVE_RATIO);
  for (const o of quick) {
    let incoming = 0;
    for (const f of attackers.values()) {
      if (f.casting || f.dmgEst <= 0 || f.swingMs <= 0) { incoming = Infinity; break; }
      // immediate hit + every swing inside the window, with headroom
      incoming += f.dmgEst * HEADROOM * (1 + Math.ceil(o.finishMs / f.swingMs));
    }
    if (me.hp - o.hpCost - incoming > reserve) return o;
  }
  return null;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` run on the VPS at /tmp/pmbstyle-finisher-gate.ts, exit 0.

## 5. Lands in

- TARGET `src/fight/finisher.ts` (new): the engine's finisher gate, run on the server before a finisher is granted. Parity-checklist row 9 (finishers). The lead's hint was row 10; row 10 covers hit impact and hitstop, which this donor does not model at all, so the finisher gate lands in row 9.
- today: not checked in the Frankendom repo (the brief names the target; no Frankendom file was read).
- Reuse tag: rewrite-from-idea (Apache-2.0: code may be adapted; this note adapts the rule only)
- Brief rule served: 1 (one engine decides; the client asks), 9 finishers (granted by the server), MAX_ATTACKERS = 3 (the threat list is the engine's capped list)

## 6. Gaps and risks

- The donor has no finisher visual, blood, gore, particle, shake or flash code on the server. The only "finisher" is a bot decision rule. Presentation must come from the client and from Frankendom's own finisher lane.
- Defect, threat snapshot: the threat set is taken once, at the call. NPCs that are not yet hating the bot and did not threaten it in the last 5 s are not counted, though they can join during the 4 s window. Keep the idea, fix: count every awake attackable foe inside the engine's join radius, or re-run the gate on every swing (the donor re-runs only when `executeCombat` is called).
- Defect, fixed skill pad: the 1000 ms pad is a constant in the code, not per skill. Keep the idea, fix: make the pad a per-skill data field (cast time plus pad), default 1000 ms.
- Gap, one-shot skills only: a skill that needs two hits is never offered as a finisher, though the basic attack path does allow two-hit kills. Frankendom should decide which to allow; the donor's choice is conservative.
- Conservative blocks: any casting or unknown-damage attacker blocks the finisher outright (101). This is safe but can block all finishers against a single caster. Frankendom may want a data flag per foe instead.
- Estimates only: damage uses a non-crit ordinary hit with a 0.70 margin and no crit, shot or soulshot. Real hits can be bigger or smaller, so the gate is a prediction, not a guarantee. Kills stay server-verified in Frankendom; the gate only decides whether the finisher starts.
- Units and rates: swing time comes from attack speed in the donor's stat model. Frankendom's gear and stats differ, so the swing time must come from the engine's own speed field.
- Not read: `Restrictions`, `AttackRange`, `Geodata.hasLineOfSight`, `calculatedSkillHitTime`, `Utility.evaluate`, `incomingWeaponVulnerabilityModifier`; so the exact range and damage numbers used by the donor are not verified here.
- Donor VFX side (for the record): `Network/Response/Attack.js` sends hit flags (USESS 0x10, CRIT 0x20, SHLD 0x40, MISS 0x80) and additional hits in one packet; `Network/Response/Die.js` sends only the id, teleport, clan hall, castle, HQ, sweepable and a fixed field. These are the hooks a client needs for crit and death effects (rows 8 and 10), not a mechanism for them; they were not used for this cell.
