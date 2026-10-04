# Oasys — Product specification

> Converted from the supplied Round 1 proposal. Product naming updated to Oasys. Research statements, event dates, and target results are preserved as proposal content, not independently verified implementation claims. See IMPLEMENTATION.md for actual device results.


**HACK IN HILLS ’26 MANALI ROUND 1: IDEA SUBMISSION**\
**Oasys**\
**A Sealed Arena for Red Teams, Blue Teams and the Model Between Them**\
Problem Statement 4 (PS4): Securing Adversarial AI Safety Testing Infrastructure\

| **Team Oasys** | **Role** | **Contact** |
| --- | --- | --- |
| Arundhati Singh | Team Leader | +91 96950 57128 |
| Srishti Singh | Team Member | +91 77500 99466 |
| Sourav Kumar | Team Member | +91 62024 26870 |

**Abstract.** Most AI red-teaming setups put the attacker, the defender and the model in one shared environment: a few containers on one host, often one inference server. It is convenient, and it quietly ruins the experiment. If the defender can read the attack, or the attacker can time the model’s cache and work out the defender’s system prompt, then a finding no longer tells you anything. Oasys fixes the *test setup* rather than the model. Red and blue get separate workbenches that cannot see each other. A small broker is the only thing that talks to the model, starts a fresh model worker for every run, seals the result into a hash-chained log, and only then lets the other side see what happened. We are not claiming to have made AI safe. We are claiming that a red-team finding produced inside Oasys is one you can trust, replay, and check for tampering, and we are specific about what the design does *not* stop.

# Problem Statement

## The setting

Adversarial testing of an AI system involves three parties at once. The **red team** attacks: jailbreaks, prompt injection, extraction of hidden instructions. The **blue team** defends: system prompts, filters, guard models. The **model under test** sits in the middle and answers both. The brief asks how all three can run in one shared environment at the same time without exposing their sensitive state or opening side channels.

Today the honest answer is: they usually can’t. A shared Docker host looks like isolation, but red, blue and the model typically share one kernel, one network, one log driver and, most importantly, one inference process.

## What goes wrong

We treat a red-team finding as *invalid* if any of the following is true:

1.  Blue read the attack file, the image layer or the container output before the run closed.

2.  Red timed the model and recovered blue’s system prompt or classifier hints.

3.  The model carried over a prefix, a tool result or a session from the previous tenant.

4.  The monitor that was supposed to prove isolation was itself readable, or editable, by one of the teams.

The second and third are not hypothetical. Serving engines such as vLLM and SGLang reuse the key–value (KV) cache whenever two requests share a token prefix, and that reuse changes response time in a way another tenant can measure \[ref: promptpeek,earlybird\]. We come back to this in Section <a href="#sec:research" data-reference-type="ref" data-reference="sec:research">2</a>.

## What the brief asks for

Reading the evaluation objectives closely, we turned them into six things we have to show, not just claim:

A real benchmark prompt still runs end to end, and latency stays in the same order of magnitude as a direct model call.

A cross-tenant read of files, environment or logs fails, and a timing probe on a shared prefix fails or is explicitly bounded.

The log is append-only, a run can be replayed from it, and changing one byte is detectable.

Rootless containers and a stock runtime. No proprietary hardware.

At least one defence aimed at LLM-specific leakage: cross-tenant KV prefix, session carry-over, or tool output in a shared store.

A clear statement of what is still not stopped.

# Research Background

We kept the research base deliberately small and checkable. Three papers define the attack and the defence space; a handful of public benchmarks supply realistic payloads.

| **Source** | **What it shows** | **What we take from it** |
| --- | --- | --- |
| PromptPeek, NDSS 2025 [ref: promptpeek] | Prefix sharing in vLLM and SGLang lets one tenant reconstruct another tenant’s prompt by timing responses, under settings from “I know the template” to “I know almost nothing”. | This is exactly the red-reads-blue and blue-reads-red leak. Our first test replays this setting, then shows it closed. |
| Early Bird, arXiv:2409.20002 [ref: earlybird] | Shared KV cache `and` shared semantic cache both leak through timing; GPU memory allocation adds another clock. | Isolating the filesystem is not enough if both teams hit one serving process. Isolation has to reach the inference layer. |
| SafeKV, arXiv:2508.08438 [ref: safekv] | Full isolation loses the caching speed-up, global sharing leaks, so it classifies and isolates only sensitive KV blocks. A residual timing channel remains. | Our “what we did not build” slide. It also tells us honestly that timing is the hard part, so we list it as residual risk. |

