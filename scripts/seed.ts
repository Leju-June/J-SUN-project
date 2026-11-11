import { db } from "../src/db";
import { keywords } from "../src/db/schema";
import { SEED_KEYWORDS } from "./keywords";

let count = 0;
for (const [slot, seeds] of Object.entries(SEED_KEYWORDS)) {
  for (const [word, description, severity, options = {}] of seeds) {
    const fields = { description, slot, severity, baseWeight: options.w ?? 1, domains: options.d ?? [], motif: options.m ?? null };
    await db
      .insert(keywords)
      .values({ word, ...fields })
      .onConflictDoUpdate({ target: keywords.word, set: fields });
    count++;
  }
}

console.log(`키워드 ${count}개 저장 완료`);
process.exit(0);
