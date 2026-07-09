import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'server-db.json');

// Initialize Gemini API
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Configure JSON parsing with higher limit for PDFs
app.use(express.json({ limit: '15mb' }));

// Helper to load database
function loadDB() {
  const defaultProducts = [
    {
      id: 'p1',
      name: 'Creed Aventus',
      brand: 'Creed',
      size: '100 ml',
      cost: 6500,
      pricePublic: 8900,
      pricePromotional: 7900,
      stock: 5,
      category: 'Masculino',
      barcode: '740101500012',
      description: 'Una fragancia legendaria que combina notas de piña, abedul y almizcle. Elegante y potente.'
    },
    {
      id: 'p2',
      name: 'Bleu de Chanel EDP',
      brand: 'Chanel',
      size: '100 ml',
      cost: 4100,
      pricePublic: 5400,
      pricePromotional: 4950,
      stock: 8,
      category: 'Masculino',
      barcode: '740101500029',
      description: 'Un aroma amaderado y aromático que denota libertad, sofisticación y pulcritud extrema.'
    },
    {
      id: 'p3',
      name: 'Sauvage EDT',
      brand: 'Dior',
      size: '100 ml',
      cost: 3200,
      pricePublic: 4500,
      pricePromotional: 4100,
      stock: 12,
      category: 'Masculino',
      barcode: '740101500036',
      description: 'Frescura salvaje con notas de pimienta de Sichuan y bergamota de Calabria. Altamente seductor.'
    },
    {
      id: 'p4',
      name: 'Good Girl EDP',
      brand: 'Carolina Herrera',
      size: '80 ml',
      cost: 3400,
      pricePublic: 4600,
      pricePromotional: 4200,
      stock: 7,
      category: 'Femenino',
      barcode: '740101500043',
      description: 'Fragancia audaz y ultra-femenina con notas de jazmín, cacao y haba tonka. Icónica botella en forma de zapatilla.'
    },
    {
      id: 'p5',
      name: 'Libre EDP',
      brand: 'Yves Saint Laurent',
      size: '90 ml',
      cost: 3600,
      pricePublic: 4900,
      pricePromotional: 4450,
      stock: 6,
      category: 'Femenino',
      barcode: '740101500050',
      description: 'La tensión entre la lavanda de Francia y el azahar de Marruecos. Una fragancia floral, libre y empoderada.'
    },
    {
      id: 'p6',
      name: 'Club de Nuit Intense Man',
      brand: 'Armaf',
      size: '105 ml',
      cost: 1100,
      pricePublic: 1800,
      pricePromotional: 1550,
      stock: 15,
      category: 'Masculino',
      barcode: '740101500067',
      description: 'La alternativa perfecta a Creed Aventus. Una explosión frutal cítrica con un secado amaderado espectacular.'
    },
    {
      id: 'p7',
      name: 'Eros EDT',
      brand: 'Versace',
      size: '100 ml',
      cost: 2100,
      pricePublic: 3100,
      pricePromotional: 2700,
      stock: 9,
      category: 'Masculino',
      barcode: '740101500074',
      description: 'La fragancia del dios del amor. Una salida vibrante de menta, manzana verde y limón con fondo de vainilla.'
    }
  ];

  const defaultUsers = {
    'admin': { name: 'Hermano Dueño', passwordHash: 'admin123', role: 'owner' },
    'vendedor': { name: 'Vendedor Principal', passwordHash: 'vend123', role: 'vendedor' },
    'cliente': { name: 'Distribuidor HN', passwordHash: 'cliente123', role: 'client' }
  };

  const defaultTelegram = {
    token: '',
    chatId: '',
    active: false
  };

  if (!fs.existsSync(DB_FILE)) {
    const initialDB = {
      products: defaultProducts,
      orders: [],
      users: defaultUsers,
      telegram: defaultTelegram
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDB, null, 2), 'utf-8');
    return initialDB;
  }

  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading DB, resetting to default', err);
    return {
      products: defaultProducts,
      orders: [],
      users: defaultUsers,
      telegram: defaultTelegram
    };
  }
}

