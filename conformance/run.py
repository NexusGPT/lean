"""Run every language under langs/ against every fixture under fixtures/.

A language passes when: every shared fixture translates to the same core form,
every file under fixtures/escapes is refused by its lint, and no fixture under
fixtures/cleans is refused. Scaffold: the drivers are not written yet; the run
lists what it would check and exits 2.
"""
import os, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
langs = sorted(d for d in os.listdir(f'{root}/langs') if not d.startswith('_'))
shared = sorted(os.listdir(f'{root}/fixtures/shared'))
print('languages:', ', '.join(langs) or 'none')
print('shared fixtures:', ', '.join(shared) or 'none')
print('scaffold: no driver yet, nothing checked')
sys.exit(2)
