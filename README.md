# 🌟 Iconic Boutique HN — Perfumería Premium

¡Bienvenido a **Iconic Boutique HN**! Esta es una aplicación web full-stack de nivel empresarial diseñada específicamente para la venta, cotización y gestión automatizada de inventarios de perfumes y lociones originales en Honduras. 

La plataforma une la elegancia del comercio de fragancias premium con el poder de la Inteligencia Artificial (Gemini) y un esquema de seguridad de base de datos robusto (Supabase).

---

## 🚀 Características Clave

1. **Gestión de Fragancias e Inventario Inteligente:**
   * Carga masiva de inventarios mediante archivos PDF/Excel analizados automáticamente por IA (Gemini).
   * Generación y escaneo de códigos de barras integrados para un control físico veloz en tienda.
2. **Flujo de Ventas Automatizado:**
   * Carrito de compras intuitivo con cálculo automático de precios según perfil de usuario.
   * Cotización instantánea y envío directo del pedido formateado a **WhatsApp** y alertas en tiempo real vía **Telegram**.
3. **Tarifas VIP para Distribuidores:**
   * Registro inteligente de clientes con asignación de roles jerárquicos (Público, Distribuidor, Vendedor, Dueño).
4. **Sistema de Alertas en Tiempo Real (Ultra-Responsive):**
   * Un sistema optimizado de sondeo dinámico inteligente (cada 15s, pausado automáticamente cuando la pestaña está en segundo plano para ahorrar base de datos) junto con una elegante barra flotante de notificaciones (*Notis-Stack*) que avisa al personal de inmediato sobre nuevos pedidos o nuevos registros de clientes.
5. **Seguridad a Prueba de Balas (Supabase RLS):**
   * Configuración de políticas de seguridad a nivel de fila (RLS) seguras contra manipulación maliciosa de metadatos del cliente.

---

## 📂 Arquitectura del Proyecto (Simplificada)

El código fuente está estructurado de manera modular e intuitiva:

```text
├── api/                   # Controladores y proxies del lado del servidor
├── src/
│   ├── App.jsx            # Punto de entrada de React con el sistema de alertas flotantes
│   ├── store.js           # Estado global de la aplicación utilizando Zustand
│   ├── components/        # Componentes reutilizables (Navbar, AboutUs, ScrollToTop, etc.)
│   ├── pages/             # Páginas individuales de la plataforma
│   │   ├── Home.jsx       # Landing y bienvenida principal
│   │   ├── Catalog.jsx    # Visualización y filtrado de fragancias para clientes
│   │   ├── Cart.jsx       # Gestión de pedidos y salida a WhatsApp
│   │   ├── Dashboard.jsx  # Métricas financieras y de inventario para personal
│   │   ├── Inventory.jsx  # Panel de stock con IA cargadora de PDF y códigos de barras
│   │   ├── Customers.jsx  # Aprobación de registros y asignación de tarifas VIP
│   │   └── Orders.jsx     # Despacho y actualización del estado de pedidos
│   └── utils/
│       ├── supabase.js    # Inicialización y cliente seguro de Supabase
│       └── barcode.js     # Utilidades para generación de códigos de barras
├── supabase_schema.sql    # El plano de base de datos y políticas de seguridad RLS
├── server.ts              # Servidor backend Node/Express con Vite para desarrollo y producción
└── package.json           # Dependencias y scripts de construcción
```

---

## 🛡️ Lección Didáctica: Seguridad Crítica en Supabase

### El Peligro del "User Metadata" en RLS 🛑
Anteriormente, las políticas de Supabase utilizaban la función `auth.jwt()` para comprobar el rol del usuario directamente desde sus metadatos de sesión en frontend, por ejemplo:
```sql
-- ❌ INSEGURO: Un usuario malicioso puede modificar su propio rol en el navegador
(auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
```
**¿Por qué es esto crítico?** 
Los metadatos del usuario (`user_metadata`) son totalmente editables desde el cliente mediante llamadas sencillas a la API de Supabase Auth (ej. `supabase.auth.updateUser()`). Un atacante con conocimientos básicos podría cambiar su propio rol a `dueño` (`owner` o `vendedor`) en su navegador y, consecuentemente, bypassar el RLS de Supabase para borrar o modificar productos, cambiar precios o alterar la base de datos completa.

### La Solución Implementada: Roles de Base de Datos Seguros ✅
Hemos reescrito y blindado la seguridad en `supabase_schema.sql` mediante una función auxiliar con privilegios definidos (`SECURITY DEFINER`):

1. **Creación de la función `get_my_role()`:**
   Esta función busca directamente el rol del usuario en la tabla privada de perfiles (`profiles`) en el servidor, ignorando cualquier cosa que el usuario envíe desde el navegador. Al usar `SECURITY DEFINER`, se ejecuta con privilegios del sistema para consultar la tabla de manera interna y rápida, evitando la recursión infinita común en políticas de RLS.

   ```sql
   CREATE OR REPLACE FUNCTION public.get_my_role()
   RETURNS TEXT AS $$
     SELECT role FROM public.profiles WHERE id = auth.uid();
   $$ LANGUAGE sql SECURITY DEFINER SET search_path = public;
   ```

2. **Políticas RLS Robustas:**
   Ahora las inserciones de perfiles y modificaciones de productos se validan de forma infalsificable contra la base de datos:
   ```sql
   -- ¡Ahora es 100% seguro! El rol se valida en el servidor, no en el cliente.
   CREATE POLICY "Sellers and Owners can modify products" ON products 
   FOR ALL USING (
     public.get_my_role() IN ('dueño', 'owner', 'vendedor')
   );
   ```

3. **Seguridad en Vistas:**
   Hemos asegurado la vista de catálogo aplicando la regla de invocación segura (`security_invoker = true`), garantizando que cualquier consulta sobre las vistas mantenga activas las restricciones de RLS del usuario que las consulta:
   ```sql
   ALTER VIEW IF EXISTS public.secure_catalog SET (security_invoker = true);
   ```

---

## 🛠️ Cómo Aplicar la Migración de Seguridad en Supabase

Si estás conectando tu propia base de datos de Supabase, sigue estos sencillos pasos:

1. Ve a tu panel de **Supabase**.
2. Entra en la sección **SQL Editor** en el menú de la izquierda.
3. Haz clic en **New query** (Nueva consulta).
4. Abre tu archivo local `supabase_schema.sql` y copia las líneas correspondientes a las políticas modificadas (especialmente la función `get_my_role()`, las políticas actualizadas de `profiles`, `products` y la instrucción `ALTER VIEW`).
5. Pega el script en el editor de Supabase y haz clic en **Run** (Ejecutar).

¡Listo! Tu base de datos ahora está completamente protegida de manipulaciones.

---

## ⚡ Comandos del Proyecto

Para comenzar a trabajar localmente con el proyecto o construirlo para producción:

* **Instalar dependencias:**
  ```bash
  pnpm install
  ```
* **Ejecutar en modo de desarrollo:**
  ```bash
  pnpm run dev
  ```
* **Compilar para producción:**
  ```bash
  pnpm run build
  ```
  *(Esto compilará el frontend de React con Vite y empaquetará el servidor Express en `dist/server.cjs` de forma ultrarápida mediante esbuild).*
* **Iniciar el servidor compilado:**
  ```bash
  pnpm run start
  ```

---

*Desarrollado con pasión para garantizar un comercio seguro, rápido e inteligente en Honduras.* 🇭🇳✨
