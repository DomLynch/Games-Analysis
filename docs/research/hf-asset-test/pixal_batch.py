import os, sys, json, time
os.chdir("/w/pixal"); sys.path.insert(0,"/w/pixal")
import signal, gc
sys.path.insert(0,'/w/job')
from prep_model import up
import torch, numpy as np
from PIL import Image
import inference as P
sys.path.insert(0,'/w/job')
from prep_model import prep
import o_voxel
prompts=[p for p in json.load(open("/w/job/prompts.json")) if p["id"] in os.environ.get("ASSETS","").split(",")]; out="/w/job/out_pixal"; os.makedirs(out,exist_ok=True)
TRI=int(os.environ.get("TRI","50000")); TEX=int(os.environ.get("TEX","2048")); RES=1024
res={"assets":{}}
t=time.time()
try:
    MP=prep('TencentARC/Pixal3D','/w/m_pixal'); pipe=P.init_pipeline(model_path=MP,low_vram=False); res["mode"]="standard"
except torch.cuda.OutOfMemoryError:
    torch.cuda.empty_cache(); pipe=P.init_pipeline(model_path=MP,low_vram=True); res["mode"]="low_vram"
torch.cuda.synchronize(); res["model_load_s"]=time.time()-t; print("LOAD_S",res,flush=True)
moge=P.load_moge_model(device="cuda")
for p in prompts:
    a={}
    signal.signal(signal.SIGALRM,lambda *x:(_ for _ in ()).throw(TimeoutError('asset watchdog 240s')))
    signal.alarm(240)
    torch.cuda.reset_peak_memory_stats()
    try:
        img=Image.open(f"/w/job/images/{p['id']}.png")
        torch.cuda.synchronize(); t=time.time()
        pre=pipe.preprocess_image(img); tmp=f"{out}/_tmp.png"; pre.save(tmp)
        cp=P.get_camera_params_wild_moge(tmp,moge,device="cuda",mesh_scale=1.0,extend_pixel=0,image_resolution=512)
        mesh_list,(ss,ts,r)=pipe.run(pre,camera_params=cp,seed=42,preprocess_image=False,return_latent=True,pipeline_type=f"{RES}_cascade",max_num_tokens=49152)
        mesh=mesh_list[0]; torch.cuda.synchronize(); a["gen_s"]=time.time()-t
        t=time.time()
        glb=o_voxel.postprocess.to_glb(vertices=mesh.vertices,faces=mesh.faces,attr_volume=mesh.attrs,coords=mesh.coords,attr_layout=pipe.pbr_attr_layout,grid_size=r,aabb=[[-0.5,-0.5,-0.5],[0.5,0.5,0.5]],decimation_target=TRI,texture_size=TEX,remesh=True,remesh_band=1,remesh_project=0,use_tqdm=False)
        rot=np.array([[-1,0,0,0],[0,0,-1,0],[0,-1,0,0],[0,0,0,1]],dtype=np.float64); glb.apply_transform(rot)
        glb.export(f"{out}/{p['id']}.glb",extension_webp=True); torch.cuda.synchronize(); a["glb_s"]=time.time()-t
        a["peak_gb"]=torch.cuda.max_memory_allocated()/1e9
    except Exception as e:
        import traceback; traceback.print_exc(); a["error"]=repr(e)[:300]; torch.cuda.empty_cache()
    signal.alarm(0)
    for n in ('mesh','glb','pre','mesh_list'):
        globals().pop(n,None)
    gc.collect(); torch.cuda.empty_cache()
    res["assets"][p["id"]]=a; print("ASSET",p["id"],a,flush=True)
    gl=f"/w/job/out_pixal/{p['id']}.glb"
    if os.path.exists(gl): up(gl,'out_pixal_b')
    json.dump(res,open(f"{out}/timing_pixal.json","w"),indent=1); up(f"{out}/timing_pixal.json","out_pixal_b")
up("/w/job/out_pixal/timing_pixal.json",'out_pixal_b')
