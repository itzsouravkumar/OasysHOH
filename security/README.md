# Runtime hardening

The enforced flags are defined in `broker/app/spawner.py`. All execution containers use network=none, non-root UID/GID 65532, read-only root, cap-drop=ALL, no-new-privileges, CPU/memory/PID limits, and a bounded noexec tmpfs. Docker's default seccomp is enabled; no custom profile is claimed. Workbench containers do not mount the runtime socket, broker state, or evidence.

Docker Desktop is a rootful engine inside a Linux VM on this device. Rootless Podman, independent user-namespace validation, stricter syscall allowlists, I/O throttling, and statistically quantified contention are remaining proposal work. See `docs/SECURITY.md`.
