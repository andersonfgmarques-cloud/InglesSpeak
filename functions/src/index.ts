import { GoogleGenAI, Modality } from "@google/genai";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { defineSecret } from "firebase-functions/params";
import { HttpsError, onCall } from "firebase-functions/v2/https";

initializeApp();

const geminiApiKey = defineSecret("GEMINI_API_KEY");
const db = getFirestore(undefined, "ai-studio-dd4353c7-d1a2-4d6c-8e3d-cb7c9f7402a9");
const REGION = "us-central1";
const TEXT_MODEL = "gemini-3-flash-preview";
const TTS_MODEL = "gemini-3.8-flash-tts";

function ai() {
  const key = geminiApiKey.value();
  if (!key) throw new HttpsError("failed-precondition", "Serviço de IA não configurado.");
  return new GoogleGenAI({ apiKey: key });
}

async function guard(uid: string, action: string, maxPerMinute = 30) {
  const now = Date.now();
  const bucket = Math.floor(now / 60_000);
  const ref = db.collection("_aiRateLimits").doc(`${uid}_${action}`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data();
    const count = data?.bucket === bucket ? Number(data.count || 0) : 0;
    if (count >= maxPerMinute) {
      throw new HttpsError("resource-exhausted", "Limite temporário de solicitações atingido. Tente novamente em um minuto.");
    }
    tx.set(ref, { bucket, count: count + 1, updatedAt: now });
  });
}

function requireAuth(request: { auth?: { uid: string } | null }) {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Faça login para utilizar os recursos de IA.");
  return uid;
}

function requiredText(value: unknown, field: string, max = 4000): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpsError("invalid-argument", `Campo inválido: ${field}.`);
  }
  if (value.length > max) throw new HttpsError("invalid-argument", `${field} excede o limite permitido.`);
  return value.trim();
}

function jsonResult(text?: string) {
  try { return JSON.parse(text || "{}"); }
  catch { throw new HttpsError("internal", "A IA retornou uma resposta em formato inválido."); }
}

