import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import uploadPdfHandler from './api/products/upload-pdf.js';
import sendTelegramHandler from './api/send-telegram.js';
import updateOrderStatusHandler from './api/update-order-status.js';
import deleteCustomerHandler from './api/delete-customer.js';
import updateOrderHandler from './api/update-order.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '15mb' }));

// Route handlers for Vercel/proxied routes
app.post('/api/products/upload-pdf', uploadPdfHandler);
app.post('/api/send-telegram', sendTelegramHandler);
app.post('/api/update-order-status', updateOrderStatusHandler);
app.post('/api/delete-customer', deleteCustomerHandler);
app.post('/api/update-order', updateOrderHandler);

// Dummy database for config / telegram configuration
const DB_FILE = path.join(process.cwd(), 'server-db.json');
function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initial = { telegram: { token: '', chatId: '', active: false } };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch {
    return { telegram: { token: '', chatId: '', active: false } };
  }
}

function saveDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving server-db.json', err);
  }
}

// Telegram Config APIs
app.get('/api/telegram/config', (req, res) => {
  const db = loadDB();
  res.json(db.telegram || { token: '', chatId: '', active: false });
});

app.post('/api/telegram/config', (req, res) => {
  const { token, chatId, active } = req.body;
  const db = loadDB();
  db.telegram = {
    token: token || '',
    chatId: chatId || '',
    active: !!active
  };
  saveDB(db);
  res.json(db.telegram);
});

app.post('/api/telegram/test', async (req, res) => {
  const { token, chatId } = req.body;
  if (!token || !chatId) {
    return res.status(400).json({ error: 'Token y Chat ID de Telegram son requeridos' });
  }
  try {
    const text = `✅ *Prueba de Integración Exitosa*\n\nEl sistema de Perfumería Iconic Boutique HN se ha conectado correctamente a este bot de Telegram para notificaciones automáticas de órdenes de compra.`;
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
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

// Vite server integrations
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
    console.log(`Express server is running on http://localhost:${PORT}`);
  });
}

startServer();