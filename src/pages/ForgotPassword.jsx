import { useState } from 'react';
import { useStore } from '../store';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, Loader2, KeyRound } from 'lucide-react';

export default function ForgotPassword() {
  const { resetPasswordForEmail, loading } = useStore();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setStatus({ type: '', message: '' });
    const res = await resetPasswordForEmail(email);

    if (res.success) {
      setStatus({ 
        type: 'success', 
        message: 'Revisa tu bandeja de entrada. Te hemos enviado un enlace para restablecer tu contraseña.' 
      });
      setEmail('');
    } else {
      setStatus({ 
        type: 'error', 
        message: res.error || 'Ocurrió un error al enviar el correo. Verifica tu dirección y vuelve a intentarlo.' 
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
          <h2 className="text-3xl font-black font-display text-neutral-900 tracking-tight">Recuperar Contraseña</h2>
          <p className="text-sm text-neutral-500 font-medium">
            Ingresa tu correo electrónico y te enviaremos un enlace para crear una nueva contraseña.
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
              <label htmlFor="email" className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2 block">
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-neutral-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all"
                  placeholder="ejemplo@correo.com"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !email}
            className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-neutral-900 hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <span className="flex items-center gap-2">
                Enviar Enlace <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            )}
          </button>
          
          <div className="text-center mt-6">
            <Link to="/login" className="text-sm font-semibold text-neutral-600 hover:text-neutral-900 transition-colors">
              Volver al inicio de sesión
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
