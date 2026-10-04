# Trust boundaries and known limitations

## Implemented boundaries

The trusted local operator controls the host broker, Docker CLI, signing key, and UI. Red/blue role tokens authorize only their own API operations. Auditor access is sealed-only. There is one red and one blue role, not a multi-organization tenant directory.

Containers use UID/GID 65532, read-only root filesystems, all Linux capabilities dropped, no-new-privileges, runtime-default seccomp, network=none, bounded CPU/memory/PIDs, and a size-limited noexec/nosuid tmpfs. The worker has a read-only model file. No container has a Docker socket or private broker/state mount. Trusted exec stdin carries broker requests; the model HTTP server binds only inside its network namespace.

Blue policies are declarative data. Literal matching avoids regex denial of service. Input sizes and generation length are bounded. Team-provided arbitrary Python is never executed in the trusted policy path.

Evidence is withheld until the worker is destroyed and the chain is signed. The verifier trusts a pinned key, not a key supplied by an imported bundle. Changes, truncation, signature/key replacement, and contradictory summary metadata are rejected.

## What is not covered

- A malicious host operator, stolen signing key, shared-kernel exploit, hardware side channel, or altered model weights.
- Timing privacy proved by statistics; CPU contention and prompt/output length can still affect elapsed time.
- Production authentication: the loopback console grants local operator capability. It must remain bound to 127.0.0.1. It is not a public judge endpoint.
- Rootless Podman and separate user namespaces are not enabled in this Docker Desktop prototype.
- The runtime default seccomp policy is used; a custom default-deny allowlist is not shipped.
- JSONL is opened append-only by the broker but is not immutable to the host. External anchoring is pending.
- The browser operator configures both roles. The networkless workbench proof exercises real kernel boundaries using sentinel files, not a complete hostile authoring service.
- Evidence import is capped at 2 MB after JSON parsing; this loopback service is not hardened for untrusted Internet traffic.
- Failed/interrupted runs are not automatically resumable, and unsealed diagnostic logs can be retained until the operator chooses to remove them.

## Prevent accidental disclosure

Keep `.state/` and `runs/` out of source control. An exported sealed bundle contains payload, policy, nonce and output for an authorized auditor. Red-role API responses never include the policy or full evidence bundle. Publicly sharing an export can reveal the blue policy; choose recipients intentionally.
