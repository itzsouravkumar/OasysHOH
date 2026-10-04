# Oasys — phase-by-phase implementation

The source proposal is in SPECIFICATION.md. This file reports the implemented local prototype separately from the proposed production design.

## Phase 1 — specification and foundation: complete

- Converted the supplied LaTeX to Markdown, preserving sections, 16 tables, five diagrams as Mermaid, and references.
- Corrected the product name to Oasys; folder remains OasysHOH.
- Inspected an empty project and installed local dependencies.
- Recorded the Apple Silicon / Docker Desktop deployment difference explicitly.

## Phase 2 — broker, policy and evidence: complete for local MVP

- Immutable commitment and policy transitions; single-use token with five-minute reveal expiry.
- Broker serializes runs; result and evidence endpoints reject premature reveal.
- SHA-256 append-mode JSONL and Ed25519 seal.
- Independent verifier validates a trusted public key, complete chain, signature, commitment, policy hash, finding, teardown, and summary consistency.
- Signed evidence survives broker restarts. Partial unsealed logs remain private and are not resumable.
- Separate red, blue, operator and auditor API tokens. Local operator UI is deliberately trusted.

## Phase 3 — model and isolation: real local execution verified

- Qwen2.5-1.5B-Instruct Q4_K_M downloaded; SHA-256 recorded in data/model-manifest.json.
- Fresh networkless llama.cpp container per run; no shared serving process or session.
- Model readiness checked; generation performed; worker destroyed before evidence publication.
- Policy evaluated in a separate networkless sandbox.
- Workbench cross-reads fail; peer connections fail; real model worker egress fails.
- Memory limit causes an actual OOM kill in a disposable, bounded probe.
- Separate verifier container has a read-only evidence mount, no signing key, no network, and verifies successfully.

Measured examples: injection fixture **10,930 ms** end-to-end; public benchmark control **16,106 ms**, including **9,810 ms** inference. See the sealed bundle for exact timings; figures can differ in subsequent runs.

## Phase 4 — console and demo: complete

- Overview, evaluations, evidence vault, and isolation/proof views.
- Responsive white/sky-blue gradients, dotted margins, dashed boundaries and corner markers.
- Actual broker events and responses; no simulated counters or fabricated passing tests.
- Browser-tested real inference, verification and tampered-copy failure.
- Desktop layout inspected at 1440 px and mobile at 390 px; no page-level mobile horizontal overflow.
- Offline assets; no remote font, script, hosted model API or CDN dependency.
- `make up`, `make test`, `make demo`, `make proof`, and `make verify` documented.

## Validation status

| Check | Actual outcome | Qualification |
| --- | --- | --- |
| Integrity/lifecycle/auth regression suite | 24 passing tests at final checkpoint | Later additions may increase count; use `make test` for current result |
| T1 red reads blue | PASS | Private sentinel file inaccessible; peer state absent; runtime socket absent |
| T2 blue reads red | PASS | Same check in reverse |
| T3 direct peer networking | PASS | Both workbenches have no network |
| T4 statistical timing comparison | SKIP | No AUC/CI claim; no shared-cache baseline experiment |
| T5 modified audit record | PASS | First altered index reported; original stays valid |
| T6 replay | PASS | Same finding reconstructed from signed evidence |
| T7 resource abuse | PARTIAL | Actual OOM enforced; concurrent latency impact not measured |
| T8 model egress | PASS | Actual outbound socket returns network unreachable |
| T9 genuine public row | PARTIAL | Inference complete; separate direct-call baseline not measured |

Latest exact results are in proof-results.json. A partial result is not a full pass.

## Remaining proposal phases

1. Deploy and validate rootless Podman on native Linux; move host broker supervision into a deliberately constrained rootless control architecture.
2. Implement and measure the shared-cache timing baseline with enough trials for an AUC and bootstrap interval. Do not display invented statistics.
3. Measure isolated/direct overhead and concurrent resource contention; exercise additional public benchmark rows.
4. Add strict custom seccomp, optional gVisor, external signed-head anchoring, and authenticated remote read-only judge access.
5. Cloud deployment, backup recording, confidential computing, ZK and post-quantum work remain unimplemented.

## Visual revision

- Share Tech Mono bundled locally with its SIL OFL notice; no font network request needed after setup.
- Black dashed borders and square corners throughout; SVG diagram boxes are square too.
- Persistent light/dark theme toggle, white/sky-blue default.
- All four views checked at 320, 390, 768, and 1440 px with no page-level horizontal overflow. Mobile tables render as stacked records.
- Browser computed styles confirmed the font loaded, all inspected controls had zero radius, and dashed border colors were black.
