import { GoogleGenAI, Modality, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

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
  const response = await ai.models.generateContent({
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
              properties: {
                word: { type: Type.STRING },
                error: { type: Type.STRING },
                correction: { type: Type.STRING },
                type: { type: Type.STRING, enum: ["TH", "Vowel", "Ending", "R", "Stress", "Other"] }
              },
              required: ["word", "error", "correction", "type"]
            }
          },
          tips: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["score", "clarity", "pace", "pronunciation", "simplifiedPronunciation", "specificErrors", "tips"]
      }
    },
  });

  try {
    const feedback = JSON.parse(response.text || "{}");
    return feedback;
  } catch (e) {
    console.error("Failed to parse AI response", e);
    throw new Error("Failed to analyze speech");
  }
}

export async function getWordDetails(word: string): Promise<WordDetails> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        text: `Você é um assistente de aprendizado de inglês com foco em pronúncia para brasileiros.
        Analise a palavra: "${word}".
        Siga EXATAMENTE este formato para os campos:
        - word: a palavra em inglês
        - adaptedPronunciation: pronúncia adaptada para português (como um brasileiro falaria)
        - ipa: pronúncia fonética internacional (entre barras / /)
        - translation: tradução em português (significado principal e secundário)
        - grammaticalClass: classe gramatical (verbo, substantivo, etc.)
        - example: exemplo de frase simples em inglês
        - exampleTranslation: tradução da frase para português
        - extraInfo: se for verbo, informe passado e particípio. Se for substantivo, informe plural. Se não, deixe vazio.

        Regras: Linguagem simples e didática para iniciantes.`,
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING },
          adaptedPronunciation: { type: Type.STRING },
          ipa: { type: Type.STRING },
          translation: { type: Type.STRING },
          grammaticalClass: { type: Type.STRING },
          example: { type: Type.STRING },
          exampleTranslation: { type: Type.STRING },
          extraInfo: { type: Type.STRING },
        },
        required: ["word", "adaptedPronunciation", "ipa", "translation", "grammaticalClass", "example", "exampleTranslation"],
      },
    },
  });

  return JSON.parse(response.text);
}

export interface TranslationResult {
  originalText: string;
  detectedLanguage: string;
  translations: {
    text: string;
    language: string;
  }[];
}

export async function translateSpeech(audioBase64: string, targetLanguages: string[] = ["English"], mimeType: string = "audio/webm"): Promise<TranslationResult> {
  const languagesStr = targetLanguages.join(", ");
  const response = await ai.models.generateContent({
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
            text: `Transcreva o áudio e traduza para os seguintes idiomas: ${languagesStr}. 
            Retorne a resposta em formato JSON com a seguinte estrutura:
            {
              "originalText": "texto transcrito no idioma original",
              "detectedLanguage": "idioma detectado no áudio",
              "translations": [
                { "text": "texto traduzido", "language": "nome do idioma" },
                ...
              ]
            }`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
    },
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse translation response", e);
    throw new Error("Failed to translate speech");
  }
}

export async function translateText(text: string, targetLanguages: string[] = ["English"]): Promise<TranslationResult> {
  const languagesStr = targetLanguages.join(", ");
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        text: `Traduza o seguinte texto para os seguintes idiomas: ${languagesStr}. 
        Retorne a resposta em formato JSON com a seguinte estrutura:
        {
          "originalText": "o texto original fornecido",
          "detectedLanguage": "idioma detectado no texto",
          "translations": [
            { "text": "texto traduzido", "language": "nome do idioma" },
            ...
          ]
        }
        
        Texto: "${text}"`,
      },
    ],
    config: {
      responseMimeType: "application/json",
    },
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse text translation response", e);
    throw new Error("Failed to translate text");
  }
}

export async function generateTTS(text: string, voiceName: string = 'Kore', speed: 'slow' | 'normal' | 'fast' = 'normal'): Promise<string> {
  let speedInstruction = "";
  if (speed === 'slow') speedInstruction = "very slowly and clearly, with slight pauses between words";
  else if (speed === 'fast') speedInstruction = "at a fast, natural conversational pace";
  else speedInstruction = "at a natural, clear conversational pace";

  let persona = `clearly and ${speedInstruction} for a beginner`;
  // Refinando as personas para serem mais específicas e forçarem o tom infantil
  if (voiceName === 'Puck') {
    persona = `as a very young 5-year-old boy, speaking ${speedInstruction}. Use a very high-pitched, squeaky, and playful voice. Sound extremely childish, energetic, and excited, like a small child speaking`;
  } else if (voiceName === 'Zephyr') {
    persona = `as a very young 5-year-old girl, speaking ${speedInstruction}. Use a very high-pitched, sweet, and soft voice. Sound extremely childish and innocent, like a small child speaking`;
  } else if (voiceName === 'Charon') {
    persona = `in a deep, mature, and professional voice of an adult man, speaking ${speedInstruction}`;
  } else if (voiceName === 'Kore') {
    persona = `in a clear, mature, and professional voice of an adult woman, speaking ${speedInstruction}`;
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Say this ${persona}: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("Failed to generate audio");
  return base64Audio;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface ChatResponse {
  text: string;
  feedback?: {
    grammar: string;
    vocabulary: string;
    suggestion: string;
  };
}

export async function chatWithAI(
  history: ChatMessage[],
  message: string,
  scenario: string = "General Conversation",
  level: string = "Beginner"
): Promise<ChatResponse> {
  const systemInstruction = `You are a patient, direct, and motivating American English tutor.
  Your goal is to train conversation in a fast, practical, and natural way for smartphone users.

  STRICT RULES:
  - Use short phrases (MAXIMUM 12 words).
  - One instruction/question at a time.
  - Wait for the user to respond before continuing.
  - DO NOT write long texts.
  - Explanations must be MAXIMUM 2 lines.
  - Focus entirely on oral practice.
  - Style: Natural, real conversation, encouraging.
  - No long paragraphs.
  - No complex explanations.
  - DO NOT use Portuguese, except for very short corrections (max 1 line).

  MANDATORY INTERACTION FORMAT:
  1. Say a natural phrase in English.
  2. Write: "Your turn."
  3. (The user responds)
  4. Correct simply if necessary (max 2 lines).
  5. Ask to repeat after correction if needed.
  6. Advance to the next related phrase.

  MOBILE MODE:
  - Never exceed 3 lines per response.
  - Always leave visual space between phrases.
  - Do not use large blocks of text.

  Current scenario: ${scenario}.
  Student level: ${level}.

  Return the response in JSON format:
  {
    "text": "Your response in English\\n\\nYour turn.",
    "feedback": {
      "grammar": "Brief correction or 'Perfect!'",
      "vocabulary": "Better word choice or 'Good!'",
      "suggestion": "How a native would say it"
    }
  }`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      ...history.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      })),
      {
        role: 'user',
        parts: [{ text: message }]
      }
    ],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
    },
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse chat response", e);
    return { text: response.text || "I'm sorry, I couldn't process that." };
  }
}
