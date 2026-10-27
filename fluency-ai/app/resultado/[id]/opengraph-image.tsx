import { ImageResponse } from "next/og";
import { LEVEL_LABELS, getLanguage } from "@/lib/languages";
import { getResult } from "@/lib/server/results";

export const alt = "Resultado do teste de nível no Fluency";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const result = await getResult((await params).id);
  const language = result && getLanguage(result.language);
  const level = result?.level ?? "?";
  const label = result ? LEVEL_LABELS[result.level] : "";
  const languageName = language?.name.toLowerCase() ?? "idiomas";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "linear-gradient(135deg, #6366f1, #4338ca)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 40, opacity: 0.85 }}>{`Meu nível de ${languageName} é`}</div>
        <div style={{ fontSize: 220, fontWeight: 800, lineHeight: 1 }}>{level}</div>
        <div style={{ fontSize: 56, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 34, marginTop: 48, opacity: 0.85 }}>Descubra o seu grátis em fluency · 8 idiomas com IA</div>
      </div>
    ),
    size,
  );
}
