// Teste de ponta a ponta: sobe o app com banco novo e IA falsa, e usa um navegador de verdade.
// Uso: npm run test:e2e   (PW_CHROMIUM=/caminho/do/chrome para usar um Chromium já instalado)
import { spawn } from "node:child_process";
import { createHmac } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createClient } from "@libsql/client";
import { chromium } from "playwright";
import { startMockClaude } from "./mock-claude.mjs";

const PORT = 3140;
const MOCK_PORT = 4010;
const BASE = `http://localhost:${PORT}`;
const CRON_SECRET = "segredo-de-teste";
const DAY = 86_400_000;
const today = (t = Date.now()) => new Date(t - 3 * 3_600_000).toISOString().slice(0, 10);

const dir = mkdtempSync(path.join(tmpdir(), "fluency-e2e-"));
const dbUrl = `file:${path.join(dir, "test.db")}`;
let log = "";
let failures = 0;

function check(ok, label) {
  console.log(`${ok ? "✔" : "✘"} ${label}`);
  if (!ok) failures++;
}

async function waitFor(fn, label, timeout = 15_000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const value = await fn();
    if (value) return value;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Tempo esgotado: ${label}`);
}

const mock = await startMockClaude(MOCK_PORT);
const app = spawn("npx", ["next", "dev", "-p", String(PORT)], {
  env: {
    ...process.env,
    ANTHROPIC_API_KEY: "teste",
    ANTHROPIC_BASE_URL: `http://localhost:${MOCK_PORT}`,
    DATABASE_URL: dbUrl,
    CRON_SECRET,
    APP_URL: BASE,
    ASAAS_API_KEY: "",
    RESEND_API_KEY: "",
  },
  stdio: ["ignore", "pipe", "pipe"],
  detached: true,
});
app.stdout.on("data", (d) => (log += d));
app.stderr.on("data", (d) => (log += d));

