# Red workbench

A non-root networkless container named `oasys-red`, created by `make setup`. Use `docker exec -it oasys-red sh` to inspect its isolated filesystem. No blue files or broker signing keys are mounted. The live proof suite writes/reads bounded sentinel fixtures to demonstrate the boundary.

The local operator can use `python -m scripts.team_cli red commit request.json`, then reveal with `--run ID`. The request commitment is SHA-256(payload + nonce), UTF-8. The nonce must be 16–128 characters. This client runs on the trusted host; the workbench cannot connect to the broker over the network.
