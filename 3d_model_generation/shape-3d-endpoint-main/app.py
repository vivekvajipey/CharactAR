import sys
import uuid
import os
import base64

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.responses import PlainTextResponse
from fastapi.security import APIKeyHeader
from pydantic import BaseModel
from typing import Optional, List
import nest_asyncio
import uvicorn
import trimesh

sys.path.insert(0, './shap-e/')
import torch
from shap_e.diffusion.sample import sample_latents
from shap_e.diffusion.gaussian_diffusion import diffusion_from_config
from shap_e.models.download import load_model, load_config
from shap_e.util.notebooks import decode_latent_mesh

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
xm = load_model('transmitter', device=device)
model = load_model('text300M', device=device)
diffusion = diffusion_from_config(load_config('diffusion'))

API_KEY = ""  # Set your API Key here
API_KEY_NAME = "X-API-Key"

api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=True)

async def get_token_header(access_token: str = Depends(api_key_header)):
    if access_token != API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API Key"
        )

app = FastAPI()

class Input(BaseModel):
    prompt: str
    num_outputs: int
    num_inference_steps: int
    extension: Optional[str] = None

class Generation(BaseModel):
    uri: Optional[str] = None
    url: Optional[str] = None

@app.post("/generation", response_model=List[Generation], dependencies=[Depends(get_token_header)])
def create_link(open_input: Input):
    print(open_input)
    if open_input.prompt:
        prompt = open_input.prompt
        batch_size = open_input.num_outputs
        inference_steps = open_input.num_inference_steps
        guidance_scale = 15.0
        latents = sample_latents(
            batch_size=batch_size,
            model=model,
            diffusion=diffusion,
            guidance_scale=guidance_scale,
            model_kwargs=dict(texts=[prompt] * batch_size),
            progress=True,
            clip_denoised=True,
            use_fp16=True,
            use_karras=True,
            karras_steps=inference_steps,
            sigma_min=1e-3,
            sigma_max=160,
            s_churn=0,
        )
        data = []
        for i, latent in enumerate(latents):
            t = decode_latent_mesh(xm, latent).tri_mesh()
            file_id = str(uuid.uuid4())
            ply_filename = f'{file_id}.ply'
            glb_filename = f'{file_id}.glb'
            with open(ply_filename, 'wb') as f:
                t.write_ply(f)
                mesh = trimesh.load(ply_filename)
                glb_data = mesh.export(file_type="glb")
                with open(glb_filename, "wb") as f:
                    f.write(glb_data)
            with open(glb_filename, 'rb') as f:
                base64_data = base64.b64encode(f.read()).decode('utf-8')
                data_uri = f'data:@file/octet-stream;base64,{base64_data}'
                data.append(Generation(uri = data_uri))
            # os.remove(glb_filename)
            # os.remove(ply_filename)
        return data
    return [Generation()]

@app.get("/", response_class=PlainTextResponse)
def read_root():
    return "Hello, World!"