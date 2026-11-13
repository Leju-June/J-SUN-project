import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// 연결은 첫 질의 때 맺는다. 로그인하지 않은 플레이는 DB를 건드리지 않는다.
const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 3000 });
// 쉬고 있는 연결이 끊겨도 서버가 죽지 않게 한다.
pool.on("error", (error) => console.error("DB 연결 오류", error.message));

export const db = drizzle(pool, { schema });
