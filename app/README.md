# BinWhere Web

This directory contains the Next.js Web client and the production API for
`binwhere.sg`. Shared contracts and domain policy live in `../packages/core`;
the native client consumes the versioned `/api/v1/*` endpoints from this app.

## Local setup

Use the Node.js 24 version pinned by the repository. Install the linked core
package before the Web package, then prepare the selected geo snapshot offline:

```bash
cd ../packages/core
npm ci
cd ../../app
npm ci
npm run prebuild
npm run dev
```

`npm run prebuild` does not refresh upstream data. An explicit data update uses
`npm run data:refresh` and must be reviewed and committed separately; see
[`docs/geo-data-release.md`](../docs/geo-data-release.md).

## Verification

```bash
npm run lint
npm exec tsc -- --noEmit
npm run test:unit
npm run build
npm run package:web
```

The paid classification gates are explicit release checks:

```bash
npm run test:classify
npm run test:classify:bcrs
npm run test:release-evidence
```

The production package is the sanitised `.next/deploy` tree created by
`package:web`. It includes the local Deposit Mark OCR runtime and selected geo
snapshot while rejecting env files, keys, Git metadata and mobile source.

## Deployment

Web production is not deployed through Vercel or from a developer machine. A
Web-relevant push to `master` runs
[`deploy-web-production.yml`](../.github/workflows/deploy-web-production.yml),
which builds a verified immutable artifact and deploys it to the Singapore EC2
host through private S3 and SSM. See
[`docs/web-production-runbook.md`](../docs/web-production-runbook.md).
