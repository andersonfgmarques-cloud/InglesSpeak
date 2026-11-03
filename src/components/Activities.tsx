import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  Gamepad2, 
  Volume2, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  RotateCcw, 
  Star,
  Brain,
  Music,
  Layout,
  ChevronLeft,
  Sparkles,
  Award,
  Play
} from 'lucide-react';
import { DICTIONARY_WORDS } from '../data/dictionaryData';
import { DictionaryWord } from '../types';

type ActivityType = 'word-match' | 'listening' | 'scramble' | null;

interface ActivitiesProps {
  onComplete: (xp: number) => void;
}

export default function Activities({ onComplete }: ActivitiesProps) {
  const [activeActivity, setActiveActivity] = useState<ActivityType>(null);
  const [score, setScore] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; message: string } | null>(null);

  // Activity State: Word Match
  const [enOptions, setEnOptions] = useState<{ id: string; text: string; status: 'idle' | 'selected' | 'matched' | 'error' }[]>([]);
  const [ptOptions, setPtOptions] = useState<{ id: string; text: string; status: 'idle' | 'selected' | 'matched' | 'error' }[]>([]);
  const [selectedEn, setSelectedEn] = useState<string | null>(null);
  const [selectedPt, setSelectedPt] = useState<string | null>(null);
  const [matchedCount, setMatchedCount] = useState(0);

  // Activity State: Listening & Multiple Choice
  const [options, setOptions] = useState<string[]>([]);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [currentWord, setCurrentWord] = useState<DictionaryWord | null>(null);

  // Activity State: Scramble
  const [scrambledWords, setScrambledWords] = useState<{ word: string; id: number; isUsed: boolean }[]>([]);
  const [assembledSentence, setAssembledSentence] = useState<{ word: string; id: number }[]>([]);
  const [hasListened, setHasListened] = useState(false);

  const totalSteps = 10;

  const startActivity = (type: ActivityType) => {
    setActiveActivity(type);
    setScore(0);
    setCurrentStep(0);
    setIsFinished(false);
    setXpEarned(0);
    setFeedback(null);
    setupStep(type, 0);
  };

  const setupStep = (type: ActivityType, step: number) => {
    setFeedback(null);
    setHasListened(false);
    
    // Get random words for the activity
    const shuffled = [...DICTIONARY_WORDS].sort(() => 0.5 - Math.random());
    const word = shuffled[0];
    setCurrentWord(word);

    if (type === 'word-match') {
      const selectedWords = shuffled.slice(0, 4);
      const en = selectedWords.map(w => ({ id: w.id, text: w.english, status: 'idle' as const })).sort(() => 0.5 - Math.random());
      const pt = selectedWords.map(w => ({ id: w.id, text: w.translation, status: 'idle' as const })).sort(() => 0.5 - Math.random());
      setEnOptions(en);
      setPtOptions(pt);
      setSelectedEn(null);
      setSelectedPt(null);
      setMatchedCount(0);
    } else if (type === 'listening') {
      const distractors = shuffled.slice(1, 4).map(w => w.translation);
      const allOptions = [...distractors, word.translation].sort(() => 0.5 - Math.random());
      setOptions(allOptions);
      setCorrectAnswer(word.translation);
    } else if (type === 'scramble') {
      const sentence = word.example.replace(/[.!?]/g, '');
      const words = sentence.split(' ').map((w, i) => ({ word: w, id: i, isUsed: false }));
      setScrambledWords([...words].sort(() => 0.5 - Math.random()));
      setAssembledSentence([]);
    }
  };

  const handleAnswer = (isCorrect: boolean) => {
    if (isCorrect) {
      setScore(prev => prev + 1);
      setFeedback({ isCorrect: true, message: 'Excelente! Você acertou.' });
    } else {
      setFeedback({ isCorrect: false, message: 'Não foi dessa vez. Continue tentando!' });
    }

    if (activeActivity === 'scramble' && isCorrect) {
      return;
    }

    setTimeout(nextStep, 1500);
  };

  const nextStep = () => {
    if (currentStep + 1 < totalSteps) {
      setCurrentStep(prev => prev + 1);
      setupStep(activeActivity, currentStep + 1);
    } else {
      finishActivity();
    }
  };

  const finishActivity = () => {
    const finalXp = score * 20 + (score === totalSteps ? 50 : 0);
    setXpEarned(finalXp);
    setIsFinished(true);
    onComplete(finalXp);
  };

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  // Word Match Logic
  const handleMatchClick = (id: string, type: 'en' | 'pt') => {
    if (feedback) return;

    if (type === 'en') {
      if (enOptions.find(o => o.id === id)?.status === 'matched') return;
      setSelectedEn(id === selectedEn ? null : id);
      checkMatch(id, selectedPt);
    } else {
      if (ptOptions.find(o => o.id === id)?.status === 'matched') return;
      setSelectedPt(id === selectedPt ? null : id);
      checkMatch(selectedEn, id);
    }
  };

  const checkMatch = (enId: string | null, ptId: string | null) => {
    if (!enId || !ptId) return;

    if (enId === ptId) {
      // Correct match
      setEnOptions(prev => prev.map(o => o.id === enId ? { ...o, status: 'matched' } : o));
      setPtOptions(prev => prev.map(o => o.id === ptId ? { ...o, status: 'matched' } : o));
      setSelectedEn(null);
      setSelectedPt(null);
      
      const newMatchedCount = matchedCount + 1;
      setMatchedCount(newMatchedCount);

      if (newMatchedCount === 4) {
        handleAnswer(true);
      }
    } else {
      // Wrong match
      setEnOptions(prev => prev.map(o => o.id === enId ? { ...o, status: 'error' } : o));
      setPtOptions(prev => prev.map(o => o.id === ptId ? { ...o, status: 'error' } : o));
      
      setTimeout(() => {
        setEnOptions(prev => prev.map(o => o.status === 'error' ? { ...o, status: 'idle' } : o));
        setPtOptions(prev => prev.map(o => o.status === 'error' ? { ...o, status: 'idle' } : o));
        setSelectedEn(null);
        setSelectedPt(null);
      }, 500);
    }
  };

  // Scramble Logic
  const toggleScrambleWord = (wordObj: { word: string; id: number }) => {
    if (feedback) return;

    const isUsed = assembledSentence.some(w => w.id === wordObj.id);
    
    if (isUsed) {
      setAssembledSentence(prev => prev.filter(w => w.id !== wordObj.id));
      setScrambledWords(prev => prev.map(w => w.id === wordObj.id ? { ...w, isUsed: false } : w));
    } else {
      setAssembledSentence(prev => [...prev, wordObj]);
      setScrambledWords(prev => prev.map(w => w.id === wordObj.id ? { ...w, isUsed: true } : w));
    }
  };

  const checkScramble = () => {
    const current = assembledSentence.map(w => w.word).join(' ');
    const target = currentWord!.example.replace(/[.!?]/g, '');
    handleAnswer(current.toLowerCase() === target.toLowerCase());
  };

  if (isFinished) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto text-center space-y-8 py-12"
      >
        <div className="relative inline-block">
          <div className="w-32 h-32 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mx-auto shadow-2xl shadow-amber-200/50">
            <Trophy size={64} />
          </div>
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: 'spring' }}
            className="absolute -top-2 -right-2 w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white border-4 border-white shadow-lg"
          >
            <Star size={24} fill="currentColor" />
          </motion.div>
        </div>

        <div className="space-y-2">
          <h2 className="text-4xl font-black text-gray-900 tracking-tight">Atividade Concluída!</h2>
          <p className="text-gray-500 font-medium">Você mandou muito bem na sua prática de hoje.</p>
        </div>

        <div className="grid grid-cols-2 gap-6 max-w-md mx-auto">
          <div className="bg-white p-6 rounded-[32px] shadow-xl border border-gray-100">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Pontuação</p>
            <p className="text-3xl font-black text-indigo-600">{score} / {totalSteps}</p>
          </div>
          <div className="bg-white p-6 rounded-[32px] shadow-xl border border-gray-100">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">XP Ganho</p>
            <p className="text-3xl font-black text-emerald-600">+{xpEarned}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button 
            onClick={() => {
              setActiveActivity(null);
              setIsFinished(false);
            }}
            className="w-full sm:w-auto px-10 py-4 bg-indigo-600 text-white rounded-[24px] font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all"
          >
            Voltar ao Menu
          </button>
          <button 
            onClick={() => startActivity(activeActivity)}
            className="w-full sm:w-auto px-10 py-4 bg-white text-gray-600 border border-gray-100 rounded-[24px] font-black text-sm uppercase tracking-widest shadow-xl hover:bg-gray-50 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw size={18} />
            Tentar Novamente
          </button>
        </div>
      </motion.div>
    );
  }

  if (activeActivity === 'word-match') {
    return (
      <div className="max-w-4xl mx-auto space-y-8 py-8">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setActiveActivity(null)}
            className="flex items-center gap-2 text-gray-400 hover:text-indigo-600 font-black text-[10px] uppercase tracking-widest transition-colors"
          >
            <ChevronLeft size={16} />
            Sair da Atividade
          </button>
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-indigo-50 rounded-full text-indigo-600 text-[10px] font-black uppercase tracking-widest">
              Questão {currentStep + 1} / {totalSteps}
            </div>
            <div className="px-4 py-2 bg-amber-50 rounded-full text-amber-600 text-[10px] font-black uppercase tracking-widest">
              Score: {score}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-[48px] shadow-3d border border-gray-100 dark:border-gray-700 p-8 md:p-12 space-y-12">
          <div className="text-center space-y-4">
            <h3 className="text-xl font-black text-gray-400 uppercase tracking-widest">Combinação Rápida</h3>
            <p className="text-gray-500 font-medium">Relacione as palavras em inglês com suas traduções.</p>
          </div>

          <div className="grid grid-cols-2 gap-8 max-w-2xl mx-auto">
            <div className="space-y-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center mb-6">Inglês</p>
              {enOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleMatchClick(opt.id, 'en')}
                  className={`w-full p-6 rounded-3xl font-bold text-lg transition-all border-2 ${
                    opt.status === 'matched'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 opacity-50 cursor-default'
                      : opt.status === 'error'
                      ? 'bg-rose-50 border-rose-500 text-rose-700'
                      : selectedEn === opt.id
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl scale-105'
                      : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-indigo-600'
                  }`}
                >
                  {opt.text}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center mb-6">Tradução</p>
              {ptOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleMatchClick(opt.id, 'pt')}
                  className={`w-full p-6 rounded-3xl font-bold text-lg transition-all border-2 ${
                    opt.status === 'matched'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 opacity-50 cursor-default'
                      : opt.status === 'error'
                      ? 'bg-rose-50 border-rose-500 text-rose-700'
                      : selectedPt === opt.id
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl scale-105'
                      : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-indigo-600'
                  }`}
                >
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {feedback && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className={`p-6 rounded-[32px] flex items-center gap-4 border-2 ${
                feedback.isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}
            >
              {feedback.isCorrect ? <CheckCircle2 size={32} /> : <XCircle size={32} />}
              <div>
                <p className="font-black text-lg">{feedback.isCorrect ? 'Excelente!' : 'Ops!'}</p>
                <p className="text-sm font-medium opacity-80">{feedback.message}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (activeActivity === 'listening') {
    return (
      <div className="max-w-3xl mx-auto space-y-8 py-8">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setActiveActivity(null)}
            className="flex items-center gap-2 text-gray-400 hover:text-indigo-600 font-black text-[10px] uppercase tracking-widest transition-colors"
          >
            <ChevronLeft size={16} />
            Sair da Atividade
          </button>
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-indigo-50 rounded-full text-indigo-600 text-[10px] font-black uppercase tracking-widest">
              Questão {currentStep + 1} / {totalSteps}
            </div>
            <div className="px-4 py-2 bg-amber-50 rounded-full text-amber-600 text-[10px] font-black uppercase tracking-widest">
              Score: {score}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-[48px] shadow-3d border border-gray-100 dark:border-gray-700 p-12 text-center space-y-12">
          <div className="space-y-4">
            <h3 className="text-xl font-black text-gray-400 uppercase tracking-widest">Ouça e Escolha</h3>
            <p className="text-gray-500 font-medium">Qual é a tradução correta para a palavra que você ouviu?</p>
          </div>

          <button 
            onClick={() => speak(currentWord!.english)}
            className="w-32 h-32 bg-indigo-600 text-white rounded-[40px] flex items-center justify-center mx-auto shadow-2xl shadow-indigo-600/30 hover:scale-110 active:scale-95 transition-all group"
          >
            <Volume2 size={48} className="group-hover:animate-pulse" />
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
            {options.map((option, i) => (
              <button
                key={i}
                disabled={!!feedback}
                onClick={() => handleAnswer(option === correctAnswer)}
                className={`p-6 rounded-[32px] font-bold text-lg transition-all border-2 ${
                  feedback 
                    ? option === correctAnswer 
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700' 
                      : 'bg-gray-50 border-gray-200 text-gray-400 opacity-50'
                    : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-indigo-600 hover:shadow-xl active:scale-95'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence>
          {feedback && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className={`p-6 rounded-[32px] flex items-center gap-4 border-2 ${
                feedback.isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}
            >
              {feedback.isCorrect ? <CheckCircle2 size={32} /> : <XCircle size={32} />}
              <div>
                <p className="font-black text-lg">{feedback.isCorrect ? 'Incrível!' : 'Quase lá!'}</p>
                <p className="text-sm font-medium opacity-80">{feedback.message}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (activeActivity === 'scramble') {
    return (
      <div className="max-w-4xl mx-auto space-y-8 py-8">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setActiveActivity(null)}
            className="flex items-center gap-2 text-gray-400 hover:text-indigo-600 font-black text-[10px] uppercase tracking-widest transition-colors"
          >
            <ChevronLeft size={16} />
            Sair da Atividade
          </button>
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-indigo-50 rounded-full text-indigo-600 text-[10px] font-black uppercase tracking-widest">
              Questão {currentStep + 1} / {totalSteps}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-[48px] shadow-3d border border-gray-100 dark:border-gray-700 p-8 md:p-12 space-y-12">
          <div className="text-center space-y-4">
            <h3 className="text-xl font-black text-gray-400 uppercase tracking-widest">Construa a Frase</h3>
            <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-[32px] inline-block">
              <p className="text-2xl font-black text-indigo-600 italic">"{currentWord?.translation}"</p>
              <p className="text-sm text-gray-500 font-medium mt-2">{currentWord?.exampleTranslation}</p>
            </div>
          </div>

          <div className="min-h-[120px] p-8 bg-gray-50 dark:bg-gray-900 rounded-[40px] border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-center gap-3">
            {assembledSentence.map((wordObj, i) => (
              <motion.button
                layoutId={`word-${wordObj.id}`}
                key={wordObj.id}
                onClick={() => toggleScrambleWord(wordObj)}
                className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:bg-indigo-700 transition-colors"
              >
                {wordObj.word}
              </motion.button>
            ))}
            {assembledSentence.length === 0 && (
              <p className="text-gray-300 font-black uppercase tracking-widest text-sm">Toque nas palavras abaixo para montar a frase</p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {scrambledWords.map((wordObj) => (
              <motion.button
                layoutId={`word-${wordObj.id}`}
                key={wordObj.id}
                disabled={wordObj.isUsed || !!feedback}
                onClick={() => toggleScrambleWord(wordObj)}
                className={`px-6 py-3 rounded-2xl font-bold text-lg transition-all ${
                  wordObj.isUsed 
                    ? 'bg-gray-100 text-transparent border-transparent' 
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-white border-2 border-gray-100 dark:border-gray-600 shadow-md hover:border-indigo-600 hover:shadow-xl active:scale-95'
                }`}
              >
                {wordObj.word}
              </motion.button>
            ))}
          </div>

          <div className="flex justify-center pt-4">
            <button 
              disabled={assembledSentence.length === 0 || !!feedback}
              onClick={checkScramble}
              className="px-12 py-5 bg-indigo-600 text-white rounded-[32px] font-black text-sm uppercase tracking-widest shadow-2xl shadow-indigo-600/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
            >
              Verificar Resposta
            </button>
          </div>
        </div>

        <AnimatePresence>
          {feedback && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`p-8 rounded-[40px] flex items-center justify-between border-2 ${
                feedback.isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}
            >
              <div className="flex items-center gap-6">
                <div className={`w-16 h-16 rounded-3xl flex items-center justify-center ${
                  feedback.isCorrect ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                }`}>
                  {feedback.isCorrect ? <CheckCircle2 size={32} /> : <XCircle size={32} />}
                </div>
                <div>
                  <p className="font-black text-2xl">{feedback.isCorrect ? 'Perfeito!' : 'Ops!'}</p>
                  <p className="font-medium opacity-80">{feedback.message}</p>
                </div>
              </div>
              {feedback.isCorrect && (
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => {
                      speak(currentWord!.example);
                      setHasListened(true);
                    }}
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg hover:scale-110 transition-all ${
                      hasListened ? 'bg-emerald-500 text-white' : 'bg-white text-emerald-600'
                    }`}
                  >
                    <Volume2 size={24} />
                  </button>
                  {hasListened && (
                    <button 
                      onClick={nextStep}
                      className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-all"
                    >
                      Próxima
                      <ArrowRight size={16} />
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-20 px-4 md:px-6">
      <header className="space-y-4 pt-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] border border-indigo-100/50 dark:border-indigo-800/30 backdrop-blur-sm">
          <Gamepad2 size={14} className="animate-bounce" />
          Prática Divertida
        </div>
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="space-y-3">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-gray-900 dark:text-white tracking-tighter font-display leading-[1.1]">
              Atividades de <br className="hidden md:block" />
              <span className="text-indigo-600 underline decoration-indigo-200/50 underline-offset-8">Fixação</span>
            </h1>
            <p className="text-base md:text-xl text-gray-500 dark:text-gray-400 max-w-3xl leading-relaxed font-medium">
              Transforme seu aprendizado em um jogo. Pratique vocabulário, audição e gramática de forma interativa.
            </p>
          </div>
          
          <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-[40px] shadow-xl border border-gray-100 dark:border-gray-700">
            <div className="w-16 h-16 bg-amber-50 rounded-3xl flex items-center justify-center text-amber-600">
              <Award size={32} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bônus de Hoje</p>
              <p className="text-xl font-black text-gray-900 dark:text-white">+50 XP Extra</p>
              <p className="text-[10px] text-emerald-600 font-bold uppercase">Disponível agora</p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[
          { 
            id: 'listening', 
            title: 'Desafio de Audição', 
            desc: 'Ouça a palavra e identifique sua tradução correta.', 
            icon: Music, 
            color: 'bg-indigo-500',
            difficulty: 'Fácil'
          },
          { 
            id: 'scramble', 
            title: 'Mestre das Frases', 
            desc: 'Reordene as palavras para formar frases perfeitas.', 
            icon: Layout, 
            color: 'bg-emerald-500',
            difficulty: 'Médio'
          },
          { 
            id: 'word-match', 
            title: 'Combinação Rápida', 
            desc: 'Relacione as palavras em inglês com suas traduções.', 
            icon: Brain, 
            color: 'bg-amber-500',
            difficulty: 'Fácil'
          }
        ].map((activity, i) => (
          <motion.div
            key={activity.id}
            whileHover={{ y: -10 }}
            className="bg-white dark:bg-gray-800 rounded-[48px] shadow-3d border border-gray-100 dark:border-gray-700 p-10 flex flex-col h-full group relative overflow-hidden"
          >
            <div className={`absolute top-0 right-0 w-32 h-32 ${activity.color} opacity-[0.03] -mr-16 -mt-16 rounded-full group-hover:scale-150 transition-transform duration-700`} />
            
            <div className="flex items-center justify-between mb-8">
              <div className={`w-16 h-16 ${activity.color} text-white rounded-3xl flex items-center justify-center shadow-lg shadow-current/20 group-hover:rotate-6 transition-transform`}>
                <activity.icon size={32} />
              </div>
              <span className={`text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest ${
                activity.difficulty === 'Fácil' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
              }`}>
                {activity.difficulty}
              </span>
            </div>

            <div className="space-y-3 flex-1">
              <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{activity.title}</h3>
              <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed">{activity.desc}</p>
            </div>

            <div className="mt-10">
              <button 
                onClick={() => startActivity(activity.id as ActivityType)}
                className={`w-full py-5 ${activity.color} text-white rounded-[24px] font-black text-xs uppercase tracking-widest shadow-lg shadow-current/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3`}
              >
                <Play size={16} fill="currentColor" />
                Começar Agora
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-indigo-600 rounded-[64px] p-12 md:p-20 text-center text-white relative overflow-hidden shadow-3d">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-10 left-10"><Star size={48} /></div>
          <div className="absolute bottom-10 right-10"><Sparkles size={64} /></div>
          <div className="absolute top-1/2 left-1/4"><Award size={32} /></div>
        </div>
        
        <div className="max-w-2xl mx-auto space-y-8 relative z-10">
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter italic">Desafio Semanal</h2>
          <p className="text-lg md:text-xl text-white/80 font-medium leading-relaxed">
            Complete 10 atividades nesta semana para desbloquear um emblema exclusivo e ganhar 500 XP de bônus!
          </p>
          <div className="pt-4">
            <div className="h-4 bg-white/20 rounded-full overflow-hidden p-1 max-w-md mx-auto">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '40%' }}
                className="h-full bg-white rounded-full shadow-lg"
              />
            </div>
            <p className="text-xs font-black uppercase tracking-[0.3em] mt-4 text-white/60">4 / 10 Atividades</p>
          </div>
        </div>
      </div>
    </div>
  );
}
