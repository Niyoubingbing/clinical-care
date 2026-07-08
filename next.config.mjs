/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 静态导出：所有路由预渲染为 HTML，配合 Service Worker 全量预缓存实现真正离线可用。
  output: "export",
  // 静态导出不支持 next/image 的运行时优化，关闭以输出原始 <img>。
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
