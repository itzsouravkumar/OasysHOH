FROM ghcr.io/ggml-org/llama.cpp:server@sha256:460ff87b6dfd6b9e8ee0f4018540e007eb333a574994033b70dd6be46069de01
USER root
RUN apt-get update && apt-get install -y --no-install-recommends python3 && rm -rf /var/lib/apt/lists/*
COPY client.py /opt/oasys/client.py
USER 65532:65532
