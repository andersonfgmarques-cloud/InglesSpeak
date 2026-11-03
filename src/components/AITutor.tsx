import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Send, Volume2, X, MessageSquare, Sparkles, User, Bot, ChevronRight, Play, Award, RotateCcw, ChevronLeft, Copy, Check, Languages, AlertCircle } from 'lucide-react';
import { chatWithAI, generateTTS, translateText, ChatMessage, ChatResponse } from '../lib/gemini';

interface Scenario {
  id: string;
  title: string;
  description: string;
  icon: string;
  initialMessage: string;
}

interface AITutorProps {
  onSessionComplete?: (xpGain: number) => void;
}

const SCENARIOS: Scenario[] = [
  {
    id: 'airport',
    title: 'Check-in & Bagagem',
    description: 'Domine o vocabulário essencial para navegar em aeroportos internacionais.',
    icon: '✈️',
    initialMessage: 'Hello! Welcome to SpeakFluent Airways. May I see your passport and ticket, please?'
  },
  {
    id: 'restaurant',
    title: 'Experiência Gastronômica',
    description: 'Sinta-se à vontade para explorar o menu e fazer pedidos como um nativo.',
    icon: '🍔',
    initialMessage: 'Good evening! Welcome to our restaurant. Are you ready to order, or do you need a few more minutes?'
  },
  {
    id: 'hotel',
    title: 'Hospedagem & Serviços',
    description: 'Garanta uma estadia perfeita aprendendo a se comunicar com a recepção.',
    icon: '🏨',
    initialMessage: 'Welcome to the Grand Plaza Hotel! Do you have a reservation with us today?'
  },
  {
    id: 'medical',
    title: 'Saúde & Bem-estar',
    description: 'Aprenda a descrever sintomas e entender recomendações médicas com clareza.',
    icon: '🏥',
    initialMessage: 'Good morning. What seems to be the problem today? How can I help you?'
  },
  {
    id: 'taxi',
    title: 'Mobilidade Urbana',
    description: 'Saiba como solicitar transporte e negociar destinos com segurança.',
    icon: '🚕',
    initialMessage: 'Hello! Where can I take you today? Please fasten your seatbelt.'
  },
  {
    id: 'interview',
    title: 'Carreira & Entrevistas',
    description: 'Conquiste sua vaga internacional treinando respostas para perguntas desafiadoras.',
    icon: '💼',
    initialMessage: 'Thank you for coming in today. To start, could you tell me a little bit about yourself and your professional background?'
  },
  {
    id: 'business',
    title: 'Networking & Reuniões',
    description: 'Aprimore sua oratória corporativa e aprenda a negociar com confiança.',
    icon: '📊',
    initialMessage: 'Welcome everyone to today\'s meeting. Let\'s start by discussing the project timeline. Any thoughts?'
  },
  {
    id: 'social',
    title: 'Conexões Sociais',
    description: 'Domine a arte do \'small talk\' e faça novas amizades em qualquer lugar.',
    icon: '👋',
    initialMessage: 'Hi there! I don\'t think we\'ve met before. I\'m Alex. How are you enjoying the party?'
  },
  {
    id: 'shopping',
    title: 'Shopping & Estilo',
    description: 'Explore lojas e aprenda a perguntar sobre tamanhos, cores e ofertas.',
    icon: '🛍️',
    initialMessage: 'Hello! Is there anything in particular you\'re looking for today? We have a great sale on jackets.'
  },
  {
    id: 'directions',
    title: 'Localização & Mapas',
    description: 'Nunca mais se perca: aprenda a pedir e entender direções detalhadas.',
    icon: '📍',
    initialMessage: 'Excuse me! You look a bit lost. Do you need help finding somewhere?'
  },
  {
    id: 'emergency',
    title: 'Situações de Emergência',
    description: 'Saiba exatamente o que dizer para pedir socorro em momentos críticos.',
    icon: '🚨',
    initialMessage: 'Oh my god! Are you okay? Do you need me to call an ambulance or the police?'
  }
];

function VoiceVisualizer({ isSpeaking }: { isSpeaking: boolean }) {
  return (
    <div className="flex items-center gap-1 h-4">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          animate={isSpeaking ? {
            height: [4, 16, 4],
            opacity: [0.5, 1, 0.5]
          } : {
            height: 4,
            opacity: 0.3
          }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            delay: i * 0.1,
            ease: "easeInOut"
          }}
          className="w-1 bg-primary rounded-full"
        />
      ))}
    </div>
  );
}

