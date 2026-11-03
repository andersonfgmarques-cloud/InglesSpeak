import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Play, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { analyzeSpeech, SpeechFeedback } from '../lib/gemini';

interface RecorderProps {
  targetSentence: string;
  pronunciation?: string;
  onAnalysisComplete: (feedback: SpeechFeedback) => void;
}

export default function Recorder({ targetSentence, pronunciation, onAnalysisComplete }: RecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      setError(null);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Seu navegador não suporta acesso ao microfone ou você não está em uma conexão segura (HTTPS).");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : 'audio/mp4';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        
        // Convert to base64 for Gemini
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          await handleAnalysis(base64Audio, mimeType);
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error("Error accessing microphone:", err);
      let errorMessage = "Por favor, permita o acesso ao microfone para gravar.";
      if (err.name === 'NotAllowedError') {
        errorMessage = "Acesso ao microfone negado. Por favor, habilite as permissões nas configurações do seu navegador.";
        if (window.self !== window.top) {
          errorMessage += " Dica: Tente abrir o aplicativo em uma nova aba para garantir que as permissões funcionem corretamente.";
        }
      } else if (err.name === 'NotFoundError') {
        errorMessage = "Nenhum microfone encontrado no seu dispositivo.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const handleAnalysis = async (base64Audio: string, mimeType: string) => {
    setIsAnalyzing(true);
    try {
      const feedback = await analyzeSpeech(base64Audio, targetSentence, mimeType);
      onAnalysisComplete(feedback);
    } catch (err) {
      console.error("Analysis failed:", err);
      setError("Falha ao analisar a fala. Por favor, tente novamente.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const playRecording = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 sm:gap-10 p-6 sm:p-12 card-3d !bg-white/80 backdrop-blur-xl border-white/50 max-w-2xl mx-auto w-full shadow-2xl">
      <div className="text-center space-y-3 sm:space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest border border-indigo-100">
          <Mic size={12} />
          Pronunciation Challenge
        </div>
        <div className="space-y-2">
          <p className="text-xl sm:text-3xl font-black text-gray-900 dark:text-white leading-tight italic tracking-tight px-2">"{targetSentence}"</p>
          {pronunciation && (
            <p className="text-sm sm:text-base text-emerald-600/70 dark:text-emerald-400/70 font-mono italic">[{pronunciation}]</p>
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
                transition={{ repeat: Infinity, duration: 2, ease: "easeOut", delay: 0.5 }}
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
          className={`relative z-10 w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center transition-all duration-500 ${
            isRecording 
              ? 'bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-2xl shadow-rose-200 ring-8 ring-rose-50' 
              : 'bg-gradient-to-br from-indigo-600 to-indigo-800 text-white shadow-2xl shadow-indigo-200 ring-8 ring-indigo-50'
          } disabled:opacity-50 group`}
        >
          {isRecording ? (
            <Square fill="currentColor" className="w-8 h-8 sm:w-9 sm:h-9 animate-pulse" />
          ) : (
            <Mic className="w-8 h-8 sm:w-9 sm:h-9 group-hover:scale-110 transition-transform" />
          )}
        </motion.button>
      </div>

      <div className="flex flex-col items-center gap-4">
        {isRecording ? (
          <div className="flex flex-col items-center gap-2">
            <p className="text-rose-600 font-black uppercase tracking-widest text-xs animate-pulse">Gravando Agora</p>
            <div className="flex gap-1">
              {[1, 2, 3].map(i => (
                <motion.div
                  key={i}
                  animate={{ height: [4, 12, 4] }}
                  transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                  className="w-1 bg-rose-400 rounded-full"
                />
              ))}
            </div>
          </div>
        ) : isAnalyzing ? (
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-12 h-12">
              <Loader2 className="animate-spin text-indigo-600 absolute inset-0" size={48} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-ping" />
              </div>
            </div>
            <p className="text-indigo-600 font-black uppercase tracking-widest text-xs">Analisando sua fala...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Toque para começar</p>
            <div className="w-1 h-4 bg-gray-100 rounded-full" />
          </div>
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
          className="flex flex-col items-center gap-4 p-6 bg-rose-50 text-rose-600 rounded-3xl text-xs font-bold border border-rose-100 shadow-xl shadow-rose-100/50"
        >
          <div className="flex items-center gap-3">
            <AlertCircle size={20} />
            <p className="flex-1">{error}</p>
          </div>
          
          {window.self !== window.top && (
            <button
              onClick={() => window.open(window.location.href, '_blank')}
              className="px-6 py-3 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-rose-700 transition-all active:scale-95"
            >
              Abrir em Nova Aba
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
}
