import React from 'react';
import { CheckCircle2, AlertCircle, Info, Star, ArrowRight, RotateCcw, Languages, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import { SpeechFeedback } from '../lib/gemini';

interface FeedbackDisplayProps {
  feedback: SpeechFeedback;
  targetSentence?: string;
  pronunciation?: string;
  onClose: () => void;
  onRetry?: () => void;
}

export default function FeedbackDisplay({ feedback, targetSentence, pronunciation, onClose, onRetry }: FeedbackDisplayProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200 shadow-emerald-100';
    if (score >= 50) return 'text-amber-600 bg-amber-50 border-amber-200 shadow-amber-100';
    return 'text-rose-600 bg-rose-50 border-rose-200 shadow-rose-100';
  };

  const getErrorTypeColor = (type: string) => {
    switch (type) {
      case 'TH': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Vowel': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Ending': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'R': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'Stress': return 'bg-pink-100 text-pink-700 border-pink-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="w-full max-w-2xl card-3d !bg-white/95 backdrop-blur-2xl border-white/50 overflow-hidden mx-auto shadow-2xl"
    >
      <div className="p-8 md:p-10 space-y-8">
        {/* Header with Score */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest border border-indigo-100">
              <Target size={12} />
              Análise de Precisão
            </div>
            <h2 className="text-4xl font-black text-gray-900 tracking-tighter font-display">Seu Resultado</h2>
            <p className="text-gray-500 font-medium">Veja os pontos de melhoria identificados.</p>
          </div>
          
          <motion.div 
            initial={{ rotate: -10, scale: 0.8 }}
            animate={{ rotate: 0, scale: 1 }}
            className={`flex flex-col items-center justify-center w-32 h-32 rounded-[40px] border-4 shadow-xl ${getScoreColor(feedback.score)}`}
          >
            <span className="text-5xl font-black leading-none">{feedback.score}</span>
            <span className="text-[10px] uppercase font-black tracking-widest mt-1">Score</span>
            <span className="text-[9px] font-bold mt-1 opacity-80">
              {feedback.score >= 80 ? 'Excelente!' : feedback.score >= 50 ? 'Bom trabalho!' : 'Precisa melhorar'}
            </span>
          </motion.div>
        </div>

        {/* Simplified Pronunciation Guide */}
        <div className="p-6 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-3xl border border-indigo-100/50 space-y-4">
          {targetSentence && (
            <div className="space-y-1">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Frase Original</span>
              <p className="text-lg font-black text-gray-900 leading-tight italic">"{targetSentence}"</p>
              {pronunciation && (
                <p className="text-xs text-emerald-600/70 font-mono italic">[{pronunciation}]</p>
              )}
            </div>
          )}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-indigo-600">
              <Languages size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest">Pronúncia Facilitada (PT-BR)</span>
            </div>
            <p className="text-xl font-bold text-indigo-900 italic tracking-wide">
              "{feedback.simplifiedPronunciation}"
            </p>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Star, label: 'Pronúncia', value: feedback.pronunciation, color: 'text-amber-500', bg: 'bg-amber-50' },
            { icon: CheckCircle2, label: 'Clareza', value: feedback.clarity, color: 'text-emerald-500', bg: 'bg-emerald-50' },
            { icon: Info, label: 'Ritmo', value: feedback.pace, color: 'text-indigo-500', bg: 'bg-indigo-50' },
          ].map((item, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-5 bg-gray-50/50 rounded-2xl space-y-2 border border-gray-100"
            >
              <div className={`w-8 h-8 ${item.bg} ${item.color} rounded-lg flex items-center justify-center`}>
                <item.icon size={16} />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.label}</span>
                <p className="text-xs font-bold text-gray-800 leading-tight">{item.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Specific Errors Section */}
        {feedback.specificErrors.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-rose-500 rounded-full" />
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Erros Detectados</h3>
            </div>
            <div className="space-y-3">
              {feedback.specificErrors.map((err, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-black text-gray-900">"{err.word}"</span>
                    <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter border ${getErrorTypeColor(err.type)}`}>
                      {err.type}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle size={14} className="text-rose-500 mt-0.5 shrink-0" />
                      <p className="text-xs font-bold text-gray-600">{err.error}</p>
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                      <CheckCircle2 size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                      <p className="text-xs font-bold text-emerald-800">{err.correction}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* General Tips */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-amber-500 rounded-full" />
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Dicas Gerais</h3>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {feedback.tips.map((tip, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 shadow-sm"
              >
                <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <ArrowRight size={12} />
                </div>
                <p className="text-xs font-bold text-gray-700">{tip}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <button
            onClick={onRetry}
            className="flex-1 btn-3d py-4 bg-white border-2 border-indigo-600 text-indigo-600 text-sm font-black flex items-center justify-center gap-2 hover:bg-indigo-50 transition-colors"
          >
            <RotateCcw size={18} />
            Tentar Novamente
          </button>
          <button
            onClick={onClose}
            className="flex-1 btn-3d py-4 bg-indigo-600 text-white text-sm font-black shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-colors"
          >
            Próxima Frase
          </button>
        </div>
      </div>
    </motion.div>
  );
}