function SessionCompleteModal({ xp, onRestart, onClose }: { xp: number, onRestart: () => void, onClose: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-primary/90 backdrop-blur-md"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-[32px] sm:rounded-[48px] p-6 sm:p-10 max-w-md w-full text-center shadow-2xl"
      >
        <div className="w-16 h-16 sm:w-24 sm:h-24 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
          <Award size={32} className="sm:w-12 sm:h-12" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">Sessão Concluída!</h2>
        <p className="text-sm sm:text-base text-gray-500 mb-6 sm:mb-8">Parabéns! Você completou este cenário com sucesso e praticou sua conversação.</p>
        
        <div className="bg-gray-50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 mb-6 sm:mb-8 flex items-center justify-between">
          <div className="text-left">
            <p className="text-[8px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">Total de XP</p>
            <p className="text-xl sm:text-2xl font-black text-primary">+{xp} XP</p>
          </div>
          <div className="flex -space-x-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center text-white text-xs">
                <Sparkles size={10} className="sm:w-3.5 sm:h-3.5" />
              </div>
            ))}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <button 
            onClick={onRestart}
            className="py-3 sm:py-4 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-xl sm:rounded-2xl font-black text-sm sm:text-base transition-all"
          >
            REINICIAR
          </button>
          <button 
            onClick={onClose}
            className="py-3 sm:py-4 bg-primary hover:bg-primary-dark text-white rounded-xl sm:rounded-2xl font-black text-sm sm:text-base shadow-lg shadow-primary/20 transition-all"
          >
            CONCLUIR
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface Suggestion {
  text: string;
  translation: string;
}

