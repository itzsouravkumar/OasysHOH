# Blue workbench

A non-root networkless container named `oasys-blue`. The policy runner is separate and disposable. Policies contain system_prompt, deny (literal phrases), allow (literal phrases), and strip_control_chars. A policy can be locked once after red commits and cannot be replaced afterward.

The local operator can call `python -m scripts.team_cli blue policy policy.json --run ID` using the blue credential. The host credential store is trusted; do not give it to an adversarial team. The blue API cannot read a payload before sealing.
