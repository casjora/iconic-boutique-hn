import { GoogleGenAI } from "@google/genai";

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
- La factura del proveedor (ej. Perfume Price) suele estar en DÓLARES (USD, con precios como $22.00, $20.00, etc.).
- Sin embargo, nuestro inventario final en Honduras requiere que los montos estén expresados en LEMPIRAS (HNL) según la fórmula exacta de Iconic Boutique.
- FÓRMULA DE COSTO: Si el precio original está en USD, conviértelo a costo en Lempiras (HNL) aplicando:  Costo_HNL = ((Precio_USD * 1.05) + 5.5) * 27  Y DEBES aproximar el resultado al 5 más cercano (ejemplo: si da L. 772.2, aproxímalo a L. 770 o L. 775).
- Todos los campos 'cost', 'pricePublic' y 'pricePromotional' en el JSON devuelto DEBEN estar expresados en Lempiras de Honduras (HNL).

Por favor, extrae de forma estructurada los productos del documento. Retorna un arreglo de objetos JSON en español con este formato exacto:
- name: Nombre del perfume (ej. "Sauvage EDP").
- brand: Marca (ej. "Dior").
- size: Tamaño con unidad de medida (ej. "100 ml", "3.4 oz", "50 ml").
- cost: Costo unitario de compra (número entero en HNL calculated con la fórmula: ((Precio_USD * 1.05) + 5.5) * 27 aproximado al 5 más cercano). Si no se detalla en el documento, estima un costo razonable de importación en HNL (ej. entre L. 400 y L. 1,500).
- pricePublic: Precio de venta sugerido al detalle / público en general en HNL (calcula aplicando un margen de ganancia sobre el costo, ej. sumando L. 400 a L. 800 sobre el costo, aproximado al 5 o 10 más cercano).
- pricePromotional: Precio de venta de mayoreo / VIP para distribuidores en HNL (debe ser mayor que el costo pero menor que el precio de detalle, sumando alrededor de un 20% a 30% de margen sobre el costo, aproximado al 5 o 10 más cercano).
- stock: Cantidad de unidades de este producto según la factura (QTY). Si no se especifica, usa 1 por defecto.
- category: Género del perfume. Debe ser estrictamente uno de los siguientes valores: "Masculino", "Femenino" o "Unisex".
- barcode: Código de barra (UPC / código numérico de 12 o 13 dígitos provisto en la factura para el artículo). Es muy importante extraer el UPC real que viene en la columna UPC del documento si está disponible para evitar generar códigos genéricos. Si no está disponible en absoluto, genera un código único de 13 dígitos que comience con "740" (ej. "740283748293").
- description: Breve descripción de la fragancia si es posible inferirla o generarla.

Trata de extraer la mayor cantidad de información real posible de la factura del proveedor o lista de empaque, incluyendo cantidades (QTY), nombres, costos y códigos de barra reales.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
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
        responseMimeType: "application/json"
      }
    });

    const aiText = response.text();
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
