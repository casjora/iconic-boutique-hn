import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { 
  User, UserPlus, Shield, Phone, MapPin, Search, Filter, 
  HelpCircle, Loader2, CheckCircle2, AlertTriangle, ShieldCheck,
  ChevronRight, Sparkles, Mail, Trash2, KeyRound, Send
} from 'lucide-react';

export default function Customers() {
  const { 
    user: currentUser, fetchCustomers, updateCustomerRole, createCustomerManually,
    deleteCustomer, resendVerificationEmail, sendPasswordResetEmail
  } = useStore();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('todos');
  
  // Manual creation states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('detalle');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState({ type: '', text: '' });

  // Update states
  const [updatingId, setUpdatingId] = useState(null);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  
  // Async status states for deletions and emails
  const [deletingId, setDeletingId] = useState(null);
  const [sendingEmailId, setSendingEmailId] = useState(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    const data = await fetchCustomers();
    setCustomers(data || []);
    setLoading(false);
  };

  const handleRoleChange = async (targetId, oldRole, targetNewRole) => {
    if (oldRole === targetNewRole) return;
    
    // Safety client-side check matching trigger constraints:
    // Sellers cannot change owner or vendedor roles, and cannot assign owner or vendedor roles.
    if (currentUser?.role === 'vendedor') {
      if (oldRole === 'owner' || oldRole === 'vendedor') {
        setStatusMsg({ type: 'error', text: 'Los vendedores no pueden cambiar el rol de dueños o vendedores.' });
        setTimeout(() => setStatusMsg({ type: '', text: '' }), 5000);
        return;
      }
      if (targetNewRole === 'owner' || targetNewRole === 'vendedor') {
        setStatusMsg({ type: 'error', text: 'Los vendedores no pueden asignar roles administrativos (Vendedor/Dueño).' });
        setTimeout(() => setStatusMsg({ type: '', text: '' }), 5000);
        return;
      }
    }

    setUpdatingId(targetId);
    setStatusMsg({ type: '', text: '' });

    const result = await updateCustomerRole(targetId, targetNewRole);
    setUpdatingId(null);

    if (result.success) {
      setStatusMsg({ type: 'success', text: 'Rol actualizado exitosamente.' });
      // Update local state
      setCustomers(prev => prev.map(c => c.id === targetId ? { ...c, role: targetNewRole } : c));
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
    } else {
      setStatusMsg({ 
        type: 'error', 
        text: result.error || 'Error de base de datos al cambiar el rol. Verifica las políticas RLS.' 
      });
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 6000);
    }
  };

  const handleManualCreate = async (e) => {
    e.preventDefault();
    if (!newName || !newRole || !newPhone) {
      setCreateMsg({ type: 'error', text: 'El nombre, teléfono y tipo de cliente son requeridos.' });
      return;
    }

    setCreating(true);
    setCreateMsg({ type: '', text: '' });

    // Sellers cannot create owner or vendedor manually
    if (currentUser?.role === 'vendedor' && (newRole === 'vendedor' || newRole === 'owner' || newRole === 'dueño')) {
      setCreateMsg({ type: 'error', text: 'No tienes permisos para crear usuarios administradores.' });
      setCreating(false);
      return;
    }

    const result = await createCustomerManually(newName, newRole, newPhone, newAddress, newEmail);
    setCreating(false);

    if (result.success) {
      setCreateMsg({ type: 'success', text: `Cliente "${newName}" creado exitosamente.` });
      setNewName('');
      setNewPhone('');
      setNewAddress('');
      setNewEmail('');
      setNewRole('detalle');
      loadCustomers(); // Reload list
      setTimeout(() => {
        setCreateMsg({ type: '', text: '' });
        setShowCreateModal(false);
      }, 2000);
    } else {
      setCreateMsg({ type: 'error', text: result.error || 'Error al crear el cliente de forma manual.' });
    }
  };

  const handleDeleteCustomer = async (customer) => {
    const isSelf = customer.id === currentUser?.uid;
    if (isSelf) {
      setStatusMsg({ type: 'error', text: 'No puedes eliminar tu propio perfil.' });
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 5000);
      return;
    }

    // Safety checks: Vendedores cannot delete administrative accounts
    if (currentUser?.role === 'vendedor') {
      const roleNormalized = String(customer.role || '').toLowerCase();
      if (roleNormalized === 'owner' || roleNormalized === 'dueño' || roleNormalized === 'vendedor') {
        setStatusMsg({ type: 'error', text: 'Los vendedores no pueden eliminar perfiles administrativos.' });
        setTimeout(() => setStatusMsg({ type: '', text: '' }), 5000);
        return;
      }
    }

    const isConfirmed = window.confirm(`¿Estás seguro que deseas eliminar permanentemente al cliente "${customer.name || 'este cliente'}"?`);
    if (!isConfirmed) return;

    setDeletingId(customer.id);
    setStatusMsg({ type: '', text: '' });

    const result = await deleteCustomer(customer.id);
    setDeletingId(null);

    if (result.success) {
      setStatusMsg({ type: 'success', text: `Cliente "${customer.name}" eliminado exitosamente de la base de datos.` });
      setCustomers(prev => prev.filter(c => c.id !== customer.id));
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
    } else {
      setStatusMsg({ 
        type: 'error', 
        text: result.error || 'Error al eliminar de Supabase. Esto puede ocurrir si el cliente tiene pedidos activos o debido a políticas de RLS.' 
      });
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 6000);
    }
  };

  const handleResendVerification = async (customer) => {
    let email = customer.email;
    if (!email && customer.id && customer.id.includes('@')) {
      email = customer.id;
    }

    if (!email) {
      const inputEmail = window.prompt(`Ingresa el correo electrónico de "${customer.name}" para reenviar la confirmación de cuenta:`);
      if (!inputEmail) return;
      email = inputEmail.trim();
    }

    setSendingEmailId(customer.id);
    setStatusMsg({ type: '', text: '' });

    const result = await resendVerificationEmail(email);
    setSendingEmailId(null);

    if (result.success) {
      setStatusMsg({ type: 'success', text: `Correo de verificación reenviado exitosamente a: ${email}` });
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 5000);
    } else {
      setStatusMsg({ 
        type: 'error', 
        text: result.error || `Error al enviar correo de verificación. Verifica que ${email} sea un correo válido.` 
      });
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 6000);
    }
  };

  const handleSendPasswordReset = async (customer) => {
    let email = customer.email;
    if (!email && customer.id && customer.id.includes('@')) {
      email = customer.id;
    }

    if (!email) {
      const inputEmail = window.prompt(`Ingresa el correo electrónico de "${customer.name}" para enviar el enlace de recuperación de contraseña:`);
      if (!inputEmail) return;
      email = inputEmail.trim();
    }

    setSendingEmailId(customer.id);
    setStatusMsg({ type: '', text: '' });

    const result = await sendPasswordResetEmail(email);
    setSendingEmailId(null);

    if (result.success) {
      setStatusMsg({ type: 'success', text: `Enlace de restablecimiento de contraseña enviado exitosamente a: ${email}` });
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 5000);
    } else {
      setStatusMsg({ 
        type: 'error', 
        text: result.error || `Error al enviar correo de restablecimiento. Verifica que ${email} esté registrado.` 
      });
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 6000);
    }
  };

  const roleDescriptions = [
    {
      name: 'Dueño (owner)',
      badge: '👑 Dueño',
      desc: 'Acceso total y administración de configuraciones del bot, analíticas, precios de costo, inventario y roles de todo el equipo.',
      color: 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 border border-amber-200'
    },
    {
      name: 'Vendedor',
      badge: '💼 Vendedor',
      desc: 'Gestión de inventario, pedidos y clientes. No tiene acceso a métricas de costos de fragancias ni puede modificar su rol o el de dueños.',
      color: 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-400 border border-indigo-200'
    },
    {
      name: 'Mayorista',
      badge: '🏷️ Mayorista VIP',
      desc: 'Clientes especiales que compran al por mayor en Honduras. Visualizan precios mayoristas con descuentos exclusivos en el catálogo.',
      color: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border border-emerald-200'
    },
    {
      name: 'Detalle',
      badge: '🛒 Detalle',
      desc: 'Clientes minoristas estándar. Compran al detalle y ven precios sugeridos normales o con descuentos públicos de showroom.',
      color: 'bg-sky-100 dark:bg-sky-950/40 text-sky-800 dark:text-sky-400 border border-sky-200'
    },
    {
      name: 'Usuario / Cliente',
      badge: '👤 Usuario / Cliente',
      desc: 'Perfil VIP inicial para exploración rápida o autocreación. No asignado formalmente a tarifas especiales todavía.',
      color: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-300 border border-neutral-200'
    }
  ];

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = 
      (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.address || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.id || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    if (roleFilter === 'todos') return matchesSearch;
    
    const roleNormalized = String(c.role || '').toLowerCase();
    if (roleFilter === 'owner') return matchesSearch && (roleNormalized === 'owner' || roleNormalized === 'dueño');
    if (roleFilter === 'vendedor') return matchesSearch && roleNormalized === 'vendedor';
    if (roleFilter === 'mayorista') return matchesSearch && roleNormalized === 'mayorista';
    if (roleFilter === 'detalle') return matchesSearch && roleNormalized === 'detalle';
    if (roleFilter === 'usuario') return matchesSearch && (roleNormalized === 'usuario' || roleNormalized === 'cliente' || roleNormalized === '');
    
    return matchesSearch;
  });

  const isRoleEditable = (c) => {
    const roleNormalized = String(c.role || '').toLowerCase();
    // Cannot edit oneself
    if (c.id === currentUser?.uid) return false;
    
    // If current user is vendedor
    if (currentUser?.role === 'vendedor') {
      // Cannot edit owner, dueño or vendedor
      if (roleNormalized === 'owner' || roleNormalized === 'dueño' || roleNormalized === 'vendedor') {
        return false;
      }
    }
    
    return true;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full px-1">
      {/* Upper Title Block */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 text-xs font-black uppercase tracking-widest font-mono mb-1">
            <ShieldCheck className="w-4 h-4 text-amber-500" /> Control Administrativo
          </div>
          <h1 className="text-3xl font-black font-display text-neutral-900 dark:text-neutral-50 tracking-tight">
            Gestión de Clientes y Roles
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium leading-relaxed mt-1">
            Modifica los tipos de tarifa para tus clientes (Detalle, Mayorista) o añade perfiles manualmente sin ingresar a la base de datos de Supabase.
          </p>
        </div>

        <button
          onClick={() => {
            setCreateMsg({ type: '', text: '' });
            setShowCreateModal(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-neutral-900 dark:bg-amber-400 hover:bg-neutral-800 dark:hover:bg-amber-300 text-white dark:text-neutral-950 font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0 shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Crear Cliente Manual</span>
        </button>
      </div>

      {/* Global Alerts / Messages */}
      {statusMsg.text && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-3 border ${
          statusMsg.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-400'
            : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50 text-rose-800 dark:text-rose-400'
        }`}>
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Grid Layout: Left descriptions & Right actual table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Roles Info Block */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-xs">
            <h3 className="text-sm font-extrabold text-neutral-900 dark:text-neutral-50 uppercase tracking-wider mb-4 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-neutral-500" />
              Descripción de Roles y Permisos
            </h3>
            
            <div className="space-y-4">
              {roleDescriptions.map((role, idx) => (
                <div key={idx} className="space-y-1 pb-3 last:pb-0 last:border-0 border-b border-neutral-100 dark:border-neutral-800/50">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black tracking-wide uppercase ${role.color}`}>
                      {role.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed pl-1">
                    {role.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 p-4.5 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40 rounded-2xl">
              <h4 className="text-[11px] font-extrabold text-amber-800 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <Shield className="w-3.5 h-3.5" /> Restricción del Vendedor
              </h4>
              <p className="text-[10px] text-amber-700 dark:text-amber-300/80 leading-relaxed">
                Por políticas de seguridad, los vendedores <strong>no pueden modificar su propio rol</strong> ni el rol de los dueños, ni tampoco asignar roles administrativos de Vendedor o Dueño a otros clientes.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Customer List Table */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-neutral-900 p-4 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xs">
            {/* Search Input */}
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-neutral-400" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, teléfono o dirección..."
                className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-neutral-950 dark:focus:ring-amber-400 transition-all text-neutral-800 dark:text-neutral-100"
              />
            </div>

            {/* Filter Dropdown */}
            <div className="flex items-center gap-2 shrink-0">
              <Filter className="w-3.5 h-3.5 text-neutral-400" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-xs font-bold text-neutral-700 dark:text-neutral-300 outline-none cursor-pointer focus:ring-1 focus:ring-neutral-900"
              >
                <option value="todos">Todos los Roles</option>
                <option value="owner">Dueños / Owners</option>
                <option value="vendedor">Vendedores</option>
                <option value="mayorista">Mayoristas VIP</option>
                <option value="detalle">Ventas al Detalle</option>
                <option value="usuario">Clientes / Usuarios</option>
              </select>
            </div>
          </div>

          {/* Customer Table/Grid Card */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-sm overflow-hidden">
            
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                <span className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest font-mono">Buscando Clientes en Supabase...</span>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto text-neutral-400">
                  <User className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">No se encontraron clientes</h4>
                <p className="text-xs text-neutral-400 max-w-xs mx-auto">No hay registros que coincidan con los filtros de búsqueda seleccionados.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-100 dark:border-neutral-800 text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                      <th className="py-4.5 px-6">Cliente / Perfil</th>
                      <th className="py-4.5 px-6">Contacto (WhatsApp)</th>
                      <th className="py-4.5 px-6">Dirección de Envío</th>
                      <th className="py-4.5 px-6">Tipo de Tarifa / Rol</th>
                      <th className="py-4.5 px-6 text-right">Gestión de Cuenta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                    {filteredCustomers.map((customer) => {
                      const editable = isRoleEditable(customer);
                      const isSelf = customer.id === currentUser?.uid;
                      const roleNormalized = String(customer.role || '').toLowerCase();
                      
                      // Match badge class
                      let badgeStyle = 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300';
                      if (roleNormalized === 'owner' || roleNormalized === 'dueño') {
                        badgeStyle = 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/40';
                      } else if (roleNormalized === 'vendedor') {
                        badgeStyle = 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200/40';
                      } else if (roleNormalized === 'mayorista') {
                        badgeStyle = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/40';
                      } else if (roleNormalized === 'detalle') {
                        badgeStyle = 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-400 border border-sky-200/40';
                      }

                      return (
                        <tr key={customer.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors">
                          <td className="py-4 px-6 space-y-1">
                            <div className="font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
                              {customer.name || 'Cliente sin nombre'}
                              {isSelf && (
                                <span className="bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-[9px] font-bold px-1.5 py-0.5 rounded-sm">
                                  Tú
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono font-medium tracking-tight">
                              ID: {customer.id}
                            </div>
                            {customer.email && (
                              <div className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium">
                                {customer.email}
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            {customer.phone ? (
                              <a 
                                href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 font-semibold text-neutral-700 dark:text-neutral-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all"
                              >
                                <Phone className="w-3.5 h-3.5 text-emerald-500" />
                                <span>{customer.phone}</span>
                              </a>
                            ) : (
                              <span className="text-neutral-400 dark:text-neutral-500 italic">No registrado</span>
                            )}
                          </td>
                          <td className="py-4 px-6 max-w-xs">
                            {customer.address ? (
                              <div className="flex items-start gap-1 text-neutral-600 dark:text-neutral-400 line-clamp-2" title={customer.address}>
                                <MapPin className="w-3.5 h-3.5 text-neutral-400 mt-0.5 shrink-0" />
                                <span>{customer.address}</span>
                              </div>
                            ) : (
                              <span className="text-neutral-400 dark:text-neutral-500 italic">No registrada</span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            {updatingId === customer.id ? (
                              <div className="inline-flex items-center gap-1.5 text-neutral-400 text-[11px] font-bold">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                                Guardando...
                              </div>
                            ) : editable ? (
                              <select
                                value={customer.role || 'detalle'}
                                onChange={(e) => handleRoleChange(customer.id, customer.role, e.target.value)}
                                className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg px-2 py-1.5 text-xs font-bold text-neutral-800 dark:text-neutral-200 outline-none cursor-pointer focus:ring-1 focus:ring-neutral-900"
                              >
                                <option value="detalle">Tarifa Detalle</option>
                                <option value="mayorista">Tarifa Mayorista</option>
                                <option value="usuario">Usuario / Inicial</option>
                                {currentUser?.role === 'owner' && (
                                  <>
                                    <option value="vendedor">Vendedor Staff</option>
                                    <option value="owner">Dueño / Owner</option>
                                  </>
                                )}
                              </select>
                            ) : (
                              <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${badgeStyle}`}>
                                {customer.role === 'owner' || customer.role === 'dueño' ? '👑 Dueño' : 
                                 (customer.role === 'vendedor' ? '💼 Vendedor' : 
                                  (customer.role === 'mayorista' ? '🏷️ Mayorista VIP' : '🛒 Detalle'))}
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Send Verification / Reset buttons */}
                              {((customer.email || (customer.id && customer.id.includes('@'))) && !isSelf) && (
                                <>
                                  <button
                                    onClick={() => handleResendVerification(customer)}
                                    disabled={sendingEmailId === customer.id}
                                    title="Reenviar correo de verificación"
                                    className="p-1.5 text-neutral-500 hover:text-amber-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer outline-none disabled:opacity-50"
                                  >
                                    <Mail className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleSendPasswordReset(customer)}
                                    disabled={sendingEmailId === customer.id}
                                    title="Enviar enlace de restablecimiento de contraseña"
                                    className="p-1.5 text-neutral-500 hover:text-indigo-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer outline-none disabled:opacity-50"
                                  >
                                    <KeyRound className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}

                              {/* Manual prompts if they don't have email but are not manual-client */}
                              {(!customer.email && !(customer.id && customer.id.includes('@')) && !isSelf && !customer.id.startsWith('manual-client-')) && (
                                <button
                                  onClick={() => handleSendPasswordReset(customer)}
                                  title="Enviar restablecimiento (solicitará correo)"
                                  className="p-1.5 text-neutral-400 hover:text-indigo-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer outline-none"
                                >
                                  <KeyRound className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Delete button (cannot delete yourself, sellers cannot delete owners/sellers) */}
                              {!isSelf && (
                                <button
                                  onClick={() => handleDeleteCustomer(customer)}
                                  disabled={deletingId === customer.id}
                                  title="Eliminar Cliente"
                                  className="p-1.5 text-neutral-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors cursor-pointer outline-none disabled:opacity-50"
                                >
                                  {deletingId === customer.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CUSTOMER CREATION MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 w-full max-w-md rounded-3xl shadow-xl overflow-hidden p-8 space-y-6 fade-in-up">
            
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-black font-display text-neutral-900 dark:text-neutral-50 tracking-tight flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-amber-500" />
                  Nuevo Cliente Manual
                </h3>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                  Registra un cliente de forma manual. Se le asignará un identificador local único de forma automática.
                </p>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-lg font-bold p-1 shrink-0 outline-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            {createMsg.text && (
              <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
                createMsg.type === 'success' 
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-400'
                  : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50 text-rose-800 dark:text-rose-400'
              }`}>
                {createMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                )}
                <span>{createMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleManualCreate} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest block mb-2">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-amber-400 text-neutral-800 dark:text-neutral-100"
                  placeholder="Ej. María Josefa Alvarado"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest block mb-2">Teléfono (WhatsApp)</label>
                  <input
                    type="tel"
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-amber-400 text-neutral-800 dark:text-neutral-100"
                    placeholder="Ej. +504 9876-5432"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest block mb-2">Tarifa / Rol Inicial</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full px-3 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs outline-none font-bold text-neutral-700 dark:text-neutral-300 cursor-pointer focus:ring-1 focus:ring-neutral-900"
                  >
                    <option value="detalle">Detalle (Minorista)</option>
                    <option value="mayorista">Mayorista VIP</option>
                    <option value="usuario">Usuario Inicial</option>
                    {currentUser?.role === 'owner' && (
                      <option value="vendedor">Vendedor Staff</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest block mb-2">Correo Electrónico (Opcional)</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-amber-400 text-neutral-800 dark:text-neutral-100"
                  placeholder="Ej. maria@correo.com"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest block mb-2">Dirección de Envío (Opcional)</label>
                <textarea
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  rows="3"
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-amber-400 text-neutral-800 dark:text-neutral-100"
                  placeholder="Ej. Colonia El Prado, segunda calle frente a Farmacia Simán"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-xs font-bold rounded-xl text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer text-center outline-none"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating || !newName || !newPhone}
                  className="flex-1 py-3 bg-neutral-900 dark:bg-amber-400 hover:bg-neutral-800 dark:hover:bg-amber-300 text-white dark:text-neutral-950 text-xs font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-center outline-none flex items-center justify-center gap-1.5"
                >
                  {creating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Registrar Cliente</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
