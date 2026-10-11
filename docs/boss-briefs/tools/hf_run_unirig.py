"""Run UniRig (skeleton + skin + merge) on a mesh on a Hugging Face L4 job. Usage: python hf_run_unirig.py MESH.glb [REPO]
Mesh goes to a private repo, the job uploads out/*.fbx and out/*.glb back. T4 does NOT work (flash-attn needs Ampere+).
Edit the mesh name inside hf_unirig_job.sh (default frost-revenant-trellis-max.glb) and the repo id to match."""
import os, sys
from huggingface_hub import HfApi, get_token
mesh = sys.argv[1]; repo = sys.argv[2] if len(sys.argv) > 2 else 'Domlynch/frankendom-unirig-io'
a = HfApi(); a.create_repo(repo, repo_type='model', private=True, exist_ok=True)
a.upload_file(path_or_fileobj=mesh, path_in_repo=os.path.basename(mesh), repo_id=repo, repo_type='model')
script = open(os.path.join(os.path.dirname(__file__), 'hf_unirig_job.sh')).read()
job = a.run_job(image='pytorch/pytorch:2.5.1-cuda12.4-cudnn9-devel', command=['bash', '-c', script], flavor='l4x1',
                timeout='45m', secrets={'HF_TOKEN': get_token()}, name='unirig')
print(job.id, job.url)
