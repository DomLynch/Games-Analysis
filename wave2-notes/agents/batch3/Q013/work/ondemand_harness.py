# Harness: loads the donor ondemandhandler.py with stub evennia modules and a fake clock.
# Read-only use of the donor file (importlib loads it; nothing is written).
import importlib.util, sys, types

def _stub(name, **attrs):
    m = types.ModuleType(name)
    for k, v in attrs.items():
        setattr(m, k, v)
    sys.modules[name] = m
    return m

class _Conf:
    @staticmethod
    def conf(*a, **k):
        return None
class _Objs:
    objects = _Conf
_stub("evennia")
_stub("evennia.server")
_stub("evennia.server.models", ServerConfig=_Objs)
_stub("evennia.utils")
_stub("evennia.utils.logger", log_trace=lambda *a, **k: print("LOG_TRACE", a))
_stub("evennia.utils.utils", is_iter=lambda x: isinstance(x, (list, tuple, set, dict)))

PATH = "/mnt/frankendom-donors/evennia-evennia/evennia/scripts/ondemandhandler.py"
spec = importlib.util.spec_from_file_location("ondemandhandler_donor", PATH)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
OnDemandTask = mod.OnDemandTask

CLOCK = [0.0]
OnDemandTask.runtime = staticmethod(lambda: CLOCK[0])

def stages_loop():
    return {
        0: "seedling", 50: "bud", 150: "flower", 300: "wilted", 400: "dead",
        500: ("_loop", OnDemandTask.stagefunc_loop),
    }

print("== T1 first observation at exactly 500 (loop trigger) ==")
CLOCK[0] = 0.0
t = OnDemandTask("rose", "flower", stages=stages_loop())
print("created start_time", t.start_time, "last_stage", t.last_stage)
CLOCK[0] = 500.0
s1 = t.get_stage()
print("get_stage #1 at 500 ->", repr(s1), "| start_time", t.start_time, "iterations", t.iterations, "last_stage", t.last_stage)
s2 = t.get_stage()
print("get_stage #2 at 500 ->", repr(s2), "| dt", t.get_dt() if False else t.check(autostart=False)[0])

print("== T2 first observation at 10250 (20 loops in one go) ==")
CLOCK[0] = 0.0
t2 = OnDemandTask("rose", "flower", stages=stages_loop())
CLOCK[0] = 10250.0
dt = t2.get_dt()
print("get_dt ->", dt, "iterations", t2.iterations, "get_stage ->", repr(t2.get_stage()))

print("== T3 plain stages, no loop func ==")
CLOCK[0] = 0.0
t3 = OnDemandTask("x", "y", stages={0: "a", 100: "b", 250: "c"})
CLOCK[0] = 150.0
print("at 150 ->", repr(t3.get_stage()), "dt", t3.check(autostart=False)[0])
CLOCK[0] = 260.0
print("at 260 ->", repr(t3.get_stage()))

print("== T4 stage func fires only when observed (unobserved window) ==")
calls = []
def spy(task, **kw):
    calls.append(task.start_time)
    return None
CLOCK[0] = 0.0
t4 = OnDemandTask("z", "w", stages={0: "a", 100: ("b", spy)})
CLOCK[0] = 1000.0
print("no observation between 0 and 1000; calls before observe:", len(calls))
print("observe at 1000 ->", repr(t4.get_stage()), "calls:", len(calls))
