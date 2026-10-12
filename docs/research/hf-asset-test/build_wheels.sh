set -x
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq && apt-get install -y -qq git libjpeg-dev ninja-build >/dev/null
python -V; python -c "import torch;print(torch.__version__,torch.version.cuda)"; nvcc --version | tail -2
export TORCH_CUDA_ARCH_LIST="8.0;8.9" MAX_JOBS=8 FORCE_CUDA=1 CUDA_HOME=/usr/local/cuda
pip install -q ninja wheel setuptools packaging huggingface_hub
mkdir -p /wheels /ext; cd /ext
up() { python - "$@" <<'PY'
import sys,os,glob
from huggingface_hub import HfApi
a=HfApi(token=os.environ["HF_TOKEN"])
for f in glob.glob("/wheels/*.whl"):
    a.upload_file(path_or_fileobj=f,path_in_repo="wheels_sm80_89/"+os.path.basename(f),repo_id="Domlynch/frankendom-asset-test",repo_type="model"); print("UP",f)
PY
}
if [ "$WHAT" = "natten" ]; then
  NATTEN_CUDA_ARCH="8.0;8.9" NATTEN_N_WORKERS=8 pip wheel natten==0.21.0 --no-build-isolation --no-deps -w /wheels 2>&1 | tail -15
  ls -la /wheels; up; echo BUILD_DONE; exit 0
fi
git clone -q --depth 1 --recursive https://github.com/microsoft/TRELLIS.2 t2
git clone -q --depth 1 --recursive https://github.com/JeffreyXiang/CuMesh
git clone -q --depth 1 --recursive https://github.com/JeffreyXiang/FlexGEMM
git clone -q --depth 1 -b v0.4.0 https://github.com/NVlabs/nvdiffrast
for d in nvdiffrast CuMesh FlexGEMM t2/o-voxel; do echo "== $d"; pip wheel --no-build-isolation --no-deps -w /wheels ./$d 2>&1 | tail -5; ls /wheels; done
up
echo BUILD_DONE
