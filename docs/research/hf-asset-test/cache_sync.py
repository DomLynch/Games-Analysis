"""restore|save the JIT caches (triton ~/.triton/cache, flex_gemm ~/.flex_gemm autotune json) to/from the private repo, per GPU flavor. Never raises."""
import os, sys, tarfile, tempfile
R="Domlynch/frankendom-asset-test"; fl=os.environ.get("FLAVOR","unknown"); H=os.path.expanduser("~"); F=f"cache/{fl}/jit_cache.tgz"
D=[".triton/cache",".flex_gemm"]
try:
    from huggingface_hub import HfApi, hf_hub_download
    tok=os.environ.get("HF_TOKEN")
    if sys.argv[1]=="restore":
        p=hf_hub_download(R,F,repo_type="model",token=tok)
        with tarfile.open(p) as t: t.extractall(H)
        print("CACHE_RESTORED",F,flush=True)
    else:
        p=tempfile.mktemp(suffix=".tgz")
        with tarfile.open(p,"w:gz") as t:
            for d in D:
                if os.path.exists(os.path.join(H,d)): t.add(os.path.join(H,d),arcname=d)
        HfApi(token=tok).upload_file(path_or_fileobj=p,path_in_repo=F,repo_id=R,repo_type="model")
        print("CACHE_SAVED",F,os.path.getsize(p),flush=True)
except Exception as e: print("CACHE_SYNC_SKIP",sys.argv[1],repr(e)[:150],flush=True)
