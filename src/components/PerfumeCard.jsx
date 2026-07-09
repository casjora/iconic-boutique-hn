import React, { useState } from 'react';
import { useStore } from '../store';
import { Link } from 'react-router-dom';
import { ShoppingCart, Sparkles, AlertTriangle, Check, Award, Gift } from 'lucide-react';
import { isProductSet } from '../utils/porductHelper';

export default function PerfumeCard({ product }) {
  const { user, addToCart } = useStore();
  const [added, setAdded] = useState(false);

  const isAuthenticated = !!user;
  const isEmployee = user?.role === 'owner' || user?.role === 'vendedor';
  const isOwner = user?.role === 'owner';

  const saving = product.pricePublic - product.pricePromotional;
  const isOutOfStock = product.stock <= 0;
  const isSet = isProductSet(product);

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addToCart(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  // Get gender category styling
  const getCategoryStyles = () => {
    switch (product.category) {
      case 'Masculino':
        return 'bg-blue-50 text-blue-800 border-blue-100';
      case 'Femenino':
        return 'bg-rose-50 text-rose-800 border-rose-100';
      default:
        return 'bg-purple-50 text-purple-800 border-purple-100';
    }
  };

  // Placeholder images mapped to brands for a beautiful, premium visual feel
  const getProductImage = () => {
    if (product.imageUrl) return product.imageUrl;
    return `https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=400&q=80`;
  };

  return (
    <div className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${isSet ? 'border-indigo-200 ring-1 ring-indigo-50/50' : 'border-neutral-200'}`}>
      
      {/* Category Tag & Stock Status */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-1.5">
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getCategoryStyles()}`}>
          {product.category}
        </span>
        {isSet && (
          <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-600 text-white px-2.5 py-0.5 text-[11px] font-bold shadow-sm">
            <Gift className="h-3 w-3" />
            Set / Estuche
          </span>
        )}
        {isAuthenticated && product.pricePublic !== product.pricePromotional && (
          <span className="inline-flex items-center rounded-full border border-amber-100 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
            Oferta VIP
          </span>
        )}
      </div>

      {/* Product Image Area */}
      <div className="relative aspect-square w-full bg-neutral-100 overflow-hidden">
        <img
          src={getProductImage()}
          alt={product.name}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
        />
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
            <span className="rounded-full bg-white px-4 py-1.5 font-display text-sm font-bold tracking-wide text-neutral-900 shadow-lg">
              Agotado
            </span>
          </div>
        )}
      </div>

      {/* Product Description details */}
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider font-bold text-neutral-400 font-mono">
            {product.brand}
          </span>
          <span className={`text-xs font-mono font-bold ${isSet ? 'text-indigo-600' : 'text-neutral-500'}`}>
            {isSet ? `🎁 ${product.size}` : product.size}
          </span>
        </div>

        <h3 className="font-display text-base font-bold text-neutral-900 group-hover:text-neutral-950 line-clamp-2 leading-snug flex items-start gap-1.5 min-h-[3rem]">
          {isSet && (
            <span className="inline-flex items-center gap-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-black px-1.5 py-0.5 rounded-md border border-indigo-100 uppercase tracking-wide flex-shrink-0 mt-0.5">
              🎁 SET
            </span>
          )}
          <span>{product.name}</span>
        </h3>

        <p className={`mt-1 text-xs line-clamp-2 flex-1 ${isSet ? 'text-indigo-950/80 font-medium bg-indigo-50/40 p-2 rounded-xl border border-indigo-100/30' : 'text-neutral-500'}`}>
          {product.description || (isSet ? 'Set original de regalo que incluye fragancia y accesorios premium.' : 'Fragancia importada original de alta gama. Perfecta para cualquier ocasión especial.')}
        </p>

        {/* Inventory alerts */}
        <div className="mt-3 flex items-center gap-1.5 h-6">
          {isEmployee ? (
            /* Sellers/Owners see exact stock */
            product.stock <= 0 ? (
              <span className="text-[11px] text-red-600 font-bold">Agotado (0 unidades)</span>
            ) : product.stock <= 5 ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600">
                <AlertTriangle className="h-3 w-3" />
                Bajo Stock ({product.stock} unidades)
              </span>
            ) : (
              <span className="text-[11px] text-emerald-600 font-semibold">
                Disponible ({product.stock} unidades)
              </span>
            )
          ) : (
            /* Regular users see alert only if <= 5 */
            product.stock <= 0 ? (
              <span className="text-[11px] text-red-500 font-semibold">Agotado</span>
            ) : product.stock <= 5 ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 animate-pulse bg-red-50 px-2 py-0.5 rounded-lg border border-red-100">
                <AlertTriangle className="h-3 w-3" />
                ¡Solo quedan {product.stock} unidades!
              </span>
            ) : (
              <span className="text-[11px] text-emerald-600 font-semibold">
                Disponible
              </span>
            )
          )}
        </div>

        {/* Cost - ONLY shown to owner */}
        {isOwner && (
          <div className="mt-2 rounded bg-neutral-50 p-1.5 border border-neutral-100 text-[10px] font-mono text-neutral-500 flex justify-between">
            <span>Costo de Compra (Fórmula L27):</span>
            <span className="font-bold text-neutral-800">L. {product.cost.toLocaleString()} HNL</span>
          </div>
        )}

        {/* Pricing Area */}
        <div className="mt-4 border-t border-neutral-100 pt-3">
          {isAuthenticated ? (
            /* Logged in users see BOTH prices (Detail & VIP) */
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-500 font-medium">Precio Detalle:</span>
                <span className="font-bold text-neutral-700 line-through">L. {product.pricePublic.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-neutral-500">Precio VIP/Mayoreo:</span>
                <span className="text-base font-black text-emerald-600 font-mono">
                  L. {product.pricePromotional.toLocaleString()}
                </span>
              </div>
              {saving > 0 && (
                <div className="flex justify-end pt-1">
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    <Award className="h-2.5 w-2.5" />
                    Margen VIP: L. {saving.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* Unlogged users see ONLY detail price */
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-bold text-neutral-400 uppercase leading-none mb-1">
                    Precio Público (Detalle)
                  </span>
                  <span className="text-base font-extrabold text-neutral-900 font-mono">
                    L. {product.pricePublic.toLocaleString()} HNL
                  </span>
                </div>
              </div>
              {/* Special VIP Price Hook */}
              <Link 
                to="/login"
                className="block w-full text-center bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10px] font-bold py-1.5 px-2.5 rounded-lg border border-amber-200/60 transition-colors"
              >
                🔐 Iniciar sesión para ver Precio VIP/Mayoreo
              </Link>
            </div>
          )}
        </div>

        {/* Call to Action button */}
        <button
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          className={`mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all duration-200 cursor-pointer ${
            isOutOfStock
              ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
              : added
              ? 'bg-emerald-600 text-white'
              : 'bg-neutral-900 text-white hover:bg-neutral-800 shadow-sm hover:shadow active:scale-95'
          }`}
        >
          {added ? (
            <>
              <Check className="h-4 w-4" />
              ¡Agregado al Carrito!
            </>
          ) : (
            <>
              <ShoppingCart className="h-4 w-4" />
              Agregar y Cotizar
            </>
          )}
        </button>

      </div>
    </div>
  );
}
