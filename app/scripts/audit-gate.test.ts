import assert from 'node:assert/strict';
import * as fs from 'node:fs';

import {
  EXCEPTIONS_FILE,
  evaluateAudit,
  parseExceptions,
  type AuditException,
  type NpmAuditReport,
  type NpmAuditVulnerability,
} from './audit-gate';

function runTest(name: string, fn: () => void) {
  fn();
  console.log(`PASS ${name}`);
}

function advisory(name: string, id: string, severity: string) {
  return { name, title: `${name} advisory`, url: `https://github.com/advisories/${id}`, severity };
}

const BRACES: NpmAuditVulnerability = {
  via: [advisory('braces', 'GHSA-vfj7-8cjw-p6xm', 'high')],
  fixAvailable: { name: 'tailwindcss', version: '4.3.3', isSemVerMajor: true },
};

// Flagged only through braces, as npm reports a dependent package.
const MICROMATCH: NpmAuditVulnerability = {
  via: ['braces'],
  fixAvailable: { name: 'tailwindcss', version: '4.3.3', isSemVerMajor: true },
};

const POSTCSS_SELECTOR_PARSER: NpmAuditVulnerability = {
  via: [advisory('postcss-selector-parser', 'GHSA-rj75-hqrm-r3gf', 'moderate')],
  fixAvailable: { name: 'tailwindcss', version: '4.3.3', isSemVerMajor: true },
};

function report(vulnerabilities: Record<string, NpmAuditVulnerability>): NpmAuditReport {
  return { auditReportVersion: 2, vulnerabilities };
}

const bracesException: AuditException = {
  id: 'GHSA-vfj7-8cjw-p6xm',
  package: 'braces',
  scopes: ['build'],
  expires: '2026-12-31',
  reason: 'No patched release exists.',
};

const buildReport = report({
  braces: BRACES,
  micromatch: MICROMATCH,
  'postcss-selector-parser': POSTCSS_SELECTOR_PARSER,
});

runTest('a reviewed advisory passes before its expiry and below-high advisories are ignored', () => {
  const result = evaluateAudit(buildReport, [bracesException], 'build', '2026-10-23');
  assert.deepEqual(result.problems, []);
  assert.equal(result.accepted.length, 1);
  assert.match(result.accepted[0], /^Accepted until 2026-12-31: high braces GHSA-vfj7-8cjw-p6xm/);
});

runTest('an exception still holds on its expiry date', () => {
  const result = evaluateAudit(buildReport, [bracesException], 'build', '2026-12-31');
  assert.deepEqual(result.problems, []);
});

runTest('an expired exception fails the gate', () => {
  const result = evaluateAudit(buildReport, [bracesException], 'build', '2027-01-01');
  assert.equal(result.problems.length, 1);
  assert.match(result.problems[0], /expired on 2026-12-31/);
});

runTest('an unreviewed high or critical advisory fails the gate', () => {
  const result = evaluateAudit(
    report({ braces: BRACES, next: { via: [advisory('next', 'GHSA-673q-mjm6-r5xr', 'critical')], fixAvailable: true } }),
    [bracesException],
    'build',
    '2026-10-23',
  );
  assert.equal(result.problems.length, 1);
  assert.match(result.problems[0], /^Unreviewed critical next GHSA-673q-mjm6-r5xr/);
});

runTest('an exception does not apply outside its scopes', () => {
  const result = evaluateAudit(buildReport, [bracesException], 'production', '2026-10-23');
  assert.deepEqual(result.problems, [
    'Unreviewed high braces GHSA-vfj7-8cjw-p6xm (braces advisory)',
  ]);
});

runTest('an exception that matches no advisory fails the gate', () => {
  const result = evaluateAudit(report({}), [bracesException], 'build', '2026-10-23');
  assert.deepEqual(result.problems, [
    'Exception for GHSA-vfj7-8cjw-p6xm (braces) matches no build advisory; delete it',
  ]);
});

runTest('an exception must name the package the advisory affects', () => {
  const result = evaluateAudit(
    buildReport,
    [{ ...bracesException, package: 'micromatch' }],
    'build',
    '2026-10-23',
  );
  assert.equal(result.problems.length, 2);
  assert.match(result.problems[0], /^Unreviewed high braces/);
  assert.match(result.problems[1], /\(micromatch\) matches no build advisory/);
});

runTest('an excepted advisory fails once npm audit fix can resolve it', () => {
  const result = evaluateAudit(
    report({ braces: { ...BRACES, fixAvailable: true } }),
    [bracesException],
    'build',
    '2026-10-23',
  );
  assert.equal(result.problems.length, 1);
  assert.match(result.problems[0], /now fixable within its declared ranges/);
});

runTest('an unexpected npm audit format is rejected', () => {
  assert.throws(
    () => evaluateAudit({ ...buildReport, auditReportVersion: 1 }, [], 'build', '2026-10-23'),
    /Unsupported npm audit report version 1/,
  );
  assert.throws(
    () => evaluateAudit(
      report({ legacy: { via: [{ ...advisory('legacy', 'GHSA-xxxx-xxxx-xxxx', 'high'), url: 'https://www.npmjs.com/advisories/1' }], fixAvailable: false } }),
      [],
      'build',
      '2026-10-23',
    ),
    /has no GHSA id/,
  );
});

runTest('parseExceptions accepts a complete exception', () => {
  assert.deepEqual(parseExceptions({ exceptions: [bracesException] }), [bracesException]);
});

runTest('parseExceptions rejects incomplete or ambiguous exceptions', () => {
  const invalid: Array<[unknown, RegExp]> = [
    [{}, /exceptions array/],
    [{ exceptions: [{ ...bracesException, id: 'CVE-2026-93687' }] }, /GHSA id/],
    [{ exceptions: [{ ...bracesException, package: '' }] }, /name a package/],
    [{ exceptions: [{ ...bracesException, scopes: [] }] }, /scopes/],
    [{ exceptions: [{ ...bracesException, scopes: ['runtime'] }] }, /scopes/],
    [{ exceptions: [{ ...bracesException, scopes: ['build', 'build'] }] }, /scopes/],
    [{ exceptions: [{ ...bracesException, expires: '2026-02-30' }] }, /calendar date/],
    [{ exceptions: [{ ...bracesException, expires: '31/12/2026' }] }, /calendar date/],
    [{ exceptions: [{ ...bracesException, reason: ' ' }] }, /needs a reason/],
    [{ exceptions: [{ ...bracesException, ticket: 'none' }] }, /exactly the keys/],
    [{ exceptions: [bracesException, bracesException] }, /duplicates GHSA-vfj7-8cjw-p6xm braces/],
  ];
  for (const [value, message] of invalid) assert.throws(() => parseExceptions(value), message);
});

runTest('the committed exceptions file is well formed', () => {
  assert.doesNotThrow(() => parseExceptions(JSON.parse(fs.readFileSync(EXCEPTIONS_FILE, 'utf8'))));
});
