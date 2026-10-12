set -x
source /w/repo/job/setup_env.sh
mkdir -p /w/t; cd /w/t; git clone -q --depth 1 https://github.com/microsoft/TRELLIS.2 /w/trellis2_smoke
python - <<'PY'
import sys; sys.path.insert(0,"/w/trellis2_smoke")
import types
for n in ['flex_gemm','flex_gemm.ops','flex_gemm.ops.grid_sample']: sys.modules[n]=types.ModuleType(n)
sys.modules['flex_gemm.ops.grid_sample'].grid_sample_3d=None
from PIL import Image
from trellis2.pipelines.rembg import BiRefNet
m=BiRefNet("ZhengPeng7/BiRefNet")
import torch
from torchvision import transforms
img=Image.open("/w/repo/results/images/a01_dead_oak.png").convert("RGB")
x=m.transform_image(img).unsqueeze(0)
with torch.no_grad(): y=m.model(x)[-1].sigmoid()
print("BIREFNET_OK", y.shape, float(y.mean()))
PY
echo SMOKE_DONE
