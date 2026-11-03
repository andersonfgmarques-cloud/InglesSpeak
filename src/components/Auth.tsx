
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth, db } from '../firebase';

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';

import {
  doc,
  setDoc,
  getDoc
} from 'firebase/firestore';

import {
  Mic,
  Mail,
  Lock,
  User,
  ArrowRight
} from 'lucide-react';

interface AuthProps {
  onAuthComplete: () => void;
}

export default function Auth({ onAuthComplete }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Cria o perfil do usuário caso ainda não exista
  const ensureUserProfile = async (user: any) => {
    const userRef = doc(db, 'users', user.uid);
    const userSnapshot = await getDoc(userRef);

    if (!userSnapshot.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        name: user.displayName || name || 'Usuário',
        email: user.email || '',
        photoURL: user.photoURL || '',
        bio: '',
        level: 'Iniciante',
        nativeLanguage: 'Português',
        goals: [],
        location: '',
        joinedDate: new Date().toISOString()
      });
    }
  };

  // Login ou cadastro por e-mail e senha
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const result = await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

        await ensureUserProfile(result.user);
      } else {
        const result = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

        await updateProfile(result.user, {
          displayName: name.trim()
        });

        await ensureUserProfile({
          ...result.user,
          displayName: name.trim()
        });
      }

      onAuthComplete();

    } catch (err: any) {
      console.error('Authentication error:', err);

      switch (err.code) {
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
          setError(
            'E-mail ou senha incorretos. Se sua conta foi criada pelo Google, utilize o botão Continuar com Google.'
          );
          break;

        case 'auth/user-not-found':
          setError('Não encontramos uma conta com esse e-mail.');
          break;

        case 'auth/email-already-in-use':
          setError(
            'Este e-mail já está cadastrado. Tente entrar com sua conta existente.'
          );
          break;

        case 'auth/weak-password':
          setError('A senha precisa ter pelo menos 6 caracteres.');
          break;

        case 'auth/invalid-email':
          setError('Informe um endereço de e-mail válido.');
          break;

        case 'auth/too-many-requests':
          setError(
            'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
          );
          break;

        default:
          setError(
            err.message || 'Ocorreu um erro durante a autenticação.'
          );
      }

    } finally {
      setLoading(false);
    }
  };

  // Login com Google
  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();

      provider.setCustomParameters({
        prompt: 'select_account'
      });

      const result = await signInWithPopup(auth, provider);

      await ensureUserProfile(result.user);

      onAuthComplete();

    } catch (err: any) {
      console.error('Google authentication error:', err);

      switch (err.code) {
        case 'auth/popup-closed-by-user':
          setError('A janela de autenticação foi fechada.');
          break;

        case 'auth/popup-blocked':
          setError(
            'O navegador bloqueou a janela. Permita pop-ups para este site.'
          );
          break;

        case 'auth/unauthorized-domain':
          setError(
            'O domínio do SpeakFluent ainda não está autorizado no Firebase.'
          );
          break;

        case 'auth/account-exists-with-different-credential':
          setError(
            'Este e-mail já está associado a outro método de autenticação.'
          );
          break;

        default:
          setError(
            err.message || 'Não foi possível entrar com o Google.'
          );
      }

    } finally {
      setLoading(false);
    }
  };

  // Abre o aplicativo em uma nova aba
  const openInNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f2f5] dark:bg-[#0f172a] p-4 font-sans transition-colors duration-500">

      <div className="max-w-md w-full space-y-8">

        {/* Cabeçalho */}
        <div className="text-center space-y-4">

          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-block p-4 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[32px] text-white shadow-2xl shadow-indigo-200 dark:shadow-none rotate-6 mb-4"
          >
            <Mic size={40} />
          </motion.div>

          <h1 className="text-4xl font-black tracking-tighter text-gray-900 dark:text-white font-display">
            Speak<span className="text-indigo-600">Fluent</span>
          </h1>

          <p className="text-gray-500 dark:text-gray-400 font-medium">
            {isLogin
              ? 'Bem-vindo de volta! Continue sua jornada.'
              : 'Crie sua conta e comece a praticar hoje.'}
          </p>

          {window.self !== window.top && (
            <button
              onClick={openInNewTab}
              className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
            >
              Abrir em Nova Aba para Melhor Experiência
            </button>
          )}

        </div>

        {/* Cartão de autenticação */}
        <motion.div
          layout
          className="card-3d p-8 space-y-6 dark:bg-gray-900 dark:border-white/5"
        >

          <form onSubmit={handleAuth} className="space-y-4">

            <AnimatePresence mode="wait">

              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >

                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">
                    Nome Completo
                  </label>

                  <div className="relative group">

                    <User
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors"
                      size={18}
                    />

                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-12 pr-6 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all font-bold text-gray-900 dark:text-white"
                      placeholder="Seu nome"
                    />

                  </div>
                </motion.div>
              )}

            </AnimatePresence>

            {/* E-mail */}
            <div className="space-y-2">

              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">
                E-mail
              </label>

              <div className="relative group">

                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors"
                  size={18}
                />

                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all font-bold text-gray-900 dark:text-white"
                  placeholder="seu@email.com"
                />

              </div>
            </div>

            {/* Senha */}
            <div className="space-y-2">

              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">
                Senha
              </label>

              <div className="relative group">

                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors"
                  size={18}
                />

                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all font-bold text-gray-900 dark:text-white"
                  placeholder="••••••••"
                />

              </div>
            </div>

            {/* Mensagem de erro */}
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-900/20 p-3 rounded-xl border border-rose-100 dark:border-rose-900/30"
              >
                {error}
              </motion.p>
            )}

            {/* Botão principal */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
            >

              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Entrar' : 'Criar Conta'}
                  <ArrowRight size={18} />
                </>
              )}

            </button>

          </form>

          {/* Separador */}
          <div className="flex items-center gap-3">

            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />

            <span className="text-xs text-gray-400 font-bold">
              OU
            </span>

            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />

          </div>

          {/* Login Google */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-4 bg-white dark:bg-gray-800 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-700 rounded-2xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
          >

            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white text-[#4285F4] text-xl font-black">
              G
            </span>

            Continuar com Google

          </button>

          {/* Alternar cadastro e login */}
          <div className="text-center">

            <button
              type="button"
              onClick={() => {
                setError(null);
                setIsLogin(!isLogin);
              }}
              className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:underline"
            >
              {isLogin
                ? 'Não tem uma conta? Registre-se'
                : 'Já tem uma conta? Entre'}
            </button>

          </div>

        </motion.div>

        {/* Rodapé */}
        <p className="text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
          Ao continuar, você concorda com nossos <br />

          <span className="text-indigo-600">
            Termos de Serviço
          </span>

          {' e '}

          <span className="text-indigo-600">
            Privacidade
          </span>
        </p>

      </div>
    </div>
  );
}
