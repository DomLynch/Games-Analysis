import sys, json
# usage: mkdraft.py <out.tsv> <spec.json>; spec = list of [note, claim, short_file_key, quote]
R='/mnt/frankendom-donors/ClassicUO/src/ClassicUO.Client/'
F={'GC':R+'GameController.cs','NC':R+'Network/NetClient.cs','TSW':R+'Network/Socket/TcpSocketWrapper.cs',
   'PH':R+'Network/PacketHandlers.cs','NS':R+'Network/NetStatistics.cs','GS':R+'Game/Scenes/GameScene.cs',
   'WM':R+'Game/Managers/WalkerManager.cs','PM':R+'Game/GameObjects/PlayerMobile.cs','C':R+'Game/Constants.cs',
   'MS':R+'Game/Data/MovementSpeed.cs','M':R+'Game/GameObjects/Mobile.cs','PF':R+'Game/Pathfinder.cs','OP':R+'Network/OutgoingPackets.cs'}
spec=json.load(open(sys.argv[2]))
with open(sys.argv[1],'w') as f:
    f.write('note\tclaim\tdonor_file\tline\tquote\n')
    for note,claim,k,q in spec:
        f.write('\t'.join([note,claim,F[k],'',q])+'\n')
print(len(spec),'rows')
