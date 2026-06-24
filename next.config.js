/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverActions: { bodySizeLimit: '110mb' },
};

module.exports = nextConfig;
