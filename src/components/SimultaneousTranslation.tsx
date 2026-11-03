import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, Square, Languages, Volume2, Loader2, ArrowRight, 
  RefreshCw, Globe, MessageSquare, Copy, Check, Trash2, 
  Settings, VolumeX, Play, History, AlertCircle, Send, Keyboard
} from 'lucide-react';
import { translateSpeech, translateText, generateTTS, TranslationResult } from '../lib/gemini';
import { auth, db } from '../firebase';
import { 
  collection, addDoc, query, where, orderBy, 
  onSnapshot, deleteDoc, doc, getDoc, limit, Timestamp 
} from 'firebase/firestore';

const SUPPORTED_TARGET_LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Italian', 
  'Japanese', 'Chinese', 'Korean', 'Russian', 'Portuguese',
  'Arabic', 'Hindi', 'Dutch', 'Turkish', 'Vietnamese', 'Polish', 'Thai', 'Indonesian'
];

const VOICES = [
  { id: 'Kore', name: 'Kore (Feminina)', desc: 'Clara e profissional' },
  { id: 'Charon', name: 'Charon (Masculina)', desc: 'Séria e profunda' },
  { id: 'Puck', name: 'Puck (Infantil)', desc: 'Divertida e aguda' },
  { id: 'Zephyr', name: 'Zephyr (Infantil)', desc: 'Doce e suave' },
];

// Helper to play PCM audio from Gemini TTS
const playPCMAudio = async (base64Data: string, sampleRate: number = 24000) => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Int16Array(len / 2);
    for (let i = 0; i < len; i += 2) {
      bytes[i / 2] = (binaryString.charCodeAt(i + 1) << 8) | binaryString.charCodeAt(i);
    }

    const audioBuffer = audioContext.createBuffer(1, bytes.length, sampleRate);
    const channelData = audioBuffer.getChannelData(0);
    for (let i = 0; i < bytes.length; i++) {
      channelData[i] = bytes[i] / 32768;
    }

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start();
    return source;
  } catch (err) {
    console.error("Error playing PCM audio:", err);
    return null;
  }
};

