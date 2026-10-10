import sys
N="OpenTTD-OpenTTD"
S="/mnt/frankendom-donors/OpenTTD-OpenTTD/src/"
rows=[
("chat routing switch by destination",S+"network/network_server.cpp",1311,"switch (desttype) {"),
("private: one client by id",S+"network/network_server.cpp",1312,"case NetworkChatDestinationType::Client:"),
("private: find the target client, must be authorized",S+"network/network_server.cpp",1327,"if (cs->client_id == (ClientID)dest && cs->status >="),
("private: send to the target",S+"network/network_server.cpp",1328,"cs->SendChat(action, from_id, false, msg, data);"),
("team: case",S+"network/network_server.cpp",1352,"case NetworkChatDestinationType::Team: {"),
("team: all authorized clients of the company given by dest",S+"network/network_server.cpp",1359,"if (ci != nullptr && ci->client_playas == (CompanyID)dest"),
("team: sender's own echo suppressed when it is in the team",S+"network/network_server.cpp",1361,"if (cs->client_id == from_id) show_local = false;"),
("team: server admin reads company chat if it is on that company",S+"network/network_server.cpp",1367,"if (_local_company == (CompanyID)dest"),
("broadcast: case",S+"network/network_server.cpp",1402,"case NetworkChatDestinationType::Broadcast:"),
("broadcast: all authorized clients",S+"network/network_server.cpp",1404,"if (cs->status >= ServerNetworkGameSocketHandler::ClientStatus::Authorized) cs->SendChat"),
("broadcast also goes to the admin network",S+"network/network_server.cpp",1407,"NetworkAdminChat(action, desttype, from_id, msg, data, from_admin);"),
("receive: chat from a client needs pre-active status",S+"network/network_server.cpp",1434,"if (this->status < ClientStatus::PreActive) {"),
("receive: destination type read from the packet",S+"network/network_server.cpp",1440,"static_cast<NetworkChatDestinationType>(p.Recv_uint8());"),
("receive: message length cap",S+"network/network_server.cpp",1445,"std::string msg = p.Recv_string(NETWORK_CHAT_LENGTH);"),
("receive: only three chat actions accepted",S+"network/network_server.cpp",1450,"case NetworkAction::ChatBroadcast:"),
("receive: dest passed on without a company check",S+"network/network_server.cpp",1453,"NetworkServerSendChat(action, desttype, dest, msg, this->client_id, data);"),
("receive: unknown action kicks the client",S+"network/network_server.cpp",1456,"Kicking client #{} (IP: {}) due to unknown chact action."),
("receive: unknown action error",S+"network/network_server.cpp",1457,"return this->SendError(NetworkErrorCode::NotExpected);"),
("contrast: company command checks the sender's company",S+"network/network_server.cpp",1149,"&& ci->client_playas != cp.company) {"),
("contrast: second company check on a command",S+"network/network_server.cpp",1169,"if (ci->client_id != ClientID::Server && ci->client_playas != cp.company)"),
("cap: chat length in bytes",S+"network/core/config.h",59,"The maximum length of a chat message, in bytes including"),
("client chat: server host sends locally",S+"network_chat_gui.cpp" if False else S+"network/network_chat_gui.cpp",265,"NetworkServerSendChat(action, type, dest, buf, ClientID::Server);"),
("client chat: client sends to server",S+"network/network_chat_gui.cpp",263,"MyClient::SendChat(action, type, dest, buf, 0);"),
("client chat: team action mapping",S+"network/network_chat_gui.cpp",257,"action = NetworkAction::ChatTeam; break;"),
("client UI passes its company as the team id",S+"network/network_gui.cpp",1632,"ShowNetworkChatQueryWindow(NetworkChatDestinationType::Team, company_id.base());"),
("echo label for team chat",S+"network/network.cpp",279,"case NetworkAction::ChatTeam: builder += GetString(self_send"),
("licence: GPL version 2 (no or-later in header)",S+"network/network_chat_gui.cpp",3,"as published by the Free Software Foundation, version 2."),
]
out=open(sys.argv[1],'a')
for claim,f,l,q in rows:
    assert "\t" not in q and "\t" not in claim
    assert 15<=len(q)<=90, (len(q),q)
    out.write(f"{N}\t{claim}\t{f}\t{l}\t{q}\n")
print(len(rows),"rows written")
