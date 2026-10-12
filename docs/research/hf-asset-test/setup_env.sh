set -x
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq && apt-get install -y -qq git libjpeg-dev libgl1 libglib2.0-0 ninja-build >/dev/null
python -V; python -c "import torch;print(torch.__version__,torch.version.cuda)"
pip install -q imageio imageio-ffmpeg tqdm easydict opencv-python-headless ninja trimesh "transformers==4.57.3" "huggingface_hub>=0.34,<1.0" zstandard kornia timm lpips pandas "diffusers==0.37.1" accelerate bitsandbytes sentencepiece protobuf pillow
# overlap: weights download in the background while the remaining installs run (hub is pinned <1.0 by the line above)
mkdir -p /w; ( python /w/repo/job/predl.py > /w_predl.log 2>&1 & echo $! > /w_predl.pid )
pip install -q git+https://github.com/EasternJournalist/utils3d.git@9a4eb15e4021b67b12c460c7057d642626897ec8 || echo UTILS3D_FAIL
pip install -q "https://github.com/Dao-AILab/flash-attention/releases/download/v2.7.4.post1/flash_attn-2.7.4.post1+cu12torch2.6cxx11abiFALSE-cp311-cp311-linux_x86_64.whl" || echo FLASH_FAIL
mkdir -p /w
pip install -q --no-deps /w/repo/wheels_sm80_89/nvdiffrast*.whl /w/repo/wheels_sm80_89/cumesh*.whl /w/repo/wheels_sm80_89/flex_gemm*.whl /w/repo/wheels_sm80_89/o_voxel*.whl || echo WHEEL_FAIL
git clone -q --depth 1 https://github.com/microsoft/TRELLIS.2 /w/trellis2

pip install -q "huggingface_hub>=0.34,<1.0"
if [ $SECONDS -gt 180 ]; then echo "SETUP_TOO_SLOW $SECONDS"; return 1; fi
