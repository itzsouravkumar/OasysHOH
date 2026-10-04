#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p work data/models runs
export UV_CACHE_DIR="$PWD/work/uv-cache"
if [ ! -x .venv/bin/python ]; then uv venv --python python3 .venv; fi
uv pip install --python .venv/bin/python -r requirements.txt
engine="${OASYS_ENGINE:-docker}"
"$engine" info >/dev/null
model=data/models/qwen2.5-1.5b-instruct-q4_k_m.gguf
if [ ! -f "$model" ]; then
  curl -L --fail --retry 3 'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf' -o "$model.part"
  mv "$model.part" "$model"
fi
.venv/bin/python - <<'PY'
import hashlib,json
from pathlib import Path
manifest=json.loads(Path('data/model-manifest.json').read_text())
p=Path('data/models')/manifest['filename']
assert hashlib.file_digest(p.open('rb'),'sha256').hexdigest()==manifest['sha256'],'Model checksum mismatch'
print('Model checksum verified.')
PY
"$engine" pull python:3.12-slim@sha256:dddfd7e07f9d15aeeca61529320492139d21cac7f0070c00609243e51e4e0016
"$engine" tag python@sha256:dddfd7e07f9d15aeeca61529320492139d21cac7f0070c00609243e51e4e0016 python:3.12-slim
"$engine" build -t oasys-worker:local worker
"$engine" build -t oasys-policy:local policy_runner
"$engine" build -t oasys-verifier:local verifier
.venv/bin/python -c 'from broker.app.spawner import ensure_workbenches; ensure_workbenches()'
printf '\nOasys is ready. Run: make up\n'
