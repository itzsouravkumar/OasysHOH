FROM python:3.12-slim@sha256:dddfd7e07f9d15aeeca61529320492139d21cac7f0070c00609243e51e4e0016
RUN pip install --no-cache-dir PyNaCl==1.6.2
COPY verify.py /opt/oasys/verify.py
USER 65532:65532
ENTRYPOINT ["python", "-I", "-B", "/opt/oasys/verify.py"]
