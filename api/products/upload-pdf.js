import 'dotenv/config';
import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from "openai";
import PDFParser from "pdf2json";

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

      try {
        const pagesTextList = await new Promise((resolve, reject) => {
          const pdfParser = new PDFParser();

          pdfParser.on("pdfParser_dataError", errData => {
            reject(new Error(errData.parserError || "Error al decodificar PDF con pdf2json"));
          });

          pdfParser.on("pdfParser_dataReady", pdfData => {
            try {
              if (!pdfData || !Array.isArray(pdfData.Pages)) {
                reject(new Error("Formato de datos de PDF no válido o vacío"));
                return;
              }
              const pages = pdfData.Pages.map(page => {
                if (!page || !Array.isArray(page.Texts)) return "";
                return page.Texts.map(text => {
                  if (!text || !Array.isArray(text.R)) return "";
                  return text.R.map(run => {
                    const rawVal = run.T || "";
                    try {
                      return decodeURIComponent(rawVal);
                    } catch {
                      return rawVal;
                    }
                  }).join('');
                }).join(' ');
              }).map(cleanExtractedText);
              resolve(pages);
            } catch (e) {
              reject(e);
            }
          });

          pdfParser.parseBuffer(pdfBuffer);
        });
        pagesText = pagesTextList;
      } catch (innerError) {
throw new Error(
    innerError?.message || "Error al extraer el texto del PDF", 
    { cause: innerError }
  );
      }
      console.log(`PDF cargado y extraído en upload-pdf con pdf2json. Páginas: ${pagesText.length}`);
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
    
    // Robust resolution of DeepSeek API Key and Base URL
    let deepseekApiKey = "";
    let deepseekBaseURL = "https://api.deepseek.com";

    const possibleKeys = [
      process.env.DEEPSEEK_API_KEY,
      process.env.DEEP_SEEK_API_KEY,
      process.env.DEEPSEEK_API,
      process.env.DEEP_SEEK_API
    ];

    for (const key of possibleKeys) {
      if (key && typeof key === "string") {
        if (key.startsWith("http://") || key.startsWith("https://") || key.includes("/")) {
          deepseekBaseURL = key;
        } else if (key.trim()) {
          deepseekApiKey = key.trim();
        }
      }
    }

    // 2. Process pages sequentially starting from startPage
    for (let i = startPage; i < pagesText.length; i++) {
      const textoDeLaPagina = pagesText[i];

      const upperPageText = textoDeLaPagina.toUpperCase();
      const hasKeywords = upperPageText.includes("QTY") || 
                          upperPageText.includes("PRICE") || 
                          upperPageText.includes("TOTAL") || 
                          upperPageText.includes("AMOUNT") || 
                          upperPageText.includes("SUBTOTAL") || 
                          upperPageText.includes("PCS") || 
                          upperPageText.includes("BRAND") || 
                          upperPageText.includes("DESCR") || 
                          upperPageText.includes("ITEM") || 
                          upperPageText.includes("EXT");

      if (!textoDeLaPagina.trim() || !hasKeywords) {
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
      let modelUsedSuccess = "";

      for (const attempt of fallbacks) {
        console.log(`[Página ${i + 1} - Intento] Proveedor: ${attempt.provider}, Modelo: ${attempt.name}`);
        try {
          let rawText = "";

          if (attempt.provider === "deepseek") {
            if (!deepseekApiKey) {
              throw new Error("La clave de API de DeepSeek no está configurada.");
            }

            const openai = new OpenAI({
              baseURL: deepseekBaseURL,
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
              "2. Responde estrictamente con un JSON sin ningún texto explicativo ni formato Markdown adicional.";

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

            const ai = new GoogleGenAI({ 
              apiKey: geminiApiKey,
              httpOptions: {
                headers: {
                  'User-Agent': 'aistudio-build'
                }
              }
            });

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
            modelUsedSuccess = attempt.name;
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
      let size = (p.size || '100 ml').trim();
      const stock = Number(p.stock) || 1;
      const usdPrice = Number(p.unitPriceUSD || p.unitPriceUSD === 0 ? p.unitPriceUSD : p.price) || 0;

      // Pricing logic: raw Cost HNL
      let rawCostHNL = ((usdPrice * 1.05) + 5.5) * 27;
      const cost = Math.round(rawCostHNL / 5) * 5;

      // Sales prices suggested
      const pricePublic = Math.round((cost + 550) / 10) * 10;
      const pricePromotional = Math.round((cost * 1.25) / 5) * 5;

      // Consistent ml conversion for size
      const sizeLower = size.toLowerCase();
      if (sizeLower.includes('oz')) {
        const match = sizeLower.match(/([\d.]+)\s*oz/);
        if (match) {
          const oz = parseFloat(match[1]);
          if (oz === 3.4 || oz === 3.3) {
            size = '100 ml';
          } else if (oz === 1.7 || oz === 1.6) {
            size = '50 ml';
          } else if (oz === 6.8 || oz === 6.7) {
            size = '200 ml';
          } else if (oz === 5.0 || oz === 5.1) {
            size = '150 ml';
          } else if (oz === 1.0 || oz === 1.1) {
            size = '30 ml';
          } else if (oz === 4.2 || oz === 4.0) {
            size = '125 ml';
          } else if (oz === 2.5) {
            size = '75 ml';
          } else {
            size = `${Math.round(oz * 30)} ml`;
          }
        }
      } else {
        size = size.replace(/mls?/g, 'ml');
      }

      // Exact non-conflicting gender detection
      let category = (p.category || 'Unisex').trim();
      const catLower = category.toLowerCase();
      if (catLower.includes('femenino') || catLower.includes('mujer') || catLower.includes('women') || catLower.includes('woman') || catLower.includes('lady') || catLower.includes('ladies') || catLower.includes('girl')) {
        category = 'Femenino';
      } else if (catLower.includes('masculino') || catLower.includes('hombre') || catLower.includes('men') || catLower.includes('man') || catLower.includes('boy')) {
        category = 'Masculino';
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
