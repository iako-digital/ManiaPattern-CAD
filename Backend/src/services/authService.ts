import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { UserRole } from "@prisma/client";

const SESSION_COOKIE_NAME = "session";
const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set in production");
  }
  console.warn("[authService] JWT_SECRET is not set — using an insecure dev-only fallback secret");
  return "dev-only-insecure-secret-do-not-use-in-production";
}

export interface SessionTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export function signSessionToken(payload: SessionTokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: TOKEN_TTL_SECONDS });
}

export function verifySessionToken(token: string): SessionTokenPayload {
  return jwt.verify(token, getJwtSecret()) as SessionTokenPayload;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: TOKEN_TTL_SECONDS * 1000,
    path: "/",
  };
}

export { SESSION_COOKIE_NAME };
