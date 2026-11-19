import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

export interface SpeechError {
  error: string;
  correction: string;
  type: "TH" | "Vowel" | "Ending" | "R" | "Stress" | "Other";
  word: string;
}
export interface SpeechFeedback {
  score: number; clarity: string; pace: string; pronunciation: string;
  tips: string[]; simplifiedPronunciation: string; specificErrors: SpeechError[];
}
export interface WordDetails {
  word: string; adaptedPronunciation: string; ipa: string; translation: string;
  grammaticalClass: string; example: string; exampleTranslation: string; extraInfo?: string;
}
export interface TranslationResult {
  originalText: string; detectedLanguage: string;
  translations: { text: string; language: string }[];
}
export interface ChatMessage { role: "user" | "model"; text: string; }
export interface ChatResponse {
  text: string;
  feedback?: { grammar: string; vocabulary: string; suggestion: string };
}

type Speed = "slow" | "normal" | "fast";
const call = async <T, R>(name: string, data: T): Promise<R> => {
  const callable = httpsCallable<T, R>(functions, name);
  const result = await callable(data);
  return result.data;
};

/** All Gemini requests run in authenticated Firebase Cloud Functions. No API key is shipped to the browser. */
export async function analyzeSpeech(
  audioBase64: string, targetSentence: string, mimeType = "audio/webm"
): Promise<SpeechFeedback> {
  return call("analyzeSpeech", { audioBase64, targetSentence, mimeType });
}
export async function getWordDetails(word: string): Promise<WordDetails> {
  return call("getWordDetails", { word });
}
export async function translateSpeech(
  audioBase64: string, targetLanguages: string[] = ["English"], mimeType = "audio/webm"
): Promise<TranslationResult> {
  return call("translateSpeech", { audioBase64, targetLanguages, mimeType });
}
export async function translateText(
  text: string, targetLanguages: string[] = ["English"]
): Promise<TranslationResult> {
  return call("translateText", { text, targetLanguages });
}
export async function generateTTS(
  text: string, voiceName = "Kore", speed: Speed = "normal", locale: "en-GB" | "en-US" = "en-GB"
): Promise<string> {
  const result = await call<{ text: string; voiceName: string; speed: Speed; locale: string },
    { audioBase64: string; sampleRate: number; format: string; locale: string }>(
      "generateSpeech", { text, voiceName, speed, locale }
    );
  return result.audioBase64;
}
export async function chatWithAI(
  history: ChatMessage[], message: string,
  scenario = "General Conversation", level = "Beginner"
): Promise<ChatResponse> {
  return call("chatWithAI", { history, message, scenario, level });
}
