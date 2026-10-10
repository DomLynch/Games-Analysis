import sys
for path in sys.argv[1:]:
    runs = []
    line_no = 0
    for ln, raw in enumerate(open(path, encoding="utf-8", errors="replace"), 1):
        s = raw.strip()
        if not s.startswith("loot="):
            continue
        parts = s[len("loot="):].split(",")
        item, chance = parts[0], parts[1] if len(parts) > 1 else "?"
        if runs and runs[-1][0] == chance:
            runs[-1][2] += 1
        else:
            runs.append([chance, ln, 1])
    ups = [i for i in range(1, len(runs)) if float(runs[i][0]) > float(runs[i-1][0])]
    print(path.split("/")[-1], "runs:", " ".join(f"{c}x{n}@L{l}" for c, l, n in runs), "| chance rises at run starts:", len(ups))
