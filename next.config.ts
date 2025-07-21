/** @type {import('next').NextConfig} */
const nextConfig = {
  // 画像最適化の設定
  images: {
    domains: [],
  },
  
  // 実験的機能（必要に応じて有効化）
  experimental: {
    // serverActions: true,
  },
}

module.exports = nextConfig