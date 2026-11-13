import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// 같은 DB를 쓰는 다른 서비스의 마이그레이션 기록과 섞이지 않게 표를 따로 둔다.
await migrate(drizzle(pool), { migrationsFolder: "./drizzle", migrationsTable: "__json_migrations", migrationsSchema: "drizzle" });
await pool.end();
console.log("J-SON 마이그레이션 완료");
