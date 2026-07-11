import { Link } from 'react-router-dom';
import { useStore } from '../store';
import HondurasGuide from '../components/HondurasGuide';
import { Sparkles, Truck, Percent, Award, ArrowRight } from 'lucide-react';

export default function Home() {
  const { user } = useStore();

  return (
    <div className="space-y-12 fade-in-up">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-neutral-900 text-white p-8 sm:p-12 md:p-16 shadow-lg">
        {/* Abstract elegant decoration */}
        <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-linear-to-br from-neutral-800 to-transparent opacity-50 -mr-20 -mt-20 blur-2xl" />
        
        <div className="relative max-w-2xl space-y-6">
          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-800 px-3 py-1 text-xs font-semibold text-neutral-300">
            <Sparkles className="h-3 w-3 text-amber-400 animate-pulse" />
            Perfumes Importados Originales en Honduras
          </span>
          
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight leading-none text-white">
            Seducción en cada gota, calidad garantizada.
          </h1>
          
          <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
            Descubre nuestro catálogo exclusivo de fragancias de diseñador. Ofrecemos precios especiales para público general y tarifas promocionales altamente competitivas para revendedores y mayoristas VIP en Honduras.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to="/catalog"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-xs font-black text-neutral-950 hover:bg-neutral-100 cursor-pointer shadow active:scale-95 transition-all"
            >
              Explorar Catálogo
              <ArrowRight className="h-4 w-4" />
            </Link>
            
            {!user && (
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-2xl bg-neutral-800 border border-neutral-700 px-6 py-3.5 text-xs font-semibold text-neutral-200 hover:bg-neutral-700 cursor-pointer active:scale-95 transition-all"
              >
                Registrarse como Distribuidor VIP
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Feature Bento overview */}
      <div className="grid gap-6 sm:grid-cols-3">
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 hover:shadow-sm transition-shadow">
          <div className="p-2.5 bg-neutral-900 text-white rounded-xl w-fit mb-4">
            <Truck className="h-5 w-5" />
          </div>
          <h2 className="font-display font-bold text-neutral-900 text-base mb-1">Envíos a Todo Honduras</h2>
          <p className="text-xs text-neutral-500">Coordinamos despachos seguros por Rapido Cargo o CAEX, o delivery en moto en Tegucigalpa y SPS.</p>
        </div>
        
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 hover:shadow-sm transition-shadow">
          <div className="p-2.5 bg-neutral-900 text-white rounded-xl w-fit mb-4">
            <Percent className="h-5 w-5" />
          </div>
          <h2 className="font-display font-bold text-neutral-900 text-base mb-1">Ofertas Exclusivas VIP</h2>
          <p className="text-xs text-neutral-500">Los clientes mayoristas tienen acceso inmediato a precios promocionales con descuentos de hasta L. 600.</p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-5 hover:shadow-sm transition-shadow">
          <div className="p-2.5 bg-neutral-900 text-white rounded-xl w-fit mb-4">
            <Award className="h-5 w-5 animate-pulse text-amber-500" />
          </div>
          <h2 className="font-display font-bold text-neutral-900 text-base mb-1">100% Originales Sella</h2>
          <p className="text-xs text-neutral-500">Garantía absoluta de autenticidad en cada frasco de diseñador importado directo de USA.</p>
        </div>
      </div>

      {/* Honduras Guide Panel */}
      <HondurasGuide />
    </div>
  );
}
