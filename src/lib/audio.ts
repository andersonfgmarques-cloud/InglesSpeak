
/**
 * Utilitários compartilhados de áudio do SpeakFluent.
 */

const RECORDING_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
  "audio/ogg",
] as const;

export function getSupportedRecordingMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  if (typeof MediaRecorder.isTypeSupported !== "function") return undefined;

  return RECORDING_MIME_CANDIDATES.find((type) =>
    MediaRecorder.isTypeSupported(type)
  );
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () =>
      reject(new Error("Não foi possível ler a gravação."));

    reader.onabort = () =>
      reject(new Error("Leitura da gravação cancelada."));

    reader.onload = () => {
      const result = reader.result;

      if (typeof result !== "string") {
        reject(new Error("Formato de gravação inválido."));
        return;
      }

      const separator = result.indexOf(",");

      if (separator < 0 || separator === result.length - 1) {
        reject(new Error("A gravação não contém dados de áudio."));
        return;
      }

      resolve(result.slice(separator + 1));
    };

    reader.readAsDataURL(blob);
  });
}

export function createAudioContext(): AudioContext {
  const AudioContextConstructor =
    window.AudioContext ||
    (window as Window & {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext;

  if (!AudioContextConstructor) {
    throw new Error(
      "Este dispositivo não oferece suporte à reprodução de áudio."
    );
  }

  return new AudioContextConstructor();
}

/**
 * Decodifica PCM linear signed 16-bit little-endian mono.
 * Utilize somente quando o serviço retornar PCM nesse formato.
 */
export function decodePcm16ToAudioBuffer(
  context: AudioContext,
  base64: string,
  sampleRate = 24000
): AudioBuffer {
  const binary = window.atob(base64);

  if (binary.length < 2 || binary.length % 2 !== 0) {
    throw new Error("Dados de áudio PCM inválidos.");
  }

  const samples = new Int16Array(binary.length / 2);

  for (let i = 0; i < samples.length; i += 1) {
    const low = binary.charCodeAt(i * 2);
    const high = binary.charCodeAt(i * 2 + 1);
    samples[i] = (high << 8) | low;
  }

  const buffer = context.createBuffer(1, samples.length, sampleRate);
  const channel = buffer.getChannelData(0);

  for (let i = 0; i < samples.length; i += 1) {
    channel[i] = samples[i] / 32768;
  }

  return buffer;
}

/** Reproduz PCM mono, signed 16-bit little-endian, retornado pela Cloud Function Gemini TTS. */
export async function playPcm16Base64(
  base64: string,
  sampleRate = 24000,
  speed = 1
): Promise<void> {
  if (!base64) throw new Error("O serviço retornou um áudio vazio.");
  const context = createAudioContext();
  try {
    if (context.state === "suspended") await context.resume();
    const buffer = decodePcm16ToAudioBuffer(context, base64, sampleRate);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = Math.max(0.75, Math.min(1.25, speed));
    source.connect(context.destination);
    await new Promise<void>((resolve, reject) => {
      source.onended = () => resolve();
      try { source.start(0); } catch (error) { reject(error); }
    });
  } finally {
    await context.close();
  }
}