// Save database helper
function saveDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving DB', err);
  }
}

// Load DB once
let db = loadDB();

// API Endpoints

// Authentication API
app.post('/api/auth/login', (req, res) => {
  const { id, password } = req.body;
  if (!id || !password) {
    return res.status(400).json({ error: 'ID de usuario y contraseña son requeridos' });
  }

  const user = db.users[id.toLowerCase()];
  if (user && user.passwordHash === password) {
    return res.json({
      id: id.toLowerCase(),
      name: user.name,
      role: user.role
    });
  }

  return res.status(401).json({ error: 'Credenciales inválidas' });
});

app.post('/api/auth/register', (req, res) => {
  const { id, name, password, role } = req.body;
  if (!id || !name || !password) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }

  const userId = id.toLowerCase().trim();
  if (db.users[userId]) {
    return res.status(400).json({ error: 'El ID de usuario ya existe' });
  }

  // Registering roles
  const assignedRole = (role === 'owner' || role === 'vendedor') ? role : 'client';

  db.users[userId] = {
    name,
    passwordHash: password,
    role: assignedRole
  };
  saveDB(db);

  return res.json({
    id: userId,
    name,
    role: assignedRole
  });
});

// Products API
app.get('/api/products', (req, res) => {
  res.json(db.products);
});

app.post('/api/products', (req, res) => {
  const { name, brand, size, cost, pricePublic, pricePromotional, stock, category, description, barcode } = req.body;
  
  if (!name || !brand || !size || !pricePublic || !pricePromotional || stock === undefined || !category) {
    return res.status(400).json({ error: 'Faltan campos requeridos para crear el producto' });
  }

  const cleanName = name.trim();
  const cleanBrand = brand.trim();
  const cleanSize = size.trim();
  const finalBarcode = (barcode || '').trim() || `7401${Math.floor(10000000 + Math.random() * 90000000)}`;

  // Check if a product with the exact barcode or same name+brand+size already exists to merge/update
  const existingProduct = db.products.find(p => {
    if (barcode && p.barcode && p.barcode.trim() === barcode.trim()) return true;
    return (
      p.name.trim().toLowerCase() === cleanName.toLowerCase() &&
      p.brand.trim().toLowerCase() === cleanBrand.toLowerCase() &&
      p.size.trim().toLowerCase() === cleanSize.toLowerCase()
    );
  });

  if (existingProduct) {
    // Cumulative stock update and pricing refresh
    existingProduct.stock = Number(existingProduct.stock || 0) + Number(stock || 0);
    existingProduct.cost = Number(cost !== undefined ? cost : existingProduct.cost);
    existingProduct.pricePublic = Number(pricePublic);
    existingProduct.pricePromotional = Number(pricePromotional);
    if (description) existingProduct.description = description;
    if (category) existingProduct.category = category;
    if (barcode && !existingProduct.barcode) existingProduct.barcode = barcode;

    saveDB(db);
    return res.status(200).json(existingProduct);
  }

  const newProduct = {
    id: 'p_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    name: cleanName,
    brand: cleanBrand,
    size: cleanSize,
    cost: Number(cost || 0),
    pricePublic: Number(pricePublic),
    pricePromotional: Number(pricePromotional),
    stock: Number(stock),
    category,
    barcode: finalBarcode,
    description: description || ''
  };

  db.products.unshift(newProduct);
  saveDB(db);

  res.status(201).json(newProduct);
});

app.put('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const productIndex = db.products.findIndex(p => p.id === id);

  if (productIndex === -1) {
    return res.status(404).json({ error: 'Producto no encontrado' });
  }

  const updatedData = req.body;
  db.products[productIndex] = {
    ...db.products[productIndex],
    ...updatedData,
    cost: updatedData.cost !== undefined ? Number(updatedData.cost) : db.products[productIndex].cost,
    pricePublic: updatedData.pricePublic !== undefined ? Number(updatedData.pricePublic) : db.products[productIndex].pricePublic,
    pricePromotional: updatedData.pricePromotional !== undefined ? Number(updatedData.pricePromotional) : db.products[productIndex].pricePromotional,
    stock: updatedData.stock !== undefined ? Number(updatedData.stock) : db.products[productIndex].stock,
  };

  saveDB(db);
  res.json(db.products[productIndex]);
});