For payloads we use public sets rather than invent our own: JailbreakBench \[ref: jbb\], HarmBench \[ref: harmbench\] and AdvBench \[ref: advbench\]. The threat class itself matches OWASP LLM Top 10, where prompt injection is item 1 \[ref: owasp\].

# Threat Model

| **Party** | **Wants** | **Can do** | **Trust** |
| --- | --- | --- | --- |
| Red team | See blue’s defence; tamper with the evaluation | Run arbitrary code in its container; submit any prompt; measure latency | Untrusted |
| Blue team | See the attack before the run ends; hide a weak defence | Run arbitrary code in its container; upload a policy | Untrusted |
| Model under test | (Passive) must not carry state between tenants | Execute inference; cache KV state | Semi-trusted |
| Platform operator | Run the arena and report honestly | Full host access | Trusted but verifiable |
| Auditor / judge | Check the result without taking our word | Read the sealed log; replay | Untrusted, read-only |

**Trusted computing base.** The broker, the verifier and the host kernel. We keep the broker small on purpose, because everything we claim depends on it. **Out of scope:** a malicious host administrator, hardware side channels, and attacks on the model weights themselves. Section <a href="#sec:residual" data-reference-type="ref" data-reference="sec:residual">12</a> spells these out.

# Proposed Solution: Oasys

## The idea in one paragraph

Red and blue never touch the model, and never touch each other. Their containers are *workbenches*: red authors payloads, blue authors a defence policy. At run time a broker takes both, starts a brand-new model worker with an empty cache, applies blue’s policy to red’s payload inside a sandbox that has no network, records everything in an append-only hash chain, and signs a seal. Only after the seal does each side get to see what the other contributed. The worker is then destroyed. Because the broker is the only path, there is exactly one place to enforce rules and one place to audit.

## System architecture

<figure id="fig:arch" data-latex-placement="H">
<p>```mermaid
flowchart TD
  Benchmarks --> Red
  Red <--> Broker
  Blue <--> Broker
  Broker <--> Worker[Fresh model worker]
  Broker --> Audit[Hash-chained audit log]
  Worker --> Teardown
  Audit --> Verifier
```</p>
<figcaption>Oasys architecture. Every path goes through the broker; there is no direct red–blue, red–model or blue–model connection. Arrows turn only at right angles.</figcaption>
</figure>

## What each part is responsible for

| **Component** | **Responsibility** |
| --- | --- |
| Red / blue containers | Authoring only. Rootless, read-only root filesystem, no shared volume, each on its own private network. They never see runtime state. |
| Broker | The only component attached to all three networks. Authenticates teams, mints a one-run token, checks commitments, spawns and kills workers, runs blue’s policy, writes the log. Deliberately small. |
| Policy runner | A throwaway sandbox spawned by the broker with no network and no writable disk. It applies blue’s policy to red’s payload so that neither team’s content is ever handed to the other. |
| Model worker | One inference process per run. Model weights are mapped read-only (they are not tenant data); everything else, including the KV cache, is private to the run. |
| Audit log | Append-only, hash-chained, one signed seal per run. Neither team mounts it. |
| Verifier | A separate container with read-only access. It re-derives the chain and the finding, so nobody has to trust the broker’s word. |

## Design principles

1.  **One path.** Every interaction goes through the broker. If a connection does not go through it, it does not exist.

2.  **Fresh state per run.** No process, cache or session outlives a run. This removes the cross-tenant KV prefix at its source.

3.  **Seal before reveal.** Nobody sees the other side’s material until the run is closed and signed.

4.  **Proof over promises.** Every claim in the demo is a command that fails, or a check that passes, in front of the judges.

5.  **Say what we don’t stop.** The residual-risk table is a feature of the submission, not an apology.

# Approach in Detail

## Life of one run

