"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PLANS, type PlanId } from "@/lib/plans";
import { api, useMe } from "@/lib/client";

interface PixCharge {
  paymentId: string;
  value: number;
  qrCodeImage: string | null;
  copyPaste: string;
  expiresAt: string | null;
  simulation: boolean;
}

function formatCpf(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export default function Assinar() {
  const { me } = useMe();
  const [plan, setPlan] = useState<PlanId>("annual");
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [charge, setCharge] = useState<PixCharge | null>(null);
  const [paid, setPaid] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Confere o pagamento a cada 4 segundos enquanto o QR code está na tela.
  useEffect(() => {
    if (!charge || paid) return;
    const timer = setInterval(async () => {
      try {
        const { status } = await api<{ status: string }>(`/api/billing/status?id=${encodeURIComponent(charge.paymentId)}`);
        if (status === "paid") setPaid(true);
      } catch {}
    }, 4000);
    return () => clearInterval(timer);
  }, [charge, paid]);

  async function checkout(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      setCharge(await api<PixCharge>("/api/billing/checkout", { plan, name, cpf }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  if (paid) {
    return (
      <main className="container narrow">
        <h1>🎉 Pagamento confirmado!</h1>
        <p>Seu {PLANS[plan].name} está ativo. Bons estudos!</p>
        <Link href="/app" className="btn">Ir para o painel</Link>
      </main>
    );
  }

  if (charge) {
    return (
      <main className="container narrow">
        <h1>Pague com Pix</h1>
        <p className="sub">
          {PLANS[plan].name} · {PLANS[plan].priceLabel}. Abra o app do seu banco e escaneie o QR code ou use o Pix
          copia e cola. A liberação é automática.
        </p>
        {charge.qrCodeImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="qr" src={`data:image/png;base64,${charge.qrCodeImage}`} alt="QR code Pix" />
        )}
        <textarea className="copy-paste" readOnly value={charge.copyPaste} rows={3} />
        <button
          className="btn"
          onClick={() => {
            navigator.clipboard?.writeText(charge.copyPaste).then(() => setCopied(true), () => {});
          }}
        >
          {copied ? "Copiado!" : "Copiar código Pix"}
        </button>
        <p className="typing">Aguardando pagamento…</p>
        {charge.simulation && (
          <div className="notice">
            Modo simulação (sem chave do Asaas).{" "}
            <button
              className="link-btn"
              onClick={() => api("/api/billing/simulate", { id: charge.paymentId }).then(() => setPaid(true))}
            >
              Simular pagamento recebido
            </button>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="container narrow">
      <Link href="/app" className="link-btn">← Voltar</Link>
      <h1>Seja Pro</h1>
      <p className="sub">Conversas sem limite semanal, em todos os 8 idiomas. Pagamento único via Pix, sem cartão.</p>
      {me?.pro && me.proUntil && (
        <div className="notice">
          Você já é Pro até {new Date(me.proUntil).toLocaleDateString("pt-BR")}. Pagar agora soma os dias ao seu plano.
        </div>
      )}

      <div className="pricing" style={{ margin: "16px 0" }}>
        {(Object.keys(PLANS) as PlanId[]).map((id) => (
          <button key={id} className={`card ${plan === id ? "selected" : ""}`} onClick={() => setPlan(id)}>
            <div className="title">{PLANS[id].name}</div>
            <div className="price">{PLANS[id].priceLabel}</div>
            <div className="sub">{PLANS[id].note}</div>
            {id === "annual" && <div className="badge">Economize 56%</div>}
          </button>
        ))}
      </div>

      <form onSubmit={checkout} className="form">
        <input required placeholder="Nome completo" value={name} onChange={(e) => setName(e.target.value)} />
        <input
          required
          inputMode="numeric"
          placeholder="CPF"
          value={cpf}
          onChange={(e) => setCpf(formatCpf(e.target.value))}
        />
        <p className="sub">O CPF é exigido pelo banco para gerar a cobrança Pix.</p>
        {error && <div className="error">{error}</div>}
        <button className="btn" disabled={loading}>
          {loading ? "Gerando Pix…" : `Gerar Pix de ${PLANS[plan].priceLabel}`}
        </button>
      </form>
    </main>
  );
}
