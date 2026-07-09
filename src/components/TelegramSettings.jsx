import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { Settings, Save, Send, AlertCircle, CheckCircle2, Loader2, HelpCircle } from 'lucide-react';

export default function TelegramSettings() {
  const { telegramConfig, saveTelegramConfig, testTelegram, fetchTelegramConfig, loading, error, setError } = useStore();
  const [token, setToken] = useState(telegramConfig.token || '');
  const [chatId, setChatId] = useState(telegramConfig.chatId || '');
  const [active, setActive] = useState(telegramConfig.active || false);
  const [testSuccess, setTestSuccess] = useState(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetchTelegramConfig();
  }, []);

  useEffect(() => {
    setToken(telegramConfig.token);
    setChatId(telegramConfig.chatId);
    setActive(telegramConfig.active);
  }, [telegramConfig]);

  const handleSave = async (e) => {
    e.preventDefault();
    setTestSuccess(null);
    const success = await saveTelegramConfig({ token, chatId, active });
    if (success) {
      alert('Configuración del bot de Telegram guardada correctamente.');
    }
  };

  const handleTest = async () => {
    if (!token || !chatId) {
      setError('Por favor complete el token y Chat ID para realizar la prueba.');
      return;
    }
    setTesting(true);
    setTestSuccess(null);
    setError(null);

    const ok = await testTelegram(token, chatId);
    setTesting(false);
    if (ok) {
      setTestSuccess(true);
    } else {
      setTestSuccess(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 fade-in-up">
      
      {/* Header */}
      <div>
        <h2 className="font-display text-2xl font-bold text-neutral-900 tracking-tight">
          Notificaciones Automáticas por Telegram
        </h2>
        <p className="text-xs text-neutral-500">
          Configura un bot de Telegram para que los vendedores reciban alertas al instante cada vez que un cliente cotice o envíe una orden de compra.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-neutral-200 p-6 sm:p-8 shadow-sm space-y-6">
        
        {/* Helper info */}
        <div className="bg-neutral-50 rounded-2xl border border-neutral-100 p-4 text-xs text-neutral-600 space-y-2">
          <p className="font-bold text-neutral-900 flex items-center gap-1">
            <HelpCircle className="h-4 w-4 text-neutral-500" />
            ¿Cómo crear y configurar tu Bot de Telegram?
          </p>
          <ol className="list-decimal list-inside space-y-1 text-neutral-700">
            <li>Busca a <strong>@BotFather</strong> en Telegram y envía el comando <code>/newbot</code>.</li>
            <li>Sigue las instrucciones, nómbralo y te dará un <strong>Token de Bot HTTP API</strong> (ej: <code>12345678:ABCDefGh...</code>).</li>
            <li>Para obtener tu <strong>Chat ID</strong>, crea un grupo de Telegram con tus vendedores, agrega a tu bot creado, agrega al bot <strong>@RawDataBot</strong>, y copia el número de ID del chat (comienza con un guión medio, ej: <code>-1001234567890</code>).</li>
            <li>Ingresa las credenciales abajo, activa las notificaciones y realiza una prueba de conexión.</li>
          </ol>
        </div>

        {/* Settings Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">
              Token del Bot de Telegram (HTTP API Token)
            </label>
            <input
              type="text"
              value={token}
              onChange={(e) => { setToken(e.target.value); setTestSuccess(null); }}
              placeholder="ej: 739281392:AAEq9Ww_oWz9Y4..."
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs focus:border-neutral-900 focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">
              Chat ID del Grupo de Vendedores
            </label>
            <input
              type="text"
              value={chatId}
              onChange={(e) => { setChatId(e.target.value); setTestSuccess(null); }}
              placeholder="ej: -100129384820"
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs focus:border-neutral-900 focus:outline-none font-mono"
            />
          </div>

          <div className="flex items-center gap-2 py-2">
            <input
              type="checkbox"
              id="active"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
            />
            <label htmlFor="active" className="text-xs font-bold text-neutral-700 uppercase cursor-pointer select-none">
              Activar notificaciones en tiempo real para nuevas órdenes
            </label>
          </div>

          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-800 flex items-start gap-1.5">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {testSuccess === true && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-start gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5" />
              <span>¡Conexión Exitosa! Se ha enviado un mensaje de confirmación a tu grupo de Telegram.</span>
            </div>
          )}

          {testSuccess === false && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-800 flex items-start gap-1.5">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
              <span>Error en la conexión. Verifique el Token de bot y Chat ID.</span>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-neutral-100 pt-4 mt-6">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || !token || !chatId}
              className="inline-flex items-center gap-1 px-4 py-2.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 bg-white hover:bg-neutral-50 cursor-pointer disabled:opacity-40"
            >
              {testing ? (
                <Loader2 className="h-4 w-4 animate-spin text-neutral-500" />
              ) : (
                <Send className="h-4 w-4 text-neutral-500" />
              )}
              Probar Conexión
            </button>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-neutral-900 text-xs font-bold text-white hover:bg-neutral-800 cursor-pointer shadow-sm active:scale-95 transition-all"
            >
              <Save className="h-4 w-4" />
              Guardar Configuración
            </button>
          </div>

        </form>

      </div>

    </div>
  );
}
