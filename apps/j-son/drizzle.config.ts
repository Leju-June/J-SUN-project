import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  // 같은 DB를 쓰는 다른 서비스의 마이그레이션 기록과 섞이지 않게 표를 따로 둔다.
  migrations: { table: "__json_migrations", schema: "drizzle" },
});
