# Hand-written simulation of the donor's doCheck/updateInfo rules (FloodDetection.hs 30-85) for LobbyChatMessage.
# numPerEntry=3, (10s,2), (30s,3). Each call is one chat message at time t (seconds).
def run(times):
    entries = []   # newest first: [time, counter]
    out = []
    for t in times:
        if entries and entries[0][1] != 0:
            entries[0][1] -= 1
            out.append((t, 'absorbed'))
            continue
        nei = [e for e in entries if t - e[0] <= 30]
        l2 = len(nei)
        l1 = len([e for e in nei if t - e[0] <= 10])
        if l2 >= 4 or l1 >= 3:
            v = 'KICK'
        elif l1 >= 2 or l2 >= 3:
            v = 'warn'
        else:
            v = 'pass'
        entries = [[t, 3]] + nei
        out.append((t, v, 'l1=%d l2=%d' % (l1, l2)))
    return out
for label, times in [('1 msg/s', range(0, 40)), ('1 msg / 2 s', range(0, 80, 2)), ('1 msg / 4 s', range(0, 120, 4))]:
    res = run(list(times))
    first = {}
    for r in res:
        if r[1] in ('warn', 'KICK') and r[1] not in first:
            first[r[1]] = r[0]
    checked = [r for r in res if r[1] != 'absorbed']
    print(label, 'first warn at', first.get('warn'), 's, first kick at', first.get('KICK'), 's; checked msgs:', len(checked))
