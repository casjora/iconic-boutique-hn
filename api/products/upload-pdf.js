import { GoogleGenAI, Type } from "@google/genai";

const API_CONFIGS = [
  { apiKey: process.env.GEMINI_API_KEY, model: "gemini-3.5-flash" },
  { apiKey: process.env.GEMINI_API_KEY_2, model: "gemini-3.5-flash" },
  { apiKey: process.env.GEMINI_API_KEY_3, model: "gemini-3.1-pro" }
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { pdfBase64 } = req.body;
  if (!pdfBase64) {
    return res.status(400).json({ error: 'Se requiere el archivo PDF' });
  }

  const cleanBase64 = pdfBase64.split(",")[1] || pdfBase64;

  // Prompt ultra-enfocado en extracción bruta para ahorrar memoria de salida
  const prompt = `Analiza detalladamente cada página de este PDF de importación de perfumes de Iconic Boutique HN.
Tu única tarea es extraer TODOS los artículos sin excepción. El documento es largo; mantén la constancia y no omitas ninguna fila de las tablas. 

Extrae los valores originales en DÓLARES (USD) tal como aparecen en la factura. No hagas cálculos matemáticos complejos, solo extrae los datos puros.

Campos obligatorios por objeto:
- name: Nombre del perfume tal como aparece.
- brand: Marca (ej. "Dior", "Lacoste", "Calvin Klein").
- size: Tamaño (ej. "3.3 oz", "100 ml").
- unitPriceUSD: El precio unitario en dólares que aparece en la columna 'Price'. (Número decimal, ej: 22.00).
- stock: Cantidad en la columna 'QTY'. (Número entero).
- category: Género ("Masculino", "Femenino" o "Unisex").
- barcode: El código numérico de la columna 'UPC'. Si está vacío o no tiene, coloca "".`;

  const schema = {
    type: Type.ARRAY,
    description: "Lista completa y exhaustiva de todos los productos del PDF.",
    items: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        brand: { type: Type.STRING },
        size: { type: Type.STRING },
        unitPriceUSD: { type: Type.NUMBER },
        stock: { type: Type.INTEGER },
        category: { type: Type.STRING },
        barcode: { type: Type.STRING }
      },
      required: ["name", "brand", "unitPriceUSD", "stock", "category"]
    }
  };

  for (let i = 0; i < API_CONFIGS.length; i++) {
    const config = API_CONFIGS[i];
    if (!config.apiKey) continue;

    try {
      console.log(`Iniciando extracción con ${config.model}...`);
      const ai = new GoogleGenAI({ apiKey: config.apiKey });
      
      const response = await ai.models.generateContent({
        model: config.model,
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              { inlineData: { data: cleanBase64, mimeType: "application/pdf" } }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature: 0.0, // Reducido a 0 para máxima precisión de extracción
          maxOutputTokens: 8192
        }
      });

      let parsedProducts = JSON.parse(response.text);
      if (!Array.isArray(parsedProducts)) {
        parsedProducts = parsedProducts.products || [parsedProducts];
      }

      // PROCESAMIENTO MATEMÁTICO EXACTO EN JAVASCRIPT (FÓRMULA HONDURAS)
      const finalizedProducts = parsedProducts.map(p => {
        const name = (p.name || 'Perfume Desconocido').trim();
        const brand = (p.brand || 'Marca Desconocida').trim();
        const size = (p.size || '100 ml').trim();
        const stock = Number(p.stock) || 1;
        const usdPrice = Number(p.unitPriceUSD) || 0;

        // 1. Aplicar Fórmula de Costo exacta de Iconic Boutique
        // Costo_HNL = ((Precio_USD * 1.05) + 5.5) * 27
        let rawCostHNL = ((usdPrice * 1.05) + 5.5) * 27;
        
        // 2. Redondear al 5 más cercano de manera exacta en código
        const cost = Math.round(rawCostHNL / 5) * 5;

        // 3. Calcular precios de venta sugeridos basados en el costo exacto
        const pricePublic = Math.round((cost + 550) / 10) * 10; // Suma aprox L.550 y redondea al 10 más cercano
        const pricePromotional = Math.round((cost * 1.25) / 5) * 5; // Margen de 25% VIP redondeado al 5

        let category = (p.category || 'Unisex').trim();
        if (category.toLowerCase().includes('masculino') || category.toLowerCase().includes('hombre') || category.toLowerCase().includes('men')) {
          category = 'Masculino';
        } else if (category.toLowerCase().includes('femenino') || category.toLowerCase().includes('mujer') || category.toLowerCase().includes('women')) {
          category = 'Femenino';
        } else {
          category = 'Unisex';
        }

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
          description: `Importado de factura original. Precio original: $${usdPrice.toFixed(2)} USD.`
        };
      });

      console.log(`Éxito: ${finalizedProducts.length} productos procesados con precisión.`);
      return res.status(200).json({ success: true, products: finalizedProducts });

    } catch (error) {
      console.warn(`Fallo en configuración #${i + 1}:`, error.message || error);
      if (i === API_CONFIGS.length - 1) {
        return res.status(500).json({ error: `No se pudo completar la lectura: ${error.message}` });
      }
    }
  }
}