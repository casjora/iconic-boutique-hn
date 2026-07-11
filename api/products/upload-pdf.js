import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { pdfBase64 } = req.body;
  
  if (!pdfBase64) {
    return res.status(400).json({ error: 'Se requiere el contenido del archivo PDF en formato Base64' });
  }

  try {
    const prompt = `Analiza este documento PDF de importación/factura de perfumes de Iconic Boutique HN y extrae la lista de perfumes para agregarlos al inventario.

IMPORTANTE - CONVERSIÓN DE MONEDA (FÓRMULA HONDURAS):
- La factura del proveedor suele estar en DÓLARES (USD).
- FÓRMULA DE COSTO: Si el precio original está en USD, conviértelo a costo en Lempiras (HNL) aplicando: Costo_HNL = ((Precio_USD * 1.05) + 5.5) * 27 Y DEBES aproximar el resultado al 5 más cercano.
- Todos los campos 'cost', 'pricePublic' y 'pricePromotional' en el JSON devuelto DEBEN estar expresados en Lempiras de Honduras (HNL).

Reglas de campos:
- cost: Número entero en HNL calculado con la fórmula aproximado al 5 más cercano.
- pricePublic: Suma L. 400 a L. 800 sobre el costo, aproximado al 5 o 10 más cercano.
- pricePromotional: Sumando alrededor de un 20% a 30% de margen sobre el costo, aproximado al 5 o 10 más cercano.
- category: Debe ser estrictamente "Masculino", "Femenino" o "Unisex".
- barcode: Extrae el UPC real del artículo. Si no está disponible, déjalo vacío ("").`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: pdfBase64.split(",")[1] || pdfBase64,
                mimeType: "application/pdf"
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          description: "Lista de perfumes extraídos de la factura",
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
        }
      }
    });

    const aiText = response.text;
    let parsedProducts = JSON.parse(aiText);
    
    if (!Array.isArray(parsedProducts)) {
      if (parsedProducts.products && Array.isArray(parsedProducts.products)) {
        parsedProducts = parsedProducts.products;
      } else {
        parsedProducts = [parsedProducts];
      }
    }
    
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
        description: p.description || 'Importado por PDF'
      };
    });

    return res.status(200).json({
      success: true,
      products: parsedProducts
    });
  } catch (error) {
    console.error('Error parsing PDF with Gemini:', error);
    return res.status(500).json({ error: `No se pudo procesar el PDF: ${error.message || error}` });
  }
}
