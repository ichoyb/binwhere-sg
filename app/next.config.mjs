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
  experimental: {
    // Production releases are read-only, so ISR results stay in memory. Otherwise an
    // on-demand render (scanners probing /blog/<junk>) fails its disk write with EACCES.
    // `dynamicParams = false` on the blog route is not the fix: Next 16.3.3 then logs a
    // NoFallbackError stack trace for every unknown slug.
    isrFlushToDisk: false,
  },
};

export default nextConfig;
