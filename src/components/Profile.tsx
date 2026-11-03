import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Globe, Award, Target, Camera, LogOut, Shield, Bell, Languages, Star, TrendingUp, Calendar, MapPin, Loader2, Download, CheckCircle2, Palette, ChevronDown, ChevronUp, X, Sparkles, Bot } from 'lucide-react';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';

const SUPPORTED_LANGUAGES = [
  'Português',
  'Espanhol',
  'Francês',
  'Alemão',
  'Italiano',
  'Japonês',
  'Chinês',
  'Coreano',
  'Russo'
];

const THEME_COLORS = [
  { id: 'indigo', name: 'Indigo', primary: '#4f46e5', light: '#eef2ff', dark: '#3730a3', alpha: 'rgba(79, 70, 229, 0.05)' },
  { id: 'rose', name: 'Rose', primary: '#e11d48', light: '#fff1f2', dark: '#9f1239', alpha: 'rgba(225, 29, 72, 0.05)' },
  { id: 'emerald', name: 'Emerald', primary: '#059669', light: '#ecfdf5', dark: '#065f46', alpha: 'rgba(5, 150, 105, 0.05)' },
  { id: 'amber', name: 'Amber', primary: '#d97706', light: '#fffbeb', dark: '#92400e', alpha: 'rgba(217, 119, 6, 0.05)' },
  { id: 'violet', name: 'Violet', primary: '#7c3aed', light: '#f5f3ff', dark: '#5b21b6', alpha: 'rgba(124, 58, 237, 0.05)' },
  { id: 'sky', name: 'Sky', primary: '#0284c7', light: '#f0f9ff', dark: '#075985', alpha: 'rgba(2, 132, 199, 0.05)' },
];

export const applyTheme = (themeId: string) => {
  const theme = THEME_COLORS.find(t => t.id === themeId) || THEME_COLORS[0];
  const root = document.documentElement;
  root.style.setProperty('--theme-primary', theme.primary);
  root.style.setProperty('--theme-primary-light', theme.light);
  root.style.setProperty('--theme-primary-dark', theme.dark);
  root.style.setProperty('--theme-primary-alpha', theme.alpha);
};