app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const filteredProducts = db.products.filter(p => p.id !== id);

  if (filteredProducts.length === db.products.length) {
    return res.status(404).json({ error: 'Producto no encontrado' });
  }

  db.products = filteredProducts;
  saveDB(db);
  res.json({ success: true });
});

// PDF Parsing with Gemini
app.post('/api/products/upload-pdf', async (req, res) => {
  const { pdfBase64, fileName } = req.body;

  if (!pdfBase64) {
    return res.status(400).json({ error: 'Se requiere el contenido del archivo PDF en formato Base64' });
  }

  try {
    const prompt = `Analiza este documento PDF de importación/factura de perfumes de Iconic Boutique HN y extrae la lista de perfumes para agregarlos al inventario.
IMPORTANTE - CONVERSIÓN DE MONEDA (FÓRMULA HONDURAS):
- La factura del proveedor (ej. Perfume Price) suele estar en DÓLARES (USD, con precios como $22.00, $20.00, etc.).
- Sin embargo, nuestro inventario final en Honduras requiere que los montos estén expresados en LEMPIRAS (HNL) según la fórmula exacta de Iconic Boutique.
- FÓRMULA DE COSTO: Si el precio original está en USD, conviértelo a costo en Lempiras (HNL) aplicando:
  Costo_HNL = ((Precio_USD * 1.05) + 5.5) * 27
  Y DEBES aproximar el resultado al 5 más cercano (ejemplo: si da L. 772.2, aproxímalo a L. 770 o L. 775).
- Todos los campos 'cost', 'pricePublic' y 'pricePromotional' en el JSON devuelto DEBEN estar expresados en Lempiras de Honduras (HNL).

Por favor, extrae de forma estructurada los productos del documento. Retorna un arreglo de objetos JSON en español con este formato exacto:
- name: Nombre del perfume (ej. "Sauvage EDP").
- brand: Marca (ej. "Dior").
- size: Tamaño con unidad de medida (ej. "100 ml", "3.4 oz", "50 ml").
- cost: Costo unitario de compra (número entero en HNL calculado con la fórmula: ((Precio_USD * 1.05) + 5.5) * 27 aproximado al 5 más cercano). Si no se detalla en el documento, estima un costo razonable de importación en HNL (ej. entre L. 400 y L. 1,500).
- pricePublic: Precio de venta sugerido al detalle / público en general en HNL (calcula aplicando un margen de ganancia sobre el costo, ej. sumando L. 400 a L. 800 sobre el costo, aproximado al 5 o 10 más cercano).
- pricePromotional: Precio de venta de mayoreo / VIP para distribuidores en HNL (debe ser mayor que el costo pero menor que el precio de detalle, sumando alrededor de un 20% a 30% de margen sobre el costo, aproximado al 5 o 10 más cercano).
- stock: Cantidad de unidades de este producto según la factura (QTY). Si no se especifica, usa 1 por defecto.
- category: Género del perfume. Debe ser estrictamente uno de los siguientes valores: "Masculino", "Femenino" o "Unisex".
- barcode: Código de barra (UPC / código numérico de 12 o 13 dígitos provisto en la factura para el artículo). Es muy importante extraer el UPC real que viene en la columna UPC del documento si está disponible para evitar generar códigos genéricos. Si no está disponible en absoluto, genera un código único de 13 dígitos que comience con "740" (ej. "740283748293").
- description: Breve descripción de la fragancia si es posible inferirla o generarla.

Trata de extraer la mayor cantidad de información real posible de la factura del proveedor o lista de empaque, incluyendo cantidades (QTY), nombres, costos y códigos de barra reales.`;

    const pdfPart = {
      inlineData: {
        data: pdfBase64,
        mimeType: 'application/pdf',
      },
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [pdfPart, { text: prompt }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              brand: { type: Type.STRING },
              size: { type: Type.STRING },
              cost: { type: Type.NUMBER },
              pricePublic: { type: Type.NUMBER },
              pricePromotional: { type: Type.NUMBER },
              stock: { type: Type.NUMBER },
              category: { 
                type: Type.STRING,
                description: 'Debe ser Masculino, Femenino o Unisex'
              },
              barcode: { type: Type.STRING },
              description: { type: Type.STRING },
            },
            required: ['name']
          }
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error('Gemini no retornó resultados legibles');
    }

    const rawProducts = JSON.parse(text);
    const parsedProducts = (Array.isArray(rawProducts) ? rawProducts : []).map(p => {
      const name = (p.name || 'Perfume').trim();
      const cost = Number(p.cost) || 0;
      
      let pricePublic = Number(p.pricePublic) || 0;
      if (pricePublic === 0 && cost > 0) {
        pricePublic = Math.round(cost * 1.45);
      } else if (pricePublic === 0) {
        pricePublic = 1500;
      }

      let pricePromotional = Number(p.pricePromotional) || 0;
      if (pricePromotional === 0 && pricePublic > 0) {
        pricePromotional = Math.round(pricePublic * 0.75);
      } else if (pricePromotional === 0) {
        pricePromotional = 1100;
      }

      let brand = (p.brand || '').trim();
      if (!brand) {
        brand = name.split(' ')[0] || 'Genérica';
      }

      let size = (p.size || '100 ml').trim();
      let stock = Number(p.stock) || 1;
      
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

    return res.json({
      success: true,
      products: parsedProducts
    });

  } catch (error) {
    console.error('Error parsing PDF with Gemini:', error);
    return res.status(500).json({ error: `No se pudo procesar el PDF: ${error.message || error}` });
  }
});

// Telegram Notification Helper
async function sendTelegramNotification(order, config) {
  if (!config.active || !config.token || !config.chatId) return false;

  const itemsText = order.items
    .map(i => `• *${i.quantity}x ${i.brand} ${i.name} (${i.size})* - L. ${i.pricePaid.toLocaleString()} c/u`)
    .join('\n');

  const text = `🔔 *NUEVA ORDEN DE COMPRA RECIBIDA* 🔔\n\n` +
    `👤 *Cliente:* ${order.clientName}\n` +
    `📞 *Teléfono:* ${order.clientPhone}\n` +
    `🕒 *Fecha:* ${order.date}\n` +
    `💼 *Precios:* ${order.roleUsed === 'client' ? 'Promocional de Cliente VIP' : 'Público General'}\n` +
    `📍 *Orden ID:* \`${order.id}\`\n\n` +
    `📦 *Detalle de Perfumes:*\n${itemsText}\n\n` +
    `💵 *TOTAL COTIZADO:* *L. ${order.total.toLocaleString()} HNL*\n\n` +
    `⚠️ *Nota:* La facturación es manual. Por favor, contactar al cliente por teléfono o WhatsApp para coordinar pago y entrega.`;

  try {
    const url = `https://api.telegram.org/bot${config.token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: text,
        parse_mode: 'Markdown'
      })
    });

    const resData = await response.json();
    return resData.ok;
  } catch (err) {
    console.error('Error sending Telegram notification:', err);
    return false;
  }
}

// Telegram Test API
app.post('/api/telegram/test', async (req, res) => {
  const { token, chatId } = req.body;
  if (!token || !chatId) {
    return res.status(400).json({ error: 'Token y Chat ID de Telegram son requeridos' });
  }

  try {
    const text = `✅ *Prueba de Integración Exitosa*\n\nEl sistema de Perfumería Brother's se ha conectado correctamente a este bot de Telegram para notificaciones automáticas de órdenes de compra.`;
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      })
    });

    const resData = await response.json();
    if (resData.ok) {
      return res.json({ success: true });
    } else {
      return res.status(400).json({ error: resData.description || 'Error de Telegram API' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Error de conexión' });
  }
});

