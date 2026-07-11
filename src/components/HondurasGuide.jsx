import  { useState } from 'react';
import { BookOpen, MapPin, History, Truck, Search, ExternalLink } from 'lucide-react';

export default function HondurasGuide() {
  const [guideNo, setGuideNo] = useState('');

  const handleTrack = (e) => {
    e.preventDefault();
    if (!guideNo.trim()) return;
    const url = `https://products.loginextsolutions.com/trackall/#/order?ordno=${encodeURIComponent(guideNo.trim())}&aid=c586fa65-473e-454d-826b-448cea88b320&userType=DELIVERCI`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="bg-white rounded-3xl border border-neutral-200 p-6 sm:p-8 shadow-sm space-y-8 fade-in-up">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white mb-2">
            <BookOpen className="h-3.5 w-3.5" />
            Nuestra Historia y Envíos
          </span>
          <h2 className="font-display text-3xl font-black tracking-tight text-neutral-900 sm:text-4xl">
            Acerca de Iconic Boutique HN
          </h2>
          <p className="text-xs text-neutral-500 max-w-lg mx-auto leading-relaxed">
            Conoce cómo comenzamos, dónde encontrarnos en Tegucigalpa y cómo gestionamos nuestras entregas a todo el territorio nacional.
          </p>
        </div>

        {/* Bento Grid Info Section */}
        <div className="grid gap-6 md:grid-cols-2">
          
          {/* Business History Card */}
          <div className="border border-neutral-100 bg-neutral-50/50 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-neutral-900 text-white rounded-xl">
                <History className="h-5 w-5" />
              </div>
              <h3 className="font-display font-black text-neutral-900 text-base">
                Historia del Negocio
              </h3>
            </div>
            
            <div className="text-xs text-neutral-600 space-y-3 leading-relaxed">
              <p>
                <strong>Iconic Boutique HN</strong> se fundó con la clara misión de brindar a los hondureños acceso directo a fragancias 100% originales de diseñador. Comenzamos como un emprendimiento digital apasionado por la perfumería de alta gama, motivados por la falta de transparencia en la autenticidad y los altos costos del mercado local.
              </p>
              <p>
                Con el tiempo, gracias a la lealtad y recomendación de nuestros distinguidos clientes, crecimos hasta consolidarnos como un referente nacional. Nos enfocamos en ofrecer una experiencia de compra confiable, transparente y profesional, destacando nuestra especialidad en precios competitivos para <strong>mayoristas y distribuidores</strong> en todo Honduras.
              </p>
            </div>
          </div>

          {/* Physical Address & Boutique Card */}
          <div className="border border-neutral-100 bg-neutral-50/50 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-neutral-900 text-white rounded-xl">
                <MapPin className="h-5 w-5" />
              </div>
              <h3 className="font-display font-black text-neutral-900 text-base">
                Dirección Física
              </h3>
            </div>
            
            <div className="text-xs text-neutral-600 space-y-3 leading-relaxed">
              <p>
                Nuestra moderna sala de exhibición y boutique física está estratégicamente ubicada en la zona de mayor plusvalía y seguridad de la capital:
              </p>
              <div className="p-3.5 bg-white border border-neutral-200 rounded-xl space-y-1">
                <p className="font-bold text-neutral-900 flex items-center gap-1">
                  📍 Torre Metrópolis
                </p>
                <p className="pl-5 text-neutral-500 font-medium">
                  Bulevar Suyapa, Tegucigalpa, M.D.C., Honduras.
                </p>
              </div>
              <p className="text-[11px] text-neutral-400">
                * Visítanos de lunes a sábado para conocer y probar nuestra amplia variedad de perfumes originales en stock permanente.
              </p>
            </div>
          </div>

        </div>

        {/* Shipping & Delivery Section */}
        <div className="border border-neutral-200 bg-white rounded-3xl p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-display font-black text-neutral-900 text-lg">
                Logística y Envíos a Nivel Nacional
              </h3>
              <p className="text-xs text-neutral-500">Enviamos tus perfumes de forma rápida y segura a todo el país.</p>
            </div>
          </div>

          <p className="text-xs text-neutral-600 leading-relaxed">
            Realizamos envíos a todos los departamentos de Honduras, principalmente en alianza con la empresa líder de encomiendas <strong>Cargo Expreso (CAEX)</strong>, garantizando que tu producto llegue sellado, seguro y en perfectas condiciones hasta la puerta de tu casa o negocio.
          </p>

          {/* Cargo Expreso Tracking Widget */}
          <div className="bg-neutral-50 rounded-2xl p-5 border border-neutral-100 space-y-4">
            <div className="space-y-1">
              <h4 className="text-xs font-extrabold text-neutral-900 uppercase tracking-wider">
                Seguimiento de Guías Cargo Expreso
              </h4>
              <p className="text-[11px] text-neutral-500">
                Introduce tu número de guía recibido para rastrear tu paquete en tiempo real a través del portal de Loginext:
              </p>
            </div>

            <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  required
                  value={guideNo}
                  onChange={(e) => setGuideNo(e.target.value)}
                  placeholder="Ej. 1002345678"
                  className="block w-full px-4 py-2.5 bg-white border border-neutral-200 rounded-xl text-xs focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all outline-none font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={!guideNo.trim()}
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                <Search className="h-4 w-4" />
                Rastrear Envío
              </button>
            </form>

            {guideNo.trim() && (
              <p className="text-[10px] text-neutral-400 font-mono">
                * Enlace destino:{' '}
                <a
                  href={`https://products.loginextsolutions.com/trackall/#/order?ordno=${guideNo.trim()}&aid=c586fa65-473e-454d-826b-448cea88b320&userType=DELIVERCI`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:underline inline-flex items-center gap-0.5"
                >
                  products.loginextsolutions.com/trackall/... <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </p>
            )}
          </div>
        </div>

        {/* Embedded Google Map */}
        <div className="rounded-3xl overflow-hidden border border-neutral-200 shadow-sm bg-neutral-100">
          <iframe 
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3870.063510515152!2d-87.18567292437604!3d14.08518978634125!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8f6fbf5d55555555%3A0xe5a1b32d164f5b5f!2sTorre%20Metropolis!5e0!3m2!1ses-419!2shn!4v1783549286926!5m2!1ses-419!2shn" 
            width="100%" 
            height="320" 
            style={{ border: 0 }} 
            allowFullScreen={true} 
            loading="lazy" 
            referrerPolicy="strict-origin-when-cross-origin"
            title="Ubicación de Iconic Boutique HN en Torre Metrópolis, Tegucigalpa"
          ></iframe>
        </div>

      </div>
    </div>
  );
}
