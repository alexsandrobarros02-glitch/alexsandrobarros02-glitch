export const ERRORS = {
  pt: {
    not_configured: 'O servidor ainda não tem a chave da API do Claude configurada.',
    busy: 'Muita gente praticando agora. Tente de novo em alguns segundos.',
    offline: 'Sem conexão. Verifique a internet e tente de novo.',
    failed: 'O tutor não respondeu. Tente de novo.',
  },
  en: {
    not_configured: 'The server does not have the Claude API key configured yet.',
    busy: 'Lots of people practising right now. Try again in a few seconds.',
    offline: 'No connection. Check your internet and try again.',
    failed: 'The tutor did not answer. Try again.',
  },
};

export const errorText = (code, uiLang) => {
  const t = ERRORS[uiLang] || ERRORS.pt;
  return t[code] || t.failed;
};
