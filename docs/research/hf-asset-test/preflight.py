"""Runs in the first minute of the GPU job. Imports every wheel and runs one tiny op; exits 1 on any failure."""
import os, sys, time, traceback
t=time.time(); ok=True
def step(name, fn, fatal=True):
    global ok
    t0=time.time()
    try: fn(); print("PREFLIGHT_OK",name,round(time.time()-t0,1),"s",flush=True)
    except Exception:
        if fatal: ok=False
        print("PREFLIGHT_FAIL" if fatal else "PREFLIGHT_WARN",name,flush=True); traceback.print_exc()
import torch
LITE=os.environ.get("PREFLIGHT_LITE","0")=="1"   # LITE: keep the real cuda op + imports of every wheel; skip ops the first asset repeats (flash call, triton JIT/autotune)
step("cuda", lambda: print(torch.cuda.get_device_name(0), torch.cuda.get_device_capability(0), (torch.ones(8,device="cuda")*2).sum().item()))
def f_flash():
    import flash_attn; q=torch.randn(1,16,4,64,device="cuda",dtype=torch.float16); flash_attn.flash_attn_func(q,q,q)
step("flash_attn", f_flash) if not LITE else step("flash_attn_import", lambda: __import__("flash_attn"))
def f_nvd():
    import nvdiffrast.torch as dr; c=dr.RasterizeCudaContext()
    pos=torch.tensor([[[-.5,-.5,0,1],[.5,-.5,0,1],[0,.5,0,1]]],dtype=torch.float32,device="cuda"); tri=torch.tensor([[0,1,2]],dtype=torch.int32,device="cuda")
    r,_=dr.rasterize(c,pos,tri,resolution=[16,16]); torch.cuda.synchronize(); assert r[...,3].max().item()>0; print("nvdiffrast rasterize ok")
step("nvdiffrast", f_nvd)
def f_cumesh():
    import cumesh; print("cumesh", cumesh.__file__)
    v=torch.tensor([[0,0,0],[1,0,0],[0,1,0],[0,0,1]],dtype=torch.float32,device="cuda"); fc=torch.tensor([[0,1,2],[0,1,3],[0,2,3],[1,2,3]],dtype=torch.int32,device="cuda")
    m=cumesh.CuMesh(); m.init(v,fc); print("cumesh init ok")
step("cumesh", f_cumesh)
def f_ovox():
    import o_voxel, o_voxel._C; print("o_voxel ok")
step("o_voxel", f_ovox)
def f_flex():
    import flex_gemm; print("flex_gemm ok")
step("flex_gemm", f_flex)
def f_flex_ops():   # real tiny ops: CUDA hashmap kernel (grid_sample) + triton kernel (submanifold conv). Non-fatal: API call written without a GPU to test on.
    from flex_gemm.ops.grid_sample import grid_sample_3d
    from flex_gemm.ops.spconv import sparse_submanifold_conv3d
    g=torch.stack(torch.meshgrid(*[torch.arange(4)]*3,indexing="ij"),-1).reshape(-1,3); co=torch.cat([torch.zeros(len(g),1,dtype=torch.long),g],1).int().cuda()
    fe=torch.randn(len(co),8,device="cuda")
    out=grid_sample_3d(fe,co,torch.Size([1,8,4,4,4]),torch.rand(1,5,3,device="cuda")*3,"trilinear"); torch.cuda.synchronize(); print("flex grid_sample ok",tuple(out.shape))
    w=torch.randn(8,3,3,3,8,device="cuda"); o,_=sparse_submanifold_conv3d(fe,co,torch.Size([1,8,4,4,4]),w,None); torch.cuda.synchronize(); print("flex triton spconv ok",tuple(o.shape))
if not LITE: step("flex_gemm_ops", f_flex_ops, fatal=False)
if os.environ.get("NEED_NATTEN"):
    step("natten", lambda: __import__("natten"))
print("PREFLIGHT_S",round(time.time()-t,1))
sys.exit(0 if ok else 1)