export default function AITutor({ onSessionComplete }: AITutorProps) {
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [lastFeedback, setLastFeedback] = useState<ChatResponse['feedback'] | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [speechSpeed, setSpeechSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [translatingId, setTranslatingId] = useState<number | null>(null);
  const [translations, setTranslations] = useState<Record<number, string>>({});
  const [sessionXp, setSessionXp] = useState(0);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [progress, setProgress] = useState(0);
  const [speakingMessageIndex, setSpeakingMessageIndex] = useState<number | null>(null);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = textarea.scrollHeight;
      const minHeight = window.innerWidth < 640 ? 56 : 52;
      textarea.style.height = `${Math.min(Math.max(minHeight, newHeight), 160)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputText]);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setError("Acesso ao microfone negado. Por favor, habilite as permissões nas configurações do seu navegador.");
        } else if (event.error === 'no-speech') {
          // Ignore no-speech errors as they are common
        } else {
          setError(`Erro no microfone: ${event.error}`);
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const startScenario = (scenario: Scenario) => {
    setSelectedScenario(scenario);
    setMessages([{ role: 'model', text: scenario.initialMessage }]);
    setLastFeedback(null);
    setSessionXp(0);
    setProgress(0);
    setSuggestions([]);
    setTranslations({});
    speakText(scenario.initialMessage, 0);
  };

  const handleSendMessage = async (text: string = inputText) => {
    if (!text.trim() || !selectedScenario) return;

    const userMessage: ChatMessage = { role: 'user', text };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);
    setLastFeedback(null);
    setSuggestions([]);

    try {
      const response = await chatWithAI(messages, text, selectedScenario.title);
      const botMessage: ChatMessage = { role: 'model', text: response.text };
      setMessages(prev => [...prev, botMessage]);
      if (response.feedback) {
        setLastFeedback(response.feedback);
      }
      
      // The index will be the current messages length + 1 (for the bot message)
      // Actually, since we just added user message, messages.length is already N+1.
      // So bot message is at index messages.length + 1.
      // Wait, let's just use the length of the array after both are added.
      speakText(response.text, messages.length + 1);
      
      // Update progress (max 10 messages)
      setProgress(prev => {
        const newProgress = Math.min(100, prev + 10);
        if (newProgress === 100) {
          setTimeout(() => setIsSessionComplete(true), 2000);
        }
        return newProgress;
      });

      // Award XP for each message
      const xpGain = 15;
      setSessionXp(prev => prev + xpGain);
      if (onSessionComplete) {
        onSessionComplete(xpGain);
      }
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    if (!isSpeaking && messages.length > 0 && messages[messages.length - 1].role === 'model') {
      // Simple logic to generate suggestions based on the last AI message
      // In a real app, this would come from the AI
      const lastMsg = messages[messages.length - 1].text.toLowerCase();
      let newSuggestions: Suggestion[] = [];
      
      if (lastMsg.includes('ready to order')) {
        newSuggestions = [
          { text: "Yes, I'm ready.", translation: "Sim, estou pronto." },
          { text: "Not yet, one moment please.", translation: "Ainda não, um momento por favor." },
          { text: "What do you recommend?", translation: "O que você recomenda?" }
        ];
      } else if (lastMsg.includes('passport')) {
        newSuggestions = [
          { text: "Here it is.", translation: "Aqui está." },
          { text: "Sure, one second.", translation: "Claro, um segundo." },
          { text: "I have it right here.", translation: "Eu tenho bem aqui." }
        ];
      } else if (lastMsg.includes('reservation')) {
        newSuggestions = [
          { text: "Yes, under the name Smith.", translation: "Sim, sob o nome Smith." },
          { text: "I don't have one, is there a room?", translation: "Não tenho, tem algum quarto?" },
          { text: "Yes, for two nights.", translation: "Sim, por duas noites." }
        ];
      } else if (lastMsg.includes('problem today')) {
        newSuggestions = [
          { text: "I have a terrible headache.", translation: "Estou com uma dor de cabeça terrível." },
          { text: "I've been feeling dizzy.", translation: "Tenho me sentido tonto." },
          { text: "My throat is very sore.", translation: "Minha garganta está muito inflamada." }
        ];
      } else if (lastMsg.includes('take you today')) {
        newSuggestions = [
          { text: "To the airport, please.", translation: "Para o aeroporto, por favor." },
          { text: "How much to the city center?", translation: "Quanto custa até o centro?" },
          { text: "I'm going to this address.", translation: "Vou para este endereço." }
        ];
      } else if (lastMsg.includes('project timeline')) {
        newSuggestions = [
          { text: "I think we need more time.", translation: "Acho que precisamos de mais tempo." },
          { text: "The deadline is too tight.", translation: "O prazo está muito apertado." },
          { text: "Everything looks good to me.", translation: "Tudo parece bom para mim." }
        ];
      } else if (lastMsg.includes('call an ambulance')) {
        newSuggestions = [
          { text: "Yes, please call 911!", translation: "Sim, por favor ligue para o 911!" },
          { text: "No, I just need some water.", translation: "Não, só preciso de um pouco de água." },
          { text: "I think I broke my arm.", translation: "Acho que quebrei meu braço." }
        ];
      } else if (lastMsg.includes('about yourself')) {
        newSuggestions = [
          { text: "I'm a software engineer.", translation: "Eu sou um engenheiro de software." },
          { text: "I have 5 years of experience.", translation: "Eu tenho 5 anos de experiência." },
          { text: "I'm very passionate about learning.", translation: "Eu sou muito apaixonado por aprender." }
        ];
      } else if (lastMsg.includes('how are you')) {
        newSuggestions = [
          { text: "I'm doing great, thanks!", translation: "Estou indo muito bem, obrigado!" },
          { text: "I'm having a good time.", translation: "Estou me divertindo." },
          { text: "It's a nice party, isn't it?", translation: "É uma festa legal, não é?" }
        ];
      } else if (lastMsg.includes('looking for')) {
        newSuggestions = [
          { text: "I'm looking for a jacket.", translation: "Estou procurando uma jaqueta." },
          { text: "Do you have this in medium?", translation: "Você tem isso no tamanho médio?" },
          { text: "Where are the fitting rooms?", translation: "Onde ficam os provadores?" }
        ];
      } else if (lastMsg.includes('help finding')) {
        newSuggestions = [
          { text: "Yes, where is the museum?", translation: "Sim, onde fica o museu?" },
          { text: "I'm looking for the train station.", translation: "Estou procurando a estação de trem." },
          { text: "Is it far from here?", translation: "É longe daqui?" }
        ];
      } else {
        newSuggestions = [
          { text: "Can you repeat that?", translation: "Pode repetir isso?" },
          { text: "I don't understand.", translation: "Eu não entendo." },
          { text: "How do you say that in Portuguese?", translation: "Como se diz isso em português?" }
        ];
      }
      
      setSuggestions(newSuggestions);
    }
  }, [isSpeaking, messages]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setIsListening(true);
      recognitionRef.current?.start();
    }
  };

  const speakText = async (text: string, index: number | null = null) => {
    console.log("SpeakText triggered for:", text);
    if (isSpeaking || loadingAudio) {
      console.log("Already speaking or loading, skipping.");
      return;
    }
    
    setLoadingAudio(true);
    setSpeakingMessageIndex(index);
    try {
      // Create or resume AudioContext
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        console.log("Initializing new AudioContext");
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
      }
      
      const audioContext = audioContextRef.current;
      if (audioContext.state === 'suspended') {
        console.log("Resuming AudioContext");
        await audioContext.resume();
      }

      console.log(`Generating TTS with Gemini at ${speechSpeed} speed...`);
      const base64Audio = await generateTTS(text, 'Kore', speechSpeed);
      console.log("TTS generated successfully, length:", base64Audio.length);
      
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
      
      // Adjust playback rate based on speed for extra effect
      if (speechSpeed === 'slow') source.playbackRate.value = 0.9;
      else if (speechSpeed === 'fast') source.playbackRate.value = 1.1;
      else source.playbackRate.value = 1.0;

      source.connect(audioContext.destination);
      
      source.onended = () => {
        console.log("Audio playback ended");
        setIsSpeaking(false);
        setSpeakingMessageIndex(null);
      };
      
      setLoadingAudio(false);
      setIsSpeaking(true);
      console.log("Starting audio playback");
      source.start(0);

      // Safety timeout to reset isSpeaking after 15 seconds
      setTimeout(() => {
        setIsSpeaking(false);
        setSpeakingMessageIndex(null);
      }, 15000);
    } catch (error) {
      console.error("Gemini TTS error, falling back to Web Speech API:", error);
      
      // Fallback to Web Speech API
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        
        // Set rate for fallback
        if (speechSpeed === 'slow') utterance.rate = 0.7;
        else if (speechSpeed === 'fast') utterance.rate = 1.3;
        else utterance.rate = 1.0;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
          setIsSpeaking(false);
          setSpeakingMessageIndex(null);
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
          setSpeakingMessageIndex(null);
          setLoadingAudio(false);
        };
        
        setLoadingAudio(false);
        window.speechSynthesis.speak(utterance);
      } catch (fallbackError) {
        console.error("Web Speech API fallback failed:", fallbackError);
        setIsSpeaking(false);
        setLoadingAudio(false);
      }
    }
  };

  const resetChat = () => {
    if (selectedScenario) {
      setMessages([{ role: 'model', text: selectedScenario.initialMessage }]);
      setLastFeedback(null);
      setProgress(0);
      setSuggestions([]);
      speakText(selectedScenario.initialMessage, 0);
    }
  };

  const handleTranslate = async (text: string, index: number) => {
    if (translations[index]) {
      // Toggle off if already translated
      const newTranslations = { ...translations };
      delete newTranslations[index];
      setTranslations(newTranslations);
      return;
    }

    setTranslatingId(index);
    try {
      const result = await translateText(text, ["Portuguese"]);
      setTranslations(prev => ({ ...prev, [index]: result.translations[0].text }));
    } catch (error) {
      console.error("Translation error:", error);
    } finally {
      setTranslatingId(null);
    }
  };

  const [copiedId, setCopiedId] = useState<number | null>(null);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(index);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!selectedScenario) {
    return (
      <div className="min-h-[calc(100vh-12rem)] flex flex-col items-center justify-center relative overflow-hidden px-4 py-12">
        {/* Atmospheric Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full -z-10 overflow-hidden pointer-events-none">
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0],
              x: [0, 100, 0],
              y: [0, 50, 0]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/10 blur-[120px] rounded-full"
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.3, 1],
              rotate: [0, -90, 0],
              x: [0, -100, 0],
              y: [0, -50, 0]
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-indigo-500/10 blur-[120px] rounded-full"
          />
        </div>

        <header className="space-y-6 sm:space-y-8 text-center max-w-4xl mx-auto mb-12 sm:mb-16 px-2">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-2.5 rounded-full bg-white/40 dark:bg-gray-800/40 backdrop-blur-md border border-white/20 dark:border-gray-700/20 shadow-xl"
          >
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-primary dark:text-primary-light">Tecnologia de Imersão 2026</span>
          </motion.div>
          
          <div className="space-y-3 sm:space-y-4 px-4">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-2xl min-[400px]:text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-gray-900 dark:text-white tracking-tighter leading-[1.1] sm:leading-[0.9] font-display break-words overflow-wrap-anywhere"
            >
              Sua Fluência <span className="text-transparent bg-clip-text bg-gradient-to-br from-primary via-indigo-500 to-rose-500 drop-shadow-sm">Começa</span> <br className="hidden sm:block" />
              Aqui.
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xs sm:text-base md:text-xl text-gray-500 dark:text-gray-400 font-medium max-w-2xl mx-auto leading-relaxed break-words"
            >
              Simule situações reais com um tutor de IA que se adapta ao seu nível e oferece feedback instantâneo.
            </motion.p>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center gap-4 sm:gap-6 pt-2 sm:pt-4"
          >
            <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-4 bg-white/50 dark:bg-gray-800/50 p-1.5 sm:p-2 rounded-[24px] sm:rounded-[32px] backdrop-blur-2xl border border-white/20 dark:border-gray-700/20 shadow-2xl max-w-full">
              {(['slow', 'normal', 'fast'] as const).map((speed) => (
                <button
                  key={speed}
                  onClick={() => setSpeechSpeed(speed)}
                  className={`px-4 sm:px-8 py-2 sm:py-3.5 rounded-[18px] sm:rounded-[24px] text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all active:scale-95 whitespace-nowrap ${
                    speechSpeed === speed 
                      ? 'bg-primary text-white shadow-xl shadow-primary/30 scale-[1.05]' 
                      : 'text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  {speed === 'slow' ? 'Lento' : speed === 'normal' ? 'Normal' : 'Rápido'}
                </button>
              ))}
            </div>
          </motion.div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8 w-full max-w-6xl">
          {SCENARIOS.map((scenario, i) => (
            <motion.button
              key={scenario.id}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + (i * 0.1), duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
              whileHover={{ 
                y: -12, 
                scale: 1.02,
                rotateX: 2,
                rotateY: -2,
                transition: { duration: 0.2 }
              }}
              onClick={() => startScenario(scenario)}
              className="group relative p-6 sm:p-10 text-left bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-[32px] sm:rounded-[48px] border border-white/20 dark:border-gray-700/20 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] dark:shadow-none hover:shadow-[0_40px_80px_-20px_rgba(79,70,229,0.2)] transition-all overflow-hidden perspective-1000 flex flex-col h-full"
            >
              <div className="absolute top-0 right-0 w-32 h-32 sm:w-40 sm:h-40 bg-gradient-to-br from-primary/10 to-indigo-500/10 rounded-bl-full -mr-16 -mt-16 sm:-mr-20 sm:-mt-20 group-hover:scale-150 transition-transform duration-700" />
              <div className="text-3xl sm:text-5xl mb-6 sm:mb-10 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500 inline-block drop-shadow-2xl">{scenario.icon}</div>
              <h3 className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white mb-2 sm:mb-4 tracking-tighter break-words leading-none">{scenario.title}</h3>
              <p className="text-xs sm:text-base text-gray-500 dark:text-gray-400 font-medium leading-relaxed mb-6 sm:mb-10 break-words line-clamp-3 flex-grow">{scenario.description}</p>
              <div className="flex items-center gap-3 text-primary dark:text-primary-light font-black text-[10px] sm:text-sm uppercase tracking-[0.2em] group-hover:gap-5 transition-all mt-auto pt-4">
                Começar Agora <ChevronRight size={16} className="sm:w-5 sm:h-5 flex-shrink-0" />
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] sm:h-[calc(100vh-12rem)] w-full max-w-5xl mx-auto bg-white/90 dark:bg-gray-900/90 backdrop-blur-3xl rounded-none sm:rounded-[48px] shadow-2xl dark:shadow-none border-x-0 sm:border border-white/40 dark:border-gray-800/50 overflow-hidden relative transition-all duration-500">
      {/* Animated Background for Chat */}
      <div className="absolute inset-0 -z-10 pointer-events-none opacity-30">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
            x: [0, 50, 0]
          }}
          transition={{ duration: 15, repeat: Infinity }}
          className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/10 via-transparent to-indigo-500/10 blur-3xl"
        />
      </div>

      <AnimatePresence>
        {isSessionComplete && (
          <SessionCompleteModal 
            xp={sessionXp} 
            onRestart={() => {
              setIsSessionComplete(false);
              resetChat();
            }}
            onClose={() => {
              setIsSessionComplete(false);
              setSelectedScenario(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="p-3 sm:p-10 bg-white/40 dark:bg-gray-900/40 backdrop-blur-3xl border-b border-white/20 dark:border-gray-800/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-10 relative z-20">
        <div className="flex items-center justify-between gap-4 sm:gap-8 w-full">
          <div className="flex items-center gap-3 sm:gap-6 min-w-0">
            <motion.button 
              whileHover={{ scale: 1.05, x: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedScenario(null)}
              className="flex items-center gap-2 px-3 sm:px-6 py-2 sm:py-4 bg-white/80 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 rounded-[16px] sm:rounded-[24px] shadow-xl border border-white/50 dark:border-gray-700/50 backdrop-blur-xl transition-all hover:bg-white dark:hover:bg-gray-800 group"
            >
              <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              <span className="hidden sm:inline text-sm font-black uppercase tracking-widest">Sair</span>
            </motion.button>
            <div className="min-w-0">
              <h2 className="text-base sm:text-3xl font-black text-gray-900 dark:text-white tracking-tighter truncate leading-none mb-1 sm:mb-3">{selectedScenario.title}</h2>
              <div className="flex items-center gap-2 sm:gap-8">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="relative">
                    <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${isSpeaking ? 'bg-green-500 animate-ping' : 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.7)]'}`} />
                    <div className="absolute inset-0 bg-green-500/20 rounded-full blur-sm" />
                  </div>
                  <span className="text-[9px] sm:text-[12px] font-black uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500">Tutor Ativo</span>
                </div>
                <VoiceVisualizer isSpeaking={isSpeaking} />
                {sessionXp > 0 && (
                  <motion.div 
                    key={sessionXp}
                    initial={{ scale: 0.5, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-orange-400 text-white px-2 py-1 sm:px-3 sm:py-1.5 rounded-full shadow-xl shadow-amber-400/20"
                  >
                    <Sparkles size={10} className="sm:w-4 sm:h-4 animate-pulse" />
                    <span className="text-[8px] sm:text-[12px] font-black tracking-tight">+{sessionXp} XP</span>
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-6">
            <div className="hidden md:flex items-center bg-white/80 dark:bg-gray-800/80 p-1.5 rounded-[24px] sm:rounded-[32px] border border-white/50 dark:border-gray-700/50 shadow-2xl backdrop-blur-2xl">
              {(['slow', 'normal', 'fast'] as const).map((speed) => (
                <button
                  key={speed}
                  onClick={() => setSpeechSpeed(speed)}
                  className={`px-4 sm:px-8 py-2 sm:py-3 rounded-[18px] sm:rounded-[24px] text-[9px] sm:text-[12px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 touch-manipulation ${
                    speechSpeed === speed 
                      ? 'bg-primary text-white shadow-2xl shadow-primary/30 scale-[1.05] z-10' 
                      : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {speed === 'slow' ? 'Lento' : speed === 'normal' ? 'Normal' : 'Rápido'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <motion.button 
                whileHover={{ scale: 1.1, rotate: -180 }}
                whileTap={{ scale: 0.9 }}
                onClick={resetChat}
                className="p-3 sm:p-5 bg-white/80 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 rounded-[16px] sm:rounded-[28px] shadow-xl border border-white/50 dark:border-gray-700/50 backdrop-blur-xl transition-all hover:bg-white dark:hover:bg-gray-800"
                title="Reiniciar conversa"
              >
                <RotateCcw size={20} className="sm:w-6 sm:h-6" />
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSelectedScenario(null)}
                className="p-3 sm:p-5 bg-rose-500/10 dark:bg-rose-500/20 text-rose-500 rounded-[16px] sm:rounded-[28px] shadow-xl border border-rose-500/20 backdrop-blur-xl transition-all hover:bg-rose-500/20"
              >
                <X size={20} className="sm:w-6 sm:h-6" />
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 overflow-hidden relative z-20">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className="h-full bg-gradient-to-r from-primary via-indigo-500 to-rose-500 shadow-[0_0_10px_rgba(79,70,229,0.5)]"
        />
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 no-scrollbar bg-transparent z-10">
        <div className="max-w-2xl mx-auto w-full space-y-8">
          {messages.map((msg, i) => {
            const isLastTutorMessage = msg.role === 'model' && i === messages.length - 1;
            
            if (msg.role === 'user') {
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex justify-end"
                >
                  <div className="bg-primary text-white p-4 rounded-2xl rounded-tr-none shadow-sm max-w-[85%]">
                    <p className="text-sm sm:text-base font-medium">{msg.text}</p>
                  </div>
                </motion.div>
              );
            }

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center space-y-12 sm:space-y-20 py-12 sm:py-24"
              >
                {/* BLOCO 1: AVATAR + STATUS */}
                <div className="flex flex-col items-center gap-6">
                  <div className="relative">
                    <div className="w-24 h-24 sm:w-48 sm:h-48 rounded-full bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white shadow-2xl">
                      <Bot size={48} className="sm:w-24 sm:h-24" />
                    </div>
                    <div className="absolute bottom-1 right-1 w-6 h-6 sm:w-10 sm:h-10 bg-green-500 border-4 sm:border-8 border-white dark:border-gray-900 rounded-full" />
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <h3 className="text-lg sm:text-2xl font-black uppercase tracking-[0.3em] text-primary">Tutor IA</h3>
                    <p className="text-xs sm:text-base text-gray-400 font-bold tracking-widest">Online e ouvindo</p>
                  </div>
                </div>

                {/* BLOCO 2: MENSAGEM DO TUTOR */}
                <div className="w-full text-center px-4 max-w-4xl">
                  <h2 className="text-2xl sm:text-6xl font-black text-gray-900 dark:text-white leading-tight tracking-tighter">
                    {msg.text.split(/(\[.*?\])/).map((part, idx) => (
                      part.startsWith('[') && part.endsWith(']') ? (
                        <span key={idx} className="text-primary dark:text-primary-light">
                          {part}
                        </span>
                      ) : part
                    ))}
                  </h2>
                  {translations[i] && (
                    <motion.p 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-8 text-lg sm:text-3xl text-gray-500 italic font-medium leading-relaxed"
                    >
                      "{translations[i]}"
                    </motion.p>
                  )}
                </div>

                {/* BLOCO 3: BOTÕES (OUVIR / TRADUZIR) */}
                <div className="flex justify-center gap-3">
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => speakText(msg.text, i)}
                    disabled={loadingAudio || isSpeaking}
                    className="px-6 py-3 bg-primary text-white rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {loadingAudio && speakingMessageIndex === i ? (
                      <RotateCcw size={16} className="animate-spin" />
                    ) : (
                      <Volume2 size={16} className={isSpeaking && speakingMessageIndex === i ? 'animate-pulse' : ''} />
                    )}
                    Ouvir
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleTranslate(msg.text, i)}
                    disabled={translatingId === i}
                    className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 shadow-sm"
                  >
                    <Languages size={16} />
                    {translations[i] ? 'Ocultar' : 'Traduzir'}
                  </motion.button>
                </div>

                {/* BLOCO 4: SUGESTÕES DE RESPOSTA (Only for the last tutor message) */}
                {isLastTutorMessage && suggestions.length > 0 && !isTyping && !isSpeaking && (
                  <div className="w-full pt-4">
                    <div className="grid grid-cols-2 gap-3">
                      {suggestions.map((suggestion, idx) => (
                        <motion.button
                          key={idx}
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleSendMessage(suggestion.text)}
                          className="p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm flex flex-col items-center text-center gap-1 min-h-[80px] justify-center group"
                        >
                          <div className="flex items-center gap-2">
                            <Play size={12} className="text-primary" />
                            <span className="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-200">{suggestion.text}</span>
                          </div>
                          <span className="text-[10px] sm:text-xs text-gray-400 italic">{suggestion.translation}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {/* BLOCO 5: FRASE MOTIVACIONAL (Only for the last tutor message) */}
                {isLastTutorMessage && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-2 pt-2"
                  >
                    <div className="flex items-center gap-2 text-primary">
                      <Sparkles size={14} />
                      <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest">Try using a complete sentence.</span>
                    </div>
                    <p className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] text-center">
                      Dica: Use frases completas para ganhar mais XP
                    </p>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
          
          {isTyping && (
            <div className="flex justify-start pt-4">
              <div className="bg-gray-100 dark:bg-gray-800 px-6 py-3 rounded-2xl flex items-center gap-2">
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 bg-primary rounded-full" />
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-primary rounded-full" />
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-primary rounded-full" />
              </div>
            </div>
          )}
        </div>
        <div ref={chatEndRef} className="h-32" />
      </div>

      {/* Feedback Panel (Global Summary) */}
      <AnimatePresence>
        {lastFeedback && (
          <motion.div
            initial={{ height: 0, opacity: 0, y: 20 }}
            animate={{ height: 'auto', opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: 20 }}
            className="px-3 sm:px-10 pb-6 sm:pb-10 bg-transparent relative z-20"
          >
            <div className="max-w-4xl mx-auto bg-white/80 dark:bg-gray-900/80 backdrop-blur-3xl rounded-[24px] sm:rounded-[40px] p-4 sm:p-12 shadow-2xl border border-white/50 dark:border-gray-700/50 relative group overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-indigo-500 to-rose-500" />
              
              <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-8">
                <motion.div 
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 4 }}
                  className="w-10 h-10 sm:w-16 sm:h-16 bg-gradient-to-br from-indigo-600 to-primary text-white rounded-[12px] sm:rounded-[24px] flex items-center justify-center shadow-2xl flex-shrink-0"
                >
                  <Sparkles size={20} className="sm:w-8 sm:h-8" />
                </motion.div>
                
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-12">
                  <div className="space-y-3 sm:space-y-4">
                    <p className="text-[9px] sm:text-[11px] font-black text-primary dark:text-primary-light uppercase tracking-[0.3em]">Análise de Desempenho</p>
                    <div className="space-y-1 sm:space-y-3">
                      <p className="text-sm sm:text-2xl font-bold text-gray-900 dark:text-white leading-tight">{lastFeedback.grammar}</p>
                      <p className="text-xs sm:text-lg font-medium text-gray-500 dark:text-gray-400">{lastFeedback.vocabulary}</p>
                    </div>
                  </div>
                  <div className="space-y-3 sm:space-y-4">
                    <p className="text-[9px] sm:text-[11px] font-black text-rose-500 uppercase tracking-[0.3em]">Dica de Ouro</p>
                    <p className="text-sm sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400 italic leading-relaxed">"{lastFeedback.suggestion}"</p>
                  </div>
                </div>
                
                <motion.button 
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setLastFeedback(null)} 
                  className="absolute top-4 right-4 sm:relative sm:top-0 sm:right-0 text-gray-300 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded-xl sm:rounded-2xl"
                >
                  <X size={16} className="sm:w-6 sm:h-6" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-32 left-4 right-4 z-50 flex flex-col items-center gap-4 p-6 bg-rose-50 border border-rose-100 rounded-3xl text-rose-600 shadow-2xl shadow-rose-200/50"
          >
            <div className="flex items-center gap-3 w-full">
              <AlertCircle size={24} />
              <p className="text-sm font-bold flex-1">{error}</p>
              <button onClick={() => setError(null)} className="p-1 hover:bg-rose-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            {window.self !== window.top && (
              <button
                onClick={() => window.open(window.location.href, '_blank')}
                className="w-full py-3 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-rose-700 transition-all active:scale-95"
              >
                Abrir em Nova Aba
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area - Telegram/WhatsApp Style */}
      <div className="p-4 sm:p-10 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 z-30 mt-auto">
        <div className="max-w-[1000px] mx-auto">
          {/* Main Input Island */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-indigo-500/20 to-rose-500/20 rounded-[32px] blur-xl opacity-0 group-focus-within:opacity-100 transition-all duration-500" />
            <div className="relative flex items-end gap-2 bg-gray-50/50 dark:bg-gray-800/40 backdrop-blur-xl rounded-[32px] shadow-2xl border border-gray-200/50 dark:border-gray-700/50 transition-all duration-500 focus-within:border-primary/50 focus-within:ring-8 focus-within:ring-primary/5">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleListening}
                className={`flex-shrink-0 w-[52px] h-[52px] sm:w-[64px] sm:h-[64px] flex items-center justify-center rounded-full transition-all relative overflow-hidden ${
                  isListening 
                    ? 'bg-rose-500 text-white shadow-2xl shadow-rose-500/30' 
                    : 'text-gray-400 dark:text-gray-500 hover:text-primary hover:bg-primary/5'
                }`}
              >
                {isListening && (
                  <motion.div 
                    animate={{ scale: [1, 1.8, 1], opacity: [0.4, 0, 0.4] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 bg-white/40 rounded-full"
                  />
                )}
                <Mic size={28} className={isListening ? 'animate-pulse' : ''} />
              </motion.button>
              
              <div className="flex-1 relative min-h-[56px] sm:min-h-[64px] flex items-center">
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Escreva sua resposta em inglês..."
                  className="w-full bg-transparent border-none focus:ring-0 text-[16px] sm:text-[18px] font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 py-[16px] sm:py-[20px] px-2 sm:px-4 resize-none leading-[1.6] max-h-[160px] overflow-y-auto custom-scrollbar"
                  rows={1}
                />
              </div>
              
              <motion.button
                whileHover={{ scale: 1.05, x: 2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || isTyping}
                className={`flex-shrink-0 w-[52px] h-[52px] sm:w-[64px] sm:h-[64px] flex items-center justify-center rounded-full transition-all ${
                  inputText.trim() 
                    ? 'text-primary bg-primary/5' 
                    : 'text-gray-300 dark:text-gray-600'
                }`}
              >
                <Send size={28} />
              </motion.button>
            </div>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-3 mt-4"
          >
            <div className="h-px w-8 bg-gradient-to-r from-transparent to-gray-200 dark:to-gray-700" />
            <p className="text-[10px] sm:text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.4em]">
              {isListening ? 'Ouvindo... Fale agora' : 'Pressione Enter para enviar'}
            </p>
            <div className="h-px w-8 bg-gradient-to-l from-transparent to-gray-200 dark:to-gray-700" />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

