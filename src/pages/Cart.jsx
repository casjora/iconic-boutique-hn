import  { useState } from 'react';
import { useStore } from '../store';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Phone, User, ShoppingBag, ArrowLeft, Loader2, ClipboardList, Tag } from 'lucide-react';
import { isProductSet } from '../utils/productHelper';

export default function CartView() {
  const { cart, removeFromCart, updateCartQuantity, submitOrder, user, loading } = useStore();
  const navigate = useNavigate();

  // Contact form state
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState('');
  const [sentOrder, setSentOrder] = useState(null);

  const isClient = user?.role === 'client';
  const total = cart.reduce((acc, curr) => {
    const price = isClient ? curr.product.pricePromotional : curr.product.pricePublic;
    return acc + (price * curr.quantity);
  }, 0);

  const handleQtyChange = (productId, val) => {
    updateCartQuantity(productId, val);
  };

  const handleRemove = (productId) => {
    removeFromCart(productId);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !phone) return;

    // submitOrder triggers direct state update & alerts Telegram config
    const orderCreated = await submitOrder(name.trim(), phone.trim());
    if (orderCreated) {
      setSentOrder(orderCreated);
    }
  };

  // If order was successfully processed, show elegant confirmation card
  if (sentOrder) {
    // Generate text message for WhatsApp redirect
    const itemsText = sentOrder.items
      .map(i => {
        const prefix = isProductSet(i) ? '🎁 [SET] ' : '';
        return `• *${i.quantity}x ${prefix}${i.brand} ${i.name} (${i.size})* - L. ${i.pricePaid.toLocaleString()} c/u`;
      })
      .join('\n');

    const whatsappMessage = encodeURIComponent(
      `🔔 *NUEVA ORDEN DE COMPRA - ICONIC BOUTIQUE HN* 🔔\n\n` +
      `👤 *Cliente:* ${sentOrder.clientName}\n` +
      `📞 *Teléfono:* ${sentOrder.clientPhone}\n` +
      `🕒 *Fecha:* ${sentOrder.date}\n` +
      `📍 *Orden ID:* \`${sentOrder.id}\`\n\n` +
      `📦 *Detalle de Perfumes:*\n${itemsText}\n\n` +
      `💵 *TOTAL COTIZADO:* *L. ${sentOrder.total.toLocaleString()} HNL*\n\n` +
      `Hola, me gustaría coordinar el pago (transferencia/contra entrega) y la entrega de mi pedido en Honduras.`
    );

    return (
      <div className="max-w-xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white border border-neutral-200 rounded-3xl p-8 sm:p-10 text-center space-y-6 shadow-sm fade-in-up">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <ClipboardList className="h-7 w-7" />
          </div>
          
          <div className="space-y-2">
            <h2 className="font-display text-2xl font-black text-neutral-900 tracking-tight sm:text-3xl">
              ¡Cotización Generada Exitosamente!
            </h2>
            <p className="text-xs text-neutral-500 leading-relaxed max-w-sm mx-auto">
              Tu orden ha sido registrada en nuestro sistema de forma manual. Tu id de orden es <code className="font-mono bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-800 text-xs font-bold">{sentOrder.id}</code>.
            </p>
          </div>

          {/* Breakdown summary */}
          <div className="border border-neutral-100 bg-neutral-50/50 rounded-2xl p-4 text-left space-y-2 text-xs">
            <div className="flex justify-between border-b border-neutral-100 pb-2">
              <span className="font-semibold text-neutral-500">Cliente:</span>
              <span className="font-bold text-neutral-900">{sentOrder.clientName}</span>
            </div>
            <div className="flex justify-between border-b border-neutral-100 pb-2">
              <span className="font-semibold text-neutral-500">Teléfono:</span>
              <span className="font-bold text-neutral-900">{sentOrder.clientPhone}</span>
            </div>
            <div className="flex justify-between border-b border-neutral-100 pb-2">
              <span className="font-semibold text-neutral-500">Fecha:</span>
              <span className="font-bold text-neutral-900">{sentOrder.date}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="font-extrabold text-neutral-900">Total Cotizado:</span>
              <span className="font-mono font-black text-neutral-950 text-sm">L. {sentOrder.total.toLocaleString()} HNL</span>
            </div>
          </div>

          <div className="space-y-3">
            <a
              href={`https://wa.me/50498309309?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow shadow-emerald-600/10 active:scale-95"
            >
              💬 Enviar Pedido por WhatsApp (+504 9830-9309)
            </a>
            
            <button
              onClick={() => {
                setSentOrder(null);
                setName(user?.name || '');
                setPhone('');
                navigate('/catalog');
              }}
              className="w-full py-3 px-4 bg-white hover:bg-neutral-50 text-neutral-700 font-bold rounded-xl text-xs border border-neutral-200 transition-colors cursor-pointer active:scale-95"
            >
              Seguir Comprando
            </button>
          </div>

        </div>
      </div>
    );
  }

  // Cart Empty State
  if (cart.length === 0) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-6 fade-in-up">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
          <ShoppingBag className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <h2 className="font-display text-2xl font-black text-neutral-900 tracking-tight">Tu Carrito de Cotización está vacío</h2>
          <p className="text-xs text-neutral-500 leading-relaxed">
            Explora nuestro catálogo exclusivo de fragancias originales y añade perfumes para generar tu cotización o cotizar precios mayoristas VIP.
          </p>
        </div>
        <Link
          to="/catalog"
          className="inline-flex items-center gap-2 px-5 py-3 bg-neutral-900 text-white text-xs font-black rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a las Fragancias
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3 fade-in-up">
      
      {/* Cart items list table */}
      <div className="lg:col-span-2 space-y-4">
        <h2 className="font-display text-2xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
          <ShoppingBag className="h-6 w-6" /> Carrito de Cotización
        </h2>

        <div className="border border-neutral-200 bg-white rounded-3xl divide-y divide-neutral-100 overflow-hidden shadow-sm">
          {cart.map((item) => {
            const isSet = isProductSet(item.product);
            const price = isClient ? item.product.pricePromotional : item.product.pricePublic;
            
            return (
              <div key={item.product.id} className="p-5 flex gap-4 items-start relative">
                
                {/* Product Image */}
                <div className="h-16 w-16 bg-neutral-100 rounded-xl overflow-hidden flex items-center justify-center p-1.5 shrink-0 border border-neutral-100">
                  {item.product.image_url ? (
                    <img 
                      src={item.product.image_url} 
                      alt={item.product.name} 
                      className="h-full w-full object-contain mix-blend-multiply" 
                    />
                  ) : (
                    <span className="text-xl">🧴</span>
                  )}
                </div>

                {/* Details info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <span className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest font-mono">
                    {item.product.brand}
                  </span>
                  <h3 className="font-bold text-sm text-neutral-900 truncate">
                    {item.product.name}
                  </h3>
                  
                  <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500">
                    <span>Tamaño: <span className="font-semibold text-neutral-700">{item.product.size || 'N/A'}</span></span>
                    
                    {isSet && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-extrabold text-indigo-700 uppercase tracking-wide border border-indigo-100">
                        <Tag className="h-2.5 w-2.5" />
                        Set
                      </span>
                    )}
                  </div>

                  {/* Quantity and Price adjust line */}
                  <div className="flex flex-wrap items-center justify-between pt-2 gap-3">
                    <div className="flex items-center border border-neutral-200 rounded-xl bg-neutral-50">
                      <button
                        onClick={() => handleQtyChange(item.product.id, item.quantity - 1)}
                        className="px-2.5 py-1 text-sm font-bold text-neutral-500 hover:text-neutral-900 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="px-3 text-xs font-bold text-neutral-950 font-mono">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleQtyChange(item.product.id, item.quantity + 1)}
                        className="px-2.5 py-1 text-sm font-bold text-neutral-500 hover:text-neutral-900 cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-neutral-400 block font-semibold">Subtotal:</span>
                      <span className="text-sm font-extrabold text-neutral-900 font-mono">
                        L. {(price * item.quantity).toLocaleString()} HNL
                      </span>
                    </div>
                  </div>

                </div>

                {/* Trash delete button */}
                <button
                  onClick={() => handleRemove(item.product.id)}
                  aria-label="Eliminar producto"
                  className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>

              </div>
            );
          })}
        </div>
      </div>

      {/* Manual order form checkout widget */}
      <div className="space-y-4">
        <h2 className="font-display text-2xl font-black text-neutral-900 tracking-tight">Formulario de Pedido</h2>

        <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm space-y-6">
          <h3 className="font-display font-bold text-neutral-900 text-base border-b border-neutral-100 pb-3">Resumen de Cotización</h3>
          
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-neutral-500">
              <span>Subtotal:</span>
              <span className="font-bold text-neutral-800 font-mono">L. {total.toLocaleString()} HNL</span>
            </div>
            <div className="flex justify-between text-neutral-500">
              <span>Tarifa Aplicada:</span>
              <span className="font-bold text-neutral-800">
                {isClient ? 'VIP Mayorista' : 'Público General'}
              </span>
            </div>
            <div className="flex justify-between border-t border-neutral-100 pt-3 text-sm">
              <span className="font-extrabold text-neutral-900">Total Cotizado:</span>
              <span className="font-mono font-black text-neutral-950">L. {total.toLocaleString()} HNL</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-neutral-100">
            <div>
              <label htmlFor="client-name" className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2 block">
                Nombre Completo *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-neutral-400" />
                </div>
                <input
                  id="client-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all outline-none"
                  placeholder="Ej. Juan Pérez"
                />
              </div>
            </div>

            <div>
              <label htmlFor="client-phone" className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2 block">
                Teléfono de WhatsApp (Honduras) *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Phone className="h-4 w-4 text-neutral-400" />
                </div>
                <input
                  id="client-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all outline-none"
                  placeholder="Ej. 9830-9309"
                />
              </div>
              <span className="text-[10px] text-neutral-400 mt-1 block">
                * Requerido para enviarte la factura en Honduras.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading || !name || !phone}
              className="w-full py-3.5 px-4 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Confirmar y Generar Cotización'
              )}
            </button>
          </form>

        </div>
      </div>

    </div>
  );
}
