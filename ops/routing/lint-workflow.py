#!/usr/bin/env python3
import hashlib
import json
import pathlib
import platform
import subprocess
import sys
import tarfile

root = pathlib.Path(__file__).resolve().parents[2]
pin = json.loads((root / "ops/routing/pins.json").read_text())["tools"]["actionlint"]
system = platform.system().lower()
architecture = {"arm64": "arm64", "aarch64": "arm64", "x86_64": "amd64"}[platform.machine()]
target = system + "_" + architecture
directory = pathlib.Path(sys.argv[1]).resolve() / "actionlint"
directory.mkdir(parents=True, exist_ok=True)
filename = f'actionlint_{pin["version"]}_{target}.tar.gz'
archive = directory / filename
subprocess.run(["curl", "--fail", "--location", "--silent", "--show-error",
                f'https://github.com/rhysd/actionlint/releases/download/v{pin["version"]}/{filename}',
                "-o", str(archive)], check=True)
if hashlib.sha256(archive.read_bytes()).hexdigest() != pin["archives"][target]:
    raise SystemExit("actionlint checksum mismatch")
with tarfile.open(archive) as contents:
    binary = directory / "actionlint"
    binary.unlink(missing_ok=True)
    binary.write_bytes(contents.extractfile("actionlint").read())
binary.chmod(0o755)
subprocess.run([str(binary), "-version"], check=True)
subprocess.run([str(binary), str(root / ".github/workflows/deploy-routing-production.yml")], check=True)
