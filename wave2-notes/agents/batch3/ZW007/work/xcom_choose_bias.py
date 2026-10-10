# Enumerates every value of RNG::generate(0, total) (inclusive) and replays WeightedOptions::choose exactly.
from fractions import Fraction
def donor_probs(weights):  # weights: ordered list of (name, w), map order = sorted by name
    items = sorted(weights)
    total = sum(w for _, w in items)
    counts = {n: 0 for n, _ in items}
    for var0 in range(0, total + 1):          # generate(0,total) is inclusive
        var = var0
        chosen = None
        for name, w in items:
            if var <= w:
                chosen = name; break
            var -= w
        if chosen is None:                    # donor reads ii past end here (not reached when total>0 and the loop breaks on last)
            chosen = items[-1][0]
        counts[chosen] += 1
    n = total + 1
    return {k: Fraction(v, n) for k, v in counts.items()}
for w in ([("a",1),("b",1)], [("a",3),("b",1)], [("a",1),("b",1),("c",1),("d",1)], [("a",10),("b",10)]):
    p = donor_probs(w)
    intended = {n: Fraction(x, sum(v for _, v in w)) for n, x in w}
    print(w, {k: str(v) for k, v in p.items()}, "intended", {k: str(v) for k, v in intended.items()})
