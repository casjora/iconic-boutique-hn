import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { Settings, Save, Bell, ShieldAlert, Loader2, PlayCircle, HelpCircle } from 'lucide-react';

export default function Config() {
  const { telegramConfig, saveTelegramConfig, testTelegram, loading } = useStore();

  const [token, setToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [active, setActive] = useState(false);

  const [status, setStatus] = useState({ type: '', message: '' });
  const [testing, setTesting] = useState(false);

  // Sync state with store on load
  useEffect(() => {
    if (telegramConfig) {
      setToken(telegramConfig.token || '');
      setChatId(telegramConfig.chatId || '');
      setActive(!!telegramConfig.active);
    }
  }, [telegramConfig]);

  const handleSave = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });

    const success = await saveTelegramConfig({
      token: token.trim(),
      chatId: chatId.trim(),
      active
    });

    if (success) {
      setStatus({ type: 'success', message: '¡Configuración de Telegram guardada correctamente!' });
    } else {
      setStatus({ type: 'error', message: 'Error al intentar guardar la configuración.' });
    }
  };

  const handleTest = async () => {
    if (!token || !chatId) {
      setStatus({ type: 'error', message: 'Por favor, ingresa el Token del Bot y el ID del Chat antes de realizar el test.' });
      return;
    }

    setTesting(true);
    setStatus({ type: '', message: '' });

    const success = await testTelegram(token.trim(), chatId.trim());
    setTesting(false);

    if (success) {
      setStatus({ type: 'success', message: '¡Canal de prueba enviado con éxito! Revisa tu chat de Telegram.' });
    } else {
      setStatus({ type: 'error', message: 'Error al enviar la prueba. Verifica el Token y el ID del Chat.' });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 fade-in-up">
      
      {/* Title */}
      <div>
        <h2 className="font-display text-2xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
          <Settings className="h-6 w-6 animate-spin-slow" /> Configuración de Alertas
        </h2>
        <p className="text-xs text-neutral-500 mt-1">
          Configura un bot de Telegram para que tú y tus vendedores reciban notificaciones instantáneas en su celular cada vez que un cliente registre un pedido.
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

      <div className="grid gap-6 md:grid-cols-3">
        
        {/* Helper instructions card */}
        <div className="md:col-span-1 bg-white border border-neutral-200 rounded-3xl p-5 space-y-4 shadow-sm h-fit">
          <h3 className="font-display font-bold text-neutral-900 text-sm flex items-center gap-1.5 border-b border-neutral-100 pb-2">
            <HelpCircle className="h-4 w-4 text-neutral-500" /> Tutorial Rápido
          </h3>
          
          <ol className="list-decimal list-inside text-[11px] text-neutral-600 space-y-3.5 ml-1 leading-relaxed">
            <li>
              Crea un bot de Telegram hablando con <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-bold hover:underline">@BotFather</a>. Envía el comando <code className="bg-neutral-100 px-1 py-0.5 rounded text-neutral-800 font-mono font-bold">/newbot</code>.
            </li>
            <li>
              Copia el <strong>HTTP API Token</strong> generado.
            </li>
            <li>
              Crea un grupo de Telegram con tus vendedores, añade al Bot recién creado como Administrador.
            </li>
            <li>
              Para conocer el <strong>Chat ID</strong> de tu grupo, añade al bot <a href="https://t.me/RawDataBot" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-bold hover:underline">@RawDataBot</a> temporalmente al grupo. Este te responderá con un JSON donde verás el ID (comienza con el signo menos, ej: <code className="bg-neutral-100 px-1 py-0.5 rounded text-neutral-800 font-mono font-bold">-100123456789</code>).
            </li>
            <li>
              Pega los valores, activa la casilla de Alertas y presiona <strong>Probar Conexión</strong>.
            </li>
          </ol>
        </div>

        {/* Telegram parameters settings form */}
        <div className="md:col-span-2 bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm">
          <form onSubmit={handleSave} className="space-y-5">
            <h3 className="font-display font-bold text-neutral-900 text-base border-b border-neutral-100 pb-3 flex items-center gap-1.5">
              <Bell className="h-5 w-5 text-indigo-500" /> Parámetros de Telegram
            </h3>

            <div>
              <label htmlFor="bot-token" className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2 block">
                Token del Bot (HTTP API)
              </label>
              <input
                id="bot-token"
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="block w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all outline-none"
                placeholder="Ej. 1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ"
              />
            </div>

            <div>
              <label htmlFor="group-chat-id" className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2 block">
                ID del Chat / Canal / Grupo
              </label>
              <input
                id="group-chat-id"
                type="text"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                className="block w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all outline-none"
                placeholder="Ej. -100123456789"
              />
            </div>

            {/* Checkbox active alerts */}
            <div className="flex items-center gap-3 bg-neutral-50 p-4 rounded-xl border border-neutral-100">
              <input
                id="alert-active"
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="h-4.5 w-4.5 rounded border-neutral-300 text-neutral-950 focus:ring-neutral-900 cursor-pointer"
              />
              <label htmlFor="alert-active" className="text-xs font-semibold text-neutral-800 cursor-pointer select-none">
                Activar Alertas de Órdenes en Tiempo Real
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={handleTest}
                disabled={testing || !token || !chatId}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-neutral-200 text-neutral-700 text-xs font-bold rounded-xl hover:bg-neutral-50 cursor-pointer active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4" />
                    Probar Conexión
                  </>
                )}
              </button>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl cursor-pointer active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Guardar Configuración
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

      </div>

    </div>
  );
}
