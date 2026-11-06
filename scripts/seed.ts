import { db } from "../src/db";
import { keywords } from "../src/db/schema";
import { SEED_KEYWORDS } from "./keywords";

let count = 0;
for (const [slot, seeds] of Object.entries(SEED_KEYWORDS)) {
  for (const [word, description, severity] of seeds) {
    await db
      .insert(keywords)
      .values({ word, description, slot, severity })
      .onConflictDoUpdate({ target: keywords.word, set: { description, slot, severity } });
    count++;
  }
}

console.log(`키워드 ${count}개 저장 완료`);
process.exit(0);
