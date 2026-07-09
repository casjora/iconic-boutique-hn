import React from 'react';
import { useStore } from '../store';
import { Link } from 'react-router-dom';
import PerfumeCard from '../components/PerfumeCard';
import { Percent, Award, ShieldAlert, Sparkles } from 'lucide-react';

export default function OfertasView() {
  const { products, user } = useStore();

  const isClient = user?.role === 'client';

  // Filters only products where pricePromotional < pricePublic
  const promoProducts = products.filter(p => p.pricePromotional < p.pricePublic);

  return (
    <div className="space-y-6 fade-in-up">
      
      {/* Header */}
      <div className="text-center max-w-xl mx-auto py-4">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 mb-3 shadow-sm">
          <Percent className="h-6 w-6" />
        </div>
        <h2 className="font-display text-2xl font-bold text-neutral-900 tracking-tight sm:text-3xl">
          Ofertas Especiales y Precios VIP
        </h2>
        <p className="text-xs text-neutral-500 mt-1">
          Fragancias originales seleccionadas de marcas exclusivas con tarifas promocionales para nuestros distribuidores y socios registrados en Honduras.
        </p>
      </div>

      {/* Info status card */}
      {!isClient && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50/20 p-6 max-w-2xl mx-auto text-center space-y-4 shadow-sm">
          <div className="flex justify-center text-amber-600">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h3 className="font-display font-bold text-neutral-900 text-lg">
            ¡Acceso Restringido a Precios Promocionales!
          </h3>
          <p className="text-xs text-neutral-600 leading-relaxed max-w-md mx-auto">
            Actualmente estás navegando con la tarifa de <strong>Público General</strong>. Crea una cuenta gratuita como Cliente/Distribuidor o inicia sesión para revelar las ofertas VIP exclusivas en Honduras.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
              Ingresar / Crear Cuenta
            </Link>
          </div>
        </div>
      )}

      {isClient && (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/10 p-6 max-w-2xl mx-auto text-center space-y-2 shadow-sm">
          <div className="flex justify-center text-emerald-600">
            <Award className="h-8 w-8 animate-bounce" />
          </div>
          <h3 className="font-display font-bold text-emerald-950 text-lg">
            ✓ Tarifa VIP de Distribuidor Activa
          </h3>
          <p className="text-xs text-emerald-800 max-w-md mx-auto">
            Estás autorizado para comprar al por mayor en Honduras. Se aplicará de forma automática el precio promocional en tu orden final.
          </p>
        </div>
      )}

      {/* Grid of Offers */}
      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {promoProducts.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-neutral-200 bg-white p-12 text-center text-neutral-400 font-medium">
            No hay ofertas especiales activas en este momento. Vuelve a consultar pronto.
          </div>
        ) : (
          promoProducts.map((p) => (
            <PerfumeCard key={p.id} product={p} />
          ))
        )}
      </div>

    </div>
  );
}
