export type LanguageCode = "en" | "es" | "it" | "fr" | "de" | "pl" | "ro" | "el";

export interface Language {
  code: LanguageCode;
  name: string; // nome em português
  nativeName: string;
  flag: string;
  speechLocale: string; // locale para reconhecimento e síntese de voz do navegador
}

export const LANGUAGES: Language[] = [
  { code: "en", name: "Inglês", nativeName: "English", flag: "🇺🇸", speechLocale: "en-US" },
  { code: "es", name: "Espanhol", nativeName: "Español", flag: "🇪🇸", speechLocale: "es-ES" },
  { code: "it", name: "Italiano", nativeName: "Italiano", flag: "🇮🇹", speechLocale: "it-IT" },
  { code: "fr", name: "Francês", nativeName: "Français", flag: "🇫🇷", speechLocale: "fr-FR" },
  { code: "de", name: "Alemão", nativeName: "Deutsch", flag: "🇩🇪", speechLocale: "de-DE" },
  { code: "pl", name: "Polonês", nativeName: "Polski", flag: "🇵🇱", speechLocale: "pl-PL" },
  { code: "ro", name: "Romeno", nativeName: "Română", flag: "🇷🇴", speechLocale: "ro-RO" },
  { code: "el", name: "Grego", nativeName: "Ελληνικά", flag: "🇬🇷", speechLocale: "el-GR" },
];

export const LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;
export type Level = (typeof LEVELS)[number];

export const LEVEL_LABELS: Record<Level, string> = {
  A1: "Iniciante",
  A2: "Básico",
  B1: "Intermediário",
  B2: "Intermediário avançado",
  C1: "Avançado",
};

export function getLanguage(code: string): Language | undefined {
  return LANGUAGES.find((l) => l.code === code);
}

export function isLevel(value: string): value is Level {
  return (LEVELS as readonly string[]).includes(value);
}
