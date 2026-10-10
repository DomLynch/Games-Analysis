import sys
N="smogon-pokemon-showdown"
S="/mnt/frankendom-donors/smogon-pokemon-showdown/sim/"
rows=[
("getDamage is the per-target damage entry used by the spread hit loop", S+"battle-actions.ts", 1145, "const curDamage = this.getDamage(source, target, moveData);"),
("getDamage signature takes source, target and move", S+"battle-actions.ts", 1573, "source: Pokemon, target: Pokemon, move: string | number | ActiveMove,"),
("crit ratio is an event-modifiable value", S+"battle-actions.ts", 1611, "runEvent('ModifyCritRatio', source, target, move, move.critRatio || 0);"),
("crit ratio clamped 0..4 from gen 6", S+"battle-actions.ts", 1616, "critRatio = this.battle.clampIntRange(critRatio, 0, 4);"),
("older gens crit denominators", S+"battle-actions.ts", 1614, "critMult = [0, 16, 8, 4, 3, 2];"),
("gen 7+ crit denominators: 1 in 24, 8, 2, then always", S+"battle-actions.ts", 1620, "critMult = [0, 24, 8, 2, 1];"),
("crit roll is a 1-in-N random chance", S+"battle-actions.ts", 1628, "moveHit.crit = this.battle.randomChance(1, critMult[critRatio]);"),
("crit ignores the attacker's negative offence boosts and the defender's positive defence boosts", S+"battle-actions.ts", 1675, "ignorePositiveDefensive = true;"),
("attack uses stage-adjusted calculateStat", S+"battle-actions.ts", 1689, "let attack = attacker.calculateStat(attackStat, atkBoosts, 1, source);"),
("base formula: 2 times level over 5 plus 2, times power times attack, over defence, over 50", S+"battle-actions.ts", 1705, "const baseDamage = tr(tr(tr(tr(2 * level / 5 + 2) * basePower * attack)"),
("the +2 is added after the base formula", S+"battle-actions.ts", 1718, "baseDamage += 2;"),
("spread modifier is 0.5 in free-for-all and 0.75 otherwise", S+"battle-actions.ts", 1722, "const spreadModifier = this.battle.gameType === 'freeforall' ? 0.5 : 0.75;"),
("crit flag read from the move hit data", S+"battle-actions.ts", 1736, "const isCrit = target.getMoveHitData(move).crit;"),
("crit multiplier 1.5 from gen 6, 2 before", S+"battle-actions.ts", 1738, "baseDamage = tr(baseDamage * (move.critModifier ||"),
("random factor is applied after the crit", S+"battle-actions.ts", 1742, "baseDamage = this.battle.randomizer(baseDamage);"),
("STAB check before the STAB multiplier", S+"battle-actions.ts", 1752, "const isSTAB = move.forceSTAB"),
("type effectiveness is clamped to -6..6", S+"battle-actions.ts", 1783, "let typeMod = target.runEffectiveness(move);"),
("each super-effective step doubles", S+"battle-actions.ts", 1790, "baseDamage *= 2;"),
("each resisted step halves with truncation", S+"battle-actions.ts", 1797, "baseDamage = tr(baseDamage / 2);"),
("burn halves physical damage", S+"battle-actions.ts", 1805, "baseDamage = this.battle.modify(baseDamage, 0.5);"),
("a landed attack does at least 1 damage (gen 6 and later)", S+"battle-actions.ts", 1825, "if (this.battle.gen !== 5 && !baseDamage) return 1;"),
("final value truncated to 16 bits", S+"battle-actions.ts", 1828, "return tr(baseDamage, 16);"),
("randomizer: damage times (100 minus random 0..15), over 100", S+"battle.ts", 2397, "return tr(tr(baseDamage * (100 - this.random(16))) / 100);"),
("fixed-point modify: 4096 units with round-to-nearest", S+"battle.ts", 2345, "const modifier = tr(numerator * 4096 / denominator);"),
("fixed-point modify result", S+"battle.ts", 2346, "return tr((tr(value * modifier) + 2048 - 1) / 4096);"),
("random(n) is an integer in [0, n)", S+"prng.ts", 87, "random(n) returns an integer in [0, n)"),
("donor trunc is unsigned 32-bit truncation", S+"dex.ts", 367, "return num >>> 0;"),
("trunc with bits wraps modulo 2 to the bits", S+"dex.ts", 366, "if (bits) return (num >>> 0) % (2 ** bits);"),
("stat stage multiplier table", S+"pokemon.ts", 583, "const boostTable = [1, 1.5, 2, 2.5, 3, 3.5, 4];"),
("stage boost applied as floor of stat times table entry", S+"pokemon.ts", 587, "stat = Math.floor(stat * boostTable[boost]);"),
("calculateStat takes a boost and a modifier", S+"pokemon.ts", 560, "calculateStat(statName: StatIDExceptHP, boost: number, modifier?: number"),
("licence: MIT", "/mnt/frankendom-donors/smogon-pokemon-showdown/LICENSE", 1, "The MIT License (MIT)"),
]
with open(sys.argv[1],"a") as fh:
    for claim,f,l,q in rows:
        fh.write("\t".join([N,claim,f,str(l),q])+"\n")
print(len(rows),"rows appended")
