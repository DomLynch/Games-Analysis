import csv
U="/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Unit/Unit.cpp"
C="/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Creature/Creature.cpp"
D="/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/DataStores/DB2Stores.cpp"
N="TrinityCore-TrinityCore"
rows=[
("armour mitigation entry point",U,1689,"uint32 Unit::CalcArmorReducedDamage("),
("per-target armour multiplier applied first",U,1695,"armor *= victim->GetArmorMultiplierForTarget(attacker);"),
("bypass-armour aura percent, capped at 100",U,1703,"armor = CalculatePct(armor, 100 - std::min(armorBypassPct, 100.0));"),
("target-resistance mod adds flat armour",U,1706,"armor += attacker->GetTotalAuraModifierByMiscMask(SPELL_AURA_MOD_TARGET_RESISTANCE"),
("armour-penetration rating clamped 0 to 100",U,1731,"RoundToInterval(arpPct, 0.f, 100.f);"),
("penetration base below level 60",U,1735,"maxArmorPen = float(400 + 85 * victim->GetLevelForTarget(attacker));"),
("penetration growth at level 60 and up",U,1737,"4.5f * 85 * (victim->GetLevelForTarget(attacker) - 59);"),
("penetration cap: min((armour+pen)/3, armour)",U,1740,"maxArmorPen = std::min((armor + maxArmorPen) / 3.f, armor);"),
("penetration applied as percent of the cap",U,1742,"armor -= CalculatePct(maxArmorPen, arpPct);"),
("zero armour returns damage unchanged",U,1746,"if (G3D::fuzzyLe(armor, 0.0f))"),
("armour constant K from DB2 expected stat by level",U,1761,"sDB2Manager.EvaluateExpectedStat(ExpectedStatType::ArmorConstant, attackerLevel"),
("zero denominator returns damage unchanged",U,1773,"if (!(armor + armorConstant))"),
("mitigation = min(armour/(armour+K), 0.85)",U,1776,"float mitigation = std::min(armor / (armor + armorConstant), 0.85f);"),
("damage after mitigation, floored at 0, truncated to uint32",U,1777,"return uint32(std::max(damage * (1.0f - mitigation), 0.0f));"),
("caller 1: spell damage taken",U,1213,"damage = Unit::CalcArmorReducedDamage(damageInfo->attacker, victim, damage"),
("caller 2: melee damage calc",U,1399,"damageInfo->Damage = Unit::CalcArmorReducedDamage(damageInfo->Attacker"),
("armour applies only to physical school",U,1683,"if ((schoolMask & SPELL_SCHOOL_MASK_NORMAL) == 0)"),
("mixed magic/physical spells: weaker of resist and armour counts",U,1826,"uint32 damageAfterArmor = Unit::CalcArmorReducedDamage(attacker, victim, damage, spellInfo"),
("armour reduction is the gap, then min() picks the weakest",U,1827,"float armorReduction = damage - damageAfterArmor;"),
("K lookup falls back to expansion -2 row",D,2516,"expectedStatItr = _expectedStatsByLevel.find(std::make_pair(level, -2));"),
("creature armour scales only when levels are scalable",C,3219,"if (!HasScalableLevels())"),
("creature armour multiplier = base armour(target level) / base armour(own level)",C,3224,"return GetBaseArmorForLevel(levelForTarget) / GetBaseArmorForLevel(GetLevel());"),
("creature multiplier function signature",C,3217,"float Creature::GetArmorMultiplierForTarget(WorldObject const* target) const"),
("victim armour read before any modifier",U,1691,"float armor = float(victim->GetArmor());"),
("bypass-armour sum from this attacker's auras",U,1702,"armorBypassPct += (*i)->GetAmount();"),
("player-owned spell mod on target resistance",U,1710,"modOwner->ApplySpellMod(spellInfo, SpellModOp::TargetResistance, armor);"),
("ignore-target-resist aura: floor(AddPct(armor, -amount))",U,1716,"armor = std::floor(AddPct(armor, -aurEff->GetAmount()));"),
("armour-penetration rating read for player attackers",U,1722,"float arpPct = attacker->ToPlayer()->GetRatingBonusValue(CR_ARMOR_PENETRATION);"),
("max penetration starts at zero before the level formula",U,1733,"float maxArmorPen = 0.f;"),
("item-level diminishing curve only at max level",U,1765,"if (attackerLevel == maxLevelForExpansion)"),
("item-level curve multiplies K",U,1769,"armorConstant *= sDB2Manager.GetCurveValueAt(curveId, itemLevelDelta);"),
("armour reduction only for non-ignore spells",U,1686,"return !spellInfo || !spellInfo->HasAttribute(SPELL_ATTR0_CU_IGNORE_ARMOR);"),
("K lookup first tries the attacker's expansion",D,2514,"auto expectedStatItr = _expectedStatsByLevel.find(std::make_pair(level, expansion));"),
]
with open("receipts.tsv","w",newline="") as f:
    w=csv.writer(f,delimiter="\t",quoting=csv.QUOTE_NONE,escapechar=None,lineterminator="\n")
    w.writerow(["note","claim","donor_file","line","quote"])
    for claim,fp,ln,q in rows:
        assert "\t" not in q and 15<=len(q)<=90, (claim,len(q))
        w.writerow([N,claim,fp,ln,q])
print("wrote",len(rows))