const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
try {
  await waitFor(() => fetch(BASE).then((r) => r.ok, () => false), "servidor no ar", 60_000);
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("pageerror", (e) => check(false, `erro na página: ${e.message}`));

  // Login
  await page.goto(`${BASE}/app`);
  await page.waitForURL(/\/entrar/);
  check(true, "sem login vai para /entrar");
  const email = `aluno${Date.now()}@teste.com`;
  await page.fill("input[type=email]", email);
  await page.click("text=Receber código");
  await page.waitForSelector(".code-input");
  await page.fill(".code-input", "000000");
  await page.click('button:has-text("Entrar")');
  await page.waitForSelector("text=Código incorreto");
  check(true, "código errado recusado");
  const code = await waitFor(() => log.match(new RegExp(`para ${email}: (\\d{6})`))?.[1], "código no log");
  await page.fill(".code-input", code);
  await page.click('button:has-text("Entrar")');
  await page.waitForSelector("text=Missão de hoje");
  check(true, "login e painel");

  // Teste de nível, encerramento e compartilhamento
  await page.click("text=Inglês");
  await page.click("text=Descubra seu nível");
  await page.waitForSelector("text=What is your name");
  for (let i = 0; i < 6; i++) {
    await page.fill("textarea", `I go to the beach ${i}`);
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => !document.querySelector(".typing"), null, { timeout: 15_000 });
  }
  await page.waitForSelector("text=Seu nível: B1");
  check(true, "teste de nível dá B1");
  check(await page.isVisible("text=Thank you, that's all"), "última resposta do teste encerra, sem nova pergunta");
  await page.click("text=Compartilhar resultado");
  await page.waitForURL(/\/resultado\//);
  await page.waitForSelector(".level-big:has-text('B1')");
  check(true, "página pública do resultado");
  const og = await fetch(`${page.url()}/opengraph-image`);
  check(og.ok && og.headers.get("content-type") === "image/png", "imagem de prévia para redes sociais");
  const anon = await browser.newPage();
  await anon.goto(page.url());
  check(await anon.isVisible("text=Fazer meu teste grátis"), "resultado abre sem login");
  await anon.close();

  // Limite grátis
  await page.goto(`${BASE}/praticar?idioma=en`);
  await page.waitForSelector(".chip.selected:has-text('B1')");
  for (let c = 0; c < 3; c++) {
    await page.click("text=Restaurante");
    await page.waitForSelector("text=What is your name");
    await page.fill("textarea", "I go to the beach");
    await page.keyboard.press("Enter");
    await page.waitForSelector("text=Correção");
    await page.click("text=Encerrar");
  }
  await page.click("text=Restaurante");
  await page.waitForSelector("text=Você usou as conversas grátis");
  check(true, "4ª conversa grátis da semana bloqueada");

  // Erros e revisão
  await page.click("text=Meus erros");
  await page.waitForSelector("text=Passado: use went");
  check(true, "banco de erros");
  await page.goto(`${BASE}/revisar?idioma=en`);
  await page.click(".flashcard");
  await page.waitForSelector("text=praia");
  await page.click('button:has-text("Lembrei")');
  await page.waitForSelector("text=palavras revisadas");
  check(true, "flashcard revisado");

  // Pix simulado
  await page.goto(`${BASE}/assinar`);
  await page.fill('input[placeholder="Nome completo"]', "Aluno Teste");
  await page.fill("input[placeholder=CPF]", "111.111.111-11");
  await page.click('button:has-text("Gerar Pix")');
  await page.waitForSelector("text=CPF inválido");
  check(true, "CPF inválido recusado");
  await page.fill("input[placeholder=CPF]", "529.982.247-25");
  await page.click('button:has-text("Gerar Pix")');
  await page.click("text=Simular pagamento recebido");
  await page.waitForSelector("text=Pagamento confirmado");
  await page.goto(`${BASE}/app`);
  await page.waitForSelector('.title:has-text("Pro")');
  check(true, "Pix confirmado e Pro ativo");
  await page.goto(`${BASE}/praticar?idioma=en`);
  await page.click("text=Restaurante");
  await page.waitForSelector("text=What is your name");
  check(true, "Pro conversa além do limite grátis");

  // Ícones do app
  const manifest = await (await fetch(`${BASE}/manifest.webmanifest`)).json();
  const icons = await Promise.all(manifest.icons.map((i) => fetch(`${BASE}${i.src}`).then((r) => r.ok)));
  check(icons.length >= 2 && icons.every(Boolean), "ícones do manifesto existem");

  // Lembretes por e-mail
  const db = createClient({ url: dbUrl });
  const now = Date.now();
  await db.batch([
    ["sequencia", "seq@teste.com", 0],
    ["vencendo", "vence@teste.com", now + 2 * DAY],
  ].flatMap(([id, mail, proUntil]) => [
    { sql: "INSERT INTO users (id, email, pro_until, created_at) VALUES (?, ?, ?, ?)", args: [id, mail, proUntil, now] },
  ]).concat([
    { sql: "INSERT INTO daily_usage (user_id, day, messages) VALUES ('sequencia', ?, 3)", args: [today(now - DAY)] },
    { sql: "INSERT INTO daily_usage (user_id, day, messages) VALUES ('sequencia', ?, 2)", args: [today(now - 2 * DAY)] },
  ]), "write");
  const cron = (auth) => fetch(`${BASE}/api/cron/lembretes`, { headers: auth ? { Authorization: `Bearer ${CRON_SECRET}` } : {} });
  check((await cron(false)).status === 401, "rotina de lembretes exige o segredo");
  const first = await (await cron(true)).json();
  check(first.sent === 2 && log.includes("E-mail para seq@teste.com") && log.includes("E-mail para vence@teste.com"),
    `lembretes enviados: sequência em risco e plano vencendo (${JSON.stringify(first)})`);
  const second = await (await cron(true)).json();
  check(second.sent === 0, "lembretes não se repetem no mesmo dia");

  const sig = createHmac("sha256", "dev-secret-nao-use-em-producao").update("link:sequencia").digest("hex").slice(0, 32);
  check((await fetch(`${BASE}/api/email/cancelar?u=sequencia&t=errado`)).status === 400, "link de cancelar com assinatura falsa recusado");
  check((await fetch(`${BASE}/api/email/cancelar?u=sequencia&t=${sig}`)).ok, "cancelar lembretes pelo link");
  await db.execute("DELETE FROM reminders_sent");
  const third = await (await cron(true)).json();
  check(third.sent === 1, "quem cancelou não recebe mais lembretes");
  db.close();
} catch (error) {
  check(false, error.message);
} finally {
  await browser.close();
  mock.close();
  try {
    process.kill(-app.pid);
  } catch {}
  rmSync(dir, { recursive: true, force: true });
}

if (failures) console.log("\n--- log do app (fim) ---\n" + log.split("\n").slice(-40).join("\n"));
console.log(failures ? `\n${failures} falha(s)` : "\nTudo certo!");
process.exit(failures ? 1 : 0);
