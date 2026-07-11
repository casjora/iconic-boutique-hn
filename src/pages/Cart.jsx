import { GoogleGenAI, Type } from "@google/genai";
import PDFParser from "pdf2json";

const API_CONFIGS = [
  { apiKey: process.env.GEMINI_API_KEY, model: "gemini-3.5-flash" },
  { apiKey: process.env.GEMINI_API_KEY_2, model: "gemini-3.5-flash" },
  { apiKey: process.env.GEMINI_API_KEY, model: "gemini-3.1-flash-lite" }
];

// Decodificador seguro libre de advertencias de ESLint
function cleanExtractedText(str) {
  try {
    const decoded = decodeURIComponent(str);
    return decoded
      .replace(/\x60/g, "'")
      .replace(/\\/g, "/")
      .replace(/\p{Cc}/gu, ""); // Limpia caracteres de control de forma estandarizada
  } catch {
    return unescape(str)
      .replace(/\x60/g, "'")
      .replace(/\\/g, "/")
      .replace(/\p{Cc}/gu, "");
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { pdfBase64 } = req.body;
  if (!pdfBase64) {
    return res.status(400).json({ error: 'Se requiere el archivo PDF en formato Base64' });
  }

  try {
    const cleanBase64 = pdfBase64.split(",")[1] || pdfBase64;
    const pdfBuffer = Buffer.from(cleanBase64, 'base64');

    // 1. Extracción y normalización del texto por páginas
    const pagesText = await new Promise((resolve, reject) => {
      const pdfParser = new PDFParser();
      
      pdfParser.on("pdfParser_dataError", errData => {
        reject(new Error(errData?.parserError || "Error decodificando el binario del PDF"));
      });
      
      pdfParser.on("pdfParser_dataReady", pdfData => {
        try {
          const pages = pdfData.Pages.map(page => {
            return page.Texts.map(text => {
              if (!text || !text.R || !text.R[0]) return "";
              return cleanExtractedText(text.R[0].T);
            }).join(' ');
          });
          resolve(pages);
        } catch (innerError) {
          reject(innerError);
        }
      });

      pdfParser.parseBuffer(pdfBuffer);
    });

    console.log(`PDF cargado. Páginas del documento: ${pagesText.length}`);

    // Prompt reescrito con comillas dobles estándar eliminando backticks conflictivos
    const prompt = "Analiza este extracto de texto de una factura de importación de perfumes.\n" +
                   "Extrae TODOS los artículos listados en esta sección sin omitir ninguna fila.\n\n" +
                   "Campos obligatorios por cada objeto:\n" +
                   "- name: Nombre del perfume (sin usar comillas invertidas ni caracteres de escape).\n" +
                   "- brand: Marca (ej. Lacoste, Dior).\n" +
                   "- size: Tamaño (ej. 3.3 oz, 100 ml).\n" +
                   "- unitPriceUSD: El precio unitario en dólares que aparece en la columna Price (Número decimal).\n" +
                   "- stock: Cantidad de unidades de la columna QTY (Número entero).\n" +
                   "- category: Género (Masculino, Femenino o Unisex).\n" +
                   "- barcode: Código numérico de la columna UPC. Si viene vacío, enviar string vacío.";

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
    
    let totalProductosExtraidos = [];
    const delay = (ms) => new Promise(res => setTimeout(res, ms));

    // 2. Procesamiento iterativo de páginas con Reintentos Automáticos (Backoff)
    for (let i = 0; i < pagesText.length; i++) {
      const textoDeLaPagina = pagesText[i];

      if (!textoDeLaPagina.trim() || (!textoDeLaPagina.includes("QTY") && !textoDeLaPagina.includes("Price"))) {
        console.log(`Página ${i + 1} omitida (sin estructura de tabla).`);
        continue;
      }

      let productosPagina = null;
      let reintentosMaximos = 3; 
      let intentoActual = 0;

      while (intentoActual < reintentosMaximos && !productosPagina) {
        // Rotación dinámica de credenciales y modelos según el intento
        const configActual = API_CONFIGS[intentoActual % API_CONFIGS.length];
        console.log(`Procesando página ${i + 1}/${pagesText.length} (Intento ${intentoActual + 1}/${reintentosMaximos}) usando ${configActual.model}...`);

        try {
          const aiInstancia = new GoogleGenAI({ apiKey: configActual.apiKey });
          
          const response = await aiInstancia.models.generateContent({
            model: configActual.model,
            contents: [
              {
                role: "user",
                parts: [
                  { text: prompt },
                  { text: "--- CONTENIDO PÁGINA " + (i + 1) + " ---\n" + textoDeLaPagina }
                ]
              }
            ],
            config: {
              responseMimeType: "application/json",
              responseSchema: schema,
              temperature: 0.0
            }
          });

          let cleanResponseText = response.text.trim();
          if (cleanResponseText.startsWith("```")) {
            cleanResponseText = cleanResponseText.replace(/^```json/, "").replace(/```$/, "").trim();
          }

          productosPagina = JSON.parse(cleanResponseText);
          
          if (Array.isArray(productosPagina)) {
            console.log(`-> Página ${i + 1}: Extraídos ${productosPagina.length} productos con éxito.`);
            totalProductosExtraidos = totalProductosExtraidos.concat(productosPagina);
          }

        } catch (pageError) {
          intentoActual++;
          console.warn(`⚠️ Alerta en página ${i + 1} (Intento ${intentoActual} falló): ${pageError.message || pageError}`);
          
          if (intentoActual < reintentosMaximos) {
            const tiempoEspera = intentoActual * 2000; 
            console.log(`Esperando ${tiempoEspera / 1000} segundos antes de reintentar...`);
            await delay(tiempoEspera);
          } else {
            console.error(`❌ Error crítico: Se agotaron los ${reintentosMaximos} intentos para la página ${i + 1}.`);
          }
        }
      }
    }

    // 3. PROCESAMIENTO MATEMÁTICO EN JAVASCRIPT (FÓRMULA HONDURAS)
    console.log(`Mapeando cálculos de mercado para ${totalProductosExtraidos.length} artículos...`);
    
    const productosFinalizados = totalProductosExtraidos.map(p => {
      const name = (p.name || 'Perfume Desconocido').replace(/["`]/g, "").trim();
      const brand = (p.brand || 'Marca Desconocida').trim();
      const size = (p.size || '100 ml').trim();
      const stock = Number(p.stock) || 1;
      const usdPrice = Number(p.unitPriceUSD) || 0;

      // Cálculo de costo exacto en HNL
      let rawCostHNL = ((usdPrice * 1.05) + 5.5) * 27;
      const cost = Math.round(rawCostHNL / 5) * 5;

      // Precios de venta sugeridos basados en el costo final redondeado
      const pricePublic = Math.round((cost + 550) / 10) * 10;
      const pricePromotional = Math.round((cost * 1.25) / 5) * 5;

      let category = (p.category || 'Unisex').trim();
      if (category.toLowerCase().includes('masculino') || category.toLowerCase().includes('hombre') || category.toLowerCase().includes('men')) {
        category = 'Masculino';
      } else if (category.toLowerCase().includes('femenino') || category.toLowerCase().includes('mujer') || category.toLowerCase().includes('women')) {
        category = 'Felenino';
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
        description: "Importado de factura original. Precio original: $" + usdPrice.toFixed(2) + " USD."
      };
    });

    console.log(`Despliegue exitoso: ${productosFinalizados.length} listados.`);
    
    return res.status(200).json({
      success: true,
      products: productosFinalizados
    });

  } catch (error) {
    console.error('Error global:', error);
    return res.status(500).json({ error: `Fallo general: ${error.message}` });
  }
}