import { useState } from 'react';
import { useStore } from '../store';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Key, ArrowRight, Loader2, Sparkles, AlertCircle } from 'lucide-react';

export default function Login() {
  const { login, register, loading, error, setError } = useStore();
  const navigate = useNavigate();

  // Tab switcher mode: 'signin' or 'signup'
  const [mode, setMode] = useState('signin');

  // Input states
  const [username, setUsername] = useState(''); // Stores email or custom id
  const [name, setName] = useState(''); // Stores full name for register
  const [password, setPassword] = useState('');

  const handleTabChange = (targetMode) => {
    setError(null);
    setMode(targetMode);
    setUsername('');
    setName('');
    setPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (mode === 'signin') {
      const ok = await login(username, password);
      if (ok) {
        const currentUser = useStore.getState().user;
        if (currentUser?.role === 'owner') {
          navigate('/dashboard');
        } else if (currentUser?.role === 'vendedor') {
          navigate('/orders');
        } else {
          navigate('/catalog');
        }
      }
    } else {
      const ok = await register(username, name, password);
      if (ok) {
        navigate('/catalog');
      }
    }
  };

  return (
    <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-white p-10 rounded-3xl shadow-sm border border-neutral-200 fade-in-up">
        
        {/* Upper heading status info */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
            <Key className="h-6 w-6 text-neutral-900" />
          </div>
          <h2 className="text-3xl font-black font-display text-neutral-900 tracking-tight">
            {mode === 'signin' ? 'Acceso Privado' : 'Registro VIP'}
          </h2>
          <p className="text-sm text-neutral-500 font-medium leading-relaxed max-w-xs mx-auto">
            {mode === 'signin' 
              ? 'Ingresa tus credenciales autorizadas de Dueño, Vendedor o Cliente VIP.' 
              : 'Regístrate gratis para desbloquear las ofertas mayoristas exclusivas para Honduras.'}
          </p>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-2 p-1 bg-neutral-100 rounded-xl">
          <button
            onClick={() => handleTabChange('signin')}
            className={`py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
              mode === 'signin' 
                ? 'bg-white text-neutral-950 shadow-sm' 
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            Iniciar Sesión
          </button>
          
          <button
            onClick={() => handleTabChange('signup')}
            className={`py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
              mode === 'signup' 
                ? 'bg-white text-neutral-950 shadow-sm' 
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            Crear Cuenta VIP
          </button>
        </div>

        {/* Error reporting banner */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-start justify-between gap-2.5 relative">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Error de Autenticación:</p>
                <p className="mt-0.5 font-medium">{error}</p>
              </div>
            </div>
            <button 
              type="button" 
              onClick={() => setError(null)} 
              className="text-rose-500 hover:text-rose-700 font-extrabold ml-2 text-sm leading-none p-1 focus:outline-none cursor-pointer"
              title="Cerrar"
            >
              ✕
            </button>
          </div>
        )}

        {/* Form area */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            
            {/* Input name if register mode */}
            {mode === 'signup' && (
              <div>
                <label htmlFor="reg-name" className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2 block">
                  Nombre Completo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-neutral-400" />
                  </div>
                  <input
                    id="reg-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all outline-none"
                    placeholder="Ej. Juan Pérez"
                  />
                </div>
              </div>
            )}

            {/* Input Email/Username */}
            <div>
              <label htmlFor="reg-username" className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2 block">
                Correo o Usuario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-neutral-400" />
                </div>
                <input
                  id="reg-username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all outline-none"
                  placeholder={mode === 'signin' ? 'ejemplo@correo.com o "dueño"' : 'ejemplo@correo.com'}
                  autoCapitalize="off"
                />
              </div>
              {mode === 'signin' && (
                <span className="text-[10px] text-neutral-400 mt-1 block">
                  * Tip: Los empleados pueden ingresar usando su apodo directo o email corporativo.
                </span>
              )}
            </div>

            {/* Input Password */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="reg-pass" className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">
                  Contraseña
                </label>
                {mode === 'signin' && (
                  <Link to="/forgot-password" className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 transition-colors">
                    ¿La olvidaste?
                  </Link>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-neutral-400" />
                </div>
                <input
                  id="reg-pass"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all outline-none"
                  placeholder="••••••••"
                  minLength={mode === 'signup' ? 6 : undefined}
                />
              </div>
              {mode === 'signup' && (
                <span className="text-[10px] text-neutral-400 mt-1 block">
                  * Mínimo de 6 caracteres obligatorios.
                </span>
              )}
            </div>

          </div>

          {/* Action Trigger Button */}
          <button
            type="submit"
            disabled={loading || !username || !password}
            className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-neutral-900 hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900 transition-all disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <span className="flex items-center gap-2">
                {mode === 'signin' ? 'Ingresar al Portal' : 'Completar Registro VIP'}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            )}
          </button>
        </form>

        {/* Demo hints notice board */}
        <div className="border border-indigo-100 bg-indigo-50/50 rounded-2xl p-4.5 space-y-2">
          <h4 className="text-xs font-extrabold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600 animate-pulse" />
            Credenciales de Acceso Rápido
          </h4>
          <p className="text-[11px] text-indigo-950 leading-relaxed">
            Puedes simular o ingresar de inmediato a los perfiles preconfigurados de la tienda con las siguientes claves:
          </p>
          <div className="grid grid-cols-2 gap-3 text-[10px] font-semibold text-indigo-950 pt-1">
            <div className="bg-white/80 p-2 rounded-lg border border-indigo-100">
              <span className="block text-indigo-500 font-bold uppercase tracking-wider">Rol: Dueño / Owner</span>
              <span className="block mt-1 font-mono">Usuario: <strong className="text-neutral-900">dueño</strong></span>
              <span className="block font-mono">Clave: <strong className="text-neutral-900">dueño123</strong></span>
            </div>
            <div className="bg-white/80 p-2 rounded-lg border border-indigo-100">
              <span className="block text-indigo-500 font-bold uppercase tracking-wider">Rol: Vendedor</span>
              <span className="block mt-1 font-mono">Usuario: <strong className="text-neutral-900">vendedor</strong></span>
              <span className="block font-mono">Clave: <strong className="text-neutral-900">vendedor123</strong></span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
