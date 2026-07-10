import React, { useState } from 'react';
import { useStore } from '../store';
import { useNavigate } from 'react-router-dom';
import { Key, UserPlus, Lock, ShieldCheck, Sparkles, Loader2, Info } from 'lucide-react';

export default function LoginView() {
  const { login, register, loading, error, setError } = useStore();
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  
  // Inputs state
  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showSeedHint, setShowSeedHint] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (isRegister) {
      if (!userId || !name || !password || !confirmPassword) {
        setError('Por favor complete todos los campos.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Las contraseñas no coinciden.');
        return;
      }
      const ok = await register(userId.trim(), name.trim(), password);
      if (ok) {
        alert('¡Cuenta creada correctamente! Bienvenido a Iconic Boutique HN.');
        navigate('/catalog');
      }
    } else {
      if (!userId || !password) {
        setError('Por favor complete todos los campos.');
        return;
      }
      const ok = await login(userId.trim(), password);
      if (ok) {
        navigate('/catalog');
      }
    }
  };

  // Quick fill seed accounts for testing
  const handleQuickFill = (uId, pass) => {
    setUserId(uId);
    setPassword(pass);
    setIsRegister(false);
    setError(null);
  };

  return (
    <div className="max-w-md mx-auto py-6 fade-in-up space-y-6">
      
      {/* Seed Accounts Helper (Extremely helpful for previewing different roles!) */}
      {showSeedHint && !isRegister && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
              <Info className="h-4 w-4" />
              Cuentas de Demostración para Prueba
            </span>
            <button
              onClick={() => setShowSeedHint(false)}
              className="text-[10px] text-blue-500 hover:text-blue-950 underline font-semibold"
            >
              Ocultar
            </button>
          </div>
          <p className="text-[11px] text-blue-700 leading-relaxed">
            Hemos pre-cargado tres roles del negocio en Honduras para que pruebes las diferentes vistas:
          </p>
          <div className="grid gap-2 text-[10px] font-mono">
            <button
              onClick={() => handleQuickFill('admin', 'admin123')}
              className="bg-white border border-blue-100 p-2 rounded-lg text-left hover:bg-neutral-50/80 cursor-pointer flex justify-between"
            >
              <span>👑 <strong>Dueño (Admin):</strong> id: <code>admin</code></span>
              <span className="font-bold text-blue-700 hover:underline">Autocompletar</span>
            </button>
            <button
              onClick={() => handleQuickFill('vendedor', 'vend123')}
              className="bg-white border border-blue-100 p-2 rounded-lg text-left hover:bg-neutral-50/80 cursor-pointer flex justify-between"
            >
              <span>💼 <strong>Vendedor (Staff):</strong> id: <code>vendedor</code></span>
              <span className="font-bold text-blue-700 hover:underline">Autocompletar</span>
            </button>
            <button
              onClick={() => handleQuickFill('cliente', 'cliente123')}
              className="bg-white border border-blue-100 p-2 rounded-lg text-left hover:bg-neutral-50/80 cursor-pointer flex justify-between"
            >
              <span>🤝 <strong>Cliente VIP (Distribuidor):</strong> id: <code>cliente</code></span>
              <span className="font-bold text-blue-700 hover:underline">Autocompletar</span>
            </button>
          </div>
        </div>
      )}

      {/* Main card */}
      <div className="bg-white rounded-3xl border border-neutral-200 p-6 sm:p-8 shadow-sm">
        
        {/* Toggle Headings */}
        <div className="flex border-b border-neutral-100 pb-4 mb-6">
          <button
            onClick={() => { setIsRegister(false); setError(null); }}
            className={`flex-1 text-center pb-2 text-sm font-bold tracking-tight border-b-2 cursor-pointer transition-colors ${
              !isRegister
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-400 hover:text-neutral-600'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            onClick={() => { setIsRegister(true); setError(null); }}
            className={`flex-1 text-center pb-2 text-sm font-bold tracking-tight border-b-2 cursor-pointer transition-colors ${
              isRegister
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-400 hover:text-neutral-600'
            }`}
          >
            Crear Cuenta VIP
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div>
            <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">
              Correo Electrónico *
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="ej: tu@correo.com"
              className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-xs focus:border-neutral-900 focus:outline-none font-mono"
              required
            />
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">
                Nombre Completo del Cliente *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ej: Juan Carlos López"
                className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-xs focus:border-neutral-900 focus:outline-none"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">
              Contraseña *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-xs focus:border-neutral-900 focus:outline-none"
              required
            />
            {!isRegister && (
              <div className="flex justify-end mt-1.5">
                <Link to="/forgot-password" className="text-xs font-semibold text-neutral-500 hover:text-neutral-900">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            )}
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">
                Confirmar Contraseña *
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-xs focus:border-neutral-900 focus:outline-none"
                required
              />
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-800 font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-900 text-white py-3 text-xs font-bold hover:bg-neutral-800 shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : isRegister ? (
              <>
                <UserPlus className="h-4 w-4" />
                Registrar Cuenta y Acceder
              </>
            ) : (
              <>
                <Key className="h-4 w-4" />
                Ingresar al Sistema
              </>
            )}
          </button>

          {isRegister && (
            <div className="text-center pt-2">
              <span className="text-[10px] text-neutral-400 font-semibold uppercase leading-none block">
                ✓ Registro Libre y Gratuito
              </span>
              <p className="text-[10px] text-neutral-500 mt-1">
                Cualquier usuario de Honduras puede crear una cuenta VIP de forma automática para obtener tarifas preferenciales de distribuidor.
              </p>
            </div>
          )}

        </form>

      </div>

    </div>
  );
}
