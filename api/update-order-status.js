import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://nsubmnvkojsmoykfcjgl.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.SUPABASE_SECRET_KEY || 
                    process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
                    'sb_publishable_FIp9glGAZJ1hLMp2pEKtcQ_BwSQPR1e';

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id, status } = req.body;
  if (!id || !status) {
    return res.status(400).json({ error: 'Faltan parámetros requeridos: id o status' });
  }

  try {
    // 1. Get the current status before making changes to determine the transition
    const { data: currentOrder, error: orderErr } = await supabase
      .from('orders')
      .select('status')
      .eq('id', id)
      .maybeSingle();

    if (orderErr) {
      console.error('Error fetching current order status:', orderErr);
      return res.status(500).json({ error: `Error al obtener estado de la orden: ${orderErr.message}` });
    }

    if (!currentOrder) {
      return res.status(404).json({ error: 'No se encontró la orden especificada' });
    }

    const oldStatus = currentOrder.status || 'pendiente';

    // 2. Perform transitional stock adjustments
    if (oldStatus !== 'entregado' && status === 'entregado') {
      // Transition: Not delivered -> Delivered (deduct physical stock)
      const { data: items, error: itemsErr } = await supabase
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', id);

      if (itemsErr) {
        console.error('Error fetching order items:', itemsErr);
        return res.status(500).json({ error: `Error al obtener items de la orden: ${itemsErr.message}` });
      }

      if (items) {
        for (const item of items) {
          const { data: prod, error: prodErr } = await supabase
            .from('products')
            .select('stock')
            .eq('id', item.product_id)
            .maybeSingle();

          if (prodErr) {
            console.error(`Error fetching product ${item.product_id}:`, prodErr);
            continue;
          }

          if (prod) {
            const newStock = Math.max(0, Number(prod.stock || 0) - Number(item.quantity || 0));
            const { error: updateProdErr } = await supabase
              .from('products')
              .update({ stock: newStock })
              .eq('id', item.product_id);

            if (updateProdErr) {
              console.error(`Error updating stock for product ${item.product_id}:`, updateProdErr);
              return res.status(500).json({ error: `Error al actualizar stock de producto: ${updateProdErr.message}` });
            }
          }
        }
      }
    } else if (oldStatus === 'entregado' && status !== 'entregado') {
      // Transition: Delivered -> Not delivered (restore physical stock)
      const { data: items, error: itemsErr } = await supabase
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', id);

      if (itemsErr) {
        console.error('Error fetching order items for restore:', itemsErr);
        return res.status(500).json({ error: `Error al obtener items de la orden: ${itemsErr.message}` });
      }

      if (items) {
        for (const item of items) {
          const { data: prod, error: prodErr } = await supabase
            .from('products')
            .select('stock')
            .eq('id', item.product_id)
            .maybeSingle();

          if (prodErr) {
            console.error(`Error fetching product for restore ${item.product_id}:`, prodErr);
            continue;
          }

          if (prod) {
            const newStock = Number(prod.stock || 0) + Number(item.quantity || 0);
            const { error: updateProdErr } = await supabase
              .from('products')
              .update({ stock: newStock })
              .eq('id', item.product_id);

            if (updateProdErr) {
              console.error(`Error restoring stock for product ${item.product_id}:`, updateProdErr);
              return res.status(500).json({ error: `Error al restaurar stock de producto: ${updateProdErr.message}` });
            }
          }
        }
      }
    }

    // 3. Update the order status in the DB
    const { error: updateErr } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id);

    if (updateErr) {
      console.error('Error updating order status in DB:', updateErr);
      return res.status(500).json({ error: `Error al actualizar estado de la orden en BD: ${updateErr.message}` });
    }

    return res.status(200).json({ success: true, oldStatus, newStatus: status });

  } catch (err) {
    console.error('Unexpected server error during status update:', err);
    return res.status(500).json({ error: `Fallo inesperado: ${err.message}` });
  }
}
