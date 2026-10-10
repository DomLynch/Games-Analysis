# Re-expresses the integer turn step described for OpenRSC handleGameInput (per tick).
# Java int division truncates toward zero; the code's (x + 255) / 256 is used with x >= 0 here.
def jdiv(a, b):
    q = abs(a) // abs(b)
    return q if (a >= 0) == (b >= 0) else -q

def turn(start, target_units, max_ticks=2000):
    rot = start; wc = 0; ticks = 0; trace = []
    while True:
        var10 = target_units - rot
        if var10 == 0:
            wc = 0
            break
        wc += 1
        var12 = 1
        if var10 <= 128:
            if var10 <= 0:
                if var10 >= -128:
                    if var10 < 0:
                        var12 = -1; var10 = -var10
                else:
                    var10 += 256; var12 = 1
            else:
                var12 = 1
        else:
            var12 = -1; var10 = 256 - var10
        step = jdiv(var10 * wc + 255, 256) * var12
        rot = (rot + step) & 255
        ticks += 1
        trace.append((ticks, wc, step, rot))
        if ticks >= max_ticks:
            return None, trace
    return ticks, trace

for delta in (32, 64, 128):
    t, tr = turn(0, delta)
    print("delta", delta, "ticks", t, "first steps", [s for (_, _, s, _) in tr[:12]], "last", tr[-3:] if tr else None)
# overshoot check: does any step pass the target?
for delta in (32, 64, 128, 192):
    rot = 0; wc = 0; over = False; ticks = 0
    t, tr = turn(0, delta)
    for (k, w, s, r) in tr:
        if (s > 0 and r > delta and r - s < delta) or (s < 0 and r < delta and r - s > delta):
            over = True
    print("delta", delta, "overshoot", over)
# zoom-dependent follow divisor (integer math as in the code)
for zoom in (600, 750, 900, 1000):
    print("zoom", zoom, "divisor", (zoom - 500) // 15 + 16)
