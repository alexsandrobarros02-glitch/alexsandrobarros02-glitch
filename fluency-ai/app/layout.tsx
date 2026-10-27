import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fluency — fale idiomas de verdade",
  description: "Professor de conversação com IA para brasileiros. Pratique falando e receba correção em português.",
  manifest: "/manifest.webmanifest",
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/icon-192.png", sizes: "192x192" }],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: "Fluency", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#4f46e5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
