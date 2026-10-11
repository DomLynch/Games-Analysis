set -x
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq && apt-get install -y -qq git libgl1 libxi6 libxrender1 libxkbcommon0 libsm6 libxext6 libxfixes3 libegl1 libglib2.0-0 libusb-1.0-0 libxxf86vm1 >/dev/null
git clone -q --depth 1 https://github.com/VAST-AI-Research/UniRig /w && cd /w
python -V; python -c "import torch;print(torch.__version__,torch.version.cuda)"
grep -v flash_attn requirements.txt > r.txt
pip install -q -r r.txt || { echo REQ_FAIL; exit 12; }
pip install -q spconv-cu124 || { echo SPCONV_FAIL; exit 12; }
pip install -q torch_scatter torch_cluster -f https://data.pyg.org/whl/torch-2.5.1+cu124.html --no-cache-dir || { echo PYG_FAIL; exit 12; }
pip install -q numpy==1.26.4
pip install -q "https://github.com/Dao-AILab/flash-attention/releases/download/v2.7.4.post1/flash_attn-2.7.4.post1+cu12torch2.5cxx11abiFALSE-cp311-cp311-linux_x86_64.whl" || { echo FLASH_FAIL; exit 12; }
python -c "import flash_attn,bpy;print('IMPORTS_OK')" || exit 12
python - <<'PY'
from huggingface_hub import hf_hub_download
import os
p=hf_hub_download("Domlynch/frankendom-unirig-io","frost-revenant-trellis-max.glb",repo_type="model",token=os.environ["HF_TOKEN"]); open("/w/in_path","w").write(p)
PY
IN=$(cat /w/in_path); mkdir -p out
bash launch/inference/generate_skeleton.sh --input "$IN" --output out/skel.fbx 2>&1 | tail -40
bash launch/inference/generate_skin.sh --input out/skel.fbx --output out/skin.fbx 2>&1 | tail -40
bash launch/inference/merge.sh --source out/skin.fbx --target "$IN" --output out/frost-revenant-unirig.glb 2>&1 | tail -20
ls -la out
python - <<'PY'
from huggingface_hub import HfApi
import os,glob
a=HfApi(token=os.environ["HF_TOKEN"])
for f in glob.glob("/w/out/*"):
    a.upload_file(path_or_fileobj=f,path_in_repo="out/"+os.path.basename(f),repo_id="Domlynch/frankendom-unirig-io",repo_type="model")
print("UPLOADED")
PY
