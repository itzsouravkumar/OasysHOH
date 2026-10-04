# Third-party components

This local MVP uses upstream projects; original attribution remains with their authors. Verify complete notices before redistribution.

| Component | Version / source | Upstream licence |
| --- | --- | --- |
| Python | 3.11 host environment; 3.12 container base | PSF |
| FastAPI | 0.142.2 | MIT |
| Pydantic | 2.13.5 in installed lock | MIT |
| Uvicorn | 0.54.0 | BSD-3-Clause |
| HTTPX | 0.28.1 | BSD-3-Clause |
| Jinja2 | 3.1.6 | BSD-3-Clause |
| PyNaCl | 1.6.2 | Apache-2.0 |
| pytest | 9.1.1 | MIT |
| llama.cpp | Base-image digest pinned in worker/Dockerfile | MIT |
| Qwen2.5-1.5B-Instruct GGUF | Official Qwen model, manifest in data/ | Apache-2.0 model card |
| JailbreakBench JBB-Behaviors | Benign CSV, provenance in data/ | MIT dataset card |
| Pandoc / pypandoc-binary | Used only for document conversion | GPL / MIT wrapper; not required to run the app |

Upstream sources:
- https://github.com/ggml-org/llama.cpp
- https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF
- https://huggingface.co/datasets/JailbreakBench/JBB-Behaviors
- https://github.com/pyca/pynacl

