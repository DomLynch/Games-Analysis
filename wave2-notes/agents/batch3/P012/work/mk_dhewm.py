I="/mnt/frankendom-donors/dhewm-dhewm3/neo/game/Item.cpp"
P="/mnt/frankendom-donors/dhewm-dhewm3/neo/game/Player.cpp"
U="/mnt/frankendom-donors/dhewm-dhewm3/neo/framework/UsercmdGen.h"
N="dhewm-dhewm3"
rows=[
("Pickup reads its respawn time from the item key",I,389,'float respawn = spawnArgs.GetFloat( "respawn" );'),
("Multiplayer default respawn is 20 s when key is 0",I,394,"respawn = 20.0f;"),
("Respawn only if not dropped and not no_respawn",I,397,"if ( respawn && !dropped && !no_respawn ) {"),
("Respawn is a queued delayed event",I,402,"PostEventSec( &EV_RespawnItem, respawn );"),
("Non-respawning pickup is removed after 5000 ms",I,407,"PostEventMS( &EV_Remove, 5000 );"),
("Event_Respawn re-enables the trigger contents",I,552,"GetPhysics()->SetContents( CONTENTS_TRIGGER );"),
("Event_Respawn cancels queued respawns",I,555,"CancelEvents( &EV_RespawnItem ); // don't double respawn"),
("Pickup entry point",I,361,"bool idItem::Pickup( idPlayer *player ) {"),
("Forced respawn window is 10000 ms",P,116,"const int MAX_RESPAWN_TIME = 10000;"),
("Ragdoll death time is 3000 ms",P,117,"const int RAGDOLL_DEATH_TIME = 3000;"),
("Respawn check lives in EvaluateControls",P,5672,"void idPlayer::EvaluateControls( void ) {"),
("Attack press releases respawn after the minimum",P,5675,"if ( ( gameLocal.time > minRespawnTime ) && ( usercmd.buttons & BUTTON_ATTACK ) ) {"),
("Forced release once the maximum time passes",P,5677,"} else if ( gameLocal.time > maxRespawnTime ) {"),
("EvaluateControls is called from Think",P,6290,"EvaluateControls();"),
("Think entry point",P,6209,"void idPlayer::Think( void ) {"),
("Death reads respawn_delay (non-ragdoll path)",P,6528,'delay = spawnArgs.GetFloat( "respawn_delay" );'),
("Min respawn time = now + delay seconds",P,6529,"minRespawnTime = gameLocal.time + SEC2MS( delay );"),
("Max respawn time = min + forced window",P,6530,"maxRespawnTime = minRespawnTime + MAX_RESPAWN_TIME;"),
("Ragdoll branch sets min to a fixed 3000 ms",P,6523,"minRespawnTime = gameLocal.time + RAGDOLL_DEATH_TIME;"),
("Ragdoll condition",P,6521,"if ( StartRagdoll() ) {"),
("Killed entry point",P,6491,"void idPlayer::Killed( idEntity *inflictor"),
("Kill() with delayRespawn reads respawn_delay",P,6478,'int delay = spawnArgs.GetFloat( "respawn_delay" );'),
("Single player hands death to session, MP decides spawns",P,5682,"// in MP, idMultiplayerGame decides spawns"),
("Usercmd rate is 60 Hz",U,40,"const int USERCMD_HZ"),
("Kill entry point",P,6466,"void idPlayer::Kill( bool delayRespawn, bool nodamage ) {"),
("Kill applies a suicide hit before the delayed window",P,6475,'Damage( this, this, vec3_origin, "damage_suicide", 1.0f, INVALID_JOINT );'),
("Event_Respawn entry point",I,544,"void idItem::Event_Respawn( void ) {"),
("Non-respawning pickups are removed unless inv_carry",I,406,'if ( !spawnArgs.GetBool( "inv_carry" ) ) {'),
]
with open("/private/tmp/p2/wave2-haiku/batch3/P012/receipts.tsv","w") as f:
    f.write("\t".join(["note","claim","donor_file","line","quote"])+"\n")
    for claim,path,line,q in rows:
        assert 15<=len(q)<=90, (len(q),q)
        assert "\t" not in q and "\t" not in claim
        f.write("\t".join([N,claim,path,str(line),q])+"\n")
print(len(rows),"rows")
