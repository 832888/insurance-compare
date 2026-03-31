import crypto from "crypto";

const AUTH_SECRET = process.env.AUTH_SECRET || "ins-compare-secret-2024-hk";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(password, salt, 64).toString("hex");
  return hash === test;
}

export function createSessionToken(username: string): string {
  const ts = Date.now().toString();
  const sig = crypto.createHmac("sha256", AUTH_SECRET).update(`${username}.${ts}`).digest("hex");
  return `${username}.${ts}.${sig}`;
}

export const SESSION_COOKIE = "ins_session";
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days
