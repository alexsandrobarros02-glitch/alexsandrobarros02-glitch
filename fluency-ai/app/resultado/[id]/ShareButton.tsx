"use client";

import { useState } from "react";

export default function ShareButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ text, url }).catch(() => {});
      return;
    }
    await navigator.clipboard?.writeText(`${text} ${url}`);
    setCopied(true);
  }

  return (
    <div className="actions-row">
      <button className="btn" onClick={share}>{copied ? "Link copiado!" : "Compartilhar"}</button>
      <a
        className="btn ghost"
        target="_blank"
        rel="noopener noreferrer"
        href="https://wa.me/"
        // o link da página só é conhecido no navegador
        onClick={(e) => {
          e.currentTarget.href = `https://wa.me/?text=${encodeURIComponent(`${text} ${window.location.href}`)}`;
        }}
      >
        WhatsApp
      </a>
    </div>
  );
}
