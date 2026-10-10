import sys
N="OpenRA-OpenRA"
G="/mnt/frankendom-donors/OpenRA-OpenRA/"
rows=[
("sender: team-chat switch off when no non-bot ally is in the match",G+"OpenRA.Mods.Common/Widgets/Logic/Ingame/IngameChatLogic.cs",71,"var disableTeamChat = alwaysDisabled || (world.LocalPlayer != null"),
("sender: local dead/spectator sends on spectator channel (uint.MaxValue), else team number",G+"OpenRA.Mods.Common/Widgets/Logic/Ingame/IngameChatLogic.cs",155,"? uint.MaxValue : (uint)orderManager.LocalClient.Team;"),
("sender: chat order carries channel number",G+"OpenRA.Mods.Common/Widgets/Logic/Ingame/IngameChatLogic.cs",157,"orderManager.IssueOrder(Order.Chat(chatText.Text.Trim(), teamNumber));"),
("sender: dead local player is moved to spectator team chat",G+"OpenRA.Mods.Common/Widgets/Logic/Ingame/IngameChatLogic.cs",120,"The game is over for us, join spectator team chat"),
("sender: team chat turns off when local player is last living ally",G+"OpenRA.Mods.Common/Widgets/Logic/Ingame/IngameChatLogic.cs",129,"disableTeamChat = players.All(p => p.WinState != WinState.Undefined"),
("sender: team chat disabled for good after game over",G+"OpenRA.Mods.Common/Widgets/Logic/Ingame/IngameChatLogic.cs",138,"world.GameOver += () => disableTeamChat = true;"),
("client chat enable uses the server's DisableChatEntry time",G+"OpenRA.Mods.Common/Widgets/Logic/Ingame/IngameChatLogic.cs",357,"Game.RunTime >= TextNotificationsManager.ChatDisabledUntil"),
("chat length cap constant 2500",G+"OpenRA.Game/Network/UnitOrders.cs",22,"public const int ChatMessageMaxLength = 2500;"),
("receiver truncates chat to the cap (client side)",G+"OpenRA.Game/Network/UnitOrders.cs",120,"if (message.Length > ChatMessageMaxLength)"),
("channel meaning: ExtraData 0 is general chat, else team",G+"OpenRA.Game/Network/UnitOrders.cs",123,"ExtraData 0 means this is a normal chat order"),
("receiver: spectator channel shown only to observers, validated",G+"OpenRA.Game/Network/UnitOrders.cs",152,"if (order.ExtraData == uint.MaxValue && localClientIsObserver)"),
("receiver: team line valid only if sender team matches channel and sender alive",G+"OpenRA.Game/Network/UnitOrders.cs",161,"var valid = client.Team == order.ExtraData && player != null"),
("receiver: team line shown only when local player is on the team and alive (or replay)",G+"OpenRA.Game/Network/UnitOrders.cs",165,"if (valid && (isSameTeam || world.IsReplay))"),
("receiver: ally suffix on general chat",G+"OpenRA.Game/Network/UnitOrders.cs",131,"suffix += \" (Ally)\";"),
("receiver: server disable order with max value means until further notice",G+"OpenRA.Game/Network/UnitOrders.cs",85,"TextNotificationsManager.ChatDisabledUntil = uint.MaxValue;"),
("receiver: timed disable is client receive time plus the server value",G+"OpenRA.Game/Network/UnitOrders.cs",87,"TextNotificationsManager.ChatDisabledUntil = Game.RunTime + order.ExtraData;"),
("server: chat order passes the flood gate before relay",G+"OpenRA.Game/Server/Server.cs",1029,"if (!IsMultiplayer || !playerMessageTracker.IsPlayerAtFloodLimit(conn))"),
("server: chat relayed to all other validated connections with no channel filter",G+"OpenRA.Game/Server/Server.cs",1030,"DispatchOrdersToClients(conn, 0, o.Serialize());"),
("server: relay loop sends to every other validated connection",G+"OpenRA.Game/Server/Server.cs",858,"if (c != conn && c.Validated)"),
("server: new non-admin connection gets chat disabled at join",G+"OpenRA.Game/Server/Server.cs",569,"if (!client.IsAdmin && Settings.FloodLimitJoinCooldown > 0)"),
("server: join cooldown sent to the new connection",G+"OpenRA.Game/Server/Server.cs",570,"playerMessageTracker.DisableChatUI(newConn, Settings.FloodLimitJoinCooldown);"),
("flood: admin flag read from the client",G+"OpenRA.Game/Server/PlayerMessageTracker.cs",47,"var isAdmin = server.GetClient(conn)?.IsAdmin ?? false;"),
("flood: window prune keeps stamps with t + interval >= now",G+"OpenRA.Game/Server/PlayerMessageTracker.cs",51,"tracker.RemoveAll(t => t + settings.FloodLimitInterval < time);"),
("flood: join cooldown check (non-admin only)",G+"OpenRA.Game/Server/PlayerMessageTracker.cs",56,"if (!isAdmin && time < settings.FloodLimitJoinCooldown)"),
("flood: block when window is full",G+"OpenRA.Game/Server/PlayerMessageTracker.cs",64,"if (tracker.Count >= settings.FloodLimitMessageCount)"),
("flood: remaining time = oldest stamp + interval",G+"OpenRA.Game/Server/PlayerMessageTracker.cs",66,"var remaining = CalculateRemaining(tracker[0] + settings.FloodLimitInterval);"),
("flood: accepted message is stamped",G+"OpenRA.Game/Server/PlayerMessageTracker.cs",71,"tracker.Add(time);"),
("flood: penalty delta = cooldown minus interval",G+"OpenRA.Game/Server/PlayerMessageTracker.cs",76,"Math.Max(0, settings.FloodLimitCooldown - settings.FloodLimitInterval)"),
("flood: all stamps pushed to now + penalty delta",G+"OpenRA.Game/Server/PlayerMessageTracker.cs",78,"tracker[i] = time + cooldownDelta;"),
("flood: client chat UI disabled for the full cooldown",G+"OpenRA.Game/Server/PlayerMessageTracker.cs",80,"DisableChatUI(conn, settings.FloodLimitCooldown);"),
("flood: DisableChatEntry order sent to the client",G+"OpenRA.Game/Server/PlayerMessageTracker.cs",39,"dispatchOrdersToClient(conn, 0, 0, new Order(\"DisableChatEntry\""),
("flood: per-connection clock starts at connection",G+"OpenRA.Game/Server/Connection.cs",34,"public readonly Stopwatch ConnectionTimer = Stopwatch.StartNew();"),
("theirs: join cooldown 5000 ms",G+"OpenRA.Game/Settings.cs",161,"public int FloodLimitJoinCooldown = 5000;"),
("theirs: flood window 5000 ms",G+"OpenRA.Game/Settings.cs",164,"public int FloodLimitInterval = 5000;"),
("theirs: 5 messages per window",G+"OpenRA.Game/Settings.cs",167,"public int FloodLimitMessageCount = 5;"),
("theirs: flood cooldown 15000 ms",G+"OpenRA.Game/Settings.cs",170,"public int FloodLimitCooldown = 15000;"),
("licence: GPL v3 or later (sender file header)",G+"OpenRA.Mods.Common/Widgets/Logic/Ingame/IngameChatLogic.cs",6,"as published by the Free Software Foundation, either version 3 of"),
("licence: any later version (sender file header)",G+"OpenRA.Mods.Common/Widgets/Logic/Ingame/IngameChatLogic.cs",7,"the License, or (at your option) any later version. For more"),
("licence: COPYING is GPL version 3",G+"COPYING",2,"Version 3, 29 June 2007"),
]
out=open(sys.argv[1],'a')
for claim,f,l,q in rows:
    assert "\t" not in q and "\t" not in claim
    assert 15<=len(q)<=90, (len(q),q)
    out.write(f"{N}\t{claim}\t{f}\t{l}\t{q}\n")
print(len(rows),"rows written")
