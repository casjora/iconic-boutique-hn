import { useState } from 'react';
import { useStore } from '../store';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Key, ArrowRight, Loader2, Sparkles, AlertCircle, Phone, MapPin, CheckCircle2 } from 'lucide-react';

export default function Login() {
  const { login, register, loading, error, setError } = useStore();
  const navigate = useNavigate();

  // Tab switcher mode: 'signin' or 'signup'
  const [mode, setMode] = useState('signin');
  const [registeredSuccess, setRegisteredSuccess] = useState(false);

  // Input states
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const handleTabChange = (targetMode) => {
    setError(null);
    setRegisteredSuccess(false);
    setMode(targetMode);
    setUsername('');
    setName('');
    setPassword('');
    setPhone('');
    setAddress('');
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
      const ok = await register(username, name, password, phone, address);
      if (ok) {
        setRegisteredSuccess(true);
      }
    }
  };

  return (
    <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="w-full max-w-md space-y-8 bg-white dark:bg-neutral-900 p-10 rounded-3xl shadow-sm border border-neutral-200 dark:border-neutral-800 fade-in-up text-neutral-900 dark:text-neutral-50">
        
        {registeredSuccess ? (
          <div className="text-center space-y-6 py-4">
            <div className="mx-auto w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 rounded-full flex items-center justify-center animate-bounce">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 dark:text-emerald-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black font-display text-neutral-900 dark:text-white tracking-tight">
                ¡Registro Recibido!
              </h2>
              <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                Dos pasos restantes obligatorios:
              </p>
            </div>

            <div className="text-left bg-neutral-50 dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-850 p-4 rounded-2xl space-y-3.5 text-xs">
              <div className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center font-bold text-[10px] text-neutral-800 dark:text-neutral-200 shrink-0">1</span>
                <div>
                  <p className="font-bold text-neutral-800 dark:text-neutral-200">Verifica tu Correo Electrónico</p>
                  <p className="text-neutral-500 mt-0.5 font-medium leading-relaxed">
                    Hemos enviado un enlace a <strong className="text-neutral-800 dark:text-neutral-300 font-mono">{username}</strong>. Debes abrirlo para confirmar tu cuenta. (Revisa bandeja de spam).
                  </p>
                </div>
              </div>
              <div className="flex gap-2.5 border-t border-neutral-100 dark:border-neutral-850 pt-3.5">
                <span className="w-5 h-5 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center font-bold text-[10px] text-neutral-800 dark:text-neutral-200 shrink-0">2</span>
                <div>
                  <p className="font-bold text-neutral-800 dark:text-neutral-200">Aprobación del Administrador</p>
                  <p className="text-neutral-500 mt-0.5 font-medium leading-relaxed">
                    Para seguridad de precios mayoristas, un administrador de Iconic Boutique revisará tu perfil y te asignará el rol correspondiente (Detalle o Mayorista) desde el panel de clientes.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleTabChange('signin')}
              className="w-full flex justify-center py-3 px-4 text-xs font-bold rounded-xl text-neutral-800 dark:text-neutral-200 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 transition-all cursor-pointer"
            >
              Volver al Inicio de Sesión
            </button>
          </div>
        ) : (
          <>
            {/* Upper heading */}
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
                <Key className="h-6 w-6 text-neutral-900 dark:text-amber-400" />
              </div>
              <h2 className="text-3xl font-black font-display text-neutral-900 dark:text-white tracking-tight">
                {mode === 'signin' ? 'Acceso Privado' : 'Registro VIP'}
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium leading-relaxed max-w-xs mx-auto">
                {mode === 'signin' 
                  ? 'Ingresa tus credenciales autorizadas de Dueño, Vendedor o Cliente VIP.' 
                  : 'Regístrate gratis para solicitar tu cuenta de cliente con precios de Detalle o Mayorista.'}
              </p>
            </div>

            {/* Tab Selection */}
            <div className="grid grid-cols-2 p-1 bg-neutral-100 dark:bg-neutral-950 rounded-xl">
              <button
                onClick={() => handleTabChange('signin')}
                className={`py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                  mode === 'signin' 
                    ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-xs' 
                    : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200'
                }`}
              >
                Iniciar Sesión
              </button>
              
              <button
                onClick={() => handleTabChange('signup')}
                className={`py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                  mode === 'signup' 
                    ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-xs' 
                    : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200'
                }`}
              >
                Crear Cuenta VIP
              </button>
            </div>

            {/* Error reporting */}
            {error && (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs font-semibold text-rose-800 dark:text-rose-200 flex items-start justify-between gap-2.5 relative">
                <div className="flex items-start gap-2.5 text-left">
                  <AlertCircle className="h-4 w-4 text-rose-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Error de Acceso:</p>
                    <p className="mt-0.5 font-medium leading-relaxed">{error}</p>
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

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5 text-left">
              <div className="space-y-4 text-xs">
                
                {mode === 'signup' && (
                  <>
                    <div>
                      <label htmlFor="reg-name" className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-2 block">
                        Nombre Completo
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <User className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
                        </div>
                        <input
                          id="reg-name"
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="block w-full pl-10 pr-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-850 rounded-xl text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-600 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-amber-400 focus:border-transparent transition-all outline-none"
                          placeholder="Ej. Juan Pérez"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="reg-phone" className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-2 block">
                        Número de Teléfono (WhatsApp)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <Phone className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
                        </div>
                        <input
                          id="reg-phone"
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="block w-full pl-10 pr-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-850 rounded-xl text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-600 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-amber-400 focus:border-transparent transition-all outline-none"
                          placeholder="Ej. +504 9900-1122"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="reg-address" className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-2 block">
                        Dirección de Envío Preferida (Opcional)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <MapPin className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
                        </div>
                        <input
                          id="reg-address"
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="block w-full pl-10 pr-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-850 rounded-xl text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-600 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-amber-400 focus:border-transparent transition-all outline-none"
                          placeholder="Ej. Col. Las Minitas, Calle Principal Casa #4"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label htmlFor="reg-username" className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-2 block">
                    Correo o Usuario
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
                    </div>
                    <input
                      id="reg-username"
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="block w-full pl-10 pr-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-850 rounded-xl text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-600 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-amber-400 focus:border-transparent transition-all outline-none"
                      placeholder={mode === 'signin' ? 'ejemplo@correo.com o "dueño"' : 'ejemplo@correo.com'}
                      autoCapitalize="off"
                    />
                  </div>
                  {mode === 'signin' && (
                    <span className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1 block font-medium">
                      * Tip: Los empleados pueden ingresar usando su apodo directo o email corporativo.
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label htmlFor="reg-pass" className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider block">
                      Contraseña
                    </label>
                    {mode === 'signin' && (
                      <Link to="/forgot-password" className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors">
                        ¿La olvidaste?
                      </Link>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
                    </div>
                    <input
                      id="reg-pass"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-850 rounded-xl text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-600 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-amber-400 focus:border-transparent transition-all outline-none"
                      placeholder="••••••••"
                      minLength={mode === 'signup' ? 6 : undefined}
                    />
                  </div>
                  {mode === 'signup' && (
                    <span className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1 block font-medium">
                      * Mínimo de 6 caracteres obligatorios.
                    </span>
                  )}
                </div>

              </div>

              <button
                type="submit"
                disabled={loading || !username || !password}
                className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-xs font-black rounded-xl text-white dark:text-neutral-950 bg-neutral-900 hover:bg-neutral-850 dark:bg-amber-400 dark:hover:bg-amber-300 transition-all disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer uppercase tracking-wider"
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
          </>
        )}
      </div>
    </div>
  );
}
