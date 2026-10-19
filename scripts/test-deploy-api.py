#!/usr/bin/env python3
"""Fault-injection tests for the host script. All host commands are test doubles."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SHA = 'a' * 40
IMAGE = 'ghcr.io/example/nearbook-api@sha256:' + 'b' * 64

FAKE = r'''
import json, os, pathlib, sys
state_file = pathlib.Path(os.environ['TEST_DEPLOY_STATE'])
s = json.loads(state_file.read_text())
cmd = pathlib.Path(sys.argv[0]).name
a = sys.argv[1:]
s['events'].append([cmd] + a)
result = 0
output = ''
scenario = s['scenario']
if cmd == 'docker':
    if a[0] == 'inspect':
        name = a[-1]
        if name not in s['containers']: result = 1
        elif '--format' in a: output = str(s['containers'][name]['running']).lower()
    elif a[:2] == ['image', 'inspect']:
        output = ('c' if scenario == 'wrong-image' else 'a') * 40
    elif a[0] == 'exec':
        if '-p' in a: output = 'legacy'
        else:
            sys.stdin.read()
            name = a[2]
            revision, scheduler, origin = a[-3:]
            if name == 'nearbook-api-candidate':
                if scheduler != 'false' or scenario == 'candidate-fails': result = 1
            elif s['containers'][name]['image'] == 'new':
                if scenario == 'new-not-ready': result = 1
                if scenario == 'public-fails' and origin.startswith('https:'): result = 1
            elif s.get('was_stopped') and scenario == 'rollback-fails': result = 1
    elif a[0] == 'run':
        name = a[a.index('--name') + 1]
        if name == 'nearbook-api' and scenario in ('new-run-fails', 'rollback-fails'): result = 1
        else:
            s['containers'][name] = {'running': True, 'image': 'new'}
            if name == 'nearbook-api-candidate' and '-p' in a: result = 1
    elif a[0] == 'stop':
        s['containers'][a[-1]]['running'] = False
        s['was_stopped'] = True
        if scenario == 'stop-fails': result = 1
    elif a[0] == 'rename':
        old, new = a[1:]
        if scenario == 'rename-fails' and old == 'nearbook-api': result = 1
        else: s['containers'][new] = s['containers'].pop(old)
    elif a[0] == 'start': s['containers'][a[1]]['running'] = True
    elif a[0] == 'rm': s['containers'].pop(a[-1], None)
    elif a[0] != 'pull': raise RuntimeError(a)
elif cmd == 'curl' and scenario == 'socket-fails': result = 1
elif cmd == 'flock' and scenario == 'locked': result = 1
state_file.write_text(json.dumps(s))
if output: print(output)
sys.exit(result)
'''


class DeploymentTests(unittest.TestCase):
    def run_case(self, scenario, expected_success=False):
        with tempfile.TemporaryDirectory(prefix='nearbook-deploy-test-') as folder:
            folder = Path(folder)
            state_file = folder / 'state.json'
            initial = {'nearbook-api': {'running': True, 'image': 'old'}}
            if scenario == 'existing-candidate':
                initial['nearbook-api-candidate'] = {'running': True, 'image': 'other'}
            state_file.write_text(json.dumps({'scenario': scenario, 'containers': initial, 'events': []}))
            for command in ['docker', 'curl', 'flock', 'sleep']:
                executable = folder / command
                executable.write_text('#!' + sys.executable + '\n' + FAKE)
                executable.chmod(0o700)
            env_file = folder / '.env'
            env_file.write_text('')
            env = {**os.environ, 'PATH': str(folder) + os.pathsep + os.environ['PATH'],
                   'TEST_DEPLOY_STATE': str(state_file), 'DEPLOY_READY_ATTEMPTS': '1'}
            result = subprocess.run(['bash', str(ROOT / 'scripts/deploy-api.sh'), IMAGE, SHA, str(env_file)],
                                    env=env, text=True, capture_output=True, timeout=20)
            state = json.loads(state_file.read_text())
            self.assertEqual(result.returncode == 0, expected_success, result.stdout + result.stderr)
            self.assertFalse(any('prune' in row for row in state['events']))
            return state, result

    def test_success_retains_exact_predecessor(self):
        state, _ = self.run_case('success', True)
        self.assertEqual(state['containers']['nearbook-api'], {'running': True, 'image': 'new'})
        predecessors = [v for k, v in state['containers'].items() if k.startswith('nearbook-api-previous-')]
        self.assertEqual(predecessors, [{'running': False, 'image': 'old'}])
        self.assertNotIn('nearbook-api-candidate', state['containers'])

    def test_preflight_failures_never_stop_active(self):
        for scenario in ['candidate-fails', 'wrong-image', 'existing-candidate', 'locked']:
            with self.subTest(scenario=scenario):
                state, _ = self.run_case(scenario)
                self.assertEqual(state['containers']['nearbook-api'], {'running': True, 'image': 'old'})
                self.assertFalse(any(row[:2] == ['docker', 'stop'] for row in state['events']))

    def test_failed_replacement_restores_predecessor_and_fails_release(self):
        for scenario in ['new-run-fails', 'new-not-ready', 'public-fails', 'socket-fails', 'rename-fails', 'stop-fails']:
            with self.subTest(scenario=scenario):
                state, _ = self.run_case(scenario)
                self.assertEqual(state['containers']['nearbook-api'], {'running': True, 'image': 'old'})
                self.assertNotIn('nearbook-api-candidate', state['containers'])

    def test_rollback_failure_is_explicit(self):
        _, result = self.run_case('rollback-fails')
        self.assertEqual(result.returncode, 2)
        self.assertIn('ROLLBACK FAILED', result.stderr)


if __name__ == '__main__':
    unittest.main(verbosity=2)
