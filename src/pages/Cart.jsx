import React, { useState } from 'react';
import { useStore } from '../store';
import { Link } from 'react-router-dom';
import { ShoppingBag, Trash2, ArrowLeft, MessageSquare, CheckCircle2, Phone, User as UserIcon, Loader2, Award } from 'lucide-react';

export default function CartView() {
  const { cart, user, updateCartQuantity, removeFromCart, submitOrder, loading, error } = useStore();
  const [clientName, setClientName] = useState(user?.name || '');
  const [clientPhone, setClientPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  const isClient = user?.role === 'client';
  
  const getPrice = (item) => {
    return isClient ? item.product.pricePromotional : item.product.pricePublic;
  };

  const total = cart.reduce((acc, item) => acc + (getPrice(item) * item.quantity), 0);

  const handleQuantityChange = (productId, currentQty, change) => {
    updateCartQuantity(productId, currentQty + change);
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    setPhoneError('');

    if (!clientName.trim()) {
      return;
    }

    // Clean phone number (Honduras numbers are usually 8 digits, e.g., 9988-7766)
    const cleanPhone = clientPhone.replace(/[^\d]/g, '');
    if (cleanPhone.length !== 8) {
      setPhoneError('Por favor ingrese un número de teléfono válido de Honduras (8 dígitos, ej: 99448822)');
      return;
    }

    const order = await submitOrder(clientName.trim(), cleanPhone);
    if (order) {
      setConfirmedOrder(order);
    }
  };

  // Pre-format WhatsApp link for the customer
  const getWhatsAppConfirmationLink = (order) => {
    const itemsText = order.items
      .map((i) => `• ${i.quantity}x ${i.brand} ${i.name} (${i.size}) - L. ${i.pricePaid.toLocaleString()}`)
      .join('\n');

    const text = `¡Hola Iconic Boutique HN! 🇭🇳✨

Acabo de realizar una cotización de perfumes mediante su sitio web. Mi número de orden es *${order.id}*.

*Detalle de mi orden:*\n${itemsText}\n
*Total:* *L. ${order.total.toLocaleString()} HNL*
*Mi Nombre:* ${order.clientName}
*Mi Teléfono:* +504 ${order.clientPhone}

Por favor, ayúdenme con el método de pago y la facturación manual para coordinar mi entrega. ¡Quedo atento!`;

    const encodedText = encodeURIComponent(text);
    // WhatsApp API redirect link to the official number: +504 9830-9309
    return `https://wa.me/50498309309?text=${encodedText}`;
  };

  // If order was successfully processed, show a gorgeous confirmation card!
  if (confirmedOrder) {
    return (
      <div className="max-w-xl mx-auto py-8 text-center fade-in-up space-y-6">
        <div className="bg-white rounded-3xl border border-emerald-200 p-8 shadow-md">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4 animate-bounce">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          
          <h2 className="font-display text-2xl font-bold text-neutral-900 tracking-tight sm:text-3xl">
            ¡Cotización Procesada con Éxito!
          </h2>
          <p className="text-xs text-neutral-500 font-bold font-mono mt-1 uppercase tracking-wider">
            Código de Orden: <span className="bg-neutral-100 px-2.5 py-1 rounded text-neutral-900">{confirmedOrder.id}</span>
          </p>
          
          <div className="border-t border-b border-neutral-100 py-4 my-6 text-left space-y-2.5">
            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider font-mono">Detalles de Facturación Manual</h4>
            <p className="text-xs text-neutral-700"><strong>Cliente:</strong> {confirmedOrder.clientName}</p>
            <p className="text-xs text-neutral-700"><strong>Teléfono:</strong> +504 {confirmedOrder.clientPhone}</p>
            <p className="text-xs text-neutral-700"><strong>Total a pagar:</strong> <span className="font-mono font-bold text-neutral-900">L. {confirmedOrder.total.toLocaleString()} HNL</span></p>
          </div>

          <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4 text-xs text-amber-900 text-left space-y-2 mb-6">
            <p className="font-bold">✨ ¡Importante para cerrar su compra! ✨</p>
            <p className="leading-relaxed text-neutral-700">
              Dado que la facturación es manual, nuestro equipo de ventas en Honduras debe verificar existencias y coordinar el envío. 
              Por favor, haga clic en el botón verde de abajo para enviar los detalles de su orden instantáneamente por WhatsApp.
            </p>
          </div>

          <div className="space-y-3">
            <a
              href={getWhatsAppConfirmationLink(confirmedOrder)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] hover:bg-[#20ba5a] text-white py-3.5 text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
            >
              <MessageSquare className="h-5 w-5" />
              Enviar Orden por WhatsApp
            </a>

            <button
              onClick={() => { setConfirmedOrder(null); setView('catalog'); }}
              className="text-xs text-neutral-500 hover:text-neutral-900 underline font-medium block mx-auto cursor-pointer"
            >
              Regresar al Catálogo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in-up">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setView('catalog')}
          className="p-2 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 text-neutral-600 hover:text-neutral-900 cursor-pointer shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h2 className="font-display text-2xl font-bold text-neutral-900 tracking-tight">
            Su Carrito de Cotización
          </h2>
          <p className="text-xs text-neutral-500">
            Revisa las fragancias seleccionadas antes de proceder a la facturación manual.
          </p>
        </div>
      </div>

      {cart.length === 0 ? (
        <div className="rounded-3xl border border-neutral-200 bg-white p-12 text-center max-w-xl mx-auto">
          <ShoppingBag className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
          <h3 className="font-display font-bold text-neutral-900 text-lg">El carrito está vacío</h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto mb-6">
            Explore nuestro catálogo de perfumes originales de marcas exclusivas y agregue fragancias para cotizar.
          </p>
          <Link
            to="/catalog"
            className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-900 px-5 py-3 text-xs font-bold text-white hover:bg-neutral-800 cursor-pointer shadow-sm"
          >
            Ver Perfumes
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          
          {/* Cart list (Left side - Col span 2) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-3xl border border-neutral-200 overflow-hidden shadow-sm">
              <ul className="divide-y divide-neutral-100">
                {cart.map((item) => {
                  const itemPrice = getPrice(item);
                  return (
                    <li key={item.product.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-neutral-50/20">
                      
                      {/* Product Details thumbnail */}
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 flex-shrink-0 rounded-xl bg-neutral-100 overflow-hidden border border-neutral-200">
                          <img
                            src={item.product.imageUrl || 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=150&q=80'}
                            alt={item.product.name}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover object-center"
                          />
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase font-bold text-neutral-400 font-mono leading-none mb-1">
                            {item.product.brand}
                          </span>
                          <h4 className="font-display font-bold text-sm text-neutral-900 leading-tight">
                            {item.product.name}
                          </h4>
                          <span className="block text-xs text-neutral-500 mt-0.5">
                            Tamaño: {item.product.size} | Disp. {item.product.stock}
                          </span>
                        </div>
                      </div>

                      {/* Quantities adjuster */}
                      <div className="flex items-center justify-between sm:justify-end gap-6">
                        
                        <div className="flex items-center border border-neutral-200 rounded-xl bg-white overflow-hidden shadow-sm h-9">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(item.product.id, item.quantity, -1)}
                            className="px-3 hover:bg-neutral-100 text-neutral-500 font-bold text-sm cursor-pointer"
                          >
                            -
                          </button>
                          <span className="px-3 font-mono text-xs font-bold text-neutral-950">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(item.product.id, item.quantity, 1)}
                            disabled={item.quantity >= item.product.stock}
                            className="px-3 hover:bg-neutral-100 text-neutral-500 font-bold text-sm cursor-pointer disabled:opacity-30"
                          >
                            +
                          </button>
                        </div>

                        {/* Price segment */}
                        <div className="text-right font-mono">
                          <span className="block text-xs text-neutral-400">Total</span>
                          <span className="font-bold text-sm text-neutral-900">
                            L. {(itemPrice * item.quantity).toLocaleString()} HNL
                          </span>
                        </div>

                        {/* Remove item trigger */}
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="p-2 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                          title="Eliminar del carrito"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>

                      </div>

                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* Checkout billing form (Right side) */}
          <div className="space-y-4">
            <div className="bg-white rounded-3xl border border-neutral-200 p-6 shadow-sm">
              <h3 className="font-display font-bold text-neutral-900 text-lg mb-4 border-b border-neutral-100 pb-3">
                Resumen de Cotización
              </h3>

              {isClient && (
                <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl border border-emerald-100 text-xs font-medium flex items-center gap-1.5 mb-4">
                  <Award className="h-4 w-4" />
                  <span>Aplicado descuento de Cliente VIP de Honduras</span>
                </div>
              )}

              <div className="space-y-2 border-b border-neutral-100 pb-4 mb-4 font-mono text-xs text-neutral-600">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-bold">L. {total.toLocaleString()} HNL</span>
                </div>
                <div className="flex justify-between">
                  <span>Envío (Delivery / Cargo):</span>
                  <span className="text-neutral-400">Coordinar con vendedor</span>
                </div>
                <div className="flex justify-between text-base font-black text-neutral-950 pt-2 border-t border-neutral-50">
                  <span>TOTAL ESTIMADO:</span>
                  <span>L. {total.toLocaleString()} HNL</span>
                </div>
              </div>

              {/* Contact billing details form */}
              <form onSubmit={handleCheckout} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-600 uppercase mb-1 flex items-center gap-1">
                    <UserIcon className="h-3.5 w-3.5" />
                    Nombre Completo del Cliente *
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="ej. Juan Carlos López"
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs focus:border-neutral-900 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-600 uppercase mb-1 flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    Número de Celular *
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 border border-r-0 border-neutral-200 bg-neutral-50 rounded-l-xl text-xs text-neutral-500 font-semibold">
                      +504
                    </span>
                    <input
                      type="tel"
                      value={clientPhone}
                      onChange={(e) => { setClientPhone(e.target.value); setPhoneError(''); }}
                      placeholder="ej. 99002233"
                      className="w-full rounded-r-xl border border-neutral-200 px-3 py-2 text-xs focus:border-neutral-900 focus:outline-none font-mono"
                      maxLength={12}
                      required
                    />
                  </div>
                  {phoneError && (
                    <span className="block text-[10px] text-red-600 font-semibold mt-1">
                      {phoneError}
                    </span>
                  )}
                </div>

                {error && (
                  <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-[11px] text-red-800">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-neutral-900 text-white py-3.5 text-xs font-bold hover:bg-neutral-800 shadow-sm active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Procesando Orden...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Procesar Orden de Compra
                    </>
                  )}
                </button>
              </form>

            </div>
          </div>

        </div>
      )}

    </div>
  );
}
