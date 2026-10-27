import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LEVEL_LABELS, getLanguage } from "@/lib/languages";
import { getResult } from "@/lib/server/results";
import ShareButton from "./ShareButton";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const result = await getResult((await params).id);
  const language = result && getLanguage(result.language);
  if (!result || !language) return {};
  const title = `Meu nível de ${language.name.toLowerCase()}: ${result.level} · ${LEVEL_LABELS[result.level]}`;
  const description = "Descubra o seu nível em 2 minutos conversando com um professor de IA. Grátis.";
  return { title, description, openGraph: { title, description }, twitter: { card: "summary_large_image", title, description } };
}

export default async function Resultado({ params }: Props) {
  const result = await getResult((await params).id);
  const language = result && getLanguage(result.language);
  if (!result || !language) notFound();

  return (
    <main className="container narrow">
      <div className="card result-card">
        <div className="emoji">{language.flag}</div>
        <div className="sub">Nível de {language.name.toLowerCase()} no Fluency</div>
        <div className="level-big">{result.level}</div>
        <div className="title">{LEVEL_LABELS[result.level]}</div>
        <p>{result.summary_pt}</p>
        {result.strengths_pt.length > 0 && (
          <>
            <strong>Pontos fortes</strong>
            <ul className="result-list">{result.strengths_pt.map((s) => <li key={s}>{s}</li>)}</ul>
          </>
        )}
      </div>
      <ShareButton text={`Fiz o teste de ${language.name.toLowerCase()} no Fluency e meu nível é ${result.level}! Descubra o seu:`} />
      <div className="card upgrade" style={{ marginTop: 16 }}>
        <div className="title">E o seu nível?</div>
        <div className="sub">Converse 2 minutos com um professor de IA e descubra. Grátis, em 8 idiomas.</div>
        <p><Link href="/app" className="btn">Fazer meu teste grátis</Link></p>
      </div>
    </main>
  );
}