<figure id="fig:life" data-latex-placement="H">
<p>```mermaid
flowchart LR
  Commit --> Policy --> Token --> Worker --> Reveal --> Evaluate --> Answer --> Seal --> Teardown --> Verify
```</p>
<figcaption>Run lifecycle. Steps 1–5 read left to right, then the flow drops down and continues right to left.</figcaption>
</figure>

The order matters. Red commits to a hash of its payload *before* blue’s policy is uploaded, so red cannot adapt the attack to the defence. Blue’s policy hash is stored *before* the payload is revealed, so blue cannot quietly swap in a stronger policy after seeing the attack. The broker is the only party that ever holds both in plaintext.

## Who can see what, and when

| **Object** | **Red** | **Blue** | **Model** | **Broker** | **Verifier** |
| --- | --- | --- | --- | --- | --- |
| Attack payload | owns | after seal | in context, during run | yes | after seal |
| Blue policy | never | owns | in context, during run | yes | after seal |
| Model output | yes | after seal | produces | yes | after seal |
| Audit log | no | verdict after seal | no | append only | read only |
| Run token | no | no | no | mints | checks |

## Container and network hardening

- Separate user namespaces per container, all Linux capabilities dropped, default-deny seccomp profile, read-only root filesystem, no privileged mode, no host mounts, no Docker socket.

- Three private networks (red, blue, model). Only the broker is attached to more than one. Egress from the model worker is closed except to the broker.

- cgroup v2 limits on CPU, memory, process count and I/O for every container, so one team cannot starve the model and turn the slowdown into a signal.

- Optional hardening: run the policy runner and the model worker under gVisor (`runsc`) to shrink the shared-kernel surface. This is a flag, not a dependency.

- Secrets are separated: the payload store and the policy store are different objects, and a run token can read one object, once.

## KV-cache and session isolation

This is the LLM-specific part. Figure <a href="#fig:kv" data-reference-type="ref" data-reference="fig:kv">3</a> contrasts a shared serving process, where a probe can learn from timing, with Oasys’s per-run workers.

<figure id="fig:kv" data-latex-placement="!t">
<p>```mermaid
flowchart TD
  A[Shared baseline] --> B[Shared prefix cache]
  B --> C[Timing leakage]
  D[Oasys] --> E[Fresh worker per run]
  E --> F[No cache carried between runs]
  F --> G[Residual host timing remains]
```</p>
<figcaption>The PromptPeek-style leak (a) and how per-run workers close it (b).</figcaption>
</figure>

A fresh worker per run is the simplest fix that fully removes the cross-tenant prefix, and it fits a hackathon. The cost is start-up time. We keep it low by memory-mapping the model weights read-only so only process state is created per run, and we will measure the real overhead rather than assume it. For deployments that need caching *within* one tenant, the same idea can be done more cheaply by salting the cache block-hash chain with a per-tenant secret so keys are disjoint across tenants; SafeKV’s selective sharing is the more sophisticated end of the same trade-off \[ref: safekv\]. We list both as roadmap, not as the MVP.

## Commit–reveal and sealing

The commitment is $`c=H(\text{payload}\Vert n)`$ with a random nonce $`n`$ and SHA-256. It binds red to one payload and hides it until reveal. Blue’s policy hash plays the same role on the other side. We use a plain hash commitment, checked by the broker, rather than an on-chain or time-lock scheme, because the broker already is the referee and a chain adds failure modes without adding trust inside a single arena.

## Audit log

<figure id="fig:chain" data-latex-placement="H">
<p>```mermaid
flowchart LR
  Genesis --> Event0 --> Event1 --> EventN --> Signature[Ed25519 seal]
  Signature --> Verifier --> Finding[Reproduce finding ID]
```</p>
<figcaption>Hash-chained audit log (<span class="math inline"><em>d</em><sub><em>i</em></sub></span> is the digest of event <span class="math inline"><em>i</em></span>’s payload). Changing one byte of any record changes every later hash, so the verifier reports the first index that breaks.</figcaption>
</figure>

Each event stores the previous hash, the digest of its payload and the tenant ID. The broker is the only writer and the log file is opened append-only; the verifier mounts it read-only. Optionally we publish the signed chain head somewhere neutral (for example a public transparency log) so that even we cannot rewrite history unnoticed.

## Timing and resource governance