// Save Telegram Config
app.get('/api/telegram/config', (req, res) => {
  res.json(db.telegram);
});

app.post('/api/telegram/config', (req, res) => {
  const { token, chatId, active } = req.body;
  db.telegram = {
    token: token || '',
    chatId: chatId || '',
    active: !!active
  };
  saveDB(db);
  res.json(db.telegram);
});

// Orders API
app.get('/api/orders', (req, res) => {
  res.json(db.orders);
});

app.post('/api/orders', async (req, res) => {
  const { clientName, clientPhone, items, total, roleUsed, buyerId } = req.body;

  if (!clientName || !clientPhone || !items || !items.length || !total) {
    return res.status(400).json({ error: 'Faltan datos requeridos para procesar la orden' });
  }

  // Deduct stock for each item
  let stockIssues = [];
  items.forEach((item) => {
    const product = db.products.find(p => p.id === item.productId);
    if (product) {
      if (product.stock < item.quantity) {
        stockIssues.push(`Stock insuficiente para: ${product.brand} ${product.name} (Disponible: ${product.stock}, Solicitado: ${item.quantity})`);
      }
    } else {
      stockIssues.push(`Producto no encontrado ID: ${item.productId}`);
    }
  });

  if (stockIssues.length > 0) {
    return res.status(400).json({ error: stockIssues.join('\n') });
  }

  // Actually deduct stock
  items.forEach((item) => {
    const product = db.products.find(p => p.id === item.productId);
    if (product) {
      product.stock -= item.quantity;
    }
  });

  const hnlDate = new Date().toLocaleString('es-HN', { timeZone: 'America/Tegucigalpa' });

  const newOrder = {
    id: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
    clientName,
    clientPhone,
    items,
    total,
    date: hnlDate,
    status: 'pendiente',
    roleUsed,
    buyerId
  };

  db.orders.unshift(newOrder);
  saveDB(db);

  // Send Telegram message async
  if (db.telegram.active) {
    await sendTelegramNotification(newOrder, db.telegram);
  }

  res.status(201).json(newOrder);
});

