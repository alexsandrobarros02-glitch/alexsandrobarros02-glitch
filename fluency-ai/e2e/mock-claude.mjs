// API de Mensagens falsa para os testes: responde no formato que o app espera,
// sem gastar créditos nem precisar de chave.
import http from "node:http";

let n = 0;

export function startMockClaude(port) {
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const r = JSON.parse(body || "{}");
      const system = typeof r.system === "string" ? r.system : JSON.stringify(r.system);
      const last = r.messages[r.messages.length - 1];
      const lastUser = [...r.messages].reverse().find((m) => m.role === "user");
      n++;
      let out;
      if (system.includes("You assess")) {
        out = {
          level: "B1",
          summary_pt: "Você se comunica bem em situações do dia a dia.",
          strengths_pt: ["Vocabulário variado"],
          focus_pt: ["Tempos verbais no passado"],
        };
      } else {
        const opening = lastUser.content === "[START]";
        const closing = last.role === "system";
        out = {
          reply: opening ? "Hello! What is your name?" : closing ? "Thank you, that's all for today!" : `Nice! Tell me more (${n}).`,
          reply_pt: opening ? "Olá! Qual é o seu nome?" : closing ? "Obrigado, por hoje é só!" : "Legal! Me conte mais.",
          feedback: opening
            ? { has_errors: false, corrected: "", natural: "", errors: [], praise_pt: "" }
            : {
                has_errors: true,
                corrected: "I went to the beach.",
                natural: "I went to the beach yesterday.",
                errors: [{ original: "I go", fix: "I went", explanation_pt: "Passado: use went." }],
                praise_pt: "Boa!",
              },
          new_words: [{ word: "beach", translation_pt: "praia", example: "I love the beach." }],
        };
      }
      res.setHeader("content-type", "application/json");
      res.end(
        JSON.stringify({
          id: `msg_${n}`,
          type: "message",
          role: "assistant",
          model: r.model,
          content: [{ type: "text", text: JSON.stringify(out) }],
          stop_reason: "end_turn",
          stop_sequence: null,
          usage: { input_tokens: 10, output_tokens: 10 },
        }),
      );
    });
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}
