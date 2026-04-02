import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@catan/shared', '@catan/game-engine'],
};

export default nextConfig;
