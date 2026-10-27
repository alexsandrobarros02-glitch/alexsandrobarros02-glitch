# Fluency — professor de conversação com IA

App web (PWA) para brasileiros praticarem conversação em **8 idiomas**: inglês, espanhol,
italiano, francês, alemão, polonês, romeno e grego. O aluno fala (ou digita) em situações reais e
recebe correção na hora, explicada em português.

## O que já funciona (v0.2)
- **Conta sem senha:** login com código de 6 dígitos enviado por e-mail.
- **8 situações** (conversa livre, entrevista, aeroporto, restaurante, hotel, médico, reunião, compras),
  níveis A1–C1, conversa por **voz** (do navegador, sem custo por uso) ou texto.
- **Correção a cada fala:** versão corrigida, versão natural, explicação em português e elogio.
- **Teste de nível:** conversa de 6 perguntas que fica mais difícil e devolve o nível com pontos
  fortes e o que treinar. Não conta no limite grátis.
- **Banco de erros:** todos os erros ficam salvos, e os 5 mais recentes viram foco da próxima conversa.
- **Flashcards com revisão espaçada:** palavras novas das conversas entram automaticamente.
- **Painel com missão diária** (1 conversa + revisão) e sequência de dias.
- **Planos no servidor:** grátis com 3 conversas/semana (30 mensagens cada); Pro com teto de uso justo
  de 150 mensagens/dia.
- **Pix via Asaas:** R$ 6,99 (31 dias) ou R$ 36,99 (366 dias), QR code e copia e cola, liberação
  automática por webhook ou consulta de status. Pagar de novo soma dias ao plano.

## Como rodar
```bash
npm install
cp .env.example .env.local   # coloque sua ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
```
Em desenvolvimento, sem as outras chaves: o código de login aparece no terminal e o Pix roda em
modo simulação.

## Colocar no ar
1. **Hospedagem:** Vercel (importar o repositório, pasta `fluency-ai`).
2. **Banco:** criar um banco no Turso e preencher `DATABASE_URL` e `DATABASE_AUTH_TOKEN`.
3. **E-mail:** conta no Resend com o seu domínio verificado; preencher `RESEND_API_KEY` e `EMAIL_FROM`.
4. **Pix:** conta no Asaas com chave Pix cadastrada; gerar a chave da API e preencher
   `ASAAS_API_KEY` e `ASAAS_API_URL` (testar antes no sandbox).
5. **Webhook do Asaas:** URL `https://SEU-DOMINIO/api/billing/webhook`, eventos de cobrança, e o
   token de autenticação igual a `ASAAS_WEBHOOK_TOKEN`.
6. `AUTH_SECRET` com um valor aleatório longo.

## Custo por conversa
As conversas usam o **Claude Haiku 5.5** (`TUTOR_MODEL`) com esforço baixo, cache do prompt de
sistema e histórico limitado às últimas 20 mensagens. A voz é do navegador, então o custo por aluno
fica só no texto. Meça o custo real com os primeiros usuários antes de divulgar em escala.

## Próximas ideias
- Pix Automático (renovação mensal sem gerar novo QR code), quando confirmado no Asaas.
- Lembrete por e-mail antes do plano vencer e lembrete da sequência de dias.
- Ícones do app e página de compartilhamento do resultado do teste de nível.
