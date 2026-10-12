import os
from huggingface_hub import snapshot_download
snapshot_download("Domlynch/frankendom-asset-test",repo_type="model",token=os.environ["HF_TOKEN"],local_dir="/w/repo",allow_patterns=["wheels/*","job/*"]+(["results/images/*"] if os.environ.get("NEED_IMAGES") else []))
