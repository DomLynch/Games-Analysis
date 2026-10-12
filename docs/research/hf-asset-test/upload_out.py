import os,sys,glob
from huggingface_hub import HfApi
a=HfApi(token=os.environ["HF_TOKEN"])
for pat in sys.argv[1:]:
    for f in glob.glob(pat):
        a.upload_file(path_or_fileobj=f,path_in_repo=f.replace("/w/job/","results/"),repo_id="Domlynch/frankendom-asset-test",repo_type="model"); print("UP",f)
