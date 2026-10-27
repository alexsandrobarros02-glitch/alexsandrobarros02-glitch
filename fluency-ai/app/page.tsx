import Link from "next/link";
import { LANGUAGES } from "@/lib/languages";

export default function Home() {
  return (
    <main className="container">
      <section className="hero">
        <h1>Pare de travar. Comece a falar.</h1>
        <p>
          Converse em voz alta com um professor de IA em situações reais e receba a correção na hora,
          explicada em português.
        </p>
        <Link href="/app" className="btn">Começar grátis</Link>
      </section>

      <h2 className="section-title">Como funciona</h2>
      <div className="grid">
        <div className="card">
          <div className="emoji">🎯</div>
          <div className="title">Descubra seu nível</div>
          <div className="sub">Uma conversa de 2 minutos define se você é A1, B1, C1…</div>
        </div>
        <div className="card">
          <div className="emoji">🎤</div>
          <div className="title">Fale de verdade</div>
          <div className="sub">Entrevista, aeroporto, restaurante, médico e mais 4 situações reais.</div>
        </div>
        <div className="card">
          <div className="emoji">✅</div>
          <div className="title">Correção em português</div>
          <div className="sub">Veja o que errou, como um nativo diria e por quê.</div>
        </div>
        <div className="card">
          <div className="emoji">🧠</div>
          <div className="title">Treino dos seus erros</div>
          <div className="sub">O professor volta nos seus erros e as palavras novas viram flashcards.</div>
        </div>
      </div>

      <h2 className="section-title">Escolha o idioma</h2>
      <div className="grid">
        {LANGUAGES.map((lang) => (
          <Link key={lang.code} href={`/praticar?idioma=${lang.code}`} className="card">
            <div className="emoji">{lang.flag}</div>
            <div className="title">{lang.name}</div>
            <div className="sub">{lang.nativeName}</div>
          </Link>
        ))}
      </div>

      <h2 className="section-title">Planos</h2>
      <div className="pricing">
        <div className="card">
          <div className="title">Grátis</div>
          <div className="price">R$ 0</div>
          <div className="sub">3 conversas por semana</div>
        </div>
        <div className="card">
          <div className="title">Pro mensal</div>
          <div className="price">R$ 6,99</div>
          <div className="sub">por mês, pago via Pix</div>
        </div>
        <div className="card highlight">
          <div className="title">Pro anual</div>
          <div className="price">R$ 36,99</div>
          <div className="sub">por ano via Pix (≈ R$ 3,08/mês)</div>
        </div>
      </div>
    </main>
  );
}
