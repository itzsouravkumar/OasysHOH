.PHONY: setup up test demo proof verify doctor down landing console
PY=.venv/bin/python
console:
	npm --prefix dashboard ci
	npm --prefix dashboard run build
landing:
	npm --prefix landing ci
	npm --prefix landing run build
setup:
	@test -f dashboard/static/live.js || $(MAKE) console
	bash scripts/setup.sh
up:
	@test -f dashboard/static/live.js || $(MAKE) console
	@test -f landing/dist/index.html || $(MAKE) landing
	$(PY) -m uvicorn broker.app.main:app --host 127.0.0.1 --port 8787
test:
	$(PY) -m pytest broker/tests -q
demo:
	$(PY) scripts/demo.py
proof:
	$(PY) scripts/demo.py --proof
verify:
	$(PY) -m scripts.verify_container
doctor:
	$(PY) -c 'from broker.app.spawner import availability; import json; print(json.dumps(availability(), indent=2))'
down:
	$(PY) -m scripts.stop_containers
