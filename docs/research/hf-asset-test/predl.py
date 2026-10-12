"""Background weight pre-download, started inside setup_env.sh while pip/wheels install. Never raises: trellis_batch.py re-runs the same snapshot_download (a no-op when complete)."""
import os, json, sys, time
t=time.time()
try:
    sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
    from prep_model import prep
    from huggingface_hub import snapshot_download
    d=prep("microsoft/TRELLIS.2-4B","/w/m_trellis"); print("PREDL_MAIN_DONE",round(time.time()-t,1),flush=True)
    names=set()
    def walk(o):
        if isinstance(o,dict):
            for k,v in o.items():
                if k=="model_name" and isinstance(v,str) and "/" in v: names.add(v)
                else: walk(v)
        elif isinstance(o,list):
            for v in o: walk(v)
    walk(json.load(open(d+"/pipeline.json")))
    for n in sorted(names):
        try: snapshot_download(n,token=os.environ.get("HF_TOKEN")); print("PREDL_OK",n,flush=True)
        except Exception as e: print("PREDL_SKIP",n,repr(e)[:120],flush=True)
except Exception as e: print("PREDL_FAIL",repr(e)[:300],flush=True)
print("PREDL_S",round(time.time()-t,1),flush=True)