export default function Profile({ isDarkMode, onToggleDarkMode }: { isDarkMode?: boolean, onToggleDarkMode?: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [tempProfileData, setTempProfileData] = useState<typeof profileData | null>(null);
  const [newGoal, setNewGoal] = useState('');
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [showColorPalette, setShowColorPalette] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    bio: '',
    level: 'Iniciante',
    numericLevel: 1,
    xp: 0,
    nativeLanguage: 'Português',
    goals: [] as string[],
    location: '',
    joinedDate: '',
    streak: 0,
    totalPracticeTime: '0h 0m',
    averageScore: 0,
    languagePackDownloaded: false,
    themeColor: 'indigo'
  });

  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showAppLanguageModal, setShowAppLanguageModal] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    dailyReminders: true,
    newChallenges: true,
    appUpdates: false
  });
  const [appLanguage, setAppLanguage] = useState('Português (Brasil)');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setProfileData(prev => ({
          ...prev,
          ...data,
          email: user.email || data.email || '',
          joinedDate: data.joinedDate ? new Date(data.joinedDate).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : 'N/A',
          languagePackDownloaded: data.languagePackDownloaded || false,
          xp: data.xp || 0,
          numericLevel: data.level || 1
        }));
        setProfileImage(data.photoURL || user.photoURL || null);
        setIsDownloaded(data.languagePackDownloaded || false);
        
        if (data.notificationSettings) {
          setNotificationSettings(data.notificationSettings);
        }
        if (data.appLanguage) {
          setAppLanguage(data.appLanguage);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleResetPassword = async () => {
    const user = auth.currentUser;
    if (!user || !user.email) return;
    
    try {
      // In a real app, we'd use sendPasswordResetEmail(auth, user.email)
      // For this demo, we'll simulate it
      setResetEmailSent(true);
      setTimeout(() => setResetEmailSent(false), 5000);
    } catch (error) {
      console.error("Error sending reset email:", error);
    }
  };

  const saveNotificationSettings = async (newSettings: typeof notificationSettings) => {
    const user = auth.currentUser;
    if (!user) return;

    setIsSavingSettings(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        notificationSettings: newSettings
      });
      setNotificationSettings(newSettings);
    } catch (error) {
      console.error("Error saving notification settings:", error);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const saveAppLanguage = async (lang: string) => {
    const user = auth.currentUser;
    if (!user) return;

    setIsSavingSettings(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        appLanguage: lang
      });
      setAppLanguage(lang);
      setShowAppLanguageModal(false);
    } catch (error) {
      console.error("Error saving app language:", error);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleEdit = () => {
    setTempProfileData({ ...profileData });
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (tempProfileData) {
      setProfileData(tempProfileData);
    }
    setIsEditing(false);
    setTempProfileData(null);
    setNewGoal('');
  };

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name: profileData.name,
        bio: profileData.bio,
        level: profileData.level,
        nativeLanguage: profileData.nativeLanguage,
        location: profileData.location,
        goals: profileData.goals,
        languagePackDownloaded: isDownloaded
      });
      setIsEditing(false);
      setTempProfileData(null);
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const addGoal = () => {
    if (newGoal.trim() && !profileData.goals.includes(newGoal.trim())) {
      setProfileData({
        ...profileData,
        goals: [...profileData.goals, newGoal.trim()]
      });
      setNewGoal('');
    }
  };

  const removeGoal = (goalToRemove: string) => {
    setProfileData({
      ...profileData,
      goals: profileData.goals.filter(g => g !== goalToRemove)
    });
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const user = auth.currentUser;
    if (file && user) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        setProfileImage(base64String);
        
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            photoURL: base64String
          });
          // Dispatch custom event to notify App.tsx
          window.dispatchEvent(new Event('profileImageUpdated'));
        } catch (error) {
          console.error("Error updating profile photo:", error);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownloadLanguagePack = async () => {
    if (isDownloaded || isDownloading) return;
    
    const user = auth.currentUser;
    if (!user) return;

    setIsDownloading(true);
    setDownloadProgress(0);
    
    const interval = setInterval(async () => {
      setDownloadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsDownloading(false);
          setIsDownloaded(true);
          
          // Save to Firestore
          updateDoc(doc(db, 'users', user.uid), {
            languagePackDownloaded: true
          }).catch(err => console.error("Error saving download status:", err));
          
          return 100;
        }
        return prev + 5;
      });
    }, 150);
  };

  const handleThemeChange = async (themeId: string) => {
    const user = auth.currentUser;
    if (!user) return;

    setProfileData(prev => ({ ...prev, themeColor: themeId }));
    applyTheme(themeId);

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        themeColor: themeId
      });
      // Notify App.tsx
      window.dispatchEvent(new CustomEvent('themeUpdated', { detail: themeId }));
    } catch (error) {
      console.error("Error updating theme:", error);
    }
  };

  const stats = [
    { icon: Star, label: 'Conhecimento Acumulado', value: `${profileData.xp} XP`, color: 'text-amber-600', bg: 'bg-amber-50' },
    { icon: TrendingUp, label: 'Sequência Ativa', value: `${profileData.streak} dias`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { icon: Award, label: 'Nível de Fluência', value: profileData.numericLevel === 1 ? 'Iniciante' : `Nível ${profileData.numericLevel}`, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 md:space-y-12 pb-20 px-4 md:px-6">
      <header className="space-y-4 pt-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] border border-indigo-100/50 dark:border-indigo-800/30 backdrop-blur-sm">
          <User size={14} className="animate-pulse" />
          Central do Aluno
        </div>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-gray-900 dark:text-white tracking-tighter font-display leading-[1.1]">
          Sua <span className="text-indigo-600">Evolução</span>
        </h1>
        <p className="text-base md:text-xl text-gray-500 dark:text-gray-400 max-w-3xl leading-relaxed font-medium">
          Personalize sua jornada e acompanhe cada passo da sua evolução rumo ao domínio do inglês.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Avatar & Basic Info */}
        <div className="lg:col-span-4 space-y-8 lg:sticky lg:top-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-[32px] md:rounded-[40px] border border-gray-100 dark:border-gray-700 p-6 md:p-8 flex flex-col items-center text-center"
          >
            {/* Profile Photo Container */}
            <div className="relative mb-4 group">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />
              <div 
                onClick={handleImageClick}
                className="w-[110px] h-[110px] md:w-[130px] md:h-[130px] bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl md:rounded-[40px] overflow-hidden border-4 border-white dark:border-gray-700 cursor-pointer transition-transform hover:scale-105 shadow-sm"
              >
                {profileImage ? (
                  <img 
                    src={profileImage} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-indigo-200 dark:text-indigo-800">
                    <User size={48} className="md:w-16 md:h-16" />
                  </div>
                )}
              </div>
              <button 
                onClick={handleImageClick}
                className="absolute -bottom-1 -right-1 w-10 h-10 bg-white dark:bg-gray-700 rounded-xl shadow-md border border-gray-100 dark:border-gray-600 flex items-center justify-center text-indigo-600 dark:text-indigo-400 hover:scale-110 transition-transform z-10"
              >
                <Camera size={20} />
              </button>
            </div>
            
            {/* Info Section */}
            <div className="flex flex-col items-center gap-3 w-full">
              {isEditing ? (
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none font-black text-center text-gray-900 dark:text-white text-xl"
                />
              ) : (
                <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">{profileData.name}</h2>
              )}
              
              <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                  {profileData.numericLevel === 1 ? 'Iniciante' : `Nível ${profileData.numericLevel}`} • Assinante Premium
                </span>
              </div>

              <div className="w-full pt-6 mt-3 border-t border-gray-50 dark:border-gray-700/50 flex flex-col gap-3">
                <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400 text-xs font-bold">
                  <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                    <Mail size={14} />
                  </div>
                  <span className="truncate">{profileData.email}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400 text-xs font-bold">
                  <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                    <MapPin size={14} />
                  </div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profileData.location}
                      onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                      className="flex-1 px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-lg outline-none text-gray-900 dark:text-white text-xs"
                    />
                  ) : (
                    <span className="truncate">{profileData.location || 'Localização não definida'}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400 text-xs font-bold">
                  <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                    <Calendar size={14} />
                  </div>
                  <span className="truncate">Membro desde {profileData.joinedDate}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-4">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ x: 8 }}
                className="bg-white dark:bg-gray-800 rounded-[32px] shadow-3d border border-gray-100/50 dark:border-gray-700/50 p-6 flex items-center gap-6 group hover:border-indigo-100/50 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-transparent via-current to-transparent opacity-20" style={{ color: `var(--${stat.color.split('-')[1]})` }} />
                <div className={`w-16 h-16 ${stat.bg} ${stat.color} rounded-[24px] flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform duration-500`}>
                  <stat.icon size={28} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] leading-none mb-1.5">{stat.label}</p>
                  <p className="text-2xl font-black text-gray-900 dark:text-white leading-none tracking-tight">{stat.value}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right Column: Detailed Info & Settings */}
        <div className="lg:col-span-8 space-y-8">
          {/* Bio & Details */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-[32px] md:rounded-[40px] shadow-sm border border-gray-100 dark:border-gray-700 p-6 md:p-10 space-y-8"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">Sobre Você</h3>
              <div className="flex gap-3">
                {isEditing ? (
                  <>
                    <button 
                      onClick={handleCancel}
                      disabled={isSaving}
                      className="px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={handleSave}
                      disabled={isSaving}
                      className="bg-indigo-600 text-white px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none flex items-center gap-2"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        'Confirmar'
                      )}
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={handleEdit}
                    className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                  >
                    Editar Perfil
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bio</label>
                {isEditing ? (
                  <textarea
                    value={profileData.bio}
                    onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                    className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-3xl focus:ring-2 focus:ring-indigo-100 outline-none font-medium min-h-[120px] text-gray-900 dark:text-white text-lg"
                  />
                ) : (
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed font-medium text-lg">
                    {profileData.bio || 'Conte um pouco sobre você...'}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <Languages size={24} />
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Idioma Nativo</p>
                      <div className="flex flex-col gap-3">
                        {isEditing ? (
                          <select
                            value={profileData.nativeLanguage}
                            onChange={(e) => {
                              setProfileData({ ...profileData, nativeLanguage: e.target.value });
                              setIsDownloaded(false);
                            }}
                            className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl outline-none font-bold text-gray-900 dark:text-white"
                          >
                            {SUPPORTED_LANGUAGES.map(lang => (
                              <option key={lang} value={lang}>{lang}</option>
                            ))}
                          </select>
                        ) : (
                          <p className="text-xl font-black text-gray-900 dark:text-white">{profileData.nativeLanguage}</p>
                        )}
                        
                        {!isEditing && (
                          <div className="space-y-3">
                            <button
                              onClick={handleDownloadLanguagePack}
                              disabled={isDownloading || isDownloaded}
                              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${
                                isDownloaded 
                                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/30' 
                                  : isDownloading
                                    ? 'bg-gray-50 dark:bg-gray-900 text-gray-400 border border-gray-100 dark:border-gray-700'
                                    : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/30 hover:bg-indigo-100'
                              }`}
                            >
                              {isDownloaded ? (
                                <>
                                  <CheckCircle2 size={16} />
                                  Pacote Instalado
                                </>
                              ) : isDownloading ? (
                                <>
                                  <Loader2 size={16} className="animate-spin" />
                                  Baixando... {downloadProgress}%
                                </>
                              ) : (
                                <>
                                  <Download size={16} />
                                  Baixar Pacote {profileData.nativeLanguage}
                                </>
                              )}
                            </button>
                            
                            {isDownloading && (
                              <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${downloadProgress}%` }}
                                  className="h-full bg-indigo-600"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <Award size={24} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nível de Inglês</p>
                      {isEditing ? (
                        <select
                          value={profileData.level}
                          onChange={(e) => setProfileData({ ...profileData, level: e.target.value })}
                          className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl outline-none font-bold text-gray-900 dark:text-white"
                        >
                          <option value="Iniciante">Iniciante</option>
                          <option value="Intermediário">Intermediário</option>
                          <option value="Avançado">Avançado</option>
                        </select>
                      ) : (
                        <p className="text-xl font-black text-gray-900 dark:text-white">{profileData.level}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <Target size={16} className="text-indigo-500" />
                      Objetivos de Aprendizado
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {profileData.goals.map((goal, i) => (
                        <span 
                          key={i} 
                          className={`px-4 py-2 rounded-2xl text-xs font-black border shadow-sm flex items-center gap-2 transition-all ${
                            isEditing 
                              ? 'bg-indigo-50 border-indigo-100 text-indigo-600' 
                              : 'bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-100 dark:border-gray-700'
                          }`}
                        >
                          {goal}
                          {isEditing && (
                            <button 
                              onClick={() => removeGoal(goal)}
                              className="hover:text-rose-600 transition-colors"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </span>
                      ))}
                      {isEditing && (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={newGoal}
                            onChange={(e) => setNewGoal(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && addGoal()}
                            placeholder="Novo objetivo..."
                            className="px-4 py-2 bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-2xl text-xs outline-none focus:border-indigo-400"
                          />
                          <button 
                            onClick={addGoal}
                            className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-700 transition-colors shadow-md"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Account Settings */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-[32px] md:rounded-[40px] shadow-sm border border-gray-100 dark:border-gray-700 p-6 md:p-10 space-y-8"
          >
            <h3 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">Configurações da Conta</h3>
            
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {[
                { id: 'privacy', icon: Shield, label: 'Privacidade & Segurança', desc: 'Gerencie sua senha e dados', onClick: () => setShowPrivacyModal(true) },
                { id: 'notifications', icon: Bell, label: 'Notificações', desc: 'Ajuste seus alertas de prática', onClick: () => setShowNotificationsModal(true) },
                { id: 'language', icon: Globe, label: 'Idioma do App', desc: appLanguage, onClick: () => setShowAppLanguageModal(true) },
                { id: 'darkmode', icon: isDarkMode ? Sparkles : Bot, label: 'Modo Escuro', desc: isDarkMode ? 'Ativado' : 'Desativado', onClick: onToggleDarkMode },
                { id: 'logout', icon: LogOut, label: 'Sair da Conta', desc: 'Encerrar sessão atual', color: 'text-rose-600', onClick: handleLogout },
              ].map((item, i) => (
                <button 
                  key={i}
                  onClick={item.onClick}
                  className={`flex flex-col items-center gap-2 sm:gap-4 p-3 sm:p-4 rounded-2xl transition-all text-center h-full border ${
                    item.id === 'logout'
                      ? 'bg-rose-50/30 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/30 hover:bg-rose-50 dark:hover:bg-rose-900/20'
                      : 'bg-gray-50/50 dark:bg-gray-900/30 border-gray-100/50 dark:border-gray-800/50 hover:bg-white dark:hover:bg-gray-900 hover:border-gray-200 dark:hover:border-gray-700'
                  }`}
                >
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    item.id === 'logout'
                      ? 'bg-white dark:bg-gray-800 text-rose-600 shadow-sm'
                      : 'bg-white dark:bg-gray-800 text-indigo-600 shadow-sm'
                  }`}>
                    <item.icon size={22} className="sm:w-7 sm:h-7" />
                  </div>
                  <div className="min-w-0 w-full">
                    <p className={`text-[13px] sm:text-[16px] font-bold leading-tight ${item.id === 'logout' ? 'text-rose-600' : 'text-gray-900 dark:text-white'}`}>{item.label}</p>
                    <p className="text-[11px] sm:text-[13px] text-gray-500 dark:text-gray-400 font-medium mt-1 line-clamp-2 sm:line-clamp-none">{item.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Theme Color Selection */}
            <div className="space-y-6 pt-6 border-t border-gray-50 dark:border-gray-700/50">
              <button 
                onClick={() => setShowColorPalette(!showColorPalette)}
                className="flex items-center justify-between w-full p-3 sm:p-4 rounded-2xl bg-gray-50/50 dark:bg-gray-900/30 border border-gray-100/50 dark:border-gray-800/50 hover:bg-white dark:hover:bg-gray-900 transition-all group"
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center shadow-sm text-primary">
                    <Palette size={22} className="sm:w-7 sm:h-7" />
                  </div>
                  <div className="text-left">
                    <p className="text-[13px] sm:text-[16px] font-bold text-gray-900 dark:text-white">Cor do Layout</p>
                    <p className="text-[11px] sm:text-[13px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">Personalize as cores do aplicativo</p>
                  </div>
                </div>
                <div className={`transition-transform duration-300 ${showColorPalette ? 'rotate-180' : ''}`}>
                  <ChevronDown size={20} className="text-gray-400" />
                </div>
              </button>

              <AnimatePresence>
                {showColorPalette && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 p-2">
                      {THEME_COLORS.map((theme) => (
                        <button
                          key={theme.id}
                          onClick={() => handleThemeChange(theme.id)}
                          className={`flex flex-col items-center gap-3 p-4 rounded-3xl border-2 transition-all ${
                            profileData.themeColor === theme.id 
                              ? 'border-primary bg-primary-light dark:bg-primary/10 shadow-lg scale-105' 
                              : 'border-transparent bg-white dark:bg-gray-900 hover:border-gray-100 dark:hover:border-gray-700'
                          }`}
                        >
                          <div 
                            className="w-10 h-10 rounded-2xl shadow-inner rotate-3 group-hover:rotate-0 transition-transform"
                            style={{ backgroundColor: theme.primary }}
                          />
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">{theme.name}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
      {/* Modals */}
      <AnimatePresence>
        {showPrivacyModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="card-3d p-8 max-w-md w-full space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-gray-900">Privacidade & Segurança</h3>
                <button onClick={() => setShowPrivacyModal(false)} className="text-gray-400 hover:text-gray-600">
                  <ChevronDown className="rotate-180" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-sm font-bold text-gray-900">Redefinir Senha</p>
                  <p className="text-xs text-gray-500 mt-1">Enviaremos um link para {profileData.email} para você criar uma nova senha.</p>
                  <button 
                    onClick={handleResetPassword}
                    disabled={resetEmailSent}
                    className={`mt-4 w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                      resetEmailSent ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-primary text-white shadow-lg hover:bg-primary-dark'
                    }`}
                  >
                    {resetEmailSent ? 'E-mail Enviado!' : 'Enviar Link de Redefinição'}
                  </button>
                </div>
                <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                  <p className="text-sm font-bold text-rose-600">Excluir Conta</p>
                  <p className="text-xs text-rose-500 mt-1">Esta ação é irreversível. Todos os seus dados de progresso serão perdidos.</p>
                  <button className="mt-4 w-full py-3 border border-rose-200 text-rose-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-rose-100 transition-all">
                    Solicitar Exclusão
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showNotificationsModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="card-3d p-8 max-w-md w-full space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-gray-900">Notificações</h3>
                <button onClick={() => setShowNotificationsModal(false)} className="text-gray-400 hover:text-gray-600">
                  <ChevronDown className="rotate-180" />
                </button>
              </div>
              <div className="space-y-4">
                {[
                  { id: 'dailyReminders', label: 'Lembretes Diários', desc: 'Alertas para manter sua ofensiva' },
                  { id: 'newChallenges', label: 'Novos Desafios', desc: 'Notificar quando houver novos conteúdos' },
                  { id: 'appUpdates', label: 'Atualizações do App', desc: 'Novidades e melhorias na plataforma' },
                ].map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-400">{item.desc}</p>
                    </div>
                    <button 
                      onClick={() => saveNotificationSettings({
                        ...notificationSettings,
                        [item.id]: !notificationSettings[item.id as keyof typeof notificationSettings]
                      })}
                      className={`w-12 h-6 rounded-full transition-colors relative ${notificationSettings[item.id as keyof typeof notificationSettings] ? 'bg-primary' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${notificationSettings[item.id as keyof typeof notificationSettings] ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => setShowNotificationsModal(false)}
                className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs"
              >
                Concluído
              </button>
            </motion.div>
          </div>
        )}

        {showAppLanguageModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="card-3d p-8 max-w-md w-full space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-gray-900">Idioma do Aplicativo</h3>
                <button onClick={() => setShowAppLanguageModal(false)} className="text-gray-400 hover:text-gray-600">
                  <ChevronDown className="rotate-180" />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {['Português (Brasil)', 'English (US)', 'Español (España)', 'Français (France)'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => saveAppLanguage(lang)}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                      appLanguage === lang 
                        ? 'bg-primary-light border-primary text-primary' 
                        : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-bold">{lang}</span>
                    {appLanguage === lang && <CheckCircle2 size={20} />}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
