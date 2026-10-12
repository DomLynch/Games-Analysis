import json, os, time, torch
from diffusers import FluxPipeline, FluxTransformer2DModel, BitsAndBytesConfig as DBnB
from transformers import T5EncoderModel, BitsAndBytesConfig as TBnB
prompts=json.load(open("prompts.json")); os.makedirs("images",exist_ok=True)
t0=time.time()
q=DBnB(load_in_4bit=True,bnb_4bit_quant_type="nf4",bnb_4bit_compute_dtype=torch.bfloat16)
tq=TBnB(load_in_4bit=True,bnb_4bit_quant_type="nf4",bnb_4bit_compute_dtype=torch.bfloat16)
tr=FluxTransformer2DModel.from_pretrained("black-forest-labs/FLUX.1-schnell",subfolder="transformer",quantization_config=q,torch_dtype=torch.bfloat16)
t5=T5EncoderModel.from_pretrained("black-forest-labs/FLUX.1-schnell",subfolder="text_encoder_2",quantization_config=tq,torch_dtype=torch.bfloat16)
pipe=FluxPipeline.from_pretrained("black-forest-labs/FLUX.1-schnell",transformer=tr,text_encoder_2=t5,torch_dtype=torch.bfloat16).to("cuda")
load_s=time.time()-t0; print("FLUX_LOAD_S",load_s,flush=True)
res={"flux_load_s":load_s,"images":{}}
for i,p in enumerate(prompts):
    torch.cuda.synchronize(); t=time.time()
    img=pipe(p["prompt"],height=1024,width=1024,num_inference_steps=4,guidance_scale=0.0,max_sequence_length=256,generator=torch.Generator("cuda").manual_seed(1000+i)).images[0]
    torch.cuda.synchronize(); s=time.time()-t
    img.save(f"images/{p['id']}.png"); res["images"][p["id"]]=s; print("IMG",p["id"],round(s,2),flush=True)
json.dump(res,open("images_timing.json","w"),indent=1)
