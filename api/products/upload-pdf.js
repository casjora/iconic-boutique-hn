import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from "openai";
import { PDFParse } from "pdf-parse";

// Safe text decoder to remove dangerous escaping or special characters
function cleanExtractedText(str) {
  if (!str) return "";
  try {
    return str
      .replace(/\x60/g, "'")
      .replace(/\\/g, "/")
      .replace(/\p{Cc}/gu, "");
  } catch {
    return String(str)
      .replace(/\x60/g, "'")
      .replace(/\\/g, "/")
      .replace(/\p{Cc}/gu, "");
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { pdfBase64, pagesText: existingPagesText, model = "gemini-3.6-flash", startPage = 0, productsParsedSoFar = [] } = req.body;

  if (!pdfBase64 && !existingPagesText) {
    return res.status(400).json({ error: 'Se requiere el archivo PDF en formato Base64 o el texto de las páginas pre-extraídas' });
  }

  try {
    let pagesText = existingPagesText;

    // 1. Extract and normalize PDF page text
    if (!pagesText) {
      const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '').replace(/\s/g, '');
      const pdfBuffer = Buffer.from(cleanBase64, 'base64');

      pagesText = await new Promise((resolve, reject) => {
        try {
          const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
          parser.getText()
            .then((result) => {
              if (!result || !Array.isArray(result.pages)) {
                reject(new Error("Formato de datos de PDF no válido o vacío"));
                return;
              }
              const pages = result.pages.map(page => cleanExtractedText(page.text));
              resolve(pages);
            })
            .catch((innerError) => {
              reject(new Error(innerError?.message || "Error al extraer el texto del PDF"));
            });
        } catch (err) {
          reject(new Error(err?.message || "Error al inicializar el lector PDF"));
        }
      });
      console.log(`PDF cargado y extraído en upload-pdf con pdf-parse. Páginas: ${pagesText.length}`);
    }

    // Prompts and schemas for structured extraction
    const prompt = "Analiza este extracto de texto de una factura de importación de perfumes.\n" +
                   "Extrae TODOS los artículos listados en esta sección sin omitir ninguna fila.\n\n" +
                   "Campos obligatorios por cada objeto:\n" +
                   "- name: Nombre del perfume (sin usar comillas invertidas ni caracteres de escape).\n" +
                   "- brand: Marca (ej. Lacoste, Dior).\n" +
                   "- size: Tamaño (ej. 3.3 oz, 100 ml).\n" +
                   "- unitPriceUSD: El precio unitario en dólares que aparece en la columna Price (Número decimal).\n" +
                   "- stock: Cantidad de unidades de la columna QTY (Número entero).\n" +
                   "- category: Género (Masculino, Femenino o Unisex).\n" +
                   "- barcode: Código numérico de la columna UPC. Si viene vacío, con un string vacío.";

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

    let totalProductosExtraidos = [...productsParsedSoFar];

    const geminiApiKey = process.env.GEMINI_API_KEY;
    const deepseekApiKey = process.env.DEEP_SEEK_API || process.env.DEEPSEEK_API_KEY;

    // 2. Process pages sequentially starting from startPage
    for (let i = startPage; i < pagesText.length; i++) {
      const textoDeLaPagina = pagesText[i];

      if (!textoDeLaPagina.trim() || (!textoDeLaPagina.includes("QTY") && !textoDeLaPagina.includes("Price") && !textoDeLaPagina.includes("Total") && !textoDeLaPagina.includes("Amount"))) {
        console.log(`Página ${i + 1} omitida (sin estructura de tabla obvia).`);
        continue;
      }

      console.log(`[upload-pdf] Procesando página ${i + 1}/${pagesText.length} con modelo inicial solicitado: ${model}...`);

      // Determine sequence of model fallbacks for ultimate fault tolerance
      let fallbacks = [];
      if (model && (model.startsWith("deepseek") || model === "deepseek-v4-pro")) {
        fallbacks = [
          { provider: "deepseek", name: "deepseek-v4-pro" },
          { provider: "deepseek", name: "deepseek-v4-flash" },
          { provider: "gemini", name: "gemini-3.6-flash" },
          { provider: "gemini", name: "gemini-3.5-flash" },
          { provider: "gemini", name: "gemini-3.1-flash-lite" }
        ];
      } else {
        const chosenGemini = model || "gemini-3.6-flash";
        const otherGeminis = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite"].filter(m => m !== chosenGemini);
        fallbacks = [
          { provider: "gemini", name: chosenGemini },
          ...otherGeminis.map(m => ({ provider: "gemini", name: m })),
          { provider: "deepseek", name: "deepseek-v4-pro" },
          { provider: "deepseek", name: "deepseek-v4-flash" }
        ];
      }

      let parsedSuccessfully = false;
      let lastError = null;

      for (const attempt of fallbacks) {
        console.log(`[Página ${i + 1} - Intento] Proveedor: ${attempt.provider}, Modelo: ${attempt.name}`);
        try {
          let rawText = "";

          if (attempt.provider === "deepseek") {
            if (!deepseekApiKey) {
              throw new Error("La clave de API de DeepSeek no está configurada.");
            }

            const openai = new OpenAI({
              baseURL: 'https://api.deepseek.com',
              apiKey: deepseekApiKey,
            });

            const systemPrompt = "Eres un asistente de extracción de datos especializado en facturas de importación de perfumes.\n" +
              "Tu tarea es analizar el texto de la página suministrada y responder UNICAMENTE con un JSON válido en formato de lista/arreglo (Array de objetos).\n\n" +
              "Estructura obligatoria de cada objeto:\n" +
              "{\n" +
              '  "name": "Nombre del perfume (string)",\n' +
              '  "brand": "Marca del perfume (string)",\n' +
              '  "size": "Tamaño ej. 3.3 oz, 100 ml (string)",\n' +
              '  "unitPriceUSD": 0.0, // Precio unitario de la columna Price (number decimal)\n' +
              '  "stock": 0, // Cantidad de la columna QTY (number entero)\n' +
              '  "category": "Masculino|Femenino|Unisex",\n' +
              '  "barcode": "Código UPC o string vacío si no hay"\n' +
              "}\n\n" +
              "REGLAS CRÍTICAS:\n" +
              "1. No omitas ningún artículo presente en la tabla.\n" +
              "2. Responde strictly con un JSON sin ningún texto explicativo ni formato Markdown adicional.";

            const response = await openai.chat.completions.create({
              model: attempt.name,
              response_format: { type: "json_object" },
              temperature: 0.0,
              messages: [
                { role: "system", content: systemPrompt },
                { 
                  role: "user", 
                  content: "Extrae los productos en formato JSON array para la siguiente página:\n\n--- CONTENIDO PÁGINA " + (i + 1) + " ---\n" + textoDeLaPagina 
                }
              ]
            });

            rawText = response.choices[0]?.message?.content?.trim() || "";
          } else {
            if (!geminiApiKey) {
              throw new Error("La clave de API de Gemini no está configurada.");
            }

            const ai = new GoogleGenAI({ apiKey: geminiApiKey });

            const response = await ai.models.generateContent({
              model: attempt.name,
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

            rawText = response.text.trim();
          }

          if (rawText.startsWith("```")) {
            rawText = rawText.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
          }

          const parsedData = JSON.parse(rawText);

          const productosPagina = Array.isArray(parsedData) 
            ? parsedData 
            : (parsedData.products || parsedData.items || Object.values(parsedData)[0] || []);

          if (Array.isArray(productosPagina)) {
            console.log(`-> Página ${i + 1} exitosa con ${attempt.provider}/${attempt.name}: Extraídos ${productosPagina.length} productos.`);
            totalProductosExtraidos = totalProductosExtraidos.concat(productosPagina);
            parsedSuccessfully = true;
            break; // Siguiente página
          } else {
            throw new Error("El JSON devuelto no tiene un formato de lista válido.");
          }
        } catch (pageError) {
          console.warn(`⚠️ Intento fallido en página ${i + 1} usando ${attempt.provider}/${attempt.name}:`, pageError.message || pageError);
          lastError = pageError;
        }
      }

      if (!parsedSuccessfully) {
        console.error(`❌ Todos los modelos fallaron al procesar la página ${i + 1}.`);
        return res.status(200).json({
          success: false,
          error: `Error crítico en página ${i + 1}: ${lastError?.message || lastError || "Todos los intentos de IA fallaron."}`,
          failedPageIndex: i,
          pagesText: pagesText,
          productsParsedSoFar: totalProductosExtraidos,
          model: model
        });
      }
    }

    // 3. Final calculations & mapping (Honduras formula)
    console.log(`Mapeando cálculos de mercado para ${totalProductosExtraidos.length} artículos...`);

    const productosFinalizados = totalProductosExtraidos.map(p => {
      const name = (p.name || 'Perfume Desconocido').replace(/["`]/g, "").trim();
      const brand = (p.brand || 'Marca Desconocida').trim();
      const size = (p.size || '100 ml').trim();
      const stock = Number(p.stock) || 1;
      const usdPrice = Number(p.unitPriceUSD || p.unitPriceUSD === 0 ? p.unitPriceUSD : p.price) || 0;

      // Pricing logic: raw Cost HNL
      let rawCostHNL = ((usdPrice * 1.05) + 5.5) * 27;
      const cost = Math.round(rawCostHNL / 5) * 5;

      // Sales prices suggested
      const pricePublic = Math.round((cost + 550) / 10) * 10;
      const pricePromotional = Math.round((cost * 1.25) / 5) * 5;

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