Teams only ever interact with the broker, and the broker releases a response only after the run completes, so the most direct timing probe (hammering the model and watching latency) is not available. What is left is the total response time, which can still depend on blue’s policy length. We offer a configurable *release quantum*: the broker holds a response until the next fixed time boundary. It trades latency for lower leakage, and the knob is exposed because the brief wants both. cgroup limits stop one team from creating contention that shows up as a signal.

## Considered and deliberately deferred

Our research notes also surfaced heavier ideas. We looked at each and decided where it belongs.

| **Idea** | **Why not in the 24-hour build** | **Where it goes** |
| --- | --- | --- |
| Zero-knowledge proofs of the audit predicate | Circuit design, trusted setup and proving time would eat the build; a hash chain already gives tamper evidence for this threat model. | Roadmap phase 3 |
| Confidential GPU / TEE tier | The brief asks for no proprietary hardware. | Roadmap, optional |
| On-chain verifier, time-lock puzzles | Adds a blockchain dependency without adding trust inside one arena. | Not planned |
| Per-tenant rotation of attention keys | Needs changes inside the attention kernels, and the supporting work is recent preprint-level. | Research track |
| Post-quantum signatures | Useful for long-retention logs, irrelevant to the demo. | Roadmap phase 3 |

# Innovation and Uniqueness

- **We secure the test, not the model.** Most tooling decides *what* to throw at a model. Oasys decides *who may see what while it happens*.

- **Isolation reaches the inference layer.** Filesystem and network separation is common; removing the shared KV prefix between adversaries is what the attack literature says is needed \[ref: promptpeek,earlybird\].

- **Findings you can replay.** A sealed, hash-chained run reproduces its finding ID from the log alone.

- **Complements, not copies.** Products that sit as a proxy in front of a model, such as the one named in the brief, test and monitor the model. Oasys is the arena they would run in.

- **Honest scope.** We ship a residual-risk table next to the feature list.

# Target Users and Use Cases

- **Product security teams** who want an outside red team to attack their model without handing over their defences.

- **Third-party red-team vendors** who need to prove a result was not influenced by the defender.

- **Model evaluators and researchers** comparing defences on equal terms with reproducible runs.

- **Auditors and regulators** who need to replay a finding instead of trusting a slide.

- **Universities and competitions** running LLM capture-the-flag events on shared hardware.

# Technology Stack

We picked for one thing: a three-person team has to finish, demo and defend this in 24 hours. The whole *software* stack is open source and needs no paid service or hosted model API. Cloud credits only pay for hosting (Section <a href="#sec:deploy" data-reference-type="ref" data-reference="sec:deploy">10</a>); the same containers run unchanged on a Linux laptop. Where a fancier option exists we say why we did not take it, and we lock one choice per layer so nobody debates tools mid-build.

