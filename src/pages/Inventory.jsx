import React, { useState, useRef } from 'react';
import { useStore } from '../store';
import { generateBarcodeSVG } from '../utils/barcode';
import { Plus, Edit2, Trash2, FileUp, Sparkles, Loader2, CheckCircle2, RefreshCw, X, AlertCircle, FileText, ClipboardList, Copy, Check, Server } from 'lucide-react';

export default function InventoryManager() {
  const { products, addProduct, updateProduct, deleteProduct, uploadPdf, loading, error, setError } = useStore();
  const [editingProduct, setEditingProduct] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [aiParsedProducts, setAiParsedProducts] = useState(null);
  const fileInputRef = useRef(null);

  // Supabase Export State
  const [showSupabaseExport, setShowSupabaseExport] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // CSV State
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvParsedProducts, setCsvParsedProducts] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [size, setSize] = useState('');
  const [cost, setCost] = useState(0);
  const [pricePublic, setPricePublic] = useState(0);
  const [pricePromotional, setPricePromotional] = useState(0);
  const [stock, setStock] = useState(0);
  const [category, setCategory] = useState('Masculino');
  const [barcode, setBarcode] = useState('');
  const [description, setDescription] = useState('');

  const resetForm = () => {
    setName('');
    setBrand('');
    setSize('');
    setCost(0);
    setPricePublic(0);
    setPricePromotional(0);
    setStock(0);
    setCategory('Masculino');
    setBarcode('');
    setDescription('');
    setEditingProduct(null);
    setShowForm(false);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setName(product.name);
    setBrand(product.brand);
    setSize(product.size);
    setCost(product.cost);
    setPricePublic(product.pricePublic);
    setPricePromotional(product.pricePromotional);
    setStock(product.stock);
    setCategory(product.category);
    setBarcode(product.barcode);
    setDescription(product.description || '');
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !brand || !size || !pricePublic || !pricePromotional) {
      setError('Por favor complete todos los campos requeridos.');
      return;
    }

    const payload = {
      name,
      brand,
      size,
      cost: Number(cost),
      pricePublic: Number(pricePublic),
      pricePromotional: Number(pricePromotional),
      stock: Number(stock),
      category,
      barcode,
      description
    };

    let success = false;
    if (editingProduct) {
      success = await updateProduct(editingProduct.id, payload);
    } else {
      success = await addProduct(payload);
    }

    if (success) {
      resetForm();
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Está seguro de eliminar este perfume del inventario?')) {
      await deleteProduct(id);
    }
  };

  // PDF Drag and Drop / Selection handler
  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Solo se admiten archivos en formato PDF.');
      return;
    }

    setPdfUploading(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64String = reader.result.split(',')[1];
        const parsed = await uploadPdf(base64String, file.name);
        if (parsed && parsed.length > 0) {
          setAiParsedProducts(parsed);
        } else {
          setError('No se pudieron extraer productos del PDF. Verifique que el documento contenga datos de facturas o cotizaciones legibles.');
        }
        setPdfUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Ocurrió un error al cargar el archivo PDF: ' + err.message);
      setPdfUploading(false);
    }
  };

  // Add all AI processed items to the database
  const handleSaveAiProducts = async () => {
    if (!aiParsedProducts) return;
    setPdfUploading(true);
    
    let addedCount = 0;
    for (const prod of aiParsedProducts) {
      const success = await addProduct(prod);
      if (success) addedCount++;
    }

    setAiParsedProducts(null);
    setPdfUploading(false);
    alert(`Se agregaron o actualizaron exitosamente ${addedCount} perfumes importados al inventario.`);
  };

  // CSV / Plain Text processing
  const handleParseCsv = () => {
    if (!csvText.trim()) return;
    try {
      const lines = csvText.split('\n');
      const results = [];
      const commonBrands = ['Afnan', 'Al Haramain', 'Animale', 'Antonio Banderas', 'Ariana Grande', 'Armaf', 'Azzaro', 'Benetton', 'Bharara', 'Burberry', 'Boucheron', 'Cacharel', 'Calvin Klein', 'Carolina Herrera', 'Chloe', 'Christian Dior', 'Clinique', 'Davidoff', 'Elizabeth Arden', 'Elizabeth Taylor', 'Emper', 'Fragrance World', 'French Avenue', 'Giorgio Armani', 'Giorgio Valenti', 'Givenchy', 'Gucci', 'Guess', 'Hugo Boss', 'Issey Miyake', 'Jean Paul Gaultier', 'Jennifer Lopez', 'Juicy Couture', 'Kenneth Cole', 'Lacoste', 'Lancome', 'Lattafa', 'Liz Claiborne', 'Marc Jacobs', 'Mont Blanc', 'Moschino', 'Nautica', 'Orientica', 'Paco Rabanne', 'Paris Hilton', 'Patek Maison', 'Perry Ellis', 'Prada', 'Ralph Lauren', 'Rasasi', 'Salvatore Ferragamo', 'Tommy Hilfiger', 'Thierry Mugler', 'Valentino', 'Versace', 'Yves Saint Laurent', 'YSL'];

      for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        // Quote-aware CSV parsing
        const parts = [];
        let currentPart = '';
        let insideQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            insideQuotes = !insideQuotes;
          } else if (char === ',' && !insideQuotes) {
            parts.push(currentPart.trim());
            currentPart = '';
          } else {
            currentPart += char;
          }
        }
        parts.push(currentPart.trim());

        if (parts.length >= 3) {
          const fullName = parts[0];
          const stock = parseInt(parts[1]) || 0;
          const costStr = parts[2].replace(/[^0-9.]/g, '');
          const cost = parseFloat(costStr) || 0;
          
          let pricePublic = 0;
          if (parts[3]) {
            const priceStr = parts[3].replace(/[^0-9.]/g, '');
            pricePublic = parseFloat(priceStr) || 0;
          } else {
            pricePublic = Math.round(cost * 1.45);
          }

          // Brand
          let brand = '';
          const upperFullName = fullName.toUpperCase();
          for (const b of commonBrands) {
            if (upperFullName.startsWith(b.toUpperCase()) || upperFullName.includes(' ' + b.toUpperCase() + ' ') || upperFullName.includes(b.toUpperCase())) {
              brand = b;
              break;
            }
          }
          if (!brand) {
            brand = fullName.split(' ')[0] || 'Genérica';
          }

          // Size
          let size = '100 ML';
          const sizeMatch = fullName.match(/(\d+(\.\d+)?\s*(ML|ml|Ml|EDP|EDT|oz|Oz|OZ|Sp|g|G|uds|Uds))/i);
          if (sizeMatch) {
            size = sizeMatch[0];
          }

          // VIP Price (Promotional)
          let pricePromotional = Math.round(pricePublic * 0.7);
          if (cost > 0) {
            pricePromotional = Math.max(Math.round(cost * 1.25), Math.round(pricePublic * 0.7));
          }
          if (pricePromotional >= pricePublic) {
            pricePromotional = Math.round(pricePublic * 0.85);
          }
          if (pricePromotional <= cost && cost < pricePublic) {
            pricePromotional = Math.round((cost + pricePublic) / 2);
          }

          // Category
          let category = 'Unisex';
          const upperName = fullName.toUpperCase();
          if (upperName.includes('MEN') || upperName.includes('HOMBRE') || upperName.includes('POUR HOMME') || upperName.includes('MALE') || upperName.includes(' M ')) {
            category = 'Masculino';
          } else if (upperName.includes('WOMEN') || upperName.includes('MUJER') || upperName.includes('POUR FEMME') || upperName.includes('FEMALE') || upperName.includes(' W ') || upperName.includes('GIRL') || upperName.includes('DONNA')) {
            category = 'Femenino';
          }

          results.push({
            name: fullName,
            brand,
            size,
            cost,
            pricePublic,
            pricePromotional,
            stock,
            category,
            barcode: `740${Math.floor(100000000 + Math.random() * 900000000)}`,
            description: 'Importado por lote CSV'
          });
        }
      }

      if (results.length > 0) {
        setCsvParsedProducts(results);
        setError(null);
      } else {
        setError('No se encontraron líneas válidas. Formato requerido: Nombre del perfume, Stock, Costo, Precio Público');
      }
    } catch (err) {
      setError('Error al procesar el texto: ' + err.message);
    }
  };

  const handleSaveCsvProducts = async () => {
    if (!csvParsedProducts) return;
    setPdfUploading(true);
    
    let addedCount = 0;
    for (const prod of csvParsedProducts) {
      const success = await addProduct(prod);
      if (success) addedCount++;
    }

    setCsvParsedProducts(null);
    setCsvText('');
    setShowCsvImport(false);
    setPdfUploading(false);
    alert(`Se agregaron o actualizaron exitosamente ${addedCount} perfumes en el inventario.`);
  };

  const generateSupabaseSQL = () => {
    const productSeedLines = products.map(p => {
      const escapedName = p.name.replace(/'/g, "''");
      const escapedBrand = p.brand.replace(/'/g, "''");
      const escapedDesc = (p.description || '').replace(/'/g, "''");
      return `('${p.id}', '${escapedName}', '${escapedBrand}', '${p.size}', ${p.cost}, ${p.pricePublic}, ${p.pricePromotional}, ${p.stock}, '${p.category}', '${p.barcode}', '${escapedDesc}')`;
    }).join(',\n  ');

    return `-- =========================================================================
-- SECUENCIA DE INSTRUCCIONES SQL PARA CONFIGURAR SUPABASE
-- PROYECTO: Iconic Boutique HN 🇭🇳
-- ROLES: usuario, vendedor, dueño (Sólo estos 3 requieren autenticación)
-- =========================================================================

-- 1. Crear tabla de perfiles de usuario para manejar roles personalizados
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('usuario', 'vendedor', 'dueño')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS en profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura de perfiles a usuarios autenticados" ON profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir que cada usuario actualice su propio perfil" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);


-- 2. Crear tabla de Perfumes (productos)
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  size TEXT NOT NULL,
  cost NUMERIC NOT NULL DEFAULT 0,
  price_public NUMERIC NOT NULL DEFAULT 0,
  price_promotional NUMERIC NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL CHECK (category IN ('Masculino', 'Femenino', 'Unisex')),
  barcode TEXT UNIQUE,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (RLS) en products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Reglas RLS para productos basadas en roles
CREATE POLICY "Lectura pública de campos generales de productos" ON products
  FOR SELECT TO public USING (true);

CREATE POLICY "Dueño tiene control total de productos" ON products
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'dueño'
    )
  );

CREATE POLICY "Vendedor puede actualizar stock únicamente (sin alterar costos ni precios)" ON products
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'vendedor'
    )
  )
  WITH CHECK (
    -- Validar que el costo, precio de público y promocional permanezcan idénticos a los actuales
    cost = products.cost AND 
    price_public = products.price_public AND 
    price_promotional = products.price_promotional
  );


-- 3. Crear Vista Segura de Productos para Usuarios No Autenticados (Oculta Costo y Precio VIP)
-- Si no está autenticado, solo ve campos públicos y el precio público general.
-- El precio promocional solo lo ve si está autenticado.
CREATE OR REPLACE VIEW secure_catalog AS
  SELECT 
    id, 
    name, 
    brand, 
    size, 
    price_public, 
    stock, 
    category, 
    barcode, 
    description, 
    image_url,
    -- Mostrar precio promocional (VIP) solo a usuarios autenticados
    CASE 
      WHEN auth.role() = 'authenticated' THEN price_promotional
      ELSE NULL
    END AS price_promotional
  FROM products;


-- 4. Crear tabla de Órdenes de Compra con restricciones estrictas para no autenticados
-- Obligatorio ingresar datos de contacto (client_name y client_phone)
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  client_name TEXT NOT NULL CONSTRAINT check_client_name CHECK (length(trim(client_name)) > 0),
  client_phone TEXT NOT NULL CONSTRAINT check_client_phone CHECK (length(trim(client_phone)) > 0),
  total NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'completado', 'cancelado')),
  role_used TEXT NOT NULL CHECK (role_used IN ('usuario', 'vendedor', 'dueño', 'publico')),
  buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  date TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para órdenes
CREATE POLICY "Permitir a cualquier usuario (público o autenticado) insertar órdenes" ON orders
  FOR INSERT TO public WITH CHECK (
    -- Si es autenticado, validar que coincida con su UUID de comprador si lo provee
    (buyer_id IS NULL) OR (auth.role() = 'authenticated' AND auth.uid() = buyer_id)
  );

CREATE POLICY "Usuarios autenticados pueden ver sus propias órdenes" ON orders
  FOR SELECT TO authenticated USING (
    buyer_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.role IN ('vendedor', 'dueño')
    )
  );

CREATE POLICY "Vendedor y dueño pueden actualizar el estado de las órdenes" ON orders
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.role IN ('vendedor', 'dueño')
    )
  );


-- 5. Crear tabla de Artículos de la Orden (Relación muchos a muchos)
CREATE TABLE IF NOT EXISTS order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price_paid NUMERIC NOT NULL CHECK (price_paid >= 0)
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir inserción pública de artículos en órdenes" ON order_items
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Lectura de artículos de orden para creador o empleados" ON order_items
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id AND (
        orders.buyer_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() AND profiles.role IN ('vendedor', 'dueño')
        )
      )
    )
  );


-- 6. Crear tabla de Favoritos para 'usuario' (Seguimiento de stock)
CREATE TABLE IF NOT EXISTS favorites (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, product_id)
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden gestionar sus propios favoritos" ON favorites
  FOR ALL TO authenticated 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- 7. Función Trigger para crear un perfil automáticamente al registrarse en Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    new.id, 
    coalesce(new.raw_user_meta_data->>'name', 'Distribuidor VIP'), 
    coalesce(new.raw_user_meta_data->>'role', 'usuario')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger de registro
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 8. Insertar datos actuales de tu Inventario local (${products.length} perfumes)
${products.length > 0 ? `INSERT INTO products (id, name, brand, size, cost, price_public, price_promotional, stock, category, barcode, description)
VALUES
  ${productSeedLines}
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  size = EXCLUDED.size,
  cost = EXCLUDED.cost,
  price_public = EXCLUDED.price_public,
  price_promotional = EXCLUDED.price_promotional,
  stock = EXCLUDED.stock,
  category = EXCLUDED.category,
  barcode = EXCLUDED.barcode,
  description = EXCLUDED.description;` : '-- No hay productos cargados en este momento para generar la inserción inicial.'}

-- =========================================================================
-- ¡Listo! Copia y pega este script en el SQL Editor de tu consola de Supabase.
-- =========================================================================`;
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(generateSupabaseSQL());
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="space-y-6 fade-in-up">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-neutral-900 tracking-tight">
            Gestión de Inventario de Perfumes
          </h2>
          <p className="text-xs text-neutral-500">
            Control de existencias físicas, precios públicos y precios promocionales para clientes HN.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {/* Supabase Export SQL */}
          <button
            onClick={() => setShowSupabaseExport(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer shadow-sm"
            title="Generar instrucciones SQL de Supabase para tu base de datos"
          >
            <Server className="h-4 w-4 text-sky-500" />
            Exportar a Supabase (SQL)
          </button>

          {/* CSV Import Trigger */}
          <button
            onClick={() => { setShowCsvImport(true); setShowForm(false); setCsvParsedProducts(null); setCsvText(''); }}
            disabled={pdfUploading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer disabled:opacity-50 shadow-sm"
          >
            <FileText className="h-4 w-4 text-emerald-500" />
            Importar Texto / CSV
          </button>

          {/* File Upload trigger with Gemini Icon */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={pdfUploading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer disabled:opacity-50 shadow-sm"
          >
            {pdfUploading ? (
               <Loader2 className="h-4 w-4 animate-spin text-neutral-500" />
            ) : (
               <FileUp className="h-4 w-4 text-neutral-500" />
            )}
            <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
            Importar PDF con IA
          </button>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePdfUpload}
            accept="application/pdf"
            className="hidden"
          />

          <button
            onClick={() => { resetForm(); setShowForm(true); setShowCsvImport(false); }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-neutral-800 cursor-pointer shadow-sm active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            Nuevo Perfume
          </button>
        </div>
      </div>

      {/* AI Processing Overlay Loader */}
      {pdfUploading && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-6 flex flex-col items-center text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
          <h3 className="font-display font-bold text-amber-900 text-base">
            El asistente de Inteligencia Artificial Gemini está leyendo tu PDF...
          </h3>
          <p className="text-xs text-amber-700 max-w-md">
            Estamos analizando la estructura de la factura, detectando marcas (Dior, Chanel, etc.), tamaños, costos unitarios y calculando precios sugeridos en Honduras. Esto tomará unos segundos.
          </p>
        </div>
      )}

      {/* CSV Paste / Raw Text Import Panel */}
      {showCsvImport && !csvParsedProducts && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-emerald-600" />
              <h3 className="font-display font-bold text-neutral-900 text-lg">
                Importar Inventario desde Base de Datos o Lista de Texto
              </h3>
            </div>
            <button
              onClick={() => setShowCsvImport(false)}
              className="p-1.5 hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 rounded-full cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="text-xs text-neutral-600 space-y-2">
            <p>Pega tu base de datos o lista de inventario línea por línea. El sistema detectará automáticamente el nombre, la marca, la presentación y estimará los precios.</p>
            <p className="font-bold text-neutral-700">Formato esperado (CSV o separado por comas):</p>
            <pre className="p-2.5 bg-neutral-50 rounded-lg text-[11px] font-mono border border-neutral-100 whitespace-pre-wrap overflow-x-auto text-neutral-700">
              Nombre de Perfume, Cantidad (Stock), Costo de Compra, Precio Público de Venta
            </pre>
            <p className="italic text-neutral-500">Ejemplo: Acqua Di Parisis Venizia 100 ML EDP Sp Women, 7, 675.00, 1100.00</p>
          </div>

          <textarea
            rows={8}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="Pega las líneas de tu inventario aquí..."
            className="w-full rounded-xl border border-neutral-200 p-3 text-xs font-mono focus:border-neutral-900 focus:outline-none"
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCsvImport(false)}
              className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleParseCsv}
              className="px-4 py-2 rounded-xl bg-neutral-900 text-xs font-bold text-white hover:bg-neutral-800 cursor-pointer"
            >
              Analizar Lista
            </button>
          </div>
        </div>
      )}

      {/* CSV Parsed Verification Panel */}
      {csvParsedProducts && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <h3 className="font-display font-bold text-emerald-900 text-lg">
                Perfumes detectados en el texto ({csvParsedProducts.length})
              </h3>
            </div>
            <button
              onClick={() => setCsvParsedProducts(null)}
              className="p-1.5 hover:bg-emerald-100 text-neutral-500 hover:text-neutral-900 rounded-full cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <p className="text-xs text-neutral-600">
            Revisa la información estructurada que hemos extraído de tu texto pegado. Los perfumes que ya existan en tu catálogo se actualizarán sumando el nuevo stock y actualizando los costos y precios.
          </p>
          
          <div className="overflow-x-auto rounded-xl border border-emerald-100 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-700 font-bold border-b border-neutral-100">
                <tr>
                  <th className="px-4 py-2">Perfume / Marca</th>
                  <th className="px-4 py-2">Tamaño</th>
                  <th className="px-4 py-2">Categoría</th>
                  <th className="px-4 py-2 text-right">Costo (HNL)</th>
                  <th className="px-4 py-2 text-right">P. Detalle (HNL)</th>
                  <th className="px-4 py-2 text-right">P. VIP (HNL)</th>
                  <th className="px-4 py-2 text-center">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {csvParsedProducts.map((p, idx) => (
                  <tr key={idx} className="hover:bg-neutral-50/50 text-neutral-700">
                    <td className="px-4 py-2">
                      <span className="font-bold text-neutral-900 block">{p.name}</span>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase">{p.brand}</span>
                    </td>
                    <td className="px-4 py-2 font-mono">{p.size}</td>
                    <td className="px-4 py-2 text-neutral-500">{p.category}</td>
                    <td className="px-4 py-2 text-right font-mono">L. {p.cost.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right font-mono font-bold text-emerald-600">L. {p.pricePublic.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right font-mono font-bold text-amber-600">L. {p.pricePromotional.toLocaleString()}</td>
                    <td className="px-4 py-2 text-center font-mono font-bold">{p.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2 border-t border-emerald-100 pt-3">
            <button
              onClick={() => setCsvParsedProducts(null)}
              className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
            >
              Atrás / Editar Texto
            </button>
            <button
              onClick={handleSaveCsvProducts}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700 cursor-pointer shadow-sm"
            >
              <CheckCircle2 className="h-4 w-4" />
              Confirmar e Importar al Inventario
            </button>
          </div>
        </div>
      )}

      {/* AI Results Verification Panel */}
      {aiParsedProducts && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <h3 className="font-display font-bold text-emerald-900 text-lg">
                Perfumes detectados por Inteligencia Artificial ({aiParsedProducts.length})
              </h3>
            </div>
            <button
              onClick={() => setAiParsedProducts(null)}
              className="p-1.5 hover:bg-emerald-100 text-neutral-500 hover:text-neutral-900 rounded-full"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-neutral-600">
            Revisa y confirma la información extraída del PDF. Los precios públicos y promocionales (VIP) fueron calculados automáticamente sumando márgenes recomendados de ganancia.
          </p>
          
          <div className="overflow-x-auto rounded-xl border border-emerald-100 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-emerald-50 text-emerald-900 uppercase tracking-wider font-bold">
                <tr>
                  <th className="px-4 py-3">Perfume / Marca</th>
                  <th className="px-4 py-3">Tamaño</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3">Costo de Compra</th>
                  <th className="px-4 py-3">P. Público (HN)</th>
                  <th className="px-4 py-3">P. Cliente VIP</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Cód. Barra</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-700">
                {aiParsedProducts.map((p, idx) => (
                  <tr key={idx} className="hover:bg-neutral-50/50">
                    <td className="px-4 py-3">
                      <span className="block font-semibold text-neutral-900">{p.name}</span>
                      <span className="text-[10px] text-neutral-500 uppercase">{p.brand}</span>
                    </td>
                    <td className="px-4 py-3 font-mono">{p.size}</td>
                    <td className="px-4 py-3">{p.category}</td>
                    <td className="px-4 py-3 font-bold text-neutral-900">L. {p.cost.toLocaleString()}</td>
                    <td className="px-4 py-3 text-emerald-600 font-bold">L. {p.pricePublic.toLocaleString()}</td>
                    <td className="px-4 py-3 text-amber-600 font-bold">L. {p.pricePromotional.toLocaleString()}</td>
                    <td className="px-4 py-3 font-mono font-semibold">{p.stock}</td>
                    <td className="px-4 py-3 font-mono text-neutral-500">{p.barcode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setAiParsedProducts(null)}
              className="px-4 py-2.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 bg-white hover:bg-neutral-50 cursor-pointer"
            >
              Descartar
            </button>
            <button
              onClick={handleSaveAiProducts}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700 cursor-pointer shadow-sm active:scale-95 transition-all"
            >
              <CheckCircle2 className="h-4 w-4" />
              Confirmar e Importar al Inventario
            </button>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-xs text-red-800 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
          <div>
            <span className="font-bold">Error:</span> {error}
          </div>
        </div>
      )}

      {/* Add / Edit Form Modal */}
      {showForm && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3 mb-4">
            <h3 className="font-display font-bold text-neutral-900 text-base">
              {editingProduct ? 'Editar Perfume' : 'Agregar Nuevo Perfume al Inventario'}
            </h3>
            <button
              onClick={resetForm}
              className="p-1.5 hover:bg-neutral-100 text-neutral-400 hover:text-neutral-900 rounded-full"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">Nombre del Perfume *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ej. Sauvage EDP"
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs focus:border-neutral-900 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">Marca *</label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="ej. Dior"
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs focus:border-neutral-900 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">Tamaño / Presentación *</label>
                <input
                  type="text"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  placeholder="ej. 100 ml, 3.4 oz"
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs focus:border-neutral-900 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">Costo Unitario (L. HNL)</label>
                <input
                  type="number"
                  value={cost}
                  onChange={(e) => setCost(Number(e.target.value))}
                  placeholder="Costo de compra"
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs focus:border-neutral-900 focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">Precio Detalle / Público (L. HNL) *</label>
                <input
                  type="number"
                  value={pricePublic}
                  onChange={(e) => setPricePublic(Number(e.target.value))}
                  placeholder="Venta público"
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs focus:border-neutral-900 focus:outline-none font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">Precio Especial VIP / Distribuidor (L. HNL) *</label>
                <input
                  type="number"
                  value={pricePromotional}
                  onChange={(e) => setPricePromotional(Number(e.target.value))}
                  placeholder="Venta distribuidores"
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs focus:border-neutral-900 focus:outline-none font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">Cantidad de Inventario *</label>
                <input
                  type="number"
                  value={stock}
                  onChange={(e) => setStock(Number(e.target.value))}
                  placeholder="Cantidad física"
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs focus:border-neutral-900 focus:outline-none font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">Género / Categoría *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs focus:border-neutral-900 focus:outline-none"
                >
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                  <option value="Unisex">Unisex</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">Código de Barra (Opcional)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="Generado automáticamente si se deja vacío"
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs focus:border-neutral-900 focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setBarcode(`740${Math.floor(100000000 + Math.random() * 900000000)}`)}
                    className="px-2.5 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-xl text-[10px] font-bold text-neutral-700"
                    title="Generar Código de Barra"
                  >
                    Auto
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">Descripción corta</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Notas de salida, duración, etc."
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs focus:border-neutral-900 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-neutral-100 pt-3 mt-4">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-neutral-900 text-xs font-bold text-white hover:bg-neutral-800 cursor-pointer shadow-sm"
              >
                {loading && <Loader2 className="h-3 w-3 animate-spin" />}
                Guardar Producto
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Inventory Table List */}
      <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 text-neutral-700 uppercase tracking-wider font-bold border-b border-neutral-200">
              <tr>
                <th className="px-6 py-4">Nombre del Producto</th>
                <th className="px-6 py-4">Género</th>
                <th className="px-6 py-4">Tamaño</th>
                <th className="px-6 py-4">Costo de Compra (HNL)</th>
                <th className="px-6 py-4">Precio Detalle / Público (HNL)</th>
                <th className="px-6 py-4">Precio VIP / Distribuidor (HNL)</th>
                <th className="px-6 py-4">Cantidad de Inventario</th>
                <th className="px-6 py-4">Código de Barra</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-700">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-neutral-400 font-medium">
                    No hay perfumes registrados en el inventario. Agrega uno manualmente o carga una factura en PDF.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-neutral-50/50">
                    <td className="px-6 py-4">
                      <span className="block font-bold text-neutral-950">{p.name}</span>
                      <span className="text-[10px] text-neutral-400 uppercase font-bold font-mono">{p.brand}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded-full border border-neutral-100 bg-neutral-50 text-[10px] font-bold">
                        {p.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono">{p.size}</td>
                    <td className="px-6 py-4 font-mono font-bold text-neutral-900">
                      L. {p.cost.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-emerald-600">
                      L. {p.pricePublic.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-amber-600">
                      L. {p.pricePromotional.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-mono font-bold px-2.5 py-0.5 rounded-full text-xs ${
                        p.stock <= 0 
                          ? 'bg-red-50 text-red-800' 
                          : p.stock <= 3 
                          ? 'bg-amber-50 text-amber-800 animate-pulse' 
                          : 'bg-emerald-50 text-emerald-800'
                      }`}>
                        {p.stock} uds.
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-[11px] text-neutral-900 font-bold bg-neutral-100 px-1.5 py-0.5 rounded max-w-fit">
                          {p.barcode}
                        </span>
                        {/* Tiny vector preview */}
                        <div 
                          className="h-6 w-24 overflow-hidden opacity-80"
                          dangerouslySetInnerHTML={{ __html: generateBarcodeSVG(p.barcode) }}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => handleEdit(p)}
                          className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Supabase SQL Export Modal Overlay */}
      {showSupabaseExport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-neutral-200 w-full max-w-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative my-8">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-sky-600" />
                <h3 className="font-display font-bold text-neutral-900 text-lg">Exportar a Supabase (Instrucciones SQL)</h3>
              </div>
              <button
                onClick={() => setShowSupabaseExport(false)}
                className="bg-neutral-100 hover:bg-neutral-200 p-2 rounded-full text-neutral-600 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-600">
              Copia el siguiente script SQL y ejecútalo en la pestaña <strong className="font-mono bg-neutral-100 px-1 py-0.5 rounded text-neutral-800">SQL Editor</strong> de tu proyecto de Supabase. Esto creará automáticamente las tablas <code className="text-sky-600 font-bold">products</code>, <code className="text-sky-600 font-bold">orders</code> y <code className="text-sky-600 font-bold">order_items</code> con la estructura, políticas de seguridad RLS óptimas y sembrará tus <strong>{products.length} perfumes</strong> actuales.
            </p>

            <div className="relative">
              <pre className="bg-neutral-950 text-neutral-200 text-[11px] font-mono p-5 rounded-2xl overflow-x-auto max-h-96 whitespace-pre">
                {generateSupabaseSQL()}
              </pre>
              
              <button
                onClick={handleCopySql}
                className="absolute top-3 right-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                {copiedSql ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-neutral-300" />
                    Copiar Script
                  </>
                )}
              </button>
            </div>

            <div className="bg-sky-50 border border-sky-100 rounded-xl p-4 text-xs text-sky-800 flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-sky-600 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <h5 className="font-bold">Próximos pasos de conexión</h5>
                <p>Una vez creadas las tablas, puedes conectar este backend Express con tu cliente de Supabase instalando <code className="font-mono bg-sky-100 text-sky-900 px-1 py-0.2 rounded">@supabase/supabase-js</code> y reemplazando las operaciones de lectura/escritura de <code className="font-mono">server.ts</code> por consultas reales de Supabase usando tus variables <code className="font-mono">SUPABASE_URL</code> y <code className="font-mono">SUPABASE_KEY</code>.</p>
              </div>
            </div>

            <div className="flex justify-end border-t border-neutral-100 pt-4">
              <button
                onClick={() => setShowSupabaseExport(false)}
                className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow cursor-pointer"
              >
                Cerrar Ventana
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
