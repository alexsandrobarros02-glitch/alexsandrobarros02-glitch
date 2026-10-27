import "server-only";
import { createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";

const SESSION_COOKIE = "fluency_session";
const SESSION_DAYS = 60;
const CODE_MINUTES = 10;
const CODE_MAX_ATTEMPTS = 5;
const CODE_RESEND_SECONDS = 60;

export interface User {
  id: string;
  email: string;
  name: string | null;
  proUntil: number;
  asaasCustomerId: string | null;
}

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET não configurado");
  return "dev-secret-nao-use-em-producao";
}

function hash(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type RequestCodeResult = { ok: true } | { ok: false; error: string };

export async function requestLoginCode(email: string): Promise<RequestCodeResult> {
  const client = await db();
  const now = Date.now();
  const existing = await client.execute({
    sql: "SELECT created_at FROM login_codes WHERE email = ?",
    args: [email],
  });
  const last = existing.rows[0]?.created_at as number | undefined;
  if (last && now - last < CODE_RESEND_SECONDS * 1000) {
    return { ok: false, error: "Aguarde um minuto antes de pedir outro código." };
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await client.execute({
    sql: `INSERT INTO login_codes (email, code_hash, expires_at, attempts, created_at)
          VALUES (?, ?, ?, 0, ?)
          ON CONFLICT (email) DO UPDATE SET code_hash = excluded.code_hash,
            expires_at = excluded.expires_at, attempts = 0, created_at = excluded.created_at`,
    args: [email, hash(`${email}:${code}`), now + CODE_MINUTES * 60_000, now],
  });
  await sendCodeEmail(email, code);
  return { ok: true };
}

async function sendCodeEmail(email: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === "production") throw new Error("RESEND_API_KEY não configurado");
    console.log(`[dev] Código de acesso para ${email}: ${code}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "Fluency <onboarding@resend.dev>",
      to: [email],
      subject: `Seu código de acesso: ${code}`,
      html: `<p>Seu código para entrar no Fluency é:</p><p style="font-size:28px;font-weight:bold;letter-spacing:4px">${code}</p><p>Ele vale por ${CODE_MINUTES} minutos.</p>`,
    }),
  });
  if (!res.ok) throw new Error(`Falha ao enviar e-mail: ${res.status} ${await res.text()}`);
}

export async function verifyLoginCode(email: string, code: string): Promise<User | null> {
  const client = await db();
  const row = (
    await client.execute({ sql: "SELECT code_hash, expires_at, attempts FROM login_codes WHERE email = ?", args: [email] })
  ).rows[0];
  if (!row || (row.expires_at as number) < Date.now() || (row.attempts as number) >= CODE_MAX_ATTEMPTS) return null;

  const expected = Buffer.from(row.code_hash as string, "hex");
  const given = Buffer.from(hash(`${email}:${code.trim()}`), "hex");
  if (!timingSafeEqual(expected, given)) {
    await client.execute({ sql: "UPDATE login_codes SET attempts = attempts + 1 WHERE email = ?", args: [email] });
    return null;
  }
  await client.execute({ sql: "DELETE FROM login_codes WHERE email = ?", args: [email] });

  await client.execute({
    sql: "INSERT INTO users (id, email, created_at) VALUES (?, ?, ?) ON CONFLICT (email) DO NOTHING",
    args: [randomUUID(), email, Date.now()],
  });
  const user = await findUser("email", email);
  if (!user) return null;

  const token = randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + SESSION_DAYS * 86_400_000;
  await client.execute({
    sql: "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
    args: [hash(token), user.id, expiresAt],
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
  return user;
}

async function findUser(column: "id" | "email", value: string): Promise<User | null> {
  const client = await db();
  const row = (
    await client.execute({
      sql: `SELECT id, email, name, pro_until, asaas_customer_id FROM users WHERE ${column} = ?`,
      args: [value],
    })
  ).rows[0];
  if (!row) return null;
  return {
    id: row.id as string,
    email: row.email as string,
    name: (row.name as string | null) ?? null,
    proUntil: row.pro_until as number,
    asaasCustomerId: (row.asaas_customer_id as string | null) ?? null,
  };
}

export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const client = await db();
  const row = (
    await client.execute({ sql: "SELECT user_id, expires_at FROM sessions WHERE token_hash = ?", args: [hash(token)] })
  ).rows[0];
  if (!row || (row.expires_at as number) < Date.now()) return null;
  return findUser("id", row.user_id as string);
}

export async function logout() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    const client = await db();
    await client.execute({ sql: "DELETE FROM sessions WHERE token_hash = ?", args: [hash(token)] });
  }
  store.delete(SESSION_COOKIE);
}

export function isPro(user: User): boolean {
  return user.proUntil > Date.now();
}
