"use client";

import { useState } from "react";
import { api } from "@/lib/client";

export default function Entrar() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (step === "email") {
        await api("/api/auth/request", { email });
        setStep("code");
      } else {
        await api("/api/auth/verify", { email, code });
        const back = new URLSearchParams(window.location.search).get("voltar");
        window.location.href = back?.startsWith("/") && !back.startsWith("//") ? back : "/app";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container narrow">
      <h1>Entrar no Fluency</h1>
      <p className="sub">Sem senha: enviamos um código de 6 dígitos para o seu e-mail.</p>
      <form onSubmit={submit} className="form">
        {step === "email" ? (
          <input
            type="email"
            required
            autoFocus
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        ) : (
          <>
            <p>
              Código enviado para <strong>{email}</strong>.{" "}
              <button type="button" className="link-btn" onClick={() => setStep("email")}>
                Trocar e-mail
              </button>
            </p>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              autoFocus
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="code-input"
            />
          </>
        )}
        {error && <div className="error">{error}</div>}
        <button className="btn" disabled={loading}>
          {loading ? "Aguarde…" : step === "email" ? "Receber código" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
