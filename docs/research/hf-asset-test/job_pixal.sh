set -x
source /w/repo/job/setup_env.sh; echo "SETUP_DONE_AT $SECONDS"
pip install -q /w/repo/wheels/natten*.whl || echo NATTEN_FAIL
pip install -q "git+https://github.com/microsoft/MoGe.git" plyfile || echo MOGE_FAIL
pip install -q https://github.com/LDYang694/Storages/releases/download/20260430/utils3d-0.0.2-py3-none-any.whl || echo UTILS_FAIL
pip install -q "huggingface_hub<1.0" 2>&1 | tail -2; python -c "import huggingface_hub;print(\"HUB\",huggingface_hub.__version__)"
git clone -q --depth 1 https://github.com/TencentARC/Pixal3D /w/pixal
mkdir -p /w/job && cp -r /w/repo/job/* /w/job/ && mkdir -p /w/job/images && cp /w/repo/results/images/*.png /w/job/images/
cd /w/job; echo "PIXAL_PREP_DONE_AT $SECONDS"
ASSETS=a01_dead_oak,a02_gravestone,a03_ruined_tower python pixal_batch.py; echo "PIXAL_DONE_AT $SECONDS"
echo "ALL_DONE_AT $SECONDS"
