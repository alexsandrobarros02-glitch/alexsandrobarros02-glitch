import { redirect } from "next/navigation";
import { getLanguage } from "@/lib/languages";
import Practice from "./Practice";

export default async function PraticarPage({
  searchParams,
}: {
  searchParams: Promise<{ idioma?: string }>;
}) {
  const { idioma } = await searchParams;
  const language = idioma ? getLanguage(idioma) : undefined;
  if (!language) redirect("/");
  return <Practice language={language} />;
}
