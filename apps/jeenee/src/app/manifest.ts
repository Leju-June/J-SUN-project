import type { MetadataRoute } from "next";
import { withBase } from "@/lib/base-path";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Jeenee",
    short_name: "Jeenee",
    description: "소원을 말해봐. 적힌 그대로 모두 이루어줄게.",
    start_url: withBase("/"),
    display: "standalone",
    background_color: "#120b24",
    theme_color: "#120b24",
    lang: "ko",
    shortcuts: [
      { name: "이번 주의 소원", url: withBase("/hall") },
      { name: "내 기록", url: withBase("/history") },
    ],
    icons: [
      { src: withBase("/icons/icon-192.png"), sizes: "192x192", type: "image/png" },
      { src: withBase("/icons/icon-512.png"), sizes: "512x512", type: "image/png" },
      { src: withBase("/icons/icon-512.png"), sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
