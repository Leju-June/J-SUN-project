import type { MetadataRoute } from "next";

/** robots.txt는 사이트 뿌리에만 있을 수 있으므로 모든 서비스의 규칙을 여기 모은다. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/login", "/signup", "/api/", "/jeenee/admin", "/jeenee/history", "/jeenee/api/", "/j-son/api/"],
    },
  };
}
