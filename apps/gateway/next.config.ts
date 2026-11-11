import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 저장소 루트에도 lockfile이 있으므로 이 앱 폴더를 기준으로 삼는다.
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;
