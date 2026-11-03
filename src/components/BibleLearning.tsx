import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Book, 
  Volume2, 
  Mic, 
  ChevronRight, 
  ChevronLeft, 
  Star, 
  CheckCircle2, 
  Info, 
  Loader2, 
  Languages, 
  Heart, 
  Flame,
  Search,
  ArrowRight
} from 'lucide-react';
import { BIBLE_VERSES, BibleVerse } from '../data/bibleData';
import { generateTTS, analyzeSpeech, getWordDetails, SpeechFeedback, WordDetails } from '../lib/gemini';
import Recorder from './Recorder';
import FeedbackDisplay from './FeedbackDisplay';

const CATEGORIES = [
  'Todos', 'Faith', 'Hope', 'Courage', 'Wisdom', 'Gratitude', 'Family', 
  'Love', 'Peace', 'Joy', 'Patience', 'Kindness', 'Forgiveness', 'Humility', 
  'Strength', 'Healing', 'Protection', 'Guidance', 'Provision', 'Mercy', 
  'Grace', 'Truth', 'Justice', 'Perseverance', 'Comfort', 'Purpose', 'Victory'
];

export default function BibleLearning() {
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [isTraining, setIsTraining] = useState(false);
  const [feedback, setFeedback] = useState<SpeechFeedback | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [wordDetails, setWordDetails] = useState<Record<string, WordDetails>>({});
  const [loadingWord, setLoadingWord] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recorderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isTraining && recorderRef.current) {
      recorderRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isTraining]);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const filteredVerses = BIBLE_VERSES.filter(v => 
    selectedCategory === 'Todos' || v.category === selectedCategory
  );

  const currentVerse = filteredVerses[currentVerseIndex];

  useEffect(() => {
    // Load streak from localStorage
    const savedStreak = localStorage.getItem('bible_streak');
    if (savedStreak) setStreak(parseInt(savedStreak));
  }, []);

  const playVerseAudio = async () => {
    if (!currentVerse) return;
    setAudioLoading(true);
    try {
      // Create or resume AudioContext
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
      }
      
      const audioContext = audioContextRef.current;
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const base64Audio = await generateTTS(currentVerse.text, 'Kore', 'slow');
      
      const binaryString = window.atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const pcmData = new Int16Array(bytes.buffer, 0, Math.floor(bytes.byteLength / 2));
      const float32Data = new Float32Array(pcmData.length);
      for (let i = 0; i < pcmData.length; i++) {
        float32Data[i] = pcmData[i] / 32768.0;
      }

      const audioBuffer = audioContext.createBuffer(1, float32Data.length, 24000);
      audioBuffer.getChannelData(0).set(float32Data);

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();
    } catch (err) {
      console.error("Error playing audio:", err);
    } finally {
      setAudioLoading(false);
    }
  };

  const handleWordClick = async (word: string) => {
    if (wordDetails[word]) return;
    setLoadingWord(word);
    try {
      const details = await getWordDetails(word);
      setWordDetails(prev => ({ ...prev, [word]: details }));
    } catch (err) {
      console.error("Error fetching word details:", err);
    } finally {
      setLoadingWord(null);
    }
  };

  const nextVerse = () => {
    setFeedback(null);
    setIsTraining(false);
    setCurrentVerseIndex(prev => (prev + 1) % filteredVerses.length);
  };

  const prevVerse = () => {
    setFeedback(null);
    setIsTraining(false);
    setCurrentVerseIndex(prev => (prev - 1 + filteredVerses.length) % filteredVerses.length);
  };

  const handleAnalysisComplete = (newFeedback: SpeechFeedback) => {
    setFeedback(newFeedback);
    if (newFeedback.score >= 80) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      localStorage.setItem('bible_streak', newStreak.toString());
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 px-4">
      {/* Header */}
      <header className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 text-amber-600 text-[10px] font-black uppercase tracking-widest border border-amber-100">
            <Book size={14} />
            Inglês com a Bíblia
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest border border-rose-100 shadow-sm">
            <Flame size={14} className="animate-pulse" />
            Streak: {streak} Dias
          </div>
        </div>
        <h1 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tighter font-display">
          Versículo do <span className="text-amber-600">Dia</span>
        </h1>
      </header>

      {/* Categories */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => {
              setSelectedCategory(cat);
              setCurrentVerseIndex(0);
            }}
            className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
              selectedCategory === cat 
                ? 'bg-amber-600 text-white border-amber-600 shadow-lg' 
                : 'bg-white text-gray-400 border-gray-100 hover:text-amber-600'
            }`}
          >
            {cat === 'Todos' ? 'Todos' : 
             cat === 'Faith' ? 'Fé' :
             cat === 'Hope' ? 'Esperança' :
             cat === 'Courage' ? 'Coragem' :
             cat === 'Wisdom' ? 'Sabedoria' :
             cat === 'Gratitude' ? 'Gratidão' :
             cat === 'Family' ? 'Família' :
             cat === 'Love' ? 'Amor' :
             cat === 'Peace' ? 'Paz' :
             cat === 'Joy' ? 'Alegria' :
             cat === 'Patience' ? 'Paciência' :
             cat === 'Kindness' ? 'Bondade' :
             cat === 'Forgiveness' ? 'Perdão' :
             cat === 'Humility' ? 'Humildade' :
             cat === 'Strength' ? 'Força' :
             cat === 'Healing' ? 'Cura' :
             cat === 'Protection' ? 'Proteção' :
             cat === 'Guidance' ? 'Orientação' :
             cat === 'Provision' ? 'Provisão' :
             cat === 'Mercy' ? 'Misericórdia' :
             cat === 'Grace' ? 'Graça' :
             cat === 'Truth' ? 'Verdade' :
             cat === 'Justice' ? 'Justiça' :
             cat === 'Perseverance' ? 'Perseverança' :
             cat === 'Comfort' ? 'Conforto' :
             cat === 'Purpose' ? 'Propósito' : 'Vitória'}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {!feedback ? (
          <motion.div
            key={currentVerse?.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            {/* Main Verse Card */}
            <div className="card-3d !bg-white/90 backdrop-blur-xl p-8 md:p-12 space-y-8 border-white/50 shadow-2xl">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-amber-600 uppercase tracking-[0.3em]">{currentVerse?.reference}</span>
                <div className="flex gap-2">
                  <button onClick={prevVerse} className="p-2 hover:bg-gray-50 rounded-full transition-colors"><ChevronLeft size={20}/></button>
                  <button onClick={nextVerse} className="p-2 hover:bg-gray-50 rounded-full transition-colors"><ChevronRight size={20}/></button>
                </div>
              </div>

              <div className="space-y-6">
                <p className="text-3xl md:text-5xl font-black text-gray-900 leading-tight tracking-tight italic">
                  "{currentVerse?.text}"
                </p>
                
                <div className="p-6 bg-amber-50/50 rounded-3xl border border-amber-100/50 space-y-4">
                  <div className="flex items-center gap-2 text-amber-600">
                    <Languages size={18} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Pronúncia Facilitada</span>
                  </div>
                  <p className="text-xl font-bold text-amber-900 italic">
                    {currentVerse?.simplifiedPronunciation}
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tradução</span>
                  <p className="text-lg font-medium text-gray-600">{currentVerse?.translation}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  onClick={playVerseAudio}
                  disabled={audioLoading}
                  className="flex-1 btn-3d py-5 bg-white border-2 border-amber-600 text-amber-600 text-sm font-black flex items-center justify-center gap-3"
                >
                  {audioLoading ? <Loader2 className="animate-spin" /> : <Volume2 size={20} />}
                  Ouvir Pronúncia
                </button>
                <button
                  onClick={() => setIsTraining(true)}
                  className="flex-1 btn-3d py-5 bg-amber-600 text-white text-sm font-black shadow-xl shadow-amber-200 flex items-center justify-center gap-3"
                >
                  <Mic size={20} />
                  Treinar Pronúncia
                </button>
              </div>
            </div>

            {/* Word by Word Study */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-amber-600 rounded-full" />
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Estudo Palavra por Palavra</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {currentVerse?.keywords.map((word) => (
                  <motion.button
                    key={word}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleWordClick(word)}
                    className="p-6 bg-white rounded-[32px] border border-gray-100 shadow-sm text-left space-y-3 relative overflow-hidden group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-black text-gray-900 group-hover:text-amber-600 transition-colors">{word}</span>
                      {loadingWord === word ? (
                        <Loader2 size={16} className="animate-spin text-amber-600" />
                      ) : (
                        <ArrowRight size={16} className="text-gray-300 group-hover:text-amber-600 transition-all group-hover:translate-x-1" />
                      )}
                    </div>
                    
                    {wordDetails[word] ? (
                      <div className="space-y-2">
                        <p className="text-sm font-bold text-amber-600">{wordDetails[word].translation}</p>
                        <p className="text-[10px] text-gray-400 font-mono italic">[{wordDetails[word].ipa}]</p>
                      </div>
                    ) : (
                      <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Toque para ver detalhes</p>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>

            {isTraining && (
              <div className="pt-8 space-y-4" ref={recorderRef}>
                <div className="flex justify-end">
                  <button 
                    onClick={() => setIsTraining(false)}
                    className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-rose-500 transition-colors flex items-center gap-2"
                  >
                    Cancelar Treino
                  </button>
                </div>
                <Recorder 
                  targetSentence={currentVerse.text} 
                  onAnalysisComplete={handleAnalysisComplete} 
                />
              </div>
            )}
          </motion.div>
        ) : (
          <FeedbackDisplay 
            feedback={feedback} 
            targetSentence={currentVerse.text}
            onClose={() => { setFeedback(null); setIsTraining(false); }} 
            onRetry={() => setFeedback(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
