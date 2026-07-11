import React from 'react';
import { useStore } from '../store';
import { ShoppingCart, Heart, Tag } from 'lucide-react';
import { isProductSet } from '../utils/productHelper';
import { motion } from 'motion/react';

export default function PerfumeCard({ product }) {
  const { addToCart, favorites, toggleFavorite, user } = useStore();

  const isFav = favorites.includes(product.id);
  const isClient = user?.role === 'client';
  const outOfStock = product.stock <= 0;

  // Price calculations
  const priceToDisplay = isClient ? product.pricePromotional : product.pricePublic;
  const isSet = isProductSet(product);

  const handleAddToCart = (e) => {
    e.preventDefault();
    if (outOfStock) return;
    addToCart(product, 1);
  };

  const handleToggleFavorite = (e) => {
    e.preventDefault();
    toggleFavorite(product.id);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm flex flex-col hover:shadow-md transition-shadow relative"
    >
      {/* Set Badge */}
      {isSet && (
        <span className="absolute top-3 left-3 z-10 inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2.5 py-1 text-[10px] font-extrabold text-white uppercase tracking-wider shadow-sm">
          <Tag className="h-3 w-3" />
          Estuche / Set
        </span>
      )}

      {/* Favorite Button */}
      <button
        onClick={handleToggleFavorite}
        aria-label={isFav ? "Quitar de favoritos" : "Agregar a favoritos"}
        className={`absolute top-3 right-3 z-10 p-2 rounded-full cursor-pointer transition-all border ${
          isFav 
            ? 'bg-rose-50 border-rose-200 text-rose-500' 
            : 'bg-white/80 backdrop-blur-sm border-neutral-200 text-neutral-400 hover:text-rose-500 hover:scale-110'
        }`}
      >
        <Heart className="h-4 w-4 fill-current" />
      </button>

      {/* Image container */}
      <div className="aspect-square bg-neutral-100 flex items-center justify-center p-4 relative overflow-hidden group">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            referrerPolicy="no-referrer"
            className="h-full w-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="text-neutral-300 flex flex-col items-center">
            <span className="text-4xl">🧴</span>
            <span className="text-[10px] font-mono mt-1 uppercase tracking-widest text-neutral-400">Sin Imagen</span>
          </div>
        )}
        {outOfStock && (
          <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-[1px] flex items-center justify-center">
            <span className="bg-neutral-900 text-white font-display font-extrabold text-xs px-3 py-1.5 rounded-full uppercase tracking-widest shadow">
              Agotado
            </span>
          </div>
        )}
      </div>

      {/* Details body */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block font-mono">
            {product.brand || 'Original'}
          </span>
          <h3 className="font-display font-bold text-sm text-neutral-900 line-clamp-2 mt-0.5" title={product.name}>
            {product.name}
          </h3>
          <p className="text-xs text-neutral-500 mt-1">
            Tamaño: <span className="font-semibold text-neutral-700">{product.size || 'N/A'}</span>
          </p>
        </div>

        <div className="space-y-3">
          {/* Prices area */}
          <div className="border-t border-neutral-100 pt-2 flex items-baseline justify-between">
            <div>
              {isClient && product.pricePromotional < product.pricePublic && (
                <span className="block text-[10px] font-bold text-neutral-400 line-through">
                  L. {product.pricePublic.toLocaleString()} HNL
                </span>
              )}
              <span className="text-base font-black text-neutral-950 font-mono">
                L. {priceToDisplay.toLocaleString()}
              </span>
              <span className="text-[10px] font-bold text-neutral-500 ml-1">HNL</span>
            </div>
            
            {isClient && product.pricePromotional < product.pricePublic && (
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md border border-emerald-100">
                VIP
              </span>
            )}
          </div>

          {/* Add to Cart button */}
          <button
            onClick={handleAddToCart}
            disabled={outOfStock}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 border ${
              outOfStock
                ? 'bg-neutral-100 border-neutral-200 text-neutral-400 cursor-not-allowed active:scale-100'
                : 'bg-neutral-900 border-transparent text-white hover:bg-neutral-800 shadow-sm'
            }`}
          >
            <ShoppingCart className="h-4 w-4" />
            {outOfStock ? 'Agotado' : 'Añadir al Carrito'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
