"""Speaks a batch of lines in the narrator's voice with Qwen3-TTS on MLX, loading the model once.

Reads a JSON job file: {"model", "ref": wav, "ref_text": str, "temperature": float, "jobs": [{"text", "out", "seed"}]}.
Writes each job's audio as a 24 kHz mono WAV. Run through uvx (see voice/build.ts).
"""

import json
import sys
import time

import mlx.core as mx
import numpy as np
import soundfile as sf
from mlx_audio.tts.utils import load
from mlx_audio.utils import load_audio

MODEL = "mlx-community/Qwen3-TTS-12Hz-1.7B-Base-8bit"

spec = json.load(open(sys.argv[1]))
model = load(spec.get("model", MODEL))
ref = load_audio(spec["ref"], sample_rate=model.sample_rate)

for job in spec["jobs"]:
    t0 = time.time()
    mx.random.seed(job["seed"])
    np.random.seed(job["seed"])
    chunks = [
        np.array(r.audio)
        for r in model.generate(
            text=job["text"],
            ref_audio=ref,
            ref_text=spec["ref_text"],
            lang_code="en",
            temperature=spec.get("temperature", 0.9),
            top_p=spec.get("top_p"),
            split_pattern="",
        )
    ]
    audio = np.concatenate(chunks) if chunks else np.zeros(1, dtype=np.float32)
    sf.write(job["out"], audio, model.sample_rate, subtype="PCM_24")
    print(json.dumps({"out": job["out"], "sec": round(len(audio) / model.sample_rate, 2), "took": round(time.time() - t0, 1)}), flush=True)
