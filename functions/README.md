# Firebase Cloud Functions — SpeakFluent

As chamadas Gemini do aplicativo são executadas no servidor. A chave Gemini não deve ser adicionada ao frontend, ao GitHub ou a arquivos .env versionados.

## Projeto Firebase
O projeto está definido em `.firebaserc` como `gen-lang-client-0369871003`.

## Pré-requisitos
- Firebase CLI instalado e autenticado com uma conta que tenha permissões para implantar Functions.
- Projeto Firebase no plano Blaze, com faturamento habilitado.
- APIs necessárias habilitadas no projeto (Cloud Functions, Cloud Build, Artifact Registry e Secret Manager).
- Acesso à API Gemini e uma chave válida.

## Configuração do segredo
Na raiz do repositório, execute:

```bash
firebase login
firebase use gen-lang-client-0369871003
firebase functions:secrets:set GEMINI_API_KEY
```

Cole a chave Gemini somente no prompt seguro do terminal. Não a coloque em código, commits, issues ou mensagens.

## Instalação e compilação

```bash
cd functions
npm install
npm run build
cd ..
```

## Implantação

```bash
firebase deploy --only functions
```

A implantação publica as funções callable:
- `generateSpeech`
- `analyzeSpeech`
- `getWordDetails`
- `translateSpeech`
- `translateText`
- `chatWithAI`

Todas exigem Firebase Authentication e aplicam limites básicos por usuário/ação. A função TTS utiliza Gemini 3.8 Flash TTS e devolve PCM mono 16-bit a 24 kHz.

## Observação
A configuração do segredo e a implantação são operações no projeto Firebase e não são executadas pelo commit no GitHub. Após implantar as Functions, valide o login e a reprodução de áudio no aplicativo.
