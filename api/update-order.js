import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://nsubmnvkojsmoykfcjgl.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.SUPABASE_SECRET_KEY || 
                    process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
                    'sb_publishable_FIp9glGAZJ1hLMp2pEKtcQ_BwSQPR1e';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orderId, clientName, clientPhone, newItems, roleUsed } = req.body;
  if (!orderId || !clientName || !clientPhone || !newItems) {
    return res.status(400).json({ error: 'Faltan parámetros requeridos.' });
  }

  // Use caller's auth header if available, or admin client
  const authHeader = req.headers.authorization;
  const clientOptions = authHeader ? { global: { headers: { Authorization: authHeader } } } : {};
  const supabase = createClient(supabaseUrl, supabaseKey, clientOptions);

  try {
    // 1. Fetch current order status
    const { data: orderData, error: orderDataErr } = await supabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .maybeSingle();

    if (orderDataErr) {
      console.error('Error fetching order status:', orderDataErr);
      return res.status(500).json({ error: `Error al verificar estado de la orden: ${orderDataErr.message}` });
    }

    if (!orderData) {
      return res.status(404).json({ error: 'No se encontró la orden especificada.' });
    }

    const isDelivered = orderData.status === 'entregado';

    // 2. If delivered, restore previous stock first
    if (isDelivered) {
      const { data: oldItems, error: oldItemsErr } = await supabase
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', orderId);

      if (oldItemsErr) {
        console.error('Error fetching old items:', oldItemsErr);
        return res.status(500).json({ error: `Error al obtener items anteriores: ${oldItemsErr.message}` });
      }

      if (oldItems) {
        for (const oldItem of oldItems) {
          const { data: prod } = await supabase
            .from('products')
            .select('stock')
            .eq('id', oldItem.product_id)
            .maybeSingle();
          if (prod) {
            await supabase
              .from('products')
              .update({ stock: Number(prod.stock || 0) + Number(oldItem.quantity) })
              .eq('id', oldItem.product_id);
          }
        }
      }
    }

    // 3. Delete existing order items (using administrative capability)
    const { error: deleteErr } = await supabase
      .from('order_items')
      .delete()
      .eq('order_id', orderId);

    if (deleteErr) {
      console.error('Error deleting old order items:', deleteErr);
      return res.status(500).json({ error: `Error al vaciar items anteriores: ${deleteErr.message}` });
    }

    // 4. Calculate total and map new items
    const total = newItems.reduce((acc, curr) => acc + (Number(curr.pricePaid || 0) * Number(curr.quantity || 0)), 0);

    const itemsToInsert = newItems.map(item => ({
      order_id: orderId,
      product_id: item.productId,
      quantity: Number(item.quantity || 0),
      price_paid: Number(item.pricePaid || 0)
    }));

    // 5. Insert new items
    const { error: insertErr } = await supabase
      .from('order_items')
      .insert(itemsToInsert);

    if (insertErr) {
      console.error('Error inserting new order items:', insertErr);
      return res.status(500).json({ error: `Error al registrar nuevos items: ${insertErr.message}` });
    }

    // 6. If delivered, subtract new stock
    if (isDelivered) {
      for (const item of newItems) {
        const { data: prod } = await supabase
          .from('products')
          .select('stock')
          .eq('id', item.productId)
          .maybeSingle();
        if (prod) {
          const newStock = Math.max(0, Number(prod.stock || 0) - Number(item.quantity));
          await supabase
            .from('products')
            .update({ stock: newStock })
            .eq('id', item.productId);
        }
      }
    }

    // 7. Update client name, phone, total and role_used on order
    const orderPayload = {
      client_name: clientName,
      client_phone: clientPhone,
      total: total
    };
    if (roleUsed) {
      orderPayload.role_used = roleUsed;
    }

    const { error: orderUpdateErr } = await supabase
      .from('orders')
      .update(orderPayload)
      .eq('id', orderId);

    if (orderUpdateErr) {
      console.error('Error updating order fields:', orderUpdateErr);
      return res.status(500).json({ error: `Error al actualizar datos de la orden: ${orderUpdateErr.message}` });
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('Unexpected server error during order update:', err);
    return res.status(500).json({ error: `Fallo inesperado del servidor: ${err.message}` });
  }
}
