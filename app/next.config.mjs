/** @type {import('next').NextConfig} */
const nextConfig = {
  // Compile TypeScript source from local workspace package
  transpilePackages: ['@binwhere/core'],
};

export default nextConfig;
