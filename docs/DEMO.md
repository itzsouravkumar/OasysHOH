# Oasys — live demo script

## Before the demo

Start Docker Desktop, `make doctor`, then `make up`. Open http://127.0.0.1:8787. Keep this terminal open. All assets and model weights are local after setup. Run `make test` and one evaluation before arriving at the venue.

## 0:00 — show the boundary

“Oasys secures the experiment, not the model. Red and blue do not share runtime state. The broker is trusted, and each evaluation gets a fresh model worker.”

Open Overview and point to the actual execution graph. Explain that the Mac prototype uses Docker’s Linux VM, not a native rootless Podman host.

## 0:25 — run

Open Evaluations. Choose Instruction override. Run it and watch the commit, policy lock, fresh worker, result, teardown, and seal. Do not call a model refusal or a policy leak predetermined. The local 1.5B model may disclose the synthetic SKYLINE-274 test code; that is a recorded model finding.

For a genuine public control, use Password strength / JailbreakBench benign row 13. It is the unchanged source Goal field. Allow roughly 15–30 seconds on this device.

## 1:00 — verify

Open Evidence vault, select the completed run, and Verify & replay. Point out chain count, signature and finding ID. Replay reconstructs the finding from saved evidence; it does not promise a second inference produces identical text.

## 1:30 — tamper

Click Test tamper detection. The copy fails at record 0. The original remains valid. Export the original and run `make verify` to check evidence in a separate networkless verifier container with a read-only mount.

## 2:00 — prove isolation

Open Isolation & proof and run the suite. T1/T2 use actual private files in opposite containers; cross-reads fail. T3 fails peer connection attempts. T8 makes a real outbound connection attempt from a loaded model worker and gets network unreachable. T7 bounds an allocation so the test container is OOM-killed without a host-wide fork bomb.

## 2:40 — state the limits

“The host and broker are trusted. Containers share the Linux VM kernel. Cold workers eliminate carried-over process state; they do not prove zero timing leakage. Statistical T4 and workload-interference tests are pending. This is a working local MVP, not a completed production service.”

## Recovery

- If a run fails, the console reports Failed and withholds sealed evidence. Use a new run after fixing the runtime.
- If a server restart interrupts inference, partial logs remain private; inspect/remove any leftover Oasys workers with `make down`, then `make setup` and `make up`.
- Keep the original `.state/signing.key` to validate this installation’s historical evidence. Do not commit or share `.state/credentials.json`.
