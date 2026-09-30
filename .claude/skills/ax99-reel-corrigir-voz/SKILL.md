---
name: ax99-reel-corrigir-voz
description: Corrigir a pronúncia de palavras soltas num Reel/anúncio AX99 já pronto (voz clonada do Alexsandro) sem regravar o vídeo inteiro. Use quando o Alexsandro apontar minutos e palavras ("'Esta' no 0:07 soa português de Portugal", "Solte ficou fechado") e pedir v2. Troca só os trechos de voz, reconstrói o fundo sonoro, mantém vídeo e duração.
---

# Corrigir voz de um Reel pronto (cirurgia de áudio)

Regra de ouro: **nada é publicado, postado ou enviado sem "pode postar" explícito do Alexsandro.** A skill termina entregando o v2 + texto do post.

## Entradas
- O .mp4 atual (v1) e a lista de pontos: minuto + palavra/frase.
- Voz: elemento Higgsfield "Alexsandro AX99" (`a98842e2-3083-4da8-bf10-ff5ed2eb2dd9`), `generate_audio` modelo `seed_audio`, `voice_as_reference: true`, mp3 24 kHz, speech_rate/pitch_rate/expression_intensity 5, mood 0.

## Passo a passo
1. **Extrair e localizar.** `ffmpeg` do v1 para wav 48 kHz estéreo. Achar cada trecho pela curva de energia da voz (excesso sobre o fundo, passo 10 ms) e marcar o slot `[início, fim]` de cada frase, com folga dentro das pausas vizinhas.
2. **Gerar tomadas novas** (várias por frase, 5–10). Escrever a frase com ortografia que force o som certo quando precisar (ex.: "Solte" com "tch" nítido). Uma tomada = uma frase curta, não o reel inteiro.
3. **Escolher por medição, não por palpite** (sotaque NÃO dá para confirmar de ouvido aqui):
   - centroide e razão HF/LF do "s"/"ch" (o "s" do Alexsandro é agudo; o do v1 "Esta" era mais grave = soa de Portugal);
   - presença de fechamento + explosão + fricção no "tch" de "Solte";
   - F0 e energia por sílaba para a tônica ("Alexsandro" → tônica em "SÃN");
   - duração cabendo no slot (±10%).
4. **Transferir as tomadas.** O sandbox Higgsfield é descartado ~10 s após cada chamada e o stdout trunca em ~40 K. Por tomada: baixar, cortar com margem, codificar `libopus 32k` mono, imprimir `base64 -w200` **com um hash de 4 hex por linha**, colar localmente e conferir linha a linha + md5 final. Uma linha errada = conserte só aquela linha. Nunca imprimir blobs grandes sem necessidade.
5. **Montar (`build.py`).** Para cada slot: nivelar ao rms ativo do trecho original; comprimir/limitar (teto 0,78) para não estourar; fade de 20 ms na voz; crossfade de 15 ms dentro da pausa; **reconstruir o fundo** (drone de linhas harmônicas estacionárias, `bedsm.py`: mínimos quadrados regularizados por blocos de 50 ms, com buraco ignorado) e somar o chiado de pausa (ruído filtrado pelo espectro medido nas pausas, calibrar o ganho).
6. **Mux.** `-c:v copy` (vídeo intacto), áudio AAC 192 kbps, `-movflags +faststart`, `-shortest`. Duração deve ficar igual à do v1.
7. **Verificar.** Regiões alteradas só nos slots; diferença fora dos slots ≈ só recompressão AAC (~ −35 dB); picos < 0 dBFS; saltos nas bordas ≤ v1; espectrogramas v1×v2 sem corte; nível do chiado nas caudas ≈ pausas do v1.
8. **Entregar** o v2 e dizer **exatamente** os minutos para ouvir. Ser honesto: sotaque só o Alexsandro confirma. Oferecer tomadas alternativas ou encaixar áudio curto gravado por ele.

## Aprendizados
- "Esta" de Portugal = "s" inicial com centroide baixo + vogal final reduzida. Tomada boa tem fricativa ≥ c7 (centroide ~7 kHz).
- "Solte": precisa de "tch" real; no v1 o "te" saía fechado/sem explosão.
- Fundo estático dá −2 a −4 dB de cancelamento; o suavizador por blocos dá −11 a −16 dB.
- Conectores Higgsfield caem; recarregar com `ToolSearch select:mcp__Higgsfiled__sandbox_exec` e refazer a chamada inteira (download+corte+print numa só chamada).
- Sandbox: comando ≤ 16.000 caracteres, foreground ≤ 120 s.
