import { GoogleGenAI, Type } from "@google/genai";
import pdfStructure from 'pdf-parse';

// Configuraciones válidas según tu panel de Google AI Studio
const API_CONFIGS = [
  { apiKey: process.env.GEMINI_API_KEY, model: "gemini-3.5-flash" },
  { apiKey: process.env.GEMINI_API_KEY_2, model: "gemini-3.5-flash" },
  { apiKey: process.env.GEMINI_API_KEY, model: "gemini-3.1-flash-lite" }
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { pdfBase64 } = req.body;
  if (!pdfBase64) {
    return res.status(400).json({ error: 'Se requiere el archivo PDF en formato Base64' });
  }

  try {
    // 1. Convertir el Base64 que viene del front a un Buffer binario para que Node pueda leerlo
    const pdfBuffer = Buffer.from(pdfBase64.split(",")[1] || pdfBase64, 'base64');
    
    // 2. Extraer el texto estructurado dividiéndolo dinámicamente por páginas
    let pagesText = [];
    await pdfStructure(pdfBuffer, {
      pagerender: function(pageData) {
        return pageData.getTextContent().then(function(textContent) {
          let text = textContent.items.map(item => item.str).join(' ');
          pagesText.push(text);
          return text;
        });
      }
    });

    console.log(`PDF segmentado con éxito. Total de páginas a procesar: ${pagesText.length}`);

    // Prompt ligero enfocado puramente en lectura óptica elemental (sin matemáticas complejas)
    const prompt = `Analiza este extracto de texto que pertenece a una página específica de una factura de importación de perfumes.
Extrae TODOS los artículos listados en esta sección sin omitir ninguna fila. No omitas registros por espacio.

Campos obligatorios por cada objeto:
- name: Nombre del perfume.
- brand: Marca (ej. "Lacoste", "Dior").
- size: Tamaño (ej. "3.3 oz", "100 ml").
- unitPriceUSD: El precio unitario en dólares que aparece en la columna 'Price' (Número decimal).
- stock: Cantidad de unidades listadas en la columna 'QTY' (Número entero).
- category: Género ("Masculino", "Femenino" o "Unisex").
- barcode: El código numérico de la columna 'UPC'. Si viene vacío o no tiene, coloca "".`;

    const schema = {
      type: Type.ARRAY,
      description: "Lista de perfumes detectados en esta página de la factura.",
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

    // Usaremos la primera clave/modelo disponible como motor principal
    const ai = new GoogleGenAI({ apiKey: API_CONFIGS[0].apiKey });
    const selectedModel = API_CONFIGS[0].model;
    
    let totalProductosExtraidos = [];

    // 3. RECORRER EL PDF PÁGINA POR PÁGINA EN UN CICLO LOOP
    for (let i = 0; i < pagesText.length; i++) {
      const textoDeLaPagina = pagesText[i];

      // Sanitización: Si la página está vacía o no tiene palabras clave de inventario como "QTY", la saltamos
      if (!textoDeLaPagina.trim() || !textoDeLaPagina.includes("QTY")) {
        console.log(`Página ${i + 1} saltada automáticamente (no contiene datos de productos).`);
        continue;
      }

      console.log(`Procesando página ${i + 1}/${pagesText.length} usando ${selectedModel}...`);

      try {
        const response = await ai.models.generateContent({
          model: selectedModel,
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                { text: `--- CONTENIDO TEXTUAL DE LA PÁGINA ${i + 1} ---\n${textoDeLaPagina}` }
              ]
            }
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: schema,
            temperature: 0.0 // Precisión quirúrgica absoluta
          }
        });

        const productosPagina = JSON.parse(response.text);
        
        if (Array.isArray(productosPagina)) {
          console.log(`-> Página ${i + 1}: Se extrajeron ${productosPagina.length} productos.`);
          totalProductosExtraidos = totalProductosExtraidos.concat(productosPagina);
        }
      } catch (pageError) {
        console.error(`❌ Error crítico al extraer datos de la página ${i + 1}:`, pageError.message || pageError);
        // El bucle continuará de forma resiliente con la página siguiente si una llegase a fallar
      }
    }

    // 4. PROCESAMIENTO MATEMÁTICO INTEGRAL DE LA FÓRMULA HONDURAS (JAVASCRIPT)
    console.log(`Unificación final lista. Procesando cálculos de mercado para ${totalProductosExtraidos.length} artículos...`);
    
    const productosFinalizados = totalProductosExtraidos.map(p => {
      const name = (p.name || 'Perfume Desconocido').trim();
      const brand = (p.brand || 'Marca Desconocida').trim();
      const size = (p.size || '100 ml').trim();
      const stock = Number(p.stock) || 1;
      const usdPrice = Number(p.unitPriceUSD) || 0;

      // Ejecución limpia de la fórmula matemática de costo en Lempiras
      // Costo_HNL = ((Precio_USD * 1.05) + 5.5) * 27
      let rawCostHNL = ((usdPrice * 1.05) + 5.5) * 27;
      
      // Redondear exactamente al múltiplo de 5 más cercano
      const cost = Math.round(rawCostHNL / 5) * 5;

      // Margen comercial estándar aproximado al 10 más cercano
      const pricePublic = Math.round((cost + 550) / 10) * 10;
      const pricePromotional = Math.round((cost * 1.25) / 5) * 5;

      // Normalización estricta de categorías
      let category = (p.category || 'Unisex').trim();
      if (category.toLowerCase().includes('masculino') || category.toLowerCase().includes('hombre') || category.toLowerCase().includes('men')) {
        category = 'Masculino';
      } else if (category.toLowerCase().includes('femenino') || category.toLowerCase().includes('mujer') || category.toLowerCase().includes('women')) {
        category = 'Femenino';
      } else {
        category = 'Unisex';
      }

      // Código de barra o fallback numérico aleatorio único
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
        description: `Importado de factura original. Precio original de lista: $${usdPrice.toFixed(2)} USD.`
      };
    });

    console.log(`¡Éxito absoluto! Entrega final lista: ${productosFinalizados.length} perfumes mapeados.`);
    
    return res.status(200).json({
      success: true,
      products: productosFinalizados
    });

  } catch (error) {
    console.error('Error global en el handler de parsing:', error);
    return res.status(500).json({ error: `Fallo general en el procesamiento del documento: ${error.message}` });
  }
}