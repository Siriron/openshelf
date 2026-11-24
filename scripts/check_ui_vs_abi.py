#!/usr/bin/env python3
"""Cross-check the UI against the contract ABI (genvm-lint schema --json).

This app calls the contract through two wrappers (readJson('name') and writeAndWait via send({ fn: 'name' })),
which the stock readContract/writeContract scanner cannot see, so this checker reads those call shapes instead.
Fails on: unknown method, a view sent as a write or a write read as a view, any contract method no UI path calls.
Usage: python scripts/check_ui_vs_abi.py contracts/openshelf.py src
"""
import json, pathlib, re, subprocess, sys

contract, src = sys.argv[1], pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else "src")
out = subprocess.run(["genvm-lint", "schema", contract, "--json"], capture_output=True, text=True).stdout
schema = json.loads(out[out.index("{"):])["schema"]["methods"]
reads, writes = set(), set()
for f in list(src.rglob("*.ts")) + list(src.rglob("*.tsx")):
    t = f.read_text(errors="ignore")
    reads |= set(re.findall(r"readJson<[^>]*(?:<[^>]*>)?[^>]*>\(\s*'(\w+)'", t))
    writes |= set(re.findall(r"\bfn:\s*'(\w+)'", t))
bad = []
for n in sorted(reads):
    if n not in schema: bad.append(f"UNKNOWN METHOD read: {n}")
    elif not schema[n]["readonly"]: bad.append(f"KIND MISMATCH: {n} is a write method but is read")
for n in sorted(writes):
    if n not in schema: bad.append(f"UNKNOWN METHOD write: {n}")
    elif schema[n]["readonly"]: bad.append(f"KIND MISMATCH: {n} is a view method but is sent as a write")
for n in sorted(schema):
    if not n.startswith("__") and n not in reads | writes: bad.append(f"NOT REACHABLE FROM UI: {n}")
print(f"{len(schema)} contract methods, {len(reads)} reads, {len(writes)} writes")
print("\n".join(bad) if bad else "OK: every UI call matches the schema and every method is reachable")
sys.exit(1 if bad else 0)