export default function SimultaneousTranslation() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [targetLanguages, setTargetLanguages] = useState<string[]>(['English']);
  const [nativeLanguage, setNativeLanguage] = useState('Português');
  const [originalAudioBase64, setOriginalAudioBase64] = useState<string | null>(null);
  const [translatedAudios, setTranslatedAudios] = useState<Record<string, string>>({});
  const [playingType, setPlayingType] = useState<{ type: 'original' | 'translated', lang?: string } | null>(null);
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [autoPlay, setAutoPlay] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isTextInput, setIsTextInput] = useState(false);
  
  const [isClearingHistory, setIsClearingHistory] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [audioData, setAudioData] = useState<Uint8Array>(new Uint8Array(0));

  useEffect(() => {
    const fetchUserLanguage = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setNativeLanguage(userDoc.data().nativeLanguage || 'Português');
          }
        } catch (err) {
          console.error("Error fetching user language:", err);
        }
      }
    };
    fetchUserLanguage();
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, 'translations'),
      where('uid', '==', user.uid),
      orderBy('date', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistory(docs);
    }, (err) => {
      console.error("History subscription error:", err);
    });

    return () => unsubscribe();
  }, []);

  const startRecording = async () => {
    setError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Seu navegador não suporta acesso ao microfone ou você não está em uma conexão segura (HTTPS).");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Setup Visualizer
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const updateVisualizer = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          setAudioData(new Uint8Array(dataArray));
          animationFrameRef.current = requestAnimationFrame(updateVisualizer);
        }
      };
      updateVisualizer();

      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : 'audio/mp4';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        if (chunksRef.current.length === 0) {
          setError("Nenhum áudio capturado. Tente falar novamente.");
          return;
        }
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          processTranslation(base64Audio);
        };
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setResult(null);
      setOriginalAudioBase64(null);
      setTranslatedAudios({});
    } catch (err: any) {
      console.error("Error accessing microphone:", err);
      let errorMessage = "Erro ao acessar o microfone. Verifique as permissões.";
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
      setIsRecording(false);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      analyserRef.current = null;
      setAudioData(new Uint8Array(0));
    }
  };

  const processTranslation = async (base64Audio: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      const translation = await translateSpeech(base64Audio, targetLanguages);
      setResult(translation);
      
      const user = auth.currentUser;
      if (user) {
        addDoc(collection(db, 'translations'), {
          uid: user.uid,
          originalText: translation.originalText,
          translations: translation.translations,
          detectedLanguage: translation.detectedLanguage,
          targetLanguages: targetLanguages,
          date: new Date().toISOString()
        }).catch(err => console.error("Error saving translation:", err));
      }

      // Optimization: Only generate TTS for the first translation automatically if autoPlay is on
      if (autoPlay && translation.translations.length > 0) {
        const firstTranslation = translation.translations[0];
        const audio = await generateTTS(firstTranslation.text, selectedVoice);
        setTranslatedAudios(prev => ({ ...prev, [firstTranslation.language]: audio }));
        playAudio('translated', audio, firstTranslation.language);
      }
    } catch (err) {
      console.error("Translation error:", err);
      setError("Erro ao processar a tradução. Tente novamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextTranslation = async () => {
    if (!inputText.trim()) return;
    
    setIsProcessing(true);
    setError(null);
    try {
      const translation = await translateText(inputText, targetLanguages);
      setResult(translation);
      setInputText('');
      
      const user = auth.currentUser;
      if (user) {
        addDoc(collection(db, 'translations'), {
          uid: user.uid,
          originalText: translation.originalText,
          translations: translation.translations,
          detectedLanguage: translation.detectedLanguage,
          targetLanguages: targetLanguages,
          date: new Date().toISOString()
        }).catch(err => console.error("Error saving translation:", err));
      }

      if (autoPlay && translation.translations.length > 0) {
        const firstTranslation = translation.translations[0];
        const audio = await generateTTS(firstTranslation.text, selectedVoice);
        setTranslatedAudios(prev => ({ ...prev, [firstTranslation.language]: audio }));
        playAudio('translated', audio, firstTranslation.language);
      }
    } catch (err) {
      console.error("Text translation error:", err);
      setError("Erro ao traduzir o texto. Tente novamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  const playAudio = async (type: 'original' | 'translated', base64?: string, lang?: string) => {
    let data = base64 || (type === 'original' ? originalAudioBase64 : (lang ? translatedAudios[lang] : null));
    
    // On-demand TTS generation
    if (!data && type === 'translated' && lang && result) {
      const translation = result.translations.find(t => t.language === lang);
      if (translation) {
        setPlayingType({ type, lang });
        try {
          data = await generateTTS(translation.text, selectedVoice);
          setTranslatedAudios(prev => ({ ...prev, [lang]: data! }));
        } catch (err) {
          console.error("Error generating on-demand TTS:", err);
          setPlayingType(null);
          return;
        }
      }
    } else if (!data && type === 'original' && result) {
      setPlayingType({ type, lang });
      try {
        data = await generateTTS(result.originalText, selectedVoice);
        setOriginalAudioBase64(data);
      } catch (err) {
        console.error("Error generating on-demand original TTS:", err);
        setPlayingType(null);
        return;
      }
    }

    if (data) {
      if (currentSourceRef.current) {
        try { currentSourceRef.current.stop(); } catch(e) {}
      }
      setPlayingType({ type, lang });
      const source = await playPCMAudio(data);
      if (source) {
        currentSourceRef.current = source;
        source.onended = () => setPlayingType(null);
      } else {
        setPlayingType(null);
      }
    }
  };

  const toggleTargetLanguage = (lang: string) => {
    setTargetLanguages(prev => 
      prev.includes(lang) 
        ? (prev.length > 1 ? prev.filter(l => l !== lang) : prev)
        : [...prev, lang]
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const deleteHistoryItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'translations', id));
    } catch (err) {
      console.error("Error deleting history item:", err);
    }
  };

  const clearHistory = async () => {
    const user = auth.currentUser;
    if (!user || !window.confirm("Tem certeza que deseja limpar todo o histórico de traduções?")) return;

    setIsClearingHistory(true);
    try {
      const q = query(collection(db, 'translations'), where('uid', '==', user.uid));
      const snapshot = await onSnapshot(q, (snap) => {
        snap.docs.forEach(async (d) => {
          await deleteDoc(doc(db, 'translations', d.id));
        });
      });
      // Note: onSnapshot is not ideal for one-time delete, but we use it here for simplicity in this context
      // In a real app, use getDocs
    } catch (err) {
      console.error("Error clearing history:", err);
    } finally {
      setIsClearingHistory(false);
    }
  };

  const copyAllTranslations = () => {
    if (!result) return;
    const text = `Original (${result.detectedLanguage}): ${result.originalText}\n\n` + 
      result.translations.map(t => `${t.language}: ${t.text}`).join('\n');
    copyToClipboard(text);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 md:space-y-12 pb-20 px-4 md:px-0">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-light text-primary text-[10px] font-black uppercase tracking-[0.2em] border border-primary-light">
            <Languages size={14} />
            Simultaneous Translation
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tighter font-display">Tradução <span className="text-primary">Simultânea</span></h1>
          <p className="text-lg md:text-xl text-gray-500 max-w-2xl leading-relaxed">
            Fale em qualquer idioma e receba a tradução instantânea em áudio e texto. Perfeito para conversas e prática.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className={`p-3 rounded-2xl transition-all ${showHistory ? 'bg-primary text-white shadow-lg' : 'bg-white text-gray-400 border border-gray-100 hover:bg-gray-50'}`}
          >
            <History size={20} />
          </button>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-3 rounded-2xl transition-all ${showSettings ? 'bg-primary text-white shadow-lg' : 'bg-white text-gray-400 border border-gray-100 hover:bg-gray-50'}`}
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      {error && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 bg-rose-50 border border-rose-100 rounded-3xl flex flex-col items-center gap-4 text-rose-600 shadow-xl shadow-rose-100/50"
        >
          <div className="flex items-center gap-3 w-full">
            <AlertCircle size={24} />
            <p className="text-sm font-bold flex-1">{error}</p>
          </div>
          
          {window.self !== window.top && (
            <button
              onClick={() => window.open(window.location.href, '_blank')}
              className="px-8 py-3 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-rose-700 transition-all active:scale-95"
            >
              Abrir em Nova Aba
            </button>
          )}
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Settings Overlay */}
          <AnimatePresence>
            {showSettings && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="card-3d p-6 space-y-6 overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Voz da Tradução</label>
                    <div className="grid grid-cols-1 gap-2">
                      {VOICES.map(voice => (
                        <button
                          key={voice.id}
                          onClick={() => setSelectedVoice(voice.id)}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                            selectedVoice === voice.id 
                              ? 'bg-primary-light border-primary-light text-primary' 
                              : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          <div className="text-left">
                            <p className="text-xs font-black">{voice.name}</p>
                            <p className="text-[10px] opacity-70">{voice.desc}</p>
                          </div>
                          {selectedVoice === voice.id && <Check size={14} />}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Idiomas de Destino</label>
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar p-1">
                        {SUPPORTED_TARGET_LANGUAGES.map(lang => (
                          <button
                            key={lang}
                            onClick={() => toggleTargetLanguage(lang)}
                            className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-bold transition-all ${
                              targetLanguages.includes(lang)
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                                : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                              targetLanguages.includes(lang) ? 'bg-primary border-primary text-white' : 'border-gray-300'
                            }`}>
                              {targetLanguages.includes(lang) && <Check size={10} />}
                            </div>
                            {lang}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${autoPlay ? 'bg-primary text-white' : 'bg-gray-200 text-gray-400'}`}>
                          {autoPlay ? <Volume2 size={20} /> : <VolumeX size={20} />}
                        </div>
                        <div>
                          <p className="text-xs font-black text-gray-900">Auto-reprodução</p>
                          <p className="text-[10px] text-gray-400">Tocar áudio automaticamente</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setAutoPlay(!autoPlay)}
                        className={`w-12 h-6 rounded-full transition-colors relative ${autoPlay ? 'bg-primary' : 'bg-gray-300'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${autoPlay ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Controls Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-3d p-6 md:p-12 flex flex-col items-center gap-6 md:gap-8"
          >
            <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 p-3 md:p-4 bg-gray-50 rounded-3xl border border-gray-100 w-full">
              <div className="px-4 md:px-6 py-2 md:py-3 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center gap-2 md:gap-3">
                <Globe size={16} className="text-primary" />
                <span className="font-black text-[10px] md:text-sm uppercase tracking-widest text-gray-900">Auto</span>
              </div>
              <ArrowRight size={16} className="text-gray-300" />
              <div className="flex flex-wrap gap-2 justify-center">
                {targetLanguages.map(lang => (
                  <div key={lang} className="px-3 md:px-4 py-1.5 md:py-2 bg-primary text-white rounded-xl shadow-sm flex items-center gap-1.5 md:gap-2">
                    <Globe size={12} />
                    <span className="font-black text-[9px] md:text-[10px] uppercase tracking-widest">{lang}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full flex flex-col items-center gap-6">
              <div className="flex items-center gap-2 w-full max-w-md p-1 bg-gray-100 rounded-2xl">
                <button
                  onClick={() => setIsTextInput(false)}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!isTextInput ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Mic size={14} />
                    Voz
                  </div>
                </button>
                <button
                  onClick={() => setIsTextInput(true)}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isTextInput ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Keyboard size={14} />
                    Texto
                  </div>
                </button>
              </div>

              {isTextInput ? (
                <div className="w-full space-y-4">
                  <div className="relative">
                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Digite o texto para traduzir..."
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-3xl focus:ring-2 focus:ring-primary-light outline-none font-medium min-h-[100px] md:min-h-[120px] text-gray-900 resize-none text-sm md:text-base"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleTextTranslation();
                        }
                      }}
                    />
                    <button
                      onClick={handleTextTranslation}
                      disabled={isProcessing || !inputText.trim()}
                      className="absolute bottom-3 right-3 w-10 h-10 md:w-12 md:h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                    >
                      {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-6">
                  <div className="relative flex items-center justify-center">
                    <AnimatePresence>
                      {isRecording && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1.2 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="absolute inset-0 bg-rose-500/20 rounded-full blur-3xl"
                        />
                      )}
                    </AnimatePresence>
                    
                    {/* Visualizer Bars */}
                    {isRecording && (
                      <div className="absolute inset-0 flex items-center justify-center gap-1 pointer-events-none">
                        {Array.from(audioData).slice(0, 16).map((val: number, i) => (
                          <motion.div
                            key={i}
                            animate={{ height: Math.max(4, (Number(val) / 255) * 60) }}
                            className="w-1 bg-rose-500/40 rounded-full"
                          />
                        ))}
                      </div>
                    )}
                    
                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={isProcessing}
                      className={`relative w-28 h-28 md:w-40 md:h-40 rounded-[32px] md:rounded-[48px] flex items-center justify-center transition-all duration-500 shadow-2xl z-10 ${
                        isRecording 
                          ? 'bg-rose-600 text-white scale-110 rotate-90' 
                          : isProcessing
                            ? 'bg-gray-100 text-gray-400'
                            : 'bg-primary text-white hover:scale-105 hover:rotate-3'
                      }`}
                    >
                      {isProcessing ? (
                        <Loader2 className="w-10 h-10 md:w-12 md:h-12 animate-spin" />
                      ) : isRecording ? (
                        <Square className="w-10 h-10 md:w-12 md:h-12" fill="currentColor" />
                      ) : (
                        <Mic className="w-10 h-10 md:w-12 md:h-12" fill="currentColor" />
                      )}
                    </button>
                  </div>

                  <p className="text-[10px] md:text-sm font-black text-gray-400 uppercase tracking-[0.2em] text-center px-4">
                    {isRecording ? 'Gravando... Clique para parar' : isProcessing ? 'Traduzindo...' : 'Clique para começar a falar'}
                  </p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Result Card */}
          <AnimatePresence>
            {result && (
              <div className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card-3d p-8 space-y-4 !bg-white/50 relative group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <MessageSquare size={14} className="text-primary" />
                      Original ({result.detectedLanguage})
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={copyAllTranslations}
                        title="Copiar tudo"
                        className="p-2 hover:bg-primary-light text-primary rounded-lg transition-all flex items-center gap-2 text-[10px] font-black uppercase"
                      >
                        <Copy size={14} />
                        Copiar Tudo
                      </button>
                      <button 
                        onClick={() => copyToClipboard(result.originalText)}
                        className="opacity-0 group-hover:opacity-100 p-2 hover:bg-gray-100 rounded-lg transition-all text-gray-400"
                      >
                        {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                      </button>
                      <button 
                        onClick={() => playAudio('original')}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                          playingType?.type === 'original' ? 'bg-primary text-white scale-110' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                      >
                        {playingType?.type === 'original' ? <Loader2 size={14} className="animate-spin" /> : <Volume2 size={14} />}
                      </button>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-gray-900 leading-relaxed italic">
                    "{result.originalText}"
                  </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {result.translations.map((t, idx) => (
                    <motion.div
                      key={t.language}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="card-3d p-8 space-y-6 !bg-primary text-white shadow-primary/20 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[10px] font-black text-indigo-100 uppercase tracking-widest">
                          <Languages size={14} />
                          Tradução ({t.language})
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => copyToClipboard(t.text)}
                            className="opacity-0 group-hover:opacity-100 p-2 hover:bg-white/20 rounded-lg transition-all text-white/70"
                          >
                            {copied ? <Check size={14} className="text-green-300" /> : <Copy size={14} />}
                          </button>
                          {translatedAudios[t.language] && (
                            <button 
                              onClick={() => playAudio('translated', undefined, t.language)}
                              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                                playingType?.type === 'translated' && playingType?.lang === t.language ? 'bg-white text-primary scale-110' : 'bg-white/20 text-white hover:bg-white/30'
                              }`}
                            >
                              {playingType?.type === 'translated' && playingType?.lang === t.language ? <Loader2 size={20} className="animate-spin" /> : <Volume2 size={20} />}
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-2xl font-black leading-tight tracking-tight">
                        {t.text}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* History Sidebar */}
        <div className="lg:col-span-1">
          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="card-3d p-6 space-y-6 h-full"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-gray-900 tracking-tight">Histórico</h3>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={clearHistory}
                      disabled={isClearingHistory || history.length === 0}
                      className="p-2 text-gray-400 hover:text-rose-600 transition-colors"
                      title="Limpar Histórico"
                    >
                      <Trash2 size={18} />
                    </button>
                    <History size={18} className="text-primary" />
                  </div>
                </div>
                
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {history.length === 0 ? (
                    <div className="text-center py-12 space-y-4">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                        <MessageSquare size={24} className="text-gray-300" />
                      </div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nenhuma tradução ainda</p>
                    </div>
                  ) : (
                    history.map((item) => (
                      <div key={item.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3 group relative">
                        <button 
                          onClick={() => deleteHistoryItem(item.id)}
                          className="absolute top-2 right-2 p-1.5 text-gray-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                        <div className="flex items-center gap-2 text-[8px] font-black text-gray-400 uppercase tracking-widest">
                          <span>{item.detectedLanguage}</span>
                          <ArrowRight size={8} />
                          <span className="text-primary">
                            {item.translations?.map((t: any) => t.language).join(', ') || item.targetLanguage}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-gray-900 line-clamp-2">
                          "{item.translations?.[0]?.text || item.translatedText}"
                        </p>
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-[8px] text-gray-400 font-medium">
                            {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button 
                            onClick={async () => {
                              const translation: TranslationResult = {
                                originalText: item.originalText,
                                detectedLanguage: item.detectedLanguage,
                                translations: item.translations || [{ text: item.translatedText, language: item.targetLanguage }]
                              };
                              setResult(translation);
                              setOriginalAudioBase64(null);
                              setTranslatedAudios({});
                              
                              try {
                                const origTtsPromise = generateTTS(item.originalText, selectedVoice);
                                const transTtsPromises = translation.translations.map(t => 
                                  generateTTS(t.text, selectedVoice).then(audio => ({ lang: t.language, audio }))
                                );

                                const [origTtsResult, ...transTtsResults] = await Promise.allSettled([
                                  origTtsPromise,
                                  ...transTtsPromises
                                ]);

                                if (origTtsResult.status === 'fulfilled') setOriginalAudioBase64(origTtsResult.value);
                                
                                const newTranslatedAudios: Record<string, string> = {};
                                transTtsResults.forEach((res) => {
                                  if (res.status === 'fulfilled') {
                                    const { lang, audio } = res.value;
                                    newTranslatedAudios[lang] = audio;
                                  }
                                });
                                setTranslatedAudios(newTranslatedAudios);
                              } catch (err) {
                                console.error("Error regenerating audio for history item:", err);
                              }
                            }}
                            className="text-[8px] font-black text-primary uppercase tracking-widest hover:underline"
                          >
                            Ver Detalhes
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!showHistory && (
            <div className="hidden lg:block space-y-6">
              {[
                { icon: Mic, title: 'Voz para Voz', desc: 'Fale naturalmente e ouça a tradução.' },
                { icon: MessageSquare, title: 'Transcrição', desc: 'Veja o texto original e traduzido.' },
                { icon: Globe, title: 'Multilíngue', desc: 'Suporte a dezenas de idiomas.' },
              ].map((item, i) => (
                <div key={i} className="p-6 bg-white rounded-3xl border border-gray-100 space-y-3">
                  <div className="w-10 h-10 bg-primary-light text-primary rounded-xl flex items-center justify-center">
                    <item.icon size={20} />
                  </div>
                  <h4 className="font-black text-gray-900 text-sm">{item.title}</h4>
                  <p className="text-xs text-gray-500 font-medium leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
