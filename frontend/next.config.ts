import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  output: 'standalone',
  ...(process.env.NODE_ENV !== 'production'
    ? { turbopack: { root: path.join(__dirname, '..') } }
    : {}),
};

export default nextConfig;