| **Layer** | **Our pick** | **Licence** | **Why, and what we rejected** |
| --- | --- | --- | --- |
| Host OS | Ubuntu 24.04 LTS, cgroup v2 | Open source | Native namespaces, seccomp and cgroup limits; ships Python 3.12 and Podman. Not a macOS or Windows host. |
| Runtime | Rootless Podman | Apache-2.0 | Daemonless; the broker uses a user-level socket, never a root one. Not Docker with a mounted socket. |
| Static services | Podman Compose for red, blue, broker, verifier, dashboard; broker spawns per-run containers through the Podman API | GPL-2.0 | Quick to start. GPL is fine for a tool we run rather than link against. Fallback: plain `podman` commands in `security/networks.sh`. Not Kubernetes. |
| Networking | Three internal Podman networks (red, blue, model); only the broker is attached to more than one | Podman | No route red–blue, red–model or blue–model, so the “one path” rule is enforced by the network, not by good manners. |
| Hardening | Custom seccomp profile, `no-new-privileges`, all capabilities dropped, read-only root, cgroup v2 limits on CPU, memory, PIDs and I/O | Linux kernel | Stock kernel features, no special hardware. Resource caps also stop contention from becoming a signal. |
| Extra sandbox | gVisor `runsc`, a flag on the policy runner and worker (optional) | Apache-2.0 | Smaller kernel surface, off by default so a compatibility snag cannot block the build. Not Kata or Firecracker (need nested KVM). |
| Broker, verifier | Python 3.12, FastAPI, Pydantic, httpx, uvicorn | PSF, MIT, MIT, BSD | Small, readable trusted base. Not Go or Rust under a 24-hour clock; fine for a later rewrite. |
| Integrity | SHA-256 (`hashlib`) hash chain in append-only JSONL; Ed25519 seal with PyNaCl | PSF, Apache-2.0 | Simple to replay on stage. No PostgreSQL, MongoDB, Firebase or blockchain: nothing here needs them. |
| Blue policy | Declarative policy file (system prompt, allow and deny patterns, transforms) evaluated by the throwaway policy runner | — | Blue never ships arbitrary code into our trusted path. Open Policy Agent is a stretch for broker access rules; a Python state machine covers the MVP with less trusted code. |
| Model runtime | `llama.cpp` `llama-server`, one fresh process per run | MIT | CPU-friendly and a cold cache by construction. |
| Model | Qwen2.5-1.5B-Instruct, quantised GGUF. One locked choice | Apache-2.0 | Enough to show injection, prompt leakage and cross-run state; we are demonstrating infrastructure, not model quality. Not Llama 3.2 (Llama community licence) and not the 3B class (check its model card; it is not under Apache-2.0). |
| Baseline | The same `llama.cpp` server, long-lived and shared, with prompt caching on. vLLM with prefix caching only if a GPU is present | MIT, Apache-2.0 | Same engine on both sides, so isolation is the only variable in the T4 comparison. |
| Benchmarks | JailbreakBench, HarmBench, AdvBench as local files | MIT code (first two); check AdvBench | Public and citable; no remote API calls. |
| Dashboard | FastAPI, Jinja2, HTMX; no Node, no build step | MIT, BSD | Live run, seal and verifier status with almost no front-end work. Not React or Next.js. |
| Tests, statistics | pytest, NumPy, SciPy (Mann–Whitney U, ROC-AUC with a bootstrap interval for T4) | MIT, BSD | One command runs the proof, and T4 reports a number with an interval, not a tick. |
| Monitoring | Structured JSON logs always on. Falco, Prometheus, OpenTelemetry post-MVP | Apache-2.0 | Enough to show blocked attempts live. Grafana skipped: AGPL and not needed. |
| Supply chain | Trivy, Syft, Grype for image scans and SBOM (optional) | Apache-2.0 | One command each; a maturity signal, not core. |

| **Tier** | **Dependencies** |
| --- | --- |
| MVP | Ubuntu, Podman and Podman Compose, kernel namespaces, seccomp and cgroups, Python 3.12 with FastAPI, Pydantic, httpx, PyNaCl, Jinja2, HTMX, `llama.cpp` with Qwen2.5-1.5B, pytest, NumPy, SciPy |
| Should | Shared-server baseline for T4, release quantum, gVisor flag |
| Stretch | OPA, Falco, Prometheus, OpenTelemetry, Trivy, Syft, Grype, vLLM baseline on a GPU |

**Deliberately not used.** Any paid or hosted model API, managed or self-run databases, Redis, Kafka, Kubernetes, blockchain, TEEs and confidential GPUs, Kata and Firecracker. The smaller the stack, the smaller the trusted base we have to defend.

**Two assumptions to confirm early.** The demo machine must be Linux (or a Linux VM with cgroup v2), and the broker must never mount a root-owned container socket. If either fails we say so on stage rather than hide it.

# Repository Structure

