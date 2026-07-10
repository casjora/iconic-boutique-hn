import React from 'react';
import { BookOpen, DollarSign, ClipboardList, RefreshCw, BarChart3, Truck, ShoppingCart } from 'lucide-react';

export default function HondurasGuide() {
  return (
    <div className="bg-white rounded-3xl border border-neutral-200 p-6 sm:p-8 shadow-sm">
      <div className="max-w-3xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-3 py-1 text-xs font-semibold text-white mb-3">
            <BookOpen className="h-3 w-3" />
            Guía de Implementación Oficial
          </span>
          <h2 className="font-display text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
            Estructura de Negocio en Honduras
          </h2>
          <p className="mt-2 text-sm text-neutral-500">
            Guía paso a paso y desglose financiero sugerido en Lempiras (HNL) para operar tu perfumería de forma exitosa y rentable.
          </p>
        </div>

        {/* Bento Grid layout */}
        <div className="grid gap-6 sm:grid-cols-2 mt-8">
          
          {/* Card 1: Desglose de Costos e Inversión */}
          <div className="border border-neutral-100 bg-neutral-50/50 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-neutral-900 text-white rounded-xl">
                <DollarSign className="h-5 w-5" />
              </div>
              <h3 className="font-display font-bold text-base text-neutral-900">
                Inversión Inicial Sugerida
              </h3>
            </div>
            <p className="text-xs text-neutral-600 mb-3">
              Presupuesto estimado para un lote inicial competitivo de fragancias originales de diseñador en Honduras:
            </p>
            <ul className="space-y-2 text-xs font-mono text-neutral-700">
              <li className="flex justify-between border-b border-neutral-100 pb-1">
                <span>📦 Lote inicial (30 perfumes):</span>
                <span className="font-bold">L. 45,000</span>
              </li>
              <li className="flex justify-between border-b border-neutral-100 pb-1">
                <span>🛍️ Empaque de lujo y bolsas:</span>
                <span className="font-bold">L. 3,500</span>
              </li>
              <li className="flex justify-between border-b border-neutral-100 pb-1">
                <span>🚀 Marketing (Meta Ads):</span>
                <span className="font-bold">L. 2,500 /mes</span>
              </li>
              <li className="flex justify-between border-b border-neutral-100 pb-1">
                <span>🌐 Hosting / Dominio web:</span>
                <span className="font-bold">L. 1,200 /año</span>
              </li>
              <li className="flex justify-between pt-2 text-sm font-extrabold text-neutral-900">
                <span>Total Estimado:</span>
                <span>L. 52,200 HNL</span>
              </li>
            </ul>
          </div>

          {/* Card 2: Qué necesitas recopilar */}
          <div className="border border-neutral-100 bg-neutral-50/50 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-neutral-900 text-white rounded-xl">
                <ClipboardList className="h-5 w-5" />
              </div>
              <h3 className="font-display font-bold text-base text-neutral-900">
                ¿Qué recopilar para iniciar?
              </h3>
            </div>
            <ul className="space-y-2 text-xs text-neutral-600">
              <li className="flex gap-2">
                <span className="text-neutral-900 font-bold">•</span>
                <span><strong>Proveedores de Confianza:</strong> Buscar importadores directos autorizados en SPS o Tegucigalpa, o importar directamente vía casillero de USA.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-neutral-900 font-bold">•</span>
                <span><strong>Fotos Reales de Perfumes:</strong> Fotos nítidas sobre fondos limpios o empaques sellados con el número de lote visible para garantizar originalidad.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-neutral-900 font-bold">•</span>
                <span><strong>Lista de Precios Base:</strong> Costos CIF (incluyendo envío e impuestos de aduana en Honduras) para calcular márgenes correctos.</span>
              </li>
            </ul>
          </div>

          {/* Card 3: Gestión de Inventario */}
          <div className="border border-neutral-100 bg-neutral-50/50 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-neutral-900 text-white rounded-xl">
                <RefreshCw className="h-5 w-5" />
              </div>
              <h3 className="font-display font-bold text-base text-neutral-900">
                ¿Cómo llevar el inventario?
              </h3>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              El inventario se centraliza en esta aplicación. Al cargar un PDF de factura de compra o importación, la <strong>Inteligencia Artificial de Gemini</strong> lee los perfumes, calcula costos en Lempiras, y genera códigos de barra automáticos.
            </p>
            <div className="mt-3 text-xs bg-emerald-50 text-emerald-800 p-2.5 rounded-lg border border-emerald-100 font-medium">
              💡 <strong>Regla clave:</strong> El stock físico debe coincidir exactamente con el stock en la app. Realicen un conteo cada domingo por la noche.
            </div>
          </div>

          {/* Card 4: Distribución y Logística en HN */}
          <div className="border border-neutral-100 bg-neutral-50/50 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-neutral-900 text-white rounded-xl">
                <Truck className="h-5 w-5" />
              </div>
              <h3 className="font-display font-bold text-base text-neutral-900">
                Envíos y Entregas en Honduras
              </h3>
            </div>
            <ul className="space-y-2 text-xs text-neutral-600">
              <li className="flex gap-2">
                <span className="text-neutral-900 font-bold">•</span>
                <span><strong>Entregas locales:</strong> Servicio de delivery en moto (con costo adicional de L. 50 a L. 80 en Tegucigalpa / SPS).</span>
              </li>
              <li className="flex gap-2">
                <span className="text-neutral-900 font-bold">•</span>
                <span><strong>Envíos nacionales:</strong> Rapido Cargo, CAEX, o PedidosYa a nivel nacional, previo pago por transferencia bancaria (BAC, Ficohsa, Atlántida).</span>
              </li>
              <li className="flex gap-2">
                <span className="text-neutral-900 font-bold">•</span>
                <span><strong>Cobro Contra Entrega:</strong> Disponible solo para Tegucigalpa y SPS para aumentar la confianza en compras iniciales.</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Workflow Summary */}
        <div className="mt-8 border-t border-neutral-200 pt-6">
          <h3 className="font-display font-bold text-lg text-neutral-900 mb-3 flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-neutral-700" />
            Flujo de Operación del Cliente
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center mt-4">
            <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-100">
              <div className="font-display font-black text-neutral-900 text-lg mb-1">1</div>
              <span className="block text-xs font-semibold text-neutral-900">Explorar catálogo</span>
              <span className="text-[10px] text-neutral-500">Público o precios VIP de cliente registrado</span>
            </div>
            <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-100">
              <div className="font-display font-black text-neutral-900 text-lg mb-1">2</div>
              <span className="block text-xs font-semibold text-neutral-900">Agregar al Carrito</span>
              <span className="text-[10px] text-neutral-500">Añadir fragancias preferidas</span>
            </div>
            <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-100">
              <div className="font-display font-black text-neutral-900 text-lg mb-1">3</div>
              <span className="block text-xs font-semibold text-neutral-900">Generar Cotización</span>
              <span className="text-[10px] text-neutral-500">Con nombre y teléfono del cliente</span>
            </div>
            <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-100">
              <div className="font-display font-black text-neutral-900 text-lg mb-1">4</div>
              <span className="block text-xs font-semibold text-neutral-900">Facturación Manual</span>
              <span className="text-[10px] text-neutral-500">El vendedor recibe en Telegram y cierra por WhatsApp</span>
            </div>
          </div>
        </div>

        {/* Maps Section - Iconic Boutique HN */}
        <div className="mt-8 border-t border-neutral-200 pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-neutral-900 text-amber-400 rounded-xl">📍</span>
            <h3 className="font-display font-bold text-lg text-neutral-900">
              Ubicación Física de Iconic Boutique HN
            </h3>
          </div>
          <p className="text-xs text-neutral-600">
            Encuéntranos en Tegucigalpa, Honduras. Nuestra boutique física cuenta con probadores exclusivos de fragancias de diseñador 100% originales.
          </p>
          <div className="rounded-2xl overflow-hidden border border-neutral-200 shadow-sm bg-neutral-100">
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m16!1m12!1m3!1d1042.0810210725676!2d-87.18681700757827!3d14.085964687074538!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!2m1!1sIconic%20Boutique%2C%20tegucigalpa!5e0!3m2!1ses-419!2shn!4v1783549286926!5m2!1ses-419!2shn" 
              width="100%" 
              height="300" 
              style={{ border: 0 }} 
              allowFullScreen={true} 
              loading="lazy" 
              referrerPolicy="strict-origin-when-cross-origin"
              title="Mapa de ubicación física de Iconic Boutique HN en Tegucigalpa, Honduras"
            ></iframe>
          </div>
        </div>

        {/* Launch Steps & Pricing Section */}
        <div className="mt-8 border-t border-neutral-200 pt-6 grid gap-6 sm:grid-cols-2">
          
          {/* Next Steps Card */}
          <div className="border border-neutral-200 bg-neutral-50/50 rounded-2xl p-5 space-y-3">
            <h4 className="font-display font-bold text-base text-neutral-900 flex items-center gap-1.5">
              🚀 Pasos de Lanzamiento Rápido
            </h4>
            <ol className="space-y-2 text-xs text-neutral-600 list-decimal pl-4">
              <li>
                <strong>Dominio y Servidor (.com / .hn):</strong> Adquirir un dominio como <code>iconicboutiquehn.com</code> y alojarlo en una plataforma veloz como Vercel o Cloud Run.
              </li>
              <li>
                <strong>Carga de Catálogo en Segundos:</strong> Utilizar el <strong>Importador de Texto / CSV</strong> o el escáner de facturas PDF con IA para subir toda su base de datos actual de perfumes en minutos.
              </li>
              <li>
                <strong>Publicidad en Redes Sociales:</strong> Enlazar los botones de WhatsApp de la página en campañas de Facebook Ads e Instagram Ads dirigidas a Tegucigalpa, San Pedro Sula y el resto del país.
              </li>
              <li>
                <strong>Precios VIP para Distribuidores:</strong> Asignar cuentas de <code>Cliente VIP</code> a sus distribuidores de confianza para que coticen de manera autónoma con el margen correcto.
              </li>
            </ol>
          </div>

          {/* Pricing Quote Card */}
          <div className="border border-neutral-200 bg-neutral-50/50 rounded-2xl p-5 space-y-3">
            <h4 className="font-display font-bold text-base text-neutral-900 flex items-center gap-1.5">
              💼 Valor de Mercado de este Software
            </h4>
            <p className="text-xs text-neutral-600">
              Desglose de costos profesionales en el mercado hondureño para un desarrollo personalizado con estas características:
            </p>
            <ul className="space-y-1.5 text-[11px] font-mono text-neutral-700">
              <li className="flex justify-between border-b border-neutral-100 pb-1">
                <span>🖥️ Plataforma Web & SPA:</span>
                <span className="font-bold">L. 37,000 - L. 61,000</span>
              </li>
              <li className="flex justify-between border-b border-neutral-100 pb-1">
                <span>🧠 Escáner PDF con IA:</span>
                <span className="font-bold">L. 12,300 - L. 24,700</span>
              </li>
              <li className="flex justify-between border-b border-neutral-100 pb-1">
                <span>📊 Gestión de Inventario & Barras:</span>
                <span className="font-bold">L. 19,700 - L. 37,000</span>
              </li>
              <li className="flex justify-between pt-1.5 text-xs font-extrabold text-neutral-900">
                <span>Costo Profesional Promedio:</span>
                <span className="text-emerald-600 font-bold">L. 69,000 - L. 122,700 HNL</span>
              </li>
            </ul>
            <p className="text-[10px] text-neutral-400 italic">
              * Nota: Desarrollado bajo arquitectura React Premium con optimizaciones móviles para garantizar conversiones.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
