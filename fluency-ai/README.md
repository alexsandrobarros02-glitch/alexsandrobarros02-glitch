# Fluency — professor de conversação com IA

App web (PWA) para brasileiros praticarem conversação em **8 idiomas**: inglês, espanhol,
italiano, francês, alemão, polonês, romeno e grego. O aluno fala (ou digita) em situações reais e
recebe correção na hora, explicada em português.

## O que já funciona (v0.1)
- Escolha de idioma, nível (A1–C1) e 8 situações: conversa livre, entrevista de emprego,
  aeroporto, restaurante, hotel, médico, reunião de trabalho e compras.
- Conversa por **voz** (reconhecimento e leitura em voz alta do próprio navegador, sem custo por uso)
  ou por texto.
- A cada fala do aluno: versão corrigida, versão mais natural, explicação de cada erro em português
  e um elogio específico.
- Tradução opcional de cada resposta e palavras novas com tradução.
- Limite do plano grátis: 3 conversas por semana (guardado no navegador, provisório).

## Como rodar
```bash
npm install
cp .env.example .env.local   # coloque sua ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
```
O reconhecimento de voz funciona no Chrome/Edge (computador e Android) e no Safari.

## Custo por conversa
As conversas usam o **Claude Haiku 5.5** (`TUTOR_MODEL`), o modelo mais barato, com esforço baixo,
cache do prompt de sistema e histórico limitado às últimas 20 mensagens. A voz é do navegador,
então o custo por aluno fica só no texto. Meça o custo real com os primeiros usuários antes de
divulgar em escala.

## Próximas etapas
1. **Login e conta** (e-mail com link mágico) e limite do plano grátis no servidor.
2. **Pagamento via Pix**: Pro mensal R$ 6,99 e anual R$ 36,99. Escolher provedor (Asaas,
   Mercado Pago, Efí ou Pagar.me) conferindo taxas e suporte a Pix Automático; liberar o Pro por
   webhook.
3. **Nivelamento** por uma conversa de 5 minutos.
4. **Banco de erros pessoal**, flashcards com revisão espaçada e missão diária.
5. **Landing page**, ícones do app e lançamento.
