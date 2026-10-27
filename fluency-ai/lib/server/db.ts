import "server-only";
import { createClient, type Client } from "@libsql/client";

// Em desenvolvimento usa um arquivo local; em produção, um banco Turso (libSQL)
// via DATABASE_URL + DATABASE_AUTH_TOKEN.
const client: Client = createClient({
  url: process.env.DATABASE_URL || "file:local.db",
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    pro_until INTEGER NOT NULL DEFAULT 0,
    asaas_customer_id TEXT,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS login_codes (
    email TEXT PRIMARY KEY,
    code_hash TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS user_languages (
    user_id TEXT NOT NULL,
    language TEXT NOT NULL,
    level TEXT NOT NULL,
    summary TEXT,
    PRIMARY KEY (user_id, language)
  )`,
  `CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    language TEXT NOT NULL,
    level TEXT NOT NULL,
    scenario TEXT NOT NULL,
    focus TEXT NOT NULL DEFAULT '',
    user_messages INTEGER NOT NULL DEFAULT 0,
    opened INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS conversations_user ON conversations (user_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS daily_usage (
    user_id TEXT NOT NULL,
    day TEXT NOT NULL,
    messages INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, day)
  )`,
  `CREATE TABLE IF NOT EXISTS mistakes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    language TEXT NOT NULL,
    original TEXT NOT NULL,
    fix TEXT NOT NULL,
    explanation TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS mistakes_user ON mistakes (user_id, language, created_at)`,
  `CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    language TEXT NOT NULL,
    word TEXT NOT NULL,
    translation TEXT NOT NULL,
    example TEXT NOT NULL,
    due_at INTEGER NOT NULL,
    interval_days REAL NOT NULL DEFAULT 0,
    ease REAL NOT NULL DEFAULT 2.5,
    reps INTEGER NOT NULL DEFAULT 0,
    UNIQUE (user_id, language, word)
  )`,
  `CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    plan TEXT NOT NULL,
    value REAL NOT NULL,
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    paid_at INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS reminders_sent (
    user_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    ref TEXT NOT NULL,
    sent_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, kind, ref)
  )`,
  `CREATE TABLE IF NOT EXISTS placement_results (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    language TEXT NOT NULL,
    level TEXT NOT NULL,
    summary TEXT NOT NULL,
    strengths TEXT NOT NULL,
    focus TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS webhook_events (
    id TEXT PRIMARY KEY,
    received_at INTEGER NOT NULL
  )`,
];

// Colunas adicionadas depois da primeira versão: CREATE TABLE IF NOT EXISTS não altera
// tabelas que já existem, então elas entram com ALTER TABLE se ainda faltarem.
const COLUMNS: [table: string, column: string, definition: string][] = [
  ["users", "email_opt_out", "INTEGER NOT NULL DEFAULT 0"],
];

async function migrate() {
  await client.batch(SCHEMA, "write");
  for (const [table, column, definition] of COLUMNS) {
    const info = await client.execute(`PRAGMA table_info(${table})`);
    if (!info.rows.some((r) => r.name === column)) {
      await client.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  }
}

let ready: Promise<void> | null = null;

export function db(): Promise<Client> {
  ready ??= migrate().then(
    () => undefined,
    (error) => {
      ready = null; // tenta de novo na próxima requisição
      throw error;
    },
  );
  return ready.then(() => client);
}
