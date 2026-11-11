import { readFile } from "node:fs/promises";
import sharp from "sharp";

/** src/app/icon.svg 하나에서 PWA용 PNG들을 만든다. 모양을 바꾸면 `npm run icons`를 다시 돌린다. */
const svg = await readFile("src/app/icon.svg");

await Promise.all([
  sharp(svg).resize(192, 192).png().toFile("public/icons/icon-192.png"),
  sharp(svg).resize(512, 512).png().toFile("public/icons/icon-512.png"),
  sharp(svg).resize(180, 180).png().toFile("src/app/apple-icon.png"),
]);
console.log("아이콘 생성 완료");
