/** @type {import('next').NextConfig} */
const nextConfig = {
  // App Router 在 Next 13+ 只要有 app/ 目錄就自動啟用，不需要再寫 experimental.appDir
  reactStrictMode: true,
};

module.exports = nextConfig;
