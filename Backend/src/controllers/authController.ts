import type { Request, Response } from "express";
import { prisma } from "../prisma";
import {
  hashPassword,
  sessionCookieOptions,
  signSessionToken,
  verifyPassword,
  SESSION_COOKIE_NAME,
} from "../services/authService";

function publicUser(user: {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
}) {
  return { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status };
}

export async function register(req: Request, res: Response) {
  const { email, password, name } = req.body as { email?: string; password?: string; name?: string };

  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "password must be at least 8 characters" });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({ data: { email, passwordHash, name } });

  const token = signSessionToken({ sub: user.id, email: user.email, role: user.role });
  res.cookie(SESSION_COOKIE_NAME, token, sessionCookieOptions());
  res.status(201).json({ user: publicUser(user) });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  if (user.status !== "ACTIVE") {
    res.status(403).json({ error: `Account is ${user.status.toLowerCase()}` });
    return;
  }

  const token = signSessionToken({ sub: user.id, email: user.email, role: user.role });
  res.cookie(SESSION_COOKIE_NAME, token, sessionCookieOptions());
  res.json({ user: publicUser(user) });
}

export function logout(_req: Request, res: Response) {
  res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
  res.status(204).send();
}

export async function me(req: Request, res: Response) {
  if (!req.auth) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const user = await prisma.user.findUnique({ where: { id: req.auth.id } });
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json({ user: publicUser(user) });
}
