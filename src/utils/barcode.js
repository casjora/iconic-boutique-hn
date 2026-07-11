import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, Loader2, KeyRound } from 'lucide-react';
import { supabase } from '../utils/supabase';

export default function UpdatePassword() {
  const { updatePassword, loading } = useStore();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });

  // In Supabase Auth, when clicking the reset password link, the user is automatically logged in 
  // via a recovery session if the hash is valid, so we can just update the user's password.
  useEffect(() => {
    supabase.auth.onAuthStateChange((event, _session) => {
      if (event === 'PASSWORD_RECOVERY') {
        console.log('Password recovery session established.');
      }
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      setStatus({ type: 'error', message: 'La contraseña debe tener al menos 6 caracteres.' });
      return;
    }

    setStatus({ type: '', message: '' });
    const res = await updatePassword(password);

    if (res.success) {
      setStatus({ 
        type: 'success', 
        message: '¡Contraseña actualizada correctamente! Redirigiendo...' 
      });
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } else {
      setStatus({ 
        type: 'error', 
        message: res.error || 'Ocurrió un error al actualizar la contraseña.' 
      });
    }
  };

  return (
    <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-white p-10 rounded-3xl shadow-sm border border-neutral-200 fade-in-up">
        
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
            <KeyRound className="h-6 w-6 text-neutral-900" />
          </div>
          <h2 className="text-3xl font-black font-display text-neutral-900 tracking-tight">Nueva Contraseña</h2>
          <p className="text-sm text-neutral-500 font-medium">
            Ingresa tu nueva contraseña para acceder a tu cuenta.
          </p>
        </div>

        {status.message && (
          <div className={`p-4 rounded-xl text-sm font-semibold border ${
            status.type === 'error' 
              ? 'bg-rose-50 text-rose-800 border-rose-200' 
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}>
            {status.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <label htmlFor="password" className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2 block">
                Nueva Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-neutral-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all"
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !password}
            className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-neutral-900 hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <span className="flex items-center gap-2">
                Actualizar Contraseña <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
