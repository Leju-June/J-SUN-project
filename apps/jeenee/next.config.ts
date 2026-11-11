import type { NextConfig } from "next";
import { BASE_PATH } from "./src/lib/base-path";

// J-SUN 게이트웨이 뒤에서 /jeenee 경로로 서비스된다.
const nextConfig: NextConfig = {
  basePath: BASE_PATH,
  // 저장소 루트에도 lockfile이 있으므로 이 앱 폴더를 기준으로 삼는다.
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;
