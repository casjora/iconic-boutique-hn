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

  const { targetId } = req.body;
  if (!targetId) {
    return res.status(400).json({ error: 'Falta el id del cliente a eliminar' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    // 1. Verify caller role using their token
    const callerClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user: callerUser }, error: authErr } = await callerClient.auth.getUser();
    if (authErr || !callerUser) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const { data: profile, error: profileErr } = await callerClient
      .from('profiles')
      .select('role')
      .eq('id', callerUser.id)
      .single();

    if (profileErr || !profile) {
      return res.status(403).json({ error: 'No se pudo verificar el rol del usuario' });
    }

    const role = String(profile.role || '').toLowerCase();
    if (role !== 'owner' && role !== 'dueño' && role !== 'vendedor') {
      return res.status(403).json({ error: 'Permisos insuficientes para eliminar clientes' });
    }

    // Initialize admin client to perform deletions (bypassing RLS with service role)
    const adminClient = createClient(supabaseUrl, supabaseKey);

    // 2. Vendedor security restrictions
    const { data: targetProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', targetId)
      .maybeSingle();

    if (targetProfile) {
      const targetRole = String(targetProfile.role || '').toLowerCase();
      if (role === 'vendedor' && (targetRole === 'owner' || targetRole === 'dueño' || targetRole === 'vendedor')) {
        return res.status(403).json({ error: 'Los vendedores no pueden eliminar cuentas administrativas.' });
      }
    }

    // 3. Set buyer_id to null on orders to preserve order history without causing foreign key constraint errors
    await adminClient
      .from('orders')
      .update({ buyer_id: null })
      .eq('buyer_id', targetId);

    // Also delete references in favorites to keep the database clean
    await adminClient
      .from('favorites')
      .delete()
      .eq('user_id', targetId);

    // 4. Delete customer from profiles table
    const { error: profileDeleteErr } = await adminClient
      .from('profiles')
      .delete()
      .eq('id', targetId);

    if (profileDeleteErr) {
      console.error('Error deleting profile from DB:', profileDeleteErr);
      return res.status(500).json({ error: `Error al eliminar de la base de datos: ${profileDeleteErr.message}` });
    }

    // 5. Delete from auth.users (if they have a normal auth account, i.e. not manual-client)
    if (targetId && !targetId.startsWith('manual-client-')) {
      try {
        await adminClient.auth.admin.deleteUser(targetId);
      } catch (err) {
        console.warn('Failed to delete from auth.users (user might not exist in auth):', err);
      }
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('Unexpected server error during customer deletion:', err);
    return res.status(500).json({ error: `Fallo inesperado del servidor: ${err.message}` });
  }
}
