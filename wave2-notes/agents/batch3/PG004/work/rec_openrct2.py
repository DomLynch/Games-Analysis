import sys
N="OpenRCT2-OpenRCT2"
G="/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/"
R=G+"network/"
rows=[
("rank = 8-byte permission bitmask",R+"NetworkGroup.h",25,"std::array<uint8_t, 8> actionsAllowed{};"),
("permission enum fixed list (24 + count)",G+"network/NetworkAction.h",21,"enum class Permission : uint32_t"),
("permission table built once from names",G+"network/NetworkAction.h",62,"static const std::array<NetworkAction, static_cast<size_t>(Permission::count)>"),
("permission name for chat",G+"network/NetworkAction.cpp",58,"\"PERMISSION_CHAT\","),
("permission name for kick",G+"network/NetworkAction.cpp",220,"\"PERMISSION_KICK_PLAYER\","),
("rank bit test",R+"NetworkGroup.cpp",120,"return (actionsAllowed[byte] & (1 << bit)) != 0;"),
("json load toggles (XOR), not sets",R+"NetworkGroup.cpp",45,"group.toggleActionPermission(action_id);"),
("toggle is XOR",R+"NetworkGroup.cpp",108,"actionsAllowed[byte] ^= (1 << bit);"),
("game command maps to permission",R+"NetworkGroup.cpp",125,"Permission action = NetworkActions::findCommand(command);"),
("default rank id returned",R+"NetworkBase.cpp",1047,"return default_group;"),
("join: saved user rank, else default rank",R+"NetworkBase.cpp",2235,"? *networkUser->groupId : GetDefaultGroup();"),
("join: unknown key gets default rank",R+"NetworkBase.cpp",2227,"player->group = GetDefaultGroup();"),
("saved-user rank lookup on hash",R+"NetworkBase.cpp",1028,"if (networkUser != nullptr && networkUser->groupId.has_value())"),
("Admin rank: all bits on",R+"NetworkBase.cpp",1090,"admin->actionsAllowed.fill(0xFF);"),
("Spectator rank: chat only",R+"NetworkBase.cpp",1097,"spectator->toggleActionPermission(Permission::chat);"),
("User rank: all bits on, then 7 cleared",R+"NetworkBase.cpp",1104,"user->actionsAllowed.fill(0xFF);"),
("User rank clears kick",R+"NetworkBase.cpp",1105,"user->toggleActionPermission(Permission::kickPlayer);"),
("default rank is Spectator (id 1)",R+"NetworkBase.cpp",1115,"SetDefaultGroup(1);"),
("chat gate on server",R+"NetworkBase.cpp",2977,"if (group == nullptr || !group->canPerformAction(Permission::chat))"),
("chat relayed to everyone when no id list",R+"NetworkBase.cpp",2995,"ServerSendChat(formatted);"),
("host-only commands refused from clients",R+"NetworkBase.cpp",3048,"if (actionType == GameCommand::togglePause || actionType == GameCommand::loadOrQuit)"),
("custom commands skip the permission gate",R+"NetworkBase.cpp",3053,"if (actionType != GameCommand::custom)"),
("game command permission gate on server",R+"NetworkBase.cpp",3057,"if (group == nullptr || group->canPerformCommand(actionType) == false)"),
("refusal shown to the client",R+"NetworkBase.cpp",3059,"ServerSendShowError(connection, STR_CANT_DO_THIS, STR_PERMISSION_DENIED);"),
("host is exempt from cooldowns",R+"NetworkBase.cpp",3075,"if ((player->flags & PlayerFlags::kIsServer) == 0)"),
("per-player cooldown lookup",R+"NetworkBase.cpp",3077,"auto cooldownIt = player->cooldownTime.find(actionType);"),
("cooldown refusal",R+"NetworkBase.cpp",3080,"if (cooldownIt->second > 0)"),
("cooldown comes from the action class",R+"NetworkBase.cpp",3087,"uint32_t cooldownTime = ga->GetCooldownTime();"),
("cooldown stored per player per command",R+"NetworkBase.cpp",3090,"player->cooldownTime[actionType] = cooldownTime;"),
("cooldown container per player",R+"NetworkPlayer.h",47,"std::unordered_map<GameCommand, int32_t> cooldownTime;"),
("cooldown decay subtracts wall-clock delta",R+"NetworkBase.cpp",226,"it->second -= _currentDeltaTime;"),
("delta time from platform ticks",R+"NetworkBase.cpp",485,"uint32_t ticks = Platform::GetTicks();"),
("delta time clamped to at least 1",R+"NetworkBase.cpp",486,"_currentDeltaTime = std::max<uint32_t>(ticks - _lastUpdateTime, 1);"),
("decay runs per connection in server tick",R+"NetworkBase.cpp",558,"DecayCooldown(connection->player);"),
("ride demolish cooldown function",G+"actions/ride/RideDemolishAction.cpp",46,"uint32_t RideDemolishAction::GetCooldownTime() const"),
("small scenery cooldown function",G+"actions/scenery/SmallSceneryPlaceAction.cpp",59,"uint32_t SmallSceneryPlaceAction::GetCooldownTime() const"),
("group change: target must not be host",R+"NetworkBase.cpp",3630,"if (player->flags & PlayerFlags::kIsServer)"),
("only admin may promote to admin",R+"NetworkBase.cpp",3636,"if (groupId == 0 && fromgroup != nullptr && fromgroup->id != 0)"),
("group change stores the new rank",R+"NetworkBase.cpp",3643,"player->group = groupId;"),
("group change is saved to the user store",R+"NetworkBase.cpp",3649,"User* networkUser = userManager.getOrAddUser(player->keyHash);"),
("user store saved on change",R+"NetworkBase.cpp",3652,"userManager.save();"),
("user store file name",R+"NetworkUser.cpp",27,"kUserStoreFilename = \"users.json\";"),
("admin permissions cannot be edited",R+"NetworkBase.cpp",3716,"can't change admin group permissions"),
("edit: actor must hold the permission it toggles",R+"NetworkBase.cpp",3726,"if (mygroup == nullptr || !mygroup->canPerformAction(networkPermission))"),
("edit path: mygroup set only in toggle branch",R+"NetworkBase.cpp",3723,"if (player != nullptr && permissionState == GameActions::PermissionState::toggle)"),
("non-toggle branch needs mygroup",R+"NetworkBase.cpp",3740,"if (mygroup != nullptr)"),
("non-toggle branch copies actor bits",R+"NetworkBase.cpp",3744,"group->actionsAllowed = mygroup->actionsAllowed;"),
("toggle applied to the target group",R+"NetworkBase.cpp",3754,"group->toggleActionPermission(networkPermission);"),
("client copy of rights used for display",R+"NetworkBase.cpp",3881,"return network.group_list[groupindex]->canPerformCommand"),
("scoped chat send signature",R+"NetworkBase.cpp",1532,"ServerSendChat(const char* text, const std::vector<uint8_t>& playerIds)"),
("empty id list means everyone",R+"NetworkBase.cpp",1539,"Empty players / default value means send to all players"),
("scoped chat sends to listed connections",R+"NetworkBase.cpp",1546,"auto conn = GetPlayerConnection(playerId);"),
("scoped chat queued per connection",R+"NetworkBase.cpp",1549,"conn->queuePacket(packet);"),
("script sendMessage passes the id list",G+"scripting/bindings/network/ScNetwork.cpp",285,"Network::SendChat(message.c_str(), playerIds);"),
("script private messages are server only",G+"scripting/bindings/network/ScNetwork.cpp",290,"Only servers can send private messages."),
("licence header: GPL v3",R+"NetworkGroup.cpp",7,"OpenRCT2 is licensed under the GNU General Public License version 3."),
("licence file: GPL",G+"../../licence.txt",1,"GNU GENERAL PUBLIC LICENSE"),
("client chat is sent to the server",G+"../openrct2-ui/interface/Chat.cpp",261,"Network::SendChat(_chatCurrentLine.c_str());"),
]
out=open(sys.argv[1],'a')
for claim,f,l,q in rows:
    assert "\t" not in q and "\t" not in claim
    assert 15<=len(q)<=90, (len(q),q)
    if f.endswith("licence.txt"): f="/mnt/frankendom-donors/OpenRCT2-OpenRCT2/licence.txt"
    if "/../" in f: f=f.replace("/src/openrct2/../","/src/").replace("/src/openrct2/../../","/")
    out.write(f"{N}\t{claim}\t{f}\t{l}\t{q}\n")
print(len(rows),"rows written")
