import os, json
from huggingface_hub import snapshot_download
def prep(repo, dest):
    snapshot_download(repo, local_dir=dest, ignore_patterns=["*_mv*","*.md","assets/*"], token=os.environ.get("HF_TOKEN"))
    f=os.path.join(dest,"pipeline.json"); d=json.load(open(f))
    d["args"]["rembg_model"]["args"]["model_name"]="ZhengPeng7/BiRefNet"   # RMBG-2.0 is gated (BRIA terms); BiRefNet is MIT
    json.dump(d,open(f,"w"),indent=1); return dest

def up(path, sub, remote_name=None):
    from huggingface_hub import HfApi
    for k in range(2):   # one retry; never raises
        try:
            HfApi(token=os.environ["HF_TOKEN"]).upload_file(path_or_fileobj=path,path_in_repo=f"results/{sub}/"+(remote_name or os.path.basename(path)),repo_id="Domlynch/frankendom-asset-test",repo_type="model")
            return True
        except Exception as e: print("UPFAIL",k,path,e,flush=True)
    return False

if __name__=="__main__":
    import sys; sys.exit(0 if up(sys.argv[1],sys.argv[2],sys.argv[3] if len(sys.argv)>3 else None) else 1)
