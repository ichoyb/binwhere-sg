import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // CI ships this self-contained server bundle instead of cloning the monorepo
  // onto production hosts.
  output: 'standalone',
  outputFileTracingRoot: repoRoot,
  // Compile TypeScript source from local workspace package
  transpilePackages: ['@binwhere/core'],
  // The linked core package lives outside app/, so Turbopack must resolve from
  // the common monorepo root.
  turbopack: {
    root: repoRoot,
  },
  poweredByHeader: false,
};

export default nextConfig;
