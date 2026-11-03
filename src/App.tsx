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
