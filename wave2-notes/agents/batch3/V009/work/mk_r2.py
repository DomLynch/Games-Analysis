import csv
T="/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Combat/ThreatManager.cpp"
H="/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Combat/ThreatManager.h"
R="/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Combat/ThreatManager.cpp"
CR="/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Creature/Creature.cpp"
AI="/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/AI/CreatureAI.cpp"
N="TrinityCore-TrinityCore"
rows=[
("update loop: timer check every tick",T,220,"if (_updateTimer <= tdiff)"),
("update loop: only when list not empty, then UpdateVictim",T,228,"if (!IsThreatListEmpty(true))"),
("update loop: timer reset to THREAT_UPDATE_INTERVAL",T,231,"_updateTimer = THREAT_UPDATE_INTERVAL;"),
("THREAT_UPDATE_INTERVAL = 1000 ms",H,86,"static const uint32 THREAT_UPDATE_INTERVAL = 1000u;"),
("Creature::Update drives threat update",CR,765,"GetThreatManager().Update(diff);"),
("SelectVictim asks the threat manager for the current victim",CR,1245,"target = GetThreatManager().GetCurrentVictim();"),
("CreatureAI::UpdateVictim calls SelectVictim",AI,257,"if (Unit* victim = me->SelectVictim())"),
("GetCurrentVictim reselects only if none or offline",T,244,"if (!_currentVictimRef || _currentVictimRef->ShouldBeOffline())"),
("AddThreat: NO_THREAT attribute returns early",T,387,"if (spell->HasAttribute(SPELL_ATTR1_NO_THREAT))"),
("AddThreat: no initial threat when not engaged",T,389,"if (!_owner->IsEngaged() && spell->HasAttribute(SPELL_ATTR2_NO_INITIAL_THREAT))"),
("AddThreat: modifiers applied to amount",T,409,"amount = CalculateModifiedThreat(amount, target, spell);"),
("AddThreat: redirect share is a percent of the original amount",T,431,"float amountRedirected = CalculatePct(origAmount, pair.second);"),
("AddThreat: no threat without combat",T,440,"if (!_owner->GetCombatManager().SetInCombatWith(target))"),
("AddThreat: suppressed ref returns online only on new threat",T,450,"if (ref->GetOnlineState() == ThreatReference::ONLINE_STATE_SUPPRESSED)"),
("AddThreat: retail rule comment on suppression",T,449,"SUPPRESSED threat states don't go back to ONLINE until threat is caused by them"),
("AddThreat: existing ref gains threat only if online",T,457,"if (ref->IsOnline())"),
("AddThreat: first victim selected when none is current",T,471,"if (!_currentVictimRef)"),
("ReselectVictim: refresh offline state of every ref",T,602,"pair.second->UpdateOffline();"),
("ReselectVictim: fixated target wins while available",T,605,"if (_fixateRef && _fixateRef->IsAvailable())"),
("ReselectVictim: heap top is the highest threat",T,612,"ThreatReference const* highest = _sortedThreatList->top();"),
("ReselectVictim: keep old victim if highest is still top",T,617,"if (!oldVictimRef || highest == oldVictimRef)"),
("ReselectVictim: keep old unless highest beats it by 110%",T,620,"if (!ThreatManager::CompareReferencesLT(oldVictimRef, highest, 1.1f))"),
("ReselectVictim: 130% switches regardless of range",T,623,"if (ThreatManager::CompareReferencesLT(oldVictimRef, highest, 1.3f))"),
("ReselectVictim: between 110 and 130, melee range switches",T,626,"if (_owner->IsWithinMeleeRange(highest->_victim))"),
("ReselectVictim: walk down, stop when next is under 110%",T,638,"if (!ThreatManager::CompareReferencesLT(oldVictimRef, next, 1.1f))"),
("ReselectVictim: walk down, melee next above 110% takes over",T,641,"if (_owner->IsWithinMeleeRange(next->_victim))"),
("UpdateVictim calls ReselectVictim",T,583,"ThreatReference const* const newVictim = ReselectVictim();"),
("comparator: online state precedence",T,670,"online state precedence (ONLINE > SUPPRESSED > OFFLINE)"),
("comparator: online state compared first",T,671,"return a->_online < b->_online;"),
("comparator: taunt state compared second",T,673,"return a->_taunted < b->_taunted;"),
("comparator: then weighted threat a*w < b",T,674,"return (a->GetThreat()*aWeight < b->GetThreat());"),
("OnlineState enum values",H,268,"ONLINE_STATE_SUPPRESSED = 1, ONLINE_STATE_OFFLINE = 0 };"),
("GetThreat clamps base plus temp modifier at 0",H,272,"float GetThreat() const { return std::max<float>(_baseAmount + _tempModifier, 0.0f); }"),
("ref AddThreat clamps base at 0",T,42,"_baseAmount = std::max<float>(_baseAmount + amount, 0.0f);"),
("ShouldBeOffline: target not visible",T,101,"if (!_owner->CanSeeOrDetect(_victim))"),
("ShouldBeSuppressed: taunting victim never suppressed",T,112,"if (IsTaunting()) // a taunting victim can never be suppressed"),
("ShouldBeSuppressed: immune to owner's melee school",T,114,"if (_victim->IsImmunedToDamage(_owner->GetMeleeDamageSchoolMask()))"),
("ShouldBeSuppressed: confused",T,116,"if (_victim->HasAuraType(SPELL_AURA_MOD_CONFUSE))"),
("ShouldBeSuppressed: stunned by breakable aura",T,118,"if (_victim->HasBreakableByDamageAuraType(SPELL_AURA_MOD_STUN))"),
("TauntUpdate: last taunt caster on the list wins",T,512,"tauntStates[tauntEffect->GetCasterGUID()] = ++tauntPriority;"),
("CalculateModifiedThreat: spell pctMod",T,684,"threat *= threatEntry->pctMod;"),
("CalculateModifiedThreat: Hate spell mod",T,687,"modOwner->ApplySpellMod(spell, SpellModOp::Hate, threat);"),
("CalculateModifiedThreat: victim school modifier",T,696,"threat *= victimMgr._singleSchoolModifiers[SPELL_SCHOOL_NORMAL];"),
("CalculateModifiedThreat: multi-school aura multiplier",T,724,"float mod = victim->GetTotalAuraMultiplierByMiscMask(SPELL_AURA_MOD_THREAT, mask);"),
("ForwardThreatForAssistingMe: signature",T,733,"void ThreatManager::ForwardThreatForAssistingMe(Unit* assistant, float baseAmount"),
("assist threat: CC'd threatened units get no share",T,750,"targets under CC cannot gain assist threat - split evenly among the rest"),
("assist threat: even split by count",T,752,"float const perTarget = baseAmount / canBeThreatened.size();"),
("GetThreat returns 0 when the ref is offline and not included",T,289,"return (includeOffline || it->second->IsAvailable()) ? it->second->GetThreat() : 0.0f;"),
]
with open("receipts.tsv","w",newline="") as f:
    w=csv.writer(f,delimiter="\t",quoting=csv.QUOTE_NONE,escapechar=None,lineterminator="\n")
    w.writerow(["note","claim","donor_file","line","quote"])
    for claim,fp,ln,q in rows:
        assert "\t" not in q and 15<=len(q)<=90, (claim,len(q))
        w.writerow([N,claim,fp,ln,q])
print("wrote",len(rows))
