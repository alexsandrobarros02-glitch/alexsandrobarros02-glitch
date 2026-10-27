"use client";

import Link from "next/link";
import { LANGUAGES } from "@/lib/languages";
import { api, useMe } from "@/lib/client";

export default function Painel() {
  const { me } = useMe();
  if (!me) return <main className="container"><p className="typing">Carregando…</p></main>;

  const totalDue = Object.values(me.dueCards).reduce((a, b) => a + b, 0);
  const firstDue = Object.entries(me.dueCards).find(([, n]) => n > 0)?.[0];

  return (
    <main className="container">
      <div className="chat-header">
        <h1 style={{ margin: 0 }}>Olá! 👋</h1>
        <button
          className="link-btn"
          onClick={async () => {
            await api("/api/auth/logout", {});
            window.location.href = "/";
          }}
        >
          Sair
        </button>
      </div>

      <div className="stats">
        <div className="card">
          <div className="emoji">🔥</div>
          <div className="price">{me.streak}</div>
          <div className="sub">{me.streak === 1 ? "dia seguido" : "dias seguidos"}</div>
        </div>
        <div className="card">
          <div className="emoji">{me.pro ? "⭐" : "🆓"}</div>
          <div className="title">{me.pro ? "Pro" : "Grátis"}</div>
          <div className="sub">
            {me.pro && me.proUntil
              ? `até ${new Date(me.proUntil).toLocaleDateString("pt-BR")}`
              : `${me.freeConversationsLeft} conversas restantes na semana`}
          </div>
        </div>
      </div>

      <h2 className="section-title">Missão de hoje</h2>
      <div className="card mission">
        <div className={me.practicedToday ? "done" : ""}>{me.practicedToday ? "✅" : "⬜"} Fazer uma conversa</div>
        <div className={totalDue === 0 ? "done" : ""}>
          {totalDue === 0 ? "✅" : "⬜"} Revisar as palavras do dia
          {totalDue > 0 && firstDue && (
            <>
              {" "}({totalDue}) · <Link href={`/revisar?idioma=${firstDue}`} className="link-btn">revisar agora</Link>
            </>
          )}
        </div>
      </div>

      {!me.pro && (
        <Link href="/assinar" className="card upgrade">
          <div className="title">⭐ Pratique sem limites com o Pro</div>
          <div className="sub">R$ 6,99/mês ou R$ 36,99/ano, pago via Pix.</div>
        </Link>
      )}

      <h2 className="section-title">Seus idiomas</h2>
      <div className="grid">
        {LANGUAGES.map((lang) => {
          const level = me.levels[lang.code]?.level;
          const due = me.dueCards[lang.code] ?? 0;
          return (
            <Link key={lang.code} href={`/praticar?idioma=${lang.code}`} className="card">
              <div className="emoji">{lang.flag}</div>
              <div className="title">{lang.name}</div>
              <div className="sub">
                {level ? `Nível ${level}` : "Sem nível ainda"}
                {due > 0 && ` · ${due} para revisar`}
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
