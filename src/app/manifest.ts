import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Jeenee",
    short_name: "Jeenee",
    description: "소원을 말해봐. 적힌 그대로 모두 이루어줄게.",
    start_url: "/",
    display: "standalone",
    background_color: "#120b24",
    theme_color: "#120b24",
    lang: "ko",
    shortcuts: [
      { name: "이번 주의 소원", url: "/hall" },
      { name: "내 기록", url: "/history" },
    ],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