app.put('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  const { status, clientName, clientPhone, items, total } = req.body;

  const orderIndex = db.orders.findIndex(o => o.id === id);
  if (orderIndex === -1) {
    return res.status(404).json({ error: 'Orden no encontrada' });
  }

  const order = db.orders[orderIndex];

  // If items are modified, we need to adjust stock
  if (items && Array.isArray(items)) {
    // 1. If the previous order status was NOT cancelado, we temporarily restore the original stock
    if (order.status !== 'cancelado') {
      order.items.forEach(oldItem => {
        const product = db.products.find(p => p.id === oldItem.productId);
        if (product) {
          product.stock += oldItem.quantity;
        }
      });
    }

    // 2. Update the order items & total
    order.items = items;
    if (total !== undefined) {
      order.total = total;
    }

    // 3. If the target status is NOT cancelado, we deduct the new stock
    const targetStatus = status || order.status;
    if (targetStatus !== 'cancelado') {
      items.forEach(newItem => {
        const product = db.products.find(p => p.id === newItem.productId);
        if (product) {
          product.stock = Math.max(0, product.stock - newItem.quantity);
        }
      });
    }
  }

  // Handle status change separately if items were NOT modified
  if (status && status !== order.status && !items) {
    const prevStatus = order.status;
    if (prevStatus !== 'cancelado' && status === 'cancelado') {
      // Return stock
      order.items.forEach(item => {
        const product = db.products.find(p => p.id === item.productId);
        if (product) {
          product.stock += item.quantity;
        }
      });
    } else if (prevStatus === 'cancelado' && status !== 'cancelado') {
      // Deduct stock again
      order.items.forEach(item => {
        const product = db.products.find(p => p.id === item.productId);
        if (product) {
          product.stock = Math.max(0, product.stock - item.quantity);
        }
      });
    }
  }

  // Apply basic info changes
  if (clientName) order.clientName = clientName;
  if (clientPhone) order.clientPhone = clientPhone;
  if (status) order.status = status;

  saveDB(db);
  res.json(order);
});

// Vite middleware and serving app
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Perfumería Server is running on port ${PORT}`);
  });
}

startServer();
