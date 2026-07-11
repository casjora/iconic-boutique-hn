import { GoogleGenAI, Type } from "@google/genai";

// Configuración optimizada según el catálogo real de tu panel de Google AI Studio (2026)
const API_CONFIGS = [
  { apiKey: process.env.GEMINI_API_KEY, model: "gemini-3.5-flash" },      // Principal (Rápido, inteligente y con cuota libre)
  { apiKey: process.env.GEMINI_API_KEY_2, model: "gemini-3.5-flash" },    // Respaldo de cuota 1
  { apiKey: process.env.GEMINI_API_KEY_3, model: "gemini-3.1-pro" },      // Respaldo Pro (Máxima inteligencia si las anteriores fallan)
  { apiKey: process.env.GEMINI_API_KEY, model: "gemini-3.1-flash-lite" }  // Último recurso de emergencia
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { pdfBase64 } = req.body;
  if (!pdfBase64) {
    return res.status(400).json({ error: 'Se requiere el contenido del archivo PDF en formato Base64' });
  }

  // Limpiar el prefijo data:application/pdf;base64, si viene incluido
  const cleanBase64 = pdfBase64.split(",")[1] || pdfBase64;

  const prompt = `Analiza detenidamente TODO este documento de importación de perfumes de Iconic Boutique HN (tiene múltiples páginas). 
Debes extraer ABSOLUTAMENTE TODOS los artículos listados en la factura, sin omitir ninguno por espacio o longitud. Si hay 50, 100 o más productos, procésalos uno a uno e inclúyelos todos en el arreglo.

IMPORTANTE - CONVERSIÓN DE MONEDA (FÓRMULA HONDURAS):
- La factura del proveedor está en DÓLARES (USD).
- FÓRMULA DE COSTO: Si el precio original está en USD, conviértelo a costo en Lempiras (HNL) aplicando de forma estricta: Costo_HNL = ((Precio_USD * 1.05) + 5.5) * 27 Y DEBES aproximar el resultado al 5 más cercano (ejemplo: si da L. 772.2, aproxímalo a L. 770 o L. 775).
- Todos los campos 'cost', 'pricePublic' y 'pricePromotional' en el JSON devuelto DEBEN estar expresados en Lempiras de Honduras (HNL).

Reglas de campos obligatorios:
- name: Nombre del perfume (ej. "Sauvage EDP").
- brand: Marca (ej. "Dior").
- size: Tamaño con unidad de medida (ej. "100 ml", "3.4 oz").
- cost: Número entero en HNL calculado con la fórmula.
- pricePublic: Precio de venta sugerido al público en HNL (Suma de L. 400 a L. 800 sobre el costo, aproximado al 5 o 10 más cercano).
- pricePromotional: Precio de venta de mayoreo/VIP en HNL (Aproximadamente un 20% a 30% de margen sobre el costo, aproximado al 5 o 10 más cercano).
- stock: Cantidad de unidades de este producto según la factura (QTY). Si no se especifica, usa 1.
- category: Género del perfume. Debe ser estrictamente uno de estos: "Masculino", "Femenino" o "Unisex".
- barcode: Extrae el código UPC real de 12 o 13 dígitos provisto en la columna UPC de la factura. Si no está disponible en absoluto, déjalo vacío ("").`;

  const schema = {
    type: Type.ARRAY,
    description: "Lista completa de todos los perfumes extraídos de todas las páginas de la factura sin omisiones.",
    items: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        brand: { type: Type.STRING },
        size: { type: Type.STRING },
        cost: { type: Type.INTEGER },
        pricePublic: { type: Type.INTEGER },
        pricePromotional: { type: Type.INTEGER },
        stock: { type: Type.INTEGER },
        category: { type: Type.STRING },
        barcode: { type: Type.STRING },
        description: { type: Type.STRING }
      },
      required: ["name", "brand", "cost", "pricePublic", "pricePromotional", "stock", "category"]
    }
  };

  // Bucle de reintento a través de las llaves y modelos configurados
  for (let i = 0; i < API_CONFIGS.length; i++) {
    const config = API_CONFIGS[i];
    
    // Si la API Key actual no está definida en el entorno, saltamos a la siguiente
    if (!config.apiKey) continue;

    try {
      console.log(`Intentando procesamiento con Configuración #${i + 1} (Modelo: ${config.model})...`);
      
      const ai = new GoogleGenAI({ apiKey: config.apiKey });
      
      const response = await ai.models.generateContent({
        model: config.model,
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inlineData: {
                  data: cleanBase64,
                  mimeType: "application/pdf"
                }
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature: 0.1,        // Baja creatividad para evitar errores de cálculo o alucinaciones
          maxOutputTokens: 8192    // Te da la longitud máxima de salida para que quepa el JSON gigante completo
        }
      });

      const aiText = response.text;
      let parsedProducts = JSON.parse(aiText);
      
      // Asegurarnos de que el resultado sea un Array
      if (!Array.isArray(parsedProducts)) {
        if (parsedProducts.products && Array.isArray(parsedProducts.products)) {
          parsedProducts = parsedProducts.products;
        } else {
          parsedProducts = [parsedProducts];
        }
      }

      // Mapeo final, higienización de strings y asignación de fallbacks seguros
      parsedProducts = parsedProducts.map(p => {
        const name = (p.name || 'Perfume Desconocido').trim();
        const brand = (p.brand || 'Marca Desconocida').trim();
        const size = (p.size || '100 ml').trim();
        const cost = Number(p.cost) || 0;
        const pricePublic = Number(p.pricePublic) || (cost + 500);
        const pricePromotional = Number(p.pricePromotional) || (cost + 200);
        const stock = Number(p.stock) || 1;
        
        let category = (p.category || 'Unisex').trim();
        if (category.toLowerCase().includes('masculino') || category.toLowerCase().includes('hombre') || category.toLowerCase().includes('men')) {
          category = 'Masculino';
        } else if (category.toLowerCase().includes('femenino') || category.toLowerCase().includes('mujer') || category.toLowerCase().includes('women')) {
          category = 'Femenino';
        } else {
          category = 'Unisex';
        }
        
        // Si no se extrajo un código de barras real, generamos un código único consistente basado en el estándar 740
        const barcode = (p.barcode || '').trim() || `740${Math.floor(100000000 + Math.random() * 900000000)}`;
        
        return {
          name,
          brand,
          size,
          cost,
          pricePublic,
          pricePromotional,
          stock,
          category,
          barcode,
          description: p.description || 'Importado automáticamente vía PDF'
        };
      });

      console.log(`¡Éxito total! Se procesaron ${parsedProducts.length} productos usando la configuración #${i + 1}.`);
      
      return res.status(200).json({
        success: true,
        products: parsedProducts
      });

    } catch (error) {
      console.warn(`La configuración #${i + 1} falló (${config.model}):`, error.message || error);
      
      // Si ya es el último intento de la lista y falló, lanza el error definitivo
      if (i === API_CONFIGS.length - 1) {
        return res.status(500).json({ error: `Todas las API Keys o modelos configurados fallaron. Último error: ${error.message}` });
      }
    }
  }
}