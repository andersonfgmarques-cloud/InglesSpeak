import React, { useEffect, useRef, useState } from "react";
import { Mic, Square, Loader2, Play, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { analyzeSpeech, SpeechFeedback } from "../lib/gemini";
import { blobToBase64, getSupportedRecordingMimeType } from "../lib/audio";

interface RecorderProps {
  targetSentence: string;
  pronunciation?: string;
  onAnalysisComplete: (feedback: SpeechFeedback) => void;
}

export default function Recorder({
  targetSentence,
  pronunciation,
  onAnalysisComplete,
}: RecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        try {
          recorder.stop();
        } catch {
          // O gravador pode já ter sido encerrado pelo navegador.
        }
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const handleAnalysis = async (blob: Blob) => {
    if (!blob.size) {
      setError("Nenhum áudio foi capturado. Verifique o microfone e tente novamente.");
      return;
    }

    setIsAnalyzing(true);
    try {
      const base64 = await blobToBase64(blob);
      const feedback = await analyzeSpeech(
        base64,
        targetSentence,
        blob.type || "audio/webm"
      );
      if (mountedRef.current) onAnalysisComplete(feedback);
    } catch (err) {
      console.error("Falha na análise da pronúncia:", err);
      if (mountedRef.current) {
        setError(
          err instanceof Error
            ? err.message
            : "Falha ao analisar a fala. Tente novamente."
        );
      }
    } finally {
      if (mountedRef.current) setIsAnalyzing(false);
    }
  };

  const startRecording = async () => {
    try {
      setError(null);

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "O microfone exige navegador compatível e conexão HTTPS."
        );
      }
      if (typeof MediaRecorder === "undefined") {
        throw new Error(
          "Este dispositivo não oferece suporte à gravação de áudio."
        );
      }

      const mimeType = getSupportedRecordingMimeType();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onerror = () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (mountedRef.current) {
          setIsRecording(false);
          setError("Ocorreu um erro durante a gravação. Tente novamente.");
        }
      };

      recorder.onstop = async () => {
        const actualType = recorder.mimeType || mimeType || "application/octet-stream";
        const blob = new Blob(chunksRef.current, { type: actualType });

        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        if (!mountedRef.current) return;

        setAudioUrl((previousUrl) => {
          if (previousUrl) URL.revokeObjectURL(previousUrl);
          return URL.createObjectURL(blob);
        });

        await handleAnalysis(blob);
      };

      recorder.start(250);
      setIsRecording(true);
    } catch (err) {
      console.error("Erro ao iniciar gravação:", err);
      const domError = err as DOMException;
      let message = "Não foi possível iniciar a gravação.";

      if (
        domError?.name === "NotAllowedError" ||
        domError?.name === "PermissionDeniedError"
      ) {
        message =
          "Acesso ao microfone negado. Autorize o microfone nas configurações do navegador ou Android.";
      } else if (
        domError?.name === "NotFoundError" ||
        domError?.name === "DevicesNotFoundError"
      ) {
        message = "Nenhum microfone foi encontrado neste dispositivo.";
      } else if (domError?.name === "NotReadableError") {
        message =
          "O microfone está sendo usado por outro aplicativo. Feche-o e tente novamente.";
      } else if (err instanceof Error && err.message) {
        message = err.message;
      }

      setError(message);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    setIsRecording(false);
  };

  const playRecording = async () => {
    if (!audioUrl) return;
    try {
      const audio = new Audio(audioUrl);
      await audio.play();
    } catch (err) {
      console.error("Erro ao reproduzir gravação:", err);
      setError("Não foi possível reproduzir esta gravação neste dispositivo.");
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 sm:gap-10 p-6 sm:p-12 card-3d !bg-white/80 backdrop-blur-xl border-white/50 max-w-2xl mx-auto w-full shadow-2xl">
      <div className="text-center space-y-3 sm:space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest border border-indigo-100">
          <Mic size={12} /> Pronunciation Challenge
        </div>
        <div className="space-y-2">
          <p className="text-xl sm:text-3xl font-black text-gray-900 dark:text-white leading-tight italic tracking-tight px-2">
            "{targetSentence}"
          </p>
          {pronunciation && (
            <p className="text-sm sm:text-base text-emerald-600/70 dark:text-emerald-400/70 font-mono italic">
              [{pronunciation}]
            </p>
          )}
        </div>
      </div>

      <div className="relative flex items-center justify-center w-40 h-40 sm:w-48 sm:h-48">
        <AnimatePresence>
          {isRecording && (
            <>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1.5, opacity: 0.15 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
                className="absolute inset-0 bg-rose-500 rounded-full"
              />
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1.8, opacity: 0.1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{
                  repeat: Infinity,
                  duration: 2,
                  ease: "easeOut",
                  delay: 0.5,
                }}
                className="absolute inset-0 bg-rose-400 rounded-full"
              />
            </>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isAnalyzing}
          aria-label={isRecording ? "Parar gravação" : "Iniciar gravação"}
          className={`relative z-10 w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center transition-all duration-500 ${
            isRecording
              ? "bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-2xl ring-8 ring-rose-50"
              : "bg-gradient-to-br from-indigo-600 to-indigo-800 text-white shadow-2xl ring-8 ring-indigo-50"
          } disabled:opacity-50`}
        >
          {isRecording ? (
            <Square fill="currentColor" className="w-8 h-8 sm:w-9 sm:h-9 animate-pulse" />
          ) : (
            <Mic className="w-8 h-8 sm:w-9 sm:h-9" />
          )}
        </motion.button>
      </div>

      <div className="flex flex-col items-center gap-4">
        {isRecording ? (
          <p className="text-rose-600 font-black uppercase tracking-widest text-xs animate-pulse">
            Gravando agora
          </p>
        ) : isAnalyzing ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-indigo-600" size={42} />
            <p className="text-indigo-600 font-black uppercase tracking-widest text-xs">
              Analisando sua fala...
            </p>
          </div>
        ) : (
          <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">
            Toque para começar
          </p>
        )}

        {audioUrl && !isRecording && !isAnalyzing && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={playRecording}
            className="btn-3d px-6 py-3 bg-white text-indigo-600 text-xs flex items-center gap-2 border border-gray-100"
          >
            <Play size={14} fill="currentColor" /> Ouvir sua gravação
          </motion.button>
        )}
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-3 p-6 bg-rose-50 text-rose-600 rounded-3xl text-xs font-bold border border-rose-100 shadow-xl"
        >
          <AlertCircle size={20} />
          <p className="flex-1">{error}</p>
        </motion.div>
      )}
    </div>
  );
}
