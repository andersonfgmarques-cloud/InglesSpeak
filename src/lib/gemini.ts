import { GoogleGenAI, Modality, Type } from "@google/genai";

function getAI() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Os recursos de IA ainda não estão configurados. A tela de login continua disponível."
    );
  }

  return new GoogleGenAI({ apiKey });
}

export interface SpeechError {
  error: string;
  correction: string;
  type: 'TH' | 'Vowel' | 'Ending' | 'R' | 'Stress' | 'Other';
  word: string;
}

export interface SpeechFeedback {
  score: number;
  clarity: string;
  pace: string;
  pronunciation: string;
  tips: string[];
  simplifiedPronunciation: string;
  specificErrors: SpeechError[];
}

export interface WordDetails {
  word: string;
  adaptedPronunciation: string;
  ipa: string;
  translation: string;
  grammaticalClass: string;
  example: string;
  exampleTranslation: string;
  extraInfo?: string;
}

export async function analyzeSpeech(audioBase64: string, targetSentence: string, mimeType: string = "audio/webm"): Promise<SpeechFeedback> {
  const response = await getAI().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          {
            inlineData: {
              data: audioBase64,
              mimeType: mimeType,
            },
          },
          {
            text: `Você é um especialista em fonética e pronúncia de inglês americano, focado em ajudar brasileiros.
            Analise esta gravação de voz da frase: "${targetSentence}".
            
            Compare a voz do usuário com a pronúncia nativa padrão (inglês americano).
            Identifique erros específicos como: som do TH, vogais curtas/longas, final de palavras (ex: som de 'i' no final de palavras que terminam em consoante), R americano (retroflexo), e sílaba tônica.

            Forneça feedback em português seguindo esta estrutura JSON:
            {
              "score": number (0-100),
              "clarity": "breve descrição da clareza",
              "pace": "breve descrição do ritmo",
              "pronunciation": "breve descrição geral da pronúncia",
              "simplifiedPronunciation": "pronúncia simplificada da frase escrita para brasileiros (ex: 'Ai laiki tu ridi')",
              "specificErrors": [
                {
                  "word": "palavra com erro",
                  "error": "descrição do erro cometido",
                  "correction": "instrução prática de como corrigir (ex: 'Coloque a língua entre os dentes')",
                  "type": "TH" | "Vowel" | "Ending" | "R" | "Stress" | "Other"
                }
              ],
              "tips": ["dica geral 1", "dica geral 2"]
            }`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          clarity: { type: Type.STRING },
          pace: { type: Type.STRING },
          pronunciation: { type: Type.STRING },
          simplifiedPronunciation: { type: Type.STRING },
          specificErrors: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
