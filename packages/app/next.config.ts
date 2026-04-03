import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  transpilePackages: ['@catan/shared', '@catan/game-engine'],
  allowedDevOrigins: ['192.168.39.140'],
};

export default withNextIntl(nextConfig);
