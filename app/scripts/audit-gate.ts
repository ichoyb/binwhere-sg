import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Dependency audit gate for Web CI and production releases.
 *
 * Blocks on every high or critical advisory, as `npm audit --audit-level=high`
 * did, except advisories reviewed in audit-exceptions.json. An exception names
 * one advisory and package, the audits it covers, a reason and an expiry date.
 * It fails the gate once it expires, once it matches nothing, or once npm can
 * fix the package within its declared ranges, so it cannot outlive its reason.
 */

export const AUDIT_SCOPES = ['production', 'build'] as const;
export type AuditScope = (typeof AUDIT_SCOPES)[number];

export interface AuditException {
  id: string;
  package: string;
  scopes: AuditScope[];
  expires: string;
  reason: string;
}

export interface NpmAuditAdvisory {
  name: string;
  title: string;
  url: string;
  severity: string;
}

export interface NpmAuditVulnerability {
  via: Array<string | NpmAuditAdvisory>;
  fixAvailable: boolean | { name: string; version: string; isSemVerMajor: boolean };
}

export interface NpmAuditReport {
  auditReportVersion: number;
  vulnerabilities: Record<string, NpmAuditVulnerability>;
}

export interface AuditGateResult {
  accepted: string[];
  problems: string[];
}

export const EXCEPTIONS_FILE = path.join(__dirname, 'audit-exceptions.json');

const BLOCKING_SEVERITIES = new Set(['high', 'critical']);
const EXCEPTION_KEYS = ['expires', 'id', 'package', 'reason', 'scopes'];
const GHSA_ID = /^GHSA-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isAuditScope(value: unknown): value is AuditScope {
  return AUDIT_SCOPES.includes(value as AuditScope);
}

function isCalendarDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function parseExceptions(value: unknown): AuditException[] {
  const entries = (value as { exceptions?: unknown } | null)?.exceptions;
  if (!Array.isArray(entries)) {
    throw new Error('Audit exceptions must be an object with an exceptions array');
  }

  const seen = new Set<string>();
  return entries.map((entry: unknown, index) => {
    const label = `Audit exception #${index + 1}`;
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      throw new Error(`${label} must be an object`);
    }
    if (Object.keys(entry).sort().join() !== EXCEPTION_KEYS.join()) {
      throw new Error(`${label} must have exactly the keys ${EXCEPTION_KEYS.join(', ')}`);
    }

    const { id, package: name, scopes, expires, reason } = entry as Record<string, unknown>;
    if (typeof id !== 'string' || !GHSA_ID.test(id)) {
      throw new Error(`${label} id must be a GHSA id`);
    }
    if (typeof name !== 'string' || name === '') {
      throw new Error(`${label} must name a package`);
    }
    if (
      !Array.isArray(scopes) ||
      scopes.length === 0 ||
      !scopes.every(isAuditScope) ||
      new Set(scopes).size !== scopes.length
    ) {
      throw new Error(`${label} scopes must be distinct values from ${AUDIT_SCOPES.join(', ')}`);
    }
    if (typeof expires !== 'string' || !isCalendarDate(expires)) {
      throw new Error(`${label} expires must be a calendar date (YYYY-MM-DD)`);
    }
    if (typeof reason !== 'string' || reason.trim() === '') {
      throw new Error(`${label} needs a reason`);
    }

    const key = `${id} ${name}`;
    if (seen.has(key)) throw new Error(`${label} duplicates ${key}`);
    seen.add(key);
    return { id, package: name, scopes, expires, reason };
  });
}

/** `today` is a UTC calendar date; an exception still holds on its expiry date. */
export function evaluateAudit(
  report: NpmAuditReport,
  exceptions: readonly AuditException[],
  scope: AuditScope,
  today: string,
): AuditGateResult {
  if (report.auditReportVersion !== 2) {
    throw new Error(`Unsupported npm audit report version ${report.auditReportVersion}`);
  }

  // A package flagged only through a dependency lists that dependency's name in
  // `via`; the advisory itself is reported once, on the package it affects.
  const advisories = new Map<string, NpmAuditAdvisory & { id: string }>();
  for (const vulnerability of Object.values(report.vulnerabilities)) {
    for (const via of vulnerability.via) {
      if (typeof via === 'string') continue;
      const id = /\/(GHSA-[0-9a-z-]+)$/.exec(via.url)?.[1];
      if (!id) throw new Error(`Advisory for ${via.name} has no GHSA id: ${via.url}`);
      advisories.set(`${id} ${via.name}`, { ...via, id });
    }
  }

  const applicable = exceptions.filter((exception) => exception.scopes.includes(scope));
  const used = new Set<AuditException>();
  const accepted: string[] = [];
  const problems: string[] = [];

  for (const advisory of advisories.values()) {
    if (!BLOCKING_SEVERITIES.has(advisory.severity)) continue;

    const label = `${advisory.severity} ${advisory.name} ${advisory.id} (${advisory.title})`;
    const exception = applicable.find(
      (candidate) => candidate.id === advisory.id && candidate.package === advisory.name,
    );
    if (!exception) {
      problems.push(`Unreviewed ${label}`);
      continue;
    }

    used.add(exception);
    if (today > exception.expires) {
      problems.push(`Exception for ${label} expired on ${exception.expires}`);
    } else if (report.vulnerabilities[advisory.name]?.fixAvailable === true) {
      problems.push(
        `${label} is now fixable within its declared ranges; run npm audit fix and delete its exception`,
      );
    } else {
      accepted.push(`Accepted until ${exception.expires}: ${label}. ${exception.reason}`);
    }
  }

  for (const exception of applicable) {
    if (!used.has(exception)) {
      problems.push(
        `Exception for ${exception.id} (${exception.package}) matches no ${scope} advisory; delete it`,
      );
    }
  }

  return { accepted, problems };
}

function runNpmAudit(scope: AuditScope): NpmAuditReport {
  const args = ['audit', '--json', ...(scope === 'production' ? ['--omit=dev'] : [])];
  const result = spawnSync('npm', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.error) throw result.error;

  // npm audit exits non-zero whenever it reports anything, so the JSON decides.
  let report: NpmAuditReport & { error?: { summary?: string } };
  try {
    report = JSON.parse(result.stdout);
  } catch {
    throw new Error(`npm audit did not return JSON (exit ${result.status}): ${result.stderr}`);
  }
  if (report.error) {
    throw new Error(`npm audit failed: ${report.error.summary ?? JSON.stringify(report.error)}`);
  }
  return report;
}

if (require.main === module) {
  const scope = process.argv[2];
  if (!isAuditScope(scope)) {
    throw new Error('Expected audit-gate.ts production | build');
  }

  const exceptions = parseExceptions(JSON.parse(fs.readFileSync(EXCEPTIONS_FILE, 'utf8')));
  const today = new Date().toISOString().slice(0, 10);
  const { accepted, problems } = evaluateAudit(runNpmAudit(scope), exceptions, scope, today);

  for (const line of accepted) console.log(`[audit:${scope}] ${line}`);
  for (const line of problems) console.error(`[audit:${scope}] ${line}`);
  if (problems.length > 0) {
    process.exitCode = 1;
  } else {
    console.log(`[audit:${scope}] No unreviewed high or critical advisories`);
  }
}
