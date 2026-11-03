import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Volume2, 
  Star, 
  CheckCircle, 
  Filter, 
  ArrowUpDown, 
  BookOpen, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight,
  Play,
  Settings,
  Trophy
} from 'lucide-react';
import { DICTIONARY_WORDS } from '../data/dictionaryData';
import { DictionaryWord, UserWordProgress } from '../types';

const CATEGORIES = ['Todos', 'Verbo', 'Substantivo', 'Adjetivo', 'Advérbio', 'Preposição', 'Conjunção', 'Pronome', 'Outro'];

export default function Dictionary() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [sortBy, setSortBy] = useState<'frequency' | 'alphabetical'>('frequency');
  const [userProgress, setUserProgress] = useState<Record<string, UserWordProgress>>({});
  const [visibleCount, setVisibleCount] = useState(20);
  const observerTarget = useRef<HTMLDivElement>(null);
  const [isFlashcardMode, setIsFlashcardMode] = useState(false);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [showTranslationFirst, setShowTranslationFirst] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Load progress from localStorage on mount
  useEffect(() => {
    const savedProgress = localStorage.getItem('dictionary_progress');
    if (savedProgress) {
      setUserProgress(JSON.parse(savedProgress));
    }
  }, []);

  // Save progress to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('dictionary_progress', JSON.stringify(userProgress));
  }, [userProgress]);

  const filteredWords = useMemo(() => {
    let result = DICTIONARY_WORDS.filter(word => {
      const matchesSearch = word.english.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           word.translation.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'Todos' || word.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    if (sortBy === 'alphabetical') {
      result.sort((a, b) => a.english.localeCompare(b.english));
    } else {
      result.sort((a, b) => a.frequency - b.frequency);
    }

    return result;
  }, [searchQuery, selectedCategory, sortBy]);

  const visibleWords = useMemo(() => {
    return filteredWords.slice(0, visibleCount);
  }, [filteredWords, visibleCount]);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(20);
  }, [searchQuery, selectedCategory, sortBy]);

  // Intersection Observer for Lazy Loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < filteredWords.length) {
          setVisibleCount(prev => prev + 20);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
      observer.disconnect();
    };
  }, [visibleCount, filteredWords.length]);

  const learnedCount = (Object.values(userProgress) as UserWordProgress[]).filter(p => p.isLearned).length;
  const progressPercentage = (learnedCount / DICTIONARY_WORDS.length) * 100;

  const toggleLearned = (wordId: string) => {
    setUserProgress(prev => ({
      ...prev,
      [wordId]: {
        ...prev[wordId],
        wordId,
        isLearned: !prev[wordId]?.isLearned,
        reviewCount: prev[wordId]?.reviewCount || 0
      }
    }));
  };

  const toggleFavorite = (wordId: string) => {
    setUserProgress(prev => ({
      ...prev,
      [wordId]: {
        ...prev[wordId],
        wordId,
        isFavorite: !prev[wordId]?.isFavorite,
        reviewCount: prev[wordId]?.reviewCount || 0
      }
    }));
  };

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = playbackRate;
    window.speechSynthesis.speak(utterance);
  };

  const nextFlashcard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentFlashcardIndex(prev => (prev + 1) % filteredWords.length);
    }, 200);
  };

  const prevFlashcard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentFlashcardIndex(prev => (prev - 1 + filteredWords.length) % filteredWords.length);
    }, 200);
  };

  if (isFlashcardMode && filteredWords.length > 0) {
    const currentWord = filteredWords[currentFlashcardIndex];
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 min-h-[80vh] flex flex-col justify-center">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <button 
            onClick={() => setIsFlashcardMode(false)}
            className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors font-black text-xs uppercase tracking-widest"
          >
            <ChevronLeft size={18} />
            Voltar ao Dicionário
          </button>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white dark:bg-gray-800 p-1 rounded-full border border-gray-100 dark:border-gray-700 shadow-sm mr-2">
              {(['slow', 'normal', 'fast'] as const).map((speed) => (
                <button
                  key={speed}
                  onClick={() => setPlaybackRate(speed === 'slow' ? 0.6 : speed === 'normal' ? 1 : 1.4)}
                  className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest transition-all ${
                    (speed === 'slow' && playbackRate === 0.6) || 
                    (speed === 'normal' && playbackRate === 1) || 
                    (speed === 'fast' && playbackRate === 1.4)
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'text-gray-400 dark:text-gray-500 hover:text-indigo-600'
                  }`}
                >
                  {speed === 'slow' ? 'Lenta' : speed === 'normal' ? 'Normal' : 'Rápida'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 rounded-full text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-800/30">
              <Trophy size={12} />
              {currentFlashcardIndex + 1} / {filteredWords.length}
            </div>
            <button 
              onClick={() => setShowTranslationFirst(!showTranslationFirst)}
              className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${
                showTranslationFirst 
                  ? 'bg-indigo-600 text-white border-indigo-600' 
                  : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-gray-700'
              }`}
            >
              {showTranslationFirst ? 'Tradução Primeiro' : 'Inglês Primeiro'}
            </button>
          </div>
        </div>

        <div className="relative h-[350px] md:h-[450px] w-full perspective-1000">
          <motion.div
            className="w-full h-full relative preserve-3d cursor-pointer"
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
            onClick={() => setIsFlipped(!isFlipped)}
          >
            {/* Front */}
            <div className={`absolute inset-0 backface-hidden bg-white dark:bg-gray-800 rounded-[48px] shadow-3d border-2 border-indigo-100 dark:border-indigo-900/30 flex flex-col items-center justify-center p-8 md:p-12 text-center ${isFlipped ? 'pointer-events-none' : ''}`}>
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-6">
                {showTranslationFirst ? 'Tradução' : 'Inglês'}
              </span>
              <h2 className="text-4xl md:text-7xl font-black text-gray-900 dark:text-white tracking-tighter italic leading-tight">
                {showTranslationFirst ? currentWord.translation : currentWord.english}
              </h2>
              {!showTranslationFirst && (
                <p className="mt-6 text-lg md:text-2xl text-indigo-600/60 font-mono italic">[{currentWord.ipa}]</p>
              )}
              <div className="mt-12 flex flex-col items-center gap-2">
                <div className="w-12 h-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-full overflow-hidden">
                  <motion.div 
                    animate={{ x: [-20, 20] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                    className="w-6 h-full bg-indigo-600 rounded-full"
                  />
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Toque para virar</p>
              </div>
            </div>

            {/* Back */}
            <div className="absolute inset-0 backface-hidden bg-indigo-600 rounded-[48px] shadow-3d flex flex-col items-center justify-center p-8 md:p-12 text-center text-white rotate-y-180">
              <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.4em] mb-6">
                {showTranslationFirst ? 'Inglês' : 'Tradução'}
              </span>
              <h2 className="text-4xl md:text-7xl font-black tracking-tighter italic mb-6 leading-tight">
                {showTranslationFirst ? currentWord.english : currentWord.translation}
              </h2>
              <div className="space-y-8 w-full max-w-md">
                <div className="p-6 md:p-8 bg-white/10 rounded-[32px] backdrop-blur-md border border-white/20 relative group/flash-example">
                  <p className="text-base md:text-xl font-medium italic leading-relaxed">"{currentWord.example}"</p>
                  <p className="text-xs md:text-sm text-white/60 mt-4 font-bold uppercase tracking-wider">{currentWord.exampleTranslation}</p>
                  <button 
                    onClick={(e) => { e.stopPropagation(); speak(currentWord.example); }}
                    className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white/70 hover:text-white transition-all"
                    title="Ouvir Exemplo"
                  >
                    <Volume2 size={16} />
                  </button>
                </div>
                <div className="flex items-center justify-center gap-6">
                  <button 
                    onClick={(e) => { e.stopPropagation(); speak(currentWord.english); }}
                    className="w-16 h-16 bg-white text-indigo-600 rounded-[24px] flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all"
                  >
                    <Volume2 size={28} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleLearned(currentWord.id); }}
                    className={`w-16 h-16 rounded-[24px] flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all border-2 ${
                      userProgress[currentWord.id]?.isLearned 
                        ? 'bg-emerald-500 border-emerald-400 text-white' 
                        : 'bg-white/10 border-white/20 text-white'
                    }`}
                  >
                    <CheckCircle size={28} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="flex items-center justify-center gap-4 md:gap-8">
          <button 
            onClick={prevFlashcard}
            className="w-14 h-14 md:w-20 md:h-20 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-[28px] flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:shadow-xl transition-all active:scale-90"
          >
            <ChevronLeft size={28} />
          </button>
          <button 
            onClick={() => setIsFlipped(!isFlipped)}
            className="flex-1 max-w-[200px] py-4 md:py-6 bg-indigo-600 text-white rounded-[28px] font-black text-xs md:text-sm uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all"
          >
            {isFlipped ? 'Ver Frente' : 'Ver Verso'}
          </button>
          <button 
            onClick={nextFlashcard}
            className="w-14 h-14 md:w-20 md:h-20 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-[28px] flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:shadow-xl transition-all active:scale-90"
          >
            <ChevronRight size={28} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 md:space-y-12 pb-20 px-4 md:px-6">
      <header className="space-y-4 pt-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] border border-indigo-100/50 dark:border-indigo-800/30 backdrop-blur-sm">
          <BookOpen size={14} className="animate-pulse" />
          Dicionário Interativo
        </div>
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="space-y-3">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-gray-900 dark:text-white tracking-tighter font-display leading-[1.1]">
              As <span className="text-indigo-600">1.000</span> Palavras <br className="hidden md:block" />
              Mais <span className="text-indigo-600 underline decoration-indigo-200/50 underline-offset-8">Utilizadas</span>
            </h1>
            <p className="text-base md:text-xl text-gray-500 dark:text-gray-400 max-w-3xl leading-relaxed font-medium">
              Domine o vocabulário essencial do inglês com pronúncia nativa, exemplos práticos e sistema de memorização.
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-8 rounded-[48px] border border-gray-100 dark:border-gray-700 shadow-xl min-w-full lg:min-w-[320px] space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Seu Progresso</span>
              <span className="text-indigo-600 font-black text-lg">{learnedCount} / {DICTIONARY_WORDS.length}</span>
            </div>
            <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden p-1">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full shadow-lg"
              />
            </div>
            <button 
              onClick={() => setIsFlashcardMode(true)}
              className="w-full py-4 bg-indigo-600 text-white rounded-[24px] font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <RotateCcw size={16} />
              Revisar Flashcards
            </button>
          </div>
        </div>
      </header>

      <div className="sticky top-0 z-30 py-6 bg-[#f0f2f5]/80 dark:bg-gray-900/80 backdrop-blur-xl space-y-6">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={22} />
            <input 
              type="text"
              placeholder="Buscar palavra ou tradução..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-6 py-5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-[32px] shadow-lg focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold text-lg"
            />
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button 
              onClick={() => setSortBy(sortBy === 'frequency' ? 'alphabetical' : 'frequency')}
              className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-[32px] shadow-lg text-sm font-black text-gray-600 dark:text-gray-300 whitespace-nowrap hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <ArrowUpDown size={20} />
              {sortBy === 'frequency' ? 'Por Frequência' : 'Ordem Alfabética'}
            </button>
            <div className="w-full sm:w-auto flex items-center bg-white dark:bg-gray-800 p-1.5 rounded-[32px] border border-gray-100 dark:border-gray-700 shadow-lg">
              {(['slow', 'normal', 'fast'] as const).map((speed) => (
                <button
                  key={speed}
                  onClick={() => setPlaybackRate(speed === 'slow' ? 0.6 : speed === 'normal' ? 1 : 1.4)}
                  className={`flex-1 sm:flex-none px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                    (speed === 'slow' && playbackRate === 0.6) || 
                    (speed === 'normal' && playbackRate === 1) || 
                    (speed === 'fast' && playbackRate === 1.4)
                      ? 'bg-indigo-600 text-white shadow-lg' 
                      : 'text-gray-400 dark:text-gray-500 hover:text-indigo-600'
                  }`}
                >
                  {speed === 'slow' ? 'Lenta' : speed === 'normal' ? 'Normal' : 'Rápida'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
          {CATEGORIES.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-8 py-3 rounded-full text-xs font-black whitespace-nowrap transition-all ${
                selectedCategory === category 
                  ? 'bg-indigo-600 text-white shadow-xl scale-105' 
                  : 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-indigo-600 border border-gray-100 dark:border-gray-700'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6 md:space-y-0">
        {/* Desktop View (Table-like) */}
        <div className="hidden lg:block overflow-hidden bg-white dark:bg-gray-800 rounded-[48px] shadow-3d border border-gray-100/50 dark:border-gray-700/50">
          <div className="grid grid-cols-[1fr_1.5fr_1.5fr_2fr_120px] gap-4 px-10 py-6 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 text-[10px] font-black text-gray-400 uppercase tracking-widest">
            <span>Palavra</span>
            <span>Pronúncia</span>
            <span>Tradução</span>
            <span>Exemplo</span>
            <span className="text-center">Ações</span>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {visibleWords.map((word) => (
              <motion.div
                key={word.id}
                layout
                className="grid grid-cols-[1fr_1.5fr_1.5fr_2fr_120px] gap-4 px-10 py-8 items-center hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors group"
              >
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tighter italic group-hover:text-indigo-600 transition-colors">
                    {word.english}
                  </h3>
                  <span className="text-[9px] font-black text-indigo-600/60 uppercase tracking-widest">{word.category}</span>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-mono italic text-indigo-600/60">[{word.ipa}]</p>
                  <p className="text-[10px] text-gray-400 font-medium tracking-tight">({word.simplifiedPronunciation})</p>
                </div>
                <p className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                  {word.translation}
                </p>
                <div className="space-y-1 group/example relative">
                  <p className="text-sm font-medium italic text-gray-600 dark:text-gray-300 pr-8">"{word.example}"</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">{word.exampleTranslation}</p>
                  <button 
                    onClick={() => speak(word.example)}
                    className="absolute right-0 top-0 p-1.5 text-indigo-400 hover:text-indigo-600 opacity-0 group-hover/example:opacity-100 transition-all"
                    title="Ouvir Exemplo"
                  >
                    <Volume2 size={14} />
                  </button>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <button 
                    onClick={() => speak(word.english)}
                    className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                    title="Ouvir Palavra"
                  >
                    <Volume2 size={18} />
                  </button>
                  <button 
                    onClick={() => toggleFavorite(word.id)}
                    className={`p-2.5 rounded-xl transition-all ${
                      userProgress[word.id]?.isFavorite ? 'bg-amber-100 text-amber-600' : 'bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-amber-600'
                    }`}
                  >
                    <Star size={16} fill={userProgress[word.id]?.isFavorite ? 'currentColor' : 'none'} />
                  </button>
                  <button 
                    onClick={() => toggleLearned(word.id)}
                    className={`p-2.5 rounded-xl transition-all ${
                      userProgress[word.id]?.isLearned ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-emerald-600'
                    }`}
                  >
                    <CheckCircle size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Mobile/Tablet View (Card Grid) */}
        <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence mode="popLayout">
            {visibleWords.map((word, i) => (
              <motion.div
                key={word.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.01 }}
                className="bg-white dark:bg-gray-800 rounded-[40px] shadow-3d border border-gray-100/50 dark:border-gray-700/50 p-8 group relative overflow-hidden flex flex-col h-full hover:border-indigo-100 dark:hover:border-indigo-900/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-6 relative z-10">
                  <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-xl uppercase tracking-widest">
                    #{word.frequency} • {word.category}
                  </span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => toggleFavorite(word.id)}
                      className={`p-3 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition-all ${
                        userProgress[word.id]?.isFavorite ? 'bg-amber-100 text-amber-600' : 'bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-amber-600'
                      }`}
                    >
                      <Star size={20} fill={userProgress[word.id]?.isFavorite ? 'currentColor' : 'none'} />
                    </button>
                    <button 
                      onClick={() => toggleLearned(word.id)}
                      className={`p-3 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition-all ${
                        userProgress[word.id]?.isLearned ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-emerald-600'
                      }`}
                    >
                      <CheckCircle size={20} />
                    </button>
                  </div>
                </div>

                <div className="space-y-4 flex-1 relative z-10">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter italic">
                        {word.english}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs text-indigo-600/60 font-mono italic">[{word.ipa}]</span>
                        <span className="text-xs text-gray-400 font-medium tracking-tight">({word.simplifiedPronunciation})</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => speak(word.english)}
                      className="w-14 h-14 min-h-[44px] min-w-[44px] bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-sm"
                    >
                      <Volume2 size={24} />
                    </button>
                  </div>

                  <div className="pt-4 border-t border-gray-50 dark:border-gray-700/50">
                    <p className="text-xl font-bold text-gray-900 dark:text-white leading-tight mb-4">
                      {word.translation}
                    </p>
                    <div className="p-5 bg-gray-50 dark:bg-gray-800/50 rounded-2xl space-y-2">
                      <p className="text-sm font-medium italic text-gray-600 dark:text-gray-300 leading-relaxed">"{word.example}"</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{word.exampleTranslation}</p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => speak(word.example)}
                  className="mt-6 flex items-center gap-3 min-h-[44px] text-[11px] font-black text-indigo-600 uppercase tracking-widest hover:gap-4 transition-all"
                >
                  <Volume2 size={14} />
                  Ouvir Exemplo
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {filteredWords.length === 0 && (
        <div className="text-center py-32 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-[64px] border-2 border-dashed border-gray-200 dark:border-gray-700">
          <div className="w-24 h-24 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-8 text-gray-200 dark:text-gray-700">
            <Search size={48} />
          </div>
          <p className="text-gray-400 font-black text-2xl tracking-tight">Nenhuma palavra encontrada.</p>
          <p className="text-gray-400 font-medium mt-2">Tente buscar por outro termo ou categoria.</p>
        </div>
      )}

      {/* Intersection Observer Target */}
      <div ref={observerTarget} className="h-10 w-full" />
    </div>
  );
}
