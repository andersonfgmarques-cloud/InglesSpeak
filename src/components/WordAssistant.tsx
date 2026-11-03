import React, { useState } from 'react';
import { Search, Volume2, Loader2, Book, MessageSquare, Info, Star, UserRound, Baby, Sparkles, ArrowRight, Languages } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getWordDetails, generateTTS, WordDetails } from '../lib/gemini';

const VOICES = [
  { id: 'Kore', name: 'Mulher Adulta', icon: UserRound, color: 'text-pink-600', bg: 'bg-pink-100/50', border: 'border-pink-200' },
  { id: 'Charon', name: 'Homem Adulto', icon: UserRound, color: 'text-blue-600', bg: 'bg-blue-100/50', border: 'border-blue-200' },
  { id: 'Puck', name: 'Criança Menino', icon: Baby, color: 'text-cyan-600', bg: 'bg-cyan-100/50', border: 'border-cyan-200' },
  { id: 'Zephyr', name: 'Criança Menina', icon: Baby, color: 'text-rose-600', bg: 'bg-rose-100/50', border: 'border-rose-200' },
];

export default function WordAssistant() {
  const [word, setWord] = useState('');
  const [details, setDetails] = useState<WordDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [speechSpeed, setSpeechSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim()) return;

    setLoading(true);
    setError(null);
    setDetails(null);

    try {
      const result = await getWordDetails(word.trim());
      setDetails(result);
    } catch (err) {
      console.error(err);
      setError("Não conseguimos encontrar detalhes para essa palavra. Tente outra!");
    } finally {
      setLoading(false);
    }
  };

  const playAudio = async (text: string) => {
    setAudioLoading(true);
    try {
      const base64 = await generateTTS(text, selectedVoice, speechSpeed);
      
      const binaryString = window.atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }
      
      const buffer = audioContext.createBuffer(1, float32Array.length, 24000);
      buffer.getChannelData(0).set(float32Array);
      
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      source.start();
    } catch (err) {
      console.error("Erro ao reproduzir áudio:", err);
    } finally {
      setAudioLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 md:space-y-12 pb-12 md:pb-20 px-4 md:px-0">
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-3 md:space-y-4"
      >
        <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-indigo-50 text-indigo-600 text-[10px] md:text-xs font-bold uppercase tracking-widest border border-indigo-100">
          <Sparkles size={14} />
          AI Powered Learning
        </div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter font-display text-gray-900 leading-tight">
          <span className="text-gradient">Assistente</span> de Inglês
        </h1>
        <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed px-2 md:px-0">
          Domine a pronúncia e o significado de qualquer palavra com tecnologia de ponta e vozes naturais.
        </p>
      </motion.header>

      {/* Voice Selection Section */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="glass p-6 md:p-8 rounded-[32px] md:rounded-[40px] space-y-6"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-indigo-600 rounded-full" />
            <p className="text-[10px] md:text-sm font-black text-gray-400 uppercase tracking-widest">Escolha o seu Guia de Pronúncia</p>
          </div>
          
          <div className="flex items-center bg-white dark:bg-gray-800 p-1.5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
            {(['slow', 'normal', 'fast'] as const).map((speed) => (
              <button
                key={speed}
                onClick={() => setSpeechSpeed(speed)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  speechSpeed === speed 
                    ? 'bg-indigo-600 text-white shadow-lg' 
                    : 'text-gray-400 dark:text-gray-500 hover:text-indigo-600'
                }`}
              >
                {speed === 'slow' ? 'Lento' : speed === 'normal' ? 'Normal' : 'Rápido'}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {VOICES.map((voice) => (
            <button
              key={voice.id}
              onClick={() => setSelectedVoice(voice.id)}
              className={`group relative flex flex-col items-center gap-3 md:gap-4 p-4 md:p-6 rounded-2xl md:rounded-3xl border-2 transition-all duration-500 min-h-[120px] md:min-h-[160px] ${
                selectedVoice === voice.id
                  ? `border-indigo-500 bg-white shadow-2xl scale-105 -translate-y-1 md:-translate-y-2`
                  : 'border-transparent bg-gray-50/50 hover:bg-white hover:shadow-xl'
              }`}
            >
              <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-transform duration-500 group-hover:scale-110 ${voice.bg} ${voice.color}`}>
                <voice.icon size={24} className="md:w-8 md:h-8" />
              </div>
              <div className="text-center">
                <span className={`block text-xs md:text-sm font-black uppercase tracking-wider transition-colors ${selectedVoice === voice.id ? 'text-indigo-600' : 'text-gray-500'}`}>
                  {voice.name}
                </span>
                <span className="text-[8px] md:text-[10px] text-gray-400 font-medium uppercase tracking-widest">Voz {voice.id}</span>
              </div>
              {selectedVoice === voice.id && (
                <motion.div 
                  layoutId="active-voice"
                  className="absolute -top-1.5 -right-1.5 md:-top-2 md:-right-2 w-5 h-5 md:w-6 md:h-6 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg"
                >
                  <Star size={10} className="md:w-3 md:h-3" fill="currentColor" />
                </motion.div>
              )}
            </button>
          ))}
        </div>
      </motion.div>

      <motion.form 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        onSubmit={handleSearch} 
        className="relative group max-w-3xl mx-auto"
      >
        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-rose-500 rounded-[32px] md:rounded-[40px] blur opacity-25 group-focus-within:opacity-50 transition duration-1000 group-focus-within:duration-200"></div>
        <div className="relative flex flex-col md:block">
          <input
            type="text"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="Qual palavra quer aprender?"
            className="w-full p-6 md:p-8 pl-12 md:pl-16 bg-white rounded-3xl md:rounded-[36px] shadow-2xl border border-gray-100 focus:border-indigo-500 outline-none transition-all text-xl md:text-2xl font-bold placeholder:text-gray-300 text-gray-900"
          />
          <Search className="absolute left-4 md:left-6 top-8 md:top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={24} />
          <button
            type="submit"
            disabled={loading}
            className="mt-4 md:mt-0 md:absolute md:right-4 md:top-1/2 md:-translate-y-1/2 bg-indigo-600 text-white px-8 md:px-10 py-4 rounded-2xl md:rounded-[28px] font-black text-base md:text-lg hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-xl hover:shadow-indigo-200 active:scale-95 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={24} /> : (
              <>
                Explorar
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </div>
      </motion.form>

      {error && (
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-rose-500 font-black text-center text-lg"
        >
          {error}
        </motion.p>
      )}

      <AnimatePresence mode="wait">
        {details && (
          <motion.div
            key={details.word}
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.95 }}
            transition={{ type: "spring", damping: 20, stiffness: 100 }}
            className="card-3d overflow-hidden"
          >
            <div className="p-5 md:p-12 space-y-6 md:space-y-12">
              {/* Header Section */}
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 md:gap-10 border-b border-gray-50 pb-6 md:pb-12">
                <div className="space-y-4 md:space-y-6">
                  <div className="space-y-1 md:space-y-2">
                    <div className="flex items-center gap-2 text-indigo-500 font-black text-[8px] md:text-[10px] uppercase tracking-[0.2em]">
                      <Languages size={12} className="md:w-3.5 md:h-3.5" />
                      Vocabulary Entry
                    </div>
                    <h2 className="text-4xl md:text-8xl font-black text-gray-900 tracking-tighter font-display leading-none">{details.word}</h2>
                  </div>
                  <div className="flex flex-wrap gap-2 md:gap-4">
                    <div className="px-3 md:px-5 py-1.5 md:py-2 bg-gray-900 text-white rounded-lg md:rounded-2xl text-sm md:text-lg font-black font-mono shadow-xl">
                      {details.ipa}
                    </div>
                    <div className="px-3 md:px-5 py-1.5 md:py-2 bg-indigo-50 text-indigo-600 rounded-lg md:rounded-2xl text-[8px] md:text-sm font-black uppercase tracking-widest border border-indigo-100">
                      {details.grammaticalClass}
                    </div>
                  </div>
                </div>
                <div className="lg:text-right space-y-0.5 md:space-y-2">
                  <p className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Tradução</p>
                  <p className="text-2xl md:text-5xl font-black text-indigo-600 tracking-tight">{details.translation}</p>
                </div>
              </div>

              {/* Pronunciation Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
                <motion.div 
                  whileHover={{ y: -5 }}
                  className="space-y-2 md:space-y-4 p-5 md:p-8 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-2xl md:rounded-[40px] border border-orange-100 shadow-inner-3d"
                >
                  <div className="flex items-center gap-2 text-orange-600 font-black">
                    <Star size={14} className="md:w-4.5 md:h-4.5" fill="currentColor" />
                    <h3 className="uppercase tracking-[0.2em] text-[8px] md:text-[10px]">Pronúncia Facilitada</h3>
                  </div>
                  <p className="text-2xl md:text-4xl font-black text-orange-900 italic tracking-tight">"{details.adaptedPronunciation}"</p>
                  <p className="text-[10px] md:text-sm text-orange-800/60 font-medium">Leia como se fosse português para soar natural.</p>
                </motion.div>

                {details.extraInfo && (
                  <motion.div 
                    whileHover={{ y: -5 }}
                    className="space-y-2 md:space-y-4 p-5 md:p-8 bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-2xl md:rounded-[40px] border border-indigo-100 shadow-inner-3d"
                  >
                    <div className="flex items-center gap-2 text-indigo-600 font-black">
                      <Info size={14} className="md:w-4.5 md:h-4.5" fill="currentColor" />
                      <h3 className="uppercase tracking-[0.2em] text-[8px] md:text-[10px]">Grammar Insights</h3>
                    </div>
                    <p className="text-lg md:text-2xl font-black text-indigo-900 leading-tight">{details.extraInfo}</p>
                  </motion.div>
                )}
              </div>

              {/* Example Section */}
              <div className="space-y-4 md:space-y-8">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="h-px flex-1 bg-gray-100" />
                  <p className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Contexto & Uso</p>
                  <div className="h-px flex-1 bg-gray-100" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
                  <div className="space-y-3 md:space-y-4">
                    <div className="p-6 md:p-10 bg-gray-900 rounded-2xl md:rounded-[48px] text-white relative group shadow-2xl overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 md:p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                        <MessageSquare size={40} className="md:w-20 md:h-20" />
                      </div>
                      <p className="text-lg md:text-2xl font-bold italic leading-relaxed relative z-10">"{details.example}"</p>
                    </div>
                  </div>
                  <div className="space-y-3 md:space-y-4">
                    <div className="p-6 md:p-10 bg-white rounded-2xl md:rounded-[48px] text-gray-600 border border-gray-100 shadow-xl flex items-center">
                      <p className="text-lg md:text-2xl font-medium leading-relaxed">{details.exampleTranslation}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Audio Section */}
              <div className="pt-4 md:pt-10">
                <div className="glass p-6 md:p-10 rounded-2xl md:rounded-[48px] flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
                  <div className="text-center md:text-left space-y-1 md:space-y-2">
                    <h4 className="text-lg md:text-2xl font-black text-gray-900">Pronto para ouvir?</h4>
                    <p className="text-xs md:text-base text-gray-500 font-medium">Pratique a escuta com a voz selecionada.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row justify-center gap-3 md:gap-4 w-full md:w-auto">
                    <button
                      onClick={() => playAudio(details.word)}
                      disabled={audioLoading}
                      className="btn-3d flex items-center justify-center gap-2 md:gap-3 px-6 md:px-10 py-3.5 md:py-5 bg-indigo-600 text-white group w-full sm:w-auto"
                    >
                      {audioLoading ? <Loader2 className="animate-spin" size={18} /> : <Volume2 size={18} className="group-hover:scale-110 transition-transform md:w-6 md:h-6" />}
                      <span className="text-sm md:text-lg">Ouvir Palavra</span>
                    </button>
                    <button
                      onClick={() => playAudio(details.example)}
                      disabled={audioLoading}
                      className="btn-3d flex items-center justify-center gap-2 md:gap-3 px-6 md:px-10 py-3.5 md:py-5 bg-white text-gray-900 border border-gray-100 group w-full sm:w-auto"
                    >
                      {audioLoading ? <Loader2 className="animate-spin" size={18} /> : <Volume2 size={18} className="group-hover:scale-110 transition-transform md:w-6 md:h-6" />}
                      <span className="text-sm md:text-lg">Ouvir Frase</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!details && !loading && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 pt-8 md:pt-12"
        >
          {[
            { icon: Volume2, title: 'Áudio Natural', desc: 'Ouça a pronúncia em inglês americano de forma clara e lenta.', color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { icon: Star, title: 'Pronúncia Facilitada', desc: 'Escrita adaptada para o jeito que brasileiros falam.', color: 'text-orange-600', bg: 'bg-orange-50' },
            { icon: Book, title: 'Gramática Simples', desc: 'Entenda a classe gramatical e variações da palavra.', color: 'text-purple-600', bg: 'bg-purple-50' },
          ].map((feature, i) => (
            <motion.div 
              key={i}
              whileHover={{ y: -10 }}
              className="p-8 md:p-10 bg-white/50 backdrop-blur-sm rounded-[32px] md:rounded-[40px] border border-white/50 shadow-xl space-y-4 md:space-y-6 text-center group"
            >
              <div className={`w-16 h-16 md:w-20 md:h-20 ${feature.bg} ${feature.color} rounded-2xl md:rounded-3xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-500 shadow-lg`}>
                <feature.icon size={28} className="md:w-8 md:h-8" />
              </div>
              <div className="space-y-1 md:space-y-2">
                <h4 className="text-lg md:text-xl font-black tracking-tight text-gray-900">{feature.title}</h4>
                <p className="text-sm md:text-base text-gray-500 leading-relaxed font-medium">{feature.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
