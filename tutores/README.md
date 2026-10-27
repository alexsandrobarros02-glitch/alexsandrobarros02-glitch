# AX99 Tutores de Idiomas

App independente (fora do Base44) com seis tutores de IA (Claude):
🇮🇹 Giulia · 🇬🇧 James · 🇪🇸 Lucía · 🇫🇷 Camille · 🇩🇪 Lukas · 🇧🇷 Ana

- **Conversa**: o tutor responde só no idioma estudado, no nível escolhido (A1–C1), e corrige cada erro com a regra explicada em PT ou EN.
- **Aula do dia**: 5 frases, 1 ponto de gramática e 1 desafio de escrita.
- **Foco para estudar**: 10 min em 40 Hz + 10 min em 432 Hz, batida binaural de 4 Hz (o mesmo protocolo do Método 369).
- **Progresso**: sequência de dias e mensagens por idioma, salvos no navegador.
- Link direto para um tutor: `/?lang=it` (`it`, `en`, `es`, `fr`, `de`, `pt`).

## Arquitetura

| Parte | Onde |
|---|---|
| Interface (React + Vite + Tailwind) | `src/` |
| Função serverless que chama o Claude | `api/tutor.js` |
| Dados dos tutores (UI e servidor) | `src/tutors.js` |

A chave da API fica só no servidor (`ANTHROPIC_API_KEY`). O navegador chama `/api/tutor`, que valida a entrada, monta o prompt e devolve JSON estruturado.

## Rodar localmente

```bash
cd tutores
npm install
ANTHROPIC_API_KEY=sk-ant-... npm run dev
```

## Publicar na Vercel

1. Em vercel.com → **Add New Project** → importe o repositório `alexsandrobarros02-glitch` e, em **Root Directory**, escolha `tutores` (o preset Vite é detectado sozinho). Dê ao projeto o nome `ax99-tutores`.
2. Em **Settings → Environment Variables**, adicione `ANTHROPIC_API_KEY` (crie a chave em console.anthropic.com).
3. Faça o deploy. Opcional: ligue um domínio próprio (ex.: `idiomas.ax99...`).

Modelo padrão: `claude-opus-5-5` (troque com a variável `TUTOR_MODEL`). A conversa usa esforço `low` para responder rápido; a aula usa `medium`.
