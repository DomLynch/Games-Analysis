G="2004Scape-Server"
S="/mnt/frankendom-donors/2004Scape-Server/src/"
E=S+"engine/"
Z=E+"zone/Zone.ts"; ZG=E+"zone/ZoneGrid.ts"; ZM=E+"zone/ZoneMap.ts"; BA=E+"entity/BuildArea.ts"; NP=E+"entity/NetworkPlayer.ts"
W=E+"World.ts"; GM=E+"GameMap.ts"; NPE=E+"entity/NonPathingEntity.ts"; LOE=E+"entity/LocObjEvent.ts"; OBJ=E+"entity/Obj.ts"; NPC=E+"entity/Npc.ts"
LL=S+"util/LinkList.ts"; LC=E+"entity/EntityLifeCycle.ts"; ENT=E+"entity/Entity.ts"; LIC="/mnt/frankendom-donors/2004Scape-Server/LICENSE"
R=[
("zone is 8x8 tiles",Z,36,"private static readonly SIZE: number = 8 * 8;"),
("dynamic obj capacity is 2*SIZE+1",Z,38,"private static readonly OBJS: number = (this.SIZE << 1) + 1;"),
("loc capacity constant is declared",Z,37,"private static readonly LOCS: number = this.SIZE << 2;"),
("player entering a zone flags it in the zone grid",Z,82,"World.gameMap.getZoneGrid(this.level).flag(this.x, this.z);"),
("last player leaving unflags the zone",Z,94,"World.gameMap.getZoneGrid(this.level).unflag(this.x, this.z);"),
("computeShared builds one buffer from ENCLOSED events",Z,103,"for (const event of this.enclosed()) {"),
("shared buffer stored on the zone",Z,121,"this.shared = shared;"),
("full resync entry point",Z,132,"writeFullFollows(player: Player): void {"),
("full resync skips objs for other receivers",Z,137,"obj.receiver64 !== player.hash64)) {"),
("full resync header per obj",Z,140,"player.write(new UpdateZonePartialFollows("),
("partial enclosed sends shared buffer",Z,177,"player.write(new UpdateZonePartialEnclosed("),
("zone reset clears shared buffer and events",Z,197,"this.shared = null;"),
("obj cap check before adding a dynamic obj",Z,280,"if (this.totalObjs >= Zone.OBJS) {"),
("cap eviction loop over objs",Z,282,"for (const obj2 of this.getAllObjsUnsafe()) {"),
("cap evicts a DESPAWN obj",Z,283,"if (obj2.lifecycle === EntityLifeCycle.DESPAWN) {"),
("evicted obj removed with duration 0",Z,284,"World.removeObj(obj2, 0);"),
("private dynamic drops go to FOLLOWS",Z,299,"this.queueEvent(obj, new ZoneEvent(ZoneEventType.FOLLOWS, receiver64,"),
("comment claims cheapest objs are dropped",Z,564,"then the cheapest objs are automatically dropped."),
("enclosed events are the shared ones",Z,530,"if (event.type === ZoneEventType.ENCLOSED) {"),
("queueEvent entry point",Z,551,"private queueEvent(entity: NonPathingEntity, event: ZoneEvent): void {"),
("zone grid flag sets bit",ZG,19,"this.grid[this.index(zoneX, zoneY)] |= 1 << (zoneY & ZoneGrid.INT_BITS_FLAG);"),
("zone grid isFlagged signature",ZG,26,"isFlagged(zoneX: number, zoneY: number, radius: number): boolean {"),
("zone index packs 11-bit x, z and 2-bit level",ZM,7,"return ((x >> 3) & 0x7ff) | (((z >> 3) & 0x7ff) << 11)"),
("active zones loop 7x7 around the player",BA,46,"for (let x = centerX - 3; x <= centerX + 3; x++) {"),
("active zones clipped to origin window",BA,41,"const leftX = originX - 6;"),
("active zone index added",BA,52,"this.activeZones.add(ZoneMap.zoneIndex(x << 3, z << 3, this.player.level));"),
("build area comment 13x13 zones",BA,77,"build area is 13x13 zones (8*13 = 104 tiles)"),
("rebuild when player leaves reload box",BA,67,"if (this.player.x < reloadLeftX || this.player.z < reloadBottomZ ||"),
("rebuild resets origin to player",BA,88,"this.player.originX = this.player.x;"),
("rebuild clears loaded zones",BA,90,"this.loadedZones.clear();"),
("updateZones unloads inactive zones",NP,318,"if (!activeZones.has(zoneIndex)) {"),
("full resync only for not-yet-loaded zones",NP,326,"if (!loadedZones.has(zone.index)) {"),
("updateZones calls writeFullFollows",NP,327,"zone.writeFullFollows(this);"),
("updateZones calls writePartialEncloses",NP,329,"zone.writePartialEncloses(this);"),
("multiway flag toggled on zone change",NP,290,"if (lastWasMulti != nowIsMulti) {"),
("processZones runs after player and npc logic",W,419,"this.processZones();"),
("processClientsOut sends zone updates",W,437,"this.processClientsOut();"),
("processZones iterates locObjTracker",W,984,"for (const event of this.locObjTracker.all()) {"),
("processZones computes shared per tracked zone",W,997,"zone.computeShared();"),
("player updateZones call in client output",W,1123,"player.updateZones();"),
("cleanup resets tracked zones",W,1153,"this.zonesTracking.forEach(zone => zone.reset());"),
("zone tracked when touched",W,1368,"this.zonesTracking.add(zone);"),
("npc removal applies player-count scaling",W,1332,"const adjustedDuration = this.scaleByPlayerCount(duration);"),
("npc respawn uses scaled duration",W,1351,"npc.setLifeCycle(adjustedDuration);"),
("obj removal applies player-count scaling",W,1542,"const adjustedDuration = this.scaleByPlayerCount(duration);"),
("obj respawn uses scaled duration",W,1548,"obj.setLifeCycle(adjustedDuration);"),
("loc removal sets respawn with unscaled duration",W,1453,"loc.setLifeCycle(duration);"),
("scaleByPlayerCount signature",W,1773,"scaleByPlayerCount(rate: number): number {"),
("player count capped at 2000",W,1775,"const playerCount = Math.min(this.getTotalPlayers(), 2000);"),
("scale formula (4000 - P) * rate / 4000",W,1776,"return (((4000 - playerCount) * rate) / 4000) | 0;"),
("static npc loader creates RESPAWN npcs",GM,116,"EntityLifeCycle.RESPAWN, World.getNextNid()"),
("static npc added through World.addNpc",GM,118,"World.addNpc(npc, -1);"),
("static obj loader creates RESPAWN objs",GM,137,"const obj: Obj = new Obj(level, absoluteX, absoluteZ, EntityLifeCycle.RESPAWN"),
("static obj added to its zone",GM,139,"this.getZone(obj.x, obj.z, obj.level).addStaticObj(obj);"),
("static loc added to its zone as RESPAWN",GM,248,"addStaticLoc(new Loc(actualLevel"),
("loadNpcs reads a per-square list",GM,103,"private loadNpcs(packet: Packet, mapsquareX: number, mapsquareZ: number): void {"),
("npc loader skips free-to-play rule",GM,111,"if (!this.members && !this.isFreeToPlay(absoluteX, absoluteZ)) {"),
("RESPAWN lifecycle meaning",LC,3,"RESPAWN, // entity added from engine that respawns later."),
("npc lifecycle timer decremented",NPC,122,"if (!this.delayed && --this.lifecycleTick === 0) {"),
("obj lifecycle timer decremented",OBJ,33,"--this.lifecycleTick;"),
("non-pathing entities register a loc/obj event",NPE,18,"if (duration > 0) {"),
("event added to locObjTracker",NPE,20,"World.locObjTracker.addTail(event);"),
("event check is identity with tracker",LOE,15,"return this === this.entity.eventTracker;"),
("lifecycle tick set from duration",ENT,37,"this.lifecycleTick = tick;"),
("linklist all iterates tail when reverse",LL,99,"for (let link = this.tail(); link !== null; link = this.prev()) {"),
("MIT copyright line",LIC,3,"Copyright (c) 2023-2025 Lost City"),
]
lines=open("receipts.tsv").read().split("\n")
lines=[l for l in lines if l and not l.startswith(G+"\t")]
for claim,fn,ln,q in R:
    if not (15<=len(q)<=90): print("LEN",len(q),claim,q)
    assert "\t" not in q
    lines.append("\t".join([G,claim,fn,str(ln),q]))
open("receipts.tsv","w").write("\n".join(lines)+"\n")
print(len(R),"rows")