One repository, one folder per trust zone, so the file layout itself shows the isolation boundaries. A reviewer can see at a glance which code runs where.

    OasysHOH/
    |-- README.md                  quick start + the three-minute demo
    |-- Makefile                   make up | make test | make demo | make clean
    |-- compose.yaml               red, blue, broker, verifier, dashboard
    |-- .env.example               ports, model name, release quantum
    |-- THIRD_PARTY.md             every dependency and its licence
    |-- docs/                      architecture, threat model, residual risk, demo script
    |-- broker/                    TRUSTED: the only component on all networks
    |   |-- Dockerfile
    |   |-- app/
    |   |   |-- main.py            FastAPI entry point and routes
    |   |   |-- auth.py            team auth, one-run tokens
    |   |   |-- commit.py          commit-reveal (SHA-256 + nonce)
    |   |   |-- runs.py            run state machine: commit > run > seal > reveal
    |   |   |-- spawner.py         start and kill per-run workers (Podman API)
    |   |   |-- policy_client.py   call the sandboxed policy runner
    |   |   |-- auditlog.py        hash chain, Ed25519 seal, append-only writer
    |   |   `-- release.py         release quantum for timing padding
    |   `-- tests/                 unit tests: commit, chain, token expiry
    |-- verifier/                  TRUSTED: read-only mount of the log
    |   |-- Dockerfile
    |   |-- verify.py              recompute chain, report first broken index
    |   `-- replay.py              reproduce the finding ID from the log
    |-- policy-runner/             throwaway sandbox: no network, no writable disk
    |   |-- Dockerfile
    |   `-- run_policy.py
    |-- worker/                    per-run model process, destroyed after seal
    |   |-- Dockerfile
    |   `-- entrypoint.sh
    |-- red/                       UNTRUSTED workbench
    |   |-- Dockerfile
    |   |-- cli.py                 submit commitment, reveal, fetch output
    |   `-- payloads/              benchmark rows chosen by red
    |-- blue/                      UNTRUSTED workbench
    |   |-- Dockerfile
    |   |-- cli.py                 upload policy, fetch sealed report
    |   `-- policies/              system prompts and filter configs
    |-- security/
    |   |-- seccomp-arena.json     default-deny syscall profile
    |   |-- networks.sh            three internal networks, broker on all
    |   `-- limits.env             cgroup CPU, memory, pids, I/O caps
    |-- dashboard/
    |   |-- templates/             live run, seal, verifier status
    |   `-- static/
    |-- attacks/                   the proof: each file is one test (T1-T9) in the validation plan
    |   |-- t01_red_reads_policy.sh
    |   |-- t02_blue_reads_payload.sh
    |   |-- t03_direct_network.sh
    |   |-- t04_timing_probe.py    shared-cache baseline vs Oasys, with statistics
    |   |-- t05_tamper_log.sh
    |   |-- t06_replay.sh
    |   |-- t07_resource_abuse.sh
    |   |-- t08_worker_egress.sh
    |   `-- t09_benchmark_row.py
    |-- data/
    |   |-- fetch_benchmarks.py    pulls JailbreakBench / HarmBench / AdvBench
    |   `-- models/                GGUF weights (git-ignored, mounted read-only)
    |-- runs/                      audit log volume (git-ignored, broker writes only)
    `-- scripts/
        |-- bootstrap.sh           install Podman, pull images, fetch models
        `-- tamper_demo.sh         flip one byte for the live demo

**Why this layout.** Only `broker/` and `verifier/` are trusted code, and `red/` and `blue/` are the only untrusted code, so a reviewer knows where to look. `attacks/` holds one script per row of Table <a href="#tab:tests" data-reference-type="ref" data-reference="tab:tests">[tab:tests]</a>, which means “show me the proof” is a single `make test`. A sensible three-way split is: broker and run logic; containers, security profiles and attacks; verifier, dashboard and demo.

# Final Output and Deployment

The deliverable is a **working system**, not a slide-ware simulation: real model inference, real container isolation, real denied system calls, a real signed log. What it is not is a production multi-tenant service. It is a real prototype on one node, and we say so.

## What we ship

| **Artifact** | **What a judge actually sees** | **Real because** |
| --- | --- | --- |
| Oasys Console (live URL) | A web dashboard: pick a benchmark row, start a run, watch the commit, run, seal and reveal steps happen, then read the verifier verdict. Read-only for visitors; it only shows sealed data and is not in the trust path. | Every number and status comes from the broker and the log |
| End-to-end run | Real JailbreakBench or HarmBench behaviour, red container to broker to a fresh model worker to sealed record | A real model answers |
| “Prove it” suite | One command or button runs T1–T8 against the live containers and prints pass or fail for each | Scripts really try the forbidden reads and connections |
| Tamper demo | Flip one byte of the log; the verifier names the first broken record | Real hash chain |
| Public repository | Code, pinned versions, `README`, `make up` | Anyone can reproduce |
| Backup recording | Screen recording of the live system for Round 2 and bad Wi-Fi | Recording of the real thing |

The console reports *measured* results, for example the T4 classifier AUC with its confidence interval, rather than a wall of green ticks. A zero we cannot defend is worth less than a number we can.

## Where it runs

The finale is offline in Manali, and venue internet is the one thing we cannot control. So the *primary* demo runs on a Linux laptop with `make up`, and the cloud copy is the always-on mirror that judges can open and that we use for rehearsal and the Round 2 reel.

<figure data-latex-placement="H">
<p>```mermaid
flowchart TD
  Browser --> HTTPS --> Console --> Broker
  Red <--> Broker
  Blue <--> Broker
  Broker <--> Worker
  Broker --> Audit --> Verifier
