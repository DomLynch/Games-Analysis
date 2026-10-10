C="/mnt/frankendom-donors/ClassicUO"
PH=C+"/src/ClassicUO.Client/Network/PacketHandlers.cs"
ETC=C+"/src/ClassicUO.Client/Game/GameObjects/EntityTextContainer.cs"
WTM=C+"/src/ClassicUO.Client/Game/Managers/WorldTextManager.cs"
GO=C+"/src/ClassicUO.Client/Game/GameObjects/GameObject.cs"
GA=C+"/src/ClassicUO.Client/Game/GameActions.cs"
AB=C+"/src/ClassicUO.Client/Game/Data/Ability.cs"
rows=[
("Client: damage packet 0x0B is handled, no resolution", PH, 194, "Handler.Add(0x0B, Damage);"),
("Damage handler reads one target serial and a 16-bit amount", PH, 474, "ushort damage = p.ReadUInt16BE();"),
("Damage handler only forwards positive damage to the overhead", PH, 476, "if (damage > 0)"),
("Damage is forwarded to the world text manager", PH, 478, "world.WorldTextManager.AddDamage(entity, damage);"),
("One overhead damage list per target serial", WTM, 106, "if (!_damages.TryGetValue(obj, out OverheadDamage dm) || dm == null)"),
("Each number lives 1500 ms", ETC, 90, "text_obj.Time = Time.Ticks + 1500;"),
("Overhead keeps at most 10 numbers per target", ETC, 94, "if (_messages.Count > 10)"),
("Numbers rise one pixel per 25 ms", ETC, 51, "private const int DAMAGE_Y_MOVING_TIME = 25;"),
("Damage number colour differs for the player", ETC, 85, "(ushort)(ReferenceEquals(Parent, _world.Player) ? 0x0034 : 0x0021),"),
("Optional DPS text on each number", ETC, 80, "if (ProfileManager.CurrentProfile.ShowDPSWithDamageNumbers && Parent != null)"),
("Rolling 15 s damage average per object", GO, 83, "_averageOverTime ??= new AverageOverTime(TimeSpan.FromSeconds(15));"),
("Swing turn window is 2000 ms", PH, 1884, "const int TIME_TURN_TO_LASTTARGET = 2000;"),
("Swing turn requires no recent step request", PH, 1889, "&& world.Player.Walker.LastStepRequestTime + TIME_TURN_TO_LASTTARGET < Time.Ticks"),
("Swing turn only if not already facing the target", PH, 1910, "&& world.Player.Direction != pdir"),
("Swing turn issues one walk in the target direction", PH, 1913, "world.Player.Walk(pdir, false);"),
("Attack request sent to server", GA, 291, "Socket.Send_AttackRequest(serial);"),
("Ability table entry: Armor Ignore (name and icon only)", AB, 61, "new(1, \"Armor Ignore\", 0x5200),"),
("Ability.cs is BSD-2-Clause (SPDX header)", AB, 1, "// SPDX-License-Identifier: BSD-2-Clause"),
("ClassicUO LICENSE is BSD 2-Clause", C+"/LICENSE.md", 1, "BSD 2-Clause License"),
]
out=open("/private/tmp/p2/wave2-haiku/batch3/U005/receipts.tsv","a")
for c,fn,ln,q in rows:
    assert "\t" not in q
    out.write("\t".join(["ClassicUO",c,fn,str(ln),q])+"\n")
out.close(); print("appended",len(rows))
