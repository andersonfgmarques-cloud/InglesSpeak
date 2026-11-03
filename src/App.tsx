import React, { useState, useEffect, useRef } from 'react';
import { Mic, BookOpen, History, Award, Settings, ChevronRight, Play, Star, TrendingUp, User, LogOut, LayoutDashboard, Sparkles, ArrowRight, ChevronLeft, Menu, Languages, Bot, Volume2, Loader2, Gamepad2, RotateCcw, Book } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy, addDoc, doc, getDoc } from 'firebase/firestore';
import { PRACTICE_SENTENCES, Sentence } from './lib/sentences';
import Recorder from './components/Recorder';
import FeedbackDisplay from './components/FeedbackDisplay';
import WordAssistant from './components/WordAssistant';
import Profile, { applyTheme } from './components/Profile';
import SimultaneousTranslation from './components/SimultaneousTranslation';
import AITutor from './components/AITutor';
import Dictionary from './components/Dictionary';
import Activities from './components/Activities';
import BibleLearning from './components/BibleLearning';
import Auth from './components/Auth';
import { SpeechFeedback, generateTTS } from './lib/gemini';

interface PracticeHistory {
  id: string;
  sentence: string;
  score: number;
  date: string;
}

const navItems = [
  { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
  { id: 'practice', label: 'Praticar', icon: Mic },
  { id: 'activities', label: 'Atividades', icon: Gamepad2 },
  { id: 'bible', label: 'Inglês com a Bíblia', icon: Book },
  { id: 'dictionary', label: 'Dicionário', icon: BookOpen },
  { id: 'tutor', label: 'Tutor IA', icon: Bot },
  { id: 'assistant', label: 'Assistente', icon: Sparkles },
  { id: 'translation', label: 'Tradução simultânea', icon: Languages },
  { id: 'history', label: 'Histórico', icon: History },
  { id: 'profile', label: 'Perfil', icon: User },
];

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  // Persist active tab to localStorage to maintain state across refreshes
  const [activeTab, setActiveTab] = useState<'dashboard' | 'practice' | 'history' | 'assistant' | 'profile' | 'translation' | 'tutor' | 'dictionary' | 'activities' | 'bible'>(() => {
    const saved = localStorage.getItem('speakfluent_active_tab');
    return (saved as any) || 'dashboard';
  });

  useEffect(() => {
    localStorage.setItem('speakfluent_active_tab', activeTab);
  }, [activeTab]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('speakfluent_sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('speakfluent_sidebar_collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('speakfluent_dark_mode');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    localStorage.setItem('speakfluent_dark_mode', String(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const vibrate = (pattern: number | number[] = 10) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };
  const [selectedSentence, setSelectedSentence] = useState<Sentence | null>(null);
  const [feedback, setFeedback] = useState<SpeechFeedback | null>(null);
  const [history, setHistory] = useState<PracticeHistory[]>([]);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [userName, setUserName] = useState('Anderson Marques');
  const [userStats, setUserStats] = useState({ streak: 0, xp: 0, level: 1 });
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [playingSentenceId, setPlayingSentenceId] = useState<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const categories = ['Todas', ...new Set(PRACTICE_SENTENCES.map(s => s.category))];

  const filteredSentences = PRACTICE_SENTENCES.filter(sentence => {
    const matchesCategory = selectedCategory === 'Todas' || sentence.category === selectedCategory;
    const matchesSearch = sentence.text.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         sentence.translation.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  useEffect(() => {
    // Safety timeout: if auth doesn't ready in 8 seconds, force it
    const timer = setTimeout(() => {
      if (!isAuthReady) {
        console.warn("Auth ready timeout reached. Forcing ready state.");
        setIsAuthReady(true);
      }
    }, 8000);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      clearTimeout(timer);
      setUser(currentUser);
      
      if (currentUser) {
        // Set basic info first
        setUserName(currentUser.displayName || 'Usuário');
        setProfileImage(currentUser.photoURL || null);
        
        // Then try to load extra info from Firestore in the background
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserName(data.name || currentUser.displayName || 'Usuário');
            setProfileImage(data.photoURL || currentUser.photoURL || null);
            setUserStats({
              streak: Number(data.streak ?? 0),
              xp: Number(data.xp ?? 0),
              // numericLevel guarda o nível de XP.
              // level continua reservado ao nível de proficiência do idioma.
              level: Number(
                data.numericLevel ??
                (typeof data.level === 'number' ? data.level : 1)
              )
            });
            if (data.themeColor) {
              applyTheme(data.themeColor);
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        // Reset state on logout
        setUserName('Usuário');
        setProfileImage(null);
        setUserStats({ streak: 0, xp: 0, level: 1 });
      }
      
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  // A permissão do microfone é solicitada somente quando o usuário
  // inicia uma funcionalidade de gravação ou reconhecimento de voz.

  useEffect(() => {
    if (!user) {
      setHistory([]);
      return;
    }

    const q = query(
      collection(db, 'history'),
      where('uid', '==', user.uid),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const historyData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PracticeHistory[];
      setHistory(historyData);
    }, (error) => {
      console.error("Firestore history error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const handleImageUpdate = () => {
      const updatedImage = localStorage.getItem('speakfluent_profile_image');
      setProfileImage(updatedImage);
    };

    window.addEventListener('profileImageUpdated', handleImageUpdate);
    
    const handleThemeUpdate = (e: any) => {
      if (e.detail) applyTheme(e.detail);
    };
    window.addEventListener('themeUpdated', handleThemeUpdate);

    return () => {
      window.removeEventListener('profileImageUpdated', handleImageUpdate);
      window.removeEventListener('themeUpdated', handleThemeUpdate);
    };
  }, []);

  const handleAnalysisComplete = async (newFeedback: SpeechFeedback) => {
    setFeedback(newFeedback);
    
    if (user) {
      try {
        // Update history
        await addDoc(collection(db, 'history'), {
          uid: user.uid,
          sentence: selectedSentence!.text,
          score: newFeedback.score,
          date: new Date().toISOString(),
        });

        // Update stats
        const xpGain = Math.round(newFeedback.score / 2);
        const newXp = userStats.xp + xpGain;
        const newLevel = Math.floor(newXp / 1000) + 1;
        
        // Simple streak logic: if last session was today, keep it. If yesterday, +1.
        // For simplicity, let's just increment it for now if it's a new day.
        const lastSessionDate = history.length > 0 ? new Date(history[0].date) : null;
        const today = new Date();
        let newStreak = userStats.streak;
        
        if (!lastSessionDate || lastSessionDate.toDateString() !== today.toDateString()) {
          newStreak += 1;
        }

        const updatedStats = {
          xp: newXp,
          level: newLevel,
          streak: newStreak
        };

        // O estado da interface usa "level"; no Firestore, o nível de XP
        // fica em "numericLevel", preservando "level" como proficiência.
        const firestoreStats = {
          xp: newXp,
          numericLevel: newLevel,
          streak: newStreak
        };

        setUserStats(updatedStats);

        // Save to Firestore
        const { updateDoc } = await import('firebase/firestore');
        await updateDoc(doc(db, 'users', user.uid), firestoreStats);

      } catch (error) {
        console.error("Error saving history or stats to Firestore:", error);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setActiveTab('dashboard');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleTutorSessionComplete = async (xpGain: number) => {
    if (!user || !Number.isFinite(xpGain) || xpGain <= 0) return;

    const newXp = userStats.xp + xpGain;
    const newLevel = Math.floor(newXp / 1000) + 1;

    const updatedStats = {
      xp: newXp,
      level: newLevel,
      streak: userStats.streak
    };

    const firestoreStats = {
      xp: newXp,
      numericLevel: newLevel,
      streak: userStats.streak
    };

    // Atualiza a interface sem executar operações assíncronas
    // dentro do atualizador de estado do React.
    setUserStats(updatedStats);

    try {
      const { updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'users', user.uid), firestoreStats);
    } catch (error) {
      console.error('Erro ao atualizar progresso do Tutor IA:', error);
    }
  };

  const playSentence = async (text: string, id: number) => {
    if (playingSentenceId) return;
    
    try {
      setPlayingSentenceId(id);
      
      // Create or resume AudioContext
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
      }
      
      const audioContext = audioContextRef.current;
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const base64Audio = await generateTTS(text, 'Kore', 'normal');
      
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
      
      source.onended = () => {
        setPlayingSentenceId(null);
      };
      
      source.start(0);

      // Safety timeout
      setTimeout(() => {
        setPlayingSentenceId(null);
      }, 10000);

    } catch (error) {
      console.error("Error playing sentence with Gemini TTS, falling back to Web Speech:", error);
      
      // Fallback to Web Speech API
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.onend = () => setPlayingSentenceId(null);
        utterance.onerror = () => setPlayingSentenceId(null);
        window.speechSynthesis.speak(utterance);
      } catch (fallbackError) {
        console.error("Web Speech API fallback failed:", fallbackError);
        setPlayingSentenceId(null);
      }
    }
  };

  const averageScore = history.length > 0 
    ? Math.round(history.reduce((acc, curr) => acc + curr.score, 0) / history.length) 
    : 0;

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'Fácil': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'Médio': return 'text-amber-600 bg-amber-50 border-amber-100';
      case 'Difícil': return 'text-rose-600 bg-rose-50 border-rose-100';
      default: return 'text-gray-600 bg-gray-50 border-gray-100';
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f0f2f5] p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center gap-6 text-center"
        >
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-primary/20 rotate-3 animate-bounce">
            <Mic size={32} />
          </div>
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-3xl font-black tracking-tighter font-display text-gray-900">Speak<span className="text-primary">Fluent</span></h1>
            <div className="flex items-center gap-2 text-gray-400 font-bold text-xs uppercase tracking-widest">
              <Loader2 size={14} className="animate-spin" />
              Carregando sua jornada...
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 5 }}
            className="mt-8 flex flex-col items-center gap-4"
          >
            <p className="text-sm text-gray-500 max-w-xs">
              Está demorando mais que o esperado? Tente iniciar manualmente.
            </p>
            <button
              onClick={() => setIsAuthReady(true)}
              className="px-6 py-2 bg-white border border-gray-200 rounded-full text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
            >
              Iniciar Manualmente
            </button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return <Auth onAuthComplete={() => setActiveTab('dashboard')} />;
  }

  return (
    <div key={user.uid} className="min-h-screen flex flex-col lg:flex-row bg-[#f0f2f5] overflow-x-hidden transition-colors duration-500">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-[60] glass border-b border-white/20 px-6 py-4 flex items-center justify-between backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20 rotate-3">
            <Mic size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black text-gray-900 dark:text-white tracking-tighter leading-none">Speak<span className="text-primary">Fluent</span></span>
            <span className="text-[8px] font-black text-primary/60 uppercase tracking-[0.2em]">Master English</span>
          </div>
        </div>
        <button 
          onClick={() => setActiveTab('profile')}
          className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center justify-center text-gray-500 shadow-sm overflow-hidden"
        >
          {profileImage ? (
            <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <User size={20} />
          )}
        </button>
      </header>

      {/* Sidebar */}
      <motion.nav 
        initial={false}
        animate={{ 
          width: isSidebarCollapsed ? 100 : 320,
          padding: isSidebarCollapsed ? "2rem 1rem" : "2rem"
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        style={{
          backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0.92)), url('https://images.unsplash.com/photo-1508433957232-3107f5fd5995?q=80&w=2070&auto=format&fit=crop')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
        className="hidden lg:flex glass h-screen sticky top-0 z-50 flex-col gap-10 border-r border-white/20 relative group"
      >
        {/* Toggle Button */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-4 top-10 w-8 h-8 bg-white border border-gray-100 rounded-full flex items-center justify-center text-primary shadow-xl hover:scale-110 transition-transform z-50"
        >
          {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={`flex items-center gap-4 ${isSidebarCollapsed ? 'justify-center px-0' : 'px-2'}`}
        >
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-dark rounded-2xl flex-shrink-0 flex items-center justify-center text-white shadow-2xl shadow-primary/20 rotate-3">
            <Mic size={28} />
          </div>
          {!isSidebarCollapsed && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col whitespace-nowrap"
            >
              <span className="text-2xl font-black tracking-tighter font-display leading-none text-gray-900">Speak<span className="text-primary">Fluent</span></span>
              <span className="text-[10px] font-black text-primary/60 uppercase tracking-[0.3em]">Master English</span>
            </motion.div>
          )}
        </motion.div>

        <div className="flex flex-col gap-3">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`group relative flex items-center gap-4 rounded-[24px] font-bold transition-all duration-300 ${
                isSidebarCollapsed ? 'justify-center p-4' : 'px-6 py-4'
              } ${
                activeTab === item.id 
                  ? 'bg-primary text-white shadow-2xl shadow-primary/20 translate-x-2' 
                  : 'text-gray-500 hover:bg-white/60 hover:text-primary hover:shadow-lg hover:backdrop-blur-md'
              }`}
            >
              <item.icon size={22} className={activeTab === item.id ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'} />
              {!isSidebarCollapsed && (
                <motion.span 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="tracking-tight whitespace-nowrap"
                >
                  {item.label}
                </motion.span>
              )}
              {activeTab === item.id && (
                <motion.div 
                  layoutId="nav-active"
                  className="absolute left-0 w-1.5 h-6 bg-white rounded-full -translate-x-1"
                />
              )}
            </button>
          ))}
        </div>

        <div className="mt-auto space-y-8">
          {!isSidebarCollapsed && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 bg-white/50 backdrop-blur-md rounded-[32px] border border-white/50 shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <span>Meta Diária</span>
                <span className="text-primary">{history.filter(h => new Date(h.date).toDateString() === new Date().toDateString()).length}/5</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden p-0.5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((history.filter(h => new Date(h.date).toDateString() === new Date().toDateString()).length / 5) * 100, 100)}%` }}
                  className="h-full bg-gradient-to-r from-primary to-primary-dark rounded-full shadow-lg"
                />
              </div>
              <p className="text-[10px] text-center text-gray-400 font-medium">Você está quase lá! Continue assim.</p>
            </motion.div>
          )}
          
          <button 
            onClick={() => {
              setIsDarkMode(!isDarkMode);
              vibrate(5);
            }}
            className={`flex items-center gap-4 py-4 w-full text-left transition-all duration-300 rounded-2xl hover:bg-white/50 dark:hover:bg-gray-800 ${isSidebarCollapsed ? 'justify-center px-0' : 'px-6'}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isDarkMode ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
              {isDarkMode ? <Sparkles size={20} /> : <Bot size={20} />}
            </div>
            {!isSidebarCollapsed && (
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                {isDarkMode ? 'Modo Claro' : 'Modo Escuro'}
              </span>
            )}
          </button>

          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-4 py-2 w-full text-left transition-all duration-300 rounded-2xl ${
              activeTab === 'profile' ? 'bg-primary-light shadow-inner' : 'hover:bg-white/50'
            } ${isSidebarCollapsed ? 'justify-center px-0' : 'px-2'}`}
          >
            <div className="relative flex-shrink-0">
              <div className={`w-12 h-12 bg-gradient-to-tr from-primary-light to-white rounded-2xl flex items-center justify-center text-primary border border-primary-light shadow-inner overflow-hidden transition-transform ${activeTab === 'profile' ? 'scale-110' : ''}`}>
                {profileImage ? (
                  <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User size={24} />
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            {!isSidebarCollapsed && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex-1 min-w-0"
              >
                <p className="text-sm font-black text-gray-900 truncate">{userName}</p>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest">Membro Pro</p>
                </div>
              </motion.div>
            )}
          </button>
        </div>
      </motion.nav>

      {/* Mobile Nav - REMOVED redundant top nav */}

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] lg:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{
                backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.95)), url('https://images.unsplash.com/photo-1508433957232-3107f5fd5995?q=80&w=2070&auto=format&fit=crop')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
              className="fixed inset-y-0 left-0 w-[85%] max-w-sm glass z-[70] lg:hidden p-6 flex flex-col gap-8 shadow-2xl dark:bg-gray-900"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg rotate-3">
                    <Mic size={24} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xl font-black tracking-tighter font-display leading-none text-gray-900 dark:text-white">Speak<span className="text-primary">Fluent</span></span>
                    <span className="text-[8px] font-black text-primary/60 uppercase tracking-[0.3em]">Master English</span>
                  </div>
                </div>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-3 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-primary transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>
              </div>

              <div className="flex flex-col gap-2 overflow-y-auto no-scrollbar">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as any);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`group relative flex items-center gap-4 px-6 py-4 min-h-[56px] rounded-[20px] font-bold transition-all duration-300 ${
                      activeTab === item.id 
                        ? 'bg-primary text-white shadow-xl shadow-primary/20' 
                        : 'text-gray-500 hover:bg-primary-light hover:text-primary dark:text-gray-400 dark:hover:bg-gray-800'
                    }`}
                  >
                    <item.icon size={22} />
                    <span className="tracking-tight">{item.label}</span>
                  </button>
                ))}
              </div>

              <div className="mt-auto pt-6 border-t border-gray-100 dark:border-gray-800 space-y-6">
                <div className="flex items-center justify-between px-2">
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Modo Escuro</span>
                  <button 
                    onClick={() => {
                      setIsDarkMode(!isDarkMode);
                      vibrate(5);
                    }}
                    className={`w-12 h-6 rounded-full transition-all relative ${isDarkMode ? 'bg-primary' : 'bg-gray-300'}`}
                  >
                    <motion.div 
                      animate={{ x: isDarkMode ? 24 : 4 }}
                      className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                    />
                  </button>
                </div>

                <div className="p-5 bg-primary-light dark:bg-gray-800 rounded-[24px] space-y-3">
                  <div className="flex items-center justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <span>Meta Diária</span>
                    <span className="text-primary">{history.filter(h => new Date(h.date).toDateString() === new Date().toDateString()).length}/5</span>
                  </div>
                  <div className="h-2.5 bg-white dark:bg-gray-700 rounded-full overflow-hidden p-0.5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((history.filter(h => new Date(h.date).toDateString() === new Date().toDateString()).length / 5) * 100, 100)}%` }}
                      className="h-full bg-primary rounded-full"
                    />
                  </div>
                </div>
                
                <button 
                  onClick={() => { setActiveTab('profile'); setIsMobileMenuOpen(false); }}
                  className="flex items-center gap-4 px-2 py-2 w-full text-left min-h-[44px]"
                >
                  <div className="w-10 h-10 bg-primary-light dark:bg-gray-800 rounded-xl flex items-center justify-center text-primary border border-primary-light dark:border-gray-700 overflow-hidden">
                    {profileImage ? (
                      <img src={profileImage} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User size={20} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-gray-900 dark:text-white truncate">{userName}</p>
                    <p className="text-[9px] font-black text-primary uppercase tracking-widest">Membro Pro</p>
                  </div>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Nav for Mobile/Tablet */}
      <nav className="lg:hidden fixed bottom-4 left-4 right-4 z-50 glass rounded-[32px] p-2 flex items-center justify-around border border-white/20 dark:border-white/10 shadow-2xl backdrop-blur-2xl safe-area-bottom">
        {navItems.slice(0, 4).map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActiveTab(item.id as any);
              vibrate(5);
            }}
            className={`p-4 min-h-[56px] min-w-[56px] flex flex-col items-center justify-center rounded-2xl transition-all duration-300 relative ${
              activeTab === item.id 
                ? 'text-primary scale-110 bg-primary/5' 
                : 'text-gray-400 hover:text-primary'
            }`}
            aria-label={item.label}
          >
            <item.icon size={24} />
            {activeTab === item.id && (
              <motion.div 
                layoutId="bottomNavIndicator"
                className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full"
              />
            )}
          </button>
        ))}
        <button
          onClick={() => {
            setIsMobileMenuOpen(true);
            vibrate(5);
          }}
          className="p-4 min-h-[56px] min-w-[56px] flex flex-col items-center justify-center rounded-2xl text-gray-400 hover:text-primary transition-all"
          aria-label="Mais opções"
        >
          <Menu size={24} />
        </button>
      </nav>

      {/* Main Content */}
      <motion.main 
        layout
        className="flex-1 p-4 sm:p-6 md:p-8 lg:p-16 pb-32 lg:pb-16 overflow-y-auto w-full flex flex-col min-h-screen"
      >
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="space-y-10 md:space-y-16 max-w-6xl mx-auto"
            >
              <header className="space-y-3">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] border border-indigo-100/50 dark:border-indigo-800/30 backdrop-blur-sm">
                  <Sparkles size={14} className="animate-pulse" />
                  Visão Geral do Painel
                </div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 dark:text-white tracking-tighter font-display leading-[1.1]">
                  Que bom ver você,<br />
                  <span className="text-gradient drop-shadow-sm">{userName}</span>
                </h1>
                <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 max-w-2xl leading-relaxed font-medium">
                  Sua jornada rumo à fluência continua. Vamos praticar e conquistar novos horizontes hoje?
                </p>
              </header>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
                {[
                  { icon: Award, label: 'Média de Precisão', value: `${averageScore}%`, color: 'text-primary', bg: 'bg-primary-light' },
                  { icon: BookOpen, label: 'Práticas Realizadas', value: history.length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { icon: TrendingUp, label: 'Nível de Fluência', value: userStats.level === 1 ? 'Iniciante' : `Nível ${userStats.level}`, color: 'text-amber-600', bg: 'bg-amber-50' },
                  { icon: Sparkles, label: 'Sequência Ativa', value: `${userStats.streak} dias`, color: 'text-rose-600', bg: 'bg-rose-50' },
                ].map((stat, i) => (
                  <motion.div 
                    key={i}
                    whileHover={{ y: -8, scale: 1.02 }}
                    className="card-3d p-4 sm:p-8 flex flex-col items-center text-center space-y-4 sm:space-y-6 group relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-10" style={{ color: `var(--${stat.color.split('-')[1]})` }} />
                    <div className={`w-12 h-12 sm:w-16 sm:h-16 ${stat.bg} ${stat.color} rounded-[18px] sm:rounded-[24px] flex items-center justify-center group-hover:rotate-6 transition-transform duration-500 shadow-lg shadow-current/5`}>
                      <stat.icon size={24} className="sm:w-8 sm:h-8" />
                    </div>
                    <div className="space-y-1 w-full">
                      <p className="text-lg sm:text-2xl lg:text-3xl font-black tracking-tighter text-gray-900 dark:text-white leading-none truncate px-1 sm:px-2">
                        {stat.value}
                      </p>
                      <p className="text-[8px] sm:text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] leading-none">
                        {stat.label}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <section className="space-y-8">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h2 className="text-3xl font-black tracking-tight text-gray-900">Sua Jornada de Domínio</h2>
                    <p className="text-sm text-gray-400 font-medium">Um roteiro exclusivo desenhado para acelerar sua evolução.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { title: 'Base Sólida', status: 'Concluído', progress: 100, icon: BookOpen, categories: ['Apresentação Pessoal', 'Perguntas', 'Saúde'] },
                    { title: 'Diálogos do Dia a Dia', status: 'Concluído', progress: 100, icon: Bot, categories: ['Restaurantes', 'Supermercados', 'Escolas'] },
                    { title: 'Business & Carreira', status: 'Em progresso', progress: Math.min((userStats.xp % 1000) / 10, 100), icon: Award, categories: ['Trabalho', 'Business & Carreira'] },
                    { title: 'Viagens & Cultura', status: 'Bloqueado', progress: 0, icon: TrendingUp, categories: ['Aeroportos', 'Viagens'] },
                  ].map((path, i) => (
                    <div key={i} className={`p-8 rounded-[32px] border-2 transition-all flex flex-col ${
                      path.status === 'Em progresso' ? 'bg-white border-primary shadow-xl scale-[1.02]' : 
                      path.status === 'Concluído' ? 'bg-emerald-50/30 border-emerald-100 opacity-90' :
                      'bg-gray-50 border-transparent opacity-60'
                    }`}>
                      <div className="flex items-center justify-between mb-6">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                          path.status === 'Em progresso' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 
                          path.status === 'Concluído' ? 'bg-emerald-600 text-white' :
                          'bg-gray-200 text-gray-400'
                        }`}>
                          <path.icon size={24} />
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${
                          path.status === 'Em progresso' ? 'text-primary' : 
                          path.status === 'Concluído' ? 'text-emerald-600' :
                          'text-gray-400'
                        }`}>{path.status}</span>
                      </div>
                      <h3 className="text-xl font-black text-gray-900 mb-4">{path.title}</h3>
                      <div className="space-y-2 mb-6 flex-1">
                        <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          <span>Progresso</span>
                          <span>{Math.round(path.progress)}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${path.progress}%` }}
                            className={`h-full ${
                              path.status === 'Em progresso' ? 'bg-primary' : 
                              path.status === 'Concluído' ? 'bg-emerald-600' :
                              'bg-gray-300'
                            }`}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        {path.status === 'Em progresso' && (
                          <button 
                            onClick={() => setActiveTab('tutor')}
                            className="w-full py-3 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-primary-dark transition-all flex items-center justify-center gap-2"
                          >
                            <Play size={14} fill="currentColor" />
                            Continuar Lição
                          </button>
                        )}
                        {path.status === 'Concluído' && (
                          <button 
                            onClick={() => {
                              setSelectedCategory(path.categories[0]);
                              setActiveTab('practice');
                            }}
                            className="w-full py-3 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                          >
                            <RotateCcw size={14} />
                            Revisar Práticas
                          </button>
                        )}
                        {path.status !== 'Bloqueado' && (
                          <button 
                            onClick={() => {
                              setSelectedCategory(path.categories[0]);
                              setActiveTab('practice');
                            }}
                            className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                              path.status === 'Em progresso' ? 'bg-gray-50 text-gray-600 hover:bg-gray-100' : 'bg-white/50 text-emerald-600 hover:bg-white'
                            }`}
                          >
                            Ver Biblioteca
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-8">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h2 className="text-3xl font-black tracking-tight text-gray-900">Atividade Recente</h2>
                    <p className="text-sm text-gray-400 font-medium">Seus últimos treinos de pronúncia.</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('history')} 
                    className="group flex items-center gap-2 px-6 py-3 bg-white rounded-2xl text-sm font-black text-gray-400 hover:text-primary hover:shadow-xl transition-all"
                  >
                    Ver Histórico Completo
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {history.slice(0, 3).map((item, i) => (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="card-3d p-6 flex items-center justify-between group hover:border-primary-light"
                    >
                      <div className="flex items-center gap-6">
                        <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black shadow-lg ${
                          item.score >= 80 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                          <span className="text-lg">{item.score}</span>
                          <span className="text-[8px] uppercase tracking-widest">Score</span>
                        </div>
                        <div>
                          <p className="font-bold text-lg italic leading-tight text-gray-900 group-hover:text-primary transition-colors">"{item.sentence}"</p>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{new Date(item.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}</p>
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-primary-light group-hover:text-primary transition-all">
                        <ChevronRight size={20} />
                      </div>
                    </motion.div>
                  ))}
                  {history.length === 0 && (
                    <div className="text-center py-20 bg-white/50 backdrop-blur-sm rounded-[48px] border-2 border-dashed border-gray-200">
                      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-200">
                        <History size={40} />
                      </div>
                      <p className="text-gray-400 font-black text-xl">Nenhuma atividade ainda.</p>
                      <p className="text-gray-400 font-medium mt-2">Comece a praticar para ver seu progresso aqui!</p>
                      <button 
                        onClick={() => setActiveTab('practice')}
                        className="mt-8 px-8 py-4 bg-primary text-white rounded-2xl font-black shadow-xl hover:bg-primary-dark transition-all"
                      >
                        Começar Agora
                      </button>
                    </div>
                  )}
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'practice' && (
            <motion.div
              key="practice"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="space-y-8 md:space-y-12 max-w-6xl mx-auto"
            >
              {!selectedSentence ? (
                <>
                  <header className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50/50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] border border-emerald-100/50 dark:border-emerald-800/30 backdrop-blur-sm">
                      <Mic size={14} className="animate-pulse" />
                      Practice Lab
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 dark:text-white tracking-tighter font-display leading-[1.1]">
                      Biblioteca de <span className="text-emerald-600 underline decoration-emerald-200/50 underline-offset-8">Prática</span>
                    </h1>
                    <p className="text-base md:text-lg text-gray-500 dark:text-gray-400 max-w-2xl leading-relaxed font-medium">
                      Selecione um desafio e receba feedback imediato da nossa IA. Refine sua pronúncia e ritmo com nossa biblioteca exclusiva de frases.
                    </p>
                  </header>

                  <div className="space-y-6">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                      <div className="flex items-center gap-2 overflow-x-auto pb-2 w-full md:w-auto no-scrollbar">
                        {categories.map(category => (
                          <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={`px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all ${
                              selectedCategory === category 
                                ? 'bg-emerald-600 text-white shadow-lg' 
                                : 'bg-white text-gray-400 hover:text-emerald-600 border border-gray-100'
                            }`}
                          >
                            {category}
                          </button>
                        ))}
                      </div>
                      <div className="relative w-full md:w-64">
                        <input
                          type="text"
                          placeholder="O que você quer praticar hoje?"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full px-4 py-2 rounded-2xl bg-white border border-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      {filteredSentences.map((sentence, i) => (
                        <motion.div
                          key={sentence.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.01 }}
                          className="card-3d p-6 sm:p-8 text-left hover:border-emerald-200 group relative overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 p-4 sm:p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Mic size={80} className="text-gray-900 sm:w-[100px] sm:h-[100px]" />
                          </div>
                          <div className="flex items-center justify-between mb-4 sm:mb-6 relative z-10">
                            <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-widest px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl border ${getDifficultyColor(sentence.difficulty)}`}>
                              {sentence.difficulty}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  playSentence(sentence.text, sentence.id);
                                }}
                                disabled={playingSentenceId === sentence.id}
                                className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all ${
                                  playingSentenceId === sentence.id 
                                    ? 'bg-emerald-100 text-emerald-600' 
                                    : 'bg-gray-50 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600'
                                }`}
                              >
                                {playingSentenceId === sentence.id ? (
                                  <Loader2 size={14} className="animate-spin sm:w-4 sm:h-4" />
                                ) : (
                                  <Volume2 size={14} className="sm:w-4 sm:h-4" />
                                )}
                              </button>
                              <span className="text-[8px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">{sentence.category}</span>
                            </div>
                          </div>
                          <div 
                            onClick={() => setSelectedSentence(sentence)}
                            className="space-y-1 sm:space-y-2 relative z-10 cursor-pointer"
                          >
                            <p className="text-lg sm:text-2xl font-bold text-gray-900 italic leading-tight group-hover:text-emerald-600 transition-colors break-words overflow-wrap-anywhere">"{sentence.text}"</p>
                            <div className="space-y-0.5 sm:space-y-1">
                              <p className="text-xs sm:text-sm text-gray-400 font-medium">{sentence.translation}</p>
                              <p className="text-[10px] sm:text-xs text-emerald-600/60 font-mono italic">[{sentence.pronunciation}]</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => setSelectedSentence(sentence)}
                            className="mt-6 sm:mt-8 flex items-center gap-2 sm:gap-3 text-[10px] sm:text-sm font-black text-gray-400 group-hover:text-emerald-600 transition-all relative z-10 w-full text-left"
                          >
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
                              <Play size={14} fill="currentColor" className="sm:w-4 sm:h-4" />
                            </div>
                            Praticar Agora
                          </button>
                        </motion.div>
                      ))}
                    </div>
                    {filteredSentences.length === 0 && (
                      <div className="text-center py-20 bg-white/50 rounded-[48px] border-2 border-dashed border-gray-200">
                        <p className="text-gray-400 font-black text-xl">Ops! Não encontramos nada por aqui.</p>
                        <p className="text-gray-400 font-medium mt-2">Experimente outros termos ou explore novas categorias.</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-12 py-8">
                  <motion.button 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => { setSelectedSentence(null); setFeedback(null); }}
                    className="self-start group flex items-center gap-3 px-6 py-3 bg-white rounded-2xl text-sm font-black text-gray-400 hover:text-gray-900 shadow-lg hover:shadow-xl transition-all"
                  >
                    <ChevronRight size={18} className="rotate-180 group-hover:-translate-x-1 transition-transform" />
                    Explorar Outras Frases
                  </motion.button>
                  
                  <div className="w-full space-y-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[32px] shadow-xl border border-gray-100">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border ${getDifficultyColor(selectedSentence.difficulty)}`}>
                            {selectedSentence.difficulty}
                          </span>
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{selectedSentence.category}</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight italic">"{selectedSentence.text}"</h2>
                        <div className="space-y-1">
                          <p className="text-lg text-gray-500 dark:text-gray-400 font-medium">{selectedSentence.translation}</p>
                          <p className="text-sm text-emerald-600/70 dark:text-emerald-400/70 font-mono italic">[{selectedSentence.pronunciation}]</p>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => playSentence(selectedSentence.text, selectedSentence.id)}
                        disabled={playingSentenceId === selectedSentence.id}
                        className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
                          playingSentenceId === selectedSentence.id
                            ? 'bg-emerald-100 text-emerald-600'
                            : 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 hover:scale-105 active:scale-95'
                        }`}
                      >
                        {playingSentenceId === selectedSentence.id ? (
                          <>
                            <Loader2 size={20} className="animate-spin" />
                            Processando Áudio...
                          </>
                        ) : (
                          <>
                            <Volume2 size={20} />
                            Escutar Pronúncia
                          </>
                        )}
                      </button>
                    </div>

                    {!feedback ? (
                      <Recorder 
                        targetSentence={selectedSentence.text} 
                        pronunciation={selectedSentence.pronunciation}
                        onAnalysisComplete={handleAnalysisComplete} 
                      />
                    ) : (
                      <FeedbackDisplay 
                        feedback={feedback} 
                        targetSentence={selectedSentence.text}
                        pronunciation={selectedSentence.pronunciation}
                        onClose={() => { setFeedback(null); setSelectedSentence(null); }} 
                        onRetry={() => setFeedback(null)}
                      />
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'assistant' && (
            <motion.div
              key="assistant"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
            >
              <WordAssistant />
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
            >
              <Profile isDarkMode={isDarkMode} onToggleDarkMode={() => setIsDarkMode(!isDarkMode)} />
            </motion.div>
          )}

          {activeTab === 'translation' && (
            <motion.div
              key="translation"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
            >
              <SimultaneousTranslation />
            </motion.div>
          )}

          {activeTab === 'tutor' && (
            <motion.div
              key="tutor"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
            >
              <AITutor onSessionComplete={handleTutorSessionComplete} />
            </motion.div>
          )}

          {activeTab === 'dictionary' && (
            <motion.div
              key="dictionary"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
            >
              <Dictionary />
            </motion.div>
          )}

          {activeTab === 'activities' && (
            <motion.div
              key="activities"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
            >
              <Activities onComplete={handleTutorSessionComplete} />
            </motion.div>
          )}

          {activeTab === 'bible' && (
            <motion.div
              key="bible"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
            >
              <BibleLearning />
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="space-y-8 md:space-y-12 max-w-6xl mx-auto"
            >
              <header className="space-y-3">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] border border-indigo-100/50 dark:border-indigo-800/30 backdrop-blur-sm">
                  <History size={14} className="animate-pulse" />
                  Jornada de Aprendizado
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 dark:text-white tracking-tighter font-display leading-[1.1]">
                  Sua <span className="text-primary">Trajetória</span>
                </h1>
                <p className="text-base md:text-lg text-gray-500 dark:text-gray-400 max-w-2xl leading-relaxed font-medium">
                  Revise suas práticas e celebre cada pequena vitória. A constância é o segredo do seu sucesso.
                </p>
              </header>

              <div className="space-y-6">
                {history.map((item, i) => (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="card-3d p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-8 group hover:border-primary-light"
                  >
                    <div className="flex items-center gap-8">
                      <div className={`w-24 h-24 rounded-[32px] flex flex-col items-center justify-center font-black border-4 shadow-2xl ${
                        item.score >= 80 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                      }`}>
                        <span className="text-3xl leading-none">{item.score}</span>
                        <span className="text-[10px] uppercase tracking-widest mt-1">Score</span>
                      </div>
                      <div className="space-y-2">
                        <p className="font-bold text-2xl italic leading-tight text-gray-900 group-hover:text-primary transition-colors">"{item.sentence}"</p>
                        <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          <History size={12} />
                          {new Date(item.date).toLocaleString('pt-BR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => { 
                        const found = PRACTICE_SENTENCES.find(s => s.text === item.sentence);
                        const sentence = found || {
                          id: Math.random(),
                          text: item.sentence,
                          translation: 'Tradução não disponível',
                          pronunciation: '',
                          difficulty: 'Médio',
                          category: 'Histórico'
                        };
                        setSelectedSentence(sentence); 
                        setActiveTab('practice'); 
                      }}
                      className="btn-3d px-8 py-4 bg-primary text-white text-sm flex items-center gap-2"
                    >
                      <Play size={16} fill="currentColor" />
                      Refazer Prática
                    </button>
                  </motion.div>
                ))}
                {history.length === 0 && (
                  <div className="text-center py-32 bg-white/50 backdrop-blur-sm rounded-[64px] border-2 border-dashed border-gray-200">
                    <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-8 text-gray-200">
                      <History size={48} />
                    </div>
                    <p className="text-gray-400 font-black text-2xl tracking-tight">Sua história ainda está sendo escrita.</p>
                    <p className="text-gray-400 font-medium mt-2">Comece a praticar hoje e veja sua evolução ganhar forma aqui.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="mt-auto pt-20 pb-4 flex justify-center">
          <p className="text-[10px] font-medium text-gray-400/50 dark:text-gray-500/30 tracking-[0.2em] uppercase select-none">
            © 2026 Anderson Marques
          </p>
        </footer>
      </motion.main>

      {/* Right Sidebar - Stats & Activity */}
      <motion.aside
        initial={false}
        animate={{ 
          width: isRightSidebarCollapsed ? 80 : 360,
          padding: isRightSidebarCollapsed ? "2rem 1rem" : "2rem"
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="hidden xl:flex glass h-screen sticky top-0 z-50 flex-col gap-10 border-l border-white/20 relative"
      >
        {/* Toggle Button */}
        <button
          onClick={() => setIsRightSidebarCollapsed(!isRightSidebarCollapsed)}
          className="absolute -left-4 top-10 w-8 h-8 bg-white border border-gray-100 rounded-full flex items-center justify-center text-primary shadow-xl hover:scale-110 transition-transform z-50"
        >
          {isRightSidebarCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>

        {!isRightSidebarCollapsed ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-10"
          >
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-indigo-600 rounded-full" />
                <h3 className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-[0.2em]">Últimas Conquistas</h3>
              </div>
              <div className="space-y-4">
                {history.slice(0, 3).map((item) => (
                  <div key={item.id} className="p-4 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-white/50 dark:border-gray-700/50 shadow-sm flex items-center gap-4 group hover:scale-[1.02] transition-transform">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shadow-sm ${
                      item.score >= 80 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                    }`}>
                      {item.score}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-gray-900 dark:text-white truncate leading-none mb-1">"{item.sentence}"</p>
                      <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Há {Math.floor((new Date().getTime() - new Date(item.date).getTime()) / (1000 * 60))} min</p>
                    </div>
                  </div>
                ))}
                {history.length === 0 && (
                  <p className="text-[10px] font-bold text-gray-400 text-center py-4 uppercase tracking-widest">Nenhuma atividade recente.</p>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-indigo-600 rounded-full" />
                <h3 className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-[0.2em]">Métricas de Evolução</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-primary rounded-3xl text-white space-y-2 shadow-lg shadow-primary/20 group hover:scale-[1.05] transition-transform">
                  <p className="text-[9px] font-black uppercase tracking-[0.15em] opacity-70">Fluência</p>
                  <p className="text-2xl font-black tracking-tighter">68%</p>
                </div>
                <div className="p-5 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 space-y-2 shadow-sm group hover:scale-[1.05] transition-transform">
                  <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em]">Palavras</p>
                  <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">1.2k</p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gradient-to-br from-primary to-primary-dark rounded-[32px] text-white space-y-4 relative overflow-hidden shadow-2xl shadow-primary/20">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                <Award size={20} />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-black tracking-tight">Missão Atual</h4>
                <p className="text-xs font-medium text-primary-light opacity-80">Alcance 90% de precisão em 10 práticas consecutivas.</p>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white w-2/3 rounded-full" />
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-10"
          >
            <div className="w-10 h-10 bg-primary-light text-primary rounded-xl flex items-center justify-center shadow-inner">
              <TrendingUp size={20} />
            </div>
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shadow-inner">
              <Star size={20} />
            </div>
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shadow-inner">
              <Award size={20} />
            </div>
          </motion.div>
        )}
      </motion.aside>
    </div>
  );
}
