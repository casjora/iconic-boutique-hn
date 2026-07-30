import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://nsubmnvkojsmoykfcjgl.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.SUPABASE_SECRET_KEY || 
                    process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
                    'sb_publishable_FIp9glGAZJ1hLMp2pEKtcQ_BwSQPR1e';

const supabase = createClient(supabaseUrl, supabaseKey);

function isProductSet(item) {
  const nameLower = (item.name || '').toLowerCase();
  const brandLower = (item.brand || '').toLowerCase();
  return nameLower.includes('set') || nameLower.includes('estuche') || brandLower.includes('set') || brandLower.includes('estuche');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { order, hasVipPrice, registration } = req.body;
  if (!order && !registration) {
    return res.status(400).json({ error: 'Falta información de la orden o del registro' });
  }

  try {
    const { data: config, error: configErr } = await supabase
      .from('telegram')
      .select('token, chatId, active')
      .eq('id', 'config')
      .maybeSingle();

    if (configErr) {
      console.error('Error fetching Telegram config on backend:', configErr);
      return res.status(500).json({ error: 'Error fetching Telegram configuration' });
    }

    if (config && config.active && config.token && config.chatId) {
      let text = '';

      if (registration) {
        // Handle registration notification
        const today = new Date().toLocaleDateString('es-HN', { 
          year: 'numeric', month: 'long', day: 'numeric', 
          hour: '2-digit', minute: '2-digit' 
        });
        
        let cleanedPhone = (registration.phone || '').replace(/\D/g, '');
        if (cleanedPhone.length === 8) {
          cleanedPhone = '504' + cleanedPhone;
        }
        const phoneLink = cleanedPhone 
          ? `[${registration.phone}](https://wa.me/${cleanedPhone})`
          : (registration.phone || 'No especificado');

        text = `👤 *NUEVA SOLICITUD DE REGISTRO RECIBIDA* 👤\n\n` +
          `📝 *Nombre:* ${registration.name}\n` +
          `📞 *WhatsApp:* ${phoneLink}\n` +
          `📧 *Correo:* ${registration.email || 'No especificado'}\n` +
          `📍 *Dirección:* ${registration.address || 'No especificada'}\n` +
          `🕒 *Fecha:* ${today}\n\n` +
          `⚠️ *Acción:* Un administrador o vendedor debe ingresar a la pestaña *Clientes* en la plataforma para asignarle el rol correspondiente (Tarifa Detalle o Tarifa Mayorista).`;
      } else {
        // Handle order notification (original logic)
        const itemsText = (order.items || [])
          .map(i => {
            const prefix = isProductSet(i) ? '🎁 [SET] ' : '';
            return `• *${i.quantity}x ${prefix}${i.brand} ${i.name} (${i.size || 'N/A'})* - L. ${Number(i.pricePaid).toLocaleString()} c/u`;
          })
          .join('\n');

        let cleanedPhone = (order.clientPhone || '').replace(/\D/g, '');
        if (cleanedPhone.length === 8) {
          cleanedPhone = '504' + cleanedPhone;
        }
        const phoneLink = cleanedPhone 
          ? `[${order.clientPhone}](https://wa.me/${cleanedPhone})`
          : (order.clientPhone || 'Desconocido');

        text = `🔔 *NUEVA ORDEN DE COMPRA RECIBIDA* 🔔\n\n` +
          `👤 *Cliente:* ${order.clientName}\n` +
          `📞 *Teléfono:* ${phoneLink}\n` +
          `🕒 *Fecha:* ${order.date}\n` +
          `💼 *Precios:* ${hasVipPrice ? 'Promocional de Cliente' : 'Público General'}\n` +
          `📍 *Orden ID:* \`${order.id}\`\n\n` +
          `📦 *Detalle de Perfumes:*\n${itemsText}\n\n` +
          `💵 *TOTAL COTIZADO:* *L. ${Number(order.total).toLocaleString()} HNL*\n\n` +
          `⚠️ *Nota:* La facturación es manual. Por favor, contactar al cliente por teléfono o WhatsApp para coordinar pago y entrega.`;
      }

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
      if (!resData.ok) {
        throw new Error(resData.description || 'Error response from Telegram API');
      }

      return res.status(200).json({ success: true });
    } else {
      console.log('Telegram integration is not active or missing configuration');
      return res.status(200).json({ success: false, message: 'Telegram integration is not active' });
    }
  } catch (err) {
    console.error('Error sending Telegram notification:', err);
    return res.status(500).json({ error: `Error sending notification: ${err.message}` });
  }
}
