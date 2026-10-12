"""TRELLIS.2 batch (a100-large). Per asset: build glb, measure, upload glb + one-line metrics json immediately. Prop profile: 1024_cascade, TRI tris, TEX px."""
import os, sys, json, time, signal, gc, traceback
os.environ['OPENCV_IO_ENABLE_OPENEXR']='1'; os.environ["PYTORCH_CUDA_ALLOC_CONF"]="expandable_segments:True"
sys.path.insert(0,"/w/trellis2"); sys.path.insert(0,"/w/job")
import torch, trimesh
from PIL import Image
from prep_model import prep, up
from trellis2.pipelines import Trellis2ImageTo3DPipeline
import o_voxel
IDS=[x for x in os.environ["ASSETS"].split(",") if x]; TRI=int(os.environ.get("TRI","100000")); TEX=int(os.environ.get("TEX","2048")); SUB=os.environ.get("SUB","run2")
PT=os.environ.get("PTYPE","1024_cascade"); os.makedirs("out",exist_ok=True)
t=time.time(); mp=prep("microsoft/TRELLIS.2-4B","/w/m_trellis"); dl=time.time()-t
t=time.time(); pipe=Trellis2ImageTo3DPipeline.from_pretrained(mp)
if os.environ.get("LOWVRAM","0")=="0": pipe.low_vram=False
pipe.cuda(); torch.cuda.synchronize(); load=time.time()-t
print("LOAD",{"download_s":dl,"load_s":load},flush=True)
def alarm(*a): raise TimeoutError("watchdog")
def done_remote():
    try:
        from huggingface_hub import HfApi
        fs=HfApi(token=os.environ["HF_TOKEN"]).list_repo_files("Domlynch/frankendom-asset-test",repo_type="model")
        return {f.split("/")[-1].replace(".metrics.json","") for f in fs if (f.startswith(f"results/{SUB}/") or f.startswith("results/smoke1/")) and f.endswith(".metrics.json")}
    except Exception as e: print("RESUME_LIST_FAIL",e,flush=True); return set()
SKIP=done_remote(); print("RESUME_SKIP",sorted(SKIP),flush=True)
MAN={"job":os.environ.get("JOB_TAG",str(os.getpid())),"flavor":os.environ.get("FLAVOR","a100-large"),"download_s":round(dl,1),"load_s":round(load,1),"skipped":sorted(SKIP),"assets":[]}
def save_manifest():
    try:
        json.dump(MAN,open("out/manifest.json","w"),indent=1); up("out/manifest.json",SUB,remote_name=f"manifest_{MAN['job']}.json")
    except Exception as e: print("MANIFEST_FAIL",e,flush=True)
def on_term(*a):
    MAN["terminated"]=True; save_manifest(); sys.exit(143)
signal.signal(signal.SIGTERM,on_term); save_manifest()
signal.signal(signal.SIGALRM,alarm)
for aid in IDS:
    if aid in SKIP: print('SKIP_DONE',aid,flush=True); continue
    m={"id":aid,"model":"trellis2","ptype":PT,"tri_target":TRI,"tex_target":TEX,"download_s":round(dl,1),"load_s":round(load,1)}
    try:
        signal.alarm(int(os.environ.get("WATCHDOG","900"))); torch.cuda.reset_peak_memory_stats()
        img=Image.open(f"/w/job/images/{aid}.png"); torch.cuda.synchronize(); t=time.time()
        mesh=pipe.run(img,seed=42,pipeline_type=PT)[0]; torch.cuda.synchronize(); m["gen_s"]=round(time.time()-t,1)
        mesh.simplify(16777216); t=time.time()
        glb=o_voxel.postprocess.to_glb(vertices=mesh.vertices,faces=mesh.faces,attr_volume=mesh.attrs,coords=mesh.coords,attr_layout=mesh.layout,voxel_size=mesh.voxel_size,aabb=[[-0.5,-0.5,-0.5],[0.5,0.5,0.5]],decimation_target=TRI,texture_size=TEX,remesh=True,remesh_band=1,remesh_project=0,verbose=False)
        f=f"out/{aid}.glb"; glb.export(f,extension_webp=True); torch.cuda.synchronize(); m["glb_s"]=round(time.time()-t,1); m["peak_gb"]=round(torch.cuda.max_memory_allocated()/1e9,1)
        sc=trimesh.load(f); gs=list(sc.geometry.values()); m["tris"]=sum(len(g.faces) for g in gs)
        m["tex"]=[[k,list(im.size)] for g in gs for k in ('baseColorTexture','metallicRoughnessTexture','normalTexture') for im in [getattr(getattr(g.visual,'material',None),k,None)] if im is not None]
        signal.alarm(0); m["status"]="ok"
    except BaseException as e:
        signal.alarm(0)
        if isinstance(e,(SystemExit,KeyboardInterrupt)): raise   # SIGTERM must stop the batch, not be logged as an asset error
        traceback.print_exc(); m["error"]=repr(e)[:200]; m["status"]="watchdog" if isinstance(e,TimeoutError) else "error"
    for n in ('mesh','glb','img','sc','gs'): globals().pop(n,None)
    gc.collect(); torch.cuda.empty_cache()
    print("METRIC",json.dumps(m),flush=True); MAN["assets"].append(m)
    try:
        # metrics.json is the "done" marker used by resume: only written for ok assets, and only after the glb upload succeeded
        if m["status"]=="ok":
            json.dump(m,open(f"out/{aid}.metrics.json","w"))
            if up(f"out/{aid}.glb",SUB): up(f"out/{aid}.metrics.json",SUB)
            else: print("GLB_UPLOAD_FAILED_WILL_RETRY_ON_RESUME",aid,flush=True)
        else:
            json.dump(m,open(f"out/{aid}.error.json","w")); up(f"out/{aid}.error.json",SUB)
    except Exception as e: print("UPFAIL",e,flush=True)
    save_manifest()
