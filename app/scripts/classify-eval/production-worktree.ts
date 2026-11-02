import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { PRODUCTION_REVISION } from './baseline-profiles';
import { PRODUCTION_LOCKFILES, PRODUCTION_TOKENHUB_BLOB, PRODUCTION_TOKENHUB_PATH } from './production-contract';
import type { WorktreePreflight } from './production-types';

/** Run before spawning tsx; porcelain and blob hashes are independent of diff formatting. */
export function verifyProductionWorktree(worktree: string): WorktreePreflight {
  assert.ok(isAbsolute(worktree), '--worktree must be an absolute path');
  const root = realpathSync(worktree);
  const git = (...args: string[]) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trimEnd();
  assert.equal(realpathSync(git('rev-parse', '--show-toplevel')), root, '--worktree must name the repository root');
  const revision = git('rev-parse', 'HEAD');
  assert.equal(revision, PRODUCTION_REVISION, 'Worktree HEAD differs from deployed production');
  const status = git('status', '--porcelain', '--untracked-files=no');
  const trackedChanges = status.split('\n').filter(Boolean).map((line) => line.slice(3)).sort();
  assert.deepEqual(trackedChanges, [PRODUCTION_TOKENHUB_PATH], 'Worktree must contain only the endpoint patch');
  const tokenhubBlob = git('hash-object', '--no-filters', PRODUCTION_TOKENHUB_PATH);
  assert.equal(tokenhubBlob, PRODUCTION_TOKENHUB_BLOB, 'Patched TokenHub blob differs');
  const lockfiles = Object.fromEntries(Object.keys(PRODUCTION_LOCKFILES).map((file) => [file,
    createHash('sha256').update(readFileSync(join(root, file))).digest('hex'),
  ]));
  assert.deepEqual(lockfiles, PRODUCTION_LOCKFILES, 'Worktree lockfile SHA-256 differs');
  return { revision, trackedChanges, tokenhubBlob, lockfiles,
    checks: { head: true, trackedChanges: true, tokenhubBlob: true, lockfiles: true } };
}
