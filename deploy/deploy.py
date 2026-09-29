#!/usr/bin/python3 -I
"""Root-owned release command. Only the current public main SHA is accepted. Needs manual installation when changed."""
import fcntl
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import time
import urllib.request

ROOT = Path('/var/lib/ourmemories')
REPO = 'https://github.com/JackHoffsten/OurMemories.git'
ENV = {'PATH': '/usr/sbin:/usr/bin:/sbin:/bin', 'HOME': '/root', 'LANG': 'C.UTF-8', 'DOCKER_HOST': 'unix:///var/run/docker.sock'}


def run(*args, **kwargs):
    return subprocess.run(args, check=True, env=ENV, **kwargs)


def release_directory(sha):
    return ROOT / 'releases' / sha


def compose(sha, *args):
    release = release_directory(sha)
    subprocess.run(
            ['docker', 'compose', '--project-directory', str(release), '-f', str(release / 'compose.prod.yaml'), *args],
            env={**ENV, 'RELEASE_SHA': sha}, check=True)


def remote_sha():
    result = run('git', 'ls-remote', REPO, 'refs/heads/main', capture_output=True, text=True).stdout
    return result.split()[0]


def save_state(state):
    temp = ROOT / 'release.json.tmp'
    temp.write_text(json.dumps(state) + '\n')
    temp.replace(ROOT / 'release.json')


def prepare_release(source, sha):
    release = release_directory(sha)
    release.mkdir(mode=0o700, parents=True, exist_ok=True)
    for source_name, destination_name in (
            ('compose.prod.yaml', 'compose.prod.yaml'),
            ('deploy/Caddyfile', 'Caddyfile'),
            ('deploy/postgres-init.sh', 'postgres-init.sh')):
        destination = release / destination_name
        destination.write_bytes((source / source_name).read_bytes())
        destination.chmod(0o644)


def main():
    if os.geteuid() != 0 or len(sys.argv) != 2 or not re.fullmatch('[0-9a-f]{40}', sys.argv[1]):
        raise SystemExit('Usage (root): ourmemories-deploy <full lowercase Git SHA>')
    sha = sys.argv[1]
    ROOT.mkdir(mode=0o700, parents=True, exist_ok=True)
    with (ROOT / 'operations.lock').open('w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        if remote_sha() != sha:
            raise SystemExit('Refusing a release that is not current origin/main')
        state_file = ROOT / 'release.json'
        state = json.loads(state_file.read_text()) if state_file.exists() else {'history': []}
        previous = state.get('active')
        source = ROOT / 'source'
        if not source.exists():
            run('git', 'clone', '--no-checkout', REPO, str(source))
        run('git', '-C', str(source), 'fetch', '--force', 'origin', 'main')
        fetched = run('git', '-C', str(source), 'rev-parse', 'FETCH_HEAD', capture_output=True, text=True).stdout.strip()
        if fetched != sha:
            raise SystemExit('Main advanced during fetch; let the next build deploy')
        run('git', '-C', str(source), 'checkout', '--detach', '--force', sha)
        prepare_release(source, sha)
        for component, image in [('backend', 'backend'), ('frontend', 'gateway')]:
            run('docker', 'build', '--pull', '--file', str(source / component / 'Dockerfile'), '--tag', f'ourmemories-{image}:{sha}', str(source))
        if remote_sha() != sha:
            raise SystemExit('Main advanced during build; refusing stale deployment')
        compose(sha, 'up', '-d', '--wait', 'postgres')
        try:
            compose(sha, 'up', '-d', '--wait', '--wait-timeout', '180', 'backend', 'gateway')
            for attempt in range(12):
                try:
                    with urllib.request.urlopen('http://127.0.0.1:18081/', timeout=10) as response:
                        if response.status == 200 and b'<div id="root">' in response.read():
                            break
                except OSError:
                    pass
                time.sleep(5)
            else:
                raise RuntimeError('Local gateway smoke test failed')
        except Exception:
            if previous:
                compose(previous, 'up', '-d', '--wait', '--wait-timeout', '180', 'backend', 'gateway')
                print(f'Rolled application images back to {previous}; database was not restored', file=sys.stderr)
            else:
                compose(sha, 'stop', 'backend', 'gateway')
            raise
        history = [sha] + [item for item in state['history'] if item != sha]
        save_state({'active': sha, 'history': history[:4]})
        for old in history[4:]:
            for image in ('backend', 'gateway'):
                subprocess.run(['docker', 'image', 'rm', f'ourmemories-{image}:{old}'], env=ENV, check=False)
            shutil.rmtree(release_directory(old), ignore_errors=True)
        print(f'Deployed {sha}')


if __name__ == '__main__':
    main()
