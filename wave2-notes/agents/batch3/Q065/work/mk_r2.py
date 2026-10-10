import sys
N="ValveSoftware-source-sdk-2013"
B="/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/server/"
rows=[
("OnTakeDamage is the entry point that dispatches on life state", B+"basecombatcharacter.cpp", 2393, "int CBaseCombatCharacter::OnTakeDamage( const CTakeDamageInfo &info )"),
("donor comment: OnTakeDamage is the only function that reduces health", B+"basecombatcharacter.cpp", 2382, "This should be the only function that ever reduces health."),
("no damage when m_takedamage is off", B+"basecombatcharacter.cpp", 2397, "if (!m_takedamage)"),
("injury timer per attacker team restarts on each hit", B+"basecombatcharacter.cpp", 2420, "m_damageHistory[i].interval.Start();"),
("alive victims go to OnTakeDamage_Alive", B+"basecombatcharacter.cpp", 2437, "retVal = OnTakeDamage_Alive( info );"),
("death check runs after the alive hit", B+"basecombatcharacter.cpp", 2438, "if ( m_iHealth <= 0 )"),
("Event_Killed runs on a lethal hit", B+"basecombatcharacter.cpp", 2448, "Event_Killed( info );"),
("OnTakeDamage_Alive definition", B+"basecombatcharacter.cpp", 2480, "int CBaseCombatCharacter::OnTakeDamage_Alive( const CTakeDamageInfo &info )"),
("attack direction from inflictor centre, lowered 10 units", B+"basecombatcharacter.cpp", 2486, "vecDir = info.GetInflictor()->WorldSpaceCenter() - Vector ( 0, 0, 10 ) - WorldSpaceCenter();"),
("donor admits armour is not implemented in this function", B+"basecombatcharacter.cpp", 2491, "//!!!LATER - make armor consideration here!"),
("events-only victims skip the health block", B+"basecombatcharacter.cpp", 2493, "if ( m_takedamage != DAMAGE_EVENTS_ONLY )"),
("fractional part split off the damage", B+"basecombatcharacter.cpp", 2496, "float flFractionalDamage = info.GetDamage() - floor( info.GetDamage() );"),
("integer part is damage minus its fraction", B+"basecombatcharacter.cpp", 2497, "float flIntegerDamage = info.GetDamage() - flFractionalDamage;"),
("fraction added to the per-entity accumulator", B+"basecombatcharacter.cpp", 2500, "m_flDamageAccumulator += flFractionalDamage;"),
("accumulator releases one whole point at 1.0", B+"basecombatcharacter.cpp", 2504, "if( m_flDamageAccumulator >= 1.0 )"),
("accumulator gives up the released point", B+"basecombatcharacter.cpp", 2507, "m_flDamageAccumulator -= 1.0;"),
("no whole damage this hit returns early", B+"basecombatcharacter.cpp", 2510, "if ( flIntegerDamage <= 0 )"),
("health loss uses the whole-point damage", B+"basecombatcharacter.cpp", 2513, "m_iHealth -= flIntegerDamage;"),
("accumulator field comment: small amounts are not lost", B+"basecombatcharacter.h", 509, "so very small amounts of damage do not get lost."),
("dying victims take no damage in this function", B+"basecombatcharacter.cpp", 2520, "int CBaseCombatCharacter::OnTakeDamage_Dying( const CTakeDamageInfo &info )"),
("dead victims take the raw damage with no accumulator", B+"basecombatcharacter.cpp", 2530, "m_iHealth -= info.GetDamage();"),
("NPC override calls the base before its own logic", B+"ai_basenpc.cpp", 713, "if ( !BaseClass::OnTakeDamage_Alive( info ) )"),
("player override calls the base first too", B+"player.cpp", 1614, "if ( !BaseClass::OnTakeDamage_Alive( info ) )"),
("knockback: explicit force is 75 kg times 4 per damage point", B+"basecombatcharacter.cpp", 1396, "float forceScale = info.GetDamage() * 75 * 4;"),
("blast force exaggerated by 1.375", B+"basecombatcharacter.cpp", 1406, "forceVector *= 1.375f;"),
("licence: copyright header of the donor file", B+"basecombatcharacter.cpp", 1, "Copyright Valve Corporation, All rights reserved."),
("licence: repo LICENSE is the Source 1 SDK licence", "/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/LICENSE", 1, "SOURCE 1 SDK LICENSE"),
("licence: free use and modification of the SDK", "/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/LICENSE", 9, "You may, free of charge, use, copy, and modify the SDK"),
]
with open(sys.argv[1],"a") as fh:
    for claim,f,l,q in rows:
        fh.write("\t".join([N,claim,f,str(l),q])+"\n")
print(len(rows),"rows appended")