export const generateSpeech = onCall(
  { region: REGION, secrets: [geminiApiKey], timeoutSeconds: 90, memory: "512MiB", maxInstances: 20 },
  async (request) => {
    const uid = requireAuth(request);
    await guard(uid, "tts", 40);
    const text = requiredText(request.data?.text, "text", 1200);
    const speed = ["slow", "normal", "fast"].includes(request.data?.speed) ? request.data.speed : "normal";
    const locale = request.data?.locale === "en-US" ? "en-US" : "en-GB";
    const voiceName = ["Kore", "Charon", "Aoede", "Puck", "Zephyr"].includes(request.data?.voiceName)
      ? request.data.voiceName : "Kore";
    const pace = speed === "slow" ? "slowly and clearly, with natural pauses between phrases"
      : speed === "fast" ? "at a brisk but natural conversational pace"
      : "at a natural, clear conversational pace";
    const accent = locale === "en-GB" ? "native British English pronunciation and contemporary UK accent"
      : "native General American English pronunciation";
    const response = await ai().models.generateContent({
      model: TTS_MODEL,
      contents: [{ parts: [{ text: `Speak the following text in ${accent}, ${pace}. Use a mature, warm, natural adult voice. Do not add, omit, or paraphrase any words. Text: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          languageCode: locale,
          voiceConfig: { prebuiltVoiceConfig: { voiceName } },
        },
      },
    });
    const audio = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData?.data;
    if (!audio) throw new HttpsError("internal", "Não foi possível gerar o áudio.");
    const bytes = Buffer.from(audio, "base64");
    // Gemini 3.8 returns WAV (44-byte RIFF header) containing mono 24 kHz PCM.
    const pcm = bytes.length > 44 && bytes.toString("ascii", 0, 4) === "RIFF"
      ? bytes.subarray(bytes.indexOf("data") + 8)
      : bytes;
    return { audioBase64: pcm.toString("base64"), sampleRate: 24000, format: "pcm_s16le", locale };
  }
);

export const analyzeSpeech = onCall(
  { region: REGION, secrets: [geminiApiKey], timeoutSeconds: 90, memory: "512MiB" },
  async (request) => {
    const uid = requireAuth(request); await guard(uid, "analysis", 15);
    const audioBase64 = requiredText(request.data?.audioBase64, "audioBase64", 8_000_000);
    const targetSentence = requiredText(request.data?.targetSentence, "targetSentence", 1000);
    const mimeType = typeof request.data?.mimeType === "string" ? request.data.mimeType : "audio/webm";
    const response = await ai().models.generateContent({
      model: TEXT_MODEL,
      contents: [{ parts: [
        { inlineData: { data: audioBase64, mimeType } },
        { text: `Você é especialista em fonética e pronúncia de inglês americano para brasileiros. Analise a gravação da frase: "${targetSentence}". Compare com a pronúncia nativa. Identifique erros de TH, vogais curtas/longas, consoantes finais, R americano e sílaba tônica. Responda em português como JSON com score (0-100), clarity, pace, pronunciation, simplifiedPronunciation, specificErrors (array de word, error, correction, type: TH|Vowel|Ending|R|Stress|Other) e tips (array de strings).` }
      ] }],
      config: { responseMimeType: "application/json" }
    });
    return jsonResult(response.text);
  }
);

export const getWordDetails = onCall(
  { region: REGION, secrets: [geminiApiKey], timeoutSeconds: 60 },
  async (request) => {
    const uid = requireAuth(request); await guard(uid, "word", 30);
    const word = requiredText(request.data?.word, "word", 120);
    const response = await ai().models.generateContent({
      model: TEXT_MODEL,
      contents: [{ text: `Você é um assistente de inglês para brasileiros iniciantes. Analise a palavra "${word}". Retorne JSON com word, adaptedPronunciation (pronúncia aproximada para brasileiro), ipa, translation, grammaticalClass, example, exampleTranslation e extraInfo (passado/particípio para verbo, plural para substantivo; vazio nos demais casos). Use linguagem simples e traduções naturais em português brasileiro.` }],
      config: { responseMimeType: "application/json" }
    });
    return jsonResult(response.text);
  }
);

export const translateSpeech = onCall(
  { region: REGION, secrets: [geminiApiKey], timeoutSeconds: 90, memory: "512MiB" },
  async (request) => {
    const uid = requireAuth(request); await guard(uid, "translateSpeech", 15);
    const audioBase64 = requiredText(request.data?.audioBase64, "audioBase64", 8_000_000);
    const languages = Array.isArray(request.data?.targetLanguages) ? request.data.targetLanguages.slice(0, 8).map((v: unknown) => requiredText(v, "language", 60)) : ["English"];
    const mimeType = typeof request.data?.mimeType === "string" ? request.data.mimeType : "audio/webm";
    const response = await ai().models.generateContent({
      model: TEXT_MODEL,
      contents: [{ parts: [
        { inlineData: { data: audioBase64, mimeType } },
        { text: `Transcreva o áudio e traduza para: ${languages.join(", ")}. Retorne JSON com originalText, detectedLanguage e translations (array de objetos text e language).` }
      ] }],
      config: { responseMimeType: "application/json" }
    });
    return jsonResult(response.text);
  }
);

export const translateText = onCall(
  { region: REGION, secrets: [geminiApiKey], timeoutSeconds: 60 },
  async (request) => {
    const uid = requireAuth(request); await guard(uid, "translateText", 30);
    const text = requiredText(request.data?.text, "text", 4000);
    const languages = Array.isArray(request.data?.targetLanguages) ? request.data.targetLanguages.slice(0, 8).map((v: unknown) => requiredText(v, "language", 60)) : ["English"];
    const response = await ai().models.generateContent({
      model: TEXT_MODEL,
      contents: [{ text: `Traduza naturalmente o texto a seguir para ${languages.join(", ")}. Preserve o sentido e o tom. Retorne JSON com originalText, detectedLanguage e translations (array de objetos text e language). Texto: "${text}"` }],
      config: { responseMimeType: "application/json" }
    });
    return jsonResult(response.text);
  }
);

export const chatWithAI = onCall(
  { region: REGION, secrets: [geminiApiKey], timeoutSeconds: 60 },
  async (request) => {
    const uid = requireAuth(request); await guard(uid, "chat", 30);
    const message = requiredText(request.data?.message, "message", 2000);
    const history = Array.isArray(request.data?.history) ? request.data.history.slice(-20).map((m: any) => ({
      role: m?.role === "model" ? "model" : "user",
      parts: [{ text: requiredText(m?.text, "history.text", 2000) }]
    })) : [];
    const scenario = typeof request.data?.scenario === "string" ? request.data.scenario.slice(0, 100) : "General Conversation";
    const level = typeof request.data?.level === "string" ? request.data.level.slice(0, 50) : "Beginner";
    const response = await ai().models.generateContent({
      model: TEXT_MODEL,
      contents: [...history, { role: "user", parts: [{ text: message }] }],
      config: {
        systemInstruction: `You are a patient, direct American English tutor. Use short phrases (maximum 12 words), one question at a time, explanations maximum 2 lines, natural conversation, and do not use Portuguese except for a very short correction. Scenario: ${scenario}. Student level: ${level}. Return JSON with text and feedback {grammar, vocabulary, suggestion}.`,
        responseMimeType: "application/json"
      }
    });
    return jsonResult(response.text);
  }
);