```</p>
<figcaption>Cloud deployment on one EC2 instance. Only the proxy is exposed; the broker, workers and log have no public port.</figcaption>
</figure>

| **Where** | **Decision** |
| --- | --- |
| AWS EC2 | Core arena. A CPU instance in the 8 vCPU, 16 GB class is enough for a 1–3B model on `llama.cpp`. It gives us a full Linux kernel with the namespaces, seccomp and cgroup control that our isolation design depends on. A GPU instance only if the quota is granted, and not needed for the demo. |
| Linux laptop | Primary finale demo, same containers, same `make up`. |
| Railway | Not used for the core. It runs managed containers we do not control at the kernel level, so we could not show rootless runtime, custom seccomp, cgroup limits or per-run worker spawning there. Optional use: a small public page that lets anyone paste an exported log and verify the chain in the browser. |

**Budget and guardrails.** Rough arithmetic only; check the current AWS price list before relying on it. An instance of this class costs on the order of a few tens of cents per hour on demand, so \$100 of credit covers roughly ten days of non-stop running and far more if we stop it between sessions. We set AWS Budgets alerts well below the credit, stop the instance when idle, open only port 443 to the world and SSH only from our own addresses, and keep the broker and any control endpoint off the public network. Regular EC2 instances do not expose nested virtualisation, which is one more reason we chose containers over microVMs.

## Cut line

With 24 hours, we decide in advance what we drop first.

| **Priority** | **Items** |
| --- | --- |
| Must ship | Real end-to-end run through the broker; hardened red, blue and worker containers with failing cross-reads; hash chain, verifier and tamper demo; Oasys Console |
| Should ship | Timing probe, shared-cache baseline vs Oasys (T4); release quantum |
| Stretch | gVisor flag; browser-side public verifier on Railway; GPU instance |

# Validation Plan and Demo

We would rather show failures than describe them. Table <a href="#tab:tests" data-reference-type="ref" data-reference="tab:tests">[tab:tests]</a> lists the checks we will run live. Results are *targets* until we have measured them.

| **ID** | **Check** | **Expected outcome** |
| --- | --- | --- |
| T1 | Red tries to read blue’s policy (files, environment, `/proc`, Docker socket) | Denied or not found |
| T2 | Blue tries to read the payload before the seal | Denied or not found |
| T3 | Red and blue try to reach each other and the model directly | No route, timeout |
| T4 | Prefix-timing probe over many trials: shared-cache baseline vs Oasys | Baseline separable (AUC clearly above 0.5); Oasys AUC near 0.5 |
| T5 | Flip one byte in the log | Verifier reports first broken index |
| T6 | Replay a sealed run | Same finding ID |
| T7 | Red launches a fork bomb or memory hog | cgroup stops it; model latency stays in band |
| T8 | Model worker attempts outbound traffic | Blocked |
| T9 | Run one real JailbreakBench or HarmBench row end to end | Completes; overhead vs direct call reported |

**Three-minute demo.** Run a public benchmark behaviour. Show red’s shell failing to read blue’s policy, then blue’s shell failing to read the payload. Open the sealed log and reproduce the finding. Flip one byte and show verification fail. End on the residual-risk slide.

# Residual Risk

| **Risk** | **Why it remains** | **Mitigation** |
| --- | --- | --- |
| Residual timing channel | Host scheduler noise and shared GPU contention remain; SafeKV also reports a leftover channel [ref: safekv]. | Release quantum, cgroup limits; measured and bounded, not claimed as zero |
| Shared host kernel | A kernel exploit breaks container isolation. | Rootless, seccomp, optional gVisor |
| Malicious host admin | The operator can read memory. | Out of scope; TEE tier on roadmap |
| Broker compromise | The broker is the trusted base. | Keep it small; verifier replays independently |
| Signing key on host | An attacker with the key could re-sign. | External anchoring of the chain head |
| Behavioural leakage | Red can still learn about blue’s policy from the model’s answers. | This is the experiment itself, so it is a finding, not a bug |
| Start-up cost | A fresh worker per run adds latency. | Read-only shared weights; measure and report |

# Expected Impact and Evaluation Fit

Red-team results are increasingly used to decide whether a model ships, and sometimes to answer regulators. If the environment can be influenced, those decisions rest on sand. Oasys gives the community a small, open, reproducible reference setup for running adversarial evaluations that both sides can trust. Because every run is independent and every worker is disposable, it scales out by adding nodes; the limit is accelerator memory, not shared state.

| **Judging criterion** | **How we address it** |
| --- | --- |
| Innovation | Isolation that reaches the KV cache; sealed, replayable findings |
| Technical execution | Live failing cross-reads, tamper test, timing probe, real benchmark row |
| Impact | Trustworthy red-team results for developers, vendors and auditors |
| Scalability | Stateless per-run workers; horizontal by adding nodes |
| Problem–solution fit | Each of the six brief objectives has a matching test (T1–T9) |
| User experience | One dashboard: run, seal, verify |
| Final presentation | Three-minute demo plus a residual-risk slide |

# Implementation Roadmap

| **Stage** | **Dates (2026)** | **What we do** |
| --- | --- | --- |
| Round 1 | 10 Sep – 20 Oct | This document and the PPT; architecture and test plan frozen |
| Round 2 | 22 – 25 Oct | LinkedIn post and Instagram reel built around the “failing cross-read” demo |
| Finalist preparation | 30 Oct – 19 Nov | If shortlisted: pick benchmark rows, write attack scripts for T1–T8, stand up the EC2 instance, pre-download models and images (code only as far as the rules allow) |
| Grand Finale | 20 Nov, Manali | 24-hour build, Table tab:hours |
| After the event | Later | ZK attestation, TEE tier, post-quantum signatures, cache-salting |

| **Hours** | **Work** |
| --- | --- |
| 0 – 3 | Three containers, three private networks, broker skeleton |
| 3 – 6 | Hardening profiles, one-run token, cgroup limits |
| 6 – 10 | Per-run worker spawner; one real benchmark row end to end |
| 10 – 13 | Commit–reveal, policy runner, seal logic |
| 13 – 16 | Audit chain, verifier container, tamper demo |
| 16 – 19 | Attack suite T1–T8; timing probe baseline vs Oasys |
| 19 – 21 | Dashboard and residual-risk slide |
| 21 – 24 | Rehearsal, feature freeze, buffer |

# Team Oasys

We are three people with one shared view: a security claim is only worth something if you can watch it fail to be broken. Arundhati Singh leads the team; Srishti Singh and Sourav Kumar are team members. Contact details are on the first page.

# References

- **promptpeek**: Wu et al. `I Know What You Asked: Prompt Leakage via KV-Cache Sharing in Multi-Tenant LLM Serving.` NDSS 2025.
- **earlybird**: `The Early Bird Catches the Leak: Unveiling Timing Side Channels in LLM Serving Systems.` arXiv:2409.20002.
- **safekv**: Chu et al. SafeKV: selective KV-cache sharing to mitigate timing side channels in LLM inference. arXiv:2508.08438.
- **jbb**: Chao et al. JailbreakBench: An Open Robustness Benchmark for Jailbreaking Large Language Models. NeurIPS Datasets and Benchmarks, 2024.
- **harmbench**: Mazeika et al. HarmBench: A Standardized Evaluation Framework for Automated Red Teaming and Robust Refusal. ICML 2024.
- **advbench**: Zou et al. Universal and Transferable Adversarial Attacks on Aligned Language Models. arXiv:2307.15043, 2023.
- **owasp**: OWASP. Top 10 for Large Language Model Applications.
