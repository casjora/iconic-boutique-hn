import React from 'react';
import { useStore } from '../store';
import { ShoppingCart, Heart, Tag } from 'lucide-react';
import { isProductSet } from '../utils/productHelper';
import { motion } from 'motion/react';

const PerfumeCard = React.memo(({ product }) => {
  const { addToCart, favorites, toggleFavorite, user, cart, updateCartQuantity, removeFromCart } = useStore();

  const isFav = favorites.includes(product.id);
  const hasVipPrice = !!user;
  const targetStock = product.availableStock !== undefined ? product.availableStock : product.stock;
  const outOfStock = targetStock <= 0;

  // Price calculations
  const isSet = isProductSet(product);

  const cartItem = cart.find(item => item.product.id === product.id);
  const quantityInCart = cartItem ? cartItem.quantity : 0;

  const handleAddToCart = (e) => {
    e.preventDefault();
    if (outOfStock) return;
    addToCart(product, 1);
  };

  const handleDecrease = (e) => {
    e.preventDefault();
    if (quantityInCart === 1) {
      removeFromCart(product.id);
    } else {
      updateCartQuantity(product.id, quantityInCart - 1);
    }
  };

  const handleIncrease = (e) => {
    e.preventDefault();
    if (quantityInCart < targetStock) {
      updateCartQuantity(product.id, quantityInCart + 1);
    }
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
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Set Badge */}
      {isSet && (
        <span className="absolute top-3 left-3 z-10 inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 uppercase tracking-wider shadow-sm">
          <Tag className="h-3 w-3" />
          Set
        </span>
      )}

      {/* Favorite Button */}
      <button
        onClick={handleToggleFavorite}
        aria-label={isFav ? "Quitar de favoritos" : "Agregar a favoritos"}
        className={`absolute top-3 right-3 z-10 p-2 rounded-full cursor-pointer transition-all border ${
          isFav 
            ? 'bg-rose-50 border-rose-200 text-rose-500' 
            : 'bg-white/80 backdrop-blur-sm border-neutral-200 text-neutral-400 hover:text-rose-500'
        }`}
      >
        <Heart className="h-4 w-4 fill-current" />
      </button>

      {/* Image container */}
      <div className="aspect-square flex items-center justify-center overflow-hidden bg-neutral-100 p-4">
        <img
          src={product.image_url || '/placeholder-perfume.png'}
          alt={product.name}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
        />
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/40 backdrop-blur-[1px]">
            <span className="rounded-full bg-neutral-900 px-3 py-1.5 font-display text-xs font-extrabold uppercase tracking-widest text-white shadow">
              Agotado
            </span>
          </div>
        )}
      </div>

      {/* Details body */}
      <div className="flex flex-1 flex-col justify-between p-4 space-y-3">
        <div>
          <span className="block font-mono text-[9px] font-bold uppercase tracking-widest text-neutral-400">
            {product.brand}
          </span>
          <h3 className="font-display mt-0.5 text-sm font-bold text-neutral-900 line-clamp-2" title={product.name}>
            {product.name}
          </h3>
          <div className="mt-2 flex flex-wrap gap-1">
            <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-600">{product.size}</span>
            <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-600">{product.category}</span>
          </div>
        </div>

        <div className="space-y-3">
          {/* Prices area */}
          <div className="flex flex-col space-y-1 pt-2 border-t border-neutral-100">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-neutral-500">Público:</span>
              <span className="font-mono font-bold text-neutral-700">L. {product.pricePublic.toLocaleString()}</span>
            </div>
            {hasVipPrice ? (
              <div className="flex items-center justify-between rounded-lg bg-amber-50 p-1.5 text-xs border border-amber-100">
                <span className="flex items-center gap-1 font-extrabold text-amber-800">
                  🏷️ VIP:
                </span>
                <span className="font-mono font-black text-amber-950">
                  L. {product.pricePromotional.toLocaleString()}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-lg bg-neutral-50 p-1.5 text-xs text-neutral-400">
                <span className="flex items-center gap-1 font-semibold">🔐 VIP:</span>
                <span className="text-[10px] font-extrabold tracking-tight">Inicia sesión</span>
              </div>
            )}
          </div>

          {/* Add to Cart or Quantity Selector */}
          {quantityInCart > 0 ? (
            <div className="flex items-center justify-between h-[38px] overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 px-1">
              <button
                onClick={handleDecrease}
                className="flex h-8 w-10 cursor-pointer items-center justify-center text-sm font-bold text-neutral-500 transition-all hover:text-neutral-900 active:scale-95"
              >
                -
              </button>
              <span className="font-mono text-xs font-black text-neutral-950">{quantityInCart}</span>
              <button
                onClick={handleIncrease}
                disabled={quantityInCart >= targetStock}
                className={`flex h-8 w-10 cursor-pointer items-center justify-center text-sm font-bold text-neutral-500 transition-all hover:text-neutral-900 active:scale-95 ${
                  quantityInCart >= targetStock ? 'cursor-not-allowed opacity-30' : ''
                }`}
              >
                +
              </button>
            </div>
          ) : (
            <button
              onClick={handleAddToCart}
              disabled={outOfStock}
              className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold transition-all active:scale-95 ${
                outOfStock
                  ? 'cursor-not-allowed border-neutral-200 bg-neutral-100 text-neutral-400'
                  : 'border-transparent bg-neutral-900 text-white shadow-sm hover:bg-neutral-800'
              }`}
            >
              <ShoppingCart className="h-4 w-4" />
              {outOfStock ? 'Agotado' : 'Añadir'}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
});

export default PerfumeCard;