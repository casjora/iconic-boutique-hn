import React, { useMemo } from 'react';
import { useStore } from '../store';
import { ShoppingCart, Heart, Tag } from 'lucide-react';
import { isProductSet, getProductPrices } from '../utils/productHelper';
import { motion } from 'motion/react';

const PerfumeCard = React.memo(({ product, index = 10 }) => {
  const { addToCart, favorites, toggleFavorite, user, cart, updateCartQuantity, removeFromCart } = useStore();

  // Role checks
  const isMayorista = user?.role === 'mayorista';
  const isStaff = user?.role === 'vendedor' || user?.role === 'owner';

  const targetStock = product.availableStock !== undefined ? product.availableStock : product.stock;
  const outOfStock = targetStock <= 0;

  // Price calculations
  const isSet = isProductSet(product);
  const isFav = favorites.includes(product.id);

  const prices = useMemo(() => getProductPrices(product), [product]);
  const hasDiscount = prices.hasDetallePromo;
  const finalPublicPrice = prices.finalDetalle;

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
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm transition-all hover:shadow-md"
    >
      {/* Badge stack (Set & Promo) */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
        {isSet && (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 text-[9px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider shadow-sm border border-indigo-200 dark:border-indigo-800 backdrop-blur-sm">
            <Tag className="h-2.5 w-2.5" />
            Set
          </span>
        )}
        {hasDiscount && !isMayorista && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-600 dark:bg-rose-500 px-2.5 py-0.5 text-[9px] font-black text-white uppercase tracking-wider shadow-sm">
            Oferta Detalle
          </span>
        )}
        {prices.hasMayoristaPromo && isMayorista && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-600 px-2.5 py-0.5 text-[9px] font-black text-white uppercase tracking-wider shadow-sm">
            Oferta Mayorista
          </span>
        )}
      </div>

      {/* Favorite Button (Only for registered users) */}
      {user && (
        <button
          onClick={handleToggleFavorite}
          aria-label={isFav ? "Quitar de favoritos" : "Agregar a favoritos"}
          className={`absolute top-3 right-3 z-10 p-2 rounded-full cursor-pointer transition-all border ${
            isFav 
              ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-900 text-rose-500 dark:text-rose-400' 
              : 'bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm border-neutral-200 dark:border-neutral-800 text-neutral-400 hover:text-rose-500 dark:hover:text-rose-400'
          }`}
        >
          <Heart className="h-4 w-4 fill-current" />
        </button>
      )}

      {/* Image container with fixed aspect ratio to eliminate Cumulative Layout Shift (CLS) */}
      <div className="aspect-square flex items-center justify-center overflow-hidden bg-neutral-100 dark:bg-neutral-800/60 p-4 relative">
        <img
          src={product.image_url || '/placeholder-perfume.png'}
          alt={`${product.brand || ''} ${product.name || 'Perfume'} original en Honduras`}
          loading={index < 4 ? 'eager' : 'lazy'}
          fetchPriority={index < 4 ? 'high' : 'auto'}
          decoding="async"
          width="300"
          height="300"
          referrerPolicy="no-referrer"
          className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
        />
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/50 backdrop-blur-[1px]">
            <span className="rounded-full bg-neutral-900 dark:bg-neutral-950 px-3 py-1.5 font-display text-xs font-extrabold uppercase tracking-widest text-white shadow">
              Agotado
            </span>
          </div>
        )}
      </div>

      {/* Details body */}
      <div className="flex flex-1 flex-col justify-between p-4 space-y-3">
        <div>
          <span className="block font-mono text-[9px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
            {product.brand}
          </span>
          <h3 className="font-display mt-0.5 text-sm font-bold text-neutral-900 dark:text-neutral-100 line-clamp-2" title={product.name}>
            {product.name}
          </h3>
          <div className="mt-2 flex flex-wrap gap-1">
            <span className="rounded-md bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-[10px] font-semibold text-neutral-600 dark:text-neutral-300">{product.size}</span>
            <span className="rounded-md bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-[10px] font-semibold text-neutral-600 dark:text-neutral-300">{product.category}</span>
          </div>
        </div>

        <div className="space-y-3">
          {/* Prices area */}
          <div className="flex flex-col space-y-1.5 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            {isMayorista ? (
              // Mayorista pricing: Retail struck through, Mayorista price highlighted
              <>
                <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-400 dark:text-neutral-500">
                  <span>Precio Detalle Base:</span>
                  <span className="line-through font-mono">L. {prices.pricePublic.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-400 dark:text-neutral-500">
                  <span>Precio Mayorista Base (25% menos):</span>
                  <span className="font-mono">L. {prices.baseWholesale.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-amber-50 dark:bg-amber-950/40 p-2 text-xs border border-amber-200 dark:border-amber-900/60 shadow-2xs">
                  <span className="flex items-center gap-1 font-extrabold text-amber-900 dark:text-amber-300">
                    🏷️ Precio Mayorista Final:
                  </span>
                  <span className="font-mono font-black text-amber-950 dark:text-amber-200 text-sm">
                    L. {prices.finalWholesale.toLocaleString()}
                  </span>
                </div>
              </>
            ) : isStaff ? (
              // Staff pricing (Vendedor / Owner): Shows Retail Price & Wholesale Price
              <>
                <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
                  <span>Detalle:</span>
                  <span className={hasDiscount ? 'line-through text-neutral-400 font-mono' : 'font-mono text-neutral-900 dark:text-neutral-100 font-bold'}>
                    L. {prices.pricePublic.toLocaleString()}
                  </span>
                </div>
                {hasDiscount && (
                  <div className="flex items-center justify-between text-xs font-bold text-red-600 dark:text-rose-400 font-mono">
                    <span>Detalle Oferta:</span>
                    <span>L. {prices.finalDetalle.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex items-center justify-between rounded-lg bg-neutral-100 dark:bg-neutral-800 p-1.5 text-xs">
                  <span className="font-bold text-neutral-700 dark:text-neutral-300">Mayoreo Base (L. {prices.baseWholesale.toLocaleString()}):</span>
                  <span className="font-mono font-black text-neutral-900 dark:text-neutral-100">
                    L. {prices.finalWholesale.toLocaleString()}
                  </span>
                </div>
              </>
            ) : (
              // Guest & Detalle client pricing: Show Retail price and special discount if active, NO wholesale price shown
              hasDiscount ? (
                <>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-400 dark:text-neutral-500">
                    <span>Precio Regular:</span>
                    <span className="line-through font-mono">L. {prices.pricePublic.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-red-50 dark:bg-rose-950/40 p-1.5 text-xs border border-red-100 dark:border-rose-900/50">
                    <span className="flex items-center gap-1 font-extrabold text-red-700 dark:text-rose-300">
                      🔥 Oferta Detalle:
                    </span>
                    <span className="font-mono font-black text-red-950 dark:text-rose-200 text-sm">
                      L. {prices.finalDetalle.toLocaleString()}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="font-semibold text-neutral-500 dark:text-neutral-400">Precio:</span>
                  <span className="font-mono font-black text-neutral-900 dark:text-neutral-100 text-sm">
                    L. {prices.pricePublic.toLocaleString()}
                  </span>
                </div>
              )
            )}
          </div>

          {/* Add to Cart or Quantity Selector */}
          {quantityInCart > 0 ? (
            <div className="flex items-center justify-between h-[38px] overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-1">
              <button
                onClick={handleDecrease}
                className="flex h-8 w-10 cursor-pointer items-center justify-center text-sm font-bold text-neutral-500 dark:text-neutral-300 transition-all hover:text-neutral-900 dark:hover:text-white active:scale-95"
              >
                -
              </button>
              <span className="font-mono text-xs font-black text-neutral-950 dark:text-neutral-100">{quantityInCart}</span>
              <button
                onClick={handleIncrease}
                disabled={quantityInCart >= targetStock}
                className={`flex h-8 w-10 cursor-pointer items-center justify-center text-sm font-bold text-neutral-500 dark:text-neutral-300 transition-all hover:text-neutral-900 dark:hover:text-white active:scale-95 ${
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
                  ? 'cursor-not-allowed border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500'
                  : 'border-transparent bg-neutral-900 dark:bg-amber-400 text-white dark:text-neutral-950 shadow-sm hover:bg-neutral-800 dark:hover:bg-amber-300'
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
