import itertools, random, math
# Transcription of GroupObjectImplementation::calculateGroupLevel (lines 139-179), float math as in C++
def donor_level(members):  # members: list of ('p', level) player or ('pet', level, faction) or ('npc', level)
    highest = 0; new = 0.0; faction = 0.0
    for m in members:
        kind, lvl = m[0], m[1]
        if kind == 'pet':
            if m[2]: faction += lvl/5.0
            new += lvl/5.0
        elif kind == 'p':
            if lvl > highest:
                new += (lvl - highest + (highest/5.0)); highest = lvl
            else:
                new += lvl/5.0
    return math.floor(new + 0.5), faction
def closed_form(members):
    players = [m[1] for m in members if m[0]=='p']
    H = max(players) if players else 0
    others = sum(players) - H  # treats the top player once
    others_list = list(players); others_list.remove(H) if H in others_list else None
    rest = sum(players) - H
    pets = sum(m[1] for m in members if m[0]=='pet')
    return math.floor(H + (rest + pets)/5.0 + 0.5)
random.seed(1)
bad = 0
for trial in range(20000):
    n = random.randint(1,6)
    mem = []
    for _ in range(n):
        k = random.choice(['p','p','p','pet'])
        mem.append((k, random.randint(1,90), random.random()<0.5) if k=='pet' else (k, random.randint(1,90)))
    perm = mem[:]; random.shuffle(perm)
    a,_ = donor_level(mem); b,_ = donor_level(perm)
    c = closed_form(mem)
    if not (a==b==c):
        bad += 1
        if bad < 5: print("MISMATCH", mem, a, b, c)
print("trials 20000, mismatches:", bad)
print("example [10,8,6] players:", donor_level([('p',10),('p',8),('p',6)]))
print("example [6,10]:", donor_level([('p',6),('p',10)]), " [10,6]:", donor_level([('p',10),('p',6)]))
print("example 3x level 10 players:", donor_level([('p',10),('p',10),('p',10)]))
print("example 10 player + 20 pet:", donor_level([('p',10),('pet',20,False)]))
