import requests
import time
import base64
import random

url = "https://charactar.ngrok.io/generation"

headers = {
    "X-API-Key": "YOUR API KEY"
}

inf_steps = 32

data = {
    "prompt": "banana man",
    "num_outputs": 1,
    "num_inference_steps": inf_steps
}

start_time = time.time()
response = requests.post(url, json=data, headers=headers)
end_time = time.time()
elapsed_time = end_time - start_time
print(f"Time ({inf_steps} inf steps): {elapsed_time} seconds")


# Decode base64 GLB files
if response.status_code == 200:
    generations = response.json()
    for i, generation in enumerate(generations):
        base64_data = generation['uri'].split(",")[1]
        glb_data = base64.b64decode(base64_data)
        
        with open(f"vanilla_model_{inf_steps}_{random.randint(0, 1000)}.glb", "wb") as f:
            f.write(glb_data)

    print("Successfully generated 3D model.")
else:
    print("Failed to generate 3D model.")
    print("Response:", response.text)