import React from 'react';
import { Image, Database, Cpu, Minimize2, CheckCircle, Info, Sparkles } from 'lucide-react';

export default function ImageGuide() {
  return (
    <div className="bg-white rounded-3xl border border-neutral-200 p-6 sm:p-8 shadow-sm space-y-6">
      <div className="border-b border-neutral-100 pb-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-3 py-1 text-xs font-semibold text-white mb-2">
          <Image className="h-3.5 w-3.5 text-amber-400" />
          Guía Técnica de Imágenes en Honduras
        </span>
        <h2 className="font-display text-2xl font-bold tracking-tight text-neutral-900">
          Guía de Almacenamiento y Optimización de Imágenes
        </h2>
        <p className="text-xs text-neutral-500 mt-1">
          Aprende dónde almacenar, cómo subir y cómo optimizar las imágenes de tus perfumes para no saturar los límites gratuitos de Supabase.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Section 1: Where & How */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl mt-0.5">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide">
                1. ¿Dónde Almacenar las Imágenes?
              </h3>
              <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                Recomendamos utilizar el módulo de **Supabase Storage** integrado directamente en tu base de datos:
              </p>
              <ul className="list-disc list-inside text-xs text-neutral-600 mt-2 space-y-1 ml-1">
                <li>Es **100% gratuito** hasta 1 GB de almacenamiento total.</li>
                <li>Mantiene todo en el mismo ecosistema rápido y seguro.</li>
                <li>Genera URLs directas, permanentes y optimizadas para HTTPS.</li>
              </ul>
              <p className="text-xs text-neutral-500 mt-2 font-medium">
                *Alternativa rápida:* Para setups inmediatos, puedes usar servicios de CDN de imágenes gratuitos como **ImgBB**, **PostImages** o **Cloudinary** y pegar el enlace directo del formato final en la casilla del producto.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 border-t border-neutral-100 pt-4">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl mt-0.5">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide">
                2. Paso a Paso: ¿Cómo subirlo en Supabase?
              </h3>
              <ol className="list-decimal list-inside text-xs text-neutral-600 mt-2 space-y-2 ml-1">
                <li>Ingresa a tu panel de control de **Supabase** y ve a la sección **Storage** (ícono de caja/archivo).</li>
                <li>Haz clic en **New Bucket**, asígnale el nombre <code className="bg-neutral-100 px-1 py-0.5 rounded text-neutral-800 font-bold font-mono">product-images</code> y asegúrate de activar la casilla **Public Bucket** (esencial para que tus clientes puedan ver las fotos).</li>
                <li>Entra al bucket recién creado, haz clic en **Upload** y sube las imágenes de tus fragancias.</li>
                <li>Una vez subida la imagen, haz clic en los tres puntos del archivo y selecciona **Get Public URL** (Copiar Enlace Público).</li>
                <li>Pega ese enlace en el campo **URL de la Imagen** al crear o editar el perfume en esta aplicación.</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Section 2: Specs & Optimization */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl mt-0.5">
              <Minimize2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide">
                3. Dimensiones Ideales (Formato)
              </h3>
              <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                Para fragancias y sets de perfumería, la proporción ideal es **cuadrada**:
              </p>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="bg-neutral-50 p-2.5 rounded-xl border border-neutral-100">
                  <span className="block text-[10px] font-bold text-neutral-500 uppercase">Relación de Aspecto</span>
                  <span className="text-xs font-bold text-neutral-900">1:1 (Cuadrado)</span>
                </div>
                <div className="bg-neutral-50 p-2.5 rounded-xl border border-neutral-100">
                  <span className="block text-[10px] font-bold text-neutral-500 uppercase">Resolución Óptima</span>
                  <span className="text-xs font-bold text-neutral-900">800 x 800 píxeles</span>
                </div>
              </div>
              <p className="text-[11px] text-neutral-500 mt-2">
                *¿Por qué?* El formato 1:1 resalta de forma impecable las botellas y estuches de perfumes tanto en móviles como en computadoras, evitando recortes extraños y garantizando simetría visual.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 border-t border-neutral-100 pt-4">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl mt-0.5">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide">
                4. Formatos y Límites de Supabase
              </h3>
              <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                El límite de espacio de Supabase gratuito es **1 GB**. Sigue estas directrices para maximizar tu capacidad:
              </p>
              
              <ul className="mt-2 space-y-2 text-xs text-neutral-600">
                <li className="flex gap-1.5 items-start">
                  <span className="text-emerald-500 font-black">✔</span>
                  <span><strong>Usa WebP (Recomendado):</strong> Convierte tus imágenes a formato `.webp`. Ocupan de un 30% a 50% menos espacio que un JPG normal con la misma calidad visual.</span>
                </li>
                <li className="flex gap-1.5 items-start">
                  <span className="text-emerald-500 font-black">✔</span>
                  <span><strong>Peso límite de 100 KB:</strong> Comprime cada foto antes de subirla. Una imagen de perfume no debería pesar más de 80-120 KB.</span>
                </li>
                <li className="flex gap-1.5 items-start">
                  <span className="text-red-500 font-black">✘</span>
                  <span><strong>Evita PNGs Pesados:</strong> Los PNGs de cámaras fotográficas o celulares pueden pesar 3 MB o más. ¡Sube solo 300 PNGs y habrás agotado el espacio gratuito de Supabase! Si usas PNG, asegúrate de comprimirlos de antemano.</span>
                </li>
              </ul>

              <div className="mt-3 bg-indigo-50/50 rounded-xl p-3 border border-indigo-100 text-[11px] text-indigo-950 flex gap-2 items-start">
                <Info className="h-4 w-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Matemática del almacenamiento:</strong> Si tus imágenes están comprimidas a un promedio de 100 KB en WebP, podrás almacenar **más de 10,000 perfumes** en tu catálogo gratuito de Supabase de 1 GB.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
