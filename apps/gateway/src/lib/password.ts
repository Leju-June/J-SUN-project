import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback) as (password: string, salt: Buffer, keylen: number, options: { N: number; maxmem: number }) => Promise<Buffer>;

const KEY_LENGTH = 64;
const COST = 2 ** 15;
// Node 기본 메모리 상한(32MB)이 N=2^15에 딱 걸리므로 넉넉히 올린다.
const MAX_MEM = 128 * 1024 * 1024;

/** `scrypt$N$salt$hash` 형태로 저장한다. 나중에 비용을 올려도 예전 해시를 그대로 검증할 수 있다. */
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEY_LENGTH, { N: COST, maxmem: MAX_MEM });
  return ["scrypt", COST, salt.toString("base64url"), hash.toString("base64url")].join("$");
}

export async function verifyPassword(password: string, stored: string) {
  const [kind, cost, salt, expected] = stored.split("$");
  if (kind !== "scrypt" || !cost || !salt || !expected) return false;
  const hash = await scrypt(password, Buffer.from(salt, "base64url"), KEY_LENGTH, { N: Number(cost), maxmem: MAX_MEM });
  const expectedBytes = Buffer.from(expected, "base64url");
  return hash.length === expectedBytes.length && timingSafeEqual(hash, expectedBytes);
}
